import { Router } from 'express';
import * as portalAuthController from '../controllers/portal/auth.controller';
import { authenticatePortal } from '../middleware/portalAuth';
import {
  authRateLimiter,
  accountCreationRateLimiter,
  passwordResetRateLimiter
} from '../middleware/rateLimiter';

const router = Router();

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

// Registration & Email Verification
router.post('/register', accountCreationRateLimiter, portalAuthController.register);
router.post('/activate', accountCreationRateLimiter, portalAuthController.activateAccount);
router.post('/verify-email', portalAuthController.verifyEmail);
router.post('/resend-verification', authRateLimiter, portalAuthController.resendVerificationEmail);

// Login (Rate limited to prevent brute-force attacks)
router.post('/login', authRateLimiter, portalAuthController.login);

// Password Reset (Stricter rate limiting to prevent email spam)
router.post('/forgot-password', passwordResetRateLimiter, portalAuthController.requestPasswordReset);
router.post('/reset-password', passwordResetRateLimiter, portalAuthController.resetPassword);

// ============================================================================
// PROTECTED ROUTES (Authentication required)
// ============================================================================

// Account Management
router.get('/account', authenticatePortal, portalAuthController.getAccount);
router.put('/account/settings', authenticatePortal, portalAuthController.updateAccountSettings);
router.post('/account/change-password', authenticatePortal, portalAuthController.changePassword);
router.post('/account/deactivate', authenticatePortal, portalAuthController.deactivateAccount);

export default router;
