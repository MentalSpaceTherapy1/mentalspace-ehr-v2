// Productivity Routes - API Routes for Productivity Module
// Phase 6 - Week 19

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getClinicianDashboard,
  getSupervisorDashboard,
  getAdministratorDashboard,
  getMetrics,
  getHistoricalMetrics,
  getAlerts,
  acknowledgeAlert,
  resolveAlert,
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
} from '../controllers/productivity.controller';

const router = Router();

// Apply authentication middleware to all productivity routes
router.use(authMiddleware);

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================

// Clinician Dashboard
router.get('/dashboard/clinician/:userId', getClinicianDashboard);

// Supervisor Dashboard
router.get('/dashboard/supervisor/:supervisorId', getSupervisorDashboard);

// Administrator Dashboard
router.get('/dashboard/administrator', getAdministratorDashboard);

// ============================================================================
// METRICS ROUTES
// ============================================================================

// Get metrics for a user
router.get('/metrics/:userId', getMetrics);

// Get historical metrics
router.get('/metrics/:userId/history', getHistoricalMetrics);

// ============================================================================
// ALERTS ROUTES
// ============================================================================

// Get alerts for a user
router.get('/alerts/:userId', getAlerts);

// Acknowledge an alert
router.post('/alerts/:alertId/acknowledge', acknowledgeAlert);

// Resolve an alert
router.post('/alerts/:alertId/resolve', resolveAlert);

// ============================================================================
// GOALS ROUTES
// ============================================================================

// Get goals for a user
router.get('/goals/:userId', getGoals);

// Create a new goal
router.post('/goals', createGoal);

// Update a goal
router.put('/goals/:goalId', updateGoal);

// Delete a goal
router.delete('/goals/:goalId', deleteGoal);

export default router;
