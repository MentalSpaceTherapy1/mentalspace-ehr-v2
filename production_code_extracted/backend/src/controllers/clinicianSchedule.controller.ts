import logger, { logControllerError } from '../utils/logger';
import { Request, Response } from 'express';
import { z } from 'zod';
import * as scheduleService from '../services/clinicianSchedule.service';

// Validation schemas
const dayScheduleSchema = z.object({
  isAvailable: z.boolean(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  breakStartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  breakEndTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
});

const upsertScheduleSchema = z.object({
  clinicianId: z.string().uuid('Invalid clinician ID'),
  weeklyScheduleJson: z.object({
    monday: dayScheduleSchema,
    tuesday: dayScheduleSchema,
    wednesday: dayScheduleSchema,
    thursday: dayScheduleSchema,
    friday: dayScheduleSchema,
    saturday: dayScheduleSchema,
    sunday: dayScheduleSchema,
  }),
  acceptNewClients: z.boolean().optional(),
  maxAppointmentsPerDay: z.number().int().positive().optional(),
  maxAppointmentsPerWeek: z.number().int().positive().optional(),
  bufferTimeBetweenAppointments: z.number().int().positive().optional(),
  availableLocations: z.array(z.string()),
  effectiveStartDate: z.string().datetime('Invalid effective start date'),
  effectiveEndDate: z.string().datetime('Invalid effective end date').optional(),
});

const scheduleExceptionSchema = z.object({
  clinicianId: z.string().uuid('Invalid clinician ID'),
  exceptionType: z.string().min(1, 'Exception type required'),
  startDate: z.string().datetime('Invalid start date'),
  endDate: z.string().datetime('Invalid end date'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  allDay: z.boolean().optional(),
  reason: z.string().min(1, 'Reason required'),
  notes: z.string().optional(),
});

/**
 * Create or update clinician schedule
 */
export const upsertClinicianSchedule = async (req: Request, res: Response) => {
  try {
    const validatedData = upsertScheduleSchema.parse(req.body);
    const userId = (req as any).user?.userId;

    const schedule = await scheduleService.upsertClinicianSchedule({
      clinicianId: validatedData.clinicianId,
      weeklyScheduleJson: validatedData.weeklyScheduleJson as any,
      acceptNewClients: validatedData.acceptNewClients,
      maxAppointmentsPerDay: validatedData.maxAppointmentsPerDay,
      maxAppointmentsPerWeek: validatedData.maxAppointmentsPerWeek,
      bufferTimeBetweenAppointments: validatedData.bufferTimeBetweenAppointments,
      availableLocations: validatedData.availableLocations,
      effectiveStartDate: new Date(validatedData.effectiveStartDate),
      effectiveEndDate: validatedData.effectiveEndDate
        ? new Date(validatedData.effectiveEndDate)
        : undefined,
      createdBy: userId,
    });

    res.status(200).json({
      success: true,
      message: 'Clinician schedule saved successfully',
      data: schedule,
    });
  } catch (error) {
    logger.error('Upsert clinician schedule error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to save clinician schedule',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get clinician schedule
 */
export const getClinicianSchedule = async (req: Request, res: Response) => {
  try {
    const { clinicianId } = req.params;
    const effectiveDate = req.query.effectiveDate
      ? new Date(req.query.effectiveDate as string)
      : undefined;

    const schedule = await scheduleService.getClinicianSchedule(
      clinicianId,
      effectiveDate
    );

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found for this clinician',
      });
    }

    res.status(200).json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    logger.error('Get clinician schedule error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve clinician schedule',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get all clinicians schedules
 */
export const getAllCliniciansSchedules = async (req: Request, res: Response) => {
  try {
    const effectiveDate = req.query.effectiveDate
      ? new Date(req.query.effectiveDate as string)
      : undefined;

    const schedules = await scheduleService.getAllCliniciansSchedules(
      effectiveDate
    );

    res.status(200).json({
      success: true,
      data: schedules,
      count: schedules.length,
    });
  } catch (error) {
    logger.error('Get all clinicians schedules error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve clinicians schedules',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Create schedule exception
 */
export const createScheduleException = async (req: Request, res: Response) => {
  try {
    const validatedData = scheduleExceptionSchema.parse(req.body);
    const userId = (req as any).user?.userId;

    const exception = await scheduleService.createScheduleException({
      clinicianId: validatedData.clinicianId,
      exceptionType: validatedData.exceptionType,
      startDate: new Date(validatedData.startDate),
      endDate: new Date(validatedData.endDate),
      startTime: validatedData.startTime,
      endTime: validatedData.endTime,
      allDay: validatedData.allDay,
      reason: validatedData.reason,
      notes: validatedData.notes,
      createdBy: userId,
    });

    res.status(201).json({
      success: true,
      message: 'Schedule exception created successfully',
      data: exception,
    });
  } catch (error) {
    logger.error('Create schedule exception error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create schedule exception',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get schedule exceptions
 */
export const getScheduleExceptions = async (req: Request, res: Response) => {
  try {
    const { clinicianId } = req.params;
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;

    const exceptions = await scheduleService.getScheduleExceptions(
      clinicianId,
      startDate,
      endDate
    );

    res.status(200).json({
      success: true,
      data: exceptions,
      count: exceptions.length,
    });
  } catch (error) {
    logger.error('Get schedule exceptions error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve schedule exceptions',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Approve schedule exception
 */
export const approveScheduleException = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    const exception = await scheduleService.approveScheduleException(id, userId);

    res.status(200).json({
      success: true,
      message: 'Schedule exception approved',
      data: exception,
    });
  } catch (error) {
    logger.error('Approve schedule exception error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    res.status(500).json({
      success: false,
      message: 'Failed to approve schedule exception',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Deny schedule exception
 */
export const denyScheduleException = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { denialReason } = req.body;
    const userId = (req as any).user?.userId;

    if (!denialReason) {
      return res.status(400).json({
        success: false,
        message: 'Denial reason is required',
      });
    }

    const exception = await scheduleService.denyScheduleException(
      id,
      denialReason,
      userId
    );

    res.status(200).json({
      success: true,
      message: 'Schedule exception denied',
      data: exception,
    });
  } catch (error) {
    logger.error('Deny schedule exception error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    res.status(500).json({
      success: false,
      message: 'Failed to deny schedule exception',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Delete schedule exception
 */
export const deleteScheduleException = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    const exception = await scheduleService.deleteScheduleException(id, userId);

    res.status(200).json({
      success: true,
      message: 'Schedule exception deleted',
      data: exception,
    });
  } catch (error) {
    logger.error('Delete schedule exception error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    res.status(500).json({
      success: false,
      message: 'Failed to delete schedule exception',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get clinician availability
 */
export const getClinicianAvailability = async (req: Request, res: Response) => {
  try {
    const { clinicianId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    const availability = await scheduleService.getClinicianAvailability(
      clinicianId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.status(200).json({
      success: true,
      data: availability,
      count: availability.length,
    });
  } catch (error) {
    logger.error('Get clinician availability error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve clinician availability',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Check if clinician has capacity
 */
export const checkCapacity = async (req: Request, res: Response) => {
  try {
    const { clinicianId } = req.params;
    const { appointmentDate, startTime, duration } = req.query;

    if (!appointmentDate || !startTime || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Appointment date, start time, and duration are required',
      });
    }

    const result = await scheduleService.hasCapacity(
      clinicianId,
      new Date(appointmentDate as string),
      startTime as string,
      parseInt(duration as string, 10)
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Check capacity error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    res.status(500).json({
      success: false,
      message: 'Failed to check capacity',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
