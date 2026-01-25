/**
 * Client Relationship Routes
 *
 * Routes for client relationships and provider management (Module 2)
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { UserRoles } from '@mentalspace/shared';
import * as clientRelationshipController from '../controllers/clientRelationship.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// CLIENT RELATIONSHIP ROUTES
// ============================================================================

/**
 * POST /api/v1/client-relationships
 * Create a new client relationship
 * Clinicians, supervisors, and admins can create relationships
 */
router.post(
  '/',
  authorize(UserRoles.CLINICIAN, UserRoles.SUPERVISOR, UserRoles.ADMINISTRATOR, UserRoles.FRONT_DESK),
  clientRelationshipController.createRelationship
);

/**
 * GET /api/v1/client-relationships/:id
 * Get relationship by ID
 */
router.get(
  '/:id',
  authorize(UserRoles.CLINICIAN, UserRoles.SUPERVISOR, UserRoles.ADMINISTRATOR, UserRoles.FRONT_DESK, UserRoles.BILLING_STAFF),
  clientRelationshipController.getRelationshipById
);

/**
 * PUT /api/v1/client-relationships/:id
 * Update a relationship
 */
router.put(
  '/:id',
  authorize(UserRoles.CLINICIAN, UserRoles.SUPERVISOR, UserRoles.ADMINISTRATOR, UserRoles.FRONT_DESK),
  clientRelationshipController.updateRelationship
);

/**
 * DELETE /api/v1/client-relationships/:id
 * Delete (deactivate) a relationship
 */
router.delete(
  '/:id',
  authorize(UserRoles.CLINICIAN, UserRoles.SUPERVISOR, UserRoles.ADMINISTRATOR),
  clientRelationshipController.deleteRelationship
);

/**
 * GET /api/v1/client-relationships/client/:clientId/family-tree
 * Get family tree for a client
 * Note: This must come before the generic /:id route to avoid conflicts
 */
router.get(
  '/client/:clientId/family-tree',
  authorize(UserRoles.CLINICIAN, UserRoles.SUPERVISOR, UserRoles.ADMINISTRATOR, UserRoles.FRONT_DESK, UserRoles.BILLING_STAFF),
  clientRelationshipController.getFamilyTree
);

/**
 * GET /api/v1/client-relationships/client/:clientId
 * Get all relationships for a client
 */
router.get(
  '/client/:clientId',
  authorize(UserRoles.CLINICIAN, UserRoles.SUPERVISOR, UserRoles.ADMINISTRATOR, UserRoles.FRONT_DESK, UserRoles.BILLING_STAFF),
  clientRelationshipController.getClientRelationships
);

// ============================================================================
// CLIENT PROVIDER ROUTES
// ============================================================================

/**
 * POST /api/v1/client-providers
 * Add a provider to a client's care team
 */
router.post(
  '/providers',
  authorize(UserRoles.CLINICIAN, UserRoles.SUPERVISOR, UserRoles.ADMINISTRATOR, UserRoles.FRONT_DESK),
  clientRelationshipController.addProvider
);

/**
 * GET /api/v1/client-providers/:id
 * Get provider by ID
 */
router.get(
  '/providers/:id',
  authorize(UserRoles.CLINICIAN, UserRoles.SUPERVISOR, UserRoles.ADMINISTRATOR, UserRoles.FRONT_DESK, UserRoles.BILLING_STAFF),
  clientRelationshipController.getProviderById
);

/**
 * PUT /api/v1/client-providers/:id
 * Update a provider
 */
router.put(
  '/providers/:id',
  authorize(UserRoles.CLINICIAN, UserRoles.SUPERVISOR, UserRoles.ADMINISTRATOR, UserRoles.FRONT_DESK),
  clientRelationshipController.updateProvider
);

/**
 * DELETE /api/v1/client-providers/:id
 * Delete (deactivate) a provider
 */
router.delete(
  '/providers/:id',
  authorize(UserRoles.CLINICIAN, UserRoles.SUPERVISOR, UserRoles.ADMINISTRATOR),
  clientRelationshipController.deleteProvider
);

/**
 * GET /api/v1/client-providers/client/:clientId/care-team
 * Get care team for a client
 * Note: This must come before the generic /:id route to avoid conflicts
 */
router.get(
  '/providers/client/:clientId/care-team',
  authorize(UserRoles.CLINICIAN, UserRoles.SUPERVISOR, UserRoles.ADMINISTRATOR, UserRoles.FRONT_DESK, UserRoles.BILLING_STAFF),
  clientRelationshipController.getCareTeam
);

/**
 * GET /api/v1/client-providers/client/:clientId
 * Get all providers for a client
 */
router.get(
  '/providers/client/:clientId',
  authorize(UserRoles.CLINICIAN, UserRoles.SUPERVISOR, UserRoles.ADMINISTRATOR, UserRoles.FRONT_DESK, UserRoles.BILLING_STAFF),
  clientRelationshipController.getClientProviders
);

export default router;
