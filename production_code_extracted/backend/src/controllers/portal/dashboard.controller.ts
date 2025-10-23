import { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../utils/errors';
import logger from '../../utils/logger';
import prisma from '../../services/database';
import {
  billingService,
  moodTrackingService,
} from '../../services/portal';

// ============================================================================
// DASHBOARD OVERVIEW
// ============================================================================

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;

    // Get upcoming appointments
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        clientId,
        appointmentDate: { gte: new Date() },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      orderBy: { appointmentDate: 'asc' },
      take: 3,
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // TODO: Implement messaging system
    const unreadMessages = 0;

    // Get current balance (TODO: implement billing service)
    let balance = 0;
    try {
      const billingResult = await billingService.getCurrentBalance(clientId);
      balance = billingResult.currentBalance;
    } catch (error) {
      // Billing service not implemented yet
      logger.warn('Billing service not available');
    }

    // TODO: Implement mood tracking
    const recentMoods: any[] = [];

    // TODO: Implement engagement tracking
    const engagementStreak = {
      currentStreak: 0,
      longestStreak: 0,
      totalCheckIns: 0,
    };

    // TODO: Implement homework and goals
    const pendingHomework = 0;
    const activeGoals = 0;

    res.status(200).json({
      success: true,
      data: {
        upcomingAppointments,
        unreadMessages,
        balance,
        recentMoods,
        engagementStreak,
        pendingTasks: {
          homework: pendingHomework,
          activeGoals,
        },
      },
    });
  } catch (error: any) {
    logger.error('Error fetching dashboard:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch dashboard',
    });
  }
};

// ============================================================================
// APPOINTMENTS
// ============================================================================

export const getUpcomingAppointments = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;
    const limit = parseInt(req.query.limit as string) || 10;

    const appointments = await prisma.appointment.findMany({
      where: {
        clientId,
        appointmentDate: { gte: new Date() },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      orderBy: { appointmentDate: 'asc' },
      take: limit,
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            credentials: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (error: any) {
    logger.error('Error fetching upcoming appointments:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch appointments',
    });
  }
};

export const getPastAppointments = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;
    const limit = parseInt(req.query.limit as string) || 20;

    const appointments = await prisma.appointment.findMany({
      where: {
        clientId,
        appointmentDate: { lt: new Date() },
      },
      orderBy: { appointmentDate: 'desc' },
      take: limit,
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            credentials: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (error: any) {
    logger.error('Error fetching past appointments:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch appointments',
    });
  }
};

export const getAppointmentDetails = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;
    const { appointmentId } = req.params;

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
          },
        },
      },
    });

    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error: any) {
    logger.error('Error fetching appointment details:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch appointment details',
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
    const data = cancelAppointmentSchema.parse(req.body);

    // Find appointment
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        clientId,
      },
    });

    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    // Check if appointment is in the future
    if (appointment.appointmentDate < new Date()) {
      throw new AppError('Cannot cancel past appointments', 400);
    }

    // Check if already cancelled
    if (appointment.status === 'CANCELLED') {
      throw new AppError('Appointment is already cancelled', 400);
    }

    // Check cancellation policy (24 hour notice)
    const hoursUntilAppt = (appointment.appointmentDate.getTime() - Date.now()) / (1000 * 60 * 60);
    const isLateCancellation = hoursUntilAppt < 24;

    // Update appointment
    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'CANCELLED',
        cancellationReason: data.reason,
        cancellationDate: new Date(),
        cancelledBy: clientId,
      },
    });

    // TODO: Send cancellation notification to clinician
    // TODO: If late cancellation, potentially apply fee or note in client record

    logger.info(
      `Appointment ${appointmentId} cancelled by client ${clientId}. Late cancellation: ${isLateCancellation}`
    );

    res.status(200).json({
      success: true,
      message: isLateCancellation
        ? 'Appointment cancelled. Note: This is a late cancellation (less than 24 hours notice).'
        : 'Appointment cancelled successfully.',
      data: {
        appointment: updated,
        isLateCancellation,
      },
    });
  } catch (error: any) {
    logger.error('Error cancelling appointment:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to cancel appointment',
    });
  }
};

// ============================================================================
// SECURE MESSAGING
// ============================================================================

export const getMessages = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;

    // TODO: Implement secure messaging system
    const messages: any[] = [];

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error: any) {
    logger.error('Error fetching messages:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch messages',
    });
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;

    // TODO: Implement secure messaging system
    const count = 0;

    res.status(200).json({
      success: true,
      data: { unreadCount: count },
    });
  } catch (error: any) {
    logger.error('Error fetching unread count:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch unread count',
    });
  }
};

export const getMessageThread = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;
    const { threadId } = req.params;

    // TODO: Implement secure messaging system
    const messages: any[] = [];

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error: any) {
    logger.error('Error fetching message thread:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch message thread',
    });
  }
};

const sendMessageSchema = z.object({
  recipientId: z.string().uuid(),
  subject: z.string().min(1).max(200),
  messageBody: z.string().min(1).max(5000),
  threadId: z.string().uuid().optional(),
});

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;
    const data = sendMessageSchema.parse(req.body);

    // TODO: Implement secure messaging system
    logger.info(`Message send request from client ${clientId} (not implemented yet)`);

    res.status(201).json({
      success: true,
      message: 'Messaging feature coming soon',
      data: null,
    });
  } catch (error: any) {
    logger.error('Error sending message:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to send message',
    });
  }
};

export const markMessageAsRead = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;
    const { messageId } = req.params;

    // TODO: Implement secure messaging system
    logger.info(`Mark message as read request from client ${clientId} (not implemented yet)`);

    res.status(200).json({
      success: true,
      data: null,
    });
  } catch (error: any) {
    logger.error('Error marking message as read:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to mark message as read',
    });
  }
};
