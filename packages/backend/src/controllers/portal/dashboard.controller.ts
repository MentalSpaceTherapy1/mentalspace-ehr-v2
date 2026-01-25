import { Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../utils/errors';
import logger from '../../utils/logger';
import prisma from '../../services/database';
import { getErrorMessage, getErrorCode } from '../../utils/errorHelpers';
import {
  billingService,
  moodTrackingService,
} from '../../services/portal';
import { PortalRequest } from '../../types/express.d';
import { PAGINATION } from '../../services/portal/constants';
import { sendSuccess, sendBadRequest, sendUnauthorized, sendNotFound, sendServerError } from '../../utils/apiResponse';

// ============================================================================
// DASHBOARD OVERVIEW
// ============================================================================

export const getDashboard = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Get upcoming appointments
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        clientId,
        appointmentDate: { gte: new Date() },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      orderBy: { appointmentDate: 'asc' },
      take: PAGINATION.DASHBOARD_APPOINTMENTS,
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
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

    // Get unread messages count (messages sent by clinician that are unread)
    const unreadMessages = await prisma.portalMessage.count({
      where: {
        clientId,
        isRead: false,
        sentByClient: false,
      },
    });

    // Get current balance
    let balance = 0;
    try {
      const billingResult = await billingService.getCurrentBalance(clientId);
      balance = billingResult.currentBalance;
    } catch (error) {
      logger.warn('Billing service not available');
    }

    // Get recent mood entries (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentMoods = await prisma.moodEntry.findMany({
      where: {
        clientId,
        entryDate: { gte: sevenDaysAgo },
      },
      orderBy: { entryDate: 'desc' },
      take: PAGINATION.MOOD_HISTORY,
      select: {
        id: true,
        moodScore: true,
        entryDate: true,
        timeOfDay: true,
      },
    });

    // Get engagement streak
    const streakData = await prisma.engagementStreak.findUnique({
      where: { clientId },
    });

    const engagementStreak = {
      currentStreak: streakData?.currentStreak || 0,
      longestStreak: streakData?.longestStreak || 0,
      totalCheckIns: streakData?.totalCheckIns || 0,
    };

    // Get pending homework assignments count
    let pendingHomework = 0;
    try {
      pendingHomework = await prisma.homeworkAssignment.count({
        where: {
          clientId,
          status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
        },
      });
    } catch (error) {
      logger.warn('Could not fetch homework count');
    }

    // Get active goals count
    let activeGoals = 0;
    try {
      activeGoals = await prisma.therapeuticGoal.count({
        where: {
          clientId,
          status: { in: ['ACTIVE', 'IN_PROGRESS'] },
        },
      });
    } catch (error) {
      logger.warn('Could not fetch goals count');
    }

    return sendSuccess(res, {
      upcomingAppointments,
      unreadMessages,
      balance,
      recentMoods,
      engagementStreak,
      pendingTasks: {
        homework: pendingHomework,
        activeGoals,
      },
    });
  } catch (error) {
    logger.error('Error fetching dashboard:', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to fetch dashboard');
  }
};

// ============================================================================
// APPOINTMENTS
// ============================================================================

export const getUpcomingAppointments = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const limit = parseInt(req.query.limit as string) || PAGINATION.APPOINTMENTS_DEFAULT;

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
        telehealthSession: {
          select: {
            id: true,
            clientJoinUrl: true,
            status: true,
          },
        },
      },
    });

    return sendSuccess(res, appointments);
  } catch (error) {
    logger.error('Error fetching upcoming appointments:', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to fetch appointments');
  }
};

export const getPastAppointments = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const limit = parseInt(req.query.limit as string) || PAGINATION.PAST_APPOINTMENTS_DEFAULT;

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
        telehealthSession: {
          select: {
            id: true,
            clientJoinUrl: true,
            status: true,
          },
        },
      },
    });

    return sendSuccess(res, appointments);
  } catch (error) {
    logger.error('Error fetching past appointments:', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to fetch appointments');
  }
};

export const getAppointmentDetails = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
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

    return sendSuccess(res, appointment);
  } catch (error) {
    logger.error('Error fetching appointment details:', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to fetch appointment details');
  }
};

const cancelAppointmentSchema = z.object({
  reason: z.string().optional(),
});

export const cancelAppointment = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
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

    return sendSuccess(res, {
      appointment: updated,
      isLateCancellation,
    }, isLateCancellation
      ? 'Appointment cancelled. Note: This is a late cancellation (less than 24 hours notice).'
      : 'Appointment cancelled successfully.');
  } catch (error) {
    logger.error('Error cancelling appointment:', error);
    return sendServerError(res, getErrorMessage(error) || 'Failed to cancel appointment');
  }
};

// Note: Secure messaging is implemented in messages.controller.ts
// Routes use that controller instead of these (now removed) stub functions
