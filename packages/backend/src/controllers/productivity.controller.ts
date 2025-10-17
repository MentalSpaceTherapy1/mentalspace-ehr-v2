// Productivity Controller - API Endpoints for Productivity Module
// Phase 6 - Week 19

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { metricService } from '../services/metrics/metricService';
import { logger, auditLogger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// ============================================================================
// DASHBOARD ENDPOINTS
// ============================================================================

/**
 * Get Clinician Dashboard Data
 * GET /api/v1/productivity/dashboard/clinician/:userId
 */
export const getClinicianDashboard = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  // Get current week
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
  endOfWeek.setHours(23, 59, 59, 999);

  // Calculate weekly metrics
  const weeklyMetrics = await metricService.calculateAllMetrics(userId, startOfWeek, endOfWeek);

  // Get unsigned notes
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const unsignedNotes = await prisma.clinicalNote.findMany({
    where: {
      clinicianId: userId,
      status: 'DRAFT',
      sessionDate: { lt: now },
    },
    orderBy: { sessionDate: 'asc' },
    take: 10,
    select: {
      id: true,
      sessionDate: true,
      noteType: true,
      client: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Get active alerts
  const alerts = await prisma.complianceAlert.findMany({
    where: {
      targetUserId: userId,
      status: { in: ['OPEN', 'ACKNOWLEDGED'] },
    },
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    take: 10,
  });

  // Get clients needing rebook (completed session >30 days ago, no follow-up)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentCompletedAppointments = await prisma.appointment.findMany({
    where: {
      clinicianId: userId,
      status: 'COMPLETED',
      appointmentDate: {
        gte: thirtyDaysAgo,
        lte: new Date(),
      },
    },
    select: {
      clientId: true,
      appointmentDate: true,
    },
    distinct: ['clientId'],
  });

  const clientsNeedingRebook: any[] = [];

  for (const appt of recentCompletedAppointments) {
    const hasFollowUp = await prisma.appointment.findFirst({
      where: {
        clinicianId: userId,
        clientId: appt.clientId,
        appointmentDate: { gt: appt.appointmentDate },
      },
    });

    if (!hasFollowUp) {
      const client = await prisma.client.findUnique({
        where: { id: appt.clientId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          primaryPhone: true,
        },
      });

      if (client) {
        clientsNeedingRebook.push({
          ...client,
          lastVisitDate: appt.appointmentDate,
        });
      }
    }
  }

  res.json({
    success: true,
    data: {
      weeklyMetrics,
      unsignedNotes,
      alerts,
      clientsNeedingRebook: clientsNeedingRebook.slice(0, 5),
    },
  });
});

/**
 * Get Supervisor Dashboard Data
 * GET /api/v1/productivity/dashboard/supervisor/:supervisorId
 */
