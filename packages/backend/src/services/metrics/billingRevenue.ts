// Billing & Revenue Metrics
// Phase 6 - Week 19 - Billing & Revenue (4 metrics)

import { PrismaClient } from '@prisma/client';
import { MetricCalculator, MetricResult } from './types';

const prisma = new PrismaClient();

// Charge Entry Lag Calculator
export class ChargeEntryLagCalculator implements MetricCalculator {
  metricType = 'CHARGE_ENTRY_LAG';

  async calculate(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MetricResult> {
    // Get charges created in period
    const charges = await prisma.chargeEntry.findMany({
      where: {
        providerId: userId,
        serviceDate: { gte: periodStart, lte: periodEnd },
      },
      select: {
        serviceDate: true,
        createdAt: true,
      },
    });

    if (charges.length === 0) {
      return {
        value: 0,
        metadata: { totalCharges: 0, note: 'No charges in period' },
      };
    }

    let totalLagDays = 0;

    charges.forEach((charge) => {
      const serviceTime = new Date(charge.serviceDate).getTime();
      const createdTime = new Date(charge.createdAt).getTime();
      const diffMs = createdTime - serviceTime;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      totalLagDays += diffDays;
    });

    const avgLagDays = totalLagDays / charges.length;

    return {
      value: parseFloat(avgLagDays.toFixed(2)),
      metadata: {
        totalCharges: charges.length,
        totalLagDays: parseFloat(totalLagDays.toFixed(2)),
      },
    };
  }
}

// Billing Compliance Rate Calculator
export class BillingComplianceRateCalculator implements MetricCalculator {
  metricType = 'BILLING_COMPLIANCE_RATE';

  async calculate(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MetricResult> {
    // Get completed sessions
    const completedSessions = await prisma.appointment.count({
      where: {
        clinicianId: userId,
        appointmentDate: { gte: periodStart, lte: periodEnd },
        status: 'COMPLETED',
      },
    });

    if (completedSessions === 0) {
      return {
        value: 100,
        metadata: { numerator: 0, denominator: 0, note: 'No completed sessions' },
      };
    }

    // Count sessions with charges
    const sessionsWithCharges = await prisma.appointment.count({
      where: {
        clinicianId: userId,
        appointmentDate: { gte: periodStart, lte: periodEnd },
        status: 'COMPLETED',
        charges: {
          some: {},
        },
      },
    });

    const rate = (sessionsWithCharges / completedSessions) * 100;

    return {
      value: parseFloat(rate.toFixed(2)),
      metadata: {
        numerator: sessionsWithCharges,
        denominator: completedSessions,
      },
    };
  }
}

// Claim Acceptance Rate Calculator
export class ClaimAcceptanceRateCalculator implements MetricCalculator {
  metricType = 'CLAIM_ACCEPTANCE_RATE';

  async calculate(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MetricResult> {
    // Get all billed charges in period
    const billedCharges = await prisma.chargeEntry.findMany({
      where: {
        providerId: userId,
        billedDate: { gte: periodStart, lte: periodEnd },
        chargeStatus: { not: 'Unbilled' },
      },
      select: {
        id: true,
        claimStatus: true,
      },
    });

    if (billedCharges.length === 0) {
      return {
        value: 100,
        metadata: { numerator: 0, denominator: 0, note: 'No billed charges in period' },
      };
    }

    // Count accepted claims (not denied)
    const acceptedClaims = billedCharges.filter(
      (charge) =>
        !charge.claimStatus ||
        !charge.claimStatus.toLowerCase().includes('denied')
    ).length;

    const rate = (acceptedClaims / billedCharges.length) * 100;

    return {
      value: parseFloat(rate.toFixed(2)),
      metadata: {
        numerator: acceptedClaims,
        denominator: billedCharges.length,
      },
    };
  }
}

// Average Reimbursement Per Session Calculator
export class AvgReimbursementPerSessionCalculator implements MetricCalculator {
  metricType = 'AVG_REIMBURSEMENT_PER_SESSION';

  async calculate(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MetricResult> {
    const completedSessions = await prisma.appointment.count({
      where: {
        clinicianId: userId,
        appointmentDate: { gte: periodStart, lte: periodEnd },
        status: 'COMPLETED',
      },
    });

    if (completedSessions === 0) {
      return {
        value: 0,
        metadata: { totalSessions: 0, note: 'No completed sessions' },
      };
    }

    // Sum all payments for this clinician's charges in period
    const charges = await prisma.chargeEntry.findMany({
      where: {
        providerId: userId,
        serviceDate: { gte: periodStart, lte: periodEnd },
      },
      select: {
        paymentAmount: true,
      },
    });

    const totalReimbursement = charges.reduce((sum, charge) => {
      return sum + (charge.paymentAmount ? parseFloat(charge.paymentAmount.toString()) : 0);
    }, 0);

    const avgReimbursement = totalReimbursement / completedSessions;

    return {
      value: parseFloat(avgReimbursement.toFixed(2)),
      metadata: {
        totalSessions: completedSessions,
        totalReimbursement: parseFloat(totalReimbursement.toFixed(2)),
      },
    };
  }
}
