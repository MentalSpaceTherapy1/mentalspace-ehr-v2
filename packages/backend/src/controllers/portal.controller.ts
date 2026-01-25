import { Request, Response } from 'express';
import { z } from 'zod';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
import * as portalAppointmentsService from '../services/portalAppointments.service';
import * as portalMessagingService from '../services/portalMessaging.service';
import logger from '../utils/logger';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound, sendServerError } from '../utils/apiResponse';

// ========== APPOINTMENTS ==========

export const getUpcomingAppointments = async (req: Request, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res);
    }

    const appointments = await portalAppointmentsService.getUpcomingAppointments(clientId);

    return sendSuccess(res, appointments);
  } catch (error) {
    logger.error('Failed to get upcoming appointments', {
      error: getErrorMessage(error),
    });
    return sendServerError(res, 'Failed to retrieve appointments');
  }
};

export const getPastAppointments = async (req: Request, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!clientId) {
      return sendUnauthorized(res);
    }

    const appointments = await portalAppointmentsService.getPastAppointments(clientId, limit);

    return sendSuccess(res, appointments);
  } catch (error) {
    logger.error('Failed to get past appointments', {
      error: getErrorMessage(error),
    });
    return sendServerError(res, 'Failed to retrieve appointments');
  }
};

export const getAppointmentDetails = async (req: Request, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { appointmentId } = req.params;

    if (!clientId) {
      return sendUnauthorized(res);
    }

    const appointment = await portalAppointmentsService.getAppointmentDetails(appointmentId, clientId);

    return sendSuccess(res, appointment);
  } catch (error) {
    logger.error('Failed to get appointment details', {
      error: getErrorMessage(error),
    });
    if (getErrorMessage(error) === 'Appointment not found') {
      return sendNotFound(res, 'Appointment');
    }
    return sendServerError(res, getErrorMessage(error) || 'Failed to retrieve appointment');
  }
};

const cancelAppointmentSchema = z.object({
  reason: z.string().optional(),
});

export const cancelAppointment = async (req: Request, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { appointmentId } = req.params;
    const validatedData = cancelAppointmentSchema.parse(req.body);

    if (!clientId) {
      return sendUnauthorized(res);
    }

    const appointment = await portalAppointmentsService.requestCancellation(
      appointmentId,
      clientId,
      validatedData.reason
    );

    return sendSuccess(res, appointment, 'Appointment cancelled successfully');
  } catch (error) {
    logger.error('Failed to cancel appointment', {
      error: getErrorMessage(error),
    });
    return sendBadRequest(res, getErrorMessage(error) || 'Failed to cancel appointment');
  }
};

// ========== MESSAGING ==========

const sendMessageSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required'),
  priority: z.enum(['Low', 'Normal', 'High', 'Urgent']).optional(),
});

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const validatedData = sendMessageSchema.parse(req.body);

    if (!clientId) {
      return sendUnauthorized(res);
    }

    const message = await portalMessagingService.sendMessage({
      clientId,
      subject: validatedData.subject,
      message: validatedData.message,
      priority: validatedData.priority,
    });

    return sendCreated(res, message, 'Message sent successfully');
  } catch (error) {
    logger.error('Failed to send message', {
      error: getErrorMessage(error),
    });
    return sendBadRequest(res, 'Failed to send message');
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res);
    }

    const messages = await portalMessagingService.getMessages(clientId);

    return sendSuccess(res, messages);
  } catch (error) {
    logger.error('Failed to get messages', {
      error: getErrorMessage(error),
    });
    return sendServerError(res, 'Failed to retrieve messages');
  }
};

export const getMessageThread = async (req: Request, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { threadId } = req.params;

    if (!clientId) {
      return sendUnauthorized(res);
    }

    const messages = await portalMessagingService.getMessageThread(threadId, clientId);

    return sendSuccess(res, messages);
  } catch (error) {
    logger.error('Failed to get message thread', {
      error: getErrorMessage(error),
    });
    return sendServerError(res, 'Failed to retrieve messages');
  }
};

export const markMessageAsRead = async (req: Request, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { messageId } = req.params;

    if (!clientId) {
      return sendUnauthorized(res);
    }

    const message = await portalMessagingService.markAsRead(messageId, clientId);

    return sendSuccess(res, message);
  } catch (error) {
    logger.error('Failed to mark message as read', {
      error: getErrorMessage(error),
    });
    return sendBadRequest(res, getErrorMessage(error) || 'Failed to mark message as read');
  }
};

const replyMessageSchema = z.object({
  message: z.string().min(1, 'Message is required'),
});

export const replyToMessage = async (req: Request, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { messageId } = req.params;
    const validatedData = replyMessageSchema.parse(req.body);

    if (!clientId) {
      return sendUnauthorized(res);
    }

    const reply = await portalMessagingService.replyToMessage(
      messageId,
      clientId,
      validatedData.message
    );

    return sendCreated(res, reply, 'Reply sent successfully');
  } catch (error) {
    logger.error('Failed to send reply', {
      error: getErrorMessage(error),
    });
    return sendBadRequest(res, getErrorMessage(error) || 'Failed to send reply');
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res);
    }

    const count = await portalMessagingService.getUnreadCount(clientId);

    return sendSuccess(res, { count });
  } catch (error) {
    logger.error('Failed to get unread count', {
      error: getErrorMessage(error),
    });
    return sendServerError(res, 'Failed to get unread count');
  }
};

// ========== DASHBOARD ==========

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res);
    }

    // Get dashboard data in parallel
    const [upcomingAppointments, unreadCount] = await Promise.all([
      portalAppointmentsService.getUpcomingAppointments(clientId),
      portalMessagingService.getUnreadCount(clientId),
    ]);

    return sendSuccess(res, {
      upcomingAppointments: upcomingAppointments.slice(0, 3), // Only next 3
      unreadMessagesCount: unreadCount,
    });
  } catch (error) {
    logger.error('Failed to get dashboard data', {
      error: getErrorMessage(error),
    });
    return sendServerError(res, 'Failed to load dashboard');
  }
};
