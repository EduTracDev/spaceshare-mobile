import { Request, Response, NextFunction } from "express";
import {
  getAllUsers,
  getUserById,
  suspendUser,
  reactivateUser,
  inviteAdmin,
} from "../../services/admin/user.service";
import { BadRequestError, ForbiddenError } from "../../errors";
import { AuthRequest } from "../../middleware/auth.middleware";

/**
 * GET /api/admin/users
 * Paginated, searchable, filterable users list for the admin dashboard table.
 */
export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      role = "host",
      search,
      status,
      page = 1,
      pageSize = 10,
      sortBy,
      sortOrder,
    } = req.query as any;

    if (!role || !["host", "guest", "admin"].includes(role)) {
      throw new BadRequestError("Role filter is required and must be one of: host, guest, admin");
    }

    const result = await getAllUsers({
      role,
      search: typeof search === "string" ? search : undefined,
      status: typeof status === "string" ? (status as any) : undefined,
      page: Number(page),
      pageSize: Number(pageSize),
      sortBy: typeof sortBy === "string" ? sortBy : undefined,
      sortOrder: sortOrder === "asc" || sortOrder === "desc" ? sortOrder : undefined,
    });

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: result,  // { items, total, page, pageSize }
      error: null,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * GET /api/admin/users/:id
 * Full details for a single user (populates the side sheet / details view).
 */
export const getUser = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) throw new BadRequestError("User id is required");
   
    const user = await getUserById(id);
    return res.status(200).json({
      success: true,
      message: "User fetched successfully",
      data: user,
      error: null,
    });
  } catch (error: any) {
    next(error);
  }
};


/**
 * POST /api/admin/users/:id/suspend
 * Soft-deactivate account: status = SUSPENDED. User can no longer log in.
 */

export const suspend = async (req: AuthRequest & Request<{ id: string }>, res: Response, next:NextFunction) => {
  try {
    const { id } = req.params;
    const suspenderId = req.userId;
    if (!id) throw new BadRequestError("User id is required");
    if (!suspenderId) throw new ForbiddenError("You cannot complete this action");

    const result = await suspendUser(id as string, suspenderId);
    
    return res.status(200).json({
      success: true,
      message: result.message,
      data: null,
      error: null,
    });
  } catch (error: any) {
    next(error);
  }
};


/**
 * POST /api/admin/users/:id/reactivate
 * Restore a SUSPENDED account to ACTIVE.
 */
export const reactivate = async (req: AuthRequest & Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) throw new BadRequestError("User id is required");
    if (!req.userId) throw new ForbiddenError("You cannot complete this action");

    const result = await reactivateUser(id as string, req.userId);
    return res.status(200).json({
      success: true,
      message: result.message,
      data: null,
      error: null,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * POST /api/admin/users/invite
 * Create a pending admin user record (invitation email sent separately).
 * Inviter id is read from the JWT on the calling admin (req.userId).
 */
export const invite = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, fullName, role, permissions } = req.body ?? {};

    const result = await inviteAdmin({
      email,
      fullName,
      role,
      permissions,
      invitedBy: req.userId,
    });

    return res.status(201).json({
      success: true,
      message: result.message,
      data: { admin: result.admin },
      error: null,
    });
  } catch (error: any) {
    next(error);
  }
};