/**
 * Treatment Plan Notification Templates
 * Phase 5.x: Templates for treatment plan compliance notifications
 */

import { RenderedTemplate } from '../types';

export interface TreatmentPlanDueSoonData {
  clinicianName: string;
  clientCount: number;
  clients: Array<{
    clientName: string;
    daysUntilDue: number | null;
    lastPlanDate: string;
  }>;
  urgencyLevel: 'UPCOMING';
  dashboardLink: string;
  practiceName: string;
}

export interface TreatmentPlanOverdueData {
  clinicianName: string;
  clientCount: number;
  clients: Array<{
    clientName: string;
    daysOverdue: number | null;
    lastPlanDate: string;
  }>;
  urgencyLevel: 'WARNING' | 'CRITICAL' | 'URGENT';
  maxDaysOverdue: number;
  dashboardLink: string;
  complianceWarning: string;
  practiceName: string;
}

export interface TreatmentPlanSupervisorAlertData {
  supervisorName: string;
  totalOverdue: number;
  supervisees: Array<{
    clinicianName: string;
    overdueCount: number;
    clients: Array<{
      clientName: string;
      daysOverdue: number | null;
    }>;
  }>;
  dashboardLink: string;
  practiceName: string;
}

/**
 * Render treatment plan due soon notification
 */
export function renderTreatmentPlanDueSoon(data: TreatmentPlanDueSoonData): RenderedTemplate {
  const subject = `Treatment Plan Reminder: ${data.clientCount} Client${data.clientCount > 1 ? 's' : ''} Need Updated Plans`;

  const clientList = data.clients
    .map(
      (c) =>
        `- ${c.clientName}: Due in ${c.daysUntilDue} days (Last plan: ${c.lastPlanDate})`
    )
    .join('\n');

  const textBody = `
Hello ${data.clinicianName},

This is a reminder that ${data.clientCount} of your clients need updated treatment plans within the next 30 days:

${clientList}

Georgia Board requires treatment plans to be reviewed every 90 days. Please update these plans to maintain compliance.

View Treatment Plans: ${data.dashboardLink}

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
    .client-item { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; margin: 8px 0; border-radius: 0 4px 4px 0; }
    .client-name { font-weight: bold; color: #92400e; }
    .due-info { color: #b45309; font-size: 14px; }
    .compliance-note { background: #fef3c7; border: 1px solid #fcd34d; padding: 12px; border-radius: 6px; margin: 16px 0; font-size: 14px; }
    .btn { display: inline-block; padding: 12px 24px; background: #6B46C1; color: white; border-radius: 6px; text-decoration: none; margin: 16px 0; }
    .footer { text-align: center; padding: 16px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">📋 Treatment Plans Due Soon</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">${data.clientCount} client${data.clientCount > 1 ? 's' : ''} need updated treatment plans</p>
    </div>
    <div class="content">
      <p>Hello ${data.clinicianName},</p>
      <p>The following clients need updated treatment plans within the next 30 days:</p>

      ${data.clients
        .map(
          (c) => `
        <div class="client-item">
          <div class="client-name">${c.clientName}</div>
          <div class="due-info">Due in ${c.daysUntilDue} days • Last plan: ${c.lastPlanDate}</div>
        </div>
      `
        )
        .join('')}

      <div class="compliance-note">
        <strong>📌 Compliance Reminder:</strong> Georgia Board requires treatment plans to be reviewed every 90 days. Updating these plans will ensure continued compliance and quality care documentation.
      </div>

      <div style="text-align: center;">
        <a href="${data.dashboardLink}" class="btn">Update Treatment Plans</a>
      </div>

      <p>Thank you,<br><strong>${data.practiceName}</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated reminder. You will receive weekly reminders until plans are updated.</p>
    </div>
  </div>
</body>
</html>
`.trim();

  const smsBody = `${data.practiceName}: ${data.clientCount} client${data.clientCount > 1 ? 's' : ''} need treatment plan updates within 30 days. Please review.`;

  return { subject, textBody, htmlBody, smsBody };
}

/**
 * Render treatment plan overdue notification
 */
