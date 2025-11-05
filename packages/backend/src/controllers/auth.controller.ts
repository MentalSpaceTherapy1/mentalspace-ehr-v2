import { Request, Response } from 'express';
import authService from '../services/auth.service';
import sessionService from '../services/session.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../utils/errors';

export class AuthController {
  /**
   * Register a new user
   * POST /api/v1/auth/register
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result,
    });
  });

  /**
   * Login user with enhanced security (session + optional MFA)
   * POST /api/v1/auth/login
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';
    const result = await authService.login(req.body, ipAddress, userAgent);

    // Check if MFA is required
    if (result.requiresMfa) {
      res.status(200).json({
        success: true,
        message: 'MFA verification required',
        requiresMfa: true,
        tempToken: result.tempToken,
        user: result.user,
      });
    } else {
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    }
  });

  /**
   * Complete MFA login step
   * POST /api/v1/auth/mfa/verify
   */
  completeMFALogin = asyncHandler(async (req: Request, res: Response) => {
    const { userId, mfaCode } = req.body;
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    if (!userId || !mfaCode) {
      throw new ValidationError('User ID and MFA code are required');
    }

    const result = await authService.completeMFALogin(userId, mfaCode, ipAddress, userAgent);

    res.status(200).json({
      success: true,
      message: 'MFA verification successful',
      data: result,
    });
  });

  /**
   * Get current user profile
   * GET /api/v1/auth/me
   */
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const user = await authService.getProfile(userId);

    res.status(200).json({
      success: true,
      data: user,
    });
  });

  /**
   * Change password
   * POST /api/v1/auth/change-password
   */
  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    const result = await authService.changePassword(userId, currentPassword, newPassword);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  /**
   * Logout user (terminate current session)
   * POST /api/v1/auth/logout
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    const sessionId = req.session?.sessionId;

    if (sessionId) {
      await sessionService.terminateSession(sessionId);
    }

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  });

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  refresh = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    const result = await authService.refreshToken(refreshToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: result,
    });
  });
}

export default new AuthController();
