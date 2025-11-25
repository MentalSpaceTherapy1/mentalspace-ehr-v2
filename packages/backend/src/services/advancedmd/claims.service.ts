/**
 * AdvancedMD Claims Management Service
 *
 * Manages insurance claim lifecycle through AdvancedMD:
 * - Claim creation and submission
 * - Claim status tracking
 * - Claim resubmission for rejections
 * - Claim history and audit trail
 *
 * Note: AdvancedMD uses Waystar as clearinghouse. Claims are submitted
 * to AdvancedMD, which then forwards them to Waystar for processing.
 *
 * @module services/advancedmd/claims.service
 */

import { PrismaClient } from '@prisma/client';
import { advancedMDAPI } from '../../integrations/advancedmd/api-client';
import {
  ClaimData,
  ClaimStatus,
  ClaimStatusDetail,
  CheckClaimStatusRequest,
} from '../../../../shared/src/types/advancedmd.types';

const prisma = new PrismaClient();

/**
 * Claim submission result
 */
export interface ClaimSubmissionResult {
  success: boolean;
  claimId?: string;
  claimNumber?: string;
  advancedMDClaimId?: string;
  error?: string;
  validationErrors?: string[];
  submittedAt?: Date;
}

/**
 * Claim status result
 */
export interface ClaimStatusResult {
  success: boolean;
  claimId: string;
  status?: ClaimStatus;
  statusDate?: Date;
  clearinghouseStatus?: string;
  payerStatus?: string;
  rejectionReason?: string;
  rejectionCode?: string;
  totalBilled?: number;
  totalPaid?: number;
  totalAdjustment?: number;
  patientResponsibility?: number;
  error?: string;
}

/**
 * Batch claim status result
 */
export interface BatchClaimStatusResult {
  totalChecked: number;
  successCount: number;
  failureCount: number;
  results: ClaimStatusResult[];
}

/**
 * Claim creation options
 */
export interface CreateClaimOptions {
  chargeIds: string[];
  includeSecondaryInsurance?: boolean;
  autoSubmit?: boolean;
  notes?: string;
}

/**
 * AdvancedMD Claims Service
 */
