import prisma from './database';
import logger from '../utils/logger';
import config from '../config';
import * as chimeService from './chime.service';
import { v4 as uuidv4 } from 'uuid';

interface CreateTelehealthSessionData {
  appointmentId: string;
  createdBy: string;
}

interface JoinSessionData {
  sessionId: string;
  userId: string;
  userRole: 'clinician' | 'client';
}

/**
 * Create a telehealth session for an appointment
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

    // Generate external meeting ID (used for Chime)
    const externalMeetingId = `telehealth-${data.appointmentId}-${uuidv4()}`;

    // Create Amazon Chime meeting
    const chimeMeeting = await chimeService.createChimeMeeting(externalMeetingId);

    if (!chimeMeeting || !chimeMeeting.MeetingId) {
      throw new Error('Failed to create Chime meeting');
    }

    // Create telehealth session in database
    const session = await prisma.telehealthSession.create({
      data: {
        appointmentId: data.appointmentId,
        chimeMeetingId: chimeMeeting.MeetingId,
        chimeExternalMeetingId: externalMeetingId,
        chimeMeetingRegion: chimeMeeting.MediaRegion,
        clinicianJoinUrl: `${config.frontendUrl}/telehealth/session/${data.appointmentId}?role=clinician`,
        clientJoinUrl: `${config.frontendUrl}/telehealth/session/${data.appointmentId}?role=client`,
        meetingDataJson: chimeMeeting,
        status: 'SCHEDULED',
        recordingConsent: false,
        recordingEnabled: false,
        createdBy: data.createdBy,
        lastModifiedBy: data.createdBy,
      },
    });

    logger.info('Telehealth session created', {
      sessionId: session.id,
      appointmentId: data.appointmentId,
      chimeMeetingId: chimeMeeting.MeetingId,
    });

    return session;
  } catch (error: any) {
    logger.error('Failed to create telehealth session', {
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack,
      errorCode: error.code || error.$metadata?.httpStatusCode,
      appointmentId: data.appointmentId,
    });
    throw error;
  }
}

/**
 * Get join credentials for a telehealth session
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

    // Determine external user ID based on role
    let externalUserId = '';
    if (data.userRole === 'clinician') {
      externalUserId = `clinician-${session.appointment.clinicianId}`;
    } else {
      externalUserId = `client-${session.appointment.clientId}`;
    }

    // Create Chime attendee
    const attendee = await chimeService.createChimeAttendee(
      session.chimeMeetingId,
      externalUserId
    );

    if (!attendee || !attendee.AttendeeId) {
      throw new Error('Failed to create meeting attendee');
    }

    // Update session with attendee info
    const updateData: any = {
      lastModifiedBy: data.userId,
    };

    if (data.userRole === 'clinician') {
      updateData.clinicianAttendeeId = attendee.AttendeeId;
      // If clinician joins, start the session
      if (session.status === 'WAITING_ROOM' || session.status === 'SCHEDULED') {
        updateData.status = 'IN_PROGRESS';
        updateData.sessionStartedAt = new Date();
      }
    } else {
      updateData.clientAttendeeId = attendee.AttendeeId;
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
      attendeeId: attendee.AttendeeId,
    });

    return {
      session: updatedSession,
      meeting: session.meetingDataJson,
      attendee: attendee,
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
 * End a telehealth session
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

    // Delete Chime meeting
    await chimeService.deleteChimeMeeting(session.chimeMeetingId);

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
