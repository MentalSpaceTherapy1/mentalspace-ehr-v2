import { auditLogger } from '../utils/logger';
import prisma from './database';
import { RecipientType, MessageType, MessagePriority, ChannelType } from '@mentalspace/database';

// ============================================================================
// MESSAGE OPERATIONS
// ============================================================================

export interface CreateMessageData {
  senderId: string;
  recipientType: RecipientType;
  recipientIds: string[];
  subject?: string;
  body: string;
  attachments?: string[];
  messageType?: MessageType;
  priority?: MessagePriority;
  threadId?: string;
  replyToId?: string;
  expiresAt?: Date;
}

export interface UpdateMessageData {
  subject?: string;
  body?: string;
  attachments?: string[];
  priority?: MessagePriority;
  expiresAt?: Date;
}

export interface MessageFilters {
  senderId?: string;
  recipientId?: string;
  messageType?: MessageType;
  priority?: MessagePriority;
  isArchived?: boolean;
  isRead?: boolean;
  threadId?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Create a new message
 */
export async function createMessage(data: CreateMessageData) {
  try {
    // Validate sender exists
    const sender = await prisma.user.findUnique({
      where: { id: data.senderId },
      select: { id: true, firstName: true, lastName: true, roles: true },
    });

    if (!sender) {
      throw new Error('Sender not found');
    }

    // Validate recipients based on recipient type
    if (data.recipientType === 'INDIVIDUAL') {
      const recipients = await prisma.user.findMany({
        where: { id: { in: data.recipientIds } },
        select: { id: true },
      });

      if (recipients.length !== data.recipientIds.length) {
        throw new Error('One or more recipients not found');
      }
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        senderId: data.senderId,
        recipientType: data.recipientType,
        recipientIds: data.recipientIds,
        subject: data.subject,
        body: data.body,
        attachments: data.attachments || [],
        messageType: data.messageType || 'DIRECT',
        priority: data.priority || 'NORMAL',
        threadId: data.threadId || undefined,
        replyToId: data.replyToId || undefined,
        expiresAt: data.expiresAt || undefined,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            roles: true,
          },
        },
      },
    });

    auditLogger.info('Message created', {
      userId: data.senderId,
      messageId: message.id,
      recipientType: data.recipientType,
      recipientCount: data.recipientIds.length,
      messageType: message.messageType,
      priority: message.priority,
      action: 'MESSAGE_CREATED',
    });

    return message;
  } catch (error) {
    auditLogger.error('Create message error', {
      userId: data.senderId,
      error: error instanceof Error ? error.message : 'Unknown error',
      action: 'MESSAGE_CREATE_FAILED',
    });
    throw error;
  }
}

/**
 * Get messages for a user (inbox)
 */
