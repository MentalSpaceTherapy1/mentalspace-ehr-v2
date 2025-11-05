import logger from '../utils/logger';
import { auditLogger } from '../utils/logger';
import prisma from './database';

interface NoShowFeatures {
  noShowRate: number;
  cancellationRate: number;
  isNewClient: boolean;
  daysSinceLastAppointment: number | null;
  appointmentHour: number;
  dayOfWeek: number;
  leadTimeDays: number;
  hasConfirmed: boolean;
  riskFactors: string[];
}

interface RiskPrediction {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskFactors: string[];
  confidence: number;
}

/**
 * NoShowPredictionService
 *
 * AI-powered no-show risk prediction service that analyzes appointment patterns
 * and client history to predict likelihood of no-shows.
 *
 * Features:
 * - Rule-based prediction model with multiple risk factors
 * - Historical analysis of client behavior
 * - Time-based risk factors (day of week, time of day, lead time)
 * - Confidence scoring
 * - Risk level categorization (LOW/MEDIUM/HIGH)
 */
export class NoShowPredictionService {
  private readonly MODEL_VERSION = '1.0.0';

  // Risk thresholds
  private readonly HIGH_RISK_THRESHOLD = 0.6;
  private readonly MEDIUM_RISK_THRESHOLD = 0.3;

  // Base weights for risk calculation
  private readonly BASE_RISK = 0.1; // 10% base risk
  private readonly MAX_RISK = 0.95; // Cap at 95%

