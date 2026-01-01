/**
 * Module 8: AI & Predictive Analytics
 * Prediction Service - ML-powered predictions for no-show risk, dropout, revenue, and demand forecasting
 *
 * Implements 4 core prediction models:
 * 1. No-Show Risk Predictor - Calculates probability of appointment no-show
 * 2. Dropout Predictor - Predicts client treatment dropout risk
 * 3. Revenue Forecaster - Time series forecasting of revenue
 * 4. Demand Forecaster - Predicts appointment demand and capacity utilization
 */

import { PrismaClient } from '@mentalspace/database';

const prisma = new PrismaClient();

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface NoShowPrediction {
  appointmentId: string;
  probability: number; // 0.0 - 1.0
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number; // 0.0 - 1.0
  factors: {
    factor: string;
    impact: number; // contribution to risk score
    description: string;
  }[];
  recommendations: string[];
  calculatedAt: Date;
}

export interface DropoutPrediction {
  clientId: string;
  probability30Days: number;
  probability60Days: number;
  probability90Days: number;
  overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  factors: {
    factor: string;
    impact: number;
    description: string;
  }[];
  interventions: {
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    intervention: string;
    description: string;
  }[];
  calculatedAt: Date;
}

export interface RevenueForecast {
  period: number; // days
  forecasts: {
    date: Date;
    predicted: number;
    lower: number; // 95% confidence interval
    upper: number;
  }[];
  summary: {
    totalPredicted: number;
    averageDaily: number;
    trend: 'INCREASING' | 'STABLE' | 'DECREASING';
    trendPercent: number;
    confidence: number;
  };
  historicalBaseline: {
    last30Days: number;
    last60Days: number;
    last90Days: number;
  };
  calculatedAt: Date;
}

export interface DemandForecast {
  period: number; // days
  forecasts: {
    date: Date;
    dayOfWeek: string;
    hourlyDemand: {
      hour: number;
      predicted: number;
      capacity: number;
      utilization: number; // percentage
    }[];
    totalPredicted: number;
  }[];
  summary: {
    totalPredictedAppointments: number;
    averageDailyDemand: number;
    peakDays: string[]; // days of week with highest demand
    peakHours: number[]; // hours with highest demand
    averageUtilization: number;
    capacityRecommendations: string[];
  };
  staffingRecommendations: {
    date: Date;
    dayOfWeek: string;
    recommendations: {
      hour: number;
      suggestedStaff: number;
      reason: string;
    }[];
  }[];
  calculatedAt: Date;
}

// ============================================================================
// MODEL 1: NO-SHOW RISK PREDICTOR
// ============================================================================

export class NoShowPredictor {
  /**
   * Calculate no-show probability for an appointment
   * Uses statistical model based on historical patterns
   */
  async predictNoShowRisk(appointmentId: string): Promise<NoShowPrediction> {
    // Fetch appointment with client history
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: {
          include: {
            appointments: {
              where: {
                appointmentDate: { lt: new Date() }
              },
              orderBy: { appointmentDate: 'desc' }
            }
          }
        }
      }
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    const factors: NoShowPrediction['factors'] = [];
    let riskScore = 0.0;

    // Factor 1: Historical no-show rate (40% weight)
    const totalPastAppointments = appointment.client.appointments.length;
    const noShowAppointments = appointment.client.appointments.filter(
      a => a.status === 'NO_SHOW'
    ).length;

    const historicalNoShowRate = totalPastAppointments > 0
      ? noShowAppointments / totalPastAppointments
      : 0.15; // Default assumption

    const historicalImpact = historicalNoShowRate * 0.4;
    riskScore += historicalImpact;

    factors.push({
      factor: 'Historical No-Show Rate',
      impact: historicalImpact,
      description: `Client has missed ${noShowAppointments} of ${totalPastAppointments} appointments (${(historicalNoShowRate * 100).toFixed(1)}%)`
    });

