import { Router } from 'express';
import { body, param } from 'express-validator';
import { create, getMine, getOne, getByBooking } from '../controllers/dispute.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.post(
  '/',
  authenticate,
  validate([
    body('bookingId').trim().notEmpty().withMessage('bookingId is required'),
    body('issueDetail')
      .trim()
      .notEmpty()
      .withMessage('issueDetail is required')
      .isLength({ min: 10, max: 2000 })
      .withMessage('issueDetail must be between 10 and 2000 characters'),
    body('evidenceUrl').optional().trim().isURL().withMessage('evidenceUrl must be a valid URL'),
  ]),
  create
);
router.get('/mine', authenticate, getMine);
router.get(
  '/booking/:bookingId',
  authenticate,
  validate([param('bookingId').trim().notEmpty()]),
  getByBooking
);
router.get('/:id', authenticate, validate([param('id').trim().notEmpty()]), getOne);

export default router;