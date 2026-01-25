/**
 * SMS Channel
 * Phase 3.1: Unified SMS delivery channel using Twilio
 *
 * Wraps the existing sms.service.ts for the unified notification system
 */

import logger from '../../../utils/logger';
import { sendSMS, isValidPhoneNumber, formatPhoneNumber, isTwilioSMSConfigured } from '../../sms.service';
import {
  ChannelSendRequest,
  ChannelResult,
  NotificationChannel,
} from '../types';

export class SmsChannel implements NotificationChannel {
  readonly name = 'sms' as const;

  /**
   * Check if SMS channel is available (Twilio configured)
   */
  async isAvailable(): Promise<boolean> {
    return isTwilioSMSConfigured();
  }

  /**
   * Send an SMS notification
   */
  async send(request: ChannelSendRequest): Promise<ChannelResult> {
    const { recipient, template, referenceId } = request;

    // Validate recipient has phone number
    if (!recipient.phone) {
      return {
        channel: 'sms',
        success: false,
        error: 'Recipient does not have a phone number',
        status: 'failed',
      };
    }

    // Check preferences if available
    if (recipient.preferences?.smsEnabled === false) {
      logger.debug('SMS notifications disabled for recipient', {
        recipientId: recipient.id,
      });
      return {
        channel: 'sms',
        success: false,
        error: 'SMS notifications disabled by user preference',
        status: 'cancelled',
      };
    }

    // Format phone number to E.164
    const formattedPhone = formatPhoneNumber(recipient.phone);

    // Validate phone number format
    if (!isValidPhoneNumber(formattedPhone)) {
      logger.warn('Invalid phone number format', {
        recipientId: recipient.id,
        phone: recipient.phone,
      });
      return {
        channel: 'sms',
        success: false,
        error: 'Invalid phone number format',
        status: 'failed',
      };
    }

    try {
      // Use SMS-optimized body if available, otherwise use text body
      const messageBody = template.smsBody || this.truncateForSms(template.textBody);

      // Send via SMS service
      const success = await sendSMS({
        to: formattedPhone,
        body: messageBody,
      });

      if (!success) {
        return {
          channel: 'sms',
          success: false,
          error: 'SMS sending failed',
          status: 'failed',
        };
      }

      logger.info('SMS sent successfully', {
        recipientId: recipient.id,
        to: formattedPhone,
        referenceId,
      });

      return {
        channel: 'sms',
        success: true,
        status: 'sent',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      logger.error('Failed to send SMS', {
        recipientId: recipient.id,
        to: formattedPhone,
        error: errorMessage,
        referenceId,
      });

      return {
        channel: 'sms',
        success: false,
        error: errorMessage,
        status: 'failed',
      };
    }
  }

  /**
   * Truncate text to fit within SMS limits (160 characters for single SMS)
   * For longer messages, Twilio will split into multiple segments
   */
  private truncateForSms(text: string, maxLength: number = 160): string {
    // Remove HTML if present
    const plainText = text.replace(/<[^>]*>/g, '');

    // Normalize whitespace
    const normalized = plainText.replace(/\s+/g, ' ').trim();

    // If within limit, return as-is
    if (normalized.length <= maxLength) {
      return normalized;
    }

    // Truncate and add ellipsis
    return normalized.substring(0, maxLength - 3) + '...';
  }
}

// Export singleton instance
export const smsChannel = new SmsChannel();
