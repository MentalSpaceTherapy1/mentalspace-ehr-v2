/**
 * AdvancedMD ERA (Electronic Remittance Advice) Workaround Service
 *
 * NOTE: AdvancedMD ERA processing is UI-only and not available via API.
 * This service provides workarounds:
 *
 * 1. Manual Payment Import - Import payments from CSV/835 files
 * 2. Payment Matching - Auto-match payments to claims
 * 3. Payment Posting - Post payments to local system and sync to AMD
 * 4. Reconciliation - Reconcile payments with AMD records
 *
 * For full ERA integration, use:
 * - AdvancedMD UI for ERA processing
 * - ODBC export for payment data (if available)
 * - Manual data entry through this service
 *
 * @module services/advancedmd/era.service
 */

import { PrismaClient } from '@prisma/client';
import { advancedMDAPI } from '../../integrations/advancedmd/api-client';

const prisma = new PrismaClient();

// TODO: PendingPayment model needs to be added to the Prisma schema
// For now, we cast to any to suppress TypeScript errors
const pendingPaymentModel = prisma as any;

/**
 * Payment import record
 */
export interface PaymentImportRecord {
  checkNumber?: string;
  eftNumber?: string;
  paymentDate: string;
  paymentAmount: number;
  payerName: string;
  payerId?: string;
  patientAccountNumber?: string;
  patientName?: string;
  claimNumber?: string;
  serviceDate?: string;
  cptCode?: string;
  billedAmount?: number;
  allowedAmount?: number;
  paidAmount: number;
  adjustmentAmount?: number;
  adjustmentReasonCode?: string;
  patientResponsibility?: number;
  remarkCode?: string;
}

/**
 * Payment import result
 */
export interface PaymentImportResult {
  success: boolean;
  totalRecords: number;
  importedCount: number;
  matchedCount: number;
  unmatchedCount: number;
  errorCount: number;
  errors: string[];
  importedPayments: ImportedPayment[];
  unmatchedPayments: PaymentImportRecord[];
}

/**
 * Imported payment
 */
export interface ImportedPayment {
  id: string;
  paymentRecordId?: string;
  chargeId?: string;
  claimId?: string;
  matchConfidence: number;
  status: 'matched' | 'unmatched' | 'manual_review';
}

/**
 * Payment posting result
 */
export interface PaymentPostingResult {
  success: boolean;
  paymentId: string;
  chargeId?: string;
  claimId?: string;
  postedAmount: number;
  adjustmentAmount?: number;
  error?: string;
}

/**
 * Reconciliation result
 */
export interface ReconciliationResult {
  success: boolean;
  totalPayments: number;
  reconciledCount: number;
  discrepancyCount: number;
  discrepancies: PaymentDiscrepancy[];
}

/**
 * Payment discrepancy
 */
export interface PaymentDiscrepancy {
  paymentId: string;
  localAmount: number;
  amdAmount?: number;
  difference: number;
  reason: string;
}

/**
 * AdvancedMD ERA Workaround Service
 */
