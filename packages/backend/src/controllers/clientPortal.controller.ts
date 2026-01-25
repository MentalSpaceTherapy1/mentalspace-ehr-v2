import { Request, Response } from 'express';
import { z } from 'zod';
import { getErrorMessage, getErrorCode, getErrorName, getErrorStack, getErrorStatusCode } from '../utils/errorHelpers';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
// Phase 3.2: Removed direct prisma import - using service methods instead
import {
  sessionReviewsService,
  therapistChangeService,
  moodTrackingService,
} from '../services/portal';
import * as portalAuthService from '../services/portal/auth.service';
import * as clientPortalService from '../services/clientPortal.service';
// Phase 3.2: Removed AppError import - errors now handled in service
import logger from '../utils/logger';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound, sendServerError, sendForbidden } from '../utils/apiResponse';

// ============================================================================
// THERAPIST VIEW: CLIENT PORTAL ACTIVITY
// These endpoints are for EHR users (therapists) to view their clients' portal data
// ============================================================================

// ============================================================================
// MOOD TRACKING (Therapist View)
// ============================================================================

export const getClientMoodData = async (req: Request, res: Response) => {
  try {
    const therapistId = req.user?.userId;
    const { clientId } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    if (!therapistId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const moodData = await moodTrackingService.getClientMoodData({
      therapistId,
      clientId,
      days,
    });

    return sendSuccess(res, moodData);
  } catch (error) {
    logger.error('Error fetching client mood data:', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to fetch client mood data');
  }
};

export const getClientMoodSummary = async (req: Request, res: Response) => {
  try {
    const therapistId = req.user?.userId;
    const { clientId } = req.params;

    if (!therapistId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const summary = await moodTrackingService.getClientMoodSummary({
      therapistId,
      clientId,
    });

    return sendSuccess(res, summary);
  } catch (error) {
    logger.error('Error fetching client mood summary:', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to fetch mood summary');
  }
};

// ============================================================================
// SESSION REVIEWS (Therapist View)
// ============================================================================

export const getMyReviews = async (req: Request, res: Response) => {
  try {
    const clinicianId = req.user?.userId;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!clinicianId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const reviews = await sessionReviewsService.getTherapistReviews({
      clinicianId,
      includePrivate: false, // Therapists only see shared reviews
    });

    return sendSuccess(res, reviews.slice(0, limit));
  } catch (error) {
    logger.error('Error fetching therapist reviews:', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to fetch reviews');
  }
};

const respondToReviewSchema = z.object({
  response: z.string().min(1).max(1000),
});

export const respondToReview = async (req: Request, res: Response) => {
  try {
    const clinicianId = req.user?.userId;
    const { reviewId } = req.params;
    const data = respondToReviewSchema.parse(req.body);

    if (!clinicianId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const review = await sessionReviewsService.respondToReview({
      clinicianId,
      reviewId,
      response: data.response,
    });

    return sendSuccess(res, review, 'Response submitted successfully');
  } catch (error) {
    logger.error('Error responding to review:', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to respond to review');
  }
};

export const markReviewAsViewed = async (req: Request, res: Response) => {
  try {
    const clinicianId = req.user?.userId;
    const { reviewId } = req.params;

    if (!clinicianId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    await sessionReviewsService.markReviewAsViewed({
      clinicianId,
      reviewId,
    });

    return sendSuccess(res, null, 'Review marked as viewed');
  } catch (error) {
    logger.error('Error marking review as viewed:', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to mark review as viewed');
  }
};

// ============================================================================
// CLIENT PORTAL OVERVIEW (Therapist View)
// ============================================================================

export const getClientPortalActivity = async (req: Request, res: Response) => {
  try {
    const therapistId = req.user?.userId;
    const { clientId } = req.params;

    if (!therapistId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    // Phase 3.2: Use service method instead of direct prisma calls
    const activity = await clientPortalService.getClientPortalActivity(therapistId, clientId);

    return sendSuccess(res, activity);
  } catch (error) {
    logger.error('Error fetching client portal activity:', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to fetch portal activity');
  }
};

// ============================================================================
// CLIENT PORTAL MESSAGES (Therapist View)
// ============================================================================

export const getClientMessages = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.roles?.[0];
    const { clientId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    // Phase 3.2: Use service method instead of direct prisma calls
    const messages = await clientPortalService.getClientMessages(userId, userRole, clientId, limit);

    return sendSuccess(res, messages);
  } catch (error) {
    logger.error('Error fetching client messages:', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to fetch messages');
  }
};

// ============================================================================
// THERAPIST INBOX: All Portal Messages (across all assigned clients)
// ============================================================================

/**
 * Get all portal messages for the logged-in therapist/clinician
 * This is the therapist's inbox view - shows ALL messages (both from clients and sent to clients)
 * Admins can see messages from all clients
 */
export const getTherapistPortalInbox = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.roles?.[0];
    const { isRead, limit = 50, offset = 0, clientId } = req.query;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    // Phase 3.2: Use service method instead of direct prisma calls
    const result = await clientPortalService.getTherapistPortalInbox(userId, userRole, {
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      clientId: clientId as string | undefined,
    });

    return sendSuccess(res, result);
  } catch (error) {
    logger.error('Error fetching therapist portal inbox:', error);
    return sendServerError(res, 'Failed to fetch portal inbox');
  }
};

/**
 * Get unread portal message count for therapist
 * Admins can see unread count across all clients
 */
export const getTherapistPortalUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.roles?.[0];

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    // Phase 3.2: Use service method instead of direct prisma calls
    const unreadCount = await clientPortalService.getTherapistUnreadCount(userId, userRole);

    return sendSuccess(res, { unreadCount });
  } catch (error) {
    logger.error('Error getting portal unread count:', error);
    return sendServerError(res, 'Failed to get unread count');
  }
};

/**
 * Reply to a client portal message
 */
export const replyToClientPortalMessage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { messageId } = req.params;
    const { message: replyText } = req.body;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    if (!replyText || replyText.trim().length === 0) {
      return sendBadRequest(res, 'Reply message is required');
    }

    // Phase 3.2: Use service method instead of direct prisma calls
    const reply = await clientPortalService.replyToPortalMessage(userId, messageId, replyText);

    return sendCreated(res, reply, 'Reply sent successfully');
  } catch (error) {
    if (getErrorStatusCode(error) === 404) {
      return sendNotFound(res, 'Original message');
    }
    if (getErrorStatusCode(error) === 403) {
      return sendForbidden(res, getErrorMessage(error));
    }
    logger.error('Error replying to portal message:', error);
    return sendServerError(res, 'Failed to send reply');
  }
};

/**
 * Mark a portal message as read (therapist view)
 */
export const markPortalMessageAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { messageId } = req.params;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    // Phase 3.2: Use service method instead of direct prisma calls
    const updated = await clientPortalService.markMessageAsRead(userId, messageId);

    return sendSuccess(res, updated, 'Message marked as read');
  } catch (error) {
    if (getErrorStatusCode(error) === 404) {
      return sendNotFound(res, 'Message');
    }
    if (getErrorStatusCode(error) === 403) {
      return sendForbidden(res, getErrorMessage(error));
    }
    logger.error('Error marking portal message as read:', error);
    return sendServerError(res, 'Failed to mark message as read');
  }
};

/**
 * Send a new portal message to a client (therapist initiates conversation)
 */
export const sendMessageToClient = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.roles?.[0];
    const { clientId, subject, message, priority } = req.body;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    if (!clientId || !subject?.trim() || !message?.trim()) {
      return sendBadRequest(res, 'Client ID, subject, and message are required');
    }

    // Phase 3.2: Use service method instead of direct prisma calls
    const result = await clientPortalService.sendMessageToClient(userId, userRole, {
      clientId,
      subject,
      message,
      priority,
    });

    return sendCreated(res, {
      id: result.message.id,
      threadId: result.message.threadId,
      subject: result.message.subject,
      message: result.message.message,
      priority: result.message.priority,
      createdAt: result.message.createdAt,
      client: {
        id: result.client.id,
        firstName: result.client.firstName,
        lastName: result.client.lastName,
      },
    }, 'Message sent successfully');
  } catch (error) {
    if (getErrorStatusCode(error) === 403) {
      return sendForbidden(res, getErrorMessage(error));
    }
    logger.error('Error sending message to client:', error);
    return sendServerError(res, 'Failed to send message');
  }
};

/**
 * Get assigned clients for messaging (therapist's client list)
 * Admins can see all clients with portal access
 */
export const getAssignedClientsForMessaging = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.roles?.[0];

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    // Phase 3.2: Use service method instead of direct prisma calls
    const clients = await clientPortalService.getAssignedClientsForMessaging(userId, userRole);

    return sendSuccess(res, clients);
  } catch (error) {
    logger.error('Error fetching assigned clients:', error);
    return sendServerError(res, 'Failed to fetch clients');
  }
};

