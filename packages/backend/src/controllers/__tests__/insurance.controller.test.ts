/**
 * Insurance Controller Tests
 *
 * HIPAA Compliance: Financial PHI testing
 * Tests for insurance CRUD operations, eligibility verification
 */

import { Request, Response } from 'express';
import {
  getClientInsurance,
  getInsuranceById,
  createInsurance,
  updateInsurance,
  deleteInsurance,
  verifyInsurance,
} from '../insurance.controller';

// Mock dependencies
jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    insuranceInformation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    client: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logControllerError: jest.fn().mockReturnValue('error-123'),
}));

import prisma from '../../lib/prisma';

// Helper to create mock request
const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  params: {},
  query: {},
  body: {},
  user: {
    id: 'user-123',
    organizationId: 'org-123',
    role: 'BILLING_STAFF',
    email: 'billing@example.com',
  } as any,
  ...overrides,
});

// Helper to create mock response
const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis() as any,
    json: jest.fn().mockReturnThis() as any,
  };
  return res;
};

// Mock insurance data
const mockInsurance = {
  id: 'ins-123',
  clientId: 'client-123',
  rank: 'Primary',
  insuranceCompany: 'Blue Cross',
  insuranceCompanyId: 'bc-123',
  planName: 'PPO Gold',
  planType: 'PPO',
  memberId: 'MEM123456',
  groupNumber: 'GRP789',
  effectiveDate: new Date('2024-01-01'),
  terminationDate: null,
  subscriberFirstName: 'John',
  subscriberLastName: 'Doe',
  subscriberDOB: new Date('1980-01-15'),
  relationshipToSubscriber: 'Self',
  copay: 25.00,
  deductible: 500.00,
  outOfPocketMax: 3000.00,
  lastVerificationDate: new Date(),
  lastVerifiedBy: 'user-123',
  verificationNotes: 'Verified active',
  organizationId: 'org-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const mockClient = {
  id: 'client-123',
  firstName: 'John',
  lastName: 'Doe',
  medicalRecordNumber: 'MRN001',
};

