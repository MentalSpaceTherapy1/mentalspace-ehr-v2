/**
 * Billing Service
 * Phase 3.2: Business logic extracted from billing.controller.ts
 *
 * Handles all billing-related business operations including:
 * - Charge CRUD operations
 * - Payment CRUD operations
 * - Payment application to charges
 * - Aging reports
 * - Revenue reports
 * - AdvancedMD integration
 */

import prisma from './database';
import { ChargeEntry, PaymentRecord, Prisma } from '@mentalspace/database';
import { z } from 'zod';
import logger, { auditLogger } from '../utils/logger';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { AdvancedMDChargeSyncService } from '../integrations/advancedmd/charge-sync.service';
import * as cache from './cache.service';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const createChargeSchema = z.object({
  clientId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  serviceDate: z.string(),
  providerId: z.string().uuid().optional(),
  supervisingProviderId: z.string().uuid().optional(),
  cptCode: z.string().optional(),
  cptDescription: z.string().optional(),
  modifiers: z.array(z.string()).optional(),
  units: z.number().int().min(1).default(1),
  diagnosisCodesJson: z.any().optional(),
  diagnosis: z.string().optional(),
  placeOfService: z.string().optional().default('OFFICE'),
  locationId: z.string().uuid().optional(),
  chargeAmount: z.number().min(0),
  primaryInsuranceId: z.string().uuid().optional(),
  secondaryInsuranceId: z.string().uuid().optional(),
  chargeStatus: z.string().optional().default('Pending'),
  notes: z.string().optional(),
  syncToAdvancedMD: z.boolean().optional().default(false),
  autoSubmitClaim: z.boolean().optional().default(false),
});

export const updateChargeSchema = createChargeSchema.partial().omit({ clientId: true });

