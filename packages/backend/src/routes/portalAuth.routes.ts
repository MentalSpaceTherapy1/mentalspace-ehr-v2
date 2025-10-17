import { Router } from 'express';
import * as portalAuthController from '../controllers/portal/auth.controller';
import { authenticatePortal } from '../middleware/portalAuth';

const router = Router();

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

// Registration & Email Verification
router.post('/register', portalAuthController.register);
router.post('/verify-email', portalAuthController.verifyEmail);
router.post('/resend-verification', portalAuthController.resendVerificationEmail);

// Login
router.post('/login', portalAuthController.login);

// Password Reset
router.post('/forgot-password', portalAuthController.requestPasswordReset);
router.post('/reset-password', portalAuthController.resetPassword);

// ============================================================================
// PROTECTED ROUTES (Authentication required)
// ============================================================================

// Account Management
router.get('/account', authenticatePortal, portalAuthController.getAccount);
router.put('/account/settings', authenticatePortal, portalAuthController.updateAccountSettings);
router.post('/account/change-password', authenticatePortal, portalAuthController.changePassword);
router.post('/account/deactivate', authenticatePortal, portalAuthController.deactivateAccount);

export default router;
