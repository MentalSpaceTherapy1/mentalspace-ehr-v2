import { PrismaClient } from '@prisma/client';
import { auditLogger } from '../utils/logger';

const prisma = new PrismaClient();

interface DaySchedule {
  isAvailable: boolean;
  startTime: string;
  endTime: string;
  breakStartTime?: string;
  breakEndTime?: string;
}

interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface ScheduleData {
  clinicianId: string;
  weeklyScheduleJson: WeeklySchedule;
  acceptNewClients?: boolean;
  maxAppointmentsPerDay?: number;
  maxAppointmentsPerWeek?: number;
  bufferTimeBetweenAppointments?: number;
  availableLocations: string[];
  effectiveStartDate: Date;
  effectiveEndDate?: Date;
  createdBy: string;
}

interface ScheduleExceptionData {
  clinicianId: string;
  exceptionType: string;
  startDate: Date;
  endDate: Date;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  reason: string;
  notes?: string;
  createdBy: string;
}

/**
 * Create or update clinician schedule
 */
export async function upsertClinicianSchedule(data: ScheduleData) {
  try {
    // Check if schedule exists for this clinician and date range
    const existingSchedule = await prisma.clinicianSchedule.findFirst({
      where: {
        clinicianId: data.clinicianId,
        effectiveStartDate: { lte: data.effectiveStartDate },
        OR: [
          { effectiveEndDate: null },
          { effectiveEndDate: { gte: data.effectiveStartDate } },
        ],
      },
    });

    if (existingSchedule) {
      // Update existing schedule
      const updated = await prisma.clinicianSchedule.update({
        where: { id: existingSchedule.id },
        data: {
          weeklyScheduleJson: data.weeklyScheduleJson as any,
          acceptNewClients: data.acceptNewClients,
          maxAppointmentsPerDay: data.maxAppointmentsPerDay,
          maxAppointmentsPerWeek: data.maxAppointmentsPerWeek,
          bufferTimeBetweenAppointments: data.bufferTimeBetweenAppointments,
          availableLocations: data.availableLocations,
          effectiveEndDate: data.effectiveEndDate,
          lastModifiedBy: data.createdBy,
        },
      });

      auditLogger.info('Clinician schedule updated', {
        userId: data.createdBy,
        scheduleId: updated.id,
        clinicianId: data.clinicianId,
        action: 'CLINICIAN_SCHEDULE_UPDATED',
      });

      return updated;
    } else {
      // Create new schedule
      const schedule = await prisma.clinicianSchedule.create({
        data: {
          clinicianId: data.clinicianId,
          weeklyScheduleJson: data.weeklyScheduleJson as any,
          acceptNewClients: data.acceptNewClients ?? true,
          maxAppointmentsPerDay: data.maxAppointmentsPerDay,
          maxAppointmentsPerWeek: data.maxAppointmentsPerWeek,
          bufferTimeBetweenAppointments: data.bufferTimeBetweenAppointments,
          availableLocations: data.availableLocations,
          effectiveStartDate: data.effectiveStartDate,
          effectiveEndDate: data.effectiveEndDate,
          createdBy: data.createdBy,
          lastModifiedBy: data.createdBy,
        },
      });

      auditLogger.info('Clinician schedule created', {
        userId: data.createdBy,
        scheduleId: schedule.id,
        clinicianId: data.clinicianId,
        action: 'CLINICIAN_SCHEDULE_CREATED',
      });

      return schedule;
    }
  } catch (error) {
    auditLogger.error('Failed to upsert clinician schedule', {
      error: error instanceof Error ? error.message : 'Unknown error',
      clinicianId: data.clinicianId,
    });
    throw error;
  }
}

/**
 * Get clinician schedule
 */
export async function getClinicianSchedule(
  clinicianId: string,
  effectiveDate?: Date
) {
  const date = effectiveDate || new Date();

  const schedule = await prisma.clinicianSchedule.findFirst({
    where: {
      clinicianId,
      effectiveStartDate: { lte: date },
      OR: [{ effectiveEndDate: null }, { effectiveEndDate: { gte: date } }],
    },
    orderBy: { effectiveStartDate: 'desc' },
  });

  return schedule;
}

