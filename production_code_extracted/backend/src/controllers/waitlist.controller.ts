import logger, { logControllerError } from '../utils/logger';
import { Request, Response } from 'express';
import { z } from 'zod';
import * as waitlistService from '../services/waitlist.service';
import { auditLogger } from '../utils/logger';

// Validation schemas
const addToWaitlistSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  requestedClinicianId: z.string().uuid('Invalid clinician ID'),
  alternateClinicianIds: z.array(z.string().uuid()).optional(),
  requestedAppointmentType: z.string().min(1, 'Appointment type is required'),
  preferredDays: z.array(z.string()).min(1, 'At least one preferred day required'),
  preferredTimes: z.string().min(1, 'Preferred times required'),
  priority: z.enum(['Low', 'Normal', 'High', 'Urgent']).optional(),
  notes: z.string().optional(),
});

const offerAppointmentSchema = z.object({
  clinicianId: z.string().uuid('Invalid clinician ID'),
  appointmentDate: z.string().datetime('Invalid appointment date'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid start time'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid end time'),
  notificationMethod: z.enum(['Email', 'SMS', 'Phone', 'Portal']),
});

const bookFromWaitlistSchema = z.object({
  clinicianId: z.string().uuid('Invalid clinician ID'),
  appointmentDate: z.string().datetime('Invalid appointment date'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid start time'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid end time'),
  duration: z.number().int().min(15).max(480),
  serviceLocation: z.string().min(1, 'Service location required'),
  serviceCodeId: z.string().uuid('Invalid service code ID'),
  timezone: z.string().default('America/New_York'),
  notes: z.string().optional(),
});

const updatePrioritySchema = z.object({
  priority: z.enum(['Low', 'Normal', 'High', 'Urgent']),
});

/**
 * Add client to waitlist
 */
export const addToWaitlist = async (req: Request, res: Response) => {
  try {
    const validatedData = addToWaitlistSchema.parse(req.body);
    const userId = (req as any).user?.userId;

    const entry = await waitlistService.addToWaitlist({
      clientId: validatedData.clientId,
      requestedClinicianId: validatedData.requestedClinicianId,
      alternateClinicianIds: validatedData.alternateClinicianIds,
      requestedAppointmentType: validatedData.requestedAppointmentType,
      preferredDays: validatedData.preferredDays,
      preferredTimes: validatedData.preferredTimes,
      priority: validatedData.priority,
      notes: validatedData.notes,
      addedBy: userId,
    });

    res.status(201).json({
      success: true,
      message: 'Client added to waitlist successfully',
      data: entry,
    });
  } catch (error) {
    logger.error('Add to waitlist error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to add client to waitlist',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get all waitlist entries
 */
export const getWaitlistEntries = async (req: Request, res: Response) => {
  try {
    const { status, clinicianId, priority } = req.query;

    const entries = await waitlistService.getWaitlistEntries({
      status: status as string,
      clinicianId: clinicianId as string,
      priority: priority as string,
    });

    res.status(200).json({
      success: true,
      data: entries,
      count: entries.length,
    });
  } catch (error) {
    logger.error('Get waitlist entries error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve waitlist entries',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Find available slots for waitlist entry
 */
export const findAvailableSlots = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const daysAhead = req.query.daysAhead
      ? parseInt(req.query.daysAhead as string, 10)
      : 14;

    const slots = await waitlistService.findAvailableSlots(id, daysAhead);

    res.status(200).json({
      success: true,
      data: slots,
      count: slots.length,
    });
  } catch (error) {
    logger.error('Find available slots error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    res.status(500).json({
      success: false,
      message: 'Failed to find available slots',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Offer appointment to waitlist client
 */
export const offerAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = offerAppointmentSchema.parse(req.body);
    const userId = (req as any).user?.userId;

    const entry = await waitlistService.offerAppointment(
      id,
      {
        clinicianId: validatedData.clinicianId,
        appointmentDate: new Date(validatedData.appointmentDate),
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        notificationMethod: validatedData.notificationMethod,
      },
      userId
    );

    res.status(200).json({
      success: true,
      message: 'Appointment offered to client',
      data: entry,
    });
  } catch (error) {
    logger.error('Offer appointment error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to offer appointment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Book appointment from waitlist
 */
export const bookFromWaitlist = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = bookFromWaitlistSchema.parse(req.body);
    const userId = (req as any).user?.userId;

    const result = await waitlistService.bookFromWaitlist(
      id,
      {
        clinicianId: validatedData.clinicianId,
        appointmentDate: new Date(validatedData.appointmentDate),
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        duration: validatedData.duration,
        serviceLocation: validatedData.serviceLocation,
        serviceCodeId: validatedData.serviceCodeId,
        timezone: validatedData.timezone,
        notes: validatedData.notes,
      },
      userId
    );

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully from waitlist',
      data: result,
    });
  } catch (error) {
    logger.error('Book from waitlist error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to book appointment from waitlist',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Remove client from waitlist
 */
export const removeFromWaitlist = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = (req as any).user?.userId;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required',
      });
    }

    const entry = await waitlistService.removeFromWaitlist(id, reason, userId);

    res.status(200).json({
      success: true,
      message: 'Client removed from waitlist',
      data: entry,
    });
  } catch (error) {
    logger.error('Remove from waitlist error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    res.status(500).json({
      success: false,
      message: 'Failed to remove client from waitlist',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Update waitlist entry priority
 */
export const updatePriority = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updatePrioritySchema.parse(req.body);
    const userId = (req as any).user?.userId;

    const entry = await waitlistService.updatePriority(
      id,
      validatedData.priority,
      userId
    );

    res.status(200).json({
      success: true,
      message: 'Waitlist entry priority updated',
      data: entry,
    });
  } catch (error) {
    logger.error('Update priority error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update priority',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
