/**
 * Productivity Service
 * Phase 3.2: Extracted from productivity.controller.ts
 *
 * Handles all database operations for productivity module:
 * - Dashboard data retrieval
 * - Alerts management
 * - Goals CRUD
 * - Compliance checks
 */

import prisma from './database';
import { auditLogger } from '../utils/logger';
import { UserRoles, AppointmentStatus as AppointmentStatusConst, NoteStatus } from '@mentalspace/shared';
import { Prisma } from '@mentalspace/database';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ClientNeedingRebook {
  id: string;
  firstName: string;
  lastName: string;
  primaryPhone: string | null;
  lastVisitDate: Date;
}

interface UnsignedNoteInfo {
  id: string;
  sessionDate: Date | null;
  noteType: string;
  client: {
    firstName: string;
    lastName: string;
  } | null;
}

interface SuperviseeInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
}

interface ClinicianBasicInfo {
  id: string;
  firstName: string;
  lastName: string;
}

interface GeorgiaComplianceResult {
  notesOver7DaysUnsigned: number;
  compliant: boolean;
}

// ============================================================================
// DASHBOARD DATA METHODS
// ============================================================================

/**
 * Get unsigned notes for a clinician
 */
export async function getUnsignedNotes(
  clinicianId: string,
  limit: number = 10
): Promise<UnsignedNoteInfo[]> {
  const now = new Date();

  return prisma.clinicalNote.findMany({
    where: {
      clinicianId,
      status: NoteStatus.DRAFT,
      sessionDate: { lt: now },
    },
    orderBy: { sessionDate: 'asc' },
    take: limit,
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
}

/**
 * Get active compliance alerts for a user
 */
export async function getActiveAlerts(userId: string, limit: number = 10) {
  return prisma.complianceAlert.findMany({
    where: {
      targetUserId: userId,
      status: { in: ['OPEN', 'ACKNOWLEDGED'] },
    },
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });
}

/**
 * Get clients needing rebook (completed session, no follow-up scheduled)
 */
export async function getClientsNeedingRebook(
  clinicianId: string,
  daysBack: number = 30,
  limit: number = 5
): Promise<ClientNeedingRebook[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const recentCompletedAppointments = await prisma.appointment.findMany({
    where: {
      clinicianId,
      status: AppointmentStatusConst.COMPLETED,
      appointmentDate: {
        gte: cutoffDate,
        lte: new Date(),
      },
    },
    select: {
      clientId: true,
      appointmentDate: true,
    },
    distinct: ['clientId'],
  });

  const clientsNeedingRebook: ClientNeedingRebook[] = [];

  for (const appt of recentCompletedAppointments) {
    const hasFollowUp = await prisma.appointment.findFirst({
      where: {
        clinicianId,
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

    // Stop early if we have enough
    if (clientsNeedingRebook.length >= limit) break;
  }

  return clientsNeedingRebook.slice(0, limit);
}

/**
 * Get supervisees for a supervisor
 */
export async function getSupervisees(supervisorId: string): Promise<SuperviseeInfo[]> {
  return prisma.user.findMany({
    where: { supervisorId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      roles: true,
    },
  });
}

/**
 * Count unsigned notes for a clinician
 */
export async function countUnsignedNotes(clinicianId: string): Promise<number> {
  return prisma.clinicalNote.count({
    where: {
      clinicianId,
      status: NoteStatus.DRAFT,
    },
  });
}

/**
 * Get all active clinicians
 */
export async function getActiveClinicians(): Promise<ClinicianBasicInfo[]> {
  return prisma.user.findMany({
    where: { roles: { hasSome: [UserRoles.CLINICIAN] }, isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  });
}

/**
 * Check Georgia compliance (notes >7 days unsigned)
 */
export async function checkGeorgiaCompliance(): Promise<GeorgiaComplianceResult> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const notesOver7Days = await prisma.clinicalNote.count({
    where: {
      status: NoteStatus.DRAFT,
      sessionDate: { lt: sevenDaysAgo },
    },
  });

  return {
    notesOver7DaysUnsigned: notesOver7Days,
    compliant: notesOver7Days === 0,
  };
}

// ============================================================================
// ALERTS METHODS
// ============================================================================

/**
 * Get alerts with optional filtering
 */
export async function getAlerts(
  userId: string,
  options?: { status?: string; severity?: string }
) {
  const where: Prisma.ComplianceAlertWhereInput = { targetUserId: userId };
  if (options?.status) where.status = options.status;
  if (options?.severity) where.severity = options.severity;

  return prisma.complianceAlert.findMany({
    where,
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
  });
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string, userId: string) {
  const alert = await prisma.complianceAlert.update({
    where: { id: alertId },
    data: {
      status: 'ACKNOWLEDGED',
      acknowledgedAt: new Date(),
    },
  });

  auditLogger.info('Alert acknowledged', { userId, alertId });

  return alert;
}

/**
 * Resolve an alert
 */
export async function resolveAlert(alertId: string, userId: string) {
  const alert = await prisma.complianceAlert.update({
    where: { id: alertId },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date(),
    },
  });

  auditLogger.info('Alert resolved', { userId, alertId });

  return alert;
}

// ============================================================================
// GOALS METHODS
// ============================================================================

/**
 * Get goals for a user
 */
export async function getGoals(userId: string) {
  return prisma.performanceGoal.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Create a new goal
 */
export async function createGoal(data: {
  userId: string;
  metricType: string;
  targetValue: number;
  startDate: Date;
  endDate: Date;
}) {
  return prisma.performanceGoal.create({
    data: {
      userId: data.userId,
      metricType: data.metricType,
      targetValue: data.targetValue,
      startDate: data.startDate,
      endDate: data.endDate,
    },
  });
}

/**
 * Update a goal
 */
export async function updateGoal(
  goalId: string,
  data: { targetValue?: number; endDate?: Date; status?: string }
) {
  return prisma.performanceGoal.update({
    where: { id: goalId },
    data: {
      ...(data.targetValue !== undefined && { targetValue: data.targetValue }),
      ...(data.endDate && { endDate: data.endDate }),
      ...(data.status && { status: data.status }),
    },
  });
}

/**
 * Delete a goal
 */
export async function deleteGoal(goalId: string) {
  return prisma.performanceGoal.delete({
    where: { id: goalId },
  });
}
