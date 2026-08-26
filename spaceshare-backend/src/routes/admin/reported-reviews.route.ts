import { Router } from "express";
import * as reportedReviewsController from "../../controllers/admin/reported-reviews.controller";

const adminReportedReviewsRoutes = Router();

adminReportedReviewsRoutes.get("/", reportedReviewsController.getAllReportedReviews);
adminReportedReviewsRoutes.get("/:id", reportedReviewsController.getSingleReportedReview);
adminReportedReviewsRoutes.patch("/:id/retain", reportedReviewsController.retainReportedReview);
adminReportedReviewsRoutes.patch("/:id/remove", reportedReviewsController.removeReportedReview);
adminReportedReviewsRoutes.delete("/:id", reportedReviewsController.adminDeleteReview);

export default adminReportedReviewsRoutes;