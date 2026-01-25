/**
 * Clinical Note Controller
 * Phase 3.2: Refactored to thin controller pattern
 *
 * Handles HTTP request/response only - all business logic delegated to clinicalNoteService
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';
import {
  clinicalNoteService,
  NOTE_TYPES,
  clinicalNoteSchema,
} from '../services/clinicalNote.service';
import * as NoteValidationService from '../services/note-validation.service';
import logger, { logControllerError } from '../utils/logger';
import { AppError, NotFoundError, ForbiddenError, UnauthorizedError, BadRequestError } from '../utils/errors';
import {
  sendSuccess,
  sendCreated,
  sendNotFound,
  sendBadRequest,
  sendForbidden,
  sendUnauthorized,
  sendConflict,
  sendServerError,
  sendValidationError,
} from '../utils/apiResponse';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';

// Type for enriched appointment used in appointments without notes
interface EnrichedAppointment {
  isOverdue?: boolean;
  isUrgent?: boolean;
  [key: string]: unknown;
}

// Re-export NOTE_TYPES for backward compatibility
export { NOTE_TYPES };

/**
 * Get all clinical notes for a client
 * GET /api/clients/:clientId/clinical-notes
 */
export const getClientNotes = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const { notes, treatmentPlanStatus } = await clinicalNoteService.getClientNotes(clientId);

    return sendSuccess(res, { notes, count: notes.length, treatmentPlanStatus });
  } catch (error) {
    if (error instanceof AppError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Get client notes', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to retrieve clinical notes', errorId);
  }
};

/**
 * Get clinical note by ID
 * GET /api/clinical-notes/:id
 */
export const getClinicalNoteById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const note = await clinicalNoteService.getNoteById(id);

    return sendSuccess(res, note);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Clinical note');
    }

    if (error instanceof AppError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Get clinical note', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to retrieve clinical note', errorId);
  }
};

/**
 * Create new clinical note with workflow validation
 * POST /api/clinical-notes
 */
export const createClinicalNote = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const note = await clinicalNoteService.createNote(req.body, userId);

    return sendCreated(res, note, 'Clinical note created successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return sendValidationError(res, formattedErrors);
    }

    if (error instanceof BadRequestError) {
      // Handle duplicate note error specially
      if (getErrorMessage(error).includes('already exists for this appointment')) {
        return sendConflict(res, getErrorMessage(error));
      }
      return sendBadRequest(res, getErrorMessage(error));
    }

    if (error instanceof AppError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Create clinical note', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to create clinical note', errorId);
  }
};

/**
 * Update clinical note
 * PUT /api/clinical-notes/:id
 */
export const updateClinicalNote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const note = await clinicalNoteService.updateNote(id, req.body, userId);

    return sendSuccess(res, note, 'Clinical note updated successfully');
  } catch (error) {
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Clinical note');
    }

    if (error instanceof ForbiddenError) {
      return sendForbidden(res, getErrorMessage(error));
    }

    if (error instanceof AppError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Update clinical note', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to update clinical note', errorId);
  }
};

/**
 * Sign clinical note
 * POST /api/clinical-notes/:id/sign
 */
export const signClinicalNote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { pin, password } = req.body;
    const userId = req.user!.userId;

    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const note = await clinicalNoteService.signNote(
      id,
      userId,
      { pin, password },
      { ipAddress, userAgent }
    );

    const message = note.status === 'PENDING_COSIGN'
      ? 'Note signed and sent for co-signature'
      : 'Note signed successfully';

    return sendSuccess(res, note, message);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Clinical note');
    }

    if (error instanceof ForbiddenError) {
      return sendForbidden(res, getErrorMessage(error));
    }

    if (error instanceof UnauthorizedError) {
      return sendUnauthorized(res, getErrorMessage(error));
    }

    if (error instanceof BadRequestError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    if (error instanceof AppError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Sign clinical note', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to sign clinical note', errorId);
  }
};

/**
 * Co-sign clinical note (supervisor)
 * POST /api/clinical-notes/:id/cosign
 */
export const cosignClinicalNote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { supervisorComments, pin, password } = req.body;
    const supervisorId = req.user!.userId;

    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const note = await clinicalNoteService.cosignNote(
      id,
      supervisorId,
      { supervisorComments, pin, password },
      { ipAddress, userAgent }
    );

    return sendSuccess(res, note, 'Note co-signed successfully');
  } catch (error) {
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Clinical note');
    }

    if (error instanceof ForbiddenError) {
      return sendForbidden(res, getErrorMessage(error));
    }

    if (error instanceof UnauthorizedError) {
      return sendUnauthorized(res, getErrorMessage(error));
    }

    if (error instanceof BadRequestError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    if (error instanceof AppError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Cosign clinical note', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to co-sign clinical note', errorId);
  }
};

