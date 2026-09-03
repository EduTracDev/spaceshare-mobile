import type { Request, Response, NextFunction } from "express";
import { BadRequestError } from "../../errors/index";
import type { AuthRequest } from "../../middleware/auth.middleware";
import * as adminNotificationService from "../../services/admin/notification.service";

const VALID_TABS = new Set(["all", "unread"]);

/**
 * GET /api/admin/notifications
 *
 * Query params:
 *   tab?       : "all" | "unread"   (default: "all")
 *   page?      : number              (default: 1, clamped >= 1)
 *   pageSize?  : number              (default: 50, clamped 1..200 — inbox allows bigger pages)
 *
 * Response envelope:
 *   { success: true, message, data: { items, total, page, pageSize, unreadCount } }
 *   Note: unreadCount is ALWAYS the admin user's TOTAL unread inbox count (full inbox,
 *   not just the returned page). Used by the top-right bell badge to show red indicator
 *   even if admin is on tab="all" viewing later pages of the paginated inbox.
 */
export const list = async (
  req: Request & AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.userId) throw new BadRequestError("Authenticated admin userId missing");

    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const pageSizeRaw = parseInt(String(req.query.pageSize ?? "50"), 10) || 50;
    const pageSize = Math.min(200, Math.max(1, pageSizeRaw));

    const tabRaw = typeof req.query.tab === "string" ? req.query.tab.trim() : "all";
    const tab = VALID_TABS.has(tabRaw) ? (tabRaw as "all" | "unread") : "all";

    const payload = await adminNotificationService.listAdminNotifications(req.userId, {
      page,
      pageSize,
      tab,
    });

    return res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      data: payload,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/notifications/:id/read
 *
 * Mark a single notification as READ. Reuses mobile markAsRead service directly —
 * so we inherit its 404 "notification not found" error and its strict ownership check
 * (blocks admin from marking another admin's notification as read).
 *
 * Returns shaped Notification with isRead=true.
 */
export const markOneRead = async (
  req: Request<{ id: string }> & AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.userId) throw new BadRequestError("Authenticated admin userId missing");

    const { id } = req.params;
    if (!id || id.length === 0) throw new BadRequestError("Notification id is required");

    const shaped = await adminNotificationService.markOneAdminAsRead(id, req.userId);

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: { ok: true as const, notification: shaped },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/notifications/read-all
 *
 * Mark ALL admin user's unread inbox notifications as read in one UPDATE call.
 * Responds with the exact count of how many notifications were flipped from unread
 * to read — used by frontend to show "Marked X notifications as read" toast.
 *
 * Return shape: { ok: true, updatedCount: N }
 */
export const markAllRead = async (
  req: Request & AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.userId) throw new BadRequestError("Authenticated admin userId missing");

    const updatedCount = await adminNotificationService.markAllAdminAsRead(req.userId);

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      data: { ok: true as const, updatedCount },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/notifications
 *
 * Clear (hard-delete) the admin user's entire notification inbox. Used by the
 * "Clear All" menu action in notification drawer. Returns removedCount so
 * frontend can show "Deleted X notifications" confirmation.
 */
export const clearAll = async (
  req: Request & AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.userId) throw new BadRequestError("Authenticated admin userId missing");

    const removedCount = await adminNotificationService.clearAllAdminNotifications(req.userId);

    return res.status(200).json({
      success: true,
      message: "All notifications cleared",
      data: { ok: true as const, removedCount },
    });
  } catch (error) {
    next(error);
  }
};