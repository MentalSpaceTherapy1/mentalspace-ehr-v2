/**
 * MentalSpace EHR - Transcription Controller (Module 6 Phase 2)
 *
 * REST API endpoints for AI transcription management
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import * as transcriptionService from '../services/transcription.service';
import logger from '../utils/logger';

// Validation schemas
const startTranscriptionSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
});

const stopTranscriptionSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
});

const transcriptConsentSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  consent: z.boolean(),
});

// Helper to parse boolean from query string
const booleanFromString = z
  .union([z.boolean(), z.string()])
  .transform((val) => {
    if (typeof val === 'boolean') return val;
    return val === 'true' || val === '1';
  });

const getTranscriptsSchema = z.object({
  includePartial: booleanFromString.optional().default(false),
  limit: z.coerce.number().min(1).max(5000).optional().default(1000),
  offset: z.coerce.number().min(0).optional().default(0),
});

/**
 * POST /api/v1/telehealth/sessions/:sessionId/transcription/start
 * Start real-time transcription for a session
 */
export const startTranscription = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Validate session ID
    startTranscriptionSchema.parse({ sessionId });

    const result = await transcriptionService.startTranscription(sessionId, userId);

    res.status(200).json({
      success: true,
      message: 'Transcription started successfully',
      data: result,
    });
  } catch (error: any) {
    logger.error('Error starting transcription', {
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack,
      sessionId: req.params.sessionId,
    });

    const statusCode = error.message?.includes('consent') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to start transcription',
    });
  }
};

/**
 * POST /api/v1/telehealth/sessions/:sessionId/transcription/stop
 * Stop transcription for a session
 */
export const stopTranscription = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Validate session ID
    stopTranscriptionSchema.parse({ sessionId });

    const result = await transcriptionService.stopTranscription(sessionId, userId);

    res.status(200).json({
      success: true,
      message: 'Transcription stopped successfully',
      data: result,
    });
  } catch (error: any) {
    logger.error('Error stopping transcription', {
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack,
      sessionId: req.params.sessionId,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to stop transcription',
    });
  }
};

/**
 * GET /api/v1/telehealth/sessions/:sessionId/transcription
 * Get transcripts for a session
 */
export const getTranscripts = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Validate sessionId is present and is a valid UUID
    if (!sessionId || sessionId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required',
      });
    }

    // Check UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session ID format',
      });
    }

    const query = getTranscriptsSchema.parse(req.query);

    const transcripts = await transcriptionService.getTranscripts(sessionId, {
      includePartial: query.includePartial,
      limit: query.limit,
      offset: query.offset,
    });

    res.status(200).json({
      success: true,
      data: transcripts,
      count: transcripts.length,
    });
  } catch (error: any) {
    logger.error('Error getting transcripts', {
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack,
      sessionId: req.params.sessionId,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to get transcripts',
    });
  }
};

/**
 * GET /api/v1/telehealth/sessions/:sessionId/transcription/status
 * Get transcription status for a session
 */
export const getTranscriptionStatus = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Validate sessionId is present and valid
    if (!sessionId || sessionId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required',
      });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session ID format',
      });
    }

    const status = await transcriptionService.getTranscriptionStatus(sessionId);

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    logger.error('Error getting transcription status', {
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack,
      sessionId: req.params.sessionId,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to get transcription status',
    });
  }
};

/**
 * GET /api/v1/telehealth/sessions/:sessionId/transcription/formatted
 * Get formatted transcript text
 */
export const getFormattedTranscript = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const transcript = await transcriptionService.getFormattedTranscript(sessionId);

    res.status(200).json({
      success: true,
      data: {
        transcript,
      },
    });
  } catch (error: any) {
    logger.error('Error getting formatted transcript', {
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack,
      sessionId: req.params.sessionId,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to get formatted transcript',
    });
  }
};

/**
 * GET /api/v1/telehealth/sessions/:sessionId/transcription/export
 * Export transcript as downloadable file
 */
export const exportTranscript = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const exportContent = await transcriptionService.exportTranscript(sessionId);

    // Set headers for file download
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="transcript-${sessionId}-${Date.now()}.txt"`
    );

    res.status(200).send(exportContent);
  } catch (error: any) {
    logger.error('Error exporting transcript', {
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack,
      sessionId: req.params.sessionId,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to export transcript',
    });
  }
};

/**
 * POST /api/v1/telehealth/sessions/:sessionId/transcription/consent
 * Update transcription consent for a session
 */
export const updateTranscriptionConsent = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const validatedData = transcriptConsentSchema.parse({
      sessionId,
      ...req.body,
    });

    const session = await transcriptionService.enableTranscriptionConsent(
      validatedData.sessionId,
      userId,
      validatedData.consent
    );

    res.status(200).json({
      success: true,
      message: 'Transcription consent updated successfully',
      data: session,
    });
  } catch (error: any) {
    logger.error('Error updating transcription consent', {
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack,
      sessionId: req.params.sessionId,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update transcription consent',
    });
  }
};

/**
 * DELETE /api/v1/telehealth/sessions/:sessionId/transcription
 * Delete all transcripts for a session (HIPAA compliance)
 */
export const deleteTranscripts = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const result = await transcriptionService.deleteTranscripts(sessionId, userId);

    res.status(200).json({
      success: true,
      message: 'Transcripts deleted successfully',
      data: result,
    });
  } catch (error: any) {
    logger.error('Error deleting transcripts', {
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack,
      sessionId: req.params.sessionId,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete transcripts',
    });
  }
};
