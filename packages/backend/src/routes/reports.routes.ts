import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getRevenueByClinicianReport,
  getRevenueByCPTReport,
  getRevenueByPayerReport,
  getPaymentCollectionReport,
  getKVRAnalysisReport,
  getSessionsPerDayReport,
  getUnsignedNotesReport,
  getMissingTreatmentPlansReport,
  getClientDemographicsReport,
  getReportQuickStats,
} from '../controllers/reports.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Quick stats for dashboard
router.get('/quick-stats', getReportQuickStats);

// Revenue Reports
router.get('/revenue/by-clinician', getRevenueByClinicianReport);
router.get('/revenue/by-cpt', getRevenueByCPTReport);
router.get('/revenue/by-payer', getRevenueByPayerReport);
router.get('/revenue/collection', getPaymentCollectionReport);

// Productivity Reports
router.get('/productivity/kvr-analysis', getKVRAnalysisReport);
router.get('/productivity/sessions-per-day', getSessionsPerDayReport);

// Compliance Reports
router.get('/compliance/unsigned-notes', getUnsignedNotesReport);
router.get('/compliance/missing-treatment-plans', getMissingTreatmentPlansReport);

// Demographics Reports
router.get('/demographics/client-demographics', getClientDemographicsReport);

export default router;
