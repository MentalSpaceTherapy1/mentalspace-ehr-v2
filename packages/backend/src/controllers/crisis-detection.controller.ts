/**
 * Crisis Detection Controller
 *
 * Handles HTTP requests for crisis detection management.
 * Provides endpoints for viewing, reviewing, and analyzing crisis detections.
 */

import { Request, Response } from 'express';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
import logger from '../utils/logger';
import {
  getCrisisLogs,
  getCrisisLogById,
  reviewDetection,
  markActionTaken,
  getCrisisStats,
} from '../services/crisis-detection.service';
import { CrisisSeverity } from '../config/crisis-keywords';
import { sendSuccess, sendBadRequest, sendUnauthorized, sendNotFound, sendServerError } from '../utils/apiResponse';

/**
 * GET /api/crisis/logs
 * Get all crisis detection logs with filtering and pagination
 * Admin only
 */
export const getAllCrisisLogs = async (req: Request, res: Response) => {
  try {
    const {
      severity,
      reviewed,
      userId,
      startDate,
      endDate,
      page = '1',
      limit = '50',
    } = req.query;

    // Parse pagination
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // Build filters
    const filters: any = {
      skip,
      take,
    };

    if (severity && Object.values(CrisisSeverity).includes(severity as CrisisSeverity)) {
      filters.severity = severity as CrisisSeverity;
    }

    if (reviewed !== undefined) {
      filters.reviewed = reviewed === 'true';
    }

    if (userId) {
      filters.userId = userId as string;
    }

    if (startDate) {
      filters.startDate = new Date(startDate as string);
    }

    if (endDate) {
      filters.endDate = new Date(endDate as string);
    }

    // Get logs
    const { logs, total } = await getCrisisLogs(filters);

    logger.info('Crisis logs retrieved', {
      userId: req.user?.userId,
      count: logs.length,
      filters,
    });

    return sendSuccess(res, {
      logs,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    logger.error('Error getting crisis logs', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to retrieve crisis logs');
  }
};

/**
 * GET /api/crisis/logs/:id
 * Get a specific crisis detection log by ID
 * Admin only
 */
export const getCrisisLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const log = await getCrisisLogById(id);

    logger.info('Crisis log retrieved', {
      userId: req.user?.userId,
      logId: id,
    });

    return sendSuccess(res, log);
  } catch (error) {
    logger.error('Error getting crisis log', {
      error: getErrorMessage(error),
      logId: req.params.id,
    });

    if (getErrorMessage(error).includes('not found')) {
      return sendNotFound(res, 'Crisis detection log');
    }

    return sendServerError(res, 'Failed to retrieve crisis log');
  }
};

/**
 * PUT /api/crisis/logs/:id/review
 * Review a crisis detection (mark as reviewed with notes)
 * Admin or assigned clinician only
 */
export const reviewCrisisLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes, falsePositive = false, actionTaken } = req.body;
    const reviewerId = req.user?.userId;

    if (!reviewerId) {
      return sendUnauthorized(res, 'User not authenticated');
    }

    if (!notes || typeof notes !== 'string') {
      return sendBadRequest(res, 'Review notes are required');
    }

    // Review the detection
    const updated = await reviewDetection(
      id,
      reviewerId,
      notes,
      falsePositive
    );

    // If action taken is provided, record it
    if (actionTaken && typeof actionTaken === 'string') {
      await markActionTaken(id, actionTaken);
    }

    logger.info('Crisis log reviewed', {
      logId: id,
      reviewerId,
      falsePositive,
    });

    return sendSuccess(res, updated, 'Crisis detection reviewed successfully');
  } catch (error) {
    logger.error('Error reviewing crisis log', {
      error: getErrorMessage(error),
      logId: req.params.id,
    });

    return sendServerError(res, 'Failed to review crisis detection');
  }
};

/**
 * PUT /api/crisis/logs/:id/action
 * Record action taken on a crisis detection
 * Admin or assigned clinician only
 */
export const recordActionTaken = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actionTaken } = req.body;

    if (!actionTaken || typeof actionTaken !== 'string') {
      return sendBadRequest(res, 'Action taken description is required');
    }

    const updated = await markActionTaken(id, actionTaken);

    logger.info('Action recorded for crisis log', {
      logId: id,
      userId: req.user?.userId,
    });

    return sendSuccess(res, updated, 'Action recorded successfully');
  } catch (error) {
    logger.error('Error recording action', {
      error: getErrorMessage(error),
      logId: req.params.id,
    });

    return sendServerError(res, 'Failed to record action');
  }
};

/**
 * GET /api/crisis/stats
 * Get statistics on crisis detections
 * Admin only
 */
export const getCrisisStatistics = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const filters: any = {};

    if (startDate) {
      filters.startDate = new Date(startDate as string);
    }

    if (endDate) {
      filters.endDate = new Date(endDate as string);
    }

    const stats = await getCrisisStats(filters);

    logger.info('Crisis statistics retrieved', {
      userId: req.user?.userId,
      filters,
    });

    return sendSuccess(res, stats);
  } catch (error) {
    logger.error('Error getting crisis statistics', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to retrieve statistics');
  }
};
