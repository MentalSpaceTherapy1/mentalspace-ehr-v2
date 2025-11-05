import prisma from './database';
import type { ProviderAvailability } from '@prisma/client';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

/**
 * Module 3 Phase 2.3: Provider Availability Service
 *
 * Manages provider schedules, availability checks, and slot management
 */

export interface CreateAvailabilityRequest {
  providerId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  officeLocationId?: string;
  isTelehealthAvailable?: boolean;
  maxAppointments?: number;
  effectiveDate?: Date;
  expiryDate?: Date;
}

export interface UpdateAvailabilityRequest {
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  officeLocationId?: string;
  isTelehealthAvailable?: boolean;
  maxAppointments?: number;
  effectiveDate?: Date;
  expiryDate?: Date;
  isActive?: boolean;
}

export interface AvailabilityFilters {
  providerId?: string;
  dayOfWeek?: number;
  isActive?: boolean;
  includeExpired?: boolean;
}

export interface SlotAvailability {
  date: Date;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  appointmentCount: number;
  maxAppointments?: number;
  reason?: string;
}

/**
 * Create a new provider availability schedule
 */
export async function createProviderAvailability(
  data: CreateAvailabilityRequest
): Promise<ProviderAvailability> {
  // Validate provider exists
  const provider = await prisma.user.findUnique({
    where: { id: data.providerId },
  });

  if (!provider) {
    throw new Error('Provider not found');
  }

  // Validate day of week
  if (data.dayOfWeek < 0 || data.dayOfWeek > 6) {
    throw new Error('Day of week must be between 0 (Sunday) and 6 (Saturday)');
  }

  // Validate time format
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(data.startTime) || !timeRegex.test(data.endTime)) {
    throw new Error('Time must be in HH:mm format');
  }

  // Validate end time is after start time
  const [startHour, startMin] = data.startTime.split(':').map(Number);
  const [endHour, endMin] = data.endTime.split(':').map(Number);
  if (endHour * 60 + endMin <= startHour * 60 + startMin) {
    throw new Error('End time must be after start time');
  }

  // Check for overlapping schedules
  const existingSchedules = await prisma.providerAvailability.findMany({
    where: {
      providerId: data.providerId,
      dayOfWeek: data.dayOfWeek,
      isActive: true,
    },
  });

  for (const schedule of existingSchedules) {
    // Check if there's a date overlap
    const hasDateOverlap =
      (!data.effectiveDate && !schedule.expiryDate) ||
      (!data.effectiveDate && schedule.expiryDate && new Date(schedule.expiryDate) >= new Date()) ||
      (data.effectiveDate && !schedule.expiryDate) ||
      (data.effectiveDate && schedule.expiryDate &&
        new Date(data.effectiveDate) <= new Date(schedule.expiryDate)) ||
      (!data.expiryDate && schedule.effectiveDate &&
        new Date(schedule.effectiveDate) <= new Date()) ||
      (data.expiryDate && schedule.effectiveDate &&
        new Date(data.expiryDate) >= new Date(schedule.effectiveDate));

    if (hasDateOverlap) {
      // Check if there's a time overlap
      const [existingStartHour, existingStartMin] = schedule.startTime.split(':').map(Number);
      const [existingEndHour, existingEndMin] = schedule.endTime.split(':').map(Number);

      const existingStart = existingStartHour * 60 + existingStartMin;
      const existingEnd = existingEndHour * 60 + existingEndMin;
      const newStart = startHour * 60 + startMin;
      const newEnd = endHour * 60 + endMin;

      if (
        (newStart >= existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      ) {
        throw new Error(
          `Schedule overlaps with existing availability on ${getDayName(data.dayOfWeek)} ` +
          `from ${schedule.startTime} to ${schedule.endTime}`
        );
      }
    }
  }

  return await prisma.providerAvailability.create({
    data: {
      providerId: data.providerId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      officeLocationId: data.officeLocationId,
      isTelehealthAvailable: data.isTelehealthAvailable ?? false,
      maxAppointments: data.maxAppointments,
      effectiveDate: data.effectiveDate,
      expiryDate: data.expiryDate,
    },
    include: {
      provider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          title: true,
        },
      },
    },
  });
}

/**
 * Update provider availability
 */
