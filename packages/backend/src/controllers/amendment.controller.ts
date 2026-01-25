import { Request, Response } from 'express';
import { getErrorMessage, getErrorCode, getErrorName, getErrorStack, getErrorStatusCode } from '../utils/errorHelpers';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
import { UserRoles } from '@mentalspace/shared';
import * as AmendmentService from '../services/amendment.service';
import logger from '../utils/logger';
import { sendSuccess, sendBadRequest, sendNotFound, sendForbidden, sendServerError } from '../utils/apiResponse';

/**
 * POST /api/v1/clinical-notes/:id/amend
 * Amend a clinical note
 */
export const amendClinicalNote = async (req: Request, res: Response) => {
  try {
    const { id: noteId } = req.params;
    const userId = req.user!.userId;
    const { reason, fieldsChanged, changeSummary, newNoteData } = req.body;

    // Validate input
    if (!reason || !fieldsChanged || !changeSummary || !newNoteData) {
      return sendBadRequest(res, 'Reason, fieldsChanged, changeSummary, and newNoteData are required');
    }

    if (!Array.isArray(fieldsChanged) || fieldsChanged.length === 0) {
      return sendBadRequest(res, 'fieldsChanged must be a non-empty array');
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

    return sendSuccess(res, {
      amendment: result.amendment,
      updatedNote: result.updatedNote,
    }, 'Note amended successfully. Signature required to finalize.');
  } catch (error) {
    logger.error('Error amending clinical note', {
      error: getErrorMessage(error),
      stack: getErrorStack(error),
    });

    return sendServerError(res, getErrorMessage(error) || 'Failed to amend note');
  }
};

/**
 * POST /api/v1/amendments/:id/sign
 * Sign an amendment (no PIN/password required - simplified workflow)
 */
export const signAmendment = async (req: Request, res: Response) => {
  try {
    const { id: amendmentId } = req.params;
    const userId = req.user!.userId;

    // Phase 3.2: Use service method instead of direct prisma call
    // Verify user exists
    const user = await AmendmentService.findUserById(userId);

    if (!user) {
      return sendNotFound(res, 'User');
    }

    // Get client IP and user agent
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress ||
      'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Sign amendment (no authentication required - user is already logged in)
    const signatureEvent = await AmendmentService.signAmendment(
      amendmentId,
      userId,
      'PASSWORD', // Default auth method for audit trail
      ipAddress,
      userAgent
    );

    logger.info('Amendment signed', {
      amendmentId,
      userId,
      signatureEventId: signatureEvent.id,
    });

    return sendSuccess(res, signatureEvent, 'Amendment signed successfully');
  } catch (error) {
    logger.error('Error signing amendment', {
      error: getErrorMessage(error),
      stack: getErrorStack(error),
    });

    return sendServerError(res, getErrorMessage(error) || 'Failed to sign amendment');
  }
};

/**
 * GET /api/v1/clinical-notes/:id/amendments
 * Get all amendments for a note
 */
export const getAmendments = async (req: Request, res: Response) => {
  try {
    const { id: noteId } = req.params;
    const userId = req.user!.userId;

    // Phase 3.2: Use service methods instead of direct prisma calls
    // Verify user has access to this note
    const note = await AmendmentService.findNoteForAccessCheck(noteId);

    if (!note) {
      return sendNotFound(res, 'Clinical note');
    }

    // Check permissions
    const user = await AmendmentService.getUserRoles(userId);

    const hasAccess =
      note.clinicianId === userId ||
      note.cosignedBy === userId ||
      user?.roles.includes(UserRoles.ADMINISTRATOR) ||
      user?.roles.includes(UserRoles.SUPERVISOR);

    if (!hasAccess) {
      return sendForbidden(res, 'You do not have permission to view amendments for this note');
    }

    const amendments = await AmendmentService.getAmendmentsForNote(noteId);

    return sendSuccess(res, amendments);
  } catch (error) {
    logger.error('Error getting amendments', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to get amendments');
  }
};

/**
 * GET /api/v1/clinical-notes/:id/versions
 * Get version history for a note
 */
export const getVersionHistory = async (req: Request, res: Response) => {
  try {
    const { id: noteId } = req.params;
    const userId = req.user!.userId;

    // Phase 3.2: Use service methods instead of direct prisma calls
    // Verify user has access to this note
    const note = await AmendmentService.findNoteForAccessCheck(noteId);

    if (!note) {
      return sendNotFound(res, 'Clinical note');
    }

    // Check permissions
    const user = await AmendmentService.getUserRoles(userId);

    const hasAccess =
      note.clinicianId === userId ||
      note.cosignedBy === userId ||
      user?.roles.includes(UserRoles.ADMINISTRATOR) ||
      user?.roles.includes(UserRoles.SUPERVISOR);

    if (!hasAccess) {
      return sendForbidden(res, 'You do not have permission to view version history for this note');
    }

    const versions = await AmendmentService.getVersionHistory(noteId);

    return sendSuccess(res, versions);
  } catch (error) {
    logger.error('Error getting version history', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to get version history');
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
      return sendBadRequest(res, 'Both version1 and version2 query parameters are required');
    }

    const comparison = await AmendmentService.compareVersions(
      version1 as string,
      version2 as string
    );

    return sendSuccess(res, comparison);
  } catch (error) {
    logger.error('Error comparing versions', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to compare versions');
  }
};
