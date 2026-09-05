import { NextFunction, Request, Response } from 'express';
import * as invitationService from '../../services/admin/invitation.service';
import { AuthRequest } from '../../middleware/auth.middleware';
import { BadRequestError } from '../../errors';

export async function inviteAdminUser(req:AuthRequest, res:Response, next: NextFunction){
    try {
        const { email, firstName, lastName } = req.body;
        const invitedById = req.userId;
        if (!invitedById) return res.status(400).json({ message: 'Invalid authentication' });
        if (!email || !firstName || !lastName) return res.status(400).json({ message: 'Email, first name, and last name are required' });
        
        const result = await invitationService.inviteAdminUser(email, firstName, lastName, invitedById);
        
        return res.status(200).json({ 
            success: true,
            message: result.message,
            data: null,
            error: null
        });
    } catch (error:any){
        next(error);
    }
}

export async function acceptAdminInvitation(req:Request, res:Response, next: NextFunction){
    try{
        const { email, token, password, confirmPassword } = req.body;
        if (!email || !password || !confirmPassword) throw new BadRequestError('Missing required fields: email, password');
        if (!token ) throw new BadRequestError('Invalid invitation link. Contact an admin');
        if (password !== confirmPassword) throw new BadRequestError('Passwords do not match');
        
        const result = await invitationService.acceptAdminInvitation(email, token, password, confirmPassword);
        return res.status(200).json({ 
            success: true,
            message: result.message,
            data: null,
            error: null
        });
    } catch(error:any){
        next(error);
    }
}

export async function resendAdminInvitation(req: AuthRequest, res: Response, next: NextFunction){
    try {
        const { email, invitationId } = req.body;
        const invitedById = req.userId;
        if (!invitedById) throw new BadRequestError('Invalid request');

        const result = await invitationService.resendAdminInvitation(email, invitedById, invitationId);
        return res.status(200).json({ 
            success: true,
            message: result.message,
            data: null,
            error: null
        });
    } catch(error){
        next(error);
    }
}

export async function revokeAdminInvitation(req: AuthRequest, res: Response, next: NextFunction){
    try {
        const { invitationId } = req.body;
        const invitedById = req.userId;
        if (!invitedById) throw new BadRequestError('Invalid request');

        const result = await invitationService.revokeAdminInvitation(invitedById, invitationId);
        return res.status(200).json({ 
            success: true,
            message: result.message,
            data: null,
            error: null
        });
    } catch(error){
        next(error);
    }
}