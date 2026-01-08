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
  bypassConsentCheck?: boolean; // For clinician-initiated sessions where consent was verified externally
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

    // Check if mock mode is enabled via environment variable
    // TWILIO_MOCK_MODE=false -> Use real Twilio (even in development)
    // TWILIO_MOCK_MODE=true -> Use mock mode
    // TWILIO_MOCK_MODE not set -> Use mock mode in development, real in production
    const forceMockMode = process.env.TWILIO_MOCK_MODE === 'true' ||
                          (process.env.TWILIO_MOCK_MODE === undefined && config.nodeEnv === 'development');

    // DEBUG: Log environment variable values
    logger.info('🔍 Twilio Mode Check (CREATE)', {
      TWILIO_MOCK_MODE_raw: `"${process.env.TWILIO_MOCK_MODE}"`,
      TWILIO_MOCK_MODE_type: typeof process.env.TWILIO_MOCK_MODE,
      NODE_ENV: config.nodeEnv,
      forceMockMode: forceMockMode,
      comparison_true: process.env.TWILIO_MOCK_MODE === 'true',
      comparison_undefined: process.env.TWILIO_MOCK_MODE === undefined,
      comparison_false: process.env.TWILIO_MOCK_MODE === 'false',
    });

    let twilioRoom: any;
    let isMockMode = false;

    if (forceMockMode) {
      // Use mock mode for development (Twilio credentials are test/demo only)
      logger.info('Using mock mode for telehealth (development)', {
        appointmentId: data.appointmentId,
        reason: 'Development mode or TWILIO_MOCK_MODE enabled',
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
      // Production: Try to create real Twilio Video room
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
          // Fallback to mock mode if Twilio is unavailable
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
        clientJoinUrl: `${config.frontendUrl}/portal/telehealth/${data.appointmentId}`,
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
    let session = await prisma.telehealthSession.findFirst({
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

    // Auto-create session if it doesn't exist (clinician joining creates the session)
    if (!session) {
      logger.info('Telehealth session not found, attempting auto-creation', {
        appointmentId: data.sessionId,
        userRole: data.userRole,
      });

      // Only clinicians can auto-create sessions when joining
      if (data.userRole === 'clinician') {
        try {
          await createTelehealthSession({
            appointmentId: data.sessionId,
            createdBy: data.userId,
            bypassConsentCheck: true, // Clinician verified consent externally
          });

          // Fetch the newly created session
          session = await prisma.telehealthSession.findFirst({
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

          logger.info('Telehealth session auto-created on join', {
            appointmentId: data.sessionId,
            sessionId: session?.id,
          });
        } catch (createError: any) {
          logger.error('Failed to auto-create telehealth session', {
            appointmentId: data.sessionId,
            error: createError.message,
          });
          throw new Error(`Failed to create telehealth session: ${createError.message}`);
        }
      } else {
        // Client cannot auto-create - clinician must join first
        throw new Error('Telehealth session not started yet. Please wait for the clinician to start the session.');
      }
    }

    if (!session) {
      throw new Error('Telehealth session not found');
    }

    // Get room name from database (stored in chimeExternalMeetingId)
    const roomName = session.chimeExternalMeetingId;
    const roomSid = session.chimeMeetingId;

    // Create identity string for Twilio
    const identity = `${data.userRole}-${data.userName}-${Date.now()}`;

    // Check if this is a mock session OR if mock mode is enabled
    const isMockSession = roomSid?.startsWith('MOCK-');
    // TWILIO_MOCK_MODE=false -> Use real Twilio (even in development)
    // TWILIO_MOCK_MODE=true -> Use mock mode
    // TWILIO_MOCK_MODE not set -> Use mock mode in development, real in production
    const forceMockMode = process.env.TWILIO_MOCK_MODE === 'true' ||
                          (process.env.TWILIO_MOCK_MODE === undefined && config.nodeEnv === 'development');
    const useMockToken = isMockSession || forceMockMode;

    // DEBUG: Log environment variable values
    logger.info('🔍 Twilio Mode Check (JOIN)', {
      TWILIO_MOCK_MODE_raw: `"${process.env.TWILIO_MOCK_MODE}"`,
      TWILIO_MOCK_MODE_type: typeof process.env.TWILIO_MOCK_MODE,
      NODE_ENV: config.nodeEnv,
      roomSid: roomSid,
      isMockSession: isMockSession,
      forceMockMode: forceMockMode,
      useMockToken: useMockToken,
      comparison_true: process.env.TWILIO_MOCK_MODE === 'true',
      comparison_undefined: process.env.TWILIO_MOCK_MODE === undefined,
      comparison_false: process.env.TWILIO_MOCK_MODE === 'false',
    });

    // Generate Twilio access token or mock token
    let tokenData: any;

    if (useMockToken) {
      // Use mock token for development or mock sessions
      logger.info('Using mock token for telehealth session', {
        sessionId: session.id,
        userRole: data.userRole,
        reason: isMockSession ? 'Mock session' : 'Development mode',
      });

      tokenData = {
        token: `MOCK_TOKEN_${uuidv4()}`,
        identity,
        roomName,
        isMock: true,
      };
    } else {
      // Production: Generate real Twilio token
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
            isMock: true,
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

// ============================================================================
// SESSION RATING SERVICES
// ============================================================================

interface CreateSessionRatingData {
  sessionId: string;
  userId: string;
  rating: number;
  comments: string | null | undefined;
  ipAddress: string;
  shareWithTherapist?: boolean;
  shareWithAdmin?: boolean;
}

interface GetAllSessionRatingsParams {
  page: number;
  limit: number;
  minRating?: number;
  maxRating?: number;
  clinicianId?: string;
  clientId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  // Permission filtering
  viewerRole?: 'admin' | 'clinician';
  viewerId?: string; // Required when viewerRole is 'clinician'
}

/**
 * Create a session rating (client feedback)
 */
export async function createSessionRating(data: CreateSessionRatingData) {
  try {
    // Get session to verify it exists and get client ID
    const session = await prisma.telehealthSession.findUnique({
      where: { id: data.sessionId },
      include: {
        appointment: {
          include: {
            client: true,
          },
        },
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Verify the user is the client for this session
    if (session.appointment.client.id !== data.userId) {
      throw new Error('Only the session client can rate this session');
    }

    // Check if rating already exists
    const existingRating = await prisma.sessionRating.findUnique({
      where: { sessionId: data.sessionId },
    });

    if (existingRating) {
      throw new Error('This session has already been rated');
    }

    // Create the rating
    const rating = await prisma.sessionRating.create({
      data: {
        sessionId: data.sessionId,
        clientId: session.appointment.client.id,
        rating: data.rating,
        comments: data.comments || null,
        ipAddress: data.ipAddress,
        shareWithTherapist: data.shareWithTherapist ?? false,
        shareWithAdmin: data.shareWithAdmin ?? false,
      },
      include: {
        session: {
          include: {
            appointment: {
              include: {
                client: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
                clinician: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    logger.info('Session rating created', {
      ratingId: rating.id,
      sessionId: data.sessionId,
      rating: data.rating,
      hasComments: !!data.comments,
    });

    return rating;
  } catch (error: any) {
    logger.error('Failed to create session rating', {
      error: error.message,
      sessionId: data.sessionId,
    });
    throw error;
  }
}

/**
 * Get all session ratings with permission-based filtering
 * - Admins: Can see all ratings where shareWithAdmin is true
 * - Clinicians: Can see ratings for their sessions where shareWithTherapist is true
 */
export async function getAllSessionRatings(params: GetAllSessionRatingsParams) {
  try {
    const { page, limit, minRating, maxRating, clinicianId, clientId, startDate, endDate, search, viewerRole, viewerId } = params;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Permission-based filtering
    if (viewerRole === 'admin') {
      // Admins can only see ratings shared with admin
      where.shareWithAdmin = true;
    } else if (viewerRole === 'clinician' && viewerId) {
      // Clinicians can only see ratings for their sessions where shareWithTherapist is true
      where.shareWithTherapist = true;
      where.session = {
        appointment: {
          clinicianId: viewerId,
        },
      };
    }

    // Filter by rating range
    if (minRating !== undefined || maxRating !== undefined) {
      where.rating = {};
      if (minRating !== undefined) where.rating.gte = minRating;
      if (maxRating !== undefined) where.rating.lte = maxRating;
    }

    // Filter by client
    if (clientId) {
      where.clientId = clientId;
    }

    // Filter by clinician (requires nested filter through session -> appointment -> clinician)
    // Only apply if not already set by viewerRole filtering
    if (clinicianId && viewerRole !== 'clinician') {
      where.session = {
        ...(where.session || {}),
        appointment: {
          ...(where.session?.appointment || {}),
          clinicianId: clinicianId,
        },
      };
    }

    // Filter by date range
    if (startDate || endDate) {
      where.submittedAt = {};
      if (startDate) {
        where.submittedAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Add 1 day to end date to include the entire day
        const endDatePlusOne = new Date(endDate);
        endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
        where.submittedAt.lt = endDatePlusOne;
      }
    }

    // Search in comments
    if (search && search.trim()) {
      where.comments = {
        contains: search.trim(),
        mode: 'insensitive', // Case-insensitive search
      };
    }

    // Get ratings with pagination
    const [ratings, totalCount] = await Promise.all([
      prisma.sessionRating.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          submittedAt: 'desc',
        },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              medicalRecordNumber: true,
            },
          },
          session: {
            include: {
              appointment: {
                include: {
                  clinician: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.sessionRating.count({ where }),
    ]);

    return {
      ratings,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + ratings.length < totalCount,
      },
    };
  } catch (error: any) {
    logger.error('Failed to get session ratings', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get session rating statistics (admin only)
 */
export async function getSessionRatingStats() {
  try {
    const [
      totalRatings,
      averageRating,
      ratingDistribution,
      recentRatings,
    ] = await Promise.all([
      // Total count
      prisma.sessionRating.count(),

      // Average rating
      prisma.sessionRating.aggregate({
        _avg: {
          rating: true,
        },
      }),

      // Distribution by star rating
      prisma.sessionRating.groupBy({
        by: ['rating'],
        _count: {
          rating: true,
        },
        orderBy: {
          rating: 'desc',
        },
      }),

      // Recent ratings (last 30 days)
      prisma.sessionRating.count({
        where: {
          submittedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Calculate percentage distribution
    const distribution = ratingDistribution.map((item) => ({
      stars: item.rating,
      count: item._count.rating,
      percentage: totalRatings > 0 ? ((item._count.rating / totalRatings) * 100).toFixed(1) : '0.0',
    }));

    // Ensure all star ratings (1-5) are represented
    const fullDistribution = [5, 4, 3, 2, 1].map((stars) => {
      const existing = distribution.find((d) => d.stars === stars);
      return existing || { stars, count: 0, percentage: '0.0' };
    });

    return {
      totalRatings,
      averageRating: averageRating._avg.rating ? Number(averageRating._avg.rating.toFixed(2)) : 0,
      recentRatings, // last 30 days
      distribution: fullDistribution,
    };
  } catch (error: any) {
    logger.error('Failed to get session rating stats', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get session rating for a specific session (with permission filtering)
 */
export async function getSessionRating(
  sessionId: string,
  viewerRole: 'admin' | 'clinician',
  viewerId: string
) {
  try {
    const rating = await prisma.sessionRating.findUnique({
      where: { sessionId },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        session: {
          include: {
            appointment: {
              include: {
                clinician: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!rating) {
      return null;
    }

    // Permission check based on viewer role
    if (viewerRole === 'admin') {
      // Admins can only see if shareWithAdmin is true
      if (!rating.shareWithAdmin) {
        return null;
      }
    } else if (viewerRole === 'clinician') {
      // Clinicians can only see if shareWithTherapist is true AND they are the session's clinician
      const isSessionClinician = rating.session.appointment.clinicianId === viewerId;
      if (!rating.shareWithTherapist || !isSessionClinician) {
        return null;
      }
    }

    return rating;
  } catch (error: any) {
    logger.error('Failed to get session rating', {
      error: error.message,
      sessionId,
    });
    throw error;
  }
}
