import { Router } from 'express';
import { getProfile, updateProfile, changePassword } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/me', authenticate, getProfile);
router.patch('/me', authenticate, updateProfile);
router.post('/me/change-password', authenticate, changePassword);

export default router;