import { Router } from 'express';
import { create, getMine, getOne, update, remove } from '../controllers/listing.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, create);
router.get('/mine', authenticate, getMine);
router.get('/:id', getOne);
router.patch('/:id', authenticate, update);
router.delete('/:id', authenticate, remove);

export default router;