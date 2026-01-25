/**
 * Treatment Plan Compliance Service
 * Phase 5.x: Service for tracking treatment plan compliance status
 *
 * Business Rules:
 * - Treatment plans must be renewed every 90 days (Georgia compliance)
 * - Notifications start at day 60 (30 days before deadline)
 * - Notes blocked for clients with overdue treatment plans
 */

import prisma from './database';
import logger from '../utils/logger';

export type TreatmentPlanComplianceStatus = 'CURRENT' | 'DUE_SOON' | 'OVERDUE' | 'NEVER';

export interface ClientTreatmentPlanStatus {
  clientId: string;
  clientName: string;
  medicalRecordNumber: string;
  status: TreatmentPlanComplianceStatus;
  lastTreatmentPlanDate: Date | null;
  daysSincePlan: number | null;
  daysUntilDue: number | null;
  daysOverdue: number | null;
  clinicianId: string;
  clinicianName: string;
}

export interface TreatmentPlanComplianceSummary {
  current: number;
  dueSoon: number;
  overdue: number;
  never: number;
  total: number;
  complianceRate: number;
}

export interface DashboardTreatmentPlanData {
  summary: TreatmentPlanComplianceSummary;
  overdueClients: ClientTreatmentPlanStatus[];
  dueSoonClients: ClientTreatmentPlanStatus[];
}

const VALIDITY_PERIOD_DAYS = 90;
const DUE_SOON_THRESHOLD_DAYS = 30;

/**
 * Calculate treatment plan status for a single client
 */
export function calculateStatus(
  signedDate: Date | null,
  validityPeriodDays: number = VALIDITY_PERIOD_DAYS,
  dueSoonThresholdDays: number = DUE_SOON_THRESHOLD_DAYS
): {
  status: TreatmentPlanComplianceStatus;
  daysSincePlan: number | null;
  daysUntilDue: number | null;
  daysOverdue: number | null;
} {
  if (!signedDate) {
    return {
      status: 'NEVER',
      daysSincePlan: null,
      daysUntilDue: null,
      daysOverdue: null,
    };
  }

  const now = new Date();
  const daysSincePlan = Math.floor(
    (now.getTime() - signedDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSincePlan > validityPeriodDays) {
    return {
      status: 'OVERDUE',
      daysSincePlan,
      daysUntilDue: null,
      daysOverdue: daysSincePlan - validityPeriodDays,
    };
  }

  const daysUntilDue = validityPeriodDays - daysSincePlan;

  if (daysUntilDue <= dueSoonThresholdDays) {
    return {
      status: 'DUE_SOON',
      daysSincePlan,
      daysUntilDue,
      daysOverdue: null,
    };
  }

  return {
    status: 'CURRENT',
    daysSincePlan,
    daysUntilDue,
    daysOverdue: null,
  };
}

/**
 * Get treatment plan status for a specific client
 */
export async function getClientTreatmentPlanStatus(
  clientId: string
): Promise<ClientTreatmentPlanStatus | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      medicalRecordNumber: true,
      primaryTherapistId: true,
      primaryTherapist: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      clinicalNotes: {
        where: {
          noteType: 'Treatment Plan',
          status: { in: ['SIGNED', 'COSIGNED', 'LOCKED'] },
        },
        orderBy: { signedDate: 'desc' },
        take: 1,
        select: {
          signedDate: true,
        },
      },
    },
  });

  if (!client) {
    return null;
  }

  const latestPlan = client.clinicalNotes[0];
  const statusCalc = calculateStatus(latestPlan?.signedDate || null);

  return {
    clientId: client.id,
    clientName: `${client.firstName} ${client.lastName}`,
    medicalRecordNumber: client.medicalRecordNumber,
    status: statusCalc.status,
    lastTreatmentPlanDate: latestPlan?.signedDate || null,
    daysSincePlan: statusCalc.daysSincePlan,
    daysUntilDue: statusCalc.daysUntilDue,
    daysOverdue: statusCalc.daysOverdue,
    clinicianId: client.primaryTherapistId,
    clinicianName: client.primaryTherapist
      ? `${client.primaryTherapist.firstName} ${client.primaryTherapist.lastName}`
      : 'Unassigned',
  };
}

/**
 * Get treatment plan compliance for all active clients
 */
