import { Router } from 'express';
import * as billingHoldController from '../controllers/billingHold.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All billing hold routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/billing-holds/count
 * Get count of active billing holds
 */
router.get('/count', billingHoldController.getBillingHoldsCount);

/**
 * GET /api/v1/billing-holds/by-reason
 * Get billing holds grouped by reason (for dashboard)
 */
router.get('/by-reason', billingHoldController.getBillingHoldsByReason);

/**
 * GET /api/v1/billing-holds/note/:noteId
 * Get billing holds for a specific note
 */
router.get('/note/:noteId', billingHoldController.getBillingHoldsByNote);

/**
 * GET /api/v1/billing-holds
 * List all active billing holds
 */
router.get('/', billingHoldController.getBillingHolds);

/**
 * POST /api/v1/billing-holds/:id/resolve
 * Manually resolve a billing hold
 */
router.post('/:id/resolve', billingHoldController.resolveBillingHold);

export default router;