export const getSupervisorDashboard = asyncHandler(async (req: Request, res: Response) => {
  const { supervisorId } = req.params;

  // Get all supervisees
  const supervisees = await prisma.user.findMany({
    where: { supervisorId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  });

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const teamData: any[] = [];

  for (const supervisee of supervisees) {
    const metrics = await metricService.calculateMetricsByCategory(
      supervisee.id,
      'clinicalProductivity',
      startOfWeek,
      endOfWeek
    );

    const docMetrics = await metricService.calculateMetricsByCategory(
      supervisee.id,
      'documentationCompliance',
      startOfWeek,
      endOfWeek
    );

    const unsignedNotesCount = await prisma.clinicalNote.count({
      where: {
        clinicianId: supervisee.id,
        status: 'DRAFT',
      },
    });

    teamData.push({
      clinician: {
        id: supervisee.id,
        name: `${supervisee.firstName} ${supervisee.lastName}`,
        email: supervisee.email,
      },
      kvr: metrics.KVR?.value || 0,
      noShowRate: metrics.NO_SHOW_RATE?.value || 0,
      unsignedNotes: unsignedNotesCount,
      sameDayDocRate: docMetrics.SAME_DAY_DOCUMENTATION_RATE?.value || 0,
      status: getClinicianStatus(metrics.KVR?.value || 0, unsignedNotesCount),
    });
  }

  // Calculate team averages
  const teamAverages = {
    avgKVR: calculateAverage(teamData.map((t) => t.kvr)),
    avgNoShowRate: calculateAverage(teamData.map((t) => t.noShowRate)),
    totalUnsignedNotes: teamData.reduce((sum, t) => sum + t.unsignedNotes, 0),
    avgSameDayDocRate: calculateAverage(teamData.map((t) => t.sameDayDocRate)),
  };

  res.json({
    success: true,
    data: {
      team: teamData,
      teamAverages,
      superviseesCount: supervisees.length,
    },
  });
});

/**
 * Get Administrator Dashboard Data
 * GET /api/v1/productivity/dashboard/administrator
 */
export const getAdministratorDashboard = asyncHandler(async (req: Request, res: Response) => {
  // Get all clinicians
  const clinicians = await prisma.user.findMany({
    where: { role: 'CLINICIAN', isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const clinicianPerformance: any[] = [];
  let totalKVR = 0;
  let totalRevenue = 0;

  for (const clinician of clinicians) {
    const metrics = await metricService.calculateAllMetrics(
      clinician.id,
      startOfMonth,
      endOfMonth
    );

    const revenue = metrics.AVG_REIMBURSEMENT_PER_SESSION?.value || 0;
    const sessionsCount = metrics.AVG_REIMBURSEMENT_PER_SESSION?.metadata?.totalSessions || 0;
    const clinicianRevenue = revenue * sessionsCount;

    totalKVR += metrics.KVR?.value || 0;
    totalRevenue += clinicianRevenue;

    clinicianPerformance.push({
      clinician: {
        id: clinician.id,
        name: `${clinician.firstName} ${clinician.lastName}`,
      },
      kvr: metrics.KVR?.value || 0,
      sessionsPerDay: metrics.SESSIONS_PER_DAY?.value || 0,
      revenue: clinicianRevenue,
      compliancePercent: calculateCompliancePercent(metrics),
      status: getClinicianStatus(metrics.KVR?.value || 0, metrics.UNSIGNED_NOTE_BACKLOG?.value || 0),
    });
  }

  // Practice-wide metrics
  const avgKVR = clinicians.length > 0 ? totalKVR / clinicians.length : 0;

  // Georgia compliance check
  const georgiaCompliance = await checkGeorgiaCompliance();

  res.json({
    success: true,
    data: {
      practiceScorecard: {
        avgKVR: parseFloat(avgKVR.toFixed(2)),
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        cliniciansCount: clinicians.length,
      },
      clinicianPerformance,
      georgiaCompliance,
    },
  });
});

// ============================================================================
// METRICS ENDPOINTS
// ============================================================================

/**
 * Get Metrics for User
 * GET /api/v1/productivity/metrics/:userId
 */
export const getMetrics = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { periodStart, periodEnd, metricType, category } = req.query;

  const start = periodStart ? new Date(periodStart as string) : getStartOfWeek();
  const end = periodEnd ? new Date(periodEnd as string) : getEndOfWeek();

  let results: Record<string, any>;

  if (metricType) {
    const result = await metricService.calculateMetric(metricType as string, userId, start, end);
    results = { [metricType as string]: result };
  } else if (category) {
    results = await metricService.calculateMetricsByCategory(userId, category as string, start, end);
  } else {
    results = await metricService.calculateAllMetrics(userId, start, end);
  }

  res.json({
    success: true,
    data: {
      userId,
      periodStart: start,
      periodEnd: end,
      metrics: results,
    },
  });
});

/**
 * Get Historical Metrics
 * GET /api/v1/productivity/metrics/:userId/history
 */
export const getHistoricalMetrics = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { metricType, limit } = req.query;

  const history = await metricService.getHistoricalMetrics(
    userId,
    metricType as string | undefined,
    limit ? parseInt(limit as string) : 30
  );

  res.json({
    success: true,
    data: history,
  });
});

// ============================================================================
// ALERTS ENDPOINTS
// ============================================================================

/**
 * Get Alerts for User
 * GET /api/v1/productivity/alerts/:userId
 */