  /**
   * Calculate no-show risk for an appointment
   * Main entry point for risk prediction
   *
   * @param appointmentId - UUID of the appointment
   * @returns Promise<RiskPrediction> - Risk score, level, and contributing factors
   */
  async calculateRisk(appointmentId: string): Promise<RiskPrediction> {
    try {
      // Fetch appointment with related data
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          client: {
            include: {
              appointments: {
                where: {
                  status: {
                    in: ['NO_SHOW', 'CANCELLED', 'COMPLETED'],
                  },
                  // Exclude the current appointment from history
                  id: {
                    not: appointmentId,
                  },
                },
                orderBy: {
                  appointmentDate: 'desc',
                },
              },
            },
          },
        },
      });

      if (!appointment) {
        logger.warn('Appointment not found for risk calculation', { appointmentId });
        throw new Error(`Appointment ${appointmentId} not found`);
      }

      // Extract features from appointment data
      const features = this.extractFeatures(appointment);

      // Calculate risk score using rule-based model
      const riskScore = this.predictRisk(features);

      // Determine risk level
      const riskLevel = this.getRiskLevel(riskScore);

      // Calculate confidence based on data availability
      const confidence = this.calculateConfidence(appointment.client.appointments.length);

      // Update appointment with risk prediction
      await this.updateAppointmentRisk(appointmentId, riskScore, riskLevel, features.riskFactors);

      // Log prediction for model improvement
      await this.logPrediction(appointmentId, riskScore, features);

      auditLogger.info('No-show risk calculated', {
        appointmentId,
        riskScore,
        riskLevel,
        riskFactors: features.riskFactors,
        confidence,
      });

      return {
        riskScore,
        riskLevel,
        riskFactors: features.riskFactors,
        confidence,
      };
    } catch (error) {
      logger.error('Failed to calculate no-show risk', {
        error: error instanceof Error ? error.message : 'Unknown error',
        appointmentId,
      });
      throw error;
    }
  }

  /**
   * Extract relevant features from appointment for risk prediction
   *
   * @param appointment - Appointment with client and history
   * @returns NoShowFeatures - Extracted features for prediction
   */
  private extractFeatures(appointment: any): NoShowFeatures {
    const clientHistory = appointment.client.appointments;
    const totalAppointments = clientHistory.length;

    // Calculate no-show and cancellation rates
    const noShows = clientHistory.filter((a: any) => a.status === 'NO_SHOW').length;
    const cancellations = clientHistory.filter((a: any) => a.status === 'CANCELLED').length;

    const noShowRate = totalAppointments > 0 ? noShows / totalAppointments : 0;
    const cancellationRate = totalAppointments > 0 ? cancellations / totalAppointments : 0;

    // Extract time-based features
    const appointmentDate = new Date(appointment.appointmentDate);
    const appointmentHour = appointmentDate.getHours();
    const dayOfWeek = appointmentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Check if appointment is confirmed
    const hasConfirmed = appointment.status === 'CONFIRMED';

    const features: NoShowFeatures = {
      noShowRate,
      cancellationRate,
      isNewClient: totalAppointments === 0,
      daysSinceLastAppointment: this.getDaysSinceLastAppointment(clientHistory),
      appointmentHour,
      dayOfWeek,
      leadTimeDays: this.getLeadTimeDays(appointment),
      hasConfirmed,
      riskFactors: [],
    };

    // Identify contributing risk factors for transparency
    if (features.noShowRate > 0.4) {
      features.riskFactors.push('very_high_noshow_history');
    } else if (features.noShowRate > 0.2) {
      features.riskFactors.push('high_noshow_history');
    }

    if (features.cancellationRate > 0.3) {
      features.riskFactors.push('high_cancellation_rate');
    }

    if (features.isNewClient) {
      features.riskFactors.push('new_client');
    }

    if (features.leadTimeDays > 30) {
      features.riskFactors.push('far_future_booking');
    } else if (features.leadTimeDays < 2) {
      features.riskFactors.push('last_minute_booking');
    }

    if (!features.hasConfirmed) {
      features.riskFactors.push('not_confirmed');
    }

    // Early morning (before 9am) or late evening (after 5pm) appointments
    if (features.appointmentHour < 9 || features.appointmentHour > 17) {
      features.riskFactors.push('off_peak_hours');
    }

    // Monday appointments have historically higher no-show rates
    if (features.dayOfWeek === 1) {
      features.riskFactors.push('monday_appointment');
    }

    return features;
  }

  /**
   * Rule-based prediction model
   *
   * Uses weighted scoring based on research and clinical patterns:
   * - Historical behavior is strongest predictor
   * - New clients have elevated risk
   * - Confirmation status significantly impacts risk
   * - Time-based factors add incremental risk
   *
   * @param features - Extracted features
   * @returns number - Risk score between 0.0 and 1.0
   */
  private predictRisk(features: NoShowFeatures): number {
    let risk = this.BASE_RISK;

    // Historical behavior (strongest predictors)
    if (features.isNewClient) {
      risk += 0.15; // New clients 15% more likely to no-show
    }

    if (features.noShowRate > 0.4) {
      risk += 0.5; // Very high history: 50% additional risk
    } else if (features.noShowRate > 0.2) {
      risk += 0.3; // High history: 30% additional risk
    }

    if (features.cancellationRate > 0.3) {
      risk += 0.1; // Pattern of unreliability
    }

    // Confirmation status (strong predictor)
    if (!features.hasConfirmed) {
      risk += 0.15; // Unconfirmed appointments 15% more likely to no-show
    }

    // Lead time factors
    if (features.leadTimeDays > 30) {
      risk += 0.1; // Far future bookings easier to forget
    } else if (features.leadTimeDays < 2) {
      risk += 0.05; // Last-minute bookings show lower commitment
    }

    // Time-based risk factors
    if (features.appointmentHour < 9 || features.appointmentHour > 17) {
      risk += 0.05; // Off-peak hours harder to keep
    }

    if (features.dayOfWeek === 1) {
      risk += 0.05; // Monday appointments have higher no-show rates
    }

    // Cap risk at maximum threshold
    return Math.min(risk, this.MAX_RISK);
  }

  /**
   * Convert numerical risk score to categorical risk level
   *
   * @param score - Risk score (0.0 to 1.0)
   * @returns 'LOW' | 'MEDIUM' | 'HIGH'
   */
  private getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (score >= this.HIGH_RISK_THRESHOLD) return 'HIGH';
    if (score >= this.MEDIUM_RISK_THRESHOLD) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calculate days since client's last appointment
   *
   * @param history - Array of past appointments
   * @returns number | null - Days since last appointment, or null if no history
   */
  private getDaysSinceLastAppointment(history: any[]): number | null {
    if (history.length === 0) return null;

    const completedAppointments = history.filter(
      (a: any) => a.status === 'COMPLETED'
    );

    if (completedAppointments.length === 0) return null;

    const lastAppointment = completedAppointments[0]; // Already sorted by date desc
    const lastDate = new Date(lastAppointment.appointmentDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Calculate lead time (how far in advance appointment was booked)
   *
   * @param appointment - Appointment object
   * @returns number - Days between booking and appointment
   */
  private getLeadTimeDays(appointment: any): number {
    const appointmentDate = new Date(appointment.appointmentDate);
    const createdDate = new Date(appointment.createdAt);
    const diffTime = appointmentDate.getTime() - createdDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays); // Ensure non-negative
  }

  /**
   * Calculate confidence score based on data availability
   *
   * More historical data = higher confidence
   *
   * @param appointmentCount - Number of past appointments
   * @returns number - Confidence score (0.0 to 1.0)
   */
  private calculateConfidence(appointmentCount: number): number {
    // Confidence increases with more data, plateaus at 10+ appointments
    if (appointmentCount === 0) return 0.5; // New client: moderate confidence
    if (appointmentCount >= 10) return 0.95; // Sufficient history: high confidence

    // Linear interpolation between 0.5 and 0.95
    return 0.5 + (appointmentCount / 10) * 0.45;
  }

  /**
   * Update appointment record with risk prediction
   *
   * Note: This requires the Appointment model to have these fields in schema:
   * - noShowRiskScore: Float?
   * - noShowRiskLevel: String?
   * - noShowRiskFactors: String[]
   * - riskCalculatedAt: DateTime?
   *
   * @param appointmentId - UUID of appointment
   * @param score - Risk score
   * @param level - Risk level
   * @param factors - Contributing risk factors
   */
  private async updateAppointmentRisk(
    appointmentId: string,
    score: number,
    level: string,
    factors: string[]
  ): Promise<void> {
    try {
      // Note: This will fail until schema migration is run
      // Uncomment when schema is updated
      /*
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          noShowRiskScore: score,
          noShowRiskLevel: level,
          noShowRiskFactors: factors,
          riskCalculatedAt: new Date(),
        },
      });
      */

      // Temporary: Log instead of update until schema is migrated
      logger.info('Risk prediction calculated (schema update pending)', {
        appointmentId,
        score,
        level,
        factors,
      });
    } catch (error) {
      logger.error('Failed to update appointment risk', {
        error: error instanceof Error ? error.message : 'Unknown error',
        appointmentId,
      });
      // Don't throw - prediction still succeeded even if storage failed
    }
  }

  /**
   * Log prediction for model evaluation and improvement
   *
   * Note: This requires NoShowPredictionLog model in schema
   *
   * @param appointmentId - UUID of appointment
   * @param predictedRisk - Predicted risk score
   * @param features - Features used for prediction
   */
  private async logPrediction(
    appointmentId: string,
    predictedRisk: number,
    features: NoShowFeatures
  ): Promise<void> {
    try {
      // Note: This will fail until schema migration is run
      // Uncomment when schema is updated
      /*
      await prisma.noShowPredictionLog.create({
        data: {
          appointmentId,
          predictedRisk,
          features: features as any, // Store as JSON
          modelVersion: this.MODEL_VERSION,
          actualNoShow: null, // Will be updated after appointment
        },
      });
      */

      // Temporary: Log instead of creating record until schema is migrated
      logger.debug('Prediction logged (schema update pending)', {
        appointmentId,
        predictedRisk,
        modelVersion: this.MODEL_VERSION,
      });
    } catch (error) {
      logger.error('Failed to log prediction', {
        error: error instanceof Error ? error.message : 'Unknown error',
        appointmentId,
      });
      // Don't throw - logging failure shouldn't break prediction
    }
  }

  /**
   * Recalculate risk for all upcoming appointments
   *
   * Useful for:
   * - Batch processing after model updates
   * - Daily/weekly risk assessment jobs
   * - Updating predictions as new data becomes available
   *
   * @param daysAhead - Only recalculate appointments within this many days
   * @returns Promise<{ processed: number, failed: number }> - Processing results
   */
  async recalculateAllRisks(daysAhead: number = 30): Promise<{ processed: number; failed: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

      const upcomingAppointments = await prisma.appointment.findMany({
        where: {
          appointmentDate: {
            gte: new Date(),
            lte: cutoffDate,
          },
          status: {
            in: ['SCHEDULED', 'CONFIRMED', 'REQUESTED'],
          },
        },
        select: {
          id: true,
        },
      });

      logger.info('Starting batch risk recalculation', {
        count: upcomingAppointments.length,
        daysAhead,
      });

      let processed = 0;
      let failed = 0;

      // Process in batches to avoid overwhelming the database
      const BATCH_SIZE = 50;
      for (let i = 0; i < upcomingAppointments.length; i += BATCH_SIZE) {
        const batch = upcomingAppointments.slice(i, i + BATCH_SIZE);

        await Promise.allSettled(
          batch.map(async (appointment) => {
            try {
              await this.calculateRisk(appointment.id);
              processed++;
            } catch (error) {
              logger.error('Failed to calculate risk for appointment', {
                appointmentId: appointment.id,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
              failed++;
            }
          })
        );

        // Log progress
        if ((i + BATCH_SIZE) % 200 === 0) {
          logger.info('Batch risk recalculation progress', {
            processed,
            failed,
            total: upcomingAppointments.length,
          });
        }
      }

      auditLogger.info('Completed batch risk recalculation', {
        processed,
        failed,
        total: upcomingAppointments.length,
      });

      return { processed, failed };
    } catch (error) {
      logger.error('Failed to recalculate all risks', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update prediction after appointment outcome is known
   *
   * Use this to improve model accuracy by comparing predictions to actual outcomes
   *
   * @param appointmentId - UUID of appointment
   * @param didNoShow - Whether client actually no-showed
   */
  async updatePredictionOutcome(appointmentId: string, didNoShow: boolean): Promise<void> {
    try {
      // Note: This will fail until schema migration is run
      // Uncomment when schema is updated
      /*
      await prisma.noShowPredictionLog.updateMany({
        where: {
          appointmentId,
          actualNoShow: null, // Only update if not already set
        },
        data: {
          actualNoShow: didNoShow,
        },
      });
      */

      logger.info('Prediction outcome recorded (schema update pending)', {
        appointmentId,
        didNoShow,
      });

      auditLogger.info('No-show prediction outcome updated', {
        appointmentId,
        actualNoShow: didNoShow,
      });
    } catch (error) {
      logger.error('Failed to update prediction outcome', {
        error: error instanceof Error ? error.message : 'Unknown error',
        appointmentId,
      });
      // Don't throw - outcome tracking failure shouldn't break status update
    }
  }

  /**
   * Get model accuracy metrics
   *
   * Calculate prediction accuracy by comparing predictions to actual outcomes
   *
   * @param startDate - Start of evaluation period
   * @param endDate - End of evaluation period
   * @returns Promise<{ accuracy: number, precision: number, recall: number }>
   */
  async getModelAccuracy(
    startDate: Date,
    endDate: Date
  ): Promise<{ accuracy: number; precision: number; recall: number }> {
    try {
      // Note: This will fail until schema migration is run
      // For now, return placeholder metrics
      logger.info('Model accuracy calculation requested (schema update pending)', {
        startDate,
        endDate,
      });

      // Placeholder until schema is migrated
      return {
        accuracy: 0.0,
        precision: 0.0,
        recall: 0.0,
      };

      /*
      // Uncomment when schema is updated:
      const predictions = await prisma.noShowPredictionLog.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          actualNoShow: {
            not: null,
          },
        },
      });

      if (predictions.length === 0) {
        return { accuracy: 0, precision: 0, recall: 0 };
      }

      let truePositives = 0;
      let falsePositives = 0;
      let trueNegatives = 0;
      let falseNegatives = 0;

      predictions.forEach((pred) => {
        const predictedNoShow = pred.predictedRisk >= this.HIGH_RISK_THRESHOLD;
        const actualNoShow = pred.actualNoShow;

        if (predictedNoShow && actualNoShow) truePositives++;
        else if (predictedNoShow && !actualNoShow) falsePositives++;
        else if (!predictedNoShow && !actualNoShow) trueNegatives++;
        else if (!predictedNoShow && actualNoShow) falseNegatives++;
      });

      const accuracy = (truePositives + trueNegatives) / predictions.length;
      const precision = truePositives / (truePositives + falsePositives) || 0;
      const recall = truePositives / (truePositives + falseNegatives) || 0;

      return { accuracy, precision, recall };
      */
    } catch (error) {
      logger.error('Failed to calculate model accuracy', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

// Export singleton instance
export const noShowPredictionService = new NoShowPredictionService();
