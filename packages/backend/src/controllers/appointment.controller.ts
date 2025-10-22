import { Request, Response } from 'express';
import logger, { logControllerError } from '../utils/logger';
import { z } from 'zod';
import { auditLogger } from '../utils/logger';
import * as recurringService from '../services/recurringAppointment.service';
import prisma from '../services/database';
import { Prisma } from '@mentalspace/database';
import { applyAppointmentScope, assertCanAccessClient } from '../services/accessControl.service';
import { calculateNoteDueDate } from '../services/compliance.service';
// Fixed phoneNumber -> primaryPhone field name

const ensureAppointmentAccess = async (
  req: Request,
  appointmentId: string,
  options: { allowBillingView?: boolean } = {}
) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, clientId: true },
  });

  if (!appointment) {
    return null;
  }

  await assertCanAccessClient(req.user, {
    clientId: appointment.clientId,
    allowBillingView: options.allowBillingView,
  });

  return appointment;
};


// Appointment validation schemas
const createAppointmentSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  clinicianId: z.string().uuid('Invalid clinician ID'),
  appointmentDate: z.string().datetime('Invalid appointment date'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid start time format (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid end time format (HH:MM)'),
  duration: z.number().int().min(15).max(480, 'Duration must be between 15 and 480 minutes'),
  appointmentType: z.string().min(1, 'Appointment type is required'),
  serviceLocation: z.string().min(1, 'Service location is required'),
  officeLocationId: z.string().uuid().optional(),
  room: z.string().optional(),
  timezone: z.string().default('America/New_York'),
  cptCode: z.string().optional(),
  icdCodes: z.array(z.string()).optional(),
  appointmentNotes: z.string().optional(),
});

const updateAppointmentSchema = createAppointmentSchema.partial().omit({
  clientId: true,
  clinicianId: true
});

const checkInSchema = z.object({
  checkedInTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
});

const checkOutSchema = z.object({
  checkedOutTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  actualDuration: z.number().int().min(1).optional(),
});

const cancelAppointmentSchema = z.object({
  cancellationReason: z.string().min(1, 'Cancellation reason is required'),
  cancellationNotes: z.string().optional(),
  cancellationFeeApplied: z.boolean().default(false),
});

const rescheduleAppointmentSchema = z.object({
  appointmentDate: z.string().datetime('Invalid appointment date'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid start time format'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid end time format'),
  appointmentNotes: z.string().optional(), // Field for reschedule notes
});

const recurrencePatternSchema = z.object({
  frequency: z.enum(['twice_weekly', 'weekly', 'bi_weekly', 'monthly', 'custom']),
  daysOfWeek: z.array(z.string()).optional(),
  endDate: z.string().optional(),
  count: z.number().int().min(2).max(52).optional(),
}).refine((data) => data.endDate || data.count, {
  message: 'Either endDate or count must be provided',
});

const createRecurringAppointmentSchema = createAppointmentSchema.extend({
  isRecurring: z.literal(true),
  recurrencePattern: recurrencePatternSchema,
});

