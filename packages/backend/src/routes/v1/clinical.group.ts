/**
 * Clinical Documentation Route Group
 * Module 4: Clinical Notes, Signatures, Diagnoses, Outcome Measures
 */
import { Router } from 'express';
import clinicalNoteRoutes from '../clinicalNote.routes';
import diagnosisRoutes from '../diagnosis.routes';
import signatureRoutes from '../signature.routes';
import amendmentRoutes from '../amendment.routes';
import outcomeMeasureRoutes from '../outcomeMeasure.routes';
import clinicalNoteReminderRoutes from '../clinicalNoteReminder.routes';
import reminderConfigRoutes from '../reminderConfig.routes';
import groupTherapyNoteRoutes from '../groupTherapyNote.routes';
import supervisionRoutes from '../supervision.routes';

const router = Router();

// Clinical notes
router.use('/clinical-notes', clinicalNoteRoutes);
router.use('/group-therapy-notes', groupTherapyNoteRoutes);

// Diagnoses
router.use('/diagnoses', diagnosisRoutes);

// Electronic signatures
router.use('/signatures', signatureRoutes);

// Amendment history (registers routes under /amendments)
router.use('/', amendmentRoutes);

// Outcome measures
router.use('/outcome-measures', outcomeMeasureRoutes);

// Clinical note reminders
router.use('/clinical-note-reminders', clinicalNoteReminderRoutes);
router.use('/reminder-config', reminderConfigRoutes);

// Supervision
router.use('/supervision', supervisionRoutes);

export default router;
