import { Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../utils/errors';
import logger from '../../utils/logger';
import prisma from '../../services/database';
import { PortalRequest } from '../../types/express.d';
import * as availableSlotsService from '../../services/available-slots.service';
import { addMinutes, parseISO, format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { UserRoles } from '@mentalspace/shared';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendServerError } from '../../utils/apiResponse';
import { getErrorMessage, getErrorCode } from '../../utils/errorHelpers';

// ============================================================================
// PORTAL SELF-SCHEDULING CONTROLLER
// Allows clients to book, reschedule, and cancel appointments from the portal
// ============================================================================

// Validation schemas
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
});

/**
 * GET /portal/self-schedule/clinicians
 * Get list of clinicians available for self-scheduling (client's assigned clinician first)
 */
export const getAvailableClinicians = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Get client's primary therapist
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        primaryTherapistId: true,
      },
    });

    // Get clinicians who are available for self-scheduling
    const clinicians = await availableSlotsService.getAvailableClinicians();

    // Sort to put client's primary therapist first
    if (client?.primaryTherapistId) {
      clinicians.sort((a, b) => {
        if (a.id === client.primaryTherapistId) return -1;
        if (b.id === client.primaryTherapistId) return 1;
        return 0;
      });
    }

    return sendSuccess(res, clinicians);
  } catch (error) {
    logger.error('Error getting available clinicians:', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to get available clinicians');
  }
};

/**
 * GET /portal/self-schedule/slots/:clinicianId
 * Get available appointment slots for a clinician
 */
export const getAvailableSlots = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { clinicianId } = req.params;
    const { startDate, endDate } = req.query;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    if (!startDate || !endDate) {
      throw new AppError('startDate and endDate query parameters are required', 400);
    }

    // Validate date formats
    const start = parseISO(startDate as string);
    const end = parseISO(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new AppError('Invalid date format. Use YYYY-MM-DD', 400);
    }

    // Get available slots
    const slots = await availableSlotsService.getAvailableSlots(clinicianId, start, end);

    return sendSuccess(res, slots);
  } catch (error) {
    logger.error('Error getting available slots:', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to get available slots');
  }
};

/**
 * GET /portal/self-schedule/appointment-types
 * Get available appointment types for self-scheduling
 */
export const getAppointmentTypes = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

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

    return sendSuccess(res, appointmentTypes);
  } catch (error) {
    logger.error('Error getting appointment types:', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to get appointment types');
  }
};

/**
 * POST /portal/self-schedule/book
 * Book a new appointment
 */
