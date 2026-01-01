import logger, { logControllerError } from '../utils/logger';
import { Request, Response } from 'express';
import { z } from 'zod';
import { auditLogger } from '../utils/logger';
import prisma from '../services/database';
import { Prisma } from '@mentalspace/database';
import { AdvancedMDChargeSyncService } from '../integrations/advancedmd/charge-sync.service';

// ============================================================================
// CHARGES
// ============================================================================

const createChargeSchema = z.object({
  clientId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  serviceDate: z.string(), // Allow various date formats from frontend
  providerId: z.string().uuid().optional(), // Made optional - will use current user if not provided
  supervisingProviderId: z.string().uuid().optional(),
  cptCode: z.string().optional(), // Made optional for simpler charge entry
  cptDescription: z.string().optional(), // Made optional
  modifiers: z.array(z.string()).optional(),
  units: z.number().int().min(1).default(1),
  diagnosisCodesJson: z.any().optional(), // Made optional
  diagnosis: z.string().optional(), // Added to support frontend field
  placeOfService: z.string().optional().default('OFFICE'), // Made optional with default
  locationId: z.string().uuid().optional(),
  chargeAmount: z.number().min(0),
  primaryInsuranceId: z.string().uuid().optional(),
  secondaryInsuranceId: z.string().uuid().optional(),
  chargeStatus: z.string().optional().default('Pending'), // Added to support frontend field
  notes: z.string().optional(), // Added to support frontend field
  // AdvancedMD sync options
  syncToAdvancedMD: z.boolean().optional().default(false),
  autoSubmitClaim: z.boolean().optional().default(false),
});