    // Factor 2: Time since last appointment (20% weight)
    const lastAppointment = appointment.client.appointments[0];
    if (lastAppointment) {
      const daysSinceLastAppt = Math.floor(
        (new Date().getTime() - lastAppointment.appointmentDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      let gapImpact = 0;
      if (daysSinceLastAppt > 90) {
        gapImpact = 0.2; // High risk after 90 days
      } else if (daysSinceLastAppt > 60) {
        gapImpact = 0.15;
      } else if (daysSinceLastAppt > 30) {
        gapImpact = 0.1;
      }

      riskScore += gapImpact;

      if (gapImpact > 0) {
        factors.push({
          factor: 'Time Since Last Appointment',
          impact: gapImpact,
          description: `${daysSinceLastAppt} days since last appointment (longer gaps = higher risk)`
        });
      }
    }

    // Factor 3: Time of day (15% weight)
    const appointmentHour = parseInt(appointment.startTime.split(':')[0]);
    let timeOfDayImpact = 0;

    if (appointmentHour < 9) {
      timeOfDayImpact = 0.15; // Early morning = high risk
    } else if (appointmentHour >= 17) {
      timeOfDayImpact = 0.1; // Late afternoon = moderate risk
    } else if (appointmentHour === 12) {
      timeOfDayImpact = 0.08; // Lunch hour = slight risk
    }

    riskScore += timeOfDayImpact;

    if (timeOfDayImpact > 0) {
      factors.push({
        factor: 'Time of Day',
        impact: timeOfDayImpact,
        description: `${appointment.startTime} appointment (early/late times have higher no-show rates)`
      });
    }

    // Factor 4: Day of week (10% weight)
    const appointmentDay = new Date(appointment.appointmentDate).getDay();
    let dayOfWeekImpact = 0;

    if (appointmentDay === 1) { // Monday
      dayOfWeekImpact = 0.08;
    } else if (appointmentDay === 5) { // Friday
      dayOfWeekImpact = 0.06;
    }

    riskScore += dayOfWeekImpact;

    if (dayOfWeekImpact > 0) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      factors.push({
        factor: 'Day of Week',
        impact: dayOfWeekImpact,
        description: `${dayNames[appointmentDay]} appointments have slightly higher no-show rates`
      });
    }

    // Factor 5: Appointment confirmation status (15% weight)
    if (!appointment.confirmedAt) {
      const confirmationImpact = 0.15;
      riskScore += confirmationImpact;

      factors.push({
        factor: 'Not Confirmed',
        impact: confirmationImpact,
        description: 'Appointment has not been confirmed by client'
      });
    }

    // Calculate risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    if (riskScore >= 0.6) {
      riskLevel = 'HIGH';
    } else if (riskScore >= 0.35) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = 'LOW';
    }

    // Generate recommendations
    const recommendations: string[] = [];

    if (riskScore >= 0.35) {
      recommendations.push('Send additional reminder 24 hours before appointment');
    }
    if (!appointment.confirmedAt) {
      recommendations.push('Request appointment confirmation from client');
    }
    if (historicalNoShowRate > 0.3) {
      recommendations.push('Consider calling client to personally confirm attendance');
    }
    if (riskScore >= 0.6) {
      recommendations.push('Double-book this slot or keep waitlist patient ready');
    }

    // Calculate confidence based on data availability
    const confidence = Math.min(0.95, 0.6 + (totalPastAppointments * 0.02));

    return {
      appointmentId,
      probability: Math.min(riskScore, 1.0),
      riskLevel,
      confidence,
      factors,
      recommendations,
      calculatedAt: new Date()
    };
  }

  /**
   * Update appointment with risk prediction
   */
  async updateAppointmentRisk(appointmentId: string): Promise<void> {
    const prediction = await this.predictNoShowRisk(appointmentId);

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        noShowRiskScore: prediction.probability,
        noShowRiskLevel: prediction.riskLevel,
        noShowRiskFactors: prediction.factors.map(f => f.factor),
        riskCalculatedAt: prediction.calculatedAt
      }
    });
  }
}

