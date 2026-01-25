import { Request, Response } from 'express';
import timeAttendanceService from '../services/time-attendance.service';
import { AbsenceType } from '@prisma/client';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound, sendServerError, sendPaginated, calculatePagination } from '../utils/apiResponse';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';

// ============================================================================
// TYPE DEFINITIONS FOR PHASE 5.4
// ============================================================================

/**
 * Filter type for attendance record queries
 */
interface AttendanceFilters {
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  type?: string;
  status?: string;
  isAbsent?: boolean;
  absenceType?: AbsenceType;
  approved?: boolean;
  page?: number;
  limit?: number;
}

export class TimeAttendanceController {
  /**
   * Create a time attendance record
   * POST /api/time-attendance
   */
  async createRecord(req: Request, res: Response) {
    try {
      const record = await timeAttendanceService.createRecord(req.body);
      return sendCreated(res, record, 'Attendance record created successfully');
    } catch (error) {
      return sendBadRequest(res, getErrorMessage(error) || 'Failed to create attendance record');
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

      return sendSuccess(res, record, 'Clocked in successfully');
    } catch (error) {
      return sendBadRequest(res, getErrorMessage(error) || 'Failed to clock in');
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

      return sendSuccess(res, record, 'Clocked out successfully');
    } catch (error) {
      return sendBadRequest(res, getErrorMessage(error) || 'Failed to clock out');
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
      return sendSuccess(res, { userId: targetUserId, breakStarted: new Date() }, 'Break started successfully');
    } catch (error) {
      return sendBadRequest(res, getErrorMessage(error) || 'Failed to start break');
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
      return sendSuccess(res, { userId: targetUserId, breakEnded: new Date() }, 'Break ended successfully');
    } catch (error) {
      return sendBadRequest(res, getErrorMessage(error) || 'Failed to end break');
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

      return sendSuccess(res, {
        status,
        currentRecord: currentRecord || null,
        clockedIn: status === 'CLOCKED_IN',
        lastClockIn: currentRecord?.actualStart || null,
        lastClockOut: currentRecord?.actualEnd || null,
      });
    } catch (error) {
      return sendServerError(res, getErrorMessage(error) || 'Failed to get current status');
    }
  }

  /**
   * Export attendance records
   * GET /api/time-attendance/export
   */
  async exportAttendance(req: Request, res: Response) {
    try {
      const { userId, startDate, endDate, format } = req.query;

      const filters: AttendanceFilters = {};
      if (userId) filters.userId = userId as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const result = await timeAttendanceService.getAllRecords(filters);

      // For now, return JSON data - CSV/Excel export can be enhanced later
      return sendSuccess(res, { records: result.records, format: format || 'json' });
    } catch (error) {
      return sendServerError(res, getErrorMessage(error) || 'Failed to export attendance');
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

      const filters: AttendanceFilters = {};

      if (userId) filters.userId = userId as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (isAbsent !== undefined) filters.isAbsent = isAbsent === 'true';
      if (absenceType) filters.absenceType = absenceType as AbsenceType;
      if (approved !== undefined) filters.approved = approved === 'true';
      if (page) filters.page = parseInt(page as string);
      if (limit) filters.limit = parseInt(limit as string);

      const result = await timeAttendanceService.getAllRecords(filters);
      return sendSuccess(res, { data: result.records, pagination: result.pagination });
    } catch (error) {
      return sendServerError(res, getErrorMessage(error) || 'Failed to fetch attendance records');
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
      return sendSuccess(res, record);
    } catch (error) {
      return sendNotFound(res, 'Attendance record');
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
      return sendSuccess(res, record, 'Attendance record updated successfully');
    } catch (error) {
      return sendBadRequest(res, getErrorMessage(error) || 'Failed to update attendance record');
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
      return sendSuccess(res, record, 'Attendance record approved successfully');
    } catch (error) {
      return sendBadRequest(res, getErrorMessage(error) || 'Failed to approve attendance record');
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
      return sendSuccess(res, null, result.message);
    } catch (error) {
      return sendBadRequest(res, getErrorMessage(error) || 'Failed to delete attendance record');
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
        return sendBadRequest(res, 'Start date and end date are required');
      }

      const summary = await timeAttendanceService.getUserAttendanceSummary(
        userId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      return sendSuccess(res, summary);
    } catch (error) {
      return sendServerError(res, getErrorMessage(error) || 'Failed to fetch attendance summary');
    }
  }

  /**
   * Get pending approvals
   * GET /api/time-attendance/pending-approvals
   */
  async getPendingApprovals(req: Request, res: Response) {
    try {
      const records = await timeAttendanceService.getPendingApprovals();
      return sendSuccess(res, records);
    } catch (error) {
      return sendServerError(res, getErrorMessage(error) || 'Failed to fetch pending approvals');
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
        return sendBadRequest(res, 'Record IDs array is required');
      }

      const result = await timeAttendanceService.bulkApprove(recordIds, approvedById);
      return sendSuccess(res, { count: result.count }, result.message);
    } catch (error) {
      return sendBadRequest(res, getErrorMessage(error) || 'Failed to bulk approve records');
    }
  }

  /**
   * Get attendance statistics
   * GET /api/time-attendance/statistics
   */
  async getStatistics(req: Request, res: Response) {
    try {
      const { userId, startDate, endDate } = req.query;

      const filters: AttendanceFilters = {};
      if (userId) filters.userId = userId as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const stats = await timeAttendanceService.getAttendanceStatistics(filters);
      return sendSuccess(res, stats);
    } catch (error) {
      return sendServerError(res, getErrorMessage(error) || 'Failed to fetch statistics');
    }
  }
}

export default new TimeAttendanceController();