// Get appointments by client ID
export const getAppointmentsByClientId = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    await assertCanAccessClient(req.user, { clientId, allowBillingView: true });

    const appointments = await prisma.appointment.findMany({
      where: { clientId },
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
      orderBy: { appointmentDate: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    logger.error('Get client appointments error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve client appointments',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get all appointments (with filters)
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
      limit = '50'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const baseWhere: Record<string, unknown> = {};

    if (clientId) baseWhere.clientId = clientId as string;
    if (clinicianId) baseWhere.clinicianId = clinicianId as string;
    if (status) baseWhere.status = status as string;
    if (appointmentType) baseWhere.appointmentType = appointmentType as string;

    if (startDate || endDate) {
      const dateRange: Record<string, Date> = {};
      if (startDate) {
        dateRange.gte = new Date(startDate as string);
      }
      if (endDate) {
        dateRange.lte = new Date(endDate as string);
      }
      baseWhere.appointmentDate = dateRange;
    }

    const scopedWhere = applyAppointmentScope(req.user, baseWhere, { allowBillingView: true });

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where: scopedWhere,
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              primaryPhone: true,
            },
          },
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
        orderBy: { appointmentDate: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.appointment.count({ where: scopedWhere }),
    ]);

    res.status(200).json({
      success: true,
      data: appointments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Get appointments error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve appointments',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
// Get single appointment by ID
export const getAppointmentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            primaryPhone: true,
            dateOfBirth: true,
          },
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            email: true,
            licenseNumber: true,
          },
        },
      },
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    await assertCanAccessClient(req.user, {
      clientId: appointment.clientId,
      allowBillingView: true,
    });

    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    logger.error('Get appointment error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve appointment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Create new appointment
export const createAppointment = async (req: Request, res: Response) => {
  try {
    const validatedData = createAppointmentSchema.parse(req.body);
    const userId = (req as any).user?.userId;

    await assertCanAccessClient(req.user, { clientId: validatedData.clientId });

    // Check for scheduling conflicts
    const conflicts = await prisma.appointment.findMany({
      where: {
        clinicianId: validatedData.clinicianId,
        appointmentDate: new Date(validatedData.appointmentDate),
        status: {
          in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_SESSION'],
        },
        OR: [
          {
            AND: [
              { startTime: { lte: validatedData.startTime } },
              { endTime: { gt: validatedData.startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: validatedData.endTime } },
              { endTime: { gte: validatedData.endTime } },
            ],
          },
        ],
      },
    });

    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Scheduling conflict detected',
        conflicts,
      });
    }


    const appointmentData: Prisma.AppointmentUncheckedCreateInput = {
      clientId: validatedData.clientId,
      clinicianId: validatedData.clinicianId,
      appointmentDate: new Date(validatedData.appointmentDate),
      startTime: validatedData.startTime,
      endTime: validatedData.endTime,
      duration: validatedData.duration,
      appointmentType: validatedData.appointmentType,
      serviceLocation: validatedData.serviceLocation,
      timezone: validatedData.timezone,
      status: 'SCHEDULED',
      statusUpdatedBy: userId,
      createdBy: userId,
      lastModifiedBy: userId,
      icdCodes: validatedData.icdCodes || [],
      cptCode: validatedData.cptCode || null,
      appointmentNotes: validatedData.appointmentNotes,
    };

    const appointment = await prisma.appointment.create({
      data: appointmentData,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
      },
    });

    // Audit log
    auditLogger.info('Appointment created', {
      userId,
      appointmentId: appointment.id,
      clientId: appointment.clientId,
      action: 'APPOINTMENT_CREATED',
    });

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: appointment,
    });
  } catch (error) {
    logger.error('Create appointment error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create appointment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Create recurring appointments
export const createRecurringAppointments = async (req: Request, res: Response) => {
  try {
    const validatedData = createRecurringAppointmentSchema.parse(req.body);
    const userId = (req as any).user?.userId;

    await assertCanAccessClient(req.user, { clientId: validatedData.clientId });

    // Generate appointments from recurrence pattern
    const baseData = {
      clientId: validatedData.clientId,
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
      validatedData.recurrencePattern as any
    );

    // Check for conflicts across all generated appointments
    const dates = appointments.map((apt) => (apt.appointmentDate instanceof Date ? apt.appointmentDate : new Date(apt.appointmentDate as string)));
    const conflictCheck = await recurringService.checkSeriesConflicts(
      validatedData.clinicianId,
      dates,
      validatedData.startTime,
      validatedData.endTime
    );

    if (conflictCheck.hasConflicts) {
      return res.status(409).json({
        success: false,
        message: 'Scheduling conflicts detected in recurring series',
        conflicts: conflictCheck.conflicts,
      });
    }

    // Create all appointments
    const createdAppointments = await prisma.$transaction(
      appointments.map((appointmentData) =>
        prisma.appointment.create({
          data: appointmentData,
        })
      )
    );

    // Audit log
    auditLogger.info('Recurring appointments created', {
      userId,
      count: createdAppointments.length,
      parentRecurrenceId: appointments[0]?.parentRecurrenceId,
      action: 'RECURRING_APPOINTMENTS_CREATED',
    });

    res.status(201).json({
      success: true,
      message: `${createdAppointments.length} recurring appointments created successfully`,
      data: {
        count: createdAppointments.length,
        parentRecurrenceId: appointments[0]?.parentRecurrenceId,
        appointments: createdAppointments,
      },
    });
  } catch (error) {
    logger.error('Create recurring appointments error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create recurring appointments',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Update appointment
export const updateAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateAppointmentSchema.parse(req.body);
    const userId = (req as any).user?.userId;

    // Check if appointment exists
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }
    await assertCanAccessClient(req.user, { clientId: existingAppointment.clientId });


    // Check for scheduling conflicts if time/date is being changed
    if (validatedData.appointmentDate || validatedData.startTime || validatedData.endTime) {
      const appointmentDate = validatedData.appointmentDate
        ? new Date(validatedData.appointmentDate)
        : existingAppointment.appointmentDate;
      const startTime = validatedData.startTime || existingAppointment.startTime;
      const endTime = validatedData.endTime || existingAppointment.endTime;

      const conflicts = await prisma.appointment.findMany({
        where: {
          id: { not: id },
          clinicianId: existingAppointment.clinicianId,
          appointmentDate,
          status: {
            in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_SESSION'],
          },
          OR: [
            {
              AND: [
                { startTime: { lte: startTime } },
                { endTime: { gt: startTime } },
              ],
            },
            {
              AND: [
                { startTime: { lt: endTime } },
                { endTime: { gte: endTime } },
              ],
            },
          ],
        },
      });

      if (conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Scheduling conflict detected',
          conflicts,
        });
      }
    }

    const updateData: any = {
      ...validatedData,
      lastModifiedBy: userId,
      updatedAt: new Date(),
    };

    if (validatedData.appointmentDate) {
      updateData.appointmentDate = new Date(validatedData.appointmentDate);
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
      },
    });

    // Audit log
    auditLogger.info('Appointment updated', {
      userId,
      appointmentId: id,
      action: 'APPOINTMENT_UPDATED',
    });

    res.status(200).json({
      success: true,
      message: 'Appointment updated successfully',
      data: appointment,
    });
  } catch (error) {
    logger.error('Update appointment error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update appointment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Check-in appointment
export const checkInAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!(await ensureAppointmentAccess(req, id))) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    const validatedData = checkInSchema.parse(req.body);
    const userId = (req as any).user?.userId;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CHECKED_IN',
        checkedInTime: validatedData.checkedInTime,
        checkedInBy: userId,
        statusUpdatedDate: new Date(),
        statusUpdatedBy: userId,
      },
      include: {
        client: true,
        clinician: true,
      },
    });

    auditLogger.info('Client checked in', {
      userId,
      appointmentId: id,
      action: 'APPOINTMENT_CHECKED_IN',
    });

    res.status(200).json({
      success: true,
      message: 'Client checked in successfully',
      data: appointment,
    });
  } catch (error) {
    logger.error('Check-in error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to check in appointment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Check-out appointment
export const checkOutAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!(await ensureAppointmentAccess(req, id))) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    const validatedData = checkOutSchema.parse(req.body);
    const userId = (req as any).user?.userId;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        checkedOutTime: validatedData.checkedOutTime,
        checkedOutBy: userId,
        actualDuration: validatedData.actualDuration,
        statusUpdatedDate: new Date(),
        statusUpdatedBy: userId,
      },
      include: {
        client: true,
        clinician: true,
      },
    });

    auditLogger.info('Client checked out', {
      userId,
      appointmentId: id,
      action: 'APPOINTMENT_CHECKED_OUT',
    });

    res.status(200).json({
      success: true,
      message: 'Client checked out successfully',
      data: appointment,
    });
  } catch (error) {
    logger.error('Check-out error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to check out appointment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Cancel appointment
export const cancelAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!(await ensureAppointmentAccess(req, id))) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    const validatedData = cancelAppointmentSchema.parse(req.body);
    const userId = (req as any).user?.userId;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancellationDate: new Date(),
        cancellationReason: validatedData.cancellationReason,
        cancellationNotes: validatedData.cancellationNotes,
        cancellationFeeApplied: validatedData.cancellationFeeApplied,
        cancelledBy: userId,
        statusUpdatedDate: new Date(),
        statusUpdatedBy: userId,
      },
      include: {
        client: true,
        clinician: true,
      },
    });

    auditLogger.info('Appointment cancelled', {
      userId,
      appointmentId: id,
      reason: validatedData.cancellationReason,
      action: 'APPOINTMENT_CANCELLED',
    });

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: appointment,
    });
  } catch (error) {
    logger.error('Cancel appointment error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to cancel appointment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Reschedule appointment
export const rescheduleAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!(await ensureAppointmentAccess(req, id))) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    const validatedData = rescheduleAppointmentSchema.parse(req.body);
    const userId = (req as any).user?.userId;

    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    // Check for conflicts at new time
    const conflicts = await prisma.appointment.findMany({
      where: {
        id: { not: id },
        clinicianId: existingAppointment.clinicianId,
        appointmentDate: new Date(validatedData.appointmentDate),
        status: {
          in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_SESSION'],
        },
        OR: [
          {
            AND: [
              { startTime: { lte: validatedData.startTime } },
              { endTime: { gt: validatedData.startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: validatedData.endTime } },
              { endTime: { gte: validatedData.endTime } },
            ],
          },
        ],
      },
    });

    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Scheduling conflict detected at new time',
        conflicts,
      });
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        appointmentDate: new Date(validatedData.appointmentDate),
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        status: 'RESCHEDULED',
        appointmentNotes: validatedData.appointmentNotes,
        statusUpdatedDate: new Date(),
        statusUpdatedBy: userId,
      },
      include: {
        client: true,
        clinician: true,
      },
    });

    // Sync linked clinical notes with the rescheduled appointment date
    const newSessionDate = new Date(validatedData.appointmentDate);
    await prisma.clinicalNote.updateMany({
      where: { appointmentId: id },
      data: {
        sessionDate: newSessionDate,
        dueDate: calculateNoteDueDate(newSessionDate),
      },
    });

    auditLogger.info('Appointment rescheduled', {
      userId,
      appointmentId: id,
      action: 'APPOINTMENT_RESCHEDULED',
    });

    res.status(200).json({
      success: true,
      message: 'Appointment rescheduled successfully',
      data: appointment,
    });
  } catch (error) {
    logger.error('Reschedule appointment error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to reschedule appointment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Mark as no-show
export const markNoShow = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!(await ensureAppointmentAccess(req, id))) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    const { noShowFeeApplied, noShowNotes } = req.body;
    const userId = (req as any).user?.userId;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'NO_SHOW',
        noShowDate: new Date(),
        noShowFeeApplied: noShowFeeApplied || false,
        noShowNotes,
        statusUpdatedDate: new Date(),
        statusUpdatedBy: userId,
      },
      include: {
        client: true,
        clinician: true,
      },
    });

    auditLogger.info('Appointment marked as no-show', {
      userId,
      appointmentId: id,
      action: 'APPOINTMENT_NO_SHOW',
    });

    res.status(200).json({
      success: true,
      message: 'Appointment marked as no-show',
      data: appointment,
    });
  } catch (error) {
    logger.error('Mark no-show error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    res.status(500).json({
      success: false,
      message: 'Failed to mark appointment as no-show',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Delete appointment
export const deleteAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!(await ensureAppointmentAccess(req, id))) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    const userId = (req as any).user?.userId;

    await prisma.appointment.delete({
      where: { id },
    });

    auditLogger.info('Appointment deleted', {
      userId,
      appointmentId: id,
      action: 'APPOINTMENT_DELETED',
    });

    res.status(200).json({
      success: true,
      message: 'Appointment deleted successfully',
    });
  } catch (error) {
    logger.error('Delete appointment error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    res.status(500).json({
      success: false,
      message: 'Failed to delete appointment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get or create appointment for clinical note
// This endpoint supports the mandatory appointment requirement for clinical notes
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

    const userId = (req as any).user?.userId;

    // Validation
    if (!clientId || !appointmentDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'clientId, appointmentDate, startTime, and endTime are required',
      });
    }

    await assertCanAccessClient(req.user, { clientId });

    const parsedDate = new Date(appointmentDate);
    const finalClinicianId = clinicianId || userId;

    // Check if appointment already exists
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        clientId,
        clinicianId: finalClinicianId,
        appointmentDate: parsedDate,
        startTime,
        endTime,
        status: {
          notIn: ['CANCELLED', 'NO_SHOW'],
        },
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
      },
    });

    if (existingAppointment) {
      return res.status(200).json({
        success: true,
        message: 'Existing appointment found',
        data: existingAppointment,
        created: false,
      });
    }

    // Calculate duration
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);

    if (duration <= 0 || duration > 480) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time range. Duration must be between 1 and 480 minutes',
      });
    }

    // Check for scheduling conflicts
    const conflicts = await prisma.appointment.findMany({
      where: {
        clinicianId: finalClinicianId,
        appointmentDate: parsedDate,
        status: {
          in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_SESSION'],
        },
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
        ],
      },
    });

    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Scheduling conflict detected',
        conflicts,
      });
    }

    // Create new appointment
    const newAppointment = await prisma.appointment.create({
      data: {
        clientId,
        clinicianId: finalClinicianId,
        appointmentDate: parsedDate,
        startTime,
        endTime,
        duration,
        appointmentType,
        serviceLocation,
        timezone: 'America/New_York',
        status: 'SCHEDULED',
        statusUpdatedBy: userId,
        createdBy: userId,
        lastModifiedBy: userId,
        icdCodes: [],
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
      },
    });

    auditLogger.info('Appointment created via getOrCreate', {
      userId,
      appointmentId: newAppointment.id,
      clientId,
      action: 'APPOINTMENT_GET_OR_CREATE',
    });

    res.status(201).json({
      success: true,
      message: 'New appointment created',
      data: newAppointment,
      created: true,
    });
  } catch (error) {
    logControllerError('getOrCreateAppointment', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get or create appointment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