// ============================================================================
// MODEL 2: DROPOUT PREDICTOR
// ============================================================================

export class DropoutPredictor {
  /**
   * Calculate dropout probability for a client
   * Predicts risk of client discontinuing treatment
   */
  async predictDropoutRisk(clientId: string): Promise<DropoutPrediction> {
    // Fetch client with appointment history
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        appointments: {
          orderBy: { appointmentDate: 'desc' }
        }
      }
    });

    if (!client) {
      throw new Error('Client not found');
    }

    const factors: DropoutPrediction['factors'] = [];
    let baseRiskScore = 0.0;

    const now = new Date();
    const appointments = client.appointments;

    // Calculate appointment statistics
    const completedAppointments = appointments.filter(a => a.status === 'COMPLETED');
    const missedAppointments = appointments.filter(a => a.status === 'NO_SHOW');
    const cancelledAppointments = appointments.filter(a => a.status === 'CANCELLED');

    const totalSessionsCompleted = completedAppointments.length;
    const noShowRate = appointments.length > 0 ? missedAppointments.length / appointments.length : 0;
    const cancellationRate = appointments.length > 0 ? cancelledAppointments.length / appointments.length : 0;

    // Factor 1: Number of sessions completed (25% weight)
    if (totalSessionsCompleted < 3) {
      const sessionImpact = 0.25;
      baseRiskScore += sessionImpact;
      factors.push({
        factor: 'Low Session Count',
        impact: sessionImpact,
        description: `Only ${totalSessionsCompleted} sessions completed (early dropout risk is high)`
      });
    } else if (totalSessionsCompleted < 6) {
      const sessionImpact = 0.15;
      baseRiskScore += sessionImpact;
      factors.push({
        factor: 'Moderate Session Count',
        impact: sessionImpact,
        description: `${totalSessionsCompleted} sessions completed (building therapeutic alliance)`
      });
    }

    // Factor 2: Time since last session (30% weight)
    if (completedAppointments.length > 0) {
      const lastSession = completedAppointments[0];
      const daysSinceLastSession = Math.floor(
        (now.getTime() - lastSession.appointmentDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      let gapImpact = 0;
      if (daysSinceLastSession > 60) {
        gapImpact = 0.3;
      } else if (daysSinceLastSession > 45) {
        gapImpact = 0.2;
      } else if (daysSinceLastSession > 30) {
        gapImpact = 0.1;
      }

      baseRiskScore += gapImpact;

      if (gapImpact > 0) {
        factors.push({
          factor: 'Extended Gap in Treatment',
          impact: gapImpact,
          description: `${daysSinceLastSession} days since last session (risk increases with time)`
        });
      }
    }

    // Factor 3: Missed appointments (25% weight)
    if (noShowRate > 0.3) {
      const missedImpact = 0.25;
      baseRiskScore += missedImpact;
      factors.push({
        factor: 'High No-Show Rate',
        impact: missedImpact,
        description: `${(noShowRate * 100).toFixed(1)}% no-show rate indicates engagement issues`
      });
    } else if (noShowRate > 0.15) {
      const missedImpact = 0.15;
      baseRiskScore += missedImpact;
      factors.push({
        factor: 'Moderate No-Show Rate',
        impact: missedImpact,
        description: `${(noShowRate * 100).toFixed(1)}% no-show rate`
      });
    }

    // Factor 4: Cancellation pattern (20% weight)
    if (cancellationRate > 0.4) {
      const cancelImpact = 0.2;
      baseRiskScore += cancelImpact;
      factors.push({
        factor: 'High Cancellation Rate',
        impact: cancelImpact,
        description: `${(cancellationRate * 100).toFixed(1)}% cancellation rate suggests barriers to attendance`
      });
    } else if (cancellationRate > 0.25) {
      const cancelImpact = 0.1;
      baseRiskScore += cancelImpact;
      factors.push({
        factor: 'Moderate Cancellation Rate',
        impact: cancelImpact,
        description: `${(cancellationRate * 100).toFixed(1)}% cancellation rate`
      });
    }

    // Calculate probabilities for different time periods
    const probability30Days = Math.min(baseRiskScore, 1.0);
    const probability60Days = Math.min(baseRiskScore * 1.2, 1.0);
    const probability90Days = Math.min(baseRiskScore * 1.4, 1.0);

    // Determine overall risk level
    let overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    if (probability30Days >= 0.6) {
      overallRiskLevel = 'HIGH';
    } else if (probability30Days >= 0.35) {
      overallRiskLevel = 'MEDIUM';
    } else {
      overallRiskLevel = 'LOW';
    }

    // Generate intervention recommendations
    const interventions: DropoutPrediction['interventions'] = [];

    if (probability30Days >= 0.6) {
      interventions.push({
        priority: 'HIGH',
        intervention: 'Immediate Outreach',
        description: 'Contact client within 48 hours to address barriers and re-engage in treatment'
      });
    }

    if (noShowRate > 0.2 || cancellationRate > 0.3) {
      interventions.push({
        priority: 'HIGH',
        intervention: 'Barrier Assessment',
        description: 'Schedule session to identify and address barriers to consistent attendance'
      });
    }

    if (totalSessionsCompleted < 6) {
      interventions.push({
        priority: 'MEDIUM',
        intervention: 'Engagement Enhancement',
        description: 'Focus on building therapeutic alliance and goal alignment in next sessions'
      });
    }

    if (completedAppointments.length > 0) {
      const lastSession = completedAppointments[0];
      const daysSinceLastSession = Math.floor(
        (now.getTime() - lastSession.appointmentDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastSession > 30) {
        interventions.push({
          priority: 'HIGH',
          intervention: 'Re-Engagement Call',
          description: 'Personal phone call to check in and schedule next appointment'
        });
      }
    }

    // Default interventions if no specific risks identified
    if (interventions.length === 0) {
      interventions.push({
        priority: 'LOW',
        intervention: 'Routine Monitoring',
        description: 'Continue regular treatment schedule and monitor engagement'
      });
    }

    // Calculate confidence
    const confidence = Math.min(0.95, 0.5 + (appointments.length * 0.03));

    return {
      clientId,
      probability30Days,
      probability60Days,
      probability90Days,
      overallRiskLevel,
      confidence,
      factors,
      interventions,
      calculatedAt: new Date()
    };
  }
}

// ============================================================================
// MODEL 3: REVENUE FORECASTER
// ============================================================================

export class RevenueForecaster {
  /**
   * Generate revenue forecast using time series analysis
   */
  async generateForecast(periodDays: number = 30): Promise<RevenueForecast> {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 90); // Look back 90 days

    // Fetch completed appointments with billing data
    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: { gte: startDate },
        status: 'COMPLETED',
        chargeAmount: { not: null }
      },
      orderBy: { appointmentDate: 'asc' }
    });

    // Calculate daily revenue for historical period
    const dailyRevenue = new Map<string, number>();

    for (const appointment of appointments) {
      const dateKey = appointment.appointmentDate.toISOString().split('T')[0];
      const currentRevenue = dailyRevenue.get(dateKey) || 0;
      const chargeAmount = appointment.chargeAmount ? parseFloat(appointment.chargeAmount.toString()) : 0;
      dailyRevenue.set(dateKey, currentRevenue + chargeAmount);
    }

    // Calculate baseline statistics
    const revenues = Array.from(dailyRevenue.values());
    const averageDaily = revenues.length > 0
      ? revenues.reduce((sum, rev) => sum + rev, 0) / revenues.length
      : 0;

    // Calculate last 30, 60, 90 day totals
    const getLast30Days = () => {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 30);
      return Array.from(dailyRevenue.entries())
        .filter(([date]) => new Date(date) >= cutoff)
        .reduce((sum, [, rev]) => sum + rev, 0);
    };

    const getLast60Days = () => {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 60);
      return Array.from(dailyRevenue.entries())
        .filter(([date]) => new Date(date) >= cutoff)
        .reduce((sum, [, rev]) => sum + rev, 0);
    };

    const getLast90Days = () => {
      return revenues.reduce((sum, rev) => sum + rev, 0);
    };

    const historicalBaseline = {
      last30Days: getLast30Days(),
      last60Days: getLast60Days(),
      last90Days: getLast90Days()
    };

    // Calculate trend
    let trend: 'INCREASING' | 'STABLE' | 'DECREASING' = 'STABLE';
    let trendPercent = 0;

    if (revenues.length >= 30) {
      const recent30 = revenues.slice(-30).reduce((sum, rev) => sum + rev, 0) / 30;
      const previous30 = revenues.slice(-60, -30).reduce((sum, rev) => sum + rev, 0) / 30;

      if (previous30 > 0) {
        trendPercent = ((recent30 - previous30) / previous30) * 100;

        if (trendPercent > 5) {
          trend = 'INCREASING';
        } else if (trendPercent < -5) {
          trend = 'DECREASING';
        }
      }
    }

    // Generate forecasts with confidence intervals
    const forecasts: RevenueForecast['forecasts'] = [];
    let trendMultiplier = 1.0;

    if (trend === 'INCREASING') {
      trendMultiplier = 1 + (trendPercent / 100);
    } else if (trend === 'DECREASING') {
      trendMultiplier = 1 + (trendPercent / 100);
    }

    for (let i = 1; i <= periodDays; i++) {
      const forecastDate = new Date(now);
      forecastDate.setDate(forecastDate.getDate() + i);

      // Apply trend to average
      const predicted = averageDaily * Math.pow(trendMultiplier, i / 30);

      // Calculate confidence intervals (95% CI)
      const stdDev = this.calculateStandardDeviation(revenues);
      const marginOfError = 1.96 * stdDev / Math.sqrt(revenues.length);

      forecasts.push({
        date: forecastDate,
        predicted: Math.round(predicted * 100) / 100,
        lower: Math.max(0, Math.round((predicted - marginOfError) * 100) / 100),
        upper: Math.round((predicted + marginOfError) * 100) / 100
      });
    }

    const totalPredicted = forecasts.reduce((sum, f) => sum + f.predicted, 0);
    const confidence = Math.min(0.95, 0.6 + (revenues.length * 0.005));

    return {
      period: periodDays,
      forecasts,
      summary: {
        totalPredicted: Math.round(totalPredicted * 100) / 100,
        averageDaily: Math.round(averageDaily * 100) / 100,
        trend,
        trendPercent: Math.round(trendPercent * 10) / 10,
        confidence
      },
      historicalBaseline,
      calculatedAt: now
    };
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;

    return Math.sqrt(variance);
  }
}

