import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
  markFirstLoginDone,
  setUserRole,
} from '../services/user.service';

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await getUserProfile(req.userId as string);
    return res.status(200).json({ user });
  } catch (error: any) {
    return res.status(404).json({ message: error.message });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, phone, avatarUrl } = req.body;
    const user = await updateUserProfile(req.userId as string, {
      firstName, lastName, phone, avatarUrl,
    });
    return res.status(200).json({ message: 'Profile updated successfully', user });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    await changeUserPassword(req.userId as string, currentPassword, newPassword);
    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const completeFirstLogin = async (req: AuthRequest, res: Response) => {
  try {
    const result = await markFirstLoginDone(req.userId as string);
    return res.status(200).json({ message: 'First login marked complete', user: result });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const updateRole = async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    if (role !== 'GUEST' && role !== 'HOST') {
      return res.status(400).json({ message: 'Role must be GUEST or HOST' });
    }
    const user = await setUserRole(req.userId as string, role);
    return res.status(200).json({ message: 'Role updated', user });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};