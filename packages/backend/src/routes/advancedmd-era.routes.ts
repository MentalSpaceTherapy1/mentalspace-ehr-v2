/**
 * AdvancedMD ERA (Electronic Remittance Advice) Workaround Routes
 *
 * Provides endpoints for:
 * - Payment import (CSV/835 files)
 * - Payment matching
 * - Payment posting
 * - Reconciliation
 *
 * Note: AdvancedMD ERA is UI-only. These routes provide workarounds.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { AdvancedMDERAService } from '../services/advancedmd/era.service';
import { UserRoles } from '@mentalspace/shared';
import logger from '../utils/logger';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get service instance
const eraService = AdvancedMDERAService.getInstance();

// ============================================
// Middleware
// ============================================

/**
 * Verify user has appropriate role for ERA/payment management
 */
const requireBillingAccess = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userRoles = user.roles || (user.role ? [user.role] : []);
  const allowedRoles: readonly string[] = [UserRoles.ADMINISTRATOR, UserRoles.BILLING_STAFF, UserRoles.SUPER_ADMIN];
  const hasAllowedRole = userRoles.some((role: string) => allowedRoles.includes(role));

  if (!hasAllowedRole) {
    return res.status(403).json({
      error: 'Insufficient permissions. Requires admin or billing role.',
    });
  }

  next();
};

// ============================================
// Payment Import Routes
// ============================================

/**
 * POST /api/advancedmd/era/import/json
 * Import payments from JSON array
 */
router.post('/import/json', requireBillingAccess, async (req: Request, res: Response) => {
  try {
    const { records, autoMatch = true, autoPost = false } = req.body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'records array is required',
      });
    }

    if (records.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 500 records per import',
      });
    }

    const result = await eraService.importPayments(records, autoMatch, autoPost);

    res.json({
      success: true,
      message: `Imported ${result.importedCount} of ${result.totalRecords} records`,
      data: result,
    });
  } catch (error: any) {
    logger.error('ERA Routes: Error importing payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import payments',
      message: error.message,
    });
  }
});

/**
 * POST /api/advancedmd/era/import/csv
 * Import payments from CSV content
 */
router.post('/import/csv', requireBillingAccess, async (req: Request, res: Response) => {
  try {
    const { csvContent, columnMapping, autoMatch = true, autoPost = false } = req.body;

    if (!csvContent) {
      return res.status(400).json({
        success: false,
        error: 'csvContent is required',
      });
    }

    if (!columnMapping) {
      return res.status(400).json({
        success: false,
        error: 'columnMapping is required',
      });
    }

    // Parse CSV
    const records = eraService.parseCSVPayments(csvContent, columnMapping);

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid payment records found in CSV',
      });
    }

    // Import parsed records
    const result = await eraService.importPayments(records, autoMatch, autoPost);

    res.json({
      success: true,
      message: `Imported ${result.importedCount} of ${result.totalRecords} records from CSV`,
      data: result,
    });
  } catch (error: any) {
    logger.error('ERA Routes: Error importing CSV payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import CSV payments',
      message: error.message,
    });
  }
});

/**
 * POST /api/advancedmd/era/import/835
 * Import payments from 835 (ERA) file content
 */
router.post('/import/835', requireBillingAccess, async (req: Request, res: Response) => {
  try {
    const { fileContent, autoMatch = true, autoPost = false } = req.body;

    if (!fileContent) {
      return res.status(400).json({
        success: false,
        error: 'fileContent is required',
      });
    }

    // Parse 835 file
    const records = eraService.parse835File(fileContent);

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid payment records found in 835 file',
      });
    }

    // Import parsed records
    const result = await eraService.importPayments(records, autoMatch, autoPost);

    res.json({
      success: true,
      message: `Imported ${result.importedCount} of ${result.totalRecords} records from 835 file`,
      data: result,
    });
  } catch (error: any) {
    logger.error('ERA Routes: Error importing 835 file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import 835 file',
      message: error.message,
    });
  }
});

// ============================================
// Pending Payments Routes
// ============================================

/**
 * GET /api/advancedmd/era/pending
 * Get pending payments
 */
