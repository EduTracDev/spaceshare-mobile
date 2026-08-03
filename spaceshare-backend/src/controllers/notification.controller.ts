import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { getMyNotifications, markAsRead, markAllAsRead } from '../services/notification.service';

export const getMine = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' });
    const notifications = await getMyNotifications(req.userId);
    return res.status(200).json({ notifications });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const markOneRead = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' });
    const { id } = req.params;
    const notification = await markAsRead(id as string, req.userId);
    return res.status(200).json({ notification });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const markAllRead = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' });
    const result = await markAllAsRead(req.userId);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};