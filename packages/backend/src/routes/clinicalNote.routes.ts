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
} from '../controllers/clinicalNote.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get notes for co-signing (supervisor)
router.get('/cosigning', getNotesForCosigning);

// Get client diagnosis (from latest Intake/Treatment Plan)
router.get('/client/:clientId/diagnosis', getClientDiagnosis);

// Get treatment plan status for client
router.get('/client/:clientId/treatment-plan-status', getTreatmentPlanStatus);

// Get all notes for a client
router.get('/client/:clientId', getClientNotes);

// Get note by ID
router.get('/:id', getClinicalNoteById);

// Create new note (with workflow validation)
router.post('/', createClinicalNote);

// Update note
router.patch('/:id', updateClinicalNote);

// Sign note
router.post('/:id/sign', signClinicalNote);

// Co-sign note (supervisor)
router.post('/:id/cosign', cosignClinicalNote);

// Delete note (draft only)
router.delete('/:id', deleteClinicalNote);

export default router;
