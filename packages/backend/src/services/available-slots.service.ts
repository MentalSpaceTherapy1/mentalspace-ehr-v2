import prisma from './database';
import logger from '../utils/logger';
import { getEffectiveRules, validateSlot } from './scheduling-rules.service';
import { addDays, addMinutes, format, parseISO, startOfDay, endOfDay, isWithinInterval, isBefore, isAfter } from 'date-fns';
import { UserRole } from '@prisma/client';
import { AppointmentStatus as AppointmentStatusConst, StatusGroups } from '@mentalspace/shared';

/**
 * Module 7: Available Slots Service
 *
 * Core scheduling logic for calculating available appointment slots
 * based on clinician availability, existing appointments, and scheduling rules.
 */

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  duration: number;
  available: boolean;
  reason?: string;
}

export interface AvailableSlotResult {
  date: string;
  slots: TimeSlot[];
}

export interface DaySchedule {
  isAvailable: boolean;
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  breakStart?: string;
  breakEnd?: string;
}

export interface WeeklySchedule {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
}

/**
 * Get available appointment slots for a clinician within a date range
 */
export async function getAvailableSlots(
  clinicianId: string,
  startDate: Date,
  endDate: Date
): Promise<AvailableSlotResult[]> {
  try {
    logger.info('Calculating available slots', {
      clinicianId,
      startDate,
      endDate,
    });

    // Get scheduling rules
    const rules = await getEffectiveRules(clinicianId);

    // Get clinician's schedule
    const clinicianSchedule = await getClinicianSchedule(clinicianId);

    if (!clinicianSchedule) {
      logger.warn('No schedule found for clinician', { clinicianId });
      return [];
    }

    // Get existing appointments for the date range
    const existingAppointments = await getExistingAppointments(
      clinicianId,
      startDate,
      endDate
    );

    // Get schedule exceptions (time off, holidays, etc.)
    const exceptions = await getScheduleExceptions(clinicianId, startDate, endDate);

    const results: AvailableSlotResult[] = [];
    let currentDate = startOfDay(startDate);
    const end = endOfDay(endDate);

    // Iterate through each day in the range
    while (currentDate <= end) {
      const daySlots = await calculateDaySots(
        currentDate,
        clinicianId,
        clinicianSchedule,
        existingAppointments,
        exceptions,
        rules
      );

      if (daySlots.length > 0) {
        results.push({
          date: format(currentDate, 'yyyy-MM-dd'),
          slots: daySlots,
        });
      }

      currentDate = addDays(currentDate, 1);
    }

    logger.info('Available slots calculated', {
      clinicianId,
      daysWithSlots: results.length,
      totalSlots: results.reduce((sum, day) => sum + day.slots.filter(s => s.available).length, 0),
    });

    return results;
  } catch (error: any) {
    logger.error('Failed to get available slots', {
      error: error.message,
      clinicianId,
      startDate,
      endDate,
    });
    throw new Error('Failed to calculate available slots');
  }
}

/**
 * Calculate available slots for a specific day
 */
