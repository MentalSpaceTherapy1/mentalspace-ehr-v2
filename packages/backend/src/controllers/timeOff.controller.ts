import { Request, Response } from 'express';
import * as timeOffService from '../services/timeOff.service';
import logger from '../utils/logger';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';
// Phase 3.2: Removed direct prisma import - using service methods instead
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError } from '../utils/apiResponse';

/**
 * Module 3 Phase 2.3: Time-Off Request Controller
 */

/**
 * Create time-off request
 * POST /api/v1/time-off
 */
export async function createTimeOffRequest(req: Request, res: Response): Promise<void> {
  try {
    const timeOffRequest = await timeOffService.createTimeOffRequest(req.body);

    logger.info('Time-off request created', {
      requestId: timeOffRequest.id,
      providerId: timeOffRequest.providerId,
      startDate: timeOffRequest.startDate,
      endDate: timeOffRequest.endDate,
    });

    sendCreated(res, timeOffRequest);
  } catch (error) {
    logger.error('Error creating time-off request', { error: getErrorMessage(error) });
    sendBadRequest(res, getErrorMessage(error) || 'Failed to create time-off request');
  }
}

/**
 * Update time-off request
 * PUT /api/v1/time-off/:id
 */
export async function updateTimeOffRequest(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const timeOffRequest = await timeOffService.updateTimeOffRequest(id, req.body);

    logger.info('Time-off request updated', {
      requestId: timeOffRequest.id,
      providerId: timeOffRequest.providerId,
    });

    sendSuccess(res, timeOffRequest);
  } catch (error) {
    logger.error('Error updating time-off request', { error: getErrorMessage(error) });
    sendBadRequest(res, getErrorMessage(error) || 'Failed to update time-off request');
  }
}

/**
 * Approve time-off request
 * POST /api/v1/time-off/:id/approve
 */
export async function approveTimeOffRequest(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const timeOffRequest = await timeOffService.approveTimeOffRequest(id, req.body);

    logger.info('Time-off request approved', {
      requestId: timeOffRequest.id,
      providerId: timeOffRequest.providerId,
      approvedBy: timeOffRequest.approvedBy,
    });

    sendSuccess(res, timeOffRequest, 'Time-off request approved successfully');
  } catch (error) {
    logger.error('Error approving time-off request', { error: getErrorMessage(error) });
    sendBadRequest(res, getErrorMessage(error) || 'Failed to approve time-off request');
  }
}

/**
 * Deny time-off request
 * POST /api/v1/time-off/:id/deny
 */
export async function denyTimeOffRequest(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const timeOffRequest = await timeOffService.denyTimeOffRequest(id, req.body);

    logger.info('Time-off request denied', {
      requestId: timeOffRequest.id,
      providerId: timeOffRequest.providerId,
      approvedBy: timeOffRequest.approvedBy,
    });

    sendSuccess(res, timeOffRequest, 'Time-off request denied');
  } catch (error) {
    logger.error('Error denying time-off request', { error: getErrorMessage(error) });
    sendBadRequest(res, getErrorMessage(error) || 'Failed to deny time-off request');
  }
}

/**
 * Delete time-off request
 * DELETE /api/v1/time-off/:id
 */
export async function deleteTimeOffRequest(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const timeOffRequest = await timeOffService.deleteTimeOffRequest(id);

    logger.info('Time-off request deleted', {
      requestId: timeOffRequest.id,
      providerId: timeOffRequest.providerId,
    });

    sendSuccess(res, timeOffRequest, 'Time-off request deleted successfully');
  } catch (error) {
    logger.error('Error deleting time-off request', { error: getErrorMessage(error) });
    sendBadRequest(res, getErrorMessage(error) || 'Failed to delete time-off request');
  }
}

/**
 * Get time-off request by ID
 * GET /api/v1/time-off/:id
 */
