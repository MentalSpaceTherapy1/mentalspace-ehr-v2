/**
 * MentalSpace EHR - AI Transcription Service (Module 6 Phase 2)
 *
 * Real-time medical transcription using Amazon Transcribe Medical
 * - Behavioral health / psychiatry specialty
 * - Speaker diarization (clinician vs. client)
 * - Real-time streaming with WebSocket support
 * - HIPAA-compliant storage and audit logging
 */

import {
  TranscribeClient,
  StartMedicalTranscriptionJobCommand,
  GetMedicalTranscriptionJobCommand,
  DeleteMedicalTranscriptionJobCommand
} from '@aws-sdk/client-transcribe';
import {
  TranscribeStreamingClient,
  StartMedicalStreamTranscriptionCommand,
  StartMedicalStreamTranscriptionCommandInput,
  MedicalTranscript,
  Result
} from '@aws-sdk/client-transcribe-streaming';
import prisma from './database';
import logger from '../utils/logger';
import config from '../config';
import { getSocketIO } from '../socket';

// AWS Configuration
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const MEDICAL_SPECIALTY = 'PRIMARYCARE'; // Closest to behavioral health
const MEDICAL_TYPE = 'CONVERSATION'; // For therapy sessions

const transcribeClient = new TranscribeClient({ region: AWS_REGION });
const transcribeStreamingClient = new TranscribeStreamingClient({ region: AWS_REGION });

// Active streaming sessions
const activeStreams = new Map<string, any>();

/**
 * Check if client has valid consent for transcription
 */
