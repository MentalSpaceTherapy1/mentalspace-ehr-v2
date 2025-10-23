import prisma from '../database';
// Documentation Compliance Metrics
// Phase 6 - Week 18 - Documentation Compliance (4 metrics)

import { MetricCalculator, MetricResult } from './types';

// Same-Day Documentation Rate Calculator
export class SameDayDocumentationRateCalculator implements MetricCalculator {
  metricType = 'SAME_DAY_DOCUMENTATION_RATE';

  async calculate(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MetricResult> {
    // Get all signed notes in period
    const signedNotes = await prisma.clinicalNote.findMany({
      where: {
        clinicianId: userId,
        sessionDate: { gte: periodStart, lte: periodEnd },
        status: { in: ['SIGNED', 'COSIGNED', 'LOCKED'] },
        signedDate: { not: null },
      },
      select: {
        id: true,
        sessionDate: true,
        signedDate: true,
      },
    });

    if (signedNotes.length === 0) {
      return {
        value: 0,
        metadata: { numerator: 0, denominator: 0, note: 'No signed notes in period' },
      };
    }

    let sameDayCount = 0;

    signedNotes.forEach((note) => {
      if (note.signedDate) {
        // Compare dates (ignore time)
        const sessionDate = new Date(note.sessionDate).setHours(0, 0, 0, 0);
        const signedDate = new Date(note.signedDate).setHours(0, 0, 0, 0);

        if (sessionDate === signedDate) {
          sameDayCount++;
        }
      }
    });

    const rate = (sameDayCount / signedNotes.length) * 100;

    return {
      value: parseFloat(rate.toFixed(2)),
      metadata: {
        numerator: sameDayCount,
        denominator: signedNotes.length,
      },
    };
  }
}

// Average Documentation Time Calculator
export class AvgDocumentationTimeCalculator implements MetricCalculator {
  metricType = 'AVG_DOCUMENTATION_TIME';

  async calculate(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MetricResult> {
    const signedNotes = await prisma.clinicalNote.findMany({
      where: {
        clinicianId: userId,
        sessionDate: { gte: periodStart, lte: periodEnd },
        status: { in: ['SIGNED', 'COSIGNED', 'LOCKED'] },
        signedDate: { not: null },
      },
      select: {
        sessionDate: true,
        signedDate: true,
      },
    });

    if (signedNotes.length === 0) {
      return {
        value: 0,
        metadata: { totalNotes: 0, note: 'No signed notes in period' },
      };
    }

    let totalHours = 0;

    signedNotes.forEach((note) => {
      if (note.signedDate) {
        const sessionTime = new Date(note.sessionDate).getTime();
        const signedTime = new Date(note.signedDate).getTime();
        const diffMs = signedTime - sessionTime;
        const diffHours = diffMs / (1000 * 60 * 60);
        totalHours += diffHours;
      }
    });

    const avgHours = totalHours / signedNotes.length;

    return {
      value: parseFloat(avgHours.toFixed(2)),
      metadata: {
        totalNotes: signedNotes.length,
        totalHours: parseFloat(totalHours.toFixed(2)),
      },
    };
  }
}

// Treatment Plan Currency Calculator
export class TreatmentPlanCurrencyCalculator implements MetricCalculator {
  metricType = 'TREATMENT_PLAN_CURRENCY';

  async calculate(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MetricResult> {
    // Get all active clients for this clinician
    const activeClients = await prisma.client.count({
      where: {
        primaryTherapistId: userId,
        status: 'ACTIVE',
      },
    });

    if (activeClients === 0) {
      return {
        value: 100,
        metadata: { numerator: 0, denominator: 0, note: 'No active clients' },
      };
    }

    // Get clients with current treatment plans (reviewed within 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const clientsWithCurrentPlans = await prisma.client.count({
      where: {
        primaryTherapistId: userId,
        status: 'ACTIVE',
        treatmentPlans: {
          some: {
            status: 'Active',
            OR: [
              { planDate: { gte: ninetyDaysAgo } },
              { reviewDate: { gte: ninetyDaysAgo } },
            ],
          },
        },
      },
    });

    const rate = (clientsWithCurrentPlans / activeClients) * 100;

    return {
      value: parseFloat(rate.toFixed(2)),
      metadata: {
        numerator: clientsWithCurrentPlans,
        denominator: activeClients,
      },
    };
  }
}

// Unsigned Note Backlog Calculator
export class UnsignedNoteBacklogCalculator implements MetricCalculator {
  metricType = 'UNSIGNED_NOTE_BACKLOG';

  async calculate(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MetricResult> {
    // Count unsigned notes older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const unsignedNotesOver7Days = await prisma.clinicalNote.count({
      where: {
        clinicianId: userId,
        status: 'DRAFT',
        sessionDate: { lt: sevenDaysAgo },
      },
    });

    // Also get the oldest unsigned note for context
    const oldestUnsigned = await prisma.clinicalNote.findFirst({
      where: {
        clinicianId: userId,
        status: 'DRAFT',
      },
      orderBy: { sessionDate: 'asc' },
      select: { sessionDate: true },
    });

    let daysOldest = 0;
    if (oldestUnsigned) {
      const diffMs = Date.now() - new Date(oldestUnsigned.sessionDate).getTime();
      daysOldest = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    return {
      value: unsignedNotesOver7Days,
      metadata: {
        count: unsignedNotesOver7Days,
        oldestNoteDays: daysOldest,
      },
    };
  }
}
