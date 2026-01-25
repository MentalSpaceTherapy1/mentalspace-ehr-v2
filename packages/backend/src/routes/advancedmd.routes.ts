/**
 * AdvancedMD Integration API Routes
 *
 * Provides endpoints for:
 * - Patient synchronization
 * - Appointment/visit synchronization
 * - Sync dashboard and logs
 * - Configuration management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import {
  advancedMDPatientSync,
  advancedMDAppointmentSync,
} from '../integrations/advancedmd';
import { UserRoles } from '@mentalspace/shared';
import logger from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Apply authentication middleware to all routes
router.use(authenticate);

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
  const allowedRoles: readonly string[] = [UserRoles.ADMINISTRATOR, UserRoles.BILLING_STAFF, UserRoles.SUPER_ADMIN];
  const hasAllowedRole = userRoles.some((role: string) => allowedRoles.includes(role));

  if (!hasAllowedRole) {
    return res.status(403).json({ error: 'Insufficient permissions. Admin or Billing role required.' });
  }

  next();
};

/**
 * Verify user is authenticated
 */
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// ============================================
// Patient Sync Routes
// ============================================

/**
 * GET /api/advancedmd/patients/:clientId/sync-status
 * Get patient sync status
 */
router.get('/patients/:clientId/sync-status', requireAuth, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        advancedMDPatientId: true,
        lastSyncedToAMD: true,
        amdSyncStatus: true,
        amdSyncError: true,
      },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({
      clientId: client.id,
      amdPatientId: client.advancedMDPatientId,
      syncStatus: client.amdSyncStatus || 'not_synced',
      lastSynced: client.lastSyncedToAMD,
      syncError: client.amdSyncError,
      isSynced: !!client.advancedMDPatientId,
    });
  } catch (error: any) {
    logger.error('AdvancedMD Routes: Error getting patient sync status:', error);
    res.status(500).json({ error: 'Failed to get sync status', message: error.message });
  }
});

/**
 * POST /api/advancedmd/patients/:clientId/sync
 * Sync patient to AdvancedMD
 */
router.post('/patients/:clientId/sync', requireAdminOrBilling, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { profileId } = req.body;

    // Initialize sync service
    await advancedMDPatientSync.initialize();

    // Perform sync (profileId required for new patients)
    const result = await advancedMDPatientSync.syncPatientToAMD(clientId, profileId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Patient synced successfully',
        amdPatientId: result.advancedMDPatientId,
        syncLogId: result.syncLogId,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.errorMessage,
        syncLogId: result.syncLogId,
      });
    }
  } catch (error: any) {
    logger.error('AdvancedMD Routes: Error syncing patient:', error);
    res.status(500).json({ error: 'Failed to sync patient', message: error.message });
  }
});

/**
 * GET /api/advancedmd/patients/:clientId/sync-logs
 * Get patient sync history
 */
router.get('/patients/:clientId/sync-logs', requireAdminOrBilling, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const logs = await prisma.advancedMDSyncLog.findMany({
      where: {
        syncType: 'patient',
        entityId: clientId,
      },
      orderBy: { syncStarted: 'desc' },
      take: limit,
    });

    res.json({ logs });
  } catch (error: any) {
    logger.error('AdvancedMD Routes: Error getting patient sync logs:', error);
    res.status(500).json({ error: 'Failed to get sync logs', message: error.message });
  }
});

// ============================================
// Appointment Sync Routes
// ============================================

/**
 * GET /api/advancedmd/appointments/:appointmentId/sync-status
 * Get appointment sync status
 */
router.get('/appointments/:appointmentId/sync-status', requireAuth, async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        advancedMDVisitId: true,
        advancedMDProviderId: true,
        advancedMDFacilityId: true,
        lastSyncedToAMD: true,
        amdSyncStatus: true,
        amdSyncError: true,
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({
      appointmentId: appointment.id,
      amdVisitId: appointment.advancedMDVisitId,
      amdProviderId: appointment.advancedMDProviderId,
      amdFacilityId: appointment.advancedMDFacilityId,
      syncStatus: appointment.amdSyncStatus || 'not_synced',
      lastSynced: appointment.lastSyncedToAMD,
      syncError: appointment.amdSyncError,
      isSynced: !!appointment.advancedMDVisitId,
    });
  } catch (error: any) {
    logger.error('AdvancedMD Routes: Error getting appointment sync status:', error);
    res.status(500).json({ error: 'Failed to get sync status', message: error.message });
  }
});

/**
 * POST /api/advancedmd/appointments/:appointmentId/sync
 * Sync appointment to AdvancedMD
 */
