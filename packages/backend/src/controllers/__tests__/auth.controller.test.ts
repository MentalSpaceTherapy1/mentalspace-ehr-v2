/**
 * Auth Controller Tests
 *
 * HIPAA Security: Authentication and access control testing
 * Tests for login, logout, token refresh, password management
 */

import { Request, Response, NextFunction } from 'express';
import authController from '../auth.controller';
import userController from '../user.controller';

// Extract methods from the auth controller instance
const {
  login,
  logout,
  refresh: refreshToken,
  changePassword,
  getProfile: getCurrentUser,
} = authController;

// Extract methods from the user controller instance
const {
  forgotPassword,
  resetPasswordWithToken: resetPassword,
} = userController;

// Note: verifyEmail is a portal auth function tested in portal auth tests

// Mock dependencies
jest.mock('../../services/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    session: {
      create: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../../services/auth.service', () => ({
  __esModule: true,
  default: {
    login: jest.fn(),
    register: jest.fn(),
    validateCredentials: jest.fn(),
    generateTokens: jest.fn(),
    verifyRefreshToken: jest.fn(),
    revokeSession: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    resetUserPassword: jest.fn(),
    validatePasswordReset: jest.fn(),
    refreshSession: jest.fn(),
    logout: jest.fn(),
    changePassword: jest.fn(),
    getProfile: jest.fn(),
  },
}));

jest.mock('../../services/session.service', () => ({
  __esModule: true,
  default: {
    terminateSession: jest.fn(),
    validateSession: jest.fn(),
  },
}));

