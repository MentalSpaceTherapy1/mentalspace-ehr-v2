import { Request, Response } from 'express';
import ptoService from '../services/pto.service';
import { PTOStatus, AbsenceType } from '@prisma/client';

// Helper function to check if user has admin/supervisor role
const hasAdminOrSupervisorRole = (roles: string[] = []): boolean => {
  return roles.some(role => ['ADMINISTRATOR', 'SUPER_ADMIN', 'SUPERVISOR'].includes(role));
};

// Helper function to check if user has admin role only
const hasAdminRole = (roles: string[] = []): boolean => {
  return roles.some(role => ['ADMINISTRATOR', 'SUPER_ADMIN'].includes(role));
};

export class PTOController {
  /**
   * Create a new PTO request
   * POST /api/pto/requests
   * Security: Forces userId from authenticated session to prevent creating requests for others
   */
  async createRequest(req: Request, res: Response) {
    try {
      const currentUser = (req as any).user;
      const currentUserId = currentUser?.id || currentUser?.userId;

      if (!currentUserId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Force userId from authenticated session - users can only create requests for themselves
      // Admins can create requests for others if userId is provided in body
      let targetUserId = currentUserId;
      if (req.body.userId && req.body.userId !== currentUserId) {
        if (!hasAdminRole(currentUser?.roles)) {
          return res.status(403).json({
            success: false,
            message: 'Only administrators can create PTO requests for other users',
          });
        }
        targetUserId = req.body.userId;
      }

      const requestData = {
        ...req.body,
        userId: targetUserId,
      };

      const request = await ptoService.createRequest(requestData);
      res.status(201).json({
        success: true,
        data: request,
        message: 'PTO request created successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create PTO request',
      });
    }
  }

  /**
   * Get all PTO requests with filters
   * GET /api/pto/requests
   * Security: Non-admin users can only view their own requests
   */
  async getAllRequests(req: Request, res: Response) {
    try {
      const currentUser = (req as any).user;
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

      const filters: any = {};

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
      res.status(200).json({
        success: true,
        data: result.requests,
        pagination: result.pagination,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch PTO requests',
      });
    }
  }

  /**
   * Get a single PTO request by ID
   * GET /api/pto/requests/:id
   * Security: Users can only view their own requests unless admin/supervisor
   */
  async getRequestById(req: Request, res: Response) {
    try {
      const currentUser = (req as any).user;
      const currentUserId = currentUser?.id || currentUser?.userId;
      const { id } = req.params;

      const request = await ptoService.getRequestById(id);

      // Ownership validation: users can only view their own requests
      if (request.userId !== currentUserId && !hasAdminOrSupervisorRole(currentUser?.roles)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this PTO request',
        });
      }

      res.status(200).json({
        success: true,
        data: request,
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'PTO request not found',
      });
    }
  }

  /**
   * Update a PTO request
   * PUT /api/pto/requests/:id
   * Security: Users can only update their own pending requests; admins can update any
   */
  async updateRequest(req: Request, res: Response) {
    try {
      const currentUser = (req as any).user;
      const currentUserId = currentUser?.id || currentUser?.userId;
      const { id } = req.params;

      // First fetch the request to check ownership
      const existingRequest = await ptoService.getRequestById(id);

      // Non-admins can only update their own pending requests
      if (!hasAdminRole(currentUser?.roles)) {
        if (existingRequest.userId !== currentUserId) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to update this PTO request',
          });
        }
        if (existingRequest.status !== 'PENDING') {
          return res.status(400).json({
            success: false,
            message: 'Can only update pending PTO requests',
          });
        }
      }

      const request = await ptoService.updateRequest(id, req.body);
      res.status(200).json({
        success: true,
        data: request,
        message: 'PTO request updated successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update PTO request',
      });
    }
  }

  /**
   * Approve a PTO request
   * POST /api/pto/requests/:id/approve
   * Security: Prevents self-approval; uses authenticated user as approver
   */
  async approveRequest(req: Request, res: Response) {
    try {
      const currentUser = (req as any).user;
      const currentUserId = currentUser?.id || currentUser?.userId;
      const { id } = req.params;
      const { approvalNotes } = req.body;

      // Fetch the request to check ownership
      const existingRequest = await ptoService.getRequestById(id);

      // Prevent self-approval
      if (existingRequest.userId === currentUserId) {
        return res.status(403).json({
          success: false,
          message: 'Cannot approve your own PTO request',
        });
      }

      // Use authenticated user as approver (not from body for security)
      const request = await ptoService.approveRequest(id, {
        approvedById: currentUserId,
        approvalNotes,
      });

      res.status(200).json({
        success: true,
        data: request,
        message: 'PTO request approved successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to approve PTO request',
      });
    }
  }

  /**
   * Deny a PTO request
   * POST /api/pto/requests/:id/deny
   * Security: Prevents self-denial; uses authenticated user as denier
   */
  async denyRequest(req: Request, res: Response) {
    try {
      const currentUser = (req as any).user;
      const currentUserId = currentUser?.id || currentUser?.userId;
      const { id } = req.params;
      const { approvalNotes } = req.body;

      if (!approvalNotes) {
        return res.status(400).json({
          success: false,
          message: 'Denial reason is required when denying a request',
        });
      }

      // Fetch the request to check ownership
      const existingRequest = await ptoService.getRequestById(id);

      // Prevent self-denial
      if (existingRequest.userId === currentUserId) {
        return res.status(403).json({
          success: false,
          message: 'Cannot deny your own PTO request. Use cancel instead.',
        });
      }

      // Use authenticated user as denier (not from body for security)
      const request = await ptoService.denyRequest(id, {
        approvedById: currentUserId,
        approvalNotes,
      });

      res.status(200).json({
        success: true,
        data: request,
        message: 'PTO request denied',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to deny PTO request',
      });
    }
  }

  /**
   * Cancel a PTO request
   * POST /api/pto/requests/:id/cancel
   * Security: Only owner can cancel their own request; admins can cancel any
   */
  async cancelRequest(req: Request, res: Response) {
    try {
      const currentUser = (req as any).user;
      const currentUserId = currentUser?.id || currentUser?.userId;
      const { id } = req.params;

      // Fetch the request to check ownership
      const existingRequest = await ptoService.getRequestById(id);

      // Only owner or admin can cancel
      if (existingRequest.userId !== currentUserId && !hasAdminRole(currentUser?.roles)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to cancel this PTO request',
        });
      }

      const request = await ptoService.cancelRequest(id);
      res.status(200).json({
        success: true,
        data: request,
        message: 'PTO request cancelled successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to cancel PTO request',
      });
    }
  }

  /**
   * Delete a PTO request
   * DELETE /api/pto/requests/:id
   * Security: Only owner can delete pending requests; admins can delete any
   */
  async deleteRequest(req: Request, res: Response) {
    try {
      const currentUser = (req as any).user;
      const currentUserId = currentUser?.id || currentUser?.userId;
      const { id } = req.params;

      // Fetch the request to check ownership
      const existingRequest = await ptoService.getRequestById(id);

      // Non-admins can only delete their own pending requests
      if (!hasAdminRole(currentUser?.roles)) {
        if (existingRequest.userId !== currentUserId) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to delete this PTO request',
          });
        }
        if (existingRequest.status !== 'PENDING') {
          return res.status(400).json({
            success: false,
            message: 'Can only delete pending PTO requests',
          });
        }
      }

      const result = await ptoService.deleteRequest(id);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to delete PTO request',
      });
    }
  }

  /**
   * Get PTO balance for a user
   * GET /api/pto/balance/:userId
   * Security: Users can only view their own balance; admins can view any
   */
  async getBalance(req: Request, res: Response) {
    try {
      const currentUser = (req as any).user;
      const currentUserId = currentUser?.id || currentUser?.userId;
      const { userId } = req.params;

      // Ownership validation: users can only view their own balance
      if (userId !== currentUserId && !hasAdminOrSupervisorRole(currentUser?.roles)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this PTO balance',
        });
      }

      const balance = await ptoService.getBalance(userId);
      res.status(200).json({
        success: true,
        data: balance,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch PTO balance',
      });
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
      res.status(200).json({
        success: true,
        data: balance,
        message: 'PTO balance updated successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update PTO balance',
      });
    }
  }

  /**
   * Process accruals for all users
   * POST /api/pto/process-accruals
   */
  async processAccruals(req: Request, res: Response) {
    try {
      const result = await ptoService.processAccruals();
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.results,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to process accruals',
      });
    }
  }

  /**
   * Get pending PTO requests
   * GET /api/pto/requests/pending
   */
  async getPendingRequests(req: Request, res: Response) {
    try {
      const requests = await ptoService.getPendingRequests();
      res.status(200).json({
        success: true,
        data: requests,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch pending requests',
      });
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
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const requests = await ptoService.getPTOCalendar(
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.status(200).json({
        success: true,
        data: requests,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch PTO calendar',
      });
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
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      // Get approved PTO requests for the date range to check for conflicts
      const conflicts = await ptoService.getPTOCalendar(
        new Date(startDate as string),
        new Date(endDate as string)
      );

      // Filter by department if provided
      let filteredConflicts = conflicts;
      if (departmentId) {
        filteredConflicts = conflicts.filter((c: any) => c.departmentId === departmentId);
      }

      res.status(200).json({
        success: true,
        data: {
          hasConflicts: filteredConflicts.length > 0,
          conflicts: filteredConflicts,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to check PTO conflicts',
      });
    }
  }
}

export default new PTOController();
