import { Router } from 'express';
import { initiate, callback } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/initiate', authenticate, initiate);
router.get('/callback', callback);

export default router;