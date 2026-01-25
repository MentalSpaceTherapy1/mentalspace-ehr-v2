import { Request, Response } from 'express';
// Phase 3.2: Removed direct PrismaClient import - using service methods instead
import { logControllerError } from '../utils/logger';
import {
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getSchedulesByUser,
  pauseSchedule,
  resumeSchedule,
  executeScheduledReport,
  findScheduleByIdAndUser,
  findScheduleByIdAndUserWithDetails
} from '../services/report-scheduler.service';
import { getDeliveryHistory, getDeliveryStats } from '../services/delivery-tracker.service';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound, sendServerError } from '../utils/apiResponse';

export const reportSchedulesController = {
  // Create a new report schedule
  async createSchedule(req: Request, res: Response) {
    try {
      const {
        reportId,
        reportType,
        frequency,
        cronExpression,
        timezone,
        format,
        recipients,
        distributionCondition
      } = req.body;

      const userId = req.user?.id;

      if (!userId) {
        return sendUnauthorized(res);
      }

      // Validate required fields
      if (!reportId || !reportType || !frequency || !format || !recipients) {
        return sendBadRequest(res, 'Missing required fields');
      }

      // Validate frequency
      const validFrequencies = ['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'];
      if (!validFrequencies.includes(frequency)) {
        return sendBadRequest(res, 'Invalid frequency');
      }

      // Validate format
      const validFormats = ['PDF', 'EXCEL', 'CSV'];
      if (!validFormats.includes(format)) {
        return sendBadRequest(res, 'Invalid format');
      }

      // Validate recipients structure
      if (!recipients.to || !Array.isArray(recipients.to) || recipients.to.length === 0) {
        return sendBadRequest(res, 'At least one recipient email is required');
      }

      const schedule = await createSchedule({
        reportId,
        reportType,
        userId,
        frequency,
        cronExpression,
        timezone,
        format,
        recipients,
        distributionCondition
      });

      return sendCreated(res, schedule);
    } catch (error) {
      logControllerError('Error creating schedule', error);
      return sendServerError(res, 'Failed to create schedule');
    }
  },

  // Get all schedules for the current user
  async getSchedules(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return sendUnauthorized(res);
      }

      const schedules = await getSchedulesByUser(userId);

      return sendSuccess(res, schedules);
    } catch (error) {
      logControllerError('Error fetching schedules', error);
      return sendServerError(res, 'Failed to fetch schedules');
    }
  },

  // Get a single schedule by ID
  async getScheduleById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return sendUnauthorized(res);
      }

      // Phase 3.2: Use service method instead of direct prisma call
      const schedule = await findScheduleByIdAndUserWithDetails(id, userId);

      if (!schedule) {
        return sendNotFound(res, 'Schedule');
      }

      return sendSuccess(res, schedule);
    } catch (error) {
      logControllerError('Error fetching schedule', error);
      return sendServerError(res, 'Failed to fetch schedule');
    }
  },

  // Update a schedule
  async updateSchedule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const {
        frequency,
        cronExpression,
        timezone,
        format,
        recipients,
        distributionCondition,
        status
      } = req.body;

      if (!userId) {
        return sendUnauthorized(res);
      }

      // Phase 3.2: Use service method instead of direct prisma call
      const existingSchedule = await findScheduleByIdAndUser(id, userId);

      if (!existingSchedule) {
        return sendNotFound(res, 'Schedule');
      }

      // Validate frequency if provided
      if (frequency) {
        const validFrequencies = ['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'];
        if (!validFrequencies.includes(frequency)) {
          return sendBadRequest(res, 'Invalid frequency');
        }
      }

      // Validate format if provided
      if (format) {
        const validFormats = ['PDF', 'EXCEL', 'CSV'];
        if (!validFormats.includes(format)) {
          return sendBadRequest(res, 'Invalid format');
        }
      }

      // Validate status if provided
      if (status) {
        const validStatuses = ['ACTIVE', 'PAUSED', 'CANCELLED'];
        if (!validStatuses.includes(status)) {
          return sendBadRequest(res, 'Invalid status');
        }
      }

      const updateData: any = {};
      if (frequency) updateData.frequency = frequency;
      if (cronExpression !== undefined) updateData.cronExpression = cronExpression;
      if (timezone) updateData.timezone = timezone;
      if (format) updateData.format = format;
      if (recipients) updateData.recipients = recipients;
      if (distributionCondition !== undefined) updateData.distributionCondition = distributionCondition;
      if (status) updateData.status = status;

      const schedule = await updateSchedule(id, updateData);

      return sendSuccess(res, schedule);
    } catch (error) {
      logControllerError('Error updating schedule', error);
      return sendServerError(res, 'Failed to update schedule');
    }
  },

  // Delete a schedule
  async deleteSchedule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return sendUnauthorized(res);
      }

      // Phase 3.2: Use service method instead of direct prisma call
      const schedule = await findScheduleByIdAndUser(id, userId);

      if (!schedule) {
        return sendNotFound(res, 'Schedule');
      }

      await deleteSchedule(id);

      return sendSuccess(res, { message: 'Schedule deleted successfully' });
    } catch (error) {
      logControllerError('Error deleting schedule', error);
      return sendServerError(res, 'Failed to delete schedule');
    }
  },

  // Pause a schedule
  async pauseSchedule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return sendUnauthorized(res);
      }

      // Phase 3.2: Use service method instead of direct prisma call
      const schedule = await findScheduleByIdAndUser(id, userId);

      if (!schedule) {
        return sendNotFound(res, 'Schedule');
      }

      const updatedSchedule = await pauseSchedule(id);

      return sendSuccess(res, updatedSchedule);
    } catch (error) {
      logControllerError('Error pausing schedule', error);
      return sendServerError(res, 'Failed to pause schedule');
    }
  },

  // Resume a schedule
  async resumeSchedule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return sendUnauthorized(res);
      }

      // Phase 3.2: Use service method instead of direct prisma call
      const schedule = await findScheduleByIdAndUser(id, userId);

      if (!schedule) {
        return sendNotFound(res, 'Schedule');
      }

      const updatedSchedule = await resumeSchedule(id);

      return sendSuccess(res, updatedSchedule);
    } catch (error) {
      logControllerError('Error resuming schedule', error);
      return sendServerError(res, 'Failed to resume schedule');
    }
  },

  // Execute a schedule manually (run now)
  async executeSchedule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return sendUnauthorized(res);
      }

      // Phase 3.2: Use service method instead of direct prisma call
      const schedule = await findScheduleByIdAndUser(id, userId);

      if (!schedule) {
        return sendNotFound(res, 'Schedule');
      }

      await executeScheduledReport(id);

      return sendSuccess(res, { message: 'Schedule executed successfully' });
    } catch (error) {
      logControllerError('Error executing schedule', error);
      return sendServerError(res, 'Failed to execute schedule');
    }
  },

  // Get delivery history for a schedule
  async getScheduleHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!userId) {
        return sendUnauthorized(res);
      }

      // Phase 3.2: Use service method instead of direct prisma call
      const schedule = await findScheduleByIdAndUser(id, userId);

      if (!schedule) {
        return sendNotFound(res, 'Schedule');
      }

      const history = await getDeliveryHistory(id, limit);

      return sendSuccess(res, history);
    } catch (error) {
      logControllerError('Error fetching schedule history', error);
      return sendServerError(res, 'Failed to fetch schedule history');
    }
  },

  // Get delivery statistics for a schedule
  async getScheduleStats(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return sendUnauthorized(res);
      }

      // Phase 3.2: Use service method instead of direct prisma call
      const schedule = await findScheduleByIdAndUser(id, userId);

      if (!schedule) {
        return sendNotFound(res, 'Schedule');
      }

      const stats = await getDeliveryStats(id);

      return sendSuccess(res, stats);
    } catch (error) {
      logControllerError('Error fetching schedule stats', error);
      return sendServerError(res, 'Failed to fetch schedule stats');
    }
  }
};
