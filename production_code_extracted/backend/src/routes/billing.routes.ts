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
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ============================================================================
// CHARGES ROUTES
// ============================================================================
router.get('/charges', getAllCharges);
router.get('/charges/:id', getChargeById);
router.post('/charges', createCharge);
router.put('/charges/:id', updateCharge);
router.delete('/charges/:id', deleteCharge);

// ============================================================================
// PAYMENTS ROUTES
// ============================================================================
router.get('/payments', getAllPayments);
router.get('/payments/:id', getPaymentById);
router.post('/payments', createPayment);
router.put('/payments/:id', updatePayment);
router.delete('/payments/:id', deletePayment);

// ============================================================================
// REPORTS ROUTES
// ============================================================================
router.get('/reports/aging', getAgingReport);
router.get('/reports/revenue', getRevenueReport);

export default router;
