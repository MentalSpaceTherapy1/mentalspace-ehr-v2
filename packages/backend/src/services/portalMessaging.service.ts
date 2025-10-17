import prisma from './database';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

interface SendMessageData {
  clientId: string;
  subject: string;
  message: string;
  recipientId?: string;
  priority?: string;
}

/**
 * Send message from client to clinician
 */
export async function sendMessage(data: SendMessageData) {
  try {
    const threadId = uuidv4();

    const message = await prisma.portalMessage.create({
      data: {
        clientId: data.clientId,
        subject: data.subject,
        message: data.message,
        sentByClient: true,
        sentBy: data.clientId,
        recipientId: data.recipientId,
        threadId,
        priority: data.priority || 'Normal',
        requiresResponse: true,
      },
    });

    logger.info('Portal message sent', {
      messageId: message.id,
      clientId: data.clientId,
    });

    return message;
  } catch (error: any) {
    logger.error('Failed to send portal message', {
      error: error.message,
      clientId: data.clientId,
    });
    throw error;
  }
}

/**
 * Get client's messages
 */
export async function getMessages(clientId: string) {
  try {
    const messages = await prisma.portalMessage.findMany({
      where: {
        clientId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return messages;
  } catch (error: any) {
    logger.error('Failed to get portal messages', {
      error: error.message,
      clientId,
    });
    throw error;
  }
}

/**
 * Get message thread
 */
export async function getMessageThread(threadId: string, clientId: string) {
  try {
    const messages = await prisma.portalMessage.findMany({
      where: {
        threadId,
        clientId, // Ensure client can only see their own messages
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return messages;
  } catch (error: any) {
    logger.error('Failed to get message thread', {
      error: error.message,
      threadId,
      clientId,
    });
    throw error;
  }
}

/**
 * Mark message as read
 */
export async function markAsRead(messageId: string, clientId: string) {
  try {
    const message = await prisma.portalMessage.findFirst({
      where: {
        id: messageId,
        clientId,
      },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    const updated = await prisma.portalMessage.update({
      where: { id: messageId },
      data: {
        isRead: true,
        readDate: new Date(),
      },
    });

    return updated;
  } catch (error: any) {
    logger.error('Failed to mark message as read', {
      error: error.message,
      messageId,
      clientId,
    });
    throw error;
  }
}

/**
 * Reply to message
 */
export async function replyToMessage(messageId: string, clientId: string, replyText: string) {
  try {
    const originalMessage = await prisma.portalMessage.findFirst({
      where: {
        id: messageId,
        clientId,
      },
    });

    if (!originalMessage) {
      throw new Error('Original message not found');
    }

    const reply = await prisma.portalMessage.create({
      data: {
        clientId,
        subject: `Re: ${originalMessage.subject}`,
        message: replyText,
        sentByClient: true,
        sentBy: clientId,
        recipientId: originalMessage.recipientId,
        threadId: originalMessage.threadId,
        parentMessageId: messageId,
        priority: originalMessage.priority,
      },
    });

    logger.info('Reply sent', {
      replyId: reply.id,
      originalMessageId: messageId,
      clientId,
    });

    return reply;
  } catch (error: any) {
    logger.error('Failed to send reply', {
      error: error.message,
      messageId,
      clientId,
    });
    throw error;
  }
}

/**
 * Get unread message count
 */
export async function getUnreadCount(clientId: string): Promise<number> {
  try {
    const count = await prisma.portalMessage.count({
      where: {
        clientId,
        isRead: false,
        sentByClient: false, // Only count messages sent TO the client
      },
    });

    return count;
  } catch (error: any) {
    logger.error('Failed to get unread count', {
      error: error.message,
      clientId,
    });
    throw error;
  }
}
