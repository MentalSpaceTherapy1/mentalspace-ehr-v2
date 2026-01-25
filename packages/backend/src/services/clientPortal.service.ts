/**
 * Client Portal Service
 * Phase 3.2: Extracted from clientPortal.controller.ts
 *
 * Handles all database operations for client portal module:
 * - Portal activity data
 * - Portal messaging
 * - Client access verification
 * - Portal status
 */

import prisma from './database';
import { UserRoles } from '@mentalspace/shared';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ClientBasicInfo {
  id: string;
  firstName: string;
  lastName: string;
  medicalRecordNumber?: string | null;
}

interface PortalAccountInfo {
  id: string;
  email: string;
  emailVerified: boolean;
  accountStatus: string;
  lastLoginDate: Date | null;
  createdAt: Date;
}

interface MoodEntry {
  id: string;
  moodScore: number;
  entryDate: Date;
  timeOfDay: string | null;
  symptoms: string[];
}

interface SessionReviewSummary {
  id: string;
  rating: number;
  createdAt: Date;
  isAnonymous: boolean;
}

interface EngagementStreakInfo {
  currentStreak: number;
  longestStreak: number;
  totalCheckIns: number;
  lastCheckInDate: Date | null;
}

interface ClientPortalActivity {
  portalAccount: PortalAccountInfo | null;
  recentMoods: MoodEntry[];
  recentReviews: SessionReviewSummary[];
  engagementStreak: EngagementStreakInfo | null;
  activeHomework: number;
  activeGoals: number;
}

interface InboxOptions {
  isRead?: boolean;
  limit?: number;
  offset?: number;
  clientId?: string;
}

interface InboxResult {
  messages: any[];
  unreadCount: number;
  totalCount: number;
}

interface SendMessageData {
  clientId: string;
  subject: string;
  message: string;
  priority?: string;
}

interface ClientForMessaging {
  id: string;
  firstName: string;
  lastName: string;
  medicalRecordNumber: string | null;
  email: string | null;
  hasPortalAccess: boolean;
}

interface PortalStatusResult {
  hasPortalAccount: boolean;
  message?: string;
  portalAccount?: {
    id: string;
    email: string;
    emailVerified: boolean;
    accountStatus: string;
    portalAccessGranted: boolean;
    lastLoginDate: Date | null;
    failedLoginAttempts: number;
    accountLockedUntil: Date | null;
    mustChangePassword: boolean;
    tempPasswordExpiry: Date | null;
    passwordExpiresAt: Date | null;
    createdAt: Date;
    isLocked: boolean;
    hasTempPassword: boolean;
    tempPasswordExpired: boolean;
    passwordExpired: boolean;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user has admin role
 */
function isAdminRole(role: string | undefined): boolean {
  return role === UserRoles.ADMINISTRATOR || role === UserRoles.SUPER_ADMIN || role === UserRoles.SUPERVISOR;
}

// ============================================================================
// CLIENT ACCESS VERIFICATION
// ============================================================================

/**
 * Verify that a therapist has access to a client
 */
export async function verifyTherapistClientAccess(
  therapistId: string,
  clientId: string
): Promise<ClientBasicInfo | null> {
  return prisma.client.findFirst({
    where: {
      id: clientId,
      primaryTherapistId: therapistId,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  });
}

/**
 * Verify that a user (admin or therapist) has access to a client
 */
export async function verifyUserClientAccess(
  userId: string,
  userRole: string | undefined,
  clientId: string
): Promise<ClientBasicInfo | null> {
  if (isAdminRole(userRole)) {
    return prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, firstName: true, lastName: true },
    });
  }