async function calculateDaySots(
  date: Date,
  clinicianId: string,
  clinicianSchedule: any,
  existingAppointments: any[],
  exceptions: any[],
  rules: any
): Promise<TimeSlot[]> {
  const slots: TimeSlot[] = [];
  const dayOfWeek = format(date, 'EEEE').toLowerCase();

  // Check if day is in schedule
  const weeklySchedule = clinicianSchedule.weeklyScheduleJson as WeeklySchedule;
  const daySchedule = weeklySchedule[dayOfWeek as keyof WeeklySchedule];

  if (!daySchedule || !daySchedule.isAvailable) {
    return slots;
  }

  // Check for exceptions on this day
  const dateStr = format(date, 'yyyy-MM-dd');
  const hasException = exceptions.some((ex: any) => {
    const exStart = format(new Date(ex.startDate), 'yyyy-MM-dd');
    const exEnd = format(new Date(ex.endDate), 'yyyy-MM-dd');
    return dateStr >= exStart && dateStr <= exEnd;
  });

  if (hasException) {
    return slots;
  }

  // Validate day based on scheduling rules
  const validation = await validateSlot(clinicianId, date, rules.slotDuration);
  if (!validation.valid) {
    return slots;
  }

  // Parse working hours for the day
  if (!daySchedule.startTime || !daySchedule.endTime) {
    return slots;
  }

  const [startHour, startMinute] = daySchedule.startTime.split(':').map(Number);
  const [endHour, endMinute] = daySchedule.endTime.split(':').map(Number);

  let currentSlotStart = new Date(date);
  currentSlotStart.setHours(startHour, startMinute, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(endHour, endMinute, 0, 0);

  // Generate slots for the day
  while (currentSlotStart < dayEnd) {
    const slotEnd = addMinutes(currentSlotStart, rules.slotDuration);

    // Check if slot end time exceeds day end
    if (slotEnd > dayEnd) {
      break;
    }

    // Check if slot conflicts with break time
    let isInBreak = false;
    if (daySchedule.breakStart && daySchedule.breakEnd) {
      const [breakStartHour, breakStartMinute] = daySchedule.breakStart.split(':').map(Number);
      const [breakEndHour, breakEndMinute] = daySchedule.breakEnd.split(':').map(Number);

      const breakStart = new Date(date);
      breakStart.setHours(breakStartHour, breakStartMinute, 0, 0);

      const breakEnd = new Date(date);
      breakEnd.setHours(breakEndHour, breakEndMinute, 0, 0);

      isInBreak = isWithinInterval(currentSlotStart, { start: breakStart, end: breakEnd }) ||
                  isWithinInterval(slotEnd, { start: breakStart, end: breakEnd });
    }

    if (isInBreak) {
      currentSlotStart = addMinutes(currentSlotStart, rules.slotDuration + rules.bufferTime);
      continue;
    }

    // Check if slot conflicts with existing appointment
    const hasConflict = existingAppointments.some((apt: any) => {
      const aptStart = new Date(apt.appointmentDate);
      const aptEnd = addMinutes(aptStart, apt.duration);

      // Add buffer time to check
      const slotStartWithBuffer = addMinutes(currentSlotStart, -rules.bufferTime);
      const slotEndWithBuffer = addMinutes(slotEnd, rules.bufferTime);

      return (
        isWithinInterval(aptStart, { start: slotStartWithBuffer, end: slotEndWithBuffer }) ||
        isWithinInterval(aptEnd, { start: slotStartWithBuffer, end: slotEndWithBuffer }) ||
        (aptStart <= slotStartWithBuffer && aptEnd >= slotEndWithBuffer)
      );
    });

    // Validate slot against scheduling rules
    const slotValidation = await validateSlot(clinicianId, currentSlotStart, rules.slotDuration);

    slots.push({
      startTime: new Date(currentSlotStart),
      endTime: new Date(slotEnd),
      duration: rules.slotDuration,
      available: !hasConflict && slotValidation.valid,
      reason: hasConflict ? 'Already booked' : slotValidation.reason,
    });

    // Move to next slot (slot duration + buffer time)
    currentSlotStart = addMinutes(currentSlotStart, rules.slotDuration + rules.bufferTime);
  }

  // Check daily appointment limit
  if (rules.maxDailyAppointments) {
    const appointmentsOnDay = existingAppointments.filter((apt: any) => {
      const aptDate = format(new Date(apt.appointmentDate), 'yyyy-MM-dd');
      return aptDate === dateStr;
    }).length;

    const availableSlots = slots.filter(s => s.available).length;

    if (appointmentsOnDay >= rules.maxDailyAppointments) {
      // Mark all slots as unavailable
      slots.forEach(slot => {
        if (slot.available) {
          slot.available = false;
          slot.reason = 'Daily appointment limit reached';
        }
      });
    } else if (appointmentsOnDay + availableSlots > rules.maxDailyAppointments) {
      // Mark excess slots as unavailable
      const allowedSlots = rules.maxDailyAppointments - appointmentsOnDay;
      let markedCount = 0;
      slots.forEach(slot => {
        if (slot.available) {
          if (markedCount >= allowedSlots) {
            slot.available = false;
            slot.reason = 'Daily appointment limit would be exceeded';
          }
          markedCount++;
        }
      });
    }
  }

  return slots;
}

/**
 * Default weekly schedule for clinicians without explicit configuration
 */
const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  monday: { isAvailable: true, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
  tuesday: { isAvailable: true, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
  wednesday: { isAvailable: true, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
  thursday: { isAvailable: true, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
  friday: { isAvailable: true, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
  saturday: { isAvailable: false },
  sunday: { isAvailable: false },
};

/**
 * Get clinician's weekly schedule
 * Returns default schedule if none exists in database
 */
async function getClinicianSchedule(clinicianId: string) {
  try {
    const schedule = await prisma.clinicianSchedule.findFirst({
      where: {
        clinicianId,
        effectiveStartDate: {
          lte: new Date(),
        },
        OR: [
          { effectiveEndDate: null },
          { effectiveEndDate: { gte: new Date() } },
        ],
      },
      orderBy: {
        effectiveStartDate: 'desc',
      },
    });

    // Return existing schedule or default
    if (schedule) {
      return schedule;
    }

    // Return a default schedule for clinicians without explicit configuration
    logger.info('No schedule found for clinician, using default', { clinicianId });
    return {
      id: 'default',
      clinicianId,
      weeklyScheduleJson: DEFAULT_WEEKLY_SCHEDULE,
      acceptNewClients: true,
      maxAppointmentsPerDay: 8,
      maxAppointmentsPerWeek: 40,
      bufferTimeBetweenAppointments: 15,
      availableLocations: ['IN_PERSON', 'TELEHEALTH'],
      effectiveStartDate: new Date(),
      effectiveEndDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: clinicianId,
      lastModifiedBy: clinicianId,
    };
  } catch (error: any) {
    logger.error('Failed to get clinician schedule', {
      error: error.message,
      clinicianId,
    });
    throw error;
  }
}

/**
 * Get existing appointments for a clinician in a date range
 */
async function getExistingAppointments(
  clinicianId: string,
  startDate: Date,
  endDate: Date
) {
  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        clinicianId,
        appointmentDate: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: [AppointmentStatusConst.SCHEDULED, AppointmentStatusConst.CONFIRMED, AppointmentStatusConst.CHECKED_IN],
        },
      },
      select: {
        id: true,
        appointmentDate: true,
        duration: true,
        status: true,
      },
    });

    return appointments;
  } catch (error: any) {
    logger.error('Failed to get existing appointments', {
      error: error.message,
      clinicianId,
    });
    throw error;
  }
}

