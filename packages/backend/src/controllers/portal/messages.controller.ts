import { Response } from 'express';

import logger from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../services/database';
import { PortalRequest } from '../../types/express.d';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound, sendForbidden, sendServerError } from '../../utils/apiResponse';

/**
 * Get all messages for client (grouped by thread)
 * GET /api/v1/portal/messages
 */
export const getMessages = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
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

    return sendSuccess(res, formattedMessages);
  } catch (error) {
    logger.error('Error fetching messages:', error);
    return sendServerError(res, 'Failed to fetch messages');
  }
};

/**
 * Get messages in a specific thread
 * GET /api/v1/portal/messages/thread/:threadId
 */
export const getMessageThread = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { threadId } = req.params;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
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

    return sendSuccess(res, formattedMessages);
  } catch (error) {
    logger.error('Error fetching message thread:', error);
    return sendServerError(res, 'Failed to fetch conversation');
  }
};

/**
 * Send a new message (start new thread)
 * POST /api/v1/portal/messages
 */
export const sendMessage = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { subject, message, priority } = req.body;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Validate input
    if (!subject || !message) {
      return sendBadRequest(res, 'Subject and message are required');
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

    return sendCreated(res, {
      id: newMessage.id,
      threadId: newMessage.threadId,
      subject: newMessage.subject,
      message: newMessage.message,
      priority: newMessage.priority,
      createdAt: newMessage.createdAt,
    }, 'Message sent successfully');
  } catch (error) {
    logger.error('Error sending message:', error);
    return sendServerError(res, 'Failed to send message');
  }
};

/**
 * Reply to a message in an existing thread
 * POST /api/v1/portal/messages/:messageId/reply
 */
export const replyToMessage = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { messageId } = req.params;
    const { message } = req.body;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Validate input
    if (!message) {
      return sendBadRequest(res, 'Message is required');
    }

    // Get the original message to find the thread
    const originalMessage = await prisma.portalMessage.findUnique({
      where: { id: messageId },
    });

    if (!originalMessage) {
      return sendNotFound(res, 'Original message');
    }

    // Verify the client owns this thread
    if (originalMessage.clientId !== clientId) {
      return sendForbidden(res, 'You do not have permission to reply to this message');
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

    return sendCreated(res, {
      id: reply.id,
      threadId: reply.threadId,
      message: reply.message,
      createdAt: reply.createdAt,
    }, 'Reply sent successfully');
  } catch (error) {
    logger.error('Error replying to message:', error);
    return sendServerError(res, 'Failed to send reply');
  }
};

/**
 * Mark a message as read
 * POST /api/v1/portal/messages/:messageId/read
 */
export const markMessageAsRead = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { messageId } = req.params;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Get the message
    const message = await prisma.portalMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return sendNotFound(res, 'Message');
    }

    // Verify the client owns this message
    if (message.clientId !== clientId) {
      return sendForbidden(res, 'You do not have permission to modify this message');
    }

    // Mark as read
    await prisma.portalMessage.update({
      where: { id: messageId },
      data: { isRead: true },
    });

    logger.info(`Message ${messageId} marked as read by client ${clientId}`);

    return sendSuccess(res, null, 'Message marked as read');
  } catch (error) {
    logger.error('Error marking message as read:', error);
    return sendServerError(res, 'Failed to mark message as read');
  }
};

/**
 * Get unread message count
 * GET /api/v1/portal/messages/unread-count
 */
export const getUnreadCount = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Count unread messages that were sent by clinician/staff (not by client)
    const unreadCount = await prisma.portalMessage.count({
      where: {
        clientId,
        isRead: false,
        sentByClient: false, // Only count messages from care team
      },
    });

    return sendSuccess(res, { unreadCount });
  } catch (error) {
    logger.error('Error getting unread count:', error);
    return sendServerError(res, 'Failed to get unread count');
  }
};
