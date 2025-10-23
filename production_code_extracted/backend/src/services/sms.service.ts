import twilio from 'twilio';
import logger from '../utils/logger';
import config from '../config';

// Initialize Twilio client for SMS
const accountSid = config.twilioAccountSid;
const authToken = config.twilioAuthToken;
const twilioPhoneNumber = config.twilioPhoneNumber;

let twilioClient: twilio.Twilio | null = null;

// Only initialize if credentials are available
if (accountSid && authToken) {
  twilioClient = twilio(accountSid, authToken);
}

interface SMSOptions {
  to: string; // E.164 format: +1234567890
  body: string;
  from?: string;
}

/**
 * Send SMS using Twilio
 */
export async function sendSMS(options: SMSOptions): Promise<boolean> {
  try {
    // In development or if Twilio not configured, log SMS instead of sending
    if (process.env.NODE_ENV === 'development' || !twilioClient || !twilioPhoneNumber) {
      logger.info('📱 [SMS] (Development Mode - Not Actually Sent)');
      logger.info('To:', options.to);
      logger.info('Body:', options.body);
      logger.info('---');
      return true;
    }

    const message = await twilioClient.messages.create({
      body: options.body,
      from: options.from || twilioPhoneNumber,
      to: options.to,
    });

    logger.info('✅ SMS sent via Twilio:', {
      messageSid: message.sid,
      status: message.status,
      to: options.to,
    });
    return true;

  } catch (error) {
    logger.error('❌ Error sending SMS via Twilio:', {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? error.message : 'Unknown error',
      to: options.to,
    });
    return false;
  }
}

/**
 * Send SMS to multiple recipients
 */
export async function sendBulkSMS(recipients: string[], body: string): Promise<number> {
  let successCount = 0;

  for (const recipient of recipients) {
    const success = await sendSMS({ to: recipient, body });
    if (success) successCount++;

    // Rate limiting: Wait 100ms between messages to avoid Twilio rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  logger.info(`📱 Bulk SMS complete: ${successCount}/${recipients.length} sent successfully`);
  return successCount;
}

/**
 * SMS Templates
 */
export const SMSTemplates = {
  /**
   * Appointment reminder
   */
  appointmentReminder: (
    clientFirstName: string,
    clinicianName: string,
    appointmentDate: Date,
    appointmentTime: string,
    serviceLocation: string
  ) => {
    const dateStr = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    return `Hi ${clientFirstName}, reminder: Your appointment with ${clinicianName} is ${dateStr} at ${appointmentTime}. Location: ${serviceLocation}. Reply STOP to opt out.`;
  },

  /**
   * Appointment confirmation request
   */
  appointmentConfirmation: (
    clientFirstName: string,
    clinicianName: string,
    appointmentDate: Date,
    appointmentTime: string
  ) => {
    const dateStr = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    return `Hi ${clientFirstName}, please confirm your appointment with ${clinicianName} on ${dateStr} at ${appointmentTime}. Reply C to confirm or R to reschedule.`;
  },

  /**
   * Appointment cancellation notice
   */
  appointmentCancelled: (
    clientFirstName: string,
    appointmentDate: Date,
    appointmentTime: string
  ) => {
    const dateStr = appointmentDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    return `Hi ${clientFirstName}, your appointment on ${dateStr} at ${appointmentTime} has been cancelled. Please contact us to reschedule.`;
  },

  /**
   * Appointment rescheduled notice
   */
  appointmentRescheduled: (
    clientFirstName: string,
    oldDate: Date,
    oldTime: string,
    newDate: Date,
    newTime: string
  ) => {
    const oldDateStr = oldDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const newDateStr = newDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    return `Hi ${clientFirstName}, your appointment has been moved from ${oldDateStr} ${oldTime} to ${newDateStr} at ${newTime}.`;
  },

  /**
   * Welcome message for new clients
   */
  welcome: (clientFirstName: string, practiceName: string) => {
    return `Welcome to ${practiceName}, ${clientFirstName}! We look forward to working with you. You can access our client portal at your convenience.`;
  },

  /**
   * Password reset verification code
   */
  passwordResetCode: (code: string) => {
    return `Your MentalSpace EHR password reset code is: ${code}. This code will expire in 10 minutes. Do not share this code.`;
  },

  /**
   * Two-factor authentication code
   */
  twoFactorCode: (code: string) => {
    return `Your MentalSpace EHR verification code is: ${code}. This code will expire in 5 minutes.`;
  },
};

/**
 * Validate phone number format (E.164)
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  // E.164 format: +[country code][number]
  // Example: +12345678900
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}

/**
 * Format phone number to E.164
 * Assumes US numbers if no country code provided
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-numeric characters
  const digits = phoneNumber.replace(/\D/g, '');

  // If it starts with 1 and has 11 digits, it's already formatted for US
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // If it has 10 digits, assume US and add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If it already has a country code, add + if missing
  if (digits.length > 10) {
    return `+${digits}`;
  }

  // Return as-is if we can't format it
  return phoneNumber;
}

/**
 * Check if Twilio SMS is properly configured
 */
export function isTwilioSMSConfigured(): boolean {
  return !!(twilioClient && accountSid && authToken && twilioPhoneNumber);
}

/**
 * Get configuration status (for debugging)
 */
export function getTwilioSMSConfigStatus() {
  return {
    configured: isTwilioSMSConfigured(),
    hasAccountSid: !!accountSid,
    hasAuthToken: !!authToken,
    hasPhoneNumber: !!twilioPhoneNumber,
    phoneNumber: twilioPhoneNumber || 'Not configured',
  };
}
