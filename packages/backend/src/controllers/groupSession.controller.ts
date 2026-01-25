import { Request, Response } from 'express';
import * as GroupSessionService from '../services/groupSession.service';
import * as GroupMemberService from '../services/groupMember.service';
import logger from '../utils/logger';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound, sendServerError } from '../utils/apiResponse';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';

/**
 * Module 3 Phase 2.1: Group Session Controller
 * Manages group therapy sessions, members, and attendance
 */

/**
 * GET /api/v1/group-sessions
 * List all group sessions with optional filters
 */
export const getAllGroupSessions = async (req: Request, res: Response) => {
  try {
    const filters = {
      facilitatorId: req.query.facilitatorId as string | undefined,
      groupType: req.query.groupType as string | undefined,
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
      includeArchived: req.query.includeArchived === 'true',
    };

    const groupSessions = await GroupSessionService.getAllGroupSessions(filters);

    return sendSuccess(res, { data: groupSessions, total: groupSessions.length });
  } catch (error) {
    logger.error('Error fetching group sessions', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to fetch group sessions');
  }
};

/**
 * GET /api/v1/group-sessions/active
 * Get only active group sessions
 */
export const getActiveGroupSessions = async (req: Request, res: Response) => {
  try {
    const groupSessions = await GroupSessionService.getActiveGroupSessions();

    return sendSuccess(res, { data: groupSessions, total: groupSessions.length });
  } catch (error) {
    logger.error('Error fetching active group sessions', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to fetch active group sessions');
  }
};

/**
 * GET /api/v1/group-sessions/:id
 * Get a specific group session by ID
 */
export const getGroupSessionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const groupSession = await GroupSessionService.getGroupSessionById(id);

    if (!groupSession) {
      return sendNotFound(res, 'Group session');
    }

    return sendSuccess(res, groupSession);
  } catch (error) {
    logger.error('Error fetching group session', {
      error: getErrorMessage(error),
      groupSessionId: req.params.id,
    });
    return sendServerError(res, 'Failed to fetch group session');
  }
};

/**
 * POST /api/v1/group-sessions
 * Create a new group session
 */
export const createGroupSession = async (req: Request, res: Response) => {
  try {
    const groupSession = await GroupSessionService.createGroupSession(req.body);

    logger.info('Group session created', {
      groupSessionId: groupSession.id,
      groupName: groupSession.groupName,
      createdBy: req.user?.id,
    });

    return sendCreated(res, groupSession, 'Group session created successfully');
  } catch (error) {
    logger.error('Error creating group session', {
      error: getErrorMessage(error),
      body: req.body,
    });
    return sendBadRequest(res, getErrorMessage(error) || 'Failed to create group session');
  }
};

/**
 * PUT /api/v1/group-sessions/:id
 * Update a group session
 */
export const updateGroupSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const groupSession = await GroupSessionService.updateGroupSession(id, req.body);

    logger.info('Group session updated', {
      groupSessionId: id,
      updatedBy: req.user?.id,
    });

    return sendSuccess(res, groupSession, 'Group session updated successfully');
  } catch (error) {
    logger.error('Error updating group session', {
      error: getErrorMessage(error),
      groupSessionId: req.params.id,
    });
    return sendBadRequest(res, getErrorMessage(error) || 'Failed to update group session');
  }
};

/**
 * DELETE /api/v1/group-sessions/:id
 * Delete a group session (soft delete)
 */
export const deleteGroupSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const groupSession = await GroupSessionService.deleteGroupSession(id);

    logger.info('Group session deleted', {
      groupSessionId: id,
      deletedBy: req.user?.id,
    });

    return sendSuccess(res, groupSession, 'Group session deleted successfully');
  } catch (error) {
    logger.error('Error deleting group session', {
      error: getErrorMessage(error),
      groupSessionId: req.params.id,
    });
    return sendBadRequest(res, getErrorMessage(error) || 'Failed to delete group session');
  }
};

