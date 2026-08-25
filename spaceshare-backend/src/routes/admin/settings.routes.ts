import { Router } from "express";
import * as settingsController from "../../controllers/admin/settings.controller";

const adminSettingsRoutes = Router();


adminSettingsRoutes.get("/", settingsController.getAllSettings);


adminSettingsRoutes.get("/profile", settingsController.getProfile);
adminSettingsRoutes.patch("/profile", settingsController.updateProfile);


adminSettingsRoutes.get("/commission", settingsController.getCommission);
adminSettingsRoutes.patch("/commission", settingsController.updateCommission);


export default adminSettingsRoutes;