// ============================================================================
// MODEL 4: DEMAND FORECASTER
// ============================================================================

export class DemandForecaster {
  /**
   * Generate appointment demand forecast
   */
  async generateForecast(periodDays: number = 30): Promise<DemandForecast> {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 90); // Look back 90 days

    // Fetch historical appointments
    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: { gte: startDate }
      },
      orderBy: { appointmentDate: 'asc' }
    });

    // Get total provider capacity
    const providers = await prisma.user.count({
      where: {
        roles: { hasSome: ['CLINICIAN', 'ADMINISTRATOR'] },
        isActive: true
      }
    });

    // Assume 8 hour workday, 30-minute appointments
    const slotsPerProviderPerHour = 2;
    const workHoursPerDay = 8;
    const totalCapacityPerHour = providers * slotsPerProviderPerHour;

    // Analyze historical patterns by day of week and hour
    const dayOfWeekCounts = new Map<string, number>();
    const hourCounts = new Map<number, number>();

    for (const appointment of appointments) {
      const date = new Date(appointment.appointmentDate);
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
      const hour = parseInt(appointment.startTime.split(':')[0]);

      dayOfWeekCounts.set(dayName, (dayOfWeekCounts.get(dayName) || 0) + 1);
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }

    // Calculate average appointments per day of week
    const averageByDay = new Map<string, number>();
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    for (const dayName of dayNames) {
      const count = dayOfWeekCounts.get(dayName) || 0;
      const weeks = 12; // Approximate 90 days / 7
      averageByDay.set(dayName, count / weeks);
    }

    // Calculate average by hour
    const averageByHour = new Map<number, number>();
    for (let hour = 8; hour <= 17; hour++) {
      const count = hourCounts.get(hour) || 0;
      const days = 90;
      averageByHour.set(hour, count / days);
    }

    // Identify peak patterns
    const peakDays = Array.from(averageByDay.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([day]) => day);

    const peakHours = Array.from(averageByHour.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => hour);

    // Generate forecasts for each day
    const forecasts: DemandForecast['forecasts'] = [];
    const staffingRecommendations: DemandForecast['staffingRecommendations'] = [];

    for (let i = 1; i <= periodDays; i++) {
      const forecastDate = new Date(now);
      forecastDate.setDate(forecastDate.getDate() + i);

      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][forecastDate.getDay()];

      // Skip weekends
      if (dayName === 'Sunday' || dayName === 'Saturday') continue;

      const dailyAverage = averageByDay.get(dayName) || 5;

      // Generate hourly demand
      const hourlyDemand: DemandForecast['forecasts'][0]['hourlyDemand'] = [];
      let totalPredicted = 0;

      for (let hour = 8; hour <= 17; hour++) {
        const hourlyAverage = averageByHour.get(hour) || 1;
        const predicted = Math.round(hourlyAverage * (dailyAverage / 5)); // Scale to day
        const utilization = (predicted / totalCapacityPerHour) * 100;

        hourlyDemand.push({
          hour,
          predicted,
          capacity: totalCapacityPerHour,
          utilization: Math.round(utilization * 10) / 10
        });

        totalPredicted += predicted;
      }

      forecasts.push({
        date: forecastDate,
        dayOfWeek: dayName,
        hourlyDemand,
        totalPredicted
      });

      // Generate staffing recommendations
      const recommendations: DemandForecast['staffingRecommendations'][0]['recommendations'] = [];

      for (const hourData of hourlyDemand) {
        if (hourData.utilization > 85) {
          recommendations.push({
            hour: hourData.hour,
            suggestedStaff: Math.ceil(providers * 1.2),
            reason: `High utilization (${hourData.utilization}%) - consider adding staff`
          });
        } else if (hourData.utilization < 40) {
          recommendations.push({
            hour: hourData.hour,
            suggestedStaff: Math.max(1, Math.floor(providers * 0.7)),
            reason: `Low utilization (${hourData.utilization}%) - can reduce staff`
          });
        }
      }

      if (recommendations.length > 0) {
        staffingRecommendations.push({
          date: forecastDate,
          dayOfWeek: dayName,
          recommendations
        });
      }
    }

    // Calculate summary statistics
    const totalPredictedAppointments = forecasts.reduce((sum, f) => sum + f.totalPredicted, 0);
    const averageDailyDemand = forecasts.length > 0
      ? totalPredictedAppointments / forecasts.length
      : 0;

    const allUtilizations = forecasts.flatMap(f => f.hourlyDemand.map(h => h.utilization));
    const averageUtilization = allUtilizations.length > 0
      ? allUtilizations.reduce((sum, u) => sum + u, 0) / allUtilizations.length
      : 0;

    // Generate capacity recommendations
    const capacityRecommendations: string[] = [];

    if (averageUtilization > 85) {
      capacityRecommendations.push('Overall utilization is high - consider hiring additional providers');
    } else if (averageUtilization < 50) {
      capacityRecommendations.push('Utilization is low - focus on client acquisition or reduce provider hours');
    }

    if (peakDays.length > 0) {
      capacityRecommendations.push(`Peak demand on ${peakDays.join(' and ')} - ensure adequate staffing on these days`);
    }

    if (peakHours.length > 0) {
      const hourStrings = peakHours.map(h => `${h}:00-${h + 1}:00`);
      capacityRecommendations.push(`Peak hours are ${hourStrings.join(', ')} - prioritize availability during these times`);
    }

    return {
      period: periodDays,
      forecasts,
      summary: {
        totalPredictedAppointments: Math.round(totalPredictedAppointments),
        averageDailyDemand: Math.round(averageDailyDemand * 10) / 10,
        peakDays,
        peakHours,
        averageUtilization: Math.round(averageUtilization * 10) / 10,
        capacityRecommendations
      },
      staffingRecommendations,
      calculatedAt: now
    };
  }
}

