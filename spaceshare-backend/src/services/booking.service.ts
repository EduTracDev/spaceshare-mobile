import prisma from '../utils/prisma';

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

  return prisma.booking.create({
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
    include: { listing: true },
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
    include: { listing: true, guest: true },
    orderBy: { createdAt: 'desc' },
  });
};

export const updateBookingStatus = async (
  bookingId: string,
  requesterId: string,
  status: 'APPROVED' | 'DECLINED' | 'PAID' | 'COMPLETED' | 'CANCELLED'
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

  return prisma.booking.update({
    where: { id: bookingId },
    data: { status },
  });
};