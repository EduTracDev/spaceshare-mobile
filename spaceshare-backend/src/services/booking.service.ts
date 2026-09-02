import prisma from '../utils/prisma';
import { createNotification } from './notification.service';
import { broadcastToAdmins } from './admin/notification.service';
import { generateBookingNumber, generateTransactionNumber } from '../utils/reference-numbers';




type AddOnBreakdownItem = { name: string; total: number };

type CreateBookingInput = {
  listingId: string;
  spaceName: string;
  spaceLocation: string;
  spacePrice: number;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  guests: number;
  addOnsBreakdown?: AddOnBreakdownItem[];
  cautionFee?: number;
  serviceFee?: number;
  totalPrice: number;
};

type CancellationDataType = {
    cancelReason: string;
    cancelledAt: Date;
    cancelledById: string;
    cancelledByRole: 'HOST' | 'GUEST';
} | {}

export const createBooking = async (guestId: string, data: CreateBookingInput) => {
  const listing = await prisma.listing.findUnique({ where: { id: data.listingId } });
  if (!listing) throw new Error('Listing not found');
  if (listing.status !== 'APPROVED') throw new Error('This space is not available for booking');

  const newStart = new Date(data.startDate);
  const newEnd = new Date(data.endDate);

  const conflicting = await prisma.booking.findMany({
    where: {
      listingId: data.listingId,
      status: { in: ['PENDING', 'APPROVED', 'PAID'] },
    },
    select: { startDate: true, endDate: true },
  });

  const hasOverlap = conflicting.some((b) => {
    const existingStart = new Date(b.startDate);
    const existingEnd = new Date(b.endDate);
    return newStart <= existingEnd && newEnd >= existingStart;
  });

  if (hasOverlap) {
    throw new Error('One or more selected dates are no longer available for this space');
  }
  
// Generate the human-readable booking reference stored with the booking.
  const bookingNumber = await generateBookingNumber();
  const booking = await prisma.booking.create({
    data: {
      bookingNumber,
      listingId: data.listingId,
      guestId,
      spaceName: data.spaceName,
      spaceLocation: data.spaceLocation,
      spacePrice: data.spacePrice,
      startDate: data.startDate,
      endDate: data.endDate,
      startTime: data.startTime,
      endTime: data.endTime,
      guests: data.guests,
      addOnsBreakdown: data.addOnsBreakdown ?? undefined,
      cautionFee: data.cautionFee ?? 0,
      serviceFee: data.serviceFee ?? 0,
      totalPrice: data.totalPrice,
      status: 'PENDING',
    },
  });

  await createNotification(
    guestId,
    'BOOKING_REQUEST_SENT',
    'Booking Request Sent',
    `Your booking request has been sent to the host.`,
    booking.id
  );

  await createNotification(
    listing.hostId,
    'NEW_BOOKING_REQUEST',
    'New Booking Request',
    `You received a new booking request for ${listing.spaceName}.`,
    booking.id
  );

  return booking;
};

export const getMyBookingsAsGuest = async (guestId: string) => {
  return prisma.booking.findMany({
    where: { guestId },
    include: { listing: { select: { photos: true } } },
    orderBy: { createdAt: 'desc' },
  });
};

export const getBookingById = async (bookingId: string, requesterId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      listing: {
        include: {
          host: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true },
          },
        },
      },
      guest: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true },
      },
    },
  });
  if (!booking) throw new Error('Booking not found');

  const isHost = booking.listing.hostId === requesterId;
  const isGuest = booking.guestId === requesterId;
  if (!isHost && !isGuest) throw new Error('Booking not found');

  return booking;
};

