import { Request, Response } from 'express';
import performanceReviewService from '../services/performance-review.service';
import { ReviewStatus } from '@prisma/client';

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
   */
  async getAllReviews(req: Request, res: Response) {
    try {
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

      if (userId) filters.userId = userId as string;
      if (reviewerId) filters.reviewerId = reviewerId as string;
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
   */
  async getReviewById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const review = await performanceReviewService.getReviewById(id);
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
   */
  async updateReview(req: Request, res: Response) {
    try {
      const { id } = req.params;
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
   */
  async submitSelfEvaluation(req: Request, res: Response) {
    try {
      const { id } = req.params;
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
   */
  async submitManagerReview(req: Request, res: Response) {
    try {
      const { id } = req.params;
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
   */
  async employeeSignature(req: Request, res: Response) {
    try {
      const { id } = req.params;
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
   */
  async getReviewsByEmployee(req: Request, res: Response) {
    try {
      const { userId } = req.params;
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
   */
  async getReviewsByReviewer(req: Request, res: Response) {
    try {
      const { reviewerId } = req.params;
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
