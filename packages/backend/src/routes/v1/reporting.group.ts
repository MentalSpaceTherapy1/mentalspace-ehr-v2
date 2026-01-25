/**
 * Reporting & Analytics Route Group
 * Module 8: Reports, Dashboards, Analytics, BI Integrations
 */
import { Router } from 'express';
import reportsRoutes from '../reports.routes';
import customReportsRoutes from '../custom-reports.routes';
import dashboardRoutes from '../dashboard.routes';
import analyticsRoutes from '../analytics.routes';
import predictionRoutes from '../prediction.routes';
import exportRoutes from '../export.routes';
import subscriptionsRoutes from '../subscriptions.routes';
import reportSchedulesRoutes from '../report-schedules.routes';
import distributionListsRoutes from '../distribution-lists.routes';
import powerbiIntegration from '../../integrations/powerbi.integration';
import tableauIntegration from '../../integrations/tableau.integration';

const router = Router();

// Core reports
router.use('/reports', reportsRoutes);
router.use('/custom-reports', customReportsRoutes);

// Dashboards
router.use('/dashboards', dashboardRoutes);

// Analytics & predictions
router.use('/analytics', analyticsRoutes);
router.use('/predictions', predictionRoutes);

// Report distribution
router.use('/subscriptions', subscriptionsRoutes);
router.use('/report-schedules', reportSchedulesRoutes);
router.use('/distribution-lists', distributionListsRoutes);

// Data export (registers routes under /export)
router.use('/', exportRoutes);

// BI Tool integrations (registers routes under /powerbi, /tableau)
router.use('/', powerbiIntegration);
router.use('/', tableauIntegration);

export default router;
