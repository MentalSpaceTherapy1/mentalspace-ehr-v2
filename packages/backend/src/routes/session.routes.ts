import { Router } from 'express';
import sessionController from '../controllers/session.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Session Management Routes
 * All routes require authentication
 */

/**
 * @route   POST /api/v1/sessions/extend
 * @desc    Extend current session expiration (reset inactivity timer)
 * @access  Private
 */
router.post('/extend', authenticate, sessionController.extendSession);

/**
 * @route   GET /api/v1/sessions
 * @desc    List all active sessions for current user
 * @access  Private
 */
router.get('/', authenticate, sessionController.listSessions);

/**
 * @route   DELETE /api/v1/sessions/all
 * @desc    Terminate all sessions (logout from all devices)
 * @access  Private
 */
router.delete('/all', authenticate, sessionController.terminateAllSessions);

/**
 * @route   DELETE /api/v1/sessions/:id
 * @desc    Terminate a specific session (logout single device)
 * @access  Private
 */
router.delete('/:id', authenticate, sessionController.terminateSession);

export default router;
