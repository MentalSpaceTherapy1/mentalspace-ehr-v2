/**
 * Appointment Controller
 * Phase 3.2: Refactored to thin controller pattern
 *
 * Handles HTTP request/response only - all business logic delegated to appointmentService
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { getErrorMessage, getErrorCode, getErrorName, getErrorStack, getErrorStatusCode, getErrorCodeString } from '../utils/errorHelpers';
import {
  appointmentService,
  createAppointmentSchema,
  updateAppointmentSchema,
  rescheduleSchema,
  cancelSchema,
  checkInSchema,
  checkOutSchema,
} from '../services/appointment.service';
import logger, { logControllerError, auditLogger } from '../utils/logger';
import { AppError, ConflictError } from '../utils/errors';
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendNotFound,
  sendBadRequest,
  sendValidationError,
  sendError,
  sendServerError,
  sendConflict,
  sendUnauthorized,
  calculatePagination,
} from '../utils/apiResponse';
import { AppointmentStatus } from '@mentalspace/database';
import * as recurringService from '../services/recurringAppointment.service';
import { assertCanAccessClient } from '../services/accessControl.service';
import { AdvancedMDEligibilityService } from '../services/advancedmd/eligibility.service';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';

// Type for recurrence pattern used in recurring appointments
interface RecurrencePattern {
  frequency: 'twice_weekly' | 'weekly' | 'bi_weekly' | 'monthly' | 'custom';
  daysOfWeek?: string[];
  endDate?: string;
  count?: number;
}

// Recurrence pattern validation schema
const recurrencePatternSchema = z.object({
  frequency: z.enum(['twice_weekly', 'weekly', 'bi_weekly', 'monthly', 'custom']),
  daysOfWeek: z.array(z.string()).optional(),
  endDate: z.string().optional(),
  count: z.number().int().min(2).max(52).optional(),
}).refine((data) => data.endDate || data.count, {
  message: 'Either endDate or count must be provided',
});

// Base appointment schema for recurring appointments
const baseAppointmentSchemaForRecurring = z.object({
  clientId: z.string().uuid('Invalid client ID').optional(),
  clinicianId: z.string().uuid('Invalid clinician ID'),
  appointmentDate: z.string().datetime('Invalid appointment date'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid start time format (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid end time format (HH:MM)'),
  duration: z.number().int().min(15).max(480, 'Duration must be between 15 and 480 minutes'),
  appointmentType: z.string().min(1, 'Appointment type is required'),
  serviceLocation: z.string().min(1, 'Service location is required'),
  timezone: z.string().default('America/New_York'),
  cptCode: z.string().optional(),
  icdCodes: z.array(z.string()).optional(),
  appointmentNotes: z.string().optional(),
});

const createRecurringAppointmentSchema = baseAppointmentSchemaForRecurring.extend({
  isRecurring: z.literal(true),
  recurrencePattern: recurrencePatternSchema,
}).refine(
  (data) => !!data.clientId,
  {
    message: 'clientId is required for recurring appointments',
    path: ['clientId'],
  }
);

// ============================================================================
// GET OPERATIONS
// ============================================================================

/**
 * Get appointments by client ID
 * GET /api/clients/:clientId/appointments
 */
export const getAppointmentsByClientId = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const appointments = await appointmentService.getAppointmentsByClientId(
      clientId,
      req.user!
    );

    return sendSuccess(res, appointments);
  } catch (error) {
    if (error instanceof AppError) {
      return sendError(res, getErrorStatusCode(error), getErrorMessage(error), getErrorCodeString(error));
    }

    const errorId = logControllerError('Get client appointments', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to retrieve client appointments', errorId);
  }
};

/**
 * Get all appointments with filters
 * GET /api/appointments
 */
