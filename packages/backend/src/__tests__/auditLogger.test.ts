/**
 * HIPAA Audit Logging Middleware Unit Tests
 *
 * Tests for the audit logging middleware including:
 * - auditLog middleware functionality
 * - PHI access logging
 * - Failed access logging
 * - Edge cases and error handling
 */

import { Request, Response, NextFunction } from 'express';
import { auditLog, logPhiAccess, logFailedAccess, AuditAction, AuditEntityType } from '../middleware/auditLogger';

// Mock dependencies
jest.mock('../services/database', () => ({
  __esModule: true,
  default: {
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import prisma from '../services/database';
import logger from '../utils/logger';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('HIPAA Audit Logging Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;
  let originalSend: jest.Mock;
  let capturedData: any;

  beforeEach(() => {
    jest.clearAllMocks();
    originalSend = jest.fn().mockReturnThis();
    capturedData = null;

    mockRequest = {
      user: {
        userId: 'user-123',
        id: 'user-123',
        email: 'test@example.com',
        roles: ['CLINICIAN'],
      },
      params: { id: 'entity-123' },
      query: { page: '1' },
      body: { firstName: 'John', lastName: 'Doe' },
      method: 'GET',
      path: '/api/test',
      ip: '192.168.1.1',
      socket: { remoteAddress: '192.168.1.1' },
      headers: {
        'user-agent': 'Mozilla/5.0 Test Browser',
        'x-forwarded-for': '10.0.0.1',
      },
      get: jest.fn().mockImplementation((header: string) => {
        if (header === 'user-agent') return 'Mozilla/5.0 Test Browser';
        return undefined;
      }),
    } as any;

    mockResponse = {
      statusCode: 200,
      send: originalSend,
    } as any;

    mockNext = jest.fn();

    (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({
      id: 'audit-log-123',
      userId: 'user-123',
      entityType: 'Client',
      action: 'VIEW',
    });
  });

  // ============================================================================
  // SECTION 1: auditLog Middleware Tests
  // ============================================================================
  describe('auditLog middleware', () => {
    describe('captures userId from req.user', () => {
      it('should capture userId from req.user.userId', async () => {
        const middleware = auditLog({ entityType: 'Client', action: 'VIEW' });

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Trigger the response to capture audit log
        mockResponse.send!('test response');

        // Wait for async audit log creation
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              userId: 'user-123',
            }),
          })
        );
      });

      it('should handle missing req.user gracefully', async () => {
        mockRequest.user = undefined;
        const middleware = auditLog({ entityType: 'Client', action: 'VIEW' });

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);
        mockResponse.send!('test response');

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              userId: null,
            }),
          })
        );
      });
    });

    describe('extracts entityId from route params', () => {
      it('should extract entityId from req.params.id', async () => {
        mockRequest.params = { id: 'entity-456' };
        const middleware = auditLog({ entityType: 'Client', action: 'VIEW' });

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);
        mockResponse.send!('test response');

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              entityId: 'entity-456',
            }),
          })
        );
      });

      it('should extract clientId from req.params.clientId', async () => {
        mockRequest.params = { clientId: 'client-789' };
        const middleware = auditLog({ entityType: 'Client', action: 'VIEW' });

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);
        mockResponse.send!('test response');

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              entityId: 'client-789',
            }),
          })
        );
      });

      it('should handle missing params gracefully', async () => {
        mockRequest.params = {};
        const middleware = auditLog({ entityType: 'Client', action: 'VIEW' });

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);
        mockResponse.send!('test response');

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              entityId: null,
            }),
          })
        );
      });
    });

    describe('logs correct action types', () => {
      const actionTypes: AuditAction[] = ['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'DENY', 'SUBMIT', 'SIGN'];

      actionTypes.forEach((action) => {
        it(`should log action type: ${action}`, async () => {
          const middleware = auditLog({ entityType: 'PTORequest', action });

          await middleware(mockRequest as Request, mockResponse as Response, mockNext);
          mockResponse.send!('test response');

          await new Promise(resolve => setTimeout(resolve, 10));

          expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                action: action,
              }),
            })
          );
        });
      });
    });

    describe('logs correct entityType', () => {
      const entityTypes: AuditEntityType[] = [
        'Client', 'Appointment', 'ClinicalNote', 'User', 'Insurance', 'Other',
        'Staff', 'PTORequest', 'PerformanceReview', 'TimeAttendance', 'Training', 'Credential', 'Onboarding'
      ];

      entityTypes.forEach((entityType) => {
        it(`should log entityType: ${entityType}`, async () => {
          const middleware = auditLog({ entityType, action: 'VIEW' });

          await middleware(mockRequest as Request, mockResponse as Response, mockNext);
          mockResponse.send!('test response');

          await new Promise(resolve => setTimeout(resolve, 10));

          expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                entityType: entityType,
              }),
            })
          );
        });
      });
    });

    describe('records IP address', () => {
      it('should record IP from x-forwarded-for header', async () => {
        mockRequest.headers = {
          'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
          'user-agent': 'Test Browser',
        };
        const middleware = auditLog({ entityType: 'Client', action: 'VIEW' });

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);
        mockResponse.send!('test response');

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              ipAddress: '203.0.113.195',
            }),
          })
        );
      });

      it('should fall back to req.ip when x-forwarded-for is not present', async () => {
        mockRequest.headers = { 'user-agent': 'Test Browser' };
        mockRequest.ip = '192.168.1.100';
        const middleware = auditLog({ entityType: 'Client', action: 'VIEW' });

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);
        mockResponse.send!('test response');

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              ipAddress: '192.168.1.100',
            }),
          })
        );
      });
    });

    describe('records user agent', () => {
      it('should record user agent from request headers', async () => {
        const middleware = auditLog({ entityType: 'Client', action: 'VIEW' });

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);
        mockResponse.send!('test response');

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              userAgent: 'Mozilla/5.0 Test Browser',
            }),
          })
        );
      });

      it('should handle missing user agent', async () => {
        mockRequest.get = jest.fn().mockReturnValue(undefined);
        const middleware = auditLog({ entityType: 'Client', action: 'VIEW' });

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);
        mockResponse.send!('test response');

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              userAgent: null,
            }),
          })
        );
      });
    });

    describe('logs success/failure based on status code', () => {
      it('should log success for 200 status code', async () => {
        mockResponse.statusCode = 200;
        const middleware = auditLog({ entityType: 'Client', action: 'VIEW' });

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);
        mockResponse.send!('test response');

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              changes: expect.objectContaining({
                success: true,
                statusCode: 200,
              }),
            }),
          })
        );
      });

      it('should log success for 201 status code', async () => {
        mockResponse.statusCode = 201;
        const middleware = auditLog({ entityType: 'Client', action: 'CREATE' });

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);
        mockResponse.send!('test response');

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              changes: expect.objectContaining({
                success: true,
                statusCode: 201,
              }),
            }),
          })
        );
      });

      it('should log failure for 400 status code', async () => {
        mockResponse.statusCode = 400;
        const middleware = auditLog({ entityType: 'Client', action: 'UPDATE' });

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);
        mockResponse.send!('test response');

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              changes: expect.objectContaining({
                success: false,
                statusCode: 400,
              }),
            }),
          })
        );
      });

      it('should log failure for 403 status code', async () => {
        mockResponse.statusCode = 403;
        const middleware = auditLog({ entityType: 'Client', action: 'VIEW' });

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);
        mockResponse.send!('test response');

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              changes: expect.objectContaining({
                success: false,
                statusCode: 403,
              }),
            }),
          })
        );
      });

      it('should log failure for 500 status code', async () => {
        mockResponse.statusCode = 500;
        const middleware = auditLog({ entityType: 'Client', action: 'VIEW' });

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);
        mockResponse.send!('test response');

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              changes: expect.objectContaining({
                success: false,
                statusCode: 500,
              }),
            }),
          })
        );
      });
    });

    describe('records response duration', () => {
      it('should record duration in changes object', async () => {
        const middleware = auditLog({ entityType: 'Client', action: 'VIEW' });

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 50));

        mockResponse.send!('test response');

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              changes: expect.objectContaining({
                duration: expect.any(Number),
              }),
            }),
          })
        );
      });
    });

    describe('includes audit details', () => {
      it('should include method and path in details', async () => {
        mockRequest.method = 'POST';
        mockRequest.path = '/api/clients/123';
        const middleware = auditLog({ entityType: 'Client', action: 'CREATE' });

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);
        mockResponse.send!('test response');

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              changes: expect.objectContaining({
                method: 'POST',
                path: '/api/clients/123',
              }),
            }),
          })
        );
      });

      it('should include updated fields for UPDATE action (excluding sensitive)', async () => {
        mockRequest.method = 'PUT';
        mockRequest.body = {
          firstName: 'John',
          lastName: 'Doe',
          password: 'secret123', // Should be excluded
          ssn: '123-45-6789', // Should be excluded
        };
        const middleware = auditLog({ entityType: 'Client', action: 'UPDATE' });

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);
        mockResponse.send!('test response');

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              changes: expect.objectContaining({
                updatedFields: expect.arrayContaining(['firstName', 'lastName']),
              }),
            }),
          })
        );

        // Verify sensitive fields are excluded
        const auditCall = (mockPrisma.auditLog.create as jest.Mock).mock.calls[0][0];
        expect(auditCall.data.changes.updatedFields).not.toContain('password');
        expect(auditCall.data.changes.updatedFields).not.toContain('ssn');
      });
    });
  });

  // ============================================================================
  // SECTION 2: PHI Access Logging Tests
  // ============================================================================
  describe('logPhiAccess', () => {
    it('should create audit record with correct fields', async () => {
      await logPhiAccess(
        'user-123',
        'Client',
        'client-456',
        'VIEW',
        mockRequest as Request,
        true
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            entityType: 'Client',
            entityId: 'client-456',
            action: 'VIEW',
          }),
        })
      );
    });

    it('should record success parameter correctly - true', async () => {
      await logPhiAccess(
        'user-123',
        'Client',
        'client-456',
        'VIEW',
        mockRequest as Request,
        true
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            changes: expect.objectContaining({
              success: true,
              statusCode: 200,
            }),
          }),
        })
      );
    });

    it('should record success parameter correctly - false', async () => {
      await logPhiAccess(
        'user-123',
        'Client',
        'client-456',
        'VIEW',
        mockRequest as Request,
        false
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            changes: expect.objectContaining({
              success: false,
              statusCode: 403,
            }),
          }),
        })
      );
    });

    it('should default success to true if not provided', async () => {
      await logPhiAccess(
        'user-123',
        'ClinicalNote',
        'note-789',
        'VIEW',
        mockRequest as Request
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            changes: expect.objectContaining({
              success: true,
            }),
          }),
        })
      );
    });
  });

  // ============================================================================
  // SECTION 3: Failed Access Logging Tests
  // ============================================================================
  describe('logFailedAccess', () => {
    it('should create audit record with reason', async () => {
      await logFailedAccess(
        'user-123',
        'Client',
        'client-456',
        'VIEW',
        mockRequest as Request,
        'Insufficient permissions'
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            entityType: 'Client',
            entityId: 'client-456',
            action: 'VIEW',
            changes: expect.objectContaining({
              success: false,
              statusCode: 403,
              reason: 'Insufficient permissions',
            }),
          }),
        })
      );
    });

    it('should log warning for security monitoring', async () => {
      await logFailedAccess(
        'user-123',
        'Client',
        'client-456',
        'UPDATE',
        mockRequest as Request,
        'Unauthorized modification attempt'
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed access attempt',
        expect.objectContaining({
          userId: 'user-123',
          entityType: 'Client',
          entityId: 'client-456',
          action: 'UPDATE',
          reason: 'Unauthorized modification attempt',
        })
      );
    });

    it('should handle null userId for unauthenticated requests', async () => {
      await logFailedAccess(
        null,
        'Client',
        'client-456',
        'VIEW',
        mockRequest as Request,
        'Authentication required'
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: null,
          }),
        })
      );
    });

    it('should handle null entityId', async () => {
      await logFailedAccess(
        'user-123',
        'Client',
        null,
        'CREATE',
        mockRequest as Request,
        'Resource creation denied'
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entityId: null,
          }),
        })
      );
    });
  });

  // ============================================================================
  // SECTION 4: Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    describe('Missing req.user handled gracefully', () => {
      it('should set userId to null when req.user is undefined', async () => {
        mockRequest.user = undefined;
        const middleware = auditLog({ entityType: 'Client', action: 'VIEW' });

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);
        mockResponse.send!('test response');

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              userId: null,
            }),
          })
        );
      });

      it('should set userId to null when req.user.userId is undefined', async () => {
        mockRequest.user = { email: 'test@example.com' } as any;
        const middleware = auditLog({ entityType: 'Client', action: 'VIEW' });

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);
        mockResponse.send!('test response');

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              userId: null,
            }),
          })
        );
      });
    });

    describe('Missing params handled', () => {
      it('should set entityId to null when params is empty', async () => {
        mockRequest.params = {};
        const middleware = auditLog({ entityType: 'Client', action: 'VIEW' });

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);
        mockResponse.send!('test response');

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              entityId: null,
            }),
          })
        );
      });

      // Note: Express always provides req.params object, so undefined case is not realistic
      // The empty params case tested above covers the realistic scenario
    });

    describe('Missing headers handled', () => {
      it('should use default IP when headers are empty', async () => {
        mockRequest.headers = {};
        mockRequest.ip = '127.0.0.1';
        const middleware = auditLog({ entityType: 'Client', action: 'VIEW' });

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);
        mockResponse.send!('test response');

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              ipAddress: expect.any(String),
            }),
          })
        );
      });
    });
  });

  // ============================================================================
  // SECTION 5: Database Interaction Tests
  // ============================================================================
  describe('Database Interaction Tests', () => {
    describe('Audit log is created in database', () => {
      it('should call prisma.auditLog.create', async () => {
        const middleware = auditLog({ entityType: 'Client', action: 'VIEW' });

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);
        mockResponse.send!('test response');

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);
      });

      it('should create with all required fields', async () => {
        const middleware = auditLog({ entityType: 'Staff', action: 'UPDATE' });

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);
        mockResponse.send!('test response');

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
          data: {
            userId: expect.any(String),
            entityType: 'Staff',
            entityId: expect.any(String),
            action: 'UPDATE',
            ipAddress: expect.any(String),
            userAgent: expect.any(String),
            changes: expect.objectContaining({
              success: expect.any(Boolean),
              statusCode: expect.any(Number),
              duration: expect.any(Number),
              method: expect.any(String),
              path: expect.any(String),
            }),
          },
        });
      });
    });

    describe('Database errors are caught and logged', () => {
      it('should catch database errors and log them', async () => {
        (mockPrisma.auditLog.create as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

        const middleware = auditLog({ entityType: 'Client', action: 'VIEW' });

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);
        mockResponse.send!('test response');

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockLogger.error).toHaveBeenCalledWith(
          'CRITICAL: Failed to create audit log',
          expect.objectContaining({
            error: expect.any(Error),
          })
        );
      });

      it('should not throw error to caller when database fails', async () => {
        (mockPrisma.auditLog.create as jest.Mock).mockRejectedValue(new Error('Database error'));

        const middleware = auditLog({ entityType: 'Client', action: 'VIEW' });

        // Should not throw
        await expect(async () => {
          await middleware(mockRequest as Request, mockResponse as Response, mockNext);
          mockResponse.send!('test response');
        }).not.toThrow();

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('Request continues even if audit fails', () => {
      it('should call next() even when audit logging fails', async () => {
        (mockPrisma.auditLog.create as jest.Mock).mockRejectedValue(new Error('Audit failure'));

        const middleware = auditLog({ entityType: 'Client', action: 'VIEW' });

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should return response even when audit logging fails', async () => {
        (mockPrisma.auditLog.create as jest.Mock).mockRejectedValue(new Error('Audit failure'));

        const middleware = auditLog({ entityType: 'Client', action: 'VIEW' });

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);
        const result = mockResponse.send!('test response');

        // Original send should still be called
        expect(originalSend).toHaveBeenCalledWith('test response');
      });
    });
  });

  // ============================================================================
  // SECTION 6: Integration with HR Actions
  // ============================================================================
  describe('HR-Specific Actions Integration', () => {
    it('should log APPROVE action for PTO requests', async () => {
      mockRequest.params = { id: 'pto-request-123' };
      const middleware = auditLog({ entityType: 'PTORequest', action: 'APPROVE' });

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.send!('approved');

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entityType: 'PTORequest',
            action: 'APPROVE',
            entityId: 'pto-request-123',
          }),
        })
      );
    });

    it('should log DENY action for PTO requests', async () => {
      mockRequest.params = { id: 'pto-request-456' };
      const middleware = auditLog({ entityType: 'PTORequest', action: 'DENY' });

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.send!('denied');

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entityType: 'PTORequest',
            action: 'DENY',
          }),
        })
      );
    });

    it('should log SUBMIT action for self-evaluation', async () => {
      mockRequest.params = { id: 'review-789' };
      const middleware = auditLog({ entityType: 'PerformanceReview', action: 'SUBMIT' });

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.send!('submitted');

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entityType: 'PerformanceReview',
            action: 'SUBMIT',
          }),
        })
      );
    });

    it('should log SIGN action for employee signature', async () => {
      mockRequest.params = { id: 'review-101' };
      const middleware = auditLog({ entityType: 'PerformanceReview', action: 'SIGN' });

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.send!('signed');

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entityType: 'PerformanceReview',
            action: 'SIGN',
          }),
        })
      );
    });

    it('should log Staff entity for staff management actions', async () => {
      mockRequest.params = { id: 'staff-member-123' };
      mockRequest.body = { firstName: 'Updated', department: 'Engineering' };
      const middleware = auditLog({ entityType: 'Staff', action: 'UPDATE' });

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      mockResponse.send!('updated');

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entityType: 'Staff',
            action: 'UPDATE',
            entityId: 'staff-member-123',
          }),
        })
      );
    });
  });
});

// Export for use in other test files if needed
export {};
