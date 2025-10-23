import { Router } from 'express';
import * as signatureController from '../controllers/signature.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All signature routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/signatures/attestation/:noteType
 * Get applicable attestation text for a note type
 */
router.get('/attestation/:noteType', signatureController.getApplicableAttestation);

/**
 * GET /api/v1/clinical-notes/:id/signatures
 * Get all signature events for a clinical note
 */
router.get('/clinical-notes/:id/signatures', signatureController.getNoteSignatures);

/**
 * POST /api/v1/signatures/:id/revoke
 * Revoke a signature (admin only)
 */
router.post('/:id/revoke', signatureController.revokeSignature);

export default router;
