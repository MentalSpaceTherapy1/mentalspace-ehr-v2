import { Request, Response, CookieOptions } from 'express';
import authService from '../services/auth.service';
import sessionService from '../services/session.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../utils/errors';
import config from '../config';

// Cookie names for auth tokens
const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

/**
 * Get cookie options for auth tokens
 * HIPAA Security: httpOnly cookies prevent XSS token theft
 */
const getAccessTokenCookieOptions = (): CookieOptions => ({
  ...config.cookieOptions,
  maxAge: config.accessTokenCookieMaxAge,
});

const getRefreshTokenCookieOptions = (): CookieOptions => ({
  ...config.cookieOptions,
  maxAge: config.refreshTokenCookieMaxAge,
});

/**
 * Set auth tokens as httpOnly cookies
 * @param res - Express response object
 * @param tokens - Object containing accessToken and refreshToken
 */
const setAuthCookies = (res: Response, tokens: { accessToken: string; refreshToken: string }) => {
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, getAccessTokenCookieOptions());
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, getRefreshTokenCookieOptions());
};

/**
 * Clear auth cookies on logout
 * @param res - Express response object
 */
const clearAuthCookies = (res: Response) => {
  const clearOptions: CookieOptions = {
    ...config.cookieOptions,
    maxAge: 0,
  };
  res.cookie(ACCESS_TOKEN_COOKIE, '', clearOptions);
  res.cookie(REFRESH_TOKEN_COOKIE, '', clearOptions);
};

export class AuthController {
  /**
   * Register a new user
   * POST /api/v1/auth/register
   *
   * HIPAA Security: Tokens set as httpOnly cookies (not in response body)
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body);

    // Set tokens as httpOnly cookies if returned
    if (result.tokens) {
      setAuthCookies(res, result.tokens);
    }

    // Return user data without tokens in body
    const { tokens, ...responseData } = result;
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: responseData,
    });
  });

  /**
   * Login user with enhanced security (session + optional MFA)
   * POST /api/v1/auth/login
   *
   * HIPAA Security: Tokens are set as httpOnly cookies to prevent XSS attacks
   * Response body only contains user data (no tokens exposed to JavaScript)
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
      // Set session token as httpOnly cookie (not accessible via JavaScript)
      // The session token is used for authentication on subsequent requests
      if (result.session?.token) {
        setAuthCookies(res, {
          accessToken: result.session.token,
          refreshToken: result.session.token
        });
      }

      // Return user data without tokens in body (HIPAA security)
      const { tokens, session, ...responseData } = result;
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: { ...responseData, session: { sessionId: session?.sessionId } },
      });
    }
  });

  /**
   * Complete MFA login step
   * POST /api/v1/auth/mfa/verify
   *
   * HIPAA Security: Tokens set as httpOnly cookies after MFA verification
   */
  completeMFALogin = asyncHandler(async (req: Request, res: Response) => {
    const { userId, mfaCode } = req.body;
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    if (!userId || !mfaCode) {
      throw new ValidationError('User ID and MFA code are required');
    }

    const result = await authService.completeMFALogin(userId, mfaCode, ipAddress, userAgent);

    // Set session token as httpOnly cookie
    if (result.session?.token) {
      setAuthCookies(res, {
        accessToken: result.session.token,
        refreshToken: result.session.token
      });
    }

    // Return user data without tokens in body
    const { tokens, session, ...responseData } = result;
    res.status(200).json({
      success: true,
      message: 'MFA verification successful',
      data: { ...responseData, session: { sessionId: session?.sessionId } },
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
   *
   * HIPAA Security: Clears httpOnly auth cookies to ensure complete logout
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    const sessionId = req.session?.sessionId;

    if (sessionId) {
      await sessionService.terminateSession(sessionId);
    }

    // Clear auth cookies (HIPAA security - ensure tokens cannot be reused)
    clearAuthCookies(res);

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  });

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   *
   * HIPAA Security: Reads refresh token from httpOnly cookie (not request body)
   * Sets new tokens as httpOnly cookies
   */
  refresh = asyncHandler(async (req: Request, res: Response) => {
    // Read refresh token from httpOnly cookie (primary) or body (legacy/fallback)
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    const result = await authService.refreshToken(refreshToken);

    // Set new tokens as httpOnly cookies
    if (result.accessToken && result.refreshToken) {
      setAuthCookies(res, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    }

    // Return success without exposing tokens in response body
    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
    });
  });
}

export default new AuthController();
