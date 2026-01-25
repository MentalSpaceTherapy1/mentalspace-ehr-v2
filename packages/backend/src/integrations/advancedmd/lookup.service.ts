/**
 * AdvancedMD Code Lookup and Caching Service
 *
 * Provides cached lookups for CPT codes, ICD-10 codes, modifiers, and other reference data.
 * Reduces API calls by caching frequently used codes in memory and database.
 *
 * Features:
 * - CPT code lookup (LookUpProcCode)
 * - ICD-10 code lookup (LookUpDiagCode)
 * - Modifier code lookup (LookUpModCode)
 * - Provider lookup
 * - Facility lookup
 * - In-memory cache with TTL
 * - Persistent database cache
 * - Automatic cache refresh
 *
 * @module integrations/advancedmd/lookup-service
 */

import { PrismaClient } from '@prisma/client';
import { advancedMDAPI } from './api-client';
import logger from '../../utils/logger';

const prisma = new PrismaClient();

/**
 * Cached lookup entry
 */
interface CachedLookup {
  code: string;
  amdId: string;
  description?: string;
  cachedAt: Date;
  expiresAt: Date;
}

/**
 * Lookup result
 */
export interface LookupResult {
  found: boolean;
  amdId?: string;
  description?: string;
  code?: string;
}

/**
 * AdvancedMD Lookup Service
 */
export class AdvancedMDLookupService {
  // In-memory caches
  private cptCodeCache: Map<string, CachedLookup> = new Map();
  private icdCodeCache: Map<string, CachedLookup> = new Map();
  private modifierCache: Map<string, CachedLookup> = new Map();
  private providerCache: Map<string, CachedLookup> = new Map();
  private facilityCache: Map<string, CachedLookup> = new Map();

  // Cache TTL (24 hours)
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000;

  // Singleton instance
  private static instance: AdvancedMDLookupService;

