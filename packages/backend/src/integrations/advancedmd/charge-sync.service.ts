/**
 * AdvancedMD Charge Synchronization Service
 *
 * Handles bidirectional synchronization of billing charges between
 * MentalSpace EHR and AdvancedMD Practice Management System.
 *
 * Features:
 * - Submit charges to AdvancedMD (SaveCharges API)
 * - Update existing charges (UpdateVisitWithNewCharges API)
 * - Sync charge status from AdvancedMD
 * - Automatic code lookups and validation
 * - Batch charge submission
 * - Error handling and retry logic
 *
 * @module integrations/advancedmd/charge-sync-service
 */

import { PrismaClient, ChargeEntry, Appointment } from '@prisma/client';
import { advancedMDAPI } from './api-client';
import { advancedMDLookup } from './lookup.service';
import logger from '../../utils/logger';

const prisma = new PrismaClient();

/**
 * Charge submission result
 */
export interface ChargeSubmissionResult {
  success: boolean;
  chargeId: string;
  advancedMDChargeId?: string;
  advancedMDVisitId?: string;
  message?: string;
  error?: string;
  validationErrors?: string[];
}

/**
 * Batch charge submission result
 */
export interface BatchChargeSubmissionResult {
  totalCharges: number;
  successCount: number;
  failureCount: number;
  results: ChargeSubmissionResult[];
}

/**
 * Charge data for AdvancedMD submission
 */
interface AdvancedMDChargeData {
  visitId: string;
  cptCode: string;
  cptCodeId?: string;
  diagnosisCodes: string[];
  modifiers?: string[];
  units: number;
  chargeAmount: number;
  placeOfService?: string;
  providerId?: string;
}

/**
 * AdvancedMD Charge Sync Service
 */
