/**
 * AdvancedMD Eligibility API Routes
 *
 * Provides endpoints for:
 * - Real-time eligibility verification
 * - Batch eligibility checks
 * - Eligibility history
 * - Cache management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import {
  AdvancedMDEligibilityService,
  EligibilityCheckResult,
} from '../services/advancedmd/eligibility.service';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get service instance
const eligibilityService = AdvancedMDEligibilityService.getInstance();

// ============================================
// Middleware
// ============================================

/**
 * Verify user has appropriate role for eligibility checks
 */
const requireEligibilityAccess = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Handle both old single role format and new roles array format
  const userRoles = user.roles || (user.role ? [user.role] : []);

  // Use actual UserRole enum values
  const allowedRoles = ['ADMINISTRATOR', 'BILLING_STAFF', 'SUPER_ADMIN', 'CLINICIAN', 'FRONT_DESK'];
  const hasAllowedRole = userRoles.some((role: string) => allowedRoles.includes(role));

  if (!hasAllowedRole) {
    return res.status(403).json({
      error: 'Insufficient permissions. Requires admin, billing, clinician, or front desk role.',
    });
  }

  next();
};

// ============================================
// Eligibility Check Routes
// ============================================

/**
 * GET /api/advancedmd/eligibility/client/:clientId
 * Check eligibility for a client
 */
router.get('/client/:clientId', requireEligibilityAccess, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { insuranceId, serviceDate, skipCache } = req.query;

    const result = await eligibilityService.checkEligibility(
      clientId,
      insuranceId as string | undefined,
      serviceDate ? new Date(serviceDate as string) : undefined,
      skipCache === 'true'
    );

    if (result.success) {
      res.json({
        success: true,
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        data: result,
      });
    }
  } catch (error: any) {
    console.error('[Eligibility Routes] Error checking eligibility:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check eligibility',
      message: error.message,
    });
  }
});

/**
 * GET /api/advancedmd/eligibility/appointment/:appointmentId
 * Check eligibility for an appointment
 */
router.get('/appointment/:appointmentId', requireEligibilityAccess, async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;

    const result = await eligibilityService.checkEligibilityForAppointment(appointmentId);

    if (result.success) {
      res.json({
        success: true,
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        data: result,
      });
    }
  } catch (error: any) {
    console.error('[Eligibility Routes] Error checking appointment eligibility:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check eligibility',
      message: error.message,
    });
  }
});

/**
 * POST /api/advancedmd/eligibility/batch
 * Check eligibility for multiple clients
 */
router.post('/batch', requireEligibilityAccess, async (req: Request, res: Response) => {
  try {
    const { clientIds, serviceDate } = req.body;

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'clientIds array is required',
      });
    }

    if (clientIds.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 50 clients per batch',
      });
    }

    const result = await eligibilityService.checkEligibilityBatch(
      clientIds,
      serviceDate ? new Date(serviceDate) : undefined
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[Eligibility Routes] Error in batch eligibility check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check eligibility batch',
      message: error.message,
    });
  }
});

/**
 * POST /api/advancedmd/eligibility/date-appointments
 * Check eligibility for all appointments on a date
 */
router.post('/date-appointments', requireEligibilityAccess, async (req: Request, res: Response) => {
  try {
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'date is required',
      });
    }

    const result = await eligibilityService.checkEligibilityForDateAppointments(new Date(date));

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[Eligibility Routes] Error checking date appointments eligibility:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check eligibility',
      message: error.message,
    });
  }
});

// ============================================
// Eligibility History Routes
// ============================================

/**
 * GET /api/advancedmd/eligibility/history/:clientId
 * Get eligibility check history for a client
 */
router.get('/history/:clientId', requireEligibilityAccess, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { limit } = req.query;

    const history = await eligibilityService.getEligibilityHistory(
      clientId,
      limit ? parseInt(limit as string, 10) : 10
    );

    res.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    console.error('[Eligibility Routes] Error getting eligibility history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get eligibility history',
      message: error.message,
    });
  }
});

/**
 * GET /api/advancedmd/eligibility/last/:clientId
 * Get last eligibility check for a client
 */
router.get('/last/:clientId', requireEligibilityAccess, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { insuranceId } = req.query;

    const lastCheck = await eligibilityService.getLastEligibilityCheck(
      clientId,
      insuranceId as string | undefined
    );

    if (lastCheck) {
      res.json({
        success: true,
        data: lastCheck,
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'No eligibility check found for this client',
      });
    }
  } catch (error: any) {
    console.error('[Eligibility Routes] Error getting last eligibility check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get last eligibility check',
      message: error.message,
    });
  }
});

// ============================================
// Cache Management Routes
// ============================================

/**
 * GET /api/advancedmd/eligibility/cache/stats
 * Get eligibility cache statistics
 */
router.get('/cache/stats', requireEligibilityAccess, async (req: Request, res: Response) => {
  try {
    const stats = eligibilityService.getCacheStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('[Eligibility Routes] Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache stats',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/advancedmd/eligibility/cache/client/:clientId
 * Clear eligibility cache for a specific client
 */
router.delete('/cache/client/:clientId', requireEligibilityAccess, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    eligibilityService.clearClientCache(clientId);

    res.json({
      success: true,
      message: `Cache cleared for client ${clientId}`,
    });
  } catch (error: any) {
    console.error('[Eligibility Routes] Error clearing client cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear client cache',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/advancedmd/eligibility/cache/all
 * Clear all eligibility cache (admin only)
 */
router.delete('/cache/all', requireEligibilityAccess, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userRoles = user.roles || (user.role ? [user.role] : []);

    // Only allow admins to clear all cache
    if (!userRoles.includes('ADMINISTRATOR') && !userRoles.includes('SUPER_ADMIN')) {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can clear all cache',
      });
    }

    eligibilityService.clearAllCache();

    res.json({
      success: true,
      message: 'All eligibility cache cleared',
    });
  } catch (error: any) {
    console.error('[Eligibility Routes] Error clearing all cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear all cache',
      message: error.message,
    });
  }
});

export default router;
