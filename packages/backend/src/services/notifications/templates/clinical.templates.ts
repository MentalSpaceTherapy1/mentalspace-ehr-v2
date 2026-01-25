/**
 * Clinical Note Notification Templates
 * Phase 3.1: Templates for clinical note-related notifications
 */

import { RenderedTemplate } from '../types';

export interface NoteDueSoonData {
  clinicianName: string;
  noteCount: number;
  notes: Array<{
    clientName: string;
    noteType: string;
    sessionDate: string;
    dueDate: string;
    hoursRemaining: number;
  }>;
  dashboardLink: string;
  practiceName: string;
}

export interface NoteOverdueData {
  clinicianName: string;
  noteCount: number;
  notes: Array<{
    clientName: string;
    noteType: string;
    sessionDate: string;
    dueDate: string;
    daysOverdue: number;
  }>;
  dashboardLink: string;
  supervisorName?: string;
  escalationLevel: 'WARNING' | 'ESCALATED' | 'CRITICAL';
  practiceName: string;
}

export interface NotePendingCosignData {
  supervisorName: string;
  clinicianName: string;
  noteCount: number;
  notes: Array<{
    clientName: string;
    noteType: string;
    sessionDate: string;
    submittedAt: string;
  }>;
  reviewLink: string;
  practiceName: string;
}

export interface NoteDailyDigestData {
  clinicianName: string;
  summary: {
    dueTodayCount: number;
    dueSoonCount: number;
    overdueCount: number;
    pendingCosignCount: number;
  };
  dueTodayNotes: Array<{
    clientName: string;
    noteType: string;
    sessionDate: string;
  }>;
  overdueNotes: Array<{
    clientName: string;
    noteType: string;
    daysOverdue: number;
  }>;
  dashboardLink: string;
  practiceName: string;
}

/**
 * Render note due soon reminder
 */
