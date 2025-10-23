import prisma from '../database';
// Additional Metrics (Schedule, Supervision, Practice Efficiency, Financial Health)
// Phase 6 - Week 19 - Remaining Metrics

import { MetricCalculator, MetricResult } from './types';

// ============================================================================
// SCHEDULE OPTIMIZATION METRICS
// ============================================================================

// Schedule Fill Rate Calculator
export class ScheduleFillRateCalculator implements MetricCalculator {
  metricType = 'SCHEDULE_FILL_RATE';

  async calculate(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MetricResult> {
    // Calculate working days in period (Mon-Fri)
    const workingDays = getWorkingDaysBetween(periodStart, periodEnd);

    // Assume 8 available slots per day (8 AM - 5 PM with 1 hour lunch)
    const assumedSlotsPerDay = 8;
    const totalAvailableSlots = workingDays * assumedSlotsPerDay;

    if (totalAvailableSlots === 0) {
      return { value: 0, metadata: { bookedSlots: 0, availableSlots: 0 } };
    }

    const bookedSlots = await prisma.appointment.count({
      where: {
        clinicianId: userId,
        appointmentDate: { gte: periodStart, lte: periodEnd },
        status: { notIn: ['CANCELLED'] },
      },
    });

    const rate = (bookedSlots / totalAvailableSlots) * 100;

    return {
      value: parseFloat(rate.toFixed(2)),
      metadata: {
        bookedSlots,
        availableSlots: totalAvailableSlots,
        workingDays,
      },
    };
  }
}

// Prime Time Utilization Calculator
export class PrimeTimeUtilizationCalculator implements MetricCalculator {
  metricType = 'PRIME_TIME_UTILIZATION';

  async calculate(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MetricResult> {
    // Prime time: 9 AM - 5 PM, Mon-Thu
    const workingDays = getWorkingDaysBetween(periodStart, periodEnd);
    const thursdaysAndBefore = Math.floor(workingDays * 0.8); // Approximately 4/5 days
    const primeSlotsPerDay = 8; // 9 AM - 5 PM
    const totalPrimeSlots = thursdaysAndBefore * primeSlotsPerDay;

    if (totalPrimeSlots === 0) {
      return { value: 0, metadata: { bookedPrimeSlots: 0, totalPrimeSlots: 0 } };
    }

    // Count appointments during prime time
    const appointments = await prisma.appointment.findMany({
      where: {
        clinicianId: userId,
        appointmentDate: { gte: periodStart, lte: periodEnd },
        status: { notIn: ['CANCELLED'] },
      },
      select: {
        appointmentDate: true,
        startTime: true,
      },
    });

    const bookedPrimeSlots = appointments.filter((appt) => {
      const day = appt.appointmentDate.getDay(); // 0 = Sunday
      const hour = parseInt(appt.startTime.split(':')[0]);
      return day >= 1 && day <= 4 && hour >= 9 && hour < 17; // Mon-Thu, 9AM-5PM
    }).length;

    const rate = (bookedPrimeSlots / totalPrimeSlots) * 100;

    return {
      value: parseFloat(rate.toFixed(2)),
      metadata: {
        bookedPrimeSlots,
        totalPrimeSlots,
      },
    };
  }
}

// Average Appointment Lead Time Calculator
export class AvgAppointmentLeadTimeCalculator implements MetricCalculator {
  metricType = 'AVG_APPOINTMENT_LEAD_TIME';

  async calculate(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MetricResult> {
    const appointments = await prisma.appointment.findMany({
      where: {
        clinicianId: userId,
        appointmentDate: { gte: periodStart, lte: periodEnd },
        status: { notIn: ['CANCELLED'] },
      },
      select: {
        createdAt: true,
        appointmentDate: true,
      },
    });

    if (appointments.length === 0) {
      return { value: 0, metadata: { totalAppointments: 0 } };
    }

    let totalLeadDays = 0;

    appointments.forEach((appt) => {
      const createdTime = new Date(appt.createdAt).getTime();
      const apptTime = new Date(appt.appointmentDate).getTime();
      const diffMs = apptTime - createdTime;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      totalLeadDays += Math.max(0, diffDays); // Ensure non-negative
    });

    const avgLeadTime = totalLeadDays / appointments.length;

    return {
      value: parseFloat(avgLeadTime.toFixed(2)),
      metadata: { totalAppointments: appointments.length },
    };
  }
}

// ============================================================================
// SUPERVISION COMPLIANCE METRICS
// ============================================================================

// Supervision Hours Logged Calculator
export class SupervisionHoursLoggedCalculator implements MetricCalculator {
  metricType = 'SUPERVISION_HOURS_LOGGED';

  async calculate(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MetricResult> {
    // Sum supervision hours for this supervisee
    const supervisionSessions = await prisma.supervisionSession.findMany({
      where: {
        superviseeId: userId,
        sessionDate: { gte: periodStart, lte: periodEnd },
      },
      select: {
        hoursEarned: true,
      },
    });

    const totalHours = supervisionSessions.reduce(
      (sum, session) => sum + session.hoursEarned,
      0
    );

    // Get user's required hours (from User model)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { requiredSupervisionHours: true, licenseNumber: true },
    });

