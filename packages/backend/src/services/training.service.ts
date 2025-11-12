import prisma from './database';
import logger from '../utils/logger';
import {
  Course,
  TrainingRecord,
  TrainingType,
  TrainingCategory,
  TrainingStatus,
  Prisma
} from '@prisma/client';

/**
 * Course Create Input Interface
 */
export interface CourseCreateInput {
  courseName: string;
  provider: string;
  description?: string;
  duration?: number;
  credits?: number;
  trainingType: TrainingType;
  category: TrainingCategory;
  contentUrl?: string;
  materials?: string[];
  isActive?: boolean;
  passingScore?: number;
  expirationMonths?: number;
}

/**
 * Course Update Input Interface
 */
export interface CourseUpdateInput {
  courseName?: string;
  provider?: string;
  description?: string;
  duration?: number;
  credits?: number;
  trainingType?: TrainingType;
  category?: TrainingCategory;
  contentUrl?: string;
  materials?: string[];
  isActive?: boolean;
  passingScore?: number;
  expirationMonths?: number;
}

/**
 * Course Filter Interface
 */
export interface CourseFilters {
  trainingType?: TrainingType;
  category?: TrainingCategory;
  isActive?: boolean;
  provider?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Training Record Create Input Interface
 */
export interface TrainingRecordCreateInput {
  userId: string;
  courseName: string;
  provider: string;
  trainingType: TrainingType;
  category: TrainingCategory;
  assignedDate?: Date;
  dueDate?: Date;
  completionDate?: Date;
  expirationDate?: Date;
  creditsEarned?: number;
  creditsRequired?: number;
  score?: number;
  passingScore?: number;
  status?: TrainingStatus;
  required?: boolean;
  complianceMet?: boolean;
  certificateUrl?: string;
  notes?: string;
  attestedBy?: string;
  attestedDate?: Date;
}

/**
 * Training Record Update Input Interface
 */
export interface TrainingRecordUpdateInput {
  assignedDate?: Date;
  dueDate?: Date;
  completionDate?: Date;
  expirationDate?: Date;
  creditsEarned?: number;
  creditsRequired?: number;
  score?: number;
  passingScore?: number;
  status?: TrainingStatus;
  required?: boolean;
  complianceMet?: boolean;
  certificateUrl?: string;
  notes?: string;
  attestedBy?: string;
  attestedDate?: Date;
}

/**
 * Training Record Filter Interface
 */
export interface TrainingRecordFilters {
  userId?: string;
  trainingType?: TrainingType;
  category?: TrainingCategory;
  status?: TrainingStatus;
  required?: boolean;
  expiringWithinDays?: number;
  expired?: boolean;
  page?: number;
  limit?: number;
}

/**
 * CEU Report Interface
 */
export interface CEUReport {
  userId: string;
  userName: string;
  totalCredits: number;
  completedTrainings: number;
  trainingsByType: {
    type: TrainingType;
    count: number;
    credits: number;
  }[];
  recentCompletions: TrainingRecord[];
}

/**
 * Compliance Report Interface
 */
export interface ComplianceReport {
  totalStaff: number;
  compliantStaff: number;
  nonCompliantStaff: number;
  complianceRate: number;
  expiringWithin30Days: number;
  expiringWithin60Days: number;
  expiringWithin90Days: number;
  staffDetails: {
    userId: string;
    userName: string;
    compliant: boolean;
    requiredTrainings: number;
    completedTrainings: number;
    expiringTrainings: number;
    overdueTrainings: number;
  }[];
}

/**
 * Training Service
 * Manages training courses, enrollment, progress tracking, and compliance
 */
class TrainingService {
  /**
   * Create a new course
   */
  async createCourse(data: CourseCreateInput): Promise<Course> {
    try {
      logger.info('Creating new course', { courseName: data.courseName });

      const course = await prisma.course.create({
        data: {
          courseName: data.courseName,
          provider: data.provider,
          description: data.description,
          duration: data.duration,
          credits: data.credits,
          trainingType: data.trainingType,
          category: data.category,
          contentUrl: data.contentUrl,
          materials: data.materials || [],
          isActive: data.isActive ?? true,
          passingScore: data.passingScore,
          expirationMonths: data.expirationMonths
        }
      });

      logger.info('Course created successfully', { courseId: course.id });
      return course;
    } catch (error) {
      logger.error('Error creating course', { error });
      throw new Error('Failed to create course');
    }
  }

