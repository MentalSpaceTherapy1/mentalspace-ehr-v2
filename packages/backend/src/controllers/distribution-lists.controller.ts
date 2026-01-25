import { Request, Response } from 'express';
// Phase 3.2: Removed direct PrismaClient import - using service methods instead
import * as distributionListsService from '../services/distribution-lists.service';
import { logControllerError } from '../utils/logger';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound, sendServerError, sendForbidden, sendPaginated } from '../utils/apiResponse';

export const distributionListsController = {
  // Create a new distribution list
  async createDistributionList(req: Request, res: Response) {
    try {
      const { name, description, emails } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return sendUnauthorized(res);
      }

      // Validate required fields
      if (!name || !emails) {
        return sendBadRequest(res, 'Name and emails are required');
      }

      // Validate emails is an array
      if (!Array.isArray(emails) || emails.length === 0) {
        return sendBadRequest(res, 'Emails must be a non-empty array');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = emails.filter(email => !emailRegex.test(email));
      if (invalidEmails.length > 0) {
        return sendBadRequest(res, `Invalid email format: ${invalidEmails.join(', ')}`);
      }

      // Phase 3.2: Use service method instead of direct prisma call
      const distributionList = await distributionListsService.createDistributionList({
        name,
        description,
        emails,
        createdBy: userId,
      });

      return sendCreated(res, distributionList, 'Distribution list created successfully');
    } catch (error) {
      logControllerError('Error creating distribution list', error);
      return sendServerError(res, 'Failed to create distribution list');
    }
  },

  // Get all distribution lists for the current user
  async getDistributionLists(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return sendUnauthorized(res);
      }

      // Phase 3.2: Use service method instead of direct prisma call
      const distributionLists = await distributionListsService.getDistributionListsByUser(userId);

      // Add email count to each list
      const listsWithCount = distributionLists.map(list => ({
        ...list,
        emailCount: Array.isArray(list.emails) ? list.emails.length : 0
      }));

      return sendSuccess(res, listsWithCount);
    } catch (error) {
      logControllerError('Error fetching distribution lists', error);
      return sendServerError(res, 'Failed to fetch distribution lists');
    }
  },

  // Get a single distribution list by ID
  async getDistributionListById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return sendUnauthorized(res);
      }

      // Phase 3.2: Use service method instead of direct prisma call
      const distributionList = await distributionListsService.findDistributionListByIdAndUser(id, userId);

      if (!distributionList) {
        return sendNotFound(res, 'Distribution list');
      }

      return sendSuccess(res, distributionList);
    } catch (error) {
      logControllerError('Error fetching distribution list', error);
      return sendServerError(res, 'Failed to fetch distribution list');
    }
  },

  // Update a distribution list
  async updateDistributionList(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { name, description, emails } = req.body;

      if (!userId) {
        return sendUnauthorized(res);
      }

      // Phase 3.2: Use service method instead of direct prisma call
      const existingList = await distributionListsService.findDistributionListByIdAndUserBasic(id, userId);

      if (!existingList) {
        return sendNotFound(res, 'Distribution list');
      }

      // Validate emails if provided
      if (emails) {
        if (!Array.isArray(emails) || emails.length === 0) {
          return sendBadRequest(res, 'Emails must be a non-empty array');
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalidEmails = emails.filter(email => !emailRegex.test(email));
        if (invalidEmails.length > 0) {
          return sendBadRequest(res, `Invalid email format: ${invalidEmails.join(', ')}`);
        }
      }

      // Phase 3.2: Use service method instead of direct prisma call
      const distributionList = await distributionListsService.updateDistributionList(id, {
        name,
        description,
        emails,
      });

      return sendSuccess(res, distributionList, 'Distribution list updated successfully');
    } catch (error) {
      logControllerError('Error updating distribution list', error);
      return sendServerError(res, 'Failed to update distribution list');
    }
  },

  // Delete a distribution list
  async deleteDistributionList(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return sendUnauthorized(res);
      }

      // Phase 3.2: Use service method instead of direct prisma call
      const distributionList = await distributionListsService.findDistributionListByIdAndUserBasic(id, userId);

      if (!distributionList) {
        return sendNotFound(res, 'Distribution list');
      }

      await distributionListsService.deleteDistributionList(id);

      return sendSuccess(res, null, 'Distribution list deleted successfully');
    } catch (error) {
      logControllerError('Error deleting distribution list', error);
      return sendServerError(res, 'Failed to delete distribution list');
    }
  },

  // Add email to distribution list
  async addEmailToList(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { email } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return sendUnauthorized(res);
      }

      if (!email) {
        return sendBadRequest(res, 'Email is required');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return sendBadRequest(res, 'Invalid email format');
      }

      // Phase 3.2: Use service method instead of direct prisma call
      const distributionList = await distributionListsService.findDistributionListByIdAndUserBasic(id, userId);

      if (!distributionList) {
        return sendNotFound(res, 'Distribution list');
      }

      const currentEmails = distributionList.emails as string[];

      // Check if email already exists
      if (currentEmails.includes(email)) {
        return sendBadRequest(res, 'Email already exists in list');
      }

      const updatedList = await distributionListsService.addEmailToList(id, currentEmails, email);

      return sendSuccess(res, updatedList, 'Email added successfully');
    } catch (error) {
      logControllerError('Error adding email to list', error);
      return sendServerError(res, 'Failed to add email to list');
    }
  },

  // Remove email from distribution list
  async removeEmailFromList(req: Request, res: Response) {
    try {
      const { id, email } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return sendUnauthorized(res);
      }

      // Phase 3.2: Use service method instead of direct prisma call
      const distributionList = await distributionListsService.findDistributionListByIdAndUserBasic(id, userId);

      if (!distributionList) {
        return sendNotFound(res, 'Distribution list');
      }

      const currentEmails = distributionList.emails as string[];

      // Check if email exists
      if (!currentEmails.includes(email)) {
        return sendNotFound(res, 'Email in list');
      }

      // Don't allow removing last email
      if (currentEmails.length === 1) {
        return sendBadRequest(res, 'Cannot remove the last email from the list');
      }

      const updatedList = await distributionListsService.removeEmailFromList(id, currentEmails, email);

      return sendSuccess(res, updatedList, 'Email removed successfully');
    } catch (error) {
      logControllerError('Error removing email from list', error);
      return sendServerError(res, 'Failed to remove email from list');
    }
  }
};
