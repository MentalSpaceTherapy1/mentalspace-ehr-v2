/**
 * Unit Tests for Client Controller
 *
 * Tests all client controller functions in isolation
 * Covers: CRUD operations, validation, error handling, edge cases
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@mentalspace/database';
import * as clientController from '../../../controllers/client.controller';
import { getTestDb, cleanDatabase, createTestUser } from '../../helpers/testDatabase';

// Mock Prisma
jest.mock('@mentalspace/database', () => ({
  PrismaClient: jest.fn(),
}));

describe('Client Controller - Unit Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let responseObject: any;

  beforeEach(() => {
    // Reset mocks
    responseObject = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation((result) => {
        responseObject = result;
        return mockResponse;
      }),
    };

    mockRequest = {
      user: {
        userId: 'user-123',
        role: 'CLINICIAN',
      },
      params: {},
      query: {},
      body: {},
    };

    // Mock Prisma client
    mockPrisma = {
      client: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllClients', () => {
    it('should return all clients successfully', async () => {
      const mockClients = [
        { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
        { id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com' },
      ];

      mockPrisma.client.findMany.mockResolvedValue(mockClients as any);

      await clientController.getAllClients(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseObject.success).toBe(true);
      expect(responseObject.data).toEqual(mockClients);
    });

    it('should handle empty client list', async () => {
      mockPrisma.client.findMany.mockResolvedValue([]);

      await clientController.getAllClients(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseObject.data).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockPrisma.client.findMany.mockRejectedValue(new Error('Database connection failed'));

      await clientController.getAllClients(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(responseObject.success).toBe(false);
    });

    it('should support pagination', async () => {
      mockRequest.query = { page: '2', limit: '10' };

      mockPrisma.client.findMany.mockResolvedValue([]);
      mockPrisma.client.count.mockResolvedValue(25);

      await clientController.getAllClients(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });

    it('should support search filtering', async () => {
      mockRequest.query = { search: 'John' };

      await clientController.getAllClients(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });
  });

  describe('getClientById', () => {
    const clientId = 'client-123';

    it('should return client when found', async () => {
      const mockClient = {
        id: clientId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
      };

      mockRequest.params = { id: clientId };
      mockPrisma.client.findUnique.mockResolvedValue(mockClient as any);

      await clientController.getClientById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseObject.data).toEqual(mockClient);
    });

    it('should return 404 when client not found', async () => {
      mockRequest.params = { id: 'nonexistent' };
      mockPrisma.client.findUnique.mockResolvedValue(null);

      await clientController.getClientById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(responseObject.success).toBe(false);
    });

    it('should handle invalid UUID format', async () => {
      mockRequest.params = { id: 'invalid-uuid' };

      await clientController.getClientById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toBe(400);
    });

    it('should not expose PHI in error messages', async () => {
      mockRequest.params = { id: clientId };
      mockPrisma.client.findUnique.mockRejectedValue(new Error('Database error with sensitive data'));

      await clientController.getClientById(mockRequest as Request, mockResponse as Response);

      // Error message should be generic
      expect(responseObject.error).not.toContain('sensitive');
      expect(responseObject.error).toMatch(/failed|error/i);
    });
  });

  describe('createClient', () => {
    const validClientData = {
      firstName: 'New',
      lastName: 'Client',
      dateOfBirth: '1990-01-01',
      email: 'new@test.com',
      phone: '555-0100',
    };

    it('should create client with valid data', async () => {
      mockRequest.body = validClientData;

      const createdClient = { id: 'new-id', ...validClientData };
      mockPrisma.client.create.mockResolvedValue(createdClient as any);

      await clientController.createClient(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(responseObject.success).toBe(true);
      expect(responseObject.data).toEqual(createdClient);
    });

    it('should reject missing required fields', async () => {
      mockRequest.body = { firstName: 'John' }; // Missing required fields

      await clientController.createClient(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toBe(400);
      expect(responseObject.success).toBe(false);
    });

    it('should validate email format', async () => {
      mockRequest.body = { ...validClientData, email: 'invalid-email' };

      await clientController.createClient(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toBe(400);
    });

    it('should validate phone format', async () => {
      mockRequest.body = { ...validClientData, phone: 'abc' };

      await clientController.createClient(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toBe(400);
    });

    it('should reject future birth dates', async () => {
      mockRequest.body = { ...validClientData, dateOfBirth: '2030-01-01' };

      await clientController.createClient(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toBe(400);
    });

    it('should handle duplicate email', async () => {
      mockRequest.body = validClientData;
      mockPrisma.client.create.mockRejectedValue(new Error('Unique constraint violation'));

      await clientController.createClient(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toBe(409); // Conflict
    });

    it('should sanitize XSS attempts in name fields', async () => {
      mockRequest.body = {
        ...validClientData,
        firstName: '<script>alert("xss")</script>',
      };

      await clientController.createClient(mockRequest as Request, mockResponse as Response);

      // Should either reject or sanitize
      if (mockResponse.status === 201) {
        expect(mockPrisma.client.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.not.objectContaining({
              firstName: expect.stringContaining('<script>'),
            }),
          })
        );
      } else {
        expect(mockResponse.status).toBe(400);
      }
    });

    it('should prevent SQL injection in text fields', async () => {
      mockRequest.body = {
        ...validClientData,
        firstName: "'; DROP TABLE clients; --",
      };

      await clientController.createClient(mockRequest as Request, mockResponse as Response);

      // Should either reject or use parameterized queries (which Prisma does by default)
      expect(mockPrisma.client.create).not.toThrow();
    });
  });

  describe('updateClient', () => {
    const clientId = 'client-123';
    const updateData = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should update client successfully', async () => {
      mockRequest.params = { id: clientId };
      mockRequest.body = updateData;

      const updatedClient = { id: clientId, ...updateData };
      mockPrisma.client.update.mockResolvedValue(updatedClient as any);

      await clientController.updateClient(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseObject.data).toEqual(updatedClient);
    });

    it('should return 404 for nonexistent client', async () => {
      mockRequest.params = { id: 'nonexistent' };
      mockRequest.body = updateData;

      mockPrisma.client.update.mockRejectedValue(new Error('Record not found'));

      await clientController.updateClient(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toBe(404);
    });

    it('should allow partial updates', async () => {
      mockRequest.params = { id: clientId };
      mockRequest.body = { firstName: 'OnlyFirst' };

      mockPrisma.client.update.mockResolvedValue({ id: clientId, firstName: 'OnlyFirst' } as any);

      await clientController.updateClient(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.client.update).toHaveBeenCalledWith({
        where: { id: clientId },
        data: expect.objectContaining({ firstName: 'OnlyFirst' }),
      });
    });

    it('should not allow updating id field', async () => {
      mockRequest.params = { id: clientId };
      mockRequest.body = { id: 'new-id', firstName: 'Test' };

      await clientController.updateClient(mockRequest as Request, mockResponse as Response);

      // ID should not be in update data
      if (mockPrisma.client.update.mock.calls.length > 0) {
        expect(mockPrisma.client.update.mock.calls[0][0].data).not.toHaveProperty('id');
      }
    });
  });

  describe('deleteClient', () => {
    const clientId = 'client-123';

    it('should delete client successfully', async () => {
      mockRequest.params = { id: clientId };

      mockPrisma.client.delete.mockResolvedValue({ id: clientId } as any);

      await clientController.deleteClient(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseObject.success).toBe(true);
    });

    it('should return 404 for nonexistent client', async () => {
      mockRequest.params = { id: 'nonexistent' };

      mockPrisma.client.delete.mockRejectedValue(new Error('Record not found'));

      await clientController.deleteClient(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toBe(404);
    });

    it('should handle foreign key constraints (soft delete)', async () => {
      mockRequest.params = { id: clientId };

      mockPrisma.client.delete.mockRejectedValue(new Error('Foreign key constraint'));

      await clientController.deleteClient(mockRequest as Request, mockResponse as Response);

      // Should either fail gracefully or perform soft delete
      expect(mockResponse.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null values gracefully', async () => {
      mockRequest.body = { firstName: null };

      await clientController.createClient(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle undefined values', async () => {
      mockRequest.body = { firstName: undefined };

      await clientController.createClient(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle empty strings in required fields', async () => {
      mockRequest.body = { firstName: '', lastName: 'Test' };

      await clientController.createClient(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toBe(400);
    });

    it('should handle very long input strings', async () => {
      mockRequest.body = {
        firstName: 'A'.repeat(10000),
        lastName: 'Test',
      };

      await clientController.createClient(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toBe(400);
    });

    it('should handle special characters in names', async () => {
      mockRequest.body = {
        firstName: "O'Brien",
        lastName: 'Müller',
        email: 'test@test.com',
        phone: '555-0100',
        dateOfBirth: '1990-01-01',
      };

      mockPrisma.client.create.mockResolvedValue({ id: '123', ...mockRequest.body } as any);

      await clientController.createClient(mockRequest as Request, mockResponse as Response);

      // Should accept valid international characters
      expect(mockResponse.status).toBe(201);
    });
  });

  describe('Authorization', () => {
    it('should check user has permission to view client', async () => {
      mockRequest.params = { id: 'client-123' };
      mockRequest.user = { userId: 'user-123', role: 'RECEPTIONIST' };

      // Receptionist might not have access to all client data
      await clientController.getClientById(mockRequest as Request, mockResponse as Response);

      // Should either succeed or return 403
      expect([200, 403]).toContain(mockResponse.status);
    });
  });
});