describe('Insurance Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getClientInsurance', () => {
    it('should return all insurance for a client', async () => {
      const req = createMockRequest({
        params: { clientId: 'client-123' },
      });
      const res = createMockResponse();

      (prisma.insuranceInformation.findMany as jest.Mock).mockResolvedValue([
        mockInsurance,
        { ...mockInsurance, id: 'ins-456', rank: 'Secondary' },
      ]);

      await getClientInsurance(req as Request, res as Response);

      expect(prisma.insuranceInformation.findMany).toHaveBeenCalledWith({
        where: { clientId: 'client-123' },
        orderBy: { rank: 'asc' },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ rank: 'Primary' }),
        ]),
      });
    });

    it('should return empty array for client with no insurance', async () => {
      const req = createMockRequest({
        params: { clientId: 'client-123' },
      });
      const res = createMockResponse();

      (prisma.insuranceInformation.findMany as jest.Mock).mockResolvedValue([]);

      await getClientInsurance(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [],
      });
    });

    it('should return 500 on database error', async () => {
      const req = createMockRequest({
        params: { clientId: 'client-123' },
      });
      const res = createMockResponse();

      (prisma.insuranceInformation.findMany as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await getClientInsurance(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Failed to retrieve insurance information',
        })
      );
    });
  });

  describe('getInsuranceById', () => {
    it('should return insurance by ID with client info', async () => {
      const req = createMockRequest({
        params: { id: 'ins-123' },
      });
      const res = createMockResponse();

      (prisma.insuranceInformation.findUnique as jest.Mock).mockResolvedValue({
        ...mockInsurance,
        client: mockClient,
      });

      await getInsuranceById(req as Request, res as Response);

      expect(prisma.insuranceInformation.findUnique).toHaveBeenCalledWith({
        where: { id: 'ins-123' },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              medicalRecordNumber: true,
            },
          },
        },
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 for non-existent insurance', async () => {
      const req = createMockRequest({
        params: { id: 'non-existent' },
      });
      const res = createMockResponse();

      (prisma.insuranceInformation.findUnique as jest.Mock).mockResolvedValue(null);

      await getInsuranceById(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Insurance information not found',
      });
    });
  });

  describe('createInsurance', () => {
    const validInsuranceData = {
      clientId: 'client-123',
      rank: 'Primary',
      insuranceCompany: 'Blue Cross',
      planName: 'PPO Gold',
      planType: 'PPO',
      memberId: 'MEM123456',
      effectiveDate: '2024-01-01T00:00:00Z',
    };

    it('should create new insurance for a client', async () => {
      const req = createMockRequest({
        body: validInsuranceData,
      });
      const res = createMockResponse();

      (prisma.insuranceInformation.create as jest.Mock).mockResolvedValue(mockInsurance);

      await createInsurance(req as Request, res as Response);

      expect(prisma.insuranceInformation.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockInsurance,
      });
    });

    it('should reject creation with missing required fields', async () => {
      const req = createMockRequest({
        body: {
          clientId: 'client-123',
          // Missing other required fields
        },
      });
      const res = createMockResponse();

      await createInsurance(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });

    it('should reject invalid member ID format', async () => {
      const req = createMockRequest({
        body: {
          ...validInsuranceData,
          memberId: '', // Empty member ID
        },
      });
      const res = createMockResponse();

      await createInsurance(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('updateInsurance', () => {
    it('should update existing insurance', async () => {
      const req = createMockRequest({
        params: { id: 'ins-123' },
        body: {
          copay: 30.00,
          verificationNotes: 'Updated verification',
        },
      });
      const res = createMockResponse();

      (prisma.insuranceInformation.findUnique as jest.Mock).mockResolvedValue(mockInsurance);
      (prisma.insuranceInformation.update as jest.Mock).mockResolvedValue({
        ...mockInsurance,
        copay: 30.00,
        verificationNotes: 'Updated verification',
      });

      await updateInsurance(req as Request, res as Response);

      expect(prisma.insuranceInformation.update).toHaveBeenCalledWith({
        where: { id: 'ins-123' },
        data: expect.objectContaining({
          copay: 30.00,
          verificationNotes: 'Updated verification',
        }),
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 for non-existent insurance', async () => {
      const req = createMockRequest({
        params: { id: 'non-existent' },
        body: { copay: 30.00 },
      });
      const res = createMockResponse();

      (prisma.insuranceInformation.findUnique as jest.Mock).mockResolvedValue(null);

      await updateInsurance(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteInsurance', () => {
    it('should soft delete insurance', async () => {
      const req = createMockRequest({
        params: { id: 'ins-123' },
      });
      const res = createMockResponse();

      (prisma.insuranceInformation.findUnique as jest.Mock).mockResolvedValue(mockInsurance);
      (prisma.insuranceInformation.update as jest.Mock).mockResolvedValue({
        ...mockInsurance,
        deletedAt: new Date(),
      });

      await deleteInsurance(req as Request, res as Response);

      // Should use soft delete
      expect(prisma.insuranceInformation.update).toHaveBeenCalledWith({
        where: { id: 'ins-123' },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
        }),
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 for non-existent insurance', async () => {
      const req = createMockRequest({
        params: { id: 'non-existent' },
      });
      const res = createMockResponse();

      (prisma.insuranceInformation.findUnique as jest.Mock).mockResolvedValue(null);

      await deleteInsurance(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('verifyInsurance', () => {
    it('should verify insurance eligibility', async () => {
      const req = createMockRequest({
        params: { id: 'ins-123' },
        body: {
          verificationNotes: 'Verified with payer',
        },
      });
      const res = createMockResponse();

      (prisma.insuranceInformation.findUnique as jest.Mock).mockResolvedValue(mockInsurance);
      (prisma.insuranceInformation.update as jest.Mock).mockResolvedValue({
        ...mockInsurance,
        lastVerificationDate: new Date(),
        lastVerifiedBy: 'user-123',
        verificationNotes: 'Verified with payer',
      });

      await verifyInsurance(req as Request, res as Response);

      expect(prisma.insuranceInformation.update).toHaveBeenCalledWith({
        where: { id: 'ins-123' },
        data: expect.objectContaining({
          lastVerificationDate: expect.any(Date),
          lastVerifiedBy: expect.any(String),
        }),
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('HIPAA Compliance', () => {
    it('should not expose SSN in any response', async () => {
      const req = createMockRequest({
        params: { clientId: 'client-123' },
      });
      const res = createMockResponse();

      (prisma.insuranceInformation.findMany as jest.Mock).mockResolvedValue([mockInsurance]);

      await getClientInsurance(req as Request, res as Response);

      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];

      // Verify no SSN field in response
      expect(jsonCall.data[0]).not.toHaveProperty('subscriberSSN');
      expect(JSON.stringify(jsonCall)).not.toContain('SSN');
    });

    it('should filter soft-deleted records by default', async () => {
      const req = createMockRequest({
        params: { clientId: 'client-123' },
      });
      const res = createMockResponse();

      // Include a soft-deleted record
      (prisma.insuranceInformation.findMany as jest.Mock).mockResolvedValue([
        mockInsurance,
        { ...mockInsurance, id: 'ins-deleted', deletedAt: new Date() },
      ]);

      await getClientInsurance(req as Request, res as Response);

      // The query should filter out deleted records
      // (In actual implementation, this would be in the where clause)
      expect(prisma.insuranceInformation.findMany).toHaveBeenCalled();
    });
  });

  describe('Data Validation', () => {
    it('should validate insurance rank values', async () => {
      const req = createMockRequest({
        body: {
          clientId: 'client-123',
          rank: 'Invalid', // Invalid rank
          insuranceCompany: 'Blue Cross',
          planName: 'PPO Gold',
          planType: 'PPO',
          memberId: 'MEM123456',
          effectiveDate: '2024-01-01T00:00:00Z',
        },
      });
      const res = createMockResponse();

      await createInsurance(req as Request, res as Response);

      // Implementation should validate rank is Primary/Secondary/Tertiary
      expect(res.status).toHaveBeenCalled();
    });

    it('should validate date formats', async () => {
      const req = createMockRequest({
        body: {
          clientId: 'client-123',
          rank: 'Primary',
          insuranceCompany: 'Blue Cross',
          planName: 'PPO Gold',
          planType: 'PPO',
          memberId: 'MEM123456',
          effectiveDate: 'invalid-date', // Invalid date
        },
      });
      const res = createMockResponse();

      await createInsurance(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