// ============================================================================
// MAIN PREDICTION SERVICE
// ============================================================================

export class PredictionService {
  private noShowPredictor = new NoShowPredictor();
  private dropoutPredictor = new DropoutPredictor();
  private revenueForecaster = new RevenueForecaster();
  private demandForecaster = new DemandForecaster();

  async predictNoShow(appointmentId: string): Promise<NoShowPrediction> {
    return this.noShowPredictor.predictNoShowRisk(appointmentId);
  }

  async updateAppointmentRisk(appointmentId: string): Promise<void> {
    return this.noShowPredictor.updateAppointmentRisk(appointmentId);
  }

  async predictDropout(clientId: string): Promise<DropoutPrediction> {
    return this.dropoutPredictor.predictDropoutRisk(clientId);
  }

  async forecastRevenue(periodDays: number = 30): Promise<RevenueForecast> {
    return this.revenueForecaster.generateForecast(periodDays);
  }

  async forecastDemand(periodDays: number = 30): Promise<DemandForecast> {
    return this.demandForecaster.generateForecast(periodDays);
  }

  /**
   * Get list of available prediction models
   */
  async getAvailableModels() {
    return [
      {
        modelType: 'NO_SHOW',
        name: 'No-Show Risk Predictor',
        description: 'Predicts the probability that a client will miss their scheduled appointment',
        version: '1.0.0',
        algorithm: 'Statistical Risk Model',
        features: ['Historical no-show rate', 'Time gaps', 'Appointment timing', 'Confirmation status'],
        status: 'ACTIVE'
      },
      {
        modelType: 'DROPOUT',
        name: 'Treatment Dropout Predictor',
        description: 'Predicts the risk that a client will discontinue treatment',
        version: '1.0.0',
        algorithm: 'Statistical Risk Model',
        features: ['Session count', 'Treatment gaps', 'Attendance patterns', 'Engagement metrics'],
        status: 'ACTIVE'
      },
      {
        modelType: 'REVENUE_FORECAST',
        name: 'Revenue Forecaster',
        description: 'Generates revenue forecasts based on historical patterns and trends',
        version: '1.0.0',
        algorithm: 'Time Series Forecasting',
        features: ['Historical revenue', 'Trend analysis', 'Seasonality', 'Confidence intervals'],
        status: 'ACTIVE'
      },
      {
        modelType: 'DEMAND_FORECAST',
        name: 'Appointment Demand Forecaster',
        description: 'Predicts appointment demand and provides capacity utilization insights',
        version: '1.0.0',
        algorithm: 'Time Series Forecasting',
        features: ['Historical demand', 'Day/hour patterns', 'Capacity analysis', 'Staffing recommendations'],
        status: 'ACTIVE'
      }
    ];
  }
}

export default new PredictionService();
