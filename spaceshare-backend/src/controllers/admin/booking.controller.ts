// c:\Users\user\Projects\Curr Proj\SPACE_SHARE-ADM\spaceshare-mobile\spaceshare-backend\src\controllers\admin\booking.controller.ts
import { Request, Response, NextFunction } from "express";
import * as bookingService from "../../services/admin/booking.service";

type QueryStatus =
  | "pending"
  | "approved"
  | "declined"
  | "paid"
  | "completed"
  | "cancelled"
  | "disputed"
  | undefined;

type QuerySortBy =
  | "bookingNumber"
  | "guestName"
  | "hostName"
  | "spaceName"
  | "eventDate"
  | "amount"
  | "status"
  | undefined;

/**
 * GET /api/admin/bookings
 * Query params:
 *   page: number (default 1, clamped ≥ 1)
 *   pageSize: number (default 10, clamped 1-100 to prevent dumping all rows)
 *   status?: pending | approved | declined | paid | completed | cancelled | disputed
 *       disputed = any booking with an OPEN/IN_PROGRESS dispute row
 *       declined = Prisma BookingStatus.DECLINED (host rejected the PENDING booking request, NO refund)
 *       declined ≠ cancelled — see booking.service.ts mapStatus() contract docstring
 *   search?: case-insensitive match across spaceName, spaceLocation, guest firstName/lastName/email, host firstName/lastName/email
 *   sortBy?: bookingNumber | guestName | hostName | spaceName | eventDate | amount | status
 *   sortOrder?: asc | desc (default desc so newest bookings are first)
 */
export const getBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const pageSizeRaw =
      parseInt(String(req.query.pageSize ?? "10"), 10) || 10;
    const pageSize = Math.min(100, Math.max(1, pageSizeRaw));

    const status = (req.query.status as QueryStatus) ?? undefined;
    const search =
      typeof req.query.search === "string" && req.query.search.trim().length > 0
        ? req.query.search.trim()
        : undefined;
    const sortBy = (req.query.sortBy as QuerySortBy) ?? undefined;
    const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";

    const result = await bookingService.getAllBookings({
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
    // All errors flow to your global error-handler.middleware.ts (CustomErrors → status code; Prisma/DB → safe censored message)
    next(error);
  }
};

/**
 * GET /api/admin/bookings/:id
 * Single full booking for right-side details drawer/sheet on admin bookings page.
 * Throws NotFoundError (404 via global middleware) if the ID does not exist.
 */
export const getBookingById = async (
  req: Request<{id: string}>,
  res: Response,
  next: NextFunction
) => {
  try {
    const {id} = req.params;
    const booking = await bookingService.getBookingById(id);

    return res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};