export const getAlerts = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { status, severity } = req.query;

  const where: any = { targetUserId: userId };
  if (status) where.status = status;
  if (severity) where.severity = severity;

  const alerts = await prisma.complianceAlert.findMany({
    where,
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
  });

  res.json({
    success: true,
    data: alerts,
  });
});

/**
 * Acknowledge Alert
 * POST /api/v1/productivity/alerts/:alertId/acknowledge
 */
export const acknowledgeAlert = asyncHandler(async (req: Request, res: Response) => {
  const { alertId } = req.params;
  const userId = (req as any).user?.userId;

  const alert = await prisma.complianceAlert.update({
    where: { id: alertId },
    data: {
      status: 'ACKNOWLEDGED',
      acknowledgedAt: new Date(),
    },
  });

  auditLogger.info('Alert acknowledged', { userId, alertId });

  res.json({
    success: true,
    data: alert,
  });
});

/**
 * Resolve Alert
 * POST /api/v1/productivity/alerts/:alertId/resolve
 */
export const resolveAlert = asyncHandler(async (req: Request, res: Response) => {
  const { alertId } = req.params;
  const userId = (req as any).user?.userId;

  const alert = await prisma.complianceAlert.update({
    where: { id: alertId },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date(),
    },
  });

  auditLogger.info('Alert resolved', { userId, alertId });

  res.json({
    success: true,
    data: alert,
  });
});

// ============================================================================
// GOALS ENDPOINTS
// ============================================================================

/**
 * Get Goals for User
 * GET /api/v1/productivity/goals/:userId
 */
export const getGoals = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const goals = await prisma.performanceGoal.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    success: true,
    data: goals,
  });
});

/**
 * Create Goal
 * POST /api/v1/productivity/goals
 */
export const createGoal = asyncHandler(async (req: Request, res: Response) => {
  const { userId, metricType, targetValue, startDate, endDate } = req.body;

  const goal = await prisma.performanceGoal.create({
    data: {
      userId,
      metricType,
      targetValue,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
  });

  res.status(201).json({
    success: true,
    data: goal,
  });
});

/**
 * Update Goal
 * PUT /api/v1/productivity/goals/:goalId
 */
export const updateGoal = asyncHandler(async (req: Request, res: Response) => {
  const { goalId } = req.params;
  const { targetValue, endDate, status } = req.body;

  const goal = await prisma.performanceGoal.update({
    where: { id: goalId },
    data: {
      ...(targetValue && { targetValue }),
      ...(endDate && { endDate: new Date(endDate) }),
      ...(status && { status }),
    },
  });

  res.json({
    success: true,
    data: goal,
  });
});

/**
 * Delete Goal
 * DELETE /api/v1/productivity/goals/:goalId
 */
export const deleteGoal = asyncHandler(async (req: Request, res: Response) => {
  const { goalId } = req.params;

  await prisma.performanceGoal.delete({
    where: { id: goalId },
  });

  res.json({
    success: true,
    message: 'Goal deleted successfully',
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStartOfWeek(): Date {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
}

function getEndOfWeek(): Date {
  const startOfWeek = getStartOfWeek();
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return endOfWeek;
}

function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return parseFloat((sum / values.length).toFixed(2));
}

function getClinicianStatus(kvr: number, unsignedNotes: number): string {
  if (unsignedNotes > 5 || kvr < 70) return 'urgent';
  if (unsignedNotes > 2 || kvr < 80) return 'review';
  return 'on_track';
}

function calculateCompliancePercent(metrics: Record<string, any>): number {
  const complianceMetrics = [
    metrics.SAME_DAY_DOCUMENTATION_RATE?.value || 0,
    metrics.TREATMENT_PLAN_CURRENCY?.value || 0,
    metrics.BILLING_COMPLIANCE_RATE?.value || 0,
  ];

  return calculateAverage(complianceMetrics);
}

async function checkGeorgiaCompliance(): Promise<any> {
  // Check for notes >7 days unsigned
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const notesOver7Days = await prisma.clinicalNote.count({
    where: {
      status: 'DRAFT',
      sessionDate: { lt: sevenDaysAgo },
    },
  });

  return {
    notesOver7DaysUnsigned: notesOver7Days,
    compliant: notesOver7Days === 0,
  };
}
