import { Request, Response } from 'express';

import logger from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../services/database';

/**
 * Get all messages for client (grouped by thread)
 * GET /api/v1/portal/messages
 */
export const getMessages = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get all messages for this client
    const messages = await prisma.portalMessage.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });

    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      subject: msg.subject,
      message: msg.message,
      sentByClient: msg.sentByClient,
      isRead: msg.isRead,
      createdAt: msg.createdAt,
      threadId: msg.threadId,
      priority: msg.priority || 'Normal',
      parentMessageId: msg.parentMessageId,
    }));

    logger.info(`Retrieved ${formattedMessages.length} messages for client ${clientId}`);

    return res.status(200).json({
      success: true,
      data: formattedMessages,
    });
  } catch (error: any) {
    logger.error('Error fetching messages:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
    });
  }
};

/**
 * Get messages in a specific thread
 * GET /api/v1/portal/messages/thread/:threadId
 */
export const getMessageThread = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;
    const { threadId } = req.params;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get all messages in this thread
    const messages = await prisma.portalMessage.findMany({
      where: {
        clientId,
        threadId,
      },
      orderBy: { createdAt: 'asc' },
    });

    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      subject: msg.subject,
      message: msg.message,
      sentByClient: msg.sentByClient,
      isRead: msg.isRead,
      createdAt: msg.createdAt,
      threadId: msg.threadId,
      priority: msg.priority || 'Normal',
      parentMessageId: msg.parentMessageId,
    }));

    logger.info(`Retrieved ${formattedMessages.length} messages in thread ${threadId} for client ${clientId}`);

    return res.status(200).json({
      success: true,
      data: formattedMessages,
    });
  } catch (error: any) {
    logger.error('Error fetching message thread:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation',
    });
  }
};

/**
 * Send a new message (start new thread)
 * POST /api/v1/portal/messages
 */
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;
    const { subject, message, priority } = req.body;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Validate input
    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required',
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
        priority: priority || 'Normal',
        sentByClient: true,
        sentBy: clientId,
        isRead: true, // Client's own messages are marked as read
      },
    });

    logger.info(`New message created by client ${clientId}: ${subject} (Thread: ${threadId})`);

    // TODO: Send notification to clinician/care team

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        id: newMessage.id,
        threadId: newMessage.threadId,
        subject: newMessage.subject,
        message: newMessage.message,
        priority: newMessage.priority,
        createdAt: newMessage.createdAt,
      },
    });
  } catch (error: any) {
    logger.error('Error sending message:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send message',
    });
  }
};

/**
 * Reply to a message in an existing thread
 * POST /api/v1/portal/messages/:messageId/reply
 */
export const replyToMessage = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;
    const { messageId } = req.params;
    const { message } = req.body;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Validate input
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }

    // Get the original message to find the thread
    const originalMessage = await prisma.portalMessage.findUnique({
      where: { id: messageId },
    });

    if (!originalMessage) {
      return res.status(404).json({
        success: false,
        message: 'Original message not found',
      });
    }

    // Verify the client owns this thread
    if (originalMessage.clientId !== clientId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to reply to this message',
      });
    }

    // Create the reply
    const reply = await prisma.portalMessage.create({
      data: {
        clientId,
        threadId: originalMessage.threadId,
        subject: originalMessage.subject, // Keep same subject in thread
        message: message.trim(),
        priority: originalMessage.priority,
        sentByClient: true,
        sentBy: clientId,
        isRead: true, // Client's own messages are marked as read
        parentMessageId: messageId,
      },
    });

    logger.info(`Reply created by client ${clientId} in thread ${originalMessage.threadId}`);

    // TODO: Send notification to clinician/care team

    return res.status(201).json({
      success: true,
      message: 'Reply sent successfully',
      data: {
        id: reply.id,
        threadId: reply.threadId,
        message: reply.message,
        createdAt: reply.createdAt,
      },
    });
  } catch (error: any) {
    logger.error('Error replying to message:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send reply',
    });
  }
};

/**
 * Mark a message as read
 * POST /api/v1/portal/messages/:messageId/read
 */
export const markMessageAsRead = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;
    const { messageId } = req.params;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

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

    // Verify the client owns this message
    if (message.clientId !== clientId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this message',
      });
    }

    // Mark as read
    await prisma.portalMessage.update({
      where: { id: messageId },
      data: { isRead: true },
    });

    logger.info(`Message ${messageId} marked as read by client ${clientId}`);

    return res.status(200).json({
      success: true,
      message: 'Message marked as read',
    });
  } catch (error: any) {
    logger.error('Error marking message as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark message as read',
    });
  }
};

/**
 * Get unread message count
 * GET /api/v1/portal/messages/unread-count
 */
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Count unread messages that were sent by clinician/staff (not by client)
    const unreadCount = await prisma.portalMessage.count({
      where: {
        clientId,
        isRead: false,
        sentByClient: false, // Only count messages from care team
      },
    });

    return res.status(200).json({
      success: true,
      data: { unreadCount },
    });
  } catch (error: any) {
    logger.error('Error getting unread count:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
    });
  }
};
