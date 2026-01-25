import { Request, Response } from 'express';
import { z } from 'zod';
import logger from '../utils/logger';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';
// Phase 3.2: Removed direct prisma import - using service methods instead
import * as availableSlotsService from '../services/available-slots.service';
import { getEffectiveRules } from '../services/scheduling-rules.service';
import { addMinutes, format } from 'date-fns';
import { sendSuccess, sendBadRequest, sendServerError, sendValidationError, sendError } from '../utils/apiResponse';

/**
 * Module 7: Self-Scheduling Controller
 *
 * Handles client self-scheduling endpoints for booking, rescheduling,
 * and cancelling appointments.
 */

// Validation schemas
const getAvailableSlotsSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date format (YYYY-MM-DD required)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date format (YYYY-MM-DD required)'),
});

const bookAppointmentSchema = z.object({
  clinicianId: z.string().uuid('Invalid clinician ID'),
  appointmentDate: z.string().datetime('Invalid appointment date'),
  appointmentType: z.string().min(1, 'Appointment type is required'),
  duration: z.number().int().min(15).max(240).default(60),
  notes: z.string().optional(),
  serviceLocation: z.enum(['IN_PERSON', 'TELEHEALTH']).default('TELEHEALTH'),
});

const rescheduleAppointmentSchema = z.object({
  newAppointmentDate: z.string().datetime('Invalid appointment date'),
  reason: z.string().optional(),
});

const cancelAppointmentSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required'),
  notes: z.string().optional(),
});

/**
 * GET /api/self-schedule/clinicians
 * Get list of clinicians available for self-scheduling
 */
export const getAvailableClinicians = async (req: Request, res: Response) => {
  try {
    logger.info('Getting available clinicians for self-scheduling');

    const clinicians = await availableSlotsService.getAvailableClinicians();

    return sendSuccess(res, clinicians);
  } catch (error) {
    logger.error('Get available clinicians error', {
      error: getErrorMessage(error),
    });
    return sendServerError(res, 'Failed to retrieve available clinicians');
  }
};

/**
 * GET /api/self-schedule/available-slots/:clinicianId
 * Get available appointment slots for a clinician
 */
export const getAvailableSlots = async (req: Request, res: Response) => {
  try {
    const { clinicianId } = req.params;
    const validation = getAvailableSlotsSchema.safeParse(req.query);

    if (!validation.success) {
      const formattedErrors = validation.error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return sendValidationError(res, formattedErrors);
    }

    const { startDate, endDate } = validation.data;

    logger.info('Getting available slots', {
      clinicianId,
      startDate,
      endDate,
    });

    const slots = await availableSlotsService.getAvailableSlots(
      clinicianId,
      new Date(startDate),
      new Date(endDate)
    );

    return sendSuccess(res, slots);
  } catch (error) {
    logger.error('Get available slots error', {
      error: getErrorMessage(error),
      clinicianId: req.params.clinicianId,
    });
    return sendServerError(res, 'Failed to retrieve available slots');
  }
};

/**
 * POST /api/self-schedule/book
 * Book a new appointment
 */
export const bookAppointment = async (req: Request, res: Response) => {
  try {
    const validation = bookAppointmentSchema.safeParse(req.body);

    if (!validation.success) {
      const formattedErrors = validation.error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return sendValidationError(res, formattedErrors);
    }

    const { clinicianId, appointmentDate, appointmentType, duration, notes, serviceLocation } = validation.data;

    // TODO: Client portal/self-scheduling not yet implemented - clients don't have user accounts
    // The Client model doesn't have a userId field, so req.user.clientId doesn't exist
    return sendError(res, 501, 'Client self-scheduling not yet implemented. Please contact your provider to schedule appointments.', 'NOT_IMPLEMENTED');
  } catch (error) {
    logger.error('Book appointment error', {
      error: getErrorMessage(error),
      body: req.body,
    });
    return sendServerError(res, getErrorMessage(error) || 'Failed to book appointment');
  }
};

/**
 * PUT /api/self-schedule/reschedule/:appointmentId
 * Reschedule an existing appointment
 */
export const rescheduleAppointment = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const validation = rescheduleAppointmentSchema.safeParse(req.body);

    if (!validation.success) {
      const formattedErrors = validation.error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return sendValidationError(res, formattedErrors);
    }

    const { newAppointmentDate, reason } = validation.data;

    // TODO: Client portal/self-scheduling not yet implemented - clients don't have user accounts
    return sendError(res, 501, 'Client self-scheduling not yet implemented. Please contact your provider to reschedule appointments.', 'NOT_IMPLEMENTED');
  } catch (error) {
    logger.error('Reschedule appointment error', {
      error: getErrorMessage(error),
      appointmentId: req.params.appointmentId,
    });
    return sendServerError(res, getErrorMessage(error) || 'Failed to reschedule appointment');
  }
};

/**
 * DELETE /api/self-schedule/cancel/:appointmentId
 * Cancel an appointment
 */
export const cancelAppointment = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const validation = cancelAppointmentSchema.safeParse(req.body);

    if (!validation.success) {
      const formattedErrors = validation.error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return sendValidationError(res, formattedErrors);
    }

    const { reason, notes } = validation.data;

    // TODO: Client portal/self-scheduling not yet implemented - clients don't have user accounts
    return sendError(res, 501, 'Client self-scheduling not yet implemented. Please contact your provider to cancel appointments.', 'NOT_IMPLEMENTED');
  } catch (error) {
    logger.error('Cancel appointment error', {
      error: getErrorMessage(error),
      appointmentId: req.params.appointmentId,
    });
    return sendServerError(res, getErrorMessage(error) || 'Failed to cancel appointment');
  }
};

/**
 * GET /api/self-schedule/my-appointments
 * Get client's upcoming appointments
 */
export const getMyAppointments = async (req: Request, res: Response) => {
  try {
    // TODO: Client portal/self-scheduling not yet implemented - clients don't have user accounts
    return sendError(res, 501, 'Client self-scheduling not yet implemented. Please contact your provider for appointment information.', 'NOT_IMPLEMENTED');
  } catch (error) {
    logger.error('Get my appointments error', {
      error: getErrorMessage(error),
    });
    return sendServerError(res, 'Failed to retrieve appointments');
  }
};

/**
 * GET /api/self-schedule/appointment-types
 * Get available appointment types for self-scheduling
 */
export const getAppointmentTypes = async (req: Request, res: Response) => {
  try {
    logger.info('Getting appointment types for self-scheduling');

    // Phase 3.2: Use service method instead of direct prisma call
    const appointmentTypes = await availableSlotsService.getBookableAppointmentTypes();

    return sendSuccess(res, appointmentTypes);
  } catch (error) {
    logger.error('Get appointment types error', {
      error: getErrorMessage(error),
    });
    return sendServerError(res, 'Failed to retrieve appointment types');
  }
};
