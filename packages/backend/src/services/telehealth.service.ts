import prisma from './database';
import logger from '../utils/logger';
import config from '../config';
import * as twilioService from './twilio.service';
import { v4 as uuidv4 } from 'uuid';

interface ConsentValidationResult {
  isValid: boolean;
  expirationDate: Date | null;
  daysTillExpiration: number | null;
  requiresRenewal: boolean;
  consentType: string;
  message: string;
}

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

    // COMPLIANCE CHECK: Verify client has valid consent before creating session
    const clientId = appointment.clientId;
    const consentValidation = await verifyClientConsent(clientId, 'Georgia_Telehealth');

    // Log consent verification for audit trail
    logger.info('Telehealth consent verification for session creation', {
      appointmentId: data.appointmentId,
      clientId,
      createdBy: data.createdBy,
      consentValidation,
    });

    // Block session creation if no valid consent
    if (!consentValidation.isValid) {
      throw new Error(
        `Cannot create telehealth session: Valid consent required. ${consentValidation.message}. ` +
        `Client must complete consent form before scheduling telehealth appointments.`
      );
    }

    // Warn if consent is expiring soon
    if (consentValidation.requiresRenewal) {
      logger.warn('Creating telehealth session with consent expiring soon', {
        appointmentId: data.appointmentId,
        clientId,
        daysTillExpiration: consentValidation.daysTillExpiration,
        expirationDate: consentValidation.expirationDate,
      });
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

    // COMPLIANCE CHECK: Verify client consent before allowing session join
    if (data.userRole === 'client') {
      const clientId = session.appointment.clientId;

      // Verify Georgia telehealth consent
      const consentValidation = await verifyClientConsent(clientId, 'Georgia_Telehealth');

      // Log consent verification for audit trail
      logger.info('Telehealth consent verification for session join', {
        sessionId: session.id,
        clientId,
        userId: data.userId,
        consentValidation,
      });

      // Block if consent is not valid
      if (!consentValidation.isValid) {
        throw new Error(
          `Valid telehealth consent required to join session. ${consentValidation.message}`
        );
      }

      // Allow join if valid, but log warning if renewal required
      if (consentValidation.requiresRenewal) {
        logger.warn('Client joining session with consent expiring soon', {
          sessionId: session.id,
          clientId,
          daysTillExpiration: consentValidation.daysTillExpiration,
          expirationDate: consentValidation.expirationDate,
        });
      }
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

/**
 * Get client emergency contact for a session
 */
export async function getClientEmergencyContact(sessionId: string) {
  try {
    const session = await prisma.telehealthSession.findUnique({
      where: { id: sessionId },
      include: {
        appointment: {
          include: {
            client: {
              include: {
                emergencyContacts: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new Error('Telehealth session not found');
    }

    const client = session.appointment.client;
    const primaryContact = client.emergencyContacts[0];

    if (!primaryContact) {
      logger.warn('No emergency contact found for client', {
        clientId: client.id,
        sessionId,
      });
      return null;
    }

    return {
      name: primaryContact.name,
      phone: primaryContact.phone,
      relationship: primaryContact.relationship,
    };
  } catch (error: any) {
    logger.error('Failed to get client emergency contact', {
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack,
      sessionId,
    });
    throw error;
  }
}

/**
 * Activate emergency protocol for a telehealth session
 */
export async function activateEmergency(data: {
  sessionId: string;
  emergencyNotes: string;
  emergencyResolution: 'CONTINUED' | 'ENDED_IMMEDIATELY' | 'FALSE_ALARM';
  emergencyContactNotified: boolean;
  userId: string;
}) {
  try {
    const session = await prisma.telehealthSession.findUnique({
      where: { id: data.sessionId },
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

    // Get existing audit log or create new one
    const existingAuditLog = (session.hipaaAuditLog as any) || { events: [] };
    const auditLogEvents = Array.isArray(existingAuditLog.events)
      ? existingAuditLog.events
      : [];

    // Add emergency activation to audit log
    const emergencyAuditEntry = {
      timestamp: new Date().toISOString(),
      eventType: 'EMERGENCY_ACTIVATED',
      userId: data.userId,
      sessionId: data.sessionId,
      emergencyResolution: data.emergencyResolution,
      emergencyContactNotified: data.emergencyContactNotified,
      clientId: session.appointment.client.id,
      clinicianId: session.appointment.clinician.id,
      ipAddress: 'N/A', // Would be captured from request in controller
      userAgent: 'N/A', // Would be captured from request in controller
    };

    auditLogEvents.push(emergencyAuditEntry);

    // Update session with emergency data
    const updatedSession = await prisma.telehealthSession.update({
      where: { id: data.sessionId },
      data: {
        emergencyActivated: true,
        emergencyActivatedAt: new Date(),
        emergencyNotes: data.emergencyNotes,
        emergencyResolution: data.emergencyResolution,
        emergencyContactNotified: data.emergencyContactNotified,
        hipaaAuditLog: {
          ...existingAuditLog,
          events: auditLogEvents,
        },
        lastModifiedBy: data.userId,
      },
    });

    logger.info('Emergency protocol activated for telehealth session', {
      sessionId: data.sessionId,
      resolution: data.emergencyResolution,
      contactNotified: data.emergencyContactNotified,
      userId: data.userId,
    });

    // If session ended immediately due to emergency, update status
    if (data.emergencyResolution === 'ENDED_IMMEDIATELY') {
      await prisma.telehealthSession.update({
        where: { id: data.sessionId },
        data: {
          status: 'COMPLETED',
          sessionEndedAt: new Date(),
          endReason: 'Emergency',
        },
      });
    }

    return updatedSession;
  } catch (error: any) {
    logger.error('Failed to activate emergency protocol', {
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack,
      sessionId: data.sessionId,
    });
    throw error;
  }
}

/**
 * Verify client has valid telehealth consent
 * Returns detailed validation result for compliance logging
 */
export async function verifyClientConsent(
  clientId: string,
  consentType: string = 'Georgia_Telehealth'
): Promise<ConsentValidationResult> {
  try {
    // Query most recent active consent for client
    const consent = await prisma.telehealthConsent.findFirst({
      where: {
        clientId,
        consentType,
        isActive: true,
        consentWithdrawn: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // No consent found
    if (!consent) {
      return {
        isValid: false,
        expirationDate: null,
        daysTillExpiration: null,
        requiresRenewal: false,
        consentType,
        message: 'No telehealth consent found for client',
      };
    }

    // Consent not signed yet
    if (!consent.consentGiven) {
      return {
        isValid: false,
        expirationDate: consent.expirationDate,
        daysTillExpiration: null,
        requiresRenewal: false,
        consentType,
        message: 'Consent has not been signed by client',
      };
    }

    // Check expiration
    const now = new Date();
    const expirationDate = new Date(consent.expirationDate);
    const daysTillExpiration = Math.ceil(
      (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Consent expired
    if (daysTillExpiration < 0) {
      return {
        isValid: false,
        expirationDate,
        daysTillExpiration,
        requiresRenewal: true,
        consentType,
        message: `Consent expired ${Math.abs(daysTillExpiration)} days ago`,
      };
    }

    // Consent expiring soon (within 30 days)
    if (daysTillExpiration <= 30) {
      return {
        isValid: true, // Still valid but requires renewal soon
        expirationDate,
        daysTillExpiration,
        requiresRenewal: true,
        consentType,
        message: `Consent valid but expires in ${daysTillExpiration} days - renewal required`,
      };
    }

    // Valid consent
    return {
      isValid: true,
      expirationDate,
      daysTillExpiration,
      requiresRenewal: false,
      consentType,
      message: 'Valid consent on file',
    };
  } catch (error: any) {
    logger.error('Failed to verify client consent', {
      error: error.message,
      clientId,
      consentType,
    });

    // On error, fail closed (invalid consent)
    return {
      isValid: false,
      expirationDate: null,
      daysTillExpiration: null,
      requiresRenewal: false,
      consentType,
      message: `Error verifying consent: ${error.message}`,
    };
  }
}
