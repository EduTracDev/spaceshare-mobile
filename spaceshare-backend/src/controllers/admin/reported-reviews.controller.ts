import type { Request, Response, NextFunction } from "express";
import {
  getReportedReviews,
  getReportedReviewById,
  retainReview,
  removeReview,
  adminDeleteReview as deleteReviewService,
} from "../../services/admin/reported-reviews.service";
import type { AuthRequest } from "../../middleware/admin/admin.middleware";

type QuerySortBy =
  | "spaceName"
  | "writtenAt"
  | "status"
  | "authorName"
  | "reporterName"
  | undefined;

type QueryStatus = "pending" | "closed" | undefined;

export const getAllReportedReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const pageSizeRaw = parseInt(String(req.query.pageSize ?? "6"), 10) || 6;
    const pageSize = Math.min(100, Math.max(1, pageSizeRaw));

    const status = (req.query.status as QueryStatus) ?? undefined;
    const search =
      typeof req.query.search === "string" && req.query.search.trim().length > 0
        ? req.query.search.trim()
        : undefined;
    const sortBy = (req.query.sortBy as QuerySortBy) ?? undefined;
    const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";

    const result = await getReportedReviews({
      page,
      pageSize,
      status,
      search,
      sortBy,
      sortOrder,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getSingleReportedReview = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const review = await getReportedReviewById(id);

    return res.status(200).json({
      success: true,
      data: { review },
    });
  } catch (error) {
    next(error);
  }
};

export const retainReportedReview = async (
  req: AuthRequest & Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const actorId = req.userId!;
    const result = await retainReview(id, actorId);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const removeReportedReview = async (
  req: AuthRequest & Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const actorId = req.userId!;
    const result = await removeReview(id, actorId);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/reported-reviews/:id
 * Direct admin review deletion from listing details panel.
 * This is the "delete review" button action (Trash2 icon) in ListingReviewsPanel.
 * Unlike removeReportedReview which closes an open report, this works on ANY
 * review regardless of whether it was reported.
 *   → sets visibility=REMOVED, moderatedAt=now, updates listing aggregates.
 */
export const adminDeleteReview = async (
  req: AuthRequest & Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const actorId = req.userId!;
    const result = await deleteReviewService(id, actorId);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};