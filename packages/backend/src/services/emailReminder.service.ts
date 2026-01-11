import nodemailer from 'nodemailer';
import { ClinicalNote, User, Client } from '@prisma/client';
import logger from '../utils/logger';

/**
 * Email Reminder Service for Clinical Notes
 * Module 4 Phase 2.5: Email Reminder System
 *
 * Handles sending email reminders to clinicians about:
 * - Upcoming note due dates (72h, 48h, 24h before)
 * - Overdue notes (daily reminders)
 * - Sunday warnings (notes lock on Sunday midnight)
 * - Daily digest of pending notes
 * - Escalation to supervisors/administrators
 */

export interface ReminderEmailOptions {
  recipientEmail: string;
  recipientName: string;
  note: ClinicalNote & {
    client: Pick<Client, 'firstName' | 'lastName'>;
    clinician: Pick<User, 'firstName' | 'lastName' | 'email'>;
  };
  reminderType: 'DUE_SOON' | 'OVERDUE' | 'ESCALATION' | 'SUNDAY_WARNING';
  hoursRemaining?: number;
  hoursOverdue?: number;
}

export interface DailyDigestOptions {
  recipientEmail: string;
  recipientName: string;
  overdueNotes: Array<ClinicalNote & {
    client: Pick<Client, 'firstName' | 'lastName'>;
  }>;
  upcomingNotes: Array<ClinicalNote & {
    client: Pick<Client, 'firstName' | 'lastName'>;
  }>;
}

