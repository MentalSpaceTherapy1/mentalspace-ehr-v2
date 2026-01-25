import { Router } from 'express';
import * as availabilityController from '../controllers/availability.controller';
import { authenticate, authorize } from '../middleware/auth';
import { UserRoles } from '@mentalspace/shared';

const router = Router();

/**
 * Module 3 Phase 2.3: Provider Availability Routes
 *
 * All routes require authentication
 */

// Utility routes (used by scheduling system)
router.post(
  '/check',
  authenticate,
  availabilityController.checkAvailability
);

router.post(
  '/find-available',
  authenticate,
  availabilityController.findAvailableProviders
);

router.post(
  '/validate',
  authenticate,
  availabilityController.validateSchedule
);

// Provider-specific routes
router.get(
  '/provider/:providerId/schedule',
  authenticate,
  availabilityController.getProviderSchedule
);

// CRUD routes
router.post(
  '/',
  authenticate,
  authorize(UserRoles.ADMINISTRATOR, UserRoles.CLINICIAN),
  availabilityController.createAvailability
);

router.get(
  '/',
  authenticate,
  availabilityController.getAllAvailabilities
);

router.get(
  '/:id',
  authenticate,
  availabilityController.getAvailabilityById
);

router.put(
  '/:id',
  authenticate,
  authorize(UserRoles.ADMINISTRATOR, UserRoles.CLINICIAN),
  availabilityController.updateAvailability
);

router.delete(
  '/:id',
  authenticate,
  authorize(UserRoles.ADMINISTRATOR, UserRoles.CLINICIAN),
  availabilityController.deleteAvailability
);

export default router;
