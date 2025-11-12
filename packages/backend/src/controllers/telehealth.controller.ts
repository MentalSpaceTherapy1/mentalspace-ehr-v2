import { Request, Response } from 'express';
import { z } from 'zod';
import * as telehealthService from '../services/telehealth.service';
import logger from '../utils/logger';

const createSessionSchema = z.object({
  appointmentId: z.string().uuid('Invalid appointment ID'),
});

const joinSessionSchema = z.object({
  appointmentId: z.string().uuid('Invalid appointment ID'),
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
    const userId = (req as any).user?.userId;

    const session = await telehealthService.createTelehealthSession({
      appointmentId: validatedData.appointmentId,
      createdBy: userId,
    });

    res.status(201).json({
      success: true,
      message: 'Telehealth session created successfully',
      data: session,
    });
  } catch (error: any) {
    logger.error('Error creating telehealth session', {
      errorMessage: error.message,
      errorName: error.name,
      errorCode: error.code || error.$metadata?.httpStatusCode,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create telehealth session',
    });
  }
};

export const joinTelehealthSession = async (req: Request, res: Response) => {
  try {
    const validatedData = joinSessionSchema.parse(req.body);
    const userId = (req as any).user?.userId;
    const user = (req as any).user;
    const userName = user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email || 'User';

    const result = await telehealthService.joinTelehealthSession({
      sessionId: validatedData.appointmentId,
      userId,
      userRole: validatedData.userRole,
      userName,
    });

    res.status(200).json({
      success: true,
      message: 'Joined telehealth session successfully',
      data: result,
    });
  } catch (error: any) {
    logger.error('Error joining telehealth session', {
      errorMessage: error.message,
      errorName: error.name,
      errorCode: error.code || error.$metadata?.httpStatusCode,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to join telehealth session',
    });
  }
};

export const endTelehealthSession = async (req: Request, res: Response) => {
  try {
    const validatedData = endSessionSchema.parse(req.body);
    const userId = (req as any).user?.userId;

    const session = await telehealthService.endTelehealthSession(
      validatedData.sessionId,
      userId,
      validatedData.endReason
    );

    res.status(200).json({
      success: true,
      message: 'Telehealth session ended successfully',
      data: session,
    });
  } catch (error: any) {
    logger.error('Error ending telehealth session', {
      errorMessage: error.message,
      errorName: error.name,
      errorCode: error.code || error.$metadata?.httpStatusCode,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to end telehealth session',
    });
  }
};

export const getTelehealthSession = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;

    const session = await telehealthService.getTelehealthSession(appointmentId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Telehealth session not found',
      });
    }

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error: any) {
    logger.error('Error getting telehealth session', {
      errorMessage: error.message,
      errorName: error.name,
      errorCode: error.code || error.$metadata?.httpStatusCode,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to get telehealth session',
    });
  }
};

export const enableRecording = async (req: Request, res: Response) => {
  try {
    const validatedData = recordingSchema.parse(req.body);
    const userId = (req as any).user?.userId;

    const session = await telehealthService.enableRecording(
      validatedData.sessionId,
      userId,
      validatedData.consent ?? true
    );

    res.status(200).json({
      success: true,
      message: 'Recording enabled successfully',
      data: session,
    });
  } catch (error: any) {
    logger.error('Error enabling recording', {
      errorMessage: error.message,
      errorName: error.name,
      errorCode: error.code || error.$metadata?.httpStatusCode,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to enable recording',
    });
  }
};

export const stopRecording = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = (req as any).user?.userId;

    const session = await telehealthService.stopRecording(sessionId, userId);

    res.status(200).json({
      success: true,
      message: 'Recording stopped successfully',
      data: session,
    });
  } catch (error: any) {
    logger.error('Error stopping recording', {
      errorMessage: error.message,
      errorName: error.name,
      errorCode: error.code || error.$metadata?.httpStatusCode,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to stop recording',
    });
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
    const userId = (req as any).user?.userId;

    const session = await telehealthService.activateEmergency({
      ...validatedData,
      userId,
    });

    res.status(200).json({
      success: true,
      message: 'Emergency protocol activated successfully',
      data: session,
    });
  } catch (error: any) {
    logger.error('Error activating emergency protocol', {
      errorMessage: error.message,
      errorName: error.name,
      errorCode: error.code || error.$metadata?.httpStatusCode,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to activate emergency protocol',
    });
  }
};

export const getEmergencyContact = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const emergencyContact = await telehealthService.getClientEmergencyContact(sessionId);

    res.status(200).json({
      success: true,
      data: emergencyContact,
    });
  } catch (error: any) {
    logger.error('Error getting emergency contact', {
      errorMessage: error.message,
      errorName: error.name,
      errorCode: error.code || error.$metadata?.httpStatusCode,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to get emergency contact',
    });
  }
};

export const getTwilioStatus = async (req: Request, res: Response) => {
  try {
    const status = telehealthService.getTwilioStatus();

    res.status(200).json({
      success: true,
      data: {
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
      },
    });
  } catch (error: any) {
    logger.error('Error getting Twilio status', {
      errorMessage: error.message,
      errorName: error.name,
    });
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get Twilio status',
    });
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
    const userId = (req as any).user?.userId;

    const rating = await telehealthService.createSessionRating({
      sessionId,
      userId,
      rating: validatedData.rating,
      comments: validatedData.comments,
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
    });

    res.status(201).json({
      success: true,
      message: 'Session rating submitted successfully',
      data: rating,
    });
  } catch (error: any) {
    logger.error('Error creating session rating', {
      errorMessage: error.message,
      errorName: error.name,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to submit session rating',
    });
  }
};

// Admin-only: Get all session ratings
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
    });

    res.status(200).json({
      success: true,
      data: ratings,
    });
  } catch (error: any) {
    logger.error('Error getting session ratings', {
      errorMessage: error.message,
      errorName: error.name,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to get session ratings',
    });
  }
};

// Admin-only: Get rating statistics
export const getSessionRatingStats = async (req: Request, res: Response) => {
  try {
    const stats = await telehealthService.getSessionRatingStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Error getting session rating stats', {
      errorMessage: error.message,
      errorName: error.name,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to get session rating statistics',
    });
  }
};
