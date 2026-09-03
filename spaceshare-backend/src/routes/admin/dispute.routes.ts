import { Router } from "express";
import * as disputeController from "../../controllers/admin/dispute.controller";


const adminDisputeRoutes = Router();


adminDisputeRoutes.get("/", disputeController.list);
adminDisputeRoutes.get("/:id", disputeController.getById);
adminDisputeRoutes.patch("/:id/resolve", disputeController.resolve);

export default adminDisputeRoutes;