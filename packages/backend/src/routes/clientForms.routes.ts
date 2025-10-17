import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as clientFormsController from '../controllers/clientForms.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Form Library & Assignment Routes
 */

// Get form library (all available forms) - accessible at /api/v1/clients/library
router.get('/library', clientFormsController.getFormLibrary);

// Client-specific form routes
router.get('/:clientId/forms', clientFormsController.getClientFormAssignments);
router.post('/:clientId/forms/assign', clientFormsController.assignFormToClient);
router.delete('/:clientId/forms/:assignmentId', clientFormsController.removeFormAssignment);
router.post('/:clientId/forms/:assignmentId/remind', clientFormsController.sendFormReminder);
router.get('/:clientId/forms/:assignmentId/submission', clientFormsController.viewFormSubmission);

export default router;
