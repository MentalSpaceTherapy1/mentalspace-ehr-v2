import { Request, Response } from 'express';
import { UserRoles } from '@mentalspace/shared';
import { z } from 'zod';
import { getErrorMessage, getErrorCode, getErrorName, getErrorStack, getErrorStatusCode } from '../utils/errorHelpers';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
import * as telehealthService from '../services/telehealth.service';
import logger from '../utils/logger';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendForbidden, sendNotFound, sendServerError } from '../utils/apiResponse';

const createSessionSchema = z.object({
  appointmentId: z.string().uuid('Invalid appointment ID'),
});

const joinSessionSchema = z.object({
  appointmentId: z.string().uuid('Invalid appointment ID').optional(), // Optional in body if provided in URL params
  userRole: z.enum(['clinician', 'client']),
});

const endSessionSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  endReason: z.string().optional(),
});

const recordingSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  consent: z.boolean().optional(),
});

export const createTelehealthSession = async (req: Request, res: Response) => {
  try {
    const validatedData = createSessionSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const session = await telehealthService.createTelehealthSession({
      appointmentId: validatedData.appointmentId,
      createdBy: userId,
    });

    return sendCreated(res, session, 'Telehealth session created successfully');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to create telehealth session';
    const errorName = error instanceof Error ? getErrorName(error) : 'UnknownError';
    const errorObj = error as { code?: string; $metadata?: { httpStatusCode?: number } };
    logger.error('Error creating telehealth session', {
      errorMessage,
      errorName,
      errorCode: errorObj.code || errorObj.$metadata?.httpStatusCode,
    });
    return sendBadRequest(res, errorMessage);
  }
};

export const joinTelehealthSession = async (req: Request, res: Response) => {
  try {
    const validatedData = joinSessionSchema.parse(req.body);
    const userId = req.user?.userId;
    const user = req.user;
    const userName = user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email || 'User';

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    // Accept appointmentId from URL params (RESTful) or body (legacy)
    const appointmentId = req.params.appointmentId || validatedData.appointmentId;

    if (!appointmentId) {
      return sendBadRequest(res, 'Appointment ID is required (either in URL path or request body)');
    }

    const result = await telehealthService.joinTelehealthSession({
      sessionId: appointmentId,
      userId,
      userRole: validatedData.userRole,
      userName,
    });

    return sendSuccess(res, result, 'Joined telehealth session successfully');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to join telehealth session';
    const errorName = error instanceof Error ? getErrorName(error) : 'UnknownError';
    const errorObj = error as { code?: string; $metadata?: { httpStatusCode?: number } };
    logger.error('Error joining telehealth session', {
      errorMessage,
      errorName,
      errorCode: errorObj.code || errorObj.$metadata?.httpStatusCode,
    });
    return sendBadRequest(res, errorMessage);
  }
};

export const endTelehealthSession = async (req: Request, res: Response) => {
  try {
    const validatedData = endSessionSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const session = await telehealthService.endTelehealthSession(
      validatedData.sessionId,
      userId,
      validatedData.endReason
    );

    return sendSuccess(res, session, 'Telehealth session ended successfully');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to end telehealth session';
    const errorName = error instanceof Error ? getErrorName(error) : 'UnknownError';
    const errorObj = error as { code?: string; $metadata?: { httpStatusCode?: number } };
    logger.error('Error ending telehealth session', {
      errorMessage,
      errorName,
      errorCode: errorObj.code || errorObj.$metadata?.httpStatusCode,
    });
    return sendBadRequest(res, errorMessage);
  }
};

/**
 * Get telehealth session details by appointment ID
 * GET /api/v1/telehealth/sessions/:appointmentId
 *
 * Retrieves session details for an existing telehealth session. If no session exists
 * but the appointment is valid for telehealth, auto-creates a new session.
 *
 * @requires Authentication - Valid user ID required for session creation
 * @param {string} req.params.appointmentId - UUID of the appointment
 * @returns {Object} Telehealth session details including video room credentials
 */
