/**
 * Email Channel
 * Phase 3.1: Unified email delivery channel using Resend
 *
 * Wraps the existing resend.service.ts for the unified notification system
 */

import logger from '../../../utils/logger';
import { sendEmail, isResendConfigured } from '../../resend.service';
import {
  ChannelSendRequest,
  ChannelResult,
  NotificationChannel,
} from '../types';

export class EmailChannel implements NotificationChannel {
  readonly name = 'email' as const;

  /**
   * Check if email channel is available (Resend configured)
   */
  async isAvailable(): Promise<boolean> {
    return isResendConfigured();
  }

  /**
   * Send an email notification
   */
  async send(request: ChannelSendRequest): Promise<ChannelResult> {
    const { recipient, template, priority, referenceId } = request;

    // Validate recipient has email
    if (!recipient.email) {
      return {
        channel: 'email',
        success: false,
        error: 'Recipient does not have an email address',
        status: 'failed',
      };
    }

    // Check preferences if available
    if (recipient.preferences?.emailEnabled === false) {
      logger.debug('Email notifications disabled for recipient', {
        recipientId: recipient.id,
      });
      return {
        channel: 'email',
        success: false,
        error: 'Email notifications disabled by user preference',
        status: 'cancelled',
      };
    }

    try {
      // Build recipient name
      const recipientName =
        recipient.firstName && recipient.lastName
          ? `${recipient.firstName} ${recipient.lastName}`
          : recipient.firstName || undefined;

      // Send via Resend service
      const success = await sendEmail({
        to: recipient.email,
        subject: template.subject || 'Notification from MentalSpace',
        html: template.htmlBody || this.textToHtml(template.textBody),
      });

      if (!success) {
        return {
          channel: 'email',
          success: false,
          error: 'Email sending failed',
          status: 'failed',
        };
      }

      logger.info('Email sent successfully', {
        recipientId: recipient.id,
        to: recipient.email,
        referenceId,
      });

      return {
        channel: 'email',
        success: true,
        status: 'sent',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      logger.error('Failed to send email', {
        recipientId: recipient.id,
        to: recipient.email,
        error: errorMessage,
        referenceId,
      });

      return {
        channel: 'email',
        success: false,
        error: errorMessage,
        status: 'failed',
      };
    }
  }

  /**
   * Convert plain text to simple HTML
   */
  private textToHtml(text: string): string {
    // Escape HTML entities
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    // Convert line breaks to <br> tags
    const withBreaks = escaped.replace(/\n/g, '<br>');

    // Wrap in basic HTML structure
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px;">
    ${withBreaks}
  </div>
  <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e9ecef; font-size: 12px; color: #6c757d; text-align: center;">
    <p>MentalSpace EHR</p>
    <p style="font-size: 11px;">This is an automated message. Please do not reply directly to this email.</p>
  </div>
</body>
</html>`.trim();
  }
}

// Export singleton instance
export const emailChannel = new EmailChannel();