export async function getAllClientsTreatmentPlanStatus(
  clinicianId?: string
): Promise<ClientTreatmentPlanStatus[]> {
  const whereClause: Record<string, unknown> = {
    status: 'ACTIVE',
    deletedAt: null,
  };

  if (clinicianId) {
    whereClause.primaryTherapistId = clinicianId;
  }

  const clients = await prisma.client.findMany({
    where: whereClause,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      medicalRecordNumber: true,
      primaryTherapistId: true,
      primaryTherapist: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      clinicalNotes: {
        where: {
          noteType: 'Treatment Plan',
          status: { in: ['SIGNED', 'COSIGNED', 'LOCKED'] },
        },
        orderBy: { signedDate: 'desc' },
        take: 1,
        select: {
          signedDate: true,
        },
      },
    },
  });

  return clients.map((client) => {
    const latestPlan = client.clinicalNotes[0];
    const statusCalc = calculateStatus(latestPlan?.signedDate || null);

    return {
      clientId: client.id,
      clientName: `${client.firstName} ${client.lastName}`,
      medicalRecordNumber: client.medicalRecordNumber,
      status: statusCalc.status,
      lastTreatmentPlanDate: latestPlan?.signedDate || null,
      daysSincePlan: statusCalc.daysSincePlan,
      daysUntilDue: statusCalc.daysUntilDue,
      daysOverdue: statusCalc.daysOverdue,
      clinicianId: client.primaryTherapistId,
      clinicianName: client.primaryTherapist
        ? `${client.primaryTherapist.firstName} ${client.primaryTherapist.lastName}`
        : 'Unassigned',
    };
  });
}

/**
 * Get treatment plan compliance summary
 */
export async function getTreatmentPlanComplianceSummary(
  clinicianId?: string
): Promise<TreatmentPlanComplianceSummary> {
  const allStatuses = await getAllClientsTreatmentPlanStatus(clinicianId);

  const summary = {
    current: 0,
    dueSoon: 0,
    overdue: 0,
    never: 0,
    total: allStatuses.length,
    complianceRate: 0,
  };

  for (const status of allStatuses) {
    switch (status.status) {
      case 'CURRENT':
        summary.current++;
        break;
      case 'DUE_SOON':
        summary.dueSoon++;
        break;
      case 'OVERDUE':
        summary.overdue++;
        break;
      case 'NEVER':
        summary.never++;
        break;
    }
  }

  // Compliance rate = (current + due soon) / total * 100
  if (summary.total > 0) {
    summary.complianceRate = Math.round(
      ((summary.current + summary.dueSoon) / summary.total) * 100
    );
  }

  return summary;
}

/**
 * Get dashboard data for treatment plan compliance widget
 */
export async function getDashboardTreatmentPlanData(
  clinicianId?: string,
  limit: number = 10
): Promise<DashboardTreatmentPlanData> {
  const allStatuses = await getAllClientsTreatmentPlanStatus(clinicianId);

  const overdueClients = allStatuses
    .filter((s) => s.status === 'OVERDUE' || s.status === 'NEVER')
    .sort((a, b) => (b.daysOverdue || 999) - (a.daysOverdue || 999))
    .slice(0, limit);

  const dueSoonClients = allStatuses
    .filter((s) => s.status === 'DUE_SOON')
    .sort((a, b) => (a.daysUntilDue || 0) - (b.daysUntilDue || 0))
    .slice(0, limit);

  const summary = {
    current: 0,
    dueSoon: 0,
    overdue: 0,
    never: 0,
    total: allStatuses.length,
    complianceRate: 0,
  };

  for (const status of allStatuses) {
    switch (status.status) {
      case 'CURRENT':
        summary.current++;
        break;
      case 'DUE_SOON':
        summary.dueSoon++;
        break;
      case 'OVERDUE':
        summary.overdue++;
        break;
      case 'NEVER':
        summary.never++;
        break;
    }
  }

  if (summary.total > 0) {
    summary.complianceRate = Math.round(
      ((summary.current + summary.dueSoon) / summary.total) * 100
    );
  }

  return {
    summary,
    overdueClients,
    dueSoonClients,
  };
}

/**
 * Check if a client has an overdue treatment plan (blocks note creation)
 */
export async function isClientTreatmentPlanOverdue(
  clientId: string
): Promise<{
  isOverdue: boolean;
  status: TreatmentPlanComplianceStatus;
  daysOverdue: number | null;
  message: string | null;
}> {
  const clientStatus = await getClientTreatmentPlanStatus(clientId);

  if (!clientStatus) {
    return {
      isOverdue: false,
      status: 'NEVER',
      daysOverdue: null,
      message: 'Client not found',
    };
  }

  const isOverdue = clientStatus.status === 'OVERDUE' || clientStatus.status === 'NEVER';

  let message: string | null = null;
  if (isOverdue) {
    if (clientStatus.status === 'NEVER') {
      message = `This client does not have a treatment plan. Georgia Board requires a treatment plan before clinical notes can be created.`;
    } else {
      message = `This client's treatment plan is ${clientStatus.daysOverdue} days overdue. Georgia Board requires treatment plans to be renewed every 90 days.`;
    }
  }

  return {
    isOverdue,
    status: clientStatus.status,
    daysOverdue: clientStatus.daysOverdue,
    message,
  };
}

/**
 * Log treatment plan compliance check
 */
export function logComplianceCheck(
  clientId: string,
  clinicianId: string,
  status: TreatmentPlanComplianceStatus,
  action: string
): void {
  logger.info('Treatment plan compliance check', {
    clientId,
    clinicianId,
    status,
    action,
    timestamp: new Date().toISOString(),
  });
}
