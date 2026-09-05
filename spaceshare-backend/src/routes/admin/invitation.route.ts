import Router from "express";
import { inviteAdminUser, acceptAdminInvitation, resendAdminInvitation, revokeAdminInvitation  } from '../../controllers/admin/admin.invitation.controller';
import { authenticate } from "../../middleware/auth.middleware";
import { requireSuperAdmin } from "../../middleware/admin/admin.middleware";

const adminInvitationRouter = Router();

adminInvitationRouter.post('/create', authenticate, requireSuperAdmin, inviteAdminUser);
adminInvitationRouter.post('/accept', acceptAdminInvitation);
adminInvitationRouter.patch('/resend', authenticate, requireSuperAdmin, resendAdminInvitation);
adminInvitationRouter.patch('/revoke', revokeAdminInvitation);

export default adminInvitationRouter;