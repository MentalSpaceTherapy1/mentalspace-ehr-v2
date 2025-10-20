import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { requireClientAccess } from '../middleware/clientAccess';
import * as clientAssessmentsController from '../controllers/clientAssessments.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN'));

/**
 * Assessment Assignment Routes (EHR-side for clinicians)
 */

// Client-specific assessment routes
router.use('/:clientId', requireClientAccess('clientId'));
router.get('/:clientId/assessments', clientAssessmentsController.getClientAssessments);
router.post('/:clientId/assessments/assign', clientAssessmentsController.assignAssessmentToClient);
router.delete('/:clientId/assessments/:assessmentId', clientAssessmentsController.removeAssessmentAssignment);
router.post('/:clientId/assessments/:assessmentId/remind', clientAssessmentsController.sendAssessmentReminder);
router.get('/:clientId/assessments/:assessmentId/results', clientAssessmentsController.viewAssessmentResults);
router.get('/:clientId/assessments/history', clientAssessmentsController.getAssessmentHistory);
router.get('/:clientId/assessments/:assessmentId/export', clientAssessmentsController.exportAssessmentPDF);

export default router;

