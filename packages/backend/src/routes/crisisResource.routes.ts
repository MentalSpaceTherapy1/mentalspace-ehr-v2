/**
 * Crisis Resource Routes
 * Module 6 - Telehealth Phase 2: Emergency System Enhancements
 */

import { Router } from 'express';
import * as crisisResourceController from '../controllers/crisisResource.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Public routes (accessible during emergency situations)
router.get(
  '/',
  authenticate,
  crisisResourceController.getCrisisResources
);

router.get(
  '/emergency/:emergencyType',
  authenticate,
  crisisResourceController.getCrisisResourcesForEmergency
);

router.get(
  '/categories',
  authenticate,
  crisisResourceController.getCrisisResourceCategories
);

router.get(
  '/search',
  authenticate,
  crisisResourceController.searchCrisisResources
);

router.get(
  '/:id',
  authenticate,
  crisisResourceController.getCrisisResourceById
);

// Admin routes (requires elevated permissions)
router.post(
  '/',
  authenticate,
  authorize('ADMINISTRATOR', 'SUPERVISOR'),
  crisisResourceController.createCrisisResource
);

router.put(
  '/:id',
  authenticate,
  authorize('ADMINISTRATOR', 'SUPERVISOR'),
  crisisResourceController.updateCrisisResource
);

router.delete(
  '/:id',
  authenticate,
  authorize('ADMINISTRATOR'),
  crisisResourceController.deleteCrisisResource
);

router.post(
  '/reorder',
  authenticate,
  authorize('ADMINISTRATOR', 'SUPERVISOR'),
  crisisResourceController.reorderCrisisResources
);

export default router;
