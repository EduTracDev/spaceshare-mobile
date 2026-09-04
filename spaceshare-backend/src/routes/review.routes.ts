import Router from 'express';
import { body } from 'express-validator';
import { createReviewController, reportReviewController } from '../controllers/review.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const reviewRouter = Router();

reviewRouter.post(
  '/create',
  authenticate,
  validate([
    body('listingId').trim().notEmpty().withMessage('listingId is required'),
    body('bookingId').trim().notEmpty().withMessage('bookingId is required'),
    body('hostId').trim().notEmpty().withMessage('hostId is required'),
    body('rating')
      .notEmpty()
      .withMessage('rating is required')
      .isInt({ min: 1, max: 5 })
      .withMessage('rating must be between 1 and 5'),
    body('comment').trim().notEmpty().withMessage('comment is required').isLength({ min: 5, max: 1000 }),
  ]),
  createReviewController
);
reviewRouter.post(
  '/report',
  authenticate,
  validate([
    body('reviewId').trim().notEmpty().withMessage('reviewId is required'),
    body('reason').trim().notEmpty().withMessage('reason is required').isLength({ min: 5, max: 500 }),
  ]),
  reportReviewController
);

export default reviewRouter;