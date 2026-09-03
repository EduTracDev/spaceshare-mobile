import Router from "express";
import adminAuthRoutes from "./adminauth.routes";
import adminInvitationRoutes from "./invitation.route";
import adminDashboardRoutes from "./dashboard-stats.routes";
import adminUserRoutes from "./user.routes";
import adminListingRoutes from "./listing.routes";
import adminBookingRoutes from "./booking.routes";
import adminTransactionRoutes from "./transaction.routes";
import adminDisputeRoutes from "./dispute.routes";
import adminReportedReviewsRoutes from "./reported-reviews.route";
import adminAuditLogRoutes from "./audit-logs.route";
import adminSettingsRoutes from "./settings.routes";
import adminNotificationsRoutes from "./notifications.routes";
import { authenticate } from "../../middleware/auth.middleware";
import {requireAdmin} from "../../middleware/admin/admin.middleware";

const adminRouter = Router();

//auth routes
adminRouter.use('/auth', adminAuthRoutes);
adminRouter.use('/invitation', adminInvitationRoutes);

//middlewares applied after auth routes
adminRouter.use(authenticate, requireAdmin);

adminRouter.use('/dashboard-stats', adminDashboardRoutes);
adminRouter.use('/users', adminUserRoutes);
adminRouter.use('/listings', adminListingRoutes);
adminRouter.use('/bookings', adminBookingRoutes)
adminRouter.use('/transactions', adminTransactionRoutes);
adminRouter.use('/disputes', adminDisputeRoutes);
adminRouter.use('/reported-reviews', adminReportedReviewsRoutes);
adminRouter.use('/audit-logs', adminAuditLogRoutes);
adminRouter.use('/settings', adminSettingsRoutes);
adminRouter.use('/notifications', adminNotificationsRoutes);

export default adminRouter;