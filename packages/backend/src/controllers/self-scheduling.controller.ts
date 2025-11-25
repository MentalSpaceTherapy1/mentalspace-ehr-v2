import { Request, Response } from 'express';
import { z } from 'zod';
import logger from '../utils/logger';
import prisma from '../services/database';
import * as availableSlotsService from '../services/available-slots.service';
import { getEffectiveRules } from '../services/scheduling-rules.service';
import { addMinutes, format } from 'date-fns';

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

    res.status(200).json({
      success: true,
      data: clinicians,
    });
  } catch (error: any) {
    logger.error('Get available clinicians error', {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve available clinicians',
      error: error.message,
    });
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
      return res.status(400).json({
        success: false,
        message: 'Invalid request parameters',
        errors: validation.error.errors,
      });
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

    res.status(200).json({
      success: true,
      data: slots,
    });
  } catch (error: any) {
    logger.error('Get available slots error', {
      error: error.message,
      clinicianId: req.params.clinicianId,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve available slots',
      error: error.message,
    });
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
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validation.error.errors,
      });
    }

    const { clinicianId, appointmentDate, appointmentType, duration, notes, serviceLocation } = validation.data;

    // TODO: Client portal/self-scheduling not yet implemented - clients don't have user accounts
    // The Client model doesn't have a userId field, so req.user.clientId doesn't exist
    return res.status(501).json({
      success: false,
      message: 'Client self-scheduling not yet implemented. Please contact your provider to schedule appointments.',
    });
  } catch (error: any) {
    logger.error('Book appointment error', {
      error: error.message,
      body: req.body,
    });
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to book appointment',
      error: error.message,
    });
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
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validation.error.errors,
      });
    }

    const { newAppointmentDate, reason } = validation.data;

    // TODO: Client portal/self-scheduling not yet implemented - clients don't have user accounts
    return res.status(501).json({
      success: false,
      message: 'Client self-scheduling not yet implemented. Please contact your provider to reschedule appointments.',
    });
  } catch (error: any) {
    logger.error('Reschedule appointment error', {
      error: error.message,
      appointmentId: req.params.appointmentId,
    });
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reschedule appointment',
      error: error.message,
    });
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
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validation.error.errors,
      });
    }

    const { reason, notes } = validation.data;

    // TODO: Client portal/self-scheduling not yet implemented - clients don't have user accounts
    return res.status(501).json({
      success: false,
      message: 'Client self-scheduling not yet implemented. Please contact your provider to cancel appointments.',
    });
  } catch (error: any) {
    logger.error('Cancel appointment error', {
      error: error.message,
      appointmentId: req.params.appointmentId,
    });
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel appointment',
      error: error.message,
    });
  }
};

/**
 * GET /api/self-schedule/my-appointments
 * Get client's upcoming appointments
 */
export const getMyAppointments = async (req: Request, res: Response) => {
  try {
    // TODO: Client portal/self-scheduling not yet implemented - clients don't have user accounts
    return res.status(501).json({
      success: false,
      message: 'Client self-scheduling not yet implemented. Please contact your provider for appointment information.',
    });
  } catch (error: any) {
    logger.error('Get my appointments error', {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve appointments',
      error: error.message,
    });
  }
};

/**
 * GET /api/self-schedule/appointment-types
 * Get available appointment types for self-scheduling
 */
export const getAppointmentTypes = async (req: Request, res: Response) => {
  try {
    logger.info('Getting appointment types for self-scheduling');

    const appointmentTypes = await prisma.appointmentType.findMany({
      where: {
        isActive: true,
        allowOnlineBooking: true,
      },
      select: {
        id: true,
        typeName: true,
        category: true,
        description: true,
        defaultDuration: true,
        colorCode: true,
        iconName: true,
      },
      orderBy: {
        typeName: 'asc',
      },
    });

    res.status(200).json({
      success: true,
      data: appointmentTypes,
    });
  } catch (error: any) {
    logger.error('Get appointment types error', {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve appointment types',
      error: error.message,
    });
  }
};