export const createPaymentSchema = z.object({
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

export const updatePaymentSchema = createPaymentSchema.partial().omit({ clientId: true });

// ============================================================================
// TYPES
// ============================================================================

export type CreateChargeInput = z.infer<typeof createChargeSchema>;
export type UpdateChargeInput = z.infer<typeof updateChargeSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;

export interface ChargeFilters {
  clientId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface PaymentFilters {
  clientId?: string;
  paymentSource?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ChargeListResult {
  charges: (ChargeEntry & { client: { id: string; firstName: string; lastName: string } })[];
  pagination: PaginationInfo;
}

export interface PaymentListResult {
  payments: (PaymentRecord & { client: { id: string; firstName: string; lastName: string } })[];
  pagination: PaginationInfo;
}

export interface AgingBucket {
  charges: any[];
  total: number;
}

export interface AgingReport {
  current: any[];
  days30: any[];
  days60: any[];
  days90: any[];
  days120Plus: any[];
  totals: {
    current: number;
    days30: number;
    days60: number;
    days90: number;
    days120Plus: number;
    total: number;
  };
}

export interface RevenueReport {
  totalRevenue: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  averageChargeAmount: number;
  averagePaymentAmount: number;
  chargesByStatus: { status: string; count: number; totalAmount: number }[];
  revenueByMonth: any[];
}

export interface CreateChargeResult {
  charge: ChargeEntry;
  amdSync: { success: boolean; advancedMDChargeId?: string; error?: string } | null;
  message: string;
}

// ============================================================================
// BILLING SERVICE
// ============================================================================

class BillingService {
  // ==========================================================================
  // CHARGE OPERATIONS
  // ==========================================================================

  /**
   * Parse service date from various formats
   */
  private parseServiceDate(dateStr: string): Date {
    const serviceDate = new Date(dateStr);
    if (isNaN(serviceDate.getTime())) {
      throw new BadRequestError('Invalid service date format');
    }
    return serviceDate;
  }

  /**
   * Build diagnosis codes JSON from input
   */
  private buildDiagnosisCodes(
    diagnosisCodesJson: any,
    diagnosis?: string
  ): any {
    if (diagnosisCodesJson) {
      return diagnosisCodesJson;
    }
    if (diagnosis) {
      return [{ code: diagnosis, isPrimary: true }];
    }
    return undefined;
  }

  /**
   * Build Prisma create data for charge
   */
  private buildChargeCreateData(
    data: CreateChargeInput,
    serviceDate: Date,
    diagnosisCodes: any,
    userId: string
  ): Prisma.ChargeEntryUncheckedCreateInput {
    return {
      clientId: data.clientId,
      serviceDate,
      providerId: data.providerId || userId,
      cptCode: data.cptCode || '',
      cptDescription: data.cptDescription || '',
      modifiers: data.modifiers || [],
      units: data.units,
      diagnosisCodesJson: diagnosisCodes,
      placeOfService: data.placeOfService || 'OFFICE',
      chargeAmount: data.chargeAmount,
      chargeStatus: data.chargeStatus || 'Pending',
      createdBy: userId,
      ...(data.appointmentId && { appointmentId: data.appointmentId }),
      ...(data.supervisingProviderId && { supervisingProviderId: data.supervisingProviderId }),
      ...(data.locationId && { locationId: data.locationId }),
      ...(data.primaryInsuranceId && { primaryInsuranceId: data.primaryInsuranceId }),
      ...(data.secondaryInsuranceId && { secondaryInsuranceId: data.secondaryInsuranceId }),
    };
  }

  /**
   * Sync charge to AdvancedMD
   */
  private async syncToAdvancedMD(
    chargeId: string,
    userId: string
  ): Promise<{ success: boolean; advancedMDChargeId?: string; error?: string }> {
    try {
      const chargeSyncService = AdvancedMDChargeSyncService.getInstance();
      const result = await chargeSyncService.submitCharge(chargeId);

      if (result.success) {
        auditLogger.info('Charge synced to AdvancedMD', {
          userId,
          chargeId,
          advancedMDChargeId: result.advancedMDChargeId,
          action: 'CHARGE_AMD_SYNC',
        });
        return { success: true, advancedMDChargeId: result.advancedMDChargeId };
      } else {
        logger.warn('AdvancedMD sync failed for charge', {
          chargeId,
          error: result.error,
        });
        return { success: false, error: result.error };
      }
    } catch (syncError) {
      const errorMessage = syncError instanceof Error ? syncError.message : 'Unknown error';
      logger.error('AdvancedMD sync error:', {
        chargeId,
        error: errorMessage,
      });
      return { success: false, error: 'Sync failed - charge saved locally' };
    }
  }

  /**
   * Get all charges with filtering and pagination
   */
  async getAllCharges(filters: ChargeFilters): Promise<ChargeListResult> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ChargeEntryWhereInput = {};

    if (filters.clientId) {
      where.clientId = filters.clientId;
    }
    if (filters.status) {
      where.chargeStatus = filters.status;
    }
    if (filters.startDate || filters.endDate) {
      where.serviceDate = {};
      if (filters.startDate) {
        where.serviceDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.serviceDate.lte = new Date(filters.endDate);
      }
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
        take: limit,
      }),
      prisma.chargeEntry.count({ where }),
    ]);

    return {
      charges,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single charge by ID
   */
  async getChargeById(id: string): Promise<ChargeEntry & { client: any }> {
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
      throw new NotFoundError('Charge');
    }

    return charge;
  }

  /**
   * Create a new charge
   */
  async createCharge(data: CreateChargeInput, userId: string): Promise<CreateChargeResult> {
    // Validate input
    const validatedData = createChargeSchema.parse(data);

    // Parse service date
    const serviceDate = this.parseServiceDate(validatedData.serviceDate);

    // Build diagnosis codes
    const diagnosisCodes = this.buildDiagnosisCodes(
      validatedData.diagnosisCodesJson,
      validatedData.diagnosis
    );

    // Build charge data
    const chargeData = this.buildChargeCreateData(
      validatedData,
      serviceDate,
      diagnosisCodes,
      userId
    );

    // Create charge
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
      amdSyncResult = await this.syncToAdvancedMD(charge.id, userId);
    }

    // Invalidate revenue report cache
    await cache.invalidateCategory(cache.CacheCategory.REVENUE);

    // Build response message
    let message = 'Charge created successfully';
    if (validatedData.syncToAdvancedMD) {
      message = amdSyncResult?.success
        ? 'Charge created and synced to AdvancedMD'
        : 'Charge created (AMD sync failed)';
    }

    return { charge, amdSync: amdSyncResult, message };
  }

  /**
   * Update a charge
   */
  async updateCharge(
    id: string,
    data: UpdateChargeInput,
    userId: string
  ): Promise<ChargeEntry> {
    // Check if charge exists
    const existingCharge = await prisma.chargeEntry.findUnique({
      where: { id },
    });

    if (!existingCharge) {
      throw new NotFoundError('Charge');
    }

    // Validate input
    const validatedData = updateChargeSchema.parse(data);

    // Build update data
    const updateData: Prisma.ChargeEntryUpdateInput = { ...validatedData };

    // Handle service date conversion
    if (validatedData.serviceDate) {
      updateData.serviceDate = this.parseServiceDate(validatedData.serviceDate);
    }

    // Update charge
    const charge = await prisma.chargeEntry.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
      },
    });

    auditLogger.info('Charge updated', {
      userId,
      chargeId: id,
      action: 'CHARGE_UPDATED',
    });

    // Invalidate revenue report cache
    await cache.invalidateCategory(cache.CacheCategory.REVENUE);

    return charge;
  }

  /**
   * Delete a charge
   */
  async deleteCharge(id: string, userId: string): Promise<void> {
    const existingCharge = await prisma.chargeEntry.findUnique({
      where: { id },
    });

    if (!existingCharge) {
      throw new NotFoundError('Charge');
    }

    await prisma.chargeEntry.delete({
      where: { id },
    });

    auditLogger.info('Charge deleted', {
      userId,
      chargeId: id,
      action: 'CHARGE_DELETED',
    });
  }

  // ==========================================================================
  // PAYMENT OPERATIONS
  // ==========================================================================

  /**
   * Calculate unapplied amount for a payment
   */
  private calculateUnappliedAmount(
    paymentAmount: number,
    appliedPayments: any[]
  ): number {
    const totalApplied = appliedPayments.reduce(
      (sum: number, ap: any) => sum + (ap.amount || 0),
      0
    );
    return paymentAmount - totalApplied;
  }

  /**
   * Apply payment to related charges
   */
  private async applyPaymentToCharges(appliedPayments: any[]): Promise<void> {
    if (!appliedPayments || appliedPayments.length === 0) {
      return;
    }

    for (const ap of appliedPayments) {
      if (ap.chargeId) {
        const charge = await prisma.chargeEntry.findUnique({
          where: { id: ap.chargeId },
        });

        if (charge) {
          const newPaymentAmount = (Number(charge.paymentAmount) || 0) + (ap.amount || 0);
          const chargeAmount = Number(charge.chargeAmount);

          await prisma.chargeEntry.update({
            where: { id: ap.chargeId },
            data: {
              paymentAmount: newPaymentAmount,
              chargeStatus: newPaymentAmount >= chargeAmount ? 'Paid' : 'Partial Payment',
            },
          });
        }
      }
    }
  }

  /**
   * Get all payments with filtering and pagination
   */
  async getAllPayments(filters: PaymentFilters): Promise<PaymentListResult> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentRecordWhereInput = {};

    if (filters.clientId) {
      where.clientId = filters.clientId;
    }
    if (filters.paymentSource) {
      where.paymentSource = filters.paymentSource;
    }
    if (filters.startDate || filters.endDate) {
      where.paymentDate = {};
      if (filters.startDate) {
        where.paymentDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.paymentDate.lte = new Date(filters.endDate);
      }
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
        take: limit,
      }),
      prisma.paymentRecord.count({ where }),
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single payment by ID
   */
  async getPaymentById(id: string): Promise<PaymentRecord & { client: any }> {
    const payment = await prisma.paymentRecord.findUnique({
      where: { id },
      include: {
        client: true,
      },
    });

    if (!payment) {
      throw new NotFoundError('Payment');
    }

    return payment;
  }

  /**
   * Create a new payment
   */
  async createPayment(data: CreatePaymentInput, userId: string): Promise<PaymentRecord> {
    // Validate input
    const validatedData = createPaymentSchema.parse(data);

    // Calculate unapplied amount
    const appliedPayments = validatedData.appliedPaymentsJson as any[];
    const unappliedAmount = this.calculateUnappliedAmount(
      validatedData.paymentAmount,
      appliedPayments
    );

    // Build payment data
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

    // Create payment
    const payment = await prisma.paymentRecord.create({
      data: paymentData,
      include: {
        client: true,
      },
    });

    // Apply payment to charges
    await this.applyPaymentToCharges(appliedPayments);

    auditLogger.info('Payment created', {
      userId,
      paymentId: payment.id,
      clientId: payment.clientId,
      amount: payment.paymentAmount,
      action: 'PAYMENT_CREATED',
    });

    return payment;
  }

  /**
   * Update a payment
   */
  async updatePayment(
    id: string,
    data: UpdatePaymentInput,
    userId: string
  ): Promise<PaymentRecord> {
    // Check if payment exists
    const existingPayment = await prisma.paymentRecord.findUnique({
      where: { id },
    });

    if (!existingPayment) {
      throw new NotFoundError('Payment');
    }

    // Validate input
    const validatedData = updatePaymentSchema.parse(data);

    // Build update data
    const updateData: Prisma.PaymentRecordUpdateInput = { ...validatedData };

    // Handle date conversions
    if (validatedData.paymentDate) {
      updateData.paymentDate = new Date(validatedData.paymentDate);
    }
    if (validatedData.eobDate) {
      updateData.eobDate = new Date(validatedData.eobDate);
    }

    // Update payment
    const payment = await prisma.paymentRecord.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
      },
    });

    auditLogger.info('Payment updated', {
      userId,
      paymentId: id,
      action: 'PAYMENT_UPDATED',
    });

    return payment;
  }

  /**
   * Delete a payment
   */
  async deletePayment(id: string, userId: string): Promise<void> {
    const existingPayment = await prisma.paymentRecord.findUnique({
      where: { id },
    });

    if (!existingPayment) {
      throw new NotFoundError('Payment');
    }

    await prisma.paymentRecord.delete({
      where: { id },
    });

    auditLogger.info('Payment deleted', {
      userId,
      paymentId: id,
      action: 'PAYMENT_DELETED',
    });
  }

  // ==========================================================================
  // REPORTS
  // ==========================================================================

  /**
   * Calculate days since service date
   */
  private calculateDaysSinceService(serviceDate: Date): number {
    const now = new Date();
    return Math.floor(
      (now.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  /**
   * Get aging report with buckets for outstanding charges
   */
  async getAgingReport(): Promise<AgingReport> {
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

    const aging: AgingReport = {
      current: [],
      days30: [],
      days60: [],
      days90: [],
      days120Plus: [],
      totals: {
        current: 0,
        days30: 0,
        days60: 0,
        days90: 0,
        days120Plus: 0,
        total: 0,
      },
    };

    charges.forEach((charge) => {
      const daysDiff = this.calculateDaysSinceService(charge.serviceDate);
      const chargeAmountNum = Number(charge.chargeAmount);
      const paymentAmountNum = Number(charge.paymentAmount || 0);
      const balance = chargeAmountNum - paymentAmountNum;

      const item = {
        ...charge,
        balance,
        daysSinceService: daysDiff,
      };

      if (daysDiff < 30) {
        aging.current.push(item);
      } else if (daysDiff < 60) {
        aging.days30.push(item);
      } else if (daysDiff < 90) {
        aging.days60.push(item);
      } else if (daysDiff < 120) {
        aging.days90.push(item);
      } else {
        aging.days120Plus.push(item);
      }
    });

    // Calculate totals
    aging.totals.current = aging.current.reduce((sum, c) => sum + Number(c.balance), 0);
    aging.totals.days30 = aging.days30.reduce((sum, c) => sum + Number(c.balance), 0);
    aging.totals.days60 = aging.days60.reduce((sum, c) => sum + Number(c.balance), 0);
    aging.totals.days90 = aging.days90.reduce((sum, c) => sum + Number(c.balance), 0);
    aging.totals.days120Plus = aging.days120Plus.reduce((sum, c) => sum + Number(c.balance), 0);
    aging.totals.total =
      aging.totals.current +
      aging.totals.days30 +
      aging.totals.days60 +
      aging.totals.days90 +
      aging.totals.days120Plus;

    return aging;
  }

  /**
   * Get revenue report with metrics
   */
  async getRevenueReport(
    startDate?: string,
    endDate?: string,
    groupBy: string = 'month'
  ): Promise<RevenueReport> {
    const where: Prisma.ChargeEntryWhereInput = {};

    if (startDate || endDate) {
      where.serviceDate = {};
      if (startDate) {
        where.serviceDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.serviceDate.lte = new Date(endDate);
      }
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
    const chargesByStatus = charges.reduce((acc: { status: string; count: number; totalAmount: number }[], charge) => {
      const existingStatus = acc.find((s) => s.status === charge.chargeStatus);
      if (existingStatus) {
        existingStatus.count++;
        existingStatus.totalAmount += Number(charge.chargeAmount);
      } else {
        acc.push({
          status: charge.chargeStatus || 'Unknown',
          count: 1,
          totalAmount: Number(charge.chargeAmount),
        });
      }
      return acc;
    }, []);

    return {
      totalRevenue: totalCharges,
      totalCollected: totalPayments,
      totalOutstanding: totalCharges - totalPayments,
      collectionRate,
      averageChargeAmount: charges.length > 0 ? totalCharges / charges.length : 0,
      averagePaymentAmount: charges.length > 0 ? totalPayments / charges.length : 0,
      chargesByStatus,
      revenueByMonth: [], // Can be implemented if needed
    };
  }
}

// Export singleton instance
export const billingService = new BillingService();
export default billingService;