/**
 * POST /api/v1/group-sessions/:id/generate-sessions
 * Generate recurring appointments for a group session
 *
 * @requires Authentication - Valid user ID must be present in request
 * @param {string} req.params.id - Group session ID
 * @param {string} req.body.startDate - ISO date string for start of generation period
 * @param {string} req.body.endDate - ISO date string for end of generation period
 * @returns {Object} Array of created appointments with count
 */
export const generateRecurringSessions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.body;
    const userId = req.user?.id;

    // Validate authentication - never use 'system' fallback for audit trail integrity
    if (!userId) {
      logger.warn('Attempted to generate recurring sessions without authentication', {
        groupSessionId: id,
        ip: req.ip,
      });
      return sendUnauthorized(res, 'Authentication required. Please log in to generate recurring sessions.');
    }

    if (!startDate || !endDate) {
      return sendBadRequest(res, 'Start date and end date are required');
    }

    const appointments = await GroupSessionService.generateRecurringSessions({
      groupSessionId: id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      createdBy: userId,
    });

    logger.info('Recurring sessions generated', {
      groupSessionId: id,
      appointmentsCreated: appointments.length,
      createdBy: req.user?.id,
    });

    return sendSuccess(res, { data: appointments, total: appointments.length }, `Generated ${appointments.length} recurring sessions`);
  } catch (error) {
    logger.error('Error generating recurring sessions', {
      error: getErrorMessage(error),
      groupSessionId: req.params.id,
    });
    return sendBadRequest(res, getErrorMessage(error) || 'Failed to generate recurring sessions');
  }
};

/**
 * GET /api/v1/group-sessions/stats
 * Get group session statistics
 */
export const getGroupSessionStats = async (req: Request, res: Response) => {
  try {
    const stats = await GroupSessionService.getGroupSessionStats();

    return sendSuccess(res, stats);
  } catch (error) {
    logger.error('Error fetching group session stats', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to fetch group session statistics');
  }
};

// ============================================================================
// GROUP MEMBER ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/group-sessions/:id/members
 * Get all members of a group session
 */
export const getGroupMembers = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const members = await GroupMemberService.getMembersByGroup(id);

    return sendSuccess(res, { data: members, total: members.length });
  } catch (error) {
    logger.error('Error fetching group members', {
      error: getErrorMessage(error),
      groupSessionId: req.params.id,
    });
    return sendServerError(res, 'Failed to fetch group members');
  }
};

/**
 * POST /api/v1/group-sessions/:id/members
 * Enroll a member in a group session
 */
export const enrollMember = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const member = await GroupMemberService.enrollMember({
      groupId: id,
      ...req.body,
    });

    logger.info('Member enrolled in group session', {
      groupSessionId: id,
      memberId: member.id,
      clientId: member.clientId,
      enrolledBy: req.user?.id,
    });

    return sendCreated(res, member, 'Member enrolled successfully');
  } catch (error) {
    logger.error('Error enrolling member', {
      error: getErrorMessage(error),
      groupSessionId: req.params.id,
    });
    return sendBadRequest(res, getErrorMessage(error) || 'Failed to enroll member');
  }
};

/**
 * PUT /api/v1/group-sessions/members/:memberId
 * Update a group member
 */
export const updateMember = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;

    const member = await GroupMemberService.updateMember(memberId, req.body);

    logger.info('Group member updated', {
      memberId,
      updatedBy: req.user?.id,
    });

    return sendSuccess(res, member, 'Member updated successfully');
  } catch (error) {
    logger.error('Error updating member', {
      error: getErrorMessage(error),
      memberId: req.params.memberId,
    });
    return sendBadRequest(res, getErrorMessage(error) || 'Failed to update member');
  }
};

/**
 * DELETE /api/v1/group-sessions/members/:memberId
 * Remove a member from a group session
 */
