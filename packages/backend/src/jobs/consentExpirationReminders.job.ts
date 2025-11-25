import cron from 'node-cron';
import prisma from '../services/database';
import logger from '../utils/logger';
import * as emailService from '../services/email.service';

/**
 * Background job to send consent expiration reminders
 * Runs daily at 9:00 AM
 *
 * Reminder schedule:
 * - 30 days before expiration
 * - 15 days before expiration
 * - 7 days before expiration
 * - 1 day before expiration
 */

interface ReminderLog {
  consentId: string;
  clientId: string;
  reminderType: string;
  daysTillExpiration: number;
  emailSent: boolean;
  error?: string;
}

/**
 * Process consent expiration reminders
 */
async function processConsentExpirationReminders() {
  const startTime = Date.now();
  logger.info('Starting consent expiration reminder job');

  const reminderLogs: ReminderLog[] = [];
  let totalReminders = 0;
  let successfulReminders = 0;
  let failedReminders = 0;

  try {
    // Define reminder windows (days before expiration)
    const reminderWindows = [30, 15, 7, 1];

    for (const daysBeforeExpiration of reminderWindows) {
      const reminders = await findConsentsExpiringIn(daysBeforeExpiration);

      logger.info(`Found ${reminders.length} consents expiring in ${daysBeforeExpiration} days`);

      for (const consent of reminders) {
        totalReminders++;

        try {
          // Check if reminder already sent for this window
          const alreadySent = await checkReminderSent(
            consent.id,
            daysBeforeExpiration
          );

          if (alreadySent) {
            logger.debug(`Reminder already sent for consent ${consent.id} at ${daysBeforeExpiration} days`);
            continue;
          }

          // Send reminder email to client
          await sendConsentExpirationEmail(consent, daysBeforeExpiration);

          // Log reminder sent
          await logReminderSent(consent.id, daysBeforeExpiration);

          successfulReminders++;

          reminderLogs.push({
            consentId: consent.id,
            clientId: consent.clientId,
            reminderType: `${daysBeforeExpiration}_days`,
            daysTillExpiration: daysBeforeExpiration,
            emailSent: true,
          });

          logger.info('Consent expiration reminder sent', {
            consentId: consent.id,
            clientId: consent.clientId,
            clientEmail: consent.client.email,
            daysBeforeExpiration,
          });
        } catch (error: any) {
          failedReminders++;

          reminderLogs.push({
            consentId: consent.id,
            clientId: consent.clientId,
            reminderType: `${daysBeforeExpiration}_days`,
            daysTillExpiration: daysBeforeExpiration,
            emailSent: false,
            error: error.message,
          });

          logger.error('Failed to send consent expiration reminder', {
            consentId: consent.id,
            clientId: consent.clientId,
            error: error.message,
          });
        }
      }
    }

    const duration = Date.now() - startTime;

    logger.info('Consent expiration reminder job completed', {
      totalReminders,
      successfulReminders,
      failedReminders,
      durationMs: duration,
    });
  } catch (error: any) {
    logger.error('Consent expiration reminder job failed', {
      error: error.message,
      stack: error.stack,
    });
  }
}

/**
 * Find consents expiring in exactly N days
 */
