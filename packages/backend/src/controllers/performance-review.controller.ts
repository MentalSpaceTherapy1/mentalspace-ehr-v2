import { Request, Response } from 'express';
import performanceReviewService from '../services/performance-review.service';
import { ReviewStatus } from '@prisma/client';

// Helper function to check if user has admin/supervisor role
const hasAdminOrSupervisorRole = (roles: string[] = []): boolean => {
  return roles.some(role => ['ADMINISTRATOR', 'SUPER_ADMIN', 'SUPERVISOR'].includes(role));
};

// Helper function to check if user has admin role only
const hasAdminRole = (roles: string[] = []): boolean => {
  return roles.some(role => ['ADMINISTRATOR', 'SUPER_ADMIN'].includes(role));
};

export class PerformanceReviewController {
  /**
   * Create a new performance review
   * POST /api/performance-reviews
   */
  async createReview(req: Request, res: Response) {
    try {
      const review = await performanceReviewService.createReview(req.body);
      res.status(201).json({
        success: true,
        data: review,
        message: 'Performance review created successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create performance review',
      });
    }
  }

  /**
   * Get all performance reviews with filters
   * GET /api/performance-reviews
   * Security: Non-admin users can only see their own reviews (as employee or reviewer)
   */
  async getAllReviews(req: Request, res: Response) {
    try {
      const currentUser = (req as any).user;
      const currentUserId = currentUser?.id || currentUser?.userId;

      const {
        userId,
        reviewerId,
        status,
        reviewPeriod,
        startDate,
        endDate,
        page,
        limit,
      } = req.query;

      const filters: any = {};

      // Non-admin users can only see reviews where they are the employee or reviewer
      if (!hasAdminOrSupervisorRole(currentUser?.roles)) {
        // If no specific filter, show both own reviews and reviews they're conducting
        if (!userId && !reviewerId) {
          filters.userId = currentUserId; // Default to showing their own reviews
        } else if (userId && userId !== currentUserId) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to view other employees\' reviews',
          });
        } else if (reviewerId && reviewerId !== currentUserId) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to view other reviewers\' assigned reviews',
          });
        } else {
          if (userId) filters.userId = userId as string;
          if (reviewerId) filters.reviewerId = reviewerId as string;
        }
      } else {
        if (userId) filters.userId = userId as string;
        if (reviewerId) filters.reviewerId = reviewerId as string;
      }

      if (status) filters.status = status as ReviewStatus;
      if (reviewPeriod) filters.reviewPeriod = reviewPeriod as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (page) filters.page = parseInt(page as string);
      if (limit) filters.limit = parseInt(limit as string);

      const result = await performanceReviewService.getAllReviews(filters);
      res.status(200).json({
        success: true,
        data: result.reviews,
        pagination: result.pagination,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch performance reviews',
      });
    }
  }

  /**
   * Get a single performance review by ID
   * GET /api/performance-reviews/:id
   * Security: Users can only view reviews where they are employee or reviewer
   */
  async getReviewById(req: Request, res: Response) {
    try {
      const currentUser = (req as any).user;
      const currentUserId = currentUser?.id || currentUser?.userId;
      const { id } = req.params;

      const review = await performanceReviewService.getReviewById(id);

      // Ownership validation: user must be employee, reviewer, or admin
      const isOwner = review.userId === currentUserId;
      const isReviewer = review.reviewerId === currentUserId;
      const isAdmin = hasAdminOrSupervisorRole(currentUser?.roles);

      if (!isOwner && !isReviewer && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this performance review',
        });
      }

      res.status(200).json({
        success: true,
        data: review,
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'Performance review not found',
      });
    }
  }

  /**
   * Update a performance review
   * PUT /api/performance-reviews/:id
   * Security: Only reviewer or admin can update the review
   */
  async updateReview(req: Request, res: Response) {
    try {
      const currentUser = (req as any).user;
      const currentUserId = currentUser?.id || currentUser?.userId;
      const { id } = req.params;

      // Fetch the review to check authorization
      const existingReview = await performanceReviewService.getReviewById(id);

      // Only the reviewer or admin can update
      const isReviewer = existingReview.reviewerId === currentUserId;
      const isAdmin = hasAdminRole(currentUser?.roles);

      if (!isReviewer && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only the assigned reviewer or admin can update this review',
        });
      }

      const review = await performanceReviewService.updateReview(id, req.body);
      res.status(200).json({
        success: true,
        data: review,
        message: 'Performance review updated successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update performance review',
      });
    }
  }

  /**
   * Submit self-evaluation
   * POST /api/performance-reviews/:id/self-evaluation
   * Security: Only the employee being reviewed can submit their self-evaluation
   */
  async submitSelfEvaluation(req: Request, res: Response) {
    try {
      const currentUser = (req as any).user;
      const currentUserId = currentUser?.id || currentUser?.userId;
      const { id } = req.params;

      // Fetch the review to check authorization
      const existingReview = await performanceReviewService.getReviewById(id);

      // Only the employee being reviewed can submit self-evaluation
      if (existingReview.userId !== currentUserId) {
        return res.status(403).json({
          success: false,
          message: 'Only the employee being reviewed can submit a self-evaluation',
        });
      }

      const review = await performanceReviewService.submitSelfEvaluation(id, req.body);
      res.status(200).json({
        success: true,
        data: review,
        message: 'Self-evaluation submitted successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to submit self-evaluation',
      });
    }
  }

  /**
   * Submit manager review
   * POST /api/performance-reviews/:id/manager-review
   * Security: Only the assigned reviewer can submit the manager review
   */
  async submitManagerReview(req: Request, res: Response) {
    try {
      const currentUser = (req as any).user;
      const currentUserId = currentUser?.id || currentUser?.userId;
      const { id } = req.params;

      // Fetch the review to check authorization
      const existingReview = await performanceReviewService.getReviewById(id);

      // Only the assigned reviewer can submit manager review
      if (existingReview.reviewerId !== currentUserId) {
        return res.status(403).json({
          success: false,
          message: 'Only the assigned reviewer can submit a manager review',
        });
      }

      const review = await performanceReviewService.submitManagerReview(id, req.body);
      res.status(200).json({
        success: true,
        data: review,
        message: 'Manager review submitted successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to submit manager review',
      });
    }
  }

  /**
   * Employee signature
   * POST /api/performance-reviews/:id/signature
   * Security: Only the employee being reviewed can sign
   */
  async employeeSignature(req: Request, res: Response) {
    try {
      const currentUser = (req as any).user;
      const currentUserId = currentUser?.id || currentUser?.userId;
      const { id } = req.params;

      // Fetch the review to check authorization
      const existingReview = await performanceReviewService.getReviewById(id);

      // Only the employee being reviewed can sign
      if (existingReview.userId !== currentUserId) {
        return res.status(403).json({
          success: false,
          message: 'Only the employee being reviewed can sign the review',
        });
      }

      const review = await performanceReviewService.employeeSignature(id, req.body);
      res.status(200).json({
        success: true,
        data: review,
        message: 'Performance review signed successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to sign performance review',
      });
    }
  }

  /**
   * Delete a performance review
   * DELETE /api/performance-reviews/:id
   */
  async deleteReview(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await performanceReviewService.deleteReview(id);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to delete performance review',
      });
    }
  }

  /**
   * Get upcoming reviews
   * GET /api/performance-reviews/upcoming
   */
  async getUpcomingReviews(req: Request, res: Response) {
    try {
      const reviews = await performanceReviewService.getUpcomingReviews();
      res.status(200).json({
        success: true,
        data: reviews,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch upcoming reviews',
      });
    }
  }

  /**
   * Get reviews by employee
   * GET /api/performance-reviews/employee/:userId
   * Security: Users can only view their own reviews; admins can view any
   */
  async getReviewsByEmployee(req: Request, res: Response) {
    try {
      const currentUser = (req as any).user;
      const currentUserId = currentUser?.id || currentUser?.userId;
      const { userId } = req.params;

      // Ownership validation: users can only view their own reviews
      if (userId !== currentUserId && !hasAdminOrSupervisorRole(currentUser?.roles)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this employee\'s reviews',
        });
      }

      const reviews = await performanceReviewService.getReviewsByEmployee(userId);
      res.status(200).json({
        success: true,
        data: reviews,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch employee reviews',
      });
    }
  }

  /**
   * Get reviews by reviewer
   * GET /api/performance-reviews/reviewer/:reviewerId
   * Security: Reviewers can only view their own assigned reviews; admins can view any
   */
  async getReviewsByReviewer(req: Request, res: Response) {
    try {
      const currentUser = (req as any).user;
      const currentUserId = currentUser?.id || currentUser?.userId;
      const { reviewerId } = req.params;

      // Ownership validation: reviewers can only view their own assigned reviews
      if (reviewerId !== currentUserId && !hasAdminOrSupervisorRole(currentUser?.roles)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this reviewer\'s assigned reviews',
        });
      }

      const reviews = await performanceReviewService.getReviewsByReviewer(reviewerId);
      res.status(200).json({
        success: true,
        data: reviews,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch reviewer reviews',
      });
    }
  }

  /**
   * Get performance review statistics
   * GET /api/performance-reviews/statistics
   */
  async getStatistics(req: Request, res: Response) {
    try {
      const { startDate, endDate, reviewPeriod } = req.query;

      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (reviewPeriod) filters.reviewPeriod = reviewPeriod as string;

      const stats = await performanceReviewService.getReviewStatistics(filters);
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch statistics',
      });
    }
  }
}

export default new PerformanceReviewController();
