import Router from "express";
import { inviteAdminUser, acceptAdminInvitation } from '../../controllers/admin/admin.invitation.controller';

const adminInvitationRouter = Router();

adminInvitationRouter.post('/', inviteAdminUser);
adminInvitationRouter.post('/accept', acceptAdminInvitation);

export default adminInvitationRouter;