async function findConsentsExpiringIn(days: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(today);
  targetDate.setDate(targetDate.getDate() + days);

  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const consents = await prisma.telehealthConsent.findMany({
    where: {
      isActive: true,
      consentGiven: true,
      consentWithdrawn: false,
      expirationDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return consents;
}

/**
 * Check if reminder was already sent
 */
async function checkReminderSent(
  consentId: string,
  daysBeforeExpiration: number
): Promise<boolean> {
  // TODO: consentReminderLog model not implemented in Prisma schema
  // Unable to track sent reminders - will send reminders every time job runs
  return false; // Always return false so reminders are sent

  /* Commented out until consentReminderLog model is added
  // Check if we have a reminder log for this consent and day window
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const log = await prisma.consentReminderLog.findFirst({
    where: {
      consentId,
      reminderType: `${daysBeforeExpiration}_days`,
      sentAt: {
        gte: today,
      },
    },
  });

  return !!log;
  */
}

/**
 * Log reminder sent
 */
async function logReminderSent(
  consentId: string,
  daysBeforeExpiration: number
) {
  // TODO: consentReminderLog model not implemented in Prisma schema
  // Unable to log sent reminders
  return;

  /* Commented out until consentReminderLog model is added
  await prisma.consentReminderLog.create({
    data: {
      consentId,
      reminderType: `${daysBeforeExpiration}_days`,
      sentAt: new Date(),
    },
  });
  */
}

/**
 * Send consent expiration email to client
 */
async function sendConsentExpirationEmail(
  consent: any,
  daysBeforeExpiration: number
) {
  const client = consent.client;
  const expirationDate = new Date(consent.expirationDate);

  // Determine urgency level
  let urgency = 'notice';
  let subject = '';

  if (daysBeforeExpiration === 1) {
    urgency = 'urgent';
    subject = 'URGENT: Telehealth Consent Expires Tomorrow';
  } else if (daysBeforeExpiration === 7) {
    urgency = 'important';
    subject = 'Important: Telehealth Consent Expires in 1 Week';
  } else if (daysBeforeExpiration === 15) {
    urgency = 'notice';
    subject = 'Notice: Telehealth Consent Expires in 15 Days';
  } else if (daysBeforeExpiration === 30) {
    urgency = 'notice';
    subject = 'Notice: Telehealth Consent Expires in 30 Days';
  }

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">MentalSpace EHR</h1>
      </div>

      <div style="padding: 30px; background: #f9fafb;">
        <h2 style="color: #1f2937; margin-top: 0;">Telehealth Consent Expiration Notice</h2>

        <p style="color: #4b5563; font-size: 16px;">
          Dear ${client.firstName} ${client.lastName},
        </p>

        <div style="background: ${urgency === 'urgent' ? '#fee2e2' : urgency === 'important' ? '#fef3c7' : '#dbeafe'};
                    border-left: 4px solid ${urgency === 'urgent' ? '#ef4444' : urgency === 'important' ? '#f59e0b' : '#3b82f6'};
                    padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #1f2937; font-size: 16px; font-weight: 600;">
            Your telehealth consent will expire in ${daysBeforeExpiration} day${daysBeforeExpiration > 1 ? 's' : ''}.
          </p>
          <p style="margin: 8px 0 0 0; color: #4b5563;">
            Expiration Date: ${expirationDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        <p style="color: #4b5563; font-size: 16px;">
          Georgia law requires annual renewal of telehealth consent. Without valid consent,
          you will not be able to join telehealth sessions.
        </p>

        <h3 style="color: #1f2937;">What You Need to Do:</h3>
        <ol style="color: #4b5563; font-size: 16px; line-height: 1.8;">
          <li>Log in to your MentalSpace EHR account</li>
          <li>Navigate to your next telehealth appointment</li>
          <li>Review and sign the updated consent form</li>
          <li>Your consent will be renewed for another year</li>
        </ol>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/appointments"
             style="background: #3b82f6; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 8px; display: inline-block;
                    font-weight: 600; font-size: 16px;">
            Renew Consent Now
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          If you have any questions, please contact your provider or our support team.
        </p>
      </div>

      <div style="background: #1f2937; padding: 20px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          MentalSpace EHR | Telehealth Compliance System
        </p>
      </div>
    </div>
  `;

  // Send email using email service
  await emailService.sendEmail({
    to: client.email,
    subject,
    html: emailHtml,
  });
}

/**
 * Start the cron job
 * Runs daily at 9:00 AM
 */
export function startConsentExpirationReminderJob() {
  // Schedule: Run daily at 9:00 AM
  // Cron format: second minute hour day month weekday
  // '0 9 * * *' = At 9:00 AM every day
  const schedule = '0 9 * * *';

  cron.schedule(schedule, async () => {
    await processConsentExpirationReminders();
  });

  logger.info('Consent expiration reminder job scheduled', {
    schedule: 'Daily at 9:00 AM',
  });
}

// Export for manual testing
export { processConsentExpirationReminders };
