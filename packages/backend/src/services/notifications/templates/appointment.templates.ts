/**
 * Appointment Notification Templates
 * Phase 3.1: Templates for appointment-related notifications
 */

import { RenderedTemplate } from '../types';

export interface AppointmentReminderData {
  clientName: string;
  clinicianName: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  locationType: 'IN_PERSON' | 'TELEHEALTH' | 'PHONE';
  locationDetails?: string;
  telehealthLink?: string;
  confirmationLink?: string;
  cancelLink?: string;
  practiceName: string;
  practicePhone?: string;
}

export interface AppointmentConfirmationData extends AppointmentReminderData {
  confirmedAt: string;
}

export interface AppointmentCancelledData {
  clientName: string;
  clinicianName: string;
  originalDate: string;
  originalTime: string;
  reason?: string;
  rescheduleLink?: string;
  practiceName: string;
  practicePhone?: string;
}

export interface AppointmentRescheduledData {
  clientName: string;
  clinicianName: string;
  originalDate: string;
  originalTime: string;
  newDate: string;
  newTime: string;
  locationType: 'IN_PERSON' | 'TELEHEALTH' | 'PHONE';
  locationDetails?: string;
  telehealthLink?: string;
  confirmationLink?: string;
  practiceName: string;
  practicePhone?: string;
}

/**
 * Render appointment reminder template
 */
export function renderAppointmentReminder(
  data: AppointmentReminderData
): RenderedTemplate {
  const locationText = getLocationText(data.locationType, data.locationDetails);

  const subject = `Appointment Reminder - ${data.appointmentDate} at ${data.appointmentTime}`;

  const textBody = `
Hello ${data.clientName},

This is a reminder of your upcoming appointment:

Date: ${data.appointmentDate}
Time: ${data.appointmentTime}
Duration: ${data.duration} minutes
Provider: ${data.clinicianName}
Location: ${locationText}
${data.telehealthLink ? `\nTelehealth Link: ${data.telehealthLink}` : ''}

${data.confirmationLink ? `To confirm your appointment, click here: ${data.confirmationLink}` : ''}
${data.cancelLink ? `If you need to cancel or reschedule, click here: ${data.cancelLink}` : ''}

If you have any questions, please contact us at ${data.practicePhone || 'our office'}.

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
    .appointment-box { background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .detail-row { margin: 8px 0; }
    .label { font-weight: bold; color: #6B46C1; }
    .btn { display: inline-block; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 8px 4px 8px 0; font-weight: 500; }
    .btn-primary { background: #6B46C1; color: white; }
    .btn-secondary { background: #e5e7eb; color: #374151; }
    .footer { text-align: center; padding: 16px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">📅 Appointment Reminder</h1>
    </div>
    <div class="content">
      <p>Hello ${data.clientName},</p>
      <p>This is a reminder of your upcoming appointment:</p>

      <div class="appointment-box">
        <div class="detail-row"><span class="label">Date:</span> ${data.appointmentDate}</div>
        <div class="detail-row"><span class="label">Time:</span> ${data.appointmentTime}</div>
        <div class="detail-row"><span class="label">Duration:</span> ${data.duration} minutes</div>
        <div class="detail-row"><span class="label">Provider:</span> ${data.clinicianName}</div>
        <div class="detail-row"><span class="label">Location:</span> ${locationText}</div>
        ${data.telehealthLink ? `<div class="detail-row"><span class="label">Telehealth Link:</span> <a href="${data.telehealthLink}">${data.telehealthLink}</a></div>` : ''}
      </div>

      <div style="text-align: center; margin: 24px 0;">
        ${data.confirmationLink ? `<a href="${data.confirmationLink}" class="btn btn-primary">Confirm Appointment</a>` : ''}
        ${data.cancelLink ? `<a href="${data.cancelLink}" class="btn btn-secondary">Reschedule/Cancel</a>` : ''}
      </div>

      <p>If you have any questions, please contact us${data.practicePhone ? ` at ${data.practicePhone}` : ''}.</p>

      <p>Thank you,<br><strong>${data.practiceName}</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated reminder. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
`.trim();

  const smsBody = `${data.practiceName}: Reminder - Appt with ${data.clinicianName} on ${data.appointmentDate} at ${data.appointmentTime}. ${data.locationType === 'TELEHEALTH' ? 'Telehealth session.' : ''} Reply CONFIRM or call ${data.practicePhone || 'our office'}.`;

  return { subject, textBody, htmlBody, smsBody };
}