export const getAllAppointments = async (req: Request, res: Response) => {
  try {
    const {
      clientId,
      clinicianId,
      status,
      startDate,
      endDate,
      appointmentType,
      page = '1',
      limit = '50',
    } = req.query;

    const result = await appointmentService.getAppointments(
      {
        clientId: clientId as string | undefined,
        clinicianId: clinicianId as string | undefined,
        status: status as AppointmentStatus | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        appointmentType: appointmentType as string | undefined,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      },
      req.user!
    );

    return sendPaginated(
      res,
      result.appointments,
      calculatePagination(result.pagination.page, result.pagination.limit, result.pagination.total)
    );
  } catch (error) {
    if (error instanceof AppError) {
      return sendError(res, getErrorStatusCode(error), getErrorMessage(error), getErrorCodeString(error));
    }

    const errorId = logControllerError('Get appointments', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to retrieve appointments', errorId);
  }
};

/**
 * Get single appointment by ID
 * GET /api/appointments/:id
 */
export const getAppointmentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const appointment = await appointmentService.getAppointmentById(id, req.user!);

    return sendSuccess(res, appointment);
  } catch (error) {
    if (error instanceof AppError) {
      if (getErrorMessage(error).includes('not found')) {
        return sendNotFound(res, 'Appointment');
      }
      return sendError(res, getErrorStatusCode(error), getErrorMessage(error), getErrorCodeString(error));
    }

    const errorId = logControllerError('Get appointment', error, {
      userId: req.user?.userId,
      appointmentId: req.params.id,
    });
    return sendServerError(res, 'Failed to retrieve appointment', errorId);
  }
};

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

/**
 * Create new appointment
 * POST /api/appointments
 */
export const createAppointment = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return sendBadRequest(res, 'User authentication context missing. Please log in again.');
    }

    const appointment = await appointmentService.createAppointment(
      req.body,
      userId,
      req.user!
    );

    const isGroup = req.body.isGroupAppointment && req.body.clientIds;
    return sendCreated(
      res,
      appointment,
      isGroup
        ? `Group appointment created successfully with ${req.body.clientIds?.length} clients`
        : 'Appointment created successfully'
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return sendValidationError(res, formattedErrors);
    }

    if (error instanceof ConflictError) {
      return sendConflict(res, getErrorMessage(error), error.metadata?.conflicts);
    }

    if (error instanceof AppError) {
      return sendError(res, getErrorStatusCode(error), getErrorMessage(error), getErrorCodeString(error));
    }

    const errorId = logControllerError('Create appointment', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to create appointment', errorId);
  }
};

/**
 * Create recurring appointments
 * POST /api/appointments/recurring
 */