export const getMyBookingsAsHost = async (hostId: string) => {
  return prisma.booking.findMany({
    where: { listing: { hostId } },
    include: {
      listing: true,
      guest: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const updateBookingStatus = async (
  bookingId: string,
  requesterId: string,
  status: 'APPROVED' | 'DECLINED' | 'PAID' | 'COMPLETED' | 'CANCELLED',
  declineReason?: string,
  cancelReason?: string
) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { listing: true },
  });
  if (!booking) throw new Error('Booking not found');

  const isHost = booking.listing.hostId === requesterId;
  const isGuest = booking.guestId === requesterId;
  if (!isHost && !isGuest) throw new Error('You do not have permission to update this booking');

  const HOST_ONLY_STATUSES = ['APPROVED', 'DECLINED'];
  const GUEST_ONLY_STATUSES = ['PAID', 'COMPLETED'];
  // CANCELLED is allowed by either party

  if (HOST_ONLY_STATUSES.includes(status) && !isHost) {
    throw new Error('Only the host can approve or decline a booking');
  }
  if (GUEST_ONLY_STATUSES.includes(status) && !isGuest) {
    throw new Error('Only the guest can update payment or completion status');
  }
  if (status === 'DECLINED' && !declineReason?.trim()) {
    throw new Error('A reason is required to decline a booking');
  }
  if (status === 'CANCELLED' && !cancelReason?.trim()) {
    throw new Error('A reason is required to cancel a booking');
  }

  // Hanlde completed status update
  if (status === 'COMPLETED') {
    const result = await prisma.$transaction(async (tx) => {
      const platformSettingsRow = await tx.platformSettings.findFirst({
        select: { hostCommission: true },
        orderBy: { createdAt: 'desc' },
      });
      const commissionPct = Number(platformSettingsRow?.hostCommission);
      if (!platformSettingsRow || !Number.isFinite(commissionPct) || commissionPct <= 0 || commissionPct > 100) {
        throw new Error('Failed to complete booking: Platform commission settings are missing or invalid.');
      }

      // Calculate host payout
      const gross = Number(booking.totalPrice);
      const commissionAmount = Math.round(
        (gross * commissionPct) / 100
      );
      const hostNet = gross - commissionAmount;
      const cautionFee = Number(booking.cautionFee);

      // Generate transaction references
      const hostTransactionNumber = await generateTransactionNumber('PAYOUT');

      // Update booking to COMPLETED
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'COMPLETED',
        },
      });

      // Create host payout transaction
      await tx.transaction.create({
        data: {
          bookingId: booking.id,
          type: 'PAYOUT',
          status: 'PENDING',
          amount: hostNet,
          commissionRate: commissionPct,
          commissionAmount,
          recipientId: booking.listing.hostId,
          transactionNumber: hostTransactionNumber,
          purpose: 'HOST_PAYOUT',
        },
      });

      // Create caution-fee refund transaction if applicable
      if (cautionFee > 0) {
        const guestTransactionNumber = await generateTransactionNumber('PAYOUT');

        await tx.transaction.create({
          data: {
            bookingId: booking.id,
            type: 'PAYOUT',
            status: 'PENDING',
            amount: cautionFee,
            commissionRate: 0,
            commissionAmount: 0,
            recipientId: booking.guestId,
            transactionNumber: guestTransactionNumber,
            purpose: 'CAUTION_FEE_PAYOUT',
          },
        });
      }
      return updated;
    });

    // Notifications/broadcasts happen AFTER the transaction succeeds
    await createNotification(
      booking.guestId,
      'REVIEW_REMINDER',
      'Review Reminder',
      `How was your experience at ${booking.spaceName}? Leave a review.`,
      booking.id
    );

    await createNotification(
      booking.listing.hostId,
      'PAYOUT_SENT',
      'Booking Completed',
      `Your booking at ${booking.spaceName} has been marked as completed by the guest.`,
      booking.id
    );

    broadcastToAdmins({
      type: 'PAYOUT_READY',
      title: 'Payout Ready',
      body: `Payout ready for completed Booking ${booking.bookingNumber} — ${booking.spaceName}. Requires admin attention`,
      referenceId: booking.bookingNumber,
    });

    return result;
  }

  const cancellationData: CancellationDataType  = status === 'CANCELLED' ? {
        cancelReason: cancelReason!,
        cancelledAt: new Date(),
        cancelledById: requesterId,
        cancelledByRole: isHost ? 'HOST' : 'GUEST',
      } : {};

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status,
      declineReason: status === 'DECLINED' ? declineReason : undefined,
      cancelReason: status === 'CANCELLED' ? cancelReason : undefined,
      ...cancellationData
    },
  });

  if (status === 'APPROVED') {
    await createNotification(
      booking.guestId,
      'BOOKING_APPROVED',
      'Booking Approved',
      `Your booking for ${booking.spaceName} has been approved.`,
      booking.id
    );
  } else if (status === 'DECLINED') {
    await createNotification(
      booking.guestId,
      'BOOKING_DECLINED',
      'Booking Declined',
      `Your booking request for ${booking.spaceName} was declined.`,
      booking.id
    );
  } else if (status === 'CANCELLED') {
    const recipientId = isHost ? booking.guestId : booking.listing.hostId;
    const transactionNumber = await generateTransactionNumber("REFUND");

    await createNotification(
      recipientId,
      'BOOKING_CANCELLED',
      'Booking Cancelled',
      isHost
        ? `Unfortunately, the host has cancelled your booking for ${booking.spaceName}. We have initiated the refund process.`
        : `The guest has cancelled their booking for ${booking.spaceName}.`,
      booking.id
    );
    // Broadcast: Admin inbox — cancellation ALWAYS flags for attention
    broadcastToAdmins({
      type: 'BOOKING_REQUIRES_ATTENTION',
      title: 'Booking was cancelled',
      body: `${booking.bookingNumber} — "${booking.spaceName}" was cancelled${cancelReason ? `: ${cancelReason}` : ''}`,
      referenceId: booking.bookingNumber,
    });

    // ——— ADMIN DASHBOARD (additive 2026-08-31): auto-queue a REFUND row.
    await createCancelledRefundRow(booking, cancelReason!, transactionNumber, recipientId);
  } else if (status === 'PAID') {
    await createNotification(
      booking.listing.hostId,
      'PAYMENT_SUCCESSFUL',
      'Booking Payment Received',
      `Payment has been completed for a booking at ${booking.spaceName}.`,
      booking.id
    );
    // Broadcast: Admin inbox — new booking payment completion (fire-and-forget)
    broadcastToAdmins({
      type: 'BOOKING_REQUIRES_ATTENTION',
      title: 'New booking payment completion',
      body: `Payment has been completed for Booking ${booking.bookingNumber} — ${booking.spaceName}`,
      referenceId: booking.bookingNumber,
    });
 }
  return updated;
};

