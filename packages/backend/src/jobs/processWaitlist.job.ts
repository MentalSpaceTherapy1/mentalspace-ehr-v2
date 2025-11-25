import cron from 'node-cron';
import logger from '../utils/logger';
import * as waitlistMatchingService from '../services/waitlistMatching.service';

/**
 * Module 3 Phase 2.2: Waitlist Automation Cron Job
 * Runs hourly to automatically match waitlist entries to available slots
 */

let isProcessingWaitlist = false;

/**
 * Process waitlist and send offers every hour
 * Runs at the top of each hour
 */
export const processWaitlistJob = cron.schedule(
  '0 * * * *',
  async () => {
    // Prevent overlapping executions
    if (isProcessingWaitlist) {
      logger.warn('Waitlist processing already in progress, skipping this run');
      return;
    }

    isProcessingWaitlist = true;

    try {
      logger.info('⏳ Starting waitlist automation job...');

      const results = await waitlistMatchingService.processAutomaticMatching();

      logger.info('✅ Waitlist automation complete', {
        processed: results.processed,
        matched: results.matched,
        offered: results.offered,
        errors: results.errors,
      });

      // Log success metrics
      if (results.processed > 0) {
        const matchRate = ((results.matched / results.processed) * 100).toFixed(2);
        const offerRate = results.matched > 0
          ? ((results.offered / results.matched) * 100).toFixed(2)
          : '0';

        logger.info(`📊 Waitlist metrics`, {
          matchRate: `${matchRate}%`,
          offerRate: `${offerRate}%`,
          processed: results.processed,
          matched: results.matched,
          offered: results.offered,
        });
      }

      // Alert if there are errors
      if (results.errors > 0) {
        logger.warn(`⚠️ ${results.errors} errors occurred during waitlist processing`);
      }
    } catch (error) {
      logger.error('❌ Error in waitlist automation job', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    } finally {
      isProcessingWaitlist = false;
    }
  },
  {
    timezone: 'America/New_York',
    // TODO: Call .start() manually to begin this cron task
  }
);

/**
 * Update priority scores every 4 hours
 * This ensures priority scores reflect current wait times
 */
export const updatePriorityScoresJob = cron.schedule(
  '0 */4 * * *',
  async () => {
    try {
      logger.info('🔄 Updating waitlist priority scores...');

      await waitlistMatchingService.updateAllPriorityScores();

      logger.info('✅ Priority scores updated');
    } catch (error) {
      logger.error('❌ Error updating priority scores', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  },
  {
    timezone: 'America/New_York',
    // TODO: Call .start() manually to begin this cron task
  }
);

/**
 * Start all waitlist jobs
 */
export function startWaitlistJobs(): void {
  try {
    processWaitlistJob.start();
    updatePriorityScoresJob.start();

    logger.info('📅 Waitlist automation jobs started successfully', {
      processWaitlistSchedule: '0 * * * * (every hour)',
      updateScoresSchedule: '0 */4 * * * (every 4 hours)',
    });
  } catch (error) {
    logger.error('Failed to start waitlist jobs', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Stop all waitlist jobs
 */
export function stopWaitlistJobs(): void {
  try {
    processWaitlistJob.stop();
    updatePriorityScoresJob.stop();

    logger.info('⏹️ Waitlist automation jobs stopped');
  } catch (error) {
    logger.error('Failed to stop waitlist jobs', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get job status
 */
export function getWaitlistJobStatus(): {
  processWaitlist: {
    running: boolean;
    processing: boolean;
  };
  updateScores: {
    running: boolean;
  };
} {
  return {
    processWaitlist: {
      running: processWaitlistJob.getStatus() === 'running',
      processing: isProcessingWaitlist,
    },
    updateScores: {
      running: updatePriorityScoresJob.getStatus() === 'running',
    },
  };
}

/**
 * Manually trigger waitlist processing (for testing)
 */
export async function triggerWaitlistProcessing(): Promise<any> {
  if (isProcessingWaitlist) {
    throw new Error('Waitlist processing already in progress');
  }

  isProcessingWaitlist = true;

  try {
    logger.info('⏳ Manually triggered waitlist processing...');
    const results = await waitlistMatchingService.processAutomaticMatching();
    logger.info('✅ Manual waitlist processing complete', results);
    return results;
  } finally {
    isProcessingWaitlist = false;
  }
}

/**
 * Manually trigger priority score update (for testing)
 */
export async function triggerPriorityScoreUpdate(): Promise<void> {
  try {
    logger.info('🔄 Manually triggered priority score update...');
    await waitlistMatchingService.updateAllPriorityScores();
    logger.info('✅ Manual priority score update complete');
  } catch (error) {
    logger.error('Error in manual priority score update', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, stopping waitlist jobs...');
  stopWaitlistJobs();
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, stopping waitlist jobs...');
  stopWaitlistJobs();
});
