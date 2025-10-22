import { Router } from 'express';
import * as clientPortalController from '../controllers/clientPortal.controller';
import * as portalAuthService from '../services/portalAuth.service';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// ============================================================================
// EHR-SIDE PORTAL ENDPOINTS (For therapists to view client portal activity)
// All routes require EHR authentication (therapist/admin)
// ============================================================================

// Client Portal Overview
router.get(
  '/clients/:clientId/portal/activity',
  authenticate,
  clientPortalController.getClientPortalActivity
);

// Mood Tracking
router.get(
  '/clients/:clientId/portal/mood-data',
  authenticate,
  clientPortalController.getClientMoodData
);

router.get(
  '/clients/:clientId/portal/mood-summary',
  authenticate,
  clientPortalController.getClientMoodSummary
);

// Session Reviews
router.get('/clinicians/me/reviews', authenticate, clientPortalController.getMyReviews);

router.post(
  '/reviews/:reviewId/respond',
  authenticate,
  clientPortalController.respondToReview
);

router.put('/reviews/:reviewId/viewed', authenticate, clientPortalController.markReviewAsViewed);

// Client Messages
router.get(
  '/clients/:clientId/portal/messages',
  authenticate,
  clientPortalController.getClientMessages
);

// ============================================================================
// PORTAL ACCOUNT MANAGEMENT
// ============================================================================

/**
 * @route   POST /api/v1/client-portal/clients/:clientId/invite
 * @desc    Invite client to portal
 * @access  Staff (therapist/admin)
 */
router.post(
  '/clients/:clientId/invite',
  authenticate,
  asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    const invitedBy = req.user!.userId;

    const result = await portalAuthService.inviteClientToPortal(clientId, invitedBy);

    res.status(201).json({
      success: true,
      message: 'Portal invitation sent successfully',
      data: result,
    });
  })
);

/**
 * @route   POST /api/v1/client-portal/clients/:clientId/resend-invitation
 * @desc    Resend portal invitation
 * @access  Staff (therapist/admin)
 */
router.post(
  '/clients/:clientId/resend-invitation',
  authenticate,
  asyncHandler(async (req, res) => {
    const { clientId } = req.params;

    const result = await portalAuthService.resendPortalInvitation(clientId);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  })
);

/**
 * @route   GET /api/v1/client-portal/clients/:clientId/portal-status
 * @desc    Get portal account status for client
 * @access  Staff (therapist/admin)
 */
router.get(
  '/clients/:clientId/portal-status',
  authenticate,
  asyncHandler(async (req, res) => {
    const { clientId } = req.params;

    const status = await portalAuthService.getPortalAccountStatus(clientId);

    res.status(200).json({
      success: true,
      data: status,
    });
  })
);

export default router;
