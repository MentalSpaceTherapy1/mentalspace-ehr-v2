import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { requireClientAccess, requireBillingAccess } from '../middleware/clientAccess';
import {
  getClientInsurance,
  getInsuranceById,
  createInsurance,
  updateInsurance,
  deleteInsurance,
  verifyInsurance,
} from '../controllers/insurance.controller';
import { UserRoles } from '@mentalspace/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);

// HIPAA Note: Insurance data contains highly sensitive PHI (policy numbers, member IDs).
// Access is controlled by:
// - SUPER_ADMIN: Full access
// - ADMINISTRATOR: Organization-wide access
// - BILLING_STAFF: Full insurance access for billing purposes
// - CLINICIAN: Access to insurance for their assigned clients only
// - FRONT_DESK: Limited access for intake purposes

// RLS: Get all insurance records for a client (requires client access + billing permission)
router.get(
  '/client/:clientId',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.BILLING_STAFF, UserRoles.OFFICE_MANAGER, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.FRONT_DESK, UserRoles.SUPER_ADMIN),
  requireClientAccess('clientId', { allowBillingView: true }),
  getClientInsurance
);

// RLS: Get insurance by ID (requires billing access)
router.get(
  '/:id',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.BILLING_STAFF, UserRoles.OFFICE_MANAGER, UserRoles.SUPERVISOR, UserRoles.CLINICIAN, UserRoles.SUPER_ADMIN),
  requireBillingAccess(),
  getInsuranceById
);

// Create insurance - billing staff, admin, or front desk
router.post(
  '/',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.BILLING_STAFF, UserRoles.OFFICE_MANAGER, UserRoles.FRONT_DESK, UserRoles.SUPER_ADMIN),
  requireBillingAccess(),
  createInsurance
);

// RLS: Update insurance (requires billing access)
router.patch(
  '/:id',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.BILLING_STAFF, UserRoles.OFFICE_MANAGER, UserRoles.SUPER_ADMIN),
  requireBillingAccess(),
  updateInsurance
);

// Delete insurance - admin only
router.delete(
  '/:id',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPER_ADMIN),
  requireBillingAccess(),
  deleteInsurance
);

// RLS: Verify insurance (requires billing access)
router.post(
  '/:id/verify',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.BILLING_STAFF, UserRoles.OFFICE_MANAGER, UserRoles.FRONT_DESK, UserRoles.SUPER_ADMIN),
  requireBillingAccess(),
  verifyInsurance
);

export default router;
