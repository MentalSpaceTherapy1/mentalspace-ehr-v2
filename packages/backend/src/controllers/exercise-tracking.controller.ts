import { Request, Response } from 'express';
import exerciseTrackingService from '../services/exercise-tracking.service';
import { ValidationError } from '../utils/errors';
import logger, { logControllerError } from '../utils/logger';

/**
 * Create a new exercise log entry
 */
export const createExerciseLog = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const data = req.body;

    // Validate required fields
    if (!data.activityType) {
      throw new ValidationError('Activity type is required');
    }

    if (!data.duration || data.duration <= 0) {
      throw new ValidationError('Duration must be greater than 0');
    }

    if (!data.intensity) {
      throw new ValidationError('Intensity is required');
    }

    const log = await exerciseTrackingService.logExercise(
      clientId,
      data,
      req.user!.id
    );

    res.status(201).json({
      success: true,
      data: log,
      message: 'Exercise log created successfully',
    });
  } catch (error) {
    logControllerError('createExerciseLog', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create exercise log',
    });
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

    res.status(200).json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    logControllerError('getExerciseLogs', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch exercise logs',
    });
  }
};

/**
 * Get a single exercise log by ID
 */
export const getExerciseLogById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const log = await exerciseTrackingService.getExerciseLogById(id);

    res.status(200).json({
      success: true,
      data: log,
    });
  } catch (error) {
    logControllerError('getExerciseLogById', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch exercise log',
    });
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

    res.status(200).json({
      success: true,
      data: log,
      message: 'Exercise log updated successfully',
    });
  } catch (error) {
    logControllerError('updateExerciseLog', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update exercise log',
    });
  }
};

/**
 * Delete an exercise log
 */
export const deleteExerciseLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await exerciseTrackingService.deleteExerciseLog(id, req.user!.id);

    res.status(200).json(result);
  } catch (error) {
    logControllerError('deleteExerciseLog', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete exercise log',
    });
  }
};

/**
 * Get exercise statistics
 */
export const getExerciseStats = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new ValidationError('Start date and end date are required');
    }

    const dateRange = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
    };

    const stats = await exerciseTrackingService.getExerciseStats(clientId, dateRange);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logControllerError('getExerciseStats', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch exercise stats',
    });
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
      throw new ValidationError('Start date and end date are required');
    }

    const dateRange = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
    };

    const trends = await exerciseTrackingService.getExerciseTrends(clientId, dateRange);

    res.status(200).json({
      success: true,
      data: trends,
    });
  } catch (error) {
    logControllerError('getExerciseTrends', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch exercise trends',
    });
  }
};
