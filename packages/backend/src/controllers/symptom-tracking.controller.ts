import { Request, Response } from 'express';
import symptomTrackingService from '../services/symptom-tracking.service';
import { ValidationError } from '../utils/errors';
import logger, { logControllerError } from '../utils/logger';
import { sendSuccess, sendCreated, sendBadRequest, sendServerError, sendPaginated } from '../utils/apiResponse';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';

/**
 * Create a new symptom log entry
 */
export const createSymptomLog = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const data = req.body;

    // Validate required fields
    if (!data.symptoms || !Array.isArray(data.symptoms) || data.symptoms.length === 0) {
      return sendBadRequest(res, 'Symptoms array is required');
    }

    if (!data.severity || data.severity < 1 || data.severity > 10) {
      return sendBadRequest(res, 'Severity must be between 1 and 10');
    }

    const log = await symptomTrackingService.logSymptom(
      clientId,
      data,
      req.user!.id
    );

    return sendCreated(res, log, 'Symptom log created successfully');
  } catch (error) {
    logControllerError('createSymptomLog', error, { params: req.params });
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to create symptom log');
  }
};

/**
 * Get symptom logs with filtering and pagination
 */
export const getSymptomLogs = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { startDate, endDate, symptomType, minSeverity, maxSeverity, page, limit } = req.query;

    const filters: any = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      symptomType: symptomType as string | undefined,
      minSeverity: minSeverity ? parseInt(minSeverity as string) : undefined,
      maxSeverity: maxSeverity ? parseInt(maxSeverity as string) : undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
    };

    const result = await symptomTrackingService.getSymptomLogs(clientId, filters);

    return sendPaginated(res, result.logs, result.pagination);
  } catch (error) {
    logControllerError('getSymptomLogs', error, { params: req.params });
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to fetch symptom logs');
  }
};

/**
 * Get a single symptom log by ID
 */
export const getSymptomLogById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const log = await symptomTrackingService.getSymptomLogById(id);

    return sendSuccess(res, log);
  } catch (error) {
    logControllerError('getSymptomLogById', error, { params: req.params });
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to fetch symptom log');
  }
};

/**
 * Update a symptom log
 */
export const updateSymptomLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const log = await symptomTrackingService.updateSymptomLog(
      id,
      data,
      req.user!.id
    );

    return sendSuccess(res, log, 'Symptom log updated successfully');
  } catch (error) {
    logControllerError('updateSymptomLog', error, { params: req.params });
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to update symptom log');
  }
};

/**
 * Delete a symptom log
 */
export const deleteSymptomLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await symptomTrackingService.deleteSymptomLog(id, req.user!.id);

    return sendSuccess(res, result);
  } catch (error) {
    logControllerError('deleteSymptomLog', error, { params: req.params });
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to delete symptom log');
  }
};

/**
 * Get symptom trends
 */
export const getSymptomTrends = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { startDate, endDate, days } = req.query;

    let dateRange: { startDate: Date; endDate: Date };

    if (days) {
      // Calculate date range from days parameter
      const daysNum = parseInt(days as string) || 30;
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - daysNum);
      dateRange = { startDate: start, endDate: end };
    } else if (startDate && endDate) {
      dateRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      };
    } else {
      // Default to last 30 days
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      dateRange = { startDate: start, endDate: end };
    }

    const trends = await symptomTrackingService.getSymptomTrends(clientId, dateRange);

    return sendSuccess(res, trends);
  } catch (error) {
    logControllerError('getSymptomTrends', error, { params: req.params });
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to fetch symptom trends');
  }
};

/**
 * Get symptom summary
 */
export const getSymptomSummary = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { startDate, endDate, days } = req.query;

    let dateRange: { startDate: Date; endDate: Date };

    if (days) {
      // Calculate date range from days parameter
      const daysNum = parseInt(days as string) || 30;
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - daysNum);
      dateRange = { startDate: start, endDate: end };
    } else if (startDate && endDate) {
      dateRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      };
    } else {
      // Default to last 30 days
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      dateRange = { startDate: start, endDate: end };
    }

    const summary = await symptomTrackingService.getSymptomSummary(clientId, dateRange);

    return sendSuccess(res, summary);
  } catch (error) {
    logControllerError('getSymptomSummary', error, { params: req.params });
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to fetch symptom summary');
  }
};
