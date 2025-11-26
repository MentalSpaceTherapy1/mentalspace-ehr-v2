import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { requireClientAccess } from '../middleware/clientAccess';
import {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getClientStats,
} from '../controllers/client.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Client routes with Row-Level Security (RLS)
// Note: getAllClients uses applyClientScope in the controller for filtering

router.get(
  '/',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLINICAL_DIRECTOR', 'FRONT_DESK', 'BILLING_STAFF', 'SUPER_ADMIN'),
  getAllClients
);

router.get(
  '/stats',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'BILLING_STAFF', 'CLINICAL_DIRECTOR', 'SUPER_ADMIN'),
  getClientStats
);

// RLS: User must have access to this specific client
router.get(
  '/:id',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'CLINICAL_DIRECTOR', 'BILLING_STAFF', 'SUPER_ADMIN'),
  requireClientAccess('id', { allowBillingView: true }),
  getClientById
);

router.post(
  '/',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICAL_DIRECTOR', 'SUPER_ADMIN'),
  createClient
);

// RLS: User must have access to this specific client
router.patch(
  '/:id',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICAL_DIRECTOR', 'SUPER_ADMIN'),
  requireClientAccess('id'),
  updateClient
);

// RLS: User must have access to this specific client
router.delete(
  '/:id',
  authorize('ADMINISTRATOR', 'SUPERVISOR', 'SUPER_ADMIN'),
  requireClientAccess('id'),
  deleteClient
);

export default router;
