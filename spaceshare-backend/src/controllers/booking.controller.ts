import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  createBooking,
  getMyBookingsAsGuest,
  getMyBookingsAsHost,
  getBookingById,
  updateBookingStatus,
} from '../services/booking.service';

export const create = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' });
    const booking = await createBooking(req.userId, req.body);
    return res.status(201).json({ message: 'Booking request sent', booking });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const getMineAsGuest = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' });
    const bookings = await getMyBookingsAsGuest(req.userId);
    return res.status(200).json({ bookings });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const getMineAsHost = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' });
    const bookings = await getMyBookingsAsHost(req.userId);
    return res.status(200).json({ bookings });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const getOne = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' });
    const { id } = req.params;
    const booking = await getBookingById(id as string, req.userId);
    return res.status(200).json({ booking });
  } catch (error: any) {
    return res.status(404).json({ message: error.message });
  }
};

export const updateStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' });
    const { id } = req.params;
    const { status, declineReason, cancelReason } = req.body;
    const booking = await updateBookingStatus(id as string, req.userId, status, declineReason, cancelReason);
    return res.status(200).json({ message: 'Booking updated', booking });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};