import { Request, Response } from 'express';
import * as invitationService from '../../services/admin/invitation.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export async function inviteAdminUser(req:AuthRequest, res:Response){
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
        return res.status(400).json({ message: error.message });
    }
}

export async function acceptAdminInvitation(req:Request, res:Response){
    try{
        const { email, token, password, confirmPassword } = req.body;
        if (!email || !token || !password || !confirmPassword) return res.status(400).json({ message: 'Invalid invitation link' });
        const result = await invitationService.acceptAdminInvitation(email, token, password, confirmPassword);
        return res.status(200).json({ 
            success: true,
            message: result.message,
            data: null,
            error: null
        });
    } catch(error:any){
        return res.status(400).json({ message: error.message });
    }
}