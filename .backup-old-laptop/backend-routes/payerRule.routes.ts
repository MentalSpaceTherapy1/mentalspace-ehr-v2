import { Router } from 'express';
import * as payerRuleController from '../controllers/payerRule.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All payer rule routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/payer-rules/stats
 * Get payer rule statistics
 */
router.get('/stats', payerRuleController.getPayerRuleStats);

/**
 * GET /api/v1/payer-rules/find-match
 * Find matching rule for specific parameters
 */
router.get('/find-match', payerRuleController.findMatchingRule);

/**
 * POST /api/v1/payer-rules/bulk-import
 * Bulk import payer rules from CSV
 */
router.post('/bulk-import', payerRuleController.bulkImportPayerRules);

/**
 * GET /api/v1/payer-rules
 * List all payer rules with optional filters
 */
router.get('/', payerRuleController.getPayerRules);

/**
 * GET /api/v1/payer-rules/:id
 * Get payer rule by ID
 */
router.get('/:id', payerRuleController.getPayerRuleById);

/**
 * POST /api/v1/payer-rules
 * Create new payer rule
 */
router.post('/', payerRuleController.createPayerRule);

/**
 * PUT /api/v1/payer-rules/:id
 * Update payer rule
 */
router.put('/:id', payerRuleController.updatePayerRule);

/**
 * DELETE /api/v1/payer-rules/:id
 * Delete payer rule (soft delete)
 */
router.delete('/:id', payerRuleController.deletePayerRule);

/**
 * POST /api/v1/payer-rules/:id/test
 * Test rule against existing notes
 */
router.post('/:id/test', payerRuleController.testPayerRule);

export default router;