  private constructor() {
    // Load cache from database on startup
    this.loadCacheFromDatabase();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AdvancedMDLookupService {
    if (!AdvancedMDLookupService.instance) {
      AdvancedMDLookupService.instance = new AdvancedMDLookupService();
    }
    return AdvancedMDLookupService.instance;
  }

  // ========================================================================
  // CPT CODE LOOKUPS
  // ========================================================================

  /**
   * Look up a CPT code and get AdvancedMD internal ID
   *
   * @param cptCode - CPT code (e.g., "90834")
   * @returns Lookup result with AdvancedMD internal ID
   */
  async lookupCPTCode(cptCode: string): Promise<LookupResult> {
    // Check in-memory cache first
    const cached = this.getCachedEntry(this.cptCodeCache, cptCode);
    if (cached) {
      return {
        found: true,
        amdId: cached.amdId,
        description: cached.description,
        code: cptCode,
      };
    }

    // Call AdvancedMD API
    try {
      const response = await advancedMDAPI.makeRequest('LOOKUPPROCCODE', {
        proccode: cptCode,
      });

      if (response.success && response.data?.ppmdmsg?.ProcCode) {
        const procCode = response.data.ppmdmsg.ProcCode;
        const amdId = procCode['@id'] || procCode['@proccodeid'];
        const description = procCode['@description'] || procCode['@name'];

        if (amdId) {
          // Cache the result
          this.cacheEntry(this.cptCodeCache, cptCode, amdId, description);
          await this.saveCacheToDatabase('CPT', cptCode, amdId, description);

          return {
            found: true,
            amdId,
            description,
            code: cptCode,
          };
        }
      }

      return { found: false, code: cptCode };
    } catch (error: unknown) {
      logger.error('Lookup Service: Error looking up CPT code', { cptCode, error: error.message });
      return { found: false, code: cptCode };
    }
  }

  /**
   * Look up multiple CPT codes in batch
   *
   * @param cptCodes - Array of CPT codes
   * @returns Map of CPT code to lookup result
   */
  async lookupCPTCodesBatch(cptCodes: string[]): Promise<Map<string, LookupResult>> {
    const results = new Map<string, LookupResult>();

    // Process in parallel
    await Promise.all(
      cptCodes.map(async (code) => {
        const result = await this.lookupCPTCode(code);
        results.set(code, result);
      })
    );

    return results;
  }

  // ========================================================================
  // ICD-10 CODE LOOKUPS
  // ========================================================================

  /**
   * Look up an ICD-10 diagnosis code
   *
   * @param icdCode - ICD-10 code (e.g., "F41.1")
   * @returns Lookup result with AdvancedMD internal ID
   */
  async lookupICD10Code(icdCode: string): Promise<LookupResult> {
    // Check in-memory cache first
    const cached = this.getCachedEntry(this.icdCodeCache, icdCode);
    if (cached) {
      return {
        found: true,
        amdId: cached.amdId,
        description: cached.description,
        code: icdCode,
      };
    }

    // Call AdvancedMD API
    try {
      const response = await advancedMDAPI.makeRequest('LOOKUPDIAGCODE', {
        diagcode: icdCode,
      });

      if (response.success && response.data?.ppmdmsg?.DiagCode) {
        const diagCode = response.data.ppmdmsg.DiagCode;
        const amdId = diagCode['@id'] || diagCode['@diagcodeid'];
        const description = diagCode['@description'] || diagCode['@name'];

        if (amdId) {
          // Cache the result
          this.cacheEntry(this.icdCodeCache, icdCode, amdId, description);
          await this.saveCacheToDatabase('ICD10', icdCode, amdId, description);

          return {
            found: true,
            amdId,
            description,
            code: icdCode,
          };
        }
      }

      // ICD codes can often be used directly without lookup
      // Return the code itself as the ID
      return {
        found: true,
        amdId: icdCode,
        description: undefined,
        code: icdCode,
      };
    } catch (error: unknown) {
      logger.error('Lookup Service: Error looking up ICD-10 code', { icdCode, error: error.message });

      // ICD codes can often be used directly
      return {
        found: true,
        amdId: icdCode,
        code: icdCode,
      };
    }
  }

  /**
   * Look up multiple ICD-10 codes in batch
   *
   * @param icdCodes - Array of ICD-10 codes
   * @returns Map of ICD code to lookup result
   */
  async lookupICD10CodesBatch(icdCodes: string[]): Promise<Map<string, LookupResult>> {
    const results = new Map<string, LookupResult>();

    // Process in parallel
    await Promise.all(
      icdCodes.map(async (code) => {
        const result = await this.lookupICD10Code(code);
        results.set(code, result);
      })
    );

    return results;
  }

  // ========================================================================
  // MODIFIER CODE LOOKUPS
  // ========================================================================

  /**
   * Look up a modifier code
   *
   * @param modifierCode - Modifier code (e.g., "GT", "95")
   * @returns Lookup result with AdvancedMD internal ID
   */
  async lookupModifierCode(modifierCode: string): Promise<LookupResult> {
    // Check in-memory cache first
    const cached = this.getCachedEntry(this.modifierCache, modifierCode);
    if (cached) {
      return {
        found: true,
        amdId: cached.amdId,
        description: cached.description,
        code: modifierCode,
      };
    }

    // Call AdvancedMD API
    try {
      const response = await advancedMDAPI.makeRequest('LOOKUPMODCODE', {
        modcode: modifierCode,
      });

      if (response.success && response.data?.ppmdmsg?.ModCode) {
        const modCode = response.data.ppmdmsg.ModCode;
        const amdId = modCode['@id'] || modCode['@modcodeid'];
        const description = modCode['@description'] || modCode['@name'];

        if (amdId) {
          // Cache the result
          this.cacheEntry(this.modifierCache, modifierCode, amdId, description);
          await this.saveCacheToDatabase('MODIFIER', modifierCode, amdId, description);

          return {
            found: true,
            amdId,
            description,
            code: modifierCode,
          };
        }
      }

      // Modifiers can often be used directly
      return {
        found: true,
        amdId: modifierCode,
        code: modifierCode,
      };
    } catch (error: unknown) {
      logger.error('Lookup Service: Error looking up modifier', { modifierCode, error: error.message });

      // Modifiers can often be used directly
      return {
        found: true,
        amdId: modifierCode,
        code: modifierCode,
      };
    }
  }

  // ========================================================================
  // PROVIDER LOOKUPS
  // ========================================================================

  /**
   * Look up a provider by name
   *
   * @param providerName - Provider name
   * @returns Lookup result with provider ID
   */
  async lookupProvider(providerName: string): Promise<LookupResult> {
    // Check cache first
    const cached = this.getCachedEntry(this.providerCache, providerName);
    if (cached) {
      return {
        found: true,
        amdId: cached.amdId,
        description: cached.description,
      };
    }

    // Call AdvancedMD API
    try {
      const response = await advancedMDAPI.makeRequest('LOOKUPPROVIDER', {
        providername: providerName,
      });

      if (response.success && response.data?.ppmdmsg?.Provider) {
        const provider = response.data.ppmdmsg.Provider;
        const amdId = provider['@id'] || provider['@providerid'];
        const description = provider['@name'] || provider['@providername'];

        if (amdId) {
          this.cacheEntry(this.providerCache, providerName, amdId, description);
          await this.saveCacheToDatabase('PROVIDER', providerName, amdId, description);

          return {
            found: true,
            amdId,
            description,
          };
        }
      }

      return { found: false };
    } catch (error: unknown) {
      logger.error('Lookup Service: Error looking up provider', { providerName, error: error.message });
      return { found: false };
    }
  }

  // ========================================================================
  // FACILITY LOOKUPS
  // ========================================================================

  /**
   * Look up a facility by name
   *
   * @param facilityName - Facility name
   * @returns Lookup result with facility ID
   */
  async lookupFacility(facilityName: string): Promise<LookupResult> {
    // Check cache first
    const cached = this.getCachedEntry(this.facilityCache, facilityName);
    if (cached) {
      return {
        found: true,
        amdId: cached.amdId,
        description: cached.description,
      };
    }

    // Call AdvancedMD API
    try {
      const response = await advancedMDAPI.makeRequest('LOOKUPFACILITY', {
        facilityname: facilityName,
      });

      if (response.success && response.data?.ppmdmsg?.Facility) {
        const facility = response.data.ppmdmsg.Facility;
        const amdId = facility['@id'] || facility['@facilityid'];
        const description = facility['@name'] || facility['@facilityname'];

        if (amdId) {
          this.cacheEntry(this.facilityCache, facilityName, amdId, description);
          await this.saveCacheToDatabase('FACILITY', facilityName, amdId, description);

          return {
            found: true,
            amdId,
            description,
          };
        }
      }

      return { found: false };
    } catch (error: unknown) {
      logger.error('Lookup Service: Error looking up facility', { facilityName, error: error.message });
      return { found: false };
    }
  }

  // ========================================================================
  // CACHE MANAGEMENT
  // ========================================================================

  /**
   * Get entry from cache if not expired
   */
  private getCachedEntry(cache: Map<string, CachedLookup>, key: string): CachedLookup | null {
    const entry = cache.get(key.toUpperCase());
    if (entry && entry.expiresAt > new Date()) {
      return entry;
    }
    return null;
  }

  /**
   * Add entry to in-memory cache
   */
  private cacheEntry(
    cache: Map<string, CachedLookup>,
    code: string,
    amdId: string,
    description?: string
  ): void {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.CACHE_TTL_MS);

    cache.set(code.toUpperCase(), {
      code: code.toUpperCase(),
      amdId,
      description,
      cachedAt: now,
      expiresAt,
    });
  }

