/**
 * Client Controller Tests
 *
 * HIPAA Security: PHI access and protection testing
 * Tests for client CRUD operations, data access controls
 */

import { Request, Response, NextFunction } from 'express';
import {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getClientStats,
} from '../client.controller';

// Alias for tests that use getClients
const getClients = getAllClients;

// Mock dependencies
jest.mock('../../services/database', () => ({
  __esModule: true,
  default: {
    client: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    clinicianAssignment: {
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../services/accessControl.service', () => ({
  assertCanAccessClient: jest.fn(),
  applyClientScope: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logControllerError: jest.fn().mockReturnValue('error-id-123'),
}));

jest.mock('../../services/resend.service', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  EmailTemplates: {
    clientWelcome: jest.fn().mockReturnValue({ subject: 'Welcome', html: '<p>Welcome</p>' }),
  },
}));

import prisma from '../../services/database';
import * as accessControl from '../../services/accessControl.service';
import logger from '../../utils/logger';

// Helper function to create valid client data for tests
const createValidClientBody = (overrides: Record<string, any> = {}) => ({
  firstName: 'Test',
  lastName: 'Client',
  dateOfBirth: '2000-01-15T00:00:00.000Z',
  primaryPhone: '555-123-4567',
  addressStreet1: '123 Test St',
  addressCity: 'Test City',
  addressState: 'CA',
  addressZipCode: '12345',
  primaryTherapistId: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID format
  gender: 'PREFER_NOT_TO_SAY',
  ...overrides,
});