export const bookAppointment = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    const validation = bookAppointmentSchema.safeParse(req.body);
    if (!validation.success) {
      return sendBadRequest(res, 'Invalid request data');
    }

    const { clinicianId, appointmentDate, appointmentType, duration, notes, serviceLocation } = validation.data;
    const slotTime = parseISO(appointmentDate);

    // Verify the client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        primaryTherapistId: true,
      },
    });

    if (!client) {
      throw new AppError('Client not found', 404);
    }

    // Verify the clinician exists and is accepting appointments
    const clinician = await prisma.user.findFirst({
      where: {
        id: clinicianId,
        roles: { hasSome: [UserRoles.CLINICIAN] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (!clinician) {
      throw new AppError('Clinician not found', 404);
    }

    // Validate that the slot can be booked
    const slotCheck = await availableSlotsService.canBookSlot(clinicianId, slotTime, clientId, duration);
    if (!slotCheck.canBook) {
      throw new AppError(slotCheck.reason || 'This time slot is not available', 400);
    }

    // Calculate end time
    const endTime = addMinutes(slotTime, duration);

    // Create the appointment
    const appointment = await prisma.appointment.create({
      data: {
        clientId,
        clinicianId,
        appointmentDate: slotTime,
        startTime: format(slotTime, 'HH:mm'),
        endTime: format(endTime, 'HH:mm'),
        duration,
        appointmentType,
        appointmentNotes: notes ? `[Self-Scheduled] ${notes}` : '[Self-Scheduled]',
        status: 'SCHEDULED',
        serviceLocation,
        createdBy: clientId,
        lastModifiedBy: clientId,
        statusUpdatedBy: clientId,
      },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Create telehealth session if telehealth appointment
    if (serviceLocation === 'TELEHEALTH') {
      try {
        const { createTelehealthSession } = await import('../../services/telehealth.service');
        await createTelehealthSession({
          appointmentId: appointment.id,
          createdBy: clientId,
        });
      } catch (telehealthError: any) {
        logger.warn('Failed to create telehealth session, appointment still created', {
          appointmentId: appointment.id,
          error: telehealthError.message,
        });
      }
    }

    // TODO: Send confirmation notification to client
    // TODO: Send notification to clinician about new booking

    logger.info('Client booked appointment via portal', {
      clientId,
      appointmentId: appointment.id,
      clinicianId,
      appointmentDate,
      appointmentType,
    });

    return sendCreated(res, appointment, 'Appointment booked successfully');
  } catch (error) {
    logger.error('Error booking appointment:', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to book appointment');
  }
};

/**
 * PUT /portal/self-schedule/reschedule/:appointmentId
 * Reschedule an existing appointment
 */
export const rescheduleAppointment = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { appointmentId } = req.params;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    const validation = rescheduleAppointmentSchema.safeParse(req.body);
    if (!validation.success) {
      return sendBadRequest(res, 'Invalid request data');
    }

    const { newAppointmentDate, reason } = validation.data;
    const newSlotTime = parseISO(newAppointmentDate);

    // Find the existing appointment
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        clientId,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
    });

    if (!existingAppointment) {
      throw new AppError('Appointment not found or cannot be rescheduled', 404);
    }

    // Check if appointment is in the past
    if (new Date(existingAppointment.appointmentDate) < new Date()) {
      throw new AppError('Cannot reschedule past appointments', 400);
    }

    // Validate that the new slot can be booked
    const slotCheck = await availableSlotsService.canBookSlot(
      existingAppointment.clinicianId,
      newSlotTime,
      clientId,
      existingAppointment.duration
    );

    if (!slotCheck.canBook) {
      throw new AppError(slotCheck.reason || 'The new time slot is not available', 400);
    }

    // Calculate new end time
    const newEndTime = addMinutes(newSlotTime, existingAppointment.duration);

    // Update the appointment
    // Build reschedule note to append to existing notes
    const rescheduleNote = `[Rescheduled ${new Date().toISOString()} by client${reason ? `: ${reason}` : ''}]`;
    const updatedNotes = existingAppointment.appointmentNotes
      ? `${existingAppointment.appointmentNotes}\n${rescheduleNote}`
      : rescheduleNote;

    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        appointmentDate: newSlotTime,
        startTime: format(newSlotTime, 'HH:mm'),
        endTime: format(newEndTime, 'HH:mm'),
        appointmentNotes: updatedNotes,
        lastModifiedBy: clientId,
      },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // If telehealth appointment, update session
    if (existingAppointment.serviceLocation === 'TELEHEALTH') {
      // Telehealth session URLs are based on appointment ID, so no update needed
      logger.info('Telehealth appointment rescheduled, session URLs remain valid', {
        appointmentId,
      });
    }

    // TODO: Send notification to clinician about reschedule

    logger.info('Client rescheduled appointment via portal', {
      clientId,
      appointmentId,
      oldDate: existingAppointment.appointmentDate,
      newDate: newAppointmentDate,
      reason,
    });

    return sendSuccess(res, updatedAppointment, 'Appointment rescheduled successfully');
  } catch (error) {
    logger.error('Error rescheduling appointment:', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to reschedule appointment');
  }
};

/**
 * DELETE /portal/self-schedule/cancel/:appointmentId
 * Cancel an appointment
 */
export const cancelAppointment = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { appointmentId } = req.params;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    const validation = cancelAppointmentSchema.safeParse(req.body);
    if (!validation.success) {
      return sendBadRequest(res, 'Invalid request data');
    }

    const { reason } = validation.data;

    // Find the appointment
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        clientId,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
    });

    if (!appointment) {
      throw new AppError('Appointment not found or cannot be cancelled', 404);
    }

    // Check if appointment is in the past
    if (new Date(appointment.appointmentDate) < new Date()) {
      throw new AppError('Cannot cancel past appointments', 400);
    }

    // Check cancellation window (24 hours)
    const hoursUntilAppointment = (new Date(appointment.appointmentDate).getTime() - Date.now()) / (1000 * 60 * 60);
    const isLateCancellation = hoursUntilAppointment < 24;

    // Update appointment status
    const cancelledAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'CANCELLED',
        cancellationReason: reason,
        cancellationDate: new Date(),
        cancelledBy: clientId,
        lastModifiedBy: clientId,
      },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Cancel telehealth session if exists
    if (appointment.serviceLocation === 'TELEHEALTH') {
      try {
        await prisma.telehealthSession.updateMany({
          where: { appointmentId },
          data: {
            status: 'CANCELLED',
            lastModifiedBy: clientId,
          },
        });
      } catch (telehealthError: any) {
        logger.warn('Failed to cancel telehealth session', {
          appointmentId,
          error: telehealthError.message,
        });
      }
    }

    // TODO: Send notification to clinician about cancellation
    // TODO: If late cancellation, potentially create fee

    logger.info('Client cancelled appointment via portal', {
      clientId,
      appointmentId,
      reason,
      isLateCancellation,
    });

    return sendSuccess(res, {
      appointment: cancelledAppointment,
      isLateCancellation,
    }, isLateCancellation
      ? 'Appointment cancelled. Note: This is a late cancellation (less than 24 hours notice) and may be subject to a fee.'
      : 'Appointment cancelled successfully');
  } catch (error) {
    logger.error('Error cancelling appointment:', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to cancel appointment');
  }
};

/**
 * GET /portal/self-schedule/my-appointments
 * Get client's appointments (upcoming and recent)
 */
export const getMyAppointments = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const includeHistory = req.query.includeHistory === 'true';
    const limit = parseInt(req.query.limit as string) || 20;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Get upcoming appointments
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        clientId,
        appointmentDate: { gte: new Date() },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      orderBy: { appointmentDate: 'asc' },
      take: limit,
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            credentials: true,
          },
        },
        telehealthSession: {
          select: {
            id: true,
            clientJoinUrl: true,
            status: true,
          },
        },
      },
    });

    let pastAppointments: any[] = [];
    if (includeHistory) {
      pastAppointments = await prisma.appointment.findMany({
        where: {
          clientId,
          appointmentDate: { lt: new Date() },
        },
        orderBy: { appointmentDate: 'desc' },
        take: limit,
        include: {
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              credentials: true,
            },
          },
        },
      });
    }

    return sendSuccess(res, {
      upcoming: upcomingAppointments,
      past: includeHistory ? pastAppointments : undefined,
    });
  } catch (error) {
    logger.error('Error getting my appointments:', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to get appointments');
  }
};
