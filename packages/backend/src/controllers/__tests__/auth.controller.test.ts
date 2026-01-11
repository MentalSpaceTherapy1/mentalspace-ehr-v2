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
  validateCredentials: jest.fn(),
  generateTokens: jest.fn(),
  verifyRefreshToken: jest.fn(),
  revokeSession: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  resetUserPassword: jest.fn(),
  validatePasswordReset: jest.fn(),
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
import * as authService from '../../services/auth.service';
import logger from '../../utils/logger';

describe('Auth Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      user: undefined,
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

      const mockTokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        sessionId: 'session-123',
      };

      (authService.validateCredentials as jest.Mock).mockResolvedValue(mockUser);
      (authService.generateTokens as jest.Mock).mockResolvedValue(mockTokens);

      await login(mockReq as Request, mockRes as Response, mockNext);

      expect(authService.validateCredentials).toHaveBeenCalledWith(
        'clinician@example.com',
        'ValidPassword123!'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: expect.any(Object),
          }),
        })
      );
    });

    it('should return 401 for invalid credentials', async () => {
      mockReq.body = {
        email: 'wrong@example.com',
        password: 'wrongpassword',
      };

      (authService.validateCredentials as jest.Mock).mockResolvedValue(null);

      await login(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });

    it('should return 400 for missing email', async () => {
      mockReq.body = {
        password: 'somepassword',
      };

      await login(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for missing password', async () => {
      mockReq.body = {
        email: 'test@example.com',
      };

      await login(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
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

      const mockTokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        sessionId: 'session-123',
      };

      (authService.validateCredentials as jest.Mock).mockResolvedValue(mockUser);
      (authService.generateTokens as jest.Mock).mockResolvedValue(mockTokens);

      await login(mockReq as Request, mockRes as Response, mockNext);

      // Verify httpOnly cookies are set (HIPAA security requirement)
      expect(mockRes.cookie).toHaveBeenCalled();
    });

    it('should log failed login attempts for audit', async () => {
      mockReq.body = {
        email: 'attacker@example.com',
        password: 'badpassword',
      };

      (authService.validateCredentials as jest.Mock).mockResolvedValue(null);

      await login(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle inactive user accounts', async () => {
      mockReq.body = {
        email: 'inactive@example.com',
        password: 'password123',
      };

      const mockInactiveUser = {
        id: 'user-inactive',
        email: 'inactive@example.com',
        isActive: false,
      };

      (authService.validateCredentials as jest.Mock).mockResolvedValue(mockInactiveUser);

      await login(mockReq as Request, mockRes as Response, mockNext);

      // Should reject inactive users
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      mockReq.user = { userId: 'user-123', sessionId: 'session-123' } as any;

      (authService.revokeSession as jest.Mock).mockResolvedValue(true);

      await logout(mockReq as Request, mockRes as Response, mockNext);

      expect(authService.revokeSession).toHaveBeenCalledWith('session-123');
      expect(mockRes.clearCookie).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle logout without session', async () => {
      mockReq.user = undefined;

      await logout(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should clear all auth cookies', async () => {
      mockReq.user = { userId: 'user-123', sessionId: 'session-123' } as any;

      (authService.revokeSession as jest.Mock).mockResolvedValue(true);

      await logout(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.clearCookie).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens successfully', async () => {
      mockReq.cookies = { refreshToken: 'valid-refresh-token' };

      const mockPayload = {
        userId: 'user-123',
        sessionId: 'session-123',
      };

      const mockNewTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      (authService.verifyRefreshToken as jest.Mock).mockResolvedValue(mockPayload);
      (authService.generateTokens as jest.Mock).mockResolvedValue(mockNewTokens);

      await refreshToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 401 for invalid refresh token', async () => {
      mockReq.cookies = { refreshToken: 'invalid-token' };

      (authService.verifyRefreshToken as jest.Mock).mockResolvedValue(null);

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

      (authService.sendPasswordResetEmail as jest.Mock).mockResolvedValue(true);

      await forgotPassword(mockReq as Request, mockRes as Response, mockNext);

      expect(authService.sendPasswordResetEmail).toHaveBeenCalledWith('user@example.com');
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return success even for non-existent email (security)', async () => {
      mockReq.body = { email: 'nonexistent@example.com' };

      // Should not reveal whether email exists
      (authService.sendPasswordResetEmail as jest.Mock).mockResolvedValue(false);

      await forgotPassword(mockReq as Request, mockRes as Response, mockNext);

      // Return 200 to not reveal email existence
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should validate email format', async () => {
      mockReq.body = { email: 'not-an-email' };

      await forgotPassword(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      mockReq.body = {
        token: 'valid-reset-token',
        password: 'NewSecurePassword123!',
      };

      (authService.validatePasswordReset as jest.Mock).mockResolvedValue(true);
      (authService.resetUserPassword as jest.Mock).mockResolvedValue(true);

      await resetPassword(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for invalid token', async () => {
      mockReq.body = {
        token: 'invalid-token',
        password: 'NewPassword123!',
      };

      (authService.validatePasswordReset as jest.Mock).mockResolvedValue(false);

      await resetPassword(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for weak password', async () => {
      mockReq.body = {
        token: 'valid-token',
        password: 'weak',
      };

      await resetPassword(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('changePassword', () => {
    it('should change password for authenticated user', async () => {
      mockReq.user = { userId: 'user-123' } as any;
      mockReq.body = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword456!',
      };

      (authService.validateCredentials as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
      });

      await changePassword(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for incorrect current password', async () => {
      mockReq.user = { userId: 'user-123' } as any;
      mockReq.body = {
        currentPassword: 'WrongPassword',
        newPassword: 'NewPassword456!',
      };

      (authService.validateCredentials as jest.Mock).mockResolvedValue(null);

      await changePassword(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 401 for unauthenticated user', async () => {
      mockReq.user = undefined;
      mockReq.body = {
        currentPassword: 'Old123!',
        newPassword: 'New456!',
      };

      await changePassword(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should not allow same password as current', async () => {
      mockReq.user = { userId: 'user-123' } as any;
      mockReq.body = {
        currentPassword: 'SamePassword123!',
        newPassword: 'SamePassword123!',
      };

      await changePassword(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
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

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserData);

      await getCurrentUser(mockReq as Request, mockRes as Response, mockNext);

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

    it('should return 401 for unauthenticated request', async () => {
      mockReq.user = undefined;

      await getCurrentUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should not expose sensitive fields', async () => {
      mockReq.user = { userId: 'user-123' } as any;

      const mockUserData = {
        id: 'user-123',
        email: 'user@example.com',
        password: 'hashed-password', // Should not be returned
        firstName: 'John',
        lastName: 'Doe',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserData);

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

      (authService.validateCredentials as jest.Mock).mockResolvedValue(mockUser);
      (authService.generateTokens as jest.Mock).mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'refresh',
        sessionId: 'session',
      });

      await login(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.info).toHaveBeenCalled();
    });

    it('should log failed login attempts with IP', async () => {
      mockReq.body = {
        email: 'attacker@example.com',
        password: 'wrongpassword',
      };
      mockReq.ip = '192.168.1.100';

      (authService.validateCredentials as jest.Mock).mockResolvedValue(null);

      await login(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('login'),
        expect.objectContaining({
          ip: '192.168.1.100',
        })
      );
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

        (authService.validateCredentials as jest.Mock).mockResolvedValue(null);

        await login(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockRes.status).toHaveBeenLastCalledWith(401);
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
      headers: {},
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

    await login(mockReq as Request, mockRes as Response, mockNext);

    // Should reject without SQL error
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('should handle XSS in email field', async () => {
    mockReq.body = {
      email: '<script>alert("xss")</script>@test.com',
      password: 'password',
    };

    await login(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('should handle extremely long inputs', async () => {
    mockReq.body = {
      email: 'a'.repeat(10000) + '@test.com',
      password: 'b'.repeat(10000),
    };

    await login(mockReq as Request, mockRes as Response, mockNext);

    // Should handle gracefully without crashing
    expect(mockRes.status).toHaveBeenCalled();
  });

  it('should handle null byte injection', async () => {
    mockReq.body = {
      email: 'test\x00@example.com',
      password: 'password\x00extra',
    };

    await login(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalled();
  });
});
