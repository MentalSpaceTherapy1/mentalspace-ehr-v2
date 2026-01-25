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
import { UserRoles } from '@mentalspace/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Client routes with Row-Level Security (RLS)
// Note: getAllClients uses applyClientScope in the controller for filtering

router.get(
  '/',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLINICAL_DIRECTOR, UserRoles.FRONT_DESK, UserRoles.BILLING_STAFF, UserRoles.SUPER_ADMIN),
  getAllClients
);

router.get(
  '/stats',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.BILLING_STAFF, UserRoles.CLINICAL_DIRECTOR, UserRoles.SUPER_ADMIN),
  getClientStats
);

// RLS: User must have access to this specific client
router.get(
  '/:id',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.CLINICAL_DIRECTOR, UserRoles.BILLING_STAFF, UserRoles.SUPER_ADMIN),
  requireClientAccess('id', { allowBillingView: true }),
  getClientById
);

router.post(
  '/',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICAL_DIRECTOR, UserRoles.SUPER_ADMIN),
  createClient
);

// RLS: User must have access to this specific client
router.patch(
  '/:id',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.CLINICAL_DIRECTOR, UserRoles.SUPER_ADMIN),
  requireClientAccess('id'),
  updateClient
);

// RLS: User must have access to this specific client
router.delete(
  '/:id',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPERVISOR, UserRoles.SUPER_ADMIN),
  requireClientAccess('id'),
  deleteClient
);

export default router;
