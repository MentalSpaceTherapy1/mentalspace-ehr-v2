import { Request, Response } from 'express';
import * as GroupSessionService from '../services/groupSession.service';
import * as GroupMemberService from '../services/groupMember.service';
import logger from '../utils/logger';

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

    return res.json({
      success: true,
      data: groupSessions,
      total: groupSessions.length,
    });
  } catch (error: any) {
    logger.error('Error fetching group sessions', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch group sessions',
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/group-sessions/active
 * Get only active group sessions
 */
export const getActiveGroupSessions = async (req: Request, res: Response) => {
  try {
    const groupSessions = await GroupSessionService.getActiveGroupSessions();

    return res.json({
      success: true,
      data: groupSessions,
      total: groupSessions.length,
    });
  } catch (error: any) {
    logger.error('Error fetching active group sessions', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch active group sessions',
      error: error.message,
    });
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
      return res.status(404).json({
        success: false,
        message: 'Group session not found',
      });
    }

    return res.json({
      success: true,
      data: groupSession,
    });
  } catch (error: any) {
    logger.error('Error fetching group session', {
      error: error.message,
      groupSessionId: req.params.id,
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch group session',
      error: error.message,
    });
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

    return res.status(201).json({
      success: true,
      message: 'Group session created successfully',
      data: groupSession,
    });
  } catch (error: any) {
    logger.error('Error creating group session', {
      error: error.message,
      body: req.body,
    });
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to create group session',
      error: error.message,
    });
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

    return res.json({
      success: true,
      message: 'Group session updated successfully',
      data: groupSession,
    });
  } catch (error: any) {
    logger.error('Error updating group session', {
      error: error.message,
      groupSessionId: req.params.id,
    });
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to update group session',
      error: error.message,
    });
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

    return res.json({
      success: true,
      message: 'Group session deleted successfully',
      data: groupSession,
    });
  } catch (error: any) {
    logger.error('Error deleting group session', {
      error: error.message,
      groupSessionId: req.params.id,
    });
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete group session',
      error: error.message,
    });
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
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to generate recurring sessions.',
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
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

    return res.json({
      success: true,
      message: `Generated ${appointments.length} recurring sessions`,
      data: appointments,
      total: appointments.length,
    });
  } catch (error: any) {
    logger.error('Error generating recurring sessions', {
      error: error.message,
      groupSessionId: req.params.id,
    });
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to generate recurring sessions',
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/group-sessions/stats
 * Get group session statistics
 */
export const getGroupSessionStats = async (req: Request, res: Response) => {
  try {
    const stats = await GroupSessionService.getGroupSessionStats();

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Error fetching group session stats', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch group session statistics',
      error: error.message,
    });
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

    return res.json({
      success: true,
      data: members,
      total: members.length,
    });
  } catch (error: any) {
    logger.error('Error fetching group members', {
      error: error.message,
      groupSessionId: req.params.id,
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch group members',
      error: error.message,
    });
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

    return res.status(201).json({
      success: true,
      message: 'Member enrolled successfully',
      data: member,
    });
  } catch (error: any) {
    logger.error('Error enrolling member', {
      error: error.message,
      groupSessionId: req.params.id,
    });
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to enroll member',
      error: error.message,
    });
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

    return res.json({
      success: true,
      message: 'Member updated successfully',
      data: member,
    });
  } catch (error: any) {
    logger.error('Error updating member', {
      error: error.message,
      memberId: req.params.memberId,
    });
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to update member',
      error: error.message,
    });
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

    return res.json({
      success: true,
      message: 'Member removed successfully',
      data: member,
    });
  } catch (error: any) {
    logger.error('Error removing member', {
      error: error.message,
      memberId: req.params.memberId,
    });
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to remove member',
      error: error.message,
    });
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
      return res.status(404).json({
        success: false,
        message: 'Group member not found',
      });
    }

    return res.json({
      success: true,
      data: member,
    });
  } catch (error: any) {
    logger.error('Error fetching group member', {
      error: error.message,
      memberId: req.params.memberId,
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch group member',
      error: error.message,
    });
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

    return res.json({
      success: true,
      message: 'Attendance marked successfully',
      data: attendance,
    });
  } catch (error: any) {
    logger.error('Error marking attendance', {
      error: error.message,
      body: req.body,
    });
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to mark attendance',
      error: error.message,
    });
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

    return res.json({
      success: true,
      message: `Attendance marked for ${attendanceRecords.length} members`,
      data: attendanceRecords,
      total: attendanceRecords.length,
    });
  } catch (error: any) {
    logger.error('Error marking batch attendance', {
      error: error.message,
      body: req.body,
    });
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to mark batch attendance',
      error: error.message,
    });
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

    return res.json({
      success: true,
      data: attendance,
      total: attendance.length,
    });
  } catch (error: any) {
    logger.error('Error fetching attendance by appointment', {
      error: error.message,
      appointmentId: req.params.appointmentId,
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance',
      error: error.message,
    });
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

    return res.json({
      success: true,
      data: attendance,
      total: attendance.length,
    });
  } catch (error: any) {
    logger.error('Error fetching attendance by member', {
      error: error.message,
      memberId: req.params.memberId,
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance',
      error: error.message,
    });
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

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Error fetching member stats', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch member statistics',
      error: error.message,
    });
  }
};
