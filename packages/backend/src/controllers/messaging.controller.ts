import logger, { logControllerError } from '../utils/logger';
import { Request, Response } from 'express';
import { z } from 'zod';
import * as messagingService from '../services/messaging.service';
import { auditLogger } from '../utils/logger';

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
    const userId = (req as any).user?.userId;

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

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message,
    });
  } catch (error) {
    logger.error('Create message error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get messages for current user (inbox)
 */
export const getMessages = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { messageType, priority, isArchived, isRead, threadId, startDate, endDate } = req.query;

    const filters: messagingService.MessageFilters = {};

    if (messageType) filters.messageType = messageType as any;
    if (priority) filters.priority = priority as any;
    if (isArchived !== undefined) filters.isArchived = isArchived === 'true';
    if (isRead !== undefined) filters.isRead = isRead === 'true';
    if (threadId) filters.threadId = threadId as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const messages = await messagingService.getMessagesForUser(userId, filters);

    res.json({
      success: true,
      data: messages,
      count: messages.length,
    });
  } catch (error) {
    logger.error('Get messages error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve messages',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get sent messages
 */
export const getSentMessages = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    const messages = await messagingService.getSentMessages(userId);

    res.json({
      success: true,
      data: messages,
      count: messages.length,
    });
  } catch (error) {
    logger.error('Get sent messages error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve sent messages',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get unread message count
 */
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    const count = await messagingService.getUnreadCount(userId);

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    logger.error('Get unread count error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve unread count',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get message by ID
 */
export const getMessageById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;

    const message = await messagingService.getMessageById(id, userId);

    res.json({
      success: true,
      data: message,
    });
  } catch (error) {
    logger.error('Get message by ID error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof Error && error.message === 'Message not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve message',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Mark message as read
 */
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;

    const message = await messagingService.markAsRead(id, userId);

    res.json({
      success: true,
      message: 'Message marked as read',
      data: message,
    });
  } catch (error) {
    logger.error('Mark as read error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    res.status(500).json({
      success: false,
      message: 'Failed to mark message as read',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Archive a message
 */
export const archiveMessage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;

    const message = await messagingService.archiveMessage(id, userId);

    res.json({
      success: true,
      message: 'Message archived successfully',
      data: message,
    });
  } catch (error) {
    logger.error('Archive message error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    res.status(500).json({
      success: false,
      message: 'Failed to archive message',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Delete a message
 */
export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;

    await messagingService.deleteMessage(id, userId);

    res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    logger.error('Delete message error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
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
    const userId = (req as any).user?.userId;

    const channel = await messagingService.createChannel({
      name: validatedData.name,
      description: validatedData.description,
      channelType: validatedData.channelType,
      memberIds: validatedData.memberIds,
      adminIds: validatedData.adminIds,
      isPrivate: validatedData.isPrivate,
      createdById: userId,
    });

    res.status(201).json({
      success: true,
      message: 'Channel created successfully',
      data: channel,
    });
  } catch (error) {
    logger.error('Create channel error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create channel',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get channels for current user
 */
export const getChannels = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    const channels = await messagingService.getChannelsForUser(userId);

    res.json({
      success: true,
      data: channels,
      count: channels.length,
    });
  } catch (error) {
    logger.error('Get channels error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve channels',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get channel by ID
 */
export const getChannelById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;

    const channel = await messagingService.getChannelById(id, userId);

    res.json({
      success: true,
      data: channel,
    });
  } catch (error) {
    logger.error('Get channel by ID error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof Error && error.message === 'Channel not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve channel',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Update a channel
 */
export const updateChannel = async (req: Request, res: Response) => {
  try {
    const validatedData = updateChannelSchema.parse(req.body);
    const userId = (req as any).user?.userId;
    const { id } = req.params;

    const channel = await messagingService.updateChannel(id, userId, validatedData);

    res.json({
      success: true,
      message: 'Channel updated successfully',
      data: channel,
    });
  } catch (error) {
    logger.error('Update channel error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update channel',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Add member to channel
 */
export const addMember = async (req: Request, res: Response) => {
  try {
    const validatedData = addMemberSchema.parse(req.body);
    const userId = (req as any).user?.userId;
    const { id } = req.params;

    const channel = await messagingService.addMemberToChannel(id, userId, validatedData.memberId);

    res.json({
      success: true,
      message: 'Member added successfully',
      data: channel,
    });
  } catch (error) {
    logger.error('Add member error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to add member',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Remove member from channel
 */
export const removeMember = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { id, memberId } = req.params;

    const channel = await messagingService.removeMemberFromChannel(id, userId, memberId);

    res.json({
      success: true,
      message: 'Member removed successfully',
      data: channel,
    });
  } catch (error) {
    logger.error('Remove member error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    res.status(500).json({
      success: false,
      message: 'Failed to remove member',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Archive a channel
 */
export const archiveChannel = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;

    const channel = await messagingService.archiveChannel(id, userId);

    res.json({
      success: true,
      message: 'Channel archived successfully',
      data: channel,
    });
  } catch (error) {
    logger.error('Archive channel error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    res.status(500).json({
      success: false,
      message: 'Failed to archive channel',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
