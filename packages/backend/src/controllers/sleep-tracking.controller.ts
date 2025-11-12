import { Request, Response } from 'express';
import sleepTrackingService from '../services/sleep-tracking.service';
import { ValidationError } from '../utils/errors';
import logger, { logControllerError } from '../utils/logger';

/**
 * Create a new sleep log entry
 */
export const createSleepLog = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const data = req.body;

    // Validate required fields
    if (!data.logDate || !data.bedtime || !data.wakeTime) {
      throw new ValidationError('logDate, bedtime, and wakeTime are required');
    }

    if (!data.quality || data.quality < 1 || data.quality > 5) {
      throw new ValidationError('Quality must be between 1 and 5');
    }

    const log = await sleepTrackingService.logSleep(
      clientId,
      {
        ...data,
        logDate: new Date(data.logDate),
        bedtime: new Date(data.bedtime),
        wakeTime: new Date(data.wakeTime),
      },
      req.user!.id
    );

    res.status(201).json({
      success: true,
      data: log,
      message: 'Sleep log created successfully',
    });
  } catch (error) {
    logControllerError('createSleepLog', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create sleep log',
    });
  }
};

/**
 * Get sleep logs with filtering and pagination
 */
export const getSleepLogs = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { startDate, endDate, minQuality, maxQuality, page, limit } = req.query;

    const filters: any = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      minQuality: minQuality ? parseInt(minQuality as string) : undefined,
      maxQuality: maxQuality ? parseInt(maxQuality as string) : undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
    };

    const result = await sleepTrackingService.getSleepLogs(clientId, filters);

    res.status(200).json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    logControllerError('getSleepLogs', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch sleep logs',
    });
  }
};

/**
 * Get a single sleep log by ID
 */
export const getSleepLogById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const log = await sleepTrackingService.getSleepLogById(id);

    res.status(200).json({
      success: true,
      data: log,
    });
  } catch (error) {
    logControllerError('getSleepLogById', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch sleep log',
    });
  }
};

/**
 * Update a sleep log
 */
export const updateSleepLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Convert date strings if provided
    if (data.logDate) data.logDate = new Date(data.logDate);
    if (data.bedtime) data.bedtime = new Date(data.bedtime);
    if (data.wakeTime) data.wakeTime = new Date(data.wakeTime);

    const log = await sleepTrackingService.updateSleepLog(
      id,
      data,
      req.user!.id
    );

    res.status(200).json({
      success: true,
      data: log,
      message: 'Sleep log updated successfully',
    });
  } catch (error) {
    logControllerError('updateSleepLog', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update sleep log',
    });
  }
};

/**
 * Delete a sleep log
 */
export const deleteSleepLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await sleepTrackingService.deleteSleepLog(id, req.user!.id);

    res.status(200).json(result);
  } catch (error) {
    logControllerError('deleteSleepLog', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete sleep log',
    });
  }
};

/**
 * Calculate sleep metrics
 */
export const getSleepMetrics = async (req: Request, res: Response) => {
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

    const metrics = await sleepTrackingService.calculateSleepMetrics(clientId, dateRange);

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logControllerError('getSleepMetrics', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch sleep metrics',
    });
  }
};

/**
 * Get sleep trends
 */
export const getSleepTrends = async (req: Request, res: Response) => {
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

    const trends = await sleepTrackingService.getSleepTrends(clientId, dateRange);

    res.status(200).json({
      success: true,
      data: trends,
    });
  } catch (error) {
    logControllerError('getSleepTrends', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch sleep trends',
    });
  }
};
