/**
 * Analytics Service
 * Phase 3.2: Moved database operations from controller to service
 */

import prisma from './database';
import { Prisma, AppointmentStatus } from '@mentalspace/database';
import { AppointmentStatus as AppointmentStatusConst } from '@mentalspace/shared';

// ============================================================================
// TYPES
// ============================================================================

export interface AnalyticsDateRangeFilter {
  startDate: Date;
  endDate: Date;
  providerId?: string;
  status?: string;
}

export interface AppointmentWithClinician {
  id: string;
  appointmentDate: Date;
  startTime: string;
  duration: number | null;
  status: string;
  appointmentType: string | null;
  chargeAmount: Prisma.Decimal | null;
  clinicianId: string | null;
  cancellationDate: Date | null;
  cancellationReason: string | null;
  clinician: {
    id: string;
    firstName: string;
    lastName: string;
    title?: string | null;
  } | null;
}

// ============================================================================
// SERVICE METHODS
// ============================================================================

/**
 * Get appointments with clinician data for analytics
 * Used by provider utilization, no-show rates, cancellation patterns, and capacity planning
 */
export async function getAppointmentsForAnalytics(
  filters: AnalyticsDateRangeFilter,
  includeTitle = false
): Promise<AppointmentWithClinician[]> {
  const whereClause: Prisma.AppointmentWhereInput = {
    appointmentDate: {
      gte: filters.startDate,
      lte: filters.endDate,
    },
  };

  if (filters.providerId) {
    whereClause.clinicianId = filters.providerId;
  }

  if (filters.status) {
    whereClause.status = filters.status as AppointmentStatus;
  }

  const clinicianSelect: Prisma.UserSelect = {
    id: true,
    firstName: true,
    lastName: true,
  };

  if (includeTitle) {
    clinicianSelect.title = true;
  }

  return prisma.appointment.findMany({
    where: whereClause,
    include: {
      clinician: {
        select: clinicianSelect,
      },
    },
  }) as unknown as Promise<AppointmentWithClinician[]>;
}

/**
 * Get appointments for provider utilization analysis
 * Includes title in clinician data
 */
export async function getAppointmentsForUtilization(
  startDate: Date,
  endDate: Date,
  providerId?: string
): Promise<AppointmentWithClinician[]> {
  return getAppointmentsForAnalytics(
    { startDate, endDate, providerId },
    true // include title
  );
}

/**
 * Get appointments for no-show analysis
 */
export async function getAppointmentsForNoShowAnalysis(
  startDate: Date,
  endDate: Date
): Promise<AppointmentWithClinician[]> {
  return getAppointmentsForAnalytics({ startDate, endDate });
}

/**
 * Get completed appointments for revenue analysis
 */
export async function getCompletedAppointmentsForRevenue(
  startDate: Date,
  endDate: Date,
  providerId?: string
): Promise<AppointmentWithClinician[]> {
  return getAppointmentsForAnalytics({
    startDate,
    endDate,
    providerId,
    status: AppointmentStatusConst.COMPLETED,
  });
}

/**
 * Get appointments for cancellation pattern analysis
 */
export async function getAppointmentsForCancellationAnalysis(
  startDate: Date,
  endDate: Date
): Promise<AppointmentWithClinician[]> {
  return getAppointmentsForAnalytics({ startDate, endDate });
}

/**
 * Get appointments for capacity planning
 */
export async function getAppointmentsForCapacityPlanning(
  startDate: Date,
  endDate: Date
): Promise<AppointmentWithClinician[]> {
  return getAppointmentsForAnalytics({ startDate, endDate });
}
