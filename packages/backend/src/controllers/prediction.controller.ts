/**
 * Module 8: AI & Predictive Analytics
 * Prediction Controller - REST API endpoints for ML predictions
 */

import { Request, Response } from 'express';
import predictionService from '../services/prediction.service';
import { logControllerError } from '../utils/logger';
import { sendSuccess, sendBadRequest, sendServerError } from '../utils/apiResponse';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';

/**
 * GET /api/v1/predictions/noshow/:appointmentId
 * Predict no-show risk for a specific appointment
 */
export const predictNoShow = async (req: Request, res: Response): Promise<void> => {
  try {
    const { appointmentId } = req.params;

    const prediction = await predictionService.predictNoShow(appointmentId);

    sendSuccess(res, prediction);
  } catch (error) {
    logControllerError('[Prediction Controller] Error predicting no-show', error);
    sendServerError(res, getErrorMessage(error) || 'Failed to predict no-show risk');
  }
};

/**
 * POST /api/v1/predictions/noshow/:appointmentId/update
 * Update appointment with no-show risk prediction
 */
export const updateAppointmentRisk = async (req: Request, res: Response): Promise<void> => {
  try {
    const { appointmentId } = req.params;

    await predictionService.updateAppointmentRisk(appointmentId);

    sendSuccess(res, { message: 'Appointment risk updated successfully' });
  } catch (error) {
    logControllerError('[Prediction Controller] Error updating appointment risk', error);
    sendServerError(res, getErrorMessage(error) || 'Failed to update appointment risk');
  }
};

/**
 * GET /api/v1/predictions/dropout/:clientId
 * Predict dropout risk for a specific client
 */
export const predictDropout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;

    const prediction = await predictionService.predictDropout(clientId);

    sendSuccess(res, prediction);
  } catch (error) {
    logControllerError('[Prediction Controller] Error predicting dropout', error);
    sendServerError(res, getErrorMessage(error) || 'Failed to predict dropout risk');
  }
};

/**
 * GET /api/v1/predictions/revenue?period=30
 * Generate revenue forecast
 * Query params:
 * - period: Number of days to forecast (default: 30)
 */
export const forecastRevenue = async (req: Request, res: Response): Promise<void> => {
  try {
    const period = req.query.period ? parseInt(req.query.period as string) : 30;

    if (isNaN(period) || period < 1 || period > 365) {
      sendBadRequest(res, 'Period must be between 1 and 365 days');
      return;
    }

    const forecast = await predictionService.forecastRevenue(period);

    sendSuccess(res, forecast);
  } catch (error) {
    logControllerError('[Prediction Controller] Error forecasting revenue', error);
    sendServerError(res, getErrorMessage(error) || 'Failed to forecast revenue');
  }
};

/**
 * GET /api/v1/predictions/demand?period=30
 * Generate appointment demand forecast
 * Query params:
 * - period: Number of days to forecast (default: 30)
 */
export const forecastDemand = async (req: Request, res: Response): Promise<void> => {
  try {
    const period = req.query.period ? parseInt(req.query.period as string) : 30;

    if (isNaN(period) || period < 1 || period > 365) {
      sendBadRequest(res, 'Period must be between 1 and 365 days');
      return;
    }

    const forecast = await predictionService.forecastDemand(period);

    sendSuccess(res, forecast);
  } catch (error) {
    logControllerError('[Prediction Controller] Error forecasting demand', error);
    sendServerError(res, getErrorMessage(error) || 'Failed to forecast demand');
  }
};

/**
 * GET /api/v1/predictions/models
 * List all available prediction models
 */
export const listModels = async (req: Request, res: Response): Promise<void> => {
  try {
    const models = await predictionService.getAvailableModels();

    sendSuccess(res, models);
  } catch (error) {
    logControllerError('[Prediction Controller] Error listing models', error);
    sendServerError(res, getErrorMessage(error) || 'Failed to list prediction models');
  }
};

/**
 * GET /api/v1/predictions/dashboard
 * Get summary data for predictions dashboard
 */
export const getDashboardData = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get sample predictions for dashboard
    const models = await predictionService.getAvailableModels();
    const revenueForecast = await predictionService.forecastRevenue(30);
    const demandForecast = await predictionService.forecastDemand(30);

    sendSuccess(res, {
      models,
      revenue: {
        summary: revenueForecast.summary,
        baseline: revenueForecast.historicalBaseline
      },
      demand: {
        summary: demandForecast.summary,
        peakDays: demandForecast.summary.peakDays,
        peakHours: demandForecast.summary.peakHours
      },
      insights: [
        {
          type: 'revenue',
          severity: revenueForecast.summary.trend === 'DECREASING' ? 'warning' : 'info',
          message: `Revenue is ${revenueForecast.summary.trend.toLowerCase()} by ${Math.abs(revenueForecast.summary.trendPercent).toFixed(1)}%`,
          recommendation: revenueForecast.summary.trend === 'DECREASING'
            ? 'Focus on client retention and acquisition strategies'
            : 'Current trend is positive - maintain service quality'
        },
        {
          type: 'demand',
          severity: demandForecast.summary.averageUtilization > 85 ? 'warning' : 'info',
          message: `Average capacity utilization: ${demandForecast.summary.averageUtilization.toFixed(1)}%`,
          recommendation: demandForecast.summary.averageUtilization > 85
            ? 'Consider expanding provider capacity to meet demand'
            : 'Capacity utilization is healthy'
        }
      ]
    });
  } catch (error) {
    logControllerError('[Prediction Controller] Error getting dashboard data', error);
    sendServerError(res, getErrorMessage(error) || 'Failed to get dashboard data');
  }
};

export default {
  predictNoShow,
  updateAppointmentRisk,
  predictDropout,
  forecastRevenue,
  forecastDemand,
  listModels,
  getDashboardData
};