// Minimal booking info for a listing's calendar (no guest/personal details)
export const getListingBookingDates = async (listingId: string) => {
  const bookings = await prisma.booking.findMany({
    where: {
      listingId,
      status: { in: ['PENDING', 'APPROVED', 'PAID'] },
    },
    select: {
      startDate: true,
      endDate: true,
      status: true,
    },
  });

  return bookings.map((b) => ({
    startDate: b.startDate,
    endDate: b.endDate,
    status: b.status === 'PENDING' ? 'PENDING' : 'BOOKED',
  }));
};




type BookingWithListing = NonNullable<Awaited<ReturnType<typeof prisma.booking.findUnique>>> & {
  listing: { hostId: string };
};


async function createCancelledRefundRow(
  booking: BookingWithListing,
  _cancelReason: string,
  transactionNumber: string,
  recipientId: string
): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      //createa a new refund transaction
      const refundAmount = Number(booking.totalPrice);    //Later cancellation policies would require change here
      await tx.transaction.create({
        data: {
          transactionNumber,
          type: 'REFUND',
          bookingId: booking.id,
          status: 'PENDING',
          providerMeta: {
            cancelReason: _cancelReason,
          },
          amount: refundAmount,
          recipientId,
        }
      })
      // Get the payment transaction that was pending
      // await prisma.transaction.updateMany({
      //   where: { providerRef: booking.paymentRef, type: 'PAYMENT', bookingId: booking.id },
      //   data: { status: 'FAILED', },
      // });
    });
  } catch (err) {
    console.error(
      `[LEDGER] FAILED cancelled refund row for booking ${booking.bookingNumber}:`,
      err instanceof Error ? err.message : err
    );
  }
}