import { Router } from 'express';
import * as timeOffController from '../controllers/timeOff.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

/**
 * Module 3 Phase 2.3: Time-Off Request Routes
 *
 * All routes require authentication
 */

// Utility routes
router.get(
  '/affected-appointments',
  authenticate,
  timeOffController.getAffectedAppointments
);

router.post(
  '/suggest-coverage',
  authenticate,
  timeOffController.suggestCoverageProviders
);

router.get(
  '/stats',
  authenticate,
  timeOffController.getTimeOffStats
);

// Approval routes (admin only)
router.post(
  '/:id/approve',
  authenticate,
  authorize('ADMIN'),
  timeOffController.approveTimeOffRequest
);

router.post(
  '/:id/deny',
  authenticate,
  authorize('ADMIN'),
  timeOffController.denyTimeOffRequest
);

// CRUD routes
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'THERAPIST'),
  timeOffController.createTimeOffRequest
);

router.get(
  '/',
  authenticate,
  timeOffController.getAllTimeOffRequests
);

router.get(
  '/:id',
  authenticate,
  timeOffController.getTimeOffRequestById
);

router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'THERAPIST'),
  timeOffController.updateTimeOffRequest
);

router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN', 'THERAPIST'),
  timeOffController.deleteTimeOffRequest
);

export default router;
