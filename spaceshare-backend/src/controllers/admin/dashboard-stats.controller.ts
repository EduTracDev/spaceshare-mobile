import {Request, Response} from 'express';
import * as dashboardService from '../../services/admin/dashboard-stats.service';
import {MOCK_DASHBOARD} from '../../mocks/dashboard.mock';

export const getDashboard = async (req: Request, res:Response) => {
    try {
        const data = await dashboardService.getDashboard();
        return res.status(200).json({
            success: true,
            message: 'Request successfull',
            data: MOCK_DASHBOARD,
            error: null
        });
    } catch(error){
        console.error("Error in dashboard controller:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve dashboard data",
            data: null,
            error: "INTERNAL_SERVER_ERROR",
        });
    }
}