    const requiredHours = user?.requiredSupervisionHours || 0;

    return {
      value: parseFloat(totalHours.toFixed(2)),
      metadata: {
        totalHours: parseFloat(totalHours.toFixed(2)),
        requiredHours,
        sessionsCount: supervisionSessions.length,
      },
    };
  }
}

// Supervision Note Timeliness Calculator
export class SupervisionNoteTimelinessCalculator implements MetricCalculator {
  metricType = 'SUPERVISION_NOTE_TIMELINESS';

  async calculate(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MetricResult> {
    const supervisionSessions = await prisma.supervisionSession.findMany({
      where: {
        supervisorId: userId,
        sessionDate: { gte: periodStart, lte: periodEnd },
      },
      select: {
        sessionDate: true,
        notesSigned: true,
        notesSignedAt: true,
      },
    });

    if (supervisionSessions.length === 0) {
      return { value: 100, metadata: { numerator: 0, denominator: 0 } };
    }

    const signedWithin7Days = supervisionSessions.filter((session) => {
      if (!session.notesSigned || !session.notesSignedAt) return false;

      const sessionTime = new Date(session.sessionDate).getTime();
      const signedTime = new Date(session.notesSignedAt).getTime();
      const diffDays = (signedTime - sessionTime) / (1000 * 60 * 60 * 24);

      return diffDays <= 7;
    }).length;

    const rate = (signedWithin7Days / supervisionSessions.length) * 100;

    return {
      value: parseFloat(rate.toFixed(2)),
      metadata: {
        numerator: signedWithin7Days,
        denominator: supervisionSessions.length,
      },
    };
  }
}

// ============================================================================
// FINANCIAL HEALTH METRICS
// ============================================================================

// Days in AR Calculator
export class DaysInARCalculator implements MetricCalculator {
  metricType = 'DAYS_IN_AR';

  async calculate(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MetricResult> {
    // Get total AR (outstanding balance)
    const charges = await prisma.chargeEntry.findMany({
      where: {
        providerId: userId,
        chargeStatus: { notIn: ['Paid', 'Void'] },
      },
      select: {
        chargeAmount: true,
        paymentAmount: true,
      },
    });

    const totalAR = charges.reduce((sum, charge) => {
      const balance =
        parseFloat(charge.chargeAmount.toString()) -
        (charge.paymentAmount ? parseFloat(charge.paymentAmount.toString()) : 0);
      return sum + balance;
    }, 0);

    // Calculate average daily revenue (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCharges = await prisma.chargeEntry.findMany({
      where: {
        providerId: userId,
        serviceDate: { gte: thirtyDaysAgo },
      },
      select: {
        chargeAmount: true,
      },
    });

    const totalRevenue30Days = recentCharges.reduce(
      (sum, charge) => sum + parseFloat(charge.chargeAmount.toString()),
      0
    );

    const avgDailyRevenue = totalRevenue30Days / 30;

    if (avgDailyRevenue === 0) {
      return { value: 0, metadata: { totalAR: 0, avgDailyRevenue: 0 } };
    }

    const daysInAR = totalAR / avgDailyRevenue;

    return {
      value: parseFloat(daysInAR.toFixed(2)),
      metadata: {
        totalAR: parseFloat(totalAR.toFixed(2)),
        avgDailyRevenue: parseFloat(avgDailyRevenue.toFixed(2)),
      },
    };
  }
}

// Collection Rate Calculator
export class CollectionRateCalculator implements MetricCalculator {
  metricType = 'COLLECTION_RATE';

  async calculate(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MetricResult> {
    // Get charges in period
    const charges = await prisma.chargeEntry.findMany({
      where: {
        providerId: userId,
        serviceDate: { gte: periodStart, lte: periodEnd },
      },
      select: {
        chargeAmount: true,
        paymentAmount: true,
      },
    });

    if (charges.length === 0) {
      return { value: 0, metadata: { totalCharges: 0, totalCollections: 0 } };
    }

    const totalCharges = charges.reduce(
      (sum, charge) => sum + parseFloat(charge.chargeAmount.toString()),
      0
    );

    const totalCollections = charges.reduce(
      (sum, charge) =>
        sum + (charge.paymentAmount ? parseFloat(charge.paymentAmount.toString()) : 0),
      0
    );

    const rate = totalCharges > 0 ? (totalCollections / totalCharges) * 100 : 0;

    return {
      value: parseFloat(rate.toFixed(2)),
      metadata: {
        totalCharges: parseFloat(totalCharges.toFixed(2)),
        totalCollections: parseFloat(totalCollections.toFixed(2)),
      },
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getWorkingDaysBetween(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Not Sunday or Saturday
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}
