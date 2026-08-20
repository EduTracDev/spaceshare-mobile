import { Request, Response } from "express";
import {
  getAllUsers,
  getUserById,
  suspendUser,
  reactivateUser,
  inviteAdmin,
} from "../../services/admin/user.service";
import { AuthRequest } from "../../middleware/auth.middleware";
import { BadRequestError } from "../../errors";

/**
 * GET /api/admin/users
 * Paginated, searchable, filterable users list for the admin dashboard table.
 */
export const getUsers = async (req: Request, res: Response) => {
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
    const status =
      error?.name === "BadRequestError" ||
      error?.constructor?.name === "BadRequestError"
        ? 400
        : 500;
    return res.status(status).json({ message: error.message });
  }
};

/**
 * GET /api/admin/users/:id
 * Full details for a single user (populates the side sheet / details view).
 */
export const getUser = async (req: Request<{ id: string }>, res: Response) => {
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
    const status =
      error?.name === "NotFoundError" ||
      error?.constructor?.name === "NotFoundError"
        ? 404
        : error?.name === "BadRequestError" ||
          error?.constructor?.name === "BadRequestError"
        ? 400
        : 500;
    return res.status(status).json({ message: error.message });
  }
};

/**
 * POST /api/admin/users/:id/suspend
 * Soft-deactivate account: status = SUSPENDED. User can no longer log in.
 */
export const suspend = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) throw new BadRequestError("User id is required");

    const result = await suspendUser(id);
    return res.status(200).json({
      success: true,
      message: result.message,
      data: null,
      error: null,
    });
  } catch (error: any) {
    const status =
      error?.name === "NotFoundError" ||
      error?.constructor?.name === "NotFoundError"
        ? 404
        : error?.name === "BadRequestError" ||
          error?.constructor?.name === "BadRequestError"
        ? 400
        : 500;
    return res.status(status).json({ message: error.message });
  }
};

/**
 * POST /api/admin/users/:id/reactivate
 * Restore a SUSPENDED account to ACTIVE.
 */
export const reactivate = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) throw new BadRequestError("User id is required");

    const result = await reactivateUser(id);
    return res.status(200).json({
      success: true,
      message: result.message,
      data: null,
      error: null,
    });
  } catch (error: any) {
    const status =
      error?.name === "NotFoundError" ||
      error?.constructor?.name === "NotFoundError"
        ? 404
        : error?.name === "BadRequestError" ||
          error?.constructor?.name === "BadRequestError"
        ? 400
        : 500;
    return res.status(status).json({ message: error.message });
  }
};

/**
 * POST /api/admin/users/invite
 * Create a pending admin user record (invitation email sent separately).
 * Inviter id is read from the JWT on the calling admin (req.userId).
 */
export const invite = async (req: AuthRequest, res: Response) => {
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
    const status =
      error?.name === "BadRequestError" ||
      error?.constructor?.name === "BadRequestError"
        ? 400
        : 500;
    return res.status(status).json({ message: error.message });
  }
};