export const removeMember = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const { exitReason } = req.body;

    const member = await GroupMemberService.removeMember(memberId, exitReason);

    logger.info('Member removed from group session', {
      memberId,
      removedBy: req.user?.id,
    });

    return sendSuccess(res, member, 'Member removed successfully');
  } catch (error) {
    logger.error('Error removing member', {
      error: getErrorMessage(error),
      memberId: req.params.memberId,
    });
    return sendBadRequest(res, getErrorMessage(error) || 'Failed to remove member');
  }
};

/**
 * GET /api/v1/group-sessions/members/:memberId
 * Get a specific group member by ID
 */
export const getMemberById = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;

    const member = await GroupMemberService.getMemberById(memberId);

    if (!member) {
      return sendNotFound(res, 'Group member');
    }

    return sendSuccess(res, member);
  } catch (error) {
    logger.error('Error fetching group member', {
      error: getErrorMessage(error),
      memberId: req.params.memberId,
    });
    return sendServerError(res, 'Failed to fetch group member');
  }
};

// ============================================================================
// ATTENDANCE ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/group-sessions/attendance
 * Mark attendance for a member at a session
 */
export const markAttendance = async (req: Request, res: Response) => {
  try {
    const attendance = await GroupMemberService.markAttendance(req.body);

    logger.info('Attendance marked', {
      attendanceId: attendance.id,
      groupMemberId: attendance.groupMemberId,
      appointmentId: attendance.appointmentId,
      attended: attendance.attended,
      markedBy: req.user?.id,
    });

    return sendSuccess(res, attendance, 'Attendance marked successfully');
  } catch (error) {
    logger.error('Error marking attendance', {
      error: getErrorMessage(error),
      body: req.body,
    });
    return sendBadRequest(res, getErrorMessage(error) || 'Failed to mark attendance');
  }
};

/**
 * POST /api/v1/group-sessions/attendance/batch
 * Mark attendance for multiple members at once
 */
export const markBatchAttendance = async (req: Request, res: Response) => {
  try {
    const attendanceRecords = await GroupMemberService.markBatchAttendance(req.body);

    logger.info('Batch attendance marked', {
      appointmentId: req.body.appointmentId,
      recordsCreated: attendanceRecords.length,
      markedBy: req.user?.id,
    });

    return sendSuccess(res, { data: attendanceRecords, total: attendanceRecords.length }, `Attendance marked for ${attendanceRecords.length} members`);
  } catch (error) {
    logger.error('Error marking batch attendance', {
      error: getErrorMessage(error),
      body: req.body,
    });
    return sendBadRequest(res, getErrorMessage(error) || 'Failed to mark batch attendance');
  }
};

/**
 * GET /api/v1/group-sessions/appointments/:appointmentId/attendance
 * Get attendance for a specific appointment
 */
export const getAttendanceByAppointment = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;

    const attendance = await GroupMemberService.getAttendanceByAppointment(appointmentId);

    return sendSuccess(res, { data: attendance, total: attendance.length });
  } catch (error) {
    logger.error('Error fetching attendance by appointment', {
      error: getErrorMessage(error),
      appointmentId: req.params.appointmentId,
    });
    return sendServerError(res, 'Failed to fetch attendance');
  }
};

/**
 * GET /api/v1/group-sessions/members/:memberId/attendance
 * Get attendance history for a member
 */
export const getAttendanceByMember = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;

    const attendance = await GroupMemberService.getAttendanceByMember(memberId);

    return sendSuccess(res, { data: attendance, total: attendance.length });
  } catch (error) {
    logger.error('Error fetching attendance by member', {
      error: getErrorMessage(error),
      memberId: req.params.memberId,
    });
    return sendServerError(res, 'Failed to fetch attendance');
  }
};

/**
 * GET /api/v1/group-sessions/members/stats
 * Get member statistics
 */
export const getMemberStats = async (req: Request, res: Response) => {
  try {
    const groupId = req.query.groupId as string | undefined;
    const stats = await GroupMemberService.getMemberStats(groupId);

    return sendSuccess(res, stats);
  } catch (error) {
    logger.error('Error fetching member stats', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to fetch member statistics');
  }
};