export const createRecurringAppointments = async (req: Request, res: Response) => {
  try {
    const validatedData = createRecurringAppointmentSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    if (validatedData.clientId) {
      await assertCanAccessClient(req.user, { clientId: validatedData.clientId });
    }

    // Generate appointments from recurrence pattern
    const baseData = {
      clientId: validatedData.clientId!,
      clinicianId: validatedData.clinicianId,
      appointmentDate: validatedData.appointmentDate,
      startTime: validatedData.startTime,
      endTime: validatedData.endTime,
      duration: validatedData.duration,
      appointmentType: validatedData.appointmentType,
      serviceLocation: validatedData.serviceLocation,
      cptCode: validatedData.cptCode,
      timezone: validatedData.timezone,
      icdCodes: validatedData.icdCodes || [],
      appointmentNotes: validatedData.appointmentNotes,
      createdBy: userId,
      statusUpdatedBy: userId,
    };

    const appointments = await recurringService.generateRecurringAppointments(
      baseData,
      validatedData.recurrencePattern as RecurrencePattern
    );

    // Check for conflicts
    const dates = appointments.map((apt) =>
      apt.appointmentDate instanceof Date ? apt.appointmentDate : new Date(apt.appointmentDate as string)
    );
    const conflictCheck = await recurringService.checkSeriesConflicts(
      validatedData.clinicianId,
      dates,
      validatedData.startTime,
      validatedData.endTime
    );

    if (conflictCheck.hasConflicts) {
      return sendConflict(res, 'Scheduling conflicts detected in recurring series', conflictCheck.conflicts);
    }

    // Create all appointments via service (Phase 3.2)
    const createdAppointments = await appointmentService.createRecurringAppointmentsInTransaction(appointments);

    auditLogger.info('Recurring appointments created', {
      userId,
      count: createdAppointments.length,
      parentRecurrenceId: appointments[0]?.parentRecurrenceId,
      action: 'RECURRING_APPOINTMENTS_CREATED',
    });

    return sendCreated(res, {
      count: createdAppointments.length,
      parentRecurrenceId: appointments[0]?.parentRecurrenceId,
      appointments: createdAppointments,
    }, `${createdAppointments.length} recurring appointments created successfully`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return sendValidationError(res, formattedErrors);
    }

    if (error instanceof AppError) {
      return sendError(res, getErrorStatusCode(error), getErrorMessage(error), getErrorCodeString(error));
    }

    const errorId = logControllerError('Create recurring appointments', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to create recurring appointments', errorId);
  }
};

// ============================================================================
// UPDATE OPERATIONS
// ============================================================================

/**
 * Update appointment
 * PUT /api/appointments/:id
 */
export const updateAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const appointment = await appointmentService.updateAppointment(
      id,
      req.body,
      userId,
      req.user!
    );

    return sendSuccess(res, appointment, 'Appointment updated successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return sendValidationError(res, formattedErrors);
    }

    if (error instanceof ConflictError) {
      return sendConflict(res, getErrorMessage(error), error.metadata?.conflicts);
    }

    if (error instanceof AppError) {
      if (getErrorMessage(error).includes('not found')) {
        return sendNotFound(res, 'Appointment');
      }
      return sendError(res, getErrorStatusCode(error), getErrorMessage(error), getErrorCodeString(error));
    }

    const errorId = logControllerError('Update appointment', error, {
      userId: req.user?.userId,
      appointmentId: req.params.id,
    });
    return sendServerError(res, 'Failed to update appointment', errorId);
  }
};

/**
 * Reschedule appointment
 * PUT /api/appointments/:id/reschedule
 */
export const rescheduleAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const appointment = await appointmentService.rescheduleAppointment(
      id,
      req.body,
      userId,
      req.user!
    );

    return sendSuccess(res, appointment, 'Appointment rescheduled successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return sendValidationError(res, formattedErrors);
    }

    if (error instanceof ConflictError) {
      return sendConflict(res, getErrorMessage(error), error.metadata?.conflicts);
    }

    if (error instanceof AppError) {
      if (getErrorMessage(error).includes('not found')) {
        return sendNotFound(res, 'Appointment');
      }
      return sendError(res, getErrorStatusCode(error), getErrorMessage(error), getErrorCodeString(error));
    }

    const errorId = logControllerError('Reschedule appointment', error, {
      userId: req.user?.userId,
      appointmentId: req.params.id,
    });
    return sendServerError(res, 'Failed to reschedule appointment', errorId);
  }
};

/**
 * Quick reschedule for drag-and-drop operations
 * PUT /api/appointments/:id/quick-reschedule
 */
export const quickReschedule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { appointmentDate, startTime, endTime, clinicianId } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    if (!appointmentDate || !startTime || !endTime) {
      return sendBadRequest(res, 'appointmentDate, startTime, and endTime are required');
    }

    const newDate = new Date(appointmentDate);
    if (isNaN(newDate.getTime())) {
      return sendBadRequest(res, 'Invalid date format');
    }

    const appointment = await appointmentService.quickReschedule(
      id,
      newDate,
      startTime,
      endTime,
      clinicianId,
      userId,
      req.user!
    );

    return sendSuccess(res, appointment, 'Appointment rescheduled successfully');
  } catch (error) {
    if (error instanceof ConflictError) {
      return sendConflict(res, getErrorMessage(error), error.metadata?.conflicts);
    }

    if (error instanceof AppError) {
      if (getErrorMessage(error).includes('not found')) {
        return sendNotFound(res, 'Appointment');
      }
      return sendError(res, getErrorStatusCode(error), getErrorMessage(error), getErrorCodeString(error));
    }

    const errorId = logControllerError('Quick reschedule', error, {
      userId: req.user?.userId,
      appointmentId: req.params.id,
    });
    return sendServerError(res, 'Failed to reschedule appointment', errorId);
  }
};

