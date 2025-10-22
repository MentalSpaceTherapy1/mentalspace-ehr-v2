import logger, { logControllerError } from '../utils/logger';
import nodemailer from 'nodemailer';
import { sendEmailViaSES, sendBulkEmailViaSES } from './email.service.ses';

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

// Determine which email provider to use
const USE_SES = process.env.USE_SES === 'true' || process.env.NODE_ENV === 'production';

// Create reusable transporter (for SMTP fallback)
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
 * Send email - automatically uses SES in production, SMTP in development
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // Use SES in production or if explicitly enabled
  if (USE_SES) {
    return sendEmailViaSES(options);
  }

  // Fallback to SMTP (development)
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
  // Use SES bulk email in production
  if (USE_SES) {
    return sendBulkEmailViaSES(recipients, subject, html);
  }

  // SMTP fallback
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
   * Welcome email for new staff users (with temporary password)
   */
  welcome: (firstName: string, email: string, tempPassword: string) => ({
    subject: 'Welcome to MentalSpace EHR - Account Created',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Welcome to MentalSpace EHR!</h2>
        <p>Hi ${firstName},</p>
        <p>Your MentalSpace EHR staff account has been created. Here are your login credentials:</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <strong>Email:</strong> ${email}<br>
          <strong>Temporary Password:</strong> <code style="background-color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${tempPassword}</code>
        </div>
        <p><strong style="color: #dc2626;">⚠️ IMPORTANT:</strong> You will be required to change this password when you first log in.</p>
        <div style="margin: 24px 0;">
          <a href="${process.env.FRONTEND_URL || 'https://mentalspaceehr.com'}/login" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Login to MentalSpace EHR
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">If you have any questions, please contact your system administrator.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #9ca3af; font-size: 12px;">This email contains confidential information. If you received this in error, please delete it immediately.</p>
      </div>
    `,
  }),

  /**
   * Staff invitation email (cleaner version without showing password in subject)
   */
  staffInvitation: (firstName: string, email: string, tempPassword: string, inviterName: string) => ({
    subject: 'You\'re Invited to Join MentalSpace EHR',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">You've Been Invited to MentalSpace EHR</h2>
        <p>Hi ${firstName},</p>
        <p>${inviterName} has invited you to join the MentalSpace EHR team.</p>
        <p>Your account has been created with the following credentials:</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <strong>Email:</strong> ${email}<br>
          <strong>Temporary Password:</strong> <code style="background-color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 16px; font-family: monospace;">${tempPassword}</code>
        </div>
        <p><strong style="color: #dc2626;">⚠️ Security Notice:</strong></p>
        <ul style="color: #6b7280; line-height: 1.6;">
          <li>You must change this temporary password on your first login</li>
          <li>Choose a strong password (minimum 8 characters)</li>
          <li>Never share your password with anyone</li>
        </ul>
        <div style="margin: 24px 0;">
          <a href="${process.env.FRONTEND_URL || 'https://mentalspaceehr.com'}/login" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Get Started
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Questions? Contact ${inviterName} or your system administrator.</p>
      </div>
    `,
  }),

  /**
   * Password reset email (for both staff and clients)
   */
  passwordReset: (firstName: string, resetLink: string) => ({
    subject: 'Password Reset Request - MentalSpace',
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
        <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link:</p>
        <p style="color: #6b7280; font-size: 12px; word-break: break-all;">${resetLink}</p>
        <p style="color: #dc2626; font-size: 14px; margin-top: 24px;"><strong>⚠️ This link will expire in 1 hour.</strong></p>
        <p style="color: #6b7280; font-size: 14px;">If you didn't request this, please ignore this email and your password will remain unchanged.</p>
      </div>
    `,
  }),

  /**
   * Client portal invitation email
   */
  clientInvitation: (firstName: string, invitationLink: string, clinicianName: string) => ({
    subject: 'You\'re Invited to MentalSpace Client Portal',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Welcome to MentalSpace Client Portal</h2>
        <p>Hi ${firstName},</p>
        <p>Your therapist, ${clinicianName}, has invited you to access our secure client portal.</p>
        <p><strong>What you can do in the portal:</strong></p>
        <ul style="color: #374151; line-height: 1.8;">
          <li>View and manage your appointments</li>
          <li>Complete intake forms and assessments</li>
          <li>Communicate securely with your provider</li>
          <li>Access session summaries and resources</li>
          <li>Track your therapeutic goals and progress</li>
          <li>Access crisis resources 24/7</li>
        </ul>
        <div style="margin: 32px 0;">
          <a href="${invitationLink}" style="background-color: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 16px;">
            Set Up Your Portal Account
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link:</p>
        <p style="color: #6b7280; font-size: 12px; word-break: break-all;">${invitationLink}</p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">This invitation link will expire in 7 days.</p>
        <p style="color: #6b7280; font-size: 14px;">If you have any questions, please contact your therapist.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
        <p style="color: #9ca3af; font-size: 12px;">This email contains confidential health information protected by HIPAA. If you received this in error, please delete it immediately and notify the sender.</p>
      </div>
    `,
  }),

  /**
   * Client email verification email
   */
  clientVerification: (firstName: string, verificationLink: string) => ({
    subject: 'Verify Your MentalSpace Portal Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Verify Your Email Address</h2>
        <p>Hi ${firstName},</p>
        <p>Thank you for creating your MentalSpace Portal account. Please verify your email address to complete your registration:</p>
        <div style="margin: 32px 0;">
          <a href="${verificationLink}" style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 16px;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link:</p>
        <p style="color: #6b7280; font-size: 12px; word-break: break-all;">${verificationLink}</p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">Once verified, you'll have full access to your client portal.</p>
        <p style="color: #6b7280; font-size: 14px;">If you didn't create this account, please ignore this email.</p>
      </div>
    `,
  }),

  /**
   * Client portal account activated email
   */
  clientAccountActivated: (firstName: string, portalUrl: string) => ({
    subject: 'Your MentalSpace Portal Account is Active',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Your Account is Active!</h2>
        <p>Hi ${firstName},</p>
        <p>Great news! Your MentalSpace Client Portal account has been verified and is now active.</p>
        <p>You can now:</p>
        <ul style="color: #374151; line-height: 1.8;">
          <li>Access your appointments and schedule</li>
          <li>Complete assigned forms and assessments</li>
          <li>Message your therapist securely</li>
          <li>View session notes and treatment plans</li>
          <li>Track your progress and goals</li>
        </ul>
        <div style="margin: 32px 0;">
          <a href="${portalUrl}" style="background-color: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 16px;">
            Go to Portal
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">We're here to support you on your therapeutic journey.</p>
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
