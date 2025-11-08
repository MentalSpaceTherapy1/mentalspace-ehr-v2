/**
 * Recording Controller - API endpoints for telehealth session recording management
 *
 * Provides RESTful endpoints for:
 * - Starting/stopping recordings
 * - Accessing recordings with presigned URLs
 * - Managing recording lifecycle
 * - HIPAA-compliant access logging
 *
 * @module recording.controller
 */

import { Request, Response } from 'express';
import * as recordingService from '../services/recording.service';
import * as storageService from '../services/storage.service';
import prisma from '../services/database';
import logger from '../utils/logger';

/**
 * Start recording a telehealth session
 * POST /api/v1/telehealth/sessions/:sessionId/recording/start
 */
export async function startRecording(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    const { consentGiven, options } = req.body;
    const userId = (req as any).user?.id;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // CRITICAL: Verify consent
    if (!consentGiven) {
      return res.status(400).json({
        error: 'Client consent required to start recording',
        consentRequired: true,
      });
    }

    // Get session details
    const session = await prisma.telehealthSession.findUnique({
      where: { id: sessionId },
      select: { chimeMeetingId: true, recordingEnabled: true },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.recordingEnabled) {
      return res.status(400).json({ error: 'Recording already in progress' });
    }

    const roomSid = session.chimeMeetingId;

    // Start recording
    const result = await recordingService.startRecording(
      roomSid,
      sessionId,
      userId,
      { clientConsentGiven: consentGiven, ipAddress },
      options
    );

    logger.info('Recording started via API', {
      sessionId,
      recordingId: result.recordingId,
      userId,
      ipAddress,
    });

    res.status(200).json({
      success: true,
      recording: result,
      message: 'Recording started successfully',
    });
  } catch (error: any) {
    logger.error('Failed to start recording via API', {
      error: error.message,
      sessionId: req.params.sessionId,
      userId: (req as any).user?.id,
    });
    res.status(500).json({
      error: 'Failed to start recording',
      details: error.message,
    });
  }
}

/**
 * Stop recording a telehealth session
 * POST /api/v1/telehealth/sessions/:sessionId/recording/stop
 */
export async function stopRecording(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    const userId = (req as any).user?.id;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get recording from session
    const recording = await prisma.sessionRecording.findFirst({
      where: {
        sessionId,
        status: 'RECORDING',
      },
      orderBy: { recordingStartedAt: 'desc' },
    });

    if (!recording) {
      return res.status(404).json({ error: 'No active recording found' });
    }

    // Stop recording
    const result = await recordingService.stopRecording(
      recording.twilioRecordingSid,
      userId,
      ipAddress
    );

    logger.info('Recording stopped via API', {
      sessionId,
      recordingId: recording.id,
      userId,
      duration: result.duration,
    });

    res.status(200).json({
      success: true,
      recording: result,
      message: 'Recording stopped successfully',
    });
  } catch (error: any) {
    logger.error('Failed to stop recording via API', {
      error: error.message,
      sessionId: req.params.sessionId,
      userId: (req as any).user?.id,
    });
    res.status(500).json({
      error: 'Failed to stop recording',
      details: error.message,
    });
  }
}

/**
 * Get recording details
 * GET /api/v1/telehealth/sessions/:sessionId/recording
 */
export async function getRecording(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const recordings = await recordingService.getSessionRecordings(sessionId, userId);

    res.status(200).json({
      success: true,
      recordings,
      count: recordings.length,
    });
  } catch (error: any) {
    logger.error('Failed to get recording via API', {
      error: error.message,
      sessionId: req.params.sessionId,
      userId: (req as any).user?.id,
    });
    res.status(500).json({
      error: 'Failed to get recording',
      details: error.message,
    });
  }
}

/**
 * Generate presigned URL for playback
 * GET /api/v1/telehealth/sessions/:sessionId/recording/playback-url
 */
