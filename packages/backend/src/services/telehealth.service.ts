import prisma from './database';
import logger from '../utils/logger';
import config from '../config';
import * as twilioService from './twilio.service';
import { v4 as uuidv4 } from 'uuid';

interface CreateTelehealthSessionData {
  appointmentId: string;
  createdBy: string;
}

interface JoinSessionData {
  sessionId: string;
  userId: string;
  userRole: 'clinician' | 'client';
  userName: string;
}

/**
 * Create a telehealth session for an appointment using Twilio Video
 */
export async function createTelehealthSession(data: CreateTelehealthSessionData) {
  try {
    // Get appointment details
    const appointment = await prisma.appointment.findUnique({
      where: { id: data.appointmentId },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Check if telehealth session already exists
    const existingSession = await prisma.telehealthSession.findUnique({
      where: { appointmentId: data.appointmentId },
    });

    if (existingSession) {
      return existingSession;
    }

    // Generate unique room name for Twilio
    const roomName = `telehealth-${data.appointmentId}-${uuidv4().substring(0, 8)}`;

    //Try to create Twilio Video room, but fallback to mock mode if it fails
    let twilioRoom: any;
    let isMockMode = false;

    try {
      twilioRoom = await twilioService.createTwilioRoom(roomName, false);

      if (!twilioRoom || !twilioRoom.roomSid) {
        throw new Error('Invalid Twilio room response');
      }
    } catch (twilioError: any) {
      // Check if it's a network/DNS error
      const isNetworkError = twilioError.message?.includes('getaddrinfo') ||
                             twilioError.message?.includes('ENOTFOUND') ||
                             twilioError.message?.includes('EAI_AGAIN') ||
                             twilioError.code === 'ENOTFOUND';

      if (isNetworkError) {
        // Use mock mode for development/offline testing
        logger.warn('Twilio unavailable - using mock mode for telehealth', {
          appointmentId: data.appointmentId,
          error: twilioError.message,
        });

        isMockMode = true;
        twilioRoom = {
          roomSid: `MOCK-${uuidv4()}`,
          roomName: roomName,
          status: 'mock',
          dateCreated: new Date(),
          maxParticipants: 10,
        };
      } else {
        // Re-throw non-network errors
        throw twilioError;
      }
    }

    // Create telehealth session in database
    // Note: We reuse Chime field names to avoid database migration
    const session = await prisma.telehealthSession.create({
      data: {
        appointmentId: data.appointmentId,
        chimeMeetingId: twilioRoom.roomSid, // Store Twilio Room SID
        chimeExternalMeetingId: twilioRoom.roomName, // Store Twilio Room Name
        chimeMeetingRegion: 'twilio', // Indicator that this is Twilio
        clinicianJoinUrl: `${config.frontendUrl}/telehealth/session/${data.appointmentId}?role=clinician`,
        clientJoinUrl: `${config.frontendUrl}/telehealth/session/${data.appointmentId}?role=client`,
        meetingDataJson: twilioRoom, // Store Twilio room data
        status: 'SCHEDULED',
        recordingConsent: false,
        recordingEnabled: false,
        createdBy: data.createdBy,
        lastModifiedBy: data.createdBy,
      },
    });

    logger.info('Telehealth session created with Twilio', {
      sessionId: session.id,
      appointmentId: data.appointmentId,
      twilioRoomSid: twilioRoom.roomSid,
      twilioRoomName: twilioRoom.roomName,
    });

    return session;
  } catch (error: any) {
    logger.error('Failed to create telehealth session', {
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack,
      appointmentId: data.appointmentId,
    });
    throw error;
  }
}

/**
 * Get join credentials for a telehealth session using Twilio
 */
export async function joinTelehealthSession(data: JoinSessionData) {
  try {
    // Get session details
    const session = await prisma.telehealthSession.findFirst({
      where: {
        appointment: {
          id: data.sessionId,
        },
      },
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

    // Get room name from database (stored in chimeExternalMeetingId)
    const roomName = session.chimeExternalMeetingId;
    const roomSid = session.chimeMeetingId;

    // Create identity string for Twilio
    const identity = `${data.userRole}-${data.userName}-${Date.now()}`;

    // Check if this is a mock session
    const isMockMode = roomSid?.startsWith('MOCK-');

    // Generate Twilio access token or mock token
    let tokenData: any;

    if (isMockMode) {
      // Use mock token for offline development
      logger.warn('Using mock token for offline telehealth session', {
        sessionId: session.id,
        userRole: data.userRole,
      });

      tokenData = {
        token: `MOCK_TOKEN_${uuidv4()}`,
        identity,
        roomName,
      };
    } else {
      try {
        tokenData = await twilioService.generateTwilioAccessToken(roomName, identity);

        if (!tokenData || !tokenData.token) {
          throw new Error('Invalid Twilio token response');
        }
      } catch (twilioError: any) {
        const isNetworkError = twilioError.message?.includes('getaddrinfo') ||
                               twilioError.message?.includes('ENOTFOUND') ||
                               twilioError.message?.includes('EAI_AGAIN');

        if (isNetworkError) {
          logger.warn('Twilio unavailable - using mock token', {
            sessionId: session.id,
            error: twilioError.message,
          });

          tokenData = {
            token: `MOCK_TOKEN_${uuidv4()}`,
            identity,
            roomName,
          };
        } else {
          throw twilioError;
        }
      }
    }

    // Update session with join info
    const updateData: any = {
      lastModifiedBy: data.userId,
    };

    if (data.userRole === 'clinician') {
      updateData.clinicianAttendeeId = identity; // Store Twilio identity
      // If clinician joins, start the session
      if (session.status === 'WAITING_ROOM' || session.status === 'SCHEDULED') {
        updateData.status = 'IN_PROGRESS';
        updateData.sessionStartedAt = new Date();
      }
    } else {
      updateData.clientAttendeeId = identity; // Store Twilio identity
      // Client enters waiting room
      if (session.status === 'SCHEDULED') {
        updateData.status = 'WAITING_ROOM';
        updateData.clientInWaitingRoom = true;
        updateData.waitingRoomEnteredAt = new Date();
      }
    }

    const updatedSession = await prisma.telehealthSession.update({
      where: { id: session.id },
      data: updateData,
    });

    logger.info('User joined telehealth session', {
      sessionId: session.id,
      userId: data.userId,
      userRole: data.userRole,
      identity,
    });

    return {
      session: updatedSession,
      twilioToken: tokenData.token,
      twilioRoomName: roomName,
      twilioIdentity: identity,
    };
  } catch (error: any) {
    logger.error('Failed to join telehealth session', {
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack,
      sessionId: data.sessionId,
      userId: data.userId,
    });
    throw error;
  }
}

/**
 * End a telehealth session using Twilio
 */
export async function endTelehealthSession(sessionId: string, userId: string, endReason?: string) {
  try {
    const session = await prisma.telehealthSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Telehealth session not found');
    }

    // Calculate actual duration
    let actualDuration: number | null = null;
    if (session.sessionStartedAt) {
      actualDuration = Math.round(
        (new Date().getTime() - session.sessionStartedAt.getTime()) / 60000
      );
    }

    // End Twilio room (Room SID stored in chimeMeetingId)
    const roomSid = session.chimeMeetingId;
    const isMockMode = roomSid?.startsWith('MOCK-');

    if (!isMockMode) {
      try {
        await twilioService.endTwilioRoom(roomSid);
      } catch (twilioError: any) {
        // Log but don't fail if Twilio is unavailable
        logger.warn('Failed to end Twilio room - continuing with local cleanup', {
          sessionId,
          roomSid,
          error: twilioError.message,
        });
      }
    }

    // Update session status
    const updatedSession = await prisma.telehealthSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        sessionEndedAt: new Date(),
        actualDuration,
        endReason: endReason || 'Normal',
        lastModifiedBy: userId,
      },
    });

    logger.info('Telehealth session ended', {
      sessionId,
      twilioRoomSid: roomSid,
      actualDuration,
      endReason,
    });

    return updatedSession;
  } catch (error: any) {
    logger.error('Failed to end telehealth session', {
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack,
      sessionId,
    });
    throw error;
  }
}

