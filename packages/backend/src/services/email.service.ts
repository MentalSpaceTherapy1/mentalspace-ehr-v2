import logger from '../utils/logger';
import * as ResendService from './resend.service';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

/**
 * Send email using Resend API
 * This is a wrapper around the Resend service for consistency
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  return ResendService.sendEmail(options);
}

/**
 * Send email to multiple recipients
 */
export async function sendBulkEmail(recipients: string[], subject: string, html: string): Promise<number> {
  return ResendService.sendBulkEmail(recipients, subject, html);
}

/**
 * Email templates - re-exported from Resend service for consistency
 */
export const EmailTemplates = ResendService.EmailTemplates;
