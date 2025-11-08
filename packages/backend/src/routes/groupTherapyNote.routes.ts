import express from 'express';
import {
  createGroupTherapyNote,
  updateGroupAttendance,
  getGroupAttendance,
  getGroupMembers,
} from '../controllers/groupTherapyNote.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

/**
 * @route POST /api/v1/group-therapy-notes
 * @desc Create a group therapy session note with attendance tracking
 * @access Private
 */
router.post('/', authenticate, createGroupTherapyNote);

/**
 * @route PUT /api/v1/group-therapy-notes/:noteId/attendance
 * @desc Update attendance for a group therapy session
 * @access Private
 */
router.put('/:noteId/attendance', authenticate, updateGroupAttendance);

/**
 * @route GET /api/v1/group-therapy-notes/appointment/:appointmentId/attendance
 * @desc Get attendance records for a specific appointment
 * @access Private
 */
router.get('/appointment/:appointmentId/attendance', authenticate, getGroupAttendance);

/**
 * @route GET /api/v1/group-therapy-notes/group/:groupId/members
 * @desc Get active members for a group session
 * @access Private
 */
router.get('/group/:groupId/members', authenticate, getGroupMembers);

export default router;
