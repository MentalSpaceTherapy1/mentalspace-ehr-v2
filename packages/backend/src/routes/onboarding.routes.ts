import { Router } from 'express';
import onboardingController from '../controllers/onboarding.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();

/**
 * Module 9: Onboarding Routes
 * All routes require authentication
 */

// Apply authentication to all routes
router.use(authenticate);

// Statistics routes (must come before :id routes)
router.get(
  '/statistics',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN', 'SUPERVISOR']),
  onboardingController.getOnboardingStatistics
);

router.get(
  '/mentors/:mentorId/statistics',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN', 'SUPERVISOR']),
  onboardingController.getMentorStatistics
);

router.get(
  '/user/:userId',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN', 'SUPERVISOR', 'CLINICIAN']),
  onboardingController.getOnboardingChecklistByUserId
);

// CRUD routes for onboarding checklists
router.post(
  '/',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN']),
  onboardingController.createOnboardingChecklist
);

router.get(
  '/',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN', 'SUPERVISOR']),
  onboardingController.getOnboardingChecklists
);

router.get(
  '/:id',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN', 'SUPERVISOR', 'CLINICIAN']),
  onboardingController.getOnboardingChecklistById
);

router.put(
  '/:id',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN', 'SUPERVISOR']),
  onboardingController.updateOnboardingChecklist
);

router.delete(
  '/:id',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN']),
  onboardingController.deleteOnboardingChecklist
);

// Checklist item management
router.put(
  '/:id/items/:itemId',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN', 'SUPERVISOR', 'CLINICIAN']),
  onboardingController.updateChecklistItem
);

router.post(
  '/:id/items',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN', 'SUPERVISOR']),
  onboardingController.addChecklistItem
);

router.delete(
  '/:id/items/:itemId',
  requireRole(['ADMINISTRATOR', 'SUPER_ADMIN', 'SUPERVISOR']),
  onboardingController.removeChecklistItem
);

export default router;
