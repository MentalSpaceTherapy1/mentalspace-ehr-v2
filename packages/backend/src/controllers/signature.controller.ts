import { Request, Response } from 'express';
import { UserRoles } from '@mentalspace/shared';
import { getErrorMessage, getErrorCode, getErrorName, getErrorStack, getErrorStatusCode } from '../utils/errorHelpers';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
import * as SignatureService from '../services/signature.service';
import logger from '../utils/logger';
// Phase 3.2: Removed direct prisma import - using service methods instead
import { sendSuccess, sendBadRequest, sendUnauthorized, sendNotFound, sendForbidden, sendServerError } from '../utils/apiResponse';

/**
 * GET /api/v1/signatures/attestation/:noteType
 * Get applicable attestation text for a note type
 */
export const getApplicableAttestation = async (req: Request, res: Response) => {
  try {
    const { noteType } = req.params;
    const userId = req.user!.userId;
    const signatureType = (req.query.signatureType as 'AUTHOR' | 'COSIGN' | 'AMENDMENT') || 'AUTHOR';

    const attestation = await SignatureService.getApplicableAttestation(
      userId,
      noteType,
      signatureType
    );

    if (!attestation) {
      return sendNotFound(res, 'Applicable attestation');
    }

    return sendSuccess(res, {
      id: attestation.id,
      attestationText: attestation.attestationText,
      role: attestation.role,
      noteType: attestation.noteType,
      jurisdiction: attestation.jurisdiction,
    });
  } catch (error) {
    logger.error('Error fetching attestation', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to fetch attestation');
  }
};

/**
 * POST /api/v1/users/signature-pin
 * Set or update user's signature PIN
 */
export const setSignaturePin = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { pin, currentPassword } = req.body;

    // Validate PIN format (4-6 digits)
    if (!/^\d{4,6}$/.test(pin)) {
      return sendBadRequest(res, 'PIN must be 4-6 digits');
    }

    // Phase 3.2: Use service method instead of direct prisma call
    const isPasswordValid = await SignatureService.verifyUserPassword(userId, currentPassword);

    if (!isPasswordValid) {
      return sendUnauthorized(res, 'Invalid current password');
    }

    await SignatureService.setSignaturePin(userId, pin);

    logger.info('Signature PIN set', { userId });

    return sendSuccess(res, null, 'Signature PIN set successfully');
  } catch (error) {
    logger.error('Error setting signature PIN', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to set signature PIN');
  }
};

/**
 * POST /api/v1/users/signature-password
 * Set or update user's signature password
 */
export const setSignaturePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { signaturePassword, currentPassword } = req.body;

    // Phase 3.2: Use service method instead of direct prisma call
    const isPasswordValid = await SignatureService.verifyUserPassword(userId, currentPassword);

    if (!isPasswordValid) {
      return sendUnauthorized(res, 'Invalid current password');
    }

    await SignatureService.setSignaturePassword(userId, signaturePassword);

    logger.info('Signature password set', { userId });

    return sendSuccess(res, null, 'Signature password set successfully');
  } catch (error) {
    logger.error('Error setting signature password', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to set signature password');
  }
};

/**
 * GET /api/v1/clinical-notes/:id/signatures
 * Get all signature events for a clinical note
 */
export const getNoteSignatures = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Phase 3.2: Use service method instead of direct prisma call
    const note = await SignatureService.getNoteWithAccessInfo(id);

    if (!note) {
      return sendNotFound(res, 'Clinical note');
    }

    // Phase 3.2: Use service method instead of direct prisma call
    const userRoles = await SignatureService.getUserRoles(userId);

    // Check permissions: must be clinician, cosigner, or admin/supervisor
    const hasAccess =
      note.clinicianId === userId ||
      note.cosignedBy === userId ||
      userRoles?.roles.includes(UserRoles.ADMINISTRATOR) ||
      userRoles?.roles.includes(UserRoles.SUPERVISOR);

    if (!hasAccess) {
      return sendForbidden(res, 'You do not have permission to view signatures for this note');
    }

    const signatures = await SignatureService.getSignatureEvents(id);

    return sendSuccess(res, signatures);
  } catch (error) {
    logger.error('Error fetching note signatures', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to fetch note signatures');
  }
};

/**
 * POST /api/v1/signatures/:id/revoke
 * Revoke a signature (admin only)
 */
export const revokeSignature = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { reason } = req.body;

    // Phase 3.2: Use service method instead of direct prisma call
    const userRoles = await SignatureService.getUserRoles(userId);

    if (!userRoles?.roles.includes(UserRoles.ADMINISTRATOR)) {
      return sendForbidden(res, 'Only administrators can revoke signatures');
    }

    if (!reason || reason.trim().length < 10) {
      return sendBadRequest(res, 'Revocation reason must be at least 10 characters');
    }

    const revokedSignature = await SignatureService.revokeSignature(id, userId, reason);

    logger.warn('Signature revoked', {
      signatureEventId: id,
      revokedBy: userId,
      reason,
    });

    return sendSuccess(res, revokedSignature, 'Signature revoked successfully');
  } catch (error) {
    logger.error('Error revoking signature', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to revoke signature');
  }
};

/**
 * POST /api/v1/clinical-notes/:id/sign
 * Sign a clinical note (no PIN/password required - simplified workflow)
 */
export const signClinicalNote = async (req: Request, res: Response) => {
  try {
    const { id: noteId } = req.params;
    const userId = req.user!.userId;
    const { signatureType } = req.body;

    // Validate signature type
    if (!['AUTHOR', 'COSIGN', 'AMENDMENT'].includes(signatureType)) {
      return sendBadRequest(res, 'Invalid signature type');
    }

    // Phase 3.2: Use service method instead of direct prisma call
    const user = await SignatureService.getUserForSigning(userId);

    if (!user) {
      return sendNotFound(res, 'User');
    }

    // Get client IP and user agent for audit trail
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
                      req.socket.remoteAddress ||
                      'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Create signature event (no authentication required - user is already logged in)
    const signatureEvent = await SignatureService.signNote({
      noteId,
      userId,
      signatureType,
      authMethod: 'PASSWORD', // Default auth method for audit trail
      ipAddress,
      userAgent,
    });

    logger.info('Clinical note signed', {
      noteId,
      userId,
      signatureType,
      signatureEventId: signatureEvent.id,
    });

    return sendSuccess(res, signatureEvent, 'Note signed successfully');
  } catch (error) {
    logger.error('Error signing clinical note', {
      error: getErrorMessage(error),
      stack: getErrorStack(error),
    });

    return sendServerError(res, getErrorMessage(error) || 'Failed to sign note');
  }
};

/**
 * GET /api/v1/users/signature-status
 * Check if user has signature PIN or password configured
 */
export const getSignatureStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Phase 3.2: Use service method instead of direct prisma call
    const status = await SignatureService.getSignatureStatus(userId);

    if (!status) {
      return sendNotFound(res, 'User');
    }

    return sendSuccess(res, status);
  } catch (error) {
    logger.error('Error fetching signature status', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to fetch signature status');
  }
};