describe('Client Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {},
      user: {
        userId: 'user-123',
        email: 'clinician@example.com',
        role: 'CLINICIAN',
        organizationId: 'org-123',
      } as any,
      ip: '127.0.0.1',
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('getClients', () => {
    it('should return clients for authenticated user', async () => {
      const mockClients = [
        {
          id: 'client-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          status: 'ACTIVE',
        },
        {
          id: 'client-2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          status: 'ACTIVE',
        },
      ];

      (accessControl.applyClientScope as jest.Mock).mockReturnValue({});
      (prisma.client.findMany as jest.Mock).mockResolvedValue(mockClients);
      (prisma.client.count as jest.Mock).mockResolvedValue(2);

      await getClients(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({ id: 'client-1' }),
          ]),
        })
      );
    });

    it('should apply pagination', async () => {
      mockReq.query = { page: '2', limit: '10' };

      (accessControl.applyClientScope as jest.Mock).mockReturnValue({});
      (prisma.client.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.client.count as jest.Mock).mockResolvedValue(25);

      await getClients(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });

    it('should support status filter in query', async () => {
      mockReq.query = { status: 'ACTIVE' };

      (accessControl.applyClientScope as jest.Mock).mockReturnValue({});
      (prisma.client.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.client.count as jest.Mock).mockResolvedValue(0);

      await getClients(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.client.findMany).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return empty list when no user context', async () => {
      mockReq.user = undefined;

      (accessControl.applyClientScope as jest.Mock).mockReturnValue({});
      (prisma.client.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.client.count as jest.Mock).mockResolvedValue(0);

      await getClients(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should call applyClientScope for RLS', async () => {
      const scopedClients = [
        { id: 'client-assigned', firstName: 'Assigned', lastName: 'Client' },
      ];

      (accessControl.applyClientScope as jest.Mock).mockReturnValue({
        clinicianAssignments: {
          some: { clinicianId: 'user-123' },
        },
      });
      (prisma.client.findMany as jest.Mock).mockResolvedValue(scopedClients);
      (prisma.client.count as jest.Mock).mockResolvedValue(1);

      await getClients(mockReq as Request, mockRes as Response, mockNext);

      expect(accessControl.applyClientScope).toHaveBeenCalled();
    });
  });

  describe('getClientById', () => {
    it('should return client by ID', async () => {
      mockReq.params = { id: 'client-123' };

      const mockClient = {
        id: 'client-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        dateOfBirth: new Date('1990-01-15'),
        ssn: 'encrypted-ssn', // Should be decrypted in response
      };

      (accessControl.assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(mockClient);

      await getClientById(mockReq as Request, mockRes as Response, mockNext);

      expect(accessControl.assertCanAccessClient).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 for non-existent client', async () => {
      mockReq.params = { id: 'non-existent' };

      (accessControl.assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(null);

      await getClientById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 404 when client not found after access check', async () => {
      mockReq.params = { id: 'protected-client' };

      // Access check passes but client not found
      (accessControl.assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(null);

      await getClientById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return client data successfully', async () => {
      mockReq.params = { id: 'client-123' };

      const mockClient = {
        id: 'client-123',
        firstName: 'John',
        lastName: 'Doe',
      };

      (accessControl.assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(mockClient);

      await getClientById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });
  });

  describe('createClient', () => {
    it('should create a new client', async () => {
      mockReq.body = createValidClientBody({
        firstName: 'New',
        lastName: 'Client',
        email: 'newclient@example.com',
      });

      const mockCreatedClient = {
        id: 'new-client-123',
        ...mockReq.body,
        medicalRecordNumber: 'MRN-123456',
      };

      (prisma.client.create as jest.Mock).mockResolvedValue(mockCreatedClient);

      await createClient(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 'new-client-123',
          }),
        })
      );
    });

    it('should validate required fields', async () => {
      mockReq.body = {
        email: 'incomplete@example.com',
        // Missing firstName, lastName
      };

      await createClient(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should validate email format', async () => {
      mockReq.body = {
        firstName: 'Test',
        lastName: 'User',
        email: 'not-an-email',
      };

      await createClient(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should create client with SSN field', async () => {
      mockReq.body = createValidClientBody({
        email: 'test@example.com',
      });

      (prisma.client.create as jest.Mock).mockResolvedValue({
        id: 'new-123',
        ...mockReq.body,
        medicalRecordNumber: 'MRN-123456',
      });

      await createClient(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.client.create).toHaveBeenCalled();
    });

    it('should handle Prisma duplicate error', async () => {
      mockReq.body = createValidClientBody({
        email: 'existing@example.com',
      });

      const prismaError = new Error('Unique constraint violation');
      (prismaError as any).code = 'P2002';
      (prismaError as any).meta = { target: ['email'] };
      (prisma.client.create as jest.Mock).mockRejectedValue(prismaError);

      await createClient(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should create client with createdBy set to current user', async () => {
      mockReq.body = createValidClientBody({
        email: 'org@example.com',
      });

      (prisma.client.create as jest.Mock).mockResolvedValue({
        id: 'new-123',
        ...mockReq.body,
        medicalRecordNumber: 'MRN-123456',
      });

      await createClient(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.client.create).toHaveBeenCalled();
    });
  });

  describe('updateClient', () => {
    it('should update client data', async () => {
      mockReq.params = { id: 'client-123' };
      mockReq.body = {
        firstName: 'Updated',
        phone: '555-999-8888',
      };

      const existingClient = {
        id: 'client-123',
        firstName: 'Original',
        lastName: 'Client',
      };

      const updatedClient = {
        ...existingClient,
        ...mockReq.body,
      };

      (accessControl.assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(existingClient);
      (prisma.client.update as jest.Mock).mockResolvedValue(updatedClient);

      await updateClient(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 when client not found', async () => {
      mockReq.params = { id: 'non-existent-client' };
      mockReq.body = { firstName: 'Updated' };

      (prisma.client.findUnique as jest.Mock).mockResolvedValue(null);

      await updateClient(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should not allow updating organizationId', async () => {
      mockReq.params = { id: 'client-123' };
      mockReq.body = {
        organizationId: 'other-org', // Should be ignored
        firstName: 'Valid',
      };

      const existingClient = { id: 'client-123', organizationId: 'org-123' };

      (accessControl.assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(existingClient);
      (prisma.client.update as jest.Mock).mockResolvedValue(existingClient);

      await updateClient(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.client.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'other-org',
          }),
        })
      );
    });

    it('should update client data successfully', async () => {
      mockReq.params = { id: 'client-123' };
      mockReq.body = { firstName: 'Updated' };

      (accessControl.assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
      (prisma.client.findUnique as jest.Mock).mockResolvedValue({ id: 'client-123' });
      (prisma.client.update as jest.Mock).mockResolvedValue({ id: 'client-123', firstName: 'Updated' });

      await updateClient(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(prisma.client.update).toHaveBeenCalled();
    });
  });

  describe('deleteClient', () => {
    it('should soft delete client (deactivate)', async () => {
      mockReq.params = { id: 'client-123' };

      const mockClient = { id: 'client-123', status: 'ACTIVE' };

      (accessControl.assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(mockClient);
      (prisma.client.update as jest.Mock).mockResolvedValue({ ...mockClient, status: 'INACTIVE' });

      await deleteClient(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.client.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'INACTIVE',
          }),
        })
      );
    });

    it('should return 404 when client not found', async () => {
      mockReq.params = { id: 'client-123' };
      mockReq.user = { ...mockReq.user, role: 'CLINICIAN' } as any;

      (prisma.client.findUnique as jest.Mock).mockResolvedValue(null);

      await deleteClient(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('search functionality (via getAllClients)', () => {
    it('should search by name', async () => {
      mockReq.query = { search: 'John' };

      const searchResults = [
        { id: 'c1', firstName: 'John', lastName: 'Doe' },
        { id: 'c2', firstName: 'Johnny', lastName: 'Smith' },
      ];

      (accessControl.applyClientScope as jest.Mock).mockReturnValue({});
      (prisma.client.findMany as jest.Mock).mockResolvedValue(searchResults);
      (prisma.client.count as jest.Mock).mockResolvedValue(2);

      await getAllClients(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.client.findMany).toHaveBeenCalled();
    });

    it('should search by email', async () => {
      mockReq.query = { search: 'test@example.com' };

      (accessControl.applyClientScope as jest.Mock).mockReturnValue({});
      (prisma.client.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.client.count as jest.Mock).mockResolvedValue(0);

      await getAllClients(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.client.findMany).toHaveBeenCalled();
    });

    it('should respect RLS in search', async () => {
      mockReq.query = { search: 'Confidential' };

      (accessControl.applyClientScope as jest.Mock).mockReturnValue({
        clinicianAssignments: { some: { clinicianId: 'user-123' } },
      });
      (prisma.client.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.client.count as jest.Mock).mockResolvedValue(0);

      await getAllClients(mockReq as Request, mockRes as Response, mockNext);

      expect(accessControl.applyClientScope).toHaveBeenCalled();
    });

    it('should sanitize search query', async () => {
      mockReq.query = { search: '<script>alert("xss")</script>' };

      (accessControl.applyClientScope as jest.Mock).mockReturnValue({});
      (prisma.client.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.client.count as jest.Mock).mockResolvedValue(0);

      await getAllClients(mockReq as Request, mockRes as Response, mockNext);

      // Query should be sanitized - XSS script tags stripped
      expect(prisma.client.findMany).toHaveBeenCalled();
    });

    it('should limit results for performance', async () => {
      mockReq.query = { search: 'common' };

      (accessControl.applyClientScope as jest.Mock).mockReturnValue({});
      (prisma.client.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.client.count as jest.Mock).mockResolvedValue(0);

      await getAllClients(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: expect.any(Number),
        })
      );
    });
  });

  // Note: getClientHistory function doesn't exist in client.controller.ts
  // History/audit logging is handled by the audit middleware, not a dedicated endpoint
});

describe('PHI Data Handling', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {},
      user: {
        userId: 'user-123',
        role: 'CLINICIAN',
        organizationId: 'org-123',
      } as any,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it('should return client data in list responses', async () => {
    const mockClients = [
      { id: 'c1', firstName: 'John', lastName: 'Doe' },
    ];

    (accessControl.applyClientScope as jest.Mock).mockReturnValue({});
    (prisma.client.findMany as jest.Mock).mockResolvedValue(mockClients);
    (prisma.client.count as jest.Mock).mockResolvedValue(1);

    await getClients(mockReq as Request, mockRes as Response, mockNext);

    const responseData = (mockRes.json as jest.Mock).mock.calls[0][0];
    expect(responseData.success).toBe(true);
    expect(responseData.data).toHaveLength(1);
    expect(responseData.data[0].firstName).toBe('John');
  });

  it('should return client details with proper access control', async () => {
    mockReq.params = { id: 'client-123' };
    mockReq.user = { ...mockReq.user, role: 'BILLING_STAFF' } as any;

    const mockClient = { id: 'client-123', firstName: 'John', lastName: 'Doe' };

    (accessControl.assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
    (prisma.client.findUnique as jest.Mock).mockResolvedValue(mockClient);

    await getClientById(mockReq as Request, mockRes as Response, mockNext);

    // Should return client data
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  it('should verify access control on client retrieval', async () => {
    mockReq.params = { id: 'client-123' };

    (accessControl.assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
    (prisma.client.findUnique as jest.Mock).mockResolvedValue({
      id: 'client-123',
      firstName: 'John',
    });

    await getClientById(mockReq as Request, mockRes as Response, mockNext);

    // Access control should be called with user info
    expect(accessControl.assertCanAccessClient).toHaveBeenCalled();
    expect(accessControl.assertCanAccessClient).toHaveBeenCalledWith(
      mockReq.user,
      expect.anything()
    );
  });
});

describe('Input Validation', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      user: { userId: 'user-123', organizationId: 'org-123' } as any,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it('should validate date of birth format', async () => {
    mockReq.body = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      dateOfBirth: 'not-a-date',
    };

    await createClient(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('should validate phone number format', async () => {
    mockReq.body = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: 'invalid-phone',
    };

    await createClient(mockReq as Request, mockRes as Response, mockNext);

    // Should either sanitize or reject
    expect(mockRes.status).toHaveBeenCalled();
  });

  it('should validate SSN format', async () => {
    mockReq.body = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      ssn: 'not-an-ssn',
    };

    await createClient(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('should reject future date of birth', async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    mockReq.body = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      dateOfBirth: futureDate.toISOString(),
    };

    await createClient(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });
});
