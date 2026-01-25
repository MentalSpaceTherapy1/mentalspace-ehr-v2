import { Router } from 'express';
import * as portalAdminController from '../controllers/portalAdmin.controller';
import { authenticate, authorize } from '../middleware/auth';
import { UserRoles } from '@mentalspace/shared';

const router = Router();

// ============================================================================
// ADMIN: PORTAL OVERSIGHT
// All routes require admin authentication
// ============================================================================

// Session Reviews (Admin View - Including Private)
router.get(
  '/admin/portal/reviews',
  authenticate,
  authorize(UserRoles.ADMINISTRATOR),
  portalAdminController.getAllReviews
);

router.get(
  '/admin/portal/reviews/statistics',
  authenticate,
  authorize(UserRoles.ADMINISTRATOR),
  portalAdminController.getReviewStatistics
);

// Therapist Change Requests (Admin Workflow)
router.get(
  '/admin/therapist-change-requests',
  authenticate,
  authorize(UserRoles.ADMINISTRATOR),
  portalAdminController.getAllChangeRequests
);

router.put(
  '/admin/therapist-change-requests/:requestId/review',
  authenticate,
  authorize(UserRoles.ADMINISTRATOR),
  portalAdminController.reviewChangeRequest
);

router.post(
  '/admin/therapist-change-requests/:requestId/assign',
  authenticate,
  authorize(UserRoles.ADMINISTRATOR),
  portalAdminController.assignNewTherapist
);

router.post(
  '/admin/therapist-change-requests/:requestId/complete',
  authenticate,
  authorize(UserRoles.ADMINISTRATOR),
  portalAdminController.completeTransfer
);

router.post(
  '/admin/therapist-change-requests/:requestId/deny',
  authenticate,
  authorize(UserRoles.ADMINISTRATOR),
  portalAdminController.denyChangeRequest
);

router.get(
  '/admin/therapist-change-requests/statistics',
  authenticate,
  authorize(UserRoles.ADMINISTRATOR),
  portalAdminController.getChangeRequestStatistics
);

// Portal Accounts Management
router.get(
  '/admin/portal/accounts',
  authenticate,
  authorize(UserRoles.ADMINISTRATOR),
  portalAdminController.getAllPortalAccounts
);

router.post(
  '/admin/portal/accounts/:accountId/activate',
  authenticate,
  authorize(UserRoles.ADMINISTRATOR),
  portalAdminController.activatePortalAccount
);

router.post(
  '/admin/portal/accounts/:accountId/deactivate',
  authenticate,
  authorize(UserRoles.ADMINISTRATOR),
  portalAdminController.deactivatePortalAccount
);

// Portal Analytics
router.get(
  '/admin/portal/analytics',
  authenticate,
  authorize(UserRoles.ADMINISTRATOR),
  portalAdminController.getPortalAnalytics
);

export default router;