/**
 * Render appointment confirmation template
 */
export function renderAppointmentConfirmation(
  data: AppointmentConfirmationData
): RenderedTemplate {
  const locationText = getLocationText(data.locationType, data.locationDetails);

  const subject = `Appointment Confirmed - ${data.appointmentDate} at ${data.appointmentTime}`;

  const textBody = `
Hello ${data.clientName},

Your appointment has been confirmed!

Date: ${data.appointmentDate}
Time: ${data.appointmentTime}
Duration: ${data.duration} minutes
Provider: ${data.clinicianName}
Location: ${locationText}
${data.telehealthLink ? `\nTelehealth Link: ${data.telehealthLink}` : ''}

We look forward to seeing you!

If you need to make changes, please contact us at ${data.practicePhone || 'our office'}.

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
    .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .appointment-box { background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .detail-row { margin: 8px 0; }
    .label { font-weight: bold; color: #059669; }
    .checkmark { font-size: 48px; margin-bottom: 8px; }
    .footer { text-align: center; padding: 16px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="checkmark">✓</div>
      <h1 style="margin: 0; font-size: 24px;">Appointment Confirmed!</h1>
    </div>
    <div class="content">
      <p>Hello ${data.clientName},</p>
      <p>Your appointment has been confirmed.</p>

      <div class="appointment-box">
        <div class="detail-row"><span class="label">Date:</span> ${data.appointmentDate}</div>
        <div class="detail-row"><span class="label">Time:</span> ${data.appointmentTime}</div>
        <div class="detail-row"><span class="label">Duration:</span> ${data.duration} minutes</div>
        <div class="detail-row"><span class="label">Provider:</span> ${data.clinicianName}</div>
        <div class="detail-row"><span class="label">Location:</span> ${locationText}</div>
        ${data.telehealthLink ? `<div class="detail-row"><span class="label">Telehealth Link:</span> <a href="${data.telehealthLink}">${data.telehealthLink}</a></div>` : ''}
      </div>

      <p>We look forward to seeing you!</p>

      <p>If you need to make changes, please contact us${data.practicePhone ? ` at ${data.practicePhone}` : ''}.</p>

      <p>Thank you,<br><strong>${data.practiceName}</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated confirmation. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
`.trim();

  const smsBody = `${data.practiceName}: Confirmed! Appt with ${data.clinicianName} on ${data.appointmentDate} at ${data.appointmentTime}. See you then!`;

  return { subject, textBody, htmlBody, smsBody };
}

/**
 * Render appointment cancelled template
 */
export function renderAppointmentCancelled(
  data: AppointmentCancelledData
): RenderedTemplate {
  const subject = `Appointment Cancelled - ${data.originalDate}`;

  const textBody = `
Hello ${data.clientName},

Your appointment has been cancelled.

Original Date: ${data.originalDate}
Original Time: ${data.originalTime}
Provider: ${data.clinicianName}
${data.reason ? `\nReason: ${data.reason}` : ''}

${data.rescheduleLink ? `To schedule a new appointment, visit: ${data.rescheduleLink}` : 'Please contact us to reschedule if needed.'}

If you have any questions, please contact us at ${data.practicePhone || 'our office'}.

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
    .header { background: #ef4444; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .cancelled-box { background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .detail-row { margin: 8px 0; }
    .label { font-weight: bold; color: #dc2626; }
    .btn { display: inline-block; padding: 12px 24px; background: #6B46C1; color: white; border-radius: 6px; text-decoration: none; margin: 16px 0; }
    .footer { text-align: center; padding: 16px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">Appointment Cancelled</h1>
    </div>
    <div class="content">
      <p>Hello ${data.clientName},</p>
      <p>Your appointment has been cancelled.</p>

      <div class="cancelled-box">
        <div class="detail-row"><span class="label">Original Date:</span> ${data.originalDate}</div>
        <div class="detail-row"><span class="label">Original Time:</span> ${data.originalTime}</div>
        <div class="detail-row"><span class="label">Provider:</span> ${data.clinicianName}</div>
        ${data.reason ? `<div class="detail-row"><span class="label">Reason:</span> ${data.reason}</div>` : ''}
      </div>

      ${data.rescheduleLink ? `<div style="text-align: center;"><a href="${data.rescheduleLink}" class="btn">Schedule New Appointment</a></div>` : '<p>Please contact us to reschedule if needed.</p>'}

      <p>If you have any questions, please contact us${data.practicePhone ? ` at ${data.practicePhone}` : ''}.</p>

      <p>Thank you,<br><strong>${data.practiceName}</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
`.trim();

  const smsBody = `${data.practiceName}: Your appt on ${data.originalDate} at ${data.originalTime} has been cancelled. Contact us to reschedule.`;

  return { subject, textBody, htmlBody, smsBody };
}

