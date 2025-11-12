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

    // Get client ID from authenticated user
    const clientId = req.user?.clientId;
    if (!clientId) {
      return res.status(403).json({
        success: false,
        message: 'Client authentication required',
      });
    }

    const slotTime = new Date(appointmentDate);

    logger.info('Booking appointment', {
      clientId,
      clinicianId,
      appointmentDate,
      appointmentType,
    });

    // Check if slot can be booked
    const canBook = await availableSlotsService.canBookSlot(
      clinicianId,
      slotTime,
      clientId,
      duration
    );

    if (!canBook.canBook) {
      return res.status(400).json({
        success: false,
        message: canBook.reason || 'Slot cannot be booked',
      });
    }

    // Get scheduling rules to determine auto-confirmation
    const rules = await getEffectiveRules(clinicianId);

    // Calculate start and end times
    const startTime = format(slotTime, 'HH:mm');
    const endTime = format(addMinutes(slotTime, duration), 'HH:mm');

    // Create appointment using transaction to prevent double-booking
    const appointment = await prisma.$transaction(async (tx) => {
      // Double-check for conflicts within transaction
      const conflict = await tx.appointment.findFirst({
        where: {
          clinicianId,
          appointmentDate: {
            gte: addMinutes(slotTime, -rules.bufferTime),
            lt: addMinutes(slotTime, duration + rules.bufferTime),
          },
          status: {
            in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN'],
          },
        },
      });

      if (conflict) {
        throw new Error('Slot is no longer available');
      }

      // Get client details
      const client = await tx.client.findUnique({
        where: { id: clientId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });

      if (!client) {
        throw new Error('Client not found');
      }

      // Create the appointment
      const newAppointment = await tx.appointment.create({
        data: {
          clientId,
          clinicianId,
          appointmentDate: slotTime,
          startTime,
          endTime,
          duration,
          appointmentType,
          serviceLocation,
          timezone: 'America/New_York', // Should be from org settings
          status: rules.autoConfirm ? 'CONFIRMED' : 'SCHEDULED',
          statusUpdatedDate: new Date(),
          statusUpdatedBy: clientId,
          appointmentNotes: notes,
          createdBy: clientId, // Required field: who created this appointment (audit trail)
          lastModifiedBy: clientId, // Required field: who last modified this appointment
        },
        include: {
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              title: true,
              email: true,
            },
          },
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return newAppointment;
    });

    logger.info('Appointment booked successfully', {
      appointmentId: appointment.id,
      clientId,
      clinicianId,
      status: appointment.status,
    });

    // TODO: Send confirmation email/notification
    // await sendAppointmentConfirmation(appointment);

    res.status(201).json({
      success: true,
      message: rules.autoConfirm
        ? 'Appointment confirmed successfully'
        : 'Appointment request submitted and pending clinician approval',
      data: appointment,
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

    // Get client ID from authenticated user
    const clientId = req.user?.clientId;
    if (!clientId) {
      return res.status(403).json({
        success: false,
        message: 'Client authentication required',
      });
    }

    logger.info('Rescheduling appointment', {
      appointmentId,
      clientId,
      newAppointmentDate,
    });

    // Get existing appointment
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    // Verify client owns this appointment
    if (existingAppointment.clientId !== clientId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reschedule this appointment',
      });
    }

    // Check if appointment can be cancelled (same rules apply for rescheduling)
    const canCancel = await availableSlotsService.canCancelAppointment(
      appointmentId,
      existingAppointment.clinicianId
    );

    if (!canCancel.canCancel) {
      return res.status(400).json({
        success: false,
        message: canCancel.reason,
      });
    }

    const newSlotTime = new Date(newAppointmentDate);

    // Check if new slot can be booked
    const canBook = await availableSlotsService.canBookSlot(
      existingAppointment.clinicianId,
      newSlotTime,
      clientId,
      existingAppointment.duration
    );

    if (!canBook.canBook) {
      return res.status(400).json({
        success: false,
        message: canBook.reason || 'New slot cannot be booked',
      });
    }

    // Get scheduling rules
    const rules = await getEffectiveRules(existingAppointment.clinicianId);

    // Calculate new start and end times
    const startTime = format(newSlotTime, 'HH:mm');
    const endTime = format(addMinutes(newSlotTime, existingAppointment.duration), 'HH:mm');

    // Update appointment
    const updatedAppointment = await prisma.$transaction(async (tx) => {
      // Double-check for conflicts at new time
      const conflict = await tx.appointment.findFirst({
        where: {
          clinicianId: existingAppointment.clinicianId,
          id: { not: appointmentId },
          appointmentDate: {
            gte: addMinutes(newSlotTime, -rules.bufferTime),
            lt: addMinutes(newSlotTime, existingAppointment.duration + rules.bufferTime),
          },
          status: {
            in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN'],
          },
        },
      });

      if (conflict) {
        throw new Error('New slot is no longer available');
      }

      return await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          appointmentDate: newSlotTime,
          startTime,
          endTime,
          status: rules.autoConfirm ? 'CONFIRMED' : 'SCHEDULED',
          statusUpdatedDate: new Date(),
          statusUpdatedBy: clientId,
          appointmentNotes: reason
            ? `${existingAppointment.appointmentNotes || ''}\n\nRescheduled: ${reason}`.trim()
            : existingAppointment.appointmentNotes,
        },
        include: {
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              title: true,
              email: true,
            },
          },
        },
      });
    });

    logger.info('Appointment rescheduled successfully', {
      appointmentId,
      oldDate: existingAppointment.appointmentDate,
      newDate: newSlotTime,
    });

    // TODO: Send reschedule notification
    // await sendRescheduleNotification(updatedAppointment);

    res.status(200).json({
      success: true,
      message: 'Appointment rescheduled successfully',
      data: updatedAppointment,
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

    // Get client ID from authenticated user
    const clientId = req.user?.clientId;
    if (!clientId) {
      return res.status(403).json({
        success: false,
        message: 'Client authentication required',
      });
    }

    logger.info('Cancelling appointment', {
      appointmentId,
      clientId,
      reason,
    });

    // Get existing appointment
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    // Verify client owns this appointment
    if (existingAppointment.clientId !== clientId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this appointment',
      });
    }

    // Check if appointment can be cancelled
    const canCancel = await availableSlotsService.canCancelAppointment(
      appointmentId,
      existingAppointment.clinicianId
    );

    if (!canCancel.canCancel) {
      return res.status(400).json({
        success: false,
        message: canCancel.reason,
      });
    }

    // Cancel the appointment
    const cancelledAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'CANCELLED',
        statusUpdatedDate: new Date(),
        statusUpdatedBy: clientId,
        cancellationDate: new Date(),
        cancellationReason: reason,
        cancellationNotes: notes,
        cancelledBy: clientId,
        cancellationFeeApplied: false, // Determine based on cancellation policy
      },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            email: true,
          },
        },
      },
    });

    logger.info('Appointment cancelled successfully', {
      appointmentId,
      clientId,
    });

    // TODO: Send cancellation notification
    // await sendCancellationNotification(cancelledAppointment);

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: cancelledAppointment,
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
    const clientId = req.user?.clientId;
    if (!clientId) {
      return res.status(403).json({
        success: false,
        message: 'Client authentication required',
      });
    }

    logger.info('Getting client appointments', { clientId });

    const appointments = await prisma.appointment.findMany({
      where: {
        clientId,
        appointmentDate: {
          gte: new Date(),
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN'],
        },
      },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            email: true,
          },
        },
      },
      orderBy: {
        appointmentDate: 'asc',
      },
    });

    res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (error: any) {
    logger.error('Get my appointments error', {
      error: error.message,
      clientId: req.user?.clientId,
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
