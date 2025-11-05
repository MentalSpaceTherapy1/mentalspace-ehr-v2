import { Request, Response } from 'express';
import * as availabilityService from '../services/providerAvailability.service';
import logger from '../utils/logger';

/**
 * Module 3 Phase 2.3: Provider Availability Controller
 */

/**
 * Create provider availability
 * POST /api/v1/provider-availability
 */
export async function createAvailability(req: Request, res: Response): Promise<void> {
  try {
    const availability = await availabilityService.createProviderAvailability(req.body);

    logger.info('Provider availability created', {
      availabilityId: availability.id,
      providerId: availability.providerId,
      dayOfWeek: availability.dayOfWeek,
    });

    res.status(201).json({
      success: true,
      data: availability,
    });
  } catch (error: any) {
    logger.error('Error creating provider availability', { error: error.message });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create provider availability',
    });
  }
}

/**
 * Update provider availability
 * PUT /api/v1/provider-availability/:id
 */
export async function updateAvailability(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const availability = await availabilityService.updateProviderAvailability(id, req.body);

    logger.info('Provider availability updated', {
      availabilityId: availability.id,
      providerId: availability.providerId,
    });

    res.json({
      success: true,
      data: availability,
    });
  } catch (error: any) {
    logger.error('Error updating provider availability', { error: error.message });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update provider availability',
    });
  }
}

/**
 * Delete provider availability
 * DELETE /api/v1/provider-availability/:id
 */
export async function deleteAvailability(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const availability = await availabilityService.deleteProviderAvailability(id);

    logger.info('Provider availability deleted', {
      availabilityId: availability.id,
      providerId: availability.providerId,
    });

    res.json({
      success: true,
      message: 'Provider availability deleted successfully',
      data: availability,
    });
  } catch (error: any) {
    logger.error('Error deleting provider availability', { error: error.message });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete provider availability',
    });
  }
}

/**
 * Get provider availability by ID
 * GET /api/v1/provider-availability/:id
 */
export async function getAvailabilityById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const availability = await availabilityService.getProviderAvailabilityById(id);

    if (!availability) {
      res.status(404).json({
        success: false,
        message: 'Provider availability not found',
      });
      return;
    }

    res.json({
      success: true,
      data: availability,
    });
  } catch (error: any) {
    logger.error('Error getting provider availability', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get provider availability',
    });
  }
}

/**
 * Get all provider availabilities with filters
 * GET /api/v1/provider-availability
 */
export async function getAllAvailabilities(req: Request, res: Response): Promise<void> {
  try {
    const filters = {
      providerId: req.query.providerId as string | undefined,
      dayOfWeek: req.query.dayOfWeek ? parseInt(req.query.dayOfWeek as string) : undefined,
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      includeExpired: req.query.includeExpired === 'true',
    };

    const availabilities = await availabilityService.getAllProviderAvailabilities(filters);

    res.json({
      success: true,
      count: availabilities.length,
      data: availabilities,
    });
  } catch (error: any) {
    logger.error('Error getting provider availabilities', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get provider availabilities',
    });
  }
}

/**
 * Get provider's weekly schedule
 * GET /api/v1/provider-availability/provider/:providerId/schedule
 */
export async function getProviderSchedule(req: Request, res: Response): Promise<void> {
  try {
    const { providerId } = req.params;
    const schedule = await availabilityService.getProviderWeeklySchedule(providerId);

    res.json({
      success: true,
      count: schedule.length,
      data: schedule,
    });
  } catch (error: any) {
    logger.error('Error getting provider schedule', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get provider schedule',
    });
  }
}

/**
 * Check provider availability for specific date/time
 * POST /api/v1/provider-availability/check
 */
export async function checkAvailability(req: Request, res: Response): Promise<void> {
  try {
    const { providerId, date, startTime, endTime } = req.body;

    if (!providerId || !date || !startTime || !endTime) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: providerId, date, startTime, endTime',
      });
      return;
    }

    const availability = await availabilityService.checkProviderAvailability(
      providerId,
      new Date(date),
      startTime,
      endTime
    );

    res.json({
      success: true,
      data: availability,
    });
  } catch (error: any) {
    logger.error('Error checking provider availability', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to check provider availability',
    });
  }
}

/**
 * Find available providers for specific date/time
 * POST /api/v1/provider-availability/find-available
 */
export async function findAvailableProviders(req: Request, res: Response): Promise<void> {
  try {
    const { date, startTime, endTime, specialty, telehealthRequired, officeLocationId } = req.body;

    if (!date || !startTime || !endTime) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: date, startTime, endTime',
      });
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

    res.json({
      success: true,
      count: providers.length,
      data: providers,
    });
  } catch (error: any) {
    logger.error('Error finding available providers', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to find available providers',
    });
  }
}

/**
 * Validate schedule conflicts
 * POST /api/v1/provider-availability/validate
 */
export async function validateSchedule(req: Request, res: Response): Promise<void> {
  try {
    const { providerId, dayOfWeek, startTime, endTime, excludeId } = req.body;

    if (!providerId || dayOfWeek === undefined || !startTime || !endTime) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: providerId, dayOfWeek, startTime, endTime',
      });
      return;
    }

    const result = await availabilityService.validateScheduleConflicts(
      providerId,
      dayOfWeek,
      startTime,
      endTime,
      excludeId
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error validating schedule', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to validate schedule',
    });
  }
}
