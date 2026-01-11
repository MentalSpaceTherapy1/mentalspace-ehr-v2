/**
 * HIPAA Breach Detection Service
 *
 * Implements automated detection of potential security breaches and
 * unusual access patterns as required by HIPAA 164.400.
 *
 * Detection Categories:
 * 1. Excessive PHI access
 * 2. Unauthorized role escalation attempts
 * 3. Failed authentication patterns
 * 4. Unusual access patterns (time, location, volume)
 * 5. Data exfiltration indicators
 */

import prisma from './database';
import { auditLogger } from '../utils/logger';
import config from '../config';

interface BreachIndicator {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  clientId?: string;
  ipAddress?: string;
  description: string;
  evidence: Record<string, any>;
  timestamp: Date;
}

interface DetectionResult {
  detected: boolean;
  indicators: BreachIndicator[];
}

// Thresholds for breach detection
const THRESHOLDS = {
  // Max PHI records accessed in 1 hour by a single user
  PHI_ACCESS_HOURLY: 100,
  // Max PHI records accessed in 24 hours by a single user
  PHI_ACCESS_DAILY: 500,
  // Max failed login attempts in 15 minutes from same IP
  FAILED_LOGIN_ATTEMPTS: 10,
  // Max clients accessed by a single user in 1 hour
  CLIENTS_ACCESSED_HOURLY: 50,
  // Max download requests in 1 hour
  DOWNLOADS_HOURLY: 20,
  // After hours access threshold (number of accesses)
  AFTER_HOURS_ACCESS: 10,
  // Unusual IP addresses (new IPs in 24h)
  NEW_IP_THRESHOLD: 5,
};

