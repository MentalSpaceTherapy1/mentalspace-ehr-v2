/**
 * Crisis Detection Controller
 *
 * Handles HTTP requests for crisis detection management.
 * Provides endpoints for viewing, reviewing, and analyzing crisis detections.
 */

import { Request, Response } from 'express';
import logger from '../utils/logger';
import {
  getCrisisLogs,
  getCrisisLogById,
  reviewDetection,
  markActionTaken,
  getCrisisStats,
} from '../services/crisis-detection.service';
import { CrisisSeverity } from '../config/crisis-keywords';

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
      userId: (req as any).user?.id,
      count: logs.length,
      filters,
    });

    return res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    logger.error('Error getting crisis logs', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve crisis logs',
      error: error.message,
    });
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
      userId: (req as any).user?.id,
      logId: id,
    });

    return res.status(200).json({
      success: true,
      data: log,
    });
  } catch (error: any) {
    logger.error('Error getting crisis log', {
      error: error.message,
      logId: req.params.id,
    });

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: 'Crisis detection log not found',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve crisis log',
      error: error.message,
    });
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
    const reviewerId = (req as any).user?.id;

    if (!reviewerId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!notes || typeof notes !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Review notes are required',
      });
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

    return res.status(200).json({
      success: true,
      message: 'Crisis detection reviewed successfully',
      data: updated,
    });
  } catch (error: any) {
    logger.error('Error reviewing crisis log', {
      error: error.message,
      logId: req.params.id,
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to review crisis detection',
      error: error.message,
    });
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
      return res.status(400).json({
        success: false,
        message: 'Action taken description is required',
      });
    }

    const updated = await markActionTaken(id, actionTaken);

    logger.info('Action recorded for crisis log', {
      logId: id,
      userId: (req as any).user?.id,
    });

    return res.status(200).json({
      success: true,
      message: 'Action recorded successfully',
      data: updated,
    });
  } catch (error: any) {
    logger.error('Error recording action', {
      error: error.message,
      logId: req.params.id,
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to record action',
      error: error.message,
    });
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
      userId: (req as any).user?.id,
      filters,
    });

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Error getting crisis statistics', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics',
      error: error.message,
    });
  }
};
