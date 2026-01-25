/**
 * Crisis Detection Service
 *
 * This service provides crisis keyword detection functionality for the messaging system.
 * It scans messages for crisis-related keywords and alerts appropriate staff members.
 *
 * SAFETY-CRITICAL: This service is essential for client safety.
 */

import prisma from './database';
import { Prisma } from '@mentalspace/database';
import logger from '../utils/logger';
import { UserRoles } from '@mentalspace/shared';
import {
  CRISIS_KEYWORDS_BY_SEVERITY,
  CrisisSeverity,
  getHighestSeverity,
  CRISIS_DETECTION_CONFIG,
} from '../config/crisis-keywords';

/**
 * Filters for querying crisis logs
 */
export interface CrisisLogFilters {
  severity?: CrisisSeverity;
  reviewed?: boolean;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  skip?: number;
  take?: number;
}

/**
 * Detect crisis keywords in a message text
 * Returns array of detected keywords (case-preserved from keyword list)
 */
function scanForKeywords(messageText: string): string[] {
  const normalizedText = messageText.toLowerCase();
  const detectedKeywords: string[] = [];

  // Check all severity levels
  Object.values(CRISIS_KEYWORDS_BY_SEVERITY).forEach(keywordList => {
    keywordList.forEach(keyword => {
      // Use word boundary regex to match whole words/phrases only
      // This prevents matching "yourself harmless" when looking for "self harm"
      const pattern = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');

      if (pattern.test(normalizedText)) {
        detectedKeywords.push(keyword);
      }
    });
  });

  return detectedKeywords;
}

/**
 * Create a message snippet for logging (limited length for privacy)
 */
function createMessageSnippet(messageText: string): string {
  const maxLength = CRISIS_DETECTION_CONFIG.maxSnippetLength;

  if (messageText.length <= maxLength) {
    return messageText;
  }

  return messageText.substring(0, maxLength) + '...';
}

/**
 * Get the assigned clinician for a client
 */
async function getAssignedClinician(clientId: string): Promise<string | null> {
  try {
    // Find the client's primary clinician from appointments or assignments
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        appointments: {
          where: {
            status: {
              in: ['SCHEDULED', 'CHECKED_IN', 'COMPLETED'],
            },
          },
          orderBy: {
            appointmentDate: 'desc',
          },
          take: 1,
          include: {
            clinician: true,
          },
        },
      },
    });

    if (client?.appointments?.[0]?.clinicianId) {
      return client.appointments[0].clinicianId;
    }

    return null;
  } catch (error) {
    logger.error('Error getting assigned clinician', { error, clientId });
    return null;
  }
}

/**
 * Get all admin users who should be notified
 */
async function getAdminUsers(): Promise<string[]> {
  try {
    const admins = await prisma.user.findMany({
      where: {
        roles: {
          hasSome: [UserRoles.SUPER_ADMIN, UserRoles.ADMINISTRATOR],
        },
      },
      select: {
        id: true,
      },
    });

    return admins.map(admin => admin.id);
  } catch (error) {
    logger.error('Error getting admin users', { error });
    return [];
  }
}

/**
 * Send notification to staff about crisis detection
 * This is a placeholder - implement actual notification mechanism
 */
async function sendNotification(
  userId: string,
  detectionLog: any,
  severity: CrisisSeverity
): Promise<void> {
  try {
    // TODO: Implement actual notification mechanism
    // This could be:
    // - Email notification
    // - SMS alert
    // - In-app notification
    // - Push notification
    // - Real-time websocket alert

    logger.info('Crisis notification sent', {
      userId,
      detectionId: detectionLog.id,
      severity,
    });

    // Log crisis alert - use structured logging
    logger.warn('CRISIS ALERT detected', {
      severity,
      detectionId: detectionLog.id,
      messageId: detectionLog.messageId,
      userId: detectionLog.userId,
      keywords: detectionLog.keywords,
      notifying: userId,
    });
  } catch (error) {
    logger.error('Error sending crisis notification', { error, userId });
  }
}

/**
 * Notify appropriate staff members based on severity
 */
async function notifyStaff(
  detectionLog: any,
  severity: CrisisSeverity,
  clientId: string
): Promise<string[]> {
  const notifiedUsers: string[] = [];
  const settings = CRISIS_DETECTION_CONFIG.notificationSettings[severity];

  try {
    // Get assigned clinician if needed
    if (settings.notifyAssignedClinician) {
      const clinicianId = await getAssignedClinician(clientId);
      if (clinicianId) {
        await sendNotification(clinicianId, detectionLog, severity);
        notifiedUsers.push(clinicianId);
      }
    }

    // Get all admins if needed
    if (settings.notifyAllAdmins) {
      const adminIds = await getAdminUsers();
      for (const adminId of adminIds) {
        // Don't notify same person twice
        if (!notifiedUsers.includes(adminId)) {
          await sendNotification(adminId, detectionLog, severity);
          notifiedUsers.push(adminId);
        }
      }
    }

    logger.info('Staff notifications sent', {
      detectionId: detectionLog.id,
      severity,
      notifiedCount: notifiedUsers.length,
    });
  } catch (error) {
    logger.error('Error notifying staff', { error, detectionLog });
  }

  return notifiedUsers;
}

/**
 * Main function: Detect crisis keywords in a message and log detection
 */
