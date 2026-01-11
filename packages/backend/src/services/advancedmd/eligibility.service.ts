/**
 * AdvancedMD Eligibility Verification Service
 *
 * Provides real-time insurance eligibility verification through AdvancedMD API.
 * Uses the CHECKELIGIBILITY (270/271 transaction) endpoint.
 *
 * Features:
 * - Real-time eligibility checks
 * - Eligibility caching to reduce API calls
 * - Batch eligibility verification
 * - Benefits parsing and normalization
 * - Integration with appointment workflow
 *
 * @module services/advancedmd/eligibility.service
 */

import { PrismaClient } from '@prisma/client';
import { advancedMDAPI } from '../../integrations/advancedmd/api-client';

const prisma = new PrismaClient();

/**
 * Eligibility check result
 */
export interface EligibilityCheckResult {
  success: boolean;
  clientId: string;
  insuranceId?: string;
  carrierCode?: string;
  serviceDate: string;
  eligibilityData?: EligibilityData;
  error?: string;
  cachedResult?: boolean;
  checkedAt: Date;
}

/**
 * Parsed eligibility data
 */
export interface EligibilityData {
  isActive: boolean;
  isEligible: boolean;
  planName?: string;
  planType?: string;
  coverageLevel?: 'Individual' | 'Family';
  copay?: number;
  coinsurancePercent?: number;
  deductible?: number;
  deductibleMet?: number;
  deductibleRemaining?: number;
  outOfPocketMax?: number;
  outOfPocketMet?: number;
  outOfPocketRemaining?: number;
  requiresAuthorization: boolean;
  authorizationNumber?: string;
  visitLimit?: number;
  visitsUsed?: number;
  visitsRemaining?: number;
  effectiveDate?: string;
  terminationDate?: string;
  rawResponse?: any;
}

/**
 * Batch eligibility result
 */
export interface BatchEligibilityResult {
  totalChecked: number;
  successCount: number;
  failureCount: number;
  results: EligibilityCheckResult[];
}

/**
 * Eligibility cache entry
 */
interface EligibilityCacheEntry {
  eligibilityData: EligibilityData;
  checkedAt: Date;
  expiresAt: Date;
}

/**
 * AdvancedMD Eligibility Service
 */
export class AdvancedMDEligibilityService {
  private static instance: AdvancedMDEligibilityService;