export async function getPlaybackUrl(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    const { recordingId } = req.query;
    const userId = (req as any).user?.id;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;
    const userAgent = req.headers['user-agent'];

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get recording
    const where: any = { sessionId, status: 'AVAILABLE' };
    if (recordingId) {
      where.id = recordingId;
    }

    const recording = await prisma.sessionRecording.findFirst({
      where,
      orderBy: { recordingStartedAt: 'desc' },
    });

    if (!recording) {
      return res.status(404).json({ error: 'Recording not available' });
    }

    // Generate presigned URL (expires in 1 hour)
    const url = await storageService.generatePresignedUrl({
      bucket: recording.storageBucket,
      key: recording.storageKey,
      expiresIn: 3600, // 1 hour
      contentType: 'video/mp4',
    });

    // Log access
    await recordingService.logRecordingAccess({
      recordingId: recording.id,
      userId,
      action: 'GENERATE_PLAYBACK_URL',
      ipAddress,
      userAgent,
    });

    logger.info('Playback URL generated', {
      sessionId,
      recordingId: recording.id,
      userId,
      expiresIn: 3600,
    });

    res.status(200).json({
      success: true,
      url,
      expiresIn: 3600,
      recordingId: recording.id,
      duration: recording.recordingDuration,
      format: recording.recordingFormat,
    });
  } catch (error: any) {
    logger.error('Failed to generate playback URL', {
      error: error.message,
      sessionId: req.params.sessionId,
      userId: (req as any).user?.id,
    });
    res.status(500).json({
      error: 'Failed to generate playback URL',
      details: error.message,
    });
  }
}

/**
 * Download recording
 * GET /api/v1/telehealth/sessions/:sessionId/recording/download
 */
