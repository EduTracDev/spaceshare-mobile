import { Request, Response } from 'express';
import { createReview, reportReview } from '../services/review.service';
import { AuthRequest } from '../middleware/auth.middleware';


export async function createReviewController(req: AuthRequest, res: Response) {
  const { listingId, bookingId, rating, hostId, comment } = req.body;
  const authorId = req.userId;
  if (!authorId) throw new Error('Only an authentocated user can create a review');
  const review = await createReview({bookingId, listingId, rating, authorId, hostId, comment});
  res.json(review);
}

export async function reportReviewController(req: AuthRequest, res: Response) {
  const { reviewId, reason } = req.body;
  const reporterUserId = req.userId;
  if (!reporterUserId) throw new Error('Only an authentocated user can report a review');
  const updated = await reportReview(reporterUserId, reviewId, reason);
  res.json(updated);
}