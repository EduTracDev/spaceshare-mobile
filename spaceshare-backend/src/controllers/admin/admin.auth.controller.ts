import { NextFunction, Request, Response } from 'express';
import { loginUser, onboardSuperAdminService } from "../../services/admin/admin.auth.service";
import * as authService from '../../services/auth.service';
import { AuthRequest } from '../../middleware/auth.middleware';
import { BadRequestError, NotFoundError } from '../../errors';


export const onboardSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName, phone, AUTH_KEY } = req.body;

    if (!AUTH_KEY || AUTH_KEY !== process.env.PLATFORM_KEY) throw new NotFoundError('This Route does not exist');
    if (!email || !password || !firstName || !lastName) return res.status(400).json({ message: 'Missing required fields: email, password, firstname, lastName' });

    const response =await onboardSuperAdminService(email, password, firstName, lastName, phone)

    return res.status(201).json({
      success: true,
      message: 'Super admin user creation successfull',
      data: {
        user: response.user
      }
    });
  } catch (error: any) {
    next(error)
    return res.status(500).json({ message: error.message });
  }
};


export const login = async (req: Request, res: Response, next:Function) => {
  try { 
    const { email, password } = req.body;

    if (!email || !password) throw new BadRequestError('Email and password are required');
   
    const result = await loginUser(email, password);
   
    return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
            token: result.token,
            user: result.user
        }
    });
  } catch (error: any) {
    next(error);
  }
};


export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const result = await authService.forgotPassword(email, {transport: 'web_link'});
    return res.status(200).json({
        success: true,
        message: result.message,
        data: null, 
        error: null
    });
  } catch (error: any) {
    return res.status(401).json({ message: error.message });
  }
};


export const verify = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: 'Invalid verification request' });
    const result = await authService.verifyResetCode(email, code);
 
    return res.status(200).json({
        success: true,
        message: result.message,
        data: null, 
        error: null
    });
  } catch (error: any) {
    return res.status(401).json({ message: error.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) return res.status(400).json({ message: 'Invalid verification request' });
    const result = await authService.resetPassword(email, code, newPassword, {transport: 'web_link'});
    return res.status(200).json({
        success: true,
        message: result.message,
        data: null, 
        error: null
    });
  } catch (error: any) {
    return res.status(401).json({ message: error.message });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Missing required fields. Current password and new password are required' });
    if (!userId) return res.status(401).json({ message: 'Invalid authentication' });
    const result = await authService.changePassword(currentPassword, newPassword, userId);
    return res.status(200).json({
        success: true,
        message: result.message,
        data: null, 
        error: null
    });
  } catch (error: any) {
    return res.status(401).json({ message: error.message });
  }
};