export async function downloadRecording(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    const { recordingId } = req.query;
    const userId = (req as any).user?.id;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;
    const userAgent = req.headers['user-agent'];

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get recording
    const where: any = { sessionId, status: 'AVAILABLE' };
    if (recordingId) {
      where.id = recordingId;
    }

    const recording = await prisma.sessionRecording.findFirst({
      where,
      include: {
        session: {
          include: {
            appointment: {
              include: {
                client: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
      orderBy: { recordingStartedAt: 'desc' },
    });

    if (!recording) {
      return res.status(404).json({ error: 'Recording not available' });
    }

    // Log download access
    await recordingService.logRecordingAccess({
      recordingId: recording.id,
      userId,
      action: 'DOWNLOAD_RECORDING',
      ipAddress,
      userAgent,
    });

    // Generate download URL
    const url = await storageService.generatePresignedUrl({
      bucket: recording.storageBucket,
      key: recording.storageKey,
      expiresIn: 300, // 5 minutes for download
    });

    // Create filename
    const clientName = `${recording.session.appointment.client.firstName}_${recording.session.appointment.client.lastName}`;
    const date = recording.recordingStartedAt.toISOString().split('T')[0];
    const filename = `telehealth_recording_${clientName}_${date}.mp4`;

    logger.info('Recording download requested', {
      sessionId,
      recordingId: recording.id,
      userId,
      filename,
    });

    res.status(200).json({
      success: true,
      url,
      filename,
      expiresIn: 300,
      size: Number(recording.recordingSize),
      duration: recording.recordingDuration,
    });
  } catch (error: any) {
    logger.error('Failed to download recording', {
      error: error.message,
      sessionId: req.params.sessionId,
      userId: (req as any).user?.id,
    });
    res.status(500).json({
      error: 'Failed to download recording',
      details: error.message,
    });
  }
}

/**
 * Delete recording
 * DELETE /api/v1/telehealth/recordings/:recordingId
 */
export async function deleteRecording(req: Request, res: Response) {
  try {
    const { recordingId } = req.params;
    const { reason } = req.body;
    const userId = (req as any).user?.id;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!reason) {
      return res.status(400).json({ error: 'Deletion reason required' });
    }

    await recordingService.deleteRecording(recordingId, userId, reason, ipAddress);

    logger.info('Recording deleted via API', {
      recordingId,
      userId,
      reason,
    });

    res.status(200).json({
      success: true,
      message: 'Recording deleted successfully',
    });
  } catch (error: any) {
    logger.error('Failed to delete recording via API', {
      error: error.message,
      recordingId: req.params.recordingId,
      userId: (req as any).user?.id,
    });
    res.status(500).json({
      error: 'Failed to delete recording',
      details: error.message,
    });
  }
}

/**
 * List all recordings with filters
 * GET /api/v1/telehealth/recordings
 */
export async function listRecordings(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    const { status, clientId, clinicianId, startDate, endDate, limit, offset } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const filters: any = {};

    if (status) filters.status = status as string;
    if (clientId) filters.clientId = clientId as string;
    if (clinicianId) filters.clinicianId = clinicianId as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    if (limit) filters.limit = parseInt(limit as string);
    if (offset) filters.offset = parseInt(offset as string);

    const result = await recordingService.listRecordings(filters);

    res.status(200).json({
      success: true,
      recordings: result.recordings,
      total: result.total,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    });
  } catch (error: any) {
    logger.error('Failed to list recordings via API', {
      error: error.message,
      userId: (req as any).user?.id,
    });
    res.status(500).json({
      error: 'Failed to list recordings',
      details: error.message,
    });
  }
}

/**
 * Webhook handler for Twilio recording status updates
 * POST /api/v1/telehealth/webhook/recording-status
 */
export async function handleRecordingWebhook(req: Request, res: Response) {
  try {
    const {
      RecordingSid,
      RoomSid,
      Status,
      Duration,
      Size,
      MediaUrl,
      Composition,
      CompositionSid,
    } = req.body;

    logger.info('Received Twilio recording webhook', {
      recordingSid: RecordingSid,
      roomSid: RoomSid,
      status: Status,
      duration: Duration,
      size: Size,
    });

    // Find recording in database
    const recording = await prisma.sessionRecording.findUnique({
      where: { twilioRecordingSid: RecordingSid },
    });

    if (!recording) {
      logger.warn('Webhook for unknown recording', { recordingSid: RecordingSid });
      return res.status(200).send('OK'); // Return 200 to acknowledge
    }

    // Update status based on webhook
    if (Status === 'completed') {
      // Update recording record
      await prisma.sessionRecording.update({
        where: { id: recording.id },
        data: {
          status: 'PROCESSING',
          recordingDuration: parseInt(Duration) || 0,
          recordingSize: BigInt(Size || 0),
          twilioMediaUrl: MediaUrl,
          twilioCompositionSid: CompositionSid,
          lastModifiedBy: 'system',
        },
      });

      // Trigger download and upload to S3
      // This should be done asynchronously in production
      try {
        await recordingService.downloadAndUploadRecording(RecordingSid, 'system');
      } catch (uploadError: any) {
        logger.error('Failed to upload recording after webhook', {
          error: uploadError.message,
          recordingSid: RecordingSid,
        });
      }
    } else if (Status === 'failed') {
      await prisma.sessionRecording.update({
        where: { id: recording.id },
        data: {
          status: 'FAILED',
          processingError: 'Twilio recording failed',
          lastModifiedBy: 'system',
        },
      });

      await prisma.telehealthSession.update({
        where: { id: recording.sessionId },
        data: {
          recordingStatus: 'FAILED',
          lastModifiedBy: 'system',
        },
      });
    }

    res.status(200).send('OK');
  } catch (error: any) {
    logger.error('Failed to process recording webhook', {
      error: error.message,
      body: req.body,
    });
    // Still return 200 to Twilio to avoid retries
    res.status(200).send('OK');
  }
}

/**
 * Get recording configuration status
 * GET /api/v1/telehealth/recording/status
 */
export async function getRecordingStatus(req: Request, res: Response) {
  try {
    const recordingStatus = recordingService.getRecordingConfigStatus();
    const storageStatus = storageService.getStorageConfigStatus();

    res.status(200).json({
      success: true,
      recording: recordingStatus,
      storage: storageStatus,
      configured: recordingStatus.twilioConfigured && storageStatus.configured,
    });
  } catch (error: any) {
    logger.error('Failed to get recording status', {
      error: error.message,
    });
    res.status(500).json({
      error: 'Failed to get recording status',
      details: error.message,
    });
  }
}
