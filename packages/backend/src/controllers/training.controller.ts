import { Request, Response } from 'express';
import trainingService from '../services/training.service';
import { asyncHandler } from '../utils/asyncHandler';
import { UnauthorizedError, ValidationError, NotFoundError } from '../utils/errors';
import { TrainingType, TrainingCategory, TrainingStatus } from '@prisma/client';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError, sendPaginated } from '../utils/apiResponse';

/**
 * Training & Development Controller
 *
 * Handles training course management and employee training tracking:
 * - Course management (CRUD)
 * - User enrollment
 * - Progress tracking
 * - Training completion
 * - CEU reporting
 * - Compliance monitoring
 */

export class TrainingController {
  /**
   * POST /api/v1/training/courses
   * Create a new training course
   */
  createCourse = asyncHandler(async (req: Request, res: Response) => {
    const {
      courseName,
      provider,
      description,
      duration,
      credits,
      trainingType,
      category,
      contentUrl,
      materials,
      isActive,
      passingScore,
      expirationMonths
    } = req.body;

    if (!courseName || !provider || !trainingType || !category) {
      throw new ValidationError('Missing required fields: courseName, provider, trainingType, category');
    }

    const course = await trainingService.createCourse({
      courseName,
      provider,
      description,
      duration,
      credits,
      trainingType: trainingType as TrainingType,
      category: category as TrainingCategory,
      contentUrl,
      materials,
      isActive,
      passingScore,
      expirationMonths
    });

    return sendCreated(res, course, 'Course created successfully');
  });

  /**
   * PUT /api/v1/training/courses/:id
   * Update an existing course
   */
  updateCourse = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const course = await trainingService.updateCourse(id, req.body);

