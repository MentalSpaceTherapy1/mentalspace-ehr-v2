import { Router } from 'express';
import * as groupSessionController from '../controllers/groupSession.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All group session routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/group-sessions/stats
 * Get group session statistics
 */
router.get('/stats', groupSessionController.getGroupSessionStats);

/**
 * GET /api/v1/group-sessions/members/stats
 * Get member statistics (optionally filtered by group)
 */
router.get('/members/stats', groupSessionController.getMemberStats);

/**
 * GET /api/v1/group-sessions/active
 * Get only active group sessions
 */
router.get('/active', groupSessionController.getActiveGroupSessions);

/**
 * GET /api/v1/group-sessions/appointments/:appointmentId/attendance
 * Get attendance for a specific appointment
 */
router.get(
  '/appointments/:appointmentId/attendance',
  groupSessionController.getAttendanceByAppointment
);

/**
 * POST /api/v1/group-sessions/attendance/batch
 * Mark attendance for multiple members at once
 */
router.post('/attendance/batch', groupSessionController.markBatchAttendance);

/**
 * POST /api/v1/group-sessions/attendance
 * Mark attendance for a member at a session
 */
router.post('/attendance', groupSessionController.markAttendance);

/**
 * GET /api/v1/group-sessions/members/:memberId/attendance
 * Get attendance history for a member
 */
router.get('/members/:memberId/attendance', groupSessionController.getAttendanceByMember);

/**
 * GET /api/v1/group-sessions/members/:memberId
 * Get a specific group member by ID
 */
router.get('/members/:memberId', groupSessionController.getMemberById);

/**
 * PUT /api/v1/group-sessions/members/:memberId
 * Update a group member
 */
router.put('/members/:memberId', groupSessionController.updateMember);

/**
 * DELETE /api/v1/group-sessions/members/:memberId
 * Remove a member from a group session
 */
router.delete('/members/:memberId', groupSessionController.removeMember);

/**
 * GET /api/v1/group-sessions/:id/members
 * Get all members of a group session
 */
router.get('/:id/members', groupSessionController.getGroupMembers);

/**
 * POST /api/v1/group-sessions/:id/members
 * Enroll a member in a group session
 */
router.post('/:id/members', groupSessionController.enrollMember);

/**
 * POST /api/v1/group-sessions/:id/generate-sessions
 * Generate recurring appointments for a group session
 */
router.post('/:id/generate-sessions', groupSessionController.generateRecurringSessions);

/**
 * GET /api/v1/group-sessions
 * List all group sessions with optional filters
 */
router.get('/', groupSessionController.getAllGroupSessions);

/**
 * GET /api/v1/group-sessions/:id
 * Get group session by ID
 */
router.get('/:id', groupSessionController.getGroupSessionById);

/**
 * POST /api/v1/group-sessions
 * Create new group session
 */
router.post('/', groupSessionController.createGroupSession);

/**
 * PUT /api/v1/group-sessions/:id
 * Update group session
 */
router.put('/:id', groupSessionController.updateGroupSession);

/**
 * DELETE /api/v1/group-sessions/:id
 * Delete group session (soft delete if has active members)
 */
router.delete('/:id', groupSessionController.deleteGroupSession);

export default router;
