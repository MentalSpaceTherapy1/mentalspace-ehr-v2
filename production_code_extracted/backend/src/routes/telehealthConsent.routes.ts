import { Router } from 'express';
import * as telehealthConsentController from '../controllers/telehealthConsent.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get or create telehealth consent for a client
router.post('/get-or-create', telehealthConsentController.getOrCreateConsent);

// Sign/update telehealth consent
router.post('/sign', telehealthConsentController.signConsent);

// Withdraw telehealth consent
router.post('/withdraw', telehealthConsentController.withdrawConsent);

// Validate if client has valid telehealth consent
router.get('/validate', telehealthConsentController.validateConsent);

// Get all consents for a client
router.get('/client/:clientId', telehealthConsentController.getClientConsents);

export default router;
