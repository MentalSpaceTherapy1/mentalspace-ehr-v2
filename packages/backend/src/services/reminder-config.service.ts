/**
 * Reminder Configuration Service
 * Phase 3.2: Moved database operations from controller to service
 */

import prisma from './database';

// ============================================================================
// TYPES
// ============================================================================

export interface ReminderConfigInput {
  practiceSettingsId: string;

  // SMS Configuration
  smsEnabled: boolean;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  smsTemplateReminder?: string;
  smsTemplateConfirmation?: string;

  // Email Configuration
  emailEnabled: boolean;
  sesRegion?: string;
  sesFromEmail?: string;
  sesFromName?: string;
  emailTemplateSubject?: string;
  emailTemplateBody?: string;
  includeIcsAttachment?: boolean;

  // Voice Configuration
  voiceEnabled?: boolean;
  voiceScriptUrl?: string;
  voiceFromNumber?: string;

  // Reminder Schedule
  enableOneWeekReminder?: boolean;
  oneWeekOffset?: number;
  enableTwoDayReminder?: boolean;
  twoDayOffset?: number;
  enableOneDayReminder?: boolean;
  oneDayOffset?: number;
  enableDayOfReminder?: boolean;
  dayOfOffset?: number;

  // Retry logic
  maxRetries?: number;
  retryDelayMinutes?: number;

  // Operating hours
  sendStartHour?: number;
  sendEndHour?: number;
  sendOnWeekends?: boolean;
}

const practiceSettingsSelect = {
  id: true,
  practiceName: true,
};

// ============================================================================
// SERVICE METHODS
// ============================================================================

/**
 * Get reminder configuration with practice settings
 */
export async function getReminderConfiguration() {
  return prisma.reminderConfiguration.findFirst({
    include: {
      practiceSettings: {
        select: practiceSettingsSelect,
      },
    },
  });
}

/**
 * Get reminder configuration (basic)
 */
export async function getReminderConfigurationBasic() {
  return prisma.reminderConfiguration.findFirst();
}

/**
 * Update or create reminder configuration
 */
export async function upsertReminderConfiguration(data: ReminderConfigInput) {
  const existingConfig = await prisma.reminderConfiguration.findFirst();

  if (existingConfig) {
    return prisma.reminderConfiguration.update({
      where: { id: existingConfig.id },
      data,
    });
  } else {
    return prisma.reminderConfiguration.create({
      data,
    });
  }
}

/**
 * Get reminder statistics
 */
export async function getReminderStatistics(startDate?: Date, endDate?: Date) {
  return prisma.appointmentReminder.groupBy({
    by: ['deliveryStatus', 'reminderType'],
    _count: {
      id: true,
    },
    _sum: {
      cost: true,
    },
    where: {
      createdAt: {
        gte: startDate || undefined,
        lte: endDate || undefined,
      },
    },
  });
}
