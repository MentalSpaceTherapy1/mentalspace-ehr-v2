import logger from '../utils/logger';
import { Request, Response } from 'express';
import { z } from 'zod';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
import * as waitlistService from '../services/waitlist.service';
// Phase 3.2: Removed direct prisma import - using service methods instead
import { sendSuccess, sendCreated, sendBadRequest, sendForbidden, sendNotFound, sendServerError, sendUnauthorized, sendValidationError } from '../utils/apiResponse';

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
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    // Convert preferredTimes string to array and priority string to number
    const priorityMap: Record<string, number> = { 'Low': 1, 'Normal': 2, 'High': 3, 'Urgent': 4 };
    const entry = await waitlistService.addToWaitlist({
      clientId: validatedData.clientId,
      requestedClinicianId: validatedData.requestedClinicianId,
      alternateClinicianIds: validatedData.alternateClinicianIds,
      requestedAppointmentType: validatedData.requestedAppointmentType,
      preferredDays: validatedData.preferredDays,
      preferredTimes: validatedData.preferredTimes.split(',').map(t => t.trim()),
      priority: validatedData.priority ? priorityMap[validatedData.priority] : undefined,
      notes: validatedData.notes,
      addedBy: userId,
    });

    return sendCreated(res, entry, 'Client added to waitlist successfully');
  } catch (error) {
    logger.error('Add to waitlist error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return sendValidationError(res, formattedErrors);
    }

    return sendServerError(res, 'Failed to add client to waitlist');
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

    return sendSuccess(res, { data: entries, count: entries.length });
  } catch (error) {
    logger.error('Get waitlist entries error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    return sendServerError(res, 'Failed to retrieve waitlist entries');
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

    return sendSuccess(res, { data: slots, count: slots.length });
  } catch (error) {
    logger.error('Find available slots error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    return sendServerError(res, 'Failed to find available slots');
  }
};

/**
 * Offer appointment to waitlist client
 */
export const offerAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = offerAppointmentSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

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

    return sendSuccess(res, entry, 'Appointment offered to client');
  } catch (error) {
    logger.error('Offer appointment error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return sendValidationError(res, formattedErrors);
    }

    return sendServerError(res, 'Failed to offer appointment');
  }
};

/**
 * Book appointment from waitlist
 */
export const bookFromWaitlist = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = bookFromWaitlistSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

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

    return sendCreated(res, result, 'Appointment booked successfully from waitlist');
  } catch (error) {
    logger.error('Book from waitlist error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return sendValidationError(res, formattedErrors);
    }

    return sendServerError(res, 'Failed to book appointment from waitlist');
  }
};

/**
 * Remove client from waitlist
 */
export const removeFromWaitlist = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    if (!reason) {
      return sendBadRequest(res, 'Reason is required');
    }

    const entry = await waitlistService.removeFromWaitlist(id, reason, userId);

    return sendSuccess(res, entry, 'Client removed from waitlist');
  } catch (error) {
    logger.error('Remove from waitlist error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    return sendServerError(res, 'Failed to remove client from waitlist');
  }
};

/**
 * Update waitlist entry priority
 */
export const updatePriority = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updatePrioritySchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const entry = await waitlistService.updatePriority(
      id,
      validatedData.priority,
      userId
    );

    return sendSuccess(res, entry, 'Waitlist entry priority updated');
  } catch (error) {
    logger.error('Update priority error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return sendValidationError(res, formattedErrors);
    }

    return sendServerError(res, 'Failed to update priority');
  }
};

// ============================================================================
// CLIENT-SPECIFIC ENDPOINTS (Portal clients accessing their own data)
// ============================================================================

/**
 * Get current client's waitlist entries
 * Phase 3.2: Refactored to use service method
 */
export const getMyWaitlistEntries = async (req: Request, res: Response) => {
  try {
    // Get clientId from portalAccount (set by authenticateDual middleware)
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendBadRequest(res, 'Client ID not found in authentication context');
    }

    // Phase 3.2: Use service method instead of direct prisma call
    const entries = await waitlistService.getClientWaitlistEntries(clientId);

    return sendSuccess(res, { data: entries, count: entries.length });
  } catch (error) {
    logger.error('Get my waitlist entries error:', {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    });

    return sendServerError(res, 'Failed to retrieve your waitlist entries');
  }
};

/**
 * Get current client's waitlist offers
 * Phase 3.2: Refactored to use service method
 */
export const getMyWaitlistOffers = async (req: Request, res: Response) => {
  try {
    // Get clientId from portalAccount (set by authenticateDual middleware)
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendBadRequest(res, 'Client ID not found in authentication context');
    }

    // Phase 3.2: Use service method instead of direct prisma calls
    const offers = await waitlistService.getClientWaitlistOffers(clientId);

    return sendSuccess(res, { data: offers, count: offers.length });
  } catch (error) {
    logger.error('Get my waitlist offers error:', {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    });

    return sendServerError(res, 'Failed to retrieve your waitlist offers');
  }
};

/**
 * Accept a waitlist offer
 * Phase 3.2: Refactored to use service method
 */
export const acceptWaitlistOffer = async (req: Request, res: Response) => {
  try {
    const { entryId, offerId } = req.params;
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendBadRequest(res, 'Client ID not found in authentication context');
    }

    // Phase 3.2: Use service method instead of direct prisma calls
    const result = await waitlistService.acceptClientWaitlistOffer(entryId, offerId, clientId);

    if (!result.success) {
      switch (result.error) {
        case 'UNAUTHORIZED':
          return sendForbidden(res, 'Unauthorized to accept this offer');
        case 'NOT_FOUND':
          return sendNotFound(res, 'Offer');
        case 'NOT_AVAILABLE':
          return sendBadRequest(res, 'Offer is no longer available');
        case 'EXPIRED':
          return sendBadRequest(res, 'Offer has expired');
        default:
          return sendServerError(res, 'Failed to accept offer');
      }
    }

    return sendSuccess(res, { entryId, offerId }, 'Offer accepted successfully');
  } catch (error) {
    logger.error('Accept waitlist offer error:', {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    });

    return sendServerError(res, 'Failed to accept offer');
  }
};

/**
 * Decline a waitlist offer
 * Phase 3.2: Refactored to use service method
 */
export const declineWaitlistOffer = async (req: Request, res: Response) => {
  try {
    const { entryId, offerId } = req.params;
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendBadRequest(res, 'Client ID not found in authentication context');
    }

    // Phase 3.2: Use service method instead of direct prisma calls
    const result = await waitlistService.declineClientWaitlistOffer(entryId, offerId, clientId);

    if (!result.success) {
      switch (result.error) {
        case 'UNAUTHORIZED':
          return sendForbidden(res, 'Unauthorized to decline this offer');
        case 'NOT_FOUND':
          return sendNotFound(res, 'Offer');
        case 'NOT_AVAILABLE':
          return sendBadRequest(res, 'Offer is no longer available');
        default:
          return sendServerError(res, 'Failed to decline offer');
      }
    }

    return sendSuccess(res, { entryId, offerId }, 'Offer declined successfully');
  } catch (error) {
    logger.error('Decline waitlist offer error:', {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    });

    return sendServerError(res, 'Failed to decline offer');
  }
};
