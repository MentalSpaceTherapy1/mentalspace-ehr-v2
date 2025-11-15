import { Request, Response } from 'express';
import * as timeOffService from '../services/timeOff.service';
import logger from '../utils/logger';

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

    res.status(201).json({
      success: true,
      data: timeOffRequest,
    });
  } catch (error: any) {
    logger.error('Error creating time-off request', { error: error.message });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create time-off request',
    });
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

    res.json({
      success: true,
      data: timeOffRequest,
    });
  } catch (error: any) {
    logger.error('Error updating time-off request', { error: error.message });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update time-off request',
    });
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

    res.json({
      success: true,
      message: 'Time-off request approved successfully',
      data: timeOffRequest,
    });
  } catch (error: any) {
    logger.error('Error approving time-off request', { error: error.message });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to approve time-off request',
    });
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

    res.json({
      success: true,
      message: 'Time-off request denied',
      data: timeOffRequest,
    });
  } catch (error: any) {
    logger.error('Error denying time-off request', { error: error.message });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to deny time-off request',
    });
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

    res.json({
      success: true,
      message: 'Time-off request deleted successfully',
      data: timeOffRequest,
    });
  } catch (error: any) {
    logger.error('Error deleting time-off request', { error: error.message });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete time-off request',
    });
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
      res.status(404).json({
        success: false,
        message: 'Time-off request not found',
      });
      return;
    }

    res.json({
      success: true,
      data: timeOffRequest,
    });
  } catch (error: any) {
    logger.error('Error getting time-off request', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get time-off request',
    });
  }
}

/**
 * Get all time-off requests with filters
 * GET /api/v1/time-off
 */
export async function getAllTimeOffRequests(req: Request, res: Response): Promise<void> {
  try {
    // Check if the time_off_requests table exists
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'time_off_requests'
      );
    `.catch(() => null);

    // If table doesn't exist, return empty array
    if (!tableExists || !(tableExists as any)[0]?.exists) {
      return res.json({
        success: true,
        count: 0,
        data: [],
        featureStatus: 'NOT_ENABLED'
      });
    }

    const filters = {
      providerId: req.query.providerId as string | undefined,
      status: req.query.status as 'PENDING' | 'APPROVED' | 'DENIED' | undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    };

    const timeOffRequests = await timeOffService.getAllTimeOffRequests(filters);

    res.json({
      success: true,
      count: timeOffRequests.length,
      data: timeOffRequests,
    });
  } catch (error: any) {
    logger.error('Error getting time-off requests', { error: error.message });
    // Return graceful fallback instead of 500 error
    res.json({
      success: true,
      count: 0,
      data: [],
      featureStatus: 'NOT_ENABLED',
      error: error.message
    });
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
      res.status(400).json({
        success: false,
        message: 'Missing required fields: providerId, startDate, endDate',
      });
      return;
    }

    const affectedAppointments = await timeOffService.getAffectedAppointments(
      providerId as string,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json({
      success: true,
      count: affectedAppointments.length,
      data: affectedAppointments,
    });
  } catch (error: any) {
    logger.error('Error getting affected appointments', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get affected appointments',
    });
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
      res.status(400).json({
        success: false,
        message: 'Missing required fields: originalProviderId, date, startTime, endTime',
      });
      return;
    }

    const providers = await timeOffService.findSuggestedCoverageProviders(
      originalProviderId,
      new Date(date),
      startTime,
      endTime
    );

    res.json({
      success: true,
      count: providers.length,
      data: providers,
    });
  } catch (error: any) {
    logger.error('Error suggesting coverage providers', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to suggest coverage providers',
    });
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

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Error getting time-off stats', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get time-off statistics',
    });
  }
}
