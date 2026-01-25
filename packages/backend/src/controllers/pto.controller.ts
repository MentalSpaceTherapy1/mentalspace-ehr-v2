import { Request, Response } from 'express';
import { UserRoles, type UserRole } from '@mentalspace/shared';
import ptoService from '../services/pto.service';
import { PTOStatus, AbsenceType } from '@prisma/client';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound, sendServerError, sendForbidden, sendPaginated } from '../utils/apiResponse';

/**
 * Type definitions for PTO filters
 */
interface PTOFilters {
  userId?: string;
  status?: PTOStatus;
  requestType?: AbsenceType;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

interface PTOCalendarItem {
  departmentId?: string;
  userId: string;
  startDate: Date;
  endDate: Date;
}

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

export class PTOController {
  /**
   * Create a new PTO request
   * POST /api/pto/requests
   * Security: Forces userId from authenticated session to prevent creating requests for others
   */
  async createRequest(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      const currentUserId = currentUser?.id || currentUser?.userId;

      if (!currentUserId) {
        return sendUnauthorized(res, 'Authentication required');
      }

      // Force userId from authenticated session - users can only create requests for themselves
      // Admins can create requests for others if userId is provided in body
      let targetUserId = currentUserId;
      if (req.body.userId && req.body.userId !== currentUserId) {
        if (!hasAdminRole(currentUser?.roles)) {
          return sendForbidden(res, 'Only administrators can create PTO requests for other users');
        }
        targetUserId = req.body.userId;
      }

      const requestData = {
        ...req.body,
        userId: targetUserId,
      };

      const request = await ptoService.createRequest(requestData);
      return sendCreated(res, request, 'PTO request created successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to create PTO request';
      return sendBadRequest(res, errorMessage);
    }
  }

  /**
   * Get all PTO requests with filters
   * GET /api/pto/requests
   * Security: Non-admin users can only view their own requests
   */
  async getAllRequests(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      const currentUserId = currentUser?.id || currentUser?.userId;

      const {
        userId,
        status,
        requestType,
        startDate,
        endDate,
        page,
        limit,
      } = req.query;

      const filters: PTOFilters = {};

      // Non-admin users can only see their own requests
      if (!hasAdminOrSupervisorRole(currentUser?.roles)) {
        filters.userId = currentUserId;
      } else if (userId) {
        filters.userId = userId as string;
      }

      if (status) filters.status = status as PTOStatus;
      if (requestType) filters.requestType = requestType as AbsenceType;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (page) filters.page = parseInt(page as string);
      if (limit) filters.limit = parseInt(limit as string);

      const result = await ptoService.getAllRequests(filters);
      return sendPaginated(res, result.requests, result.pagination);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to fetch PTO requests';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Get a single PTO request by ID
   * GET /api/pto/requests/:id
   * Security: Users can only view their own requests unless admin/supervisor
   */
  async getRequestById(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      const currentUserId = currentUser?.id || currentUser?.userId;
      const { id } = req.params;

      const request = await ptoService.getRequestById(id);

      // Ownership validation: users can only view their own requests
      if (request.userId !== currentUserId && !hasAdminOrSupervisorRole(currentUser?.roles)) {
        return sendForbidden(res, 'Not authorized to view this PTO request');
      }

      return sendSuccess(res, request);
    } catch (error: unknown) {
      return sendNotFound(res, 'PTO request');
    }
  }

  /**
   * Update a PTO request
   * PUT /api/pto/requests/:id
   * Security: Users can only update their own pending requests; admins can update any
   */
  async updateRequest(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      const currentUserId = currentUser?.id || currentUser?.userId;
      const { id } = req.params;

      // First fetch the request to check ownership
      const existingRequest = await ptoService.getRequestById(id);

      // Non-admins can only update their own pending requests
      if (!hasAdminRole(currentUser?.roles)) {
        if (existingRequest.userId !== currentUserId) {
          return sendForbidden(res, 'Not authorized to update this PTO request');
        }
        if (existingRequest.status !== 'PENDING') {
          return sendBadRequest(res, 'Can only update pending PTO requests');
        }
      }

      const request = await ptoService.updateRequest(id, req.body);
      return sendSuccess(res, request, 'PTO request updated successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to update PTO request';
      return sendBadRequest(res, errorMessage);
    }
  }

  /**
   * Approve a PTO request
   * POST /api/pto/requests/:id/approve
   * Security: Prevents self-approval; uses authenticated user as approver
   */
  async approveRequest(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      const currentUserId = currentUser?.id || currentUser?.userId;
      const { id } = req.params;
      const { approvalNotes } = req.body;

      if (!currentUserId) {
        return sendUnauthorized(res, 'Authentication required');
      }

      // Fetch the request to check ownership
      const existingRequest = await ptoService.getRequestById(id);

      // Prevent self-approval
      if (existingRequest.userId === currentUserId) {
        return sendForbidden(res, 'Cannot approve your own PTO request');
      }

      // Use authenticated user as approver (not from body for security)
      const request = await ptoService.approveRequest(id, {
        approvedById: currentUserId,
        approvalNotes,
      });

      return sendSuccess(res, request, 'PTO request approved successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to approve PTO request';
      return sendBadRequest(res, errorMessage);
    }
  }

