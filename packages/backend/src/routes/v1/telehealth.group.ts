/**
 * Telehealth Route Group
 * Module 6: Video Sessions, Consent, Transcription
 */
import { Router } from 'express';
import telehealthRoutes from '../telehealth.routes';
import telehealthConsentRoutes from '../telehealthConsent.routes';

const router = Router();

// Telehealth sessions
router.use('/telehealth', telehealthRoutes);

// Telehealth consent management
router.use('/telehealth-consent', telehealthConsentRoutes);

export default router;