  return prisma.client.findFirst({
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

// ============================================================================
// PORTAL ACTIVITY
// ============================================================================

/**
 * Get portal activity data for a client (therapist view)
 */
export async function getClientPortalActivity(
  therapistId: string,
  clientId: string
): Promise<ClientPortalActivity> {
  // Verify therapist has access to this client
  const client = await verifyTherapistClientAccess(therapistId, clientId);

  if (!client) {
    throw new AppError('Client not found or not assigned to you', 404);
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    portalAccount,
    recentMoods,
    recentReviews,
    engagementStreak,
    activeHomework,
    activeGoals,
  ] = await Promise.all([
    // Get portal account status
    prisma.portalAccount.findUnique({
      where: { clientId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        accountStatus: true,
        lastLoginDate: true,
        createdAt: true,
      },
    }),
    // Get recent mood entries (shared only)
    prisma.moodEntry.findMany({
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
    }),
    // Get recent session reviews (shared only)
    prisma.sessionReview.findMany({
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
    }),
    // Get engagement streak
    prisma.engagementStreak.findUnique({
      where: { clientId },
      select: {
        currentStreak: true,
        longestStreak: true,
        totalCheckIns: true,
        lastCheckInDate: true,
      },
    }),
    // Count active homework
    prisma.homeworkAssignment.count({
      where: {
        clientId,
        completedAt: null,
      },
    }),
    // Count active goals
    prisma.therapeuticGoal.count({
      where: {
        clientId,
        status: 'ACTIVE',
      },
    }),
  ]);

  return {
    portalAccount,
    recentMoods,
    recentReviews,
    engagementStreak,
    activeHomework,
    activeGoals,
  };
}

// ============================================================================
// MESSAGING
// ============================================================================

/**
 * Get messages for a specific client
 */
export async function getClientMessages(
  userId: string,
  userRole: string | undefined,
  clientId: string,
  limit: number = 50
): Promise<any[]> {
  // Verify user has access to this client
  const client = await verifyUserClientAccess(userId, userRole, clientId);

  if (!client) {
    throw new AppError('Client not found or not assigned to you', 404);
  }

  return prisma.portalMessage.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Get assigned clients for a user (admin or therapist)
 */
async function getAssignedClientIds(
  userId: string,
  userRole: string | undefined,
  activePortalOnly: boolean = false
): Promise<ClientBasicInfo[]> {
  const whereClause: Prisma.ClientWhereInput = activePortalOnly
    ? {
        status: 'ACTIVE',
        portalAccount: { accountStatus: 'ACTIVE' },
      }
    : {};

  if (!isAdminRole(userRole)) {
    whereClause.OR = [
      { primaryTherapistId: userId },
      { secondaryTherapistId: userId },
    ];
  }

  return prisma.client.findMany({
    where: whereClause,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      medicalRecordNumber: true,
    },
  });
}

/**
 * Get therapist portal inbox
 */
export async function getTherapistPortalInbox(
  userId: string,
  userRole: string | undefined,
  options: InboxOptions = {}
): Promise<InboxResult> {
  const { isRead, limit = 50, offset = 0, clientId } = options;

  const assignedClients = await getAssignedClientIds(userId, userRole, true);
  const clientIds = assignedClients.map(c => c.id);

  if (clientIds.length === 0) {
    return { messages: [], unreadCount: 0, totalCount: 0 };
  }

  // Build where clause
  const where: Prisma.PortalMessageWhereInput = {
    clientId: { in: clientIds },
  };

  if (clientId) {
    where.clientId = clientId;
  }

  if (isRead !== undefined) {
    where.isRead = isRead;
  }

  const [messages, unreadCount, totalCount] = await Promise.all([
    prisma.portalMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    // Unread count only for messages FROM clients
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

  logger.info(`User ${userId} (admin: ${isAdminRole(userRole)}) retrieved portal inbox: ${messages.length} messages`);

  return { messages: enrichedMessages, unreadCount, totalCount };
}

/**
 * Get unread portal message count for therapist
 */
export async function getTherapistUnreadCount(
  userId: string,
  userRole: string | undefined
): Promise<number> {
  const assignedClients = await getAssignedClientIds(userId, userRole, true);
  const clientIds = assignedClients.map(c => c.id);

  if (clientIds.length === 0) {
    return 0;
  }

  return prisma.portalMessage.count({
    where: {
      clientId: { in: clientIds },
      sentByClient: true,
      isRead: false,
    },
  });
}

/**
 * Reply to a portal message
 */
export async function replyToPortalMessage(
  userId: string,
  messageId: string,
  replyText: string
): Promise<any> {
  // Get the original message
  const originalMessage = await prisma.portalMessage.findUnique({
    where: { id: messageId },
  });

  if (!originalMessage) {
    throw new AppError('Original message not found', 404);
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
    throw new AppError('You are not authorized to reply to this message', 403);
  }

  // Use existing threadId or create one from the original message's id
  const threadId = originalMessage.threadId || messageId;

  // If the original message doesn't have a threadId, update it
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
      sentByClient: false,
      sentBy: userId,
      recipientId: originalMessage.clientId,
      threadId: threadId,
      parentMessageId: messageId,
      priority: originalMessage.priority,
      isRead: false,
    },
  });

  // Mark the original message as read
  await prisma.portalMessage.update({
    where: { id: messageId },
    data: {
      isRead: true,
      readDate: new Date(),
    },
  });

  logger.info(`Therapist ${userId} replied to portal message ${messageId}`);

  return reply;
}

/**
 * Mark a portal message as read
 */
export async function markMessageAsRead(
  userId: string,
  messageId: string
): Promise<any> {
  // Get the message
  const message = await prisma.portalMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new AppError('Message not found', 404);
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
    throw new AppError('You are not authorized to access this message', 403);
  }

  const updated = await prisma.portalMessage.update({
    where: { id: messageId },
    data: {
      isRead: true,
      readDate: new Date(),
    },
  });

  logger.info(`Therapist ${userId} marked portal message ${messageId} as read`);

  return updated;
}

/**
 * Send a new message to a client
 */
export async function sendMessageToClient(
  userId: string,
  userRole: string | undefined,
  data: SendMessageData
): Promise<{ message: any; client: ClientBasicInfo }> {
  const { clientId, subject, message, priority } = data;

  // Verify user has access to this client
  const client = await verifyUserClientAccess(userId, userRole, clientId);

  if (!client) {
    throw new AppError('You are not authorized to message this client', 403);
  }

  // Generate a new thread ID
  const threadId = uuidv4();

  // Create the message
  const newMessage = await prisma.portalMessage.create({
    data: {
      clientId,
      threadId,
      subject: subject.trim(),
      message: message.trim(),
      priority: priority || 'NORMAL',
      sentByClient: false,
      sentBy: userId,
      recipientId: clientId,
      isRead: false,
    },
  });

  logger.info(`Therapist ${userId} sent new message to client ${clientId}: ${subject} (Thread: ${threadId})`);

  return { message: newMessage, client };
}

/**
 * Get assigned clients for messaging
 */
export async function getAssignedClientsForMessaging(
  userId: string,
  userRole: string | undefined
): Promise<ClientForMessaging[]> {
  const whereClause: Prisma.ClientWhereInput = {
    status: 'ACTIVE',
  };

  if (!isAdminRole(userRole)) {
    whereClause.OR = [
      { primaryTherapistId: userId },
      { secondaryTherapistId: userId },
    ];
  }

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

  return clientsWithPortal.map(c => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    medicalRecordNumber: c.medicalRecordNumber,
    email: c.email,
    hasPortalAccess: c.portalAccount?.accountStatus === 'ACTIVE',
  }));
}

// ============================================================================
// PORTAL STATUS
// ============================================================================

/**
 * Get client portal account status
 */
export async function getClientPortalStatus(clientId: string): Promise<PortalStatusResult> {
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
    return {
      hasPortalAccount: false,
      message: 'Client does not have a portal account',
    };
  }

  const isLocked = portalAccount.accountLockedUntil && portalAccount.accountLockedUntil > new Date();
  const hasTempPassword = portalAccount.mustChangePassword && !!portalAccount.tempPasswordExpiry;
  const tempPasswordExpired = hasTempPassword && portalAccount.tempPasswordExpiry && portalAccount.tempPasswordExpiry < new Date();
  const passwordExpired = portalAccount.passwordExpiresAt && portalAccount.passwordExpiresAt < new Date();

  return {
    hasPortalAccount: true,
    portalAccount: {
      ...portalAccount,
      isLocked: !!isLocked,
      hasTempPassword,
      tempPasswordExpired: !!tempPasswordExpired,
      passwordExpired: !!passwordExpired,
    },
  };
}
