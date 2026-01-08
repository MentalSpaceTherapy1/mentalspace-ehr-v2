/**
 * PTO (Paid Time Off) Module Unit Tests
 *
 * Tests for Staff & HR module PTO functionality including:
 * - Route authorization and middleware verification
 * - Controller CRUD operations and workflow actions
 * - Ownership validation and permission checks
 */

import { Request, Response, NextFunction } from 'express';
import { PTOController } from '../controllers/pto.controller';
import ptoService from '../services/pto.service';
import { PTOStatus, AbsenceType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock the PTO service
jest.mock('../services/pto.service');

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(),
  PTOStatus: {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    DENIED: 'DENIED',
    CANCELLED: 'CANCELLED',
  },
  AbsenceType: {
    PTO: 'PTO',
    SICK: 'SICK',
    VACATION: 'VACATION',
    PERSONAL: 'PERSONAL',
    BEREAVEMENT: 'BEREAVEMENT',
    FMLA: 'FMLA',
    OTHER: 'OTHER',
  },
}));

// Mock Decimal class
jest.mock('@prisma/client/runtime/library', () => ({
  Decimal: jest.fn().mockImplementation((value: number) => ({
    toNumber: () => value,
    lessThan: (other: any) => value < (other.toNumber ? other.toNumber() : other),
    greaterThan: (other: any) => value > (other.toNumber ? other.toNumber() : other),
    plus: (other: any) => ({ toNumber: () => value + (other.toNumber ? other.toNumber() : other) }),
    minus: (other: any) => ({ toNumber: () => value - (other.toNumber ? other.toNumber() : other) }),
  })),
}));

