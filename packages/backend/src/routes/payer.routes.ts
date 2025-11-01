import { Router } from 'express';
import * as payerController from '../controllers/payer.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All payer routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/payers/stats
 * Get payer statistics
 */
router.get('/stats', payerController.getPayerStats);

/**
 * GET /api/v1/payers
 * List all payers with optional filters
 */
router.get('/', payerController.getPayers);

/**
 * GET /api/v1/payers/:id
 * Get payer by ID
 */
router.get('/:id', payerController.getPayerById);

/**
 * POST /api/v1/payers
 * Create new payer
 */
router.post('/', payerController.createPayer);

/**
 * PUT /api/v1/payers/:id
 * Update payer
 */
router.put('/:id', payerController.updatePayer);

/**
 * DELETE /api/v1/payers/:id
 * Delete payer (soft delete)
 */
router.delete('/:id', payerController.deletePayer);

export default router;
