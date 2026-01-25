import { Request, Response } from 'express';
import { UserRoles, type UserRole } from '@mentalspace/shared';
import performanceReviewService from '../services/performance-review.service';
import { ReviewStatus } from '@prisma/client';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound, sendServerError, sendForbidden, sendPaginated } from '../utils/apiResponse';

// Helper function to check if user has admin/supervisor role
const hasAdminOrSupervisorRole = (roles: string[] = []): boolean => {
  const adminSupervisorRoles: string[] = [UserRoles.ADMINISTRATOR, UserRoles.SUPER_ADMIN, UserRoles.SUPERVISOR];
  return roles.some(role => adminSupervisorRoles.includes(role));
};

// Helper function to check if user has admin role only
const hasAdminRole = (roles: string[] = []): boolean => {
  const adminRoles: string[] = [UserRoles.ADMINISTRATOR, UserRoles.SUPER_ADMIN];
  return roles.some(role => adminRoles.includes(role));
};

export class PerformanceReviewController {
  /**
   * Create a new performance review
   * POST /api/performance-reviews
   */
  async createReview(req: Request, res: Response) {
    try {
      const review = await performanceReviewService.createReview(req.body);
      return sendCreated(res, review, 'Performance review created successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to create performance review';
      return sendBadRequest(res, errorMessage);
    }
  }

  /**
   * Get all performance reviews with filters
   * GET /api/performance-reviews
   * Security: Non-admin users can only see their own reviews (as employee or reviewer)
   */
  async getAllReviews(req: Request, res: Response) {
    try {
      const currentUser = req.user;
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

      const filters: Record<string, string | Date | number | ReviewStatus> = {};

      // Non-admin users can only see reviews where they are the employee or reviewer
      if (!hasAdminOrSupervisorRole(currentUser?.roles)) {
        // Authentication required for non-admin users
        if (!currentUserId) {
          return sendUnauthorized(res, 'Authentication required');
        }
        // If no specific filter, show both own reviews and reviews they're conducting
        if (!userId && !reviewerId) {
          filters.userId = currentUserId; // Default to showing their own reviews
        } else if (userId && userId !== currentUserId) {
          return sendForbidden(res, 'Not authorized to view other employees\' reviews');
        } else if (reviewerId && reviewerId !== currentUserId) {
          return sendForbidden(res, 'Not authorized to view other reviewers\' assigned reviews');
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
      return sendPaginated(res, result.reviews, result.pagination);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to fetch performance reviews';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Get a single performance review by ID
   * GET /api/performance-reviews/:id
   * Security: Users can only view reviews where they are employee or reviewer
   */
  async getReviewById(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      const currentUserId = currentUser?.id || currentUser?.userId;
      const { id } = req.params;

      const review = await performanceReviewService.getReviewById(id);

      // Ownership validation: user must be employee, reviewer, or admin
      const isOwner = review.userId === currentUserId;
      const isReviewer = review.reviewerId === currentUserId;
      const isAdmin = hasAdminOrSupervisorRole(currentUser?.roles);

      if (!isOwner && !isReviewer && !isAdmin) {
        return sendForbidden(res, 'Not authorized to view this performance review');
      }

      return sendSuccess(res, review);
    } catch (error: unknown) {
      return sendNotFound(res, 'Performance review');
    }
  }

  /**
   * Update a performance review
   * PUT /api/performance-reviews/:id
   * Security: Only reviewer or admin can update the review
   */
  async updateReview(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      const currentUserId = currentUser?.id || currentUser?.userId;
      const { id } = req.params;

      // Fetch the review to check authorization
      const existingReview = await performanceReviewService.getReviewById(id);

      // Only the reviewer or admin can update
      const isReviewer = existingReview.reviewerId === currentUserId;
      const isAdmin = hasAdminRole(currentUser?.roles);

      if (!isReviewer && !isAdmin) {
        return sendForbidden(res, 'Only the assigned reviewer or admin can update this review');
      }

      const review = await performanceReviewService.updateReview(id, req.body);
      return sendSuccess(res, review, 'Performance review updated successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to update performance review';
      return sendBadRequest(res, errorMessage);
    }
  }

  /**
   * Submit self-evaluation
   * POST /api/performance-reviews/:id/self-evaluation
   * Security: Only the employee being reviewed can submit their self-evaluation
   */
  async submitSelfEvaluation(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      const currentUserId = currentUser?.id || currentUser?.userId;
      const { id } = req.params;

      // Fetch the review to check authorization
      const existingReview = await performanceReviewService.getReviewById(id);

      // Only the employee being reviewed can submit self-evaluation
      if (existingReview.userId !== currentUserId) {
        return sendForbidden(res, 'Only the employee being reviewed can submit a self-evaluation');
      }

      const review = await performanceReviewService.submitSelfEvaluation(id, req.body);
      return sendSuccess(res, review, 'Self-evaluation submitted successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to submit self-evaluation';
      return sendBadRequest(res, errorMessage);
    }
  }

  /**
   * Submit manager review
   * POST /api/performance-reviews/:id/manager-review
   * Security: Only the assigned reviewer can submit the manager review
   */
  async submitManagerReview(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      const currentUserId = currentUser?.id || currentUser?.userId;
      const { id } = req.params;

      // Fetch the review to check authorization
      const existingReview = await performanceReviewService.getReviewById(id);

      // Only the assigned reviewer can submit manager review
      if (existingReview.reviewerId !== currentUserId) {
        return sendForbidden(res, 'Only the assigned reviewer can submit a manager review');
      }

      const review = await performanceReviewService.submitManagerReview(id, req.body);
      return sendSuccess(res, review, 'Manager review submitted successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to submit manager review';
      return sendBadRequest(res, errorMessage);
    }
  }

  /**
   * Employee signature
   * POST /api/performance-reviews/:id/signature
   * Security: Only the employee being reviewed can sign
   */
  async employeeSignature(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      const currentUserId = currentUser?.id || currentUser?.userId;
      const { id } = req.params;

      // Fetch the review to check authorization
      const existingReview = await performanceReviewService.getReviewById(id);

      // Only the employee being reviewed can sign
      if (existingReview.userId !== currentUserId) {
        return sendForbidden(res, 'Only the employee being reviewed can sign the review');
      }

      const review = await performanceReviewService.employeeSignature(id, req.body);
      return sendSuccess(res, review, 'Performance review signed successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to sign performance review';
      return sendBadRequest(res, errorMessage);
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
      return sendSuccess(res, null, result.message);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to delete performance review';
      return sendBadRequest(res, errorMessage);
    }
  }

  /**
   * Get upcoming reviews
   * GET /api/performance-reviews/upcoming
   */
  async getUpcomingReviews(req: Request, res: Response) {
    try {
      const reviews = await performanceReviewService.getUpcomingReviews();
      return sendSuccess(res, reviews);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to fetch upcoming reviews';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Get reviews by employee
   * GET /api/performance-reviews/employee/:userId
   * Security: Users can only view their own reviews; admins can view any
   */
  async getReviewsByEmployee(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      const currentUserId = currentUser?.id || currentUser?.userId;
      const { userId } = req.params;

      // Ownership validation: users can only view their own reviews
      if (userId !== currentUserId && !hasAdminOrSupervisorRole(currentUser?.roles)) {
        return sendForbidden(res, 'Not authorized to view this employee\'s reviews');
      }

      const reviews = await performanceReviewService.getReviewsByEmployee(userId);
      return sendSuccess(res, reviews);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to fetch employee reviews';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Get reviews by reviewer
   * GET /api/performance-reviews/reviewer/:reviewerId
   * Security: Reviewers can only view their own assigned reviews; admins can view any
   */
  async getReviewsByReviewer(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      const currentUserId = currentUser?.id || currentUser?.userId;
      const { reviewerId } = req.params;

      // Ownership validation: reviewers can only view their own assigned reviews
      if (reviewerId !== currentUserId && !hasAdminOrSupervisorRole(currentUser?.roles)) {
        return sendForbidden(res, 'Not authorized to view this reviewer\'s assigned reviews');
      }

      const reviews = await performanceReviewService.getReviewsByReviewer(reviewerId);
      return sendSuccess(res, reviews);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to fetch reviewer reviews';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Get performance review statistics
   * GET /api/performance-reviews/statistics
   */
  async getStatistics(req: Request, res: Response) {
    try {
      const { startDate, endDate, reviewPeriod } = req.query;

      const filters: Record<string, Date | string> = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (reviewPeriod) filters.reviewPeriod = reviewPeriod as string;

      const stats = await performanceReviewService.getReviewStatistics(filters);
      return sendSuccess(res, stats);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to fetch statistics';
      return sendServerError(res, errorMessage);
    }
  }
}

export default new PerformanceReviewController();
