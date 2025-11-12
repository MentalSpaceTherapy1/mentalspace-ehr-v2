import { Request, Response } from 'express';
import ptoService from '../services/pto.service';
import { PTOStatus, AbsenceType } from '@prisma/client';

export class PTOController {
  /**
   * Create a new PTO request
   * POST /api/pto/requests
   */
  async createRequest(req: Request, res: Response) {
    try {
      const request = await ptoService.createRequest(req.body);
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
   */
  async getAllRequests(req: Request, res: Response) {
    try {
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

      if (userId) filters.userId = userId as string;
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
   */
  async getRequestById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const request = await ptoService.getRequestById(id);
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
   */
  async updateRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
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
   */
  async approveRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { approvedById, approvalNotes } = req.body;

      const request = await ptoService.approveRequest(id, {
        approvedById,
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
   */
  async denyRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { approvedById, approvalNotes } = req.body;

      if (!approvalNotes) {
        return res.status(400).json({
          success: false,
          message: 'Approval notes are required when denying a request',
        });
      }

      const request = await ptoService.denyRequest(id, {
        approvedById,
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
   */
  async cancelRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
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
   */
  async deleteRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
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
   */
  async getBalance(req: Request, res: Response) {
    try {
      const { userId } = req.params;
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
}

export default new PTOController();
