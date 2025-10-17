// Clinical Productivity Metrics (#2-5)
// Phase 6 - Week 18 - Clinical Productivity Metrics

import { PrismaClient } from '@prisma/client';
import { MetricCalculator, MetricResult } from './types';

const prisma = new PrismaClient();

// No-Show Rate Calculator
export class NoShowRateCalculator implements MetricCalculator {
  metricType = 'NO_SHOW_RATE';

  async calculate(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MetricResult> {
    const totalScheduled = await prisma.appointment.count({
      where: {
        clinicianId: userId,
        appointmentDate: { gte: periodStart, lte: periodEnd },
        status: { notIn: ['CANCELLED', 'RESCHEDULED'] },
      },
    });

    const noShows = await prisma.appointment.count({
      where: {
        clinicianId: userId,
        appointmentDate: { gte: periodStart, lte: periodEnd },
        status: 'NO_SHOW',
      },
    });

    if (totalScheduled === 0) {
      return { value: 0, metadata: { numerator: 0, denominator: 0 } };
    }

    const rate = (noShows / totalScheduled) * 100;

    return {
      value: parseFloat(rate.toFixed(2)),
      metadata: { numerator: noShows, denominator: totalScheduled },
    };
  }
}

// Cancellation Rate Calculator
export class CancellationRateCalculator implements MetricCalculator {
  metricType = 'CANCELLATION_RATE';

  async calculate(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MetricResult> {
    // Total scheduled (before cancellations)
    const totalScheduled = await prisma.appointment.count({
      where: {
        clinicianId: userId,
        appointmentDate: { gte: periodStart, lte: periodEnd },
      },
    });

    const cancelled = await prisma.appointment.count({
      where: {
        clinicianId: userId,
        appointmentDate: { gte: periodStart, lte: periodEnd },
        status: 'CANCELLED',
      },
    });

    if (totalScheduled === 0) {
      return { value: 0, metadata: { numerator: 0, denominator: 0 } };
    }

    const rate = (cancelled / totalScheduled) * 100;

    return {
      value: parseFloat(rate.toFixed(2)),
      metadata: { numerator: cancelled, denominator: totalScheduled },
    };
  }
}

// Rebook Rate Calculator
export class RebookRateCalculator implements MetricCalculator {
  metricType = 'REBOOK_RATE';

  async calculate(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MetricResult> {
    // Get all completed appointments in period
    const completedAppointments = await prisma.appointment.findMany({
      where: {
        clinicianId: userId,
        appointmentDate: { gte: periodStart, lte: periodEnd },
        status: 'COMPLETED',
      },
      select: {
        id: true,
        clientId: true,
        appointmentDate: true,
      },
    });

    if (completedAppointments.length === 0) {
      return { value: 0, metadata: { numerator: 0, denominator: 0 } };
    }

    let rebookedCount = 0;

    // For each completed appointment, check if client has another appointment within 30 days
    for (const appt of completedAppointments) {
      const thirtyDaysLater = new Date(appt.appointmentDate);
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

      const hasFollowUp = await prisma.appointment.findFirst({
        where: {
          clinicianId: userId,
          clientId: appt.clientId,
          appointmentDate: {
            gt: appt.appointmentDate,
            lte: thirtyDaysLater,
          },
          id: { not: appt.id }, // Exclude current appointment
        },
      });

      if (hasFollowUp) {
        rebookedCount++;
      }
    }

    const rate = (rebookedCount / completedAppointments.length) * 100;

    return {
      value: parseFloat(rate.toFixed(2)),
      metadata: {
        numerator: rebookedCount,
        denominator: completedAppointments.length,
      },
    };
  }
}

// Sessions Per Day Calculator
export class SessionsPerDayCalculator implements MetricCalculator {
  metricType = 'SESSIONS_PER_DAY';

  async calculate(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MetricResult> {
    const completedAppointments = await prisma.appointment.findMany({
      where: {
        clinicianId: userId,
        appointmentDate: { gte: periodStart, lte: periodEnd },
        status: 'COMPLETED',
      },
      select: {
        appointmentDate: true,
      },
    });

    if (completedAppointments.length === 0) {
      return {
        value: 0,
        metadata: {
          totalSessions: 0,
          workingDays: 0,
          note: 'No completed sessions in this period',
        },
      };
    }

    // Group by unique dates
    const uniqueDates = new Set<string>();
    completedAppointments.forEach((appt) => {
      const dateStr = appt.appointmentDate.toISOString().split('T')[0];
      uniqueDates.add(dateStr);
    });

    const workingDays = uniqueDates.size;
    const avgSessionsPerDay = completedAppointments.length / workingDays;

    return {
      value: parseFloat(avgSessionsPerDay.toFixed(2)),
      metadata: {
        totalSessions: completedAppointments.length,
        workingDays,
      },
    };
  }
}