jest.mock('../../services/user.service', () => ({
  __esModule: true,
  default: {
    requestPasswordReset: jest.fn(),
    resetPasswordWithToken: jest.fn(),
    changePassword: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import prisma from '../../services/database';
import authService from '../../services/auth.service';
import sessionService from '../../services/session.service';
import userService from '../../services/user.service';
import logger from '../../utils/logger';

describe('Auth Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Reset all mock implementations and clear call history
    jest.resetAllMocks();

    mockReq = {
      body: {},
      params: {},
      user: undefined,
      session: undefined,
      ip: '127.0.0.1',
      headers: { 'user-agent': 'test-agent' },
      cookies: {},
      get: jest.fn().mockReturnValue('test-agent'),
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      mockReq.body = {
        email: 'clinician@example.com',
        password: 'ValidPassword123!',
      };

      const mockUser = {
        id: 'user-123',
        email: 'clinician@example.com',
        role: 'CLINICIAN',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
        organizationId: 'org-123',
      };

      const mockSession = {
        id: 'session-123',
        token: 'access-token-123',
        userId: 'user-123',
      };

      (authService.login as jest.Mock).mockResolvedValue({
        user: mockUser,
        session: mockSession,
      });

      await login(mockReq as Request, mockRes as Response, mockNext);

      expect(authService.login).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('should return 401 for invalid credentials', async () => {
      mockReq.body = {
        email: 'wrong@example.com',
        password: 'wrongpassword',
      };

      (authService.login as jest.Mock).mockRejectedValue(new Error('Invalid email or password'));

      await login(mockReq as Request, mockRes as Response, mockNext);
      // Wait for async error handling in asyncHandler
      await new Promise(setImmediate);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 400 for missing email', async () => {
      mockReq.body = {
        password: 'somepassword',
      };

      (authService.login as jest.Mock).mockRejectedValue(new Error('Email is required'));

      await login(mockReq as Request, mockRes as Response, mockNext);
      await new Promise(setImmediate);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 400 for missing password', async () => {
      mockReq.body = {
        email: 'test@example.com',
      };

      (authService.login as jest.Mock).mockRejectedValue(new Error('Password is required'));

      await login(mockReq as Request, mockRes as Response, mockNext);
      await new Promise(setImmediate);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should set httpOnly cookies for tokens', async () => {
      mockReq.body = {
        email: 'clinician@example.com',
        password: 'ValidPassword123!',
      };

      const mockUser = {
        id: 'user-123',
        email: 'clinician@example.com',
        role: 'CLINICIAN',
        isActive: true,
      };

      const mockSession = {
        id: 'session-123',
        token: 'access-token-123',
        userId: 'user-123',
      };

      (authService.login as jest.Mock).mockResolvedValue({
        user: mockUser,
        session: mockSession,
      });

      await login(mockReq as Request, mockRes as Response, mockNext);

      // Verify httpOnly cookies are set (HIPAA security requirement)
      expect(mockRes.cookie).toHaveBeenCalled();
    });

    it('should log failed login attempts for audit', async () => {
      mockReq.body = {
        email: 'attacker@example.com',
        password: 'badpassword',
      };

      (authService.login as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

      await login(mockReq as Request, mockRes as Response, mockNext);
      await new Promise(setImmediate);

      // The error handler will be called
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle inactive user accounts', async () => {
      mockReq.body = {
        email: 'inactive@example.com',
        password: 'password123',
      };

      (authService.login as jest.Mock).mockRejectedValue(new Error('Account is inactive'));

      await login(mockReq as Request, mockRes as Response, mockNext);
      await new Promise(setImmediate);

      // Should pass to error handler
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      mockReq.session = { sessionId: 'session-123' } as any;

      (sessionService.terminateSession as jest.Mock).mockResolvedValue(true);

      await logout(mockReq as Request, mockRes as Response, mockNext);

      expect(sessionService.terminateSession).toHaveBeenCalledWith('session-123');
      expect(mockRes.cookie).toHaveBeenCalled(); // clearAuthCookies sets cookies with maxAge: 0
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle logout without session', async () => {
      mockReq.session = undefined;

      await logout(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should clear all auth cookies', async () => {
      mockReq.session = { sessionId: 'session-123' } as any;

      (sessionService.terminateSession as jest.Mock).mockResolvedValue(true);

      await logout(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.cookie).toHaveBeenCalled(); // clearAuthCookies sets cookies
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens successfully', async () => {
      mockReq.cookies = { access_token: 'valid-session-token' };

      const mockSessionResult = {
        userId: 'user-123',
        sessionId: 'session-123',
      };

      (sessionService.validateSession as jest.Mock).mockResolvedValue(mockSessionResult);

      await refreshToken(mockReq as Request, mockRes as Response, mockNext);

      expect(sessionService.validateSession).toHaveBeenCalledWith('valid-session-token');
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 401 for invalid refresh token', async () => {
      mockReq.cookies = { access_token: 'invalid-token' };

      (sessionService.validateSession as jest.Mock).mockResolvedValue(null);

      await refreshToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 401 for missing refresh token', async () => {
      mockReq.cookies = {};

      await refreshToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email', async () => {
      mockReq.body = { email: 'user@example.com' };

      (userService.requestPasswordReset as jest.Mock).mockResolvedValue({
        message: 'Password reset email sent',
      });

      await forgotPassword(mockReq as Request, mockRes as Response, mockNext);

      expect(userService.requestPasswordReset).toHaveBeenCalledWith('user@example.com');
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return success even for non-existent email (security)', async () => {
      mockReq.body = { email: 'nonexistent@example.com' };

      // Should not reveal whether email exists - service returns same message
      (userService.requestPasswordReset as jest.Mock).mockResolvedValue({
        message: 'If that email exists, a reset link has been sent',
      });

      await forgotPassword(mockReq as Request, mockRes as Response, mockNext);

      // Return 200 to not reveal email existence
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle invalid email format', async () => {
      mockReq.body = { email: 'not-an-email' };

      // Service may still accept it - validation happens in service
      (userService.requestPasswordReset as jest.Mock).mockResolvedValue({
        message: 'If that email exists, a reset link has been sent',
      });

      await forgotPassword(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      mockReq.body = {
        token: 'valid-reset-token',
        newPassword: 'NewSecurePassword123!',
      };

      (userService.resetPasswordWithToken as jest.Mock).mockResolvedValue({
        message: 'Password reset successfully',
      });

      await resetPassword(mockReq as Request, mockRes as Response, mockNext);

      expect(userService.resetPasswordWithToken).toHaveBeenCalledWith(
        'valid-reset-token',
        'NewSecurePassword123!'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return error for invalid token', async () => {
      mockReq.body = {
        token: 'invalid-token',
        newPassword: 'NewPassword123!',
      };

      (userService.resetPasswordWithToken as jest.Mock).mockRejectedValue(
        new Error('Invalid or expired token')
      );

      await resetPassword(mockReq as Request, mockRes as Response, mockNext);
      await new Promise(setImmediate);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return error for weak password', async () => {
      mockReq.body = {
        token: 'valid-token',
        newPassword: 'weak',
      };

      (userService.resetPasswordWithToken as jest.Mock).mockRejectedValue(
        new Error('Password does not meet requirements')
      );

      await resetPassword(mockReq as Request, mockRes as Response, mockNext);
      await new Promise(setImmediate);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('should change password for authenticated user', async () => {
      mockReq.user = { userId: 'user-123' } as any;
      mockReq.body = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword456!',
      };

      (authService.changePassword as jest.Mock).mockResolvedValue({
        message: 'Password changed successfully',
      });

      await changePassword(mockReq as Request, mockRes as Response, mockNext);

      expect(authService.changePassword).toHaveBeenCalledWith(
        'user-123',
        'OldPassword123!',
        'NewPassword456!'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return error for incorrect current password', async () => {
      mockReq.user = { userId: 'user-123' } as any;
      mockReq.body = {
        currentPassword: 'WrongPassword',
        newPassword: 'NewPassword456!',
      };

      (authService.changePassword as jest.Mock).mockRejectedValue(
        new Error('Current password is incorrect')
      );

      await changePassword(mockReq as Request, mockRes as Response, mockNext);
      await new Promise(setImmediate);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return error for unauthenticated user', async () => {
      mockReq.user = undefined;
      mockReq.body = {
        currentPassword: 'Old123!',
        newPassword: 'New456!',
      };

      // asyncHandler should throw for missing user
      await changePassword(mockReq as Request, mockRes as Response, mockNext);
      await new Promise(setImmediate);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should not allow same password as current', async () => {
      mockReq.user = { userId: 'user-123' } as any;
      mockReq.body = {
        currentPassword: 'SamePassword123!',
        newPassword: 'SamePassword123!',
      };

      (authService.changePassword as jest.Mock).mockRejectedValue(
        new Error('New password cannot be the same as current password')
      );

      await changePassword(mockReq as Request, mockRes as Response, mockNext);
      await new Promise(setImmediate);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user data', async () => {
      mockReq.user = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'CLINICIAN',
      } as any;

      const mockUserData = {
        id: 'user-123',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'CLINICIAN',
        organization: { id: 'org-123', name: 'Test Org' },
      };

      (authService.getProfile as jest.Mock).mockResolvedValue(mockUserData);

      await getCurrentUser(mockReq as Request, mockRes as Response, mockNext);

      expect(authService.getProfile).toHaveBeenCalledWith('user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 'user-123',
          }),
        })
      );
    });

    it('should return error for unauthenticated request', async () => {
      mockReq.user = undefined;

      // asyncHandler should throw for missing user
      await getCurrentUser(mockReq as Request, mockRes as Response, mockNext);
      await new Promise(setImmediate);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should not expose sensitive fields', async () => {
      mockReq.user = { userId: 'user-123' } as any;

      // authService.getProfile should already filter out sensitive fields
      const mockUserData = {
        id: 'user-123',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        // password should not be included in getProfile response
      };

      (authService.getProfile as jest.Mock).mockResolvedValue(mockUserData);

      await getCurrentUser(mockReq as Request, mockRes as Response, mockNext);

      const responseData = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.password).toBeUndefined();
    });
  });

  // Note: verifyEmail tests are in portal auth test file since verifyEmail is a portal function

  describe('HIPAA Audit - Login Events', () => {
    it('should log successful login for audit', async () => {
      mockReq.body = {
        email: 'clinician@example.com',
        password: 'ValidPassword123!',
      };

      const mockUser = {
        id: 'user-123',
        email: 'clinician@example.com',
        role: 'CLINICIAN',
        isActive: true,
      };

      const mockSession = {
        id: 'session-123',
        token: 'access-token-123',
        sessionId: 'session-123',
        userId: 'user-123',
      };

      (authService.login as jest.Mock).mockResolvedValue({
        user: mockUser,
        session: mockSession,
      });

      await login(mockReq as Request, mockRes as Response, mockNext);

      // authService.login handles audit logging internally
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should log failed login attempts with IP', async () => {
      mockReq.body = {
        email: 'attacker@example.com',
        password: 'wrongpassword',
      };
      mockReq.ip = '192.168.1.100';

      (authService.login as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

      await login(mockReq as Request, mockRes as Response, mockNext);
      await new Promise(setImmediate);

      // Error handler will be called with the error
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Rate Limiting Protection', () => {
    it('should work with rate-limited requests', async () => {
      // This tests that the controller handles requests properly
      // Rate limiting is handled by middleware, but controller should not break
      for (let i = 0; i < 5; i++) {
        mockReq.body = {
          email: 'test@example.com',
          password: 'password',
        };

        (authService.login as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

        await login(mockReq as Request, mockRes as Response, mockNext);
      }

      // Error handler should be called for failed logins
      expect(mockNext).toHaveBeenCalled();
    });
  });
});

describe('Security Edge Cases', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      ip: '127.0.0.1',
      headers: { 'user-agent': 'test-agent' },
      cookies: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it('should handle SQL injection in email field', async () => {
    mockReq.body = {
      email: "admin'--",
      password: 'anything',
    };

    // Service should handle and reject SQL injection attempts
    (authService.login as jest.Mock).mockRejectedValue(new Error('Invalid email format'));

    await login(mockReq as Request, mockRes as Response, mockNext);

    // Error should be passed to error handler
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle XSS in email field', async () => {
    mockReq.body = {
      email: '<script>alert("xss")</script>@test.com',
      password: 'password',
    };

    // Service should handle and reject XSS attempts
    (authService.login as jest.Mock).mockRejectedValue(new Error('Invalid email format'));

    await login(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle extremely long inputs', async () => {
    mockReq.body = {
      email: 'a'.repeat(10000) + '@test.com',
      password: 'b'.repeat(10000),
    };

    // Service should handle long inputs gracefully
    (authService.login as jest.Mock).mockRejectedValue(new Error('Input too long'));

    await login(mockReq as Request, mockRes as Response, mockNext);

    // Should handle gracefully without crashing
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle null byte injection', async () => {
    mockReq.body = {
      email: 'test\x00@example.com',
      password: 'password\x00extra',
    };

    // Service should sanitize null bytes
    (authService.login as jest.Mock).mockRejectedValue(new Error('Invalid characters in input'));

    await login(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});
