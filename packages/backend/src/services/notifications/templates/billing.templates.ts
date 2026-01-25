/**
 * Billing Notification Templates
 * Phase 3.1: Templates for billing-related notifications
 */

import { RenderedTemplate } from '../types';

export interface ClaimSubmittedData {
  clientName: string;
  claimNumber: string;
  serviceDate: string;
  amount: string;
  insuranceCompany: string;
  submittedDate: string;
  practiceName: string;
}

export interface ClaimDeniedData {
  clientName: string;
  claimNumber: string;
  serviceDate: string;
  amount: string;
  insuranceCompany: string;
  denialReason: string;
  denialCode?: string;
  appealDeadline?: string;
  billingDashboardLink: string;
  practiceName: string;
}

export interface PaymentReceivedData {
  clientName: string;
  paymentAmount: string;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber?: string;
  remainingBalance: string;
  receiptLink?: string;
  practiceName: string;
}

export interface StatementReadyData {
  clientName: string;
  statementDate: string;
  totalDue: string;
  dueDate: string;
  viewStatementLink: string;
  paymentLink: string;
  practiceName: string;
  practicePhone?: string;
}

export interface PaymentReminderData {
  clientName: string;
  amountDue: string;
  dueDate: string;
  daysPastDue?: number;
  statementDate?: string;
  paymentLink: string;
  practiceName: string;
  practicePhone?: string;
}

/**
 * Render claim submitted notification (for billing staff)
 */
export function renderClaimSubmitted(data: ClaimSubmittedData): RenderedTemplate {
  const subject = `Claim Submitted - ${data.clientName} (${data.claimNumber})`;

  const textBody = `
Claim Submission Confirmation

Client: ${data.clientName}
Claim Number: ${data.claimNumber}
Service Date: ${data.serviceDate}
Amount: ${data.amount}
Insurance: ${data.insuranceCompany}
Submitted: ${data.submittedDate}

The claim has been successfully submitted for processing.

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
    .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .claim-box { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-row:last-child { border-bottom: none; }
    .label { color: #6b7280; }
    .value { font-weight: 500; }
    .footer { text-align: center; padding: 16px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">✓ Claim Submitted</h1>
    </div>
    <div class="content">
      <div class="claim-box">
        <div class="detail-row">
          <span class="label">Client</span>
          <span class="value">${data.clientName}</span>
        </div>
        <div class="detail-row">
          <span class="label">Claim Number</span>
          <span class="value">${data.claimNumber}</span>
        </div>
        <div class="detail-row">
          <span class="label">Service Date</span>
          <span class="value">${data.serviceDate}</span>
        </div>
        <div class="detail-row">
          <span class="label">Amount</span>
          <span class="value">${data.amount}</span>
        </div>
        <div class="detail-row">
          <span class="label">Insurance</span>
          <span class="value">${data.insuranceCompany}</span>
        </div>
        <div class="detail-row">
          <span class="label">Submitted</span>
          <span class="value">${data.submittedDate}</span>
        </div>
      </div>

      <p style="color: #059669; font-weight: 500;">The claim has been successfully submitted for processing.</p>

      <p>${data.practiceName}</p>
    </div>
    <div class="footer">
      <p>This is an automated billing notification.</p>
    </div>
  </div>
</body>
</html>
`.trim();

  return { subject, textBody, htmlBody };
}

/**
 * Render claim denied notification (for billing staff)
 */
export function renderClaimDenied(data: ClaimDeniedData): RenderedTemplate {
  const subject = `⚠️ Claim Denied - ${data.clientName} (${data.claimNumber})`;

  const textBody = `
CLAIM DENIAL NOTICE

Client: ${data.clientName}
Claim Number: ${data.claimNumber}
Service Date: ${data.serviceDate}
Amount: ${data.amount}
Insurance: ${data.insuranceCompany}

DENIAL REASON: ${data.denialReason}
${data.denialCode ? `Denial Code: ${data.denialCode}` : ''}
${data.appealDeadline ? `Appeal Deadline: ${data.appealDeadline}` : ''}

Please review this claim and take appropriate action.

View in billing dashboard: ${data.billingDashboardLink}

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
    .header { background: #dc2626; color: white; padding: 24px; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .claim-box { background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .denial-box { background: #fef2f2; border: 2px solid #fecaca; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-row:last-child { border-bottom: none; }
    .label { color: #6b7280; }
    .value { font-weight: 500; }
    .denial-reason { color: #dc2626; font-weight: bold; }
    .btn { display: inline-block; padding: 12px 24px; background: #6B46C1; color: white; border-radius: 6px; text-decoration: none; margin: 16px 0; }
    .footer { text-align: center; padding: 16px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">⚠️ Claim Denied</h1>
    </div>
    <div class="content">
      <div class="claim-box">
        <div class="detail-row">
          <span class="label">Client</span>
          <span class="value">${data.clientName}</span>
        </div>
        <div class="detail-row">
          <span class="label">Claim Number</span>
          <span class="value">${data.claimNumber}</span>
        </div>
        <div class="detail-row">
          <span class="label">Service Date</span>
          <span class="value">${data.serviceDate}</span>
        </div>
        <div class="detail-row">
          <span class="label">Amount</span>
          <span class="value">${data.amount}</span>
        </div>
        <div class="detail-row">
          <span class="label">Insurance</span>
          <span class="value">${data.insuranceCompany}</span>
        </div>
      </div>

      <div class="denial-box">
        <div class="denial-reason">Denial Reason:</div>
        <p style="margin: 8px 0;">${data.denialReason}</p>
        ${data.denialCode ? `<p style="margin: 4px 0; color: #6b7280;">Code: ${data.denialCode}</p>` : ''}
        ${data.appealDeadline ? `<p style="margin: 8px 0; font-weight: bold;">Appeal Deadline: ${data.appealDeadline}</p>` : ''}
      </div>

      <div style="text-align: center;">
        <a href="${data.billingDashboardLink}" class="btn">Review in Billing Dashboard</a>
      </div>

      <p>${data.practiceName}</p>
    </div>
    <div class="footer">
      <p>This is an automated billing notification. Please take action promptly.</p>
    </div>
  </div>
</body>
</html>
`.trim();

  return { subject, textBody, htmlBody };
}

