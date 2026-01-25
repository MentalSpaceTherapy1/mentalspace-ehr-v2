/**
 * Client Service Tests
 * Phase 5.1: Comprehensive test coverage for client.service.ts
 *
 * Tests all client-related business operations:
 * - MRN generation
 * - Search query building
 * - Client CRUD operations
 * - Client statistics
 * - Access control integration
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ClientStatus } from '@mentalspace/database';

// Mock dependencies before importing the service
jest.mock('../database', () => ({
  __esModule: true,
  default: {
    client: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock('../accessControl.service', () => ({
  applyClientScope: jest.fn(),
  assertCanAccessClient: jest.fn(),
}));

jest.mock('../resend.service', () => ({
  sendEmail: jest.fn(),
  EmailTemplates: {
    clientWelcome: jest.fn().mockReturnValue({
      subject: 'Welcome to MentalSpace',
      html: '<p>Welcome!</p>',
    }),
  },
}));

jest.mock('../../utils/validation', () => ({
  createClientSchema: {
    parse: jest.fn((data) => data),
  },
  updateClientSchema: {
    parse: jest.fn((data) => data),
  },
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import after mocks
import { clientService } from '../client.service';
import prisma from '../database';
import { applyClientScope, assertCanAccessClient } from '../accessControl.service';
import { sendEmail, EmailTemplates } from '../resend.service';
import { createClientSchema, updateClientSchema } from '../../utils/validation';
import { NotFoundError } from '../../utils/errors';
import { JwtPayload } from '../../utils/jwt';

describe('ClientService', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  const mockApplyClientScope = applyClientScope as jest.MockedFunction<typeof applyClientScope>;
  const mockAssertCanAccessClient = assertCanAccessClient as jest.MockedFunction<typeof assertCanAccessClient>;
  const mockSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;
  const mockEmailTemplates = EmailTemplates as jest.Mocked<typeof EmailTemplates>;

  const mockUser: JwtPayload = {
    userId: 'user-123',
    email: 'clinician@test.com',
    roles: ['CLINICIAN'],
    sessionId: 'session-123',
    practiceId: 'practice-123',
  };

  const mockClient = {
    id: 'client-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@email.com',
    medicalRecordNumber: 'MRN-123456789',
    dateOfBirth: new Date('1990-01-01'),
    status: ClientStatus.ACTIVE,
    primaryTherapistId: 'therapist-123',
    secondaryTherapistId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-123',
    lastModifiedBy: 'user-123',
    primaryTherapist: {
      id: 'therapist-123',
      firstName: 'Jane',
      lastName: 'Smith',
      title: 'LCSW',
      email: 'jane.smith@clinic.com',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementations
    mockApplyClientScope.mockResolvedValue({});
    mockAssertCanAccessClient.mockResolvedValue(undefined);
  });

  // ============================================================================
  // MRN Generation Tests
  // ============================================================================
  describe('generateMRN', () => {
    it('should generate MRN with correct format', () => {
      const mrn = clientService.generateMRN();

      expect(mrn).toMatch(/^MRN-\d{9}$/);
    });

    it('should generate unique MRNs on consecutive calls', () => {
      const mrn1 = clientService.generateMRN();
      const mrn2 = clientService.generateMRN();
      const mrn3 = clientService.generateMRN();

      // MRNs should be unique (very high probability)
      const uniqueMRNs = new Set([mrn1, mrn2, mrn3]);
      expect(uniqueMRNs.size).toBe(3);
    });

    it('should always start with MRN- prefix', () => {
      for (let i = 0; i < 10; i++) {
        const mrn = clientService.generateMRN();
        expect(mrn.startsWith('MRN-')).toBe(true);
      }
    });
  });

  // ============================================================================
  // Search Query Building Tests
  // ============================================================================
  describe('buildSearchWhereClause', () => {
    it('should return empty object for empty search', () => {
      const result = clientService.buildSearchWhereClause('');
      expect(result).toEqual({});
    });

    it('should return empty object for whitespace-only search', () => {
      const result = clientService.buildSearchWhereClause('   ');
      expect(result).toEqual({});
    });

    it('should build single-word search across all fields', () => {
      const result = clientService.buildSearchWhereClause('john');

      expect(result).toHaveProperty('OR');
      expect(result.OR).toHaveLength(4);
      expect(result.OR).toContainEqual({ firstName: { contains: 'john', mode: 'insensitive' } });
      expect(result.OR).toContainEqual({ lastName: { contains: 'john', mode: 'insensitive' } });
      expect(result.OR).toContainEqual({ medicalRecordNumber: { contains: 'john', mode: 'insensitive' } });
      expect(result.OR).toContainEqual({ email: { contains: 'john', mode: 'insensitive' } });
    });

    it('should build multi-word search for name combinations', () => {
      const result = clientService.buildSearchWhereClause('John Doe');

      expect(result).toHaveProperty('OR');
      // Should have multiple OR conditions for name combinations
      expect(result.OR.length).toBeGreaterThan(1);
    });

    it('should handle extra whitespace in search terms', () => {
      const result = clientService.buildSearchWhereClause('  John   Doe  ');

      expect(result).toHaveProperty('OR');
      // Should still parse correctly
      expect(result.OR.length).toBeGreaterThan(1);
    });

    it('should search email with full string in multi-word search', () => {
      const result = clientService.buildSearchWhereClause('test user');

      expect(result.OR).toContainEqual({ email: { contains: 'test user', mode: 'insensitive' } });
    });

    it('should search MRN with full string in multi-word search', () => {
      const result = clientService.buildSearchWhereClause('MRN 123');

      expect(result.OR).toContainEqual({ medicalRecordNumber: { contains: 'MRN 123', mode: 'insensitive' } });
    });
  });

  // ============================================================================
  // Get Clients Tests
  // ============================================================================
  describe('getClients', () => {
    beforeEach(() => {
      mockPrisma.client.findMany.mockResolvedValue([mockClient]);
      mockPrisma.client.count.mockResolvedValue(1);
    });

    it('should return clients with pagination', async () => {
      const result = await clientService.getClients({}, mockUser);

      expect(result).toHaveProperty('clients');
      expect(result).toHaveProperty('pagination');
      expect(result.clients).toHaveLength(1);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('should apply page and limit from filters', async () => {
      mockPrisma.client.count.mockResolvedValue(100);

      const result = await clientService.getClients({ page: 3, limit: 10 }, mockUser);

      expect(result.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 100,
        totalPages: 10,
      });
      expect(mockPrisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3-1) * 10
          take: 10,
        })
      );
    });

    it('should cap limit at 100', async () => {
      await clientService.getClients({ limit: 200 }, mockUser);

      expect(mockPrisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        })
      );
    });

    it('should apply search filter', async () => {
      await clientService.getClients({ search: 'john' }, mockUser);

      expect(mockApplyClientScope).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          OR: expect.any(Array),
        }),
        { allowBillingView: true }
      );
    });

    it('should apply status filter', async () => {
      mockApplyClientScope.mockImplementation(async (user, where) => ({
        ...where,
        status: ClientStatus.ACTIVE,
      }));

      await clientService.getClients({ status: ClientStatus.ACTIVE }, mockUser);

      expect(mockPrisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ClientStatus.ACTIVE,
          }),
        })
      );
    });

    it('should apply therapist filter', async () => {
      mockApplyClientScope.mockImplementation(async (user, where) => where);

      await clientService.getClients({ therapistId: 'therapist-456' }, mockUser);

      expect(mockApplyClientScope).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          primaryTherapistId: 'therapist-456',
        }),
        { allowBillingView: true }
      );
    });

    it('should include primary therapist relation', async () => {
      await clientService.getClients({}, mockUser);

      expect(mockPrisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            primaryTherapist: expect.any(Object),
          },
        })
      );
    });

    it('should apply access control scope', async () => {
      await clientService.getClients({}, mockUser);

      expect(mockApplyClientScope).toHaveBeenCalledWith(
        mockUser,
        expect.any(Object),
        { allowBillingView: true }
      );
    });
  });

  // ============================================================================
  // Get Client By ID Tests
  // ============================================================================
  describe('getClientById', () => {
    beforeEach(() => {
      mockPrisma.client.findUnique.mockResolvedValue(mockClient as any);
    });

    it('should return client when found', async () => {
      const result = await clientService.getClientById('client-123', mockUser);

      expect(result).toEqual(mockClient);
      expect(mockPrisma.client.findUnique).toHaveBeenCalledWith({
        where: { id: 'client-123' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundError when client does not exist', async () => {
      mockPrisma.client.findUnique.mockResolvedValue(null);

      await expect(clientService.getClientById('nonexistent', mockUser)).rejects.toThrow(NotFoundError);
    });

    it('should verify access control', async () => {
      await clientService.getClientById('client-123', mockUser);

      expect(mockAssertCanAccessClient).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          clientId: 'client-123',
          allowBillingView: true,
          clientRecord: {
            primaryTherapistId: mockClient.primaryTherapistId,
            secondaryTherapistId: mockClient.secondaryTherapistId,
          },
        })
      );
    });

    it('should include all required relations', async () => {
      await clientService.getClientById('client-123', mockUser);

      expect(mockPrisma.client.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            primaryTherapist: expect.any(Object),
            emergencyContacts: true,
            insuranceInfo: expect.any(Object),
          },
        })
      );
    });
  });

  // ============================================================================
  // Create Client Tests
  // ============================================================================
  describe('createClient', () => {
    const createData = {
      firstName: 'New',
      lastName: 'Client',
      email: 'new.client@email.com',
      dateOfBirth: '1995-05-15',
      primaryTherapistId: 'therapist-123',
    };

    beforeEach(() => {
      mockPrisma.client.create.mockResolvedValue({
        ...mockClient,
        ...createData,
        email: createData.email,
      } as any);
      mockSendEmail.mockResolvedValue(undefined);
    });

    it('should create client with generated MRN', async () => {
      await clientService.createClient(createData, 'user-123');

      expect(mockPrisma.client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            medicalRecordNumber: expect.stringMatching(/^MRN-\d{9}$/),
          }),
        })
      );
    });

    it('should set createdBy and lastModifiedBy', async () => {
      await clientService.createClient(createData, 'user-123');

      expect(mockPrisma.client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            createdBy: 'user-123',
            lastModifiedBy: 'user-123',
          }),
        })
      );
    });

    it('should convert dateOfBirth string to Date', async () => {
      await clientService.createClient(createData, 'user-123');

      expect(mockPrisma.client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dateOfBirth: expect.any(Date),
          }),
        })
      );
    });

    it('should send welcome email to client', async () => {
      await clientService.createClient(createData, 'user-123');

      expect(mockEmailTemplates.clientWelcome).toHaveBeenCalled();
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: createData.email,
        })
      );
    });

    it('should not fail if welcome email fails', async () => {
      mockSendEmail.mockRejectedValue(new Error('Email failed'));

      // Should not throw
      const result = await clientService.createClient(createData, 'user-123');
      expect(result).toBeDefined();
    });

    it('should include primary therapist in response', async () => {
      await clientService.createClient(createData, 'user-123');

      expect(mockPrisma.client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            primaryTherapist: expect.any(Object),
          },
        })
      );
    });

    it('should validate input data', async () => {
      await clientService.createClient(createData, 'user-123');

      expect(createClientSchema.parse).toHaveBeenCalledWith(createData);
    });
  });

  // ============================================================================
  // Update Client Tests
  // ============================================================================
  describe('updateClient', () => {
    const updateData = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    beforeEach(() => {
      mockPrisma.client.findUnique.mockResolvedValue(mockClient as any);
      mockPrisma.client.update.mockResolvedValue({
        ...mockClient,
        ...updateData,
      } as any);
    });

    it('should update client successfully', async () => {
      const result = await clientService.updateClient('client-123', updateData, 'user-456');

      expect(result.firstName).toBe('Updated');
      expect(mockPrisma.client.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'client-123' },
          data: expect.objectContaining({
            firstName: 'Updated',
            lastName: 'Name',
            lastModifiedBy: 'user-456',
          }),
        })
      );
    });

    it('should throw NotFoundError when client does not exist', async () => {
      mockPrisma.client.findUnique.mockResolvedValue(null);

      await expect(
        clientService.updateClient('nonexistent', updateData, 'user-456')
      ).rejects.toThrow(NotFoundError);
    });

    it('should convert dateOfBirth if provided', async () => {
      const dataWithDOB = { ...updateData, dateOfBirth: '1990-01-15' };

      await clientService.updateClient('client-123', dataWithDOB, 'user-456');

      expect(mockPrisma.client.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dateOfBirth: expect.any(Date),
          }),
        })
      );
    });

    it('should validate input data', async () => {
      await clientService.updateClient('client-123', updateData, 'user-456');

      expect(updateClientSchema.parse).toHaveBeenCalledWith(updateData);
    });

    it('should include primary therapist in response', async () => {
      await clientService.updateClient('client-123', updateData, 'user-456');

      expect(mockPrisma.client.update).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            primaryTherapist: expect.any(Object),
          },
        })
      );
    });
  });

  // ============================================================================
  // Delete Client Tests
  // ============================================================================
  describe('deleteClient', () => {
    beforeEach(() => {
      mockPrisma.client.findUnique.mockResolvedValue(mockClient as any);
      mockPrisma.client.update.mockResolvedValue({
        ...mockClient,
        status: ClientStatus.INACTIVE,
      } as any);
    });

    it('should soft delete client by setting status to INACTIVE', async () => {
      const result = await clientService.deleteClient('client-123', 'user-456');

      expect(result.status).toBe(ClientStatus.INACTIVE);
      expect(mockPrisma.client.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'client-123' },
          data: {
            status: ClientStatus.INACTIVE,
            statusDate: expect.any(Date),
            lastModifiedBy: 'user-456',
          },
        })
      );
    });

    it('should throw NotFoundError when client does not exist', async () => {
      mockPrisma.client.findUnique.mockResolvedValue(null);

      await expect(clientService.deleteClient('nonexistent', 'user-456')).rejects.toThrow(NotFoundError);
    });

    it('should set statusDate when deleting', async () => {
      await clientService.deleteClient('client-123', 'user-456');

      expect(mockPrisma.client.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            statusDate: expect.any(Date),
          }),
        })
      );
    });
  });

  // ============================================================================
  // Get Client Stats Tests
  // ============================================================================
  describe('getClientStats', () => {
    beforeEach(() => {
      mockPrisma.client.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(75) // active
        .mockResolvedValueOnce(15) // inactive
        .mockResolvedValueOnce(10); // discharged
    });

    it('should return client statistics', async () => {
      const result = await clientService.getClientStats(mockUser);

      expect(result).toEqual({
        total: 100,
        active: 75,
        inactive: 15,
        discharged: 10,
      });
    });

    it('should apply access control scope to all counts', async () => {
      await clientService.getClientStats(mockUser);

      expect(mockApplyClientScope).toHaveBeenCalledWith(
        mockUser,
        {},
        { allowBillingView: true }
      );
    });

    it('should count clients by status', async () => {
      await clientService.getClientStats(mockUser);

      // Should be called 4 times: total, active, inactive, discharged
      expect(mockPrisma.client.count).toHaveBeenCalledTimes(4);
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling Tests
  // ============================================================================
  describe('Edge Cases', () => {
    it('should handle client without email for welcome email', async () => {
      const clientWithoutEmail = { ...mockClient, email: null };
      mockPrisma.client.create.mockResolvedValue(clientWithoutEmail as any);

      // Should not throw
      const result = await clientService.createClient(
        { firstName: 'Test', lastName: 'User', dateOfBirth: '1990-01-01', primaryTherapistId: 'therapist-123' },
        'user-123'
      );

      expect(result).toBeDefined();
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('should handle empty client list', async () => {
      mockPrisma.client.findMany.mockResolvedValue([]);
      mockPrisma.client.count.mockResolvedValue(0);

      const result = await clientService.getClients({}, mockUser);

      expect(result.clients).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('should handle search with special characters', () => {
      // Should not throw
      const result = clientService.buildSearchWhereClause("O'Brien");
      expect(result).toHaveProperty('OR');
    });

    it('should handle very long search strings', () => {
      const longSearch = 'a'.repeat(1000);
      // Should not throw
      const result = clientService.buildSearchWhereClause(longSearch);
      expect(result).toHaveProperty('OR');
    });
  });
});
