/**
 * Portal Admin Service
 * Phase 3.2: Moved database operations from controller to service
 */

import prisma from './database';
import { Prisma } from '@mentalspace/database';
import logger from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface PortalAccountFilters {
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface PortalAnalytics {
  accounts: {
    total: number;
    active: number;
    verified: number;
    recentRegistrations: number;
    activeUsers: number;
  };
  reviews: {
    total: number;
    avgRating: number;
  };
  changeRequests: {
    pending: number;
    sensitive: number;
  };
  moodTracking: {
    total: number;
    last30Days: number;
  };
  engagement: {
    totalCheckIns: number;
    avgStreak: number;
  };
}

// ============================================================================
// SERVICE METHODS
// ============================================================================

/**
 * Get all portal accounts with pagination and filtering
 */
export async function getAllPortalAccounts(filters: PortalAccountFilters) {
  const { isActive, limit = 50, offset = 0 } = filters;

  const where: Prisma.PortalAccountWhereInput = {};
  if (isActive !== undefined) {
    where.accountStatus = isActive ? 'ACTIVE' : 'INACTIVE';
  }

  const [accounts, total] = await Promise.all([
    prisma.portalAccount.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            primaryTherapistId: true,
          },
        },
      },
    }),
    prisma.portalAccount.count({ where }),
  ]);

  return {
    accounts,
    total,
    limit,
    offset,
  };
}

/**
 * Activate a portal account
 */
export async function activatePortalAccount(accountId: string, adminUserId: string) {
  const account = await prisma.portalAccount.update({
    where: { id: accountId },
    data: { accountStatus: 'ACTIVE' },
  });

  logger.info(`Portal account ${accountId} activated by admin ${adminUserId}`);

  return account;
}

/**
 * Deactivate a portal account
 */
export async function deactivatePortalAccount(accountId: string, adminUserId: string) {
  const account = await prisma.portalAccount.update({
    where: { id: accountId },
    data: { accountStatus: 'INACTIVE' },
  });

  logger.info(`Portal account ${accountId} deactivated by admin ${adminUserId}`);

  return account;
}

/**
 * Get portal analytics for admin dashboard
 */
export async function getPortalAnalytics(): Promise<PortalAnalytics> {
  // Total portal accounts
  const totalAccounts = await prisma.portalAccount.count();
  const activeAccounts = await prisma.portalAccount.count({
    where: { accountStatus: 'ACTIVE' },
  });
  const verifiedAccounts = await prisma.portalAccount.count({
    where: { emailVerified: true },
  });

  // Recent registrations (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentRegistrations = await prisma.portalAccount.count({
    where: {
      createdAt: { gte: thirtyDaysAgo },
    },
  });

  // Active users (logged in last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const activeUsers = await prisma.portalAccount.count({
    where: {
      lastLoginDate: { gte: sevenDaysAgo },
    },
  });

  // Session reviews
  const totalReviews = await prisma.sessionReview.count();
  const avgRating = await prisma.sessionReview.aggregate({
    _avg: { rating: true },
  });

  // Therapist change requests
  const pendingChangeRequests = await prisma.therapistChangeRequest.count({
    where: { status: 'PENDING' },
  });
  const sensitiveChangeRequests = await prisma.therapistChangeRequest.count({
    where: { status: 'PENDING', isSensitive: true },
  });

  // Mood tracking
  const totalMoodEntries = await prisma.moodEntry.count();
  const moodEntriesLast30Days = await prisma.moodEntry.count({
    where: {
      entryDate: { gte: thirtyDaysAgo },
    },
  });

  // Engagement
  const totalCheckIns = await prisma.engagementStreak.aggregate({
    _sum: { totalCheckIns: true },
  });

  const avgStreak = await prisma.engagementStreak.aggregate({
    _avg: { currentStreak: true },
  });

  return {
    accounts: {
      total: totalAccounts,
      active: activeAccounts,
      verified: verifiedAccounts,
      recentRegistrations,
      activeUsers,
    },
    reviews: {
      total: totalReviews,
      avgRating: avgRating._avg.rating || 0,
    },
    changeRequests: {
      pending: pendingChangeRequests,
      sensitive: sensitiveChangeRequests,
    },
    moodTracking: {
      total: totalMoodEntries,
      last30Days: moodEntriesLast30Days,
    },
    engagement: {
      totalCheckIns: totalCheckIns._sum.totalCheckIns || 0,
      avgStreak: avgStreak._avg.currentStreak || 0,
    },
  };
}