/**
 * Delete clinical note (soft delete - change status)
 * DELETE /api/clinical-notes/:id
 */
export const deleteClinicalNote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    await clinicalNoteService.deleteNote(id, userId);

    return sendSuccess(res, null, 'Clinical note deleted successfully');
  } catch (error) {
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Clinical note');
    }

    if (error instanceof ForbiddenError) {
      return sendForbidden(res, getErrorMessage(error));
    }

    if (error instanceof AppError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Delete clinical note', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to delete clinical note', errorId);
  }
};

/**
 * Get notes requiring co-signature for supervisor
 * GET /api/clinical-notes/for-cosigning
 */
export const getNotesForCosigning = async (req: Request, res: Response) => {
  try {
    const supervisorId = req.user!.userId;

    const notes = await clinicalNoteService.getNotesForCosigning(supervisorId);

    return sendSuccess(res, { notes, count: notes.length });
  } catch (error) {
    if (error instanceof AppError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Get notes for cosigning', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to retrieve notes for co-signing', errorId);
  }
};

/**
 * Get client's current diagnosis from latest Intake or Treatment Plan
 * GET /api/clients/:clientId/diagnosis
 */
export const getClientDiagnosis = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const diagnosisCodes = await clinicalNoteService.getClientDiagnosis(clientId);

    return sendSuccess(res, { diagnosisCodes });
  } catch (error) {
    if (error instanceof AppError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Get client diagnosis', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to retrieve client diagnosis', errorId);
  }
};

/**
 * Get Treatment Plan update status for client
 * GET /api/clients/:clientId/treatment-plan-status
 */
export const getTreatmentPlanStatus = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const status = await clinicalNoteService.checkTreatmentPlanStatus(clientId);

    return sendSuccess(res, status);
  } catch (error) {
    if (error instanceof AppError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Get treatment plan status', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to check treatment plan status', errorId);
  }
};

/**
 * Get eligible appointments for creating a specific note type
 * GET /api/clients/:clientId/eligible-appointments/:noteType
 */
export const getEligibleAppointments = async (req: Request, res: Response) => {
  try {
    const { clientId, noteType } = req.params;

    const result = await clinicalNoteService.getEligibleAppointments(clientId, noteType);

    return sendSuccess(res, result);
  } catch (error) {
    if (error instanceof AppError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Get eligible appointments', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to retrieve eligible appointments', errorId);
  }
};

/**
 * Get inherited diagnoses for a new note (for Progress Notes and Treatment Plans)
 * GET /api/clients/:clientId/inherited-diagnoses/:noteType
 */
export const getInheritedDiagnoses = async (req: Request, res: Response) => {
  try {
    const { clientId, noteType } = req.params;

    const result = await clinicalNoteService.getInheritedDiagnoses(clientId, noteType);

    return sendSuccess(res, result);
  } catch (error) {
    if (error instanceof AppError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Get inherited diagnoses', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to retrieve inherited diagnoses', errorId);
  }
};

/**
 * Get all notes for the logged-in clinician (My Notes)
 * GET /api/clinical-notes/my-notes
 */
export const getMyNotes = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { status, noteType, clientId, startDate, endDate, search } = req.query;

    const { notes, stats } = await clinicalNoteService.getMyNotes(userId, {
      status: status as string,
      noteType: noteType as string,
      clientId: clientId as string,
      startDate: startDate as string,
      endDate: endDate as string,
      search: search as string,
    });

    return sendSuccess(res, { notes, stats, count: notes.length });
  } catch (error) {
    if (error instanceof AppError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Get my notes', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to retrieve notes', errorId);
  }
};

/**
 * Get appointments without notes (Compliance Dashboard)
 * GET /api/clinical-notes/appointments-without-notes
 */
export const getAppointmentsWithoutNotes = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const enrichedAppointments = await clinicalNoteService.getAppointmentsWithoutNotes(userId);

    const stats = {
      total: enrichedAppointments.length,
      overdue: enrichedAppointments.filter((a: EnrichedAppointment) => a.isOverdue).length,
      urgent: enrichedAppointments.filter((a: EnrichedAppointment) => a.isUrgent).length,
    };

    return sendSuccess(res, { appointments: enrichedAppointments, count: enrichedAppointments.length, stats });
  } catch (error) {
    if (error instanceof AppError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Get appointments without notes', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to retrieve appointments without notes', errorId);
  }
};

