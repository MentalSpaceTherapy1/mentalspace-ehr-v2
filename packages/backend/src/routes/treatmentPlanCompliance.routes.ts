/**
 * Treatment Plan Compliance Routes
 * Phase 5.x: Routes for treatment plan compliance tracking
 */

import { Router } from 'express';
import {
  getClientStatus,
  checkClientCompliance,
  getAllClientsStatus,
  getComplianceSummary,
  getDashboardData,
} from '../controllers/treatmentPlanCompliance.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/roleAuth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/treatment-plan-compliance/summary
 * Get compliance summary statistics
 * Accessible by: All authenticated clinical staff
 */
router.get(
  '/summary',
  requireRole([
    'ADMINISTRATOR',
    'SUPER_ADMIN',
    'SUPERVISOR',
    'CLINICAL_DIRECTOR',
    'CLINICIAN',
    'INTERN',
  ]),
  getComplianceSummary
);

/**
 * GET /api/treatment-plan-compliance/dashboard
 * Get dashboard widget data
 * Accessible by: All authenticated clinical staff
 */
router.get(
  '/dashboard',
  requireRole([
    'ADMINISTRATOR',
    'SUPER_ADMIN',
    'SUPERVISOR',
    'CLINICAL_DIRECTOR',
    'CLINICIAN',
    'INTERN',
  ]),
  getDashboardData
);

/**
 * GET /api/treatment-plan-compliance/all
 * Get all clients' treatment plan status
 * Accessible by: All authenticated clinical staff
 */
router.get(
  '/all',
  requireRole([
    'ADMINISTRATOR',
    'SUPER_ADMIN',
    'SUPERVISOR',
    'CLINICAL_DIRECTOR',
    'CLINICIAN',
    'INTERN',
  ]),
  getAllClientsStatus
);

/**
 * GET /api/treatment-plan-compliance/check/:clientId
 * Check if client's treatment plan is overdue (for note blocking)
 * Accessible by: All authenticated clinical staff
 */
router.get(
  '/check/:clientId',
  requireRole([
    'ADMINISTRATOR',
    'SUPER_ADMIN',
    'SUPERVISOR',
    'CLINICAL_DIRECTOR',
    'CLINICIAN',
    'INTERN',
  ]),
  checkClientCompliance
);

/**
 * GET /api/treatment-plan-compliance/client/:clientId
 * Get treatment plan status for a specific client
 * Accessible by: All authenticated clinical staff
 */
router.get(
  '/client/:clientId',
  requireRole([
    'ADMINISTRATOR',
    'SUPER_ADMIN',
    'SUPERVISOR',
    'CLINICAL_DIRECTOR',
    'CLINICIAN',
    'INTERN',
  ]),
  getClientStatus
);

export default router;
