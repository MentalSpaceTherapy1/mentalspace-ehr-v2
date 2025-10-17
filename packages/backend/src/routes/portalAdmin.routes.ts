import { Router } from 'express';
import * as portalAdminController from '../controllers/portalAdmin.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// ============================================================================
// ADMIN: PORTAL OVERSIGHT
// All routes require admin authentication
// ============================================================================

// Session Reviews (Admin View - Including Private)
router.get(
  '/admin/portal/reviews',
  authenticate,
  authorize('ADMINISTRATOR'),
  portalAdminController.getAllReviews
);

router.get(
  '/admin/portal/reviews/statistics',
  authenticate,
  authorize('ADMINISTRATOR'),
  portalAdminController.getReviewStatistics
);

// Therapist Change Requests (Admin Workflow)
router.get(
  '/admin/therapist-change-requests',
  authenticate,
  authorize('ADMINISTRATOR'),
  portalAdminController.getAllChangeRequests
);

router.put(
  '/admin/therapist-change-requests/:requestId/review',
  authenticate,
  authorize('ADMINISTRATOR'),
  portalAdminController.reviewChangeRequest
);

router.post(
  '/admin/therapist-change-requests/:requestId/assign',
  authenticate,
  authorize('ADMINISTRATOR'),
  portalAdminController.assignNewTherapist
);

router.post(
  '/admin/therapist-change-requests/:requestId/complete',
  authenticate,
  authorize('ADMINISTRATOR'),
  portalAdminController.completeTransfer
);

router.post(
  '/admin/therapist-change-requests/:requestId/deny',
  authenticate,
  authorize('ADMINISTRATOR'),
  portalAdminController.denyChangeRequest
);

router.get(
  '/admin/therapist-change-requests/statistics',
  authenticate,
  authorize('ADMINISTRATOR'),
  portalAdminController.getChangeRequestStatistics
);

// Portal Accounts Management
router.get(
  '/admin/portal/accounts',
  authenticate,
  authorize('ADMINISTRATOR'),
  portalAdminController.getAllPortalAccounts
);

router.post(
  '/admin/portal/accounts/:accountId/activate',
  authenticate,
  authorize('ADMINISTRATOR'),
  portalAdminController.activatePortalAccount
);

router.post(
  '/admin/portal/accounts/:accountId/deactivate',
  authenticate,
  authorize('ADMINISTRATOR'),
  portalAdminController.deactivatePortalAccount
);

// Portal Analytics
router.get(
  '/admin/portal/analytics',
  authenticate,
  authorize('ADMINISTRATOR'),
  portalAdminController.getPortalAnalytics
);

export default router;
