/**
 * Recording Retention Job
 *
 * Background job that enforces recording retention policies:
 * - Warns 30 days before deletion
 * - Moves to archive after retention period
 * - Permanently deletes after grace period
 * - Georgia law: 7 years retention for mental health records
 *
 * Schedule: Runs daily at 2 AM
 *
 * @module recordingRetention.job
 */

import cron from 'node-cron';
import prisma from '../services/database';
import * as recordingService from '../services/recording.service';
import logger from '../utils/logger';

const DAYS_BEFORE_WARNING = 30; // Warn 30 days before deletion
const GRACE_PERIOD_DAYS = 90; // Keep for 90 days after scheduled deletion

/**
 * Process recordings approaching deletion
 * Send warnings to practice administrators
 */
async function processUpcomingDeletions() {
  try {
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + DAYS_BEFORE_WARNING);

    // Find recordings that will be deleted within 30 days
    const upcomingDeletions = await prisma.sessionRecording.findMany({
      where: {
        status: { in: ['AVAILABLE', 'ARCHIVED'] },
        scheduledDeletionAt: {
          lte: warningDate,
          gte: new Date(), // Not yet past deletion date
        },
      },
      include: {
        session: {
          include: {
            appointment: {
              include: {
                client: { select: { id: true, firstName: true, lastName: true } },
                clinician: { select: { id: true, firstName: true, lastName: true, email: true } },
              },
            },
          },
        },
      },
    });

    logger.info('Processing recordings approaching deletion', {
      count: upcomingDeletions.length,
      warningDate: warningDate.toISOString(),
    });

    for (const recording of upcomingDeletions) {
      const daysUntilDeletion = Math.ceil(
        (new Date(recording.scheduledDeletionAt!).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      );

      // Log warning
      logger.warn('Recording approaching deletion', {
        recordingId: recording.id,
        sessionId: recording.sessionId,
        scheduledDeletionAt: recording.scheduledDeletionAt,
        daysUntilDeletion,
        clientName: `${recording.session.appointment.client.firstName} ${recording.session.appointment.client.lastName}`,
        clinicianEmail: recording.session.appointment.clinician.email,
      });

      // TODO: Send email notification to clinician and practice admin
      // This would integrate with your email service
      // Example:
      // await emailService.send({
      //   to: recording.session.appointment.clinician.email,
      //   subject: `Recording Retention Warning: ${daysUntilDeletion} days until deletion`,
      //   body: `Recording for session ${recording.sessionId} will be deleted in ${daysUntilDeletion} days...`,
      // });
    }

    return upcomingDeletions.length;
  } catch (error: any) {
    logger.error('Failed to process upcoming deletions', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Archive recordings past retention date
 */
async function archiveExpiredRecordings() {
  try {
    const now = new Date();

    // Find recordings past their scheduled deletion date
    const expiredRecordings = await prisma.sessionRecording.findMany({
      where: {
        status: 'AVAILABLE',
        scheduledDeletionAt: {
          lte: now,
        },
      },
    });

    logger.info('Archiving expired recordings', {
      count: expiredRecordings.length,
    });

    for (const recording of expiredRecordings) {
      try {
        // Update status to ARCHIVED
        await prisma.sessionRecording.update({
          where: { id: recording.id },
          data: {
            status: 'ARCHIVED',
            lastModifiedBy: 'system',
          },
        });

        logger.info('Recording archived', {
          recordingId: recording.id,
          sessionId: recording.sessionId,
          scheduledDeletionAt: recording.scheduledDeletionAt,
        });

        // Log audit event
        await recordingService.logRecordingAccess({
          recordingId: recording.id,
          userId: 'system',
          action: 'AUTO_ARCHIVE',
          metadata: {
            reason: 'Retention period expired',
            originalScheduledDeletion: recording.scheduledDeletionAt,
          },
        });
      } catch (error: any) {
        logger.error('Failed to archive recording', {
          error: error.message,
          recordingId: recording.id,
        });
      }
    }

    return expiredRecordings.length;
  } catch (error: any) {
    logger.error('Failed to archive expired recordings', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Permanently delete recordings past grace period
 */
async function deleteRecordingsAfterGracePeriod() {
  try {
    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() - GRACE_PERIOD_DAYS);

    // Find archived recordings past grace period
    const recordingsToDelete = await prisma.sessionRecording.findMany({
      where: {
        status: 'ARCHIVED',
        scheduledDeletionAt: {
          lte: gracePeriodEnd,
        },
      },
    });

    logger.info('Permanently deleting recordings past grace period', {
      count: recordingsToDelete.length,
      gracePeriodDays: GRACE_PERIOD_DAYS,
    });

    for (const recording of recordingsToDelete) {
      try {
        await recordingService.deleteRecording(
          recording.id,
          'system',
          `Automatic deletion after ${GRACE_PERIOD_DAYS}-day grace period`
        );

        logger.info('Recording permanently deleted', {
          recordingId: recording.id,
          sessionId: recording.sessionId,
          originalScheduledDeletion: recording.scheduledDeletionAt,
          actualDeletionDate: new Date(),
        });
      } catch (error: any) {
        logger.error('Failed to delete recording', {
          error: error.message,
          recordingId: recording.id,
        });
      }
    }

    return recordingsToDelete.length;
  } catch (error: any) {
    logger.error('Failed to delete recordings after grace period', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Clean up failed or stuck recordings
 */
async function cleanupFailedRecordings() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find recordings stuck in PROCESSING or UPLOADING for more than 7 days
    const stuckRecordings = await prisma.sessionRecording.findMany({
      where: {
        status: { in: ['PROCESSING', 'UPLOADING'] },
        updatedAt: {
          lte: sevenDaysAgo,
        },
      },
    });

    logger.info('Cleaning up stuck recordings', {
      count: stuckRecordings.length,
    });

    for (const recording of stuckRecordings) {
      try {
        await prisma.sessionRecording.update({
          where: { id: recording.id },
          data: {
            status: 'FAILED',
            processingError: 'Recording stuck in processing for more than 7 days - marked as failed',
            lastModifiedBy: 'system',
          },
        });

        logger.warn('Recording marked as failed due to stuck status', {
          recordingId: recording.id,
          sessionId: recording.sessionId,
          status: recording.status,
          lastUpdated: recording.updatedAt,
        });
      } catch (error: any) {
        logger.error('Failed to cleanup stuck recording', {
          error: error.message,
          recordingId: recording.id,
        });
      }
    }

    return stuckRecordings.length;
  } catch (error: any) {
    logger.error('Failed to cleanup failed recordings', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Main retention job execution
 */
export async function runRetentionJob() {
  try {
    logger.info('Starting recording retention job');

    const startTime = Date.now();

    // Run all retention tasks
    const [warningCount, archiveCount, deleteCount, cleanupCount] = await Promise.all([
      processUpcomingDeletions(),
      archiveExpiredRecordings(),
      deleteRecordingsAfterGracePeriod(),
      cleanupFailedRecordings(),
    ]);

    const duration = Date.now() - startTime;

    logger.info('Recording retention job completed', {
      duration,
      warnings: warningCount,
      archived: archiveCount,
      deleted: deleteCount,
      cleaned: cleanupCount,
    });

    return {
      success: true,
      duration,
      warnings: warningCount,
      archived: archiveCount,
      deleted: deleteCount,
      cleaned: cleanupCount,
    };
  } catch (error: any) {
    logger.error('Recording retention job failed', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Schedule the retention job
 * Runs daily at 2 AM
 */
export function scheduleRetentionJob() {
  // Cron format: minute hour day month dayOfWeek
  // Run at 2:00 AM every day
  const schedule = '0 2 * * *';

  cron.schedule(schedule, async () => {
    logger.info('Recording retention job triggered by cron');
    try {
      await runRetentionJob();
    } catch (error: any) {
      logger.error('Scheduled retention job failed', {
        error: error.message,
      });
    }
  });

  logger.info('Recording retention job scheduled', {
    schedule,
    description: 'Daily at 2:00 AM',
  });
}

/**
 * Get retention statistics
 */
export async function getRetentionStats() {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [totalRecordings, available, archived, deleted, upcomingDeletions, failedRecordings] =
      await Promise.all([
        prisma.sessionRecording.count(),
        prisma.sessionRecording.count({ where: { status: 'AVAILABLE' } }),
        prisma.sessionRecording.count({ where: { status: 'ARCHIVED' } }),
        prisma.sessionRecording.count({ where: { status: 'DELETED' } }),
        prisma.sessionRecording.count({
          where: {
            status: { in: ['AVAILABLE', 'ARCHIVED'] },
            scheduledDeletionAt: {
              lte: thirtyDaysFromNow,
              gte: now,
            },
          },
        }),
        prisma.sessionRecording.count({ where: { status: 'FAILED' } }),
      ]);

    return {
      total: totalRecordings,
      available,
      archived,
      deleted,
      upcomingDeletions,
      failed: failedRecordings,
    };
  } catch (error: any) {
    logger.error('Failed to get retention stats', {
      error: error.message,
    });
    throw error;
  }
}
