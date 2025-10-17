import { Request, Response } from 'express';
import { z } from 'zod';
import {
  sessionReviewsService,
  therapistChangeService,
  moodTrackingService,
} from '../services/portal';
import { PrismaClient } from '@mentalspace/database';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

const prisma = new PrismaClient();

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
        isEmailVerified: true,
        isActive: true,
        lastLoginAt: true,
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
      orderBy: { submittedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        rating: true,
        submittedAt: true,
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
    const activeHomework = await prisma.homework.count({
      where: {
        clientId,
        completedAt: null,
      },
    });

    // Get active goals
    const activeGoals = await prisma.therapeuticGoal.count({
      where: {
        clientId,
        status: 'IN_PROGRESS',
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
    const therapistId = (req as any).user?.id;
    const { clientId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

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

    // Get messages between therapist and client
    const messages = await prisma.secureMessage.findMany({
      where: {
        OR: [
          { senderId: clientId, recipientId: therapistId },
          { senderId: therapistId, recipientId: clientId },
        ],
      },
      orderBy: { sentAt: 'desc' },
      take: limit,
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        recipient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
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
