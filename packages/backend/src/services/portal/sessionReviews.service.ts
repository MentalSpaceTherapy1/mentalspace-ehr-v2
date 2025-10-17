import { PrismaClient } from '@mentalspace/database';
import { AppError } from '../../utils/errors';
import logger from '../../utils/logger';

const prisma = new PrismaClient();

// ============================================================================
// SESSION REVIEWS (Client-side)
// ============================================================================

export async function createSessionReview(data: {
  clientId: string;
  appointmentId: string;
  rating: number;
  feedback?: string;
  categories?: {
    effectiveness?: number;
    alliance?: number;
    environment?: number;
    technology?: number;
    scheduling?: number;
  };
  isSharedWithClinician: boolean;
  isAnonymous?: boolean;
}) {
  try {
    // Verify appointment exists and belongs to client
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: data.appointmentId,
        clientId: data.clientId,
        status: 'COMPLETED', // Only completed appointments can be reviewed
      },
      select: {
        id: true,
        clinicianId: true,
        appointmentDate: true,
      },
    });

    if (!appointment) {
      throw new AppError('Appointment not found or not eligible for review', 404);
    }

    // Check if already reviewed
    const existing = await prisma.sessionReview.findUnique({
      where: { appointmentId: data.appointmentId },
    });

    if (existing) {
      throw new AppError('This session has already been reviewed', 400);
    }

    // Validate rating (1-5)
    if (data.rating < 1 || data.rating > 5) {
      throw new AppError('Rating must be between 1 and 5', 400);
    }

    // Create review
    const review = await prisma.sessionReview.create({
      data: {
        appointmentId: data.appointmentId,
        clientId: data.clientId,
        clinicianId: appointment.clinicianId,
        rating: data.rating,
        feedback: data.feedback,
        categories: data.categories || {},
        isSharedWithClinician: data.isSharedWithClinician,
        isAnonymous: data.isAnonymous || false,
      },
    });

    logger.info(`Session review created for appointment ${data.appointmentId}, rating: ${data.rating}, shared: ${data.isSharedWithClinician}`);

    // If shared with clinician, could trigger notification here
    if (data.isSharedWithClinician) {
      // TODO: Send notification to clinician
    }

    return review;
  } catch (error) {
    logger.error('Error creating session review:', error);
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to create session review', 500);
  }
}

