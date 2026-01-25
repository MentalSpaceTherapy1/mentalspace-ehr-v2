import { Response } from 'express';

import logger from '../../utils/logger';
import prisma from '../../services/database';
import { PortalRequest } from '../../types/express.d';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound, sendConflict, sendServerError } from '../../utils/apiResponse';

/**
 * Get therapist availability for calendar view
 * GET /api/v1/portal/appointments/availability
 */
export const getTherapistAvailability = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { clinicianId, startDate, endDate } = req.query;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Get client's assigned therapist if no clinicianId provided
    let targetClinicianId = clinicianId as string;

    if (!targetClinicianId) {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { primaryTherapistId: true },
      });

      if (!client?.primaryTherapistId) {
        return sendNotFound(res, 'Therapist');
      }

      targetClinicianId = client.primaryTherapistId;
    }

    // Get clinician schedule (weekly schedule)
    const clinicianSchedule = await prisma.clinicianSchedule.findFirst({
      where: {
        clinicianId: targetClinicianId,
        effectiveStartDate: {
          lte: new Date(startDate as string),
        },
        OR: [
          { effectiveEndDate: null },
          {
            effectiveEndDate: {
              gte: new Date(startDate as string),
            },
          },
        ],
      },
      orderBy: { effectiveStartDate: 'desc' },
    });

    // Get existing appointments to block out taken slots
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        clinicianId: targetClinicianId,
        appointmentDate: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        },
        status: {
          in: ['REQUESTED', 'SCHEDULED', 'CONFIRMED', 'CHECKED_IN'],
        },
      },
      select: {
        appointmentDate: true,
        startTime: true,
        endTime: true,
      },
    });

    logger.info(`Retrieved availability for clinician ${targetClinicianId}`);

    // Generate available time slots from weekly schedule
    const availableSlots = clinicianSchedule
      ? generateTimeSlots(clinicianSchedule.weeklyScheduleJson, startDate as string, endDate as string, existingAppointments)
      : [];

    return sendSuccess(res, {
      availableSlots,
      bookedSlots: existingAppointments,
      clinicianId: targetClinicianId,
      hasSchedule: !!clinicianSchedule,
    });
  } catch (error) {
    logger.error('Error fetching therapist availability:', error);
    return sendServerError(res, 'Failed to fetch availability');
  }
};

/**
 * Request a new appointment
 * POST /api/v1/portal/appointments/request
 */
export const requestAppointment = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const {
      clinicianId,
      appointmentDate,
      startTime,
      endTime,
      duration,
      appointmentType,
      appointmentNotes,
      preferredModality, // IN_PERSON or TELEHEALTH
    } = req.body;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Validate required fields
    if (!appointmentDate || !startTime || !appointmentType) {
      return sendBadRequest(res, 'Missing required fields');
    }

    // Get client's primary therapist if no clinicianId provided
    let targetClinicianId = clinicianId;

    if (!targetClinicianId) {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { primaryTherapistId: true },
      });

      if (!client?.primaryTherapistId) {
        return sendNotFound(res, 'Therapist');
      }

      targetClinicianId = client.primaryTherapistId;
    }

    // Check if slot is still available
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        clinicianId: targetClinicianId,
        appointmentDate: new Date(appointmentDate),
        startTime,
        status: {
          in: ['REQUESTED', 'SCHEDULED', 'CONFIRMED', 'CHECKED_IN'],
        },
      },
    });

    if (conflictingAppointment) {
      return sendConflict(res, 'This time slot is no longer available');
    }

    // Create appointment with REQUESTED status
    const appointment = await prisma.appointment.create({
      data: {
        clientId,
        clinicianId: targetClinicianId,
        appointmentDate: new Date(appointmentDate),
        startTime,
        endTime: endTime || calculateEndTime(startTime, duration || 60),
        duration: duration || 60,
        appointmentType,
        serviceLocation: preferredModality || 'TELEHEALTH',
        status: 'REQUESTED',
        statusUpdatedBy: clientId,
        appointmentNotes: appointmentNotes || 'Client-requested appointment',
      } as any,
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

    logger.info(`Client ${clientId} requested appointment for ${appointmentDate} at ${startTime}`);

    return sendCreated(res, appointment, 'Appointment request submitted successfully');
  } catch (error) {
    logger.error('Error requesting appointment:', error);
    return sendServerError(res, 'Failed to request appointment');
  }
};