  /**
   * Update an existing course
   */
  async updateCourse(id: string, data: CourseUpdateInput): Promise<Course> {
    try {
      logger.info('Updating course', { courseId: id });

      const course = await prisma.course.update({
        where: { id },
        data: {
          ...(data.courseName && { courseName: data.courseName }),
          ...(data.provider && { provider: data.provider }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.duration !== undefined && { duration: data.duration }),
          ...(data.credits !== undefined && { credits: data.credits }),
          ...(data.trainingType && { trainingType: data.trainingType }),
          ...(data.category && { category: data.category }),
          ...(data.contentUrl !== undefined && { contentUrl: data.contentUrl }),
          ...(data.materials !== undefined && { materials: data.materials }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          ...(data.passingScore !== undefined && { passingScore: data.passingScore }),
          ...(data.expirationMonths !== undefined && { expirationMonths: data.expirationMonths })
        }
      });

      logger.info('Course updated successfully', { courseId: course.id });
      return course;
    } catch (error) {
      logger.error('Error updating course', { error, courseId: id });
      throw new Error('Failed to update course');
    }
  }

  /**
   * Get courses with filtering and pagination
   */
  async getCourses(filters: CourseFilters = {}): Promise<{ courses: Course[]; total: number; page: number; totalPages: number }> {
    try {
      const {
        trainingType,
        category,
        isActive,
        provider,
        search,
        page = 1,
        limit = 20
      } = filters;

      const where: Prisma.CourseWhereInput = {
        ...(trainingType && { trainingType }),
        ...(category && { category }),
        ...(isActive !== undefined && { isActive }),
        ...(provider && { provider: { contains: provider, mode: 'insensitive' } }),
        ...(search && {
          OR: [
            { courseName: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        })
      };

      const [courses, total] = await Promise.all([
        prisma.course.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.course.count({ where })
      ]);

      return {
        courses,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error fetching courses', { error, filters });
      throw new Error('Failed to fetch courses');
    }
  }

  /**
   * Get a single course by ID
   */
  async getCourseById(id: string): Promise<Course | null> {
    try {
      return await prisma.course.findUnique({
        where: { id }
      });
    } catch (error) {
      logger.error('Error fetching course', { error, courseId: id });
      throw new Error('Failed to fetch course');
    }
  }

  /**
   * Delete a course
   */
  async deleteCourse(id: string): Promise<void> {
    try {
      logger.info('Deleting course', { courseId: id });

      await prisma.course.delete({
        where: { id }
      });

      logger.info('Course deleted successfully', { courseId: id });
    } catch (error) {
      logger.error('Error deleting course', { error, courseId: id });
      throw new Error('Failed to delete course');
    }
  }

  /**
   * Enroll a user in a training course
   */
  async enrollUser(data: TrainingRecordCreateInput): Promise<TrainingRecord> {
    try {
      logger.info('Enrolling user in training', { userId: data.userId, courseName: data.courseName });

      // Check if user is already enrolled
      const existing = await prisma.trainingRecord.findFirst({
        where: {
          userId: data.userId,
          courseName: data.courseName,
          provider: data.provider
        }
      });

      if (existing) {
        logger.warn('User already enrolled in this training', { userId: data.userId, courseName: data.courseName });
        throw new Error('User is already enrolled in this training');
      }

      const record = await prisma.trainingRecord.create({
        data: {
          userId: data.userId,
          courseName: data.courseName,
          provider: data.provider,
          trainingType: data.trainingType,
          category: data.category,
          assignedDate: data.assignedDate || new Date(),
          dueDate: data.dueDate,
          completionDate: data.completionDate,
          expirationDate: data.expirationDate,
          creditsEarned: data.creditsEarned,
          creditsRequired: data.creditsRequired,
          score: data.score,
          passingScore: data.passingScore,
          status: data.status || TrainingStatus.NOT_STARTED,
          required: data.required ?? false,
          complianceMet: data.complianceMet ?? false,
          certificateUrl: data.certificateUrl,
          notes: data.notes,
          attestedBy: data.attestedBy,
          attestedDate: data.attestedDate
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      logger.info('User enrolled successfully', { recordId: record.id });
      return record;
    } catch (error) {
      logger.error('Error enrolling user', { error, userId: data.userId });
      throw error;
    }
  }

  /**
   * Update training progress
   */
  async updateProgress(recordId: string, data: TrainingRecordUpdateInput): Promise<TrainingRecord> {
    try {
      logger.info('Updating training progress', { recordId });

      const record = await prisma.trainingRecord.update({
        where: { id: recordId },
        data: {
          ...(data.assignedDate && { assignedDate: data.assignedDate }),
          ...(data.dueDate && { dueDate: data.dueDate }),
          ...(data.completionDate && { completionDate: data.completionDate }),
          ...(data.expirationDate && { expirationDate: data.expirationDate }),
          ...(data.creditsEarned !== undefined && { creditsEarned: data.creditsEarned }),
          ...(data.creditsRequired !== undefined && { creditsRequired: data.creditsRequired }),
          ...(data.score !== undefined && { score: data.score }),
          ...(data.passingScore !== undefined && { passingScore: data.passingScore }),
          ...(data.status && { status: data.status }),
          ...(data.required !== undefined && { required: data.required }),
          ...(data.complianceMet !== undefined && { complianceMet: data.complianceMet }),
          ...(data.certificateUrl !== undefined && { certificateUrl: data.certificateUrl }),
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.attestedBy !== undefined && { attestedBy: data.attestedBy }),
          ...(data.attestedDate && { attestedDate: data.attestedDate })
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      logger.info('Training progress updated', { recordId });
      return record;
    } catch (error) {
      logger.error('Error updating training progress', { error, recordId });
      throw new Error('Failed to update training progress');
    }
  }

  /**
   * Complete a training and mark it as finished
   */
  async completeTraining(recordId: string, score?: number, certificateUrl?: string): Promise<TrainingRecord> {
    try {
      logger.info('Completing training', { recordId, score });

      const record = await prisma.trainingRecord.findUnique({
        where: { id: recordId }
      });

      if (!record) {
        throw new Error('Training record not found');
      }

      // Determine if the training is passed
      let status = TrainingStatus.COMPLETED;
      let complianceMet = true;

      if (record.passingScore !== null && score !== undefined) {
        if (score < record.passingScore) {
          status = TrainingStatus.FAILED;
          complianceMet = false;
        }
      }

      // Calculate expiration date if expirationMonths is set
      // Note: We'd need to get this from the Course table or it should be in the record
      let expirationDate = record.expirationDate;

      const updatedRecord = await prisma.trainingRecord.update({
        where: { id: recordId },
        data: {
          completionDate: new Date(),
          score,
          status,
          complianceMet,
          certificateUrl,
          ...(expirationDate && { expirationDate })
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      logger.info('Training completed', { recordId, status });
      return updatedRecord;
    } catch (error) {
      logger.error('Error completing training', { error, recordId });
      throw new Error('Failed to complete training');
    }
  }

  /**
   * Get training records for a specific user
   */
  async getTrainingRecordsByUser(userId: string, filters: Partial<TrainingRecordFilters> = {}): Promise<TrainingRecord[]> {
    try {
      const where: Prisma.TrainingRecordWhereInput = {
        userId,
        ...(filters.trainingType && { trainingType: filters.trainingType }),
        ...(filters.category && { category: filters.category }),
        ...(filters.status && { status: filters.status }),
        ...(filters.required !== undefined && { required: filters.required })
      };

      const records = await prisma.trainingRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      return records;
    } catch (error) {
      logger.error('Error fetching user training records', { error, userId });
      throw new Error('Failed to fetch training records');
    }
  }

  /**
   * Get training expiring within specified days
   */
  async getExpiringTraining(days: number = 30): Promise<TrainingRecord[]> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const records = await prisma.trainingRecord.findMany({
        where: {
          expirationDate: {
            lte: futureDate,
            gte: new Date()
          },
          status: TrainingStatus.COMPLETED
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { expirationDate: 'asc' }
      });

      logger.info('Fetched expiring training records', { count: records.length, days });
      return records;
    } catch (error) {
      logger.error('Error fetching expiring training', { error, days });
      throw new Error('Failed to fetch expiring training');
    }
  }

  /**
   * Generate CEU report for a user
   */
  async getCEUReport(userId: string, startDate?: Date, endDate?: Date): Promise<CEUReport> {
    try {
      const where: Prisma.TrainingRecordWhereInput = {
        userId,
        status: TrainingStatus.COMPLETED,
        ...(startDate && endDate && {
          completionDate: {
            gte: startDate,
            lte: endDate
          }
        })
      };

      const [user, records] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true }
        }),
        prisma.trainingRecord.findMany({
          where,
          orderBy: { completionDate: 'desc' }
        })
      ]);

      if (!user) {
        throw new Error('User not found');
      }

      // Calculate total credits
      const totalCredits = records.reduce((sum, record) => {
        const credits = record.creditsEarned ? parseFloat(record.creditsEarned.toString()) : 0;
        return sum + credits;
      }, 0);

      // Group by training type
      const typeMap = new Map<TrainingType, { count: number; credits: number }>();
      records.forEach(record => {
        const existing = typeMap.get(record.trainingType) || { count: 0, credits: 0 };
        const credits = record.creditsEarned ? parseFloat(record.creditsEarned.toString()) : 0;
        typeMap.set(record.trainingType, {
          count: existing.count + 1,
          credits: existing.credits + credits
        });
      });

      const trainingsByType = Array.from(typeMap.entries()).map(([type, data]) => ({
        type,
        count: data.count,
        credits: data.credits
      }));

      return {
        userId,
        userName: `${user.firstName} ${user.lastName}`,
        totalCredits,
        completedTrainings: records.length,
        trainingsByType,
        recentCompletions: records.slice(0, 10)
      };
    } catch (error) {
      logger.error('Error generating CEU report', { error, userId });
      throw new Error('Failed to generate CEU report');
    }
  }

  /**
   * Get compliance report for the organization
   */
  async getComplianceReport(): Promise<ComplianceReport> {
    try {
      // Get all users
      const users = await prisma.user.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      });

      // Get all training records
      const allRecords = await prisma.trainingRecord.findMany({
        where: {
          required: true
        }
      });

      const now = new Date();
      const date30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const date60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      const date90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      let expiringWithin30Days = 0;
      let expiringWithin60Days = 0;
      let expiringWithin90Days = 0;

      // Analyze compliance per user
      const staffDetails = users.map(user => {
        const userRecords = allRecords.filter(r => r.userId === user.id);
        const requiredTrainings = userRecords.length;
        const completedTrainings = userRecords.filter(r => r.status === TrainingStatus.COMPLETED).length;

        const expiringTrainings = userRecords.filter(r => {
          if (!r.expirationDate) return false;
          return r.expirationDate >= now && r.expirationDate <= date90Days;
        }).length;

        const overdueTrainings = userRecords.filter(r => {
          if (r.status === TrainingStatus.COMPLETED) return false;
          if (!r.dueDate) return false;
          return r.dueDate < now;
        }).length;

        const compliant = overdueTrainings === 0 && completedTrainings === requiredTrainings;

        // Count expiring trainings
        userRecords.forEach(r => {
          if (!r.expirationDate || r.expirationDate < now) return;
          if (r.expirationDate <= date30Days) expiringWithin30Days++;
          else if (r.expirationDate <= date60Days) expiringWithin60Days++;
          else if (r.expirationDate <= date90Days) expiringWithin90Days++;
        });

        return {
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`,
          compliant,
          requiredTrainings,
          completedTrainings,
          expiringTrainings,
          overdueTrainings
        };
      });

      const compliantStaff = staffDetails.filter(s => s.compliant).length;
      const nonCompliantStaff = staffDetails.length - compliantStaff;
      const complianceRate = staffDetails.length > 0 ? (compliantStaff / staffDetails.length) * 100 : 0;

      return {
        totalStaff: users.length,
        compliantStaff,
        nonCompliantStaff,
        complianceRate: Math.round(complianceRate * 100) / 100,
        expiringWithin30Days,
        expiringWithin60Days,
        expiringWithin90Days,
        staffDetails
      };
    } catch (error) {
      logger.error('Error generating compliance report', { error });
      throw new Error('Failed to generate compliance report');
    }
  }

  /**
   * Send training reminders for expiring certifications
   * This should be called by a cron job
   */
  async sendTrainingReminders(): Promise<void> {
    try {
      logger.info('Sending training reminders');

      // Get training expiring in 30 days
      const expiringRecords = await this.getExpiringTraining(30);

      for (const record of expiringRecords) {
        // TODO: Send email notification to user
        logger.info('Training expiring soon', {
          userId: record.userId,
          courseName: record.courseName,
          expirationDate: record.expirationDate
        });
      }

      // Get overdue training
      const overdueRecords = await prisma.trainingRecord.findMany({
        where: {
          required: true,
          status: {
            in: [TrainingStatus.NOT_STARTED, TrainingStatus.IN_PROGRESS]
          },
          dueDate: {
            lt: new Date()
          }
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      for (const record of overdueRecords) {
        // TODO: Send overdue notification to user and supervisor
        logger.info('Training overdue', {
          userId: record.userId,
          courseName: record.courseName,
          dueDate: record.dueDate
        });
      }

      logger.info('Training reminders sent', {
        expiring: expiringRecords.length,
        overdue: overdueRecords.length
      });
    } catch (error) {
      logger.error('Error sending training reminders', { error });
      throw new Error('Failed to send training reminders');
    }
  }

  /**
   * Auto-enroll new hires in required training courses
   */
  async autoEnrollNewHires(userId: string): Promise<TrainingRecord[]> {
    try {
      logger.info('Auto-enrolling new hire in required training', { userId });

      // Get all required courses
      const requiredCourses = await prisma.course.findMany({
        where: {
          isActive: true,
          category: TrainingCategory.MANDATORY
        }
      });

      const enrollments: TrainingRecord[] = [];

      for (const course of requiredCourses) {
        try {
          // Calculate due date (30 days from now for onboarding)
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30);

          const record = await this.enrollUser({
            userId,
            courseName: course.courseName,
            provider: course.provider,
            trainingType: course.trainingType,
            category: course.category,
            assignedDate: new Date(),
            dueDate,
            required: true,
            creditsRequired: course.credits ? parseFloat(course.credits.toString()) : undefined,
            passingScore: course.passingScore ?? undefined
          });

          enrollments.push(record);
        } catch (error) {
          // Skip if already enrolled
          logger.warn('Failed to enroll in course', { userId, courseId: course.id, error });
        }
      }

      logger.info('New hire auto-enrollment complete', {
        userId,
        enrolledCount: enrollments.length
      });

      return enrollments;
    } catch (error) {
      logger.error('Error auto-enrolling new hire', { error, userId });
      throw new Error('Failed to auto-enroll new hire');
    }
  }

  /**
   * Get training statistics for dashboard
   */
  async getTrainingStats(): Promise<{
    totalEnrollments: number;
    completedTrainings: number;
    inProgressTrainings: number;
    notStartedTrainings: number;
    overdueTrainings: number;
    expiringWithin30Days: number;
    expiringWithin60Days: number;
    expiringWithin90Days: number;
    totalCreditsEarned: number;
    byStatus: { [key: string]: number };
    byCategory: { [key: string]: number };
  }> {
    try {
      const now = new Date();
      const date30 = new Date();
      date30.setDate(date30.getDate() + 30);
      const date60 = new Date();
      date60.setDate(date60.getDate() + 60);
      const date90 = new Date();
      date90.setDate(date90.getDate() + 90);

      const allRecords = await prisma.trainingRecord.findMany();

      const stats = {
        totalEnrollments: allRecords.length,
        completedTrainings: allRecords.filter(r => r.status === TrainingStatus.COMPLETED).length,
        inProgressTrainings: allRecords.filter(r => r.status === TrainingStatus.IN_PROGRESS).length,
        notStartedTrainings: allRecords.filter(r => r.status === TrainingStatus.NOT_STARTED).length,
        overdueTrainings: allRecords.filter(r =>
          r.dueDate &&
          r.dueDate < now &&
          r.status !== TrainingStatus.COMPLETED
        ).length,
        expiringWithin30Days: allRecords.filter(r =>
          r.expirationDate &&
          r.expirationDate >= now &&
          r.expirationDate <= date30
        ).length,
        expiringWithin60Days: allRecords.filter(r =>
          r.expirationDate &&
          r.expirationDate > date30 &&
          r.expirationDate <= date60
        ).length,
        expiringWithin90Days: allRecords.filter(r =>
          r.expirationDate &&
          r.expirationDate > date60 &&
          r.expirationDate <= date90
        ).length,
        totalCreditsEarned: allRecords.reduce((sum, r) => {
          const credits = r.creditsEarned ? parseFloat(r.creditsEarned.toString()) : 0;
          return sum + credits;
        }, 0),
        byStatus: {} as { [key: string]: number },
        byCategory: {} as { [key: string]: number }
      };

      // Group by status
      for (const record of allRecords) {
        const status = record.status;
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      }

      // Group by category
      for (const record of allRecords) {
        const category = record.category;
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      }

      return stats;
    } catch (error) {
      logger.error('Error generating training stats:', error);
      throw new Error('Failed to generate training stats');
    }
  }

  /**
   * Get all training enrollments with filtering and pagination
   */
  async getEnrollments(filters: TrainingRecordFilters = {}): Promise<{
    enrollments: TrainingRecord[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        userId,
        trainingType,
        category,
        status,
        required,
        expiringWithinDays,
        expired,
        page = 1,
        limit = 20
      } = filters;

      const where: Prisma.TrainingRecordWhereInput = {
        ...(userId && { userId }),
        ...(trainingType && { trainingType }),
        ...(category && { category }),
        ...(status && { status }),
        ...(required !== undefined && { required })
      };

      // Filter by expiring within days
      if (expiringWithinDays) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + expiringWithinDays);
        where.expirationDate = {
          lte: futureDate,
          gte: new Date()
        };
      }

      // Filter by expired
      if (expired) {
        where.expirationDate = {
          lt: new Date()
        };
      }

      const [enrollments, total] = await Promise.all([
        prisma.trainingRecord.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.trainingRecord.count({ where })
      ]);

      return {
        enrollments,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error fetching enrollments:', error);
      throw new Error('Failed to fetch enrollments');
    }
  }

  /**
   * Get upcoming training deadlines
   */
  async getUpcomingTraining(days: number = 30): Promise<TrainingRecord[]> {
    try {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const records = await prisma.trainingRecord.findMany({
        where: {
          OR: [
            {
              // Upcoming due dates
              dueDate: {
                gte: now,
                lte: futureDate
              },
              status: {
                in: [TrainingStatus.NOT_STARTED, TrainingStatus.IN_PROGRESS]
              }
            },
            {
              // Overdue training
              dueDate: {
                lt: now
              },
              status: {
                in: [TrainingStatus.NOT_STARTED, TrainingStatus.IN_PROGRESS]
              }
            }
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { dueDate: 'asc' }
      });

      logger.info('Fetched upcoming training records', { count: records.length, days });
      return records;
    } catch (error) {
      logger.error('Error fetching upcoming training:', error);
      throw new Error('Failed to fetch upcoming training');
    }
  }
}

export default new TrainingService();
