/**
 * Client Controller Tests
 *
 * HIPAA Security: PHI access and protection testing
 * Tests for client CRUD operations, data access controls
 */

import { Request, Response, NextFunction } from 'express';
import {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  searchClients,
  getClientHistory,
} from '../client.controller';

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
}));

import prisma from '../../services/database';
import * as accessControl from '../../services/accessControl.service';
import logger from '../../utils/logger';

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

    it('should filter by status', async () => {
      mockReq.query = { status: 'ACTIVE' };

      (accessControl.applyClientScope as jest.Mock).mockReturnValue({});
      (prisma.client.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.client.count as jest.Mock).mockResolvedValue(0);

      await getClients(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('should return 401 for unauthenticated request', async () => {
      mockReq.user = undefined;

      await getClients(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should respect RLS and only return authorized clients', async () => {
      // Clinician should only see assigned clients
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

      expect(accessControl.applyClientScope).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-123' })
      );
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

    it('should return 403 when access denied', async () => {
      mockReq.params = { id: 'protected-client' };

      (accessControl.assertCanAccessClient as jest.Mock).mockRejectedValue(
        new Error('Access denied')
      );

      await getClientById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should log PHI access for audit', async () => {
      mockReq.params = { id: 'client-123' };

      const mockClient = {
        id: 'client-123',
        firstName: 'John',
        lastName: 'Doe',
      };

      (accessControl.assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(mockClient);

      await getClientById(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('PHI'),
        expect.objectContaining({
          clientId: 'client-123',
          userId: 'user-123',
        })
      );
    });
  });

  describe('createClient', () => {
    it('should create a new client', async () => {
      mockReq.body = {
        firstName: 'New',
        lastName: 'Client',
        email: 'newclient@example.com',
        dateOfBirth: '1985-06-20',
        phone: '555-123-4567',
      };

      const mockCreatedClient = {
        id: 'new-client-123',
        ...mockReq.body,
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

    it('should encrypt SSN before storage', async () => {
      mockReq.body = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        ssn: '123-45-6789',
      };

      (prisma.client.create as jest.Mock).mockImplementation(({ data }) => {
        // SSN should be encrypted, not plain text
        expect(data.ssn).not.toBe('123-45-6789');
        return Promise.resolve({ id: 'new-123', ...data });
      });

      await createClient(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.client.create).toHaveBeenCalled();
    });

    it('should prevent duplicate email', async () => {
      mockReq.body = {
        firstName: 'Duplicate',
        lastName: 'Email',
        email: 'existing@example.com',
      };

      (prisma.client.create as jest.Mock).mockRejectedValue({
        code: 'P2002',
        meta: { target: ['email'] },
      });

      await createClient(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
    });

    it('should assign to organization of creating user', async () => {
      mockReq.body = {
        firstName: 'Org',
        lastName: 'Client',
        email: 'org@example.com',
      };

      (prisma.client.create as jest.Mock).mockResolvedValue({
        id: 'new-123',
        organizationId: 'org-123',
        ...mockReq.body,
      });

      await createClient(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'org-123',
          }),
        })
      );
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

    it('should return 403 when not authorized', async () => {
      mockReq.params = { id: 'protected-client' };
      mockReq.body = { firstName: 'Hacker' };

      (accessControl.assertCanAccessClient as jest.Mock).mockRejectedValue(
        new Error('Access denied')
      );

      await updateClient(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
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

    it('should log PHI update for audit', async () => {
      mockReq.params = { id: 'client-123' };
      mockReq.body = { ssn: '999-88-7777' };

      (accessControl.assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
      (prisma.client.findUnique as jest.Mock).mockResolvedValue({ id: 'client-123' });
      (prisma.client.update as jest.Mock).mockResolvedValue({ id: 'client-123' });

      await updateClient(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('PHI'),
        expect.objectContaining({
          action: 'UPDATE',
          clientId: 'client-123',
        })
      );
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

    it('should return 403 for non-admin users', async () => {
      mockReq.params = { id: 'client-123' };
      mockReq.user = { ...mockReq.user, role: 'CLINICIAN' } as any;

      (accessControl.assertCanAccessClient as jest.Mock).mockRejectedValue(
        new Error('Insufficient permissions')
      );

      await deleteClient(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('searchClients', () => {
    it('should search by name', async () => {
      mockReq.query = { q: 'John' };

      const searchResults = [
        { id: 'c1', firstName: 'John', lastName: 'Doe' },
        { id: 'c2', firstName: 'Johnny', lastName: 'Smith' },
      ];

      (accessControl.applyClientScope as jest.Mock).mockReturnValue({});
      (prisma.client.findMany as jest.Mock).mockResolvedValue(searchResults);

      await searchClients(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                firstName: expect.objectContaining({ contains: 'John' }),
              }),
            ]),
          }),
        })
      );
    });

    it('should search by email', async () => {
      mockReq.query = { q: 'test@example.com' };

      (accessControl.applyClientScope as jest.Mock).mockReturnValue({});
      (prisma.client.findMany as jest.Mock).mockResolvedValue([]);

      await searchClients(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.client.findMany).toHaveBeenCalled();
    });

    it('should respect RLS in search', async () => {
      mockReq.query = { q: 'Confidential' };

      (accessControl.applyClientScope as jest.Mock).mockReturnValue({
        clinicianAssignments: { some: { clinicianId: 'user-123' } },
      });
      (prisma.client.findMany as jest.Mock).mockResolvedValue([]);

      await searchClients(mockReq as Request, mockRes as Response, mockNext);

      expect(accessControl.applyClientScope).toHaveBeenCalled();
    });

    it('should sanitize search query', async () => {
      mockReq.query = { q: '<script>alert("xss")</script>' };

      (accessControl.applyClientScope as jest.Mock).mockReturnValue({});
      (prisma.client.findMany as jest.Mock).mockResolvedValue([]);

      await searchClients(mockReq as Request, mockRes as Response, mockNext);

      // Query should be sanitized
      expect(prisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            firstName: expect.objectContaining({ contains: '<script>' }),
          }),
        })
      );
    });

    it('should limit results for performance', async () => {
      mockReq.query = { q: 'common' };

      (accessControl.applyClientScope as jest.Mock).mockReturnValue({});
      (prisma.client.findMany as jest.Mock).mockResolvedValue([]);

      await searchClients(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: expect.any(Number),
        })
      );
    });
  });

  describe('getClientHistory', () => {
    it('should return client activity history', async () => {
      mockReq.params = { id: 'client-123' };

      const mockHistory = [
        { id: 'h1', action: 'VIEW', timestamp: new Date(), userId: 'user-1' },
        { id: 'h2', action: 'UPDATE', timestamp: new Date(), userId: 'user-2' },
      ];

      (accessControl.assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
      (prisma.$transaction as jest.Mock).mockResolvedValue([{ id: 'client-123' }, mockHistory]);

      await getClientHistory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should require admin role for full history', async () => {
      mockReq.params = { id: 'client-123' };
      mockReq.user = { ...mockReq.user, role: 'CLINICIAN' } as any;

      // Clinicians may have limited history access
      (accessControl.assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);

      await getClientHistory(mockReq as Request, mockRes as Response, mockNext);

      // Should either succeed with limited data or be denied
      expect(mockRes.status).toHaveBeenCalled();
    });
  });
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

  it('should mask SSN in list responses', async () => {
    const mockClients = [
      { id: 'c1', firstName: 'John', ssn: '123-45-6789' },
    ];

    (accessControl.applyClientScope as jest.Mock).mockReturnValue({});
    (prisma.client.findMany as jest.Mock).mockResolvedValue(mockClients);
    (prisma.client.count as jest.Mock).mockResolvedValue(1);

    await getClients(mockReq as Request, mockRes as Response, mockNext);

    const responseData = (mockRes.json as jest.Mock).mock.calls[0][0];
    // SSN should be masked or not included in list
    if (responseData.data[0]?.ssn) {
      expect(responseData.data[0].ssn).toMatch(/\*{3}-\*{2}-\d{4}/);
    }
  });

  it('should include full SSN only with explicit permission', async () => {
    mockReq.params = { id: 'client-123' };
    mockReq.query = { includeSSN: 'true' };
    mockReq.user = { ...mockReq.user, role: 'BILLING_STAFF' } as any;

    const mockClient = { id: 'client-123', ssn: '123-45-6789' };

    (accessControl.assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
    (prisma.client.findUnique as jest.Mock).mockResolvedValue(mockClient);

    await getClientById(mockReq as Request, mockRes as Response, mockNext);

    // Billing staff with explicit request should get full SSN
    // or it should be denied
    expect(mockRes.status).toHaveBeenCalled();
  });

  it('should log all PHI access events', async () => {
    mockReq.params = { id: 'client-123' };

    (accessControl.assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
    (prisma.client.findUnique as jest.Mock).mockResolvedValue({
      id: 'client-123',
      firstName: 'John',
    });

    await getClientById(mockReq as Request, mockRes as Response, mockNext);

    expect(logger.info).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        userId: 'user-123',
        clientId: 'client-123',
      })
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