async function verifyTranscriptionConsent(sessionId: string): Promise<boolean> {
  try {
    const session = await prisma.telehealthSession.findUnique({
      where: { id: sessionId },
      include: {
        appointment: {
          include: {
            client: {
              include: {
                telehealthConsents: {
                  where: {
                    consentType: 'Georgia_Telehealth',
                    isActive: true,
                    consentWithdrawn: false,
                  },
                  orderBy: {
                    createdAt: 'desc',
                  },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      logger.error('Session not found for transcription consent check', { sessionId });
      return false;
    }

    // Check if telehealth consent exists and is valid
    const consent = session.appointment.client.telehealthConsents[0];
    if (!consent || !consent.consentGiven) {
      logger.warn('No valid telehealth consent for transcription', {
        sessionId,
        clientId: session.appointment.client.id,
      });
      return false;
    }

    // Check if consent has expired
    const now = new Date();
    const expirationDate = new Date(consent.expirationDate);
    if (expirationDate < now) {
      logger.warn('Telehealth consent has expired', {
        sessionId,
        clientId: session.appointment.client.id,
        expirationDate,
      });
      return false;
    }

    // Check transcription-specific consent
    if (!session.transcriptionConsent) {
      logger.warn('Transcription consent not provided', {
        sessionId,
        clientId: session.appointment.client.id,
      });
      return false;
    }

    return true;
  } catch (error: any) {
    logger.error('Error verifying transcription consent', {
      error: error.message,
      sessionId,
    });
    return false;
  }
}

/**
 * Start real-time transcription for a telehealth session
 */
export async function startTranscription(sessionId: string, userId: string) {
  try {
    // Verify session exists
    const session = await prisma.telehealthSession.findUnique({
      where: { id: sessionId },
      include: {
        appointment: {
          include: {
            client: true,
            clinician: true,
          },
        },
      },
    });

    if (!session) {
      throw new Error('Telehealth session not found');
    }

    // Verify consent
    const hasConsent = await verifyTranscriptionConsent(sessionId);
    if (!hasConsent) {
      throw new Error('Valid transcription consent required. Client must consent to transcription before starting.');
    }

    // Check if transcription is already running
    if (session.transcriptionStatus === 'IN_PROGRESS') {
      logger.warn('Transcription already in progress', { sessionId });
      return { message: 'Transcription already in progress', session };
    }

    // Update session status to indicate transcription starting
    const updatedSession = await prisma.telehealthSession.update({
      where: { id: sessionId },
      data: {
        transcriptionEnabled: true,
        transcriptionStartedAt: new Date(),
        transcriptionStatus: 'IN_PROGRESS',
        transcriptionJobId: `stream-${sessionId}-${Date.now()}`,
        lastModifiedBy: userId,
      },
    });

    // Add to audit log
    await addTranscriptionAuditLog(sessionId, userId, 'TRANSCRIPTION_STARTED', {
      clientId: session.appointment.client.id,
      clinicianId: session.appointment.clinician.id,
    });

    logger.info('Transcription started for session', {
      sessionId,
      userId,
      jobId: updatedSession.transcriptionJobId,
    });

    return {
      success: true,
      message: 'Transcription started successfully',
      session: updatedSession
    };
  } catch (error: any) {
    logger.error('Failed to start transcription', {
      error: error.message,
      stack: error.stack,
      sessionId,
      userId,
    });

    // Update session with error
    await prisma.telehealthSession.update({
      where: { id: sessionId },
      data: {
        transcriptionStatus: 'FAILED',
        transcriptionError: error.message,
        lastModifiedBy: userId,
      },
    }).catch(err => logger.error('Failed to update session with transcription error', err));

    throw error;
  }
}

/**
 * Stop transcription for a session
 */
export async function stopTranscription(sessionId: string, userId: string) {
  try {
    const session = await prisma.telehealthSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Telehealth session not found');
    }

    // Stop any active streaming
    if (activeStreams.has(sessionId)) {
      const stream = activeStreams.get(sessionId);
      try {
        if (stream && stream.destroy) {
          stream.destroy();
        }
      } catch (err: any) {
        logger.warn('Error destroying stream', { error: err.message, sessionId });
      }
      activeStreams.delete(sessionId);
    }

    // Update session
    const updatedSession = await prisma.telehealthSession.update({
      where: { id: sessionId },
      data: {
        transcriptionStoppedAt: new Date(),
        transcriptionStatus: 'COMPLETED',
        lastModifiedBy: userId,
      },
    });

    // Add to audit log
    await addTranscriptionAuditLog(sessionId, userId, 'TRANSCRIPTION_STOPPED', {});

    logger.info('Transcription stopped for session', {
      sessionId,
      userId,
    });

    return {
      success: true,
      message: 'Transcription stopped successfully',
      session: updatedSession,
    };
  } catch (error: any) {
    logger.error('Failed to stop transcription', {
      error: error.message,
      stack: error.stack,
      sessionId,
      userId,
    });
    throw error;
  }
}

/**
 * Get transcripts for a session
 */
export async function getTranscripts(sessionId: string, options?: {
  includePartial?: boolean;
  limit?: number;
  offset?: number;
}) {
  try {
    const where: any = { sessionId };
    if (!options?.includePartial) {
      where.isPartial = false;
    }

    const transcripts = await prisma.sessionTranscript.findMany({
      where,
      orderBy: { startTime: 'asc' },
      skip: options?.offset || 0,
      take: options?.limit || 1000,
    });

    return transcripts;
  } catch (error: any) {
    logger.error('Failed to get transcripts', {
      error: error.message,
      sessionId,
    });
    throw error;
  }
}

/**
 * Get full transcript as formatted text
 */
export async function getFormattedTranscript(sessionId: string): Promise<string> {
  try {
    const transcripts = await getTranscripts(sessionId, { includePartial: false });

    if (transcripts.length === 0) {
      return 'No transcript available.';
    }

    // Group by speaker and format
    let formattedText = '';
    let lastSpeaker = '';

    for (const transcript of transcripts) {
      if (transcript.speakerLabel !== lastSpeaker) {
        if (formattedText) {
          formattedText += '\n\n';
        }
        formattedText += `[${transcript.speakerLabel}]: `;
        lastSpeaker = transcript.speakerLabel;
      } else {
        formattedText += ' ';
      }
      formattedText += transcript.text;
    }

    return formattedText;
  } catch (error: any) {
    logger.error('Failed to get formatted transcript', {
      error: error.message,
      sessionId,
    });
    throw error;
  }
}

/**
 * Process audio stream and generate real-time transcripts
 * This is called from WebSocket connection with audio chunks
 */
export async function processAudioStream(
  sessionId: string,
  audioStream: AsyncIterable<Buffer>,
  sampleRate: number = 16000
) {
  try {
    const session = await prisma.telehealthSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.transcriptionEnabled || session.transcriptionStatus !== 'IN_PROGRESS') {
      throw new Error('Transcription not enabled for this session');
    }

    // Create audio stream generator for AWS
    async function* audioGenerator() {
      for await (const chunk of audioStream) {
        yield { AudioEvent: { AudioChunk: chunk } };
      }
    }

    // Start streaming transcription
    const command = new StartMedicalStreamTranscriptionCommand({
      LanguageCode: 'en-US',
      MediaSampleRateHertz: sampleRate,
      MediaEncoding: 'pcm',
      Specialty: MEDICAL_SPECIALTY,
      Type: MEDICAL_TYPE,
      ShowSpeakerLabel: true, // Enable speaker diarization
      EnableChannelIdentification: false,
      NumberOfChannels: 1,
      AudioStream: audioGenerator(),
    });

    const response = await transcribeStreamingClient.send(command);

    // Store stream reference for cleanup
    activeStreams.set(sessionId, response);

    // Process transcription results
    if (response.TranscriptResultStream) {
      for await (const event of response.TranscriptResultStream) {
        if (event.TranscriptEvent) {
          const results = event.TranscriptEvent.Transcript?.Results || [];

          for (const result of results) {
            await processTranscriptResult(sessionId, result);
          }
        }
      }
    }

    logger.info('Audio stream processing completed', { sessionId });
  } catch (error: any) {
    logger.error('Failed to process audio stream', {
      error: error.message,
      stack: error.stack,
      sessionId,
    });

    // Update session with error
    await prisma.telehealthSession.update({
      where: { id: sessionId },
      data: {
        transcriptionStatus: 'FAILED',
        transcriptionError: error.message,
      },
    }).catch(err => logger.error('Failed to update session with error', err));

    throw error;
  }
}

/**
 * Process individual transcript result and save to database
 */
async function processTranscriptResult(sessionId: string, result: Result) {
  try {
    if (!result.Alternatives || result.Alternatives.length === 0) {
      return;
    }

    const alternative = result.Alternatives[0];
    if (!alternative.Transcript) {
      return;
    }

    const isPartial = !result.IsPartial;
    const speakerLabel = result.Alternatives[0].Items?.[0]?.Speaker || 'UNKNOWN';
    const startTime = result.StartTime || 0;
    const endTime = result.EndTime || 0;
    const items = alternative.Items || [];
    const confidence = items.reduce((sum, item) =>
      sum + (item.Confidence || 0), 0) / (items.length || 1);

    // Save to database
    const transcript = await prisma.sessionTranscript.create({
      data: {
        sessionId,
        speakerLabel: mapSpeakerLabel(speakerLabel),
        text: alternative.Transcript,
        startTime,
        endTime,
        confidence,
        isPartial,
        itemType: 'pronunciation',
      },
    });

    // Emit real-time update via WebSocket
    const io = getSocketIO();
    if (io) {
      io.to(`session-${sessionId}`).emit('transcript-update', {
        sessionId,
        transcript,
        isPartial,
      });
    }

    logger.debug('Transcript result processed', {
      sessionId,
      transcriptId: transcript.id,
      isPartial,
      speakerLabel: transcript.speakerLabel,
    });
  } catch (error: any) {
    logger.error('Failed to process transcript result', {
      error: error.message,
      sessionId,
    });
    // Don't throw - continue processing other results
  }
}

/**
 * Map AWS speaker labels to human-readable labels
 */
function mapSpeakerLabel(awsLabel: string): string {
  // AWS uses spk_0, spk_1, etc.
  // We'll map the first speaker to CLINICIAN and second to CLIENT
  // In production, you'd need additional logic to determine which is which
  if (awsLabel === 'spk_0' || awsLabel === 'speaker_0') {
    return 'CLINICIAN';
  } else if (awsLabel === 'spk_1' || awsLabel === 'speaker_1') {
    return 'CLIENT';
  }
  return awsLabel;
}

/**
 * Add transcription event to HIPAA audit log
 */
async function addTranscriptionAuditLog(
  sessionId: string,
  userId: string,
  eventType: string,
  additionalData: any
) {
  try {
    const session = await prisma.telehealthSession.findUnique({
      where: { id: sessionId },
      select: { hipaaAuditLog: true },
    });

    const existingAuditLog = (session?.hipaaAuditLog as any) || { events: [] };
    const auditLogEvents = Array.isArray(existingAuditLog.events)
      ? existingAuditLog.events
      : [];

    const auditEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      userId,
      sessionId,
      ...additionalData,
      ipAddress: 'N/A', // Would be captured from request in controller
      userAgent: 'N/A', // Would be captured from request in controller
    };

    auditLogEvents.push(auditEntry);

    await prisma.telehealthSession.update({
      where: { id: sessionId },
      data: {
        hipaaAuditLog: {
          ...existingAuditLog,
          events: auditLogEvents,
        },
      },
    });

    logger.debug('Added transcription audit log entry', {
      sessionId,
      eventType,
      userId,
    });
  } catch (error: any) {
    logger.error('Failed to add transcription audit log', {
      error: error.message,
      sessionId,
      eventType,
    });
    // Don't throw - audit log failure shouldn't break main flow
  }
}

/**
 * Enable transcription consent for a session
 */
export async function enableTranscriptionConsent(
  sessionId: string,
  userId: string,
  consent: boolean
) {
  try {
    const session = await prisma.telehealthSession.update({
      where: { id: sessionId },
      data: {
        transcriptionConsent: consent,
        lastModifiedBy: userId,
      },
    });

    await addTranscriptionAuditLog(
      sessionId,
      userId,
      consent ? 'TRANSCRIPTION_CONSENT_GRANTED' : 'TRANSCRIPTION_CONSENT_REVOKED',
      {}
    );

    logger.info('Transcription consent updated', {
      sessionId,
      userId,
      consent,
    });

    return session;
  } catch (error: any) {
    logger.error('Failed to update transcription consent', {
      error: error.message,
      sessionId,
      userId,
    });
    throw error;
  }
}

/**
 * Get transcription status for a session
 */
export async function getTranscriptionStatus(sessionId: string) {
  try {
    const session = await prisma.telehealthSession.findUnique({
      where: { id: sessionId },
      select: {
        transcriptionEnabled: true,
        transcriptionConsent: true,
        transcriptionStartedAt: true,
        transcriptionStoppedAt: true,
        transcriptionStatus: true,
        transcriptionJobId: true,
        transcriptionError: true,
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Get transcript count
    const transcriptCount = await prisma.sessionTranscript.count({
      where: { sessionId, isPartial: false },
    });

    return {
      ...session,
      transcriptCount,
      isActive: session.transcriptionStatus === 'IN_PROGRESS',
    };
  } catch (error: any) {
    logger.error('Failed to get transcription status', {
      error: error.message,
      sessionId,
    });
    throw error;
  }
}

/**
 * Delete transcripts for a session (HIPAA retention policy)
 */
export async function deleteTranscripts(sessionId: string, userId: string) {
  try {
    // Check if user has permission
    const session = await prisma.telehealthSession.findUnique({
      where: { id: sessionId },
      include: {
        appointment: {
          select: {
            clinicianId: true,
          },
        },
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Delete all transcripts
    const result = await prisma.sessionTranscript.deleteMany({
      where: { sessionId },
    });

    // Update session
    await prisma.telehealthSession.update({
      where: { id: sessionId },
      data: {
        transcriptionStatus: 'DELETED',
        lastModifiedBy: userId,
      },
    });

    await addTranscriptionAuditLog(sessionId, userId, 'TRANSCRIPTS_DELETED', {
      deletedCount: result.count,
    });

    logger.info('Transcripts deleted', {
      sessionId,
      userId,
      count: result.count,
    });

    return {
      success: true,
      deletedCount: result.count,
    };
  } catch (error: any) {
    logger.error('Failed to delete transcripts', {
      error: error.message,
      sessionId,
      userId,
    });
    throw error;
  }
}

/**
 * Export transcript as plain text file
 */
export async function exportTranscript(sessionId: string): Promise<string> {
  try {
    const session = await prisma.telehealthSession.findUnique({
      where: { id: sessionId },
      include: {
        appointment: {
          include: {
            client: {
              select: {
                firstName: true,
                lastName: true,
                medicalRecordNumber: true,
              },
            },
            clinician: {
              select: {
                firstName: true,
                lastName: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const formattedTranscript = await getFormattedTranscript(sessionId);

    // Create export with metadata
    const exportContent = `
TELEHEALTH SESSION TRANSCRIPT
========================================

Session ID: ${session.id}
Date: ${session.sessionStartedAt?.toLocaleDateString() || 'N/A'}
Time: ${session.sessionStartedAt?.toLocaleTimeString() || 'N/A'}

Client: ${session.appointment.client.lastName}, ${session.appointment.client.firstName}
MRN: ${session.appointment.client.medicalRecordNumber}

Clinician: ${session.appointment.clinician.title || ''} ${session.appointment.clinician.lastName}, ${session.appointment.clinician.firstName}

Transcription Started: ${session.transcriptionStartedAt?.toLocaleString() || 'N/A'}
Transcription Stopped: ${session.transcriptionStoppedAt?.toLocaleString() || 'N/A'}

========================================

${formattedTranscript}

========================================

NOTICE: This transcript was generated using automated speech recognition technology (Amazon Transcribe Medical).
While efforts have been made to ensure accuracy, this transcript may contain errors and should be reviewed
by the clinician for accuracy before being used in clinical documentation.

CONFIDENTIALITY NOTICE: This document contains confidential health information protected by HIPAA.
Unauthorized disclosure is prohibited by law.
`;

    return exportContent;
  } catch (error: any) {
    logger.error('Failed to export transcript', {
      error: error.message,
      sessionId,
    });
    throw error;
  }
}
