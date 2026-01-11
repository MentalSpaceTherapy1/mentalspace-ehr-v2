import { Response } from 'express';
import { AppError } from '../../utils/errors';
import logger from '../../utils/logger';
import prisma from '../../services/database';
import { PortalRequest } from '../../types/express.d';
import * as telehealthService from '../../services/telehealth.service';

// ============================================================================
// PORTAL TELEHEALTH CONTROLLER
// Allows clients to access telehealth sessions from the portal
// ============================================================================

/**
 * Get telehealth session details for an appointment
 * GET /portal/telehealth/session/:appointmentId
 */
export const getSession = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { appointmentId } = req.params;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Verify appointment belongs to this client
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        clientId,
      },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            credentials: true,
          },
        },
        telehealthSession: {
          select: {
            id: true,
            clientJoinUrl: true,
            status: true,
            sessionStartedAt: true,
            clientInWaitingRoom: true,
            waitingRoomEnteredAt: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    // Auto-create telehealth session if it doesn't exist (for backward compatibility)
    let telehealthSession = appointment.telehealthSession;
    if (!telehealthSession) {
      logger.info('Telehealth session not found for portal client, attempting auto-creation', {
        clientId,
        appointmentId,
      });

      try {
        const newSession = await telehealthService.createTelehealthSession({
          appointmentId,
          createdBy: 'portal-auto-create',
        });

        telehealthSession = {
          id: newSession.id,
          clientJoinUrl: newSession.clientJoinUrl,
          status: newSession.status,
          sessionStartedAt: newSession.sessionStartedAt,
          clientInWaitingRoom: newSession.clientInWaitingRoom,
          waitingRoomEnteredAt: newSession.waitingRoomEnteredAt,
        };

        logger.info('Telehealth session auto-created for portal client', {
          clientId,
          appointmentId,
          sessionId: newSession.id,
        });
      } catch (createError: any) {
        logger.warn('Failed to auto-create telehealth session for portal', {
          clientId,
          appointmentId,
          error: createError.message,
        });
        throw new AppError(createError.message || 'No telehealth session found for this appointment', 404);
      }
    }

    logger.info('Client accessed telehealth session details', {
      clientId,
      appointmentId,
      sessionId: telehealthSession.id,
    });

    res.status(200).json({
      success: true,
      data: {
        appointment: {
          id: appointment.id,
          appointmentDate: appointment.appointmentDate,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          duration: appointment.duration,
          status: appointment.status,
          appointmentType: appointment.appointmentType,
        },
        clinician: appointment.clinician,
        session: telehealthSession,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching telehealth session:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch telehealth session',
    });
  }
};

/**
 * Join a telehealth session and get Twilio access token
 * POST /portal/telehealth/session/:appointmentId/join
 */
export const joinSession = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const portalAccountId = req.portalAccount?.id;
    const { appointmentId } = req.params;

    if (!clientId || !portalAccountId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Verify appointment belongs to this client
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        clientId,
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        telehealthSession: true,
      },
    });

    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    if (!appointment.telehealthSession) {
      throw new AppError('No telehealth session found for this appointment', 404);
    }

    // Check if session is in a joinable state
    const sessionStatus = appointment.telehealthSession.status;
    if (sessionStatus === 'COMPLETED' || sessionStatus === 'CANCELLED') {
      throw new AppError(`Session is ${sessionStatus.toLowerCase()} and cannot be joined`, 400);
    }

    // Get client name for Twilio identity
    const userName = `${appointment.client.firstName} ${appointment.client.lastName}`;

    // Join session and get Twilio token
    const joinResult = await telehealthService.joinTelehealthSession({
      sessionId: appointmentId,
      userId: clientId,
      userRole: 'client',
      userName,
    });

    logger.info('Client joined telehealth session', {
      clientId,
      appointmentId,
      sessionId: appointment.telehealthSession.id,
      identity: joinResult.twilioIdentity,
    });

    res.status(200).json({
      success: true,
      message: 'Successfully joined session',
      data: {
        token: joinResult.twilioToken,
        roomName: joinResult.twilioRoomName,
        identity: joinResult.twilioIdentity,
        session: {
          id: joinResult.session.id,
          status: joinResult.session.status,
          clientInWaitingRoom: joinResult.session.clientInWaitingRoom,
        },
      },
    });
  } catch (error: any) {
    logger.error('Error joining telehealth session:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to join telehealth session',
    });
  }
};

/**
 * Leave a telehealth session
 * POST /portal/telehealth/session/:appointmentId/leave
 */
export const leaveSession = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { appointmentId } = req.params;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Verify appointment belongs to this client
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        clientId,
      },
      include: {
        telehealthSession: true,
      },
    });

    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    if (!appointment.telehealthSession) {
      throw new AppError('No telehealth session found for this appointment', 404);
    }

    // Update session to record client left
    await prisma.telehealthSession.update({
      where: { id: appointment.telehealthSession.id },
      data: {
        clientInWaitingRoom: false,
        sessionEndedAt: new Date(),
        lastModifiedBy: clientId,
      },
    });

    logger.info('Client left telehealth session', {
      clientId,
      appointmentId,
      sessionId: appointment.telehealthSession.id,
    });

    res.status(200).json({
      success: true,
      message: 'Successfully left session',
    });
  } catch (error: any) {
    logger.error('Error leaving telehealth session:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to leave telehealth session',
    });
  }
};

/**
 * Check telehealth consent status for the client
 * GET /portal/telehealth/consent-status
 */
export const getConsentStatus = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Check consent status
    const consentValidation = await telehealthService.verifyClientConsent(clientId, 'Georgia_Telehealth');

    res.status(200).json({
      success: true,
      data: {
        hasValidConsent: consentValidation.isValid,
        requiresRenewal: consentValidation.requiresRenewal,
        expirationDate: consentValidation.expirationDate,
        daysTillExpiration: consentValidation.daysTillExpiration,
        message: consentValidation.message,
      },
    });
  } catch (error: any) {
    logger.error('Error checking telehealth consent:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to check consent status',
    });
  }
};

/**
 * Submit session rating/feedback
 * POST /portal/telehealth/session/:sessionId/rate
 */
export const rateSession = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { sessionId } = req.params;
    const { rating, comments, shareWithTherapist, shareWithAdmin } = req.body;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Validate rating
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      throw new AppError('Rating must be a number between 1 and 5', 400);
    }

    // Verify session belongs to this client
    const session = await prisma.telehealthSession.findFirst({
      where: {
        id: sessionId,
        appointment: {
          clientId,
        },
      },
    });

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    // Create rating with sharing preferences
    const sessionRating = await telehealthService.createSessionRating({
      sessionId,
      userId: clientId,
      rating,
      comments,
      ipAddress: req.ip || 'unknown',
      shareWithTherapist: shareWithTherapist === true,
      shareWithAdmin: shareWithAdmin === true,
    });

    logger.info('Client submitted session rating', {
      clientId,
      sessionId,
      rating,
      shareWithTherapist,
      shareWithAdmin,
    });

    res.status(201).json({
      success: true,
      message: 'Rating submitted successfully',
      data: {
        id: sessionRating.id,
        rating: sessionRating.rating,
        shareWithTherapist: sessionRating.shareWithTherapist,
        shareWithAdmin: sessionRating.shareWithAdmin,
        submittedAt: sessionRating.submittedAt,
      },
    });
  } catch (error: any) {
    logger.error('Error submitting session rating:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to submit rating',
    });
  }
};
