/**
 * AdvancedMD Billing Integration API Routes
 *
 * Provides endpoints for:
 * - Charge submission and updates
 * - CPT/ICD code lookups
 * - Billing synchronization
 * - Insurance eligibility verification
 */

import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import {
  AdvancedMDChargeSyncService,
  AdvancedMDLookupService,
} from '../integrations/advancedmd';

const router = Router();
const prisma = new PrismaClient();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get service instances
const chargeSyncService = AdvancedMDChargeSyncService.getInstance();
const lookupService = AdvancedMDLookupService.getInstance();

// ============================================
// Middleware
// ============================================

/**
 * Verify user has admin or billing role
 */
const requireAdminOrBilling = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Handle both old single role format and new roles array format
  const userRoles = user.roles || (user.role ? [user.role] : []);

  // Use actual UserRole enum values: ADMINISTRATOR, BILLING_STAFF, SUPER_ADMIN
  const allowedRoles = ['ADMINISTRATOR', 'BILLING_STAFF', 'SUPER_ADMIN'];
  const hasAllowedRole = userRoles.some((role: string) => allowedRoles.includes(role));

  if (!hasAllowedRole) {
    return res.status(403).json({ error: 'Insufficient permissions. Admin or Billing role required.' });
  }

  next();
};

// ============================================
// Charge Submission Routes
// ============================================

/**
 * GET /api/advancedmd/billing/charges/:id/sync-status
 * Get charge sync status
 */
router.get('/charges/:id/sync-status', requireAdminOrBilling, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const charge = await prisma.chargeEntry.findUnique({
      where: { id },
      select: {
        id: true,
        advancedMDChargeId: true,
        advancedMDVisitId: true,
        syncStatus: true,
        syncError: true,
        lastSyncAttempt: true,
        chargeStatus: true,
        cptCode: true,
        chargeAmount: true,
      },
    });

    if (!charge) {
      return res.status(404).json({ error: 'Charge not found' });
    }

    res.json({
      chargeId: charge.id,
      amdChargeId: charge.advancedMDChargeId,
      amdVisitId: charge.advancedMDVisitId,
      syncStatus: charge.syncStatus,
      syncError: charge.syncError,
      lastSyncAttempt: charge.lastSyncAttempt,
      chargeStatus: charge.chargeStatus,
      isSynced: !!charge.advancedMDChargeId,
      cptCode: charge.cptCode,
      amount: charge.chargeAmount,
    });
  } catch (error: any) {
    console.error('[AdvancedMD Billing Routes] Error getting charge sync status:', error);
    res.status(500).json({ error: 'Failed to get sync status', message: error.message });
  }
});

/**
 * POST /api/advancedmd/billing/charges/:id/submit
 * Submit a single charge to AdvancedMD
 */
router.post('/charges/:id/submit', requireAdminOrBilling, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if charge exists
    const charge = await prisma.chargeEntry.findUnique({
      where: { id },
      include: { client: true },
    });

    if (!charge) {
      return res.status(404).json({ error: 'Charge not found' });
    }

    // Check if patient is synced
    if (!charge.client.advancedMDPatientId) {
      return res.status(400).json({
        error: 'Patient must be synced to AdvancedMD before submitting charges',
        requiresPatientSync: true,
      });
    }

    // Submit charge
    const result = await chargeSyncService.submitCharge(id);

    if (result.success) {
      res.json({
        success: true,
        message: 'Charge submitted successfully',
        chargeId: result.chargeId,
        amdChargeId: result.advancedMDChargeId,
        amdVisitId: result.advancedMDVisitId,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        chargeId: result.chargeId,
        validationErrors: result.validationErrors,
      });
    }
  } catch (error: any) {
    console.error('[AdvancedMD Billing Routes] Error submitting charge:', error);
    res.status(500).json({ error: 'Failed to submit charge', message: error.message });
  }
});

/**
 * POST /api/advancedmd/billing/charges/batch-submit
 * Submit multiple charges to AdvancedMD
 */