/**
 * Get schedule exceptions (time off, holidays) for a clinician
 */
async function getScheduleExceptions(
  clinicianId: string,
  startDate: Date,
  endDate: Date
) {
  try {
    const exceptions = await prisma.scheduleException.findMany({
      where: {
        clinicianId,
        OR: [
          {
            startDate: {
              lte: endDate,
            },
            endDate: {
              gte: startDate,
            },
          },
        ],
      },
    });

    return exceptions;
  } catch (error: any) {
    logger.error('Failed to get schedule exceptions', {
      error: error.message,
      clinicianId,
    });
    throw error;
  }
}

/**
 * Check if a specific time slot can be booked
 */
export async function canBookSlot(
  clinicianId: string,
  slotTime: Date,
  clientId: string,
  duration: number = 60
): Promise<{ canBook: boolean; reason?: string }> {
  try {
    // Get scheduling rules
    const rules = await getEffectiveRules(clinicianId);

    // Validate slot against rules
    const validation = await validateSlot(clinicianId, slotTime, duration);
    if (!validation.valid) {
      return {
        canBook: false,
        reason: validation.reason,
      };
    }

    // Check for conflicts with existing appointments
    const slotEnd = addMinutes(slotTime, duration);
    const slotStartWithBuffer = addMinutes(slotTime, -rules.bufferTime);
    const slotEndWithBuffer = addMinutes(slotEnd, rules.bufferTime);

    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        clinicianId,
        appointmentDate: {
          gte: slotStartWithBuffer,
          lt: slotEndWithBuffer,
        },
        status: {
          in: [AppointmentStatusConst.SCHEDULED, AppointmentStatusConst.CONFIRMED, AppointmentStatusConst.CHECKED_IN],
        },
      },
    });

    if (conflictingAppointment) {
      return {
        canBook: false,
        reason: 'Time slot is already booked',
      };
    }

    // Check daily appointment limit
    if (rules.maxDailyAppointments) {
      const dayStart = startOfDay(slotTime);
      const dayEnd = endOfDay(slotTime);

      const appointmentsOnDay = await prisma.appointment.count({
        where: {
          clinicianId,
          appointmentDate: {
            gte: dayStart,
            lte: dayEnd,
          },
          status: {
            in: [AppointmentStatusConst.SCHEDULED, AppointmentStatusConst.CONFIRMED, AppointmentStatusConst.CHECKED_IN],
          },
        },
      });

      if (appointmentsOnDay >= rules.maxDailyAppointments) {
        return {
          canBook: false,
          reason: 'Daily appointment limit reached',
        };
      }
    }

    return { canBook: true };
  } catch (error: any) {
    logger.error('Failed to check if slot can be booked', {
      error: error.message,
      clinicianId,
      slotTime,
      clientId,
    });
    throw new Error('Failed to validate booking slot');
  }
}

