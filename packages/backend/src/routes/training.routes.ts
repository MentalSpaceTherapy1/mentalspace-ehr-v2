import { Router } from 'express';
import trainingController from '../controllers/training.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Training & Development Routes
 * All routes require authentication
 *
 * MODULE 9: Staff Management - Training & Development System
 */

// ============================================================================
// DASHBOARD & STATISTICS ROUTES
// These must come BEFORE parameterized routes to avoid conflicts
// ============================================================================

/**
 * @route   GET /api/v1/training/stats
 * @desc    Get training statistics for dashboard
 * @access  Private (Admin/HR)
 */
router.get('/stats', authenticate, trainingController.getStats);

/**
 * @route   GET /api/v1/training/enrollments
 * @desc    Get all training enrollments with optional filters
 * @access  Private (Admin/HR)
 * @query   userId, trainingType, category, status, required, expiringWithinDays, expired, page, limit
 */
router.get('/enrollments', authenticate, trainingController.getEnrollments);

/**
 * @route   GET /api/v1/training/upcoming
 * @desc    Get upcoming training deadlines
 * @access  Private (Admin/HR)
 * @query   days (default: 30)
 */
router.get('/upcoming', authenticate, trainingController.getUpcoming);

// ============================================================================
// COURSE MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   POST /api/v1/training/courses
 * @desc    Create a new training course
 * @access  Private (Admin/Supervisor)
 * @body    { courseName, provider, description, duration, credits, trainingType, category, ... }
 */
router.post('/courses', authenticate, trainingController.createCourse);

/**
 * @route   PUT /api/v1/training/courses/:id
 * @desc    Update an existing course
 * @access  Private (Admin/Supervisor)
 * @params  id - Course ID
 * @body    Course update fields
 */
router.put('/courses/:id', authenticate, trainingController.updateCourse);

/**
 * @route   GET /api/v1/training/courses
 * @desc    Get all courses with optional filtering
 * @access  Private
 * @query   trainingType, category, isActive, provider, search, page, limit
 */
router.get('/courses', authenticate, trainingController.getCourses);

/**
 * @route   GET /api/v1/training/courses/:id
 * @desc    Get a single course by ID
 * @access  Private
 * @params  id - Course ID
 */
router.get('/courses/:id', authenticate, trainingController.getCourseById);

/**
 * @route   DELETE /api/v1/training/courses/:id
 * @desc    Delete a course
 * @access  Private (Admin/Supervisor)
 * @params  id - Course ID
 */
router.delete('/courses/:id', authenticate, trainingController.deleteCourse);

// ============================================================================
// ENROLLMENT & TRAINING RECORDS ROUTES
// ============================================================================

/**
 * @route   POST /api/v1/training/enroll
 * @desc    Enroll a user in a training course
 * @access  Private (Admin/Supervisor)
 * @body    { userId, courseName, provider, trainingType, category, ... }
 */
router.post('/enroll', authenticate, trainingController.enrollUser);

/**
 * @route   PUT /api/v1/training/records/:id/progress
 * @desc    Update training progress
 * @access  Private
 * @params  id - Training Record ID
 * @body    Training record update fields
 */
router.put('/records/:id/progress', authenticate, trainingController.updateProgress);

/**
 * @route   POST /api/v1/training/records/:id/complete
 * @desc    Mark a training as completed
 * @access  Private
 * @params  id - Training Record ID
 * @body    { score?, certificateUrl? }
 */
router.post('/records/:id/complete', authenticate, trainingController.completeTraining);

/**
 * @route   GET /api/v1/training/user/:userId
 * @desc    Get all training records for a user
 * @access  Private
 * @params  userId - User ID
 * @query   trainingType, category, status, required
 */
router.get('/user/:userId', authenticate, trainingController.getUserTrainingRecords);

// ============================================================================
// REPORTING & COMPLIANCE ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/training/expiring
 * @desc    Get training expiring within specified days
 * @access  Private (Admin/Supervisor)
 * @query   days (default: 30)
 */
router.get('/expiring', authenticate, trainingController.getExpiringTraining);

/**
 * @route   GET /api/v1/training/ceu-report/:userId
 * @desc    Generate CEU report for a user
 * @access  Private
 * @params  userId - User ID
 * @query   startDate, endDate
 */
router.get('/ceu-report/:userId', authenticate, trainingController.getCEUReport);

/**
 * @route   GET /api/v1/training/compliance-report
 * @desc    Get organization-wide compliance report
 * @access  Private (Admin/Supervisor)
 */
router.get('/compliance-report', authenticate, trainingController.getComplianceReport);

// ============================================================================
// AUTOMATION ROUTES
// ============================================================================

/**
 * @route   POST /api/v1/training/auto-enroll/:userId
 * @desc    Auto-enroll a new hire in required training
 * @access  Private (Admin/Supervisor)
 * @params  userId - User ID
 */
router.post('/auto-enroll/:userId', authenticate, trainingController.autoEnrollNewHire);

/**
 * @route   POST /api/v1/training/send-reminders
 * @desc    Manually trigger training reminders (typically called by cron)
 * @access  Private (Admin/Supervisor)
 */
router.post('/send-reminders', authenticate, trainingController.sendReminders);

export default router;