// ============================================================================
// STATUS OPERATIONS
// ============================================================================

/**
 * Check-in appointment
 * PUT /api/appointments/:id/check-in
 */
export const checkInAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = checkInSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const appointment = await appointmentService.checkInAppointment(
      id,
      validatedData.checkedInTime,
      userId,
      req.user!
    );

    return sendSuccess(res, appointment, 'Client checked in successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return sendValidationError(res, formattedErrors);
    }

    if (error instanceof AppError) {
      if (getErrorMessage(error).includes('not found')) {
        return sendNotFound(res, 'Appointment');
      }
      return sendError(res, getErrorStatusCode(error), getErrorMessage(error), getErrorCodeString(error));
    }

    const errorId = logControllerError('Check-in appointment', error, {
      userId: req.user?.userId,
      appointmentId: req.params.id,
    });
    return sendServerError(res, 'Failed to check in appointment', errorId);
  }
};

/**
 * Check-out appointment
 * PUT /api/appointments/:id/check-out
 */
export const checkOutAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const appointment = await appointmentService.checkOutAppointment(
      id,
      req.body,
      userId,
      req.user!
    );

    return sendSuccess(res, appointment, 'Client checked out successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return sendValidationError(res, formattedErrors);
    }

    if (error instanceof AppError) {
      if (getErrorMessage(error).includes('not found')) {
        return sendNotFound(res, 'Appointment');
      }
      return sendError(res, getErrorStatusCode(error), getErrorMessage(error), getErrorCodeString(error));
    }

    const errorId = logControllerError('Check-out appointment', error, {
      userId: req.user?.userId,
      appointmentId: req.params.id,
    });
    return sendServerError(res, 'Failed to check out appointment', errorId);
  }
};

/**
 * Cancel appointment
 * PUT /api/appointments/:id/cancel
 */
export const cancelAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const appointment = await appointmentService.cancelAppointment(
      id,
      req.body,
      userId,
      req.user!
    );

    return sendSuccess(res, appointment, 'Appointment cancelled successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return sendValidationError(res, formattedErrors);
    }

    if (error instanceof AppError) {
      if (getErrorMessage(error).includes('not found')) {
        return sendNotFound(res, 'Appointment');
      }
      return sendError(res, getErrorStatusCode(error), getErrorMessage(error), getErrorCodeString(error));
    }

    const errorId = logControllerError('Cancel appointment', error, {
      userId: req.user?.userId,
      appointmentId: req.params.id,
    });
    return sendServerError(res, 'Failed to cancel appointment', errorId);
  }
};

/**
 * Mark as no-show
 * PUT /api/appointments/:id/no-show
 */
export const markNoShow = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { noShowFeeApplied, noShowNotes } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const appointment = await appointmentService.markNoShow(
      id,
      noShowFeeApplied,
      noShowNotes,
      userId,
      req.user!
    );

    return sendSuccess(res, appointment, 'Appointment marked as no-show');
  } catch (error) {
    if (error instanceof AppError) {
      if (getErrorMessage(error).includes('not found')) {
        return sendNotFound(res, 'Appointment');
      }
      return sendError(res, getErrorStatusCode(error), getErrorMessage(error), getErrorCodeString(error));
    }

    const errorId = logControllerError('Mark no-show', error, {
      userId: req.user?.userId,
      appointmentId: req.params.id,
    });
    return sendServerError(res, 'Failed to mark appointment as no-show', errorId);
  }
};

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

/**
 * Delete appointment
 * DELETE /api/appointments/:id
 */
