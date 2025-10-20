import logger, { logControllerError } from '../utils/logger';
import prisma from './database';
import { encryptSensitiveFields, decryptSensitiveFields, maskSensitiveFields } from '../utils/encryption';

/**
 * Get practice settings
 * @param maskSensitive - Whether to mask sensitive fields (for non-admin users)
 */
export async function getPracticeSettings(maskSensitive: boolean = false) {
  let settings = await prisma.practiceSettings.findFirst();

  // If no settings exist, initialize with defaults
  if (!settings) {
    settings = await initializePracticeSettings();
  }

  // Decrypt sensitive fields for admin view
  if (!maskSensitive) {
    settings = decryptSensitiveFields(settings);
  } else {
    // Mask sensitive fields for public/non-admin view
    settings = maskSensitiveFields(settings);
  }

  return settings;
}

/**
 * Update practice settings
 * @param data - Updated settings data
 * @param userId - ID of user making the update (for audit trail)
 */
export async function updatePracticeSettings(data: any, userId: string) {
  // Get current settings
  let currentSettings = await prisma.practiceSettings.findFirst();

  if (!currentSettings) {
    // Initialize if doesn't exist
    currentSettings = await initializePracticeSettings();
  }

  // Encrypt sensitive fields before saving
  const encryptedData = encryptSensitiveFields(data);

  // Update settings
  const updatedSettings = await prisma.practiceSettings.update({
    where: { id: currentSettings.id },
    data: {
      ...encryptedData,
      lastModifiedBy: userId,
      updatedAt: new Date(),
    },
  });

  // Create audit log entry
  await createSettingsAuditLog(userId, 'UPDATE', data);

  // Decrypt for return
  return decryptSensitiveFields(updatedSettings);
}

/**
 * Initialize practice settings with default values
 */
export async function initializePracticeSettings() {
  // Check if settings already exist
  const existing = await prisma.practiceSettings.findFirst();
  if (existing) {
    return existing;
  }

  // Create default settings
  const defaultSettings = await prisma.practiceSettings.create({
    data: {
      // General Practice Information
      practiceName: 'MentalSpace Practice',
      practiceEmail: 'admin@mentalspace.com',
      practicePhone: '(555) 123-4567',
      practiceWebsite: null,
      practiceLogo: null,
      timezone: 'America/New_York',
      businessHoursStart: '09:00',
      businessHoursEnd: '17:00',
      businessDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],

      // Address
      addressStreet1: '123 Main Street',
      addressStreet2: 'Suite 200',
      addressCity: 'Atlanta',
      addressState: 'GA',
      addressZipCode: '30301',

      // Clinical Documentation Settings
      defaultNoteDueDays: 3,
      requireCosignForAssociates: true,
      enableAutoLockout: true,
      lockoutDay: 'Sunday',
      lockoutTime: '23:59',
      enableNoteReminders: true,
      noteReminderSchedule: [2, 1, 0],
      allowLateNoteCompletion: false,
      requireSignatureForCompletion: true,

      // Scheduling Settings
      defaultAppointmentDuration: 50,
      enableOnlineBooking: false,
      enableWaitlist: true,
      enableRecurringAppointments: true,
      cancellationNoticePeriod: 24,
      enableCancellationFees: false,
      cancellationFeeAmount: null,
      noShowFeeAmount: null,
      bufferBetweenAppointments: 10,
      maxAdvanceBookingDays: 90,

      // Billing Settings
      defaultCurrency: 'USD',
      taxRate: 0,
      enableInsuranceBilling: true,
      enableSelfPayBilling: true,
      requirePaymentAtTimeOfService: false,
      acceptedPaymentMethods: ['Cash', 'Credit Card', 'Check', 'Insurance'],
      lateFeeEnabled: false,
      lateFeeAmount: null,
      lateFeeDaysAfterDue: 30,
      invoicePrefix: 'INV',
      invoiceStartingNumber: 1000,

      // Compliance Settings
      hipaaComplianceEnabled: true,
      requireTwoFactorAuth: false,
      passwordExpirationDays: 90,
      sessionTimeoutMinutes: 30,
      enableAuditLogging: true,
      dataRetentionYears: 7,
      enableAutoBackup: true,
      backupFrequency: 'Daily',
      requireConsentForms: true,
      enableClientPortal: true,

      // Telehealth Settings
      enableTelehealth: true,
      telehealthPlatform: 'Built-in',
      requireConsentForTelehealth: true,
      recordTelehealthSessions: false,
      telehealthRecordingDisclosure: null,

      // Supervision Settings
      enableSupervision: true,
      requiredSupervisionHours: 3000,
      supervisionSessionFrequency: 'Weekly',
      enableGroupSupervision: true,
      enableTriadicSupervision: true,

      // AI Integration Settings
      enableAIFeatures: false,
      aiProvider: null,
      aiModel: null,
      aiApiKey: null,
      enableAINoteGeneration: false,
      enableAITreatmentSuggestions: false,
      enableAIScheduling: false,
      enableAIDiagnosisAssistance: false,
      aiConfidenceThreshold: 0.8,
      requireHumanReview: true,
      aiUsageLogging: true,

      // Email Notification Settings
      smtpHost: null,
      smtpPort: null,
      smtpSecure: true,
      smtpUser: null,
      smtpPass: null,
      emailFromName: null,
      emailFromAddress: null,
      enableAppointmentReminders: true,
      enableBillingReminders: true,
      enableSystemNotifications: true,

      // Client Portal Settings
      portalRequireEmailVerification: true,
      portalEnableAppointmentBooking: true,
      portalEnableBilling: true,
      portalEnableMessaging: true,
      portalEnableDocuments: true,
      portalEnableMoodTracking: true,
      portalEnableAssessments: true,

      // Reporting Settings
      enableProductivityReports: true,
      enableFinancialReports: true,
      enableComplianceReports: true,
      reportDistributionEmail: null,
      autoGenerateMonthlyReports: false,

      // Feature Flags
      enableBetaFeatures: false,
      enableExperimentalAI: false,
      enableAdvancedAnalytics: false,

      // Audit
      lastModifiedBy: 'SYSTEM',
    },
  });

  return defaultSettings;
}