/**
 * Render appointment rescheduled template
 */
export function renderAppointmentRescheduled(
  data: AppointmentRescheduledData
): RenderedTemplate {
  const locationText = getLocationText(data.locationType, data.locationDetails);

  const subject = `Appointment Rescheduled - New Time: ${data.newDate} at ${data.newTime}`;

  const textBody = `
Hello ${data.clientName},

Your appointment has been rescheduled.

ORIGINAL:
Date: ${data.originalDate}
Time: ${data.originalTime}

NEW:
Date: ${data.newDate}
Time: ${data.newTime}
Provider: ${data.clinicianName}
Location: ${locationText}
${data.telehealthLink ? `Telehealth Link: ${data.telehealthLink}` : ''}

${data.confirmationLink ? `To confirm your new appointment time, visit: ${data.confirmationLink}` : ''}

If you have any questions, please contact us at ${data.practicePhone || 'our office'}.

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
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .times-container { display: flex; gap: 16px; margin: 16px 0; }
    .time-box { flex: 1; padding: 16px; border-radius: 8px; }
    .old-time { background: #f3f4f6; text-decoration: line-through; opacity: 0.7; }
    .new-time { background: #ecfdf5; border: 2px solid #10b981; }
    .detail-row { margin: 8px 0; }
    .label { font-weight: bold; }
    .btn { display: inline-block; padding: 12px 24px; background: #6B46C1; color: white; border-radius: 6px; text-decoration: none; margin: 16px 0; }
    .footer { text-align: center; padding: 16px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">🔄 Appointment Rescheduled</h1>
    </div>
    <div class="content">
      <p>Hello ${data.clientName},</p>
      <p>Your appointment has been rescheduled to a new time.</p>

      <div style="display: flex; gap: 16px; margin: 16px 0;">
        <div class="time-box old-time">
          <strong>Original</strong>
          <div class="detail-row">${data.originalDate}</div>
          <div class="detail-row">${data.originalTime}</div>
        </div>
        <div style="display: flex; align-items: center; font-size: 24px;">→</div>
        <div class="time-box new-time">
          <strong>New Time</strong>
          <div class="detail-row">${data.newDate}</div>
          <div class="detail-row">${data.newTime}</div>
        </div>
      </div>

      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <div class="detail-row"><span class="label">Provider:</span> ${data.clinicianName}</div>
        <div class="detail-row"><span class="label">Location:</span> ${locationText}</div>
        ${data.telehealthLink ? `<div class="detail-row"><span class="label">Telehealth Link:</span> <a href="${data.telehealthLink}">${data.telehealthLink}</a></div>` : ''}
      </div>

      ${data.confirmationLink ? `<div style="text-align: center;"><a href="${data.confirmationLink}" class="btn">Confirm New Time</a></div>` : ''}

      <p>If you have any questions, please contact us${data.practicePhone ? ` at ${data.practicePhone}` : ''}.</p>

      <p>Thank you,<br><strong>${data.practiceName}</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
`.trim();

  const smsBody = `${data.practiceName}: Appt RESCHEDULED from ${data.originalDate} to ${data.newDate} at ${data.newTime} with ${data.clinicianName}. Reply CONFIRM or call to discuss.`;

  return { subject, textBody, htmlBody, smsBody };
}

/**
 * Helper to get location display text
 */
function getLocationText(
  locationType: 'IN_PERSON' | 'TELEHEALTH' | 'PHONE',
  locationDetails?: string
): string {
  switch (locationType) {
    case 'TELEHEALTH':
      return 'Telehealth (Video Session)';
    case 'PHONE':
      return 'Phone Session';
    case 'IN_PERSON':
    default:
      return locationDetails || 'In-Person at Office';
  }
}