/**
 * Render payment received notification (for clients)
 */
export function renderPaymentReceived(data: PaymentReceivedData): RenderedTemplate {
  const subject = `Payment Received - Thank You!`;

  const textBody = `
Hello ${data.clientName},

Thank you for your payment!

Payment Details:
Amount: ${data.paymentAmount}
Date: ${data.paymentDate}
Method: ${data.paymentMethod}
${data.referenceNumber ? `Reference: ${data.referenceNumber}` : ''}

Remaining Balance: ${data.remainingBalance}

${data.receiptLink ? `View your receipt: ${data.receiptLink}` : ''}

Thank you for your prompt payment.

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
    .checkmark { font-size: 48px; margin-bottom: 8px; }
    .content { background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .payment-box { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center; }
    .amount { font-size: 32px; font-weight: bold; color: #059669; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-row:last-child { border-bottom: none; }
    .label { color: #6b7280; }
    .value { font-weight: 500; }
    .balance-box { background: #f3f4f6; padding: 12px; border-radius: 8px; margin: 16px 0; text-align: center; }
    .btn { display: inline-block; padding: 12px 24px; background: #6B46C1; color: white; border-radius: 6px; text-decoration: none; margin: 16px 0; }
    .footer { text-align: center; padding: 16px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="checkmark">✓</div>
      <h1 style="margin: 0; font-size: 24px;">Payment Received</h1>
    </div>
    <div class="content">
      <p>Hello ${data.clientName},</p>
      <p>Thank you for your payment!</p>

      <div class="payment-box">
        <div class="amount">${data.paymentAmount}</div>
        <div style="color: #6b7280;">Payment received on ${data.paymentDate}</div>
      </div>

      <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <div class="detail-row">
          <span class="label">Payment Method</span>
          <span class="value">${data.paymentMethod}</span>
        </div>
        ${
          data.referenceNumber
            ? `
        <div class="detail-row">
          <span class="label">Reference Number</span>
          <span class="value">${data.referenceNumber}</span>
        </div>
        `
            : ''
        }
      </div>

      <div class="balance-box">
        <span class="label">Remaining Balance: </span>
        <span class="value">${data.remainingBalance}</span>
      </div>

      ${
        data.receiptLink
          ? `
      <div style="text-align: center;">
        <a href="${data.receiptLink}" class="btn">View Receipt</a>
      </div>
      `
          : ''
      }

      <p>Thank you for your prompt payment.</p>
      <p><strong>${data.practiceName}</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated payment confirmation.</p>
    </div>
  </div>
</body>
</html>
`.trim();

  const smsBody = `${data.practiceName}: Payment of ${data.paymentAmount} received. Thank you! Remaining balance: ${data.remainingBalance}`;

  return { subject, textBody, htmlBody, smsBody };
}

/**
 * Render statement ready notification (for clients)
 */
