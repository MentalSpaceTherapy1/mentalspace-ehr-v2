import logger, { logControllerError } from '../utils/logger';
import { Request, Response } from 'express';
import { z } from 'zod';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
import * as messagingService from '../services/messaging.service';
import { auditLogger } from '../utils/logger';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound, sendServerError, sendForbidden, sendPaginated, sendValidationError } from '../utils/apiResponse';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createMessageSchema = z.object({
  recipientType: z.enum(['INDIVIDUAL', 'DEPARTMENT', 'TEAM', 'ALL_STAFF', 'ROLE_BASED']),
  recipientIds: z.array(z.string().uuid()).min(1, 'At least one recipient required'),
  subject: z.string().optional(),
  body: z.string().min(1, 'Message body is required'),
  attachments: z.array(z.string()).optional(),
  messageType: z.enum(['DIRECT', 'BROADCAST', 'ANNOUNCEMENT', 'ALERT', 'SHIFT_HANDOFF']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  threadId: z.string().uuid().optional(),
  replyToId: z.string().uuid().optional(),
  expiresAt: z.string().datetime().optional(),
});

const createChannelSchema = z.object({
  name: z.string().min(1, 'Channel name is required'),
  description: z.string().optional(),
  channelType: z.enum(['DEPARTMENT', 'TEAM', 'PROJECT', 'GENERAL', 'ANNOUNCEMENTS']),
  memberIds: z.array(z.string().uuid()).min(1, 'At least one member required'),
  adminIds: z.array(z.string().uuid()).min(1, 'At least one admin required'),
  isPrivate: z.boolean().optional(),
});

const updateChannelSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  memberIds: z.array(z.string().uuid()).optional(),
  adminIds: z.array(z.string().uuid()).optional(),
  isPrivate: z.boolean().optional(),
});

const addMemberSchema = z.object({
  memberId: z.string().uuid('Invalid member ID'),
});

// ============================================================================
// MESSAGE CONTROLLERS
// ============================================================================

/**
 * Create a new message
 */
export const createMessage = async (req: Request, res: Response) => {
  try {
    const validatedData = createMessageSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const message = await messagingService.createMessage({
      senderId: userId,
      recipientType: validatedData.recipientType,
      recipientIds: validatedData.recipientIds,
      subject: validatedData.subject,
      body: validatedData.body,
      attachments: validatedData.attachments,
      messageType: validatedData.messageType,
      priority: validatedData.priority,
      threadId: validatedData.threadId,
      replyToId: validatedData.replyToId,
      expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
    });

    return sendCreated(res, message, 'Message sent successfully');
  } catch (error) {
    logger.error('Create message error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return sendValidationError(res, error.errors.map(e => ({ path: e.path.join('.'), message: e.message })));
    }

    return sendServerError(res, 'Failed to send message');
  }
};

/**
 * Get messages for current user (inbox)
 */
export const getMessages = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const { messageType, priority, isArchived, isRead, threadId, startDate, endDate } = req.query;

    const filters: messagingService.MessageFilters = {};

    if (messageType) filters.messageType = messageType as messagingService.MessageFilters['messageType'];
    if (priority) filters.priority = priority as messagingService.MessageFilters['priority'];
    if (isArchived !== undefined) filters.isArchived = isArchived === 'true';
    if (isRead !== undefined) filters.isRead = isRead === 'true';
    if (threadId) filters.threadId = threadId as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const messages = await messagingService.getMessagesForUser(userId, filters);

    return sendSuccess(res, messages);
  } catch (error) {
    logger.error('Get messages error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    return sendServerError(res, 'Failed to retrieve messages');
  }
};

/**
 * Get sent messages
 */
export const getSentMessages = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const messages = await messagingService.getSentMessages(userId);

    return sendSuccess(res, messages);
  } catch (error) {
    logger.error('Get sent messages error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    return sendServerError(res, 'Failed to retrieve sent messages');
  }
};

/**
 * Get unread message count
 */
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const count = await messagingService.getUnreadCount(userId);

    return sendSuccess(res, { count });
  } catch (error) {
    logger.error('Get unread count error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    return sendServerError(res, 'Failed to retrieve unread count');
  }
};

/**
 * Get message by ID
 */
export const getMessageById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const { id } = req.params;

    const message = await messagingService.getMessageById(id, userId);

    return sendSuccess(res, message);
  } catch (error) {
    logger.error('Get message by ID error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof Error && getErrorMessage(error) === 'Message not found') {
      return sendNotFound(res, 'Message');
    }

    if (error instanceof Error && getErrorMessage(error) === 'Access denied') {
      return sendForbidden(res, 'Access denied');
    }

    return sendServerError(res, 'Failed to retrieve message');
  }
};

