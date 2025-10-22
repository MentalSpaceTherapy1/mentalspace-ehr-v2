import { Resend } from 'resend';
import logger from '../utils/logger';
import config from '../config';

// Initialize Resend client
const resendApiKey = process.env.RESEND_API_KEY || config.resendApiKey;
let resendClient: Resend | null = null;

if (resendApiKey && resendApiKey !== 'your-resend-api-key') {
  resendClient = new Resend(resendApiKey);
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
  try {
    // In development or if Resend not configured, log emails instead of sending
    if (process.env.NODE_ENV === 'development' || !resendClient) {
      logger.info('📧 [EMAIL] (Development Mode - Not Actually Sent via Resend)');
      logger.info('To:', options.to);
      logger.info('Subject:', options.subject);
      logger.info('---');
      logger.info(options.html.replace(/<[^>]*>/g, '')); // Strip HTML tags for console
      logger.info('---');
      return true;
    }

    const fromEmail = options.from || process.env.RESEND_FROM_EMAIL || 'MentalSpace EHR <noreply@mentalspace.com>';

    const result = await resendClient.emails.send({
      from: fromEmail,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      cc: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
      bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined,
      reply_to: options.replyTo,
    });

    logger.info('✅ Email sent via Resend:', result.data?.id);
    return true;

  } catch (error) {
    logger.error('❌ Error sending email via Resend:', {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? error.message : 'Unknown error'
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
  clientInvitation: (firstName: string, invitationLink: string, clinicianName: string) => ({
    subject: 'You\'re Invited to MentalSpace Client Portal',
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
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to MentalSpace Client Portal</h1>
            </div>
            <div style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${firstName},</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Your therapist, ${clinicianName}, has invited you to access our secure client portal.</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-top: 24px;"><strong>What you can do in the portal:</strong></p>
              <ul style="color: #374151; line-height: 1.8; font-size: 15px;">
                <li>View and manage your appointments</li>
                <li>Complete intake forms and assessments</li>
                <li>Communicate securely with your provider</li>
                <li>Access session summaries and resources</li>
                <li>Track your therapeutic goals and progress</li>
                <li>Access crisis resources 24/7</li>
              </ul>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${invitationLink}" style="display: inline-block; background-color: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Set Up Your Portal Account</a>
              </div>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Or copy and paste this link:</p>
              <p style="color: #6b7280; font-size: 12px; word-break: break-all; background-color: #f9fafb; padding: 12px; border-radius: 4px;">${invitationLink}</p>
              <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 24px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">This invitation link will expire in 7 days.</p>
              </div>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">If you have any questions, please contact your therapist.</p>
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
