import { Request, Response } from 'express';
import { PrismaClient } from '@mentalspace/database';
import { logControllerError } from '../utils/logger';
import {
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getSchedulesByUser,
  pauseSchedule,
  resumeSchedule,
  executeScheduledReport
} from '../services/report-scheduler.service';
import { getDeliveryHistory, getDeliveryStats } from '../services/delivery-tracker.service';

const prisma = new PrismaClient();

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
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Validate required fields
      if (!reportId || !reportType || !frequency || !format || !recipients) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Validate frequency
      const validFrequencies = ['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'];
      if (!validFrequencies.includes(frequency)) {
        return res.status(400).json({ error: 'Invalid frequency' });
      }

      // Validate format
      const validFormats = ['PDF', 'EXCEL', 'CSV'];
      if (!validFormats.includes(format)) {
        return res.status(400).json({ error: 'Invalid format' });
      }

      // Validate recipients structure
      if (!recipients.to || !Array.isArray(recipients.to) || recipients.to.length === 0) {
        return res.status(400).json({ error: 'At least one recipient email is required' });
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

      res.status(201).json(schedule);
    } catch (error) {
      logControllerError('Error creating schedule', error);
      res.status(500).json({ error: 'Failed to create schedule' });
    }
  },

  // Get all schedules for the current user
  async getSchedules(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const schedules = await getSchedulesByUser(userId);

      res.json(schedules);
    } catch (error) {
      logControllerError('Error fetching schedules', error);
      res.status(500).json({ error: 'Failed to fetch schedules' });
    }
  },

  // Get a single schedule by ID
  async getScheduleById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const schedule = await prisma.reportSchedule.findFirst({
        where: {
          id,
          userId
        },
        include: {
          report: true,
          logs: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      res.json(schedule);
    } catch (error) {
      logControllerError('Error fetching schedule', error);
      res.status(500).json({ error: 'Failed to fetch schedule' });
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
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify schedule belongs to user
      const existingSchedule = await prisma.reportSchedule.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!existingSchedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      // Validate frequency if provided
      if (frequency) {
        const validFrequencies = ['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'];
        if (!validFrequencies.includes(frequency)) {
          return res.status(400).json({ error: 'Invalid frequency' });
        }
      }

      // Validate format if provided
      if (format) {
        const validFormats = ['PDF', 'EXCEL', 'CSV'];
        if (!validFormats.includes(format)) {
          return res.status(400).json({ error: 'Invalid format' });
        }
      }

      // Validate status if provided
      if (status) {
        const validStatuses = ['ACTIVE', 'PAUSED', 'CANCELLED'];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({ error: 'Invalid status' });
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

      res.json(schedule);
    } catch (error) {
      logControllerError('Error updating schedule', error);
      res.status(500).json({ error: 'Failed to update schedule' });
    }
  },

  // Delete a schedule
  async deleteSchedule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify schedule belongs to user
      const schedule = await prisma.reportSchedule.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      await deleteSchedule(id);

      res.json({ message: 'Schedule deleted successfully' });
    } catch (error) {
      logControllerError('Error deleting schedule', error);
      res.status(500).json({ error: 'Failed to delete schedule' });
    }
  },

  // Pause a schedule
  async pauseSchedule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify schedule belongs to user
      const schedule = await prisma.reportSchedule.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      const updatedSchedule = await pauseSchedule(id);

      res.json(updatedSchedule);
    } catch (error) {
      logControllerError('Error pausing schedule', error);
      res.status(500).json({ error: 'Failed to pause schedule' });
    }
  },

  // Resume a schedule
  async resumeSchedule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify schedule belongs to user
      const schedule = await prisma.reportSchedule.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      const updatedSchedule = await resumeSchedule(id);

      res.json(updatedSchedule);
    } catch (error) {
      logControllerError('Error resuming schedule', error);
      res.status(500).json({ error: 'Failed to resume schedule' });
    }
  },

  // Execute a schedule manually (run now)
  async executeSchedule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify schedule belongs to user
      const schedule = await prisma.reportSchedule.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      await executeScheduledReport(id);

      res.json({ message: 'Schedule executed successfully' });
    } catch (error) {
      logControllerError('Error executing schedule', error);
      res.status(500).json({ error: 'Failed to execute schedule' });
    }
  },

  // Get delivery history for a schedule
  async getScheduleHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify schedule belongs to user
      const schedule = await prisma.reportSchedule.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      const history = await getDeliveryHistory(id, limit);

      res.json(history);
    } catch (error) {
      logControllerError('Error fetching schedule history', error);
      res.status(500).json({ error: 'Failed to fetch schedule history' });
    }
  },

  // Get delivery statistics for a schedule
  async getScheduleStats(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify schedule belongs to user
      const schedule = await prisma.reportSchedule.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      const stats = await getDeliveryStats(id);

      res.json(stats);
    } catch (error) {
      logControllerError('Error fetching schedule stats', error);
      res.status(500).json({ error: 'Failed to fetch schedule stats' });
    }
  }
};
