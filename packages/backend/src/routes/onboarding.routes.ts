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
  requireRole(['ADMIN', 'SUPERADMIN', 'SUPERVISOR']),
  onboardingController.getOnboardingStatistics
);

router.get(
  '/mentors/:mentorId/statistics',
  requireRole(['ADMIN', 'SUPERADMIN', 'SUPERVISOR']),
  onboardingController.getMentorStatistics
);

router.get(
  '/user/:userId',
  requireRole(['ADMIN', 'SUPERADMIN', 'SUPERVISOR', 'CLINICIAN']),
  onboardingController.getOnboardingChecklistByUserId
);

// CRUD routes for onboarding checklists
router.post(
  '/',
  requireRole(['ADMIN', 'SUPERADMIN']),
  onboardingController.createOnboardingChecklist
);

router.get(
  '/',
  requireRole(['ADMIN', 'SUPERADMIN', 'SUPERVISOR']),
  onboardingController.getOnboardingChecklists
);

router.get(
  '/:id',
  requireRole(['ADMIN', 'SUPERADMIN', 'SUPERVISOR', 'CLINICIAN']),
  onboardingController.getOnboardingChecklistById
);

router.put(
  '/:id',
  requireRole(['ADMIN', 'SUPERADMIN', 'SUPERVISOR']),
  onboardingController.updateOnboardingChecklist
);

router.delete(
  '/:id',
  requireRole(['ADMIN', 'SUPERADMIN']),
  onboardingController.deleteOnboardingChecklist
);

// Checklist item management
router.put(
  '/:id/items/:itemId',
  requireRole(['ADMIN', 'SUPERADMIN', 'SUPERVISOR', 'CLINICIAN']),
  onboardingController.updateChecklistItem
);

router.post(
  '/:id/items',
  requireRole(['ADMIN', 'SUPERADMIN', 'SUPERVISOR']),
  onboardingController.addChecklistItem
);

router.delete(
  '/:id/items/:itemId',
  requireRole(['ADMIN', 'SUPERADMIN', 'SUPERVISOR']),
  onboardingController.removeChecklistItem
);

export default router;
