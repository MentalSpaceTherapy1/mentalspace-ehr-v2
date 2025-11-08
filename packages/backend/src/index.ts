import app from './app';
import config from './config';
import logger from './utils/logger';
import prisma from './services/database';
import { startAllProductivityJobs } from './jobs/productivityJobs';
import { initializeComplianceCronJobs } from './services/compliance.service';
import { initializeSocketIO } from './socket';
import { notificationScheduler } from './services/notifications/scheduler';
import { processRemindersJob, retryFailedRemindersJob } from './jobs/processReminders.job';
import { startWaitlistJobs, stopWaitlistJobs } from './jobs/processWaitlist.job';
import { startNoteReminderJob } from './jobs/processNoteReminders.job';
import { startReminderJobs } from './jobs/clinicalNoteReminderJob';
import { startConsentExpirationReminderJob } from './jobs/consentExpirationReminders.job';

const PORT = config.port;

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 MentalSpace EHR API is running on port ${PORT}`);
  logger.info(`📝 Environment: ${config.nodeEnv}`);
  logger.info(`🌐 CORS origins: ${config.corsOrigins.join(', ')}`);
});

// Initialize Socket.IO
initializeSocketIO(server);

// Test database connection
prisma.$connect()
  .then(() => {
    logger.info('✅ Database connected successfully');

    // Start productivity module scheduled jobs
    startAllProductivityJobs();

    // Start compliance cron jobs (Sunday lockout, reminders)
    initializeComplianceCronJobs();

    // Start notification scheduler (appointment reminders)
    notificationScheduler.startReminderJob();

    // Start Module 3 reminder jobs (automated SMS/Email reminders)
    logger.info('🔔 Starting Module 3 reminder processing jobs...');
    processRemindersJob.start();
    retryFailedRemindersJob.start();
    logger.info('✅ Module 3 reminder jobs started');

    // Start Module 3 Phase 2.2 waitlist automation jobs
    logger.info('⏳ Starting Module 3 Phase 2.2 waitlist automation jobs...');
    startWaitlistJobs();
    logger.info('✅ Waitlist automation jobs started');

    // Start Module 4 Phase 2.4 clinical note reminders
    logger.info('📧 Starting Module 4 Phase 2.4 clinical note reminder job...');
    startNoteReminderJob();
    logger.info('✅ Clinical note reminder job started');

    // Start Module 4 Phase 2.5 email reminder system
    logger.info('✉️ Starting Module 4 Phase 2.5 email reminder system...');
    startReminderJobs();
    logger.info('✅ Email reminder system started');

    // Start Module 6 telehealth consent expiration reminders
    logger.info('📋 Starting Module 6 telehealth consent expiration reminders...');
    startConsentExpirationReminderJob();
    logger.info('✅ Consent expiration reminder job started');
  })
  .catch((error) => {
    logger.error('❌ Database connection failed', { error: error.message });
    if (config.nodeEnv === 'production') {
      process.exit(1);
    }
  });

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Stop cron jobs
  notificationScheduler.stopReminderJob();
  processRemindersJob.stop();
  retryFailedRemindersJob.stop();
  logger.info('🔔 Module 3 reminder jobs stopped');

  stopWaitlistJobs();
  logger.info('⏳ Waitlist automation jobs stopped');

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      await prisma.$disconnect();
      logger.info('Database disconnected');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error });
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  if (config.nodeEnv === 'production') {
    gracefulShutdown('UNHANDLED_REJECTION');
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

export default server;

