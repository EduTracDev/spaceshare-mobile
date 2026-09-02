import type { Request, Response, NextFunction } from "express";
import { BadRequestError, NotFoundError } from "../../errors";
import type { AuthRequest } from "../../middleware/auth.middleware";
import * as adminDisputeService from "../../services/admin/disputes.service";

const VALID_STATUS_FILTERS = new Set(["all", "new", "resolved"]);
const VALID_SORT_KEYS = new Set([
  "disputeNumber",
  "bookingNumber",
  "guestName",
  "hostName",
  "spaceName",
  "dateFiled",
  "status",
]);

/**
 * GET /api/admin/disputes
 *
 * Query params (matches frontend DisputeQueryParams 1:1):
 *   page:       number  (default 1,  clamped >=1)
 *   pageSize:   number  (default 10, clamped 1..100)
 *   status?:    "all" | "new" | "resolved"     (new = OPEN|UNDER_REVIEW; resolved = RESOLVED|REJECTED)
 *   search?:    string  (case-insensitive LIKE on disputeNumber, bookingNumber,
 *                         guest firstName/lastName/email, host firstName/lastName/email,
 *                         spaceName)
 *   sortBy?:    disputeNumber | bookingNumber | guestName | hostName | spaceName | dateFiled | status
 *   sortOrder?: "asc" | "desc"                (default: "desc", newest-first)
 */
export const list = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const pageSizeRaw = parseInt(String(req.query.pageSize ?? "10"), 10) || 10;
    const pageSize = Math.min(100, Math.max(1, pageSizeRaw));

    const statusRaw = typeof req.query.status === "string" ? req.query.status.trim() : "all";
    const status = VALID_STATUS_FILTERS.has(statusRaw) ? (statusRaw as any) : "all";

    const search =
      typeof req.query.search === "string" && req.query.search.trim().length > 0
        ? req.query.search.trim()
        : undefined;

    const sortByRaw = typeof req.query.sortBy === "string" ? req.query.sortBy.trim() : undefined;
    const sortBy =
      sortByRaw && VALID_SORT_KEYS.has(sortByRaw) ? (sortByRaw as any) : undefined;

    const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";

    const result = await adminDisputeService.getAllDisputes({
      page,
      pageSize,
      status,
      search,
      sortBy,
      sortOrder,
    });

    return res.status(200).json({
      success: true,
      message: "Disputes fetched successfully",
      data: result,  // { items, total, page, pageSize }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/disputes/:id
 *
 * Path param :id is the Dispute CUID (or disputeNumber string as a fallback
 * so the admin can paste DP-001 into a deep-link URL if they want later).
 *
 * Returns full shaped Dispute DTO for the right-side drawer/detail sheet.
 * Throws 404 NotFoundError if no match.
 */
export const getById = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    if (!id || id.length === 0) throw new BadRequestError("Dispute id is required");

    const dispute = await adminDisputeService.getDisputeById(id);
    if (!dispute) throw new NotFoundError("Dispute not found");

    return res.status(200).json({
      success: true,
      message: "Dispute fetched successfully",
      data: dispute,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/disputes/:id/resolve
 *
 * Admin marks a dispute as resolved (status -> RESOLVED). Requires dispute
 * to be in the "new" bucket (OPEN or UNDER_REVIEW). If already RESOLVED/
 * REJECTED the call fails with BadRequest (idempotent-safe: marking a
 * resolved dispute as resolved again is a user error we want to surface).
 *
 * Body (optional):
 *   { resolutionNote?: string }  — admin written explanation stored on row
 *
 * Fire-and-forget side effects:
 *   1. AuditLog VERIFIED_DISPUTE_RESOLUTION (audits who resolved which dispute)
 *   2. Mobile notifications to both parties (raisedBy + counterparty)
 */
export const resolve = async (
  req: Request<{ id: string }, any, { resolutionNote?: string }> & AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.userId) throw new BadRequestError("Authenticated admin userId missing");

    const { id } = req.params;
    if (!id || id.length === 0) throw new BadRequestError("Dispute id is required");

    const resolutionNote =
      typeof req.body?.resolutionNote === "string" &&
      req.body.resolutionNote.trim().length > 0
        ? req.body.resolutionNote.trim()
        : "Resolved by admin";

    const shaped = await adminDisputeService.resolveDispute(
      id,
      req.userId,
      resolutionNote
    );

    return res.status(200).json({
      success: true,
      message: "Dispute resolved successfully",
      data: shaped,
    });
  } catch (error) {
    next(error);
  }
};