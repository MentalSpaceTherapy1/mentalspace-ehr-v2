// Clinical Quality Metrics
// Phase 6 - Week 19 - Clinical Quality (3 metrics)

import { PrismaClient } from '@prisma/client';
import { MetricCalculator, MetricResult } from './types';

const prisma = new PrismaClient();

// Client Retention Rate (90 Days) Calculator
export class ClientRetentionRate90DaysCalculator implements MetricCalculator {
  metricType = 'CLIENT_RETENTION_RATE_90_DAYS';

  async calculate(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MetricResult> {
    // Get clients who started 90 days ago (relative to periodEnd)
    const ninetyDaysBeforePeriodEnd = new Date(periodEnd);
    ninetyDaysBeforePeriodEnd.setDate(ninetyDaysBeforePeriodEnd.getDate() - 90);

    // Find new clients who registered around 90 days ago
    const newClients = await prisma.client.findMany({
      where: {
        primaryTherapistId: userId,
        registrationDate: {
          gte: new Date(ninetyDaysBeforePeriodEnd.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days before
          lte: new Date(ninetyDaysBeforePeriodEnd.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days after
        },
      },
      select: { id: true },
    });

    if (newClients.length === 0) {
      return {
        value: 0,
        metadata: { numerator: 0, denominator: 0, note: 'No new clients 90 days ago' },
      };
    }

    // Check how many are still active
    const stillActiveCount = await prisma.client.count({
      where: {
        id: { in: newClients.map((c) => c.id) },
        status: 'ACTIVE',
      },
    });

    const rate = (stillActiveCount / newClients.length) * 100;

    return {
      value: parseFloat(rate.toFixed(2)),
      metadata: {
        numerator: stillActiveCount,
        denominator: newClients.length,
      },
    };
  }
}

// Crisis Intervention Rate Calculator
export class CrisisInterventionRateCalculator implements MetricCalculator {
  metricType = 'CRISIS_INTERVENTION_RATE';

  async calculate(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MetricResult> {
    const totalSessions = await prisma.clinicalNote.count({
      where: {
        clinicianId: userId,
        sessionDate: { gte: periodStart, lte: periodEnd },
      },
    });

    if (totalSessions === 0) {
      return {
        value: 0,
        metadata: { numerator: 0, denominator: 0, note: 'No sessions in period' },
      };
    }

    // Count crisis intervention notes (high risk or crisis note type)
    const crisisNotes = await prisma.clinicalNote.count({
      where: {
        clinicianId: userId,
        sessionDate: { gte: periodStart, lte: periodEnd },
        OR: [
          { noteType: { contains: 'Crisis' } },
          { riskLevel: { in: ['High', 'Imminent'] } },
          { suicidalIdeation: true },
          { homicidalIdeation: true },
        ],
      },
    });

    const rate = (crisisNotes / totalSessions) * 100;

    return {
      value: parseFloat(rate.toFixed(2)),
      metadata: {
        numerator: crisisNotes,
        denominator: totalSessions,
      },
    };
  }
}

// Safety Plan Compliance Calculator
export class SafetyPlanComplianceCalculator implements MetricCalculator {
  metricType = 'SAFETY_PLAN_COMPLIANCE';

  async calculate(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MetricResult> {
    // Get high-risk clients (those with SI/HI in recent notes)
    const highRiskClients = await prisma.client.findMany({
      where: {
        primaryTherapistId: userId,
        status: 'ACTIVE',
        clinicalNotes: {
          some: {
            sessionDate: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }, // Last 90 days
            OR: [
              { suicidalIdeation: true },
              { homicidalIdeation: true },
              { riskLevel: { in: ['High', 'Imminent'] } },
            ],
          },
        },
      },
      select: { id: true },
    });

    if (highRiskClients.length === 0) {
      return {
        value: 100,
        metadata: { numerator: 0, denominator: 0, note: 'No high-risk clients' },
      };
    }

    // Check how many have current safety plans
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const clientsWithSafetyPlans = await prisma.client.count({
      where: {
        id: { in: highRiskClients.map((c) => c.id) },
        clinicalNotes: {
          some: {
            noteType: { contains: 'Safety' },
            sessionDate: { gte: thirtyDaysAgo },
          },
        },
      },
    });

    const rate = (clientsWithSafetyPlans / highRiskClients.length) * 100;

    return {
      value: parseFloat(rate.toFixed(2)),
      metadata: {
        numerator: clientsWithSafetyPlans,
        denominator: highRiskClients.length,
      },
    };
  }
}
