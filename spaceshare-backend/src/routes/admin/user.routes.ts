import Router from 'express';
import {
  getUsers,
  getUser,
  suspend,
  reactivate,
  invite,
} from '../../controllers/admin/user.controller';

const adminUserRoutes = Router();

// Prefix: /api/admin/users (from index.routes line 26)
adminUserRoutes.get('/', getUsers);                    // GET  /api/admin/users?role=host&page=1&search=ada...
adminUserRoutes.get('/:id', getUser);                  // GET  /api/admin/users/:id
export default adminUserRoutes;

adminUserRoutes.post('/invite', invite);               // POST /api/admin/users/invite — create pending admin
adminUserRoutes.post('/:id/suspend', suspend);         // POST /api/admin/users/:id/suspend
adminUserRoutes.post('/:id/reactivate', reactivate);   // POST /api/admin/users/:id/reactivate