import { Request, Response } from 'express';
import { PrismaClient } from '@mentalspace/database';
import { getDeliveryHistory } from '../services/delivery-tracker.service';
import { logControllerError } from '../utils/logger';

const prisma = new PrismaClient();

export const subscriptionsController = {
  // Create a new subscription
  async createSubscription(req: Request, res: Response) {
    try {
      const { reportId, reportType, frequency, format, deliveryMethod } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Validate required fields
      if (!reportId || !reportType || !frequency || !format || !deliveryMethod) {
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

      // Validate delivery method
      const validMethods = ['EMAIL', 'PORTAL', 'BOTH'];
      if (!validMethods.includes(deliveryMethod)) {
        return res.status(400).json({ error: 'Invalid delivery method' });
      }

      const subscription = await prisma.subscription.create({
        data: {
          reportId,
          reportType,
          userId,
          frequency,
          format,
          deliveryMethod,
          isActive: true
        }
      });

      res.status(201).json(subscription);
    } catch (error) {
      logControllerError('Error creating subscription', error);
      res.status(500).json({ error: 'Failed to create subscription' });
    }
  },

  // Get all subscriptions for the current user
  async getSubscriptions(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const subscriptions = await prisma.subscription.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });

      res.json(subscriptions);
    } catch (error) {
      logControllerError('Error fetching subscriptions', error);
      res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }
  },

  // Get a single subscription by ID
  async getSubscriptionById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const subscription = await prisma.subscription.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      res.json(subscription);
    } catch (error) {
      logControllerError('Error fetching subscription', error);
      res.status(500).json({ error: 'Failed to fetch subscription' });
    }
  },

  // Update a subscription
  async updateSubscription(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { frequency, format, deliveryMethod, isActive } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify subscription belongs to user
      const existingSubscription = await prisma.subscription.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!existingSubscription) {
        return res.status(404).json({ error: 'Subscription not found' });
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

      // Validate delivery method if provided
      if (deliveryMethod) {
        const validMethods = ['EMAIL', 'PORTAL', 'BOTH'];
        if (!validMethods.includes(deliveryMethod)) {
          return res.status(400).json({ error: 'Invalid delivery method' });
        }
      }

      const subscription = await prisma.subscription.update({
        where: { id },
        data: {
          ...(frequency && { frequency }),
          ...(format && { format }),
          ...(deliveryMethod && { deliveryMethod }),
          ...(isActive !== undefined && { isActive })
        }
      });

      res.json(subscription);
    } catch (error) {
      logControllerError('Error updating subscription', error);
      res.status(500).json({ error: 'Failed to update subscription' });
    }
  },

  // Delete a subscription (unsubscribe)
  async deleteSubscription(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify subscription belongs to user
      const subscription = await prisma.subscription.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      await prisma.subscription.delete({
        where: { id }
      });

      res.json({ message: 'Subscription deleted successfully' });
    } catch (error) {
      logControllerError('Error deleting subscription', error);
      res.status(500).json({ error: 'Failed to delete subscription' });
    }
  },

  // Pause a subscription
  async pauseSubscription(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify subscription belongs to user
      const subscription = await prisma.subscription.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      const updatedSubscription = await prisma.subscription.update({
        where: { id },
        data: { isActive: false }
      });

      res.json(updatedSubscription);
    } catch (error) {
      logControllerError('Error pausing subscription', error);
      res.status(500).json({ error: 'Failed to pause subscription' });
    }
  },

  // Resume a subscription
  async resumeSubscription(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify subscription belongs to user
      const subscription = await prisma.subscription.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      const updatedSubscription = await prisma.subscription.update({
        where: { id },
        data: { isActive: true }
      });

      res.json(updatedSubscription);
    } catch (error) {
      logControllerError('Error resuming subscription', error);
      res.status(500).json({ error: 'Failed to resume subscription' });
    }
  },

  // Get delivery history for a subscription
  async getSubscriptionHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify subscription belongs to user
      const subscription = await prisma.subscription.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      // Find associated schedule
      const schedule = await prisma.reportSchedule.findFirst({
        where: {
          reportId: subscription.reportId,
          userId
        }
      });

      if (!schedule) {
        return res.json([]);
      }

      const history = await getDeliveryHistory(schedule.id, limit);

      res.json(history);
    } catch (error) {
      logControllerError('Error fetching subscription history', error);
      res.status(500).json({ error: 'Failed to fetch subscription history' });
    }
  }
};
