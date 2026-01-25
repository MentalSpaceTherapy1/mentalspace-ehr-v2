import twilio from 'twilio';
import { PrismaClient } from '@mentalspace/database';
import logger from '../utils/logger';

interface SmsOptions {
  to: string;
  from: string;
  body: string;
  statusCallback?: string;
}

interface VoiceOptions {
  to: string;
  from: string;
  url: string; // TwiML script URL
  statusCallback?: string;
}

interface TwilioMessageResult {
  sid: string;
  status: string;
  price: string | null;
  to: string;
  from: string;
  body: string;
  dateCreated: Date;
}

interface TwilioCallResult {
  sid: string;
  status: string;
  price: string | null;
  to: string;
  from: string;
  dateCreated: Date;
}

/**
 * Twilio service for SMS and Voice reminders
 * Separate from the telehealth Twilio service to avoid conflicts
 */
export class TwilioReminderService {
  private client: twilio.Twilio | null = null;
  private initialized = false;

  constructor(private prisma: PrismaClient) {
    this.initializeClient();
  }

  /**
   * Initialize Twilio client from database configuration
   */
  private async initializeClient(): Promise<void> {
    try {
      const config = await this.prisma.reminderConfiguration.findFirst();

      if (config?.twilioAccountSid && config?.twilioAuthToken) {
        this.client = twilio(config.twilioAccountSid, config.twilioAuthToken);
        this.initialized = true;
        logger.info('Twilio Reminder Service initialized successfully');
      } else {
        logger.warn(
          'Twilio credentials not found in database. SMS/Voice reminders will not work.'
        );
      }
    } catch (error) {
      logger.error('Failed to initialize Twilio client', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Reinitialize client (useful after configuration changes)
   */
  async reinitialize(): Promise<void> {
    this.client = null;
    this.initialized = false;
    await this.initializeClient();
  }

  /**
   * Send SMS message
   */
  async sendSms(options: SmsOptions): Promise<TwilioMessageResult> {
    if (!this.client) {
      if (!this.initialized) {
        await this.initializeClient();
      }

      if (!this.client) {
        throw new Error('Twilio not configured. Please configure Twilio credentials.');
      }
    }

    try {
      const message = await this.client.messages.create({
        body: options.body,
        to: options.to,
        from: options.from,
        statusCallback: options.statusCallback,
      });

      logger.info('SMS sent successfully', {
        messageSid: message.sid,
        to: options.to,
        status: message.status,
      });

      return {
        sid: message.sid,
        status: message.status,
        price: message.price,
        to: message.to,
        from: message.from,
        body: message.body,
        dateCreated: message.dateCreated,
      };
    } catch (error: unknown) {
      logger.error('Failed to send SMS', {
        error: error.message,
        code: error.code,
        to: options.to,
      });
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  /**
   * Make voice call
   */
  async makeVoiceCall(options: VoiceOptions): Promise<TwilioCallResult> {
    if (!this.client) {
      if (!this.initialized) {
        await this.initializeClient();
      }

      if (!this.client) {
        throw new Error('Twilio not configured. Please configure Twilio credentials.');
      }
    }

    try {
      const call = await this.client.calls.create({
        url: options.url,
        to: options.to,
        from: options.from,
        statusCallback: options.statusCallback,
      });

      logger.info('Voice call initiated successfully', {
        callSid: call.sid,
        to: options.to,
        status: call.status,
      });

      return {
        sid: call.sid,
        status: call.status,
        price: call.price,
        to: call.to,
        from: call.from,
        dateCreated: call.dateCreated,
      };
    } catch (error: unknown) {
      logger.error('Failed to make voice call', {
        error: error.message,
        code: error.code,
        to: options.to,
      });
      throw new Error(`Failed to make voice call: ${error.message}`);
    }
  }

  /**
   * Webhook handler for incoming SMS (confirmations)
   * Returns TwiML response
   */
  handleIncomingSms(from: string, body: string, messageSid: string): string {
    logger.info('Incoming SMS received', {
      from,
      body: body.substring(0, 50), // Log first 50 chars only
      messageSid,
    });

    // Return TwiML response
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Thank you! Your response has been recorded.</Message>
</Response>`;
  }

  /**
   * Webhook handler for delivery status updates
   */
  async handleStatusCallback(
    messageSid: string,
    messageStatus: string,
    errorCode?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      const deliveryStatus = this.mapTwilioStatus(messageStatus);

      await this.prisma.appointmentReminder.updateMany({
        where: { messageId: messageSid },
        data: {
          deliveryStatus,
          failureReason:
            deliveryStatus === 'FAILED' && errorMessage
              ? `${errorCode}: ${errorMessage}`
              : undefined,
        },
      });

      logger.info('Reminder status updated from Twilio callback', {
        messageSid,
        twilioStatus: messageStatus,
        deliveryStatus,
      });
    } catch (error) {
      logger.error('Error handling Twilio status callback', {
        error: error instanceof Error ? error.message : 'Unknown error',
        messageSid,
        messageStatus,
      });
    }
  }

  /**
   * Map Twilio status to our internal status
   */
  private mapTwilioStatus(twilioStatus: string): string {
    const statusMap: Record<string, string> = {
      queued: 'PENDING',
      sending: 'SENT',
      sent: 'SENT',
      delivered: 'DELIVERED',
      undelivered: 'FAILED',
      failed: 'FAILED',
      canceled: 'FAILED',
      // Call statuses
      'in-progress': 'SENT',
      completed: 'DELIVERED',
      busy: 'FAILED',
      'no-answer': 'FAILED',
    };
    return statusMap[twilioStatus] || 'PENDING';
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // Basic E.164 format validation
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  }

  /**
   * Format phone number to E.164 (for US numbers)
   */
  formatPhoneNumberE164(phoneNumber: string, defaultCountryCode = '+1'): string {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // If it's already in E.164 format, return as is
    if (phoneNumber.startsWith('+')) {
      return phoneNumber;
    }

    // For US numbers
    if (cleaned.length === 10) {
      return `${defaultCountryCode}${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }

    // Return as is if we can't format it
    return phoneNumber;
  }

  /**
   * Check if Twilio is configured and ready
   */
  isConfigured(): boolean {
    return this.initialized && this.client !== null;
  }

  /**
   * Get Twilio account information (for testing)
   */
  async getAccountInfo(): Promise<any> {
    if (!this.client) {
      throw new Error('Twilio not configured');
    }

    try {
      const account = await this.client.api.accounts.list({ limit: 1 });
      return {
        accountSid: account[0].sid,
        status: account[0].status,
        friendlyName: account[0].friendlyName,
      };
    } catch (error) {
      logger.error('Failed to get Twilio account info', { error });
      throw error;
    }
  }

  /**
   * Test SMS sending (for configuration testing)
   */
  async testSms(to: string, from: string): Promise<boolean> {
    try {
      await this.sendSms({
        to,
        from,
        body: 'This is a test message from MentalSpace EHR. Your SMS reminders are configured correctly!',
      });
      return true;
    } catch (error) {
      logger.error('SMS test failed', { error });
      return false;
    }
  }
}
