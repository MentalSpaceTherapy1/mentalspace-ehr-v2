import { PrismaClient } from '@mentalspace/database';

const prisma = new PrismaClient();

interface RecurrencePattern {
  frequency: 'twice_weekly' | 'weekly' | 'bi_weekly' | 'monthly' | 'custom';
  daysOfWeek?: string[]; // ['Monday', 'Wednesday'] for custom
  endDate?: string;
  count?: number; // Number of occurrences
}

interface AppointmentData {
  clientId: string;
  clinicianId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  appointmentType: string;
  serviceLocation: string;
  serviceCodeId: string;
  timezone: string;
  notes?: string;
  createdBy: string;
}

/**
 * Generate recurring appointments based on pattern
 */
export async function generateRecurringAppointments(
  baseData: AppointmentData,
  pattern: RecurrencePattern
): Promise<any[]> {
  const appointments: any[] = [];
  const startDate = new Date(baseData.appointmentDate);

  // Determine end date
  let endDate: Date;
  if (pattern.endDate) {
    endDate = new Date(pattern.endDate);
  } else if (pattern.count) {
    // Calculate end date based on count
    endDate = calculateEndDateFromCount(startDate, pattern.frequency, pattern.count, pattern.daysOfWeek);
  } else {
    // Default: 6 months ahead
    endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 6);
  }

  // Generate appointment dates based on frequency
  const dates = generateDates(startDate, endDate, pattern);

  // Create a parent recurrence ID for the series
  const parentRecurrenceId = `REC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Create appointments for each date
  for (const date of dates) {
    const appointmentDateISO = date.toISOString();

    appointments.push({
      ...baseData,
      appointmentDate: appointmentDateISO,
      status: 'SCHEDULED',
      isRecurring: true,
      recurrencePattern: JSON.stringify(pattern),
      parentRecurrenceId,
    });
  }

  return appointments;
}

/**
 * Generate dates based on recurrence pattern
 */
function generateDates(
  startDate: Date,
  endDate: Date,
  pattern: RecurrencePattern
): Date[] {
  const dates: Date[] = [];
  let currentDate = new Date(startDate);

  switch (pattern.frequency) {
    case 'twice_weekly':
      // Default: Monday and Thursday
      const twiceWeeklyDays = pattern.daysOfWeek || ['Monday', 'Thursday'];
      while (currentDate <= endDate) {
        const dayName = getDayName(currentDate);
        if (twiceWeeklyDays.includes(dayName)) {
          dates.push(new Date(currentDate));
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      break;

    case 'weekly':
      // Same day every week
      const weeklyDay = getDayName(startDate);
      while (currentDate <= endDate) {
        if (getDayName(currentDate) === weeklyDay) {
          dates.push(new Date(currentDate));
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      break;

    case 'bi_weekly':
      // Every 2 weeks on the same day
      dates.push(new Date(currentDate));
      while (currentDate <= endDate) {
        currentDate.setDate(currentDate.getDate() + 14);
        if (currentDate <= endDate) {
          dates.push(new Date(currentDate));
        }
      }
      break;

    case 'monthly':
      // Same day of month each month
      const dayOfMonth = startDate.getDate();
      dates.push(new Date(currentDate));
      while (currentDate <= endDate) {
        currentDate.setMonth(currentDate.getMonth() + 1);
        currentDate.setDate(Math.min(dayOfMonth, getDaysInMonth(currentDate)));
        if (currentDate <= endDate) {
          dates.push(new Date(currentDate));
        }
      }
      break;

    case 'custom':
      // Custom days of week
      const customDays = pattern.daysOfWeek || [];
      while (currentDate <= endDate) {
        const dayName = getDayName(currentDate);
        if (customDays.includes(dayName)) {
          dates.push(new Date(currentDate));
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      break;
  }

  return dates;
}

/**
 * Calculate end date from occurrence count
 */
function calculateEndDateFromCount(
  startDate: Date,
  frequency: string,
  count: number,
  daysOfWeek?: string[]
): Date {
  let estimatedDate = new Date(startDate);

  switch (frequency) {
    case 'twice_weekly':
      // Approximately 2 appointments per week
      estimatedDate.setDate(estimatedDate.getDate() + (count * 3.5));
      break;
    case 'weekly':
      estimatedDate.setDate(estimatedDate.getDate() + (count * 7));
      break;
    case 'bi_weekly':
      estimatedDate.setDate(estimatedDate.getDate() + (count * 14));
      break;
    case 'monthly':
      estimatedDate.setMonth(estimatedDate.getMonth() + count);
      break;
    case 'custom':
      // Estimate based on number of days per week
      const daysPerWeek = daysOfWeek?.length || 1;
      const weeksNeeded = Math.ceil(count / daysPerWeek);
      estimatedDate.setDate(estimatedDate.getDate() + (weeksNeeded * 7));
      break;
  }

  return estimatedDate;
}

/**
 * Get day name from date
 */
function getDayName(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

/**
 * Get days in month
 */
function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/**
 * Update single occurrence in a series
 */
export async function updateSingleOccurrence(
  appointmentId: string,
  updateData: any
): Promise<any> {
  return await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      ...updateData,
      isRecurring: true, // Maintain recurring flag
      // Note: This is now a modified occurrence
    },
  });
}

/**
 * Update entire series
 */
export async function updateEntireSeries(
  parentRecurrenceId: string,
  updateData: any
): Promise<any> {
  // Get all appointments in the series
  const appointments = await prisma.appointment.findMany({
    where: { parentRecurrenceId },
  });

  // Update all future appointments
  const now = new Date();
  const futureAppointments = appointments.filter(
    (apt) => new Date(apt.appointmentDate) >= now
  );

  // Update in bulk
  const updatePromises = futureAppointments.map((apt) =>
    prisma.appointment.update({
      where: { id: apt.id },
      data: updateData,
    })
  );

  return await Promise.all(updatePromises);
}

/**
 * Cancel single occurrence
 */
export async function cancelSingleOccurrence(
  appointmentId: string,
  cancellationReason: string,
  cancelledBy: string
): Promise<any> {
  return await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: 'CANCELLED',
      cancellationReason,
      cancelledAt: new Date(),
      cancelledBy,
    },
  });
}

/**
 * Cancel entire series
 */
export async function cancelEntireSeries(
  parentRecurrenceId: string,
  cancellationReason: string,
  cancelledBy: string
): Promise<any> {
  // Get all appointments in the series
  const appointments = await prisma.appointment.findMany({
    where: { parentRecurrenceId },
  });

  // Cancel all future appointments
  const now = new Date();
  const futureAppointments = appointments.filter(
    (apt) => new Date(apt.appointmentDate) >= now && apt.status !== 'COMPLETED'
  );

  // Cancel in bulk
  const cancelPromises = futureAppointments.map((apt) =>
    prisma.appointment.update({
      where: { id: apt.id },
      data: {
        status: 'CANCELLED',
        cancellationReason,
        cancelledAt: new Date(),
        cancelledBy,
      },
    })
  );

  return await Promise.all(cancelPromises);
}

/**
 * Check for conflicts in a series
 */
export async function checkSeriesConflicts(
  clinicianId: string,
  dates: Date[],
  startTime: string,
  endTime: string
): Promise<{ hasConflicts: boolean; conflicts: any[] }> {
  const conflicts: any[] = [];

  for (const date of dates) {
    const dateStr = date.toISOString().split('T')[0];

    // Check for existing appointments
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        clinicianId,
        appointmentDate: {
          gte: new Date(`${dateStr}T00:00:00`),
          lte: new Date(`${dateStr}T23:59:59`),
        },
        status: {
          notIn: ['CANCELLED', 'NO_SHOW'],
        },
      },
    });

    // Check time overlap
    for (const existing of existingAppointments) {
      if (hasTimeOverlap(existing.startTime, existing.endTime, startTime, endTime)) {
        conflicts.push({
          date: dateStr,
          existingAppointment: existing,
        });
      }
    }
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
  };
}

/**
 * Check if time ranges overlap
 */
function hasTimeOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const [s1Hour, s1Min] = start1.split(':').map(Number);
  const [e1Hour, e1Min] = end1.split(':').map(Number);
  const [s2Hour, s2Min] = start2.split(':').map(Number);
  const [e2Hour, e2Min] = end2.split(':').map(Number);

  const start1Minutes = s1Hour * 60 + s1Min;
  const end1Minutes = e1Hour * 60 + e1Min;
  const start2Minutes = s2Hour * 60 + s2Min;
  const end2Minutes = e2Hour * 60 + e2Min;

  return (
    (start1Minutes < end2Minutes && end1Minutes > start2Minutes) ||
    (start2Minutes < end1Minutes && end2Minutes > start1Minutes)
  );
}

/**
 * Get all appointments in a series
 */
export async function getSeriesAppointments(
  parentRecurrenceId: string
): Promise<any[]> {
  return await prisma.appointment.findMany({
    where: { parentRecurrenceId },
    orderBy: { appointmentDate: 'asc' },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          primaryPhone: true,
        },
      },
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
}
