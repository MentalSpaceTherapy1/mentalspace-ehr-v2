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

// Client Messages (for specific client)
router.get(
  '/clients/:clientId/portal/messages',
  authenticate,
  clientPortalController.getClientMessages
);

// ============================================================================
// THERAPIST PORTAL INBOX
// These endpoints allow therapists to view and respond to ALL client portal messages
// ============================================================================

/**
 * @route   GET /api/v1/client-portal/portal-messages/inbox
 * @desc    Get all portal messages from assigned clients (therapist inbox)
 * @access  Staff (therapist/clinician)
 */
router.get(
  '/portal-messages/inbox',
  authenticate,
  clientPortalController.getTherapistPortalInbox
);

/**
 * @route   GET /api/v1/client-portal/portal-messages/unread-count
 * @desc    Get unread portal message count for therapist
 * @access  Staff (therapist/clinician)
 */
router.get(
  '/portal-messages/unread-count',
  authenticate,
  clientPortalController.getTherapistPortalUnreadCount
);

/**
 * @route   POST /api/v1/client-portal/portal-messages/:messageId/reply
 * @desc    Reply to a client portal message
 * @access  Staff (therapist/clinician)
 */
router.post(
  '/portal-messages/:messageId/reply',
  authenticate,
  clientPortalController.replyToClientPortalMessage
);

/**
 * @route   PUT /api/v1/client-portal/portal-messages/:messageId/read
 * @desc    Mark a portal message as read
 * @access  Staff (therapist/clinician)
 */
router.put(
  '/portal-messages/:messageId/read',
  authenticate,
  clientPortalController.markPortalMessageAsRead
);

/**
 * @route   POST /api/v1/client-portal/portal-messages/send
 * @desc    Send a new message to a client (therapist initiates conversation)
 * @access  Staff (therapist/clinician)
 */
router.post(
  '/portal-messages/send',
  authenticate,
  clientPortalController.sendMessageToClient
);

/**
 * @route   GET /api/v1/client-portal/messaging/clients
 * @desc    Get assigned clients with portal access for messaging
 * @access  Staff (therapist/clinician)
 */
router.get(
  '/messaging/clients',
  authenticate,
  clientPortalController.getAssignedClientsForMessaging
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

// ============================================================================
// CLIENT PORTAL PASSWORD MANAGEMENT (For EHR staff)
// These endpoints allow therapists/admins to manage client portal passwords
// ============================================================================

/**
 * @route   GET /api/v1/client-portal/clients/:clientId/portal/status
 * @desc    Get detailed portal account status for a client
 * @access  Staff (therapist/admin)
 */
router.get(
  '/clients/:clientId/portal/status',
  authenticate,
  clientPortalController.getClientPortalStatus
);

/**
 * @route   POST /api/v1/client-portal/clients/:clientId/portal/send-reset-email
 * @desc    Send password reset email to client
 * @access  Staff (therapist/admin)
 */
router.post(
  '/clients/:clientId/portal/send-reset-email',
  authenticate,
  clientPortalController.adminSendPasswordResetEmail
);

/**
 * @route   POST /api/v1/client-portal/clients/:clientId/portal/create-temp-password
 * @desc    Create temporary password for client (must change on login)
 * @access  Staff (therapist/admin)
 */
router.post(
  '/clients/:clientId/portal/create-temp-password',
  authenticate,
  clientPortalController.adminCreateTempPassword
);

export default router;
