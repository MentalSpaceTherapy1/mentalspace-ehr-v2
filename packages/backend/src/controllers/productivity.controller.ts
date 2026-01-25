// Productivity Controller - API Endpoints for Productivity Module
// Phase 6 - Week 19
// Phase 3.2: Refactored to use productivity service

import { Request, Response } from 'express';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
import { metricService } from '../services/metrics/metricService';
import { MetricResult } from '../services/metrics/types';
import * as productivityService from '../services/productivity.service';
import { asyncHandler } from '../middleware/errorHandler';
import { sendSuccess, sendCreated } from '../utils/apiResponse';

// Phase 5.4: Type definitions for productivity module
// Phase 3.2: Removed ClientNeedingRebook - now defined in productivityService

interface TeamMemberData {
  clinician: {
    id: string;
    name: string;
    email: string;
  };
  kvr: number;
  noShowRate: number;
  unsignedNotes: number;
  sameDayDocRate: number;
  status: string;
}

interface ClinicianPerformanceData {
  clinician: {
    id: string;
    name: string;
  };
  kvr: number;
  sessionsPerDay: number;
  revenue: number;
  compliancePercent: number;
  status: string;
}

type MetricsRecord = Record<string, MetricResult | undefined>;

// ============================================================================
// DASHBOARD ENDPOINTS
// ============================================================================

/**
 * Get Clinician Dashboard Data
 * GET /api/v1/productivity/dashboard/clinician/:userId
 * Phase 3.2: Refactored to use productivityService
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

  // Phase 3.2: Use service methods instead of direct prisma calls
  const [unsignedNotes, alerts, clientsNeedingRebook] = await Promise.all([
    productivityService.getUnsignedNotes(userId, 10),
    productivityService.getActiveAlerts(userId, 10),
    productivityService.getClientsNeedingRebook(userId, 30, 5),
  ]);

  return sendSuccess(res, {
    weeklyMetrics,
    unsignedNotes,
    alerts,
    clientsNeedingRebook,
  });
});

/**
 * Get Supervisor Dashboard Data
 * GET /api/v1/productivity/dashboard/supervisor/:supervisorId
 * Phase 3.2: Refactored to use productivityService
 */
export const getSupervisorDashboard = asyncHandler(async (req: Request, res: Response) => {
  const { supervisorId } = req.params;

  // Phase 3.2: Use service method instead of direct prisma call
  const supervisees = await productivityService.getSupervisees(supervisorId);

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const teamData: TeamMemberData[] = [];

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

    // Phase 3.2: Use service method instead of direct prisma call
    const unsignedNotesCount = await productivityService.countUnsignedNotes(supervisee.id);

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

  return sendSuccess(res, {
    team: teamData,
    teamAverages,
    superviseesCount: supervisees.length,
  });
});

/**
 * Get Administrator Dashboard Data
 * GET /api/v1/productivity/dashboard/administrator
 * Phase 3.2: Refactored to use productivityService
 */
