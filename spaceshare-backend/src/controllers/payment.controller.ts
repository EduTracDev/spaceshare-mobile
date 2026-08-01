import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { initiatePayment, verifyPayment } from '../services/payment.service';

export const initiate = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' });
    const { bookingId } = req.body;
    const link = await initiatePayment(bookingId, req.userId);
    return res.status(200).json({ link });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

// Flutterwave redirects the WebView here after payment attempt (success or failure)
export const callback = async (req: any, res: Response) => {
  const { status, transaction_id } = req.query;

  if (status !== 'successful' || !transaction_id) {
    return res.redirect(`spaceshare://payment-failed`);
  }

  try {
    await verifyPayment(transaction_id as string);
    return res.redirect(`spaceshare://payment-success`);
  } catch (error: any) {
    console.log('Payment verification failed:', error.message);
    return res.redirect(`spaceshare://payment-failed`);
  }
};