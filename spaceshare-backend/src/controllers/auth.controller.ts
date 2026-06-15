import { Request, Response } from 'express';
import { registerUser, verifyEmail, resendVerificationCode } from '../services/auth.service';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Email, password and role are required' });
    }

    const user = await registerUser(email, password, role);
    return res.status(201).json({
      message: 'Account created. Please verify your email.',
      user,
    });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const verify = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: 'Email and code are required' });
    }

    const result = await verifyEmail(email, code);
    return res.status(200).json({
      message: 'Email verified successfully',
      ...result,
    });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const resendCode = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const result = await resendVerificationCode(email);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};