// ============================================================================
// ADMIN PASSWORD MANAGEMENT
// These endpoints allow staff to manage client portal passwords
// ============================================================================

/**
 * Send a password reset email to a client
 * POST /api/v1/client-portal/clients/:clientId/portal/send-reset-email
 */
export const adminSendPasswordResetEmail = async (req: Request, res: Response) => {
  try {
    const adminUserId = req.user?.userId;
    const { clientId } = req.params;

    if (!adminUserId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    if (!clientId) {
      return sendBadRequest(res, 'Client ID is required');
    }

    const result = await portalAuthService.adminSendPasswordReset(clientId, adminUserId);

    logger.info(`Admin ${adminUserId} triggered password reset email for client ${clientId}`);

    return sendSuccess(res, {
      email: result.email,
      clientName: result.clientName,
    }, result.message);
  } catch (error) {
    logger.error('Error sending admin password reset email:', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to send password reset email');
  }
};

/**
 * Create a temporary password for a client
 * POST /api/v1/client-portal/clients/:clientId/portal/create-temp-password
 */
export const adminCreateTempPassword = async (req: Request, res: Response) => {
  try {
    const adminUserId = req.user?.userId;
    const { clientId } = req.params;

    if (!adminUserId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    if (!clientId) {
      return sendBadRequest(res, 'Client ID is required');
    }

    const result = await portalAuthService.adminCreateTempPassword(clientId, adminUserId);

    logger.info(`Admin ${adminUserId} created temp password for client ${clientId}`);

    return sendSuccess(res, {
      email: result.email,
      clientName: result.clientName,
      tempPassword: result.tempPassword,
      expiresAt: result.expiresAt,
      note: result.note,
    }, result.message);
  } catch (error) {
    logger.error('Error creating admin temp password:', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to create temporary password');
  }
};

/**
 * Get portal account status for a client
 * GET /api/v1/client-portal/clients/:clientId/portal/status
 */
export const getClientPortalStatus = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    // Phase 3.2: Use service method instead of direct prisma calls
    const result = await clientPortalService.getClientPortalStatus(clientId);

    return sendSuccess(res, result);
  } catch (error) {
    logger.error('Error fetching client portal status:', error);
    return sendServerError(res, 'Failed to fetch portal status');
  }
};
