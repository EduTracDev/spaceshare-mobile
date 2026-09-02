import axios from 'axios';
import prisma from '../utils/prisma';
import { broadcastToAdmins } from './admin/notification.service';
import { generateTransactionNumber } from '../utils/reference-numbers';


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

  // Record the payment attempt as a pending transaction — flipped to SUCCESSFUL/FAILED on verification
  const [transactionNumber, platformSettingsRow] = await Promise.all([
    generateTransactionNumber('PAYMENT'),
    prisma.platformSettings.findFirst({
      select: { hostCommission: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  const commissionPct = Number(platformSettingsRow?.hostCommission);
  // FAIL GRACIOUSLY IF THE COMMISSION RATE IS NOT GOTTEN
  if (!platformSettingsRow || !Number.isFinite(commissionPct) || commissionPct <= 0 || commissionPct > 100) {
    broadcastToAdmins({
      type: "PAYMENT_FAILED",
      title: "Payment Failed: Platform Settings Issue",
      body: "Platform commission settings are missing or invalid. Please confirm the platform commission is configured correctly.",
      referenceId: booking.id,
    });
    throw new Error("Failed to initiate payment");
  }

  const commissionAmount = Math.round((Number(booking.totalPrice) * commissionPct) / 100);
  await prisma.transaction.create({
    data: {
      bookingId: booking.id,
      type: 'PAYMENT',
      status: 'PENDING',
      amount: booking.totalPrice,
      providerRef: txRef,
      commissionRate: commissionPct,
      commissionAmount,
      transactionNumber,
    },
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
  const txRef = data.tx_ref as string | undefined;

  if (data.status !== 'successful') {
    if (txRef) {
      await prisma.transaction.updateMany({
        where: { providerRef: txRef, type: 'PAYMENT' },
        data: { status: 'FAILED', providerMeta: data },
      });
    }
    throw new Error('Payment was not successful');
  }

  const bookingId = data.meta?.bookingId;
  if (!bookingId) throw new Error('No booking reference found on this transaction');

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new Error('Booking not found');

  // Confirm the amount paid matches what we expected, to guard against tampering
  if (Number(data.amount) < booking.totalPrice) {
    if (txRef) {
      await prisma.transaction.updateMany({
        where: { providerRef: txRef, type: 'PAYMENT' },
        data: { status: 'FAILED', providerMeta: data },
      });
      const transaction = await prisma.transaction.findFirst({
        where: { providerRef: txRef, type: 'PAYMENT' },
        select: { transactionNumber: true },
      });
      broadcastToAdmins({
        type: 'TRANSACTION_FAILED',
        title: 'Payment transaction failed (amount mismatch)',
        body: `Payment for booking "${booking.spaceName}" (${txRef}) failed. Amount did not match the expected amount`,
        referenceId: transaction?.transactionNumber ?? txRef ?? booking.id,
      });
    }
    throw new Error('Amount paid does not match booking total');
  }

  const [updated] = await prisma.$transaction([
    prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'PAID' },
    }),
    prisma.transaction.updateMany({
      where: { providerRef: txRef ?? booking.paymentRef ?? undefined, type: 'PAYMENT' },
      data: { status: 'SUCCESSFUL', providerMeta: data },
    }),
  ]);

  return updated;
};