/**
 * Get all clinicians schedules (for admin view)
 */
export async function getAllCliniciansSchedules(effectiveDate?: Date) {
  const date = effectiveDate || new Date();

  const schedules = await prisma.clinicianSchedule.findMany({
    where: {
      effectiveStartDate: { lte: date },
      OR: [{ effectiveEndDate: null }, { effectiveEndDate: { gte: date } }],
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
    orderBy: { clinicianId: 'asc' },
  });

  return schedules;
}

/**
 * Create schedule exception (time off, holiday, etc.)
 */
export async function createScheduleException(data: ScheduleExceptionData) {
  try {
    const exception = await prisma.scheduleException.create({
      data: {
        clinicianId: data.clinicianId,
        exceptionType: data.exceptionType,
        startDate: data.startDate,
        endDate: data.endDate,
        startTime: data.startTime,
        endTime: data.endTime,
        allDay: data.allDay ?? true,
        reason: data.reason,
        notes: data.notes,
        status: 'Requested',
        createdBy: data.createdBy,
        lastModifiedBy: data.createdBy,
      },
    });

    auditLogger.info('Schedule exception created', {
      userId: data.createdBy,
      exceptionId: exception.id,
      clinicianId: data.clinicianId,
      exceptionType: data.exceptionType,
      action: 'SCHEDULE_EXCEPTION_CREATED',
    });

    return exception;
  } catch (error) {
    auditLogger.error('Failed to create schedule exception', {
      error: error instanceof Error ? error.message : 'Unknown error',
      clinicianId: data.clinicianId,
    });
    throw error;
  }
}

/**
 * Get schedule exceptions for clinician
 */
export async function getScheduleExceptions(
  clinicianId: string,
  startDate?: Date,
  endDate?: Date
) {
  const where: any = { clinicianId };

  if (startDate && endDate) {
    where.OR = [
      {
        startDate: { gte: startDate, lte: endDate },
      },
      {
        endDate: { gte: startDate, lte: endDate },
      },
      {
        AND: [{ startDate: { lte: startDate } }, { endDate: { gte: endDate } }],
      },
    ];
  }

  const exceptions = await prisma.scheduleException.findMany({
    where,
    orderBy: { startDate: 'asc' },
  });

  return exceptions;
}

/**
 * Approve schedule exception
 */
export async function approveScheduleException(
  exceptionId: string,
  approvedBy: string
) {
  const exception = await prisma.scheduleException.update({
    where: { id: exceptionId },
    data: {
      status: 'Approved',
      approvedBy,
      approvalDate: new Date(),
    },
  });

  auditLogger.info('Schedule exception approved', {
    userId: approvedBy,
    exceptionId,
    action: 'SCHEDULE_EXCEPTION_APPROVED',
  });

  return exception;
}

/**
 * Deny schedule exception
 */
export async function denyScheduleException(
  exceptionId: string,
  denialReason: string,
  deniedBy: string
) {
  const exception = await prisma.scheduleException.update({
    where: { id: exceptionId },
    data: {
      status: 'Denied',
      denialReason,
      approvedBy: deniedBy,
      approvalDate: new Date(),
    },
  });

  auditLogger.info('Schedule exception denied', {
    userId: deniedBy,
    exceptionId,
    denialReason,
    action: 'SCHEDULE_EXCEPTION_DENIED',
  });

  return exception;
}

/**
 * Delete schedule exception
 */
export async function deleteScheduleException(
  exceptionId: string,
  deletedBy: string
) {
  const exception = await prisma.scheduleException.delete({
    where: { id: exceptionId },
  });

  auditLogger.info('Schedule exception deleted', {
    userId: deletedBy,
    exceptionId,
    action: 'SCHEDULE_EXCEPTION_DELETED',
  });

  return exception;
}

/**
 * Get clinician availability for a date range
 */
export async function getClinicianAvailability(
  clinicianId: string,
  startDate: Date,
  endDate: Date
) {
  // Get schedule
  const schedule = await getClinicianSchedule(clinicianId, startDate);

  if (!schedule) {
    return [];
  }

  // Get exceptions
  const exceptions = await getScheduleExceptions(
    clinicianId,
    startDate,
    endDate
  );

  // Get existing appointments
  const appointments = await prisma.appointment.findMany({
    where: {
      clinicianId,
      appointmentDate: {
        gte: startDate,
        lte: endDate,
      },
      status: { notIn: ['Cancelled', 'No Show'] },
    },
    select: {
      appointmentDate: true,
      startTime: true,
      endTime: true,
      duration: true,
    },
  });

  // Build availability array
  const availability: any[] = [];
  const weeklySchedule = schedule.weeklyScheduleJson as any;

  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dayName = currentDate
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toLowerCase();
    const daySchedule = weeklySchedule[dayName];

    if (daySchedule && daySchedule.isAvailable) {
      // Check for exceptions
      const hasException = exceptions.some((ex) => {
        const exStart = new Date(ex.startDate);
        const exEnd = new Date(ex.endDate);
        return (
          ex.status === 'Approved' && currentDate >= exStart && currentDate <= exEnd
        );
      });

      if (!hasException) {
        // Get appointments for this day
        const dayAppointments = appointments.filter((apt) => {
          const aptDate = new Date(apt.appointmentDate);
          return aptDate.toDateString() === currentDate.toDateString();
        });

        availability.push({
          date: new Date(currentDate),
          dayOfWeek: dayName,
          startTime: daySchedule.startTime,
          endTime: daySchedule.endTime,
          breakStartTime: daySchedule.breakStartTime,
          breakEndTime: daySchedule.breakEndTime,
          appointmentCount: dayAppointments.length,
          bookedSlots: dayAppointments.map((apt) => ({
            startTime: apt.startTime,
            endTime: apt.endTime,
            duration: apt.duration,
          })),
        });
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return availability;
}

/**
 * Check if clinician has capacity for new appointment
 */
export async function hasCapacity(
  clinicianId: string,
  appointmentDate: Date,
  startTime: string,
  duration: number
): Promise<{ hasCapacity: boolean; reason?: string }> {
  // Get schedule
  const schedule = await getClinicianSchedule(clinicianId, appointmentDate);

  if (!schedule) {
    return { hasCapacity: false, reason: 'No schedule configured' };
  }

  // Check daily/weekly limits
  if (schedule.maxAppointmentsPerDay) {
    const dayAppointments = await prisma.appointment.count({
      where: {
        clinicianId,
        appointmentDate: appointmentDate,
        status: { notIn: ['Cancelled', 'No Show'] },
      },
    });

    if (dayAppointments >= schedule.maxAppointmentsPerDay) {
      return {
        hasCapacity: false,
        reason: 'Daily appointment limit reached',
      };
    }
  }

  if (schedule.maxAppointmentsPerWeek) {
    const weekStart = new Date(appointmentDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekAppointments = await prisma.appointment.count({
      where: {
        clinicianId,
        appointmentDate: {
          gte: weekStart,
          lte: weekEnd,
        },
        status: { notIn: ['Cancelled', 'No Show'] },
      },
    });

    if (weekAppointments >= schedule.maxAppointmentsPerWeek) {
      return {
        hasCapacity: false,
        reason: 'Weekly appointment limit reached',
      };
    }
  }

  // Check for time conflicts
  const endTime = calculateEndTime(startTime, duration);
  const conflicts = await prisma.appointment.findMany({
    where: {
      clinicianId,
      appointmentDate: appointmentDate,
      status: { notIn: ['Cancelled', 'No Show'] },
      OR: [
        {
          AND: [
            { startTime: { lte: startTime } },
            { endTime: { gt: startTime } },
          ],
        },
        {
          AND: [{ startTime: { lt: endTime } }, { endTime: { gte: endTime } }],
        },
        {
          AND: [
            { startTime: { gte: startTime } },
            { endTime: { lte: endTime } },
          ],
        },
      ],
    },
  });

  if (conflicts.length > 0) {
    return { hasCapacity: false, reason: 'Time slot conflict' };
  }

  return { hasCapacity: true };
}

/**
 * Helper function to calculate end time
 */
function calculateEndTime(startTime: string, duration: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + duration;
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMins
    .toString()
    .padStart(2, '0')}`;
}
