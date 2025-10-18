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