export const deleteAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    await appointmentService.deleteAppointment(id, userId, req.user!);

    return sendSuccess(res, null, 'Appointment deleted successfully');
  } catch (error) {
    if (error instanceof AppError) {
      if (getErrorMessage(error).includes('not found')) {
        return sendNotFound(res, 'Appointment');
      }
      return sendError(res, getErrorStatusCode(error), getErrorMessage(error), getErrorCodeString(error));
    }

    const errorId = logControllerError('Delete appointment', error, {
      userId: req.user?.userId,
      appointmentId: req.params.id,
    });
    return sendServerError(res, 'Failed to delete appointment', errorId);
  }
};

// ============================================================================
// GET OR CREATE
// ============================================================================

/**
 * Get or create appointment for clinical note
 * POST /api/appointments/get-or-create
 */
export const getOrCreateAppointment = async (req: Request, res: Response) => {
  try {
    const {
      clientId,
      appointmentDate,
      startTime,
      endTime,
      appointmentType = 'THERAPY',
      serviceLocation = 'IN_OFFICE',
      clinicianId,
    } = req.body;

    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    if (!clientId || !appointmentDate || !startTime || !endTime) {
      return sendBadRequest(res, 'clientId, appointmentDate, startTime, and endTime are required');
    }

    const parsedDate = new Date(appointmentDate);
    const finalClinicianId = clinicianId || userId;

    const { appointment, created } = await appointmentService.getOrCreateAppointment(
      clientId,
      finalClinicianId,
      parsedDate,
      startTime,
      endTime,
      appointmentType,
      serviceLocation,
      userId,
      req.user!
    );

    if (created) {
      return sendCreated(res, { ...appointment, created }, 'New appointment created');
    }

    return sendSuccess(res, { ...appointment, created }, 'Existing appointment found');
  } catch (error) {
    if (error instanceof ConflictError) {
      return sendConflict(res, getErrorMessage(error), error.metadata?.conflicts);
    }

    if (error instanceof AppError) {
      return sendError(res, getErrorStatusCode(error), getErrorMessage(error), getErrorCodeString(error));
    }

    const errorId = logControllerError('Get or create appointment', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to get or create appointment', errorId);
  }
};

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate if a time slot is available
 * POST /api/appointments/validate-time-slot
 */
export const validateTimeSlot = async (req: Request, res: Response) => {
  try {
    const { appointmentId, appointmentDate, startTime, endTime, clinicianId } = req.body;

    if (!appointmentDate || !startTime || !endTime || !clinicianId) {
      return sendBadRequest(res, 'appointmentDate, startTime, endTime, and clinicianId are required');
    }

    const newDate = new Date(appointmentDate);
    if (isNaN(newDate.getTime())) {
      return sendBadRequest(res, 'Invalid date format');
    }

    const validation = await appointmentService.validateTimeSlot(
      clinicianId,
      newDate,
      startTime,
      endTime,
      appointmentId
    );

    return sendSuccess(res, validation);
  } catch (error) {
    const errorId = logControllerError('Validate time slot', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to validate time slot', errorId);
  }
};

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk update appointment statuses
 * PUT /api/appointments/bulk/status
 */
export const bulkUpdateStatus = async (req: Request, res: Response) => {
  try {
    const { appointmentIds, status, notes } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    if (!appointmentIds || !Array.isArray(appointmentIds) || appointmentIds.length === 0) {
      return sendBadRequest(res, 'appointmentIds array is required');
    }

    if (!status) {
      return sendBadRequest(res, 'status is required');
    }

    const updatedCount = await appointmentService.bulkUpdateStatus(
      appointmentIds,
      status,
      notes,
      userId
    );

    return sendSuccess(res, { updatedCount }, `Updated ${updatedCount} appointments`);
  } catch (error) {
    if (error instanceof AppError) {
      return sendError(res, getErrorStatusCode(error), getErrorMessage(error), getErrorCodeString(error));
    }

    const errorId = logControllerError('Bulk update status', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to update appointments', errorId);
  }
};

/**
 * Bulk cancel appointments
 * PUT /api/appointments/bulk/cancel
 */
export const bulkCancelAppointments = async (req: Request, res: Response) => {
  try {
    const { appointmentIds, cancellationReason, cancellationNotes } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    if (!appointmentIds || !Array.isArray(appointmentIds) || appointmentIds.length === 0) {
      return sendBadRequest(res, 'appointmentIds array is required');
    }

    const cancelledCount = await appointmentService.bulkCancelAppointments(
      appointmentIds,
      cancellationReason,
      cancellationNotes,
      userId
    );

    return sendSuccess(res, { cancelledCount }, `Cancelled ${cancelledCount} appointments`);
  } catch (error) {
    const errorId = logControllerError('Bulk cancel appointments', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to cancel appointments', errorId);
  }
};

/**
 * Bulk delete appointments
 * DELETE /api/appointments/bulk
 */
export const bulkDeleteAppointments = async (req: Request, res: Response) => {
  try {
    const { appointmentIds } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    if (!appointmentIds || !Array.isArray(appointmentIds) || appointmentIds.length === 0) {
      return sendBadRequest(res, 'appointmentIds array is required');
    }

    const deletedCount = await appointmentService.bulkDeleteAppointments(appointmentIds, userId);

    return sendSuccess(res, { deletedCount }, `Deleted ${deletedCount} appointments`);
  } catch (error) {
    const errorId = logControllerError('Bulk delete appointments', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to delete appointments', errorId);
  }
};

/**
 * Bulk assign room to appointments
 * PUT /api/appointments/bulk/room
 */
export const bulkAssignRoom = async (req: Request, res: Response) => {
  try {
    const { appointmentIds, room } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    if (!appointmentIds || !Array.isArray(appointmentIds) || appointmentIds.length === 0) {
      return sendBadRequest(res, 'appointmentIds array is required');
    }

    if (!room) {
      return sendBadRequest(res, 'room is required');
    }

    const updatedCount = await appointmentService.bulkAssignRoom(appointmentIds, room, userId);

    return sendSuccess(res, { updatedCount }, `Assigned room "${room}" to ${updatedCount} appointments`);
  } catch (error) {
    const errorId = logControllerError('Bulk assign room', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to assign room', errorId);
  }
};

// ============================================================================
// RESOURCE VIEWS
// ============================================================================

/**
 * Get appointments grouped by room for resource scheduling
 * GET /api/appointments/views/room
 */
export const getRoomView = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, viewType = 'day' } = req.query;

    if (!startDate || !endDate) {
      return sendBadRequest(res, 'startDate and endDate are required');
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return sendBadRequest(res, 'Invalid date format');
    }

    const result = await appointmentService.getRoomView(start, end);

    return sendSuccess(res, { ...result, viewType });
  } catch (error) {
    const errorId = logControllerError('Get room view', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to fetch room view', errorId);
  }
};

/**
 * Get appointments for multiple providers
 * GET /api/appointments/views/providers
 */
export const getProviderComparison = async (req: Request, res: Response) => {
  try {
    const { providerIds, startDate, endDate, viewType = 'day' } = req.query;

    if (!providerIds || !startDate || !endDate) {
      return sendBadRequest(res, 'providerIds, startDate, and endDate are required');
    }

    const providerIdArray = Array.isArray(providerIds)
      ? providerIds
      : (providerIds as string).split(',');

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return sendBadRequest(res, 'Invalid date format');
    }

    const result = await appointmentService.getProviderComparison(
      providerIdArray as string[],
      start,
      end
    );

    return sendSuccess(res, { ...result, viewType });
  } catch (error) {
    const errorId = logControllerError('Get provider comparison', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to fetch provider comparison', errorId);
  }
};

// ============================================================================
// INSURANCE ELIGIBILITY
// ============================================================================

/**
 * Check insurance eligibility for a specific appointment
 * GET /api/appointments/:id/eligibility
 */
export const checkAppointmentEligibility = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Phase 3.2: Use service instead of direct prisma call
    const appointment = await appointmentService.getAppointmentForEligibility(id);

    if (!appointment) {
      return sendNotFound(res, 'Appointment');
    }

    await assertCanAccessClient(req.user, {
      clientId: appointment.clientId,
      allowBillingView: true,
    });

    const eligibilityService = AdvancedMDEligibilityService.getInstance();
    const eligibilityResult = await eligibilityService.checkEligibilityForAppointment(id);

    return sendSuccess(res, {
      appointmentId: id,
      clientId: appointment.clientId,
      clientName: `${appointment.client.firstName} ${appointment.client.lastName}`,
      appointmentDate: appointment.appointmentDate,
      eligibility: eligibilityResult,
    });
  } catch (error) {
    if (error instanceof AppError) {
      if (getErrorMessage(error).includes('not found')) {
        return sendNotFound(res, 'Appointment');
      }
      return sendError(res, getErrorStatusCode(error), getErrorMessage(error), getErrorCodeString(error));
    }

    const errorId = logControllerError('Check appointment eligibility', error, {
      userId: req.user?.userId,
      appointmentId: req.params.id,
    });
    return sendServerError(res, 'Failed to check eligibility', errorId);
  }
};

/**
 * Batch check eligibility for all appointments on a given date
 * GET /api/appointments/eligibility/daily
 */
export const checkDailyEligibility = async (req: Request, res: Response) => {
  try {
    const { date } = req.query;

    if (!date) {
      return sendBadRequest(res, 'date query parameter is required');
    }

    const targetDate = new Date(date as string);
    if (isNaN(targetDate.getTime())) {
      return sendBadRequest(res, 'Invalid date format');
    }

    const eligibilityService = AdvancedMDEligibilityService.getInstance();
    const eligibilityResults = await eligibilityService.checkEligibilityForDateAppointments(targetDate);

    return sendSuccess(
      res,
      eligibilityResults,
      `Eligibility checked for ${eligibilityResults.totalChecked} appointments (${eligibilityResults.successCount} successful, ${eligibilityResults.failureCount} failed)`
    );
  } catch (error) {
    const errorId = logControllerError('Check daily eligibility', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to check daily eligibility', errorId);
  }
};

/**
 * Enhanced check-in with automatic eligibility verification
 * PUT /api/appointments/:id/check-in-with-eligibility
 */
export const checkInWithEligibility = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { checkedInTime, verifyEligibility = true } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    if (!checkedInTime || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(checkedInTime)) {
      return sendBadRequest(res, 'Invalid check-in time format (HH:MM)');
    }

    // Check in the appointment first
    const appointment = await appointmentService.checkInAppointment(
      id,
      checkedInTime,
      userId,
      req.user!
    );

    // Optionally verify eligibility
    let eligibilityResult = null;
    if (verifyEligibility) {
      try {
        const eligibilityService = AdvancedMDEligibilityService.getInstance();
        eligibilityResult = await eligibilityService.checkEligibilityForAppointment(id);
      } catch (eligibilityError) {
        logger.warn('Eligibility check failed during check-in', {
          appointmentId: id,
          error: eligibilityError instanceof Error ? eligibilityError.message : 'Unknown error',
        });
        eligibilityResult = { success: false, error: 'Eligibility check unavailable' };
      }
    }

    const isEligible = eligibilityResult?.success && eligibilityResult?.eligibilityData?.isEligible;

    return sendSuccess(
      res,
      { appointment, eligibility: eligibilityResult },
      isEligible
        ? 'Client checked in - eligibility verified'
        : eligibilityResult?.success === false
          ? 'Client checked in - eligibility check unavailable'
          : 'Client checked in - eligibility not verified'
    );
  } catch (error) {
    if (error instanceof AppError) {
      if (getErrorMessage(error).includes('not found')) {
        return sendNotFound(res, 'Appointment');
      }
      return sendError(res, getErrorStatusCode(error), getErrorMessage(error), getErrorCodeString(error));
    }

    const errorId = logControllerError('Check-in with eligibility', error, {
      userId: req.user?.userId,
      appointmentId: req.params.id,
    });
    return sendServerError(res, 'Failed to check in with eligibility', errorId);
  }
};
