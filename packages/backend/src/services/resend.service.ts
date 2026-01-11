import { Resend } from 'resend';
import logger from '../utils/logger';
import config from '../config';

// Initialize Resend client
const resendApiKey = process.env.RESEND_API_KEY || config.resendApiKey;
let resendClient: Resend | null = null;
const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'MentalSpace EHR <noreply@mentalspace.com>';

if (resendApiKey && resendApiKey !== 'your-resend-api-key') {
  resendClient = new Resend(resendApiKey);
  logger.info('Resend service initialized', {
    configured: true,
    fromEmail: resendFromEmail,
    apiKeyPrefix: resendApiKey.substring(0, 10) + '...',
  });
} else {
  logger.warn('Resend service NOT configured - emails will be logged but not sent', {
    hasApiKey: !!resendApiKey,
    isPlaceholder: resendApiKey === 'your-resend-api-key',
  });
}

interface ResendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

/**
 * Send email using Resend
 */
export async function sendEmail(options: ResendEmailOptions): Promise<boolean> {
  const toAddresses = Array.isArray(options.to) ? options.to.join(', ') : options.to;

  logger.info('Attempting to send email', {
    to: toAddresses,
    subject: options.subject,
    hasResendClient: !!resendClient,
    nodeEnv: process.env.NODE_ENV,
  });

  try {
    // In development or if Resend not configured, log emails instead of sending
    if (process.env.NODE_ENV === 'development' || !resendClient) {
      logger.warn('Email NOT actually sent - development mode or Resend not configured', {
        isDevelopment: process.env.NODE_ENV === 'development',
        hasResendClient: !!resendClient,
        to: toAddresses,
        subject: options.subject,
      });
      return true;
    }

    const fromEmail = options.from || process.env.RESEND_FROM_EMAIL || 'MentalSpace EHR <noreply@mentalspace.com>';

    logger.info('Sending email via Resend API', {
      from: fromEmail,
      to: toAddresses,
      subject: options.subject,
    });

    const result = await resendClient.emails.send({
      from: fromEmail,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      cc: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
      bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined,
      replyTo: options.replyTo,
    });

    // Check for Resend API error (SDK doesn't throw, it returns error object)
    if ((result as any).error) {
      const resendError = (result as any).error;
      logger.error('Resend API returned error', {
        statusCode: resendError.statusCode,
        name: resendError.name,
        message: resendError.message,
        to: toAddresses,
        subject: options.subject,
      });
      return false;
    }

    logger.info('Email sent successfully via Resend', {
      emailId: result.data?.id,
      to: toAddresses,
      subject: options.subject,
    });
    return true;

  } catch (error) {
    logger.error('Failed to send email via Resend', {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? error.message : 'Unknown error',
      to: toAddresses,
      subject: options.subject,
    });
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
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to MentalSpace EHR</h1>
            </div>
            <div style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${firstName},</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Your account has been created! Here are your login credentials:</p>
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #667eea;">
                <p style="margin: 0 0 12px 0; color: #374151;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 0; color: #374151;"><strong>Temporary Password:</strong> <code style="background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${tempPassword}</code></p>
              </div>
              <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 24px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">⚠️ <strong>Important:</strong> Please change your password after your first login for security.</p>
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="display: inline-block; background-color: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Login to MentalSpace EHR</a>
              </div>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">If you have any questions, please contact your system administrator.</p>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} MentalSpace EHR. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  /**
   * Password reset email
   */
  passwordReset: (firstName: string, resetLink: string) => ({
    subject: 'Password Reset Request - MentalSpace EHR',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background-color: #667eea; padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
            </div>
            <div style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${firstName},</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">You requested to reset your password for your MentalSpace EHR account. Click the button below to create a new password:</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetLink}" style="display: inline-block; background-color: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Reset Password</a>
              </div>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">This link will expire in <strong>1 hour</strong> for security reasons.</p>
              <div style="background-color: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 24px 0;">
                <p style="margin: 0; color: #991b1b; font-size: 14px;">If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
              </div>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} MentalSpace EHR. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  /**
   * Appointment reminder
   */
  appointmentReminder: (
    clientName: string,
    clinicianName: string,
    appointmentDate: Date,
    appointmentTime: string,
    appointmentType: string,
    serviceLocation: string,
    telehealthLink?: string
  ) => ({
    subject: `Appointment Reminder - ${appointmentDate.toLocaleDateString()} at ${appointmentTime}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">📅 Appointment Reminder</h1>
            </div>
            <div style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${clientName},</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">This is a reminder of your upcoming appointment:</p>
              <div style="background-color: #f0fdf4; padding: 24px; border-radius: 8px; margin: 24px 0; border: 2px solid #10b981;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #065f46; font-weight: 600; width: 120px;">Provider:</td>
                    <td style="padding: 8px 0; color: #374151;">${clinicianName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #065f46; font-weight: 600;">Date:</td>
                    <td style="padding: 8px 0; color: #374151;">${appointmentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #065f46; font-weight: 600;">Time:</td>
                    <td style="padding: 8px 0; color: #374151; font-size: 18px; font-weight: 600;">${appointmentTime}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #065f46; font-weight: 600;">Type:</td>
                    <td style="padding: 8px 0; color: #374151;">${appointmentType}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #065f46; font-weight: 600;">Location:</td>
                    <td style="padding: 8px 0; color: #374151;">${serviceLocation}</td>
                  </tr>
                </table>
              </div>
              ${telehealthLink ? `
                <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 24px 0; text-align: center; border-left: 4px solid #3b82f6;">
                  <p style="margin: 0 0 16px 0; color: #1e40af; font-weight: 600;">💻 Telehealth Appointment</p>
                  <a href="${telehealthLink}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Join Video Session</a>
                  <p style="margin: 16px 0 0 0; color: #1e40af; font-size: 13px;">Click the button above at your appointment time</p>
                </div>
              ` : ''}
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 24px;">If you need to reschedule or cancel, please contact us at least 24 hours in advance to avoid a late cancellation fee.</p>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} MentalSpace EHR. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  /**
   * Note unlock request notification (to supervisor/admin)
   */
  unlockRequest: (
    clinicianName: string,
    noteType: string,
    clientName: string,
    sessionDate: Date,
    reason: string,
    approveLink: string
  ) => ({
    subject: `🔓 Note Unlock Request - ${clinicianName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background-color: #f59e0b; padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🔓 Note Unlock Request</h1>
            </div>
            <div style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;"><strong>${clinicianName}</strong> has requested to unlock a clinical note:</p>
              <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #f59e0b;">
                <p style="margin: 0 0 12px 0; color: #78350f;"><strong>Note Type:</strong> ${noteType}</p>
                <p style="margin: 0 0 12px 0; color: #78350f;"><strong>Client:</strong> ${clientName}</p>
                <p style="margin: 0 0 16px 0; color: #78350f;"><strong>Session Date:</strong> ${sessionDate.toLocaleDateString()}</p>
                <p style="margin: 0 0 8px 0; color: #78350f; font-weight: 600;">Reason for Unlock:</p>
                <p style="margin: 0; color: #78350f; font-style: italic; padding: 12px; background-color: #fde68a; border-radius: 4px;">${reason}</p>
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${approveLink}" style="display: inline-block; background-color: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin-right: 8px;">Review Request</a>
              </div>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Please review this request and approve or deny it in the system.</p>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} MentalSpace EHR. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  /**
   * Note unlock approved notification (to clinician)
   */
  unlockApproved: (
    clinicianName: string,
    noteType: string,
    clientName: string,
    approverName: string,
    noteLink: string
  ) => ({
    subject: '✅ Note Unlock Request Approved',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background-color: #10b981; padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">✅ Note Unlock Approved</h1>
            </div>
            <div style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${clinicianName},</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Your request to unlock a clinical note has been <strong style="color: #10b981;">approved</strong> by ${approverName}.</p>
              <div style="background-color: #d1fae5; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #10b981;">
                <p style="margin: 0 0 12px 0; color: #065f46;"><strong>Note Type:</strong> ${noteType}</p>
                <p style="margin: 0; color: #065f46;"><strong>Client:</strong> ${clientName}</p>
              </div>
              <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 24px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">⚠️ <strong>Important:</strong> The note will be unlocked for <strong>24 hours</strong>. Please complete and sign it before it locks again.</p>
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${noteLink}" style="display: inline-block; background-color: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Complete Note</a>
              </div>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} MentalSpace EHR. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  /**
   * Note unlock denied notification (to clinician)
   */
  unlockDenied: (
    clinicianName: string,
    noteType: string,
    clientName: string,
    approverName: string,
    denialReason: string
  ) => ({
    subject: '❌ Note Unlock Request Denied',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background-color: #dc2626; padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">❌ Note Unlock Request Denied</h1>
            </div>
            <div style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${clinicianName},</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Your request to unlock a clinical note has been <strong style="color: #dc2626;">denied</strong> by ${approverName}.</p>
              <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #dc2626;">
                <p style="margin: 0 0 12px 0; color: #991b1b;"><strong>Note Type:</strong> ${noteType}</p>
                <p style="margin: 0 0 16px 0; color: #991b1b;"><strong>Client:</strong> ${clientName}</p>
                <p style="margin: 0 0 8px 0; color: #991b1b; font-weight: 600;">Reason:</p>
                <p style="margin: 0; color: #991b1b; font-style: italic; padding: 12px; background-color: #fee2e2; border-radius: 4px;">${denialReason}</p>
              </div>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Please contact ${approverName} if you have questions about this decision.</p>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} MentalSpace EHR. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  /**
   * Staff invitation email (for new staff members)
   */
  staffInvitation: (firstName: string, email: string, tempPassword: string, inviterName: string) => ({
    subject: 'You\'re Invited to Join MentalSpace EHR',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">You've Been Invited to MentalSpace EHR</h1>
            </div>
            <div style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${firstName},</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">${inviterName} has invited you to join the MentalSpace EHR team.</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Your account has been created with the following credentials:</p>
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #667eea;">
                <p style="margin: 0 0 12px 0; color: #374151;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 0; color: #374151;"><strong>Temporary Password:</strong> <code style="background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 16px;">${tempPassword}</code></p>
              </div>
              <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 24px 0;">
                <p style="margin: 0 0 8px 0; color: #92400e; font-size: 14px;"><strong>Security Notice:</strong></p>
                <ul style="margin: 0; color: #92400e; font-size: 14px; padding-left: 20px;">
                  <li>You must change this temporary password on your first login</li>
                  <li>Choose a strong password (minimum 8 characters)</li>
                  <li>Never share your password with anyone</li>
                </ul>
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${process.env.FRONTEND_URL || 'https://mentalspaceehr.com'}/login" style="display: inline-block; background-color: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Get Started</a>
              </div>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Questions? Contact ${inviterName} or your system administrator.</p>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} MentalSpace EHR. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  /**
   * Client portal invitation email
   */
  clientInvitation: (firstName: string, invitationLink: string, clinicianName: string, mrn: string) => ({
    subject: `MentalSpace Therapy - Welcome to Your Secure Client Portal, ${firstName}!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Your Secure Client Portal!</h1>
            </div>
            <div style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Welcome! Your therapist, <strong>${clinicianName}</strong>, has invited you to access our secure client portal. This is your personal space to manage your care and stay connected throughout your therapeutic journey.</p>

              <!-- MRN Box -->
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 20px; border-radius: 12px; margin: 24px 0; text-align: center;">
                <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0 0 8px 0; font-weight: 500;">Your Medical Record Number (MRN)</p>
                <p style="color: white; font-size: 24px; font-weight: bold; margin: 0; letter-spacing: 1px; font-family: 'Courier New', monospace;">${mrn}</p>
                <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 8px 0 0 0;">You will need this to create your account</p>
              </div>

              <!-- Instructions Box -->
              <div style="background-color: #ecfdf5; border: 2px solid #10b981; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <p style="color: #065f46; font-size: 16px; font-weight: bold; margin: 0 0 12px 0;">📋 How to Create Your Account:</p>
                <ol style="color: #047857; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li><strong>Click the button below</strong> to open the registration page</li>
                  <li><strong>Enter your MRN</strong> (shown above: ${mrn})</li>
                  <li><strong>Enter your email address</strong> (use the same email this was sent to)</li>
                  <li><strong>Create a secure password</strong> (at least 8 characters)</li>
                  <li><strong>Click "Create Account"</strong> to complete registration</li>
                </ol>
              </div>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${invitationLink}" style="display: inline-block; background-color: #10b981; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 18px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">Create My Portal Account</a>
              </div>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center;">Or copy and paste this link into your browser:</p>
              <p style="color: #6b7280; font-size: 12px; word-break: break-all; background-color: #f9fafb; padding: 12px; border-radius: 4px;">${invitationLink}</p>

              <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 24px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>⏰ Important:</strong> This invitation link will expire in 7 days.</p>
              </div>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-top: 24px;"><strong>Once registered, you'll be able to:</strong></p>

              <div style="margin: 20px 0;">
                <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 16px 0;"><span style="font-size: 18px;">📅</span> <strong>Manage Your Appointments</strong><br>
                <span style="color: #6b7280;">Schedule sessions at your convenience with our self-scheduling feature.</span></p>

                <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 16px 0;"><span style="font-size: 18px;">💬</span> <strong>Secure Messaging</strong><br>
                <span style="color: #6b7280;">Communicate directly with your care team between sessions through our encrypted messaging system.</span></p>

                <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 16px 0;"><span style="font-size: 18px;">📝</span> <strong>Complete Forms & Documents</strong><br>
                <span style="color: #6b7280;">Fill out intake forms, consent documents, and assessments online before your first session.</span></p>

                <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 16px 0;"><span style="font-size: 18px;">📊</span> <strong>Track Your Progress</strong><br>
                <span style="color: #6b7280;">Use our wellness tools: Mood Journal, Sleep Diary, Symptom Diary, and Exercise Log.</span></p>

                <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 16px 0;"><span style="font-size: 18px;">💳</span> <strong>Billing & Payments</strong><br>
                <span style="color: #6b7280;">View your account balance, review charges, and make payments securely online.</span></p>

                <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 16px 0;"><span style="font-size: 18px;">🎥</span> <strong>Attend Telehealth Sessions</strong><br>
                <span style="color: #6b7280;">Join your therapy sessions from anywhere through our integrated video conferencing.</span></p>
              </div>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">If you have any questions, please don't hesitate to reach out to our office at <strong>(404) 832-0102</strong> or <a href="mailto:support@chctherapy.com" style="color: #10b981;">support@chctherapy.com</a>.</p>
              <p style="color: #374151; font-size: 14px; line-height: 1.6; margin-top: 24px;">We look forward to supporting you on your mental health journey.</p>
              <p style="color: #374151; font-size: 14px; line-height: 1.6;">Warm regards,<br><strong>The CHC Therapy Team</strong></p>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 11px; margin: 0;">This email contains confidential health information protected by HIPAA. If you received this in error, please delete it immediately and notify the sender.</p>
              <p style="color: #9ca3af; font-size: 12px; margin: 8px 0 0 0;">© ${new Date().getFullYear()} CHC Therapy. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  /**
   * Client email verification email
   */
  clientVerification: (firstName: string, verificationLink: string) => ({
    subject: 'Verify Your MentalSpace Portal Account',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background-color: #3b82f6; padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Verify Your Email Address</h1>
            </div>
            <div style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${firstName},</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Thank you for creating your MentalSpace Portal account. Please verify your email address to complete your registration:</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${verificationLink}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Verify Email Address</a>
              </div>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Or copy and paste this link:</p>
              <p style="color: #6b7280; font-size: 12px; word-break: break-all; background-color: #f9fafb; padding: 12px; border-radius: 4px;">${verificationLink}</p>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 24px;">Once verified, you'll have full access to your client portal.</p>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">If you didn't create this account, please ignore this email.</p>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} MentalSpace EHR. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  /**
   * Client portal account activated email
   */
  clientAccountActivated: (firstName: string, portalUrl: string) => ({
    subject: 'Your MentalSpace Portal Account is Active',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background-color: #10b981; padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Your Account is Active!</h1>
            </div>
            <div style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${firstName},</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Great news! Your MentalSpace Client Portal account has been verified and is now active.</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-top: 24px;"><strong>You can now:</strong></p>
              <ul style="color: #374151; line-height: 1.8; font-size: 15px;">
                <li>Access your appointments and schedule</li>
                <li>Complete assigned forms and assessments</li>
                <li>Message your therapist securely</li>
                <li>View session notes and treatment plans</li>
                <li>Track your progress and goals</li>
              </ul>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${portalUrl}" style="display: inline-block; background-color: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Go to Portal</a>
              </div>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">We're here to support you on your therapeutic journey.</p>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} MentalSpace EHR. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  /**
   * Client portal password reset email
   */
  clientPasswordReset: (firstName: string, resetLink: string) => ({
    subject: 'Reset Your MentalSpace Portal Password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background-color: #667eea; padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
            </div>
            <div style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${firstName},</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">You requested to reset your password for your MentalSpace Client Portal account. Click the button below to create a new password:</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetLink}" style="display: inline-block; background-color: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Reset Password</a>
              </div>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Or copy and paste this link:</p>
              <p style="color: #6b7280; font-size: 12px; word-break: break-all; background-color: #f9fafb; padding: 12px; border-radius: 4px;">${resetLink}</p>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 16px;">This link will expire in <strong>1 hour</strong> for security reasons.</p>
              <div style="background-color: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 24px 0;">
                <p style="margin: 0; color: #991b1b; font-size: 14px;">If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
              </div>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 11px; margin: 0;">This is a secure, HIPAA-compliant message from MentalSpace EHR.</p>
              <p style="color: #9ca3af; font-size: 12px; margin: 8px 0 0 0;">© ${new Date().getFullYear()} MentalSpace EHR. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  /**
   * Client temporary password email (admin-created)
   * Sent when an admin creates a temporary password for a client
   */
  clientTempPassword: (firstName: string, tempPassword: string, portalLoginUrl: string) => ({
    subject: 'Your Temporary Password - MentalSpace Portal',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background-color: #f59e0b; padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Temporary Password</h1>
            </div>
            <div style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${firstName},</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Your provider has reset your MentalSpace Client Portal password. Below is your temporary password:</p>
              <div style="background-color: #fef3c7; padding: 24px; border-radius: 8px; margin: 24px 0; border: 2px solid #f59e0b; text-align: center;">
                <p style="margin: 0 0 8px 0; color: #92400e; font-size: 14px; font-weight: 600;">Your Temporary Password</p>
                <p style="margin: 0; color: #92400e; font-size: 24px; font-weight: bold; font-family: monospace; letter-spacing: 2px;">${tempPassword}</p>
              </div>
              <div style="background-color: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 24px 0;">
                <p style="margin: 0 0 8px 0; color: #991b1b; font-size: 14px;"><strong>Important Security Notice:</strong></p>
                <ul style="margin: 0; color: #991b1b; font-size: 14px; padding-left: 20px;">
                  <li>You <strong>must</strong> change this password when you log in</li>
                  <li>This temporary password expires in <strong>72 hours</strong></li>
                  <li>Never share your password with anyone</li>
                </ul>
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${portalLoginUrl}" style="display: inline-block; background-color: #f59e0b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Log In Now</a>
              </div>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">If you didn't request this password reset, please contact your therapist immediately.</p>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 11px; margin: 0;">This is a secure, HIPAA-compliant message from MentalSpace EHR.</p>
              <p style="color: #9ca3af; font-size: 12px; margin: 8px 0 0 0;">© ${new Date().getFullYear()} MentalSpace EHR. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  /**
   * Client email change verification
   */
  clientEmailChangeVerification: (firstName: string, verificationLink: string, newEmail: string) => ({
    subject: 'Verify Your New Email Address - MentalSpace Portal',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background-color: #3b82f6; padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Verify Your New Email</h1>
            </div>
            <div style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${firstName},</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">You requested to change your email address to <strong>${newEmail}</strong>. Please verify this new email address:</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${verificationLink}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Verify New Email</a>
              </div>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">This link will expire in <strong>24 hours</strong>.</p>
              <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 24px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">If you didn't request this change, please contact your therapist immediately.</p>
              </div>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} MentalSpace EHR. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  /**
   * Client welcome email with MRN and portal signup instructions
   * Sent when a new client record is created
   */
  clientWelcome: (firstName: string, mrn: string, clinicianName: string, portalUrl: string) => ({
    subject: 'Welcome to MentalSpace - Your Client Portal Information',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to MentalSpace!</h1>
            </div>
            <div style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${firstName},</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Welcome! Your therapist, <strong>${clinicianName}</strong>, has created your account in our secure system. Below is your unique Medical Record Number (MRN) that you'll need to set up your client portal.</p>

              <div style="background-color: #f0fdf4; padding: 24px; border-radius: 8px; margin: 24px 0; border: 2px solid #10b981; text-align: center;">
                <p style="margin: 0 0 8px 0; color: #065f46; font-size: 14px; font-weight: 600;">Your Medical Record Number (MRN)</p>
                <p style="margin: 0; color: #047857; font-size: 28px; font-weight: bold; font-family: monospace; letter-spacing: 2px;">${mrn}</p>
              </div>

              <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 24px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">⚠️ <strong>Important:</strong> Keep your MRN safe. You'll need it to register for the client portal.</p>
              </div>

              <h2 style="color: #374151; font-size: 18px; margin-top: 32px;">How to Access Your Client Portal</h2>
              <ol style="color: #374151; line-height: 1.8; font-size: 15px; padding-left: 20px;">
                <li>Click the button below or visit the portal registration page</li>
                <li>Enter your MRN number shown above</li>
                <li>Create your account with your email and a secure password</li>
                <li>Verify your email address</li>
                <li>Start accessing your portal!</li>
              </ol>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${portalUrl}/register" style="display: inline-block; background-color: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Set Up Portal Account</a>
              </div>

              <h2 style="color: #374151; font-size: 18px; margin-top: 32px;">What You Can Do in the Portal</h2>
              <ul style="color: #374151; line-height: 1.8; font-size: 15px;">
                <li>📅 View and manage your appointments</li>
                <li>📝 Complete intake forms and assessments</li>
                <li>💬 Communicate securely with your provider</li>
                <li>📊 Track your therapeutic progress</li>
                <li>📄 Access documents and resources</li>
                <li>🆘 Access crisis support resources 24/7</li>
              </ul>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 24px;">If you have any questions or need assistance, please contact your therapist directly.</p>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 11px; margin: 0;">This email contains confidential health information protected by HIPAA. If you received this in error, please delete it immediately and notify the sender.</p>
              <p style="color: #9ca3af; font-size: 12px; margin: 8px 0 0 0;">© ${new Date().getFullYear()} MentalSpace EHR. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  // ============================================================================
  // HR Notification Templates
  // ============================================================================

  /**
   * Performance review reminder for supervisors
   */
  performanceReviewReminder: (
    supervisorName: string,
    employeeName: string,
    reviewDueDate: Date,
    daysUntilDue: number,
    dashboardLink: string
  ) => ({
    subject: `${daysUntilDue <= 7 ? '🚨 URGENT: ' : ''}Performance Review Due${daysUntilDue <= 7 ? ' in ' + daysUntilDue + ' days' : ' Soon'} - ${employeeName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background-color: ${daysUntilDue <= 7 ? '#dc2626' : '#f59e0b'}; padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">📋 Performance Review ${daysUntilDue <= 7 ? 'Urgent' : 'Reminder'}</h1>
            </div>
            <div style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${supervisorName},</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">A performance review for one of your team members is ${daysUntilDue <= 7 ? '<strong style="color: #dc2626;">due soon</strong>' : 'coming up'}.</p>
              <div style="background-color: ${daysUntilDue <= 7 ? '#fef2f2' : '#fef3c7'}; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid ${daysUntilDue <= 7 ? '#dc2626' : '#f59e0b'};">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: ${daysUntilDue <= 7 ? '#991b1b' : '#92400e'}; font-weight: 600; width: 120px;">Employee:</td>
                    <td style="padding: 8px 0; color: #374151; font-weight: 600;">${employeeName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: ${daysUntilDue <= 7 ? '#991b1b' : '#92400e'}; font-weight: 600;">Due Date:</td>
                    <td style="padding: 8px 0; color: #374151;">${reviewDueDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: ${daysUntilDue <= 7 ? '#991b1b' : '#92400e'}; font-weight: 600;">Days Until Due:</td>
                    <td style="padding: 8px 0; color: ${daysUntilDue <= 7 ? '#dc2626' : '#374151'}; font-weight: ${daysUntilDue <= 7 ? '700' : '400'}; font-size: ${daysUntilDue <= 7 ? '18px' : '16px'};">${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}</td>
                  </tr>
                </table>
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${dashboardLink}" style="display: inline-block; background-color: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Complete Review</a>
              </div>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Please complete this review by the due date to maintain compliance with HR policies.</p>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} MentalSpace EHR. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  /**
   * High PTO balance alert for employees
   */
  ptoBalanceAlert: (
    employeeName: string,
    ptoBalance: number,
    vacationBalance: number,
    totalBalance: number,
    expirationWarning: string,
    portalLink: string
  ) => ({
    subject: `⚠️ High PTO Balance Alert - ${totalBalance} Days Available`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background-color: #3b82f6; padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🏖️ PTO Balance Update</h1>
            </div>
            <div style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${employeeName},</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">We noticed you have a significant amount of PTO and vacation time available. Here's your current balance:</p>
              <div style="background-color: #dbeafe; padding: 24px; border-radius: 8px; margin: 24px 0; border: 2px solid #3b82f6;">
                <div style="display: flex; justify-content: space-around; text-align: center;">
                  <div style="flex: 1;">
                    <p style="color: #1e40af; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">PTO Balance</p>
                    <p style="color: #1d4ed8; font-size: 32px; font-weight: bold; margin: 0;">${ptoBalance}</p>
                    <p style="color: #1e40af; font-size: 12px; margin: 4px 0 0 0;">days</p>
                  </div>
                  <div style="width: 1px; background-color: #93c5fd;"></div>
                  <div style="flex: 1;">
                    <p style="color: #1e40af; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">Vacation Balance</p>
                    <p style="color: #1d4ed8; font-size: 32px; font-weight: bold; margin: 0;">${vacationBalance}</p>
                    <p style="color: #1e40af; font-size: 12px; margin: 4px 0 0 0;">days</p>
                  </div>
                </div>
                <hr style="border: none; border-top: 1px solid #93c5fd; margin: 20px 0;">
                <div style="text-align: center;">
                  <p style="color: #1e40af; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">Total Available</p>
                  <p style="color: #1d4ed8; font-size: 40px; font-weight: bold; margin: 0;">${totalBalance}</p>
                  <p style="color: #1e40af; font-size: 12px; margin: 4px 0 0 0;">days</p>
                </div>
              </div>
              <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 24px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>⚠️ Reminder:</strong> ${expirationWarning}</p>
              </div>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Consider scheduling some well-deserved time off to recharge. Your well-being is important to us!</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${portalLink}" style="display: inline-block; background-color: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Request Time Off</a>
              </div>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} MentalSpace EHR. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  /**
   * Attendance issue alert for HR/supervisors
   */
  attendanceIssueAlert: (
    recipientName: string,
    weekStartDate: Date,
    weekEndDate: Date,
    issues: Array<{ employeeName: string; issue: string; details?: string }>,
    dashboardLink: string
  ) => ({
    subject: `🚨 Attendance Compliance Issues - Week of ${weekStartDate.toLocaleDateString()}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background-color: #dc2626; padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">⏰ Attendance Compliance Alert</h1>
            </div>
            <div style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${recipientName},</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">The following attendance compliance issues were detected for the week of <strong>${weekStartDate.toLocaleDateString()}</strong> to <strong>${weekEndDate.toLocaleDateString()}</strong>:</p>
              <div style="margin: 24px 0;">
                ${issues.map(issue => `
                  <div style="background-color: #fef2f2; padding: 16px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid #dc2626;">
                    <p style="margin: 0 0 8px 0; color: #991b1b; font-weight: 600;">${issue.employeeName}</p>
                    <p style="margin: 0; color: #7f1d1d; font-size: 14px;">${issue.issue}</p>
                    ${issue.details ? `<p style="margin: 8px 0 0 0; color: #9a3412; font-size: 13px; font-style: italic;">${issue.details}</p>` : ''}
                  </div>
                `).join('')}
              </div>
              <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 24px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>Action Required:</strong> Please review and resolve these issues to maintain accurate attendance records and compliance.</p>
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${dashboardLink}" style="display: inline-block; background-color: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Review Attendance Records</a>
              </div>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} MentalSpace EHR. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  // ============================================================================
  // Compliance Notification Templates
  // ============================================================================

  /**
   * Policy review reminder for policy owners
   */
  policyReviewReminder: (
    ownerName: string,
    policies: Array<{ policyNumber: string; policyName: string; daysOverdue: number }>,
    dashboardLink: string
  ) => ({
    subject: `⚠️ ${policies.length} Polic${policies.length === 1 ? 'y' : 'ies'} Due for Review`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background-color: #f59e0b; padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">📋 Policy Review Required</h1>
            </div>
            <div style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${ownerName},</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">The following policies you own are due for review:</p>
              <div style="margin: 24px 0;">
                ${policies.map(policy => `
                  <div style="background-color: ${policy.daysOverdue > 0 ? '#fef2f2' : '#fef3c7'}; padding: 16px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid ${policy.daysOverdue > 0 ? '#dc2626' : '#f59e0b'};">
                    <p style="margin: 0 0 4px 0; color: #374151; font-weight: 600;">${policy.policyNumber}: ${policy.policyName}</p>
                    <p style="margin: 0; color: ${policy.daysOverdue > 0 ? '#dc2626' : '#92400e'}; font-size: 14px;">${policy.daysOverdue > 0 ? `${policy.daysOverdue} days overdue` : 'Due today'}</p>
                  </div>
                `).join('')}
              </div>
              <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 24px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>Action Required:</strong> Please review and update these policies to maintain compliance.</p>
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${dashboardLink}" style="display: inline-block; background-color: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Review Policies</a>
              </div>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} MentalSpace EHR. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  /**
   * Incident follow-up reminder for investigators
   */
  incidentFollowUpReminder: (
    investigatorName: string,
    incidents: Array<{ incidentNumber: string; incidentType: string; daysOverdue?: number }>,
    dashboardLink: string
  ) => ({
    subject: `🔔 ${incidents.length} Incident${incidents.length === 1 ? '' : 's'} Requiring Follow-up`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background-color: #3b82f6; padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🔍 Incident Follow-up Required</h1>
            </div>
            <div style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${investigatorName},</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">The following incidents assigned to you require follow-up:</p>
              <div style="margin: 24px 0;">
                ${incidents.map(incident => `
                  <div style="background-color: ${incident.daysOverdue && incident.daysOverdue > 0 ? '#fef2f2' : '#dbeafe'}; padding: 16px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid ${incident.daysOverdue && incident.daysOverdue > 0 ? '#dc2626' : '#3b82f6'};">
                    <p style="margin: 0 0 4px 0; color: #374151; font-weight: 600;">${incident.incidentNumber}</p>
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Type: ${incident.incidentType}</p>
                    ${incident.daysOverdue && incident.daysOverdue > 0 ? `<p style="margin: 4px 0 0 0; color: #dc2626; font-size: 14px; font-weight: 600;">${incident.daysOverdue} days overdue</p>` : ''}
                  </div>
                `).join('')}
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${dashboardLink}" style="display: inline-block; background-color: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">View Incidents</a>
              </div>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} MentalSpace EHR. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  /**
   * Critical incident alert for compliance team
   */
  criticalIncidentAlert: (
    recipientName: string,
    incidents: Array<{ incidentNumber: string; incidentType: string }>,
    dashboardLink: string
  ) => ({
    subject: `🚨 URGENT: ${incidents.length} Critical Incident${incidents.length === 1 ? '' : 's'} Without Investigator`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background-color: #dc2626; padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🚨 CRITICAL INCIDENT ALERT</h1>
            </div>
            <div style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${recipientName},</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;"><strong style="color: #dc2626;">URGENT:</strong> The following critical incidents have <strong>no investigator assigned</strong> and require immediate attention:</p>
              <div style="margin: 24px 0;">
                ${incidents.map(incident => `
                  <div style="background-color: #fef2f2; padding: 16px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid #dc2626;">
                    <p style="margin: 0 0 4px 0; color: #991b1b; font-weight: 600;">${incident.incidentNumber}</p>
                    <p style="margin: 0; color: #7f1d1d; font-size: 14px;">Type: ${incident.incidentType}</p>
                    <p style="margin: 4px 0 0 0; color: #dc2626; font-size: 14px; font-weight: 600;">⚠️ No investigator assigned</p>
                  </div>
                `).join('')}
              </div>
              <div style="background-color: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 24px 0;">
                <p style="margin: 0; color: #991b1b; font-size: 14px;"><strong>Immediate Action Required:</strong> Please assign investigators to these critical incidents as soon as possible to ensure timely resolution.</p>
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${dashboardLink}" style="display: inline-block; background-color: #dc2626; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Assign Investigators Now</a>
              </div>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} MentalSpace EHR. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),
};

/**
 * Check if Resend is properly configured
 */
export function isResendConfigured(): boolean {
  return !!(resendClient && resendApiKey && resendApiKey !== 'your-resend-api-key');
}

/**
 * Get configuration status (for debugging)
 */
export function getResendConfigStatus() {
  return {
    configured: isResendConfigured(),
    hasApiKey: !!(resendApiKey && resendApiKey !== 'your-resend-api-key'),
    fromEmail: process.env.RESEND_FROM_EMAIL || 'noreply@mentalspace.com',
  };
}
