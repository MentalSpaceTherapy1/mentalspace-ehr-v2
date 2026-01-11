import { PrismaClient, ReviewStatus, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Valid Performance Review status transitions
const VALID_REVIEW_TRANSITIONS: Record<ReviewStatus, ReviewStatus[]> = {
  [ReviewStatus.DRAFT]: [ReviewStatus.PENDING_SELF_EVAL],
  [ReviewStatus.PENDING_SELF_EVAL]: [ReviewStatus.PENDING_MANAGER_REVIEW],
  [ReviewStatus.PENDING_MANAGER_REVIEW]: [ReviewStatus.PENDING_EMPLOYEE_SIGNATURE],
  [ReviewStatus.PENDING_EMPLOYEE_SIGNATURE]: [ReviewStatus.COMPLETED],
  [ReviewStatus.COMPLETED]: [],
};

export interface CreatePerformanceReviewDto {
  userId: string;
  reviewerId: string;
  reviewPeriod: string;
  reviewDate: Date;
  nextReviewDate?: Date;
  overallRating: number;
  goals: Array<{
    goal: string;
    rating: number;
    progress: string;
  }>;
  competencies: Array<{
    competency: string;
    rating: number;
    notes: string;
  }>;
  strengths: string;
  improvements: string;
  actionPlans: Array<{
    action: string;
    dueDate: Date;
    status: string;
  }>;
}

export interface UpdatePerformanceReviewDto {
  reviewPeriod?: string;
  reviewDate?: Date;
  nextReviewDate?: Date;
  overallRating?: number;
  goals?: Array<{
    goal: string;
    rating: number;
    progress: string;
  }>;
  competencies?: Array<{
    competency: string;
    rating: number;
    notes: string;
  }>;
  strengths?: string;
  improvements?: string;
  actionPlans?: Array<{
    action: string;
    dueDate: Date;
    status: string;
  }>;
  selfEvaluation?: string;
  employeeComments?: string;
  managerComments?: string;
  status?: ReviewStatus;
}

export interface EmployeeSelfEvaluationDto {
  selfEvaluation: string;
  employeeComments?: string;
}

export interface ManagerReviewDto {
  managerComments: string;
  managerSignature: string;
}

export interface EmployeeSignatureDto {
  employeeSignature: string;
}

class PerformanceReviewService {
  /**
   * Validate status transition
   */
  private validateStatusTransition(currentStatus: ReviewStatus, newStatus: ReviewStatus): void {
    const validNextStatuses = VALID_REVIEW_TRANSITIONS[currentStatus] || [];
    if (!validNextStatuses.includes(newStatus)) {
      throw new Error(`Cannot transition from ${currentStatus} to ${newStatus}. Review must follow the proper workflow.`);
    }
  }

  /**
   * Create a new performance review
   */
  async createReview(data: CreatePerformanceReviewDto) {
    // Validate rating is between 1-5
    if (data.overallRating < 1 || data.overallRating > 5) {
      throw new Error('Overall rating must be between 1 and 5');
    }

    // Validate all goal ratings
    for (const goal of data.goals) {
      if (goal.rating < 1 || goal.rating > 5) {
        throw new Error('Goal ratings must be between 1 and 5');
      }
    }

    // Validate all competency ratings
    for (const competency of data.competencies) {
      if (competency.rating < 1 || competency.rating > 5) {
        throw new Error('Competency ratings must be between 1 and 5');
      }
    }

    const review = await prisma.performanceReview.create({
      data: {
        userId: data.userId,
        reviewerId: data.reviewerId,
        reviewPeriod: data.reviewPeriod,
        reviewDate: data.reviewDate,
        nextReviewDate: data.nextReviewDate,
        overallRating: data.overallRating,
        goals: data.goals as Prisma.InputJsonValue,
        competencies: data.competencies as Prisma.InputJsonValue,
        strengths: data.strengths,
        improvements: data.improvements,
        actionPlans: data.actionPlans as Prisma.InputJsonValue,
        status: ReviewStatus.DRAFT,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return review;
  }

  /**
   * Get all performance reviews with optional filters
   */
  async getAllReviews(filters?: {
    userId?: string;
    reviewerId?: string;
    status?: ReviewStatus;
    reviewPeriod?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.PerformanceReviewWhereInput = {};

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.reviewerId) {
      where.reviewerId = filters.reviewerId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.reviewPeriod) {
      where.reviewPeriod = filters.reviewPeriod;
    }

    if (filters?.startDate || filters?.endDate) {
      where.reviewDate = {};
      if (filters.startDate) {
        where.reviewDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.reviewDate.lte = filters.endDate;
      }
    }

    const [reviews, total] = await Promise.all([
      prisma.performanceReview.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { reviewDate: 'desc' },
      }),
      prisma.performanceReview.count({ where }),
    ]);

    return {
      reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single performance review by ID
   */
  async getReviewById(id: string) {
    const review = await prisma.performanceReview.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
          },
        },
      },
    });

    if (!review) {
      throw new Error('Performance review not found');
    }

    return review;
  }

  /**
   * Update a performance review
   */
  async updateReview(id: string, data: UpdatePerformanceReviewDto) {
    // Validate ratings if provided
    if (data.overallRating && (data.overallRating < 1 || data.overallRating > 5)) {
      throw new Error('Overall rating must be between 1 and 5');
    }

    if (data.goals) {
      for (const goal of data.goals) {
        if (goal.rating < 1 || goal.rating > 5) {
          throw new Error('Goal ratings must be between 1 and 5');
        }
      }
    }

    if (data.competencies) {
      for (const competency of data.competencies) {
        if (competency.rating < 1 || competency.rating > 5) {
          throw new Error('Competency ratings must be between 1 and 5');
        }
      }
    }

    const updateData: Prisma.PerformanceReviewUpdateInput = {};

    if (data.reviewPeriod) updateData.reviewPeriod = data.reviewPeriod;
    if (data.reviewDate) updateData.reviewDate = data.reviewDate;
    if (data.nextReviewDate !== undefined) updateData.nextReviewDate = data.nextReviewDate;
    if (data.overallRating) updateData.overallRating = data.overallRating;
    if (data.goals) updateData.goals = data.goals as Prisma.InputJsonValue;
    if (data.competencies) updateData.competencies = data.competencies as Prisma.InputJsonValue;
    if (data.strengths) updateData.strengths = data.strengths;
    if (data.improvements) updateData.improvements = data.improvements;
    if (data.actionPlans) updateData.actionPlans = data.actionPlans as Prisma.InputJsonValue;
    if (data.selfEvaluation !== undefined) updateData.selfEvaluation = data.selfEvaluation;
    if (data.employeeComments !== undefined) updateData.employeeComments = data.employeeComments;
    if (data.managerComments !== undefined) updateData.managerComments = data.managerComments;
    if (data.status) updateData.status = data.status;

    const review = await prisma.performanceReview.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return review;
  }

  /**
   * Submit self-evaluation (employee)
   */
  async submitSelfEvaluation(id: string, data: EmployeeSelfEvaluationDto) {
    // Fetch current review to validate status
    const currentReview = await prisma.performanceReview.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!currentReview) {
      throw new Error('Performance review not found');
    }

    // Validate status transition
    this.validateStatusTransition(currentReview.status, ReviewStatus.PENDING_MANAGER_REVIEW);

    const review = await prisma.performanceReview.update({
      where: { id },
      data: {
        selfEvaluation: data.selfEvaluation,
        employeeComments: data.employeeComments,
        status: ReviewStatus.PENDING_MANAGER_REVIEW,
      },
      include: {
        user: true,
        reviewer: true,
      },
    });

    return review;
  }

  /**
   * Submit manager review
   */
  async submitManagerReview(id: string, data: ManagerReviewDto) {
    // Fetch current review to validate status
    const currentReview = await prisma.performanceReview.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!currentReview) {
      throw new Error('Performance review not found');
    }

    // Validate status transition
    this.validateStatusTransition(currentReview.status, ReviewStatus.PENDING_EMPLOYEE_SIGNATURE);

    const review = await prisma.performanceReview.update({
      where: { id },
      data: {
        managerComments: data.managerComments,
        managerSignature: data.managerSignature,
        managerSignDate: new Date(),
        status: ReviewStatus.PENDING_EMPLOYEE_SIGNATURE,
      },
      include: {
        user: true,
        reviewer: true,
      },
    });

    return review;
  }

  /**
   * Employee signature (final step)
   */
  async employeeSignature(id: string, data: EmployeeSignatureDto) {
    // Fetch current review to validate status
    const currentReview = await prisma.performanceReview.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!currentReview) {
      throw new Error('Performance review not found');
    }

    // Validate status transition
    this.validateStatusTransition(currentReview.status, ReviewStatus.COMPLETED);

    const review = await prisma.performanceReview.update({
      where: { id },
      data: {
        employeeSignature: data.employeeSignature,
        employeeSignDate: new Date(),
        status: ReviewStatus.COMPLETED,
      },
      include: {
        user: true,
        reviewer: true,
      },
    });

    return review;
  }

  /**
   * Delete a performance review
   */
  async deleteReview(id: string) {
    await prisma.performanceReview.delete({
      where: { id },
    });

    return { message: 'Performance review deleted successfully' };
  }

  /**
   * Get upcoming reviews (reviews due in next 30 days based on nextReviewDate)
   */
  async getUpcomingReviews() {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const reviews = await prisma.performanceReview.findMany({
      where: {
        nextReviewDate: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
        status: ReviewStatus.COMPLETED,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { nextReviewDate: 'asc' },
    });

    return reviews;
  }

  /**
   * Get reviews by employee ID
   */
  async getReviewsByEmployee(userId: string) {
    const reviews = await prisma.performanceReview.findMany({
      where: { userId },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { reviewDate: 'desc' },
    });

    return reviews;
  }

  /**
   * Get reviews by reviewer ID
   */
  async getReviewsByReviewer(reviewerId: string) {
    const reviews = await prisma.performanceReview.findMany({
      where: { reviewerId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { reviewDate: 'desc' },
    });

    return reviews;
  }

  /**
   * Get performance review statistics
   */
  async getReviewStatistics(filters?: {
    startDate?: Date;
    endDate?: Date;
    reviewPeriod?: string;
  }) {
    const where: Prisma.PerformanceReviewWhereInput = {
      status: ReviewStatus.COMPLETED,
    };

    if (filters?.startDate || filters?.endDate) {
      where.reviewDate = {};
      if (filters.startDate) {
        where.reviewDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.reviewDate.lte = filters.endDate;
      }
    }

    if (filters?.reviewPeriod) {
      where.reviewPeriod = filters.reviewPeriod;
    }

    const reviews = await prisma.performanceReview.findMany({
      where,
      select: {
        overallRating: true,
      },
    });

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.overallRating, 0) / totalReviews
      : 0;

    const ratingDistribution = {
      '5': reviews.filter(r => r.overallRating === 5).length,
      '4': reviews.filter(r => r.overallRating === 4).length,
      '3': reviews.filter(r => r.overallRating === 3).length,
      '2': reviews.filter(r => r.overallRating === 2).length,
      '1': reviews.filter(r => r.overallRating === 1).length,
    };

    return {
      totalReviews,
      averageRating: Math.round(averageRating * 100) / 100,
      ratingDistribution,
    };
  }
}

export default new PerformanceReviewService();
