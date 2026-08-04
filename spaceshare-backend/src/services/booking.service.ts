import prisma from '../utils/prisma';
import { createNotification } from './notification.service';

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

  const booking = await prisma.booking.create({
    data: {
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

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status,
      declineReason: status === 'DECLINED' ? declineReason : undefined,
      cancelReason: status === 'CANCELLED' ? cancelReason : undefined,
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
    await createNotification(
      recipientId,
      'BOOKING_CANCELLED',
      'Booking Cancelled',
      isHost
        ? `Unfortunately, the host has cancelled your booking for ${booking.spaceName}. We have initiated the refund process.`
        : `The guest has cancelled their booking for ${booking.spaceName}.`,
      booking.id
    );
  } else if (status === 'PAID') {
    await createNotification(
      booking.listing.hostId,
      'PAYMENT_SUCCESSFUL',
      'Booking Payment Received',
      `Payment has been completed for a booking at ${booking.spaceName}.`,
      booking.id
    );
 } else if (status === 'COMPLETED') {
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