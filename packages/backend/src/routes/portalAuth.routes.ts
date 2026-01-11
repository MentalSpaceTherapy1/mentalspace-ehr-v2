import { Router, RequestHandler } from 'express';
import * as portalAuthController from '../controllers/portal/auth.controller';
import { authenticatePortal } from '../middleware/portalAuth';
import {
  authRateLimiter,
  accountCreationRateLimiter,
  passwordResetRateLimiter
} from '../middleware/rateLimiter';

// Helper to cast portal controllers to RequestHandler (they use PortalRequest which extends Request)
const asHandler = (fn: any): RequestHandler => fn as RequestHandler;

const router = Router();

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

// Registration & Email Verification
router.post('/register', accountCreationRateLimiter, asHandler(portalAuthController.register));
router.post('/activate', accountCreationRateLimiter, asHandler(portalAuthController.activateAccount));
router.post('/verify-email', asHandler(portalAuthController.verifyEmail));
router.post('/resend-verification', authRateLimiter, asHandler(portalAuthController.resendVerificationEmail));

// Login (Rate limited to prevent brute-force attacks)
router.post('/login', authRateLimiter, asHandler(portalAuthController.login));

// Password Reset (Stricter rate limiting to prevent email spam)
router.post('/forgot-password', passwordResetRateLimiter, asHandler(portalAuthController.requestPasswordReset));
router.post('/reset-password', passwordResetRateLimiter, asHandler(portalAuthController.resetPassword));

// ============================================================================
// PROTECTED ROUTES (Authentication required)
// ============================================================================

// Account Management
router.get('/account', authenticatePortal, asHandler(portalAuthController.getAccount));
router.put('/account/settings', authenticatePortal, asHandler(portalAuthController.updateAccountSettings));
router.post('/account/change-password', authenticatePortal, asHandler(portalAuthController.changePassword));
router.post('/account/deactivate', authenticatePortal, asHandler(portalAuthController.deactivateAccount));

export default router;
