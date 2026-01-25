/**
 * Notification Templates
 * Phase 3.1: Export all notification template renderers
 */

// Appointment templates
export {
  renderAppointmentReminder,
  renderAppointmentConfirmation,
  renderAppointmentCancelled,
  renderAppointmentRescheduled,
  type AppointmentReminderData,
  type AppointmentConfirmationData,
  type AppointmentCancelledData,
  type AppointmentRescheduledData,
} from './appointment.templates';

// Clinical note templates
export {
  renderNoteDueSoon,
  renderNoteOverdue,
  renderNotePendingCosign,
  renderNoteDailyDigest,
  type NoteDueSoonData,
  type NoteOverdueData,
  type NotePendingCosignData,
  type NoteDailyDigestData,
} from './clinical.templates';

// Billing templates
export {
  renderClaimSubmitted,
  renderClaimDenied,
  renderPaymentReceived,
  renderStatementReady,
  renderPaymentReminder,
  type ClaimSubmittedData,
  type ClaimDeniedData,
  type PaymentReceivedData,
  type StatementReadyData,
  type PaymentReminderData,
} from './billing.templates';

// Treatment Plan templates
export {
  renderTreatmentPlanDueSoon,
  renderTreatmentPlanOverdue,
  renderTreatmentPlanSupervisorAlert,
  type TreatmentPlanDueSoonData,
  type TreatmentPlanOverdueData,
  type TreatmentPlanSupervisorAlertData,
} from './treatmentPlan.templates';

import {
  NotificationType,
  RenderedTemplate,
  TemplateRenderer,
} from '../types';

import * as appointmentTemplates from './appointment.templates';
import * as clinicalTemplates from './clinical.templates';
import * as billingTemplates from './billing.templates';
import * as treatmentPlanTemplates from './treatmentPlan.templates';

/**
 * Unified template renderer that routes to the appropriate template based on type
 */
export class UnifiedTemplateRenderer implements TemplateRenderer {
  async render(
    type: NotificationType,
    data: Record<string, unknown>
  ): Promise<RenderedTemplate> {
    switch (type) {
      // Appointment notifications
      case 'APPOINTMENT_REMINDER':
        return appointmentTemplates.renderAppointmentReminder(
          data as unknown as appointmentTemplates.AppointmentReminderData
        );
      case 'APPOINTMENT_CONFIRMATION':
        return appointmentTemplates.renderAppointmentConfirmation(
          data as unknown as appointmentTemplates.AppointmentConfirmationData
        );
      case 'APPOINTMENT_CANCELLED':
        return appointmentTemplates.renderAppointmentCancelled(
          data as unknown as appointmentTemplates.AppointmentCancelledData
        );
      case 'APPOINTMENT_RESCHEDULED':
        return appointmentTemplates.renderAppointmentRescheduled(
          data as unknown as appointmentTemplates.AppointmentRescheduledData
        );

      // Clinical note notifications
      case 'NOTE_DUE_SOON':
        return clinicalTemplates.renderNoteDueSoon(
          data as unknown as clinicalTemplates.NoteDueSoonData
        );
      case 'NOTE_OVERDUE':
        return clinicalTemplates.renderNoteOverdue(
          data as unknown as clinicalTemplates.NoteOverdueData
        );
      case 'NOTE_PENDING_COSIGN':
        return clinicalTemplates.renderNotePendingCosign(
          data as unknown as clinicalTemplates.NotePendingCosignData
        );
      case 'NOTE_DAILY_DIGEST':
        return clinicalTemplates.renderNoteDailyDigest(
          data as unknown as clinicalTemplates.NoteDailyDigestData
        );

      // Billing notifications
      case 'CLAIM_SUBMITTED':
        return billingTemplates.renderClaimSubmitted(
          data as unknown as billingTemplates.ClaimSubmittedData
        );
      case 'CLAIM_DENIED':
        return billingTemplates.renderClaimDenied(
          data as unknown as billingTemplates.ClaimDeniedData
        );
      case 'PAYMENT_RECEIVED':
        return billingTemplates.renderPaymentReceived(
          data as unknown as billingTemplates.PaymentReceivedData
        );
      case 'STATEMENT_READY':
        return billingTemplates.renderStatementReady(
          data as unknown as billingTemplates.StatementReadyData
        );
      case 'PAYMENT_REMINDER':
        return billingTemplates.renderPaymentReminder(
          data as unknown as billingTemplates.PaymentReminderData
        );

      // Treatment Plan notifications
      case 'TREATMENT_PLAN_DUE_SOON':
        return treatmentPlanTemplates.renderTreatmentPlanDueSoon(
          data as unknown as treatmentPlanTemplates.TreatmentPlanDueSoonData
        );
      case 'TREATMENT_PLAN_OVERDUE':
        return treatmentPlanTemplates.renderTreatmentPlanOverdue(
          data as unknown as treatmentPlanTemplates.TreatmentPlanOverdueData
        );
      case 'TREATMENT_PLAN_SUPERVISOR_ALERT':
        return treatmentPlanTemplates.renderTreatmentPlanSupervisorAlert(
          data as unknown as treatmentPlanTemplates.TreatmentPlanSupervisorAlertData
        );

      // Fallback for types not yet implemented
      default:
        return this.renderGenericTemplate(type, data);
    }
  }

  /**
   * Render a generic template for notification types without specific templates
   */
  private renderGenericTemplate(
    type: NotificationType,
    data: Record<string, unknown>
  ): RenderedTemplate {
    const subject = `Notification from MentalSpace`;
    const textBody = `You have a new notification: ${type}\n\n${JSON.stringify(data, null, 2)}`;

    return {
      subject,
      textBody,
      htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #6B46C1; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0;">Notification</h1>
  </div>
  <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p>You have a new notification: <strong>${type}</strong></p>
    <pre style="background: #f3f4f6; padding: 16px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(data, null, 2)}</pre>
  </div>
</body>
</html>
`.trim(),
    };
  }
}

// Export singleton instance
export const templateRenderer = new UnifiedTemplateRenderer();