export class AdvancedMDChargeSyncService {
  private static instance: AdvancedMDChargeSyncService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): AdvancedMDChargeSyncService {
    if (!AdvancedMDChargeSyncService.instance) {
      AdvancedMDChargeSyncService.instance = new AdvancedMDChargeSyncService();
    }
    return AdvancedMDChargeSyncService.instance;
  }

  // ========================================================================
  // CHARGE SUBMISSION
  // ========================================================================

  /**
   * Submit a single charge to AdvancedMD
   *
   * @param chargeId - ChargeEntry ID
   * @returns Submission result
   */
  async submitCharge(chargeId: string): Promise<ChargeSubmissionResult> {
    try {
      // Get charge entry with related data
      const charge = await prisma.chargeEntry.findUnique({
        where: { id: chargeId },
        include: {
          client: true,
        },
      });

      if (!charge) {
        return {
          success: false,
          chargeId,
          error: 'Charge entry not found',
        };
      }

      // Validate charge
      const validationErrors = await this.validateCharge(charge);
      if (validationErrors.length > 0) {
        await this.updateChargeSyncStatus(chargeId, 'error', validationErrors.join(', '));
        return {
          success: false,
          chargeId,
          validationErrors,
          error: 'Charge validation failed',
        };
      }

      // Get or create visit ID
      const visitId = await this.ensureVisitExists(charge);
      if (!visitId) {
        await this.updateChargeSyncStatus(chargeId, 'error', 'No AdvancedMD visit ID available');
        return {
          success: false,
          chargeId,
          error: 'Cannot sync charge without AdvancedMD visit',
        };
      }

      // Lookup CPT code
      const cptLookup = await advancedMDLookup.lookupCPTCode(charge.cptCode);
      if (!cptLookup.found || !cptLookup.amdId) {
        await this.updateChargeSyncStatus(
          chargeId,
          'error',
          `CPT code ${charge.cptCode} not found in AdvancedMD`
        );
        return {
          success: false,
          chargeId,
          error: `CPT code ${charge.cptCode} not found in AdvancedMD`,
        };
      }

      // Parse diagnosis codes
      const diagnosisCodes = this.parseDiagnosisCodes(charge.diagnosisCodesJson);

      // Build charge data
      const chargeData: AdvancedMDChargeData = {
        visitId,
        cptCode: charge.cptCode,
        cptCodeId: cptLookup.amdId,
        diagnosisCodes,
        modifiers: charge.modifiers || [],
        units: charge.units,
        chargeAmount: Number(charge.chargeAmount),
        placeOfService: charge.placeOfService,
        providerId: charge.providerId,
      };

      // Submit to AdvancedMD
      const submissionResult = await this.submitChargeToAdvancedMD(chargeData);

      if (submissionResult.success) {
        // Update charge entry with AdvancedMD IDs
        await prisma.chargeEntry.update({
          where: { id: chargeId },
          data: {
            advancedMDChargeId: submissionResult.advancedMDChargeId,
            advancedMDVisitId: visitId,
            syncStatus: 'synced',
            syncError: null,
            lastSyncAttempt: new Date(),
            chargeStatus: 'Submitted',
            billedDate: new Date(),
          },
        });

        return {
          success: true,
          chargeId,
          advancedMDChargeId: submissionResult.advancedMDChargeId,
          advancedMDVisitId: visitId,
          message: 'Charge successfully submitted to AdvancedMD',
        };
      } else {
        await this.updateChargeSyncStatus(chargeId, 'error', submissionResult.error || 'Unknown error');
        return {
          success: false,
          chargeId,
          error: submissionResult.error,
        };
      }
    } catch (error: unknown) {
      logger.error('Charge Sync: Error submitting charge', { chargeId, error: error.message });
      await this.updateChargeSyncStatus(chargeId, 'error', error.message);
      return {
        success: false,
        chargeId,
        error: error.message,
      };
    }
  }

  /**
   * Submit multiple charges in batch
   *
   * @param chargeIds - Array of ChargeEntry IDs
   * @returns Batch submission result
   */
  async submitChargesBatch(chargeIds: string[]): Promise<BatchChargeSubmissionResult> {
    const results: ChargeSubmissionResult[] = [];

    // Process charges sequentially to respect rate limits
    for (const chargeId of chargeIds) {
      const result = await this.submitCharge(chargeId);
      results.push(result);
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return {
      totalCharges: chargeIds.length,
      successCount,
      failureCount,
      results,
    };
  }

  /**
   * Submit all pending charges for an appointment
   *
   * @param appointmentId - Appointment ID
   * @returns Batch submission result
   */
  async submitAppointmentCharges(appointmentId: string): Promise<BatchChargeSubmissionResult> {
    // Get all pending charges for appointment
    const charges = await prisma.chargeEntry.findMany({
      where: {
        appointmentId,
        syncStatus: 'pending',
      },
    });

    const chargeIds = charges.map((c) => c.id);
    return this.submitChargesBatch(chargeIds);
  }

  // ========================================================================
  // CHARGE UPDATE
  // ========================================================================

  /**
   * Update an existing charge in AdvancedMD
   *
   * @param chargeId - ChargeEntry ID
   * @returns Update result
   */
  async updateCharge(chargeId: string): Promise<ChargeSubmissionResult> {
    try {
      const charge = await prisma.chargeEntry.findUnique({
        where: { id: chargeId },
      });

      if (!charge) {
        return {
          success: false,
          chargeId,
          error: 'Charge entry not found',
        };
      }

      if (!charge.advancedMDChargeId || !charge.advancedMDVisitId) {
        return {
          success: false,
          chargeId,
          error: 'Charge not yet synced to AdvancedMD',
        };
      }

      // Lookup CPT code
      const cptLookup = await advancedMDLookup.lookupCPTCode(charge.cptCode);
      if (!cptLookup.found || !cptLookup.amdId) {
        return {
          success: false,
          chargeId,
          error: `CPT code ${charge.cptCode} not found in AdvancedMD`,
        };
      }

      // Parse diagnosis codes
      const diagnosisCodes = this.parseDiagnosisCodes(charge.diagnosisCodesJson);

      // Build update payload
      const updatePayload = {
        visitid: charge.advancedMDVisitId,
        chargeid: charge.advancedMDChargeId,
        proccode: cptLookup.amdId,
        diagcodes: diagnosisCodes,
        modifiers: charge.modifiers || [],
        units: String(charge.units),
        chargeamount: String(charge.chargeAmount),
      };

      // Call UpdateVisitWithNewCharges API
      const response = await advancedMDAPI.makeRequest('UPDVISITWITHNEWCHARGES', updatePayload);

      if (response.success) {
        await this.updateChargeSyncStatus(chargeId, 'synced', null);
        return {
          success: true,
          chargeId,
          advancedMDChargeId: charge.advancedMDChargeId,
          advancedMDVisitId: charge.advancedMDVisitId,
          message: 'Charge successfully updated in AdvancedMD',
        };
      } else {
        const error = response.error || 'Unknown error';
        const errorMsg = typeof error === 'string' ? error : error.message;
        await this.updateChargeSyncStatus(chargeId, 'error', errorMsg);
        return {
          success: false,
          chargeId,
          error: errorMsg,
        };
      }
    } catch (error: unknown) {
      logger.error('Charge Sync: Error updating charge', { chargeId, error: error.message });
      await this.updateChargeSyncStatus(chargeId, 'error', error.message);
      return {
        success: false,
        chargeId,
        error: error.message,
      };
    }
  }

  /**
   * Void a charge in AdvancedMD
   *
   * @param chargeId - ChargeEntry ID
   * @param reason - Reason for voiding
   * @returns Result
   */
  async voidCharge(chargeId: string, reason: string): Promise<ChargeSubmissionResult> {
    try {
      const charge = await prisma.chargeEntry.findUnique({
        where: { id: chargeId },
      });

      if (!charge) {
        return {
          success: false,
          chargeId,
          error: 'Charge entry not found',
        };
      }

      if (!charge.advancedMDChargeId) {
        // If not synced to AMD, just mark as voided locally
        await prisma.chargeEntry.update({
          where: { id: chargeId },
          data: {
            chargeStatus: 'Void',
            writeOffReason: reason,
            writeOffDate: new Date(),
          },
        });

        return {
          success: true,
          chargeId,
          message: 'Charge voided locally (not synced to AdvancedMD)',
        };
      }

      // Call VoidCharges API
      const response = await advancedMDAPI.makeRequest('VOIDCHARGES', {
        chargeid: charge.advancedMDChargeId,
        reason: reason,
      });

      if (response.success) {
        await prisma.chargeEntry.update({
          where: { id: chargeId },
          data: {
            chargeStatus: 'Void',
            writeOffReason: reason,
            writeOffDate: new Date(),
            syncStatus: 'synced',
          },
        });

        return {
          success: true,
          chargeId,
          message: 'Charge voided in AdvancedMD',
        };
      } else {
        const error = response.error || 'Unknown error';
        const errorMsg = typeof error === 'string' ? error : error.message;
        return {
          success: false,
          chargeId,
          error: errorMsg,
        };
      }
    } catch (error: unknown) {
      logger.error('Charge Sync: Error voiding charge', { chargeId, error: error.message });
      return {
        success: false,
        chargeId,
        error: error.message,
      };
    }
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  /**
   * Submit charge data to AdvancedMD using SaveCharges API
   */
  private async submitChargeToAdvancedMD(chargeData: AdvancedMDChargeData): Promise<{
    success: boolean;
    advancedMDChargeId?: string;
    error?: string;
  }> {
    try {
      // Build SaveCharges payload
      const payload = {
        visitid: chargeData.visitId,
        charge: {
          proccode: chargeData.cptCodeId,
          diagcodes: chargeData.diagnosisCodes.join(','),
          modifiers: chargeData.modifiers?.join(',') || '',
          units: String(chargeData.units),
          chargeamount: String(chargeData.chargeAmount),
        },
      };

      // If place of service is specified
      if (chargeData.placeOfService) {
        (payload.charge as any).placeofservice = chargeData.placeOfService;
      }

      const response = await advancedMDAPI.makeRequest('SAVECHARGES', payload);

      if (response.success && response.data?.ppmdmsg?.charge) {
        const chargeResponse = response.data.ppmdmsg.charge;
        const chargeId = chargeResponse['@id'] || chargeResponse['@chargeid'];

        if (chargeId) {
          return {
            success: true,
            advancedMDChargeId: chargeId,
          };
        }
      }

      const error = response.error || 'Failed to save charge to AdvancedMD';
      return {
        success: false,
        error: typeof error === 'string' ? error : error.message,
      };
    } catch (error: unknown) {
      logger.error('Charge Sync: Error calling SaveCharges API', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Ensure AdvancedMD visit exists for the charge
   */
  private async ensureVisitExists(charge: ChargeEntry): Promise<string | null> {
    if (charge.advancedMDVisitId) {
      return charge.advancedMDVisitId;
    }

    // If charge has appointmentId, check if appointment has visit ID
    if (charge.appointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: charge.appointmentId },
      });

      if (appointment?.advancedMDVisitId) {
        return appointment.advancedMDVisitId;
      }
    }

    // No visit ID available
    return null;
  }

  /**
   * Validate charge before submission
   */
  private async validateCharge(charge: ChargeEntry): Promise<string[]> {
    const errors: string[] = [];

    // Required fields
    if (!charge.cptCode) {
      errors.push('CPT code is required');
    }

    if (!charge.chargeAmount || Number(charge.chargeAmount) <= 0) {
      errors.push('Charge amount must be greater than 0');
    }

    if (!charge.providerId) {
      errors.push('Provider ID is required');
    }

    if (!charge.serviceDate) {
      errors.push('Service date is required');
    }

    // Diagnosis codes
    const diagCodes = this.parseDiagnosisCodes(charge.diagnosisCodesJson);
    if (diagCodes.length === 0) {
      errors.push('At least one diagnosis code is required');
    }

    // Check if client has AdvancedMD patient ID
    const client = await prisma.client.findUnique({
      where: { id: charge.clientId },
    });

    if (!client?.advancedMDPatientId) {
      errors.push('Patient not synced to AdvancedMD');
    }

    return errors;
  }

  /**
   * Parse diagnosis codes from JSON
   */
  private parseDiagnosisCodes(diagnosisJson: any): string[] {
    try {
      if (!diagnosisJson) return [];

      // If already an array
      if (Array.isArray(diagnosisJson)) {
        return diagnosisJson.map((d) => (typeof d === 'string' ? d : d.code || d.icdCode)).filter(Boolean);
      }

      // If it's an object with codes
      if (typeof diagnosisJson === 'object') {
        if (diagnosisJson.codes && Array.isArray(diagnosisJson.codes)) {
          return diagnosisJson.codes;
        }
      }

      return [];
    } catch (error) {
      logger.error('Charge Sync: Error parsing diagnosis codes', { error });
      return [];
    }
  }

  /**
   * Update charge sync status
   */
  private async updateChargeSyncStatus(
    chargeId: string,
    status: string,
    error: string | null
  ): Promise<void> {
    await prisma.chargeEntry.update({
      where: { id: chargeId },
      data: {
        syncStatus: status,
        syncError: error,
        lastSyncAttempt: new Date(),
      },
    });
  }

  // ========================================================================
  // SYNC FROM ADVANCEDMD
  // ========================================================================

  /**
   * Pull charge status updates from AdvancedMD
   *
   * @param visitId - AdvancedMD visit ID
   * @returns Updated charges
   */
  async syncChargeStatusFromAdvancedMD(visitId: string): Promise<void> {
    try {
      // Get charge details from AdvancedMD
      const response = await advancedMDAPI.makeRequest('GETCHARGEDETAILDATA', {
        visitid: visitId,
      });

      if (!response.success || !response.data?.ppmdmsg?.charges) {
        logger.debug(`[Charge Sync] No charges found for visit ${visitId}`);
        return;
      }

      const charges = Array.isArray(response.data.ppmdmsg.charges)
        ? response.data.ppmdmsg.charges
        : [response.data.ppmdmsg.charges];

      // Update local charges
      for (const amdCharge of charges) {
        const chargeId = amdCharge['@id'] || amdCharge['@chargeid'];

        // Find local charge
        const localCharge = await prisma.chargeEntry.findFirst({
          where: {
            advancedMDChargeId: chargeId,
          },
        });

        if (localCharge) {
          // Update status and financial data
          await prisma.chargeEntry.update({
            where: { id: localCharge.id },
            data: {
              allowedAmount: amdCharge['@allowedamount']
                ? Number(amdCharge['@allowedamount'])
                : undefined,
              paymentAmount: amdCharge['@paymentamount'] ? Number(amdCharge['@paymentamount']) : undefined,
              adjustmentAmount: amdCharge['@adjustmentamount']
                ? Number(amdCharge['@adjustmentamount'])
                : undefined,
              syncStatus: 'synced',
              lastSyncAttempt: new Date(),
            },
          });
        }
      }
    } catch (error: unknown) {
      logger.error('Charge Sync: Error syncing charges for visit', { visitId, error: error.message });
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStats() {
    const stats = await prisma.chargeEntry.groupBy({
      by: ['syncStatus'],
      _count: {
        id: true,
      },
    });

    return {
      total: stats.reduce((sum, s) => sum + s._count.id, 0),
      byStatus: stats.reduce((obj, s) => {
        obj[s.syncStatus] = s._count.id;
        return obj;
      }, {} as Record<string, number>),
    };
  }
}

// Export singleton instance
export const advancedMDChargeSync = AdvancedMDChargeSyncService.getInstance();
