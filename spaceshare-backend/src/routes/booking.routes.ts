import { Router } from 'express';
import { create, getMineAsGuest, getMineAsHost, getOne, updateStatus } from '../controllers/booking.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, create);
router.get('/mine', authenticate, getMineAsGuest);
router.get('/host', authenticate, getMineAsHost);
router.patch('/:id/status', authenticate, updateStatus);
router.get('/:id', authenticate, getOne);

export default router;