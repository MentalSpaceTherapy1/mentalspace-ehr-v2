import { Request, Response } from 'express';
import timeAttendanceService from '../services/time-attendance.service';
import { AbsenceType } from '@prisma/client';

export class TimeAttendanceController {
  /**
   * Create a time attendance record
   * POST /api/time-attendance
   */
  async createRecord(req: Request, res: Response) {
    try {
      const record = await timeAttendanceService.createRecord(req.body);
      res.status(201).json({
        success: true,
        data: record,
        message: 'Attendance record created successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create attendance record',
      });
    }
  }

  /**
   * Clock in (start time)
   * POST /api/time-attendance/clock-in
   */
  async clockIn(req: Request, res: Response) {
    try {
      const { userId, employeeId } = req.body;
      const actualStart = new Date();

      const record = await timeAttendanceService.clockIn({
        userId: userId || employeeId,
        actualStart,
      });

      res.status(200).json({
        success: true,
        data: record,
        message: 'Clocked in successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to clock in',
      });
    }
  }

  /**
   * Clock out (end time)
   * POST /api/time-attendance/clock-out
   */
  async clockOut(req: Request, res: Response) {
    try {
      const { userId, employeeId, breakMinutes } = req.body;
      const actualEnd = new Date();

      const record = await timeAttendanceService.clockOut({
        userId: userId || employeeId,
        actualEnd,
        breakMinutes,
      });

      res.status(200).json({
        success: true,
        data: record,
        message: 'Clocked out successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to clock out',
      });
    }
  }

  /**
   * Start break
   * POST /api/time-attendance/break-start
   */
  async startBreak(req: Request, res: Response) {
    try {
      const { userId, employeeId } = req.body;
      const targetUserId = userId || employeeId;

      // For now, just return a success response - break tracking can be enhanced later
      res.status(200).json({
        success: true,
        data: { userId: targetUserId, breakStarted: new Date() },
        message: 'Break started successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to start break',
      });
    }
  }

  /**
   * End break
   * POST /api/time-attendance/break-end
   */
  async endBreak(req: Request, res: Response) {
    try {
      const { userId, employeeId } = req.body;
      const targetUserId = userId || employeeId;

      // For now, just return a success response - break tracking can be enhanced later
      res.status(200).json({
        success: true,
        data: { userId: targetUserId, breakEnded: new Date() },
        message: 'Break ended successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to end break',
      });
    }
  }

  /**
   * Get current clock status for a user
   * GET /api/time-attendance/current/:userId
   */
  async getCurrentStatus(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      // Get the most recent record for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result = await timeAttendanceService.getAllRecords({
        userId,
        startDate: today,
        endDate: new Date(),
        limit: 1,
      });

      const currentRecord = result.records[0];

      let status = 'CLOCKED_OUT';
      if (currentRecord) {
        if (!currentRecord.actualEnd) {
          status = 'CLOCKED_IN';
        }
      }

      res.status(200).json({
        success: true,
        data: {
          status,
          currentRecord: currentRecord || null,
          clockedIn: status === 'CLOCKED_IN',
          lastClockIn: currentRecord?.actualStart || null,
          lastClockOut: currentRecord?.actualEnd || null,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get current status',
      });
    }
  }

  /**
   * Export attendance records
   * GET /api/time-attendance/export
   */
  async exportAttendance(req: Request, res: Response) {
    try {
      const { userId, startDate, endDate, format } = req.query;

      const filters: any = {};
      if (userId) filters.userId = userId as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const result = await timeAttendanceService.getAllRecords(filters);

      // For now, return JSON data - CSV/Excel export can be enhanced later
      res.status(200).json({
        success: true,
        data: result.records,
        format: format || 'json',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to export attendance',
      });
    }
  }

  /**
   * Get all attendance records with filters
   * GET /api/time-attendance
   */
  async getAllRecords(req: Request, res: Response) {
    try {
      const {
        userId,
        startDate,
        endDate,
        isAbsent,
        absenceType,
        approved,
        page,
        limit,
      } = req.query;

      const filters: any = {};

      if (userId) filters.userId = userId as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (isAbsent !== undefined) filters.isAbsent = isAbsent === 'true';
      if (absenceType) filters.absenceType = absenceType as AbsenceType;
      if (approved !== undefined) filters.approved = approved === 'true';
      if (page) filters.page = parseInt(page as string);
      if (limit) filters.limit = parseInt(limit as string);

      const result = await timeAttendanceService.getAllRecords(filters);
      res.status(200).json({
        success: true,
        data: result.records,
        pagination: result.pagination,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch attendance records',
      });
    }
  }

  /**
   * Get a single attendance record by ID
   * GET /api/time-attendance/:id
   */
  async getRecordById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const record = await timeAttendanceService.getRecordById(id);
      res.status(200).json({
        success: true,
        data: record,
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'Attendance record not found',
      });
    }
  }

  /**
   * Update an attendance record
   * PUT /api/time-attendance/:id
   */
  async updateRecord(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const record = await timeAttendanceService.updateRecord(id, req.body);
      res.status(200).json({
        success: true,
        data: record,
        message: 'Attendance record updated successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update attendance record',
      });
    }
  }

  /**
   * Approve an attendance record
   * POST /api/time-attendance/:id/approve
   */
  async approveRecord(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { approvedById } = req.body;

      const record = await timeAttendanceService.approveRecord(id, { approvedById });
      res.status(200).json({
        success: true,
        data: record,
        message: 'Attendance record approved successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to approve attendance record',
      });
    }
  }

  /**
   * Delete an attendance record
   * DELETE /api/time-attendance/:id
   */
  async deleteRecord(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await timeAttendanceService.deleteRecord(id);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to delete attendance record',
      });
    }
  }

  /**
   * Get attendance summary for a user
   * GET /api/time-attendance/summary/:userId
   */
  async getUserAttendanceSummary(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const summary = await timeAttendanceService.getUserAttendanceSummary(
        userId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch attendance summary',
      });
    }
  }

  /**
   * Get pending approvals
   * GET /api/time-attendance/pending-approvals
   */
  async getPendingApprovals(req: Request, res: Response) {
    try {
      const records = await timeAttendanceService.getPendingApprovals();
      res.status(200).json({
        success: true,
        data: records,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch pending approvals',
      });
    }
  }

  /**
   * Bulk approve attendance records
   * POST /api/time-attendance/bulk-approve
   */
  async bulkApprove(req: Request, res: Response) {
    try {
      const { recordIds, approvedById } = req.body;

      if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Record IDs array is required',
        });
      }

      const result = await timeAttendanceService.bulkApprove(recordIds, approvedById);
      res.status(200).json({
        success: true,
        message: result.message,
        data: { count: result.count },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to bulk approve records',
      });
    }
  }

  /**
   * Get attendance statistics
   * GET /api/time-attendance/statistics
   */
  async getStatistics(req: Request, res: Response) {
    try {
      const { userId, startDate, endDate } = req.query;

      const filters: any = {};
      if (userId) filters.userId = userId as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const stats = await timeAttendanceService.getAttendanceStatistics(filters);
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

export default new TimeAttendanceController();
