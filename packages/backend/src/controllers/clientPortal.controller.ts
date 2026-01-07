import { Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../services/database';
import {
  sessionReviewsService,
  therapistChangeService,
  moodTrackingService,
} from '../services/portal';
import * as portalAuthService from '../services/portal/auth.service';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

// ============================================================================
// THERAPIST VIEW: CLIENT PORTAL ACTIVITY
// These endpoints are for EHR users (therapists) to view their clients' portal data
// ============================================================================

// ============================================================================
// MOOD TRACKING (Therapist View)
// ============================================================================

export const getClientMoodData = async (req: Request, res: Response) => {
  try {
    const therapistId = (req as any).user?.id;
    const { clientId } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    const moodData = await moodTrackingService.getClientMoodData({
      therapistId,
      clientId,
      days,
    });

    res.status(200).json({
      success: true,
      data: moodData,
    });
  } catch (error: any) {
    logger.error('Error fetching client mood data:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch client mood data',
    });
  }
};

export const getClientMoodSummary = async (req: Request, res: Response) => {
  try {
    const therapistId = (req as any).user?.id;
    const { clientId } = req.params;

    const summary = await moodTrackingService.getClientMoodSummary({
      therapistId,
      clientId,
    });

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    logger.error('Error fetching client mood summary:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch mood summary',
    });
  }
};

// ============================================================================
// SESSION REVIEWS (Therapist View)
// ============================================================================

export const getMyReviews = async (req: Request, res: Response) => {
  try {
    const clinicianId = (req as any).user?.id;
    const limit = parseInt(req.query.limit as string) || 20;

    const reviews = await sessionReviewsService.getTherapistReviews({
      clinicianId,
      includePrivate: false, // Therapists only see shared reviews
    });

    res.status(200).json({
      success: true,
      data: reviews.slice(0, limit),
    });
  } catch (error: any) {
    logger.error('Error fetching therapist reviews:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch reviews',
    });
  }
};

const respondToReviewSchema = z.object({
  response: z.string().min(1).max(1000),
});

export const respondToReview = async (req: Request, res: Response) => {
  try {
    const clinicianId = (req as any).user?.id;
    const { reviewId } = req.params;
    const data = respondToReviewSchema.parse(req.body);

    const review = await sessionReviewsService.respondToReview({
      clinicianId,
      reviewId,
      response: data.response,
    });

    res.status(200).json({
      success: true,
      message: 'Response submitted successfully',
      data: review,
    });
  } catch (error: any) {
    logger.error('Error responding to review:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to respond to review',
    });
  }
};

export const markReviewAsViewed = async (req: Request, res: Response) => {
  try {
    const clinicianId = (req as any).user?.id;
    const { reviewId } = req.params;

    await sessionReviewsService.markReviewAsViewed({
      clinicianId,
      reviewId,
    });

    res.status(200).json({
      success: true,
      message: 'Review marked as viewed',
    });
  } catch (error: any) {
    logger.error('Error marking review as viewed:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to mark review as viewed',
    });
  }
};

// ============================================================================
// CLIENT PORTAL OVERVIEW (Therapist View)
// ============================================================================

export const getClientPortalActivity = async (req: Request, res: Response) => {
  try {
    const therapistId = (req as any).user?.id;
    const { clientId } = req.params;

    // Verify therapist has access to this client
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        primaryTherapistId: therapistId,
      },
    });

    if (!client) {
      throw new AppError('Client not found or not assigned to you', 404);
    }

    // Get portal account status
    const portalAccount = await prisma.portalAccount.findUnique({
      where: { clientId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        accountStatus: true,
        lastLoginDate: true,
        createdAt: true,
      },
    });

    // Get recent mood entries (shared only)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentMoods = await prisma.moodEntry.findMany({
      where: {
        clientId,
        sharedWithClinician: true,
        entryDate: { gte: sevenDaysAgo },
      },
      orderBy: { entryDate: 'desc' },
      take: 7,
      select: {
        id: true,
        moodScore: true,
        entryDate: true,
        timeOfDay: true,
        symptoms: true,
      },
    });

    // Get recent session reviews (shared only)
    const recentReviews = await prisma.sessionReview.findMany({
      where: {
        clientId,
        clinicianId: therapistId,
        isSharedWithClinician: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        rating: true,
        createdAt: true,
        isAnonymous: true,
      },
    });

    // Get engagement streak
    const engagementStreak = await prisma.engagementStreak.findUnique({
      where: { clientId },
      select: {
        currentStreak: true,
        longestStreak: true,
        totalCheckIns: true,
        lastCheckInDate: true,
      },
    });

    // Get active homework
    const activeHomework = await prisma.homeworkAssignment.count({
      where: {
        clientId,
        completedAt: null,
      },
    });

    // Get active goals
    const activeGoals = await prisma.therapeuticGoal.count({
      where: {
        clientId,
        status: 'ACTIVE',
      },
    });

    res.status(200).json({
      success: true,
      data: {
        portalAccount,
        recentMoods,
        recentReviews,
        engagementStreak,
        activeHomework,
        activeGoals,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching client portal activity:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch portal activity',
    });
  }
};

