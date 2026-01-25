/**
 * Diagnosis Routes
 *
 * Routes for diagnosis management with Clinical Notes Business Rules
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as diagnosisController from '../controllers/diagnosis.controller';
import { UserRoles } from '@mentalspace/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/diagnoses
 * Create a new diagnosis
 * Only clinicians can create diagnoses
 */
router.post(
  '/',
  authorize(UserRoles.CLINICIAN, UserRoles.SUPERVISOR, UserRoles.ADMINISTRATOR),
  diagnosisController.createDiagnosis
);

/**
 * PUT /api/v1/diagnoses/:id
 * Update a diagnosis
 * Only clinicians can update diagnoses
 */
router.put(
  '/:id',
  authorize(UserRoles.CLINICIAN, UserRoles.SUPERVISOR, UserRoles.ADMINISTRATOR),
  diagnosisController.updateDiagnosis
);

/**
 * GET /api/v1/diagnoses/:id
 * Get diagnosis by ID
 * Clinicians and billing staff can view diagnoses
 */
router.get(
  '/:id',
  authorize(UserRoles.CLINICIAN, UserRoles.SUPERVISOR, UserRoles.ADMINISTRATOR, UserRoles.BILLING_STAFF),
  diagnosisController.getDiagnosisById
);

/**
 * GET /api/v1/diagnoses/client/:clientId
 * Get all diagnoses for a client
 */
router.get(
  '/client/:clientId',
  authorize(UserRoles.CLINICIAN, UserRoles.SUPERVISOR, UserRoles.ADMINISTRATOR, UserRoles.BILLING_STAFF),
  diagnosisController.getClientDiagnoses
);

/**
 * GET /api/v1/diagnoses/client/:clientId/stats
 * Get diagnosis statistics for a client
 */
router.get(
  '/client/:clientId/stats',
  authorize(UserRoles.CLINICIAN, UserRoles.SUPERVISOR, UserRoles.ADMINISTRATOR),
  diagnosisController.getClientDiagnosisStats
);

/**
 * GET /api/v1/diagnoses/:id/history
 * Get diagnosis history (audit trail)
 */
router.get(
  '/:id/history',
  authorize(UserRoles.CLINICIAN, UserRoles.SUPERVISOR, UserRoles.ADMINISTRATOR),
  diagnosisController.getDiagnosisHistory
);

/**
 * DELETE /api/v1/diagnoses/:id
 * Delete (deactivate) a diagnosis
 * Only clinicians can delete diagnoses
 */
router.delete(
  '/:id',
  authorize(UserRoles.CLINICIAN, UserRoles.SUPERVISOR, UserRoles.ADMINISTRATOR),
  diagnosisController.deleteDiagnosis
);

export default router;
