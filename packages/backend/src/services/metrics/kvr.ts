import prisma from '../database';
// KVR (Kept Visit Rate) Calculator
// Phase 6 - Week 18 - Clinical Productivity Metric #1

import { MetricCalculator, MetricResult } from './types';

export class KVRCalculator implements MetricCalculator {
  metricType = 'KVR';

  async calculate(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MetricResult> {
    // Get all scheduled appointments for clinician in period
    // Exclude CANCELLED and RESCHEDULED from denominator
    const scheduledAppointments = await prisma.appointment.count({
      where: {
        clinicianId: userId,
        appointmentDate: {
          gte: periodStart,
          lte: periodEnd,
        },
        status: {
          notIn: ['CANCELLED', 'RESCHEDULED'],
        },
      },
    });

    // Get completed appointments
    const completedAppointments = await prisma.appointment.count({
      where: {
        clinicianId: userId,
        appointmentDate: {
          gte: periodStart,
          lte: periodEnd,
        },
        status: 'COMPLETED',
      },
    });

    if (scheduledAppointments === 0) {
      return {
        value: 0,
        metadata: {
          numerator: 0,
          denominator: 0,
          note: 'No scheduled appointments in this period',
        },
      };
    }

    const kvr = (completedAppointments / scheduledAppointments) * 100;

    return {
      value: parseFloat(kvr.toFixed(2)),
      metadata: {
        numerator: completedAppointments,
        denominator: scheduledAppointments,
      },
    };
  }
}