export async function getTimeOffRequestById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const timeOffRequest = await timeOffService.getTimeOffRequestById(id);

    if (!timeOffRequest) {
      sendNotFound(res, 'Time-off request');
      return;
    }

    sendSuccess(res, timeOffRequest);
  } catch (error) {
    logger.error('Error getting time-off request', { error: getErrorMessage(error) });
    sendServerError(res, 'Failed to get time-off request');
  }
}

/**
 * Get all time-off requests with filters
 * GET /api/v1/time-off
 */
export async function getAllTimeOffRequests(req: Request, res: Response): Promise<void> {
  try {
    // Phase 3.2: Use service method instead of direct prisma call
    const tableExists = await timeOffService.checkTimeOffTableExists();

    // If table doesn't exist, return empty array
    if (!tableExists) {
      sendSuccess(res, { count: 0, data: [], featureStatus: 'NOT_ENABLED' });
      return;
    }

    const filters = {
      providerId: req.query.providerId as string | undefined,
      status: req.query.status as 'PENDING' | 'APPROVED' | 'DENIED' | undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    };

    // Wrap service call in try-catch in case table/model doesn't exist
    let timeOffRequests;
    try {
      timeOffRequests = await timeOffService.getAllTimeOffRequests(filters);
    } catch (error) {
      // If service call fails, return empty array
      logger.error('Error querying time-off requests:', error);
      sendSuccess(res, { count: 0, data: [], featureStatus: 'NOT_ENABLED', error: getErrorMessage(error) });
      return;
    }

    sendSuccess(res, { count: timeOffRequests.length, data: timeOffRequests });
  } catch (error) {
    logger.error('Error getting time-off requests', { error: getErrorMessage(error) });
    // Return graceful fallback instead of 500 error
    sendSuccess(res, { count: 0, data: [], featureStatus: 'NOT_ENABLED', error: getErrorMessage(error) });
  }
}

/**
 * Get affected appointments for a time-off request
 * GET /api/v1/time-off/affected-appointments
 */
export async function getAffectedAppointments(req: Request, res: Response): Promise<void> {
  try {
    const { providerId, startDate, endDate } = req.query;

    if (!providerId || !startDate || !endDate) {
      sendBadRequest(res, 'Missing required fields: providerId, startDate, endDate');
      return;
    }

    const affectedAppointments = await timeOffService.getAffectedAppointments(
      providerId as string,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    sendSuccess(res, { count: affectedAppointments.length, data: affectedAppointments });
  } catch (error) {
    logger.error('Error getting affected appointments', { error: getErrorMessage(error) });
    sendServerError(res, 'Failed to get affected appointments');
  }
}

/**
 * Find suggested coverage providers
 * POST /api/v1/time-off/suggest-coverage
 */
export async function suggestCoverageProviders(req: Request, res: Response): Promise<void> {
  try {
    const { originalProviderId, date, startTime, endTime } = req.body;

    if (!originalProviderId || !date || !startTime || !endTime) {
      sendBadRequest(res, 'Missing required fields: originalProviderId, date, startTime, endTime');
      return;
    }

    const providers = await timeOffService.findSuggestedCoverageProviders(
      originalProviderId,
      new Date(date),
      startTime,
      endTime
    );

    sendSuccess(res, { count: providers.length, data: providers });
  } catch (error) {
    logger.error('Error suggesting coverage providers', { error: getErrorMessage(error) });
    sendServerError(res, 'Failed to suggest coverage providers');
  }
}

/**
 * Get time-off statistics
 * GET /api/v1/time-off/stats
 */
export async function getTimeOffStats(req: Request, res: Response): Promise<void> {
  try {
    const providerId = req.query.providerId as string | undefined;
    const stats = await timeOffService.getTimeOffStats(providerId);

    sendSuccess(res, stats);
  } catch (error) {
    logger.error('Error getting time-off stats', { error: getErrorMessage(error) });
    sendServerError(res, 'Failed to get time-off statistics');
  }
}
