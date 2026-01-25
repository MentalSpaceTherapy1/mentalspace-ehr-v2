import { Request, Response, CookieOptions } from 'express';
import authService from '../services/auth.service';
import sessionService from '../services/session.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../utils/errors';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound, sendServerError, sendPaginated, calculatePagination } from '../utils/apiResponse';
import config from '../config';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';

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
    return sendCreated(res, responseData, 'User registered successfully');
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
      return sendSuccess(res, {
        requiresMfa: true,
        tempToken: result.tempToken,
        user: result.user,
      }, 'MFA verification required');
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
      const { session, ...responseData } = result;
      return sendSuccess(res, { ...responseData, session: { sessionId: session?.sessionId } }, 'Login successful');
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
    const { session, ...responseData } = result;
    return sendSuccess(res, { ...responseData, session: { sessionId: session?.sessionId } }, 'MFA verification successful');
  });

  /**
   * Get current user profile
   * GET /api/v1/auth/me
   */
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const user = await authService.getProfile(userId);

    return sendSuccess(res, user);
  });

  /**
   * Change password
   * POST /api/v1/auth/change-password
   */
  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    const result = await authService.changePassword(userId, currentPassword, newPassword);

    return sendSuccess(res, null, result.message);
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

    return sendSuccess(res, null, 'Logout successful');
  });

  /**
   * Refresh access token / Extend session
   * POST /api/v1/auth/refresh
   *
   * HIPAA Security: Reads session token from httpOnly cookie (not request body)
   * Validates and extends the session if valid
   *
   * Note: We use session-based auth, not JWT refresh tokens.
   * The "refresh" endpoint validates the session token and extends the session.
   */
  refresh = asyncHandler(async (req: Request, res: Response) => {
    // Read session token from httpOnly cookie (primary) or body (legacy/fallback)
    // Note: Both access_token and refresh_token cookies contain the same session token
    const sessionToken = req.cookies?.[ACCESS_TOKEN_COOKIE] || req.cookies?.[REFRESH_TOKEN_COOKIE] || req.body?.refreshToken;

    if (!sessionToken) {
      return sendUnauthorized(res, 'Session token is required');
    }

    try {
      // Validate the session token using session service
      const sessionResult = await sessionService.validateSession(sessionToken);

      if (!sessionResult) {
        return sendUnauthorized(res, 'Invalid or expired session');
      }

      // Session is valid and has been extended by validateSession()
      // Return success (cookies are already set and still valid)
      return sendSuccess(res, null, 'Session refreshed successfully');
    } catch (error) {
      // Session validation failed (e.g., account locked, disabled)
      return sendUnauthorized(res, error instanceof Error ? getErrorMessage(error) : 'Session validation failed');
    }
  });
}

export default new AuthController();
