import type { Request, Response, NextFunction } from "express";
import {
  approveListing,
  getAllListings,
  getListingById,
  rejectListing,
  reactivateListing,
  suspendListing,
} from "../../services/admin/listing.service";
import type { AuthRequest } from "../../middleware/admin/admin.middleware";

/**
 * GET /api/admin/listings
 * Query params: page, pageSize, search, status (all|pending|approved|rejected|suspended),
 *               sortBy (spaceName|location|price|submittedAt|status), sortOrder (asc|desc)
 */
export const getListings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = req.query.page ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const status = req.query.status ? (String(req.query.status) as any) : undefined;
    const sortBy = req.query.sortBy ? (String(req.query.sortBy) as any) : undefined;
    const sortOrder = req.query.sortOrder === "asc" ? "asc" : req.query.sortOrder === "desc" ? "desc" : undefined;

    const result = await getAllListings({
      page,
      pageSize,
      search,
      status,
      sortBy,
      sortOrder,
    });

    return res.status(200).json({
      success: true,
      message: "Listings fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/admin/listings/:id  Individual listing details page */
export const getListing = async (
  req: AuthRequest & Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const listing = await getListingById(id);
    return res.status(200).json({
      success: true,
      message: "Listing fetched successfully",
      data: { listing },
    });
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/listings/:id/approve  (PENDING → APPROVED) */
export const approve = async (
  req: AuthRequest & Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const actorId = req.userId!;
    const result = await approveListing(id, actorId);
    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/listings/:id/reject  (PENDING → REJECTED) — body may contain optional reason string */
export const reject = async (
  req: AuthRequest & Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const actorId = req.userId!;
    const reason = req.body?.reason as string | undefined;
    const result = await rejectListing(id, actorId, { reason });
    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/listings/:id/suspend  (APPROVED → SUSPENDED) */
export const suspend = async (
  req: AuthRequest & Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const actorId = req.userId!;
    const result = await suspendListing(id, actorId);
    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/listings/:id/reactivate  (SUSPENDED → APPROVED) */
export const reactivate = async (
  req: AuthRequest & Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const actorId = req.userId!;
    const result = await reactivateListing(id, actorId);
    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};