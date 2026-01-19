import { Request, Response } from 'express';
import logger, { logControllerError } from '../utils/logger';
import { z } from 'zod';
import { auditLogger } from '../utils/logger';
import * as recurringService from '../services/recurringAppointment.service';
import prisma from '../services/database';
import { Prisma } from '@mentalspace/database';
import { applyAppointmentScope, assertCanAccessClient } from '../services/accessControl.service';
import { calculateNoteDueDate } from '../services/compliance.service';
import * as telehealthService from '../services/telehealth.service';
import * as waitlistIntegrationService from '../services/waitlist-integration.service';
import { AdvancedMDEligibilityService } from '../services/advancedmd/eligibility.service';
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


// Helper function to normalize time strings to HH:MM format (with leading zero)
// This fixes the bug where "8:30" > "09:00" in string comparison
const normalizeTimeFormat = (time: string): string => {
  const [hours, minutes] = time.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
};

// Helper function to convert time string to minutes for accurate comparison
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Appointment validation schemas
const baseAppointmentSchema = z.object({
  // Group appointment support: either clientId (individual) or clientIds (group)
  clientId: z.string().uuid('Invalid client ID').optional(),
  isGroupAppointment: z.boolean().default(false),
  clientIds: z.array(z.string().uuid('Invalid client ID')).min(2, 'Group appointments require at least 2 clients').optional(),

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

const createAppointmentSchema = baseAppointmentSchema.refine(
  (data) => {
    // Either clientId or clientIds must be provided
    if (data.isGroupAppointment) {
      return data.clientIds && data.clientIds.length >= 2;
    } else {
      return !!data.clientId;
    }
  },
  {
    message: 'Either clientId (individual) or clientIds (group with 2+ clients) is required',
    path: ['clientId'],
  }
);

const updateAppointmentSchema = baseAppointmentSchema.partial().omit({
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

const createRecurringAppointmentSchema = baseAppointmentSchema.extend({
  isRecurring: z.literal(true),
  recurrencePattern: recurrencePatternSchema,
}).refine(
  (data) => !!data.clientId,
  {
    message: 'clientId is required for recurring appointments',
    path: ['clientId'],
  }
);

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

    const scopedWhere = await applyAppointmentScope(req.user, baseWhere, { allowBillingView: true });

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

    // Extract userId with proper fallback and validation
    const userId = (req as any).user?.userId || (req as any).user?.id;
    if (!userId) {
      logControllerError('User authentication context missing', new Error('No userId in request'), {
        reqUser: (req as any).user,
        headers: req.headers.authorization ? 'Present' : 'Missing'
      });
      return res.status(400).json({
        success: false,
        message: 'User authentication context missing. Please log in again.'
      });
    }

    // Validate client access based on appointment type
    if (validatedData.isGroupAppointment && validatedData.clientIds) {
      // For group appointments, validate access to all clients
      for (const clientId of validatedData.clientIds) {
        await assertCanAccessClient(req.user, { clientId });
      }
    } else if (validatedData.clientId) {
      // For individual appointments, validate single client access
      await assertCanAccessClient(req.user, { clientId: validatedData.clientId });
    }

    // Normalize time formats to HH:MM (with leading zeros) for proper comparison
    const normalizedStartTime = normalizeTimeFormat(validatedData.startTime);
    const normalizedEndTime = normalizeTimeFormat(validatedData.endTime);
    const newStartMinutes = timeToMinutes(normalizedStartTime);
    const newEndMinutes = timeToMinutes(normalizedEndTime);

    // Check for scheduling conflicts - fetch all appointments for the clinician on that date
    // then filter using proper time comparison (fixes bug where "8:30" > "09:00" in string comparison)
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        clinicianId: validatedData.clinicianId,
        appointmentDate: new Date(validatedData.appointmentDate),
        status: {
          in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_SESSION'],
        },
      },
    });

    // Filter conflicts using proper time comparison
    const conflicts = existingAppointments.filter((apt) => {
      const existingStart = timeToMinutes(apt.startTime);
      const existingEnd = timeToMinutes(apt.endTime);

      // Check for overlap: new appointment overlaps if:
      // 1. New start is within existing appointment (existingStart <= newStart < existingEnd)
      // 2. New end is within existing appointment (existingStart < newEnd <= existingEnd)
      // 3. New appointment completely contains existing (newStart <= existingStart && newEnd >= existingEnd)
      const startsWithinExisting = newStartMinutes >= existingStart && newStartMinutes < existingEnd;
      const endsWithinExisting = newEndMinutes > existingStart && newEndMinutes <= existingEnd;
      const containsExisting = newStartMinutes <= existingStart && newEndMinutes >= existingEnd;

      return startsWithinExisting || endsWithinExisting || containsExisting;
    });

    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Scheduling conflict detected',
        conflicts,
      });
    }

    // Create appointment data
    // For group appointments, use the first client as the primary (until AppointmentClient junction is implemented)
    const primaryClientId = validatedData.isGroupAppointment
      ? validatedData.clientIds![0]
      : validatedData.clientId!;

    const appointmentData: Prisma.AppointmentUncheckedCreateInput = {
      clientId: primaryClientId,
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
      isGroupSession: validatedData.isGroupAppointment || false,
    };

    // Use transaction to create appointment and AppointmentClient records atomically
    const appointment = await prisma.$transaction(async (tx) => {
      // Create the appointment
      const newAppointment = await tx.appointment.create({
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

      // TODO: Re-enable when AppointmentClient model is added to schema for group appointments
      // If group appointment, create AppointmentClient records
      // if (validatedData.isGroupAppointment && validatedData.clientIds) {
      //   await tx.appointmentClient.createMany({
      //     data: validatedData.clientIds.map((clientId, index) => ({
      //       appointmentId: newAppointment.id,
      //       clientId,
      //       isPrimary: index === 0, // First client is primary for billing
      //     })),
      //   });

        // Fetch appointment with all clients for response
        return await tx.appointment.findUnique({
          where: { id: newAppointment.id },
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
            // appointmentClients: {
            //   include: {
            //     client: {
            //       select: {
            //         id: true,
            //         firstName: true,
            //         lastName: true,
            //         email: true,
            //       },
            //     },
            //   },
          },
        });
      // }

      // return newAppointment;
    });

    // Audit log
    if (validatedData.isGroupAppointment && validatedData.clientIds) {
      auditLogger.info('Group appointment created', {
        userId,
        appointmentId: appointment?.id,
        clientIds: validatedData.clientIds,
        clientCount: validatedData.clientIds.length,
        action: 'GROUP_APPOINTMENT_CREATED',
      });
    } else {
      auditLogger.info('Appointment created', {
        userId,
        appointmentId: appointment?.id,
        clientId: appointment?.clientId,
        action: 'APPOINTMENT_CREATED',
      });
    }

    // Auto-create telehealth session if service location is Telehealth
    if (appointment && appointment.serviceLocation === 'Telehealth') {
      try {
        const telehealthSession = await telehealthService.createTelehealthSession({
          appointmentId: appointment.id,
          createdBy: userId,
        });
        logger.info('Telehealth session auto-created for appointment', {
          appointmentId: appointment.id,
          sessionId: telehealthSession.id,
        });
      } catch (telehealthError) {
        // Log error but don't fail appointment creation
        logger.error('Failed to auto-create telehealth session', {
          appointmentId: appointment.id,
          error: telehealthError instanceof Error ? telehealthError.message : 'Unknown error',
        });
      }
    }

    res.status(201).json({
      success: true,
      message: validatedData.isGroupAppointment
        ? `Group appointment created successfully with ${validatedData.clientIds?.length} clients`
        : 'Appointment created successfully',
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

    if (validatedData.clientId) {
      await assertCanAccessClient(req.user, { clientId: validatedData.clientId });
    }

    // Generate appointments from recurrence pattern
    // clientId is validated as required by the schema refinement
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
    // Uses proper numerical time comparison to fix bug where "8:30" > "09:00" in string comparison
    if (validatedData.appointmentDate || validatedData.startTime || validatedData.endTime) {
      const appointmentDate = validatedData.appointmentDate
        ? new Date(validatedData.appointmentDate)
        : existingAppointment.appointmentDate;
      const startTime = normalizeTimeFormat(validatedData.startTime || existingAppointment.startTime);
      const endTime = normalizeTimeFormat(validatedData.endTime || existingAppointment.endTime);

      // Fetch all appointments for the clinician on that date, then filter with proper time comparison
      const existingAppointments = await prisma.appointment.findMany({
        where: {
          id: { not: id },
          clinicianId: existingAppointment.clinicianId,
          appointmentDate,
          status: {
            in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_SESSION'],
          },
        },
      });

      // Filter conflicts using proper numerical time comparison
      const newStartMinutes = timeToMinutes(startTime);
      const newEndMinutes = timeToMinutes(endTime);
      const conflicts = existingAppointments.filter((apt) => {
        const existingStart = timeToMinutes(apt.startTime);
        const existingEnd = timeToMinutes(apt.endTime);
        // Check for overlap
        const startsWithinExisting = newStartMinutes >= existingStart && newStartMinutes < existingEnd;
        const endsWithinExisting = newEndMinutes > existingStart && newEndMinutes <= existingEnd;
        const containsExisting = newStartMinutes <= existingStart && newEndMinutes >= existingEnd;
        return startsWithinExisting || endsWithinExisting || containsExisting;
      });

      if (conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Scheduling conflict detected',
          conflicts,
        });
      }
    }

    // Strip out fields that don't exist in the Prisma Appointment model
    // isGroupAppointment and clientIds are in the schema for validation but not DB columns
    // (clientId and clinicianId are already omitted by updateAppointmentSchema)
    const { isGroupAppointment, clientIds, ...dbFields } = validatedData;

    const updateData: any = {
      ...dbFields,
      lastModifiedBy: userId,
      updatedAt: new Date(),
    };

    if (dbFields.appointmentDate) {
      updateData.appointmentDate = new Date(dbFields.appointmentDate);
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

    // Trigger waitlist matching for the freed slot (async, don't block response)
    waitlistIntegrationService.handleAppointmentCancellation(id, {
      clinicianId: appointment.clinicianId,
      appointmentDate: appointment.appointmentDate,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      appointmentType: appointment.appointmentType,
    }).catch((error) => {
      logger.error('Error triggering waitlist after cancellation', {
        appointmentId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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

    // Check for conflicts at new time using proper numerical time comparison
    // This fixes the bug where "8:30" > "09:00" in string comparison
    const normalizedStartTime = normalizeTimeFormat(validatedData.startTime);
    const normalizedEndTime = normalizeTimeFormat(validatedData.endTime);
    const newStartMinutes = timeToMinutes(normalizedStartTime);
    const newEndMinutes = timeToMinutes(normalizedEndTime);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        id: { not: id },
        clinicianId: existingAppointment.clinicianId,
        appointmentDate: new Date(validatedData.appointmentDate),
        status: {
          in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_SESSION'],
        },
      },
    });

    // Filter conflicts using proper numerical time comparison
    const conflicts = existingAppointments.filter((apt) => {
      const existingStart = timeToMinutes(apt.startTime);
      const existingEnd = timeToMinutes(apt.endTime);
      const startsWithinExisting = newStartMinutes >= existingStart && newStartMinutes < existingEnd;
      const endsWithinExisting = newEndMinutes > existingStart && newEndMinutes <= existingEnd;
      const containsExisting = newStartMinutes <= existingStart && newEndMinutes >= existingEnd;
      return startsWithinExisting || endsWithinExisting || containsExisting;
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

    // Check for scheduling conflicts using proper numerical time comparison
    // This fixes the bug where "8:30" > "09:00" in string comparison
    const normalizedStartTime = normalizeTimeFormat(startTime);
    const normalizedEndTime = normalizeTimeFormat(endTime);
    const newStartMinutes = timeToMinutes(normalizedStartTime);
    const newEndMinutes = timeToMinutes(normalizedEndTime);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        clinicianId: finalClinicianId,
        appointmentDate: parsedDate,
        status: {
          in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_SESSION'],
        },
      },
    });

    // Filter conflicts using proper numerical time comparison
    const conflicts = existingAppointments.filter((apt) => {
      const existingStart = timeToMinutes(apt.startTime);
      const existingEnd = timeToMinutes(apt.endTime);
      const startsWithinExisting = newStartMinutes >= existingStart && newStartMinutes < existingEnd;
      const endsWithinExisting = newEndMinutes > existingStart && newEndMinutes <= existingEnd;
      const containsExisting = newStartMinutes <= existingStart && newEndMinutes >= existingEnd;
      return startsWithinExisting || endsWithinExisting || containsExisting;
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

// ============================================================================
// PHASE 3: DRAG-AND-DROP RESCHEDULING
// ============================================================================

/**
 * Quick reschedule for drag-and-drop operations
 * Validates and updates appointment time/date/clinician in one operation
 */
export const quickReschedule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { appointmentDate, startTime, endTime, clinicianId } = req.body;
    const userId = (req as any).user?.userId;

    // Validate required fields
    if (!appointmentDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'appointmentDate, startTime, and endTime are required',
      });
    }

    // Check appointment access
    if (!(await ensureAppointmentAccess(req, id))) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        client: true,
        clinician: true,
      },
    });

    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    // Use existing clinician if not specified
    const targetClinicianId = clinicianId || existingAppointment.clinicianId;

    // Parse dates
    const newDate = new Date(appointmentDate);
    if (isNaN(newDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format',
      });
    }

    // Check for conflicts at new time using proper numerical time comparison
    // This fixes the bug where "8:30" > "09:00" in string comparison
    const normalizedStartTime = normalizeTimeFormat(startTime);
    const normalizedEndTime = normalizeTimeFormat(endTime);
    const newStartMinutes = timeToMinutes(normalizedStartTime);
    const newEndMinutes = timeToMinutes(normalizedEndTime);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        id: { not: id },
        clinicianId: targetClinicianId,
        appointmentDate: newDate,
        status: {
          in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_SESSION'],
        },
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Filter conflicts using proper numerical time comparison
    const conflicts = existingAppointments.filter((apt) => {
      const existingStart = timeToMinutes(apt.startTime);
      const existingEnd = timeToMinutes(apt.endTime);
      const startsWithinExisting = newStartMinutes >= existingStart && newStartMinutes < existingEnd;
      const endsWithinExisting = newEndMinutes > existingStart && newEndMinutes <= existingEnd;
      const containsExisting = newStartMinutes <= existingStart && newEndMinutes >= existingEnd;
      return startsWithinExisting || endsWithinExisting || containsExisting;
    });

    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Scheduling conflict detected at new time',
        conflicts: conflicts.map((c) => ({
          id: c.id,
          clientName: `${c.client.firstName} ${c.client.lastName}`,
          startTime: c.startTime,
          endTime: c.endTime,
        })),
      });
    }

    // Calculate duration
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);

    // Update appointment
    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        appointmentDate: newDate,
        startTime,
        endTime,
        duration,
        clinicianId: targetClinicianId,
        status: 'RESCHEDULED',
        statusUpdatedDate: new Date(),
        statusUpdatedBy: userId,
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
        appointmentTypeObj: {
          select: {
            typeName: true,
            colorCode: true,
          },
        },
      },
    });

    // Sync linked clinical notes with the rescheduled appointment date
    await prisma.clinicalNote.updateMany({
      where: { appointmentId: id },
      data: {
        sessionDate: newDate,
        dueDate: calculateNoteDueDate(newDate),
      },
    });

    auditLogger.info('Appointment quick rescheduled', {
      userId,
      appointmentId: id,
      action: 'APPOINTMENT_QUICK_RESCHEDULE',
      from: {
        date: existingAppointment.appointmentDate,
        startTime: existingAppointment.startTime,
        clinicianId: existingAppointment.clinicianId,
      },
      to: {
        date: newDate,
        startTime,
        clinicianId: targetClinicianId,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Appointment rescheduled successfully',
      data: appointment,
    });
  } catch (error) {
    logControllerError('quickReschedule', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reschedule appointment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Validate if a time slot is available for an appointment
 * Used for drag-and-drop preview/validation before committing
 */
export const validateTimeSlot = async (req: Request, res: Response) => {
  try {
    const { appointmentId, appointmentDate, startTime, endTime, clinicianId } = req.body;

    if (!appointmentDate || !startTime || !endTime || !clinicianId) {
      return res.status(400).json({
        success: false,
        message: 'appointmentDate, startTime, endTime, and clinicianId are required',
      });
    }

    // Parse date
    const newDate = new Date(appointmentDate);
    if (isNaN(newDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format',
      });
    }

    // Check for conflicts using proper numerical time comparison
    // This fixes the bug where "8:30" > "09:00" in string comparison
    const normalizedStartTime = normalizeTimeFormat(startTime);
    const normalizedEndTime = normalizeTimeFormat(endTime);
    const newStartMinutes = timeToMinutes(normalizedStartTime);
    const newEndMinutes = timeToMinutes(normalizedEndTime);

    const whereClause: any = {
      clinicianId,
      appointmentDate: newDate,
      status: {
        in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_SESSION'],
      },
    };

    // Exclude the appointment being moved
    if (appointmentId) {
      whereClause.id = { not: appointmentId };
    }

    const existingAppointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Filter conflicts using proper numerical time comparison
    const conflicts = existingAppointments.filter((apt) => {
      const existingStart = timeToMinutes(apt.startTime);
      const existingEnd = timeToMinutes(apt.endTime);
      const startsWithinExisting = newStartMinutes >= existingStart && newStartMinutes < existingEnd;
      const endsWithinExisting = newEndMinutes > existingStart && newEndMinutes <= existingEnd;
      const containsExisting = newStartMinutes <= existingStart && newEndMinutes >= existingEnd;
      return startsWithinExisting || endsWithinExisting || containsExisting;
    });

    const isAvailable = conflicts.length === 0;

    res.status(200).json({
      success: true,
      data: {
        isAvailable,
        conflicts: conflicts.map((c) => ({
          id: c.id,
          clientName: `${c.client.firstName} ${c.client.lastName}`,
          startTime: c.startTime,
          endTime: c.endTime,
          status: c.status,
        })),
      },
    });
  } catch (error) {
    logControllerError('validateTimeSlot', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate time slot',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ============================================================================
// PHASE 3: MULTI-SELECT BULK OPERATIONS
// ============================================================================

/**
 * Bulk update appointment statuses
 * Allows updating multiple appointments at once
 */
export const bulkUpdateStatus = async (req: Request, res: Response) => {
  try {
    const { appointmentIds, status, notes } = req.body;
    const userId = (req as any).user?.userId;

    if (!appointmentIds || !Array.isArray(appointmentIds) || appointmentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'appointmentIds array is required',
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'status is required',
      });
    }

    // Validate status
    const validStatuses = ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_SESSION', 'COMPLETED', 'NO_SHOW', 'CANCELLED', 'RESCHEDULED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Update all appointments
    const updateData: any = {
      status,
      statusUpdatedDate: new Date(),
      statusUpdatedBy: userId,
    };

    if (notes) {
      updateData.appointmentNotes = notes;
    }

    const result = await prisma.appointment.updateMany({
      where: {
        id: { in: appointmentIds },
      },
      data: updateData,
    });

    auditLogger.info('Bulk status update', {
      userId,
      appointmentCount: result.count,
      newStatus: status,
      action: 'BULK_STATUS_UPDATE',
    });

    res.status(200).json({
      success: true,
      message: `Updated ${result.count} appointments`,
      data: {
        updatedCount: result.count,
      },
    });
  } catch (error) {
    logControllerError('bulkUpdateStatus', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update appointments',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Bulk cancel appointments
 * Cancels multiple appointments at once
 */
export const bulkCancelAppointments = async (req: Request, res: Response) => {
  try {
    const { appointmentIds, cancellationReason, cancellationNotes } = req.body;
    const userId = (req as any).user?.userId;

    if (!appointmentIds || !Array.isArray(appointmentIds) || appointmentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'appointmentIds array is required',
      });
    }

    // Update all appointments
    const result = await prisma.appointment.updateMany({
      where: {
        id: { in: appointmentIds },
      },
      data: {
        status: 'CANCELLED',
        cancellationReason: cancellationReason || 'Bulk cancellation',
        cancellationNotes,
        cancellationDate: new Date(),
        statusUpdatedDate: new Date(),
        statusUpdatedBy: userId,
      },
    });

    auditLogger.info('Bulk cancellation', {
      userId,
      appointmentCount: result.count,
      reason: cancellationReason,
      action: 'BULK_CANCEL',
    });

    res.status(200).json({
      success: true,
      message: `Cancelled ${result.count} appointments`,
      data: {
        cancelledCount: result.count,
      },
    });
  } catch (error) {
    logControllerError('bulkCancelAppointments', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel appointments',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Bulk delete appointments
 * Deletes multiple appointments at once (hard delete)
 */
export const bulkDeleteAppointments = async (req: Request, res: Response) => {
  try {
    const { appointmentIds } = req.body;
    const userId = (req as any).user?.userId;

    if (!appointmentIds || !Array.isArray(appointmentIds) || appointmentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'appointmentIds array is required',
      });
    }

    // Delete associated reminders first
    await prisma.appointmentReminder.deleteMany({
      where: {
        appointmentId: { in: appointmentIds },
      },
    });

    // Delete appointments
    const result = await prisma.appointment.deleteMany({
      where: {
        id: { in: appointmentIds },
      },
    });

    auditLogger.info('Bulk deletion', {
      userId,
      appointmentCount: result.count,
      action: 'BULK_DELETE',
    });

    res.status(200).json({
      success: true,
      message: `Deleted ${result.count} appointments`,
      data: {
        deletedCount: result.count,
      },
    });
  } catch (error) {
    logControllerError('bulkDeleteAppointments', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete appointments',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Bulk assign room to appointments
 * Assigns a room to multiple appointments at once
 */
export const bulkAssignRoom = async (req: Request, res: Response) => {
  try {
    const { appointmentIds, room } = req.body;
    const userId = (req as any).user?.userId;

    if (!appointmentIds || !Array.isArray(appointmentIds) || appointmentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'appointmentIds array is required',
      });
    }

    if (!room) {
      return res.status(400).json({
        success: false,
        message: 'room is required',
      });
    }

    // Update all appointments
    const result = await prisma.appointment.updateMany({
      where: {
        id: { in: appointmentIds },
      },
      data: {
        room,
      },
    });

    auditLogger.info('Bulk room assignment', {
      userId,
      appointmentCount: result.count,
      room,
      action: 'BULK_ASSIGN_ROOM',
    });

    res.status(200).json({
      success: true,
      message: `Assigned room "${room}" to ${result.count} appointments`,
      data: {
        updatedCount: result.count,
      },
    });
  } catch (error) {
    logControllerError('bulkAssignRoom', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign room',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ============================================================================
// PHASE 3: ROOM VIEW (RESOURCE SCHEDULING)
// ============================================================================

/**
 * Get appointments grouped by room for resource scheduling
 * Displays which rooms are occupied and when
 */
export const getRoomView = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, viewType = 'day' } = req.query;

    // Validation
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
      });
    }

    // Parse dates
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format',
      });
    }

    // Fetch all appointments within date range that have a room assigned
    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: start,
          lte: end,
        },
        room: {
          not: null,
        },
        status: {
          not: 'CANCELLED',
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
        appointmentTypeObj: {
          select: {
            typeName: true,
            colorCode: true,
            category: true,
          },
        },
      },
      orderBy: [
        { appointmentDate: 'asc' },
        { startTime: 'asc' },
      ],
    });

    // Get unique rooms
    const rooms = [...new Set(appointments.map((apt) => apt.room).filter((room): room is string => room !== null))].sort();

    // Group appointments by room
    const roomSchedules = rooms.map((room) => {
      const roomAppts = appointments.filter((appt) => appt.room === room);

      return {
        room,
        appointments: roomAppts.map((appt) => ({
          id: appt.id,
          clientName: `${appt.client.firstName} ${appt.client.lastName}`,
          clientId: appt.client.id,
          clinicianName: `${appt.clinician.firstName} ${appt.clinician.lastName}`,
          clinicianId: appt.clinician.id,
          appointmentDate: appt.appointmentDate,
          startTime: appt.startTime,
          endTime: appt.endTime,
          duration: appt.duration,
          status: appt.status,
          appointmentType: appt.appointmentType,
          serviceLocation: appt.serviceLocation,
          colorCode: appt.appointmentTypeObj?.colorCode || '#3b82f6',
          confirmedAt: appt.confirmedAt,
        })),
        totalAppointments: roomAppts.length,
        occupancyRate: calculateRoomOccupancy(roomAppts, start, end),
      };
    });

    // Calculate summary statistics
    const summary = {
      totalRooms: rooms.length,
      totalAppointments: appointments.length,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      viewType,
      averageOccupancy:
        roomSchedules.length > 0
          ? roomSchedules.reduce((sum, r) => sum + r.occupancyRate, 0) / roomSchedules.length
          : 0,
    };

    res.status(200).json({
      success: true,
      data: {
        summary,
        roomSchedules,
      },
    });
  } catch (error) {
    logControllerError('getRoomView', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch room view',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Helper function to calculate room occupancy rate
 */
function calculateRoomOccupancy(appointments: any[], startDate: Date, endDate: Date): number {
  if (appointments.length === 0) return 0;

  // Calculate total available time in minutes (assuming 8 AM to 8 PM, 12 hours = 720 minutes per day)
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const totalAvailableMinutes = daysDiff * 720; // 12 hours per day

  // Calculate total occupied time
  const totalOccupiedMinutes = appointments.reduce((sum, appt) => sum + appt.duration, 0);

  // Return occupancy as a percentage
  return Math.round((totalOccupiedMinutes / totalAvailableMinutes) * 100);
}

// ============================================================================
// PHASE 3: PROVIDER COMPARISON VIEW
// ============================================================================

/**
 * Get appointments for multiple providers within a date range
 * Used for side-by-side provider schedule comparison
 */
export const getProviderComparison = async (req: Request, res: Response) => {
  try {
    const { providerIds, startDate, endDate, viewType = 'day' } = req.query;

    // Validation
    if (!providerIds || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'providerIds, startDate, and endDate are required',
      });
    }

    // Parse provider IDs
    const providerIdArray = Array.isArray(providerIds)
      ? providerIds
      : (providerIds as string).split(',');

    // Parse dates
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format',
      });
    }

    // Fetch all provider information first (so we have data even if they have no appointments)
    const providers = await prisma.user.findMany({
      where: {
        id: { in: providerIdArray as string[] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        title: true,
      },
    });

    // Create a map for easy lookup
    const providerMap = new Map(providers.map(p => [p.id, p]));

    // Fetch appointments for all providers
    const appointments = await prisma.appointment.findMany({
      where: {
        clinicianId: { in: providerIdArray as string[] },
        appointmentDate: {
          gte: start,
          lte: end,
        },
        status: {
          not: 'CANCELLED',
        },
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
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
        appointmentTypeObj: {
          select: {
            typeName: true,
            colorCode: true,
            category: true,
          },
        },
      },
      orderBy: [
        { appointmentDate: 'asc' },
        { startTime: 'asc' },
      ],
    });

    // Group appointments by provider
    const providerSchedules = providerIdArray.map(providerId => {
      const providerAppts = appointments.filter(appt => appt.clinicianId === providerId);
      const provider = providerMap.get(providerId as string);

      return {
        providerId,
        provider: provider || null,
        appointments: providerAppts.map(appt => ({
          id: appt.id,
          clientName: `${appt.client.firstName} ${appt.client.lastName}`,
          clientId: appt.client.id,
          appointmentDate: appt.appointmentDate,
          startTime: appt.startTime,
          endTime: appt.endTime,
          duration: appt.duration,
          status: appt.status,
          appointmentType: appt.appointmentType,
          serviceLocation: appt.serviceLocation,
          room: appt.room,
          colorCode: appt.appointmentTypeObj?.colorCode || '#3b82f6',
          confirmedAt: appt.confirmedAt,
          noShowRiskLevel: appt.noShowRiskLevel,
        })),
        totalAppointments: providerAppts.length,
        confirmedCount: providerAppts.filter(a => a.confirmedAt).length,
        pendingCount: providerAppts.filter(a => !a.confirmedAt).length,
      };
    });

    // Calculate summary statistics
    const summary = {
      totalProviders: providerIdArray.length,
      totalAppointments: appointments.length,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      viewType,
    };

    res.status(200).json({
      success: true,
      data: {
        summary,
        providerSchedules,
      },
    });
  } catch (error) {
    logControllerError('getProviderComparison', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch provider comparison',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ============================================================================
// PHASE 5: INSURANCE ELIGIBILITY VERIFICATION (AdvancedMD Integration)
// ============================================================================

/**
 * Check insurance eligibility for a specific appointment
 * Verifies coverage status with payer before the appointment
 */
export const checkAppointmentEligibility = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { skipCache = false } = req.query;

    // Verify appointment exists and user has access
    if (!(await ensureAppointmentAccess(req, id, { allowBillingView: true }))) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
          },
        },
      },
    });

    if (!appointment || !appointment.clientId) {
      return res.status(404).json({
        success: false,
        message: 'Appointment or client not found',
      });
    }

    // Check eligibility via AdvancedMD
    const eligibilityService = AdvancedMDEligibilityService.getInstance();
    const eligibilityResult = await eligibilityService.checkEligibilityForAppointment(id);

    // Determine eligibility status
    const isEligible = eligibilityResult.success && eligibilityResult.eligibilityData?.isEligible;

    res.status(200).json({
      success: true,
      data: {
        appointmentId: id,
        clientId: appointment.clientId,
        clientName: `${appointment.client.firstName} ${appointment.client.lastName}`,
        appointmentDate: appointment.appointmentDate,
        eligibility: eligibilityResult,
      },
    });
  } catch (error) {
    logControllerError('checkAppointmentEligibility', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check eligibility',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Batch check eligibility for all appointments on a given date
 * Used for front desk to verify coverage before appointments
 */
export const checkDailyEligibility = async (req: Request, res: Response) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'date query parameter is required',
      });
    }

    const targetDate = new Date(date as string);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format',
      });
    }

    // Check eligibility for all appointments on the date via AdvancedMD
    const eligibilityService = AdvancedMDEligibilityService.getInstance();
    const eligibilityResults = await eligibilityService.checkEligibilityForDateAppointments(targetDate);

    // Return results - the results contain clientId which can be used to identify appointments
    res.status(200).json({
      success: true,
      message: `Eligibility checked for ${eligibilityResults.totalChecked} appointments (${eligibilityResults.successCount} successful, ${eligibilityResults.failureCount} failed)`,
      data: eligibilityResults,
    });
  } catch (error) {
    logControllerError('checkDailyEligibility', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check daily eligibility',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Enhanced check-in with automatic eligibility verification
 * Verifies insurance coverage as part of the check-in process
 */
export const checkInWithEligibility = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { checkedInTime, verifyEligibility = true } = req.body;
    const userId = (req as any).user?.userId;

    // Verify appointment exists and user has access
    if (!(await ensureAppointmentAccess(req, id))) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    // Validate check-in time
    if (!checkedInTime || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(checkedInTime)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid check-in time format (HH:MM)',
      });
    }

    // Optionally verify eligibility during check-in
    let eligibilityResult = null;
    if (verifyEligibility) {
      try {
        const eligibilityService = AdvancedMDEligibilityService.getInstance();
        eligibilityResult = await eligibilityService.checkEligibilityForAppointment(id);
      } catch (eligibilityError) {
        // Log but don't fail check-in if eligibility check fails
        logger.warn('Eligibility check failed during check-in', {
          appointmentId: id,
          error: eligibilityError instanceof Error ? eligibilityError.message : 'Unknown error',
        });
        eligibilityResult = { success: false, error: 'Eligibility check unavailable' };
      }
    }

    // Determine eligibility status
    const isEligible = eligibilityResult?.success && eligibilityResult?.eligibilityData?.isEligible;

    // Prepare update data - core check-in fields only
    const updateData: any = {
      status: 'CHECKED_IN',
      checkedInTime,
      checkedInBy: userId,
      statusUpdatedDate: new Date(),
      statusUpdatedBy: userId,
    };

    // Update appointment
    const appointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
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

    auditLogger.info('Client checked in with eligibility', {
      userId,
      appointmentId: id,
      eligibilityVerified: eligibilityResult?.success || false,
      eligibilityStatus: isEligible ? 'VERIFIED' : 'NOT_VERIFIED',
      action: 'APPOINTMENT_CHECKED_IN_WITH_ELIGIBILITY',
    });

    res.status(200).json({
      success: true,
      message: isEligible
        ? 'Client checked in - eligibility verified'
        : eligibilityResult?.success === false
          ? 'Client checked in - eligibility check unavailable'
          : 'Client checked in - eligibility not verified',
      data: {
        appointment,
        eligibility: eligibilityResult,
      },
    });
  } catch (error) {
    logControllerError('checkInWithEligibility', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check in with eligibility',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
