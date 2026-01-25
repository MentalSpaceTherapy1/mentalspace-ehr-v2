import { Request, Response } from 'express';
// Phase 3.2: Removed direct PrismaClient import - using service methods instead
import { getDeliveryHistory } from '../services/delivery-tracker.service';
import * as subscriptionsService from '../services/subscriptions.service';
import { logControllerError } from '../utils/logger';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound, sendServerError } from '../utils/apiResponse';

export const subscriptionsController = {
  // Create a new subscription
  async createSubscription(req: Request, res: Response) {
    try {
      const { reportId, reportType, frequency, format, deliveryMethod } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return sendUnauthorized(res);
      }

      // Validate required fields
      if (!reportId || !reportType || !frequency || !format || !deliveryMethod) {
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

      // Validate delivery method
      const validMethods = ['EMAIL', 'PORTAL', 'BOTH'];
      if (!validMethods.includes(deliveryMethod)) {
        return sendBadRequest(res, 'Invalid delivery method');
      }

      // Phase 3.2: Use service method instead of direct prisma call
      const subscription = await subscriptionsService.createSubscription({
        reportId,
        reportType,
        userId,
        frequency,
        format,
        deliveryMethod,
      });

      return sendCreated(res, subscription, 'Subscription created successfully');
    } catch (error) {
      logControllerError('Error creating subscription', error);
      return sendServerError(res, 'Failed to create subscription');
    }
  },

  // Get all subscriptions for the current user
  async getSubscriptions(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return sendUnauthorized(res);
      }

      // Phase 3.2: Use service method instead of direct prisma call
      const subscriptions = await subscriptionsService.getSubscriptionsByUserId(userId);

      return sendSuccess(res, subscriptions);
    } catch (error) {
      logControllerError('Error fetching subscriptions', error);
      return sendServerError(res, 'Failed to fetch subscriptions');
    }
  },

  // Get a single subscription by ID
  async getSubscriptionById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return sendUnauthorized(res);
      }

      // Phase 3.2: Use service method instead of direct prisma call
      const subscription = await subscriptionsService.findSubscriptionByIdAndUser(id, userId);

      if (!subscription) {
        return sendNotFound(res, 'Subscription');
      }

      return sendSuccess(res, subscription);
    } catch (error) {
      logControllerError('Error fetching subscription', error);
      return sendServerError(res, 'Failed to fetch subscription');
    }
  },

  // Update a subscription
  async updateSubscription(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { frequency, format, deliveryMethod, isActive } = req.body;

      if (!userId) {
        return sendUnauthorized(res);
      }

      // Phase 3.2: Use service method instead of direct prisma call
      const existingSubscription = await subscriptionsService.findSubscriptionByIdAndUser(id, userId);

      if (!existingSubscription) {
        return sendNotFound(res, 'Subscription');
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

      // Validate delivery method if provided
      if (deliveryMethod) {
        const validMethods = ['EMAIL', 'PORTAL', 'BOTH'];
        if (!validMethods.includes(deliveryMethod)) {
          return sendBadRequest(res, 'Invalid delivery method');
        }
      }

      // Phase 3.2: Use service method instead of direct prisma call
      const subscription = await subscriptionsService.updateSubscription(id, {
        frequency,
        format,
        deliveryMethod,
        isActive,
      });

      return sendSuccess(res, subscription, 'Subscription updated successfully');
    } catch (error) {
      logControllerError('Error updating subscription', error);
      return sendServerError(res, 'Failed to update subscription');
    }
  },

  // Delete a subscription (unsubscribe)
  async deleteSubscription(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return sendUnauthorized(res);
      }

      // Phase 3.2: Use service method instead of direct prisma call
      const subscription = await subscriptionsService.findSubscriptionByIdAndUser(id, userId);

      if (!subscription) {
        return sendNotFound(res, 'Subscription');
      }

      await subscriptionsService.deleteSubscription(id);

      return sendSuccess(res, null, 'Subscription deleted successfully');
    } catch (error) {
      logControllerError('Error deleting subscription', error);
      return sendServerError(res, 'Failed to delete subscription');
    }
  },

  // Pause a subscription
  async pauseSubscription(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return sendUnauthorized(res);
      }

      // Phase 3.2: Use service method instead of direct prisma call
      const subscription = await subscriptionsService.findSubscriptionByIdAndUser(id, userId);

      if (!subscription) {
        return sendNotFound(res, 'Subscription');
      }

      const updatedSubscription = await subscriptionsService.pauseSubscription(id);

      return sendSuccess(res, updatedSubscription, 'Subscription paused successfully');
    } catch (error) {
      logControllerError('Error pausing subscription', error);
      return sendServerError(res, 'Failed to pause subscription');
    }
  },

  // Resume a subscription
  async resumeSubscription(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return sendUnauthorized(res);
      }

      // Phase 3.2: Use service method instead of direct prisma call
      const subscription = await subscriptionsService.findSubscriptionByIdAndUser(id, userId);

      if (!subscription) {
        return sendNotFound(res, 'Subscription');
      }

      const updatedSubscription = await subscriptionsService.resumeSubscription(id);

      return sendSuccess(res, updatedSubscription, 'Subscription resumed successfully');
    } catch (error) {
      logControllerError('Error resuming subscription', error);
      return sendServerError(res, 'Failed to resume subscription');
    }
  },

  // Get delivery history for a subscription
  async getSubscriptionHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!userId) {
        return sendUnauthorized(res);
      }

      // Phase 3.2: Use service method instead of direct prisma call
      const subscription = await subscriptionsService.findSubscriptionByIdAndUser(id, userId);

      if (!subscription) {
        return sendNotFound(res, 'Subscription');
      }

      // Find associated schedule
      const schedule = await subscriptionsService.findReportScheduleForSubscription(
        subscription.reportId,
        userId
      );

      if (!schedule) {
        return sendSuccess(res, []);
      }

      const history = await getDeliveryHistory(schedule.id, limit);

      return sendSuccess(res, history);
    } catch (error) {
      logControllerError('Error fetching subscription history', error);
      return sendServerError(res, 'Failed to fetch subscription history');
    }
  }
};