router.post('/charges/batch-submit', requireAdminOrBilling, async (req: Request, res: Response) => {
  try {
    const { chargeIds } = req.body;

    if (!chargeIds || !Array.isArray(chargeIds) || chargeIds.length === 0) {
      return res.status(400).json({ error: 'chargeIds array is required' });
    }

    // Submit charges in batch
    const result = await chargeSyncService.submitChargesBatch(chargeIds);

    res.json({
      success: true,
      message: `Batch submission completed`,
      totalCharges: result.totalCharges,
      successCount: result.successCount,
      failureCount: result.failureCount,
      results: result.results,
    });
  } catch (error: any) {
    console.error('[AdvancedMD Billing Routes] Error batch submitting charges:', error);
    res.status(500).json({ error: 'Failed to batch submit charges', message: error.message });
  }
});

/**
 * POST /api/advancedmd/billing/appointments/:id/submit-charges
 * Submit all pending charges for an appointment
 */
router.post('/appointments/:id/submit-charges', requireAdminOrBilling, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if appointment exists
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { client: true },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Check if patient is synced
    if (!appointment.client.advancedMDPatientId) {
      return res.status(400).json({
        error: 'Patient must be synced to AdvancedMD before submitting charges',
        requiresPatientSync: true,
      });
    }

    // Submit all charges for this appointment
    const result = await chargeSyncService.submitAppointmentCharges(id);

    res.json({
      success: true,
      message: `Submitted ${result.successCount} of ${result.totalCharges} charges`,
      appointmentId: id,
      totalCharges: result.totalCharges,
      successCount: result.successCount,
      failureCount: result.failureCount,
      results: result.results,
    });
  } catch (error: any) {
    console.error('[AdvancedMD Billing Routes] Error submitting appointment charges:', error);
    res.status(500).json({ error: 'Failed to submit appointment charges', message: error.message });
  }
});

/**
 * PUT /api/advancedmd/billing/charges/:id
 * Update an existing charge in AdvancedMD
 */
router.put('/charges/:id', requireAdminOrBilling, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if charge exists and is already synced
    const charge = await prisma.chargeEntry.findUnique({
      where: { id },
    });

    if (!charge) {
      return res.status(404).json({ error: 'Charge not found' });
    }

    if (!charge.advancedMDChargeId) {
      return res.status(400).json({
        error: 'Charge has not been submitted to AdvancedMD yet',
        suggestion: 'Use POST /charges/:id/submit to submit the charge first',
      });
    }

    // Update charge
    const result = await chargeSyncService.updateCharge(id);

    if (result.success) {
      res.json({
        success: true,
        message: 'Charge updated successfully',
        chargeId: result.chargeId,
        amdChargeId: result.advancedMDChargeId,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        chargeId: result.chargeId,
      });
    }
  } catch (error: any) {
    console.error('[AdvancedMD Billing Routes] Error updating charge:', error);
    res.status(500).json({ error: 'Failed to update charge', message: error.message });
  }
});

/**
 * DELETE /api/advancedmd/billing/charges/:id
 * Void a charge in AdvancedMD
 */
router.delete('/charges/:id', requireAdminOrBilling, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'reason is required for voiding charges' });
    }

    // Check if charge exists and is synced
    const charge = await prisma.chargeEntry.findUnique({
      where: { id },
    });

    if (!charge) {
      return res.status(404).json({ error: 'Charge not found' });
    }

    if (!charge.advancedMDChargeId) {
      return res.status(400).json({
        error: 'Charge has not been submitted to AdvancedMD',
        suggestion: 'Only synced charges can be voided in AdvancedMD',
      });
    }

    // Void charge
    const result = await chargeSyncService.voidCharge(id, reason);

    if (result.success) {
      res.json({
        success: true,
        message: 'Charge voided successfully',
        chargeId: result.chargeId,
        reason,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        chargeId: result.chargeId,
      });
    }
  } catch (error: any) {
    console.error('[AdvancedMD Billing Routes] Error voiding charge:', error);
    res.status(500).json({ error: 'Failed to void charge', message: error.message });
  }
});

/**
 * POST /api/advancedmd/billing/charges/sync-status/:visitId
 * Sync charge status from AdvancedMD for a visit
 */
router.post('/charges/sync-status/:visitId', requireAdminOrBilling, async (req: Request, res: Response) => {
  try {
    const { visitId } = req.params;

    await chargeSyncService.syncChargeStatusFromAdvancedMD(visitId);

    res.json({
      success: true,
      message: 'Charge status synced successfully',
      visitId,
    });
  } catch (error: any) {
    console.error('[AdvancedMD Billing Routes] Error syncing charge status:', error);
    res.status(500).json({ error: 'Failed to sync charge status', message: error.message });
  }
});

