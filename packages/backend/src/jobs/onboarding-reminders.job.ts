import cron from 'node-cron';
import prisma from '../services/database';
import logger from '../utils/logger';
import { ChecklistItem } from '../services/onboarding.service';

/**
 * Module 9: Staff Management - Onboarding Reminders Cron Job
 *
 * Sends automated reminders for incomplete onboarding tasks
 * Runs daily at 9:00 AM to check for overdue or upcoming tasks
 */

interface OnboardingReminder {
  userId: string;
  userName: string;
  email: string;
  checklistId: string;
  incompleteTasks: number;
  overdueTasks: number;
  completionPercentage: number;
  mentorId?: string;
  mentorName?: string;
  mentorEmail?: string;
}

class OnboardingRemindersJob {
  private jobSchedule = '0 9 * * *'; // Daily at 9:00 AM
  private isRunning = false;

  /**
   * Start the cron job
   */
  start() {
    cron.schedule(this.jobSchedule, async () => {
      await this.executeJob();
    });

    logger.info(`Onboarding reminders job scheduled: ${this.jobSchedule}`);
  }

  /**
   * Execute the job manually (for testing)
   */
  async executeJob() {
    if (this.isRunning) {
      logger.warn('Onboarding reminders job is already running. Skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting onboarding reminders job...');

      // Get all incomplete onboarding checklists
      const incompleteChecklists = await prisma.onboardingChecklist.findMany({
        where: {
          completionDate: null,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              isActive: true,
            },
          },
          mentor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      logger.info(`Found ${incompleteChecklists.length} incomplete onboarding checklists`);

      const reminders: OnboardingReminder[] = [];

      for (const checklist of incompleteChecklists) {
        // Skip inactive users
        if (!checklist.user.isActive) {
          continue;
        }

        const items = checklist.items as ChecklistItem[];
        const incompleteTasks = items.filter((item) => !item.completed);

        // Count overdue tasks
        const now = new Date();
        const overdueTasks = incompleteTasks.filter((item) => {
          if (!item.dueDate) return false;
          return new Date(item.dueDate) < now;
        });

        // Only send reminder if there are incomplete or overdue tasks
        if (incompleteTasks.length > 0) {
          const reminder: OnboardingReminder = {
            userId: checklist.user.id,
            userName: `${checklist.user.firstName} ${checklist.user.lastName}`,
            email: checklist.user.email,
            checklistId: checklist.id,
            incompleteTasks: incompleteTasks.length,
            overdueTasks: overdueTasks.length,
            completionPercentage: checklist.completionPercentage,
          };

          if (checklist.mentor) {
            reminder.mentorId = checklist.mentor.id;
            reminder.mentorName = `${checklist.mentor.firstName} ${checklist.mentor.lastName}`;
            reminder.mentorEmail = checklist.mentor.email;
          }

          reminders.push(reminder);
        }
      }

      // Process reminders
      if (reminders.length > 0) {
        await this.sendReminders(reminders);
        logger.info(`Sent ${reminders.length} onboarding reminders`);
      } else {
        logger.info('No onboarding reminders needed');
      }

      // Check for milestone reminders (30, 60, 90 days)
      await this.checkMilestoneReminders();

      const duration = Date.now() - startTime;
      logger.info(`Onboarding reminders job completed in ${duration}ms`);
    } catch (error) {
      logger.error('Error in onboarding reminders job:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Send reminder notifications
   * In production, this would integrate with email service
   */
  private async sendReminders(reminders: OnboardingReminder[]) {
    for (const reminder of reminders) {
      try {
        // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
        // For now, just log the reminder
        logger.info(
          `Onboarding reminder for ${reminder.userName} (${reminder.email}): ` +
            `${reminder.incompleteTasks} incomplete tasks, ` +
            `${reminder.overdueTasks} overdue, ` +
            `${reminder.completionPercentage}% complete`
        );

        // If there's a mentor, send them a notification too
        if (reminder.mentorId && reminder.overdueTasks > 0) {
          logger.info(
            `Mentor notification to ${reminder.mentorName} (${reminder.mentorEmail}): ` +
              `Mentee ${reminder.userName} has ${reminder.overdueTasks} overdue onboarding tasks`
          );
        }

        // Example email content structure:
        /*
        const emailContent = {
          to: reminder.email,
          subject: 'Onboarding Task Reminder',
          html: `
            <h2>Hello ${reminder.userName}!</h2>
            <p>You have ${reminder.incompleteTasks} incomplete onboarding tasks.</p>
            ${reminder.overdueTasks > 0 ? `<p><strong>${reminder.overdueTasks} tasks are overdue.</strong></p>` : ''}
            <p>Your onboarding is ${reminder.completionPercentage}% complete.</p>
            <p>Please log in to complete your onboarding checklist.</p>
          `,
        };
        await emailService.send(emailContent);
        */

        // Example mentor notification:
        /*
        if (reminder.mentorId && reminder.overdueTasks > 0) {
          const mentorEmail = {
            to: reminder.mentorEmail,
            subject: 'Mentee Onboarding Reminder',
            html: `
              <h2>Hello ${reminder.mentorName}!</h2>
              <p>Your mentee ${reminder.userName} has ${reminder.overdueTasks} overdue onboarding tasks.</p>
              <p>Please follow up with them to ensure they complete their onboarding.</p>
            `,
          };
          await emailService.send(mentorEmail);
        }
        */
      } catch (error) {
        logger.error(`Error sending reminder to ${reminder.email}:`, error);
      }
    }
  }

  /**
   * Check for milestone reminders (30, 60, 90 days)
   */
  private async checkMilestoneReminders() {
    const now = new Date();

    // Get all active onboarding checklists
    const checklists = await prisma.onboardingChecklist.findMany({
      where: {
        completionDate: null,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isActive: true,
          },
        },
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    for (const checklist of checklists) {
      if (!checklist.user.isActive) continue;

      const daysSinceStart = Math.floor(
        (now.getTime() - checklist.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check for 30-day milestone
      if (daysSinceStart === 30 && !checklist.thirtyDayComplete) {
        logger.info(
          `30-day milestone reminder for ${checklist.user.firstName} ${checklist.user.lastName}`
        );
        // TODO: Send milestone reminder email
      }

      // Check for 60-day milestone
      if (daysSinceStart === 60 && !checklist.sixtyDayComplete) {
        logger.info(
          `60-day milestone reminder for ${checklist.user.firstName} ${checklist.user.lastName}`
        );
        // TODO: Send milestone reminder email
      }

      // Check for 90-day milestone
      if (daysSinceStart === 90 && !checklist.ninetyDayComplete) {
        logger.info(
          `90-day milestone reminder for ${checklist.user.firstName} ${checklist.user.lastName}`
        );
        // TODO: Send milestone reminder email
      }

      // Alert if onboarding is taking too long (> 120 days and not complete)
      if (daysSinceStart > 120 && checklist.completionPercentage < 100) {
        logger.warn(
          `Onboarding delayed for ${checklist.user.firstName} ${checklist.user.lastName}: ` +
            `${daysSinceStart} days, ${checklist.completionPercentage}% complete`
        );
        // TODO: Send escalation email to HR/Admin
      }
    }
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      schedule: this.jobSchedule,
      isRunning: this.isRunning,
    };
  }
}

export default new OnboardingRemindersJob();