export async function getClientReviews(clientId: string) {
  try {
    const reviews = await prisma.sessionReview.findMany({
      where: { clientId },
      include: {
        appointment: {
          select: {
            appointmentDate: true,
            appointmentType: true,
          },
        },
        clinician: {
          select: {
            firstName: true,
            lastName: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews;
  } catch (error) {
    logger.error('Error fetching client reviews:', error);
    throw new AppError('Failed to fetch reviews', 500);
  }
}

export async function updateReviewSharing(data: {
  clientId: string;
  reviewId: string;
  isSharedWithClinician: boolean;
}) {
  try {
    const review = await prisma.sessionReview.findFirst({
      where: {
        id: data.reviewId,
        clientId: data.clientId, // Security: ensure review belongs to client
      },
    });

    if (!review) {
      throw new AppError('Review not found', 404);
    }

    const updated = await prisma.sessionReview.update({
      where: { id: data.reviewId },
      data: { isSharedWithClinician: data.isSharedWithClinician },
    });

    logger.info(`Review ${data.reviewId} sharing updated to: ${data.isSharedWithClinician}`);
    return updated;
  } catch (error) {
    logger.error('Error updating review sharing:', error);
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update review sharing', 500);
  }
}

// ============================================================================
// SESSION REVIEWS (Therapist-side - EHR)
// ============================================================================

export async function getTherapistReviews(data: {
  clinicianId: string;
  includePrivate?: boolean;
}) {
  try {
    const where: any = {
      clinicianId: data.clinicianId,
    };

    // If not admin, only show shared reviews
    if (!data.includePrivate) {
      where.isSharedWithClinician = true;
    }

    const reviews = await prisma.sessionReview.findMany({
      where,
      include: {
        appointment: {
          select: {
            appointmentDate: true,
            appointmentType: true,
          },
        },
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // If anonymous, hide client name
    return reviews.map((review) => ({
      ...review,
      client: review.isAnonymous
        ? { firstName: 'Anonymous', lastName: 'Client' }
        : review.client,
    }));
  } catch (error) {
    logger.error('Error fetching therapist reviews:', error);
    throw new AppError('Failed to fetch therapist reviews', 500);
  }
}

export async function markReviewAsViewed(data: {
  clinicianId: string;
  reviewId: string;
}) {
  try {
    const review = await prisma.sessionReview.findFirst({
      where: {
        id: data.reviewId,
        clinicianId: data.clinicianId,
        isSharedWithClinician: true,
      },
    });

    if (!review) {
      throw new AppError('Review not found or not accessible', 404);
    }

    const updated = await prisma.sessionReview.update({
      where: { id: data.reviewId },
      data: {
        clinicianViewed: true,
        clinicianViewedAt: new Date(),
      },
    });

    return updated;
  } catch (error) {
    logger.error('Error marking review as viewed:', error);
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to mark review as viewed', 500);
  }
}

export async function respondToReview(data: {
  clinicianId: string;
  reviewId: string;
  response: string;
}) {
  try {
    const review = await prisma.sessionReview.findFirst({
      where: {
        id: data.reviewId,
        clinicianId: data.clinicianId,
        isSharedWithClinician: true,
      },
    });

    if (!review) {
      throw new AppError('Review not found or not accessible', 404);
    }

    const updated = await prisma.sessionReview.update({
      where: { id: data.reviewId },
      data: {
        clinicianResponse: data.response,
        clinicianRespondedAt: new Date(),
      },
    });

    logger.info(`Clinician responded to review ${data.reviewId}`);

    // TODO: Notify client of response

    return updated;
  } catch (error) {
    logger.error('Error responding to review:', error);
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to respond to review', 500);
  }
}

// ============================================================================
// SESSION REVIEWS (Admin-side)
// ============================================================================

export async function getAllReviews(filters?: {
  clinicianId?: string;
  minRating?: number;
  maxRating?: number;
  startDate?: Date;
  endDate?: Date;
  onlyPrivate?: boolean;
}) {
  try {
    const where: any = {};

    if (filters?.clinicianId) {
      where.clinicianId = filters.clinicianId;
    }

    if (filters?.minRating) {
      where.rating = { ...where.rating, gte: filters.minRating };
    }

    if (filters?.maxRating) {
      where.rating = { ...where.rating, lte: filters.maxRating };
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    if (filters?.onlyPrivate) {
      where.isSharedWithClinician = false;
    }

    const reviews = await prisma.sessionReview.findMany({
      where,
      include: {
        appointment: {
          select: {
            appointmentDate: true,
            appointmentType: true,
          },
        },
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        clinician: {
          select: {
            firstName: true,
            lastName: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews;
  } catch (error) {
    logger.error('Error fetching all reviews:', error);
    throw new AppError('Failed to fetch all reviews', 500);
  }
}

export async function getReviewStatistics(clinicianId?: string) {
  try {
    const where: any = {};
    if (clinicianId) {
      where.clinicianId = clinicianId;
    }

    const [totalReviews, averageRating, ratingDistribution] = await Promise.all([
      prisma.sessionReview.count({ where }),
      prisma.sessionReview.aggregate({
        where,
        _avg: { rating: true },
      }),
      prisma.sessionReview.groupBy({
        by: ['rating'],
        where,
        _count: { rating: true },
      }),
    ]);

    return {
      totalReviews,
      averageRating: averageRating._avg.rating || 0,
      ratingDistribution: ratingDistribution.reduce(
        (acc, curr) => {
          acc[curr.rating] = curr._count.rating;
          return acc;
        },
        {} as Record<number, number>
      ),
    };
  } catch (error) {
    logger.error('Error fetching review statistics:', error);
    throw new AppError('Failed to fetch review statistics', 500);
  }
}

// ============================================================================
// REVIEW PROMPTS (Automated)
// ============================================================================

export async function getEligibleAppointmentsForReview() {
  try {
    // Find completed appointments from 24-48 hours ago without reviews
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const appointments = await prisma.appointment.findMany({
      where: {
        status: 'COMPLETED',
        appointmentDate: {
          gte: fortyEightHoursAgo,
          lte: twentyFourHoursAgo,
        },
        sessionReview: null, // No review yet
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            email: true,
          },
        },
        clinician: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info(`Found ${appointments.length} appointments eligible for review`);
    return appointments;
  } catch (error) {
    logger.error('Error fetching eligible appointments for review:', error);
    throw new AppError('Failed to fetch eligible appointments', 500);
  }
}
