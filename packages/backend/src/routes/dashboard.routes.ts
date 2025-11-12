import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Dashboard CRUD operations
router.post('/', dashboardController.createDashboard);
router.get('/', dashboardController.getDashboards);
router.get('/:id', dashboardController.getDashboardById);
router.put('/:id', dashboardController.updateDashboard);
router.delete('/:id', dashboardController.deleteDashboard);

// Widget operations
router.post('/:id/widgets', dashboardController.addWidget);
router.put('/widgets/:widgetId', dashboardController.updateWidget);
router.delete('/widgets/:widgetId', dashboardController.deleteWidget);

// Real-time data
router.get('/:id/data', dashboardController.getDashboardData);

export default router;