export class AdvancedMDClaimsService {
  private static instance: AdvancedMDClaimsService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): AdvancedMDClaimsService {
    if (!AdvancedMDClaimsService.instance) {
      AdvancedMDClaimsService.instance = new AdvancedMDClaimsService();
    }
    return AdvancedMDClaimsService.instance;
  }

  // ========================================================================
  // CLAIM CREATION
  // ========================================================================

  /**
   * Create a claim from charges
   *
   * @param options - Claim creation options
   * @returns Claim submission result
   */
  async createClaim(options: CreateClaimOptions): Promise<ClaimSubmissionResult> {
    const { chargeIds, includeSecondaryInsurance = false, autoSubmit = false, notes } = options;

    try {
      if (!chargeIds || chargeIds.length === 0) {
        return {
          success: false,
          error: 'No charge IDs provided',
        };
      }

      // Get charges with related data
      const charges = await prisma.chargeEntry.findMany({
        where: { id: { in: chargeIds } },
        include: {
          client: {
            include: {
              insurances: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
        },
      });

      if (charges.length === 0) {
        return {
          success: false,
          error: 'No charges found',
        };
      }

      // Validate all charges belong to same client
      const clientIds = [...new Set(charges.map((c) => c.clientId))];
      if (clientIds.length > 1) {
        return {
          success: false,
          error: 'All charges must belong to the same client',
        };
      }

      const client = charges[0].client;
      const insurance = client.insurances[0];

      if (!insurance) {
        return {
          success: false,
          error: 'Client has no primary insurance',
        };
      }

      // Check if client is synced to AdvancedMD
      if (!client.advancedMDPatientId) {
        return {
          success: false,
          error: 'Client not synced to AdvancedMD. Sync patient first.',
        };
      }

      // Validate charges have required data
      const validationErrors = this.validateChargesForClaim(charges);
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: 'Charge validation failed',
          validationErrors,
        };
      }

      // Build claim data
      const claimData = this.buildClaimData(charges, client, insurance);

      // Create local claim record
      const claim = await prisma.claim.create({
        data: {
          clientId: client.id,
          insuranceId: insurance.id,
          claimNumber: this.generateClaimNumber(),
          claimType: 'Professional',
          billingProviderId: charges[0].providerId,
          renderingProviderId: charges[0].providerId,
          serviceStartDate: new Date(Math.min(...charges.map((c) => c.serviceDate.getTime()))),
          serviceEndDate: new Date(Math.max(...charges.map((c) => c.serviceDate.getTime()))),
          totalChargeAmount: charges.reduce((sum, c) => sum + Number(c.chargeAmount), 0),
          diagnoses: this.extractDiagnoses(charges),
          status: 'draft',
          notes,
          charges: {
            connect: charges.map((c) => ({ id: c.id })),
          },
        },
      });

      // If autoSubmit, submit the claim
      if (autoSubmit) {
        const submitResult = await this.submitClaim(claim.id);
        return {
          ...submitResult,
          claimId: claim.id,
          claimNumber: claim.claimNumber,
        };
      }

      return {
        success: true,
        claimId: claim.id,
        claimNumber: claim.claimNumber,
        submittedAt: new Date(),
      };
    } catch (error: any) {
      console.error('[Claims Service] Error creating claim:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Submit a claim to AdvancedMD/Waystar
   *
   * @param claimId - Local claim ID
   * @returns Submission result
   */
  async submitClaim(claimId: string): Promise<ClaimSubmissionResult> {
    try {
      // Get claim with all related data
      const claim = await prisma.claim.findUnique({
        where: { id: claimId },
        include: {
          client: true,
          insurance: true,
          charges: true,
        },
      });

      if (!claim) {
        return {
          success: false,
          claimId,
          error: 'Claim not found',
        };
      }

      if (claim.status !== 'draft' && claim.status !== 'rejected') {
        return {
          success: false,
          claimId,
          error: `Cannot submit claim with status: ${claim.status}`,
        };
      }

      // Verify patient is synced to AdvancedMD
      if (!claim.client.advancedMDPatientId) {
        return {
          success: false,
          claimId,
          error: 'Client not synced to AdvancedMD',
        };
      }

      // Build submission request
      const requestData = this.buildSubmissionRequest(claim);

      // Submit to AdvancedMD
      const response = await advancedMDAPI.makeRequest('SUBMITCLAIM', requestData);

      if (!response.success) {
        const errorMsg = response.error
          ? typeof response.error === 'string'
            ? response.error
            : response.error.message || JSON.stringify(response.error)
          : 'Failed to submit claim';

        // Update claim status to rejected
        await prisma.claim.update({
          where: { id: claimId },
          data: {
            status: 'rejected',
            rejectionReason: errorMsg,
            lastSubmittedAt: new Date(),
          },
        });

        return {
          success: false,
          claimId,
          claimNumber: claim.claimNumber,
          error: errorMsg,
        };
      }

      // Parse response for AMD claim ID
      const advancedMDClaimId = this.extractClaimIdFromResponse(response.data);

      // Update claim status
      await prisma.claim.update({
        where: { id: claimId },
        data: {
          status: 'submitted',
          advancedMDClaimId,
          lastSubmittedAt: new Date(),
          submissionCount: { increment: 1 },
        },
      });

      // Update charges as billed
      await prisma.chargeEntry.updateMany({
        where: { id: { in: claim.charges.map((c) => c.id) } },
        data: {
          chargeStatus: 'Billed',
          claimId: claimId,
        },
      });

      // Log sync
      await prisma.advancedMDSyncLog.create({
        data: {
          syncType: 'claim',
          entityId: claimId,
          entityType: 'Claim',
          syncDirection: 'to_amd',
          syncStatus: 'success',
          syncStarted: new Date(),
          syncCompleted: new Date(),
          advancedMDId: advancedMDClaimId,
          responseData: response.data,
        },
      });

      return {
        success: true,
        claimId,
        claimNumber: claim.claimNumber,
        advancedMDClaimId,
        submittedAt: new Date(),
      };
    } catch (error: any) {
      console.error('[Claims Service] Error submitting claim:', error.message);
      return {
        success: false,
        claimId,
        error: error.message,
      };
    }
  }

  /**
   * Submit multiple claims in batch
   *
   * @param claimIds - Array of claim IDs to submit
   * @returns Array of submission results
   */
  async submitClaimsBatch(claimIds: string[]): Promise<ClaimSubmissionResult[]> {
    const results: ClaimSubmissionResult[] = [];

    // Process sequentially to respect rate limits
    for (const claimId of claimIds) {
      const result = await this.submitClaim(claimId);
      results.push(result);
    }

    return results;
  }

  // ========================================================================
  // CLAIM STATUS
  // ========================================================================

  /**
   * Check claim status from AdvancedMD
   *
   * @param claimId - Local claim ID
   * @returns Claim status result
   */
  async checkClaimStatus(claimId: string): Promise<ClaimStatusResult> {
    try {
      const claim = await prisma.claim.findUnique({
        where: { id: claimId },
      });

      if (!claim) {
        return {
          success: false,
          claimId,
          error: 'Claim not found',
        };
      }

      if (!claim.advancedMDClaimId) {
        return {
          success: false,
          claimId,
          error: 'Claim has not been submitted to AdvancedMD',
        };
      }

      // Query AdvancedMD for status
      const requestData: CheckClaimStatusRequest['ppmdmsg'] = {
        '@action': 'checkclaimstatus',
        '@class': 'api',
        '@msgtime': new Date().toISOString(),
        '@claimid': claim.advancedMDClaimId,
      };

      const response = await advancedMDAPI.makeRequest('CHECKCLAIMSTATUS', requestData);

      if (!response.success) {
        const errorMsg = response.error
          ? typeof response.error === 'string'
            ? response.error
            : response.error.message || JSON.stringify(response.error)
          : 'Failed to check claim status';
        return {
          success: false,
          claimId,
          error: errorMsg,
        };
      }

      // Parse status response
      const statusData = this.parseClaimStatusResponse(response.data);

      // Update local claim with status
      const newStatus = this.mapAMDStatusToLocal(statusData.status);
      await prisma.claim.update({
        where: { id: claimId },
        data: {
          status: newStatus,
          clearinghouseStatus: statusData.clearinghouseStatus,
          payerStatus: statusData.payerStatus,
          rejectionReason: statusData.rejectionReason,
          rejectionCode: statusData.rejectionCode,
          paidAmount: statusData.totalPaid,
          adjustmentAmount: statusData.totalAdjustment,
          patientResponsibility: statusData.patientResponsibility,
          lastStatusCheckAt: new Date(),
        },
      });

      // If claim is paid or denied, update charges
      if (newStatus === 'paid' || newStatus === 'denied') {
        await this.updateChargesFromClaimStatus(claimId, newStatus, statusData);
      }

      return {
        success: true,
        claimId,
        status: newStatus,
        statusDate: statusData.statusDate ? new Date(statusData.statusDate) : undefined,
        clearinghouseStatus: statusData.clearinghouseStatus,
        payerStatus: statusData.payerStatus,
        rejectionReason: statusData.rejectionReason,
        rejectionCode: statusData.rejectionCode,
        totalBilled: this.parseAmount(statusData.totalBilled),
        totalPaid: this.parseAmount(statusData.totalPaid),
        totalAdjustment: this.parseAmount(statusData.totalAdjustment),
        patientResponsibility: this.parseAmount(statusData.patientResponsibility),
      };
    } catch (error: any) {
      console.error('[Claims Service] Error checking claim status:', error.message);
      return {
        success: false,
        claimId,
        error: error.message,
      };
    }
  }

  /**
   * Check status for multiple claims
   *
   * @param claimIds - Array of claim IDs
   * @returns Batch status result
   */
  async checkClaimStatusBatch(claimIds: string[]): Promise<BatchClaimStatusResult> {
    const results: ClaimStatusResult[] = [];

    for (const claimId of claimIds) {
      const result = await this.checkClaimStatus(claimId);
      results.push(result);
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return {
      totalChecked: claimIds.length,
      successCount,
      failureCount,
      results,
    };
  }

  /**
   * Check status for all pending claims
   *
   * @returns Batch status result
   */
  async checkAllPendingClaimsStatus(): Promise<BatchClaimStatusResult> {
    const pendingClaims = await prisma.claim.findMany({
      where: {
        status: {
          in: ['submitted', 'accepted', 'in_process'],
        },
        advancedMDClaimId: { not: null },
      },
      select: { id: true },
    });

    return this.checkClaimStatusBatch(pendingClaims.map((c) => c.id));
  }

  /**
   * Get claims by date range
   *
   * @param startDate - Start date
   * @param endDate - End date
   * @param status - Optional status filter
   * @returns Array of claims
   */
  async getClaimsByDateRange(
    startDate: Date,
    endDate: Date,
    status?: ClaimStatus
  ): Promise<any[]> {
    const where: any = {
      serviceStartDate: { gte: startDate, lte: endDate },
    };

    if (status) {
      where.status = status;
    }

    return prisma.claim.findMany({
      where,
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
        insurance: {
          select: { id: true, insuranceCompany: true, memberId: true },
        },
        charges: {
          select: { id: true, cptCode: true, chargeAmount: true },
        },
      },
      orderBy: { serviceStartDate: 'desc' },
    });
  }

  // ========================================================================
  // CLAIM RESUBMISSION
  // ========================================================================

  /**
   * Resubmit a rejected claim
   *
   * @param claimId - Claim ID to resubmit
   * @param corrections - Optional corrections to apply
   * @returns Submission result
   */
  async resubmitClaim(
    claimId: string,
    corrections?: Partial<ClaimData>
  ): Promise<ClaimSubmissionResult> {
    try {
      const claim = await prisma.claim.findUnique({
        where: { id: claimId },
      });

      if (!claim) {
        return {
          success: false,
          claimId,
          error: 'Claim not found',
        };
      }

      if (claim.status !== 'rejected' && claim.status !== 'denied') {
        return {
          success: false,
          claimId,
          error: `Cannot resubmit claim with status: ${claim.status}`,
        };
      }

      // Apply corrections if provided
      if (corrections) {
        await prisma.claim.update({
          where: { id: claimId },
          data: {
            ...corrections,
            status: 'draft',
          },
        });
      } else {
        await prisma.claim.update({
          where: { id: claimId },
          data: { status: 'draft' },
        });
      }

      // Submit the claim
      return this.submitClaim(claimId);
    } catch (error: any) {
      console.error('[Claims Service] Error resubmitting claim:', error.message);
      return {
        success: false,
        claimId,
        error: error.message,
      };
    }
  }

  // ========================================================================
  // PRIVATE HELPERS
  // ========================================================================

  /**
   * Validate charges for claim creation
   */
  private validateChargesForClaim(charges: any[]): string[] {
    const errors: string[] = [];

    for (const charge of charges) {
      if (!charge.cptCode) {
        errors.push(`Charge ${charge.id}: Missing CPT code`);
      }
      if (!charge.chargeAmount || Number(charge.chargeAmount) <= 0) {
        errors.push(`Charge ${charge.id}: Invalid charge amount`);
      }
      if (!charge.diagnosisCodesJson || charge.diagnosisCodesJson.length === 0) {
        errors.push(`Charge ${charge.id}: Missing diagnosis codes`);
      }
      if (charge.chargeStatus === 'Billed' || charge.chargeStatus === 'Paid') {
        errors.push(`Charge ${charge.id}: Already billed or paid`);
      }
    }

    return errors;
  }

  /**
   * Build claim data from charges
   */
  private buildClaimData(charges: any[], client: any, insurance: any): any {
    const serviceStartDate = new Date(Math.min(...charges.map((c) => c.serviceDate.getTime())));
    const serviceEndDate = new Date(Math.max(...charges.map((c) => c.serviceDate.getTime())));

    return {
      patientId: client.advancedMDPatientId,
      insuranceId: insurance.id,
      claimType: 'Professional',
      serviceStartDate: this.formatDate(serviceStartDate),
      serviceEndDate: this.formatDate(serviceEndDate),
      totalChargeAmount: charges.reduce((sum, c) => sum + Number(c.chargeAmount), 0),
      diagnoses: this.extractDiagnoses(charges),
      charges: charges.map((c) => ({
        serviceDate: this.formatDate(c.serviceDate),
        cptCode: c.cptCode,
        modifiers: c.modifiers || [],
        units: c.units || 1,
        chargeAmount: Number(c.chargeAmount),
        diagnosisPointers: [1], // Point to first diagnosis
      })),
    };
  }

  /**
   * Build claim submission request
   */
  private buildSubmissionRequest(claim: any): any {
    return {
      '@patientid': claim.client.advancedMDPatientId,
      '@claimtype': claim.claimType || 'Professional',
      '@servicestartdate': this.formatDate(claim.serviceStartDate),
      '@serviceenddate': this.formatDate(claim.serviceEndDate),
      '@billingproviderid': claim.billingProviderId,
      '@renderingproviderid': claim.renderingProviderId,
      diagnoses: claim.diagnoses,
      charges: claim.charges.map((c: any) => ({
        '@servicedate': this.formatDate(c.serviceDate),
        '@cptcode': c.cptCode,
        '@modifiers': c.modifiers?.join(',') || '',
        '@units': c.units || 1,
        '@amount': Number(c.chargeAmount).toFixed(2),
      })),
    };
  }

  /**
   * Extract diagnoses from charges
   */
  private extractDiagnoses(charges: any[]): string[] {
    const diagnoses = new Set<string>();

    for (const charge of charges) {
      const diagCodes = charge.diagnosisCodesJson || [];
      for (const diag of diagCodes) {
        if (typeof diag === 'string') {
          diagnoses.add(diag);
        } else if (diag.code) {
          diagnoses.add(diag.code);
        }
      }
    }

    return Array.from(diagnoses);
  }

  /**
   * Extract claim ID from AMD response
   */
  private extractClaimIdFromResponse(data: any): string | undefined {
    if (!data) return undefined;

    // Try various response formats
    if (data.claimId) return data.claimId;
    if (data.ppmdmsg?.claimId) return data.ppmdmsg.claimId;
    if (data.ppmdmsg?.['@claimid']) return data.ppmdmsg['@claimid'];
    if (data.claim?.claimId) return data.claim.claimId;

    return undefined;
  }

  /**
   * Parse claim status response
   */
  private parseClaimStatusResponse(data: any): ClaimStatusDetail {
    const statusData = data?.ppmdmsg?.claims?.claim || data?.claim || data || {};

    // Handle array (get first item)
    const claim = Array.isArray(statusData) ? statusData[0] : statusData;

    return {
      claimId: claim.claimId || claim['@claimid'],
      claimNumber: claim.claimNumber || claim['@claimnumber'],
      status: claim.status || claim['@status'] || 'in_process',
      statusDate: claim.statusDate || claim['@statusdate'],
      clearinghouseStatus: claim.clearinghouseStatus || claim['@clearinghousestatus'],
      payerStatus: claim.payerStatus || claim['@payerstatus'],
      rejectionReason: claim.rejectionReason || claim['@rejectionreason'],
      rejectionCode: claim.rejectionCode || claim['@rejectioncode'],
      totalBilled: claim.totalBilled || claim['@totalbilled'],
      totalPaid: claim.totalPaid || claim['@totalpaid'],
      totalAdjustment: claim.totalAdjustment || claim['@totaladjustment'],
      patientResponsibility: claim.patientResponsibility || claim['@patientresponsibility'],
    };
  }

  /**
   * Map AMD status to local status
   */
  private mapAMDStatusToLocal(amdStatus: string): ClaimStatus {
    const statusMap: Record<string, ClaimStatus> = {
      draft: 'draft',
      ready: 'ready',
      submitted: 'submitted',
      accepted: 'accepted',
      rejected: 'rejected',
      in_process: 'in_process',
      'in process': 'in_process',
      paid: 'paid',
      denied: 'denied',
      partial_paid: 'partial_paid',
      'partial paid': 'partial_paid',
    };

    return statusMap[amdStatus?.toLowerCase()] || 'in_process';
  }

  /**
   * Update charges based on claim status
   */
  private async updateChargesFromClaimStatus(
    claimId: string,
    status: ClaimStatus,
    statusData: ClaimStatusDetail
  ): Promise<void> {
    const newChargeStatus = status === 'paid' ? 'Paid' : status === 'denied' ? 'Denied' : 'Billed';

    await prisma.chargeEntry.updateMany({
      where: { claimId },
      data: { chargeStatus: newChargeStatus },
    });
  }

  /**
   * Generate claim number
   */
  private generateClaimNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `CLM-${timestamp}-${random}`;
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
   * Parse amount string to number
   */
  private parseAmount(value: string | number | undefined): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? undefined : num;
  }

  /**
   * Get claim statistics
   */
  async getClaimStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    const where: any = {};
    if (startDate && endDate) {
      where.serviceStartDate = { gte: startDate, lte: endDate };
    }

    const claims = await prisma.claim.findMany({
      where,
      select: {
        status: true,
        totalChargeAmount: true,
        paidAmount: true,
        adjustmentAmount: true,
      },
    });

    const stats = {
      totalClaims: claims.length,
      byStatus: {} as Record<string, number>,
      totalBilled: 0,
      totalPaid: 0,
      totalAdjustment: 0,
      collectionRate: 0,
    };

    for (const claim of claims) {
      stats.byStatus[claim.status] = (stats.byStatus[claim.status] || 0) + 1;
      stats.totalBilled += Number(claim.totalChargeAmount) || 0;
      stats.totalPaid += Number(claim.paidAmount) || 0;
      stats.totalAdjustment += Number(claim.adjustmentAmount) || 0;
    }

    stats.collectionRate = stats.totalBilled > 0
      ? (stats.totalPaid / stats.totalBilled) * 100
      : 0;

    return stats;
  }
}

// Export singleton instance
export const advancedMDClaims = AdvancedMDClaimsService.getInstance();