// ============================================================================
// CLIENT PORTAL MESSAGES (Therapist View)
// ============================================================================

export const getClientMessages = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;
    const { clientId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    // Check if user is admin - admins can view any client's messages
    const isAdmin = userRole === 'ADMINISTRATOR' || userRole === 'SUPER_ADMIN' || userRole === 'SUPERVISOR';

    // Verify user has access to this client
    let client;
    if (isAdmin) {
      client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { id: true, firstName: true, lastName: true },
      });
    } else {
      client = await prisma.client.findFirst({
        where: {
          id: clientId,
          OR: [
            { primaryTherapistId: userId },
            { secondaryTherapistId: userId },
          ],
        },
        select: { id: true, firstName: true, lastName: true },
      });
    }

    if (!client) {
      throw new AppError('Client not found or not assigned to you', 404);
    }

    // Get ALL messages for this client (both directions - from client and to client)
    const messages = await prisma.portalMessage.findMany({
      where: {
        clientId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error: any) {
    logger.error('Error fetching client messages:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch messages',
    });
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
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;
    const { isRead, limit = 50, offset = 0, clientId } = req.query;

    // Check if user is admin - admins can see all client messages
    const isAdmin = userRole === 'ADMINISTRATOR' || userRole === 'SUPER_ADMIN' || userRole === 'SUPERVISOR';

    // Get clients based on role
    let assignedClients;
    if (isAdmin) {
      // Admins see all clients with portal accounts
      assignedClients = await prisma.client.findMany({
        where: {
          status: 'ACTIVE',
          portalAccount: {
            accountStatus: 'ACTIVE',
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          medicalRecordNumber: true,
        },
      });
    } else {
      // Regular therapists only see assigned clients
      assignedClients = await prisma.client.findMany({
        where: {
          OR: [
            { primaryTherapistId: userId },
            { secondaryTherapistId: userId },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          medicalRecordNumber: true,
        },
      });
    }

    const clientIds = assignedClients.map(c => c.id);

    if (clientIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          messages: [],
          unreadCount: 0,
          totalCount: 0,
        },
      });
    }

    // Build where clause - show ALL messages (both directions)
    const where: any = {
      clientId: { in: clientIds },
      // Removed sentByClient filter to show full conversations
    };

    // Filter by specific client if provided
    if (clientId) {
      where.clientId = clientId;
    }

    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    // Get messages
    const [messages, unreadCount, totalCount] = await Promise.all([
      prisma.portalMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      // Unread count only for messages FROM clients (not our own sent messages)
      prisma.portalMessage.count({
        where: {
          clientId: { in: clientIds },
          sentByClient: true,
          isRead: false,
        },
      }),
      prisma.portalMessage.count({ where }),
    ]);

    // Enrich messages with client info
    const clientMap = new Map(assignedClients.map(c => [c.id, c]));
    const enrichedMessages = messages.map(msg => ({
      ...msg,
      client: clientMap.get(msg.clientId) || null,
    }));

    logger.info(`User ${userId} (admin: ${isAdmin}) retrieved portal inbox: ${messages.length} messages`);

    res.status(200).json({
      success: true,
      data: {
        messages: enrichedMessages,
        unreadCount,
        totalCount,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching therapist portal inbox:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch portal inbox',
    });
  }
};

/**
 * Get unread portal message count for therapist
 * Admins can see unread count across all clients
 */
export const getTherapistPortalUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    // Check if user is admin - admins see all client messages
    const isAdmin = userRole === 'ADMINISTRATOR' || userRole === 'SUPER_ADMIN' || userRole === 'SUPERVISOR';

    // Get clients based on role
    let clientIds: string[];
    if (isAdmin) {
      // Admins see all clients with active portal accounts
      clientIds = await prisma.client.findMany({
        where: {
          status: 'ACTIVE',
          portalAccount: {
            accountStatus: 'ACTIVE',
          },
        },
        select: { id: true },
      }).then(clients => clients.map(c => c.id));
    } else {
      // Regular therapists only see assigned clients
      clientIds = await prisma.client.findMany({
        where: {
          OR: [
            { primaryTherapistId: userId },
            { secondaryTherapistId: userId },
          ],
        },
        select: { id: true },
      }).then(clients => clients.map(c => c.id));
    }

    if (clientIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: { unreadCount: 0 },
      });
    }

    const unreadCount = await prisma.portalMessage.count({
      where: {
        clientId: { in: clientIds },
        sentByClient: true,
        isRead: false,
      },
    });

    res.status(200).json({
      success: true,
      data: { unreadCount },
    });
  } catch (error: any) {
    logger.error('Error getting portal unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
    });
  }
};

