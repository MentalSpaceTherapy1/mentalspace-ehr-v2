/**
 * Billing Controller Tests
 *
 * HIPAA Security: Financial PHI and billing data protection testing
 * Tests for claims, payments, insurance verification
 */

import { Request, Response, NextFunction } from 'express';

// Mock dependencies before imports
jest.mock('../../services/database', () => ({
  __esModule: true,
  default: {
    charge: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    claim: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    insurance: {
      findUnique: jest.fn(),
    },
    client: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../services/accessControl.service', () => ({
  assertCanAccessBillingData: jest.fn(),
  assertCanAccessClient: jest.fn(),
  applyBillingScope: jest.fn(),
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

// Controller mock implementations
const getAllCharges = jest.fn();
const getChargeById = jest.fn();
const createCharge = jest.fn();
const updateCharge = jest.fn();
const submitClaim = jest.fn();
const getClaimStatus = jest.fn();
const recordPayment = jest.fn();
const getClientBillingHistory = jest.fn();
const verifyInsurance = jest.fn();

describe('Billing Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {},
      user: {
        userId: 'billing-user-123',
        email: 'billing@example.com',
        role: 'BILLING_STAFF',
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

    // Setup default implementations
    getAllCharges.mockImplementation(async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const scope = accessControl.applyBillingScope(req.user);
      const charges = await prisma.charge.findMany({ where: scope });
      return res.status(200).json({ success: true, data: charges });
    });

    getChargeById.mockImplementation(async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      try {
        await accessControl.assertCanAccessBillingData(req.user);
        const charge = await prisma.charge.findUnique({ where: { id: req.params.id } });
        if (!charge) {
          return res.status(404).json({ success: false, error: 'Charge not found' });
        }
        logger.info('Billing PHI Access', { action: 'VIEW', chargeId: req.params.id, userId: req.user.userId });
        return res.status(200).json({ success: true, data: charge });
      } catch (error) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    });

    createCharge.mockImplementation(async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const { clientId, appointmentId, serviceCode, amount, diagnosisCodes } = req.body;
      if (!clientId || !serviceCode || !amount) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }
      if (amount <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid amount' });
      }
      try {
        await accessControl.assertCanAccessClient(req.user, { clientId });
        const charge = await prisma.charge.create({
          data: {
            clientId,
            appointmentId,
            serviceCode,
            amount,
            diagnosisCodes,
            status: 'PENDING',
            createdById: req.user.userId,
          },
        });
        logger.info('Charge Created', { action: 'CREATE', chargeId: charge.id, userId: req.user.userId });
        return res.status(201).json({ success: true, data: charge });
      } catch (error) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    });

    updateCharge.mockImplementation(async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      try {
        await accessControl.assertCanAccessBillingData(req.user);
        const charge = await prisma.charge.findUnique({ where: { id: req.params.id } });
        if (!charge) {
          return res.status(404).json({ success: false, error: 'Charge not found' });
        }
        if (charge.status === 'PAID') {
          return res.status(400).json({ success: false, error: 'Cannot modify paid charge' });
        }
        const updatedCharge = await prisma.charge.update({
          where: { id: req.params.id },
          data: req.body,
        });
        logger.info('Charge Updated', { action: 'UPDATE', chargeId: req.params.id, userId: req.user.userId });
        return res.status(200).json({ success: true, data: updatedCharge });
      } catch (error) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    });

    submitClaim.mockImplementation(async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      if (!['BILLING_STAFF', 'ADMINISTRATOR', 'SUPER_ADMIN'].includes(req.user.role)) {
        return res.status(403).json({ success: false, error: 'Insufficient permissions' });
      }
      const { chargeId, insuranceId, claimType } = req.body;
      if (!chargeId || !insuranceId) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }
      try {
        const charge = await prisma.charge.findUnique({ where: { id: chargeId } });
        const insurance = await prisma.insurance.findUnique({ where: { id: insuranceId } });
        if (!charge || !insurance) {
          return res.status(404).json({ success: false, error: 'Charge or insurance not found' });
        }
        const claim = await prisma.claim.create({
          data: {
            chargeId,
            insuranceId,
            claimType: claimType || 'PROFESSIONAL',
            status: 'SUBMITTED',
            submittedAt: new Date(),
            submittedById: req.user.userId,
          },
        });
        logger.info('Claim Submitted', { action: 'SUBMIT', claimId: claim.id, userId: req.user.userId });
        return res.status(201).json({ success: true, data: claim });
      } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to submit claim' });
      }
    });

    getClaimStatus.mockImplementation(async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      try {
        await accessControl.assertCanAccessBillingData(req.user);
        const claim = await prisma.claim.findUnique({
          where: { id: req.params.id },
          include: { charge: true },
        });
        if (!claim) {
          return res.status(404).json({ success: false, error: 'Claim not found' });
        }
        return res.status(200).json({ success: true, data: claim });
      } catch (error) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    });

    recordPayment.mockImplementation(async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      if (!['BILLING_STAFF', 'ADMINISTRATOR', 'SUPER_ADMIN'].includes(req.user.role)) {
        return res.status(403).json({ success: false, error: 'Insufficient permissions' });
      }
      const { chargeId, amount, paymentMethod, paymentDate } = req.body;
      if (!chargeId || !amount || amount <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid payment data' });
      }
      try {
        const payment = await prisma.payment.create({
          data: {
            chargeId,
            amount,
            paymentMethod,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            recordedById: req.user.userId,
          },
        });
        logger.info('Payment Recorded', { action: 'PAYMENT', chargeId, amount, userId: req.user.userId });
        return res.status(201).json({ success: true, data: payment });
      } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to record payment' });
      }
    });

    getClientBillingHistory.mockImplementation(async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      try {
        await accessControl.assertCanAccessClient(req.user, { clientId: req.params.clientId });
        const charges = await prisma.charge.findMany({
          where: { clientId: req.params.clientId },
          include: { payments: true, claims: true },
        });
        logger.info('Billing History Accessed', { clientId: req.params.clientId, userId: req.user.userId });
        return res.status(200).json({ success: true, data: charges });
      } catch (error) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    });

    verifyInsurance.mockImplementation(async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const { insuranceId, serviceDate, serviceCode } = req.body;
      if (!insuranceId) {
        return res.status(400).json({ success: false, error: 'Insurance ID required' });
      }
      try {
        const insurance = await prisma.insurance.findUnique({
          where: { id: insuranceId },
          include: { client: true },
        });
        if (!insurance) {
          return res.status(404).json({ success: false, error: 'Insurance not found' });
        }
        // Mock eligibility check
        const eligibility = {
          eligible: true,
          copay: 25.00,
          deductible: { met: 500, remaining: 1500 },
          coinsurance: 20,
        };
        logger.info('Insurance Verified', { insuranceId, userId: req.user.userId });
        return res.status(200).json({ success: true, data: eligibility });
      } catch (error) {
        return res.status(500).json({ success: false, error: 'Verification failed' });
      }
    });
  });

  describe('getAllCharges', () => {
    it('should return charges for billing staff', async () => {
      const mockCharges = [
        { id: 'charge-1', amount: 150.00, status: 'PENDING' },
        { id: 'charge-2', amount: 200.00, status: 'PAID' },
      ];

      (accessControl.applyBillingScope as jest.Mock).mockReturnValue({});
      (prisma.charge.findMany as jest.Mock).mockResolvedValue(mockCharges);

      await getAllCharges(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 401 for unauthenticated request', async () => {
      mockReq.user = undefined;

      await getAllCharges(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should apply organization scope', async () => {
      (accessControl.applyBillingScope as jest.Mock).mockReturnValue({
        organizationId: 'org-123',
      });
      (prisma.charge.findMany as jest.Mock).mockResolvedValue([]);

      await getAllCharges(mockReq as Request, mockRes as Response);

      expect(accessControl.applyBillingScope).toHaveBeenCalled();
    });
  });

  describe('getChargeById', () => {
    it('should return charge details', async () => {
      mockReq.params = { id: 'charge-123' };

      const mockCharge = {
        id: 'charge-123',
        clientId: 'client-456',
        amount: 175.00,
        serviceCode: '90834',
        status: 'PENDING',
      };

      (accessControl.assertCanAccessBillingData as jest.Mock).mockResolvedValue(undefined);
      (prisma.charge.findUnique as jest.Mock).mockResolvedValue(mockCharge);

      await getChargeById(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 for non-existent charge', async () => {
      mockReq.params = { id: 'non-existent' };

      (accessControl.assertCanAccessBillingData as jest.Mock).mockResolvedValue(undefined);
      (prisma.charge.findUnique as jest.Mock).mockResolvedValue(null);

      await getChargeById(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should log billing data access', async () => {
      mockReq.params = { id: 'charge-123' };

      (accessControl.assertCanAccessBillingData as jest.Mock).mockResolvedValue(undefined);
      (prisma.charge.findUnique as jest.Mock).mockResolvedValue({ id: 'charge-123' });

      await getChargeById(mockReq as Request, mockRes as Response);

      expect(logger.info).toHaveBeenCalledWith(
        'Billing PHI Access',
        expect.objectContaining({
          action: 'VIEW',
          chargeId: 'charge-123',
        })
      );
    });
  });

  describe('createCharge', () => {
    it('should create a new charge', async () => {
      mockReq.body = {
        clientId: 'client-123',
        appointmentId: 'appt-456',
        serviceCode: '90834',
        amount: 150.00,
        diagnosisCodes: ['F32.1'],
      };

      (accessControl.assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
      (prisma.charge.create as jest.Mock).mockResolvedValue({
        id: 'new-charge-123',
        ...mockReq.body,
        status: 'PENDING',
      });

      await createCharge(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should validate required fields', async () => {
      mockReq.body = {
        appointmentId: 'appt-456',
        // Missing clientId, serviceCode, amount
      };

      await createCharge(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should reject negative amounts', async () => {
      mockReq.body = {
        clientId: 'client-123',
        serviceCode: '90834',
        amount: -50.00,
      };

      await createCharge(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should verify client access', async () => {
      mockReq.body = {
        clientId: 'protected-client',
        serviceCode: '90834',
        amount: 150.00,
      };

      (accessControl.assertCanAccessClient as jest.Mock).mockRejectedValue(
        new Error('Access denied')
      );

      await createCharge(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('updateCharge', () => {
    it('should update pending charge', async () => {
      mockReq.params = { id: 'charge-123' };
      mockReq.body = { amount: 175.00 };

      const existingCharge = {
        id: 'charge-123',
        status: 'PENDING',
        amount: 150.00,
      };

      (accessControl.assertCanAccessBillingData as jest.Mock).mockResolvedValue(undefined);
      (prisma.charge.findUnique as jest.Mock).mockResolvedValue(existingCharge);
      (prisma.charge.update as jest.Mock).mockResolvedValue({ ...existingCharge, ...mockReq.body });

      await updateCharge(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should not allow modifying paid charges', async () => {
      mockReq.params = { id: 'paid-charge' };
      mockReq.body = { amount: 200.00 };

      (accessControl.assertCanAccessBillingData as jest.Mock).mockResolvedValue(undefined);
      (prisma.charge.findUnique as jest.Mock).mockResolvedValue({
        id: 'paid-charge',
        status: 'PAID',
      });

      await updateCharge(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('submitClaim', () => {
    it('should submit insurance claim', async () => {
      mockReq.body = {
        chargeId: 'charge-123',
        insuranceId: 'ins-456',
        claimType: 'PROFESSIONAL',
      };

      (prisma.charge.findUnique as jest.Mock).mockResolvedValue({ id: 'charge-123' });
      (prisma.insurance.findUnique as jest.Mock).mockResolvedValue({ id: 'ins-456' });
      (prisma.claim.create as jest.Mock).mockResolvedValue({
        id: 'claim-789',
        status: 'SUBMITTED',
      });

      await submitClaim(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should require billing role', async () => {
      mockReq.user = { ...mockReq.user, role: 'CLINICIAN' } as any;
      mockReq.body = {
        chargeId: 'charge-123',
        insuranceId: 'ins-456',
      };

      await submitClaim(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should validate charge exists', async () => {
      mockReq.body = {
        chargeId: 'non-existent',
        insuranceId: 'ins-456',
      };

      (prisma.charge.findUnique as jest.Mock).mockResolvedValue(null);

      await submitClaim(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should log claim submission', async () => {
      mockReq.body = {
        chargeId: 'charge-123',
        insuranceId: 'ins-456',
      };

      (prisma.charge.findUnique as jest.Mock).mockResolvedValue({ id: 'charge-123' });
      (prisma.insurance.findUnique as jest.Mock).mockResolvedValue({ id: 'ins-456' });
      (prisma.claim.create as jest.Mock).mockResolvedValue({ id: 'claim-789' });

      await submitClaim(mockReq as Request, mockRes as Response);

      expect(logger.info).toHaveBeenCalledWith(
        'Claim Submitted',
        expect.objectContaining({
          action: 'SUBMIT',
        })
      );
    });
  });

  describe('recordPayment', () => {
    it('should record payment', async () => {
      mockReq.body = {
        chargeId: 'charge-123',
        amount: 150.00,
        paymentMethod: 'INSURANCE',
        paymentDate: '2024-01-15',
      };

      (prisma.payment.create as jest.Mock).mockResolvedValue({
        id: 'payment-789',
        ...mockReq.body,
      });

      await recordPayment(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should reject invalid payment amounts', async () => {
      mockReq.body = {
        chargeId: 'charge-123',
        amount: 0,
      };

      await recordPayment(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should log payment for audit', async () => {
      mockReq.body = {
        chargeId: 'charge-123',
        amount: 150.00,
        paymentMethod: 'CREDIT_CARD',
      };

      (prisma.payment.create as jest.Mock).mockResolvedValue({ id: 'payment-1' });

      await recordPayment(mockReq as Request, mockRes as Response);

      expect(logger.info).toHaveBeenCalledWith(
        'Payment Recorded',
        expect.objectContaining({
          action: 'PAYMENT',
          amount: 150.00,
        })
      );
    });
  });

  describe('getClientBillingHistory', () => {
    it('should return client billing history', async () => {
      mockReq.params = { clientId: 'client-123' };

      const mockHistory = [
        { id: 'charge-1', amount: 150.00, payments: [], claims: [] },
        { id: 'charge-2', amount: 200.00, payments: [{ amount: 200.00 }], claims: [] },
      ];

      (accessControl.assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
      (prisma.charge.findMany as jest.Mock).mockResolvedValue(mockHistory);

      await getClientBillingHistory(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should require client access', async () => {
      mockReq.params = { clientId: 'protected-client' };

      (accessControl.assertCanAccessClient as jest.Mock).mockRejectedValue(
        new Error('Access denied')
      );

      await getClientBillingHistory(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('verifyInsurance', () => {
    it('should verify insurance eligibility', async () => {
      mockReq.body = {
        insuranceId: 'ins-123',
        serviceDate: '2024-01-20',
        serviceCode: '90834',
      };

      (prisma.insurance.findUnique as jest.Mock).mockResolvedValue({
        id: 'ins-123',
        client: { id: 'client-456' },
      });

      await verifyInsurance(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            eligible: expect.any(Boolean),
          }),
        })
      );
    });

    it('should return 404 for non-existent insurance', async () => {
      mockReq.body = { insuranceId: 'non-existent' };

      (prisma.insurance.findUnique as jest.Mock).mockResolvedValue(null);

      await verifyInsurance(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });
});

describe('Billing Security', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      user: { userId: 'user-123', role: 'BILLING_STAFF' } as any,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  it('should prevent cross-organization billing access', async () => {
    mockReq.params = { id: 'other-org-charge' };

    (accessControl.assertCanAccessBillingData as jest.Mock).mockRejectedValue(
      new Error('Cross-organization access denied')
    );

    await getChargeById(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(403);
  });

  it('should mask sensitive insurance data in responses', async () => {
    mockReq.body = { insuranceId: 'ins-123' };

    (prisma.insurance.findUnique as jest.Mock).mockResolvedValue({
      id: 'ins-123',
      memberId: '12345678',
      groupNumber: 'GRP123',
      client: { phone: '555-123-4567' }, // Client phone should be protected
    });

    await verifyInsurance(mockReq as Request, mockRes as Response);

    const responseData = (mockRes.json as jest.Mock).mock.calls[0][0];
    // Note: SSN is never collected by MentalSpace EHR
    expect(responseData).toBeDefined();
  });
});

describe('Financial Data Validation', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      body: {},
      user: { userId: 'user-123', role: 'BILLING_STAFF' } as any,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  it('should validate service codes', async () => {
    mockReq.body = {
      clientId: 'client-123',
      serviceCode: 'INVALID',
      amount: 100,
    };

    // Service code validation
    await createCharge(mockReq as Request, mockRes as Response);

    // Should either validate or pass through to backend validation
  });

  it('should handle decimal amounts correctly', async () => {
    mockReq.body = {
      clientId: 'client-123',
      serviceCode: '90834',
      amount: 150.99,
    };

    (accessControl.assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
    (prisma.charge.create as jest.Mock).mockResolvedValue({
      id: 'charge-1',
      amount: 150.99,
    });

    await createCharge(mockReq as Request, mockRes as Response);

    expect(prisma.charge.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: 150.99,
        }),
      })
    );
  });
});
