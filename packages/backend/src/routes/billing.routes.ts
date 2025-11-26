import { Router } from 'express';
import {
  // Charges
  getAllCharges,
  getChargeById,
  createCharge,
  updateCharge,
  deleteCharge,
  // Payments
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  // Reports
  getAgingReport,
  getRevenueReport,
} from '../controllers/billing.controller';
import { authenticate, authorize } from '../middleware/auth';
import { requireBillingAccess, requireClientAccess } from '../middleware/clientAccess';

const router = Router();

// All routes require authentication
router.use(authenticate);

// HIPAA Note: Billing data contains limited PHI. Access is controlled by:
// - SUPER_ADMIN: Full access
// - ADMINISTRATOR: Organization-wide access
// - BILLING_STAFF, OFFICE_MANAGER: Full billing access within organization
// - CLINICIAN: Access to billing for their assigned clients only

// ============================================================================
// CHARGES ROUTES
// ============================================================================

// Get all charges - billing access required, scoped by organization in controller
router.get(
  '/charges',
  authorize('ADMINISTRATOR', 'BILLING_STAFF', 'OFFICE_MANAGER', 'SUPERVISOR', 'CLINICIAN', 'SUPER_ADMIN'),
  requireBillingAccess(),
  getAllCharges
);

// Get charge by ID - billing access required
router.get(
  '/charges/:id',
  authorize('ADMINISTRATOR', 'BILLING_STAFF', 'OFFICE_MANAGER', 'SUPERVISOR', 'CLINICIAN', 'SUPER_ADMIN'),
  requireBillingAccess(),
  getChargeById
);

// Create charge - billing staff or admin only
router.post(
  '/charges',
  authorize('ADMINISTRATOR', 'BILLING_STAFF', 'OFFICE_MANAGER', 'SUPER_ADMIN'),
  requireBillingAccess(),
  createCharge
);

// Update charge - billing staff or admin only
router.put(
  '/charges/:id',
  authorize('ADMINISTRATOR', 'BILLING_STAFF', 'OFFICE_MANAGER', 'SUPER_ADMIN'),
  requireBillingAccess(),
  updateCharge
);

// Delete charge - admin only
router.delete(
  '/charges/:id',
  authorize('ADMINISTRATOR', 'SUPER_ADMIN'),
  requireBillingAccess(),
  deleteCharge
);

// ============================================================================
// PAYMENTS ROUTES
// ============================================================================

// Get all payments - billing access required
router.get(
  '/payments',
  authorize('ADMINISTRATOR', 'BILLING_STAFF', 'OFFICE_MANAGER', 'SUPER_ADMIN'),
  requireBillingAccess(),
  getAllPayments
);

// Get payment by ID - billing access required
router.get(
  '/payments/:id',
  authorize('ADMINISTRATOR', 'BILLING_STAFF', 'OFFICE_MANAGER', 'SUPER_ADMIN'),
  requireBillingAccess(),
  getPaymentById
);

// Create payment - billing staff or admin only
router.post(
  '/payments',
  authorize('ADMINISTRATOR', 'BILLING_STAFF', 'OFFICE_MANAGER', 'SUPER_ADMIN'),
  requireBillingAccess(),
  createPayment
);

// Update payment - billing staff or admin only
router.put(
  '/payments/:id',
  authorize('ADMINISTRATOR', 'BILLING_STAFF', 'OFFICE_MANAGER', 'SUPER_ADMIN'),
  requireBillingAccess(),
  updatePayment
);

// Delete payment - admin only
router.delete(
  '/payments/:id',
  authorize('ADMINISTRATOR', 'SUPER_ADMIN'),
  requireBillingAccess(),
  deletePayment
);

// ============================================================================
// REPORTS ROUTES
// ============================================================================

// Aging report - billing/admin access
router.get(
  '/reports/aging',
  authorize('ADMINISTRATOR', 'BILLING_STAFF', 'OFFICE_MANAGER', 'SUPER_ADMIN'),
  requireBillingAccess(),
  getAgingReport
);

// Revenue report - billing/admin access
router.get(
  '/reports/revenue',
  authorize('ADMINISTRATOR', 'BILLING_STAFF', 'OFFICE_MANAGER', 'SUPER_ADMIN'),
  requireBillingAccess(),
  getRevenueReport
);

export default router;
