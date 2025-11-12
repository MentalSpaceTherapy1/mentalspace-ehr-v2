/**
 * Module 8: AI & Predictive Analytics
 * Prediction Routes - API routes for ML predictions
 */

import { Router } from 'express';
import predictionController from '../controllers/prediction.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All prediction routes require authentication
router.use(authenticate);

// Dashboard overview
router.get('/dashboard', predictionController.getDashboardData);

// List available models
router.get('/models', predictionController.listModels);

// No-show predictions
router.get('/noshow/:appointmentId', predictionController.predictNoShow);
router.post('/noshow/:appointmentId/update', predictionController.updateAppointmentRisk);

// Dropout predictions
router.get('/dropout/:clientId', predictionController.predictDropout);

// Revenue forecasting
router.get('/revenue', predictionController.forecastRevenue);

// Demand forecasting
router.get('/demand', predictionController.forecastDemand);

export default router;