router.get('/pending', requireBillingAccess, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    const payments = await eraService.getPendingPayments(
      status as 'matched' | 'unmatched' | 'manual_review' | 'posted' | undefined
    );

    res.json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error: any) {
    logger.error('ERA Routes: Error getting pending payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending payments',
      message: error.message,
    });
  }
});

/**
 * GET /api/advancedmd/era/pending/:id
 * Get pending payment by ID
 */
router.get('/pending/:id', requireBillingAccess, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const payment = await eraService.getPendingPaymentById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Pending payment not found',
      });
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error: any) {
    logger.error('ERA Routes: Error getting pending payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending payment',
      message: error.message,
    });
  }
});

/**
 * PUT /api/advancedmd/era/pending/:id/match
 * Manually match a pending payment to a charge
 */
router.put('/pending/:id/match', requireBillingAccess, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { chargeId, claimId } = req.body;

    if (!chargeId) {
      return res.status(400).json({
        success: false,
        error: 'chargeId is required',
      });
    }

    const payment = await eraService.updatePendingPaymentMatch(id, chargeId, claimId);

    res.json({
      success: true,
      message: 'Payment matched successfully',
      data: payment,
    });
  } catch (error: any) {
    logger.error('ERA Routes: Error matching payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to match payment',
      message: error.message,
    });
  }
});

// ============================================
// Payment Posting Routes
// ============================================

/**
 * POST /api/advancedmd/era/pending/:id/post
 * Post a pending payment
 */
router.post('/pending/:id/post', requireBillingAccess, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await eraService.postPayment(id);

    if (result.success) {
      res.json({
        success: true,
        message: 'Payment posted successfully',
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    logger.error('ERA Routes: Error posting payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to post payment',
      message: error.message,
    });
  }
});

/**
 * POST /api/advancedmd/era/batch-post
 * Post multiple pending payments
 */
router.post('/batch-post', requireBillingAccess, async (req: Request, res: Response) => {
  try {
    const { pendingPaymentIds } = req.body;

    if (!pendingPaymentIds || !Array.isArray(pendingPaymentIds) || pendingPaymentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'pendingPaymentIds array is required',
      });
    }

    if (pendingPaymentIds.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 payments per batch',
      });
    }

    const results = await eraService.postPaymentsBatch(pendingPaymentIds);

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    res.json({
      success: true,
      message: `Posted ${successCount} of ${pendingPaymentIds.length} payments`,
      summary: {
        total: pendingPaymentIds.length,
        success: successCount,
        failed: failureCount,
      },
      results,
    });
  } catch (error: any) {
    logger.error('ERA Routes: Error batch posting payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to batch post payments',
      message: error.message,
    });
  }
});

/**
 * POST /api/advancedmd/era/post-all-matched
 * Post all matched pending payments
 */
router.post('/post-all-matched', requireBillingAccess, async (req: Request, res: Response) => {
  try {
    const results = await eraService.postAllMatchedPayments();

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    res.json({
      success: true,
      message: `Posted ${successCount} of ${results.length} matched payments`,
      summary: {
        total: results.length,
        success: successCount,
        failed: failureCount,
      },
      results,
    });
  } catch (error: any) {
    logger.error('ERA Routes: Error posting all matched payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to post all matched payments',
      message: error.message,
    });
  }
});

// ============================================
// Reconciliation Routes
// ============================================

/**
 * POST /api/advancedmd/era/reconcile
 * Reconcile local payments with AdvancedMD
 */
router.post('/reconcile', requireBillingAccess, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required',
      });
    }

    const result = await eraService.reconcilePayments(
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      success: result.success,
      message: result.success
        ? `Reconciled ${result.reconciledCount} of ${result.totalPayments} payments`
        : 'Reconciliation failed',
      data: result,
    });
  } catch (error: any) {
    logger.error('ERA Routes: Error reconciling payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reconcile payments',
      message: error.message,
    });
  }
});

// ============================================
// Statistics Routes
// ============================================

/**
 * GET /api/advancedmd/era/stats
 * Get ERA import statistics
 */
router.get('/stats', requireBillingAccess, async (req: Request, res: Response) => {
  try {
    const stats = await eraService.getImportStatistics();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('ERA Routes: Error getting ERA stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get ERA statistics',
      message: error.message,
    });
  }
});

export default router;
