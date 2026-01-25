import { Request, Response } from 'express';
import exerciseTrackingService from '../services/exercise-tracking.service';
import { ValidationError } from '../utils/errors';
import logger, { logControllerError } from '../utils/logger';
import { sendSuccess, sendCreated, sendBadRequest, sendServerError, sendPaginated } from '../utils/apiResponse';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';

/**
 * Create a new exercise log entry
 */
export const createExerciseLog = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const data = req.body;

    // Validate required fields
    if (!data.activityType) {
      return sendBadRequest(res, 'Activity type is required');
    }

    if (!data.duration || data.duration <= 0) {
      return sendBadRequest(res, 'Duration must be greater than 0');
    }

    if (!data.intensity) {
      return sendBadRequest(res, 'Intensity is required');
    }

    const log = await exerciseTrackingService.logExercise(
      clientId,
      data,
      req.user!.id
    );

    return sendCreated(res, log, 'Exercise log created successfully');
  } catch (error) {
    logControllerError('createExerciseLog', error, { params: req.params });
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to create exercise log');
  }
};

/**
 * Get exercise logs with filtering and pagination
 */
export const getExerciseLogs = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { startDate, endDate, activityType, intensity, page, limit } = req.query;

    const filters: any = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      activityType: activityType as string | undefined,
      intensity: intensity as string | undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
    };

    const result = await exerciseTrackingService.getExerciseLogs(clientId, filters);

    return sendPaginated(res, result.logs, result.pagination);
  } catch (error) {
    logControllerError('getExerciseLogs', error, { params: req.params });
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to fetch exercise logs');
  }
};

/**
 * Get a single exercise log by ID
 */
export const getExerciseLogById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const log = await exerciseTrackingService.getExerciseLogById(id);

    return sendSuccess(res, log);
  } catch (error) {
    logControllerError('getExerciseLogById', error, { params: req.params });
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to fetch exercise log');
  }
};

/**
 * Update an exercise log
 */
export const updateExerciseLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    if (data.loggedAt) {
      data.loggedAt = new Date(data.loggedAt);
    }

    const log = await exerciseTrackingService.updateExerciseLog(
      id,
      data,
      req.user!.id
    );

    return sendSuccess(res, log, 'Exercise log updated successfully');
  } catch (error) {
    logControllerError('updateExerciseLog', error, { params: req.params });
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to update exercise log');
  }
};

/**
 * Delete an exercise log
 */
export const deleteExerciseLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await exerciseTrackingService.deleteExerciseLog(id, req.user!.id);

    return sendSuccess(res, result);
  } catch (error) {
    logControllerError('deleteExerciseLog', error, { params: req.params });
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to delete exercise log');
  }
};

/**
 * Get exercise statistics
 */
export const getExerciseStats = async (req: Request, res: Response) => {
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

    const stats = await exerciseTrackingService.getExerciseStats(clientId, dateRange);

    return sendSuccess(res, stats);
  } catch (error) {
    logControllerError('getExerciseStats', error, { params: req.params });
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to fetch exercise stats');
  }
};

/**
 * Get exercise trends
 */
export const getExerciseTrends = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return sendBadRequest(res, 'Start date and end date are required');
    }

    const dateRange = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
    };

    const trends = await exerciseTrackingService.getExerciseTrends(clientId, dateRange);

    return sendSuccess(res, trends);
  } catch (error) {
    logControllerError('getExerciseTrends', error, { params: req.params });
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to fetch exercise trends');
  }
};
