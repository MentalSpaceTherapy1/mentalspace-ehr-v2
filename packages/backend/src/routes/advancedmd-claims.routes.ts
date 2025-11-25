/**
 * AdvancedMD Claims API Routes
 *
 * Provides endpoints for:
 * - Claim creation and submission
 * - Claim status tracking
 * - Claim resubmission
 * - Claim statistics
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { AdvancedMDClaimsService } from '../services/advancedmd/claims.service';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get service instance
const claimsService = AdvancedMDClaimsService.getInstance();

// ============================================
// Middleware
// ============================================

/**
 * Verify user has appropriate role for claims management
 */
const requireClaimsAccess = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Handle both old single role format and new roles array format
  const userRoles = user.roles || (user.role ? [user.role] : []);

  // Use actual UserRole enum values - claims are billing-sensitive
  const allowedRoles = ['ADMINISTRATOR', 'BILLING_STAFF', 'SUPER_ADMIN'];
  const hasAllowedRole = userRoles.some((role: string) => allowedRoles.includes(role));

  if (!hasAllowedRole) {
    return res.status(403).json({
      error: 'Insufficient permissions. Requires admin or billing role.',
    });
  }

  next();
};

// ============================================
// Claim Creation Routes
// ============================================

/**
 * POST /api/advancedmd/claims
 * Create a new claim from charges
 */
router.post('/', requireClaimsAccess, async (req: Request, res: Response) => {
  try {
    const { chargeIds, includeSecondaryInsurance, autoSubmit, notes } = req.body;

    if (!chargeIds || !Array.isArray(chargeIds) || chargeIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'chargeIds array is required',
      });
    }

    const result = await claimsService.createClaim({
      chargeIds,
      includeSecondaryInsurance,
      autoSubmit,
      notes,
    });

    if (result.success) {
      res.status(201).json({
        success: true,
        message: autoSubmit ? 'Claim created and submitted' : 'Claim created',
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        validationErrors: result.validationErrors,
      });
    }
  } catch (error: any) {
    console.error('[Claims Routes] Error creating claim:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create claim',
      message: error.message,
    });
  }
});

/**
 * POST /api/advancedmd/claims/:claimId/submit
 * Submit a claim to AdvancedMD/Waystar
 */
router.post('/:claimId/submit', requireClaimsAccess, async (req: Request, res: Response) => {
  try {
    const { claimId } = req.params;

    const result = await claimsService.submitClaim(claimId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Claim submitted successfully',
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('[Claims Routes] Error submitting claim:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit claim',
      message: error.message,
    });
  }
});

/**
 * POST /api/advancedmd/claims/batch-submit
 * Submit multiple claims
 */
router.post('/batch-submit', requireClaimsAccess, async (req: Request, res: Response) => {
  try {
    const { claimIds } = req.body;

    if (!claimIds || !Array.isArray(claimIds) || claimIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'claimIds array is required',
      });
    }

    if (claimIds.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 20 claims per batch submission',
      });
    }

    const results = await claimsService.submitClaimsBatch(claimIds);

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    res.json({
      success: true,
      message: `Submitted ${successCount} of ${claimIds.length} claims`,
      summary: {
        total: claimIds.length,
        success: successCount,
        failed: failureCount,
      },
      results,
    });
  } catch (error: any) {
    console.error('[Claims Routes] Error batch submitting claims:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to batch submit claims',
      message: error.message,
    });
  }
});

/**
 * POST /api/advancedmd/claims/:claimId/resubmit
 * Resubmit a rejected/denied claim
 */
router.post('/:claimId/resubmit', requireClaimsAccess, async (req: Request, res: Response) => {
  try {
    const { claimId } = req.params;
    const { corrections } = req.body;

    const result = await claimsService.resubmitClaim(claimId, corrections);

    if (result.success) {
      res.json({
        success: true,
        message: 'Claim resubmitted successfully',
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('[Claims Routes] Error resubmitting claim:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resubmit claim',
      message: error.message,
    });
  }
});

// ============================================
// Claim Status Routes
// ============================================

/**
 * GET /api/advancedmd/claims/:claimId/status
 * Get claim status from AdvancedMD
 */
router.get('/:claimId/status', requireClaimsAccess, async (req: Request, res: Response) => {
  try {
    const { claimId } = req.params;

    const result = await claimsService.checkClaimStatus(claimId);

    if (result.success) {
      res.json({
        success: true,
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('[Claims Routes] Error checking claim status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check claim status',
      message: error.message,
    });
  }
});

/**
 * POST /api/advancedmd/claims/batch-status
 * Check status for multiple claims
 */
router.post('/batch-status', requireClaimsAccess, async (req: Request, res: Response) => {
  try {
    const { claimIds } = req.body;

    if (!claimIds || !Array.isArray(claimIds) || claimIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'claimIds array is required',
      });
    }

    if (claimIds.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 50 claims per batch status check',
      });
    }

    const result = await claimsService.checkClaimStatusBatch(claimIds);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[Claims Routes] Error batch checking claim status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to batch check claim status',
      message: error.message,
    });
  }
});

/**
 * POST /api/advancedmd/claims/check-all-pending
 * Check status for all pending claims
 */
router.post('/check-all-pending', requireClaimsAccess, async (req: Request, res: Response) => {
  try {
    const result = await claimsService.checkAllPendingClaimsStatus();

    res.json({
      success: true,
      message: `Checked ${result.totalChecked} pending claims`,
      data: result,
    });
  } catch (error: any) {
    console.error('[Claims Routes] Error checking all pending claims:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check pending claims',
      message: error.message,
    });
  }
});

// ============================================
// Claim Query Routes
// ============================================

/**
 * GET /api/advancedmd/claims
 * Get claims by date range and status
 */
router.get('/', requireClaimsAccess, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, status } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required',
      });
    }

    const claims = await claimsService.getClaimsByDateRange(
      new Date(startDate as string),
      new Date(endDate as string),
      status as any
    );

    res.json({
      success: true,
      count: claims.length,
      data: claims,
    });
  } catch (error: any) {
    console.error('[Claims Routes] Error getting claims:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get claims',
      message: error.message,
    });
  }
});

/**
 * GET /api/advancedmd/claims/stats
 * Get claim statistics
 */
router.get('/stats', requireClaimsAccess, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const stats = await claimsService.getClaimStatistics(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('[Claims Routes] Error getting claim statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get claim statistics',
      message: error.message,
    });
  }
});

export default router;
