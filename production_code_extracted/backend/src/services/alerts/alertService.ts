import prisma from '../database';
// Alert Service - Automated Alert Generation and Escalation
// Phase 6 - Week 20 - Alert & Nudge System

import { MetricResult, METRIC_THRESHOLDS, shouldTriggerAlert } from '../metrics/types';
import logger, { auditLogger } from '../../utils/logger';

interface AlertConfig {
  alertType: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  actionRequired: string;
}

class AlertService {
  /**
   * Check thresholds and create alerts for a user's metrics
   */
  async checkThresholdsAndCreateAlerts(
    userId: string,
    metrics: Record<string, MetricResult>
  ): Promise<void> {
    const alertsToCreate: AlertConfig[] = [];

    // Check each metric against its threshold
    for (const [metricType, result] of Object.entries(metrics)) {
      if (shouldTriggerAlert(metricType, result.value)) {
        const alert = this.generateAlertConfig(metricType, result.value, result.metadata);
        if (alert) {
          alertsToCreate.push(alert);
        }
      }
    }

    // Create alerts in database
    for (const alertConfig of alertsToCreate) {
      await this.createAlert(userId, alertConfig);
    }

    logger.info(`Generated ${alertsToCreate.length} alerts for user ${userId}`);
  }

  /**
   * Generate alert configuration based on metric type and value
   */
  private generateAlertConfig(
    metricType: string,
    value: number,
    metadata?: Record<string, any>
  ): AlertConfig | null {
    const threshold = METRIC_THRESHOLDS[metricType];
    if (!threshold) return null;

    switch (metricType) {
      case 'KVR':
        return {
          alertType: 'KVR_BELOW_THRESHOLD',
          severity: value < 70 ? 'CRITICAL' : 'WARNING',
          message: `Your KVR is ${value}% (target: ${threshold.benchmark}%)`,
          actionRequired: 'Review no-shows and cancellations. Consider outreach to improve attendance.',
        };

      case 'NO_SHOW_RATE':
        return {
          alertType: 'HIGH_NO_SHOW_RATE',
          severity: value > 20 ? 'CRITICAL' : 'WARNING',
          message: `Your no-show rate is ${value}% (target: ≤${threshold.benchmark}%)`,
          actionRequired: 'Implement appointment reminder system. Contact clients with history of no-shows.',
        };

      case 'UNSIGNED_NOTE_BACKLOG':
        return {
          alertType: 'UNSIGNED_NOTES',
          severity: value > 10 ? 'CRITICAL' : value > 5 ? 'WARNING' : 'INFO',
          message: `You have ${value} unsigned notes older than 7 days`,
          actionRequired: 'Sign pending notes immediately. Georgia requires notes signed within 7 days.',
        };

      case 'SAME_DAY_DOCUMENTATION_RATE':
        return {
          alertType: 'LOW_DOCUMENTATION_RATE',
          severity: value < 70 ? 'CRITICAL' : 'WARNING',
          message: `Your same-day documentation rate is ${value}% (target: ${threshold.benchmark}%)`,
          actionRequired: 'Prioritize completing notes same-day. Consider using AI note generation.',
        };

      case 'TREATMENT_PLAN_CURRENCY':
        return {
          alertType: 'TREATMENT_PLAN_OVERDUE',
          severity: value < 95 ? 'CRITICAL' : 'WARNING',
          message: `${100 - value}% of your clients have outdated treatment plans`,
          actionRequired: 'Review and update treatment plans. Georgia requires 90-day reviews.',
        };

      case 'BILLING_COMPLIANCE_RATE':
        return {
          alertType: 'BILLING_NONCOMPLIANCE',
          severity: value < 90 ? 'CRITICAL' : 'WARNING',
          message: `${100 - value}% of completed sessions lack charges`,
          actionRequired: 'Enter charges for all completed sessions to prevent revenue loss.',
        };

      case 'CHARGE_ENTRY_LAG':
        return {
          alertType: 'CHARGE_ENTRY_DELAY',
          severity: value > 5 ? 'CRITICAL' : 'WARNING',
          message: `Average charge entry lag is ${value} days (target: ≤${threshold.benchmark} days)`,
          actionRequired: 'Enter charges within 24 hours of service to optimize revenue cycle.',
        };

      case 'SAFETY_PLAN_COMPLIANCE':
        if (value < 100) {
          return {
            alertType: 'MISSING_SAFETY_PLANS',
            severity: 'CRITICAL',
            message: `${100 - value}% of high-risk clients lack current safety plans`,
            actionRequired: 'URGENT: Create safety plans for all high-risk clients immediately.',
          };
        }
        return null;

      case 'CLAIM_ACCEPTANCE_RATE':
        return {
          alertType: 'HIGH_CLAIM_DENIAL_RATE',
          severity: value < 85 ? 'CRITICAL' : 'WARNING',
          message: `Claim acceptance rate is ${value}% (target: ≥${threshold.benchmark}%)`,
          actionRequired: 'Review denied claims. Verify CPT codes and diagnosis codes are correct.',
        };

      default:
        return {
          alertType: `${metricType}_THRESHOLD`,
          severity: 'WARNING',
          message: `${metricType} is ${value} (threshold: ${threshold.alertThreshold})`,
          actionRequired: 'Review this metric and take corrective action.',
        };
    }
  }

