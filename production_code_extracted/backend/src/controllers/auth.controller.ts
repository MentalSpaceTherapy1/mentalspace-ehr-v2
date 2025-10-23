import { Request, Response } from 'express';
import authService from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';

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
   * Login user
   * POST /api/v1/auth/login
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const ipAddress = req.ip;
    const result = await authService.login(req.body, ipAddress);

    res.status(200).json({
      success: true,
      message: 'Login successful',
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
   * Logout user
   * POST /api/v1/auth/logout
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    // In a stateless JWT setup, logout is typically handled client-side
    // by removing the token. Here we just return success.
    // In future, we could implement token blacklisting if needed.

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