export const getTelehealthSession = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user?.userId;

    let session = await telehealthService.getTelehealthSession(appointmentId);

    // If no session exists, try to auto-create one for telehealth appointments
    if (!session) {
      // Require valid userId for session creation - prevents orphaned sessions
      if (!userId) {
        logger.warn('Cannot auto-create telehealth session without authenticated user', {
          appointmentId,
          ip: req.ip,
        });
        return sendUnauthorized(res, 'Authentication required to access telehealth sessions.');
      }

      logger.info('Telehealth session not found, attempting auto-creation', { appointmentId, userId });

      // Try to create the session on-demand
      // Bypass consent check for clinician-initiated sessions (clinician can verify consent externally)
      try {
        const createdSession = await telehealthService.createTelehealthSession({
          appointmentId,
          createdBy: userId,
          bypassConsentCheck: true, // Clinician can verify consent was obtained verbally/on paper
        });

        logger.info('Telehealth session auto-created on-demand', {
          appointmentId,
          sessionId: createdSession.id,
        });

        // Fetch the full session with relations
        session = await telehealthService.getTelehealthSession(appointmentId);
      } catch (createError: unknown) {
        // If creation fails (e.g., not a telehealth appointment, consent issues), return 404
        const createErrorMessage = createError instanceof Error ? createError.message : 'Telehealth session not found and could not be created';
        logger.warn('Failed to auto-create telehealth session', {
          appointmentId,
          error: createErrorMessage,
        });

        return sendNotFound(res, createErrorMessage);
      }
    }

    if (!session) {
      return sendNotFound(res, 'Telehealth session');
    }

    return sendSuccess(res, session);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to get telehealth session';
    const errorName = error instanceof Error ? getErrorName(error) : 'UnknownError';
    const errorObj = error as { code?: string; $metadata?: { httpStatusCode?: number } };
    logger.error('Error getting telehealth session', {
      errorMessage,
      errorName,
      errorCode: errorObj.code || errorObj.$metadata?.httpStatusCode,
    });
    return sendBadRequest(res, errorMessage);
  }
};

export const enableRecording = async (req: Request, res: Response) => {
  try {
    const validatedData = recordingSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const session = await telehealthService.enableRecording(
      validatedData.sessionId,
      userId,
      validatedData.consent ?? true
    );

    return sendSuccess(res, session, 'Recording enabled successfully');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to enable recording';
    const errorName = error instanceof Error ? getErrorName(error) : 'UnknownError';
    const errorObj = error as { code?: string; $metadata?: { httpStatusCode?: number } };
    logger.error('Error enabling recording', {
      errorMessage,
      errorName,
      errorCode: errorObj.code || errorObj.$metadata?.httpStatusCode,
    });
    return sendBadRequest(res, errorMessage);
  }
};

export const stopRecording = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const session = await telehealthService.stopRecording(sessionId, userId);

    return sendSuccess(res, session, 'Recording stopped successfully');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to stop recording';
    const errorName = error instanceof Error ? getErrorName(error) : 'UnknownError';
    const errorObj = error as { code?: string; $metadata?: { httpStatusCode?: number } };
    logger.error('Error stopping recording', {
      errorMessage,
      errorName,
      errorCode: errorObj.code || errorObj.$metadata?.httpStatusCode,
    });
    return sendBadRequest(res, errorMessage);
  }
};

const emergencySchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  emergencyNotes: z.string().min(10, 'Emergency notes must be at least 10 characters'),
  emergencyResolution: z.enum(['CONTINUED', 'ENDED_IMMEDIATELY', 'FALSE_ALARM']),
  emergencyContactNotified: z.boolean(),
});

export const activateEmergency = async (req: Request, res: Response) => {
  try {
    const validatedData = emergencySchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const session = await telehealthService.activateEmergency({
      ...validatedData,
      userId,
    });

    return sendSuccess(res, session, 'Emergency protocol activated successfully');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to activate emergency protocol';
    const errorName = error instanceof Error ? getErrorName(error) : 'UnknownError';
    const errorObj = error as { code?: string; $metadata?: { httpStatusCode?: number } };
    logger.error('Error activating emergency protocol', {
      errorMessage,
      errorName,
      errorCode: errorObj.code || errorObj.$metadata?.httpStatusCode,
    });
    return sendBadRequest(res, errorMessage);
  }
};

export const getEmergencyContact = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const emergencyContact = await telehealthService.getClientEmergencyContact(sessionId);

    return sendSuccess(res, emergencyContact);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to get emergency contact';
    const errorName = error instanceof Error ? getErrorName(error) : 'UnknownError';
    const errorObj = error as { code?: string; $metadata?: { httpStatusCode?: number } };
    logger.error('Error getting emergency contact', {
      errorMessage,
      errorName,
      errorCode: errorObj.code || errorObj.$metadata?.httpStatusCode,
    });
    return sendBadRequest(res, errorMessage);
  }
};