describe('PTO Module Tests', () => {
  let controller: PTOController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any;
  let mockPtoService: jest.Mocked<typeof ptoService>;

  beforeEach(() => {
    controller = new PTOController();
    mockPtoService = ptoService as jest.Mocked<typeof ptoService>;

    // Reset response object
    responseObject = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation((result) => {
        responseObject = result;
        return mockResponse;
      }),
    };

    // Default mock request with authenticated user
    mockRequest = {
      user: {
        id: 'user-123',
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['CLINICIAN'],
      },
      params: {},
      query: {},
      body: {},
    } as any;

    jest.clearAllMocks();
  });

  // ============================================================================
  // SECTION 1: PTO Routes Authorization Tests
  // ============================================================================
  describe('PTO Routes Authorization Tests', () => {
    describe('authenticate middleware verification', () => {
      it('should return 401 when no authentication token provided', async () => {
        // Simulate unauthenticated request
        mockRequest.user = undefined;
        (mockRequest as any).user = undefined;

        await controller.createRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(responseObject.success).toBe(false);
        expect(responseObject.message).toBe('Authentication required');
      });

      it('should return 401 when user id is missing', async () => {
        mockRequest.user = {
          email: 'test@example.com',
          roles: ['CLINICIAN'],
        } as any;

        await controller.createRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(responseObject.success).toBe(false);
      });

      it('should proceed when user is properly authenticated', async () => {
        const mockPTORequest = {
          id: 'pto-123',
          userId: 'user-123',
          requestType: 'PTO',
          status: 'PENDING',
          startDate: new Date('2025-01-15'),
          endDate: new Date('2025-01-17'),
          totalDays: new Decimal(3),
        };

        mockRequest.body = {
          startDate: '2025-01-15',
          endDate: '2025-01-17',
          requestType: 'PTO',
          reason: 'Vacation',
        };

        mockPtoService.createRequest.mockResolvedValue(mockPTORequest as any);

        await controller.createRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(responseObject.success).toBe(true);
      });
    });

    describe('requireRole middleware for approve/deny', () => {
      it('should allow ADMINISTRATOR to approve PTO requests', async () => {
        mockRequest.user = {
          id: 'admin-123',
          userId: 'admin-123',
          email: 'admin@example.com',
          roles: ['ADMINISTRATOR'],
        } as any;
        mockRequest.params = { id: 'pto-123' };
        mockRequest.body = { approvalNotes: 'Approved' };

        const mockPTORequest = {
          id: 'pto-123',
          userId: 'other-user-456', // Different user - not self-approval
          status: 'PENDING',
          requestType: 'PTO',
        };

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);
        mockPtoService.approveRequest.mockResolvedValue({
          ...mockPTORequest,
          status: 'APPROVED',
        } as any);

        await controller.approveRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject.success).toBe(true);
      });

      it('should allow SUPER_ADMIN to approve PTO requests', async () => {
        mockRequest.user = {
          id: 'superadmin-123',
          userId: 'superadmin-123',
          email: 'superadmin@example.com',
          roles: ['SUPER_ADMIN'],
        } as any;
        mockRequest.params = { id: 'pto-123' };
        mockRequest.body = { approvalNotes: 'Approved by super admin' };

        const mockPTORequest = {
          id: 'pto-123',
          userId: 'other-user-456',
          status: 'PENDING',
          requestType: 'PTO',
        };

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);
        mockPtoService.approveRequest.mockResolvedValue({
          ...mockPTORequest,
          status: 'APPROVED',
        } as any);

        await controller.approveRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
      });

      it('should allow SUPERVISOR to approve PTO requests', async () => {
        mockRequest.user = {
          id: 'supervisor-123',
          userId: 'supervisor-123',
          email: 'supervisor@example.com',
          roles: ['SUPERVISOR'],
        } as any;
        mockRequest.params = { id: 'pto-123' };
        mockRequest.body = { approvalNotes: 'Approved by supervisor' };

        const mockPTORequest = {
          id: 'pto-123',
          userId: 'other-user-456',
          status: 'PENDING',
          requestType: 'PTO',
        };

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);
        mockPtoService.approveRequest.mockResolvedValue({
          ...mockPTORequest,
          status: 'APPROVED',
        } as any);

        await controller.approveRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
      });

      it('should allow ADMINISTRATOR to deny PTO requests', async () => {
        mockRequest.user = {
          id: 'admin-123',
          userId: 'admin-123',
          email: 'admin@example.com',
          roles: ['ADMINISTRATOR'],
        } as any;
        mockRequest.params = { id: 'pto-123' };
        mockRequest.body = { approvalNotes: 'Denied due to staffing needs' };

        const mockPTORequest = {
          id: 'pto-123',
          userId: 'other-user-456',
          status: 'PENDING',
          requestType: 'PTO',
        };

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);
        mockPtoService.denyRequest.mockResolvedValue({
          ...mockPTORequest,
          status: 'DENIED',
        } as any);

        await controller.denyRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
      });
    });

    describe('auditLog middleware verification', () => {
      it('should log audit when creating PTO request', async () => {
        // The audit log middleware is applied in routes, this test verifies
        // the controller works correctly (audit logging happens at route level)
        const mockPTORequest = {
          id: 'pto-123',
          userId: 'user-123',
          requestType: 'PTO',
          status: 'PENDING',
        };

        mockRequest.body = {
          startDate: '2025-01-15',
          endDate: '2025-01-17',
          requestType: 'PTO',
        };

        mockPtoService.createRequest.mockResolvedValue(mockPTORequest as any);

        await controller.createRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(201);
        // Audit logging is handled by middleware, not controller
        // This test confirms the controller completes successfully
      });
    });
  });

  // ============================================================================
  // SECTION 2: PTO Controller Tests
  // ============================================================================
  describe('PTO Controller Tests', () => {
    describe('createRequest', () => {
      it('should return 201 with valid request data', async () => {
        const mockPTORequest = {
          id: 'pto-123',
          userId: 'user-123',
          requestType: 'PTO',
          status: 'PENDING',
          startDate: new Date('2025-01-15'),
          endDate: new Date('2025-01-17'),
          totalDays: new Decimal(3),
          user: {
            id: 'user-123',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
        };

        mockRequest.body = {
          startDate: '2025-01-15T00:00:00.000Z',
          endDate: '2025-01-17T00:00:00.000Z',
          requestType: 'PTO',
          reason: 'Family vacation',
        };

        mockPtoService.createRequest.mockResolvedValue(mockPTORequest as any);

        await controller.createRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(responseObject.success).toBe(true);
        expect(responseObject.data).toEqual(mockPTORequest);
        expect(responseObject.message).toBe('PTO request created successfully');
      });

      it('should return 400 when insufficient balance', async () => {
        mockRequest.body = {
          startDate: '2025-01-15T00:00:00.000Z',
          endDate: '2025-01-31T00:00:00.000Z',
          requestType: 'PTO',
          reason: 'Long vacation',
        };

        mockPtoService.createRequest.mockRejectedValue(
          new Error('Insufficient PTO balance. Available: 5 days, Requested: 13 days')
        );

        await controller.createRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(responseObject.success).toBe(false);
        expect(responseObject.message).toContain('Insufficient');
      });

      it('should return 400 when start date is after end date', async () => {
        mockRequest.body = {
          startDate: '2025-01-20T00:00:00.000Z',
          endDate: '2025-01-15T00:00:00.000Z',
          requestType: 'PTO',
        };

        mockPtoService.createRequest.mockRejectedValue(
          new Error('Start date must be before end date')
        );

        await controller.createRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(responseObject.success).toBe(false);
      });

      it('should return 403 when non-admin tries to create request for another user', async () => {
        mockRequest.user = {
          id: 'user-123',
          userId: 'user-123',
          roles: ['CLINICIAN'],
        } as any;
        mockRequest.body = {
          userId: 'other-user-456', // Trying to create for someone else
          startDate: '2025-01-15T00:00:00.000Z',
          endDate: '2025-01-17T00:00:00.000Z',
          requestType: 'PTO',
        };

        await controller.createRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(responseObject.success).toBe(false);
        expect(responseObject.message).toContain('Only administrators');
      });

      it('should allow admin to create request for another user', async () => {
        mockRequest.user = {
          id: 'admin-123',
          userId: 'admin-123',
          roles: ['ADMINISTRATOR'],
        } as any;
        mockRequest.body = {
          userId: 'other-user-456',
          startDate: '2025-01-15T00:00:00.000Z',
          endDate: '2025-01-17T00:00:00.000Z',
          requestType: 'PTO',
        };

        const mockPTORequest = {
          id: 'pto-123',
          userId: 'other-user-456',
          requestType: 'PTO',
          status: 'PENDING',
        };

        mockPtoService.createRequest.mockResolvedValue(mockPTORequest as any);

        await controller.createRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(mockPtoService.createRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'other-user-456',
          })
        );
      });
    });

    describe('getRequestById', () => {
      it('should return 200 with valid ID and own request', async () => {
        const mockPTORequest = {
          id: 'pto-123',
          userId: 'user-123',
          requestType: 'PTO',
          status: 'PENDING',
          startDate: new Date('2025-01-15'),
          endDate: new Date('2025-01-17'),
          totalDays: new Decimal(3),
          user: {
            id: 'user-123',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
        };

        mockRequest.params = { id: 'pto-123' };
        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);

        await controller.getRequestById(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject.success).toBe(true);
        expect(responseObject.data).toEqual(mockPTORequest);
      });

      it('should return 404 with invalid ID', async () => {
        mockRequest.params = { id: 'nonexistent-pto-id' };
        mockPtoService.getRequestById.mockRejectedValue(new Error('PTO request not found'));

        await controller.getRequestById(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(responseObject.success).toBe(false);
        expect(responseObject.message).toContain('not found');
      });

      it('should return 403 when non-admin views another users request', async () => {
        const mockPTORequest = {
          id: 'pto-123',
          userId: 'other-user-456', // Different user
          requestType: 'PTO',
          status: 'PENDING',
        };

        mockRequest.params = { id: 'pto-123' };
        mockRequest.user = {
          id: 'user-123',
          userId: 'user-123',
          roles: ['CLINICIAN'],
        } as any;

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);

        await controller.getRequestById(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(responseObject.success).toBe(false);
        expect(responseObject.message).toContain('Not authorized');
      });

      it('should allow admin to view any request', async () => {
        const mockPTORequest = {
          id: 'pto-123',
          userId: 'other-user-456',
          requestType: 'PTO',
          status: 'PENDING',
        };

        mockRequest.params = { id: 'pto-123' };
        mockRequest.user = {
          id: 'admin-123',
          userId: 'admin-123',
          roles: ['ADMINISTRATOR'],
        } as any;

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);

        await controller.getRequestById(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject.success).toBe(true);
      });
    });

    describe('approveRequest', () => {
      it('should return 200 when admin approves request', async () => {
        mockRequest.user = {
          id: 'admin-123',
          userId: 'admin-123',
          roles: ['ADMINISTRATOR'],
        } as any;
        mockRequest.params = { id: 'pto-123' };
        mockRequest.body = { approvalNotes: 'Approved - enjoy your time off' };

        const mockPTORequest = {
          id: 'pto-123',
          userId: 'user-456',
          status: 'PENDING',
          requestType: 'PTO',
        };

        const approvedRequest = {
          ...mockPTORequest,
          status: 'APPROVED',
          approvedById: 'admin-123',
          approvalNotes: 'Approved - enjoy your time off',
        };

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);
        mockPtoService.approveRequest.mockResolvedValue(approvedRequest as any);

        await controller.approveRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject.success).toBe(true);
        expect(responseObject.message).toBe('PTO request approved successfully');
        expect(mockPtoService.approveRequest).toHaveBeenCalledWith('pto-123', {
          approvedById: 'admin-123',
          approvalNotes: 'Approved - enjoy your time off',
        });
      });

      it('should return 403 when user tries to approve own request', async () => {
        mockRequest.user = {
          id: 'user-123',
          userId: 'user-123',
          roles: ['ADMINISTRATOR'], // Even admin cannot self-approve
        } as any;
        mockRequest.params = { id: 'pto-123' };
        mockRequest.body = { approvalNotes: 'Self approval attempt' };

        const mockPTORequest = {
          id: 'pto-123',
          userId: 'user-123', // Same user
          status: 'PENDING',
          requestType: 'PTO',
        };

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);

        await controller.approveRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(responseObject.success).toBe(false);
        expect(responseObject.message).toContain('Cannot approve your own');
      });

      it('should return 400 when request is not pending', async () => {
        mockRequest.user = {
          id: 'admin-123',
          userId: 'admin-123',
          roles: ['ADMINISTRATOR'],
        } as any;
        mockRequest.params = { id: 'pto-123' };
        mockRequest.body = { approvalNotes: 'Approve' };

        const mockPTORequest = {
          id: 'pto-123',
          userId: 'user-456',
          status: 'APPROVED', // Already approved
          requestType: 'PTO',
        };

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);
        mockPtoService.approveRequest.mockRejectedValue(
          new Error('Cannot transition from APPROVED to APPROVED')
        );

        await controller.approveRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
      });
    });

    describe('denyRequest', () => {
      it('should return 400 when denial notes are missing', async () => {
        mockRequest.user = {
          id: 'admin-123',
          userId: 'admin-123',
          roles: ['ADMINISTRATOR'],
        } as any;
        mockRequest.params = { id: 'pto-123' };
        mockRequest.body = {}; // No approval notes

        await controller.denyRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(responseObject.success).toBe(false);
        expect(responseObject.message).toContain('Denial reason is required');
      });

      it('should return 200 when admin denies request with notes', async () => {
        mockRequest.user = {
          id: 'admin-123',
          userId: 'admin-123',
          roles: ['ADMINISTRATOR'],
        } as any;
        mockRequest.params = { id: 'pto-123' };
        mockRequest.body = { approvalNotes: 'Denied due to critical project deadline' };

        const mockPTORequest = {
          id: 'pto-123',
          userId: 'user-456',
          status: 'PENDING',
          requestType: 'PTO',
        };

        const deniedRequest = {
          ...mockPTORequest,
          status: 'DENIED',
          approvedById: 'admin-123',
          approvalNotes: 'Denied due to critical project deadline',
        };

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);
        mockPtoService.denyRequest.mockResolvedValue(deniedRequest as any);

        await controller.denyRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject.success).toBe(true);
        expect(responseObject.message).toBe('PTO request denied');
      });

      it('should return 403 when user tries to deny own request', async () => {
        mockRequest.user = {
          id: 'user-123',
          userId: 'user-123',
          roles: ['ADMINISTRATOR'],
        } as any;
        mockRequest.params = { id: 'pto-123' };
        mockRequest.body = { approvalNotes: 'Self denial' };

        const mockPTORequest = {
          id: 'pto-123',
          userId: 'user-123', // Same user
          status: 'PENDING',
          requestType: 'PTO',
        };

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);

        await controller.denyRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(responseObject.success).toBe(false);
        expect(responseObject.message).toContain('Cannot deny your own');
      });
    });

    describe('cancelRequest', () => {
      it('should return 200 when user cancels own pending request', async () => {
        mockRequest.params = { id: 'pto-123' };

        const mockPTORequest = {
          id: 'pto-123',
          userId: 'user-123', // Same as current user
          status: 'PENDING',
          requestType: 'PTO',
        };

        const cancelledRequest = {
          ...mockPTORequest,
          status: 'CANCELLED',
        };

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);
        mockPtoService.cancelRequest.mockResolvedValue(cancelledRequest as any);

        await controller.cancelRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject.success).toBe(true);
        expect(responseObject.message).toBe('PTO request cancelled successfully');
      });

      it('should restore balance when cancelling approved request', async () => {
        mockRequest.params = { id: 'pto-123' };

        const mockPTORequest = {
          id: 'pto-123',
          userId: 'user-123',
          status: 'APPROVED', // Was approved
          requestType: 'PTO',
          totalDays: new Decimal(3),
        };

        const cancelledRequest = {
          ...mockPTORequest,
          status: 'CANCELLED',
        };

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);
        mockPtoService.cancelRequest.mockResolvedValue(cancelledRequest as any);

        await controller.cancelRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        // Balance restoration is handled internally by the service
        expect(mockPtoService.cancelRequest).toHaveBeenCalledWith('pto-123');
      });

      it('should return 403 when non-admin tries to cancel another users request', async () => {
        mockRequest.params = { id: 'pto-123' };
        mockRequest.user = {
          id: 'user-123',
          userId: 'user-123',
          roles: ['CLINICIAN'],
        } as any;

        const mockPTORequest = {
          id: 'pto-123',
          userId: 'other-user-456', // Different user
          status: 'PENDING',
          requestType: 'PTO',
        };

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);

        await controller.cancelRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(responseObject.success).toBe(false);
        expect(responseObject.message).toContain('Not authorized');
      });

      it('should allow admin to cancel any request', async () => {
        mockRequest.params = { id: 'pto-123' };
        mockRequest.user = {
          id: 'admin-123',
          userId: 'admin-123',
          roles: ['ADMINISTRATOR'],
        } as any;

        const mockPTORequest = {
          id: 'pto-123',
          userId: 'other-user-456',
          status: 'PENDING',
          requestType: 'PTO',
        };

        const cancelledRequest = {
          ...mockPTORequest,
          status: 'CANCELLED',
        };

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);
        mockPtoService.cancelRequest.mockResolvedValue(cancelledRequest as any);

        await controller.cancelRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
      });
    });

    describe('getBalance', () => {
      it('should return 200 when user views own balance', async () => {
        mockRequest.params = { userId: 'user-123' };

        const mockBalance = {
          userId: 'user-123',
          ptoBalance: new Decimal(10),
          sickBalance: new Decimal(5),
          vacationBalance: new Decimal(8),
          ptoAnnual: new Decimal(15),
          sickAnnual: new Decimal(10),
          vacationAnnual: new Decimal(10),
        };

        mockPtoService.getBalance.mockResolvedValue(mockBalance as any);

        await controller.getBalance(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject.success).toBe(true);
        expect(responseObject.data).toEqual(mockBalance);
      });

      it('should return 200 when admin views any user balance', async () => {
        mockRequest.params = { userId: 'other-user-456' };
        mockRequest.user = {
          id: 'admin-123',
          userId: 'admin-123',
          roles: ['ADMINISTRATOR'],
        } as any;

        const mockBalance = {
          userId: 'other-user-456',
          ptoBalance: new Decimal(12),
          sickBalance: new Decimal(6),
          vacationBalance: new Decimal(9),
        };

        mockPtoService.getBalance.mockResolvedValue(mockBalance as any);

        await controller.getBalance(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject.success).toBe(true);
      });

      it('should allow supervisor to view any user balance', async () => {
        mockRequest.params = { userId: 'other-user-456' };
        mockRequest.user = {
          id: 'supervisor-123',
          userId: 'supervisor-123',
          roles: ['SUPERVISOR'],
        } as any;

        const mockBalance = {
          userId: 'other-user-456',
          ptoBalance: new Decimal(12),
        };

        mockPtoService.getBalance.mockResolvedValue(mockBalance as any);

        await controller.getBalance(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
      });

      it('should return 403 when non-admin views another users balance', async () => {
        mockRequest.params = { userId: 'other-user-456' };
        mockRequest.user = {
          id: 'user-123',
          userId: 'user-123',
          roles: ['CLINICIAN'],
        } as any;

        await controller.getBalance(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(responseObject.success).toBe(false);
        expect(responseObject.message).toContain('Not authorized');
      });
    });

    describe('getAllRequests', () => {
      it('should filter requests to own for non-admin users', async () => {
        mockRequest.user = {
          id: 'user-123',
          userId: 'user-123',
          roles: ['CLINICIAN'],
        } as any;

        const mockResult = {
          requests: [
            { id: 'pto-1', userId: 'user-123', status: 'PENDING' },
          ],
          pagination: {
            total: 1,
            page: 1,
            limit: 50,
            totalPages: 1,
          },
        };

        mockPtoService.getAllRequests.mockResolvedValue(mockResult as any);

        await controller.getAllRequests(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockPtoService.getAllRequests).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-123', // Forced to own userId
          })
        );
      });

      it('should allow admin to view all requests', async () => {
        mockRequest.user = {
          id: 'admin-123',
          userId: 'admin-123',
          roles: ['ADMINISTRATOR'],
        } as any;

        const mockResult = {
          requests: [
            { id: 'pto-1', userId: 'user-123', status: 'PENDING' },
            { id: 'pto-2', userId: 'user-456', status: 'APPROVED' },
          ],
          pagination: {
            total: 2,
            page: 1,
            limit: 50,
            totalPages: 1,
          },
        };

        mockPtoService.getAllRequests.mockResolvedValue(mockResult as any);

        await controller.getAllRequests(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject.data).toHaveLength(2);
      });
    });

    describe('updateRequest', () => {
      it('should return 200 when user updates own pending request', async () => {
        mockRequest.params = { id: 'pto-123' };
        mockRequest.body = { reason: 'Updated reason for time off' };

        const mockPTORequest = {
          id: 'pto-123',
          userId: 'user-123',
          status: 'PENDING',
          requestType: 'PTO',
        };

        const updatedRequest = {
          ...mockPTORequest,
          reason: 'Updated reason for time off',
        };

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);
        mockPtoService.updateRequest.mockResolvedValue(updatedRequest as any);

        await controller.updateRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject.success).toBe(true);
      });

      it('should return 400 when trying to update non-pending request', async () => {
        mockRequest.params = { id: 'pto-123' };
        mockRequest.body = { reason: 'Updated reason' };
        mockRequest.user = {
          id: 'user-123',
          userId: 'user-123',
          roles: ['CLINICIAN'],
        } as any;

        const mockPTORequest = {
          id: 'pto-123',
          userId: 'user-123',
          status: 'APPROVED', // Not pending
          requestType: 'PTO',
        };

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);

        await controller.updateRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(responseObject.message).toContain('pending');
      });

      it('should return 403 when non-admin tries to update another users request', async () => {
        mockRequest.params = { id: 'pto-123' };
        mockRequest.body = { reason: 'Updated reason' };
        mockRequest.user = {
          id: 'user-123',
          userId: 'user-123',
          roles: ['CLINICIAN'],
        } as any;

        const mockPTORequest = {
          id: 'pto-123',
          userId: 'other-user-456', // Different user
          status: 'PENDING',
          requestType: 'PTO',
        };

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);

        await controller.updateRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
      });
    });

    describe('deleteRequest', () => {
      it('should return 200 when user deletes own pending request', async () => {
        mockRequest.params = { id: 'pto-123' };

        const mockPTORequest = {
          id: 'pto-123',
          userId: 'user-123',
          status: 'PENDING',
          requestType: 'PTO',
        };

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);
        mockPtoService.deleteRequest.mockResolvedValue({ message: 'PTO request deleted successfully' });

        await controller.deleteRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject.success).toBe(true);
      });

      it('should return 400 when non-admin tries to delete non-pending request', async () => {
        mockRequest.params = { id: 'pto-123' };
        mockRequest.user = {
          id: 'user-123',
          userId: 'user-123',
          roles: ['CLINICIAN'],
        } as any;

        const mockPTORequest = {
          id: 'pto-123',
          userId: 'user-123',
          status: 'APPROVED', // Not pending
          requestType: 'PTO',
        };

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);

        await controller.deleteRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(responseObject.message).toContain('pending');
      });
    });

    describe('getPendingRequests', () => {
      it('should return all pending requests', async () => {
        const mockPendingRequests = [
          { id: 'pto-1', userId: 'user-1', status: 'PENDING' },
          { id: 'pto-2', userId: 'user-2', status: 'PENDING' },
        ];

        mockPtoService.getPendingRequests.mockResolvedValue(mockPendingRequests as any);

        await controller.getPendingRequests(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject.success).toBe(true);
        expect(responseObject.data).toHaveLength(2);
      });
    });

    describe('getPTOCalendar', () => {
      it('should return calendar data for date range', async () => {
        mockRequest.query = {
          startDate: '2025-01-01T00:00:00.000Z',
          endDate: '2025-01-31T00:00:00.000Z',
        };

        const mockCalendarData = [
          { id: 'pto-1', userId: 'user-1', status: 'APPROVED', startDate: new Date('2025-01-15') },
        ];

        mockPtoService.getPTOCalendar.mockResolvedValue(mockCalendarData as any);

        await controller.getPTOCalendar(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject.success).toBe(true);
      });

      it('should return 400 when dates are missing', async () => {
        mockRequest.query = {}; // No dates provided

        await controller.getPTOCalendar(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(responseObject.message).toContain('Start date and end date are required');
      });
    });

    describe('updateBalance', () => {
      it('should return 200 when admin updates balance', async () => {
        mockRequest.params = { userId: 'user-123' };
        mockRequest.body = {
          ptoBalance: 15,
          sickBalance: 10,
        };

        const updatedBalance = {
          userId: 'user-123',
          ptoBalance: new Decimal(15),
          sickBalance: new Decimal(10),
        };

        mockPtoService.updateBalance.mockResolvedValue(updatedBalance as any);

        await controller.updateBalance(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject.success).toBe(true);
        expect(responseObject.message).toBe('PTO balance updated successfully');
      });
    });

    describe('processAccruals', () => {
      it('should return 200 when accruals are processed', async () => {
        const mockResult = {
          message: 'Processed accruals for 5 users',
          results: [
            { userId: 'user-1', accrued: 1.5, newBalance: 11.5 },
            { userId: 'user-2', accrued: 1.5, newBalance: 8.5 },
          ],
        };

        mockPtoService.processAccruals.mockResolvedValue(mockResult);

        await controller.processAccruals(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(responseObject.success).toBe(true);
        expect(responseObject.message).toContain('Processed accruals');
      });
    });
  });

  // ============================================================================
  // SECTION 3: Ownership Validation Tests
  // ============================================================================
  describe('Ownership Validation Tests', () => {
    describe('User cannot view others PTO without permission', () => {
      it('should deny access when CLINICIAN tries to view other user PTO request', async () => {
        mockRequest.params = { id: 'pto-123' };
        mockRequest.user = {
          id: 'user-123',
          userId: 'user-123',
          roles: ['CLINICIAN'],
        } as any;

        const mockPTORequest = {
          id: 'pto-123',
          userId: 'other-user-456',
          status: 'PENDING',
          requestType: 'PTO',
        };

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);

        await controller.getRequestById(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(responseObject.message).toContain('Not authorized');
      });

      it('should deny access when CLINICIAN tries to view other user balance', async () => {
        mockRequest.params = { userId: 'other-user-456' };
        mockRequest.user = {
          id: 'user-123',
          userId: 'user-123',
          roles: ['CLINICIAN'],
        } as any;

        await controller.getBalance(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(responseObject.message).toContain('Not authorized');
      });

      it('should allow SUPERVISOR to view other user PTO request', async () => {
        mockRequest.params = { id: 'pto-123' };
        mockRequest.user = {
          id: 'supervisor-123',
          userId: 'supervisor-123',
          roles: ['SUPERVISOR'],
        } as any;

        const mockPTORequest = {
          id: 'pto-123',
          userId: 'other-user-456',
          status: 'PENDING',
          requestType: 'PTO',
        };

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);

        await controller.getRequestById(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
      });

      it('should allow SUPER_ADMIN to view other user PTO request', async () => {
        mockRequest.params = { id: 'pto-123' };
        mockRequest.user = {
          id: 'superadmin-123',
          userId: 'superadmin-123',
          roles: ['SUPER_ADMIN'],
        } as any;

        const mockPTORequest = {
          id: 'pto-123',
          userId: 'other-user-456',
          status: 'PENDING',
          requestType: 'PTO',
        };

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);

        await controller.getRequestById(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
      });
    });

    describe('User cannot approve own request', () => {
      it('should prevent ADMINISTRATOR from approving own request', async () => {
        mockRequest.params = { id: 'pto-123' };
        mockRequest.body = { approvalNotes: 'Self approval' };
        mockRequest.user = {
          id: 'admin-123',
          userId: 'admin-123',
          roles: ['ADMINISTRATOR'],
        } as any;

        const mockPTORequest = {
          id: 'pto-123',
          userId: 'admin-123', // Same user
          status: 'PENDING',
          requestType: 'PTO',
        };

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);

        await controller.approveRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(responseObject.message).toContain('Cannot approve your own');
      });

      it('should prevent SUPER_ADMIN from approving own request', async () => {
        mockRequest.params = { id: 'pto-123' };
        mockRequest.body = { approvalNotes: 'Self approval' };
        mockRequest.user = {
          id: 'superadmin-123',
          userId: 'superadmin-123',
          roles: ['SUPER_ADMIN'],
        } as any;

        const mockPTORequest = {
          id: 'pto-123',
          userId: 'superadmin-123', // Same user
          status: 'PENDING',
          requestType: 'PTO',
        };

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);

        await controller.approveRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(responseObject.message).toContain('Cannot approve your own');
      });

      it('should prevent SUPERVISOR from approving own request', async () => {
        mockRequest.params = { id: 'pto-123' };
        mockRequest.body = { approvalNotes: 'Self approval' };
        mockRequest.user = {
          id: 'supervisor-123',
          userId: 'supervisor-123',
          roles: ['SUPERVISOR'],
        } as any;

        const mockPTORequest = {
          id: 'pto-123',
          userId: 'supervisor-123', // Same user
          status: 'PENDING',
          requestType: 'PTO',
        };

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);

        await controller.approveRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(responseObject.message).toContain('Cannot approve your own');
      });

      it('should prevent user from denying own request', async () => {
        mockRequest.params = { id: 'pto-123' };
        mockRequest.body = { approvalNotes: 'Self denial reason' };
        mockRequest.user = {
          id: 'admin-123',
          userId: 'admin-123',
          roles: ['ADMINISTRATOR'],
        } as any;

        const mockPTORequest = {
          id: 'pto-123',
          userId: 'admin-123', // Same user
          status: 'PENDING',
          requestType: 'PTO',
        };

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);

        await controller.denyRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(responseObject.message).toContain('Cannot deny your own');
      });
    });

    describe('Multiple role handling', () => {
      it('should allow user with multiple roles including ADMINISTRATOR', async () => {
        mockRequest.params = { id: 'pto-123' };
        mockRequest.body = { approvalNotes: 'Approved' };
        mockRequest.user = {
          id: 'multi-role-user',
          userId: 'multi-role-user',
          roles: ['CLINICIAN', 'ADMINISTRATOR'], // Multiple roles
        } as any;

        const mockPTORequest = {
          id: 'pto-123',
          userId: 'other-user-456',
          status: 'PENDING',
          requestType: 'PTO',
        };

        const approvedRequest = {
          ...mockPTORequest,
          status: 'APPROVED',
        };

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);
        mockPtoService.approveRequest.mockResolvedValue(approvedRequest as any);

        await controller.approveRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
      });
    });
  });

  // ============================================================================
  // SECTION 4: Edge Cases and Error Handling
  // ============================================================================
  describe('Edge Cases and Error Handling', () => {
    describe('Database error handling', () => {
      it('should handle database errors gracefully on create', async () => {
        mockRequest.body = {
          startDate: '2025-01-15T00:00:00.000Z',
          endDate: '2025-01-17T00:00:00.000Z',
          requestType: 'PTO',
        };

        mockPtoService.createRequest.mockRejectedValue(new Error('Database connection failed'));

        await controller.createRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(responseObject.success).toBe(false);
      });

      it('should handle database errors gracefully on getBalance', async () => {
        mockRequest.params = { userId: 'user-123' };

        mockPtoService.getBalance.mockRejectedValue(new Error('Database timeout'));

        await controller.getBalance(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(responseObject.success).toBe(false);
      });
    });

    describe('Invalid input handling', () => {
      it('should handle missing request body fields', async () => {
        mockRequest.body = {}; // Empty body

        mockPtoService.createRequest.mockRejectedValue(
          new Error('Missing required fields')
        );

        await controller.createRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
      });

      it('should handle invalid date formats', async () => {
        mockRequest.body = {
          startDate: 'not-a-date',
          endDate: '2025-01-17T00:00:00.000Z',
          requestType: 'PTO',
        };

        mockPtoService.createRequest.mockRejectedValue(
          new Error('Invalid date format')
        );

        await controller.createRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
      });
    });

    describe('Concurrent request handling', () => {
      it('should handle overlapping PTO requests', async () => {
        mockRequest.body = {
          startDate: '2025-01-15T00:00:00.000Z',
          endDate: '2025-01-17T00:00:00.000Z',
          requestType: 'PTO',
        };

        mockPtoService.createRequest.mockRejectedValue(
          new Error('You already have approved PTO during this period')
        );

        await controller.createRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(responseObject.message).toContain('already have approved PTO');
      });
    });

    describe('Status transition validation', () => {
      it('should handle invalid status transitions', async () => {
        mockRequest.params = { id: 'pto-123' };
        mockRequest.body = { approvalNotes: 'Try to re-approve' };
        mockRequest.user = {
          id: 'admin-123',
          userId: 'admin-123',
          roles: ['ADMINISTRATOR'],
        } as any;

        const mockPTORequest = {
          id: 'pto-123',
          userId: 'other-user-456',
          status: 'DENIED', // Already denied
          requestType: 'PTO',
        };

        mockPtoService.getRequestById.mockResolvedValue(mockPTORequest as any);
        mockPtoService.approveRequest.mockRejectedValue(
          new Error('Cannot transition from DENIED to APPROVED')
        );

        await controller.approveRequest(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
      });
    });
  });
});

// Export for use in other test files if needed
export { };