/**
 * Get compliance dashboard data
 * GET /api/clinical-notes/compliance-dashboard
 */
export const getComplianceDashboard = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const dashboardData = await clinicalNoteService.getComplianceDashboard(userId);

    return sendSuccess(res, dashboardData);
  } catch (error) {
    if (error instanceof AppError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Get compliance dashboard', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to retrieve compliance dashboard', errorId);
  }
};

// ============================================================================
// PHASE 1.2: RETURN FOR REVISION WORKFLOW
// ============================================================================

/**
 * Return a note for revision (supervisor to clinician)
 * POST /api/v1/clinical-notes/:id/return-for-revision
 */
export const returnForRevision = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.roles?.[0];
    const userName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim();

    if (!userId || !userRole) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const note = await clinicalNoteService.returnForRevision(
      id,
      userId,
      userName,
      userRole,
      req.body
    );

    return sendSuccess(res, note, 'Note returned for revision');
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return sendValidationError(res, formattedErrors);
    }

    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Clinical note');
    }

    if (error instanceof ForbiddenError) {
      return sendForbidden(res, getErrorMessage(error));
    }

    if (error instanceof BadRequestError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    if (error instanceof AppError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Return for revision', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to return note for revision', errorId);
  }
};

/**
 * Resubmit a note for review after revisions (clinician to supervisor)
 * POST /api/v1/clinical-notes/:id/resubmit-for-review
 */
export const resubmitForReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const note = await clinicalNoteService.resubmitForReview(id, userId);

    return sendSuccess(res, note, 'Note resubmitted for review');
  } catch (error) {
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Clinical note');
    }

    if (error instanceof ForbiddenError) {
      return sendForbidden(res, getErrorMessage(error));
    }

    if (error instanceof BadRequestError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    if (error instanceof AppError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Resubmit for review', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to resubmit note for review', errorId);
  }
};

// ============================================================================
// PHASE 1.3: REQUIRED FIELD VALIDATION ENGINE
// ============================================================================

/**
 * Get validation rules for a specific note type
 * GET /api/v1/clinical-notes/validation-rules/:noteType
 */
export const getValidationRulesForNoteType = async (req: Request, res: Response) => {
  try {
    const { noteType } = req.params;

    if (!noteType) {
      return sendBadRequest(res, 'Note type is required');
    }

    const rules = await NoteValidationService.getValidationRules(noteType);

    return sendSuccess(res, rules);
  } catch (error) {
    if (error instanceof AppError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Get validation rules', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to fetch validation rules', errorId);
  }
};

/**
 * Validate note data against its type's rules
 * POST /api/v1/clinical-notes/validate
 */
export const validateNoteData = async (req: Request, res: Response) => {
  try {
    const { noteType, noteData } = req.body;

    if (!noteType || !noteData) {
      return sendBadRequest(res, 'Note type and note data are required');
    }

    const result = await NoteValidationService.validateNote(noteType, noteData);

    return sendSuccess(res, result);
  } catch (error) {
    if (error instanceof AppError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Validate note data', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Validation failed', errorId);
  }
};

/**
 * Get validation summary for a note type
 * GET /api/v1/clinical-notes/validation-summary/:noteType
 */
export const getValidationSummaryForNoteType = async (req: Request, res: Response) => {
  try {
    const { noteType } = req.params;

    if (!noteType) {
      return sendBadRequest(res, 'Note type is required');
    }

    const summary = await NoteValidationService.getValidationSummary(noteType);

    return sendSuccess(res, summary);
  } catch (error) {
    if (error instanceof AppError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Get validation summary', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to fetch validation summary', errorId);
  }
};

/**
 * Get clinical notes with filtering
 * GET /api/v1/clinical-notes
 */
export const getClinicalNotes = async (req: Request, res: Response) => {
  try {
    const { status, limit, noteType, clientId } = req.query;
    const userId = req.user!.userId;
    const userRole = req.user!.roles?.[0];

    const notes = await clinicalNoteService.getClinicalNotes(userId, userRole, {
      status: status as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      noteType: noteType as string,
      clientId: clientId as string,
    });

    return sendSuccess(res, { notes, count: notes.length });
  } catch (error) {
    if (error instanceof AppError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Get clinical notes', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to fetch clinical notes', errorId);
  }
};
