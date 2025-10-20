import { Request, Response } from 'express';
import { z } from 'zod';
import * as portalAppointmentsService from '../services/portalAppointments.service';
import * as portalMessagingService from '../services/portalMessaging.service';
import logger from '../utils/logger';

// ========== APPOINTMENTS ==========

export const getUpcomingAppointments = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const appointments = await portalAppointmentsService.getUpcomingAppointments(clientId);

    res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (error: any) {
    logger.error('Failed to get upcoming appointments', {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve appointments',
    });
  }
};

export const getPastAppointments = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const appointments = await portalAppointmentsService.getPastAppointments(clientId, limit);

    res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (error: any) {
    logger.error('Failed to get past appointments', {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve appointments',
    });
  }
};

export const getAppointmentDetails = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;
    const { appointmentId } = req.params;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const appointment = await portalAppointmentsService.getAppointmentDetails(appointmentId, clientId);

    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error: any) {
    logger.error('Failed to get appointment details', {
      error: error.message,
    });
    res.status(error.message === 'Appointment not found' ? 404 : 500).json({
      success: false,
      message: error.message || 'Failed to retrieve appointment',
    });
  }
};

const cancelAppointmentSchema = z.object({
  reason: z.string().optional(),
});

export const cancelAppointment = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;
    const { appointmentId } = req.params;
    const validatedData = cancelAppointmentSchema.parse(req.body);

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const appointment = await portalAppointmentsService.requestCancellation(
      appointmentId,
      clientId,
      validatedData.reason
    );

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: appointment,
    });
  } catch (error: any) {
    logger.error('Failed to cancel appointment', {
      error: error.message,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to cancel appointment',
    });
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
    const clientId = (req as any).portalAccount?.clientId;
    const validatedData = sendMessageSchema.parse(req.body);

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const message = await portalMessagingService.sendMessage({
      clientId,
      subject: validatedData.subject,
      message: validatedData.message,
      priority: validatedData.priority,
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message,
    });
  } catch (error: any) {
    logger.error('Failed to send message', {
      error: error.message,
    });
    res.status(400).json({
      success: false,
      message: 'Failed to send message',
    });
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const messages = await portalMessagingService.getMessages(clientId);

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error: any) {
    logger.error('Failed to get messages', {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve messages',
    });
  }
};

export const getMessageThread = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;
    const { threadId } = req.params;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const messages = await portalMessagingService.getMessageThread(threadId, clientId);

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error: any) {
    logger.error('Failed to get message thread', {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve messages',
    });
  }
};

export const markMessageAsRead = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;
    const { messageId } = req.params;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const message = await portalMessagingService.markAsRead(messageId, clientId);

    res.status(200).json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    logger.error('Failed to mark message as read', {
      error: error.message,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to mark message as read',
    });
  }
};

const replyMessageSchema = z.object({
  message: z.string().min(1, 'Message is required'),
});

export const replyToMessage = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;
    const { messageId } = req.params;
    const validatedData = replyMessageSchema.parse(req.body);

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const reply = await portalMessagingService.replyToMessage(
      messageId,
      clientId,
      validatedData.message
    );

    res.status(201).json({
      success: true,
      message: 'Reply sent successfully',
      data: reply,
    });
  } catch (error: any) {
    logger.error('Failed to send reply', {
      error: error.message,
    });
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to send reply',
    });
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const count = await portalMessagingService.getUnreadCount(clientId);

    res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error: any) {
    logger.error('Failed to get unread count', {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
    });
  }
};

// ========== DASHBOARD ==========

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get dashboard data in parallel
    const [upcomingAppointments, unreadCount] = await Promise.all([
      portalAppointmentsService.getUpcomingAppointments(clientId),
      portalMessagingService.getUnreadCount(clientId),
    ]);

    res.status(200).json({
      success: true,
      data: {
        upcomingAppointments: upcomingAppointments.slice(0, 3), // Only next 3
        unreadMessagesCount: unreadCount,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get dashboard data', {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard',
    });
  }
};
