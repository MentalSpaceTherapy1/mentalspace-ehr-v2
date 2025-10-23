import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getClientNotes,
  getClinicalNoteById,
  createClinicalNote,
  updateClinicalNote,
  signClinicalNote,
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
} from '../controllers/clinicalNote.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get my notes (logged-in clinician's notes across all clients)
router.get('/my-notes', getMyNotes);

// Get compliance dashboard data
router.get('/compliance/dashboard', getComplianceDashboard);

// Get appointments without signed notes
router.get('/compliance/appointments-without-notes', getAppointmentsWithoutNotes);

// Get notes for co-signing (supervisor)
router.get('/cosigning', getNotesForCosigning);

// Get client diagnosis (from latest Intake/Treatment Plan)
router.get('/client/:clientId/diagnosis', getClientDiagnosis);

// Get treatment plan status for client
router.get('/client/:clientId/treatment-plan-status', getTreatmentPlanStatus);

// Get eligible appointments for a note type
router.get('/client/:clientId/eligible-appointments/:noteType', getEligibleAppointments);

// Get inherited diagnoses for a note type
router.get('/client/:clientId/inherited-diagnoses/:noteType', getInheritedDiagnoses);

// Get all notes for a client
router.get('/client/:clientId', getClientNotes);

// Get note by ID
router.get('/:id', getClinicalNoteById);

// Create new note (with workflow validation)
router.post('/', createClinicalNote);

// Update note
router.patch('/:id', updateClinicalNote);
router.put('/:id', updateClinicalNote);

// Sign note
router.post('/:id/sign', signClinicalNote);

// Co-sign note (supervisor)
router.post('/:id/cosign', cosignClinicalNote);

// Delete note (draft only)
router.delete('/:id', deleteClinicalNote);

export default router;
