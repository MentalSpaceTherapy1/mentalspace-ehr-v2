import { Router } from 'express';
import {
  getProviderUtilization,
  getNoShowRates,
  getRevenueAnalysis,
  getCancellationPatterns,
  getCapacityPlanning,
} from '../controllers/analytics.controller';
import { authenticate, authorize } from '../middleware/auth';
import { UserRoles } from '@mentalspace/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Provider utilization analytics
router.get(
  '/provider-utilization',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR),
  getProviderUtilization
);

// No-show rates analysis
router.get(
  '/no-show-rates',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR),
  getNoShowRates
);

// Revenue per hour analysis
router.get(
  '/revenue-analysis',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR),
  getRevenueAnalysis
);

// Cancellation pattern analysis
router.get(
  '/cancellation-patterns',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR),
  getCancellationPatterns
);

// Capacity planning projections
router.get(
  '/capacity-planning',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR),
  getCapacityPlanning
);

export default router;
