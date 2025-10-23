import { Request, Response } from 'express';
import * as AmendmentService from '../services/amendment.service';
import logger from '../utils/logger';

/**
 * POST /api/v1/clinical-notes/:id/amend
 * Amend a clinical note
 */
export const amendClinicalNote = async (req: Request, res: Response) => {
  try {
    const { id: noteId } = req.params;
    const userId = (req as any).user.userId;
    const { reason, fieldsChanged, changeSummary, newNoteData } = req.body;

    // Validate input
    if (!reason || !fieldsChanged || !changeSummary || !newNoteData) {
      return res.status(400).json({
        success: false,
        message: 'Reason, fieldsChanged, changeSummary, and newNoteData are required',
      });
    }

    if (!Array.isArray(fieldsChanged) || fieldsChanged.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'fieldsChanged must be a non-empty array',
      });
    }

    // Get client IP and user agent
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress ||
      'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Create amendment
    const result = await AmendmentService.amendNote({
      noteId,
      reason,
      amendedBy: userId,
      fieldsChanged,
      changeSummary,
      newNoteData,
      ipAddress,
      userAgent,
    });

    logger.info('Clinical note amended', {
      noteId,
      amendmentId: result.amendment.id,
      userId,
    });

    return res.json({
      success: true,
      message: 'Note amended successfully. Signature required to finalize.',
      data: {
        amendment: result.amendment,
        updatedNote: result.updatedNote,
      },
    });
  } catch (error: any) {
    logger.error('Error amending clinical note', {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to amend note',
    });
  }
};

/**
 * POST /api/v1/amendments/:id/sign
 * Sign an amendment with PIN or password
 */
export const signAmendment = async (req: Request, res: Response) => {
  try {
    const { id: amendmentId } = req.params;
    const userId = (req as any).user.userId;
    const { method, credential } = req.body;

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

    // Verify credential
    const prisma = (await import('../services/database')).default;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
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

    // Verify authentication credential
    const bcrypt = await import('bcryptjs');
    let isAuthenticated = false;

    if (method === 'PIN') {
      if (!user.signaturePin) {
        return res.status(400).json({
          success: false,
          message: 'No signature PIN configured',
        });
      }
      isAuthenticated = await bcrypt.compare(credential, user.signaturePin);
    } else {
      if (!user.signaturePassword) {
        return res.status(400).json({
          success: false,
          message: 'No signature password configured',
        });
      }
      isAuthenticated = await bcrypt.compare(credential, user.signaturePassword);
    }

    if (!isAuthenticated) {
      logger.warn('Failed amendment signature authentication', {
        userId,
        method,
        amendmentId,
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid PIN or password',
      });
    }

    // Get client IP and user agent
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress ||
      'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Sign amendment
    const signatureEvent = await AmendmentService.signAmendment(
      amendmentId,
      userId,
      method,
      ipAddress,
      userAgent
    );

    logger.info('Amendment signed', {
      amendmentId,
      userId,
      signatureEventId: signatureEvent.id,
    });

    return res.json({
      success: true,
      message: 'Amendment signed successfully',
      data: signatureEvent,
    });
  } catch (error: any) {
    logger.error('Error signing amendment', {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to sign amendment',
    });
  }
};

/**
 * GET /api/v1/clinical-notes/:id/amendments
 * Get all amendments for a note
 */
export const getAmendments = async (req: Request, res: Response) => {
  try {
    const { id: noteId } = req.params;
    const userId = (req as any).user.userId;

    // Verify user has access to this note
    const prisma = (await import('../services/database')).default;
    const note = await prisma.clinicalNote.findUnique({
      where: { id: noteId },
      select: {
        id: true,
        clinicianId: true,
        cosignerId: true,
      },
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Clinical note not found',
      });
    }

    // Check permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });

    const hasAccess =
      note.clinicianId === userId ||
      note.cosignerId === userId ||
      user?.roles.includes('ADMINISTRATOR') ||
      user?.roles.includes('SUPERVISOR');

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view amendments for this note',
      });
    }

    const amendments = await AmendmentService.getAmendmentsForNote(noteId);

    return res.json({
      success: true,
      data: amendments,
    });
  } catch (error: any) {
    logger.error('Error getting amendments', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to get amendments',
    });
  }
};

/**
 * GET /api/v1/clinical-notes/:id/versions
 * Get version history for a note
 */
export const getVersionHistory = async (req: Request, res: Response) => {
  try {
    const { id: noteId } = req.params;
    const userId = (req as any).user.userId;

    // Verify user has access to this note
    const prisma = (await import('../services/database')).default;
    const note = await prisma.clinicalNote.findUnique({
      where: { id: noteId },
      select: {
        id: true,
        clinicianId: true,
        cosignerId: true,
      },
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Clinical note not found',
      });
    }

    // Check permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });

    const hasAccess =
      note.clinicianId === userId ||
      note.cosignerId === userId ||
      user?.roles.includes('ADMINISTRATOR') ||
      user?.roles.includes('SUPERVISOR');

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view version history for this note',
      });
    }

    const versions = await AmendmentService.getVersionHistory(noteId);

    return res.json({
      success: true,
      data: versions,
    });
  } catch (error: any) {
    logger.error('Error getting version history', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to get version history',
    });
  }
};

/**
 * GET /api/v1/versions/compare
 * Compare two versions
 */
export const compareVersions = async (req: Request, res: Response) => {
  try {
    const { version1, version2 } = req.query;

    if (!version1 || !version2) {
      return res.status(400).json({
        success: false,
        message: 'Both version1 and version2 query parameters are required',
      });
    }

    const comparison = await AmendmentService.compareVersions(
      version1 as string,
      version2 as string
    );

    return res.json({
      success: true,
      data: comparison,
    });
  } catch (error: any) {
    logger.error('Error comparing versions', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to compare versions',
    });
  }
};
