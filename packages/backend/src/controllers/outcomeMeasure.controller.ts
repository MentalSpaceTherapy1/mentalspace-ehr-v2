import { Request, Response } from 'express';
import { outcomeMeasureService } from '../services/outcomeMeasure.service';
import { OutcomeMeasureType } from '@prisma/client';
import { logControllerError } from '../utils/logger';

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
      return res.status(400).json({
        success: false,
        message: `Invalid measure type. Must be one of: PHQ9, GAD7, PCL5`,
      });
    }

    const definition = outcomeMeasureService.getQuestionnaireDefinition(type as OutcomeMeasureType);

    res.json({
      success: true,
      message: 'Questionnaire definition retrieved successfully',
      data: definition,
    });
  } catch (error: any) {
    logControllerError('Error getting questionnaire definition', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get questionnaire definition',
      error: error.message,
    });
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
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: clientId, measureType, responses',
      });
    }

    if (!['PHQ9', 'GAD7', 'PCL5'].includes(measureType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid measure type. Must be one of: PHQ9, GAD7, PCL5`,
      });
    }

    // Get administeredById from authenticated user
    const administeredById = (req as any).user.userId;

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

    res.status(201).json({
      success: true,
      message: 'Outcome measure administered successfully',
      data: outcomeMeasure,
    });
  } catch (error: any) {
    logControllerError('Error administering outcome measure', error);
    res.status(500).json({
      success: false,
      message: 'Failed to administer outcome measure',
      error: error.message,
    });
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
        return res.status(400).json({
          success: false,
          message: `Invalid measure type. Must be one of: PHQ9, GAD7, PCL5`,
        });
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

    res.json({
      success: true,
      message: 'Client outcome measures retrieved successfully',
      data: {
        clientId,
        count: measures.length,
        measures,
      },
    });
  } catch (error: any) {
    logControllerError('Error getting client outcome measures', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get client outcome measures',
      error: error.message,
    });
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

    res.json({
      success: true,
      message: 'Outcome measure retrieved successfully',
      data: measure,
    });
  } catch (error: any) {
    logControllerError('Error getting outcome measure', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to get outcome measure',
      error: error.message,
    });
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
      return res.status(400).json({
        success: false,
        message: `Invalid measure type. Must be one of: PHQ9, GAD7, PCL5`,
      });
    }

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const progressData = await outcomeMeasureService.getProgressData(
      clientId,
      measureType as OutcomeMeasureType,
      start,
      end
    );

    res.json({
      success: true,
      message: 'Progress data retrieved successfully',
      data: progressData,
    });
  } catch (error: any) {
    logControllerError('Error getting progress data', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get progress data',
      error: error.message,
    });
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

    res.json({
      success: true,
      message: 'Client statistics retrieved successfully',
      data: statistics,
    });
  } catch (error: any) {
    logControllerError('Error getting client statistics', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get client statistics',
      error: error.message,
    });
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
      return res.status(400).json({
        success: false,
        message: 'Missing required field: clinicalNotes',
      });
    }

    const updated = await outcomeMeasureService.updateClinicalNotes(id, clinicalNotes);

    res.json({
      success: true,
      message: 'Clinical notes updated successfully',
      data: updated,
    });
  } catch (error: any) {
    logControllerError('Error updating clinical notes', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update clinical notes',
      error: error.message,
    });
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
      return res.status(400).json({
        success: false,
        message: 'Missing required field: clinicalNoteId',
      });
    }

    const updated = await outcomeMeasureService.linkToClinicalNote(id, clinicalNoteId);

    res.json({
      success: true,
      message: 'Outcome measure linked to clinical note successfully',
      data: updated,
    });
  } catch (error: any) {
    logControllerError('Error linking to clinical note', error);
    res.status(500).json({
      success: false,
      message: 'Failed to link to clinical note',
      error: error.message,
    });
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

    res.json({
      success: true,
      message: 'Outcome measure deleted successfully',
    });
  } catch (error: any) {
    logControllerError('Error deleting outcome measure', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete outcome measure',
      error: error.message,
    });
  }
}