/**
 * Reply to a client portal message
 */
export const replyToClientPortalMessage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { messageId } = req.params;
    const { message: replyText } = req.body;

    if (!replyText || replyText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Reply message is required',
      });
    }

    // Get the original message
    const originalMessage = await prisma.portalMessage.findUnique({
      where: { id: messageId },
    });

    if (!originalMessage) {
      return res.status(404).json({
        success: false,
        message: 'Original message not found',
      });
    }

    // Verify therapist is assigned to this client
    const client = await prisma.client.findFirst({
      where: {
        id: originalMessage.clientId,
        OR: [
          { primaryTherapistId: userId },
          { secondaryTherapistId: userId },
        ],
      },
    });

    if (!client) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to reply to this message',
      });
    }

    // Use existing threadId or create one from the original message's id
    // This ensures all messages in a conversation share the same threadId
    const threadId = originalMessage.threadId || messageId;

    // If the original message doesn't have a threadId, update it to use its own id
    if (!originalMessage.threadId) {
      await prisma.portalMessage.update({
        where: { id: messageId },
        data: { threadId: messageId },
      });
    }

    // Create the reply
    const reply = await prisma.portalMessage.create({
      data: {
        clientId: originalMessage.clientId,
        subject: originalMessage.subject.startsWith('Re: ')
          ? originalMessage.subject
          : `Re: ${originalMessage.subject}`,
        message: replyText.trim(),
        sentByClient: false, // Sent by therapist
        sentBy: userId,
        recipientId: originalMessage.clientId,
        threadId: threadId,
        parentMessageId: messageId,
        priority: originalMessage.priority,
        isRead: false, // Client hasn't read it yet
      },
    });

    // Mark the original message as read (therapist has responded)
    await prisma.portalMessage.update({
      where: { id: messageId },
      data: {
        isRead: true,
        readDate: new Date(),
      },
    });

    logger.info(`Therapist ${userId} replied to portal message ${messageId}`);

    res.status(201).json({
      success: true,
      message: 'Reply sent successfully',
      data: reply,
    });
  } catch (error: any) {
    logger.error('Error replying to portal message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reply',
    });
  }
};

/**
 * Mark a portal message as read (therapist view)
 */
export const markPortalMessageAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { messageId } = req.params;

    // Get the message
    const message = await prisma.portalMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Verify therapist is assigned to this client
    const client = await prisma.client.findFirst({
      where: {
        id: message.clientId,
        OR: [
          { primaryTherapistId: userId },
          { secondaryTherapistId: userId },
        ],
      },
    });

    if (!client) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access this message',
      });
    }

    // Mark as read
    const updated = await prisma.portalMessage.update({
      where: { id: messageId },
      data: {
        isRead: true,
        readDate: new Date(),
      },
    });

    logger.info(`Therapist ${userId} marked portal message ${messageId} as read`);

    res.status(200).json({
      success: true,
      message: 'Message marked as read',
      data: updated,
    });
  } catch (error: any) {
    logger.error('Error marking portal message as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark message as read',
    });
  }
};

/**
 * Send a new portal message to a client (therapist initiates conversation)
 */
export const sendMessageToClient = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;
    const { clientId, subject, message, priority } = req.body;

    if (!clientId || !subject?.trim() || !message?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Client ID, subject, and message are required',
      });
    }

    // Check if user is admin - admins can message any client
    const isAdmin = userRole === 'ADMINISTRATOR' || userRole === 'SUPER_ADMIN' || userRole === 'SUPERVISOR';

    let client;
    if (isAdmin) {
      // Admin can message any client
      client = await prisma.client.findUnique({
        where: { id: clientId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      });
    } else {
      // Non-admin: verify therapist is assigned to this client
      client = await prisma.client.findFirst({
        where: {
          id: clientId,
          OR: [
            { primaryTherapistId: userId },
            { secondaryTherapistId: userId },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      });
    }

    if (!client) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to message this client',
      });
    }

    // Generate a new thread ID for this conversation
    const threadId = uuidv4();

    // Create the message
    const newMessage = await prisma.portalMessage.create({
      data: {
        clientId,
        threadId,
        subject: subject.trim(),
        message: message.trim(),
        priority: priority || 'NORMAL',
        sentByClient: false, // Sent by therapist
        sentBy: userId,
        recipientId: clientId,
        isRead: false, // Client hasn't read it yet
      },
    });

    logger.info(`Therapist ${userId} sent new message to client ${clientId}: ${subject} (Thread: ${threadId})`);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        id: newMessage.id,
        threadId: newMessage.threadId,
        subject: newMessage.subject,
        message: newMessage.message,
        priority: newMessage.priority,
        createdAt: newMessage.createdAt,
        client: {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
        },
      },
    });
  } catch (error: any) {
    logger.error('Error sending message to client:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
    });
  }
};

