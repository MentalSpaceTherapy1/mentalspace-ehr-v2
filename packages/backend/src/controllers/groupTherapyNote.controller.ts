import { Request, Response } from 'express';
import * as groupTherapyNoteService from '../services/groupTherapyNote.service';
import logger from '../utils/logger';
import { sendSuccess, sendCreated, sendBadRequest, sendServerError } from '../utils/apiResponse';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';

/**
 * Create a group therapy session note with attendance
 * POST /api/v1/group-therapy-notes
 */
export const createGroupTherapyNote = async (req: Request, res: Response) => {
  try {
    const { groupId, appointmentId, sessionDate, duration, attendance, ...noteData } = req.body;

    // groupId is optional for ad-hoc groups
    if (!appointmentId || !attendance || !Array.isArray(attendance)) {
      return sendBadRequest(res, 'appointmentId and attendance array are required');
    }

    const result = await groupTherapyNoteService.createGroupTherapyNote({
      groupId: groupId || undefined,
      appointmentId,
      facilitatorId: req.user!.id,
      sessionDate: new Date(sessionDate),
      duration,
      attendance,
      ...noteData,
    });

    return sendCreated(res, result, 'Group therapy note created successfully');
  } catch (error) {
    logger.error('Error creating group therapy note', {
      error: getErrorMessage(error),
    });

    return sendServerError(res, getErrorMessage(error) || 'Failed to create group therapy note');
  }
};

/**
 * Update attendance for a group therapy session
 * PUT /api/v1/group-therapy-notes/:noteId/attendance
 */
export const updateGroupAttendance = async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    const { attendance } = req.body;

    if (!attendance || !Array.isArray(attendance)) {
      return sendBadRequest(res, 'attendance array is required');
    }

    const result = await groupTherapyNoteService.updateGroupAttendance({
      noteId,
      attendance,
    });

    return sendSuccess(res, result, 'Attendance updated successfully');
  } catch (error) {
    logger.error('Error updating group attendance', {
      error: getErrorMessage(error),
      noteId: req.params.noteId,
    });

    return sendServerError(res, getErrorMessage(error) || 'Failed to update attendance');
  }
};

/**
 * Get attendance records for a group therapy session
 * GET /api/v1/group-therapy-notes/appointment/:appointmentId/attendance
 */
export const getGroupAttendance = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;

    const attendance = await groupTherapyNoteService.getGroupAttendance(appointmentId);

    return sendSuccess(res, attendance, `Retrieved ${attendance.length} attendance records`);
  } catch (error) {
    logger.error('Error getting group attendance', {
      error: getErrorMessage(error),
      appointmentId: req.params.appointmentId,
    });

    return sendServerError(res, getErrorMessage(error) || 'Failed to retrieve attendance');
  }
};

/**
 * Get active members for a group session
 * GET /api/v1/group-therapy-notes/group/:groupId/members
 */
export const getGroupMembers = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;

    const members = await groupTherapyNoteService.getGroupMembers(groupId);

    return sendSuccess(res, members, `Retrieved ${members.length} active group members`);
  } catch (error) {
    logger.error('Error getting group members', {
      error: getErrorMessage(error),
      groupId: req.params.groupId,
    });

    return sendServerError(res, getErrorMessage(error) || 'Failed to retrieve group members');
  }
};