/**
 * Get public-facing settings (non-sensitive data only)
 */
export async function getPublicSettings() {
  const settings = await getPracticeSettings(true);

  if (!settings) {
    return null;
  }

  // Return only public information
  return {
    practiceName: settings.practiceName,
    practicePhone: settings.practicePhone,
    practiceWebsite: settings.practiceWebsite,
    practiceLogo: settings.practiceLogo,
    timezone: settings.timezone,
    businessHoursStart: settings.businessHoursStart,
    businessHoursEnd: settings.businessHoursEnd,
    businessDays: settings.businessDays,
    addressCity: settings.addressCity,
    addressState: settings.addressState,
    enableOnlineBooking: settings.enableOnlineBooking,
    enableClientPortal: settings.enableClientPortal,
    acceptedPaymentMethods: settings.acceptedPaymentMethods,
  };
}

/**
 * Create audit log entry for settings changes
 */
async function createSettingsAuditLog(userId: string, action: string, changes: any) {
  try {
    // For now, just log to console
    // In production, you'd store this in an AuditLog table
    logger.info('📋 [SETTINGS AUDIT]', {
      timestamp: new Date().toISOString(),
      userId,
      action,
      changes: Object.keys(changes),
    });

    // TODO: Implement database audit logging
    // await prisma.auditLog.create({
    //   data: {
    //     userId,
    //     action: 'SETTINGS_UPDATE',
    //     entityType: 'PracticeSettings',
    //     changes: JSON.stringify(changes),
    //   },
    // });
  } catch (error) {
    logger.error('Failed to create audit log:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
  }
}

/**
 * Validate practice settings data
 */
export function validatePracticeSettings(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // General validation
  if (data.practiceName && data.practiceName.length < 2) {
    errors.push('Practice name must be at least 2 characters');
  }

  if (data.practiceEmail && !isValidEmail(data.practiceEmail)) {
    errors.push('Invalid practice email address');
  }

  // Clinical documentation validation
  if (data.defaultNoteDueDays !== undefined) {
    if (data.defaultNoteDueDays < 1 || data.defaultNoteDueDays > 30) {
      errors.push('Note due days must be between 1 and 30');
    }
  }

  // Scheduling validation
  if (data.defaultAppointmentDuration !== undefined) {
    if (data.defaultAppointmentDuration < 15 || data.defaultAppointmentDuration > 240) {
      errors.push('Appointment duration must be between 15 and 240 minutes');
    }
  }

  if (data.cancellationNoticePeriod !== undefined) {
    if (data.cancellationNoticePeriod < 0 || data.cancellationNoticePeriod > 168) {
      errors.push('Cancellation notice period must be between 0 and 168 hours');
    }
  }

  // Billing validation
  if (data.taxRate !== undefined) {
    if (data.taxRate < 0 || data.taxRate > 100) {
      errors.push('Tax rate must be between 0 and 100');
    }
  }

  // Compliance validation
  if (data.passwordExpirationDays !== undefined) {
    if (data.passwordExpirationDays < 30 || data.passwordExpirationDays > 365) {
      errors.push('Password expiration must be between 30 and 365 days');
    }
  }

  if (data.sessionTimeoutMinutes !== undefined) {
    if (data.sessionTimeoutMinutes < 5 || data.sessionTimeoutMinutes > 480) {
      errors.push('Session timeout must be between 5 and 480 minutes');
    }
  }

  if (data.dataRetentionYears !== undefined) {
    if (data.dataRetentionYears < 1 || data.dataRetentionYears > 50) {
      errors.push('Data retention must be between 1 and 50 years');
    }
  }

  // AI settings validation
  if (data.aiConfidenceThreshold !== undefined) {
    if (data.aiConfidenceThreshold < 0 || data.aiConfidenceThreshold > 1) {
      errors.push('AI confidence threshold must be between 0 and 1');
    }
  }

  // SMTP validation
  if (data.smtpPort !== undefined && data.smtpPort !== null) {
    if (data.smtpPort < 1 || data.smtpPort > 65535) {
      errors.push('SMTP port must be between 1 and 65535');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Simple email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if a specific AI feature is enabled
 */
export async function isAIFeatureEnabled(feature: 'noteGeneration' | 'treatmentSuggestions' | 'scheduling' | 'diagnosis'): Promise<boolean> {
  const settings = await getPracticeSettings(false);

  if (!settings || !settings.enableAIFeatures) {
    return false;
  }

  switch (feature) {
    case 'noteGeneration':
      return settings.enableAINoteGeneration;
    case 'treatmentSuggestions':
      return settings.enableAITreatmentSuggestions;
    case 'scheduling':
      return settings.enableAIScheduling;
    case 'diagnosis':
      return settings.enableAIDiagnosisAssistance;
    default:
      return false;
  }
}

/**
 * Get AI configuration for use in AI services
 */
export async function getAIConfiguration() {
  const settings = await getPracticeSettings(false);

  if (!settings || !settings.enableAIFeatures) {
    return null;
  }

  return {
    provider: settings.aiProvider,
    model: settings.aiModel,
    apiKey: settings.aiApiKey,
    confidenceThreshold: settings.aiConfidenceThreshold,
    requireHumanReview: settings.requireHumanReview,
    enableLogging: settings.aiUsageLogging,
  };
}