// Get all charges
export const getAllCharges = async (req: Request, res: Response) => {
  try {
    const {
      clientId,
      status,
      startDate,
      endDate,
      page = '1',
      limit = '50'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (status) where.chargeStatus = status;
    if (startDate || endDate) {
      where.serviceDate = {};
      if (startDate) where.serviceDate.gte = new Date(startDate as string);
      if (endDate) where.serviceDate.lte = new Date(endDate as string);
    }

    const [charges, total] = await Promise.all([
      prisma.chargeEntry.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { serviceDate: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.chargeEntry.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: charges,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Get charges error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve charges',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get single charge
export const getChargeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const charge = await prisma.chargeEntry.findUnique({
      where: { id },
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

    if (!charge) {
      return res.status(404).json({
        success: false,
        message: 'Charge not found',
      });
    }

    res.status(200).json({
      success: true,
      data: charge,
    });
  } catch (error) {
    logger.error('Get charge error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve charge',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Create charge
export const createCharge = async (req: Request, res: Response) => {
  try {
    const validatedData = createChargeSchema.parse(req.body);
    const userId = (req as any).user?.userId;

    // Parse service date - handle various formats
    let serviceDate: Date;
    try {
      serviceDate = new Date(validatedData.serviceDate);
      if (isNaN(serviceDate.getTime())) {
        throw new Error('Invalid date');
      }
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid service date format',
      });
    }

    // Build diagnosis codes JSON from either diagnosisCodesJson or simple diagnosis string
    let diagnosisCodes = validatedData.diagnosisCodesJson;
    if (!diagnosisCodes && validatedData.diagnosis) {
      diagnosisCodes = [{ code: validatedData.diagnosis, isPrimary: true }];
    }

    const chargeData: Prisma.ChargeEntryUncheckedCreateInput = {
      clientId: validatedData.clientId,
      appointmentId: validatedData.appointmentId,
      serviceDate,
      providerId: validatedData.providerId || userId, // Default to current user
      supervisingProviderId: validatedData.supervisingProviderId,
      cptCode: validatedData.cptCode || '',
      cptDescription: validatedData.cptDescription || '',
      modifiers: validatedData.modifiers || [],
      units: validatedData.units,
      diagnosisCodesJson: diagnosisCodes,
      placeOfService: validatedData.placeOfService || 'OFFICE',
      locationId: validatedData.locationId,
      chargeAmount: validatedData.chargeAmount,
      chargeStatus: validatedData.chargeStatus || 'Pending',
      primaryInsuranceId: validatedData.primaryInsuranceId,
      secondaryInsuranceId: validatedData.secondaryInsuranceId,
      createdBy: userId,
    };

    const charge = await prisma.chargeEntry.create({
      data: chargeData,
      include: {
        client: true,
      },
    });

    auditLogger.info('Charge created', {
      userId,
      chargeId: charge.id,
      clientId: charge.clientId,
      action: 'CHARGE_CREATED',
    });

    // Optional: Sync to AdvancedMD
    let amdSyncResult = null;
    if (validatedData.syncToAdvancedMD) {
      try {
        const chargeSyncService = AdvancedMDChargeSyncService.getInstance();
        amdSyncResult = await chargeSyncService.submitCharge(charge.id);

        if (amdSyncResult.success) {
          auditLogger.info('Charge synced to AdvancedMD', {
            userId,
            chargeId: charge.id,
            amdChargeId: amdSyncResult.amdChargeId,
            action: 'CHARGE_AMD_SYNC',
          });
        } else {
          logger.warn('AdvancedMD sync failed for charge', {
            chargeId: charge.id,
            error: amdSyncResult.error,
          });
        }
      } catch (syncError) {
        logger.error('AdvancedMD sync error:', {
          chargeId: charge.id,
          error: syncError instanceof Error ? syncError.message : 'Unknown error',
        });
        // Don't fail the request - charge was created locally
        amdSyncResult = { success: false, error: 'Sync failed - charge saved locally' };
      }
    }

    res.status(201).json({
      success: true,
      message: validatedData.syncToAdvancedMD
        ? (amdSyncResult?.success ? 'Charge created and synced to AdvancedMD' : 'Charge created (AMD sync failed)')
        : 'Charge created successfully',
      data: charge,
      amdSync: amdSyncResult,
    });
  } catch (error) {
    logger.error('Create charge error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create charge',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Update charge
export const updateCharge = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    const charge = await prisma.chargeEntry.update({
      where: { id },
      data: {
        ...req.body,
      },
      include: {
        client: true,
      },
    });

    auditLogger.info('Charge updated', {
      userId,
      chargeId: id,
      action: 'CHARGE_UPDATED',
    });

    res.status(200).json({
      success: true,
      message: 'Charge updated successfully',
      data: charge,
    });
  } catch (error) {
    logger.error('Update charge error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    res.status(500).json({
      success: false,
      message: 'Failed to update charge',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Delete charge
export const deleteCharge = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    await prisma.chargeEntry.delete({
      where: { id },
    });

    auditLogger.info('Charge deleted', {
      userId,
      chargeId: id,
      action: 'CHARGE_DELETED',
    });

    res.status(200).json({
      success: true,
      message: 'Charge deleted successfully',
    });
  } catch (error) {
    logger.error('Delete charge error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    res.status(500).json({
      success: false,
      message: 'Failed to delete charge',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ============================================================================
// PAYMENTS
// ============================================================================

const createPaymentSchema = z.object({
  clientId: z.string().uuid(),
  paymentDate: z.string().datetime(),
  paymentAmount: z.number().min(0),
  paymentSource: z.string(),
  paymentMethod: z.string(),
  checkNumber: z.string().optional(),
  cardLast4: z.string().optional(),
  transactionId: z.string().optional(),
  appliedPaymentsJson: z.any(),
  eobDate: z.string().datetime().optional(),
  eobAttachment: z.string().optional(),
  claimNumber: z.string().optional(),
  adjustmentsJson: z.any().optional(),
});

// Get all payments
export const getAllPayments = async (req: Request, res: Response) => {
  try {
    const {
      clientId,
      startDate,
      endDate,
      paymentSource,
      page = '1',
      limit = '50'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (paymentSource) where.paymentSource = paymentSource;
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate as string);
      if (endDate) where.paymentDate.lte = new Date(endDate as string);
    }

    const [payments, total] = await Promise.all([
      prisma.paymentRecord.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.paymentRecord.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: payments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Get payments error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payments',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get single payment
export const getPaymentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const payment = await prisma.paymentRecord.findUnique({
      where: { id },
      include: {
        client: true,
      },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    logger.error('Get payment error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Create payment
export const createPayment = async (req: Request, res: Response) => {
  try {
    const validatedData = createPaymentSchema.parse(req.body);
    const userId = (req as any).user?.userId;

    // Calculate unapplied amount
    const appliedPayments = validatedData.appliedPaymentsJson as any[];
    const totalApplied = appliedPayments.reduce((sum: number, ap: any) => sum + (ap.amount || 0), 0);
    const unappliedAmount = validatedData.paymentAmount - totalApplied;

    const paymentData: Prisma.PaymentRecordUncheckedCreateInput = {
      clientId: validatedData.clientId,
      paymentDate: new Date(validatedData.paymentDate),
      paymentAmount: validatedData.paymentAmount,
      paymentSource: validatedData.paymentSource,
      paymentMethod: validatedData.paymentMethod,
      checkNumber: validatedData.checkNumber,
      cardLast4: validatedData.cardLast4,
      transactionId: validatedData.transactionId,
      appliedPaymentsJson: validatedData.appliedPaymentsJson,
      eobDate: validatedData.eobDate ? new Date(validatedData.eobDate) : null,
      eobAttachment: validatedData.eobAttachment,
      claimNumber: validatedData.claimNumber,
      adjustmentsJson: validatedData.adjustmentsJson,
      unappliedAmount,
      postedBy: userId,
    };

    const payment = await prisma.paymentRecord.create({
      data: paymentData,
      include: {
        client: true,
      },
    });

    // Update related charges
    if (appliedPayments && appliedPayments.length > 0) {
      for (const ap of appliedPayments) {
        if (ap.chargeId) {
          const charge = await prisma.chargeEntry.findUnique({ where: { id: ap.chargeId } });
          if (charge) {
            const newPaymentAmount = (charge.paymentAmount || 0) + (ap.amount || 0);
            await prisma.chargeEntry.update({
              where: { id: ap.chargeId },
              data: {
                paymentAmount: newPaymentAmount,
                chargeStatus: newPaymentAmount >= charge.chargeAmount ? 'Paid' : 'Partial Payment',
              },
            });
          }
        }
      }
    }

    auditLogger.info('Payment created', {
      userId,
      paymentId: payment.id,
      clientId: payment.clientId,
      amount: payment.paymentAmount,
      action: 'PAYMENT_CREATED',
    });

    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: payment,
    });
  } catch (error) {
    logger.error('Create payment error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create payment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Update payment
export const updatePayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    const payment = await prisma.paymentRecord.update({
      where: { id },
      data: {
        ...req.body,
      },
      include: {
        client: true,
      },
    });

    auditLogger.info('Payment updated', {
      userId,
      paymentId: id,
      action: 'PAYMENT_UPDATED',
    });

    res.status(200).json({
      success: true,
      message: 'Payment updated successfully',
      data: payment,
    });
  } catch (error) {
    logger.error('Update payment error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    res.status(500).json({
      success: false,
      message: 'Failed to update payment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Delete payment
export const deletePayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    await prisma.paymentRecord.delete({
      where: { id },
    });

    auditLogger.info('Payment deleted', {
      userId,
      paymentId: id,
      action: 'PAYMENT_DELETED',
    });

    res.status(200).json({
      success: true,
      message: 'Payment deleted successfully',
    });
  } catch (error) {
    logger.error('Delete payment error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    res.status(500).json({
      success: false,
      message: 'Failed to delete payment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ============================================================================
// BILLING REPORTS
// ============================================================================

// Get aging report
export const getAgingReport = async (req: Request, res: Response) => {
  try {
    const charges = await prisma.chargeEntry.findMany({
      where: {
        chargeStatus: {
          notIn: ['Paid', 'Void'],
        },
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { serviceDate: 'asc' },
    });

    const now = new Date();
    const aging = {
      current: [] as any[],
      days30: [] as any[],
      days60: [] as any[],
      days90: [] as any[],
      days120Plus: [] as any[],
    };

    charges.forEach((charge) => {
      const daysDiff = Math.floor((now.getTime() - charge.serviceDate.getTime()) / (1000 * 60 * 60 * 24));
      const chargeAmountNum = Number(charge.chargeAmount);
      const paymentAmountNum = Number(charge.paymentAmount || 0);
      const balance = chargeAmountNum - paymentAmountNum;

      const item = {
        ...charge,
        balance,
        daysSinceService: daysDiff,
      };

      if (daysDiff < 30) aging.current.push(item);
      else if (daysDiff < 60) aging.days30.push(item);
      else if (daysDiff < 90) aging.days60.push(item);
      else if (daysDiff < 120) aging.days90.push(item);
      else aging.days120Plus.push(item);
    });

    const totals = {
      current: aging.current.reduce((sum, c) => sum + Number(c.balance), 0),
      days30: aging.days30.reduce((sum, c) => sum + Number(c.balance), 0),
      days60: aging.days60.reduce((sum, c) => sum + Number(c.balance), 0),
      days90: aging.days90.reduce((sum, c) => sum + Number(c.balance), 0),
      days120Plus: aging.days120Plus.reduce((sum, c) => sum + Number(c.balance), 0),
      total: 0,
    };

    totals.total = Object.values(totals).reduce((sum, val) => sum + val, 0);

    res.status(200).json({
      success: true,
      data: {
        current: aging.current,
        days30: aging.days30,
        days60: aging.days60,
        days90: aging.days90,
        days120Plus: aging.days120Plus,
        totals,
      },
    });
  } catch (error) {
    logger.error('Get aging report error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    res.status(500).json({
      success: false,
      message: 'Failed to generate aging report',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get revenue report
export const getRevenueReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, groupBy = 'month' } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.serviceDate = {};
      if (startDate) where.serviceDate.gte = new Date(startDate as string);
      if (endDate) where.serviceDate.lte = new Date(endDate as string);
    }

    const charges = await prisma.chargeEntry.findMany({
      where,
      select: {
        serviceDate: true,
        chargeAmount: true,
        paymentAmount: true,
        chargeStatus: true,
        cptCode: true,
        providerId: true,
      },
    });

    const totalCharges = charges.reduce((sum, c) => sum + Number(c.chargeAmount), 0);
    const totalPayments = charges.reduce((sum, c) => sum + Number(c.paymentAmount || 0), 0);
    const collectionRate = totalCharges > 0 ? (totalPayments / totalCharges) * 100 : 0;

    // Group charges by status
    const chargesByStatus = charges.reduce((acc: any[], charge) => {
      const existingStatus = acc.find(s => s.status === charge.chargeStatus);
      if (existingStatus) {
        existingStatus.count++;
        existingStatus.totalAmount += Number(charge.chargeAmount);
      } else {
        acc.push({
          status: charge.chargeStatus,
          count: 1,
          totalAmount: Number(charge.chargeAmount),
        });
      }
      return acc;
    }, []);

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: totalCharges,
        totalCollected: totalPayments,
        totalOutstanding: totalCharges - totalPayments,
        collectionRate: collectionRate,
        averageChargeAmount: charges.length > 0 ? totalCharges / charges.length : 0,
        averagePaymentAmount: charges.length > 0 ? totalPayments / charges.length : 0,
        chargesByStatus: chargesByStatus,
        revenueByMonth: [], // Can be implemented later if needed
      },
    });
  } catch (error) {
    logger.error('Get revenue report error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    res.status(500).json({
      success: false,
      message: 'Failed to generate revenue report',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
