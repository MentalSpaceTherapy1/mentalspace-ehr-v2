import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { auditLogger } from '../utils/logger';
import * as recurringService from '../services/recurringAppointment.service';

const prisma = new PrismaClient();
// Fixed phoneNumber -> primaryPhone field name

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

const createRecurringAppointmentSchema = createAppointmentSchema.extend({
  isRecurring: z.literal(true),
  recurrencePattern: z.object({
    frequency: z.enum(['twice_weekly', 'weekly', 'bi_weekly', 'monthly', 'custom']),
    daysOfWeek: z.array(z.string()).optional(),
    endDate: z.string().optional(),
    count: z.number().int().min(2).max(52).optional(),
  }).refine((data) => data.endDate || data.count, {
    message: 'Either endDate or count must be provided',
  }),
});

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

    // Build where clause
    const where: any = {};

    if (clientId) where.clientId = clientId as string;
    if (clinicianId) where.clinicianId = clinicianId as string;
    if (status) where.status = status as string;
    if (appointmentType) where.appointmentType = appointmentType as string;

    if (startDate || endDate) {
      where.appointmentDate = {};
      if (startDate) where.appointmentDate.gte = new Date(startDate as string);
      if (endDate) where.appointmentDate.lte = new Date(endDate as string);
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
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
      prisma.appointment.count({ where }),
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
    console.error('Get appointments error:', error);
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

    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    console.error('Get appointment error:', error);
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

    const appointment = await prisma.appointment.create({
      data: {
        ...validatedData,
        appointmentDate: new Date(validatedData.appointmentDate),
        statusUpdatedBy: userId,
        createdBy: userId,
        lastModifiedBy: userId,
        icdCodes: validatedData.icdCodes || [],
      },
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
    console.error('Create appointment error:', error);

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
      appointmentNotes: validatedData.appointmentNotes,
      createdBy: userId,
    };

    const appointments = await recurringService.generateRecurringAppointments(
      baseData,
      validatedData.recurrencePattern
    );

    // Check for conflicts across all generated appointments
    const dates = appointments.map((apt: any) => new Date(apt.appointmentDate));
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
      appointments.map((apt: any) =>
        prisma.appointment.create({
          data: {
            ...apt,
            appointmentDate: new Date(apt.appointmentDate),
            statusUpdatedBy: userId,
            lastModifiedBy: userId,
          },
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
    console.error('Create recurring appointments error:', error);

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
    console.error('Update appointment error:', error);

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
    console.error('Check-in error:', error);

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
    console.error('Check-out error:', error);

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
    console.error('Cancel appointment error:', error);

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
    console.error('Reschedule appointment error:', error);

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
    console.error('Mark no-show error:', error);
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
    console.error('Delete appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete appointment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
