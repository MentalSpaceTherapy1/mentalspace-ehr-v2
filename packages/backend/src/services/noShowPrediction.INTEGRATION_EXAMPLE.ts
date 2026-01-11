/**
 * No-Show Risk Prediction Integration Examples
 *
 * This file demonstrates how to integrate the NoShowPredictionService
 * into various parts of the application.
 */

import { noShowPredictionService } from './noShowPrediction.service';
import prisma from './database';
import logger from '../utils/logger';

// ============================================================================
// EXAMPLE 1: Appointment Creation
// ============================================================================

/**
 * When creating a new appointment, calculate no-show risk
 * and adjust reminder strategy accordingly
 */
export async function createAppointmentWithRiskAssessment(appointmentData: any) {
  // Create the appointment
  const appointment = await prisma.appointment.create({
    data: appointmentData,
  });

  try {
    // Calculate no-show risk
    const prediction = await noShowPredictionService.calculateRisk(appointment.id);

    logger.info('Appointment created with risk assessment', {
      appointmentId: appointment.id,
      riskLevel: prediction.riskLevel,
      riskScore: prediction.riskScore,
    });

    // Adjust reminder strategy based on risk level
    if (prediction.riskLevel === 'HIGH') {
      // High-risk appointments get extra reminders
      await scheduleEnhancedReminders(appointment.id);

      // Consider scheduling a confirmation call
      await scheduleConfirmationCall(appointment.id);

      // Flag for staff attention
      await flagForReview(appointment.id, 'High no-show risk - consider follow-up');
    } else if (prediction.riskLevel === 'MEDIUM') {
      // Medium-risk: standard reminders plus SMS
      await scheduleStandardReminders(appointment.id, { includeSms: true });
    } else {
      // Low-risk: standard email reminders only
      await scheduleStandardReminders(appointment.id, { includeSms: false });
    }

    return {
      appointment,
      riskPrediction: prediction,
    };
  } catch (error) {
    // Risk calculation failed, but don't fail appointment creation
    logger.error('Failed to calculate risk for new appointment', {
      appointmentId: appointment.id,
      error,
    });

    // Use default reminder strategy
    await scheduleStandardReminders(appointment.id);

    return {
      appointment,
      riskPrediction: null,
    };
  }
}

// ============================================================================
// EXAMPLE 2: Appointment Rescheduling
// ============================================================================

/**
 * When appointment is rescheduled, recalculate risk
 * (lead time and day of week may have changed)
 */
export async function rescheduleAppointment(
  appointmentId: string,
  newDate: Date,
  newStartTime: string
) {
  // Update appointment
  const appointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      appointmentDate: newDate,
      startTime: newStartTime,
      status: 'SCHEDULED', // Reset to scheduled after reschedule
    },
  });

  try {
    // Recalculate risk with new timing
    const prediction = await noShowPredictionService.calculateRisk(appointmentId);

    // If risk has increased, take additional precautions
    if (prediction.riskLevel === 'HIGH') {
      await sendRiskAlertToStaff(appointmentId, prediction);
    }

    return {
      appointment,
      riskPrediction: prediction,
    };
  } catch (error) {
    logger.error('Failed to recalculate risk after reschedule', {
      appointmentId,
      error,
    });

    return {
      appointment,
      riskPrediction: null,
    };
  }
}

// ============================================================================
// EXAMPLE 3: Client Confirmation Response
// ============================================================================

/**
 * When client confirms appointment, recalculate risk
 * (confirmation significantly reduces no-show risk)
 */
export async function handleAppointmentConfirmation(appointmentId: string) {
  // Update appointment status
  const appointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: 'CONFIRMED',
    },
  });

  try {
    // Recalculate risk (should decrease after confirmation)
    const prediction = await noShowPredictionService.calculateRisk(appointmentId);

    logger.info('Risk recalculated after confirmation', {
      appointmentId,
      oldRisk: 'unknown', // Could store previous risk for comparison
      newRiskLevel: prediction.riskLevel,
      newRiskScore: prediction.riskScore,
    });

    // If still high risk even after confirmation, escalate
    if (prediction.riskLevel === 'HIGH') {
      await escalateHighRiskAppointment(appointmentId);
    }

    return prediction;
  } catch (error) {
    logger.error('Failed to recalculate risk after confirmation', {
      appointmentId,
      error,
    });
    return null;
  }
}

