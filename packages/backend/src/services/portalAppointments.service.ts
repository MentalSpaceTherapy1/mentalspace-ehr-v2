import prisma from './database';
import logger from '../utils/logger';

/**
 * Get client's upcoming appointments
 */
export async function getUpcomingAppointments(clientId: string) {
  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        clientId,
        appointmentDate: {
          gte: new Date(),
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN'],
        },
      },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
      },
      orderBy: {
        appointmentDate: 'asc',
      },
      take: 10,
    });

    return appointments;
  } catch (error: any) {
    logger.error('Failed to get upcoming appointments', {
      error: error.message,
      clientId,
    });
    throw error;
  }
}

/**
 * Get client's past appointments
 */
export async function getPastAppointments(clientId: string, limit: number = 20) {
  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        clientId,
        appointmentDate: {
          lt: new Date(),
        },
      },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
      },
      orderBy: {
        appointmentDate: 'desc',
      },
      take: limit,
    });

    return appointments;
  } catch (error: any) {
    logger.error('Failed to get past appointments', {
      error: error.message,
      clientId,
    });
    throw error;
  }
}

/**
 * Get appointment details
 */
export async function getAppointmentDetails(appointmentId: string, clientId: string) {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        clientId, // Ensure client can only see their own appointments
      },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            email: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    return appointment;
  } catch (error: any) {
    logger.error('Failed to get appointment details', {
      error: error.message,
      appointmentId,
      clientId,
    });
    throw error;
  }
}

/**
 * Request appointment cancellation
 */
export async function requestCancellation(appointmentId: string, clientId: string, reason?: string) {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        clientId,
      },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (appointment.status === 'CANCELLED') {
      throw new Error('Appointment is already cancelled');
    }

    // Update appointment status
    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'CANCELLED',
        notes: reason ? `Client cancellation reason: ${reason}` : 'Cancelled by client via portal',
      },
    });

    logger.info('Appointment cancelled via portal', {
      appointmentId,
      clientId,
    });

    return updated;
  } catch (error: any) {
    logger.error('Failed to cancel appointment', {
      error: error.message,
      appointmentId,
      clientId,
    });
    throw error;
  }
}
