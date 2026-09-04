import { Router } from 'express';
import { body } from 'express-validator';
import { create, getMine, getOne, update, remove, getPublic, getPublicOne } from '../controllers/listing.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

const listingValidators = [
  body('spaceName').trim().notEmpty().withMessage('Space name is required').isLength({ max: 100 }),
  body('spaceCategory').trim().notEmpty().withMessage('Space category is required'),
  body('addressLine').trim().notEmpty().withMessage('Address is required').isLength({ max: 200 }),
  body('area').trim().notEmpty().withMessage('Area is required').isLength({ max: 100 }),
  body('description').trim().notEmpty().withMessage('Description is required').isLength({ min: 20, max: 3000 }),
  body('spaceCapacity').notEmpty().withMessage('Space capacity is required'),
  body('spacePrice').notEmpty().withMessage('Space price is required'),
  body('hostRules').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('parkingInstruction').optional({ nullable: true }).isString().isLength({ max: 1000 }),
  body('startTime').trim().notEmpty().withMessage('Start time is required'),
  body('endTime').trim().notEmpty().withMessage('End time is required'),
];

router.post('/', authenticate, validate(listingValidators), create);
router.get('/mine', authenticate, getMine);
router.get('/public', getPublic);
router.get('/public/:id', getPublicOne);
router.get('/:id', getOne);
router.patch(
  '/:id',
  authenticate,
  validate([
    body('spaceName').optional().trim().isLength({ min: 1, max: 100 }),
    body('description').optional().trim().isLength({ min: 20, max: 3000 }),
    body('addressLine').optional().trim().isLength({ min: 1, max: 200 }),
    body('area').optional().trim().isLength({ min: 1, max: 100 }),
    body('hostRules').optional({ nullable: true }).isString().isLength({ max: 2000 }),
    body('parkingInstruction').optional({ nullable: true }).isString().isLength({ max: 1000 }),
  ]),
  update
);
router.delete('/:id', authenticate, remove);

export default router;