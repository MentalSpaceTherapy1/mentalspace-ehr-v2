import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { requireClientAccess, requireNoteAccess } from '../middleware/clientAccess';
import {
  getClientNotes,
  getClinicalNoteById,
  getClinicalNotes,
  createClinicalNote,
  updateClinicalNote,
  cosignClinicalNote,
  deleteClinicalNote,
  getNotesForCosigning,
  getClientDiagnosis,
  getTreatmentPlanStatus,
  getEligibleAppointments,
  getInheritedDiagnoses,
  getMyNotes,
  getAppointmentsWithoutNotes,
  getComplianceDashboard,
  returnForRevision,
  resubmitForReview,
  getValidationRulesForNoteType,
  validateNoteData,
  getValidationSummaryForNoteType,
} from '../controllers/clinicalNote.controller';
import { signClinicalNote } from '../controllers/signature.controller';
import { checkBillingReadiness } from '../controllers/billingHold.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// HIPAA Note: Clinical notes contain PHI. Access is restricted to:
// - SUPER_ADMIN, ADMINISTRATOR, CLINICAL_DIRECTOR (organization-wide)
// - SUPERVISOR (own notes + supervisees' notes)
// - CLINICIAN (own notes + assigned clients' notes)
// - BILLING_STAFF: NO ACCESS to clinical note content (HIPAA protection)

// Get my notes (logged-in clinician's notes across all clients)
router.get(
  '/my-notes',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLINICAL_DIRECTOR', 'INTERN', 'SUPER_ADMIN'),
  getMyNotes
);

// Get compliance dashboard data
router.get(
  '/compliance/dashboard',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLINICAL_DIRECTOR', 'SUPER_ADMIN'),
  getComplianceDashboard
);

// Get appointments without signed notes
router.get(
  '/compliance/appointments-without-notes',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLINICAL_DIRECTOR', 'SUPER_ADMIN'),
  getAppointmentsWithoutNotes
);

// Get notes for co-signing (supervisor)
router.get(
  '/cosigning',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICAL_DIRECTOR', 'SUPER_ADMIN'),
  getNotesForCosigning
);

// Get clinical notes with filtering (for Billing Readiness Checker and other views)
// Query params: status (comma-separated), limit, noteType, clientId
router.get(
  '/',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLINICAL_DIRECTOR', 'BILLING_STAFF', 'SUPER_ADMIN'),
  getClinicalNotes
);

// RLS: Client-specific routes require client access
router.get(
  '/client/:clientId/diagnosis',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLINICAL_DIRECTOR', 'INTERN', 'SUPER_ADMIN'),
  requireClientAccess('clientId'),
  getClientDiagnosis
);

router.get(
  '/client/:clientId/treatment-plan-status',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLINICAL_DIRECTOR', 'INTERN', 'SUPER_ADMIN'),
  requireClientAccess('clientId'),
  getTreatmentPlanStatus
);

router.get(
  '/client/:clientId/eligible-appointments/:noteType',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLINICAL_DIRECTOR', 'INTERN', 'SUPER_ADMIN'),
  requireClientAccess('clientId'),
  getEligibleAppointments
);

router.get(
  '/client/:clientId/inherited-diagnoses/:noteType',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLINICAL_DIRECTOR', 'INTERN', 'SUPER_ADMIN'),
  requireClientAccess('clientId'),
  getInheritedDiagnoses
);

// RLS: Get all notes for a client (requires client access)
router.get(
  '/client/:clientId',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLINICAL_DIRECTOR', 'INTERN', 'SUPER_ADMIN'),
  requireClientAccess('clientId'),
  getClientNotes
);

// RLS: Get note by ID (requires note access)
router.get(
  '/:id',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLINICAL_DIRECTOR', 'INTERN', 'SUPER_ADMIN'),
  requireNoteAccess('id'),
  getClinicalNoteById
);

// Create new note (with workflow validation)
// Note: Client access will be checked in the controller when creating
router.post(
  '/',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLINICAL_DIRECTOR', 'INTERN', 'SUPER_ADMIN'),
  createClinicalNote
);

// RLS: Update note (requires note access)
router.patch(
  '/:id',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLINICAL_DIRECTOR', 'INTERN', 'SUPER_ADMIN'),
  requireNoteAccess('id'),
  updateClinicalNote
);

router.put(
  '/:id',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLINICAL_DIRECTOR', 'INTERN', 'SUPER_ADMIN'),
  requireNoteAccess('id'),
  updateClinicalNote
);

// RLS: Sign note (requires note access)
router.post(
  '/:id/sign',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLINICAL_DIRECTOR', 'INTERN', 'SUPER_ADMIN'),
  requireNoteAccess('id'),
  signClinicalNote
);

// RLS: Co-sign note (supervisor - requires note access)
router.post(
  '/:id/cosign',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICAL_DIRECTOR', 'SUPER_ADMIN'),
  requireNoteAccess('id'),
  cosignClinicalNote
);

// RLS: Return for revision (supervisor - requires note access)
router.post(
  '/:id/return-for-revision',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICAL_DIRECTOR', 'SUPER_ADMIN'),
  requireNoteAccess('id'),
  returnForRevision
);

// RLS: Resubmit for review (clinician - requires note access)
router.post(
  '/:id/resubmit-for-review',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLINICAL_DIRECTOR', 'INTERN', 'SUPER_ADMIN'),
  requireNoteAccess('id'),
  resubmitForReview
);

// Phase 1.3: Validation endpoints (no RLS needed - generic validation rules)
router.get('/validation-rules/:noteType', getValidationRulesForNoteType);
router.post('/validate', validateNoteData);
router.get('/validation-summary/:noteType', getValidationSummaryForNoteType);

// RLS: Billing readiness check (note access required)
router.get(
  '/:id/billing-readiness',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLINICAL_DIRECTOR', 'BILLING_STAFF', 'SUPER_ADMIN'),
  requireNoteAccess('id'),
  checkBillingReadiness
);

// RLS: Delete note (draft only - requires note access)
router.delete(
  '/:id',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLINICAL_DIRECTOR', 'SUPER_ADMIN'),
  requireNoteAccess('id'),
  deleteClinicalNote
);

export default router;