export class BreachDetectionService {
  /**
   * Run all breach detection checks
   */
  async runDetectionSuite(userId?: string): Promise<DetectionResult> {
    const indicators: BreachIndicator[] = [];
    const now = new Date();

    try {
      // Run all detection checks in parallel
      const [
        excessivePHIAccess,
        failedLogins,
        unusualAccessPatterns,
        roleEscalation,
        dataExfiltration,
      ] = await Promise.all([
        this.detectExcessivePHIAccess(userId),
        this.detectFailedLoginPatterns(),
        this.detectUnusualAccessPatterns(userId),
        this.detectRoleEscalationAttempts(userId),
        this.detectDataExfiltration(userId),
      ]);

      // Collect all indicators
      indicators.push(
        ...excessivePHIAccess,
        ...failedLogins,
        ...unusualAccessPatterns,
        ...roleEscalation,
        ...dataExfiltration,
      );

      // Log breach detection run
      if (indicators.length > 0) {
        auditLogger.warn('Breach detection found indicators', {
          action: 'BREACH_DETECTION_ALERT',
          indicatorCount: indicators.length,
          severities: indicators.map(i => i.severity),
          timestamp: now.toISOString(),
        });

        // Store breach indicators in database
        await this.storeBreachIndicators(indicators);

        // Send alerts for critical/high severity
        const criticalIndicators = indicators.filter(
          i => i.severity === 'CRITICAL' || i.severity === 'HIGH'
        );
        if (criticalIndicators.length > 0) {
          await this.sendBreachAlerts(criticalIndicators);
        }
      }

      return {
        detected: indicators.length > 0,
        indicators,
      };
    } catch (error) {
      auditLogger.error('Breach detection suite failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'BREACH_DETECTION_ERROR',
      });
      throw error;
    }
  }

  /**
   * Detect excessive PHI access
   */
  private async detectExcessivePHIAccess(userId?: string): Promise<BreachIndicator[]> {
    const indicators: BreachIndicator[] = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Query audit logs for PHI access
    const where: any = {
      timestamp: { gte: oneDayAgo },
      entityType: { in: ['CLIENT', 'CLINICAL_NOTE', 'MEDICATION', 'DIAGNOSIS'] },
      action: { in: ['VIEW', 'READ', 'ACCESS', 'EXPORT'] },
    };

    if (userId) {
      where.userId = userId;
    }

    const accessLogs = await prisma.auditLog.groupBy({
      by: ['userId'],
      where,
      _count: { id: true },
    });

    for (const log of accessLogs) {
      if (!log.userId) continue;

      // Check hourly threshold
      const hourlyCount = await prisma.auditLog.count({
        where: {
          ...where,
          userId: log.userId,
          timestamp: { gte: oneHourAgo },
        },
      });

      if (hourlyCount > THRESHOLDS.PHI_ACCESS_HOURLY) {
        indicators.push({
          type: 'EXCESSIVE_PHI_ACCESS',
          severity: 'HIGH',
          userId: log.userId,
          description: `User accessed ${hourlyCount} PHI records in the last hour (threshold: ${THRESHOLDS.PHI_ACCESS_HOURLY})`,
          evidence: {
            accessCount: hourlyCount,
            threshold: THRESHOLDS.PHI_ACCESS_HOURLY,
            timeWindow: '1 hour',
          },
          timestamp: now,
        });
      }

      // Check daily threshold
      if (log._count.id > THRESHOLDS.PHI_ACCESS_DAILY) {
        indicators.push({
          type: 'EXCESSIVE_PHI_ACCESS_DAILY',
          severity: 'CRITICAL',
          userId: log.userId,
          description: `User accessed ${log._count.id} PHI records in the last 24 hours (threshold: ${THRESHOLDS.PHI_ACCESS_DAILY})`,
          evidence: {
            accessCount: log._count.id,
            threshold: THRESHOLDS.PHI_ACCESS_DAILY,
            timeWindow: '24 hours',
          },
          timestamp: now,
        });
      }
    }

    return indicators;
  }

  /**
   * Detect failed login patterns
   */
  private async detectFailedLoginPatterns(): Promise<BreachIndicator[]> {
    const indicators: BreachIndicator[] = [];
    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

    // Query failed login attempts grouped by IP
    const failedLogins = await prisma.auditLog.groupBy({
      by: ['ipAddress'],
      where: {
        timestamp: { gte: fifteenMinutesAgo },
        action: 'LOGIN_FAILED',
      },
      _count: { id: true },
    });

    for (const login of failedLogins) {
      if (!login.ipAddress) continue;

      if (login._count.id > THRESHOLDS.FAILED_LOGIN_ATTEMPTS) {
        // Get targeted user accounts
        const targetedUsers = await prisma.auditLog.findMany({
          where: {
            timestamp: { gte: fifteenMinutesAgo },
            action: 'LOGIN_FAILED',
            ipAddress: login.ipAddress,
          },
          select: { entityId: true },
          distinct: ['entityId'],
        });

        indicators.push({
          type: 'BRUTE_FORCE_ATTEMPT',
          severity: login._count.id > 20 ? 'CRITICAL' : 'HIGH',
          ipAddress: login.ipAddress,
          description: `${login._count.id} failed login attempts from IP ${login.ipAddress} in 15 minutes`,
          evidence: {
            attemptCount: login._count.id,
            threshold: THRESHOLDS.FAILED_LOGIN_ATTEMPTS,
            timeWindow: '15 minutes',
            targetedAccounts: targetedUsers.length,
          },
          timestamp: now,
        });
      }
    }

    return indicators;
  }

  /**
   * Detect unusual access patterns
   */
  private async detectUnusualAccessPatterns(userId?: string): Promise<BreachIndicator[]> {
    const indicators: BreachIndicator[] = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Check for after-hours access (before 6am or after 10pm)
    const currentHour = now.getHours();
    const isAfterHours = currentHour < 6 || currentHour >= 22;

    if (isAfterHours) {
      const afterHoursAccess = await prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          timestamp: { gte: oneHourAgo },
          entityType: { in: ['CLIENT', 'CLINICAL_NOTE'] },
          ...(userId ? { userId } : {}),
        },
        _count: { id: true },
      });

      for (const access of afterHoursAccess) {
        if (access._count.id > THRESHOLDS.AFTER_HOURS_ACCESS) {
          indicators.push({
            type: 'AFTER_HOURS_ACCESS',
            severity: 'MEDIUM',
            userId: access.userId || undefined,
            description: `Significant after-hours PHI access detected (${access._count.id} accesses)`,
            evidence: {
              accessCount: access._count.id,
              hour: currentHour,
              threshold: THRESHOLDS.AFTER_HOURS_ACCESS,
            },
            timestamp: now,
          });
        }
      }
    }

    // Check for access from new IP addresses
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    if (userId) {
      // Get IPs used in the last 24 hours
      const recentIPs = await prisma.auditLog.findMany({
        where: {
          userId,
          timestamp: { gte: oneDayAgo },
          ipAddress: { not: null },
        },
        select: { ipAddress: true },
        distinct: ['ipAddress'],
      });

      // Get historical IPs
      const historicalIPs = await prisma.auditLog.findMany({
        where: {
          userId,
          timestamp: { gte: oneWeekAgo, lt: oneDayAgo },
          ipAddress: { not: null },
        },
        select: { ipAddress: true },
        distinct: ['ipAddress'],
      });

      const historicalIPSet = new Set(historicalIPs.map(h => h.ipAddress));
      const newIPs = recentIPs.filter(r => !historicalIPSet.has(r.ipAddress));

      if (newIPs.length >= THRESHOLDS.NEW_IP_THRESHOLD) {
        indicators.push({
          type: 'NEW_ACCESS_LOCATIONS',
          severity: 'MEDIUM',
          userId,
          description: `User accessed system from ${newIPs.length} new IP addresses in 24 hours`,
          evidence: {
            newIPCount: newIPs.length,
            threshold: THRESHOLDS.NEW_IP_THRESHOLD,
            newIPs: newIPs.map(ip => ip.ipAddress),
          },
          timestamp: now,
        });
      }
    }

    return indicators;
  }

  /**
   * Detect role escalation attempts
   */
  private async detectRoleEscalationAttempts(userId?: string): Promise<BreachIndicator[]> {
    const indicators: BreachIndicator[] = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Look for authorization bypass attempts
    const bypassAttempts = await prisma.auditLog.findMany({
      where: {
        timestamp: { gte: oneHourAgo },
        action: { in: ['AUTHORIZATION_DENIED', 'PERMISSION_DENIED', 'ACCESS_DENIED'] },
        ...(userId ? { userId } : {}),
      },
    });

    // Group by user
    const byUser = new Map<string, typeof bypassAttempts>();
    for (const attempt of bypassAttempts) {
      if (!attempt.userId) continue;
      const list = byUser.get(attempt.userId) || [];
      list.push(attempt);
      byUser.set(attempt.userId, list);
    }

    for (const [uid, attempts] of byUser) {
      if (attempts.length >= 5) {
        indicators.push({
          type: 'ROLE_ESCALATION_ATTEMPT',
          severity: attempts.length >= 10 ? 'HIGH' : 'MEDIUM',
          userId: uid,
          description: `User had ${attempts.length} authorization denied events in the last hour`,
          evidence: {
            deniedCount: attempts.length,
            deniedActions: [...new Set(attempts.map(a => a.entityType))],
          },
          timestamp: now,
        });
      }
    }

    return indicators;
  }

  /**
   * Detect data exfiltration indicators
   */
  private async detectDataExfiltration(userId?: string): Promise<BreachIndicator[]> {
    const indicators: BreachIndicator[] = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Check for excessive downloads/exports
    const exportActions = await prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        timestamp: { gte: oneHourAgo },
        action: { in: ['EXPORT', 'DOWNLOAD', 'PRINT', 'BULK_EXPORT'] },
        ...(userId ? { userId } : {}),
      },
      _count: { id: true },
    });

    for (const export_ of exportActions) {
      if (!export_.userId) continue;

      if (export_._count.id > THRESHOLDS.DOWNLOADS_HOURLY) {
        indicators.push({
          type: 'DATA_EXFILTRATION_INDICATOR',
          severity: 'CRITICAL',
          userId: export_.userId,
          description: `User performed ${export_._count.id} export/download operations in the last hour`,
          evidence: {
            exportCount: export_._count.id,
            threshold: THRESHOLDS.DOWNLOADS_HOURLY,
            timeWindow: '1 hour',
          },
          timestamp: now,
        });
      }
    }

    // Check for accessing many unique clients
    const clientAccess = await prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        timestamp: { gte: oneHourAgo },
        entityType: 'CLIENT',
        action: { in: ['VIEW', 'READ', 'ACCESS'] },
        ...(userId ? { userId } : {}),
      },
      _count: { id: true },
    });

    for (const access of clientAccess) {
      if (!access.userId) continue;

      // Get unique clients accessed
      const uniqueClients = await prisma.auditLog.findMany({
        where: {
          timestamp: { gte: oneHourAgo },
          userId: access.userId,
          entityType: 'CLIENT',
          action: { in: ['VIEW', 'READ', 'ACCESS'] },
        },
        select: { entityId: true },
        distinct: ['entityId'],
      });

      if (uniqueClients.length > THRESHOLDS.CLIENTS_ACCESSED_HOURLY) {
        indicators.push({
          type: 'EXCESSIVE_CLIENT_ACCESS',
          severity: 'HIGH',
          userId: access.userId,
          description: `User accessed ${uniqueClients.length} unique client records in the last hour`,
          evidence: {
            uniqueClientsAccessed: uniqueClients.length,
            threshold: THRESHOLDS.CLIENTS_ACCESSED_HOURLY,
            timeWindow: '1 hour',
          },
          timestamp: now,
        });
      }
    }

    return indicators;
  }

  /**
   * Store breach indicators in database
   */
  private async storeBreachIndicators(indicators: BreachIndicator[]): Promise<void> {
    for (const indicator of indicators) {
      await prisma.auditLog.create({
        data: {
          userId: indicator.userId,
          clientId: indicator.clientId,
          action: 'BREACH_INDICATOR_DETECTED',
          entityType: 'SECURITY',
          entityId: indicator.type,
          changes: {
            severity: indicator.severity,
            description: indicator.description,
            evidence: indicator.evidence,
          },
          ipAddress: indicator.ipAddress,
          timestamp: indicator.timestamp,
        },
      });
    }
  }

  /**
   * Send alerts for critical/high severity indicators
   */
  private async sendBreachAlerts(indicators: BreachIndicator[]): Promise<void> {
    // Log critical alerts
    for (const indicator of indicators) {
      auditLogger.error('CRITICAL BREACH INDICATOR', {
        action: 'BREACH_ALERT',
        type: indicator.type,
        severity: indicator.severity,
        userId: indicator.userId,
        description: indicator.description,
        evidence: indicator.evidence,
        timestamp: indicator.timestamp.toISOString(),
      });
    }

    // In production, this would also:
    // 1. Send email to security team
    // 2. Send SMS alerts to on-call
    // 3. Create incident ticket
    // 4. Potentially lock affected accounts

    // TODO: Integrate with notification service for real-time alerts
  }

  /**
   * Get recent breach indicators for dashboard
   */
  async getRecentIndicators(days: number = 7): Promise<any[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const indicators = await prisma.auditLog.findMany({
      where: {
        action: 'BREACH_INDICATOR_DETECTED',
        timestamp: { gte: since },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    return indicators;
  }
}

export default new BreachDetectionService();
