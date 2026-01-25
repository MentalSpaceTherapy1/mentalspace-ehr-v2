import { Request, Response } from 'express';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
import { outcomeMeasureService } from '../services/outcomeMeasure.service';
import { OutcomeMeasureType } from '@prisma/client';
import { logControllerError } from '../utils/logger';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError } from '../utils/apiResponse';

/**
 * Outcome Measure Controller
 * Phase 2.3: Outcome Measures Integration
 */

/**
 * GET /api/v1/outcome-measures/questionnaire/:type
 * Get questionnaire definition
 */
export async function getQuestionnaireDefinition(req: Request, res: Response) {
  try {
    const { type } = req.params;

    if (!['PHQ9', 'GAD7', 'PCL5'].includes(type)) {
      return sendBadRequest(res, 'Invalid measure type. Must be one of: PHQ9, GAD7, PCL5');
    }

    const definition = outcomeMeasureService.getQuestionnaireDefinition(type as OutcomeMeasureType);

    return sendSuccess(res, definition, 'Questionnaire definition retrieved successfully');
  } catch (error) {
    logControllerError('Error getting questionnaire definition', error);
    return sendServerError(res, 'Failed to get questionnaire definition');
  }
}

/**
 * POST /api/v1/outcome-measures/administer
 * Administer an outcome measure
 *
 * Request body:
 * {
 *   clientId: string (required)
 *   measureType: 'PHQ9' | 'GAD7' | 'PCL5' (required)
 *   responses: Record<string, number> (required) - e.g., { "q1": 2, "q2": 1, ... }
 *   clinicalNoteId?: string (optional)
 *   appointmentId?: string (optional)
 *   clinicalNotes?: string (optional)
 *   completionTime?: number (optional) - time in seconds
 * }
 */
export async function administerOutcomeMeasure(req: Request, res: Response) {
  try {
    const { clientId, measureType, responses, clinicalNoteId, appointmentId, clinicalNotes, completionTime } =
      req.body;

    // Validation
    if (!clientId || !measureType || !responses) {
      return sendBadRequest(res, 'Missing required fields: clientId, measureType, responses');
    }

    if (!['PHQ9', 'GAD7', 'PCL5'].includes(measureType)) {
      return sendBadRequest(res, 'Invalid measure type. Must be one of: PHQ9, GAD7, PCL5');
    }

    // Get administeredById from authenticated user
    const administeredById = req.user!.userId;

    const outcomeMeasure = await outcomeMeasureService.administerOutcomeMeasure({
      clientId,
      measureType: measureType as OutcomeMeasureType,
      responses,
      administeredById,
      clinicalNoteId,
      appointmentId,
      clinicalNotes,
      completionTime,
    });

    return sendCreated(res, outcomeMeasure, 'Outcome measure administered successfully');
  } catch (error) {
    logControllerError('Error administering outcome measure', error);
    return sendServerError(res, 'Failed to administer outcome measure');
  }
}

/**
 * GET /api/v1/outcome-measures/client/:clientId
 * Get outcome measures for a client
 *
 * Query params:
 * - measureType?: 'PHQ9' | 'GAD7' | 'PCL5'
 * - startDate?: ISO date string
 * - endDate?: ISO date string
 * - limit?: number
 */
export async function getClientOutcomeMeasures(req: Request, res: Response) {
  try {
    const { clientId } = req.params;
    const { measureType, startDate, endDate, limit } = req.query;

    const filters: any = {};

    if (measureType) {
      if (!['PHQ9', 'GAD7', 'PCL5'].includes(measureType as string)) {
        return sendBadRequest(res, 'Invalid measure type. Must be one of: PHQ9, GAD7, PCL5');
      }
      filters.measureType = measureType as OutcomeMeasureType;
    }

    if (startDate) {
      filters.startDate = new Date(startDate as string);
    }

    if (endDate) {
      filters.endDate = new Date(endDate as string);
    }

    if (limit) {
      filters.limit = parseInt(limit as string, 10);
    }

    const measures = await outcomeMeasureService.getClientOutcomeMeasures(clientId, filters);

    return sendSuccess(res, {
      clientId,
      count: measures.length,
      measures,
    }, 'Client outcome measures retrieved successfully');
  } catch (error) {
    logControllerError('Error getting client outcome measures', error);
    return sendServerError(res, 'Failed to get client outcome measures');
  }
}