export async function getMessagesForUser(userId: string, filters: MessageFilters = {}) {
  try {
    const where: any = {
      OR: [
        { senderId: userId },
        { recipientIds: { has: userId } },
      ],
    };

    if (filters.messageType) {
      where.messageType = filters.messageType;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.isArchived !== undefined) {
      where.isArchived = filters.isArchived;
    }

    if (filters.threadId) {
      where.threadId = filters.threadId;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    // Filter by read status if specified
    if (filters.isRead !== undefined) {
      if (filters.isRead) {
        where.readBy = { has: userId };
      } else {
        where.NOT = { readBy: { has: userId } };
      }
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            roles: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            subject: true,
            sender: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return messages;
  } catch (error) {
    auditLogger.error('Get messages error', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      action: 'GET_MESSAGES_FAILED',
    });
    throw error;
  }
}

/**
 * Get sent messages for a user
 */
export async function getSentMessages(userId: string) {
  try {
    const messages = await prisma.message.findMany({
      where: { senderId: userId },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return messages;
  } catch (error) {
    auditLogger.error('Get sent messages error', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Get unread message count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const count = await prisma.message.count({
      where: {
        recipientIds: { has: userId },
        NOT: { readBy: { has: userId } },
        isArchived: false,
      },
    });

    return count;
  } catch (error) {
    auditLogger.error('Get unread count error', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Get a single message by ID
 */
export async function getMessageById(messageId: string, userId: string) {
  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            roles: true,
          },
        },
        replyTo: {
          include: {
            sender: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        replies: {
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Check if user has access to this message
    if (message.senderId !== userId && !message.recipientIds.includes(userId)) {
      throw new Error('Access denied');
    }

    return message;
  } catch (error) {
    auditLogger.error('Get message by ID error', {
      userId,
      messageId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Mark message as read
 */
export async function markAsRead(messageId: string, userId: string) {
  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { recipientIds: true, readBy: true, readAt: true },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (!message.recipientIds.includes(userId)) {
      throw new Error('Access denied');
    }

    // Don't update if already read by this user
    if (message.readBy.includes(userId)) {
      return message;
    }

    const readAt = message.readAt as Record<string, string> || {};
    readAt[userId] = new Date().toISOString();

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        readBy: {
          push: userId,
        },
        readAt,
      },
    });

    return updatedMessage;
  } catch (error) {
    auditLogger.error('Mark as read error', {
      userId,
      messageId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Archive a message
 */
export async function archiveMessage(messageId: string, userId: string) {
  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, recipientIds: true },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId && !message.recipientIds.includes(userId)) {
      throw new Error('Access denied');
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: { isArchived: true },
    });

    auditLogger.info('Message archived', {
      userId,
      messageId,
      action: 'MESSAGE_ARCHIVED',
    });

    return updatedMessage;
  } catch (error) {
    auditLogger.error('Archive message error', {
      userId,
      messageId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Delete a message (soft delete - archive it)
 */
export async function deleteMessage(messageId: string, userId: string) {
  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
      throw new Error('Only the sender can delete a message');
    }

    await prisma.message.update({
      where: { id: messageId },
      data: { isArchived: true },
    });

    auditLogger.info('Message deleted', {
      userId,
      messageId,
      action: 'MESSAGE_DELETED',
    });

    return { success: true };
  } catch (error) {
    auditLogger.error('Delete message error', {
      userId,
      messageId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// ============================================================================
// CHANNEL OPERATIONS
// ============================================================================

export interface CreateChannelData {
  name: string;
  description?: string;
  channelType: ChannelType;
  memberIds: string[];
  adminIds: string[];
  isPrivate?: boolean;
  createdById: string;
}

export interface UpdateChannelData {
  name?: string;
  description?: string;
  memberIds?: string[];
  adminIds?: string[];
  isPrivate?: boolean;
}

/**
 * Create a new channel
 */
export async function createChannel(data: CreateChannelData) {
  try {
    // Validate creator exists
    const creator = await prisma.user.findUnique({
      where: { id: data.createdById },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!creator) {
      throw new Error('Creator not found');
    }

    // Validate members exist
    const members = await prisma.user.findMany({
      where: { id: { in: data.memberIds } },
      select: { id: true },
    });

    if (members.length !== data.memberIds.length) {
      throw new Error('One or more members not found');
    }

    // Create the channel
    const channel = await prisma.channel.create({
      data: {
        name: data.name,
        description: data.description,
        channelType: data.channelType,
        memberIds: data.memberIds,
        adminIds: data.adminIds,
        isPrivate: data.isPrivate || false,
        createdById: data.createdById,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    auditLogger.info('Channel created', {
      userId: data.createdById,
      channelId: channel.id,
      channelName: channel.name,
      channelType: channel.channelType,
      memberCount: data.memberIds.length,
      action: 'CHANNEL_CREATED',
    });

    return channel;
  } catch (error) {
    auditLogger.error('Create channel error', {
      userId: data.createdById,
      error: error instanceof Error ? error.message : 'Unknown error',
      action: 'CHANNEL_CREATE_FAILED',
    });
    throw error;
  }
}

/**
 * Get all channels for a user
 */
export async function getChannelsForUser(userId: string) {
  try {
    const channels = await prisma.channel.findMany({
      where: {
        memberIds: { has: userId },
        isArchived: false,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return channels;
  } catch (error) {
    auditLogger.error('Get channels error', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Get channel by ID
 */
export async function getChannelById(channelId: string, userId: string) {
  try {
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!channel) {
      throw new Error('Channel not found');
    }

    // Check if user is a member
    if (!channel.memberIds.includes(userId)) {
      throw new Error('Access denied');
    }

    return channel;
  } catch (error) {
    auditLogger.error('Get channel by ID error', {
      userId,
      channelId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Update a channel
 */
export async function updateChannel(channelId: string, userId: string, data: UpdateChannelData) {
  try {
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { adminIds: true, createdById: true },
    });

    if (!channel) {
      throw new Error('Channel not found');
    }

    // Only admins or creator can update
    if (!channel.adminIds.includes(userId) && channel.createdById !== userId) {
      throw new Error('Only channel admins can update the channel');
    }

    const updatedChannel = await prisma.channel.update({
      where: { id: channelId },
      data,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    auditLogger.info('Channel updated', {
      userId,
      channelId,
      action: 'CHANNEL_UPDATED',
    });

    return updatedChannel;
  } catch (error) {
    auditLogger.error('Update channel error', {
      userId,
      channelId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Add member to channel
 */
export async function addMemberToChannel(channelId: string, userId: string, newMemberId: string) {
  try {
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { adminIds: true, memberIds: true, createdById: true },
    });

    if (!channel) {
      throw new Error('Channel not found');
    }

    if (!channel.adminIds.includes(userId) && channel.createdById !== userId) {
      throw new Error('Only channel admins can add members');
    }

    if (channel.memberIds.includes(newMemberId)) {
      throw new Error('User is already a member');
    }

    const updatedChannel = await prisma.channel.update({
      where: { id: channelId },
      data: {
        memberIds: {
          push: newMemberId,
        },
      },
    });

    auditLogger.info('Member added to channel', {
      userId,
      channelId,
      newMemberId,
      action: 'CHANNEL_MEMBER_ADDED',
    });

    return updatedChannel;
  } catch (error) {
    auditLogger.error('Add member error', {
      userId,
      channelId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Remove member from channel
 */
export async function removeMemberFromChannel(channelId: string, userId: string, memberIdToRemove: string) {
  try {
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { adminIds: true, memberIds: true, createdById: true },
    });

    if (!channel) {
      throw new Error('Channel not found');
    }

    if (!channel.adminIds.includes(userId) && channel.createdById !== userId) {
      throw new Error('Only channel admins can remove members');
    }

    const updatedMemberIds = channel.memberIds.filter((id) => id !== memberIdToRemove);

    const updatedChannel = await prisma.channel.update({
      where: { id: channelId },
      data: {
        memberIds: updatedMemberIds,
      },
    });

    auditLogger.info('Member removed from channel', {
      userId,
      channelId,
      removedMemberId: memberIdToRemove,
      action: 'CHANNEL_MEMBER_REMOVED',
    });

    return updatedChannel;
  } catch (error) {
    auditLogger.error('Remove member error', {
      userId,
      channelId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Archive a channel
 */
export async function archiveChannel(channelId: string, userId: string) {
  try {
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { createdById: true, adminIds: true },
    });

    if (!channel) {
      throw new Error('Channel not found');
    }

    if (channel.createdById !== userId && !channel.adminIds.includes(userId)) {
      throw new Error('Only channel creator or admins can archive the channel');
    }

    const updatedChannel = await prisma.channel.update({
      where: { id: channelId },
      data: { isArchived: true },
    });

    auditLogger.info('Channel archived', {
      userId,
      channelId,
      action: 'CHANNEL_ARCHIVED',
    });

    return updatedChannel;
  } catch (error) {
    auditLogger.error('Archive channel error', {
      userId,
      channelId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
