import { Router } from "express";
import * as notificationsController from "../../controllers/admin/notifications.controller";


const adminNotificationsRoutes = Router();

adminNotificationsRoutes.get("/", notificationsController.list);
adminNotificationsRoutes.patch("/:id/read", notificationsController.markOneRead);
adminNotificationsRoutes.patch("/read-all", notificationsController.markAllRead);
adminNotificationsRoutes.delete("/", notificationsController.clearAll);

export default adminNotificationsRoutes;