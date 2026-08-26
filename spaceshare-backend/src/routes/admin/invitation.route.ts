import Router from "express";
import { inviteAdminUser, acceptAdminInvitation } from '../../controllers/admin/admin.invitation.controller';
import { authenticate } from "../../middleware/auth.middleware";
import { requireSuperAdmin } from "../../middleware/admin/admin.middleware";

const adminInvitationRouter = Router();

adminInvitationRouter.post('/create', authenticate, requireSuperAdmin, inviteAdminUser);
adminInvitationRouter.post('/accept', acceptAdminInvitation);

export default adminInvitationRouter;