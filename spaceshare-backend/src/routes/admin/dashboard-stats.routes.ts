import Router from 'express';
import {getDashboard} from '../../controllers/admin/dashboard-stats.controller';
import { authenticate } from '../../middleware/auth.middleware';

const adminDashboardRoutes = Router();

adminDashboardRoutes.get('/', getDashboard);




export default adminDashboardRoutes;