/**
 * GET /api/advancedmd/billing/charges/sync-stats
 * Get charge sync statistics
 */
router.get('/charges/sync-stats', requireAdminOrBilling, async (req: Request, res: Response) => {
  try {
    const stats = await chargeSyncService.getSyncStats();

    res.json({
      success: true,
      stats,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('[AdvancedMD Billing Routes] Error getting sync stats:', error);
    res.status(500).json({ error: 'Failed to get sync stats', message: error.message });
  }
});

// ============================================
// Code Lookup Routes
// ============================================

/**
 * GET /api/advancedmd/billing/lookup/cpt/:code
 * Lookup CPT code in AdvancedMD
 */
router.get('/lookup/cpt/:code', requireAdminOrBilling, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const result = await lookupService.lookupCPTCode(code);

    if (result.found) {
      res.json({
        success: true,
        found: true,
        code: result.code,
        amdId: result.amdId,
        description: result.description,
      });
    } else {
      res.status(404).json({
        success: false,
        found: false,
        code: result.code,
        error: `CPT code ${code} not found in AdvancedMD`,
      });
    }
  } catch (error: any) {
    console.error('[AdvancedMD Billing Routes] Error looking up CPT code:', error);
    res.status(500).json({ error: 'Failed to lookup CPT code', message: error.message });
  }
});

/**
 * GET /api/advancedmd/billing/lookup/icd/:code
 * Lookup ICD-10 code in AdvancedMD
 */
router.get('/lookup/icd/:code', requireAdminOrBilling, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const result = await lookupService.lookupICD10Code(code);

    if (result.found) {
      res.json({
        success: true,
        found: true,
        code: result.code,
        amdId: result.amdId,
        description: result.description,
      });
    } else {
      res.status(404).json({
        success: false,
        found: false,
        code: result.code,
        error: `ICD-10 code ${code} not found in AdvancedMD`,
      });
    }
  } catch (error: any) {
    console.error('[AdvancedMD Billing Routes] Error looking up ICD code:', error);
    res.status(500).json({ error: 'Failed to lookup ICD code', message: error.message });
  }
});

/**
 * GET /api/advancedmd/billing/lookup/modifier/:code
 * Lookup modifier code in AdvancedMD
 */
router.get('/lookup/modifier/:code', requireAdminOrBilling, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const result = await lookupService.lookupModifierCode(code);

    if (result.found) {
      res.json({
        success: true,
        found: true,
        code: result.code,
        amdId: result.amdId,
        description: result.description,
      });
    } else {
      res.status(404).json({
        success: false,
        found: false,
        code: result.code,
        error: `Modifier code ${code} not found in AdvancedMD`,
      });
    }
  } catch (error: any) {
    console.error('[AdvancedMD Billing Routes] Error looking up modifier code:', error);
    res.status(500).json({ error: 'Failed to lookup modifier code', message: error.message });
  }
});

/**
 * GET /api/advancedmd/billing/lookup/provider/:name
 * Lookup provider in AdvancedMD
 */
router.get('/lookup/provider/:name', requireAdminOrBilling, async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    const result = await lookupService.lookupProvider(name);

    if (result.found) {
      res.json({
        success: true,
        found: true,
        name: result.code,
        amdId: result.amdId,
        description: result.description,
      });
    } else {
      res.status(404).json({
        success: false,
        found: false,
        name: result.code,
        error: `Provider ${name} not found in AdvancedMD`,
      });
    }
  } catch (error: any) {
    console.error('[AdvancedMD Billing Routes] Error looking up provider:', error);
    res.status(500).json({ error: 'Failed to lookup provider', message: error.message });
  }
});

/**
 * GET /api/advancedmd/billing/lookup/facility/:name
 * Lookup facility in AdvancedMD
 */
router.get('/lookup/facility/:name', requireAdminOrBilling, async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    const result = await lookupService.lookupFacility(name);

    if (result.found) {
      res.json({
        success: true,
        found: true,
        name: result.code,
        amdId: result.amdId,
        description: result.description,
      });
    } else {
      res.status(404).json({
        success: false,
        found: false,
        name: result.code,
        error: `Facility ${name} not found in AdvancedMD`,
      });
    }
  } catch (error: any) {
    console.error('[AdvancedMD Billing Routes] Error looking up facility:', error);
    res.status(500).json({ error: 'Failed to lookup facility', message: error.message });
  }
});

