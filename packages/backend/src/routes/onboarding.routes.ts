import { Router } from 'express';
import onboardingController from '../controllers/onboarding.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';
import { UserRoles } from '@mentalspace/shared';

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
  requireRole([UserRoles.ADMINISTRATOR, UserRoles.SUPER_ADMIN, UserRoles.SUPERVISOR]),
  onboardingController.getOnboardingStatistics
);

router.get(
  '/mentors/:mentorId/statistics',
  requireRole([UserRoles.ADMINISTRATOR, UserRoles.SUPER_ADMIN, UserRoles.SUPERVISOR]),
  onboardingController.getMentorStatistics
);

router.get(
  '/user/:userId',
  requireRole([UserRoles.ADMINISTRATOR, UserRoles.SUPER_ADMIN, UserRoles.SUPERVISOR, UserRoles.CLINICIAN]),
  onboardingController.getOnboardingChecklistByUserId
);

// CRUD routes for onboarding checklists
router.post(
  '/',
  requireRole([UserRoles.ADMINISTRATOR, UserRoles.SUPER_ADMIN]),
  onboardingController.createOnboardingChecklist
);

router.get(
  '/',
  requireRole([UserRoles.ADMINISTRATOR, UserRoles.SUPER_ADMIN, UserRoles.SUPERVISOR]),
  onboardingController.getOnboardingChecklists
);

router.get(
  '/:id',
  requireRole([UserRoles.ADMINISTRATOR, UserRoles.SUPER_ADMIN, UserRoles.SUPERVISOR, UserRoles.CLINICIAN]),
  onboardingController.getOnboardingChecklistById
);

router.put(
  '/:id',
  requireRole([UserRoles.ADMINISTRATOR, UserRoles.SUPER_ADMIN, UserRoles.SUPERVISOR]),
  onboardingController.updateOnboardingChecklist
);

router.delete(
  '/:id',
  requireRole([UserRoles.ADMINISTRATOR, UserRoles.SUPER_ADMIN]),
  onboardingController.deleteOnboardingChecklist
);

// Checklist item management
router.put(
  '/:id/items/:itemId',
  requireRole([UserRoles.ADMINISTRATOR, UserRoles.SUPER_ADMIN, UserRoles.SUPERVISOR, UserRoles.CLINICIAN]),
  onboardingController.updateChecklistItem
);

router.post(
  '/:id/items',
  requireRole([UserRoles.ADMINISTRATOR, UserRoles.SUPER_ADMIN, UserRoles.SUPERVISOR]),
  onboardingController.addChecklistItem
);

router.delete(
  '/:id/items/:itemId',
  requireRole([UserRoles.ADMINISTRATOR, UserRoles.SUPER_ADMIN, UserRoles.SUPERVISOR]),
  onboardingController.removeChecklistItem
);

export default router;