export function renderStatementReady(data: StatementReadyData): RenderedTemplate {
  const subject = `Your Statement is Ready - ${data.practiceName}`;

  const textBody = `
Hello ${data.clientName},

Your statement from ${data.practiceName} is now available.

Statement Date: ${data.statementDate}
Amount Due: ${data.totalDue}
Due Date: ${data.dueDate}

View your statement: ${data.viewStatementLink}
Make a payment: ${data.paymentLink}

If you have questions about your statement, please contact us${data.practicePhone ? ` at ${data.practicePhone}` : ''}.

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
    .statement-box { background: #faf5ff; border: 1px solid #e9d5ff; padding: 20px; border-radius: 8px; margin: 16px 0; text-align: center; }
    .amount { font-size: 32px; font-weight: bold; color: #6B46C1; }
    .due-date { color: #6b7280; margin-top: 8px; }
    .btn-group { text-align: center; margin: 24px 0; }
    .btn { display: inline-block; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 4px; }
    .btn-primary { background: #6B46C1; color: white; }
    .btn-secondary { background: #e5e7eb; color: #374151; }
    .footer { text-align: center; padding: 16px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">📄 Your Statement is Ready</h1>
    </div>
    <div class="content">
      <p>Hello ${data.clientName},</p>
      <p>Your statement from ${data.practiceName} is now available.</p>

      <div class="statement-box">
        <div style="color: #6b7280; font-size: 14px;">Amount Due</div>
        <div class="amount">${data.totalDue}</div>
        <div class="due-date">Due by ${data.dueDate}</div>
      </div>

      <div class="btn-group">
        <a href="${data.viewStatementLink}" class="btn btn-secondary">View Statement</a>
        <a href="${data.paymentLink}" class="btn btn-primary">Make Payment</a>
      </div>

      <p style="font-size: 14px; color: #6b7280;">If you have questions about your statement, please contact us${data.practicePhone ? ` at ${data.practicePhone}` : ''}.</p>

      <p>Thank you,<br><strong>${data.practiceName}</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated billing notification.</p>
    </div>
  </div>
</body>
</html>
`.trim();

  const smsBody = `${data.practiceName}: Your statement is ready. Amount due: ${data.totalDue} by ${data.dueDate}. View at ${data.viewStatementLink}`;

  return { subject, textBody, htmlBody, smsBody };
}

/**
 * Render payment reminder notification (for clients)
 */
export function renderPaymentReminder(data: PaymentReminderData): RenderedTemplate {
  const isOverdue = data.daysPastDue && data.daysPastDue > 0;
  const urgencyPrefix = isOverdue ? '⚠️ ' : '';

  const subject = `${urgencyPrefix}Payment Reminder - ${data.amountDue} Due${isOverdue ? ` (${data.daysPastDue} days past due)` : ''}`;

  const textBody = `
Hello ${data.clientName},

This is a ${isOverdue ? 'past due notice' : 'friendly reminder'} regarding your account with ${data.practiceName}.

Amount Due: ${data.amountDue}
${isOverdue ? `Days Past Due: ${data.daysPastDue}` : `Due Date: ${data.dueDate}`}

Please make your payment at your earliest convenience: ${data.paymentLink}

If you have already submitted payment, please disregard this notice.

Questions? Contact us${data.practicePhone ? ` at ${data.practicePhone}` : ''}.

Thank you,
${data.practiceName}
`.trim();

  const headerColor = isOverdue ? '#dc2626' : '#f59e0b';

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${headerColor}; color: white; padding: 24px; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .amount-box { background: ${isOverdue ? '#fef2f2' : '#fffbeb'}; border: 1px solid ${isOverdue ? '#fecaca' : '#fde68a'}; padding: 20px; border-radius: 8px; margin: 16px 0; text-align: center; }
    .amount { font-size: 32px; font-weight: bold; color: ${headerColor}; }
    .status { color: #6b7280; margin-top: 8px; }
    ${isOverdue ? '.past-due { color: #dc2626; font-weight: bold; }' : ''}
    .btn { display: inline-block; padding: 14px 28px; background: #6B46C1; color: white; border-radius: 6px; text-decoration: none; margin: 16px 0; font-weight: 500; }
    .note { font-size: 14px; color: #6b7280; font-style: italic; }
    .footer { text-align: center; padding: 16px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">${isOverdue ? '⚠️ Past Due Notice' : '💳 Payment Reminder'}</h1>
    </div>
    <div class="content">
      <p>Hello ${data.clientName},</p>
      <p>This is a ${isOverdue ? 'past due notice' : 'friendly reminder'} regarding your account with ${data.practiceName}.</p>

      <div class="amount-box">
        <div style="color: #6b7280; font-size: 14px;">Amount Due</div>
        <div class="amount">${data.amountDue}</div>
        ${
          isOverdue
            ? `<div class="past-due">${data.daysPastDue} days past due</div>`
            : `<div class="status">Due by ${data.dueDate}</div>`
        }
      </div>

      <div style="text-align: center;">
        <a href="${data.paymentLink}" class="btn">Make Payment</a>
      </div>

      <p class="note">If you have already submitted payment, please disregard this notice.</p>

      <p>Questions? Contact us${data.practicePhone ? ` at ${data.practicePhone}` : ''}.</p>

      <p>Thank you,<br><strong>${data.practiceName}</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated payment reminder.</p>
    </div>
  </div>
</body>
</html>
`.trim();

  const smsBody = isOverdue
    ? `${data.practiceName}: PAST DUE - ${data.amountDue} is ${data.daysPastDue} days overdue. Pay now: ${data.paymentLink}`
    : `${data.practiceName}: Payment reminder - ${data.amountDue} due ${data.dueDate}. Pay at: ${data.paymentLink}`;

  return { subject, textBody, htmlBody, smsBody };
}