/**
 * POST /api/advancedmd/billing/lookup/cpt/batch
 * Batch lookup CPT codes
 */
router.post('/lookup/cpt/batch', requireAdminOrBilling, async (req: Request, res: Response) => {
  try {
    const { cptCodes } = req.body;
    if (!cptCodes || !Array.isArray(cptCodes)) {
      return res.status(400).json({ error: 'cptCodes array is required' });
    }

    const results = await lookupService.lookupCPTCodesBatch(cptCodes);

    res.json({
      success: true,
      message: 'CPT codes batch lookup completed and cached',
      count: results.size,
    });
  } catch (error: any) {
    console.error('[AdvancedMD Billing Routes] Error batch looking up CPT codes:', error);
    res.status(500).json({ error: 'Failed to batch lookup CPT codes', message: error.message });
  }
});

/**
 * POST /api/advancedmd/billing/lookup/icd/batch
 * Batch lookup ICD-10 codes
 */
router.post('/lookup/icd/batch', requireAdminOrBilling, async (req: Request, res: Response) => {
  try {
    const { icdCodes } = req.body;
    if (!icdCodes || !Array.isArray(icdCodes)) {
      return res.status(400).json({ error: 'icdCodes array is required' });
    }

    const results = await lookupService.lookupICD10CodesBatch(icdCodes);

    res.json({
      success: true,
      message: 'ICD-10 codes batch lookup completed and cached',
      count: results.size,
    });
  } catch (error: any) {
    console.error('[AdvancedMD Billing Routes] Error batch looking up ICD codes:', error);
    res.status(500).json({ error: 'Failed to batch lookup ICD codes', message: error.message });
  }
});

// ============================================
// Cache Management Routes
// ============================================

/**
 * GET /api/advancedmd/billing/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', requireAdminOrBilling, async (req: Request, res: Response) => {
  try {
    const [
      cptCount,
      icdCount,
      modifierCount,
      providerCount,
      facilityCount,
      totalCount,
    ] = await Promise.all([
      prisma.advancedMDCodeCache.count({ where: { type: 'CPT' } }),
      prisma.advancedMDCodeCache.count({ where: { type: 'ICD10' } }),
      prisma.advancedMDCodeCache.count({ where: { type: 'MODIFIER' } }),
      prisma.advancedMDCodeCache.count({ where: { type: 'PROVIDER' } }),
      prisma.advancedMDCodeCache.count({ where: { type: 'FACILITY' } }),
      prisma.advancedMDCodeCache.count(),
    ]);

    // Get oldest and newest entries
    const oldest = await prisma.advancedMDCodeCache.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });

    const newest = await prisma.advancedMDCodeCache.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    res.json({
      success: true,
      cacheStats: {
        cpt: cptCount,
        icd10: icdCount,
        modifier: modifierCount,
        provider: providerCount,
        facility: facilityCount,
        total: totalCount,
      },
      oldestEntry: oldest?.createdAt,
      newestEntry: newest?.createdAt,
    });
  } catch (error: any) {
    console.error('[AdvancedMD Billing Routes] Error getting cache stats:', error);
    res.status(500).json({ error: 'Failed to get cache stats', message: error.message });
  }
});

/**
 * DELETE /api/advancedmd/billing/cache/clear
 * Clear all cached lookups
 */
router.delete('/cache/clear', requireAdminOrBilling, async (req: Request, res: Response) => {
  try {
    const { type } = req.query;

    if (type) {
      // Clear specific type
      const result = await prisma.advancedMDCodeCache.deleteMany({
        where: { type: type as string },
      });

      res.json({
        success: true,
        message: `Cleared ${result.count} ${type} cache entries`,
        deletedCount: result.count,
      });
    } else {
      // Clear all cache
      const result = await prisma.advancedMDCodeCache.deleteMany({});

      res.json({
        success: true,
        message: `Cleared all cache entries`,
        deletedCount: result.count,
      });
    }
  } catch (error: any) {
    console.error('[AdvancedMD Billing Routes] Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache', message: error.message });
  }
});

export default router;
