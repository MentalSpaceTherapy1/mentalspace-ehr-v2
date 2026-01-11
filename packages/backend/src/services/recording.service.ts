/**
 * Recording Service - Twilio Video Recording Integration
 *
 * Handles secure recording of telehealth sessions using Twilio's Recording API
 * with encrypted cloud storage (AWS S3), access logging, and retention policies.
 *
 * HIPAA Compliance Features:
 * - Encrypted storage (server-side encryption)
 * - Access audit logging
 * - Automatic retention policies
 * - Consent verification before recording
 *
 * @module recording.service
 */

import twilio from 'twilio';
import prisma from './database';
import logger from '../utils/logger';
import config from '../config';
import * as storageService from './storage.service';

// Initialize Twilio client
const accountSid = config.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
const authToken = config.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;

let twilioClient: twilio.Twilio | null = null;

if (accountSid && authToken) {
  twilioClient = twilio(accountSid, authToken);
}

export interface RecordingOptions {
  audioOnly?: boolean;
  videoLayout?: 'grid' | 'speaker' | 'presentation';
  resolution?: '640x480' | '1280x720' | '1920x1080';
  format?: 'mp4' | 'webm';
}

export interface RecordingMetadata {
  sessionId: string;
  appointmentId: string;
  clientId: string;
  clinicianId: string;
  clientName: string;
  clinicianName: string;
  sessionDate: Date;
  consentGiven: boolean;
  consentIpAddress?: string;
}

/**
 * Start recording a Twilio Video room
 */