export async function detectCrisisKeywords(
  messageText: string,
  messageId: string,
  userId: string,
  conversationId?: string
): Promise<void> {
  try {
    // Scan message for keywords
    const detectedKeywords = scanForKeywords(messageText);

    // If no keywords detected, return early
    if (detectedKeywords.length === 0) {
      return;
    }

    // Determine severity
    const severity = getHighestSeverity(detectedKeywords);

    // Create message snippet
    const snippet = createMessageSnippet(messageText);

    // Log the detection
    const detectionLog = await logCrisisDetection(
      messageId,
      userId,
      detectedKeywords,
      severity,
      snippet,
      conversationId
    );

    // Notify staff if notifications are enabled
    if (CRISIS_DETECTION_CONFIG.enableNotifications) {
      const notifiedUsers = await notifyStaff(detectionLog, severity, userId);

      // Update log with notification info
      await prisma.crisisDetectionLog.update({
        where: { id: detectionLog.id },
        data: {
          notificationsSent: true,
          notifiedUsers,
        },
      });
    }

    logger.info('Crisis keywords detected', {
      messageId,
      userId,
      severity,
      keywordCount: detectedKeywords.length,
    });
  } catch (error) {
    // CRITICAL: Never let detection errors break message sending
    logger.error('Error in crisis detection', {
      error,
      messageId,
      userId,
    });
  }
}

/**
 * Log a crisis detection to the database
 */
export async function logCrisisDetection(
  messageId: string,
  userId: string,
  keywords: string[],
  severity: CrisisSeverity,
  messageSnippet: string,
  conversationId?: string
): Promise<any> {
  try {
    const log = await prisma.crisisDetectionLog.create({
      data: {
        messageId,
        userId,
        conversationId,
        keywords,
        severity,
        messageSnippet,
        detectedAt: new Date(),
        notificationsSent: false,
        notifiedUsers: [],
        falsePositive: false,
      },
    });

    logger.info('Crisis detection logged', {
      logId: log.id,
      messageId,
      severity,
    });

    return log;
  } catch (error) {
    logger.error('Error logging crisis detection', { error, messageId });
    throw error;
  }
}

/**
 * Review a crisis detection log (mark as reviewed)
 */
export async function reviewDetection(
  logId: string,
  reviewerId: string,
  notes: string,
  falsePositive: boolean
): Promise<any> {
  try {
    const updated = await prisma.crisisDetectionLog.update({
      where: { id: logId },
      data: {
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: notes,
        falsePositive,
      },
    });

    logger.info('Crisis detection reviewed', {
      logId,
      reviewerId,
      falsePositive,
    });

    return updated;
  } catch (error) {
    logger.error('Error reviewing crisis detection', { error, logId });
    throw error;
  }
}

/**
 * Mark action taken on a crisis detection
 */
export async function markActionTaken(
  logId: string,
  actionTaken: string
): Promise<any> {
  try {
    const updated = await prisma.crisisDetectionLog.update({
      where: { id: logId },
      data: {
        actionTaken,
      },
    });

    logger.info('Crisis detection action recorded', {
      logId,
      actionTaken,
    });

    return updated;
  } catch (error) {
    logger.error('Error marking action taken', { error, logId });
    throw error;
  }
}

/**
 * Get crisis detection logs with filtering and pagination
 */
export async function getCrisisLogs(filters: CrisisLogFilters) {
  try {
    const where: Prisma.CrisisDetectionLogWhereInput = {};

    if (filters.severity) {
      where.severity = filters.severity;
    }

    if (filters.reviewed !== undefined) {
      if (filters.reviewed) {
        where.reviewedBy = { not: null };
      } else {
        where.reviewedBy = null;
      }
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.startDate || filters.endDate) {
      where.detectedAt = {};
      if (filters.startDate) {
        where.detectedAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.detectedAt.lte = filters.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.crisisDetectionLog.findMany({
        where,
        orderBy: [
          { severity: 'asc' }, // CRITICAL first
          { detectedAt: 'desc' },
        ],
        skip: filters.skip || 0,
        take: filters.take || 50,
      }),
      prisma.crisisDetectionLog.count({ where }),
    ]);

    return { logs, total };
  } catch (error) {
    logger.error('Error getting crisis logs', { error, filters });
    throw error;
  }
}

/**
 * Get statistics on crisis detections
 */
export async function getCrisisStats(filters?: {
  startDate?: Date;
  endDate?: Date;
}) {
  try {
    const where: Prisma.CrisisDetectionLogWhereInput = {};

    if (filters?.startDate || filters?.endDate) {
      where.detectedAt = {};
      if (filters.startDate) {
        where.detectedAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.detectedAt.lte = filters.endDate;
      }
    }

    const [
      totalDetections,
      criticalCount,
      highCount,
      mediumCount,
      reviewedCount,
      falsePositiveCount,
    ] = await Promise.all([
      prisma.crisisDetectionLog.count({ where }),
      prisma.crisisDetectionLog.count({
        where: { ...where, severity: CrisisSeverity.CRITICAL },
      }),
      prisma.crisisDetectionLog.count({
        where: { ...where, severity: CrisisSeverity.HIGH },
      }),
      prisma.crisisDetectionLog.count({
        where: { ...where, severity: CrisisSeverity.MEDIUM },
      }),
      prisma.crisisDetectionLog.count({
        where: { ...where, reviewedBy: { not: null } },
      }),
      prisma.crisisDetectionLog.count({
        where: { ...where, falsePositive: true },
      }),
    ]);

    return {
      totalDetections,
      bySeverity: {
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
      },
      reviewedCount,
      pendingReviewCount: totalDetections - reviewedCount,
      falsePositiveCount,
    };
  } catch (error) {
    logger.error('Error getting crisis stats', { error });
    throw error;
  }
}

/**
 * Get a single crisis detection log by ID
 */
export async function getCrisisLogById(logId: string) {
  try {
    const log = await prisma.crisisDetectionLog.findUnique({
      where: { id: logId },
    });

    if (!log) {
      throw new Error('Crisis detection log not found');
    }

    return log;
  } catch (error) {
    logger.error('Error getting crisis log', { error, logId });
    throw error;
  }
}
