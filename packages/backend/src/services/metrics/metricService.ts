import prisma from '../database';
// Metric Service - Central Orchestrator for Productivity Metrics
// Phase 6 - Week 18-19

import { MetricCalculator, MetricResult, shouldTriggerAlert } from './types';
import logger from '../../utils/logger';

// Import all calculators
import { KVRCalculator } from './kvr';
import {
  NoShowRateCalculator,
  CancellationRateCalculator,
  RebookRateCalculator,
  SessionsPerDayCalculator,
} from './clinicalProductivity';
import {
  SameDayDocumentationRateCalculator,
  AvgDocumentationTimeCalculator,
  TreatmentPlanCurrencyCalculator,
  UnsignedNoteBacklogCalculator,
} from './documentationCompliance';
import {
  ClientRetentionRate90DaysCalculator,
  CrisisInterventionRateCalculator,
  SafetyPlanComplianceCalculator,
} from './clinicalQuality';
import {
  ChargeEntryLagCalculator,
  BillingComplianceRateCalculator,
  ClaimAcceptanceRateCalculator,
  AvgReimbursementPerSessionCalculator,
} from './billingRevenue';
import {
  ScheduleFillRateCalculator,
  PrimeTimeUtilizationCalculator,
  AvgAppointmentLeadTimeCalculator,
  SupervisionHoursLoggedCalculator,
  SupervisionNoteTimelinessCalculator,
  DaysInARCalculator,
  CollectionRateCalculator,
} from './additionalMetrics';

class MetricService {
  private calculators: Map<string, MetricCalculator> = new Map();

  constructor() {
    this.registerAllCalculators();
  }

  private registerAllCalculators() {
    // Clinical Productivity (5 metrics)
    this.registerCalculator(new KVRCalculator());
    this.registerCalculator(new NoShowRateCalculator());
    this.registerCalculator(new CancellationRateCalculator());
    this.registerCalculator(new RebookRateCalculator());
    this.registerCalculator(new SessionsPerDayCalculator());

    // Documentation Compliance (4 metrics)
    this.registerCalculator(new SameDayDocumentationRateCalculator());
    this.registerCalculator(new AvgDocumentationTimeCalculator());
    this.registerCalculator(new TreatmentPlanCurrencyCalculator());
    this.registerCalculator(new UnsignedNoteBacklogCalculator());

    // Clinical Quality (3 metrics)
    this.registerCalculator(new ClientRetentionRate90DaysCalculator());
    this.registerCalculator(new CrisisInterventionRateCalculator());
    this.registerCalculator(new SafetyPlanComplianceCalculator());

    // Billing & Revenue (4 metrics)
    this.registerCalculator(new ChargeEntryLagCalculator());
    this.registerCalculator(new BillingComplianceRateCalculator());
    this.registerCalculator(new ClaimAcceptanceRateCalculator());
    this.registerCalculator(new AvgReimbursementPerSessionCalculator());

    // Schedule Optimization (3 metrics)
    this.registerCalculator(new ScheduleFillRateCalculator());
    this.registerCalculator(new PrimeTimeUtilizationCalculator());
    this.registerCalculator(new AvgAppointmentLeadTimeCalculator());

    // Supervision Compliance (2 metrics)
    this.registerCalculator(new SupervisionHoursLoggedCalculator());
    this.registerCalculator(new SupervisionNoteTimelinessCalculator());

    // Financial Health (2 metrics)
    this.registerCalculator(new DaysInARCalculator());
    this.registerCalculator(new CollectionRateCalculator());

    logger.info(`Registered ${this.calculators.size} metric calculators`);
  }

  private registerCalculator(calculator: MetricCalculator) {
    this.calculators.set(calculator.metricType, calculator);
  }