export async function startRecording(
  roomSid: string,
  sessionId: string,
  userId: string,
  consentData: { clientConsentGiven: boolean; ipAddress?: string },
  options: RecordingOptions = {}
): Promise<any> {
  try {
    if (!twilioClient) {
      throw new Error('Twilio client not initialized');
    }

    // Verify session exists and consent is given
    const session = await prisma.telehealthSession.findUnique({
      where: { id: sessionId },
      include: {
        appointment: {
          include: {
            client: { select: { id: true, firstName: true, lastName: true } },
            clinician: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!session) {
      throw new Error('Telehealth session not found');
    }

    // CRITICAL: Verify consent before starting recording
    if (!consentData.clientConsentGiven) {
      throw new Error('Client consent required to start recording');
    }

    // Check if room is using Twilio (not mock)
    if (roomSid.startsWith('MOCK-')) {
      throw new Error('Cannot record mock sessions');
    }

    // Start recording using Twilio Compositions API for multi-participant sessions
    // This will record all participants in the room
    const recordingsApi = twilioClient.video.v1.rooms(roomSid).recordings as any;
    const recording = await recordingsApi.create({
      type: options.audioOnly ? 'audio' : 'video',
      statusCallback: `${config.backendUrl}/api/v1/telehealth/webhook/recording-status`,
      statusCallbackMethod: 'POST',
    });

    logger.info('Twilio recording started', {
      roomSid,
      recordingSid: recording.sid,
      sessionId,
      userId,
    });

    // Calculate retention date (7 years for Georgia)
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() + 7);

    // Create SessionRecording record
    const sessionRecording = await prisma.sessionRecording.create({
      data: {
        sessionId,
        twilioRecordingSid: recording.sid,
        twilioRoomSid: roomSid,
        recordingDuration: 0,
        recordingSize: BigInt(0),
        recordingFormat: options.format || 'mp4',
        status: 'RECORDING',
        recordingStartedAt: new Date(),
        clientConsentGiven: consentData.clientConsentGiven,
        consentTimestamp: new Date(),
        consentIpAddress: consentData.ipAddress,
        retentionPolicy: '7_YEARS',
        scheduledDeletionAt: retentionDate,
        storageBucket: (config as any).s3RecordingBucket || process.env.S3_RECORDING_BUCKET || 'mentalspace-recordings',
        storageKey: `recordings/${sessionId}/${recording.sid}.mp4`,
        storageRegion: config.awsRegion || 'us-east-1',
        encryptionType: 'AES256',
        accessLog: [],
        createdBy: userId,
        lastModifiedBy: userId,
      },
    });

    // Update session status
    // Note: recordingStatus and lastModifiedBy fields need to be added to TelehealthSession schema
    await prisma.telehealthSession.update({
      where: { id: sessionId },
      data: {
        recordingEnabled: true,
        recordingConsent: true,
        recordingStartedAt: new Date(),
        // TODO: Add recordingStatus and lastModifiedBy fields to TelehealthSession schema
      } as any,
    });

    // Log audit event
    await logRecordingAccess({
      recordingId: sessionRecording.id,
      userId,
      action: 'START_RECORDING',
      ipAddress: consentData.ipAddress,
      metadata: { roomSid, recordingSid: recording.sid },
    });

    return {
      recordingId: sessionRecording.id,
      twilioRecordingSid: recording.sid,
      status: 'RECORDING',
      startedAt: sessionRecording.recordingStartedAt,
    };
  } catch (error: any) {
    logger.error('Failed to start recording', {
      error: error.message,
      roomSid,
      sessionId,
    });
    throw error;
  }
}

/**
 * Stop recording a Twilio Video room
 */
export async function stopRecording(
  recordingSid: string,
  userId: string,
  ipAddress?: string
): Promise<any> {
  try {
    if (!twilioClient) {
      throw new Error('Twilio client not initialized');
    }

    // Find session recording record
    const sessionRecording = await prisma.sessionRecording.findUnique({
      where: { twilioRecordingSid: recordingSid },
      include: { session: true },
    });

    if (!sessionRecording) {
      throw new Error('Recording not found');
    }

    // Stop the recording in Twilio
    const recordingContext = twilioClient.video.v1
      .rooms(sessionRecording.twilioRoomSid)
      .recordings(recordingSid) as any;
    const recording = await recordingContext.update({ status: 'stopped' });

    logger.info('Twilio recording stopped', {
      recordingSid,
      roomSid: sessionRecording.twilioRoomSid,
      userId,
    });

    // Update database
    const endedAt = new Date();
    const duration = Math.floor(
      (endedAt.getTime() - sessionRecording.recordingStartedAt.getTime()) / 1000
    );

    await prisma.sessionRecording.update({
      where: { id: sessionRecording.id },
      data: {
        status: 'PROCESSING',
        recordingEndedAt: endedAt,
        recordingDuration: duration,
        lastModifiedBy: userId,
      },
    });

    // Update session
    // Note: recordingDuration, recordingStatus, lastModifiedBy fields need to be added to TelehealthSession schema
    await prisma.telehealthSession.update({
      where: { id: sessionRecording.sessionId },
      data: {
        recordingStoppedAt: endedAt,
        // TODO: Add recordingDuration, recordingStatus, lastModifiedBy fields to schema
      } as any,
    });

    // Log audit event
    await logRecordingAccess({
      recordingId: sessionRecording.id,
      userId,
      action: 'STOP_RECORDING',
      ipAddress,
      metadata: { recordingSid, duration },
    });

    return {
      recordingId: sessionRecording.id,
      status: 'PROCESSING',
      duration,
      stoppedAt: endedAt,
    };
  } catch (error: any) {
    logger.error('Failed to stop recording', {
      error: error.message,
      recordingSid,
    });
    throw error;
  }
}

/**
 * Get recording status from Twilio
 */
export async function getRecordingStatus(recordingSid: string): Promise<any> {
  try {
    if (!twilioClient) {
      throw new Error('Twilio client not initialized');
    }

    const sessionRecording = await prisma.sessionRecording.findUnique({
      where: { twilioRecordingSid: recordingSid },
    });

    if (!sessionRecording) {
      throw new Error('Recording not found');
    }

    // Fetch from Twilio
    const recording = await twilioClient.video.v1
      .rooms(sessionRecording.twilioRoomSid)
      .recordings(recordingSid)
      .fetch();

    return {
      sid: recording.sid,
      status: recording.status,
      duration: recording.duration,
      size: recording.size,
      mediaUrl: recording.links?.media,
      dateCreated: recording.dateCreated,
    };
  } catch (error: any) {
    logger.error('Failed to get recording status', {
      error: error.message,
      recordingSid,
    });
    throw error;
  }
}

/**
 * Download recording from Twilio and upload to secure storage
 */
export async function downloadAndUploadRecording(
  recordingSid: string,
  userId: string
): Promise<any> {
  try {
    if (!twilioClient) {
      throw new Error('Twilio client not initialized');
    }

    const sessionRecording = await prisma.sessionRecording.findUnique({
      where: { twilioRecordingSid: recordingSid },
      include: {
        session: {
          include: {
            appointment: {
              include: {
                client: true,
                clinician: true,
              },
            },
          },
        },
      },
    });

    if (!sessionRecording) {
      throw new Error('Recording not found');
    }

    // Update status to uploading
    await prisma.sessionRecording.update({
      where: { id: sessionRecording.id },
      data: { status: 'UPLOADING', lastModifiedBy: userId },
    });

    // Get recording media URL from Twilio
    const recording = await twilioClient.video.v1
      .rooms(sessionRecording.twilioRoomSid)
      .recordings(recordingSid)
      .fetch();

    if (!recording.links?.media) {
      throw new Error('Recording media URL not available');
    }

    // Download from Twilio (Twilio SDK handles authentication)
    const mediaUrl = `https://video.twilio.com${recording.links.media}`;

    // Prepare metadata for storage
    const metadata: RecordingMetadata = {
      sessionId: sessionRecording.sessionId,
      appointmentId: sessionRecording.session.appointmentId,
      clientId: sessionRecording.session.appointment.clientId,
      clinicianId: sessionRecording.session.appointment.clinicianId,
      clientName: `${sessionRecording.session.appointment.client.firstName} ${sessionRecording.session.appointment.client.lastName}`,
      clinicianName: `${sessionRecording.session.appointment.clinician.firstName} ${sessionRecording.session.appointment.clinician.lastName}`,
      sessionDate: sessionRecording.session.sessionStartedAt || sessionRecording.session.createdAt,
      consentGiven: sessionRecording.clientConsentGiven,
      consentIpAddress: sessionRecording.consentIpAddress || undefined,
    };

    // Upload to S3 using storage service
    const uploadResult = await storageService.uploadRecording({
      recordingSid,
      recordingUrl: mediaUrl,
      bucket: sessionRecording.storageBucket,
      key: sessionRecording.storageKey,
      metadata,
      accountSid: accountSid!,
      authToken: authToken!,
    });

    // Update database with upload info
    const updatedRecording = await prisma.sessionRecording.update({
      where: { id: sessionRecording.id },
      data: {
        status: 'AVAILABLE',
        uploadedAt: new Date(),
        recordingSize: BigInt(uploadResult.size),
        twilioMediaUrl: mediaUrl,
        lastModifiedBy: userId,
      },
    });

    // Update session
    // Note: recordingStatus, recordingS3Key, lastModifiedBy fields need to be added to TelehealthSession schema
    await prisma.telehealthSession.update({
      where: { id: sessionRecording.sessionId },
      data: {
        // TODO: Add recordingStatus, recordingS3Key, lastModifiedBy fields to schema
      } as any,
    });

    // Log audit event
    await logRecordingAccess({
      recordingId: sessionRecording.id,
      userId,
      action: 'UPLOAD_COMPLETED',
      metadata: { size: uploadResult.size, bucket: sessionRecording.storageBucket },
    });

    logger.info('Recording uploaded to secure storage', {
      recordingId: sessionRecording.id,
      recordingSid,
      size: uploadResult.size,
      bucket: sessionRecording.storageBucket,
    });

    return updatedRecording;
  } catch (error: any) {
    logger.error('Failed to download and upload recording', {
      error: error.message,
      recordingSid,
    });

    // Update status to failed
    await prisma.sessionRecording.update({
      where: { twilioRecordingSid: recordingSid },
      data: {
        status: 'FAILED',
        processingError: error.message,
        lastModifiedBy: userId,
      },
    });

    throw error;
  }
}

/**
 * Delete recording permanently (with audit trail)
 */
export async function deleteRecording(
  recordingId: string,
  userId: string,
  reason: string,
  ipAddress?: string
): Promise<void> {
  try {
    const sessionRecording = await prisma.sessionRecording.findUnique({
      where: { id: recordingId },
    });

    if (!sessionRecording) {
      throw new Error('Recording not found');
    }

    if (sessionRecording.status === 'DELETED') {
      throw new Error('Recording already deleted');
    }

    // Delete from S3
    await storageService.deleteRecording({
      bucket: sessionRecording.storageBucket,
      key: sessionRecording.storageKey,
    });

    // Soft delete in database (maintain audit trail)
    await prisma.sessionRecording.update({
      where: { id: recordingId },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
        deletedBy: userId,
        deletionReason: reason,
        lastModifiedBy: userId,
      },
    });

    // Log audit event
    await logRecordingAccess({
      recordingId,
      userId,
      action: 'DELETE_RECORDING',
      ipAddress,
      metadata: { reason },
    });

    logger.info('Recording deleted', {
      recordingId,
      userId,
      reason,
    });
  } catch (error: any) {
    logger.error('Failed to delete recording', {
      error: error.message,
      recordingId,
    });
    throw error;
  }
}

/**
 * Get recordings for a session
 */
export async function getSessionRecordings(sessionId: string, userId: string): Promise<any[]> {
  try {
    const recordings = await prisma.sessionRecording.findMany({
      where: {
        sessionId,
        status: { not: 'DELETED' },
      },
      orderBy: { recordingStartedAt: 'desc' },
    });

    // Log access
    for (const recording of recordings) {
      await logRecordingAccess({
        recordingId: recording.id,
        userId,
        action: 'VIEW_RECORDING_LIST',
      });
    }

    return recordings;
  } catch (error: any) {
    logger.error('Failed to get session recordings', {
      error: error.message,
      sessionId,
    });
    throw error;
  }
}

/**
 * List all recordings with filters
 */
export async function listRecordings(filters: {
  status?: string;
  clientId?: string;
  clinicianId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<{ recordings: any[]; total: number }> {
  try {
    const where: any = {
      status: { not: 'DELETED' },
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.recordingStartedAt = {};
      if (filters.startDate) {
        where.recordingStartedAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.recordingStartedAt.lte = filters.endDate;
      }
    }

    // Add client/clinician filter via session relation
    if (filters.clientId || filters.clinicianId) {
      where.session = { appointment: {} };
      if (filters.clientId) {
        where.session.appointment.clientId = filters.clientId;
      }
      if (filters.clinicianId) {
        where.session.appointment.clinicianId = filters.clinicianId;
      }
    }

    const [recordings, total] = await Promise.all([
      prisma.sessionRecording.findMany({
        where,
        include: {
          session: {
            include: {
              appointment: {
                include: {
                  client: { select: { id: true, firstName: true, lastName: true } },
                  clinician: { select: { id: true, firstName: true, lastName: true } },
                },
              },
            },
          },
        },
        orderBy: { recordingStartedAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      prisma.sessionRecording.count({ where }),
    ]);

    return { recordings, total };
  } catch (error: any) {
    logger.error('Failed to list recordings', {
      error: error.message,
      filters,
    });
    throw error;
  }
}

/**
 * Log access to recording for HIPAA audit trail
 */
export async function logRecordingAccess(data: {
  recordingId: string;
  userId: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}): Promise<void> {
  try {
    const recording = await prisma.sessionRecording.findUnique({
      where: { id: data.recordingId },
    });

    if (!recording) {
      return;
    }

    const accessLog = (recording.accessLog as any[]) || [];
    accessLog.push({
      timestamp: new Date().toISOString(),
      userId: data.userId,
      action: data.action,
      ipAddress: data.ipAddress || 'unknown',
      userAgent: data.userAgent || 'unknown',
      metadata: data.metadata || {},
    });

    // Update view/download counts
    const updateData: any = {
      accessLog,
      lastAccessedAt: new Date(),
      lastModifiedBy: data.userId,
    };

    if (data.action === 'VIEW_RECORDING' || data.action === 'GENERATE_PLAYBACK_URL') {
      updateData.viewCount = { increment: 1 };
    } else if (data.action === 'DOWNLOAD_RECORDING') {
      updateData.downloadCount = { increment: 1 };
    }

    await prisma.sessionRecording.update({
      where: { id: data.recordingId },
      data: updateData,
    });
  } catch (error: any) {
    logger.error('Failed to log recording access', {
      error: error.message,
      recordingId: data.recordingId,
    });
    // Don't throw - logging failure shouldn't break the main operation
  }
}

/**
 * Check if Twilio recording is properly configured
 */
export function isRecordingConfigured(): boolean {
  const s3RecordingBucket = (config as any).s3RecordingBucket || process.env.S3_RECORDING_BUCKET;
  return !!(accountSid && authToken && s3RecordingBucket);
}

/**
 * Get recording configuration status
 */
export function getRecordingConfigStatus() {
  const s3RecordingBucket = (config as any).s3RecordingBucket || process.env.S3_RECORDING_BUCKET;
  return {
    twilioConfigured: !!(accountSid && authToken),
    storageConfigured: !!s3RecordingBucket,
    hasAccountSid: !!accountSid,
    hasAuthToken: !!authToken,
    hasBucket: !!s3RecordingBucket,
  };
}
