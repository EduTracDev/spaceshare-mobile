import { login, forgotPassword, verify, resetPassword, changePassword, onboardSuperAdmin } from '../../controllers/admin/admin.auth.controller';
import Router from "express";
import { authenticate } from '../../middleware/auth.middleware';

const adminAuthRouter = Router();

adminAuthRouter.post('/login', login);
adminAuthRouter.post('/forgot-password', forgotPassword);
adminAuthRouter.post('/verify', verify);
adminAuthRouter.post('/reset-password', resetPassword);
adminAuthRouter.post('/change-password', authenticate, changePassword);

// Temporary route to onboard Super_Admin
adminAuthRouter.post('/onboard-superadmin', onboardSuperAdmin);

export default adminAuthRouter;