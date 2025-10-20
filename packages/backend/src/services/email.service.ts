import logger, { logControllerError } from '../utils/logger';
import nodemailer from 'nodemailer';

// Email configuration (use environment variables in production)
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'noreply@mentalspace-ehr.com',
    pass: process.env.SMTP_PASS || '', // Use app-specific password for Gmail
  },
};

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport(EMAIL_CONFIG);
  }
  return transporter;
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

/**
 * Send email using nodemailer
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // In development, log emails instead of sending
    if (process.env.NODE_ENV === 'development' || !process.env.SMTP_USER) {
      logger.info('📧 [EMAIL] (Development Mode - Not Actually Sent)');
      logger.info('To:', options.to);
      logger.info('Subject:', options.subject);
      logger.info('---');
      logger.info(options.html.replace(/<[^>]*>/g, '')); // Strip HTML tags for console
      logger.info('---');
      return true;
    }

    const transport = getTransporter();

    const info = await transport.sendMail({
      from: options.from || `"MentalSpace EHR" <${EMAIL_CONFIG.auth.user}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML as fallback
      cc: options.cc,
      bcc: options.bcc,
    });

    logger.info('✅ Email sent:', info.messageId);
    return true;

  } catch (error) {
    logger.error('❌ Error sending email:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    return false;
  }
}

/**
 * Send email to multiple recipients
 */
export async function sendBulkEmail(recipients: string[], subject: string, html: string): Promise<number> {
  let successCount = 0;

  for (const recipient of recipients) {
    const success = await sendEmail({ to: recipient, subject, html });
    if (success) successCount++;
  }

  logger.info(`📧 Bulk email complete: ${successCount}/${recipients.length} sent successfully`);
  return successCount;
}

/**
 * Email templates
 */
export const EmailTemplates = {
  /**
   * Welcome email for new users
   */
  welcome: (firstName: string, email: string, tempPassword: string) => ({
    subject: 'Welcome to MentalSpace EHR',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Welcome to MentalSpace EHR!</h2>
        <p>Hi ${firstName},</p>
        <p>Your account has been created. Here are your login credentials:</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <strong>Email:</strong> ${email}<br>
          <strong>Temporary Password:</strong> ${tempPassword}
        </div>
        <p><strong>⚠️ Please change your password after your first login.</strong></p>
        <p>Login at: <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login">MentalSpace EHR</a></p>
      </div>
    `,
  }),

  /**
   * Password reset email
   */
  passwordReset: (firstName: string, resetLink: string) => ({
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Password Reset Request</h2>
        <p>Hi ${firstName},</p>
        <p>You requested to reset your password. Click the link below to create a new password:</p>
        <div style="margin: 24px 0;">
          <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This link will expire in 1 hour.</p>
        <p style="color: #6b7280; font-size: 14px;">If you didn't request this, please ignore this email.</p>
      </div>
    `,
  }),

  /**
   * Appointment reminder
   */
  appointmentReminder: (clientName: string, clinicianName: string, appointmentDate: Date, appointmentTime: string, telehealthLink?: string) => ({
    subject: `Appointment Reminder - ${appointmentDate.toLocaleDateString()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Appointment Reminder</h2>
        <p>Hi ${clientName},</p>
        <p>This is a reminder of your upcoming appointment:</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <strong>Provider:</strong> ${clinicianName}<br>
          <strong>Date:</strong> ${appointmentDate.toLocaleDateString()}<br>
          <strong>Time:</strong> ${appointmentTime}
          ${telehealthLink ? `<br><br><strong>Join Link:</strong> <a href="${telehealthLink}">Click here to join</a>` : ''}
        </div>
        <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
      </div>
    `,
  }),

  /**
   * Note unlock request notification (to supervisor/admin)
   */
  unlockRequest: (clinicianName: string, noteType: string, clientName: string, sessionDate: Date, reason: string, approveLink: string) => ({
    subject: `Note Unlock Request - ${clinicianName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Note Unlock Request</h2>
        <p>${clinicianName} has requested to unlock a clinical note:</p>
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0;">
          <strong>Note Type:</strong> ${noteType}<br>
          <strong>Client:</strong> ${clientName}<br>
          <strong>Session Date:</strong> ${sessionDate.toLocaleDateString()}<br>
          <br>
          <strong>Reason for Unlock:</strong><br>
          ${reason}
        </div>
        <div style="margin: 24px 0;">
          <a href="${approveLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 8px;">
            Review Request
          </a>
        </div>
      </div>
    `,
  }),

  /**
   * Note unlock approved notification (to clinician)
   */
  unlockApproved: (clinicianName: string, noteType: string, clientName: string, approverName: string, noteLink: string) => ({
    subject: '✅ Note Unlock Request Approved',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Note Unlock Approved</h2>
        <p>Hi ${clinicianName},</p>
        <p>Your request to unlock a clinical note has been approved by ${approverName}.</p>
        <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 16px; margin: 16px 0;">
          <strong>Note Type:</strong> ${noteType}<br>
          <strong>Client:</strong> ${clientName}
        </div>
        <p><strong>⚠️ The note will be unlocked for 24 hours.</strong> Please complete and sign it before it locks again.</p>
        <div style="margin: 24px 0;">
          <a href="${noteLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Complete Note
          </a>
        </div>
      </div>
    `,
  }),

  /**
   * Note unlock denied notification (to clinician)
   */
  unlockDenied: (clinicianName: string, noteType: string, clientName: string, approverName: string, denialReason: string) => ({
    subject: '❌ Note Unlock Request Denied',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Note Unlock Request Denied</h2>
        <p>Hi ${clinicianName},</p>
        <p>Your request to unlock a clinical note has been denied by ${approverName}.</p>
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 16px 0;">
          <strong>Note Type:</strong> ${noteType}<br>
          <strong>Client:</strong> ${clientName}<br>
          <br>
          <strong>Reason:</strong><br>
          ${denialReason}
        </div>
        <p>Please contact ${approverName} if you have questions.</p>
      </div>
    `,
  }),
};

/**
 * Verify email configuration (for testing)
 */
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    const transport = getTransporter();
    await transport.verify();
    logger.info('✅ Email server connection verified');
    return true;
  } catch (error) {
    logger.error('❌ Email server connection failed:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    return false;
  }
}