  /**
   * Create an alert in the database
   */
  async createAlert(userId: string, alertConfig: AlertConfig): Promise<void> {
    try {
      // Check if similar alert already exists (within last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const existingAlert = await prisma.complianceAlert.findFirst({
        where: {
          targetUserId: userId,
          alertType: alertConfig.alertType,
          status: { in: ['OPEN', 'ACKNOWLEDGED'] },
          createdAt: { gte: sevenDaysAgo },
        },
      });

      if (existingAlert) {
        // Update existing alert instead of creating duplicate
        await prisma.complianceAlert.update({
          where: { id: existingAlert.id },
          data: {
            message: alertConfig.message,
            severity: alertConfig.severity,
            updatedAt: new Date(),
          },
        });
        return;
      }

      // Create new alert
      const alert = await prisma.complianceAlert.create({
        data: {
          targetUserId: userId,
          alertType: alertConfig.alertType,
          severity: alertConfig.severity,
          message: alertConfig.message,
          actionRequired: alertConfig.actionRequired,
          status: 'OPEN',
        },
      });

      // Check if escalation is needed
      await this.checkEscalation(userId, alertConfig);

      auditLogger.info('Alert created', {
        alertId: alert.id,
        userId,
        alertType: alertConfig.alertType,
        severity: alertConfig.severity,
      });
    } catch (error) {
      logger.error(`Error creating alert for user ${userId}`, { error });
    }
  }

  /**
   * Check if alert should be escalated to supervisor or admin
   */
  private async checkEscalation(userId: string, alertConfig: AlertConfig): Promise<void> {
    // Get user's supervisor
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { supervisorId: true },
    });

    if (!user?.supervisorId) return;

    // Escalate critical alerts to supervisor
    if (alertConfig.severity === 'CRITICAL') {
      await prisma.complianceAlert.create({
        data: {
          targetUserId: userId,
          supervisorId: user.supervisorId,
          alertType: `${alertConfig.alertType}_ESCALATED`,
          severity: 'CRITICAL',
          message: `[ESCALATED] ${alertConfig.message}`,
          actionRequired: 'Supervisor intervention required',
          status: 'OPEN',
        },
      });

      logger.info(`Alert escalated to supervisor`, { userId, supervisorId: user.supervisorId });
    }

    // Check if admin escalation is needed (multiple critical alerts)
    const criticalAlerts = await prisma.complianceAlert.count({
      where: {
        targetUserId: userId,
        severity: 'CRITICAL',
        status: 'OPEN',
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    });

    if (criticalAlerts >= 3) {
      // Escalate to admin
      await prisma.complianceAlert.create({
        data: {
          targetUserId: userId,
          supervisorId: user.supervisorId,
          alertType: 'MULTIPLE_CRITICAL_ALERTS',
          severity: 'CRITICAL',
          message: `Clinician has ${criticalAlerts} open critical alerts`,
          actionRequired: 'Administrator review required. Consider performance improvement plan.',
          status: 'OPEN',
        },
      });

      logger.warn(`Multiple critical alerts escalated to admin`, { userId, criticalAlerts });
    }
  }

  /**
   * Process all pending alerts (runs hourly)
   */
  async processAllAlerts(): Promise<void> {
    logger.info('Processing all pending alerts...');

    // Get all open alerts older than 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const staleAlerts = await prisma.complianceAlert.findMany({
      where: {
        status: 'OPEN',
        createdAt: { lt: twentyFourHoursAgo },
      },
      include: {
        targetUser: {
          select: {
            id: true,
            supervisorId: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    for (const alert of staleAlerts) {
      // Send reminder notification (would integrate with email/SMS service)
      logger.info(`Reminder needed for stale alert`, {
        alertId: alert.id,
        userId: alert.targetUserId,
        hoursSinceCreated: (Date.now() - alert.createdAt.getTime()) / (1000 * 60 * 60),
      });

      // If critical and >48 hours old, escalate to supervisor
      if (alert.severity === 'CRITICAL') {
        const fortyEightHoursAgo = new Date();
        fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

        if (alert.createdAt < fortyEightHoursAgo && alert.targetUser.supervisorId) {
          await prisma.complianceAlert.update({
            where: { id: alert.id },
            data: {
              supervisorId: alert.targetUser.supervisorId,
              message: `[48HR OVERDUE] ${alert.message}`,
            },
          });

          logger.warn(`Critical alert escalated after 48 hours`, { alertId: alert.id });
        }
      }
    }

    logger.info(`Processed ${staleAlerts.length} stale alerts`);
  }

  /**
   * Auto-resolve alerts when metrics improve
   */
  async autoResolveAlerts(userId: string, metrics: Record<string, MetricResult>): Promise<void> {
    // Get all open alerts for this user
    const openAlerts = await prisma.complianceAlert.findMany({
      where: {
        targetUserId: userId,
        status: { in: ['OPEN', 'ACKNOWLEDGED'] },
      },
    });

    for (const alert of openAlerts) {
      // Check if the metric that triggered the alert is now within threshold
      const shouldResolve = this.shouldAutoResolve(alert.alertType, metrics);

      if (shouldResolve) {
        await prisma.complianceAlert.update({
          where: { id: alert.id },
          data: {
            status: 'RESOLVED',
            resolvedAt: new Date(),
            metadata: { autoResolved: true, resolvedBy: 'SYSTEM' },
          },
        });

        logger.info(`Alert auto-resolved`, { alertId: alert.id, userId });
      }
    }
  }

  /**
   * Check if alert should be auto-resolved based on current metrics
   */
  private shouldAutoResolve(alertType: string, metrics: Record<string, MetricResult>): boolean {
    switch (alertType) {
      case 'KVR_BELOW_THRESHOLD':
        return metrics.KVR && metrics.KVR.value >= 85;

      case 'HIGH_NO_SHOW_RATE':
        return metrics.NO_SHOW_RATE && metrics.NO_SHOW_RATE.value <= 10;

      case 'UNSIGNED_NOTES':
        return metrics.UNSIGNED_NOTE_BACKLOG && metrics.UNSIGNED_NOTE_BACKLOG.value === 0;

      case 'LOW_DOCUMENTATION_RATE':
        return metrics.SAME_DAY_DOCUMENTATION_RATE && metrics.SAME_DAY_DOCUMENTATION_RATE.value >= 90;

      case 'TREATMENT_PLAN_OVERDUE':
        return metrics.TREATMENT_PLAN_CURRENCY && metrics.TREATMENT_PLAN_CURRENCY.value >= 95;

      case 'BILLING_NONCOMPLIANCE':
        return metrics.BILLING_COMPLIANCE_RATE && metrics.BILLING_COMPLIANCE_RATE.value >= 95;

      case 'MISSING_SAFETY_PLANS':
        return metrics.SAFETY_PLAN_COMPLIANCE && metrics.SAFETY_PLAN_COMPLIANCE.value === 100;

      default:
        return false;
    }
  }

  /**
   * Get alert summary for a user
   */
  async getAlertSummary(userId: string): Promise<{
    total: number;
    critical: number;
    warning: number;
    info: number;
  }> {
    const [total, critical, warning, info] = await Promise.all([
      prisma.complianceAlert.count({
        where: { targetUserId: userId, status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
      }),
      prisma.complianceAlert.count({
        where: { targetUserId: userId, status: { in: ['OPEN', 'ACKNOWLEDGED'] }, severity: 'CRITICAL' },
      }),
      prisma.complianceAlert.count({
        where: { targetUserId: userId, status: { in: ['OPEN', 'ACKNOWLEDGED'] }, severity: 'WARNING' },
      }),
      prisma.complianceAlert.count({
        where: { targetUserId: userId, status: { in: ['OPEN', 'ACKNOWLEDGED'] }, severity: 'INFO' },
      }),
    ]);

    return { total, critical, warning, info };
  }
}

export const alertService = new AlertService();
