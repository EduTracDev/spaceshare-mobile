import { Request, Response, NextFunction } from 'express';


export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.userRole !== 'ADMIN' && req.userRole !== 'SUPER_ADMIN') return res.status(403).json({ message: 'Admin access required' });
  next();
};

export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.userRole !== 'SUPER_ADMIN') return res.status(403).json({ message: 'Super admin access required' });
  next();
};