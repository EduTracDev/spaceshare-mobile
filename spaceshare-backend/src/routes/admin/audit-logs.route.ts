import { Router } from "express";
import * as auditLogController from "../../controllers/admin/audit-log.controller";

const adminAuditLogRoutes = Router();

/** GET /api/admin/audit-logs — paginated, searchable, date-range filterable audit log table */
adminAuditLogRoutes.get("/", auditLogController.getAuditLogs);

export default adminAuditLogRoutes;