export function renderNoteDueSoon(data: NoteDueSoonData): RenderedTemplate {
  const subject = `${data.noteCount} Clinical Note${data.noteCount > 1 ? 's' : ''} Due Soon`;

  const notesList = data.notes
    .map(
      (n) =>
        `- ${n.clientName}: ${n.noteType} (Session: ${n.sessionDate}) - Due in ${n.hoursRemaining} hours`
    )
    .join('\n');

  const textBody = `
Hello ${data.clinicianName},

You have ${data.noteCount} clinical note${data.noteCount > 1 ? 's' : ''} due soon:

${notesList}

Please complete these notes before their due dates to maintain compliance.

View your notes: ${data.dashboardLink}

Thank you,
${data.practiceName}
`.trim();

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .note-item { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; margin: 8px 0; border-radius: 0 4px 4px 0; }
    .client-name { font-weight: bold; color: #92400e; }
    .due-time { color: #b45309; font-size: 14px; }
    .btn { display: inline-block; padding: 12px 24px; background: #6B46C1; color: white; border-radius: 6px; text-decoration: none; margin: 16px 0; }
    .footer { text-align: center; padding: 16px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">⏰ Notes Due Soon</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">${data.noteCount} note${data.noteCount > 1 ? 's' : ''} require${data.noteCount === 1 ? 's' : ''} attention</p>
    </div>
    <div class="content">
      <p>Hello ${data.clinicianName},</p>
      <p>The following clinical notes are due soon:</p>

      ${data.notes
        .map(
          (n) => `
        <div class="note-item">
          <div class="client-name">${n.clientName}</div>
          <div>${n.noteType} • Session: ${n.sessionDate}</div>
          <div class="due-time">Due in ${n.hoursRemaining} hours (${n.dueDate})</div>
        </div>
      `
        )
        .join('')}

      <div style="text-align: center;">
        <a href="${data.dashboardLink}" class="btn">View Notes Dashboard</a>
      </div>

      <p style="font-size: 14px; color: #6b7280;">Please complete these notes before their due dates to maintain compliance.</p>

      <p>Thank you,<br><strong>${data.practiceName}</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated reminder. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
`.trim();

  const smsBody = `${data.practiceName}: ${data.noteCount} clinical note${data.noteCount > 1 ? 's' : ''} due soon. Please complete before deadline.`;

  return { subject, textBody, htmlBody, smsBody };
}

/**
 * Render overdue note notification
 */
export function renderNoteOverdue(data: NoteOverdueData): RenderedTemplate {
  const urgencyPrefix =
    data.escalationLevel === 'CRITICAL'
      ? '🚨 CRITICAL: '
      : data.escalationLevel === 'ESCALATED'
        ? '⚠️ ESCALATED: '
        : '';

  const subject = `${urgencyPrefix}${data.noteCount} Overdue Clinical Note${data.noteCount > 1 ? 's' : ''}`;

  const notesList = data.notes
    .map(
      (n) =>
        `- ${n.clientName}: ${n.noteType} (Session: ${n.sessionDate}) - ${n.daysOverdue} days overdue`
    )
    .join('\n');

  const escalationText =
    data.escalationLevel === 'CRITICAL'
      ? `\n\nThis has been escalated to practice administration due to extended non-compliance.`
      : data.escalationLevel === 'ESCALATED' && data.supervisorName
        ? `\n\nThis has been escalated to your supervisor (${data.supervisorName}).`
        : '';

  const textBody = `
Hello ${data.clinicianName},

You have ${data.noteCount} OVERDUE clinical note${data.noteCount > 1 ? 's' : ''}:

${notesList}
${escalationText}

Immediate attention is required to maintain compliance and ensure quality of care documentation.

View your notes: ${data.dashboardLink}

Thank you,
${data.practiceName}
`.trim();

  const bgColor =
    data.escalationLevel === 'CRITICAL'
      ? '#dc2626'
      : data.escalationLevel === 'ESCALATED'
        ? '#ea580c'
        : '#ef4444';

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${bgColor}; color: white; padding: 24px; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .note-item { background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 8px 0; border-radius: 0 4px 4px 0; }
    .client-name { font-weight: bold; color: #991b1b; }
    .overdue-time { color: #dc2626; font-size: 14px; font-weight: bold; }
    .escalation-box { background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .btn { display: inline-block; padding: 12px 24px; background: #6B46C1; color: white; border-radius: 6px; text-decoration: none; margin: 16px 0; }
    .footer { text-align: center; padding: 16px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">${data.escalationLevel === 'CRITICAL' ? '🚨' : '⚠️'} Overdue Notes - ${data.escalationLevel}</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">${data.noteCount} note${data.noteCount > 1 ? 's' : ''} past due date</p>
    </div>
    <div class="content">
      <p>Hello ${data.clinicianName},</p>
      <p>The following clinical notes are <strong>overdue</strong> and require immediate attention:</p>

      ${data.notes
        .map(
          (n) => `
        <div class="note-item">
          <div class="client-name">${n.clientName}</div>
          <div>${n.noteType} • Session: ${n.sessionDate}</div>
          <div class="overdue-time">${n.daysOverdue} day${n.daysOverdue > 1 ? 's' : ''} overdue (Due: ${n.dueDate})</div>
        </div>
      `
        )
        .join('')}

      ${
        data.escalationLevel !== 'WARNING'
          ? `
        <div class="escalation-box">
          <strong>Escalation Notice:</strong> ${
            data.escalationLevel === 'CRITICAL'
              ? 'This has been escalated to practice administration due to extended non-compliance.'
              : data.supervisorName
                ? `This has been escalated to your supervisor (${data.supervisorName}).`
                : 'This has been escalated to supervision.'
          }
        </div>
      `
          : ''
      }

      <div style="text-align: center;">
        <a href="${data.dashboardLink}" class="btn">Complete Notes Now</a>
      </div>

      <p>Thank you,<br><strong>${data.practiceName}</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated reminder. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
`.trim();

  const smsBody = `${data.practiceName}: URGENT - ${data.noteCount} clinical note${data.noteCount > 1 ? 's' : ''} overdue. Immediate completion required.`;

  return { subject, textBody, htmlBody, smsBody };
}

/**
 * Render pending co-sign notification for supervisors
 */
export function renderNotePendingCosign(
  data: NotePendingCosignData
): RenderedTemplate {
  const subject = `${data.noteCount} Note${data.noteCount > 1 ? 's' : ''} Pending Your Co-Signature`;

  const notesList = data.notes
    .map(
      (n) =>
        `- ${n.clientName}: ${n.noteType} (Session: ${n.sessionDate}) - Submitted: ${n.submittedAt}`
    )
    .join('\n');

  const textBody = `
Hello ${data.supervisorName},

${data.clinicianName} has submitted ${data.noteCount} clinical note${data.noteCount > 1 ? 's' : ''} requiring your co-signature:

${notesList}

Please review and co-sign at your earliest convenience.

Review notes: ${data.reviewLink}

Thank you,
${data.practiceName}
`.trim();

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6B46C1 0%, #4A25AA 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .clinician-badge { background: #f3f4f6; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 8px 0; }
    .note-item { background: #faf5ff; border-left: 4px solid #6B46C1; padding: 12px; margin: 8px 0; border-radius: 0 4px 4px 0; }
    .client-name { font-weight: bold; color: #4A25AA; }
    .submitted-time { color: #6b7280; font-size: 14px; }
    .btn { display: inline-block; padding: 12px 24px; background: #6B46C1; color: white; border-radius: 6px; text-decoration: none; margin: 16px 0; }
    .footer { text-align: center; padding: 16px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">✍️ Co-Signature Required</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">${data.noteCount} note${data.noteCount > 1 ? 's' : ''} awaiting review</p>
    </div>
    <div class="content">
      <p>Hello ${data.supervisorName},</p>

      <div class="clinician-badge">From: ${data.clinicianName}</div>

      <p>The following clinical notes require your co-signature:</p>

      ${data.notes
        .map(
          (n) => `
        <div class="note-item">
          <div class="client-name">${n.clientName}</div>
          <div>${n.noteType} • Session: ${n.sessionDate}</div>
          <div class="submitted-time">Submitted: ${n.submittedAt}</div>
        </div>
      `
        )
        .join('')}

      <div style="text-align: center;">
        <a href="${data.reviewLink}" class="btn">Review & Co-Sign</a>
      </div>

      <p>Thank you,<br><strong>${data.practiceName}</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated notification. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
`.trim();

  const smsBody = `${data.practiceName}: ${data.noteCount} note${data.noteCount > 1 ? 's' : ''} from ${data.clinicianName} await${data.noteCount === 1 ? 's' : ''} your co-signature.`;

  return { subject, textBody, htmlBody, smsBody };
}

/**
 * Render daily digest notification
 */
export function renderNoteDailyDigest(
  data: NoteDailyDigestData
): RenderedTemplate {
  const totalPending =
    data.summary.dueTodayCount +
    data.summary.dueSoonCount +
    data.summary.overdueCount;

  const subject = `Daily Notes Summary - ${totalPending} Note${totalPending !== 1 ? 's' : ''} Need Attention`;

  const dueTodayList =
    data.dueTodayNotes.length > 0
      ? data.dueTodayNotes
          .map((n) => `  - ${n.clientName}: ${n.noteType} (${n.sessionDate})`)
          .join('\n')
      : '  None';

  const overdueList =
    data.overdueNotes.length > 0
      ? data.overdueNotes
          .map(
            (n) =>
              `  - ${n.clientName}: ${n.noteType} (${n.daysOverdue} days overdue)`
          )
          .join('\n')
      : '  None';

  const textBody = `
Good morning ${data.clinicianName},

Here's your daily clinical notes summary:

SUMMARY:
- Due Today: ${data.summary.dueTodayCount}
- Due Soon: ${data.summary.dueSoonCount}
- Overdue: ${data.summary.overdueCount}
- Pending Co-sign: ${data.summary.pendingCosignCount}

DUE TODAY:
${dueTodayList}

OVERDUE:
${overdueList}

View all notes: ${data.dashboardLink}

Have a great day!
${data.practiceName}
`.trim();

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 16px 0; }
    .stat-box { background: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center; }
    .stat-number { font-size: 32px; font-weight: bold; }
    .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
    .stat-due-today { border-left: 4px solid #f59e0b; }
    .stat-due-today .stat-number { color: #d97706; }
    .stat-overdue { border-left: 4px solid #dc2626; }
    .stat-overdue .stat-number { color: #dc2626; }
    .stat-due-soon { border-left: 4px solid #2563eb; }
    .stat-due-soon .stat-number { color: #2563eb; }
    .stat-cosign { border-left: 4px solid #6B46C1; }
    .stat-cosign .stat-number { color: #6B46C1; }
    .section-title { font-weight: bold; margin: 16px 0 8px 0; padding-bottom: 4px; border-bottom: 2px solid #e5e7eb; }
    .note-item { padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .btn { display: inline-block; padding: 12px 24px; background: #6B46C1; color: white; border-radius: 6px; text-decoration: none; margin: 16px 0; }
    .footer { text-align: center; padding: 16px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">📊 Daily Notes Summary</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">Good morning, ${data.clinicianName}</p>
    </div>
    <div class="content">
      <div class="stats-grid">
        <div class="stat-box stat-due-today">
          <div class="stat-number">${data.summary.dueTodayCount}</div>
          <div class="stat-label">Due Today</div>
        </div>
        <div class="stat-box stat-overdue">
          <div class="stat-number">${data.summary.overdueCount}</div>
          <div class="stat-label">Overdue</div>
        </div>
        <div class="stat-box stat-due-soon">
          <div class="stat-number">${data.summary.dueSoonCount}</div>
          <div class="stat-label">Due Soon</div>
        </div>
        <div class="stat-box stat-cosign">
          <div class="stat-number">${data.summary.pendingCosignCount}</div>
          <div class="stat-label">Pending Co-sign</div>
        </div>
      </div>

      ${
        data.dueTodayNotes.length > 0
          ? `
        <div class="section-title">📅 Due Today</div>
        ${data.dueTodayNotes.map((n) => `<div class="note-item">${n.clientName}: ${n.noteType} (${n.sessionDate})</div>`).join('')}
      `
          : ''
      }

      ${
        data.overdueNotes.length > 0
          ? `
        <div class="section-title" style="color: #dc2626;">⚠️ Overdue</div>
        ${data.overdueNotes.map((n) => `<div class="note-item" style="color: #dc2626;">${n.clientName}: ${n.noteType} (${n.daysOverdue} days overdue)</div>`).join('')}
      `
          : ''
      }

      <div style="text-align: center;">
        <a href="${data.dashboardLink}" class="btn">View Notes Dashboard</a>
      </div>

      <p>Have a great day!<br><strong>${data.practiceName}</strong></p>
    </div>
    <div class="footer">
      <p>This is your daily automated summary. Adjust notification preferences in settings.</p>
    </div>
  </div>
</body>
</html>
`.trim();

  // No SMS for daily digest - too much info

  return { subject, textBody, htmlBody };
}
