import { Router } from 'express';
import {
  getSchedulingRules,
  getSchedulingRuleById,
  createSchedulingRule,
  updateSchedulingRule,
  deleteSchedulingRule,
  getEffectiveRules,
} from '../controllers/scheduling-rules.controller';
import { authenticate, authorize } from '../middleware/auth';
import { UserRoles } from '@mentalspace/shared';

/**
 * Module 7: Scheduling Rules Routes
 *
 * Admin and clinician routes for managing scheduling rules
 */

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/scheduling-rules
 * Get all scheduling rules with optional filtering
 * Query params: clinicianId, isActive, includeOrgWide
 * Access: ADMIN, SUPERVISOR, CLINICIAN
 */
router.get(
  '/',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPER_ADMIN, UserRoles.SUPERVISOR, UserRoles.CLINICIAN),
  getSchedulingRules
);

/**
 * GET /api/scheduling-rules/effective/:clinicianId
 * Get effective scheduling rules for a clinician
 * (merged org-wide + clinician-specific)
 * Access: ADMIN, SUPERVISOR, CLINICIAN
 */
router.get(
  '/effective/:clinicianId',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPER_ADMIN, UserRoles.SUPERVISOR, UserRoles.CLINICIAN),
  getEffectiveRules
);

/**
 * GET /api/scheduling-rules/:id
 * Get a specific scheduling rule by ID
 * Access: ADMIN, SUPERVISOR, CLINICIAN (own rules only)
 */
router.get(
  '/:id',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPER_ADMIN, UserRoles.SUPERVISOR, UserRoles.CLINICIAN),
  getSchedulingRuleById
);

/**
 * POST /api/scheduling-rules
 * Create a new scheduling rule
 * Access: ADMIN (for org-wide), CLINICIAN (for own rules)
 */
router.post(
  '/',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPER_ADMIN, UserRoles.CLINICIAN),
  createSchedulingRule
);

/**
 * PUT /api/scheduling-rules/:id
 * Update an existing scheduling rule
 * Access: ADMIN (for org-wide), CLINICIAN (for own rules)
 */
router.put(
  '/:id',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPER_ADMIN, UserRoles.CLINICIAN),
  updateSchedulingRule
);

/**
 * DELETE /api/scheduling-rules/:id
 * Delete a scheduling rule
 * Access: ADMIN (for org-wide), CLINICIAN (for own rules)
 */
router.delete(
  '/:id',
  authorize(UserRoles.ADMINISTRATOR, UserRoles.SUPER_ADMIN, UserRoles.CLINICIAN),
  deleteSchedulingRule
);

export default router;
