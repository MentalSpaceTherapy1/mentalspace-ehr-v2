/**
 * Emergency Protocol Routes
 * Module 6 - Telehealth Phase 2: Emergency System Enhancements
 */

import { Router } from 'express';
import * as emergencyProtocolController from '../controllers/emergencyProtocol.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Accessible during emergency situations
router.get(
  '/',
  authenticate,
  emergencyProtocolController.getEmergencyProtocols
);

router.get(
  '/emergency-type/:emergencyType',
  authenticate,
  emergencyProtocolController.getProtocolForEmergencyType
);

router.get(
  '/:id',
  authenticate,
  emergencyProtocolController.getEmergencyProtocolById
);

// Admin routes
router.post(
  '/',
  authenticate,
  authorize(['ADMINISTRATOR', 'SUPERVISOR']),
  emergencyProtocolController.createEmergencyProtocol
);

router.put(
  '/:id',
  authenticate,
  authorize(['ADMINISTRATOR', 'SUPERVISOR']),
  emergencyProtocolController.updateEmergencyProtocol
);

router.delete(
  '/:id',
  authenticate,
  authorize(['ADMINISTRATOR']),
  emergencyProtocolController.deleteEmergencyProtocol
);

export default router;