    return sendSuccess(res, course, 'Course updated successfully');
  });

  /**
   * GET /api/v1/training/courses
   * Get all courses with optional filtering
   */
  getCourses = asyncHandler(async (req: Request, res: Response) => {
    const {
      trainingType,
      category,
      isActive,
      provider,
      search,
      page,
      limit
    } = req.query;

    const filters = {
      ...(trainingType && { trainingType: trainingType as TrainingType }),
      ...(category && { category: category as TrainingCategory }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(provider && { provider: provider as string }),
      ...(search && { search: search as string }),
      ...(page && { page: parseInt(page as string) }),
      ...(limit && { limit: parseInt(limit as string) })
    };

    const result = await trainingService.getCourses(filters);

    return sendPaginated(res, result.courses, {
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      limit: filters.limit || 20
    });
  });

  /**
   * GET /api/v1/training/courses/:id
   * Get a single course by ID
   */
  getCourseById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const course = await trainingService.getCourseById(id);

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    return sendSuccess(res, course, 'Course retrieved successfully');
  });

  /**
   * DELETE /api/v1/training/courses/:id
   * Delete a course
   */
  deleteCourse = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await trainingService.deleteCourse(id);

    return sendSuccess(res, null, 'Course deleted successfully');
  });

  /**
   * POST /api/v1/training/enroll
   * Enroll a user in a training course
   */
  enrollUser = asyncHandler(async (req: Request, res: Response) => {
    const {
      userId,
      courseName,
      provider,
      trainingType,
      category,
      assignedDate,
      dueDate,
      completionDate,
      expirationDate,
      creditsEarned,
      creditsRequired,
      score,
      passingScore,
      status,
      required,
      complianceMet,
      certificateUrl,
      notes,
      attestedBy,
      attestedDate
    } = req.body;

    if (!userId || !courseName || !provider || !trainingType || !category) {
      throw new ValidationError('Missing required fields: userId, courseName, provider, trainingType, category');
    }

    const record = await trainingService.enrollUser({
      userId,
      courseName,
      provider,
      trainingType: trainingType as TrainingType,
      category: category as TrainingCategory,
      assignedDate: assignedDate ? new Date(assignedDate) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      completionDate: completionDate ? new Date(completionDate) : undefined,
      expirationDate: expirationDate ? new Date(expirationDate) : undefined,
      creditsEarned,
      creditsRequired,
      score,
      passingScore,
      status: status as TrainingStatus,
      required,
      complianceMet,
      certificateUrl,
      notes,
      attestedBy,
      attestedDate: attestedDate ? new Date(attestedDate) : undefined
    });

    return sendCreated(res, record, 'User enrolled successfully');
  });

  /**
   * PUT /api/v1/training/records/:id/progress
   * Update training progress
   */
  updateProgress = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const updateData = { ...req.body };

    // Convert date strings to Date objects
    if (updateData.assignedDate) updateData.assignedDate = new Date(updateData.assignedDate);
    if (updateData.dueDate) updateData.dueDate = new Date(updateData.dueDate);
    if (updateData.completionDate) updateData.completionDate = new Date(updateData.completionDate);
    if (updateData.expirationDate) updateData.expirationDate = new Date(updateData.expirationDate);
    if (updateData.attestedDate) updateData.attestedDate = new Date(updateData.attestedDate);

    const record = await trainingService.updateProgress(id, updateData);

    return sendSuccess(res, record, 'Training progress updated successfully');
  });

  /**
   * POST /api/v1/training/records/:id/complete
   * Complete a training
   */
  completeTraining = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { score, certificateUrl } = req.body;

    const record = await trainingService.completeTraining(id, score, certificateUrl);

    return sendSuccess(res, record, 'Training completed successfully');
  });

  /**
   * GET /api/v1/training/user/:userId
   * Get all training records for a user
   */
  getUserTrainingRecords = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const {
      trainingType,
      category,
      status,
      required
    } = req.query;

    const filters = {
      ...(trainingType && { trainingType: trainingType as TrainingType }),
      ...(category && { category: category as TrainingCategory }),
      ...(status && { status: status as TrainingStatus }),
      ...(required !== undefined && { required: required === 'true' })
    };

    const records = await trainingService.getTrainingRecordsByUser(userId, filters);

    return sendSuccess(res, records, 'Training records retrieved successfully');
  });

  /**
   * GET /api/v1/training/expiring
   * Get training expiring within specified days
   */
  getExpiringTraining = asyncHandler(async (req: Request, res: Response) => {
    const { days } = req.query;

    const daysNumber = days ? parseInt(days as string) : 30;

    const records = await trainingService.getExpiringTraining(daysNumber);

    return sendSuccess(res, { records, meta: { days: daysNumber, count: records.length } }, 'Expiring training records retrieved successfully');
  });

  /**
   * GET /api/v1/training/ceu-report/:userId
   * Generate CEU report for a user
   */
  getCEUReport = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const report = await trainingService.getCEUReport(
      userId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    return sendSuccess(res, report, 'CEU report generated successfully');
  });

  /**
   * GET /api/v1/training/compliance-report
   * Get organization-wide compliance report
   */
  getComplianceReport = asyncHandler(async (req: Request, res: Response) => {
    const report = await trainingService.getComplianceReport();

    return sendSuccess(res, report, 'Compliance report generated successfully');
  });

  /**
   * POST /api/v1/training/auto-enroll/:userId
   * Auto-enroll a new hire in required training
   */
  autoEnrollNewHire = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    const enrollments = await trainingService.autoEnrollNewHires(userId);

    return sendCreated(res, { enrollments, meta: { enrolledCount: enrollments.length } }, 'New hire auto-enrolled in required training');
  });

  /**
   * POST /api/v1/training/send-reminders
   * Manually trigger training reminders (typically called by cron)
   */
  sendReminders = asyncHandler(async (req: Request, res: Response) => {
    await trainingService.sendTrainingReminders();

    return sendSuccess(res, null, 'Training reminders sent successfully');
  });

  /**
   * GET /api/v1/training/stats
   * Get training statistics for dashboard
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await trainingService.getTrainingStats();

    return sendSuccess(res, stats, 'Training statistics retrieved successfully');
  });

  /**
   * GET /api/v1/training/enrollments
   * Get all training enrollments with optional filters
   */
  getEnrollments = asyncHandler(async (req: Request, res: Response) => {
    const {
      userId,
      trainingType,
      category,
      status,
      required,
      expiringWithinDays,
      expired,
      page,
      limit
    } = req.query;

    const filters: any = {};

    if (userId) filters.userId = userId as string;
    if (trainingType) filters.trainingType = trainingType;
    if (category) filters.category = category;
    if (status) filters.status = status;
    if (required !== undefined) filters.required = required === 'true';
    if (expiringWithinDays) filters.expiringWithinDays = parseInt(expiringWithinDays as string);
    if (expired !== undefined) filters.expired = expired === 'true';
    if (page) filters.page = parseInt(page as string);
    if (limit) filters.limit = parseInt(limit as string);

    const result = await trainingService.getEnrollments(filters);

    return sendPaginated(res, result.enrollments, {
      page: result.page,
      totalPages: result.totalPages,
      total: result.total,
      limit: filters.limit || 20
    });
  });

  /**
   * GET /api/v1/training/upcoming
   * Get upcoming training deadlines
   */
  getUpcoming = asyncHandler(async (req: Request, res: Response) => {
    const { days } = req.query;
    const daysNumber = days ? parseInt(days as string) : 30;

    const records = await trainingService.getUpcomingTraining(daysNumber);

    return sendSuccess(res, { records, meta: { days: daysNumber, count: records.length } }, 'Upcoming training retrieved successfully');
  });
}

export default new TrainingController();