export const getAdministratorDashboard = asyncHandler(async (req: Request, res: Response) => {
  // Phase 3.2: Use service method instead of direct prisma call
  const clinicians = await productivityService.getActiveClinicians();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const clinicianPerformance: ClinicianPerformanceData[] = [];
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

  // Phase 3.2: Use service method instead of local helper
  const georgiaCompliance = await productivityService.checkGeorgiaCompliance();

  return sendSuccess(res, {
    practiceScorecard: {
      avgKVR: parseFloat(avgKVR.toFixed(2)),
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      cliniciansCount: clinicians.length,
    },
    clinicianPerformance,
    georgiaCompliance,
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

  let results: MetricsRecord;

  if (metricType) {
    const result = await metricService.calculateMetric(metricType as string, userId, start, end);
    results = { [metricType as string]: result };
  } else if (category) {
    results = await metricService.calculateMetricsByCategory(userId, category as string, start, end);
  } else {
    results = await metricService.calculateAllMetrics(userId, start, end);
  }

  return sendSuccess(res, {
    userId,
    periodStart: start,
    periodEnd: end,
    metrics: results,
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

  return sendSuccess(res, history);
});

// ============================================================================
// ALERTS ENDPOINTS
// ============================================================================

/**
 * Get Alerts for User
 * GET /api/v1/productivity/alerts/:userId
 * Phase 3.2: Refactored to use productivityService
 */
export const getAlerts = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { status, severity } = req.query;

  // Phase 3.2: Use service method instead of direct prisma call
  const alerts = await productivityService.getAlerts(userId, {
    status: status as string | undefined,
    severity: severity as string | undefined,
  });

  return sendSuccess(res, alerts);
});

/**
 * Acknowledge Alert
 * POST /api/v1/productivity/alerts/:alertId/acknowledge
 * Phase 3.2: Refactored to use productivityService
 */
export const acknowledgeAlert = asyncHandler(async (req: Request, res: Response) => {
  const { alertId } = req.params;
  const userId = req.user?.userId;

  // Phase 3.2: Use service method (audit logging moved to service)
  const alert = await productivityService.acknowledgeAlert(alertId, userId!);

  return sendSuccess(res, alert, 'Alert acknowledged successfully');
});

/**
 * Resolve Alert
 * POST /api/v1/productivity/alerts/:alertId/resolve
 * Phase 3.2: Refactored to use productivityService
 */
export const resolveAlert = asyncHandler(async (req: Request, res: Response) => {
  const { alertId } = req.params;
  const userId = req.user?.userId;

  // Phase 3.2: Use service method (audit logging moved to service)
  const alert = await productivityService.resolveAlert(alertId, userId!);

  return sendSuccess(res, alert, 'Alert resolved successfully');
});

// ============================================================================
// GOALS ENDPOINTS
// ============================================================================

/**
 * Get Goals for User
 * GET /api/v1/productivity/goals/:userId
 * Phase 3.2: Refactored to use productivityService
 */
export const getGoals = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  // Phase 3.2: Use service method instead of direct prisma call
  const goals = await productivityService.getGoals(userId);

  return sendSuccess(res, goals);
});

/**
 * Create Goal
 * POST /api/v1/productivity/goals
 * Phase 3.2: Refactored to use productivityService
 */
export const createGoal = asyncHandler(async (req: Request, res: Response) => {
  const { userId, metricType, targetValue, startDate, endDate } = req.body;

  // Phase 3.2: Use service method instead of direct prisma call
  const goal = await productivityService.createGoal({
    userId,
    metricType,
    targetValue,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  });

  return sendCreated(res, goal, 'Goal created successfully');
});

/**
 * Update Goal
 * PUT /api/v1/productivity/goals/:goalId
 * Phase 3.2: Refactored to use productivityService
 */
export const updateGoal = asyncHandler(async (req: Request, res: Response) => {
  const { goalId } = req.params;
  const { targetValue, endDate, status } = req.body;

  // Phase 3.2: Use service method instead of direct prisma call
  const goal = await productivityService.updateGoal(goalId, {
    targetValue,
    endDate: endDate ? new Date(endDate) : undefined,
    status,
  });

  return sendSuccess(res, goal, 'Goal updated successfully');
});

/**
 * Delete Goal
 * DELETE /api/v1/productivity/goals/:goalId
 * Phase 3.2: Refactored to use productivityService
 */
export const deleteGoal = asyncHandler(async (req: Request, res: Response) => {
  const { goalId } = req.params;

  // Phase 3.2: Use service method instead of direct prisma call
  await productivityService.deleteGoal(goalId);

  return sendSuccess(res, null, 'Goal deleted successfully');
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

function calculateCompliancePercent(metrics: MetricsRecord): number {
  const complianceMetrics = [
    metrics.SAME_DAY_DOCUMENTATION_RATE?.value || 0,
    metrics.TREATMENT_PLAN_CURRENCY?.value || 0,
    metrics.BILLING_COMPLIANCE_RATE?.value || 0,
  ];

  return calculateAverage(complianceMetrics);
}

// Phase 3.2: Removed local checkGeorgiaCompliance function - moved to productivityService
