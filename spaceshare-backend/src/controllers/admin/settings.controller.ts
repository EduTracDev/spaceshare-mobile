import type { NextFunction, Request, Response } from "express";
import {
  getSettingsBundle,
  getAdminProfile,
  updateAdminProfile,
  getPlatformCommission,
  updatePlatformCommission
} from "../../services/admin/settings.service";
import type { AuthRequest } from "../../middleware/admin/admin.middleware";

/**
 * GET /api/admin/settings
 * Page-load endpoint: returns BOTH admin profile + platform commission.
 * One RTT, one auth validation, one DB transaction.
 * Use this instead of firing separate GET /profile + GET /commission on mount.
 */
export const getAllSettings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const actorId = req.userId!;
    const data = await getSettingsBundle(actorId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/settings/profile
 * Returns the authenticated admin's fullName + email for the Profile card.
 */
export const getProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const actorId = req.userId!;
    const profile = await getAdminProfile(actorId);
    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/settings/profile
 * Body: { fullName: string }
 * Updates the name split into firstName + lastName on the User row.
 * Email is read-only (admin-managed).
 */
export const updateProfile = async (
  req: AuthRequest & Request<{}, {}, { fullName?: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const actorId = req.userId!;
    const result = await updateAdminProfile(actorId, {
      fullName: req.body.fullName ?? "",
    });
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/settings/commission
 * Returns { hostCommissionPercent, guestProcessingFeePercent }.
 */
export const getCommission = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await getPlatformCommission();
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/settings/commission
 * Body: { hostCommissionPercent: number, guestProcessingFeePercent: number }
 */
export const updateCommission = async (
  req: AuthRequest &
    Request<
      {},
      {},
      { hostCommissionPercent?: number; guestProcessingFeePercent?: number }
    >,
  res: Response,
  next: NextFunction
) => {
  try {
    const actorId = req.userId!;
    const result = await updatePlatformCommission(actorId, {
      hostCommissionPercent: Number(req.body.hostCommissionPercent),
      guestProcessingFeePercent: Number(req.body.guestProcessingFeePercent),
    });
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};