import { Request, Response } from 'express';
import * as SignatureService from '../services/signature.service';
import logger from '../utils/logger';

/**
 * GET /api/v1/signatures/attestation/:noteType
 * Get applicable attestation text for a note type
 */
export const getApplicableAttestation = async (req: Request, res: Response) => {
  try {
    const { noteType } = req.params;
    const userId = (req as any).user.userId;
    const signatureType = (req.query.signatureType as 'AUTHOR' | 'COSIGN' | 'AMENDMENT') || 'AUTHOR';

    const attestation = await SignatureService.getApplicableAttestation(
      userId,
      noteType,
      signatureType
    );

    if (!attestation) {
      return res.status(404).json({
        success: false,
        message: 'No applicable attestation found for this note type',
      });
    }

    return res.json({
      success: true,
      data: {
        id: attestation.id,
        attestationText: attestation.attestationText,
        role: attestation.role,
        noteType: attestation.noteType,
        jurisdiction: attestation.jurisdiction,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching attestation', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch attestation',
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/users/signature-pin
 * Set or update user's signature PIN
 */
export const setSignaturePin = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { pin, currentPassword } = req.body;

    // Validate PIN format (4-6 digits)
    if (!/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'PIN must be 4-6 digits',
      });
    }

    // Verify current password before allowing PIN change
    const prisma = (await import('../services/database')).default;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const bcrypt = await import('bcryptjs');
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid current password',
      });
    }

    await SignatureService.setSignaturePin(userId, pin);

    logger.info('Signature PIN set', { userId });

    return res.json({
      success: true,
      message: 'Signature PIN set successfully',
    });
  } catch (error: any) {
    logger.error('Error setting signature PIN', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to set signature PIN',
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/users/signature-password
 * Set or update user's signature password
 */
export const setSignaturePassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { signaturePassword, currentPassword } = req.body;

    // Validate password strength (min 8 chars)
    if (signaturePassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Signature password must be at least 8 characters',
      });
    }

    // Verify current password before allowing signature password change
    const prisma = (await import('../services/database')).default;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const bcrypt = await import('bcryptjs');
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid current password',
      });
    }

    await SignatureService.setSignaturePassword(userId, signaturePassword);

    logger.info('Signature password set', { userId });

    return res.json({
      success: true,
      message: 'Signature password set successfully',
    });
  } catch (error: any) {
    logger.error('Error setting signature password', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to set signature password',
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/clinical-notes/:id/signatures
 * Get all signature events for a clinical note
 */
export const getNoteSignatures = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    // Verify user has access to this note
    const prisma = (await import('../services/database')).default;
    const note = await prisma.clinicalNote.findUnique({
      where: { id },
      select: {
        id: true,
        clinicianId: true,
        cosignerId: true,
        appointment: {
          select: { clientId: true },
        },
      },
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Clinical note not found',
      });
    }

    // Check permissions: must be clinician, cosigner, or client's provider
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const hasAccess =
      note.clinicianId === userId ||
      note.cosignerId === userId ||
      user.role === 'ADMINISTRATOR' ||
      user.role === 'SUPERVISOR';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view signatures for this note',
      });
    }

    const signatures = await SignatureService.getSignatureEvents(id);

    return res.json({
      success: true,
      data: signatures,
    });
  } catch (error: any) {
    logger.error('Error fetching note signatures', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch note signatures',
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/signatures/:id/revoke
 * Revoke a signature (admin only)
 */
export const revokeSignature = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    const { reason } = req.body;

    // Verify admin permission
    const prisma = (await import('../services/database')).default;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user.role !== 'ADMINISTRATOR') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can revoke signatures',
      });
    }

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Revocation reason must be at least 10 characters',
      });
    }

    const revokedSignature = await SignatureService.revokeSignature(id, userId, reason);

    logger.warn('Signature revoked', {
      signatureEventId: id,
      revokedBy: userId,
      reason,
    });

    return res.json({
      success: true,
      message: 'Signature revoked successfully',
      data: revokedSignature,
    });
  } catch (error: any) {
    logger.error('Error revoking signature', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to revoke signature',
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/clinical-notes/:id/sign
 * Sign a clinical note with PIN or password authentication
 */
export const signClinicalNote = async (req: Request, res: Response) => {
  try {
    const { id: noteId } = req.params;
    const userId = (req as any).user.userId;
    const { method, credential, signatureType } = req.body;

    // Validate input
    if (!method || !credential) {
      return res.status(400).json({
        success: false,
        message: 'Authentication method and credential are required',
      });
    }

    if (!['PIN', 'PASSWORD'].includes(method)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid authentication method',
      });
    }

    if (!['AUTHOR', 'COSIGN', 'AMENDMENT'].includes(signatureType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid signature type',
      });
    }

    // Verify credential
    const prisma = (await import('../services/database')).default;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        signaturePin: true,
        signaturePassword: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Verify authentication credential
    const bcrypt = await import('bcryptjs');
    let isAuthenticated = false;

    if (method === 'PIN') {
      if (!user.signaturePin) {
        return res.status(400).json({
          success: false,
          message: 'No signature PIN configured. Please set up your PIN in profile settings.',
        });
      }
      isAuthenticated = await bcrypt.compare(credential, user.signaturePin);
    } else {
      if (!user.signaturePassword) {
        return res.status(400).json({
          success: false,
          message: 'No signature password configured. Please set up your password in profile settings.',
        });
      }
      isAuthenticated = await bcrypt.compare(credential, user.signaturePassword);
    }

    if (!isAuthenticated) {
      logger.warn('Failed signature authentication attempt', {
        userId,
        method,
        noteId,
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid PIN or password',
      });
    }

    // Get client IP and user agent for audit trail
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
                      req.socket.remoteAddress ||
                      'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Create signature event
    const signatureEvent = await SignatureService.signNote({
      noteId,
      userId,
      signatureType,
      authMethod: method,
      ipAddress,
      userAgent,
    });

    logger.info('Clinical note signed', {
      noteId,
      userId,
      signatureType,
      signatureEventId: signatureEvent.id,
    });

    return res.json({
      success: true,
      message: 'Note signed successfully',
      data: signatureEvent,
    });
  } catch (error: any) {
    logger.error('Error signing clinical note', {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to sign note',
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/users/signature-status
 * Check if user has signature PIN or password configured
 */
export const getSignatureStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const prisma = (await import('../services/database')).default;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        signaturePin: true,
        signaturePassword: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.json({
      success: true,
      data: {
        hasPinConfigured: !!user.signaturePin,
        hasPasswordConfigured: !!user.signaturePassword,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching signature status', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch signature status',
      error: error.message,
    });
  }
};
