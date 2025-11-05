/**
 * Client Diagnosis Routes
 *
 * Module 2: Client Management - Diagnosis Management Routes
 * Defines all API endpoints for client diagnosis operations
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as ClientDiagnosisController from '../controllers/client-diagnosis.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// ICD-10 CODE SEARCH
// ============================================================================

/**
 * GET /api/v1/diagnoses/icd10/search?q=depression
 * Search ICD-10 codes (must be before :id route to avoid conflict)
 * Accessible by clinicians and authorized staff
 */
router.get(
  '/icd10/search',
  authorize('CLINICIAN', 'SUPERVISOR', 'ADMINISTRATOR', 'BILLING_STAFF'),
  ClientDiagnosisController.searchICD10Codes
);

// ============================================================================
// CLIENT-SPECIFIC DIAGNOSIS ROUTES
// ============================================================================

/**
 * POST /api/v1/clients/:clientId/diagnoses
 * Add a new diagnosis for a client
 * Only clinicians can add diagnoses
 */
router.post(
  '/clients/:clientId/diagnoses',
  authorize('CLINICIAN', 'SUPERVISOR', 'ADMINISTRATOR'),
  ClientDiagnosisController.addDiagnosis
);

/**
 * GET /api/v1/clients/:clientId/diagnoses
 * Get all diagnoses for a client
 * Query params: activeOnly=true, diagnosisType=PRIMARY
 * Accessible by clinicians and billing staff
 */
router.get(
  '/clients/:clientId/diagnoses',
  authorize('CLINICIAN', 'SUPERVISOR', 'ADMINISTRATOR', 'BILLING_STAFF'),
  ClientDiagnosisController.getClientDiagnoses
);

/**
 * GET /api/v1/clients/:clientId/diagnoses/stats
 * Get diagnosis statistics for a client
 * Accessible by clinicians
 */
router.get(
  '/clients/:clientId/diagnoses/stats',
  authorize('CLINICIAN', 'SUPERVISOR', 'ADMINISTRATOR'),
  ClientDiagnosisController.getClientDiagnosisStats
);

// ============================================================================
// INDIVIDUAL DIAGNOSIS ROUTES
// ============================================================================

/**
 * GET /api/v1/diagnoses/:id
 * Get a single diagnosis by ID
 * Accessible by clinicians and billing staff
 */
router.get(
  '/diagnoses/:id',
  authorize('CLINICIAN', 'SUPERVISOR', 'ADMINISTRATOR', 'BILLING_STAFF'),
  ClientDiagnosisController.getDiagnosisById
);

/**
 * PATCH /api/v1/diagnoses/:id
 * Update a diagnosis
 * Only clinicians can update diagnoses
 */
router.patch(
  '/diagnoses/:id',
  authorize('CLINICIAN', 'SUPERVISOR', 'ADMINISTRATOR'),
  ClientDiagnosisController.updateDiagnosis
);

/**
 * PATCH /api/v1/diagnoses/:id/status
 * Quick update of diagnosis status (ACTIVE, RESOLVED, RULE_OUT_REJECTED)
 * Only clinicians can update diagnosis status
 */
router.patch(
  '/diagnoses/:id/status',
  authorize('CLINICIAN', 'SUPERVISOR', 'ADMINISTRATOR'),
  ClientDiagnosisController.updateDiagnosisStatus
);

/**
 * DELETE /api/v1/diagnoses/:id
 * Delete (soft delete) a diagnosis
 * Only clinicians can delete diagnoses
 */
router.delete(
  '/diagnoses/:id',
  authorize('CLINICIAN', 'SUPERVISOR', 'ADMINISTRATOR'),
  ClientDiagnosisController.deleteDiagnosis
);

export default router;