export async function updateProviderAvailability(
  id: string,
  data: UpdateAvailabilityRequest
): Promise<ProviderAvailability> {
  // Validate time format if provided
  if (data.startTime || data.endTime) {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (data.startTime && !timeRegex.test(data.startTime)) {
      throw new Error('Start time must be in HH:mm format');
    }
    if (data.endTime && !timeRegex.test(data.endTime)) {
      throw new Error('End time must be in HH:mm format');
    }
  }

  return await prisma.providerAvailability.update({
    where: { id },
    data,
    include: {
      provider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          title: true,
        },
      },
    },
  });
}

/**
 * Delete provider availability
 */
export async function deleteProviderAvailability(id: string): Promise<ProviderAvailability> {
  return await prisma.providerAvailability.delete({
    where: { id },
  });
}

/**
 * Get provider availability by ID
 */
export async function getProviderAvailabilityById(
  id: string
): Promise<ProviderAvailability | null> {
  return await prisma.providerAvailability.findUnique({
    where: { id },
    include: {
      provider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          title: true,
        },
      },
    },
  });
}

/**
 * Get all provider availabilities with optional filters
 */
export async function getAllProviderAvailabilities(
  filters?: AvailabilityFilters
): Promise<ProviderAvailability[]> {
  const where: any = {};

  if (filters?.providerId) {
    where.providerId = filters.providerId;
  }

  if (filters?.dayOfWeek !== undefined) {
    where.dayOfWeek = filters.dayOfWeek;
  }

  if (filters?.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  if (!filters?.includeExpired) {
    where.OR = [
      { expiryDate: null },
      { expiryDate: { gte: new Date() } },
    ];
  }

  return await prisma.providerAvailability.findMany({
    where,
    include: {
      provider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          title: true,
        },
      },
    },
    orderBy: [
      { providerId: 'asc' },
      { dayOfWeek: 'asc' },
      { startTime: 'asc' },
    ],
  });
}

/**
 * Get provider's weekly schedule
 */
export async function getProviderWeeklySchedule(
  providerId: string
): Promise<ProviderAvailability[]> {
  return await prisma.providerAvailability.findMany({
    where: {
      providerId,
      isActive: true,
      OR: [
        { expiryDate: null },
        { expiryDate: { gte: new Date() } },
      ],
    },
    orderBy: [
      { dayOfWeek: 'asc' },
      { startTime: 'asc' },
    ],
    include: {
      provider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          title: true,
        },
      },
    },
  });
}

/**
 * Check if provider is available on a specific date and time
 */
