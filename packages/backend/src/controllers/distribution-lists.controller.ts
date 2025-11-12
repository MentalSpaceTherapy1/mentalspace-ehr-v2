import { Request, Response } from 'express';
import { PrismaClient } from '@mentalspace/database';

const prisma = new PrismaClient();

export const distributionListsController = {
  // Create a new distribution list
  async createDistributionList(req: Request, res: Response) {
    try {
      const { name, description, emails } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Validate required fields
      if (!name || !emails) {
        return res.status(400).json({ error: 'Name and emails are required' });
      }

      // Validate emails is an array
      if (!Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ error: 'Emails must be a non-empty array' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = emails.filter(email => !emailRegex.test(email));
      if (invalidEmails.length > 0) {
        return res.status(400).json({
          error: 'Invalid email format',
          invalidEmails
        });
      }

      const distributionList = await prisma.distributionList.create({
        data: {
          name,
          description,
          emails,
          createdBy: userId
        }
      });

      res.status(201).json(distributionList);
    } catch (error) {
      console.error('Error creating distribution list:', error);
      res.status(500).json({ error: 'Failed to create distribution list' });
    }
  },

  // Get all distribution lists for the current user
  async getDistributionLists(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const distributionLists = await prisma.distributionList.findMany({
        where: { createdBy: userId },
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      // Add email count to each list
      const listsWithCount = distributionLists.map(list => ({
        ...list,
        emailCount: Array.isArray(list.emails) ? list.emails.length : 0
      }));

      res.json(listsWithCount);
    } catch (error) {
      console.error('Error fetching distribution lists:', error);
      res.status(500).json({ error: 'Failed to fetch distribution lists' });
    }
  },

  // Get a single distribution list by ID
  async getDistributionListById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const distributionList = await prisma.distributionList.findFirst({
        where: {
          id,
          createdBy: userId
        },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      if (!distributionList) {
        return res.status(404).json({ error: 'Distribution list not found' });
      }

      res.json(distributionList);
    } catch (error) {
      console.error('Error fetching distribution list:', error);
      res.status(500).json({ error: 'Failed to fetch distribution list' });
    }
  },

  // Update a distribution list
  async updateDistributionList(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { name, description, emails } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify distribution list belongs to user
      const existingList = await prisma.distributionList.findFirst({
        where: {
          id,
          createdBy: userId
        }
      });

      if (!existingList) {
        return res.status(404).json({ error: 'Distribution list not found' });
      }

      // Validate emails if provided
      if (emails) {
        if (!Array.isArray(emails) || emails.length === 0) {
          return res.status(400).json({ error: 'Emails must be a non-empty array' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalidEmails = emails.filter(email => !emailRegex.test(email));
        if (invalidEmails.length > 0) {
          return res.status(400).json({
            error: 'Invalid email format',
            invalidEmails
          });
        }
      }

      const updateData: any = {};
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (emails) updateData.emails = emails;

      const distributionList = await prisma.distributionList.update({
        where: { id },
        data: updateData
      });

      res.json(distributionList);
    } catch (error) {
      console.error('Error updating distribution list:', error);
      res.status(500).json({ error: 'Failed to update distribution list' });
    }
  },

  // Delete a distribution list
  async deleteDistributionList(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify distribution list belongs to user
      const distributionList = await prisma.distributionList.findFirst({
        where: {
          id,
          createdBy: userId
        }
      });

      if (!distributionList) {
        return res.status(404).json({ error: 'Distribution list not found' });
      }

      await prisma.distributionList.delete({
        where: { id }
      });

      res.json({ message: 'Distribution list deleted successfully' });
    } catch (error) {
      console.error('Error deleting distribution list:', error);
      res.status(500).json({ error: 'Failed to delete distribution list' });
    }
  },

  // Add email to distribution list
  async addEmailToList(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { email } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Verify distribution list belongs to user
      const distributionList = await prisma.distributionList.findFirst({
        where: {
          id,
          createdBy: userId
        }
      });

      if (!distributionList) {
        return res.status(404).json({ error: 'Distribution list not found' });
      }

      const currentEmails = distributionList.emails as string[];

      // Check if email already exists
      if (currentEmails.includes(email)) {
        return res.status(400).json({ error: 'Email already exists in list' });
      }

      const updatedList = await prisma.distributionList.update({
        where: { id },
        data: {
          emails: [...currentEmails, email]
        }
      });

      res.json(updatedList);
    } catch (error) {
      console.error('Error adding email to list:', error);
      res.status(500).json({ error: 'Failed to add email to list' });
    }
  },

  // Remove email from distribution list
  async removeEmailFromList(req: Request, res: Response) {
    try {
      const { id, email } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify distribution list belongs to user
      const distributionList = await prisma.distributionList.findFirst({
        where: {
          id,
          createdBy: userId
        }
      });

      if (!distributionList) {
        return res.status(404).json({ error: 'Distribution list not found' });
      }

      const currentEmails = distributionList.emails as string[];

      // Check if email exists
      if (!currentEmails.includes(email)) {
        return res.status(404).json({ error: 'Email not found in list' });
      }

      // Don't allow removing last email
      if (currentEmails.length === 1) {
        return res.status(400).json({ error: 'Cannot remove the last email from the list' });
      }

      const updatedList = await prisma.distributionList.update({
        where: { id },
        data: {
          emails: currentEmails.filter(e => e !== email)
        }
      });

      res.json(updatedList);
    } catch (error) {
      console.error('Error removing email from list:', error);
      res.status(500).json({ error: 'Failed to remove email from list' });
    }
  }
};
