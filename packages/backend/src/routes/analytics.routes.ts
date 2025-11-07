import { Router } from 'express';
import {
  getProviderUtilization,
  getNoShowRates,
  getRevenueAnalysis,
  getCancellationPatterns,
  getCapacityPlanning,
} from '../controllers/analytics.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Provider utilization analytics
router.get(
  '/provider-utilization',
  authorize('ADMINISTRATOR', 'SUPERVISOR'),
  getProviderUtilization
);

// No-show rates analysis
router.get(
  '/no-show-rates',
  authorize('ADMINISTRATOR', 'SUPERVISOR'),
  getNoShowRates
);

// Revenue per hour analysis
router.get(
  '/revenue-analysis',
  authorize('ADMINISTRATOR', 'SUPERVISOR'),
  getRevenueAnalysis
);

// Cancellation pattern analysis
router.get(
  '/cancellation-patterns',
  authorize('ADMINISTRATOR', 'SUPERVISOR'),
  getCancellationPatterns
);

// Capacity planning projections
router.get(
  '/capacity-planning',
  authorize('ADMINISTRATOR', 'SUPERVISOR'),
  getCapacityPlanning
);

export default router;
