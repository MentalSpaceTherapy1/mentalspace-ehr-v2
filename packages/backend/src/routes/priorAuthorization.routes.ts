import { Router } from 'express';
import * as priorAuthController from '../controllers/priorAuthorization.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All prior authorization routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/prior-authorizations/stats
 * Get authorization statistics
 */
router.get('/stats', priorAuthController.getAuthorizationStats);

/**
 * POST /api/v1/prior-authorizations/check-expiring
 * Manually trigger check for expiring authorizations
 */
router.post('/check-expiring', priorAuthController.checkExpiringAuthorizations);

/**
 * GET /api/v1/prior-authorizations
 * List all prior authorizations with optional filters
 * Query params: clientId, insuranceId, status, authorizationType, expiringWithinDays, lowSessionsThreshold
 */
router.get('/', priorAuthController.getAuthorizations);

/**
 * GET /api/v1/prior-authorizations/:id
 * Get prior authorization by ID
 */
router.get('/:id', priorAuthController.getAuthorizationById);

/**
 * POST /api/v1/prior-authorizations
 * Create new prior authorization
 */
router.post('/', priorAuthController.createAuthorization);

/**
 * PUT /api/v1/prior-authorizations/:id
 * Update prior authorization
 */
router.put('/:id', priorAuthController.updateAuthorization);

/**
 * POST /api/v1/prior-authorizations/:id/use-session
 * Use a session from an authorization
 */
router.post('/:id/use-session', priorAuthController.useSession);

/**
 * POST /api/v1/prior-authorizations/:id/renew
 * Initiate a renewal for an authorization
 */
router.post('/:id/renew', priorAuthController.renewAuthorization);

/**
 * DELETE /api/v1/prior-authorizations/:id
 * Delete prior authorization
 */
router.delete('/:id', priorAuthController.deleteAuthorization);

export default router;
