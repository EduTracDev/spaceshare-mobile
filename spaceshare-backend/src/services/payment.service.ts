import axios from 'axios';
import prisma from '../utils/prisma';

const FLW_BASE_URL = 'https://api.flutterwave.com/v3';

export const initiatePayment = async (bookingId: string, guestId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { guest: { select: { email: true, firstName: true, lastName: true } } },
  });

  if (!booking) throw new Error('Booking not found');
  if (booking.guestId !== guestId) throw new Error('You do not have permission to pay for this booking');
  if (booking.status !== 'APPROVED') throw new Error('This booking is not ready for payment');

  const txRef = `spaceshare-${booking.id}-${Date.now()}`;

  const payload = {
    tx_ref: txRef,
    amount: booking.totalPrice,
    currency: 'NGN',
    redirect_url: `${process.env.BACKEND_URL}/api/payments/callback`,
    customer: {
      email: booking.guest.email,
      name: [booking.guest.firstName, booking.guest.lastName].filter(Boolean).join(' ') || booking.guest.email,
    },
    customizations: {
      title: 'SpaceShare Booking Payment',
      description: `Payment for ${booking.spaceName}`,
    },
    meta: {
      bookingId: booking.id,
    },
  };

  const res = await axios.post(`${FLW_BASE_URL}/payments`, payload, {
    headers: {
      Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  // Store the tx_ref on the booking so we can match it up later during verification
  await prisma.booking.update({
    where: { id: booking.id },
    data: { paymentRef: txRef },
  });

  return res.data.data.link as string;
};

export const verifyPayment = async (transactionId: string) => {
  const res = await axios.get(`${FLW_BASE_URL}/transactions/${transactionId}/verify`, {
    headers: {
      Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
    },
  });

  const data = res.data.data;
  console.log('Flutterwave verify response:', JSON.stringify(data));

  if (data.status !== 'successful') {
    throw new Error('Payment was not successful');
  }

  const bookingId = data.meta?.bookingId;
  console.log('Extracted bookingId from meta:', bookingId);
  if (!bookingId) throw new Error('No booking reference found on this transaction');

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new Error('Booking not found');

  // Confirm the amount paid matches what we expected, to guard against tampering
  if (Number(data.amount) < booking.totalPrice) {
    throw new Error('Amount paid does not match booking total');
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'PAID' },
  });

  return updated;
};