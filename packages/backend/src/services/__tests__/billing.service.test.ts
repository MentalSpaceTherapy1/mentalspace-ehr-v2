/**
 * Billing Service Tests
 * Phase 5.1: Comprehensive test coverage for billing service
 *
 * Tests cover:
 * - Charge CRUD operations
 * - Payment CRUD operations
 * - Payment application to charges
 * - Aging reports
 * - Revenue reports
 * - AdvancedMD sync integration (mocked)
 */

import { billingService, createChargeSchema, createPaymentSchema } from '../billing.service';
import prisma from '../database';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import * as cache from '../cache.service';
import { AdvancedMDChargeSyncService } from '../../integrations/advancedmd/charge-sync.service';

// Mock dependencies
jest.mock('../database', () => ({
  __esModule: true,
  default: {
    chargeEntry: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    paymentRecord: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
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
  auditLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../cache.service', () => ({
  invalidateCategory: jest.fn().mockResolvedValue(undefined),
  CacheCategory: {
    REVENUE: 'revenue',
    BILLING: 'billing',
  },
}));

jest.mock('../../integrations/advancedmd/charge-sync.service', () => ({
  AdvancedMDChargeSyncService: {
    getInstance: jest.fn().mockReturnValue({
      submitCharge: jest.fn().mockResolvedValue({ success: true, advancedMDChargeId: 'amd-123' }),
    }),
  },
}));

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedCache = cache as jest.Mocked<typeof cache>;

describe('BillingService', () => {
  const testUserId = 'user-123';
  const testClientId = 'client-456';
  const testChargeId = 'charge-789';
  const testPaymentId = 'payment-321';

  const mockClient = {
    id: testClientId,
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: new Date('1990-01-15'),
  };

  const mockCharge = {
    id: testChargeId,
    clientId: testClientId,
    serviceDate: new Date('2024-01-15'),
    providerId: testUserId,
    cptCode: '90834',
    cptDescription: 'Psychotherapy, 45 min',
    modifiers: [],
    units: 1,
    diagnosisCodesJson: [{ code: 'F33.0', isPrimary: true }],
    placeOfService: 'OFFICE',
    chargeAmount: 150.0,
    paymentAmount: 0,
    chargeStatus: 'Pending',
    createdBy: testUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    client: mockClient,
  };

  const mockPayment = {
    id: testPaymentId,
    clientId: testClientId,
    paymentDate: new Date('2024-01-20'),
    paymentAmount: 100.0,
    paymentSource: 'Insurance',
    paymentMethod: 'Check',
    checkNumber: '12345',
    cardLast4: null,
    transactionId: null,
    appliedPaymentsJson: [{ chargeId: testChargeId, amount: 100 }],
    eobDate: null,
    eobAttachment: null,
    claimNumber: 'CLM-001',
    adjustmentsJson: null,
    unappliedAmount: 0,
    postedBy: testUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    client: mockClient,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // CHARGE OPERATIONS
  // ===========================================================================

  describe('getAllCharges', () => {
    it('should return paginated charges with default pagination', async () => {
      const mockCharges = [mockCharge];
      (mockedPrisma.chargeEntry.findMany as jest.Mock).mockResolvedValue(mockCharges);
      (mockedPrisma.chargeEntry.count as jest.Mock).mockResolvedValue(1);

      const result = await billingService.getAllCharges({});

      expect(result.charges).toEqual(mockCharges);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      });
      expect(mockedPrisma.chargeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 50,
          orderBy: { serviceDate: 'desc' },
        })
      );
    });

    it('should filter charges by clientId', async () => {
      (mockedPrisma.chargeEntry.findMany as jest.Mock).mockResolvedValue([mockCharge]);
      (mockedPrisma.chargeEntry.count as jest.Mock).mockResolvedValue(1);

      await billingService.getAllCharges({ clientId: testClientId });

      expect(mockedPrisma.chargeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clientId: testClientId },
        })
      );
    });

    it('should filter charges by status', async () => {
      (mockedPrisma.chargeEntry.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.chargeEntry.count as jest.Mock).mockResolvedValue(0);

      await billingService.getAllCharges({ status: 'Paid' });

      expect(mockedPrisma.chargeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { chargeStatus: 'Paid' },
        })
      );
    });

    it('should filter charges by date range', async () => {
      (mockedPrisma.chargeEntry.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.chargeEntry.count as jest.Mock).mockResolvedValue(0);

      await billingService.getAllCharges({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(mockedPrisma.chargeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            serviceDate: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          },
        })
      );
    });

    it('should respect pagination parameters', async () => {
      (mockedPrisma.chargeEntry.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.chargeEntry.count as jest.Mock).mockResolvedValue(150);

      const result = await billingService.getAllCharges({ page: 2, limit: 25 });

      expect(mockedPrisma.chargeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 25,
          take: 25,
        })
      );
      expect(result.pagination).toEqual({
        page: 2,
        limit: 25,
        total: 150,
        totalPages: 6,
      });
    });

    it('should cap limit at 100', async () => {
      (mockedPrisma.chargeEntry.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.chargeEntry.count as jest.Mock).mockResolvedValue(0);

      await billingService.getAllCharges({ limit: 200 });

      expect(mockedPrisma.chargeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        })
      );
    });
  });

  describe('getChargeById', () => {
    it('should return charge with client details', async () => {
      (mockedPrisma.chargeEntry.findUnique as jest.Mock).mockResolvedValue(mockCharge);

      const result = await billingService.getChargeById(testChargeId);

      expect(result).toEqual(mockCharge);
      expect(mockedPrisma.chargeEntry.findUnique).toHaveBeenCalledWith({
        where: { id: testChargeId },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundError when charge does not exist', async () => {
      (mockedPrisma.chargeEntry.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(billingService.getChargeById('nonexistent'))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('createCharge', () => {
    const validChargeInput = {
      clientId: testClientId,
      serviceDate: '2024-01-15',
      chargeAmount: 150.0,
      cptCode: '90834',
      cptDescription: 'Psychotherapy, 45 min',
      diagnosis: 'F33.0',
    };

    it('should create a charge successfully', async () => {
      (mockedPrisma.chargeEntry.create as jest.Mock).mockResolvedValue(mockCharge);

      const result = await billingService.createCharge(validChargeInput, testUserId);

      expect(result.charge).toEqual(mockCharge);
      expect(result.message).toBe('Charge created successfully');
      expect(result.amdSync).toBeNull();
      expect(mockedPrisma.chargeEntry.create).toHaveBeenCalled();
      expect(mockedCache.invalidateCategory).toHaveBeenCalledWith(cache.CacheCategory.REVENUE);
    });

    it('should create charge with diagnosis codes JSON', async () => {
      const inputWithDiagnosisCodes = {
        ...validChargeInput,
        diagnosisCodesJson: [
          { code: 'F33.0', isPrimary: true },
          { code: 'F41.1', isPrimary: false },
        ],
      };
      (mockedPrisma.chargeEntry.create as jest.Mock).mockResolvedValue(mockCharge);

      await billingService.createCharge(inputWithDiagnosisCodes, testUserId);

      expect(mockedPrisma.chargeEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            diagnosisCodesJson: inputWithDiagnosisCodes.diagnosisCodesJson,
          }),
        })
      );
    });

    it('should sync to AdvancedMD when requested', async () => {
      const inputWithSync = {
        ...validChargeInput,
        syncToAdvancedMD: true,
      };
      (mockedPrisma.chargeEntry.create as jest.Mock).mockResolvedValue(mockCharge);

      const result = await billingService.createCharge(inputWithSync, testUserId);

      expect(result.amdSync).toEqual({ success: true, advancedMDChargeId: 'amd-123' });
      expect(result.message).toBe('Charge created and synced to AdvancedMD');
    });

    it('should handle AdvancedMD sync failure gracefully', async () => {
      const inputWithSync = {
        ...validChargeInput,
        syncToAdvancedMD: true,
      };
      (mockedPrisma.chargeEntry.create as jest.Mock).mockResolvedValue(mockCharge);

      // Mock sync failure
      const mockSyncService = {
        submitCharge: jest.fn().mockResolvedValue({ success: false, error: 'Sync failed' }),
      };
      (AdvancedMDChargeSyncService.getInstance as jest.Mock).mockReturnValue(mockSyncService);

      const result = await billingService.createCharge(inputWithSync, testUserId);

      expect(result.charge).toBeDefined();
      expect(result.amdSync?.success).toBe(false);
      expect(result.message).toBe('Charge created (AMD sync failed)');
    });

    it('should throw BadRequestError for invalid service date', async () => {
      const invalidInput = {
        ...validChargeInput,
        serviceDate: 'invalid-date',
      };

      await expect(billingService.createCharge(invalidInput, testUserId))
        .rejects.toThrow(BadRequestError);
    });

    it('should use providerId from user if not provided', async () => {
      (mockedPrisma.chargeEntry.create as jest.Mock).mockResolvedValue(mockCharge);

      await billingService.createCharge(validChargeInput, testUserId);

      expect(mockedPrisma.chargeEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            providerId: testUserId,
          }),
        })
      );
    });
  });

  describe('updateCharge', () => {
    const validUpdateInput = {
      chargeAmount: 175.0,
      chargeStatus: 'Billed',
    };

    it('should update charge successfully', async () => {
      const updatedCharge = { ...mockCharge, ...validUpdateInput };
      (mockedPrisma.chargeEntry.findUnique as jest.Mock).mockResolvedValue(mockCharge);
      (mockedPrisma.chargeEntry.update as jest.Mock).mockResolvedValue(updatedCharge);

      const result = await billingService.updateCharge(testChargeId, validUpdateInput, testUserId);

      expect(result.chargeAmount).toBe(175.0);
      expect(result.chargeStatus).toBe('Billed');
      expect(mockedCache.invalidateCategory).toHaveBeenCalledWith(cache.CacheCategory.REVENUE);
    });

    it('should throw NotFoundError when charge does not exist', async () => {
      (mockedPrisma.chargeEntry.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(billingService.updateCharge('nonexistent', validUpdateInput, testUserId))
        .rejects.toThrow(NotFoundError);
    });

    it('should convert service date string to Date', async () => {
      const updateWithDate = { serviceDate: '2024-02-01' };
      (mockedPrisma.chargeEntry.findUnique as jest.Mock).mockResolvedValue(mockCharge);
      (mockedPrisma.chargeEntry.update as jest.Mock).mockResolvedValue(mockCharge);

      await billingService.updateCharge(testChargeId, updateWithDate, testUserId);

      expect(mockedPrisma.chargeEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            serviceDate: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('deleteCharge', () => {
    it('should delete charge successfully', async () => {
      (mockedPrisma.chargeEntry.findUnique as jest.Mock).mockResolvedValue(mockCharge);
      (mockedPrisma.chargeEntry.delete as jest.Mock).mockResolvedValue(mockCharge);

      await expect(billingService.deleteCharge(testChargeId, testUserId))
        .resolves.not.toThrow();

      expect(mockedPrisma.chargeEntry.delete).toHaveBeenCalledWith({
        where: { id: testChargeId },
      });
    });

    it('should throw NotFoundError when charge does not exist', async () => {
      (mockedPrisma.chargeEntry.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(billingService.deleteCharge('nonexistent', testUserId))
        .rejects.toThrow(NotFoundError);
    });
  });

  // ===========================================================================
  // PAYMENT OPERATIONS
  // ===========================================================================

  describe('getAllPayments', () => {
    it('should return paginated payments with default pagination', async () => {
      const mockPayments = [mockPayment];
      (mockedPrisma.paymentRecord.findMany as jest.Mock).mockResolvedValue(mockPayments);
      (mockedPrisma.paymentRecord.count as jest.Mock).mockResolvedValue(1);

      const result = await billingService.getAllPayments({});

      expect(result.payments).toEqual(mockPayments);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      });
    });

    it('should filter payments by clientId', async () => {
      (mockedPrisma.paymentRecord.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.paymentRecord.count as jest.Mock).mockResolvedValue(0);

      await billingService.getAllPayments({ clientId: testClientId });

      expect(mockedPrisma.paymentRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clientId: testClientId },
        })
      );
    });

    it('should filter payments by paymentSource', async () => {
      (mockedPrisma.paymentRecord.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.paymentRecord.count as jest.Mock).mockResolvedValue(0);

      await billingService.getAllPayments({ paymentSource: 'Insurance' });

      expect(mockedPrisma.paymentRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { paymentSource: 'Insurance' },
        })
      );
    });

    it('should filter payments by date range', async () => {
      (mockedPrisma.paymentRecord.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.paymentRecord.count as jest.Mock).mockResolvedValue(0);

      await billingService.getAllPayments({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(mockedPrisma.paymentRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            paymentDate: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          },
        })
      );
    });
  });

  describe('getPaymentById', () => {
    it('should return payment with client details', async () => {
      (mockedPrisma.paymentRecord.findUnique as jest.Mock).mockResolvedValue(mockPayment);

      const result = await billingService.getPaymentById(testPaymentId);

      expect(result).toEqual(mockPayment);
      expect(mockedPrisma.paymentRecord.findUnique).toHaveBeenCalledWith({
        where: { id: testPaymentId },
        include: { client: true },
      });
    });

    it('should throw NotFoundError when payment does not exist', async () => {
      (mockedPrisma.paymentRecord.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(billingService.getPaymentById('nonexistent'))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('createPayment', () => {
    const validPaymentInput = {
      clientId: testClientId,
      paymentDate: '2024-01-20T00:00:00.000Z',
      paymentAmount: 100.0,
      paymentSource: 'Insurance',
      paymentMethod: 'Check',
      checkNumber: '12345',
      appliedPaymentsJson: [{ chargeId: testChargeId, amount: 100 }],
    };

    it('should create a payment successfully', async () => {
      (mockedPrisma.paymentRecord.create as jest.Mock).mockResolvedValue(mockPayment);
      (mockedPrisma.chargeEntry.findUnique as jest.Mock).mockResolvedValue(mockCharge);
      (mockedPrisma.chargeEntry.update as jest.Mock).mockResolvedValue(mockCharge);

      const result = await billingService.createPayment(validPaymentInput, testUserId);

      expect(result).toEqual(mockPayment);
      expect(mockedPrisma.paymentRecord.create).toHaveBeenCalled();
    });

    it('should apply payment to charges', async () => {
      (mockedPrisma.paymentRecord.create as jest.Mock).mockResolvedValue(mockPayment);
      (mockedPrisma.chargeEntry.findUnique as jest.Mock).mockResolvedValue(mockCharge);
      (mockedPrisma.chargeEntry.update as jest.Mock).mockResolvedValue(mockCharge);

      await billingService.createPayment(validPaymentInput, testUserId);

      expect(mockedPrisma.chargeEntry.update).toHaveBeenCalledWith({
        where: { id: testChargeId },
        data: expect.objectContaining({
          paymentAmount: 100,
          chargeStatus: 'Partial Payment',
        }),
      });
    });

    it('should mark charge as Paid when fully covered', async () => {
      const chargeWith150 = { ...mockCharge, chargeAmount: 100, paymentAmount: 0 };
      const fullPaymentInput = {
        ...validPaymentInput,
        paymentAmount: 100,
        appliedPaymentsJson: [{ chargeId: testChargeId, amount: 100 }],
      };

      (mockedPrisma.paymentRecord.create as jest.Mock).mockResolvedValue(mockPayment);
      (mockedPrisma.chargeEntry.findUnique as jest.Mock).mockResolvedValue(chargeWith150);
      (mockedPrisma.chargeEntry.update as jest.Mock).mockResolvedValue(chargeWith150);

      await billingService.createPayment(fullPaymentInput, testUserId);

      expect(mockedPrisma.chargeEntry.update).toHaveBeenCalledWith({
        where: { id: testChargeId },
        data: expect.objectContaining({
          chargeStatus: 'Paid',
        }),
      });
    });

    it('should calculate unapplied amount correctly', async () => {
      const partialPaymentInput = {
        ...validPaymentInput,
        paymentAmount: 150,
        appliedPaymentsJson: [{ chargeId: testChargeId, amount: 100 }],
      };

      (mockedPrisma.paymentRecord.create as jest.Mock).mockResolvedValue(mockPayment);
      (mockedPrisma.chargeEntry.findUnique as jest.Mock).mockResolvedValue(mockCharge);
      (mockedPrisma.chargeEntry.update as jest.Mock).mockResolvedValue(mockCharge);

      await billingService.createPayment(partialPaymentInput, testUserId);

      expect(mockedPrisma.paymentRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            unappliedAmount: 50, // 150 - 100 = 50
          }),
        })
      );
    });
  });

  describe('updatePayment', () => {
    const validUpdateInput = {
      paymentAmount: 120.0,
      paymentMethod: 'Credit Card',
      cardLast4: '4242',
    };

    it('should update payment successfully', async () => {
      const updatedPayment = { ...mockPayment, ...validUpdateInput };
      (mockedPrisma.paymentRecord.findUnique as jest.Mock).mockResolvedValue(mockPayment);
      (mockedPrisma.paymentRecord.update as jest.Mock).mockResolvedValue(updatedPayment);

      const result = await billingService.updatePayment(testPaymentId, validUpdateInput, testUserId);

      expect(result.paymentAmount).toBe(120.0);
      expect(result.paymentMethod).toBe('Credit Card');
    });

    it('should throw NotFoundError when payment does not exist', async () => {
      (mockedPrisma.paymentRecord.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(billingService.updatePayment('nonexistent', validUpdateInput, testUserId))
        .rejects.toThrow(NotFoundError);
    });

    it('should convert date strings to Date objects', async () => {
      const updateWithDates = {
        paymentDate: '2024-02-01T00:00:00.000Z',
        eobDate: '2024-02-05T00:00:00.000Z',
      };
      (mockedPrisma.paymentRecord.findUnique as jest.Mock).mockResolvedValue(mockPayment);
      (mockedPrisma.paymentRecord.update as jest.Mock).mockResolvedValue(mockPayment);

      await billingService.updatePayment(testPaymentId, updateWithDates, testUserId);

      expect(mockedPrisma.paymentRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentDate: expect.any(Date),
            eobDate: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('deletePayment', () => {
    it('should delete payment successfully', async () => {
      (mockedPrisma.paymentRecord.findUnique as jest.Mock).mockResolvedValue(mockPayment);
      (mockedPrisma.paymentRecord.delete as jest.Mock).mockResolvedValue(mockPayment);

      await expect(billingService.deletePayment(testPaymentId, testUserId))
        .resolves.not.toThrow();

      expect(mockedPrisma.paymentRecord.delete).toHaveBeenCalledWith({
        where: { id: testPaymentId },
      });
    });

    it('should throw NotFoundError when payment does not exist', async () => {
      (mockedPrisma.paymentRecord.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(billingService.deletePayment('nonexistent', testUserId))
        .rejects.toThrow(NotFoundError);
    });
  });

  // ===========================================================================
  // REPORTS
  // ===========================================================================

  describe('getAgingReport', () => {
    it('should categorize charges into aging buckets', async () => {
      const now = new Date();
      const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      const charges = [
        { ...mockCharge, id: 'c1', serviceDate: daysAgo(10), chargeAmount: 100, paymentAmount: 0, chargeStatus: 'Pending' },
        { ...mockCharge, id: 'c2', serviceDate: daysAgo(40), chargeAmount: 200, paymentAmount: 50, chargeStatus: 'Partial' },
        { ...mockCharge, id: 'c3', serviceDate: daysAgo(70), chargeAmount: 150, paymentAmount: 0, chargeStatus: 'Pending' },
        { ...mockCharge, id: 'c4', serviceDate: daysAgo(100), chargeAmount: 300, paymentAmount: 100, chargeStatus: 'Partial' },
        { ...mockCharge, id: 'c5', serviceDate: daysAgo(150), chargeAmount: 250, paymentAmount: 0, chargeStatus: 'Pending' },
      ];

      (mockedPrisma.chargeEntry.findMany as jest.Mock).mockResolvedValue(charges);

      const result = await billingService.getAgingReport();

      expect(result.current.length).toBe(1); // 10 days
      expect(result.days30.length).toBe(1);  // 40 days
      expect(result.days60.length).toBe(1);  // 70 days
      expect(result.days90.length).toBe(1);  // 100 days
      expect(result.days120Plus.length).toBe(1); // 150 days

      // Verify totals (balance = chargeAmount - paymentAmount)
      expect(result.totals.current).toBe(100);      // 100 - 0
      expect(result.totals.days30).toBe(150);       // 200 - 50
      expect(result.totals.days60).toBe(150);       // 150 - 0
      expect(result.totals.days90).toBe(200);       // 300 - 100
      expect(result.totals.days120Plus).toBe(250);  // 250 - 0
      expect(result.totals.total).toBe(850);        // Sum of all
    });

    it('should exclude Paid and Void charges', async () => {
      (mockedPrisma.chargeEntry.findMany as jest.Mock).mockResolvedValue([]);

      await billingService.getAgingReport();

      expect(mockedPrisma.chargeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            chargeStatus: {
              notIn: ['Paid', 'Void'],
            },
          },
        })
      );
    });

    it('should return empty buckets when no outstanding charges', async () => {
      (mockedPrisma.chargeEntry.findMany as jest.Mock).mockResolvedValue([]);

      const result = await billingService.getAgingReport();

      expect(result.current).toEqual([]);
      expect(result.days30).toEqual([]);
      expect(result.days60).toEqual([]);
      expect(result.days90).toEqual([]);
      expect(result.days120Plus).toEqual([]);
      expect(result.totals.total).toBe(0);
    });
  });

  describe('getRevenueReport', () => {
    it('should calculate revenue metrics correctly', async () => {
      const charges = [
        { serviceDate: new Date(), chargeAmount: 200, paymentAmount: 150, chargeStatus: 'Partial Payment', cptCode: '90834', providerId: testUserId },
        { serviceDate: new Date(), chargeAmount: 100, paymentAmount: 100, chargeStatus: 'Paid', cptCode: '90834', providerId: testUserId },
        { serviceDate: new Date(), chargeAmount: 150, paymentAmount: 0, chargeStatus: 'Pending', cptCode: '90837', providerId: testUserId },
      ];

      (mockedPrisma.chargeEntry.findMany as jest.Mock).mockResolvedValue(charges);

      const result = await billingService.getRevenueReport();

      expect(result.totalRevenue).toBe(450);        // 200 + 100 + 150
      expect(result.totalCollected).toBe(250);      // 150 + 100 + 0
      expect(result.totalOutstanding).toBe(200);    // 450 - 250
      expect(result.collectionRate).toBeCloseTo(55.56, 1); // (250/450) * 100
      expect(result.averageChargeAmount).toBe(150); // 450 / 3
      expect(result.averagePaymentAmount).toBeCloseTo(83.33, 1); // 250 / 3
    });

    it('should group charges by status', async () => {
      const charges = [
        { serviceDate: new Date(), chargeAmount: 100, paymentAmount: 100, chargeStatus: 'Paid', cptCode: '90834', providerId: testUserId },
        { serviceDate: new Date(), chargeAmount: 150, paymentAmount: 150, chargeStatus: 'Paid', cptCode: '90834', providerId: testUserId },
        { serviceDate: new Date(), chargeAmount: 200, paymentAmount: 0, chargeStatus: 'Pending', cptCode: '90834', providerId: testUserId },
      ];

      (mockedPrisma.chargeEntry.findMany as jest.Mock).mockResolvedValue(charges);

      const result = await billingService.getRevenueReport();

      const paidStatus = result.chargesByStatus.find(s => s.status === 'Paid');
      const pendingStatus = result.chargesByStatus.find(s => s.status === 'Pending');

      expect(paidStatus?.count).toBe(2);
      expect(paidStatus?.totalAmount).toBe(250);
      expect(pendingStatus?.count).toBe(1);
      expect(pendingStatus?.totalAmount).toBe(200);
    });

    it('should filter by date range', async () => {
      (mockedPrisma.chargeEntry.findMany as jest.Mock).mockResolvedValue([]);

      await billingService.getRevenueReport('2024-01-01', '2024-01-31');

      expect(mockedPrisma.chargeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            serviceDate: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          },
        })
      );
    });

    it('should handle zero charges gracefully', async () => {
      (mockedPrisma.chargeEntry.findMany as jest.Mock).mockResolvedValue([]);

      const result = await billingService.getRevenueReport();

      expect(result.totalRevenue).toBe(0);
      expect(result.totalCollected).toBe(0);
      expect(result.totalOutstanding).toBe(0);
      expect(result.collectionRate).toBe(0);
      expect(result.averageChargeAmount).toBe(0);
      expect(result.averagePaymentAmount).toBe(0);
      expect(result.chargesByStatus).toEqual([]);
    });
  });

  // ===========================================================================
  // VALIDATION SCHEMAS
  // ===========================================================================

  describe('Validation Schemas', () => {
    describe('createChargeSchema', () => {
      it('should validate correct charge input', () => {
        const validInput = {
          clientId: '550e8400-e29b-41d4-a716-446655440000',
          serviceDate: '2024-01-15',
          chargeAmount: 150.0,
        };

        const result = createChargeSchema.safeParse(validInput);
        expect(result.success).toBe(true);
      });

      it('should reject invalid client ID', () => {
        const invalidInput = {
          clientId: 'not-a-uuid',
          serviceDate: '2024-01-15',
          chargeAmount: 150.0,
        };

        const result = createChargeSchema.safeParse(invalidInput);
        expect(result.success).toBe(false);
      });

      it('should reject negative charge amount', () => {
        const invalidInput = {
          clientId: '550e8400-e29b-41d4-a716-446655440000',
          serviceDate: '2024-01-15',
          chargeAmount: -50.0,
        };

        const result = createChargeSchema.safeParse(invalidInput);
        expect(result.success).toBe(false);
      });

      it('should apply default values', () => {
        const minimalInput = {
          clientId: '550e8400-e29b-41d4-a716-446655440000',
          serviceDate: '2024-01-15',
          chargeAmount: 150.0,
        };

        const result = createChargeSchema.safeParse(minimalInput);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.units).toBe(1);
          expect(result.data.placeOfService).toBe('OFFICE');
          expect(result.data.chargeStatus).toBe('Pending');
          expect(result.data.syncToAdvancedMD).toBe(false);
        }
      });
    });

    describe('createPaymentSchema', () => {
      it('should validate correct payment input', () => {
        const validInput = {
          clientId: '550e8400-e29b-41d4-a716-446655440000',
          paymentDate: '2024-01-20T00:00:00.000Z',
          paymentAmount: 100.0,
          paymentSource: 'Insurance',
          paymentMethod: 'Check',
          appliedPaymentsJson: [],
        };

        const result = createPaymentSchema.safeParse(validInput);
        expect(result.success).toBe(true);
      });

      it('should reject invalid client ID', () => {
        const invalidInput = {
          clientId: 'not-a-uuid',
          paymentDate: '2024-01-20T00:00:00.000Z',
          paymentAmount: 100.0,
          paymentSource: 'Insurance',
          paymentMethod: 'Check',
          appliedPaymentsJson: [],
        };

        const result = createPaymentSchema.safeParse(invalidInput);
        expect(result.success).toBe(false);
      });

      it('should reject negative payment amount', () => {
        const invalidInput = {
          clientId: '550e8400-e29b-41d4-a716-446655440000',
          paymentDate: '2024-01-20T00:00:00.000Z',
          paymentAmount: -100.0,
          paymentSource: 'Insurance',
          paymentMethod: 'Check',
          appliedPaymentsJson: [],
        };

        const result = createPaymentSchema.safeParse(invalidInput);
        expect(result.success).toBe(false);
      });
    });
  });
});