/**
 * Get client's requested appointments (pending approval)
 * GET /api/v1/portal/appointments/requested
 */
export const getRequestedAppointments = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    const requestedAppointments = await prisma.appointment.findMany({
      where: {
        clientId,
        status: 'REQUESTED',
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
      },
      orderBy: { appointmentDate: 'asc' },
    });

    logger.info(`Retrieved ${requestedAppointments.length} requested appointments for client ${clientId}`);

    return sendSuccess(res, requestedAppointments);
  } catch (error) {
    logger.error('Error fetching requested appointments:', error);
    return sendServerError(res, 'Failed to fetch requested appointments');
  }
};

/**
 * Cancel a requested appointment
 * DELETE /api/v1/portal/appointments/request/:appointmentId
 */
export const cancelRequestedAppointment = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { appointmentId } = req.params;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Verify the appointment belongs to this client and is in REQUESTED status
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        clientId,
        status: 'REQUESTED',
      },
    });

    if (!appointment) {
      return sendNotFound(res, 'Requested appointment');
    }

    // Delete the appointment request
    await prisma.appointment.delete({
      where: { id: appointmentId },
    });

    logger.info(`Client ${clientId} cancelled appointment request ${appointmentId}`);

    return sendSuccess(res, null, 'Appointment request cancelled');
  } catch (error) {
    logger.error('Error cancelling appointment request:', error);
    return sendServerError(res, 'Failed to cancel appointment request');
  }
};

/**
 * Get available appointment types
 * GET /api/v1/portal/appointments/types
 */
export const getAppointmentTypes = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Return the EXACT same appointment types used in the EHR system
    // These match AppointmentsCalendar.tsx lines 282-286
    // Client portal uses 60 minutes for all appointment types
    const appointmentTypes = [
      { value: 'Initial Consultation', label: 'Initial Consultation', duration: 60 },
      { value: 'Follow-up', label: 'Follow-up', duration: 60 },
      { value: 'Therapy Session', label: 'Therapy Session', duration: 60 },
      { value: 'Medication Management', label: 'Medication Management', duration: 60 },
      { value: 'Crisis Intervention', label: 'Crisis Intervention', duration: 60 },
    ];

    return sendSuccess(res, appointmentTypes);
  } catch (error) {
    logger.error('Error fetching appointment types:', error);
    return sendServerError(res, 'Failed to fetch appointment types');
  }
};

// ============ Helper Functions ============

/**
 * Calculate end time based on start time and duration
 */
function calculateEndTime(startTime: string, duration: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + duration;

  const endHours = Math.floor(endMinutes / 60) % 24;
  const endMins = endMinutes % 60;

  return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
}

/**
 * Generate available time slots from weekly schedule
 */
function generateTimeSlots(
  weeklyScheduleJson: any,
  startDate: string,
  endDate: string,
  bookedSlots: Array<{ appointmentDate: Date; startTime: string; endTime: string }>
): Array<{ date: string; startTime: string; endTime: string }> {
  const slots: Array<{ date: string; startTime: string; endTime: string }> = [];

  // For now, return empty array if no schedule
  // This prevents errors while we set up proper schedules
  if (!weeklyScheduleJson || typeof weeklyScheduleJson !== 'object') {
    return slots;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Generate slots for each day in the range
  for (let current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][current.getDay()];
    const daySchedule = (weeklyScheduleJson as any)[dayName];

    if (daySchedule && daySchedule.isAvailable) {
      // Add time slots for this day (e.g., hourly slots from start to end time)
      const dateStr = current.toISOString().split('T')[0];

      // Example: Generate hourly slots from 9am to 5pm
      // TODO: Use actual schedule times from daySchedule
      for (let hour = 9; hour < 17; hour++) {
        const startTime = `${String(hour).padStart(2, '0')}:00`;
        const endTime = `${String(hour + 1).padStart(2, '0')}:00`;

        // Check if slot is not booked
        const isBooked = bookedSlots.some(
          (slot) =>
            slot.appointmentDate.toISOString().split('T')[0] === dateStr &&
            slot.startTime === startTime
        );

        if (!isBooked) {
          slots.push({ date: dateStr, startTime, endTime });
        }
      }
    }
  }

  return slots;
}
