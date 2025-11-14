/**
 * Crisis Detection Routes
 *
 * Routes for managing and viewing crisis detection logs.
 * All routes require authentication and admin privileges.
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';
import * as crisisController from '../controllers/crisis-detection.controller';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * GET /api/crisis/logs
 * Get all crisis detection logs with filtering
 * Query params:
 *   - severity: CRITICAL | HIGH | MEDIUM
 *   - reviewed: true | false
 *   - userId: filter by client ID
 *   - startDate: ISO date string
 *   - endDate: ISO date string
 *   - page: page number (default: 1)
 *   - limit: items per page (default: 50)
 */
router.get(
  '/logs',
  requireRole(['ADMINISTRATOR']),
  crisisController.getAllCrisisLogs
);

/**
 * GET /api/crisis/logs/:id
 * Get a specific crisis detection log
 */
router.get(
  '/logs/:id',
  requireRole(['ADMINISTRATOR', 'CLINICIAN']),
  crisisController.getCrisisLog
);

/**
 * PUT /api/crisis/logs/:id/review
 * Review a crisis detection
 * Body:
 *   - notes: string (required)
 *   - falsePositive: boolean (optional, default: false)
 *   - actionTaken: string (optional)
 */
router.put(
  '/logs/:id/review',
  requireRole(['ADMINISTRATOR', 'CLINICIAN']),
  crisisController.reviewCrisisLog
);

/**
 * PUT /api/crisis/logs/:id/action
 * Record action taken on a crisis detection
 * Body:
 *   - actionTaken: string (required)
 */
router.put(
  '/logs/:id/action',
  requireRole(['ADMINISTRATOR', 'CLINICIAN']),
  crisisController.recordActionTaken
);

/**
 * GET /api/crisis/stats
 * Get crisis detection statistics
 * Query params:
 *   - startDate: ISO date string (optional)
 *   - endDate: ISO date string (optional)
 */
router.get(
  '/stats',
  requireRole(['ADMINISTRATOR']),
  crisisController.getCrisisStatistics
);

export default router;