  /**
   * Calculate a single metric
   */
  async calculateMetric(
    metricType: string,
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MetricResult> {
    const calculator = this.calculators.get(metricType);

    if (!calculator) {
      throw new Error(`No calculator found for metric type: ${metricType}`);
    }

    try {
      return await calculator.calculate(userId, periodStart, periodEnd);
    } catch (error) {
      logger.error(`Error calculating ${metricType} for user ${userId}`, { error });
      throw error;
    }
  }

  /**
   * Calculate all metrics for a user
   */
  async calculateAllMetrics(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Record<string, MetricResult>> {
    const results: Record<string, MetricResult> = {};

    for (const [metricType, calculator] of this.calculators.entries()) {
      try {
        results[metricType] = await calculator.calculate(userId, periodStart, periodEnd);
        logger.debug(`Calculated ${metricType} for user ${userId}:`, results[metricType]);
      } catch (error) {
        logger.error(`Error calculating ${metricType} for user ${userId}`, { error });
        results[metricType] = {
          value: 0,
          metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
        };
      }
    }

    return results;
  }

  /**
   * Calculate metrics by category
   */
  async calculateMetricsByCategory(
    userId: string,
    category: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Record<string, MetricResult>> {
    const categoryMetrics: Record<string, string[]> = {
      clinicalProductivity: ['KVR', 'NO_SHOW_RATE', 'CANCELLATION_RATE', 'REBOOK_RATE', 'SESSIONS_PER_DAY'],
      documentationCompliance: ['SAME_DAY_DOCUMENTATION_RATE', 'AVG_DOCUMENTATION_TIME', 'TREATMENT_PLAN_CURRENCY', 'UNSIGNED_NOTE_BACKLOG'],
      clinicalQuality: ['CLIENT_RETENTION_RATE_90_DAYS', 'CRISIS_INTERVENTION_RATE', 'SAFETY_PLAN_COMPLIANCE'],
      billingRevenue: ['CHARGE_ENTRY_LAG', 'BILLING_COMPLIANCE_RATE', 'CLAIM_ACCEPTANCE_RATE', 'AVG_REIMBURSEMENT_PER_SESSION'],
      scheduleOptimization: ['SCHEDULE_FILL_RATE', 'PRIME_TIME_UTILIZATION', 'AVG_APPOINTMENT_LEAD_TIME'],
      supervisionCompliance: ['SUPERVISION_HOURS_LOGGED', 'SUPERVISION_NOTE_TIMELINESS'],
      financialHealth: ['DAYS_IN_AR', 'COLLECTION_RATE'],
    };

    const metricsToCalculate = categoryMetrics[category] || [];
    const results: Record<string, MetricResult> = {};

    for (const metricType of metricsToCalculate) {
      try {
        results[metricType] = await this.calculateMetric(metricType, userId, periodStart, periodEnd);
      } catch (error) {
        logger.error(`Error calculating ${metricType}`, { error });
        results[metricType] = { value: 0, metadata: { error: 'Calculation failed' } };
      }
    }

    return results;
  }

  /**
   * Save calculated metrics to database
   */
  async saveMetrics(
    userId: string,
    periodStart: Date,
    periodEnd: Date,
    results: Record<string, MetricResult>
  ): Promise<void> {
    const metricsToCreate = Object.entries(results).map(([metricType, result]) => ({
      clinicianId: userId,
      metricType,
      metricValue: result.value,
      periodStart,
      periodEnd,
      metadata: result.metadata || {},
    }));

    try {
      await prisma.productivityMetric.createMany({
        data: metricsToCreate,
      });

      logger.info(`Saved ${metricsToCreate.length} metrics for user ${userId}`);
    } catch (error) {
      logger.error(`Error saving metrics for user ${userId}`, { error });
      throw error;
    }
  }

  /**
   * Get historical metrics for a user
   */
  async getHistoricalMetrics(
    userId: string,
    metricType?: string,
    limit: number = 30
  ): Promise<any[]> {
    const where: Prisma.ProductivityMetricWhereInput = { clinicianId: userId };
    if (metricType) {
      where.metricType = metricType;
    }

    return await prisma.productivityMetric.findMany({
      where,
      orderBy: { periodStart: 'desc' },
      take: limit,
    });
  }

  /**
   * Get metrics that should trigger alerts
   */
  async getMetricsRequiringAlerts(
    userId: string,
    results: Record<string, MetricResult>
  ): Promise<Array<{ metricType: string; value: number; shouldAlert: boolean }>> {
    const alertMetrics: Array<{ metricType: string; value: number; shouldAlert: boolean }> = [];

    for (const [metricType, result] of Object.entries(results)) {
      const shouldAlert = shouldTriggerAlert(metricType, result.value);
      if (shouldAlert) {
        alertMetrics.push({
          metricType,
          value: result.value,
          shouldAlert: true,
        });
      }
    }

    return alertMetrics;
  }

  /**
   * Get list of all available metrics
   */
  getAvailableMetrics(): string[] {
    return Array.from(this.calculators.keys());
  }

  /**
   * Get calculator count
   */
  getCalculatorCount(): number {
    return this.calculators.size;
  }
}

// Export singleton instance
export const metricService = new MetricService();
