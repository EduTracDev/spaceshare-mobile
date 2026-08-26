import { Router } from "express";
import * as bookingController from "../../controllers/admin/booking.controller";

const adminBookingRoutes = Router();

adminBookingRoutes.get("/", bookingController.getBookings);
adminBookingRoutes.get("/:id", bookingController.getBookingById);

export default adminBookingRoutes;