// ============================================================================
// EXAMPLE 4: Appointment Status Update (No-Show or Completed)
// ============================================================================

/**
 * When appointment is marked as NO_SHOW or COMPLETED,
 * update the prediction log for model learning
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  newStatus: 'NO_SHOW' | 'COMPLETED' | 'CANCELLED'
) {
  // Update appointment status
  const appointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: newStatus,
      ...(newStatus === 'NO_SHOW' && {
        noShowDate: new Date(),
      }),
    },
  });

  // Update prediction outcome for model learning
  if (newStatus === 'NO_SHOW' || newStatus === 'COMPLETED') {
    try {
      await noShowPredictionService.updatePredictionOutcome(
        appointmentId,
        newStatus === 'NO_SHOW'
      );

      logger.info('Prediction outcome recorded', {
        appointmentId,
        didNoShow: newStatus === 'NO_SHOW',
      });
    } catch (error) {
      logger.error('Failed to update prediction outcome', {
        appointmentId,
        error,
      });
    }
  }

  return appointment;
}

// ============================================================================
// EXAMPLE 5: Dashboard/Report - High-Risk Appointments
// ============================================================================

/**
 * Get list of high-risk appointments for staff review
 */
export async function getHighRiskAppointments(
  dateRange: { start: Date; end: Date }
) {
  try {
    // Note: This query will work after schema is updated
    // For now, it's a placeholder showing the intended usage

    const highRiskAppointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED'],
        },
        // After schema migration:
        // noShowRiskLevel: 'HIGH',
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            primaryPhone: true,
            email: true,
          },
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [
        // After schema migration:
        // { noShowRiskScore: 'desc' },
        { appointmentDate: 'asc' },
      ],
    });

    // For now, calculate risk on-demand until schema is updated
    const appointmentsWithRisk = await Promise.all(
      highRiskAppointments.map(async (appt) => {
        try {
          const prediction = await noShowPredictionService.calculateRisk(appt.id);
          return {
            ...appt,
            riskPrediction: prediction,
          };
        } catch (error) {
          return {
            ...appt,
            riskPrediction: null,
          };
        }
      })
    );

    // Filter to only high-risk
    const highRisk = appointmentsWithRisk.filter(
      (appt) => appt.riskPrediction?.riskLevel === 'HIGH'
    );

    return highRisk;
  } catch (error) {
    logger.error('Failed to get high-risk appointments', { error });
    return [];
  }
}

// ============================================================================
// EXAMPLE 6: Scheduled Job - Daily Risk Recalculation
// ============================================================================

/**
 * Daily job to recalculate risks for upcoming appointments
 * Run this as a cron job every night
 */
export async function dailyRiskRecalculation() {
  try {
    logger.info('Starting daily risk recalculation');

    // Recalculate for appointments in next 30 days
    const results = await noShowPredictionService.recalculateAllRisks(30);

    logger.info('Daily risk recalculation complete', {
      processed: results.processed,
      failed: results.failed,
      timestamp: new Date().toISOString(),
    });

    // If too many failures, alert admins
    if (results.failed > results.processed * 0.1) {
      await alertAdmins(
        'High failure rate in risk recalculation',
        `Failed: ${results.failed}, Processed: ${results.processed}`
      );
    }

    return results;
  } catch (error) {
    logger.error('Daily risk recalculation failed', { error });
    await alertAdmins('Risk recalculation job failed', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 7: Webhook Integration - Twilio SMS Response
// ============================================================================

/**
 * When client responds to SMS reminder, recalculate risk
 */
export async function handleSmsConfirmationResponse(
  appointmentId: string,
  responseText: string
) {
  const confirmed = responseText.toLowerCase().includes('yes') ||
                   responseText.toLowerCase().includes('confirm');

  if (confirmed) {
    // Mark as confirmed
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'CONFIRMED',
      },
    });

    // Recalculate risk (should drop significantly)
    try {
      const prediction = await noShowPredictionService.calculateRisk(appointmentId);

      logger.info('Risk updated after SMS confirmation', {
        appointmentId,
        newRiskLevel: prediction.riskLevel,
      });

      return prediction;
    } catch (error) {
      logger.error('Failed to recalculate risk after SMS confirmation', {
        appointmentId,
        error,
      });
    }
  }

  return null;
}

