import { Router } from 'express';
import { create, getMine, getOne, getByBooking } from '../controllers/dispute.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, create);
router.get('/mine', authenticate, getMine);
router.get('/booking/:bookingId', authenticate, getByBooking);
router.get('/:id', authenticate, getOne);

export default router;