/**
 * Get assigned clients for messaging (therapist's client list)
 * Admins can see all clients with portal access
 */
export const getAssignedClientsForMessaging = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    // Check if user is admin - admins can see all clients
    const isAdmin = userRole === 'ADMINISTRATOR' || userRole === 'SUPER_ADMIN' || userRole === 'SUPERVISOR';

    // Build the where clause based on user role
    const whereClause: any = {
      status: 'ACTIVE',
    };

    // Non-admins can only see their assigned clients
    if (!isAdmin) {
      whereClause.OR = [
        { primaryTherapistId: userId },
        { secondaryTherapistId: userId },
      ];
    }

    // Get clients based on role
    const clients = await prisma.client.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        medicalRecordNumber: true,
        email: true,
        portalAccount: {
          select: {
            id: true,
            accountStatus: true,
          },
        },
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    });

    // Only include clients with active portal accounts
    const clientsWithPortal = clients.filter(c => c.portalAccount?.accountStatus === 'ACTIVE');

    logger.info(`User ${userId} (${userRole}) retrieved ${clientsWithPortal.length} clients for messaging`);

    res.status(200).json({
      success: true,
      data: clientsWithPortal.map(c => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        medicalRecordNumber: c.medicalRecordNumber,
        email: c.email,
        hasPortalAccess: c.portalAccount?.accountStatus === 'ACTIVE',
      })),
    });
  } catch (error: any) {
    logger.error('Error fetching assigned clients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clients',
    });
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
    const adminUserId = (req as any).user?.userId;
    const { clientId } = req.params;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required',
      });
    }

    const result = await portalAuthService.adminSendPasswordReset(clientId, adminUserId);

    logger.info(`Admin ${adminUserId} triggered password reset email for client ${clientId}`);

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        email: result.email,
        clientName: result.clientName,
      },
    });
  } catch (error: any) {
    logger.error('Error sending admin password reset email:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to send password reset email',
    });
  }
};

/**
 * Create a temporary password for a client
 * POST /api/v1/client-portal/clients/:clientId/portal/create-temp-password
 */
export const adminCreateTempPassword = async (req: Request, res: Response) => {
  try {
    const adminUserId = (req as any).user?.userId;
    const { clientId } = req.params;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required',
      });
    }

    const result = await portalAuthService.adminCreateTempPassword(clientId, adminUserId);

    logger.info(`Admin ${adminUserId} created temp password for client ${clientId}`);

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        email: result.email,
        clientName: result.clientName,
        tempPassword: result.tempPassword,
        expiresAt: result.expiresAt,
        note: result.note,
      },
    });
  } catch (error: any) {
    logger.error('Error creating admin temp password:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to create temporary password',
    });
  }
};

/**
 * Get portal account status for a client
 * GET /api/v1/client-portal/clients/:clientId/portal/status
 */
export const getClientPortalStatus = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const portalAccount = await prisma.portalAccount.findUnique({
      where: { clientId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        accountStatus: true,
        portalAccessGranted: true,
        lastLoginDate: true,
        failedLoginAttempts: true,
        accountLockedUntil: true,
        mustChangePassword: true,
        tempPasswordExpiry: true,
        passwordExpiresAt: true,
        createdAt: true,
      },
    });

    if (!portalAccount) {
      return res.status(200).json({
        success: true,
        data: {
          hasPortalAccount: false,
          message: 'Client does not have a portal account',
        },
      });
    }

    const isLocked = portalAccount.accountLockedUntil && portalAccount.accountLockedUntil > new Date();
    const hasTempPassword = portalAccount.mustChangePassword && portalAccount.tempPasswordExpiry;
    const tempPasswordExpired = hasTempPassword && portalAccount.tempPasswordExpiry && portalAccount.tempPasswordExpiry < new Date();
    const passwordExpired = portalAccount.passwordExpiresAt && portalAccount.passwordExpiresAt < new Date();

    res.status(200).json({
      success: true,
      data: {
        hasPortalAccount: true,
        portalAccount: {
          ...portalAccount,
          isLocked,
          hasTempPassword,
          tempPasswordExpired,
          passwordExpired,
        },
      },
    });
  } catch (error: any) {
    logger.error('Error fetching client portal status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch portal status',
    });
  }
};
