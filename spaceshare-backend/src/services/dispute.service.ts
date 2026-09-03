import prisma from '../utils/prisma';
import { createNotification } from './notification.service';
import { generateDisputeNumber } from '../utils/reference-numbers';
import { broadcastToAdmins } from './admin/notification.service';

export const createDispute = async (
  userId: string,
  data: { bookingId: string; issueDetail: string; evidenceUrl?: string }
) => {
  const booking = await prisma.booking.findUnique({
    where: { id: data.bookingId },
    include: { listing: true },
  });
  if (!booking) throw new Error('Booking not found');

  const isGuest = booking.guestId === userId;
  const isHost = booking.listing.hostId === userId;
  if (!isGuest && !isHost) {
    throw new Error('You do not have permission to raise a dispute on this booking');
  }
  
  // This automatically generates and adds disputeNumber needed for the admin crud operations
  const disputeNumber = await generateDisputeNumber();
  
  const dispute = await prisma.dispute.create({
    data: {
      disputeNumber,
      bookingId: data.bookingId,
      raisedById: userId,
      issueDetail: data.issueDetail,
      evidenceUrl: data.evidenceUrl,
    },
  });

  // Confirm receipt to whoever raised it
  await createNotification(
    userId,
    'DISPUTE_SUBMITTED',
    'Dispute Submitted',
    `Your dispute for booking at ${booking.spaceName} has been received. Our team will review it shortly.`,
    booking.id
  );

  // Notify the other party involved in the booking
  const otherPartyId = isGuest ? booking.listing.hostId : booking.guestId;
  await createNotification(
    otherPartyId,
    'DISPUTE_SUBMITTED',
    'A Dispute Was Raised',
    `A dispute has been raised for the booking at ${booking.spaceName}. Our team is reviewing it.`,
    booking.id
  );
  // Broadcast: All ADMIN/SUPER_ADMIN users get inbox notification for the new dispute (fire-and-forget)
  broadcastToAdmins({
    type: 'DISPUTE_RAISED',
    title: 'New dispute raised',
    body: `Dispute ${dispute.disputeNumber} raised on booking "${booking.spaceName}" requires review`,
    referenceId: dispute.disputeNumber,
  });

  return dispute;
};

export const getMyDisputes = async (userId: string) => {
  return prisma.dispute.findMany({
    where: { raisedById: userId },
    include: {
      booking: { select: { spaceName: true, spaceLocation: true, startDate: true, endDate: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getDisputeById = async (disputeId: string, userId: string) => {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      booking: {
        include: { listing: { select: { hostId: true } } },
      },
    },
  });
  if (!dispute) throw new Error('Dispute not found');

  const isRaiser = dispute.raisedById === userId;
  const isHost = dispute.booking.listing.hostId === userId;
  if (!isRaiser && !isHost) {
    throw new Error('You do not have permission to view this dispute');
  }

  return dispute;
};

export const getDisputesByBooking = async (bookingId: string, userId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { listing: true },
  });
  if (!booking) throw new Error('Booking not found');

  const isGuest = booking.guestId === userId;
  const isHost = booking.listing.hostId === userId;
  if (!isGuest && !isHost) {
    throw new Error('You do not have permission to view disputes for this booking');
  }

  return prisma.dispute.findMany({
    where: { bookingId },
    orderBy: { createdAt: 'desc' },
  });
};