/**
 * Mark message as read
 */
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const { id } = req.params;

    const message = await messagingService.markAsRead(id, userId);

    return sendSuccess(res, message, 'Message marked as read');
  } catch (error) {
    logger.error('Mark as read error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    return sendServerError(res, 'Failed to mark message as read');
  }
};

/**
 * Archive a message
 */
export const archiveMessage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const { id } = req.params;

    const message = await messagingService.archiveMessage(id, userId);

    return sendSuccess(res, message, 'Message archived successfully');
  } catch (error) {
    logger.error('Archive message error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    return sendServerError(res, 'Failed to archive message');
  }
};

/**
 * Delete a message
 */
export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const { id } = req.params;

    await messagingService.deleteMessage(id, userId);

    return sendSuccess(res, null, 'Message deleted successfully');
  } catch (error) {
    logger.error('Delete message error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    return sendServerError(res, 'Failed to delete message');
  }
};

// ============================================================================
// CHANNEL CONTROLLERS
// ============================================================================

/**
 * Create a new channel
 */
export const createChannel = async (req: Request, res: Response) => {
  try {
    const validatedData = createChannelSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const channel = await messagingService.createChannel({
      name: validatedData.name,
      description: validatedData.description,
      channelType: validatedData.channelType,
      memberIds: validatedData.memberIds,
      adminIds: validatedData.adminIds,
      isPrivate: validatedData.isPrivate,
      createdById: userId,
    });

    return sendCreated(res, channel, 'Channel created successfully');
  } catch (error) {
    logger.error('Create channel error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return sendValidationError(res, error.errors.map(e => ({ path: e.path.join('.'), message: e.message })));
    }

    return sendServerError(res, 'Failed to create channel');
  }
};

/**
 * Get channels for current user
 */
export const getChannels = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const channels = await messagingService.getChannelsForUser(userId);

    return sendSuccess(res, channels);
  } catch (error) {
    logger.error('Get channels error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    return sendServerError(res, 'Failed to retrieve channels');
  }
};

/**
 * Get channel by ID
 */
export const getChannelById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const { id } = req.params;

    const channel = await messagingService.getChannelById(id, userId);

    return sendSuccess(res, channel);
  } catch (error) {
    logger.error('Get channel by ID error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof Error && getErrorMessage(error) === 'Channel not found') {
      return sendNotFound(res, 'Channel');
    }

    if (error instanceof Error && getErrorMessage(error) === 'Access denied') {
      return sendForbidden(res, 'Access denied');
    }

    return sendServerError(res, 'Failed to retrieve channel');
  }
};

/**
 * Update a channel
 */
export const updateChannel = async (req: Request, res: Response) => {
  try {
    const validatedData = updateChannelSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const { id } = req.params;

    const channel = await messagingService.updateChannel(id, userId, validatedData);

    return sendSuccess(res, channel, 'Channel updated successfully');
  } catch (error) {
    logger.error('Update channel error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return sendValidationError(res, error.errors.map(e => ({ path: e.path.join('.'), message: e.message })));
    }

    return sendServerError(res, 'Failed to update channel');
  }
};

/**
 * Add member to channel
 */
export const addMember = async (req: Request, res: Response) => {
  try {
    const validatedData = addMemberSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const { id } = req.params;

    const channel = await messagingService.addMemberToChannel(id, userId, validatedData.memberId);

    return sendSuccess(res, channel, 'Member added successfully');
  } catch (error) {
    logger.error('Add member error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return sendValidationError(res, error.errors.map(e => ({ path: e.path.join('.'), message: e.message })));
    }

    return sendServerError(res, 'Failed to add member');
  }
};

/**
 * Remove member from channel
 */
export const removeMember = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const { id, memberId } = req.params;

    const channel = await messagingService.removeMemberFromChannel(id, userId, memberId);

    return sendSuccess(res, channel, 'Member removed successfully');
  } catch (error) {
    logger.error('Remove member error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    return sendServerError(res, 'Failed to remove member');
  }
};

/**
 * Archive a channel
 */
export const archiveChannel = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const { id } = req.params;

    const channel = await messagingService.archiveChannel(id, userId);

    return sendSuccess(res, channel, 'Channel archived successfully');
  } catch (error) {
    logger.error('Archive channel error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    return sendServerError(res, 'Failed to archive channel');
  }
};