/**
 * GET /api/v1/outcome-measures/:id
 * Get outcome measure by ID
 */
export async function getOutcomeMeasureById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const measure = await outcomeMeasureService.getOutcomeMeasureById(id);

    return sendSuccess(res, measure, 'Outcome measure retrieved successfully');
  } catch (error) {
    logControllerError('Error getting outcome measure', error);

    if (getErrorMessage(error).includes('not found')) {
      return sendNotFound(res, 'Outcome measure');
    }

    return sendServerError(res, 'Failed to get outcome measure');
  }
}

/**
 * GET /api/v1/outcome-measures/progress/:clientId/:measureType
 * Get progress data for graphing
 *
 * Query params:
 * - startDate?: ISO date string
 * - endDate?: ISO date string
 */
export async function getProgressData(req: Request, res: Response) {
  try {
    const { clientId, measureType } = req.params;
    const { startDate, endDate } = req.query;

    if (!['PHQ9', 'GAD7', 'PCL5'].includes(measureType)) {
      return sendBadRequest(res, 'Invalid measure type. Must be one of: PHQ9, GAD7, PCL5');
    }

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const progressData = await outcomeMeasureService.getProgressData(
      clientId,
      measureType as OutcomeMeasureType,
      start,
      end
    );

    return sendSuccess(res, progressData, 'Progress data retrieved successfully');
  } catch (error) {
    logControllerError('Error getting progress data', error);
    return sendServerError(res, 'Failed to get progress data');
  }
}

/**
 * GET /api/v1/outcome-measures/statistics/:clientId
 * Get statistics for a client's outcome measures
 */
export async function getClientStatistics(req: Request, res: Response) {
  try {
    const { clientId } = req.params;

    const statistics = await outcomeMeasureService.getClientStatistics(clientId);

    return sendSuccess(res, statistics, 'Client statistics retrieved successfully');
  } catch (error) {
    logControllerError('Error getting client statistics', error);
    return sendServerError(res, 'Failed to get client statistics');
  }
}

/**
 * PATCH /api/v1/outcome-measures/:id/clinical-notes
 * Update outcome measure clinical notes
 *
 * Request body:
 * {
 *   clinicalNotes: string (required)
 * }
 */
export async function updateClinicalNotes(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { clinicalNotes } = req.body;

    if (!clinicalNotes) {
      return sendBadRequest(res, 'Missing required field: clinicalNotes');
    }

    const updated = await outcomeMeasureService.updateClinicalNotes(id, clinicalNotes);

    return sendSuccess(res, updated, 'Clinical notes updated successfully');
  } catch (error) {
    logControllerError('Error updating clinical notes', error);
    return sendServerError(res, 'Failed to update clinical notes');
  }
}

/**
 * PATCH /api/v1/outcome-measures/:id/link-note
 * Link outcome measure to clinical note
 *
 * Request body:
 * {
 *   clinicalNoteId: string (required)
 * }
 */
export async function linkToClinicalNote(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { clinicalNoteId } = req.body;

    if (!clinicalNoteId) {
      return sendBadRequest(res, 'Missing required field: clinicalNoteId');
    }

    const updated = await outcomeMeasureService.linkToClinicalNote(id, clinicalNoteId);

    return sendSuccess(res, updated, 'Outcome measure linked to clinical note successfully');
  } catch (error) {
    logControllerError('Error linking to clinical note', error);
    return sendServerError(res, 'Failed to link to clinical note');
  }
}

/**
 * DELETE /api/v1/outcome-measures/:id
 * Delete outcome measure
 */
export async function deleteOutcomeMeasure(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await outcomeMeasureService.deleteOutcomeMeasure(id);

    return sendSuccess(res, null, 'Outcome measure deleted successfully');
  } catch (error) {
    logControllerError('Error deleting outcome measure', error);
    return sendServerError(res, 'Failed to delete outcome measure');
  }
}
