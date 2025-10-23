import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../services/database';
import {
  sessionReviewsService,
  therapistChangeService,
} from '../services/portal';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

// ============================================================================
// ADMIN: PORTAL OVERSIGHT
// These endpoints are for admin users only
// ============================================================================

// ============================================================================
// SESSION REVIEWS (Admin View - Including Private)
// ============================================================================

export const getAllReviews = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const clinicianId = req.query.clinicianId as string;
    const minRating = req.query.minRating ? parseInt(req.query.minRating as string) : undefined;
    const maxRating = req.query.maxRating ? parseInt(req.query.maxRating as string) : undefined;

    const reviews = await sessionReviewsService.getAllReviews({
      clinicianId,
      minRating,
      maxRating,
    });

    res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error: any) {
    logger.error('Error fetching all reviews:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch reviews',
    });
  }
};

export const getReviewStatistics = async (req: Request, res: Response) => {
  try {
    const clinicianId = req.query.clinicianId as string;

    const stats = await sessionReviewsService.getReviewStatistics(clinicianId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Error fetching review statistics:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch statistics',
    });
  }
};

// ============================================================================
// THERAPIST CHANGE REQUESTS (Admin Workflow)
// ============================================================================

export const getAllChangeRequests = async (req: Request, res: Response) => {
  try {
    const status = req.query.status as any;
    const clinicianId = req.query.clinicianId as string;
    const isSensitive = req.query.isSensitive === 'true';

    const requests = await therapistChangeService.getAllChangeRequests({
      status,
      onlySensitive: isSensitive,
    });

    res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error: any) {
    logger.error('Error fetching change requests:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch change requests',
    });
  }
};

const reviewChangeRequestSchema = z.object({
  reviewNotes: z.string().optional(),
});

export const reviewChangeRequest = async (req: Request, res: Response) => {
  try {
    const adminUserId = (req as any).user?.id;
    const { requestId } = req.params;
    const data = reviewChangeRequestSchema.parse(req.body);

    const request = await therapistChangeService.reviewChangeRequest({
      adminUserId,
      requestId,
      reviewNotes: data.reviewNotes,
    });

    res.status(200).json({
      success: true,
      message: 'Change request marked as under review',
      data: request,
    });
  } catch (error: any) {
    logger.error('Error reviewing change request:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to review change request',
    });
  }
};

const assignNewTherapistSchema = z.object({
  newClinicianId: z.string().uuid(),
});

export const assignNewTherapist = async (req: Request, res: Response) => {
  try {
    const adminUserId = (req as any).user?.id;
    const { requestId } = req.params;
    const data = assignNewTherapistSchema.parse(req.body);

    const request = await therapistChangeService.assignNewTherapist({
      adminUserId,
      requestId,
      newClinicianId: data.newClinicianId,
    });

    res.status(200).json({
      success: true,
      message: 'New therapist assigned. Ready to complete transfer.',
      data: request,
    });
  } catch (error: any) {
    logger.error('Error assigning new therapist:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to assign new therapist',
    });
  }
};

export const completeTransfer = async (req: Request, res: Response) => {
  try {
    const adminUserId = (req as any).user?.id;
    const { requestId } = req.params;

    const request = await therapistChangeService.completeTransfer({
      adminUserId,
      requestId,
    });

    res.status(200).json({
      success: true,
      message: 'Therapist transfer completed successfully',
      data: request,
    });
  } catch (error: any) {
    logger.error('Error completing transfer:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to complete transfer',
    });
  }
};

const denyChangeRequestSchema = z.object({
  denialReason: z.string().min(1),
});

export const denyChangeRequest = async (req: Request, res: Response) => {
  try {
    const adminUserId = (req as any).user?.id;
    const { requestId } = req.params;
    const data = denyChangeRequestSchema.parse(req.body);

    const request = await therapistChangeService.denyChangeRequest({
      adminUserId,
      requestId,
      denialReason: data.denialReason,
    });

    res.status(200).json({
      success: true,
      message: 'Change request denied',
      data: request,
    });
  } catch (error: any) {
    logger.error('Error denying change request:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to deny change request',
    });
  }
};

export const getChangeRequestStatistics = async (req: Request, res: Response) => {
  try {
    const clinicianId = req.query.clinicianId as string | undefined;

    const stats = await therapistChangeService.getChangeRequestStatistics({
      clinicianId,
    });

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Error fetching change request statistics:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch statistics',
    });
  }
};

// ============================================================================
// PORTAL ACCOUNTS (Admin Management)
// ============================================================================

export const getAllPortalAccounts = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

    const where: any = {};
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

    res.status(200).json({
      success: true,
      data: {
        accounts,
        total,
        limit,
        offset,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching portal accounts:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch portal accounts',
    });
  }
};

export const activatePortalAccount = async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;

    const account = await prisma.portalAccount.update({
      where: { id: accountId },
      data: { accountStatus: 'ACTIVE' },
    });

    logger.info(`Portal account ${accountId} activated by admin ${(req as any).user?.id}`);

    res.status(200).json({
      success: true,
      message: 'Portal account activated',
      data: account,
    });
  } catch (error: any) {
    logger.error('Error activating portal account:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to activate portal account',
    });
  }
};

export const deactivatePortalAccount = async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;

    const account = await prisma.portalAccount.update({
      where: { id: accountId },
      data: { accountStatus: 'INACTIVE' },
    });

    logger.info(`Portal account ${accountId} deactivated by admin ${(req as any).user?.id}`);

    res.status(200).json({
      success: true,
      message: 'Portal account deactivated',
      data: account,
    });
  } catch (error: any) {
    logger.error('Error deactivating portal account:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to deactivate portal account',
    });
  }
};

// ============================================================================
// PORTAL ANALYTICS (Admin Dashboard)
// ============================================================================

export const getPortalAnalytics = async (req: Request, res: Response) => {
  try {
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

    res.status(200).json({
      success: true,
      data: {
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
      },
    });
  } catch (error: any) {
    logger.error('Error fetching portal analytics:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch portal analytics',
    });
  }
};