export const getTwilioStatus = async (req: Request, res: Response) => {
  try {
    const status = telehealthService.getTwilioStatus();

    return sendSuccess(res, {
      ...status,
      message: status.configured
        ? 'Twilio is properly configured and ready to use'
        : 'Twilio is not fully configured. Some features may use mock mode.',
      requiredCredentials: [
        'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN',
        'TWILIO_API_KEY_SID',
        'TWILIO_API_KEY_SECRET',
      ],
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to get Twilio status';
    const errorName = error instanceof Error ? getErrorName(error) : 'UnknownError';
    logger.error('Error getting Twilio status', {
      errorMessage,
      errorName,
    });
    return sendServerError(res, errorMessage);
  }
};

// Session Rating Controller
const sessionRatingSchema = z.object({
  rating: z.number().min(1).max(5),
  comments: z.string().max(500).optional().nullable(),
});

export const createSessionRating = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const validatedData = sessionRatingSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const rating = await telehealthService.createSessionRating({
      sessionId,
      userId,
      rating: validatedData.rating,
      comments: validatedData.comments,
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
    });

    return sendCreated(res, rating, 'Session rating submitted successfully');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to submit session rating';
    const errorName = error instanceof Error ? getErrorName(error) : 'UnknownError';
    logger.error('Error creating session rating', {
      errorMessage,
      errorName,
    });
    return sendBadRequest(res, errorMessage);
  }
};

// Get all session ratings with permission-based filtering
// Admins see ratings shared with admin, clinicians see ratings shared with therapist (for their sessions only)
export const getAllSessionRatings = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      minRating,
      maxRating,
      clinicianId,
      clientId,
      startDate,
      endDate,
      search,
    } = req.query;

    // Get the authenticated user's info
    const user = req.user;
    const userId = user?.userId;
    const userRoles: string[] = user?.roles || [];

    // Determine viewer role for permission filtering
    let viewerRole: 'admin' | 'clinician' | undefined;
    if (userRoles.includes(UserRoles.ADMINISTRATOR) || userRoles.includes(UserRoles.SUPER_ADMIN) || userRoles.includes(UserRoles.PRACTICE_ADMIN)) {
      viewerRole = 'admin';
    } else if (userRoles.includes(UserRoles.CLINICIAN)) {
      viewerRole = 'clinician';
    }

    const ratings = await telehealthService.getAllSessionRatings({
      page: Number(page),
      limit: Number(limit),
      minRating: minRating ? Number(minRating) : undefined,
      maxRating: maxRating ? Number(maxRating) : undefined,
      clinicianId: clinicianId as string | undefined,
      clientId: clientId as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      search: search as string | undefined,
      viewerRole,
      viewerId: userId,
    });

    return sendSuccess(res, ratings);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to get session ratings';
    const errorName = error instanceof Error ? getErrorName(error) : 'UnknownError';
    logger.error('Error getting session ratings', {
      errorMessage,
      errorName,
    });
    return sendBadRequest(res, errorMessage);
  }
};

// Admin-only: Get rating statistics
export const getSessionRatingStats = async (req: Request, res: Response) => {
  try {
    const stats = await telehealthService.getSessionRatingStats();

    return sendSuccess(res, stats);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to get session rating statistics';
    const errorName = error instanceof Error ? getErrorName(error) : 'UnknownError';
    logger.error('Error getting session rating stats', {
      errorMessage,
      errorName,
    });
    return sendBadRequest(res, errorMessage);
  }
};

// Get rating for a specific session (with permission filtering)
export const getSessionRating = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Get the authenticated user's info
    const user = req.user;
    const userId = user?.userId;
    const userRoles: string[] = user?.roles || [];

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    // Determine viewer role for permission filtering
    let viewerRole: 'admin' | 'clinician';
    if (userRoles.includes(UserRoles.ADMINISTRATOR) || userRoles.includes(UserRoles.SUPER_ADMIN) || userRoles.includes(UserRoles.PRACTICE_ADMIN)) {
      viewerRole = 'admin';
    } else if (userRoles.includes(UserRoles.CLINICIAN)) {
      viewerRole = 'clinician';
    } else {
      return sendForbidden(res, 'You do not have permission to view session ratings');
    }

    const rating = await telehealthService.getSessionRating(sessionId, viewerRole, userId);

    if (!rating) {
      return sendNotFound(res, 'No rating found for this session or you do not have permission to view it');
    }

    return sendSuccess(res, rating);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? getErrorMessage(error) : 'Failed to get session rating';
    const errorName = error instanceof Error ? getErrorName(error) : 'UnknownError';
    logger.error('Error getting session rating', {
      errorMessage,
      errorName,
    });
    return sendBadRequest(res, errorMessage);
  }
};
