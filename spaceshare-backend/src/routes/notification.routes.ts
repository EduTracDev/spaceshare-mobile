import { Router } from 'express';
import { getMine, markOneRead, markAllRead } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/mine', authenticate, getMine);
router.patch('/:id/read', authenticate, markOneRead);
router.patch('/read-all', authenticate, markAllRead);

export default router;