import { Router } from 'express';
import { create, getMine, getOne } from '../controllers/listing.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, create);
router.get('/mine', authenticate, getMine);
router.get('/:id', getOne);

export default router;