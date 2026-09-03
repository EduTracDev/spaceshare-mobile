import Router from 'express';
import { createReviewController, reportReviewController } from '../controllers/review.controller';


const reviewRouter = Router();

reviewRouter.post('/create', createReviewController);
reviewRouter.post('/report', reportReviewController);

export default reviewRouter;