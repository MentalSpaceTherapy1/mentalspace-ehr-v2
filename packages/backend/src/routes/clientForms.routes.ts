import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { requireClientAccess } from '../middleware/clientAccess';
import * as clientFormsController from '../controllers/clientForms.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN'));

/**
 * Form Library & Assignment Routes
 */

// Get form library (all available forms) - accessible at /api/v1/clients/library
router.get('/library', clientFormsController.getFormLibrary);

// Client-specific form routes
router.use('/:clientId', requireClientAccess('clientId'));
router.get('/:clientId/forms', clientFormsController.getClientFormAssignments);
router.post('/:clientId/forms/assign', clientFormsController.assignFormToClient);
router.delete('/:clientId/forms/:assignmentId', clientFormsController.removeFormAssignment);
router.post('/:clientId/forms/:assignmentId/remind', clientFormsController.sendFormReminder);
router.get('/:clientId/forms/:assignmentId/submission', clientFormsController.viewFormSubmission);

export default router;