export function renderTreatmentPlanOverdue(data: TreatmentPlanOverdueData): RenderedTemplate {
  const urgencyEmoji =
    data.urgencyLevel === 'URGENT'
      ? '🚨'
      : data.urgencyLevel === 'CRITICAL'
        ? '⚠️'
        : '⏰';

  const subject = `${urgencyEmoji} ${data.urgencyLevel}: ${data.clientCount} Overdue Treatment Plan${data.clientCount > 1 ? 's' : ''}`;

  const clientList = data.clients
    .map(
      (c) =>
        `- ${c.clientName}: ${c.daysOverdue} days overdue (Last plan: ${c.lastPlanDate})`
    )
    .join('\n');

  const textBody = `
Hello ${data.clinicianName},

URGENT: ${data.clientCount} of your clients have OVERDUE treatment plans:

${clientList}

${data.complianceWarning}

IMPORTANT: Clinical notes cannot be created for clients with overdue treatment plans until their plans are updated.

Please update these treatment plans immediately: ${data.dashboardLink}

Thank you,
${data.practiceName}
`.trim();

  const bgColor =
    data.urgencyLevel === 'URGENT'
      ? '#dc2626'
      : data.urgencyLevel === 'CRITICAL'
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
    .client-item { background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 8px 0; border-radius: 0 4px 4px 0; }
    .client-name { font-weight: bold; color: #991b1b; }
    .overdue-info { color: #dc2626; font-size: 14px; font-weight: bold; }
    .warning-box { background: #fef2f2; border: 2px solid #dc2626; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .warning-title { color: #dc2626; font-weight: bold; margin-bottom: 8px; }
    .blocking-notice { background: #1f2937; color: white; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .btn { display: inline-block; padding: 14px 28px; background: #dc2626; color: white; border-radius: 6px; text-decoration: none; margin: 16px 0; font-weight: bold; }
    .footer { text-align: center; padding: 16px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">${urgencyEmoji} Overdue Treatment Plans - ${data.urgencyLevel}</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">${data.clientCount} client${data.clientCount > 1 ? 's' : ''} • Up to ${data.maxDaysOverdue} days overdue</p>
    </div>
    <div class="content">
      <p>Hello ${data.clinicianName},</p>
      <p>The following clients have <strong>OVERDUE</strong> treatment plans requiring immediate attention:</p>

      ${data.clients
        .map(
          (c) => `
        <div class="client-item">
          <div class="client-name">${c.clientName}</div>
          <div class="overdue-info">${c.daysOverdue} days overdue • Last plan: ${c.lastPlanDate}</div>
        </div>
      `
        )
        .join('')}

      <div class="warning-box">
        <div class="warning-title">⚠️ Compliance Warning</div>
        <p style="margin: 0;">${data.complianceWarning}</p>
      </div>

      <div class="blocking-notice">
        <strong>🚫 Note Creation Blocked</strong><br>
        Clinical notes cannot be created for clients with overdue treatment plans until their plans are updated.
      </div>

      <div style="text-align: center;">
        <a href="${data.dashboardLink}" class="btn">Update Treatment Plans Now</a>
      </div>

      <p>Thank you,<br><strong>${data.practiceName}</strong></p>
    </div>
    <div class="footer">
      <p>This is an urgent automated reminder. Please complete these treatment plans immediately.</p>
    </div>
  </div>
</body>
</html>
`.trim();

  const smsBody = `${data.practiceName}: URGENT - ${data.clientCount} treatment plan${data.clientCount > 1 ? 's' : ''} overdue. Notes blocked until updated. Immediate action required.`;

  return { subject, textBody, htmlBody, smsBody };
}

/**
 * Render supervisor alert for overdue treatment plans
 */
export function renderTreatmentPlanSupervisorAlert(
  data: TreatmentPlanSupervisorAlertData
): RenderedTemplate {
  const subject = `🔔 Supervisor Alert: ${data.totalOverdue} Overdue Treatment Plan${data.totalOverdue > 1 ? 's' : ''} Under Your Supervision`;

  const superviseeList = data.supervisees
    .map((s) => {
      const clientList = s.clients
        .map((c) => `    - ${c.clientName}: ${c.daysOverdue} days overdue`)
        .join('\n');
      return `${s.clinicianName} (${s.overdueCount} overdue):\n${clientList}`;
    })
    .join('\n\n');

  const textBody = `
Hello ${data.supervisorName},

This is a supervisor alert regarding overdue treatment plans under your supervision.

TOTAL OVERDUE: ${data.totalOverdue} treatment plans

${superviseeList}

Please follow up with your supervisees to ensure these treatment plans are updated promptly.

View Compliance Dashboard: ${data.dashboardLink}

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
    .header { background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .stat-box { background: #fef2f2; border: 2px solid #dc2626; padding: 16px; border-radius: 8px; text-align: center; margin: 16px 0; }
    .stat-number { font-size: 36px; font-weight: bold; color: #dc2626; }
    .stat-label { color: #991b1b; }
    .supervisee-section { background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .supervisee-name { font-weight: bold; color: #374151; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px; }
    .client-item { padding: 6px 0; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; }
    .client-name { color: #374151; }
    .overdue-badge { background: #fef2f2; color: #dc2626; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; }
    .btn { display: inline-block; padding: 12px 24px; background: #6B46C1; color: white; border-radius: 6px; text-decoration: none; margin: 16px 0; }
    .footer { text-align: center; padding: 16px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">🔔 Supervisor Compliance Alert</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">Overdue treatment plans under your supervision</p>
    </div>
    <div class="content">
      <p>Hello ${data.supervisorName},</p>

      <div class="stat-box">
        <div class="stat-number">${data.totalOverdue}</div>
        <div class="stat-label">Total Overdue Treatment Plans</div>
      </div>

      ${data.supervisees
        .map(
          (s) => `
        <div class="supervisee-section">
          <div class="supervisee-name">👤 ${s.clinicianName} <span style="color: #dc2626;">(${s.overdueCount} overdue)</span></div>
          ${s.clients
            .map(
              (c) => `
            <div class="client-item">
              <span class="client-name">${c.clientName}</span>
              <span class="overdue-badge">${c.daysOverdue} days</span>
            </div>
          `
            )
            .join('')}
        </div>
      `
        )
        .join('')}

      <p style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 14px;">
        <strong>Note:</strong> Clinical notes are blocked for clients with overdue treatment plans. Please follow up with your supervisees to ensure compliance.
      </p>

      <div style="text-align: center;">
        <a href="${data.dashboardLink}" class="btn">View Compliance Dashboard</a>
      </div>

      <p>Thank you,<br><strong>${data.practiceName}</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated supervisor alert for treatment plan compliance.</p>
    </div>
  </div>
</body>
</html>
`.trim();

  const smsBody = `${data.practiceName}: Supervisor Alert - ${data.totalOverdue} overdue treatment plan${data.totalOverdue > 1 ? 's' : ''} under your supervision. Please review.`;

  return { subject, textBody, htmlBody, smsBody };
}
