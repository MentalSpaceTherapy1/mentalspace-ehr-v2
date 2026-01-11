import { Resend } from 'resend';
import { PrismaClient } from '@mentalspace/database';
import logger from '../utils/logger';

interface EmailAttachment {
  filename: string;
  content: string;
  contentType: string;
}

interface EmailOptions {
  to: string | string[];
  from: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
}

/**
 * Email service for appointment reminders using Resend
 * Supports HTML emails with attachments (like .ics files)
 */
export class EmailReminderService {
  private resend: Resend | null = null;
  private initialized = false;
  private fromEmail: string = '';

  constructor(private prisma: PrismaClient) {
    this.initializeClient();
  }

  /**
   * Initialize Resend client from environment configuration
   */
  private async initializeClient(): Promise<void> {
    try {
      const apiKey = process.env.RESEND_API_KEY;
      this.fromEmail = process.env.RESEND_FROM_EMAIL || 'CHC Therapy <support@chctherapy.com>';

      if (!apiKey) {
        logger.warn('RESEND_API_KEY not found in environment variables');
        return;
      }

      this.resend = new Resend(apiKey);
      this.initialized = true;

      logger.info('Resend Email Service initialized successfully', {
        fromEmail: this.fromEmail,
      });
    } catch (error) {
      logger.error('Failed to initialize Resend client', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Reinitialize client (useful after configuration changes)
   */
  async reinitialize(): Promise<void> {
    this.resend = null;
    this.initialized = false;
    await this.initializeClient();
  }

  /**
   * Send email with optional attachments
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.resend) {
      if (!this.initialized) {
        await this.initializeClient();
      }

      if (!this.resend) {
        throw new Error('Resend not configured. Please set RESEND_API_KEY environment variable.');
      }
    }

    try {
      const toAddresses = Array.isArray(options.to) ? options.to : [options.to];

      // Prepare attachments in Resend format
      const attachments = options.attachments?.map(att => ({
        filename: att.filename,
        content: this.isBase64(att.content)
          ? att.content
          : Buffer.from(att.content).toString('base64'),
      }));

      const emailData: any = {
        from: options.from || this.fromEmail,
        to: toAddresses,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      };

      if (attachments && attachments.length > 0) {
        emailData.attachments = attachments;
      }

      if (options.replyTo) {
        emailData.reply_to = options.replyTo;
      }

      const response = await this.resend.emails.send(emailData);

      logger.info('Email sent successfully via Resend', {
        to: options.to,
        subject: options.subject,
        hasAttachments: !!options.attachments?.length,
        messageId: (response as any)?.data?.id || 'unknown',
      });
    } catch (error: any) {
      logger.error('Failed to send email via Resend', {
        error: error.message,
        to: options.to,
        subject: options.subject,
      });
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Strip HTML tags for plain text version
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '') // Remove style tags
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]+>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp;
      .replace(/&amp;/g, '&') // Replace &amp;
      .replace(/&lt;/g, '<') // Replace &lt;
      .replace(/&gt;/g, '>') // Replace &gt;
      .replace(/&quot;/g, '"') // Replace &quot;
      .replace(/&#39;/g, "'") // Replace &#39;
      .replace(/\s+/g, ' ') // Collapse whitespace
      .trim();
  }

  /**
   * Check if string is base64 encoded
   */
  private isBase64(str: string): boolean {
    try {
      return Buffer.from(str, 'base64').toString('base64') === str;
    } catch {
      return false;
    }
  }

  /**
   * Test email sending (for configuration testing)
   */
  async testEmail(to: string, from?: string): Promise<boolean> {
    try {
      await this.sendEmail({
        to,
        from: from || this.fromEmail,
        subject: 'Test Email from MentalSpace EHR',
        html: `
          <html>
            <body style="font-family: Arial, sans-serif;">
              <h2>Email Configuration Test</h2>
              <p>This is a test email from MentalSpace EHR.</p>
              <p>If you're reading this, your email reminder configuration is working correctly!</p>
              <p style="color: #666; font-size: 0.9em; margin-top: 30px;">
                This is an automated test message.
              </p>
            </body>
          </html>
        `,
      });
      return true;
    } catch (error) {
      logger.error('Email test failed', { error });
      return false;
    }
  }

  /**
   * Check if Resend is configured and ready
   */
  isConfigured(): boolean {
    return this.initialized && this.resend !== null;
  }

  /**
   * Get current configuration status
   */
  getConfigStatus(): {
    configured: boolean;
    fromEmail: string;
  } {
    return {
      configured: this.isConfigured(),
      fromEmail: this.fromEmail,
    };
  }
}