  /**
   * Deny a PTO request
   * POST /api/pto/requests/:id/deny
   * Security: Prevents self-denial; uses authenticated user as denier
   */
  async denyRequest(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      const currentUserId = currentUser?.id || currentUser?.userId;
      const { id } = req.params;
      const { approvalNotes } = req.body;

      if (!currentUserId) {
        return sendUnauthorized(res, 'Authentication required');
      }

      if (!approvalNotes) {
        return sendBadRequest(res, 'Denial reason is required when denying a request');
      }

      // Fetch the request to check ownership
      const existingRequest = await ptoService.getRequestById(id);

      // Prevent self-denial
      if (existingRequest.userId === currentUserId) {
        return sendForbidden(res, 'Cannot deny your own PTO request. Use cancel instead.');
      }

      // Use authenticated user as denier (not from body for security)
      const request = await ptoService.denyRequest(id, {
        approvedById: currentUserId,
        approvalNotes,
      });

      return sendSuccess(res, request, 'PTO request denied');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to deny PTO request';
      return sendBadRequest(res, errorMessage);
    }
  }

  /**
   * Cancel a PTO request
   * POST /api/pto/requests/:id/cancel
   * Security: Only owner can cancel their own request; admins can cancel any
   */
  async cancelRequest(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      const currentUserId = currentUser?.id || currentUser?.userId;
      const { id } = req.params;

      // Fetch the request to check ownership
      const existingRequest = await ptoService.getRequestById(id);

      // Only owner or admin can cancel
      if (existingRequest.userId !== currentUserId && !hasAdminRole(currentUser?.roles)) {
        return sendForbidden(res, 'Not authorized to cancel this PTO request');
      }

      const request = await ptoService.cancelRequest(id);
      return sendSuccess(res, request, 'PTO request cancelled successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to cancel PTO request';
      return sendBadRequest(res, errorMessage);
    }
  }

  /**
   * Delete a PTO request
   * DELETE /api/pto/requests/:id
   * Security: Only owner can delete pending requests; admins can delete any
   */
  async deleteRequest(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      const currentUserId = currentUser?.id || currentUser?.userId;
      const { id } = req.params;

      // Fetch the request to check ownership
      const existingRequest = await ptoService.getRequestById(id);

      // Non-admins can only delete their own pending requests
      if (!hasAdminRole(currentUser?.roles)) {
        if (existingRequest.userId !== currentUserId) {
          return sendForbidden(res, 'Not authorized to delete this PTO request');
        }
        if (existingRequest.status !== 'PENDING') {
          return sendBadRequest(res, 'Can only delete pending PTO requests');
        }
      }

      const result = await ptoService.deleteRequest(id);
      return sendSuccess(res, null, result.message);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to delete PTO request';
      return sendBadRequest(res, errorMessage);
    }
  }

  /**
   * Get PTO balance for a user
   * GET /api/pto/balance/:userId
   * Security: Users can only view their own balance; admins can view any
   */
  async getBalance(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      const currentUserId = currentUser?.id || currentUser?.userId;
      const { userId } = req.params;

      // Ownership validation: users can only view their own balance
      if (userId !== currentUserId && !hasAdminOrSupervisorRole(currentUser?.roles)) {
        return sendForbidden(res, 'Not authorized to view this PTO balance');
      }

      const balance = await ptoService.getBalance(userId);
      return sendSuccess(res, balance);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to fetch PTO balance';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Update PTO balance for a user
   * PUT /api/pto/balance/:userId
   */
  async updateBalance(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const balance = await ptoService.updateBalance(userId, req.body);
      return sendSuccess(res, balance, 'PTO balance updated successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to update PTO balance';
      return sendBadRequest(res, errorMessage);
    }
  }

  /**
   * Process accruals for all users
   * POST /api/pto/process-accruals
   */
  async processAccruals(req: Request, res: Response) {
    try {
      const result = await ptoService.processAccruals();
      return sendSuccess(res, result.results, result.message);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to process accruals';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Get pending PTO requests
   * GET /api/pto/requests/pending
   */
  async getPendingRequests(req: Request, res: Response) {
    try {
      const requests = await ptoService.getPendingRequests();
      return sendSuccess(res, requests);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to fetch pending requests';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Get PTO calendar
   * GET /api/pto/calendar
   */
  async getPTOCalendar(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return sendBadRequest(res, 'Start date and end date are required');
      }

      const requests = await ptoService.getPTOCalendar(
        new Date(startDate as string),
        new Date(endDate as string)
      );

      return sendSuccess(res, requests);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to fetch PTO calendar';
      return sendServerError(res, errorMessage);
    }
  }

  /**
   * Check for PTO conflicts
   * GET /api/pto/check-conflicts
   */
  async checkConflicts(req: Request, res: Response) {
    try {
      const { startDate, endDate, departmentId } = req.query;

      if (!startDate || !endDate) {
        return sendBadRequest(res, 'Start date and end date are required');
      }

      // Get approved PTO requests for the date range to check for conflicts
      const conflicts = await ptoService.getPTOCalendar(
        new Date(startDate as string),
        new Date(endDate as string)
      );

      // Filter by department if provided
      let filteredConflicts = conflicts;
      if (departmentId) {
        filteredConflicts = conflicts.filter((c: PTOCalendarItem) => c.departmentId === departmentId);
      }

      return sendSuccess(res, {
        hasConflicts: filteredConflicts.length > 0,
        conflicts: filteredConflicts,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to check PTO conflicts';
      return sendServerError(res, errorMessage);
    }
  }
}

export default new PTOController();