export class AdvancedMDERAService {
  private static instance: AdvancedMDERAService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): AdvancedMDERAService {
    if (!AdvancedMDERAService.instance) {
      AdvancedMDERAService.instance = new AdvancedMDERAService();
    }
    return AdvancedMDERAService.instance;
  }

  // ========================================================================
  // PAYMENT IMPORT
  // ========================================================================

  /**
   * Import payments from CSV data
   *
   * @param records - Array of payment records to import
   * @param autoMatch - Automatically match to claims
   * @param autoPost - Automatically post matched payments
   * @returns Import result
   */
  async importPayments(
    records: PaymentImportRecord[],
    autoMatch: boolean = true,
    autoPost: boolean = false
  ): Promise<PaymentImportResult> {
    const result: PaymentImportResult = {
      success: true,
      totalRecords: records.length,
      importedCount: 0,
      matchedCount: 0,
      unmatchedCount: 0,
      errorCount: 0,
      errors: [],
      importedPayments: [],
      unmatchedPayments: [],
    };

    for (const record of records) {
      try {
        // Validate record
        const validation = this.validatePaymentRecord(record);
        if (!validation.valid) {
          result.errors.push(`Record validation failed: ${validation.error}`);
          result.errorCount++;
          continue;
        }

        // Try to match to a claim/charge
        let matchResult = null;
        if (autoMatch) {
          matchResult = await this.findMatchingCharge(record);
        }

        // Create pending payment record
        const pendingPayment = await pendingPaymentModel.pendingPayment.create({
          data: {
            paymentSource: 'ERA_IMPORT',
            checkNumber: record.checkNumber,
            eftNumber: record.eftNumber,
            paymentDate: new Date(record.paymentDate),
            paymentAmount: record.paymentAmount,
            paidAmount: record.paidAmount,
            adjustmentAmount: record.adjustmentAmount || 0,
            patientResponsibility: record.patientResponsibility || 0,
            payerName: record.payerName,
            payerId: record.payerId,
            patientAccountNumber: record.patientAccountNumber,
            claimNumber: record.claimNumber,
            serviceDate: record.serviceDate ? new Date(record.serviceDate) : null,
            cptCode: record.cptCode,
            billedAmount: record.billedAmount,
            allowedAmount: record.allowedAmount,
            adjustmentReasonCode: record.adjustmentReasonCode,
            remarkCode: record.remarkCode,
            matchedChargeId: matchResult?.chargeId,
            matchedClaimId: matchResult?.claimId,
            matchConfidence: matchResult?.confidence || 0,
            status: matchResult ? 'matched' : 'unmatched',
          },
        });

        const importedPayment: ImportedPayment = {
          id: pendingPayment.id,
          chargeId: matchResult?.chargeId,
          claimId: matchResult?.claimId,
          matchConfidence: matchResult?.confidence || 0,
          status: matchResult
            ? matchResult.confidence >= 90
              ? 'matched'
              : 'manual_review'
            : 'unmatched',
        };

        result.importedPayments.push(importedPayment);
        result.importedCount++;

        if (matchResult) {
          result.matchedCount++;

          // Auto-post if confidence is high enough
          if (autoPost && matchResult.confidence >= 95) {
            await this.postPayment(pendingPayment.id);
          }
        } else {
          result.unmatchedCount++;
          result.unmatchedPayments.push(record);
        }
      } catch (error: any) {
        result.errors.push(`Error processing record: ${error.message}`);
        result.errorCount++;
      }
    }

    return result;
  }

  /**
   * Parse 835 (ERA) file content
   * Note: This is a simplified parser. Real 835 files are complex.
   *
   * @param content - 835 file content
   * @returns Array of payment records
   */
  parse835File(content: string): PaymentImportRecord[] {
    const records: PaymentImportRecord[] = [];

    // Split into segments
    const segments = content.split('~');

    let currentPayment: Partial<PaymentImportRecord> = {};

    for (const segment of segments) {
      const elements = segment.split('*');
      const segmentId = elements[0]?.trim();

      switch (segmentId) {
        case 'BPR': // Financial Information
          currentPayment.paymentAmount = parseFloat(elements[2] || '0');
          currentPayment.paymentDate = this.parseEDIDate(elements[16] || '');
          break;

        case 'TRN': // Trace Number
          currentPayment.checkNumber = elements[2];
          break;

        case 'N1': // Payer/Payee Name
          if (elements[1] === 'PR') {
            currentPayment.payerName = elements[2];
          }
          break;

        case 'CLP': // Claim Payment Information
          if (Object.keys(currentPayment).length > 0) {
            // Save previous claim and start new one
            if (currentPayment.paidAmount) {
              records.push(currentPayment as PaymentImportRecord);
            }
          }
          currentPayment = {
            ...currentPayment,
            claimNumber: elements[1],
            billedAmount: parseFloat(elements[3] || '0'),
            paidAmount: parseFloat(elements[4] || '0'),
            patientResponsibility: parseFloat(elements[5] || '0'),
          };
          break;

        case 'SVC': // Service Line
          currentPayment.cptCode = elements[1]?.split(':')[1];
          break;

        case 'CAS': // Claim Adjustment
          const adjustmentCode = elements[1];
          const adjustmentAmount = parseFloat(elements[3] || '0');
          currentPayment.adjustmentAmount = (currentPayment.adjustmentAmount || 0) + adjustmentAmount;
          currentPayment.adjustmentReasonCode = adjustmentCode;
          break;

        case 'DTM': // Date
          if (elements[1] === '232') {
            currentPayment.serviceDate = this.parseEDIDate(elements[2] || '');
          }
          break;
      }
    }

    // Add last payment
    if (currentPayment.paidAmount) {
      records.push(currentPayment as PaymentImportRecord);
    }

    return records;
  }

  /**
   * Parse CSV payment file
   *
   * @param csvContent - CSV content
   * @param mapping - Column mapping
   * @returns Array of payment records
   */
  parseCSVPayments(
    csvContent: string,
    mapping: Record<string, string>
  ): PaymentImportRecord[] {
    const records: PaymentImportRecord[] = [];
    const lines = csvContent.split('\n');

    if (lines.length < 2) return records;

    const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''));
      if (values.length !== headers.length) continue;

      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      const record: PaymentImportRecord = {
        checkNumber: row[mapping.checkNumber],
        eftNumber: row[mapping.eftNumber],
        paymentDate: row[mapping.paymentDate],
        paymentAmount: parseFloat(row[mapping.paymentAmount] || '0'),
        payerName: row[mapping.payerName] || 'Unknown',
        payerId: row[mapping.payerId],
        patientAccountNumber: row[mapping.patientAccountNumber],
        patientName: row[mapping.patientName],
        claimNumber: row[mapping.claimNumber],
        serviceDate: row[mapping.serviceDate],
        cptCode: row[mapping.cptCode],
        billedAmount: parseFloat(row[mapping.billedAmount] || '0'),
        allowedAmount: parseFloat(row[mapping.allowedAmount] || '0'),
        paidAmount: parseFloat(row[mapping.paidAmount] || '0'),
        adjustmentAmount: parseFloat(row[mapping.adjustmentAmount] || '0'),
        adjustmentReasonCode: row[mapping.adjustmentReasonCode],
        patientResponsibility: parseFloat(row[mapping.patientResponsibility] || '0'),
        remarkCode: row[mapping.remarkCode],
      };

      if (record.paidAmount > 0 || record.adjustmentAmount) {
        records.push(record);
      }
    }

    return records;
  }

  // ========================================================================
  // PAYMENT MATCHING
  // ========================================================================

  /**
   * Find matching charge for a payment record
   */
  private async findMatchingCharge(
    record: PaymentImportRecord
  ): Promise<{ chargeId?: string; claimId?: string; confidence: number } | null> {
    let bestMatch = null;
    let bestConfidence = 0;

    // Try to match by claim number first
    if (record.claimNumber) {
      const claim = await prisma.claim.findFirst({
        where: { claimNumber: record.claimNumber },
        include: { charges: true },
      });

      if (claim) {
        bestMatch = {
          claimId: claim.id,
          chargeId: claim.charges[0]?.id,
          confidence: 95,
        };
        return bestMatch;
      }
    }

    // Try to match by patient account number and service date
    if (record.patientAccountNumber && record.serviceDate) {
      const charges = await prisma.chargeEntry.findMany({
        where: {
          client: {
            advancedMDPatientId: record.patientAccountNumber,
          },
          serviceDate: new Date(record.serviceDate),
          ...(record.cptCode && { cptCode: record.cptCode }),
        },
        // Note: claimId is available directly, no need to include relation
      });

      if (charges.length === 1) {
        return {
          chargeId: charges[0].id,
          claimId: charges[0].claimId || undefined,
          confidence: record.cptCode ? 90 : 80,
        };
      } else if (charges.length > 1) {
        // Multiple matches - try to narrow down by amount
        const amountMatch = charges.find(
          (c) => Math.abs(Number(c.chargeAmount) - (record.billedAmount || 0)) < 0.01
        );
        if (amountMatch) {
          return {
            chargeId: amountMatch.id,
            claimId: amountMatch.claimId || undefined,
            confidence: 75,
          };
        }
      }
    }

    // Try to match by patient name and service date
    if (record.patientName && record.serviceDate) {
      const nameParts = record.patientName.split(/[\s,]+/);
      const charges = await prisma.chargeEntry.findMany({
        where: {
          client: {
            OR: [
              { lastName: { contains: nameParts[0], mode: 'insensitive' } },
              { firstName: { contains: nameParts[0], mode: 'insensitive' } },
            ],
          },
          serviceDate: new Date(record.serviceDate),
        },
        include: { client: true },
      });

      if (charges.length === 1) {
        return {
          chargeId: charges[0].id,
          claimId: charges[0].claimId || undefined,
          confidence: 70,
        };
      }
    }

    return null;
  }

  // ========================================================================
  // PAYMENT POSTING
  // ========================================================================

  /**
   * Post a pending payment to the system
   *
   * @param pendingPaymentId - Pending payment ID
   * @returns Posting result
   */
  async postPayment(pendingPaymentId: string): Promise<PaymentPostingResult> {
    try {
      const pendingPayment = await pendingPaymentModel.pendingPayment.findUnique({
        where: { id: pendingPaymentId },
      });

      if (!pendingPayment) {
        return {
          success: false,
          paymentId: pendingPaymentId,
          postedAmount: 0,
          error: 'Pending payment not found',
        };
      }

      if (pendingPayment.status === 'posted') {
        return {
          success: false,
          paymentId: pendingPaymentId,
          postedAmount: 0,
          error: 'Payment already posted',
        };
      }

      // Get related charge/claim
      const chargeId = pendingPayment.matchedChargeId;
      const claimId = pendingPayment.matchedClaimId;

      if (!chargeId) {
        return {
          success: false,
          paymentId: pendingPaymentId,
          postedAmount: 0,
          error: 'No matched charge to post payment to',
        };
      }

      // Get charge and client info
      const charge = await prisma.chargeEntry.findUnique({
        where: { id: chargeId },
        include: { client: true },
      });

      if (!charge) {
        return {
          success: false,
          paymentId: pendingPaymentId,
          chargeId,
          postedAmount: 0,
          error: 'Matched charge not found',
        };
      }

      // Create payment record
      const paymentRecord = await prisma.paymentRecord.create({
        data: {
          clientId: charge.clientId,
          paymentDate: pendingPayment.paymentDate,
          paymentAmount: pendingPayment.paidAmount,
          paymentSource: pendingPayment.payerName || 'Insurance',
          paymentMethod: pendingPayment.eftNumber ? 'EFT' : 'Check',
          checkNumber: pendingPayment.checkNumber,
          transactionId: pendingPayment.eftNumber,
          claimNumber: pendingPayment.claimNumber,
          appliedPaymentsJson: [
            {
              chargeId,
              amount: pendingPayment.paidAmount,
              adjustmentAmount: pendingPayment.adjustmentAmount,
              adjustmentCode: pendingPayment.adjustmentReasonCode,
            },
          ],
          adjustmentsJson: pendingPayment.adjustmentAmount
            ? [
                {
                  code: pendingPayment.adjustmentReasonCode,
                  amount: pendingPayment.adjustmentAmount,
                },
              ]
            : undefined,
          postedBy: 'SYSTEM_ERA_IMPORT',
        },
      });

      // Update charge with payment
      const newPaymentAmount = Number(charge.paymentAmount || 0) + pendingPayment.paidAmount;
      const newAdjustmentAmount = Number(charge.adjustmentAmount || 0) + (pendingPayment.adjustmentAmount || 0);
      const chargeAmount = Number(charge.chargeAmount);
      const balance = chargeAmount - newPaymentAmount - newAdjustmentAmount;

      await prisma.chargeEntry.update({
        where: { id: chargeId },
        data: {
          paymentAmount: newPaymentAmount,
          adjustmentAmount: newAdjustmentAmount,
          chargeStatus: balance <= 0.01 ? 'Paid' : 'Partial Payment',
        },
      });

      // Update claim if exists
      if (claimId) {
        const claim = await prisma.claim.findUnique({ where: { id: claimId } });
        if (claim) {
          const newPaidAmount = Number(claim.totalPaidAmount || 0) + pendingPayment.paidAmount;
          await prisma.claim.update({
            where: { id: claimId },
            data: {
              totalPaidAmount: newPaidAmount,
              totalAdjustmentAmount: Number(claim.totalAdjustmentAmount || 0) + (pendingPayment.adjustmentAmount || 0),
              claimStatus: newPaidAmount >= Number(claim.totalChargeAmount) ? 'paid' : 'partial_paid',
            },
          });
        }
      }

      // Mark pending payment as posted
      await pendingPaymentModel.pendingPayment.update({
        where: { id: pendingPaymentId },
        data: {
          status: 'posted',
          postedPaymentId: paymentRecord.id,
          postedAt: new Date(),
        },
      });

      return {
        success: true,
        paymentId: paymentRecord.id,
        chargeId,
        claimId: claimId || undefined,
        postedAmount: pendingPayment.paidAmount,
        adjustmentAmount: pendingPayment.adjustmentAmount || undefined,
      };
    } catch (error: any) {
      console.error('[ERA Service] Error posting payment:', error.message);
      return {
        success: false,
        paymentId: pendingPaymentId,
        postedAmount: 0,
        error: error.message,
      };
    }
  }

  /**
   * Post multiple payments in batch
   */
  async postPaymentsBatch(pendingPaymentIds: string[]): Promise<PaymentPostingResult[]> {
    const results: PaymentPostingResult[] = [];

    for (const id of pendingPaymentIds) {
      const result = await this.postPayment(id);
      results.push(result);
    }

    return results;
  }

  /**
   * Post all matched pending payments
   */
  async postAllMatchedPayments(): Promise<PaymentPostingResult[]> {
    const matchedPayments = await pendingPaymentModel.pendingPayment.findMany({
      where: {
        status: 'matched',
        matchedChargeId: { not: null },
        matchConfidence: { gte: 90 },
      },
      select: { id: true },
    });

    return this.postPaymentsBatch(matchedPayments.map((p: { id: string }) => p.id));
  }

  // ========================================================================
  // RECONCILIATION
  // ========================================================================

  /**
   * Reconcile local payments with AdvancedMD
   */
  async reconcilePayments(startDate: Date, endDate: Date): Promise<ReconciliationResult> {
    const result: ReconciliationResult = {
      success: true,
      totalPayments: 0,
      reconciledCount: 0,
      discrepancyCount: 0,
      discrepancies: [],
    };

    try {
      // Get local payments
      const localPayments = await prisma.paymentRecord.findMany({
        where: {
          paymentDate: { gte: startDate, lte: endDate },
        },
      });

      result.totalPayments = localPayments.length;

      // Get payment history from AdvancedMD
      const requestData = {
        '@startdate': this.formatDate(startDate),
        '@enddate': this.formatDate(endDate),
      };

      const response = await advancedMDAPI.makeRequest('GETPAYMENTDETAILDATA', requestData);

      if (!response.success) {
        return {
          ...result,
          success: false,
        };
      }

      // Parse AMD payments
      const amdPayments = this.parseAMDPaymentResponse(response.data);

      // Compare local and AMD payments
      for (const localPayment of localPayments) {
        const amdMatch = amdPayments.find(
          (ap: any) =>
            ap.checkNumber === localPayment.checkNumber ||
            ap.transactionId === localPayment.transactionId
        );

        if (amdMatch) {
          const localAmount = Number(localPayment.paymentAmount);
          const amdAmount = Number(amdMatch.amount);
          const difference = Math.abs(localAmount - amdAmount);

          if (difference < 0.01) {
            result.reconciledCount++;
          } else {
            result.discrepancyCount++;
            result.discrepancies.push({
              paymentId: localPayment.id,
              localAmount,
              amdAmount,
              difference,
              reason: 'Amount mismatch',
            });
          }
        } else {
          result.discrepancyCount++;
          result.discrepancies.push({
            paymentId: localPayment.id,
            localAmount: Number(localPayment.paymentAmount),
            difference: Number(localPayment.paymentAmount),
            reason: 'Not found in AdvancedMD',
          });
        }
      }

      return result;
    } catch (error: any) {
      console.error('[ERA Service] Error reconciling payments:', error.message);
      return {
        ...result,
        success: false,
      };
    }
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  /**
   * Validate payment record
   */
  private validatePaymentRecord(record: PaymentImportRecord): { valid: boolean; error?: string } {
    if (!record.paymentDate) {
      return { valid: false, error: 'Missing payment date' };
    }

    if (record.paidAmount === undefined || record.paidAmount === null) {
      return { valid: false, error: 'Missing paid amount' };
    }

    if (!record.payerName) {
      return { valid: false, error: 'Missing payer name' };
    }

    return { valid: true };
  }

  /**
   * Parse EDI date format (YYYYMMDD)
   */
  private parseEDIDate(dateStr: string): string {
    if (dateStr.length !== 8) return dateStr;

    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);

    return `${month}/${day}/${year}`;
  }

  /**
   * Format date to MM/DD/YYYY
   */
  private formatDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }

  /**
   * Parse AMD payment response
   */
  private parseAMDPaymentResponse(data: any): any[] {
    if (!data) return [];

    const payments = data?.ppmdmsg?.payments?.payment || data?.payments || [];
    return Array.isArray(payments) ? payments : [payments];
  }

  /**
   * Get pending payments
   */
  async getPendingPayments(
    status?: 'matched' | 'unmatched' | 'manual_review' | 'posted'
  ): Promise<any[]> {
    return pendingPaymentModel.pendingPayment.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get pending payment by ID
   */
  async getPendingPaymentById(id: string): Promise<any | null> {
    return pendingPaymentModel.pendingPayment.findUnique({
      where: { id },
    });
  }

  /**
   * Update pending payment match
   */
  async updatePendingPaymentMatch(
    pendingPaymentId: string,
    chargeId: string,
    claimId?: string
  ): Promise<any> {
    return pendingPaymentModel.pendingPayment.update({
      where: { id: pendingPaymentId },
      data: {
        matchedChargeId: chargeId,
        matchedClaimId: claimId,
        matchConfidence: 100, // Manual match
        status: 'matched',
      },
    });
  }

  /**
   * Get ERA import statistics
   */
  async getImportStatistics(): Promise<any> {
    const [total, matched, unmatched, posted, manualReview] = await Promise.all([
      pendingPaymentModel.pendingPayment.count(),
      pendingPaymentModel.pendingPayment.count({ where: { status: 'matched' } }),
      pendingPaymentModel.pendingPayment.count({ where: { status: 'unmatched' } }),
      pendingPaymentModel.pendingPayment.count({ where: { status: 'posted' } }),
      pendingPaymentModel.pendingPayment.count({ where: { status: 'manual_review' } }),
    ]);

    return {
      total,
      matched,
      unmatched,
      posted,
      manualReview,
      pendingPost: matched,
    };
  }
}

// Export singleton instance
export const advancedMDERA = AdvancedMDERAService.getInstance();
