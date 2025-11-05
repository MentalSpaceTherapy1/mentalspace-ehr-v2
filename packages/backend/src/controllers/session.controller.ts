import { Request, Response } from 'express';
import sessionService from '../services/session.service';
import { asyncHandler } from '../utils/asyncHandler';
import { UnauthorizedError } from '../utils/errors';

/**
 * Session Management Controller
 *
 * Handles session management endpoints:
 * - Extend session
 * - Logout (terminate single session)
 * - Logout all devices (terminate all sessions)
 * - List active sessions
 */

export class SessionController {
  /**
   * POST /api/v1/sessions/extend
   * Extend the current session expiration
   */
  extendSession = asyncHandler(async (req: Request, res: Response) => {
    const sessionId = req.session?.sessionId;

    if (!sessionId) {
      throw new UnauthorizedError('No active session found');
    }

    await sessionService.extendSession(sessionId);

    res.status(200).json({
      success: true,
      message: 'Session extended successfully',
    });
  });

  /**
   * DELETE /api/v1/sessions/:id
   * Terminate a specific session (logout)
   */
  terminateSession = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    // Verify session belongs to the user
    const sessions = await sessionService.getUserSessions(userId);
    const sessionToTerminate = sessions.find((s) => s.id === id);

    if (!sessionToTerminate) {
      throw new UnauthorizedError('Session not found or does not belong to you');
    }

    await sessionService.terminateSession(id);

    res.status(200).json({
      success: true,
      message: 'Session terminated successfully',
    });
  });

  /**
   * DELETE /api/v1/sessions/all
   * Terminate all sessions for the current user (logout all devices)
   */
  terminateAllSessions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const count = await sessionService.terminateAllUserSessions(userId);

    res.status(200).json({
      success: true,
      message: `${count} session(s) terminated successfully`,
      count,
    });
  });

  /**
   * GET /api/v1/sessions
   * List all active sessions for the current user
   */
  listSessions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const currentSessionId = req.session?.sessionId;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const sessions = await sessionService.getUserSessions(userId);

    // Mark the current session
    const sessionsWithCurrentFlag = sessions.map((session) => ({
      ...session,
      isCurrent: session.id === currentSessionId,
    }));

    res.status(200).json({
      success: true,
      data: sessionsWithCurrentFlag,
      count: sessions.length,
    });
  });
}

export default new SessionController();