// ============================================================================
// EXAMPLE 8: Analytics - Model Performance Report
// ============================================================================

/**
 * Generate monthly model performance report
 */
export async function generateMonthlyModelReport(year: number, month: number) {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Get model accuracy metrics
    const accuracy = await noShowPredictionService.getModelAccuracy(
      startDate,
      endDate
    );

    // Get appointment statistics
    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['NO_SHOW', 'COMPLETED'],
        },
      },
    });

    const totalAppointments = appointments.length;
    const noShows = appointments.filter((a) => a.status === 'NO_SHOW').length;
    const noShowRate = totalAppointments > 0 ? noShows / totalAppointments : 0;

    const report = {
      period: {
        year,
        month,
        startDate,
        endDate,
      },
      modelPerformance: {
        accuracy: accuracy.accuracy,
        precision: accuracy.precision,
        recall: accuracy.recall,
      },
      appointmentStats: {
        total: totalAppointments,
        noShows,
        noShowRate,
      },
      generatedAt: new Date(),
    };

    logger.info('Monthly model performance report generated', report);

    return report;
  } catch (error) {
    logger.error('Failed to generate model performance report', { error });
    throw error;
  }
}

// ============================================================================
// Helper Functions (Placeholder implementations)
// ============================================================================

async function scheduleEnhancedReminders(appointmentId: string) {
  // Implementation would schedule 3+ reminders
  logger.info('Scheduling enhanced reminders', { appointmentId });
}

async function scheduleConfirmationCall(appointmentId: string) {
  // Implementation would create task for staff
  logger.info('Scheduling confirmation call', { appointmentId });
}

async function flagForReview(appointmentId: string, reason: string) {
  // Implementation would create alert/task
  logger.info('Flagging appointment for review', { appointmentId, reason });
}

async function scheduleStandardReminders(
  appointmentId: string,
  options?: { includeSms?: boolean }
) {
  // Implementation would schedule standard reminders
  logger.info('Scheduling standard reminders', { appointmentId, options });
}

async function sendRiskAlertToStaff(appointmentId: string, prediction: any) {
  // Implementation would notify staff
  logger.info('Sending risk alert to staff', { appointmentId, prediction });
}

async function escalateHighRiskAppointment(appointmentId: string) {
  // Implementation would escalate to supervisor
  logger.info('Escalating high-risk appointment', { appointmentId });
}

async function alertAdmins(subject: string, message: any) {
  // Implementation would send email/notification to admins
  logger.warn('Admin alert', { subject, message });
}

// ============================================================================
// Express Route Examples
// ============================================================================

/**
 * Example API routes for risk prediction
 */

// GET /api/appointments/:id/risk
export async function getAppointmentRisk(appointmentId: string) {
  try {
    const prediction = await noShowPredictionService.calculateRisk(appointmentId);
    return {
      success: true,
      data: prediction,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// POST /api/appointments/:id/recalculate-risk
export async function recalculateAppointmentRisk(appointmentId: string) {
  try {
    const prediction = await noShowPredictionService.calculateRisk(appointmentId);
    return {
      success: true,
      message: 'Risk recalculated successfully',
      data: prediction,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// GET /api/appointments/high-risk
export async function getHighRiskAppointmentsRoute(
  startDate: Date,
  endDate: Date
) {
  try {
    const appointments = await getHighRiskAppointments({
      start: startDate,
      end: endDate,
    });

    return {
      success: true,
      data: appointments,
      count: appointments.length,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// POST /api/admin/recalculate-all-risks
export async function recalculateAllRisksRoute(daysAhead: number = 30) {
  try {
    const results = await noShowPredictionService.recalculateAllRisks(daysAhead);
    return {
      success: true,
      message: 'Batch risk recalculation complete',
      data: results,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// GET /api/analytics/model-accuracy
export async function getModelAccuracyRoute(
  startDate: Date,
  endDate: Date
) {
  try {
    const accuracy = await noShowPredictionService.getModelAccuracy(
      startDate,
      endDate
    );

    return {
      success: true,
      data: accuracy,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
