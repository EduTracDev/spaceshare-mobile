import { Router } from 'express';
import { getProfile, updateProfile, changePassword, completeFirstLogin, updateRole, savePushToken } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/me', authenticate, getProfile);
router.patch('/me', authenticate, updateProfile);
router.post('/me/change-password', authenticate, changePassword);
router.patch('/me/first-login-complete', authenticate, completeFirstLogin);
router.patch('/me/role', authenticate, updateRole);
router.post('/me/push-token', authenticate, savePushToken);

export default router;