/**
 * Check if an appointment can be cancelled based on cancellation window
 */
export async function canCancelAppointment(
  appointmentId: string,
  clinicianId: string
): Promise<{ canCancel: boolean; reason?: string }> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return {
        canCancel: false,
        reason: 'Appointment not found',
      };
    }

    const rules = await getEffectiveRules(clinicianId);
    const now = new Date();
    const appointmentTime = new Date(appointment.appointmentDate);

    const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilAppointment < rules.cancellationWindowHours) {
      return {
        canCancel: false,
        reason: `Appointments cannot be cancelled within ${rules.cancellationWindowHours} hours of the scheduled time`,
      };
    }

    return { canCancel: true };
  } catch (error: any) {
    logger.error('Failed to check if appointment can be cancelled', {
      error: error.message,
      appointmentId,
    });
    throw error;
  }
}

/**
 * Get clinicians who have availability for self-scheduling
 * If no schedules exist, returns all active clinicians (fallback for initial setup)
 */
export async function getAvailableClinicians(): Promise<any[]> {
  try {
    // Get clinicians who have active schedules and accept new clients
    const clinicians = await prisma.clinicianSchedule.findMany({
      where: {
        acceptNewClients: true,
        effectiveStartDate: {
          lte: new Date(),
        },
        OR: [
          { effectiveEndDate: null },
          { effectiveEndDate: { gte: new Date() } },
        ],
      },
      distinct: ['clinicianId'],
    });

    // If schedules exist, get users for those clinicians
    if (clinicians.length > 0) {
      const clinicianIds = clinicians.map(c => c.clinicianId);
      const users = await prisma.user.findMany({
        where: {
          id: {
            in: clinicianIds,
          },
          roles: {
            hasSome: [UserRole.CLINICIAN],
          },
          isActive: true,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
          email: true,
          credentials: true,
        },
      });

      return users;
    }

    // FALLBACK: If no schedules exist, return all active clinicians
    // This handles the case where scheduling hasn't been set up yet
    logger.info('No clinician schedules found, returning all active clinicians as fallback');
    const allClinicians = await prisma.user.findMany({
      where: {
        roles: {
          hasSome: [UserRole.CLINICIAN],
        },
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        title: true,
        email: true,
        credentials: true,
      },
    });

    return allClinicians;
  } catch (error: any) {
    logger.error('Failed to get available clinicians', {
      error: error.message,
    });
    throw new Error('Failed to retrieve available clinicians');
  }
}

/**
 * Phase 3.2: Get appointment types available for online booking
 */
export async function getBookableAppointmentTypes() {
  return prisma.appointmentType.findMany({
    where: {
      isActive: true,
      allowOnlineBooking: true,
    },
    select: {
      id: true,
      typeName: true,
      category: true,
      description: true,
      defaultDuration: true,
      colorCode: true,
      iconName: true,
    },
    orderBy: {
      typeName: 'asc',
    },
  });
}