  // In-memory cache for eligibility results (valid for 24 hours)
  private eligibilityCache: Map<string, EligibilityCacheEntry> = new Map();
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  // Mental health service type code
  private readonly MENTAL_HEALTH_SERVICE_TYPE = '30';

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): AdvancedMDEligibilityService {
    if (!AdvancedMDEligibilityService.instance) {
      AdvancedMDEligibilityService.instance = new AdvancedMDEligibilityService();
    }
    return AdvancedMDEligibilityService.instance;
  }

  // ========================================================================
  // ELIGIBILITY VERIFICATION
  // ========================================================================

  /**
   * Check eligibility for a client's insurance
   *
   * @param clientId - Client ID
   * @param insuranceId - Optional specific insurance ID (defaults to primary)
   * @param serviceDate - Date of service (defaults to today)
   * @param skipCache - Force fresh eligibility check
   * @returns Eligibility check result
   */
  async checkEligibility(
    clientId: string,
    insuranceId?: string,
    serviceDate?: Date,
    skipCache: boolean = false
  ): Promise<EligibilityCheckResult> {
    const checkDate = serviceDate || new Date();
    const serviceDateStr = this.formatDate(checkDate);

    try {
      // Get client with insurance info
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          insuranceInfo: {
            where: insuranceId ? { id: insuranceId } : { rank: 'Primary' },
            take: 1,
          },
        },
      });

      if (!client) {
        return {
          success: false,
          clientId,
          serviceDate: serviceDateStr,
          error: 'Client not found',
          checkedAt: new Date(),
        };
      }

      // Check if client is synced to AdvancedMD
      if (!client.advancedMDPatientId) {
        return {
          success: false,
          clientId,
          serviceDate: serviceDateStr,
          error: 'Client not synced to AdvancedMD. Sync patient first.',
          checkedAt: new Date(),
        };
      }

      // Get insurance record
      const insurance = client.insuranceInfo[0];
      if (!insurance) {
        return {
          success: false,
          clientId,
          serviceDate: serviceDateStr,
          error: insuranceId
            ? `Insurance ${insuranceId} not found`
            : 'No primary insurance found for client',
          checkedAt: new Date(),
        };
      }

      // Get carrier code
      const carrierCode = insurance.insuranceCompanyId || insurance.insuranceCompany;
      if (!carrierCode) {
        return {
          success: false,
          clientId,
          insuranceId: insurance.id,
          serviceDate: serviceDateStr,
          error: 'No carrier code (payer ID) found for insurance',
          checkedAt: new Date(),
        };
      }

      // Check cache first (unless skipCache is true)
      const cacheKey = this.getCacheKey(clientId, insurance.id, serviceDateStr);
      if (!skipCache) {
        const cachedResult = this.getCachedEligibility(cacheKey);
        if (cachedResult) {
          return {
            success: true,
            clientId,
            insuranceId: insurance.id,
            carrierCode,
            serviceDate: serviceDateStr,
            eligibilityData: cachedResult.eligibilityData,
            cachedResult: true,
            checkedAt: cachedResult.checkedAt,
          };
        }
      }

      // Call AdvancedMD eligibility API
      const eligibilityResult = await this.callEligibilityAPI(
        client.advancedMDPatientId,
        carrierCode,
        serviceDateStr
      );

      if (eligibilityResult.success && eligibilityResult.eligibilityData) {
        // Cache the result
        this.cacheEligibility(cacheKey, eligibilityResult.eligibilityData);

        // Store in database for audit trail
        await this.storeEligibilityResult(
          clientId,
          insurance.id,
          serviceDateStr,
          eligibilityResult.eligibilityData
        );
      }

      return {
        success: eligibilityResult.success,
        clientId,
        insuranceId: insurance.id,
        carrierCode,
        serviceDate: serviceDateStr,
        eligibilityData: eligibilityResult.eligibilityData,
        error: eligibilityResult.error,
        cachedResult: false,
        checkedAt: new Date(),
      };
    } catch (error: any) {
      console.error('[Eligibility Service] Error checking eligibility:', error.message);
      return {
        success: false,
        clientId,
        serviceDate: serviceDateStr,
        error: error.message,
        checkedAt: new Date(),
      };
    }
  }

  /**
   * Check eligibility for an appointment
   *
   * @param appointmentId - Appointment ID
   * @returns Eligibility check result
   */
  async checkEligibilityForAppointment(
    appointmentId: string
  ): Promise<EligibilityCheckResult> {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          client: {
            include: {
              insuranceInfo: {
                where: { rank: 'Primary' },
                take: 1,
              },
            },
          },
        },
      });

      if (!appointment) {
        return {
          success: false,
          clientId: '',
          serviceDate: '',
          error: 'Appointment not found',
          checkedAt: new Date(),
        };
      }

      return this.checkEligibility(
        appointment.clientId,
        appointment.client.insuranceInfo[0]?.id,
        appointment.appointmentDate
      );
    } catch (error: any) {
      console.error('[Eligibility Service] Error checking appointment eligibility:', error.message);
      return {
        success: false,
        clientId: '',
        serviceDate: '',
        error: error.message,
        checkedAt: new Date(),
      };
    }
  }

  /**
   * Batch check eligibility for multiple clients
   *
   * @param clientIds - Array of client IDs
   * @param serviceDate - Optional service date (defaults to today)
   * @returns Batch eligibility result
   */
  async checkEligibilityBatch(
    clientIds: string[],
    serviceDate?: Date
  ): Promise<BatchEligibilityResult> {
    const results: EligibilityCheckResult[] = [];

    // Process sequentially to respect rate limits
    for (const clientId of clientIds) {
      const result = await this.checkEligibility(clientId, undefined, serviceDate);
      results.push(result);
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return {
      totalChecked: clientIds.length,
      successCount,
      failureCount,
      results,
    };
  }

  /**
   * Check eligibility for all appointments on a given date
   *
   * @param date - Date to check appointments for
   * @returns Batch eligibility result
   */
  async checkEligibilityForDateAppointments(
    date: Date
  ): Promise<BatchEligibilityResult> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED'],
        },
      },
      select: {
        id: true,
        clientId: true,
      },
    });

    // Get unique client IDs
    const uniqueClientIds = [...new Set(appointments.map((a) => a.clientId))];

    return this.checkEligibilityBatch(uniqueClientIds, date);
  }

  // ========================================================================
  // API INTERACTION
  // ========================================================================

  /**
   * Call AdvancedMD eligibility API
   */
  private async callEligibilityAPI(
    advancedMDPatientId: string,
    carrierCode: string,
    serviceDate: string
  ): Promise<{ success: boolean; eligibilityData?: EligibilityData; error?: string }> {
    try {
      const requestData = {
        '@patientid': advancedMDPatientId,
        '@carriercode': carrierCode,
        '@servicedate': serviceDate,
        '@servicetype': this.MENTAL_HEALTH_SERVICE_TYPE,
      };

      const response = await advancedMDAPI.makeRequest('CHECKELIGIBILITY', requestData);

      if (!response.success) {
        const errorMsg = response.error
          ? typeof response.error === 'string'
            ? response.error
            : response.error.message || JSON.stringify(response.error)
          : 'Failed to check eligibility';
        return { success: false, error: errorMsg };
      }

      // Parse the eligibility response
      const eligibilityData = this.parseEligibilityResponse(response.data);

      return {
        success: true,
        eligibilityData,
      };
    } catch (error: any) {
      console.error('[Eligibility Service] API call failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Parse AdvancedMD eligibility response into normalized format
   */
  private parseEligibilityResponse(data: any): EligibilityData {
    // Handle different response formats
    const eligibility = data?.ppmdmsg?.eligibility || data?.eligibility || data || {};

    return {
      isActive: eligibility.coverageActive === true || eligibility.coverageActive === 'true' || eligibility['@coverageactive'] === 'true',
      isEligible: eligibility.eligibleForService === true || eligibility.eligibleForService === 'true' || eligibility['@eligibleforservice'] === 'true',
      planName: eligibility.planName || eligibility['@planname'],
      planType: eligibility.planType || eligibility['@plantype'],
      coverageLevel: eligibility.coverageLevel || eligibility['@coveragelevel'],
      copay: this.parseAmount(eligibility.copay || eligibility['@copay']),
      coinsurancePercent: this.parsePercent(eligibility.coinsurance || eligibility['@coinsurance']),
      deductible: this.parseAmount(eligibility.deductible || eligibility['@deductible']),
      deductibleMet: this.parseAmount(eligibility.deductibleMet || eligibility['@deductiblemet']),
      deductibleRemaining: this.calculateRemaining(
        eligibility.deductible || eligibility['@deductible'],
        eligibility.deductibleMet || eligibility['@deductiblemet']
      ),
      outOfPocketMax: this.parseAmount(eligibility.outOfPocketMax || eligibility['@outofpocketmax']),
      outOfPocketMet: this.parseAmount(eligibility.outOfPocketMet || eligibility['@outofpocketmet']),
      outOfPocketRemaining: this.calculateRemaining(
        eligibility.outOfPocketMax || eligibility['@outofpocketmax'],
        eligibility.outOfPocketMet || eligibility['@outofpocketmet']
      ),
      requiresAuthorization: eligibility.requiresAuth === true || eligibility.requiresAuth === 'true' || eligibility['@requiresauth'] === 'true',
      authorizationNumber: eligibility.authNumber || eligibility['@authnumber'],
      visitLimit: this.parseNumber(eligibility.serviceLimit || eligibility['@servicelimit']),
      visitsUsed: this.parseNumber(eligibility.serviceUsed || eligibility['@serviceused']),
      visitsRemaining: this.parseNumber(eligibility.serviceRemaining || eligibility['@serviceremaining']),
      rawResponse: eligibility,
    };
  }

  // ========================================================================
  // CACHING
  // ========================================================================

  /**
   * Get cache key for eligibility
   */
  private getCacheKey(clientId: string, insuranceId: string, serviceDate: string): string {
    return `${clientId}:${insuranceId}:${serviceDate}`;
  }

  /**
   * Get cached eligibility result
   */
  private getCachedEligibility(cacheKey: string): EligibilityCacheEntry | null {
    const cached = this.eligibilityCache.get(cacheKey);
    if (cached && cached.expiresAt > new Date()) {
      return cached;
    }
    // Remove expired entry
    if (cached) {
      this.eligibilityCache.delete(cacheKey);
    }
    return null;
  }

  /**
   * Cache eligibility result
   */
  private cacheEligibility(cacheKey: string, eligibilityData: EligibilityData): void {
    const now = new Date();
    this.eligibilityCache.set(cacheKey, {
      eligibilityData,
      checkedAt: now,
      expiresAt: new Date(now.getTime() + this.CACHE_TTL_MS),
    });
  }

  /**
   * Clear eligibility cache for a client
   */
  public clearClientCache(clientId: string): void {
    const keysToDelete: string[] = [];
    this.eligibilityCache.forEach((_, key) => {
      if (key.startsWith(clientId + ':')) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.eligibilityCache.delete(key));
  }

  /**
   * Clear all cached eligibility data
   */
  public clearAllCache(): void {
    this.eligibilityCache.clear();
  }

  // ========================================================================
  // DATABASE OPERATIONS
  // ========================================================================

  /**
   * Store eligibility result in database for audit trail
   */
  private async storeEligibilityResult(
    clientId: string,
    insuranceId: string,
    serviceDate: string,
    eligibilityData: EligibilityData
  ): Promise<void> {
    try {
      // Store in sync log for audit trail
      await prisma.advancedMDSyncLog.create({
        data: {
          syncType: 'eligibility',
          entityId: clientId,
          entityType: 'Client',
          syncDirection: 'from_amd',
          syncStatus: 'success',
          syncStarted: new Date(),
          syncCompleted: new Date(),
          responseData: {
            serviceDate,
            insuranceId,
            eligibilityData,
          } as any,
        },
      });
    } catch (error: any) {
      // Log but don't fail if database storage fails
      console.error('[Eligibility Service] Failed to store eligibility result:', error.message);
    }
  }

  /**
   * Get last eligibility check for a client
   */
  async getLastEligibilityCheck(
    clientId: string,
    insuranceId?: string
  ): Promise<any | null> {
    const logs = await prisma.advancedMDSyncLog.findMany({
      where: {
        syncType: 'eligibility',
        entityId: clientId,
        syncStatus: 'success',
      },
      orderBy: {
        syncCompleted: 'desc',
      },
      take: 1,
    });

    if (logs.length === 0) return null;

    const log = logs[0];
    const responseData = log.responseData as any;

    // Filter by insuranceId if provided
    if (insuranceId && responseData?.insuranceId !== insuranceId) {
      return null;
    }

    return {
      checkedAt: log.syncCompleted,
      serviceDate: responseData?.serviceDate,
      insuranceId: responseData?.insuranceId,
      eligibilityData: responseData?.eligibilityData,
    };
  }

  /**
   * Get eligibility history for a client
   */
  async getEligibilityHistory(
    clientId: string,
    limit: number = 10
  ): Promise<any[]> {
    const logs = await prisma.advancedMDSyncLog.findMany({
      where: {
        syncType: 'eligibility',
        entityId: clientId,
      },
      orderBy: { syncCompleted: 'desc' },
      take: limit,
    });

    return logs.map((log) => {
      const responseData = log.responseData as any;
      return {
        id: log.id,
        checkedAt: log.syncCompleted,
        status: log.syncStatus,
        serviceDate: responseData?.serviceDate,
        insuranceId: responseData?.insuranceId,
        eligibilityData: responseData?.eligibilityData,
        error: log.errorMessage,
      };
    });
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

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
   * Parse percent string to number
   */
  private parsePercent(value: string | number | undefined): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? undefined : num;
  }

  /**
   * Parse number from string
   */
  private parseNumber(value: string | number | undefined): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const num = typeof value === 'number' ? value : parseInt(String(value), 10);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Calculate remaining amount
   */
  private calculateRemaining(
    total: string | number | undefined,
    used: string | number | undefined
  ): number | undefined {
    const totalNum = this.parseAmount(total);
    const usedNum = this.parseAmount(used);
    if (totalNum === undefined) return undefined;
    return totalNum - (usedNum || 0);
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.eligibilityCache.size,
      entries: Array.from(this.eligibilityCache.keys()),
    };
  }
}

// Export singleton instance
export const advancedMDEligibility = AdvancedMDEligibilityService.getInstance();
