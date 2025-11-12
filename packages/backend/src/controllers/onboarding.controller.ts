import { Request, Response, NextFunction } from 'express';
import onboardingService from '../services/onboarding.service';
import { BadRequestError } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Module 9: Onboarding Controller
 * Handles HTTP requests for employee onboarding operations
 */

class OnboardingController {
  /**
   * Create a new onboarding checklist
   * POST /api/onboarding
   */
  async createOnboardingChecklist(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, startDate, mentorId, items } = req.body;

      if (!userId || !startDate) {
        throw new BadRequestError('User ID and start date are required');
      }

      const checklist = await onboardingService.createOnboardingChecklist({
        userId,
        startDate: new Date(startDate),
        mentorId,
        items,
      });

      res.status(201).json({
        success: true,
        message: 'Onboarding checklist created successfully',
        data: checklist,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get onboarding checklist by user ID
   * GET /api/onboarding/user/:userId
   */
  async getOnboardingChecklistByUserId(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;

      const checklist = await onboardingService.getOnboardingChecklistByUserId(userId);

      res.status(200).json({
        success: true,
        data: checklist,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get onboarding checklist by checklist ID
   * GET /api/onboarding/:id
   */
  async getOnboardingChecklistById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const checklist = await onboardingService.getOnboardingChecklistById(id);

      res.status(200).json({
        success: true,
        data: checklist,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all onboarding checklists with filters
   * GET /api/onboarding
   */
  async getOnboardingChecklists(req: Request, res: Response, next: NextFunction) {
    try {
      const { mentorId, completed, page, limit } = req.query;

      const filters = {
        mentorId: mentorId as string,
        completed: completed === 'true' ? true : completed === 'false' ? false : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      };

      const result = await onboardingService.getOnboardingChecklists(filters);

      res.status(200).json({
        success: true,
        data: result.checklists,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update onboarding checklist
   * PUT /api/onboarding/:id
   */
  async updateOnboardingChecklist(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const updatedChecklist = await onboardingService.updateOnboardingChecklist(id, updateData);

      res.status(200).json({
        success: true,
        message: 'Onboarding checklist updated successfully',
        data: updatedChecklist,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a specific checklist item
   * PUT /api/onboarding/:id/items/:itemId
   */
  async updateChecklistItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, itemId } = req.params;
      const { completed, notes, documentUrl } = req.body;

      // Get updatedBy from authenticated user
      const updatedBy = (req as any).user?.id || 'system';

      const updatedChecklist = await onboardingService.updateChecklistItem(
        id,
        itemId,
        {
          completed,
          notes,
          documentUrl,
        },
        updatedBy
      );

      res.status(200).json({
        success: true,
        message: 'Checklist item updated successfully',
        data: updatedChecklist,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add a custom checklist item
   * POST /api/onboarding/:id/items
   */
  async addChecklistItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { category, task, description, priority, documentRequired, dueDate } = req.body;

      if (!category || !task) {
        throw new BadRequestError('Category and task are required');
      }

      const updatedChecklist = await onboardingService.addChecklistItem(id, {
        category,
        task,
        description,
        priority,
        documentRequired,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });

      res.status(201).json({
        success: true,
        message: 'Checklist item added successfully',
        data: updatedChecklist,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove a checklist item
   * DELETE /api/onboarding/:id/items/:itemId
   */
  async removeChecklistItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, itemId } = req.params;

      const updatedChecklist = await onboardingService.removeChecklistItem(id, itemId);

      res.status(200).json({
        success: true,
        message: 'Checklist item removed successfully',
        data: updatedChecklist,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete onboarding checklist
   * DELETE /api/onboarding/:id
   */
  async deleteOnboardingChecklist(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const result = await onboardingService.deleteOnboardingChecklist(id);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get mentor statistics
   * GET /api/onboarding/mentors/:mentorId/statistics
   */
  async getMentorStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const { mentorId } = req.params;

      const statistics = await onboardingService.getMentorStatistics(mentorId);

      res.status(200).json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get overall onboarding statistics
   * GET /api/onboarding/statistics
   */
  async getOnboardingStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const statistics = await onboardingService.getOnboardingStatistics();

      res.status(200).json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new OnboardingController();
