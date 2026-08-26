import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  createDispute,
  getMyDisputes,
  getDisputeById,
  getDisputesByBooking,
} from '../services/dispute.service';

export const create = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' });
    const { bookingId, issueDetail, evidenceUrl } = req.body;
    if (!bookingId || !issueDetail) {
      return res.status(400).json({ message: 'bookingId and issueDetail are required' });
    }
    const dispute = await createDispute(req.userId, { bookingId, issueDetail, evidenceUrl });
    return res.status(201).json({ message: 'Dispute submitted', dispute });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const getMine = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' });
    const disputes = await getMyDisputes(req.userId);
    return res.status(200).json({ disputes });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const getOne = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' });
    const { id } = req.params;
    const dispute = await getDisputeById(id as string, req.userId);
    return res.status(200).json({ dispute });
  } catch (error: any) {
    return res.status(404).json({ message: error.message });
  }
};

export const getByBooking = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' });
    const { bookingId } = req.params;
    const disputes = await getDisputesByBooking(bookingId as string, req.userId);
    return res.status(200).json({ disputes });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};