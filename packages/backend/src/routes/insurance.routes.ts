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

const router = Router();

// All routes require authentication
router.use(authenticate);

// HIPAA Note: Insurance data contains highly sensitive PHI (SSN, policy numbers).
// Access is controlled by:
// - SUPER_ADMIN: Full access
// - ADMINISTRATOR: Organization-wide access
// - BILLING_STAFF: Full insurance access for billing purposes
// - CLINICIAN: Access to insurance for their assigned clients only
// - FRONT_DESK: Limited access for intake purposes

// RLS: Get all insurance records for a client (requires client access + billing permission)
router.get(
  '/client/:clientId',
  authorize('ADMINISTRATOR', 'BILLING_STAFF', 'OFFICE_MANAGER', 'SUPERVISOR', 'CLINICIAN', 'FRONT_DESK', 'SUPER_ADMIN'),
  requireClientAccess('clientId', { allowBillingView: true }),
  getClientInsurance
);

// RLS: Get insurance by ID (requires billing access)
router.get(
  '/:id',
  authorize('ADMINISTRATOR', 'BILLING_STAFF', 'OFFICE_MANAGER', 'SUPERVISOR', 'CLINICIAN', 'SUPER_ADMIN'),
  requireBillingAccess(),
  getInsuranceById
);

// Create insurance - billing staff, admin, or front desk
router.post(
  '/',
  authorize('ADMINISTRATOR', 'BILLING_STAFF', 'OFFICE_MANAGER', 'FRONT_DESK', 'SUPER_ADMIN'),
  requireBillingAccess(),
  createInsurance
);

// RLS: Update insurance (requires billing access)
router.patch(
  '/:id',
  authorize('ADMINISTRATOR', 'BILLING_STAFF', 'OFFICE_MANAGER', 'SUPER_ADMIN'),
  requireBillingAccess(),
  updateInsurance
);

// Delete insurance - admin only
router.delete(
  '/:id',
  authorize('ADMINISTRATOR', 'SUPER_ADMIN'),
  requireBillingAccess(),
  deleteInsurance
);

// RLS: Verify insurance (requires billing access)
router.post(
  '/:id/verify',
  authorize('ADMINISTRATOR', 'BILLING_STAFF', 'OFFICE_MANAGER', 'FRONT_DESK', 'SUPER_ADMIN'),
  requireBillingAccess(),
  verifyInsurance
);

export default router;
