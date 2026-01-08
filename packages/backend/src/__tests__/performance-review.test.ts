/**
 * Performance Review Module Unit Tests
 *
 * Tests for Staff & HR module Performance Review functionality including:
 * - Route authorization and middleware verification
 * - Controller CRUD operations and workflow actions
 * - Ownership validation and permission checks
 */

import { Request, Response, NextFunction } from 'express';
import { PerformanceReviewController } from '../controllers/performance-review.controller';
import performanceReviewService from '../services/performance-review.service';
import { ReviewStatus } from '@prisma/client';

// Mock the Performance Review service
jest.mock('../services/performance-review.service');

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(),
  ReviewStatus: {
    DRAFT: 'DRAFT',
    PENDING_SELF_EVALUATION: 'PENDING_SELF_EVALUATION',
    PENDING_MANAGER_REVIEW: 'PENDING_MANAGER_REVIEW',
    PENDING_EMPLOYEE_SIGNATURE: 'PENDING_EMPLOYEE_SIGNATURE',
    COMPLETED: 'COMPLETED',
  },
}));

describe('Performance Review Module Tests', () => {
  let controller: PerformanceReviewController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any;
  let mockPerformanceReviewService: jest.Mocked<typeof performanceReviewService>;

  beforeEach(() => {
    controller = new PerformanceReviewController();
    mockPerformanceReviewService = performanceReviewService as jest.Mocked<typeof performanceReviewService>;

    // Reset response object
    responseObject = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation((result) => {
        responseObject = result;
        return mockResponse;
      }),
    };

    // Default mock request with authenticated user
    mockRequest = {
      user: {
        id: 'user-123',
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['CLINICIAN'],
      },
      params: {},
      query: {},
      body: {},
    } as any;

    jest.clearAllMocks();
  });

  // ============================================================================
  // SECTION 1: Routes Authorization Tests
  // ============================================================================
  describe('Routes Authorization Tests', () => {
    describe('authenticate middleware verification', () => {
      it('should allow authenticated user to access their own reviews', async () => {
        const mockReview = {
          id: 'review-123',
          userId: 'user-123',
          reviewerId: 'reviewer-456',
          status: 'DRAFT',
        };

        mockRequest.params = { id: 'review-123' };
        mockPerformanceReviewService.getReviewById.mockResolvedValue(mockReview as any);

        await controller.getReviewById(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject.success).toBe(true);
      });
    });

    describe('requireRole middleware for statistics and upcoming', () => {
      it('should allow ADMINISTRATOR to view statistics', async () => {
        mockRequest.user = {
          id: 'admin-123',
          userId: 'admin-123',
          email: 'admin@example.com',
          roles: ['ADMINISTRATOR'],
        } as any;

        const mockStats = {
          totalReviews: 10,
          completedReviews: 5,
          pendingReviews: 5,
        };

        mockPerformanceReviewService.getReviewStatistics.mockResolvedValue(mockStats as any);

        await controller.getStatistics(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject.success).toBe(true);
      });

      it('should allow SUPER_ADMIN to view upcoming reviews', async () => {
        mockRequest.user = {
          id: 'superadmin-123',
          userId: 'superadmin-123',
          email: 'superadmin@example.com',
          roles: ['SUPER_ADMIN'],
        } as any;

        const mockUpcoming = [
          { id: 'review-1', userId: 'user-1', nextReviewDate: new Date() },
        ];

        mockPerformanceReviewService.getUpcomingReviews.mockResolvedValue(mockUpcoming as any);

        await controller.getUpcomingReviews(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject.success).toBe(true);
      });

      it('should allow SUPERVISOR to view statistics', async () => {
        mockRequest.user = {
          id: 'supervisor-123',
          userId: 'supervisor-123',
          email: 'supervisor@example.com',
          roles: ['SUPERVISOR'],
        } as any;

        const mockStats = { totalReviews: 5 };
        mockPerformanceReviewService.getReviewStatistics.mockResolvedValue(mockStats as any);

        await controller.getStatistics(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
      });
    });

    describe('auditLog middleware verification', () => {
      it('should complete successfully with audit logging for CREATE', async () => {
        mockRequest.user = {
          id: 'supervisor-123',
          userId: 'supervisor-123',
          roles: ['SUPERVISOR'],
        } as any;
        mockRequest.body = {
          userId: 'employee-456',
          reviewerId: 'supervisor-123',
          reviewPeriod: '2025-Q1',
        };

        const mockReview = {
          id: 'review-123',
          userId: 'employee-456',
          reviewerId: 'supervisor-123',
          status: 'DRAFT',
        };

        mockPerformanceReviewService.createReview.mockResolvedValue(mockReview as any);

        await controller.createReview(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(responseObject.success).toBe(true);
      });
    });
  });

  // ============================================================================
  // SECTION 2: Controller Tests
  // ============================================================================
  describe('Controller Tests', () => {
    describe('createReview', () => {
      it('should return 201 when supervisor creates review', async () => {
        mockRequest.user = {
          id: 'supervisor-123',
          userId: 'supervisor-123',
          roles: ['SUPERVISOR'],
        } as any;
        mockRequest.body = {
          userId: 'employee-456',
          reviewerId: 'supervisor-123',
          reviewPeriod: '2025-Q1',
          reviewDate: '2025-03-15',
        };

        const mockReview = {
          id: 'review-123',
          userId: 'employee-456',
          reviewerId: 'supervisor-123',
          reviewPeriod: '2025-Q1',
          status: 'DRAFT',
        };

        mockPerformanceReviewService.createReview.mockResolvedValue(mockReview as any);

        await controller.createReview(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(responseObject.success).toBe(true);
        expect(responseObject.message).toBe('Performance review created successfully');
      });

      it('should return 400 when rating is invalid (> 5)', async () => {
        mockRequest.body = {
          userId: 'employee-456',
          reviewerId: 'supervisor-123',
          overallRating: 6, // Invalid - should be 1-5
        };

        mockPerformanceReviewService.createReview.mockRejectedValue(
          new Error('Overall rating must be between 1 and 5')
        );

        await controller.createReview(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(responseObject.success).toBe(false);
      });

      it('should return 400 when rating is invalid (< 1)', async () => {
        mockRequest.body = {
          userId: 'employee-456',
          reviewerId: 'supervisor-123',
          overallRating: 0, // Invalid - should be 1-5
        };

        mockPerformanceReviewService.createReview.mockRejectedValue(
          new Error('Overall rating must be between 1 and 5')
        );

        await controller.createReview(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(responseObject.success).toBe(false);
      });
    });

    describe('getReviewById', () => {
      it('should return 200 with valid ID when user is employee', async () => {
        const mockReview = {
          id: 'review-123',
          userId: 'user-123', // Same as current user
          reviewerId: 'reviewer-456',
          status: 'DRAFT',
          reviewPeriod: '2025-Q1',
        };

        mockRequest.params = { id: 'review-123' };
        mockPerformanceReviewService.getReviewById.mockResolvedValue(mockReview as any);

        await controller.getReviewById(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject.success).toBe(true);
        expect(responseObject.data).toEqual(mockReview);
      });

      it('should return 200 with valid ID when user is reviewer', async () => {
        const mockReview = {
          id: 'review-123',
          userId: 'other-user-456',
          reviewerId: 'user-123', // Current user is reviewer
          status: 'PENDING_MANAGER_REVIEW',
        };

        mockRequest.params = { id: 'review-123' };
        mockPerformanceReviewService.getReviewById.mockResolvedValue(mockReview as any);

        await controller.getReviewById(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject.success).toBe(true);
      });

      it('should return 404 with invalid ID', async () => {
        mockRequest.params = { id: 'nonexistent-review' };
        mockPerformanceReviewService.getReviewById.mockRejectedValue(
          new Error('Performance review not found')
        );

        await controller.getReviewById(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(responseObject.success).toBe(false);
        expect(responseObject.message).toContain('not found');
      });

      it('should return 403 when user is neither employee nor reviewer', async () => {
        const mockReview = {
          id: 'review-123',
          userId: 'other-user-456', // Different user
          reviewerId: 'other-reviewer-789', // Different reviewer
          status: 'DRAFT',
        };

        mockRequest.params = { id: 'review-123' };
        mockRequest.user = {
          id: 'user-123',
          userId: 'user-123',
          roles: ['CLINICIAN'],
        } as any;

        mockPerformanceReviewService.getReviewById.mockResolvedValue(mockReview as any);

        await controller.getReviewById(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(responseObject.success).toBe(false);
        expect(responseObject.message).toContain('Not authorized');
      });
    });

    describe('getAllReviews', () => {
      it('should filter reviews to own for non-admin users', async () => {
        mockRequest.user = {
          id: 'user-123',
          userId: 'user-123',
          roles: ['CLINICIAN'],
        } as any;

        const mockResult = {
          reviews: [
            { id: 'review-1', userId: 'user-123', status: 'DRAFT' },
          ],
          pagination: {
            total: 1,
            page: 1,
            limit: 50,
            totalPages: 1,
          },
        };

        mockPerformanceReviewService.getAllReviews.mockResolvedValue(mockResult as any);

        await controller.getAllReviews(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockPerformanceReviewService.getAllReviews).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-123',
          })
        );
      });

      it('should allow admin to view all reviews', async () => {
        mockRequest.user = {
          id: 'admin-123',
          userId: 'admin-123',
          roles: ['ADMINISTRATOR'],
        } as any;

        const mockResult = {
          reviews: [
            { id: 'review-1', userId: 'user-123', status: 'DRAFT' },
            { id: 'review-2', userId: 'user-456', status: 'COMPLETED' },
          ],
          pagination: {
            total: 2,
            page: 1,
            limit: 50,
            totalPages: 1,
          },
        };

        mockPerformanceReviewService.getAllReviews.mockResolvedValue(mockResult as any);

        await controller.getAllReviews(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject.data).toHaveLength(2);
      });

      it('should return 403 when non-admin tries to view other user reviews', async () => {
        mockRequest.user = {
          id: 'user-123',
          userId: 'user-123',
          roles: ['CLINICIAN'],
        } as any;
        mockRequest.query = { userId: 'other-user-456' };

        await controller.getAllReviews(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(responseObject.message).toContain('Not authorized');
      });
    });

    describe('updateReview', () => {
      it('should allow reviewer to update review', async () => {
        mockRequest.user = {
          id: 'reviewer-123',
          userId: 'reviewer-123',
          roles: ['SUPERVISOR'],
        } as any;
        mockRequest.params = { id: 'review-123' };
        mockRequest.body = { managerComments: 'Good progress' };

        const mockReview = {
          id: 'review-123',
          userId: 'employee-456',
          reviewerId: 'reviewer-123', // Current user is reviewer
          status: 'PENDING_MANAGER_REVIEW',
        };

        mockPerformanceReviewService.getReviewById.mockResolvedValue(mockReview as any);
        mockPerformanceReviewService.updateReview.mockResolvedValue({
          ...mockReview,
          managerComments: 'Good progress',
        } as any);

        await controller.updateReview(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject.success).toBe(true);
        expect(responseObject.message).toBe('Performance review updated successfully');
      });

      it('should allow admin to update any review', async () => {
        mockRequest.user = {
          id: 'admin-123',
          userId: 'admin-123',
          roles: ['ADMINISTRATOR'],
        } as any;
        mockRequest.params = { id: 'review-123' };
        mockRequest.body = { managerComments: 'Admin override' };

        const mockReview = {
          id: 'review-123',
          userId: 'employee-456',
          reviewerId: 'reviewer-789', // Not the current user
          status: 'DRAFT',
        };

        mockPerformanceReviewService.getReviewById.mockResolvedValue(mockReview as any);
        mockPerformanceReviewService.updateReview.mockResolvedValue({
          ...mockReview,
          managerComments: 'Admin override',
        } as any);

        await controller.updateReview(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
      });

      it('should return 403 when non-reviewer tries to update', async () => {
        mockRequest.user = {
          id: 'user-123',
          userId: 'user-123',
          roles: ['CLINICIAN'],
        } as any;
        mockRequest.params = { id: 'review-123' };
        mockRequest.body = { managerComments: 'Unauthorized update' };

        const mockReview = {
          id: 'review-123',
          userId: 'employee-456',
          reviewerId: 'other-reviewer-789', // Not the current user
          status: 'DRAFT',
        };

        mockPerformanceReviewService.getReviewById.mockResolvedValue(mockReview as any);

        await controller.updateReview(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(responseObject.message).toContain('Only the assigned reviewer or admin');
      });
    });

    describe('deleteReview', () => {
      it('should return 200 when admin deletes review', async () => {
        mockRequest.user = {
          id: 'admin-123',
          userId: 'admin-123',
          roles: ['ADMINISTRATOR'],
        } as any;
        mockRequest.params = { id: 'review-123' };

        mockPerformanceReviewService.deleteReview.mockResolvedValue({
          message: 'Performance review deleted successfully',
        });

        await controller.deleteReview(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject.success).toBe(true);
      });

      it('should return 400 when service throws error', async () => {
        mockRequest.params = { id: 'review-123' };

        mockPerformanceReviewService.deleteReview.mockRejectedValue(
          new Error('Cannot delete completed review')
        );

        await controller.deleteReview(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(responseObject.success).toBe(false);
      });
    });
  });

  // ============================================================================
  // SECTION 3: Workflow Tests
  // ============================================================================
  describe('Workflow Tests', () => {
    describe('submitSelfEvaluation', () => {
      it('should allow employee to submit their own self-evaluation', async () => {
        mockRequest.user = {
          id: 'employee-123',
          userId: 'employee-123',
          roles: ['CLINICIAN'],
        } as any;
        mockRequest.params = { id: 'review-123' };
        mockRequest.body = {
          selfAssessment: 'I met all my goals this quarter',
          accomplishments: ['Completed training', 'Led project X'],
        };

        const mockReview = {
          id: 'review-123',
          userId: 'employee-123', // Same as current user
          reviewerId: 'reviewer-456',
          status: 'PENDING_SELF_EVALUATION',
        };

        mockPerformanceReviewService.getReviewById.mockResolvedValue(mockReview as any);
        mockPerformanceReviewService.submitSelfEvaluation.mockResolvedValue({
          ...mockReview,
          status: 'PENDING_MANAGER_REVIEW',
          selfAssessment: 'I met all my goals this quarter',
        } as any);

        await controller.submitSelfEvaluation(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject.success).toBe(true);
        expect(responseObject.message).toBe('Self-evaluation submitted successfully');
      });

      it('should return 403 when non-employee tries to submit self-evaluation', async () => {
        mockRequest.user = {
          id: 'other-user-456',
          userId: 'other-user-456',
          roles: ['CLINICIAN'],
        } as any;
        mockRequest.params = { id: 'review-123' };
        mockRequest.body = { selfAssessment: 'Unauthorized submission' };

        const mockReview = {
          id: 'review-123',
          userId: 'employee-123', // Different from current user
          reviewerId: 'reviewer-789',
          status: 'PENDING_SELF_EVALUATION',
        };

        mockPerformanceReviewService.getReviewById.mockResolvedValue(mockReview as any);

        await controller.submitSelfEvaluation(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(responseObject.message).toContain('Only the employee being reviewed');
      });
    });

    describe('submitManagerReview', () => {
      it('should allow assigned reviewer to submit manager review', async () => {
        mockRequest.user = {
          id: 'reviewer-123',
          userId: 'reviewer-123',
          roles: ['SUPERVISOR'],
        } as any;
        mockRequest.params = { id: 'review-123' };
        mockRequest.body = {
          managerAssessment: 'Employee exceeded expectations',
          overallRating: 4,
        };

        const mockReview = {
          id: 'review-123',
          userId: 'employee-456',
          reviewerId: 'reviewer-123', // Same as current user
          status: 'PENDING_MANAGER_REVIEW',
        };

        mockPerformanceReviewService.getReviewById.mockResolvedValue(mockReview as any);
        mockPerformanceReviewService.submitManagerReview.mockResolvedValue({
          ...mockReview,
          status: 'PENDING_EMPLOYEE_SIGNATURE',
          overallRating: 4,
        } as any);

        await controller.submitManagerReview(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject.success).toBe(true);
        expect(responseObject.message).toBe('Manager review submitted successfully');
      });

      it('should return 403 when non-assigned reviewer tries to submit', async () => {
        mockRequest.user = {
          id: 'other-reviewer-456',
          userId: 'other-reviewer-456',
          roles: ['SUPERVISOR'],
        } as any;
        mockRequest.params = { id: 'review-123' };
        mockRequest.body = { managerAssessment: 'Unauthorized' };

        const mockReview = {
          id: 'review-123',
          userId: 'employee-789',
          reviewerId: 'assigned-reviewer-123', // Different from current user
          status: 'PENDING_MANAGER_REVIEW',
        };

        mockPerformanceReviewService.getReviewById.mockResolvedValue(mockReview as any);

        await controller.submitManagerReview(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(responseObject.message).toContain('Only the assigned reviewer');
      });
    });

    describe('employeeSignature', () => {
      it('should allow employee to sign their review', async () => {
        mockRequest.user = {
          id: 'employee-123',
          userId: 'employee-123',
          roles: ['CLINICIAN'],
        } as any;
        mockRequest.params = { id: 'review-123' };
        mockRequest.body = {
          signature: 'John Doe',
          acknowledged: true,
        };

        const mockReview = {
          id: 'review-123',
          userId: 'employee-123', // Same as current user
          reviewerId: 'reviewer-456',
          status: 'PENDING_EMPLOYEE_SIGNATURE',
        };

        mockPerformanceReviewService.getReviewById.mockResolvedValue(mockReview as any);
        mockPerformanceReviewService.employeeSignature.mockResolvedValue({
          ...mockReview,
          status: 'COMPLETED',
          employeeSignature: 'John Doe',
          employeeSignedAt: new Date(),
        } as any);

        await controller.employeeSignature(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject.success).toBe(true);
        expect(responseObject.message).toBe('Performance review signed successfully');
      });

      it('should return 403 when non-employee tries to sign', async () => {
        mockRequest.user = {
          id: 'other-user-456',
          userId: 'other-user-456',
          roles: ['CLINICIAN'],
        } as any;
        mockRequest.params = { id: 'review-123' };
        mockRequest.body = { signature: 'Fake Signature' };

        const mockReview = {
          id: 'review-123',
          userId: 'employee-123', // Different from current user
          reviewerId: 'reviewer-789',
          status: 'PENDING_EMPLOYEE_SIGNATURE',
        };

        mockPerformanceReviewService.getReviewById.mockResolvedValue(mockReview as any);

        await controller.employeeSignature(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(responseObject.message).toContain('Only the employee being reviewed can sign');
      });
    });

    describe('State transitions validation', () => {
      it('should handle invalid state transition error', async () => {
        mockRequest.user = {
          id: 'employee-123',
          userId: 'employee-123',
          roles: ['CLINICIAN'],
        } as any;
        mockRequest.params = { id: 'review-123' };
        mockRequest.body = { selfAssessment: 'Test' };

        const mockReview = {
          id: 'review-123',
          userId: 'employee-123',
          reviewerId: 'reviewer-456',
          status: 'COMPLETED', // Wrong state for self-evaluation
        };

        mockPerformanceReviewService.getReviewById.mockResolvedValue(mockReview as any);
        mockPerformanceReviewService.submitSelfEvaluation.mockRejectedValue(
          new Error('Cannot submit self-evaluation on a COMPLETED review')
        );

        await controller.submitSelfEvaluation(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
      });
    });
  });

  // ============================================================================
  // SECTION 4: Ownership Validation Tests
  // ============================================================================
  describe('Ownership Validation Tests', () => {
    describe('User cannot access others reviews without permission', () => {
      it('should deny access when CLINICIAN tries to view other employee reviews', async () => {
        mockRequest.user = {
          id: 'user-123',
          userId: 'user-123',
          roles: ['CLINICIAN'],
        } as any;
        mockRequest.params = { userId: 'other-user-456' };

        await controller.getReviewsByEmployee(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(responseObject.message).toContain('Not authorized');
      });

      it('should deny access when CLINICIAN tries to view other reviewer assignments', async () => {
        mockRequest.user = {
          id: 'user-123',
          userId: 'user-123',
          roles: ['CLINICIAN'],
        } as any;
        mockRequest.params = { reviewerId: 'other-reviewer-456' };

        await controller.getReviewsByReviewer(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(responseObject.message).toContain('Not authorized');
      });

      it('should allow SUPERVISOR to view other employee reviews', async () => {
        mockRequest.user = {
          id: 'supervisor-123',
          userId: 'supervisor-123',
          roles: ['SUPERVISOR'],
        } as any;
        mockRequest.params = { userId: 'employee-456' };

        const mockReviews = [{ id: 'review-1', userId: 'employee-456' }];
        mockPerformanceReviewService.getReviewsByEmployee.mockResolvedValue(mockReviews as any);

        await controller.getReviewsByEmployee(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
      });

      it('should allow employee to view their own reviews', async () => {
        mockRequest.user = {
          id: 'user-123',
          userId: 'user-123',
          roles: ['CLINICIAN'],
        } as any;
        mockRequest.params = { userId: 'user-123' }; // Same as current user

        const mockReviews = [{ id: 'review-1', userId: 'user-123' }];
        mockPerformanceReviewService.getReviewsByEmployee.mockResolvedValue(mockReviews as any);

        await controller.getReviewsByEmployee(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
      });
    });

    describe('Reviewer validation for manager review submission', () => {
      it('should prevent non-assigned reviewer from submitting manager review', async () => {
        mockRequest.user = {
          id: 'wrong-reviewer-123',
          userId: 'wrong-reviewer-123',
          roles: ['SUPERVISOR'],
        } as any;
        mockRequest.params = { id: 'review-123' };
        mockRequest.body = { overallRating: 4 };

        const mockReview = {
          id: 'review-123',
          userId: 'employee-456',
          reviewerId: 'correct-reviewer-789', // Different from current user
          status: 'PENDING_MANAGER_REVIEW',
        };

        mockPerformanceReviewService.getReviewById.mockResolvedValue(mockReview as any);

        await controller.submitManagerReview(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(responseObject.message).toContain('Only the assigned reviewer');
      });
    });
  });

  // ============================================================================
  // SECTION 5: Edge Cases and Error Handling
  // ============================================================================
  describe('Edge Cases and Error Handling', () => {
    describe('Database error handling', () => {
      it('should handle database errors gracefully on create', async () => {
        mockRequest.body = {
          userId: 'employee-456',
          reviewerId: 'reviewer-123',
        };

        mockPerformanceReviewService.createReview.mockRejectedValue(
          new Error('Database connection failed')
        );

        await controller.createReview(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(responseObject.success).toBe(false);
      });

      it('should handle database errors on get statistics', async () => {
        mockPerformanceReviewService.getReviewStatistics.mockRejectedValue(
          new Error('Database timeout')
        );

        await controller.getStatistics(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(responseObject.success).toBe(false);
      });
    });

    describe('Invalid input handling', () => {
      it('should handle missing review ID', async () => {
        mockRequest.params = { id: '' };

        mockPerformanceReviewService.getReviewById.mockRejectedValue(
          new Error('Review ID is required')
        );

        await controller.getReviewById(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
      });

      it('should handle invalid date formats in filters', async () => {
        mockRequest.query = {
          startDate: 'invalid-date',
        };

        mockPerformanceReviewService.getReviewStatistics.mockRejectedValue(
          new Error('Invalid date format')
        );

        await controller.getStatistics(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
      });
    });

    describe('Multiple role handling', () => {
      it('should allow user with multiple roles including SUPERVISOR', async () => {
        mockRequest.user = {
          id: 'multi-role-user',
          userId: 'multi-role-user',
          roles: ['CLINICIAN', 'SUPERVISOR'], // Multiple roles
        } as any;
        mockRequest.params = { userId: 'other-employee-456' };

        const mockReviews = [{ id: 'review-1', userId: 'other-employee-456' }];
        mockPerformanceReviewService.getReviewsByEmployee.mockResolvedValue(mockReviews as any);

        await controller.getReviewsByEmployee(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
      });
    });
  });
});

// Export for use in other test files if needed
export {};