class EmailReminderService {
  private transporter: nodemailer.Transporter | null = null;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@mentalspace.com';
    this.fromName = process.env.SMTP_FROM_NAME || 'MentalSpace EHR';
    this.initializeTransporter();
  }

  /**
   * Initialize nodemailer transporter with SMTP configuration
   */
  private initializeTransporter() {
    try {
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
      const smtpUser = process.env.SMTP_USER;
      const smtpPassword = process.env.SMTP_PASSWORD;
      const smtpSecure = process.env.SMTP_SECURE === 'true';

      if (!smtpHost || !smtpUser || !smtpPassword) {
        logger.warn('SMTP configuration incomplete. Email reminders will not be sent.', {
          hasHost: !!smtpHost,
          hasUser: !!smtpUser,
          hasPassword: !!smtpPassword,
        });
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });

      logger.info('Email transporter initialized', {
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
      });
    } catch (error: any) {
      logger.error('Failed to initialize email transporter', {
        error: error.message,
      });
    }
  }

  /**
   * Check if email service is configured and ready
   */
  public isConfigured(): boolean {
    return this.transporter !== null;
  }

  /**
   * Send "Due Soon" reminder (72h, 48h, 24h before due date)
   */
  public async sendDueSoonReminder(options: ReminderEmailOptions): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('Email transporter not configured. Skipping reminder.');
      return false;
    }

    try {
      const { recipientEmail, recipientName, note, hoursRemaining } = options;
      const clientName = `${note.client.firstName} ${note.client.lastName}`;

      const subject = `⏰ Clinical Note Due Soon - ${clientName}`;
      const html = this.buildDueSoonTemplate({
        recipientName,
        clientName,
        noteType: note.noteType,
        sessionDate: note.sessionDate || new Date(),
        dueDate: note.dueDate || new Date(),
        hoursRemaining: hoursRemaining || 0,
        noteId: note.id,
      });

      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: recipientEmail,
        subject,
        html,
      });

      logger.info('Due soon reminder sent', {
        recipientEmail,
        noteId: note.id,
        hoursRemaining,
      });

      return true;
    } catch (error: any) {
      logger.error('Failed to send due soon reminder', {
        error: error.message,
        recipientEmail: options.recipientEmail,
        noteId: options.note.id,
      });
      return false;
    }
  }

  /**
   * Send "Overdue" reminder (note is past due date)
   */
  public async sendOverdueReminder(options: ReminderEmailOptions): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('Email transporter not configured. Skipping reminder.');
      return false;
    }

    try {
      const { recipientEmail, recipientName, note, hoursOverdue } = options;
      const clientName = `${note.client.firstName} ${note.client.lastName}`;

      const subject = `🚨 OVERDUE Clinical Note - ${clientName}`;
      const html = this.buildOverdueTemplate({
        recipientName,
        clientName,
        noteType: note.noteType,
        sessionDate: note.sessionDate || new Date(),
        dueDate: note.dueDate || new Date(),
        hoursOverdue: hoursOverdue || 0,
        noteId: note.id,
      });

      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: recipientEmail,
        subject,
        html,
      });

      logger.info('Overdue reminder sent', {
        recipientEmail,
        noteId: note.id,
        hoursOverdue,
      });

      return true;
    } catch (error: any) {
      logger.error('Failed to send overdue reminder', {
        error: error.message,
        recipientEmail: options.recipientEmail,
        noteId: options.note.id,
      });
      return false;
    }
  }

  /**
   * Send "Sunday Warning" reminder (notes lock on Sunday midnight)
   */
  public async sendSundayWarningReminder(options: ReminderEmailOptions): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('Email transporter not configured. Skipping reminder.');
      return false;
    }

    try {
      const { recipientEmail, recipientName, note } = options;
      const clientName = `${note.client.firstName} ${note.client.lastName}`;

      const subject = `⚠️ Sunday Lockout Warning - ${clientName}`;
      const html = this.buildSundayWarningTemplate({
        recipientName,
        clientName,
        noteType: note.noteType,
        sessionDate: note.sessionDate || new Date(),
        noteId: note.id,
      });

      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: recipientEmail,
        subject,
        html,
      });

      logger.info('Sunday warning reminder sent', {
        recipientEmail,
        noteId: note.id,
      });

      return true;
    } catch (error: any) {
      logger.error('Failed to send Sunday warning reminder', {
        error: error.message,
        recipientEmail: options.recipientEmail,
        noteId: options.note.id,
      });
      return false;
    }
  }

  /**
   * Send escalation reminder to supervisor/administrator
   */
  public async sendEscalationReminder(options: ReminderEmailOptions): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('Email transporter not configured. Skipping reminder.');
      return false;
    }

    try {
      const { recipientEmail, recipientName, note, hoursOverdue } = options;
      const clientName = `${note.client.firstName} ${note.client.lastName}`;
      const clinicianName = `${note.clinician.firstName} ${note.clinician.lastName}`;

      const subject = `🔴 ESCALATION: Overdue Clinical Note - ${clinicianName}`;
      const html = this.buildEscalationTemplate({
        recipientName,
        clinicianName,
        clinicianEmail: note.clinician.email,
        clientName,
        noteType: note.noteType,
        sessionDate: note.sessionDate || new Date(),
        dueDate: note.dueDate || new Date(),
        hoursOverdue: hoursOverdue || 0,
        noteId: note.id,
      });

      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: recipientEmail,
        subject,
        html,
      });

      logger.info('Escalation reminder sent', {
        recipientEmail,
        noteId: note.id,
        clinicianEmail: note.clinician.email,
        hoursOverdue,
      });

      return true;
    } catch (error: any) {
      logger.error('Failed to send escalation reminder', {
        error: error.message,
        recipientEmail: options.recipientEmail,
        noteId: options.note.id,
      });
      return false;
    }
  }

  /**
   * Send daily digest of pending notes
   */
  public async sendDailyDigest(options: DailyDigestOptions): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('Email transporter not configured. Skipping reminder.');
      return false;
    }

    try {
      const { recipientEmail, recipientName, overdueNotes, upcomingNotes } = options;

      const subject = `📋 Daily Note Completion Digest - ${overdueNotes.length} Overdue, ${upcomingNotes.length} Upcoming`;
      const html = this.buildDailyDigestTemplate({
        recipientName,
        overdueNotes,
        upcomingNotes,
      });

      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: recipientEmail,
        subject,
        html,
      });

      logger.info('Daily digest sent', {
        recipientEmail,
        overdueCount: overdueNotes.length,
        upcomingCount: upcomingNotes.length,
      });

      return true;
    } catch (error: any) {
      logger.error('Failed to send daily digest', {
        error: error.message,
        recipientEmail: options.recipientEmail,
      });
      return false;
    }
  }

  /**
   * Build HTML template for "Due Soon" reminder
   */
  private buildDueSoonTemplate(data: {
    recipientName: string;
    clientName: string;
    noteType: string;
    sessionDate: Date;
    dueDate: Date;
    hoursRemaining: number;
    noteId: string;
  }): string {
    const appUrl = process.env.APP_URL || 'http://localhost:3001';
    const noteUrl = `${appUrl}/clinical-notes/${data.noteId}`;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #FFA500; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
    .note-details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #FFA500; }
    .button { display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Clinical Note Due Soon</h1>
    </div>
    <div class="content">
      <p>Hi ${data.recipientName},</p>

      <p>This is a reminder that you have a clinical note due in <strong>${data.hoursRemaining} hours</strong>.</p>

      <div class="note-details">
        <p><strong>Client:</strong> ${data.clientName}</p>
        <p><strong>Note Type:</strong> ${data.noteType}</p>
        <p><strong>Session Date:</strong> ${new Date(data.sessionDate).toLocaleDateString()}</p>
        <p><strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString()} at ${new Date(data.dueDate).toLocaleTimeString()}</p>
      </div>

      <p>Please complete this note as soon as possible to maintain compliance with documentation requirements.</p>

      <a href="${noteUrl}" class="button">Complete Note Now</a>

      <div class="footer">
        <p>This is an automated reminder from MentalSpace EHR</p>
        <p>To update your reminder preferences, visit Settings > Reminder Configuration</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Build HTML template for "Overdue" reminder
   */
  private buildOverdueTemplate(data: {
    recipientName: string;
    clientName: string;
    noteType: string;
    sessionDate: Date;
    dueDate: Date;
    hoursOverdue: number;
    noteId: string;
  }): string {
    const appUrl = process.env.APP_URL || 'http://localhost:3001';
    const noteUrl = `${appUrl}/clinical-notes/${data.noteId}`;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #DC143C; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
    .note-details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #DC143C; }
    .warning { background-color: #FFF3CD; padding: 15px; margin: 20px 0; border-left: 4px solid #FFA500; }
    .button { display: inline-block; background-color: #DC143C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 OVERDUE Clinical Note</h1>
    </div>
    <div class="content">
      <p>Hi ${data.recipientName},</p>

      <div class="warning">
        <strong>⚠️ This note is now ${data.hoursOverdue} hours overdue.</strong>
      </div>

      <p>This clinical note was due on <strong>${new Date(data.dueDate).toLocaleDateString()}</strong> and requires immediate attention.</p>

      <div class="note-details">
        <p><strong>Client:</strong> ${data.clientName}</p>
        <p><strong>Note Type:</strong> ${data.noteType}</p>
        <p><strong>Session Date:</strong> ${new Date(data.sessionDate).toLocaleDateString()}</p>
        <p><strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString()} at ${new Date(data.dueDate).toLocaleTimeString()}</p>
        <p><strong>Hours Overdue:</strong> ${data.hoursOverdue}</p>
      </div>

      <p><strong>Action Required:</strong> Please complete this note immediately to avoid compliance issues and potential escalation to your supervisor.</p>

      <a href="${noteUrl}" class="button">Complete Note Now</a>

      <div class="footer">
        <p>This is an automated reminder from MentalSpace EHR</p>
        <p>If you need assistance, please contact your supervisor or practice administrator</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Build HTML template for "Sunday Warning" reminder
   */
  private buildSundayWarningTemplate(data: {
    recipientName: string;
    clientName: string;
    noteType: string;
    sessionDate: Date;
    noteId: string;
  }): string {
    const appUrl = process.env.APP_URL || 'http://localhost:3001';
    const noteUrl = `${appUrl}/clinical-notes/${data.noteId}`;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #FF6347; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
    .note-details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #FF6347; }
    .lockout-warning { background-color: #FFEBEE; padding: 20px; margin: 20px 0; border-left: 4px solid #D32F2F; }
    .button { display: inline-block; background-color: #D32F2F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Sunday Lockout Warning</h1>
    </div>
    <div class="content">
      <p>Hi ${data.recipientName},</p>

      <div class="lockout-warning">
        <h3>🔒 Automatic Lockout Tonight at Midnight</h3>
        <p>This note will be automatically locked and escalated to your supervisor if not completed before Sunday midnight.</p>
      </div>

      <p>The following clinical note is still pending and will be locked soon:</p>

      <div class="note-details">
        <p><strong>Client:</strong> ${data.clientName}</p>
        <p><strong>Note Type:</strong> ${data.noteType}</p>
        <p><strong>Session Date:</strong> ${new Date(data.sessionDate).toLocaleDateString()}</p>
      </div>

      <p><strong>Urgent Action Required:</strong> Please complete and sign this note before midnight tonight to avoid lockout and supervisor escalation.</p>

      <a href="${noteUrl}" class="button">Complete Note Now</a>

      <div class="footer">
        <p>This is an automated Sunday warning from MentalSpace EHR</p>
        <p>Sunday lockout is a practice-wide policy to ensure timely documentation</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Build HTML template for escalation reminder
   */
  private buildEscalationTemplate(data: {
    recipientName: string;
    clinicianName: string;
    clinicianEmail: string;
    clientName: string;
    noteType: string;
    sessionDate: Date;
    dueDate: Date;
    hoursOverdue: number;
    noteId: string;
  }): string {
    const appUrl = process.env.APP_URL || 'http://localhost:3001';
    const noteUrl = `${appUrl}/clinical-notes/${data.noteId}`;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #8B0000; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
    .note-details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #8B0000; }
    .escalation { background-color: #FFEBEE; padding: 20px; margin: 20px 0; border-left: 4px solid #D32F2F; }
    .button { display: inline-block; background-color: #8B0000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔴 ESCALATION: Overdue Clinical Note</h1>
    </div>
    <div class="content">
      <p>Hi ${data.recipientName},</p>

      <div class="escalation">
        <h3>⚠️ Supervisor/Administrator Attention Required</h3>
        <p>A clinical note under your supervision is significantly overdue and requires intervention.</p>
      </div>

      <p><strong>Clinician:</strong> ${data.clinicianName} (${data.clinicianEmail})</p>

      <div class="note-details">
        <p><strong>Client:</strong> ${data.clientName}</p>
        <p><strong>Note Type:</strong> ${data.noteType}</p>
        <p><strong>Session Date:</strong> ${new Date(data.sessionDate).toLocaleDateString()}</p>
        <p><strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString()}</p>
        <p><strong>Hours Overdue:</strong> ${data.hoursOverdue}</p>
      </div>

      <p><strong>Action Required:</strong> Please follow up with the clinician to ensure this note is completed promptly. Consider implementing additional oversight or support as needed.</p>

      <a href="${noteUrl}" class="button">View Note Details</a>

      <div class="footer">
        <p>This is an automated escalation from MentalSpace EHR</p>
        <p>Escalations occur after notes remain overdue beyond the configured threshold</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Build HTML template for daily digest
   */
  private buildDailyDigestTemplate(data: {
    recipientName: string;
    overdueNotes: Array<ClinicalNote & {
      client: Pick<Client, 'firstName' | 'lastName'>;
    }>;
    upcomingNotes: Array<ClinicalNote & {
      client: Pick<Client, 'firstName' | 'lastName'>;
    }>;
  }): string {
    const appUrl = process.env.APP_URL || 'http://localhost:3001';

    const overdueList = data.overdueNotes.map((note: any) => `
      <li>
        <strong>${note.client.firstName} ${note.client.lastName}</strong> - ${note.noteType}
        <br>
        <small>Due: ${note.dueDate ? new Date(note.dueDate).toLocaleDateString() : 'N/A'}</small>
        <br>
        <a href="${appUrl}/clinical-notes/${note.id}">Complete Note</a>
      </li>
    `).join('');

    const upcomingList = data.upcomingNotes.map((note: any) => `
      <li>
        <strong>${note.client.firstName} ${note.client.lastName}</strong> - ${note.noteType}
        <br>
        <small>Due: ${note.dueDate ? new Date(note.dueDate).toLocaleDateString() : 'N/A'}</small>
        <br>
        <a href="${appUrl}/clinical-notes/${note.id}">View Note</a>
      </li>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
    .section { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
    .overdue { border-left: 4px solid #DC143C; }
    .upcoming { border-left: 4px solid #FFA500; }
    ul { padding-left: 20px; }
    li { margin: 15px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Daily Note Completion Digest</h1>
    </div>
    <div class="content">
      <p>Hi ${data.recipientName},</p>

      <p>Here's your daily summary of clinical notes requiring attention:</p>

      ${data.overdueNotes.length > 0 ? `
      <div class="section overdue">
        <h2>🚨 Overdue Notes (${data.overdueNotes.length})</h2>
        <ul>
          ${overdueList}
        </ul>
      </div>
      ` : ''}

      ${data.upcomingNotes.length > 0 ? `
      <div class="section upcoming">
        <h2>⏰ Upcoming Due Dates (${data.upcomingNotes.length})</h2>
        <ul>
          ${upcomingList}
        </ul>
      </div>
      ` : ''}

      ${data.overdueNotes.length === 0 && data.upcomingNotes.length === 0 ? `
      <div class="section">
        <p>✅ Great job! You have no overdue or upcoming notes at this time.</p>
      </div>
      ` : ''}

      <div class="footer">
        <p>This is your daily digest from MentalSpace EHR</p>
        <p>To update your digest preferences, visit Settings > Reminder Configuration</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }
}

// Export singleton instance
export default new EmailReminderService();