router.post('/appointments/:appointmentId/sync', requireAdminOrBilling, async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const { providerId, facilityId } = req.body;

    // Initialize sync service
    await advancedMDAppointmentSync.initialize();

    // Check if appointment exists and has a synced patient
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { client: true },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (!appointment.client.advancedMDPatientId) {
      return res.status(400).json({
        error: 'Patient must be synced to AdvancedMD before syncing appointment',
        requiresPatientSync: true,
      });
    }

    // Perform sync
    const result = await advancedMDAppointmentSync.createAppointment(
      appointmentId,
      providerId,
      facilityId
    );

    if (result.success) {
      res.json({
        success: true,
        message: result.message || 'Appointment synced successfully',
        amdVisitId: result.advancedMDVisitId,
        appointmentId: result.appointmentId,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        appointmentId: result.appointmentId,
      });
    }
  } catch (error: any) {
    logger.error('AdvancedMD Routes: Error syncing appointment:', error);
    res.status(500).json({ error: 'Failed to sync appointment', message: error.message });
  }
});

/**
 * POST /api/advancedmd/appointments/bulk-sync
 * Bulk sync appointments by date range
 */
router.post('/appointments/bulk-sync', requireAdminOrBilling, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, providerId } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    // Initialize sync service
    await advancedMDAppointmentSync.initialize();

    const results = await advancedMDAppointmentSync.bulkSyncAppointments(
      new Date(startDate),
      new Date(endDate)
    );

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Bulk sync completed`,
      totalAppointments: results.length,
      successCount,
      errorCount,
      results,
    });
  } catch (error: any) {
    logger.error('AdvancedMD Routes: Error bulk syncing appointments:', error);
    res.status(500).json({ error: 'Failed to bulk sync appointments', message: error.message });
  }
});

/**
 * POST /api/advancedmd/appointments/pull-updates
 * Pull appointment updates from AdvancedMD
 */
router.post('/appointments/pull-updates', requireAdminOrBilling, async (req: Request, res: Response) => {
  try {
    const { since } = req.body;

    // Initialize sync service
    await advancedMDAppointmentSync.initialize();

    const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: last 24 hours

    const updates = await advancedMDAppointmentSync.getUpdatedAppointments(sinceDate);

    res.json({
      success: true,
      message: `Pulled ${updates.length} updated appointments`,
      updatedCount: updates.length,
      updates,
    });
  } catch (error: any) {
    logger.error('AdvancedMD Routes: Error pulling appointment updates:', error);
    res.status(500).json({ error: 'Failed to pull updates', message: error.message });
  }
});

/**
 * POST /api/advancedmd/appointments/:appointmentId/status-update
 * Update appointment status in AdvancedMD
 */
router.post('/appointments/:appointmentId/status-update', requireAdminOrBilling, async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    // Update local status first
    const appointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status },
    });

    // If synced to AMD, update status there too
    if (appointment.advancedMDVisitId) {
      await advancedMDAppointmentSync.initialize();

      // Update appointment in AdvancedMD
      await advancedMDAppointmentSync.updateAppointment(appointmentId);
    }

    res.json({
      success: true,
      message: 'Appointment status updated',
      appointmentId,
      status,
      syncedToAMD: !!appointment.advancedMDVisitId,
    });
  } catch (error: any) {
    logger.error('AdvancedMD Routes: Error updating appointment status:', error);
    res.status(500).json({ error: 'Failed to update status', message: error.message });
  }
});

// ============================================
// Sync Dashboard Routes
// ============================================

/**
 * GET /api/advancedmd/sync/dashboard
 * Get sync dashboard overview
 */
router.get('/sync/dashboard', requireAdminOrBilling, async (req: Request, res: Response) => {
  try {
    // Get sync statistics
    const [
      totalPatients,
      syncedPatients,
      totalAppointments,
      syncedAppointments,
      recentLogs,
      errorCount,
    ] = await Promise.all([
      prisma.client.count(),
      prisma.client.count({ where: { advancedMDPatientId: { not: null } } }),
      prisma.appointment.count(),
      prisma.appointment.count({ where: { advancedMDVisitId: { not: null } } }),
      prisma.advancedMDSyncLog.findMany({
        orderBy: { syncStarted: 'desc' },
        take: 10,
      }),
      prisma.advancedMDSyncLog.count({
        where: {
          syncStatus: 'error',
          syncStarted: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
        },
      }),
    ]);

    // Get last sync timestamps
    const lastPatientSync = await prisma.advancedMDSyncLog.findFirst({
      where: { syncType: 'patient', syncStatus: 'success' },
      orderBy: { syncCompleted: 'desc' },
      select: { syncCompleted: true },
    });

    const lastAppointmentSync = await prisma.advancedMDSyncLog.findFirst({
      where: { syncType: 'appointment', syncStatus: 'success' },
      orderBy: { syncCompleted: 'desc' },
      select: { syncCompleted: true },
    });

    res.json({
      patients: {
        total: totalPatients,
        synced: syncedPatients,
        syncedPercentage: totalPatients > 0 ? Math.round((syncedPatients / totalPatients) * 100) : 0,
        lastSync: lastPatientSync?.syncCompleted,
      },
      appointments: {
        total: totalAppointments,
        synced: syncedAppointments,
        syncedPercentage: totalAppointments > 0 ? Math.round((syncedAppointments / totalAppointments) * 100) : 0,
        lastSync: lastAppointmentSync?.syncCompleted,
      },
      recentActivity: recentLogs,
      errorCount,
    });
  } catch (error: any) {
    logger.error('AdvancedMD Routes: Error getting dashboard:', error);
    res.status(500).json({ error: 'Failed to get dashboard', message: error.message });
  }
});

/**
 * GET /api/advancedmd/sync/logs
 * Get sync operation logs with filtering
 */
router.get('/sync/logs', requireAdminOrBilling, async (req: Request, res: Response) => {
  try {
    const {
      syncType,
      syncStatus,
      syncDirection,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: any = {};

    if (syncType) where.syncType = syncType;
    if (syncStatus) where.syncStatus = syncStatus;
    if (syncDirection) where.syncDirection = syncDirection;

    const [logs, totalCount] = await Promise.all([
      prisma.advancedMDSyncLog.findMany({
        where,
        orderBy: { syncStarted: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.advancedMDSyncLog.count({ where }),
    ]);

    res.json({
      logs,
      pagination: {
        total: totalCount,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + parseInt(limit as string) < totalCount,
      },
    });
  } catch (error: any) {
    logger.error('AdvancedMD Routes: Error getting sync logs:', error);
    res.status(500).json({ error: 'Failed to get sync logs', message: error.message });
  }
});

/**
 * GET /api/advancedmd/sync/stats
 * Get sync statistics
 */
router.get('/sync/stats', requireAdminOrBilling, async (req: Request, res: Response) => {
  try {
    const { days = '7' } = req.query;
    const daysAgo = new Date(Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000);

    // Get sync counts by type and status
    const syncCounts = await prisma.advancedMDSyncLog.groupBy({
      by: ['syncType', 'syncStatus'],
      where: { syncStarted: { gte: daysAgo } },
      _count: true,
    });

    // Get average sync duration
    const avgDuration = await prisma.advancedMDSyncLog.aggregate({
      where: {
        syncStarted: { gte: daysAgo },
        syncCompleted: { not: null },
      },
      _avg: {
        durationMs: true,
      },
    });

    res.json({
      period: {
        days: parseInt(days as string),
        from: daysAgo,
        to: new Date(),
      },
      syncCounts,
      averageDuration: avgDuration._avg.durationMs,
    });
  } catch (error: any) {
    logger.error('AdvancedMD Routes: Error getting sync stats:', error);
    res.status(500).json({ error: 'Failed to get sync stats', message: error.message });
  }
});

/**
 * GET /api/advancedmd/sync/config
 * Get AdvancedMD configuration (masked credentials)
 */
router.get('/sync/config', requireAdminOrBilling, async (req: Request, res: Response) => {
  try {
    const config = await prisma.advancedMDConfig.findFirst({
      where: { environment: process.env.ADVANCEDMD_ENV || 'sandbox' },
    });

    if (!config) {
      return res.status(404).json({ error: 'AdvancedMD configuration not found' });
    }

    // Return config with masked credentials
    res.json({
      officeKey: config.officeKey,
      officeName: config.officeName,
      environment: config.environment,
      syncEnabled: config.syncEnabled,
      autoSyncPatients: config.autoSyncPatients,
      autoSyncVisits: config.autoSyncVisits,
      autoSyncClaims: config.autoSyncClaims,
      pollingIntervalPatients: config.pollingIntervalPatients,
      pollingIntervalVisits: config.pollingIntervalVisits,
      pollingIntervalClaims: config.pollingIntervalClaims,
      enableEligibilityCheck: config.enableEligibilityCheck,
      enableClaimSubmission: config.enableClaimSubmission,
      enablePaymentSync: config.enablePaymentSync,
      lastSyncAt: config.lastSyncAt,
      tokenExpiresAt: config.tokenExpiresAt,
      hasValidToken: config.tokenExpiresAt ? new Date(config.tokenExpiresAt) > new Date() : false,
    });
  } catch (error: any) {
    logger.error('AdvancedMD Routes: Error getting config:', error);
    res.status(500).json({ error: 'Failed to get config', message: error.message });
  }
});

/**
 * POST /api/advancedmd/sync/test-connection
 * Test AdvancedMD connection
 */
router.post('/sync/test-connection', requireAdminOrBilling, async (req: Request, res: Response) => {
  try {
    // Initialize services
    await advancedMDPatientSync.initialize();

    // Try to get a simple patient list to verify connection
    const testResult = await advancedMDPatientSync.lookupPatient(
      'TEST',
      'CONNECTION'
    );

    res.json({
      success: true,
      message: 'Connection test successful',
      connected: true,
      timestamp: new Date(),
    });
  } catch (error: any) {
    logger.error('AdvancedMD Routes: Connection test failed:', error);
    res.status(200).json({
      success: false,
      message: 'Connection test failed',
      connected: false,
      error: error.message,
      timestamp: new Date(),
    });
  }
});

export default router;
