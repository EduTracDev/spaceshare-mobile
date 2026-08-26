import type { Request, Response, NextFunction } from "express";
import * as auditLogService from "../../services/admin/audit-log.service";

/**
 * GET /api/admin/audit-logs
 *
 * Query params:
 *   page: number            (default 1, clamped ≥ 1)
 *   pageSize: number        (default 10, clamped 1-100)
 *   search?: string         case-insensitive match: description / actor name+email / action label
 *   dateRangeStart?: string ISO date string — inclusive start (e.g. "2025-09-01")
 *   dateRangeEnd?: string   ISO date string — inclusive end (e.g. "2025-09-30")
 *   sortBy?: "actorName" | "timestamp" | "action" | "description"
 *   sortOrder?: "asc" | "desc" (default desc, newest first for audit logs)
 *
 * Response:
 *   { success: true, data: { items, total, page, pageSize } }
 */
export const getAuditLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const pageSizeRaw = parseInt(String(req.query.pageSize ?? "10"), 10) || 10;
    const pageSize = Math.min(100, Math.max(1, pageSizeRaw));

    const search =
      typeof req.query.search === "string" && req.query.search.trim().length > 0
        ? req.query.search.trim()
        : undefined;

    const dateRangeStart =
      typeof req.query.dateRangeStart === "string" && req.query.dateRangeStart.trim()
        ? req.query.dateRangeStart.trim()
        : null;
    const dateRangeEnd =
      typeof req.query.dateRangeEnd === "string" && req.query.dateRangeEnd.trim()
        ? req.query.dateRangeEnd.trim()
        : null;
    const hasAnyDate = dateRangeStart || dateRangeEnd;
    const dateRange = hasAnyDate ? { start: dateRangeStart, end: dateRangeEnd } : undefined;

    const sortByRaw = req.query.sortBy;
    const sortBy =
      sortByRaw === "actorName" ||
      sortByRaw === "timestamp" ||
      sortByRaw === "action" ||
      sortByRaw === "description"
        ? sortByRaw
        : undefined;
    const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";

    const result = await auditLogService.getAllAuditLogs({
      page,
      pageSize,
      search,
      dateRange,
      sortBy,
      sortOrder,
    });

    return res.status(200).json({
      success: true,
      message: "Audit logs fetched successfully",
      data: result,
    });
  } catch (error) {
    // Flow to global censored error handler — never leak Prisma details to frontend
    next(error);
  }
};