/**
 * Get telehealth session by appointment ID
 */
export async function getTelehealthSession(appointmentId: string) {
  try {
    const session = await prisma.telehealthSession.findUnique({
      where: { appointmentId },
      include: {
        appointment: {
          include: {
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            clinician: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                title: true,
              },
            },
          },
        },
      },
    });

    return session;
  } catch (error: any) {
    logger.error('Failed to get telehealth session', {
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack,
      appointmentId,
    });
    throw error;
  }
}

/**
 * Update session status
 */
export async function updateSessionStatus(
  sessionId: string,
  status: string,
  userId: string
) {
  try {
    const session = await prisma.telehealthSession.update({
      where: { id: sessionId },
      data: {
        status: status as any,
        statusUpdatedDate: new Date(),
        lastModifiedBy: userId,
      },
    });

    logger.info('Telehealth session status updated', {
      sessionId,
      status,
    });

    return session;
  } catch (error: any) {
    logger.error('Failed to update session status', {
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack,
      sessionId,
      status,
    });
    throw error;
  }
}

/**
 * Enable recording for a session
 */
export async function enableRecording(
  sessionId: string,
  userId: string,
  consent: boolean
) {
  try {
    const session = await prisma.telehealthSession.update({
      where: { id: sessionId },
      data: {
        recordingEnabled: true,
        recordingConsent: consent,
        recordingStartedAt: new Date(),
        lastModifiedBy: userId,
      },
    });

    logger.info('Recording enabled for telehealth session', {
      sessionId,
      consent,
    });

    return session;
  } catch (error: any) {
    logger.error('Failed to enable recording', {
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack,
      sessionId,
    });
    throw error;
  }
}

/**
 * Stop recording for a session
 */
export async function stopRecording(sessionId: string, userId: string) {
  try {
    const session = await prisma.telehealthSession.update({
      where: { id: sessionId },
      data: {
        recordingStoppedAt: new Date(),
        lastModifiedBy: userId,
      },
    });

    logger.info('Recording stopped for telehealth session', {
      sessionId,
    });

    return session;
  } catch (error: any) {
    logger.error('Failed to stop recording', {
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack,
      sessionId,
    });
    throw error;
  }
}

/**
 * Get Twilio configuration status
 */
export function getTwilioStatus() {
  return twilioService.getTwilioConfigStatus();
}
