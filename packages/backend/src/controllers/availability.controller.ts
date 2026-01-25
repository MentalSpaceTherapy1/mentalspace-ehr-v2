import { Request, Response } from 'express';
import * as availabilityService from '../services/providerAvailability.service';
import logger from '../utils/logger';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError } from '../utils/apiResponse';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';

/**
 * Module 3 Phase 2.3: Provider Availability Controller
 */

/**
 * Create provider availability
 * POST /api/v1/provider-availability
 */
export async function createAvailability(req: Request, res: Response) {
  try {
    const availability = await availabilityService.createProviderAvailability(req.body);

    logger.info('Provider availability created', {
      availabilityId: availability.id,
      providerId: availability.providerId,
      dayOfWeek: availability.dayOfWeek,
    });

    return sendCreated(res, availability);
  } catch (error) {
    logger.error('Error creating provider availability', { error: getErrorMessage(error) });
    return sendBadRequest(res, getErrorMessage(error) || 'Failed to create provider availability');
  }
}

/**
 * Update provider availability
 * PUT /api/v1/provider-availability/:id
 */
export async function updateAvailability(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const availability = await availabilityService.updateProviderAvailability(id, req.body);

    logger.info('Provider availability updated', {
      availabilityId: availability.id,
      providerId: availability.providerId,
    });

    return sendSuccess(res, availability);
  } catch (error) {
    logger.error('Error updating provider availability', { error: getErrorMessage(error) });
    return sendBadRequest(res, getErrorMessage(error) || 'Failed to update provider availability');
  }
}

/**
 * Delete provider availability
 * DELETE /api/v1/provider-availability/:id
 */
export async function deleteAvailability(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const availability = await availabilityService.deleteProviderAvailability(id);

    logger.info('Provider availability deleted', {
      availabilityId: availability.id,
      providerId: availability.providerId,
    });

    return sendSuccess(res, availability, 'Provider availability deleted successfully');
  } catch (error) {
    logger.error('Error deleting provider availability', { error: getErrorMessage(error) });
    return sendBadRequest(res, getErrorMessage(error) || 'Failed to delete provider availability');
  }
}

/**
 * Get provider availability by ID
 * GET /api/v1/provider-availability/:id
 */
export async function getAvailabilityById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const availability = await availabilityService.getProviderAvailabilityById(id);

    if (!availability) {
      sendNotFound(res, 'Provider availability');
      return;
    }

    sendSuccess(res, availability);
  } catch (error) {
    logger.error('Error getting provider availability', { error: getErrorMessage(error) });
    sendServerError(res, 'Failed to get provider availability');
  }
}

/**
 * Get all provider availabilities with filters
 * GET /api/v1/provider-availability
 */
export async function getAllAvailabilities(req: Request, res: Response) {
  try {
    const filters = {
      providerId: req.query.providerId as string | undefined,
      dayOfWeek: req.query.dayOfWeek ? parseInt(req.query.dayOfWeek as string) : undefined,
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      includeExpired: req.query.includeExpired === 'true',
    };

    const availabilities = await availabilityService.getAllProviderAvailabilities(filters);

    sendSuccess(res, { count: availabilities.length, data: availabilities });
  } catch (error) {
    logger.error('Error getting provider availabilities', { error: getErrorMessage(error) });
    sendServerError(res, 'Failed to get provider availabilities');
  }
}

/**
 * Get provider's weekly schedule
 * GET /api/v1/provider-availability/provider/:providerId/schedule
 */
export async function getProviderSchedule(req: Request, res: Response) {
  try {
    const { providerId } = req.params;
    const schedule = await availabilityService.getProviderWeeklySchedule(providerId);

    sendSuccess(res, { count: schedule.length, data: schedule });
  } catch (error) {
    logger.error('Error getting provider schedule', { error: getErrorMessage(error) });
    sendServerError(res, 'Failed to get provider schedule');
  }
}

/**
 * Check provider availability for specific date/time
 * POST /api/v1/provider-availability/check
 */
export async function checkAvailability(req: Request, res: Response) {
  try {
    const { providerId, date, startTime, endTime } = req.body;

    if (!providerId || !date || !startTime || !endTime) {
      sendBadRequest(res, 'Missing required fields: providerId, date, startTime, endTime');
      return;
    }

    const availability = await availabilityService.checkProviderAvailability(
      providerId,
      new Date(date),
      startTime,
      endTime
    );

    sendSuccess(res, availability);
  } catch (error) {
    logger.error('Error checking provider availability', { error: getErrorMessage(error) });
    sendServerError(res, 'Failed to check provider availability');
  }
}

/**
 * Find available providers for specific date/time
 * POST /api/v1/provider-availability/find-available
 */
export async function findAvailableProviders(req: Request, res: Response) {
  try {
    const { date, startTime, endTime, specialty, telehealthRequired, officeLocationId } = req.body;

    if (!date || !startTime || !endTime) {
      sendBadRequest(res, 'Missing required fields: date, startTime, endTime');
      return;
    }

    const providers = await availabilityService.findAvailableProviders(
      new Date(date),
      startTime,
      endTime,
      {
        specialty,
        telehealthRequired,
        officeLocationId,
      }
    );

    sendSuccess(res, { count: providers.length, data: providers });
  } catch (error) {
    logger.error('Error finding available providers', { error: getErrorMessage(error) });
    sendServerError(res, 'Failed to find available providers');
  }
}

/**
 * Validate schedule conflicts
 * POST /api/v1/provider-availability/validate
 */
export async function validateSchedule(req: Request, res: Response) {
  try {
    const { providerId, dayOfWeek, startTime, endTime, excludeId } = req.body;

    if (!providerId || dayOfWeek === undefined || !startTime || !endTime) {
      sendBadRequest(res, 'Missing required fields: providerId, dayOfWeek, startTime, endTime');
      return;
    }

    const result = await availabilityService.validateScheduleConflicts(
      providerId,
      dayOfWeek,
      startTime,
      endTime,
      excludeId
    );

    sendSuccess(res, result);
  } catch (error) {
    logger.error('Error validating schedule', { error: getErrorMessage(error) });
    sendServerError(res, 'Failed to validate schedule');
  }
}
