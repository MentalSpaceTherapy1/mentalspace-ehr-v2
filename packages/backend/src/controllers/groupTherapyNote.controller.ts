import { Request, Response } from 'express';
import * as groupTherapyNoteService from '../services/groupTherapyNote.service';
import logger from '../utils/logger';

/**
 * Create a group therapy session note with attendance
 * POST /api/v1/group-therapy-notes
 */
export const createGroupTherapyNote = async (req: Request, res: Response) => {
  try {
    const { groupId, appointmentId, sessionDate, duration, attendance, ...noteData } = req.body;

    // groupId is optional for ad-hoc groups
    if (!appointmentId || !attendance || !Array.isArray(attendance)) {
      return res.status(400).json({
        success: false,
        message: 'appointmentId and attendance array are required',
      });
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

    res.status(201).json({
      success: true,
      data: result,
      message: 'Group therapy note created successfully',
    });
  } catch (error: any) {
    logger.error('Error creating group therapy note', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create group therapy note',
    });
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
      return res.status(400).json({
        success: false,
        message: 'attendance array is required',
      });
    }

    const result = await groupTherapyNoteService.updateGroupAttendance({
      noteId,
      attendance,
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'Attendance updated successfully',
    });
  } catch (error: any) {
    logger.error('Error updating group attendance', {
      error: error.message,
      noteId: req.params.noteId,
    });

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update attendance',
    });
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

    res.status(200).json({
      success: true,
      data: attendance,
      message: `Retrieved ${attendance.length} attendance records`,
    });
  } catch (error: any) {
    logger.error('Error getting group attendance', {
      error: error.message,
      appointmentId: req.params.appointmentId,
    });

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve attendance',
    });
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

    res.status(200).json({
      success: true,
      data: members,
      message: `Retrieved ${members.length} active group members`,
    });
  } catch (error: any) {
    logger.error('Error getting group members', {
      error: error.message,
      groupId: req.params.groupId,
    });

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve group members',
    });
  }
};