export async function checkProviderAvailability(
  providerId: string,
  date: Date,
  startTime: string,
  endTime: string
): Promise<SlotAvailability> {
  const dayOfWeek = date.getDay();

  // Get provider's schedule for this day
  const schedules = await prisma.providerAvailability.findMany({
    where: {
      providerId,
      dayOfWeek,
      isActive: true,
      OR: [
        { effectiveDate: null, expiryDate: null },
        { effectiveDate: { lte: date }, expiryDate: null },
        { effectiveDate: null, expiryDate: { gte: date } },
        { effectiveDate: { lte: date }, expiryDate: { gte: date } },
      ],
    },
  });

  // Check if requested time falls within any schedule
  let matchingSchedule: ProviderAvailability | null = null;
  for (const schedule of schedules) {
    const scheduleStart = timeToMinutes(schedule.startTime);
    const scheduleEnd = timeToMinutes(schedule.endTime);
    const requestStart = timeToMinutes(startTime);
    const requestEnd = timeToMinutes(endTime);

    if (requestStart >= scheduleStart && requestEnd <= scheduleEnd) {
      matchingSchedule = schedule;
      break;
    }
  }

  if (!matchingSchedule) {
    return {
      date,
      dayOfWeek,
      startTime,
      endTime,
      isAvailable: false,
      appointmentCount: 0,
      reason: 'Provider not scheduled for this time',
    };
  }

  // Check for time-off requests
  const timeOffRequests = await prisma.timeOffRequest.findMany({
    where: {
      providerId,
      status: 'APPROVED',
      startDate: { lte: endOfDay(date) },
      endDate: { gte: startOfDay(date) },
    },
  });

  if (timeOffRequests.length > 0) {
    return {
      date,
      dayOfWeek,
      startTime,
      endTime,
      isAvailable: false,
      appointmentCount: 0,
      maxAppointments: matchingSchedule.maxAppointments || undefined,
      reason: 'Provider has approved time off',
    };
  }

  // Check appointment count if maxAppointments is set
  if (matchingSchedule.maxAppointments) {
    const appointmentCount = await prisma.appointment.count({
      where: {
        clinicianId: providerId,
        appointmentDate: {
          gte: startOfDay(date),
          lte: endOfDay(date),
        },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
    });

    if (appointmentCount >= matchingSchedule.maxAppointments) {
      return {
        date,
        dayOfWeek,
        startTime,
        endTime,
        isAvailable: false,
        appointmentCount,
        maxAppointments: matchingSchedule.maxAppointments,
        reason: 'Daily appointment limit reached',
      };
    }

    return {
      date,
      dayOfWeek,
      startTime,
      endTime,
      isAvailable: true,
      appointmentCount,
      maxAppointments: matchingSchedule.maxAppointments,
    };
  }

  // No limit, just check for conflicts
  const conflictingAppointments = await prisma.appointment.findMany({
    where: {
      clinicianId: providerId,
      appointmentDate: date,
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
    },
  });

  for (const appt of conflictingAppointments) {
    const apptStart = timeToMinutes(appt.startTime);
    const apptEnd = timeToMinutes(appt.endTime);
    const requestStart = timeToMinutes(startTime);
    const requestEnd = timeToMinutes(endTime);

    if (
      (requestStart >= apptStart && requestStart < apptEnd) ||
      (requestEnd > apptStart && requestEnd <= apptEnd) ||
      (requestStart <= apptStart && requestEnd >= apptEnd)
    ) {
      return {
        date,
        dayOfWeek,
        startTime,
        endTime,
        isAvailable: false,
        appointmentCount: conflictingAppointments.length,
        reason: `Time slot conflicts with existing appointment at ${appt.startTime}`,
      };
    }
  }

  return {
    date,
    dayOfWeek,
    startTime,
    endTime,
    isAvailable: true,
    appointmentCount: conflictingAppointments.length,
  };
}

/**
 * Find available providers for a specific date and time
 */
export async function findAvailableProviders(
  date: Date,
  startTime: string,
  endTime: string,
  options?: {
    specialty?: string;
    telehealthRequired?: boolean;
    officeLocationId?: string;
  }
): Promise<Array<{
  provider: any;
  availability: SlotAvailability;
}>> {
  const dayOfWeek = date.getDay();

  // Get all providers with availability on this day
  const whereClause: any = {
    dayOfWeek,
    isActive: true,
    OR: [
      { effectiveDate: null, expiryDate: null },
      { effectiveDate: { lte: date }, expiryDate: null },
      { effectiveDate: null, expiryDate: { gte: date } },
      { effectiveDate: { lte: date }, expiryDate: { gte: date } },
    ],
  };

  if (options?.telehealthRequired) {
    whereClause.isTelehealthAvailable = true;
  }

  if (options?.officeLocationId) {
    whereClause.officeLocationId = options.officeLocationId;
  }

  const schedules = await prisma.providerAvailability.findMany({
    where: whereClause,
    include: {
      provider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          title: true,
          specialties: true,
        },
      },
    },
  });

  // Filter by specialty if provided
  let filteredSchedules = schedules;
  if (options?.specialty) {
    filteredSchedules = schedules.filter(schedule =>
      schedule.provider.specialties.includes(options.specialty!)
    );
  }

  // Check availability for each provider
  const results = [];
  for (const schedule of filteredSchedules) {
    const availability = await checkProviderAvailability(
      schedule.providerId,
      date,
      startTime,
      endTime
    );

    if (availability.isAvailable) {
      results.push({
        provider: schedule.provider,
        availability,
      });
    }
  }

  return results;
}

/**
 * Validate schedule conflicts
 */
export async function validateScheduleConflicts(
  providerId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  excludeId?: string
): Promise<{ hasConflict: boolean; conflicts: ProviderAvailability[] }> {
  const schedules = await prisma.providerAvailability.findMany({
    where: {
      providerId,
      dayOfWeek,
      isActive: true,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  const newStart = startHour * 60 + startMin;
  const newEnd = endHour * 60 + endMin;

  const conflicts = schedules.filter(schedule => {
    const [existingStartHour, existingStartMin] = schedule.startTime.split(':').map(Number);
    const [existingEndHour, existingEndMin] = schedule.endTime.split(':').map(Number);

    const existingStart = existingStartHour * 60 + existingStartMin;
    const existingEnd = existingEndHour * 60 + existingEndMin;

    return (
      (newStart >= existingStart && newStart < existingEnd) ||
      (newEnd > existingStart && newEnd <= existingEnd) ||
      (newStart <= existingStart && newEnd >= existingEnd)
    );
  });

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}

// Helper functions

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek] || 'Unknown';
}