  /**
   * Save cache entry to database for persistence
   */
  private async saveCacheToDatabase(
    type: string,
    code: string,
    amdId: string,
    description?: string
  ): Promise<void> {
    try {
      await prisma.advancedMDCodeCache.upsert({
        where: {
          type_code: {
            type,
            code: code.toUpperCase(),
          },
        },
        update: {
          amdId,
          description,
          lastUsedAt: new Date(),
        },
        create: {
          type,
          code: code.toUpperCase(),
          amdId,
          description,
        },
      });
    } catch (error: unknown) {
      logger.error('Lookup Service: Error saving cache to database', { error: error.message });
    }
  }

  /**
   * Load cache from database on startup
   */
  private async loadCacheFromDatabase(): Promise<void> {
    try {
      const cacheEntries = await prisma.advancedMDCodeCache.findMany({
        where: {
          OR: [
            { type: 'CPT' },
            { type: 'ICD10' },
            { type: 'MODIFIER' },
            { type: 'PROVIDER' },
            { type: 'FACILITY' },
          ],
        },
      });

      for (const entry of cacheEntries) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + this.CACHE_TTL_MS);

        const cachedLookup: CachedLookup = {
          code: entry.code,
          amdId: entry.amdId,
          description: entry.description || undefined,
          cachedAt: now,
          expiresAt,
        };

        switch (entry.type) {
          case 'CPT':
            this.cptCodeCache.set(entry.code, cachedLookup);
            break;
          case 'ICD10':
            this.icdCodeCache.set(entry.code, cachedLookup);
            break;
          case 'MODIFIER':
            this.modifierCache.set(entry.code, cachedLookup);
            break;
          case 'PROVIDER':
            this.providerCache.set(entry.code, cachedLookup);
            break;
          case 'FACILITY':
            this.facilityCache.set(entry.code, cachedLookup);
            break;
        }
      }

      logger.info(`[Lookup Service] Loaded ${cacheEntries.length} cached lookups from database`);
    } catch (error: unknown) {
      logger.error('Lookup Service: Error loading cache from database', { error: error.message });
    }
  }

  /**
   * Clear all caches
   */
  public clearAllCaches(): void {
    this.cptCodeCache.clear();
    this.icdCodeCache.clear();
    this.modifierCache.clear();
    this.providerCache.clear();
    this.facilityCache.clear();
    logger.info('[Lookup Service] All caches cleared');
  }

  /**
   * Refresh cache from database
   */
  public async refreshCache(): Promise<void> {
    this.clearAllCaches();
    await this.loadCacheFromDatabase();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats() {
    return {
      cptCodes: this.cptCodeCache.size,
      icdCodes: this.icdCodeCache.size,
      modifiers: this.modifierCache.size,
      providers: this.providerCache.size,
      facilities: this.facilityCache.size,
      total:
        this.cptCodeCache.size +
        this.icdCodeCache.size +
        this.modifierCache.size +
        this.providerCache.size +
        this.facilityCache.size,
    };
  }
}

// Export singleton instance
export const advancedMDLookup = AdvancedMDLookupService.getInstance();
