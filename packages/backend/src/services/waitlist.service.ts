import { PrismaClient } from '@prisma/client';
import { auditLogger } from '../utils/logger';

const prisma = new PrismaClient();

interface WaitlistEntryData {
  clientId: string;
  requestedClinicianId: string;
  alternateClinicianIds?: string[];
  requestedAppointmentType: string;
  preferredDays: string[];
  preferredTimes: string;
  priority?: string;
  notes?: string;
  addedBy: string;
}

interface AvailabilitySlot {
  clinicianId: string;
  clinicianName: string;
  date: Date;
  startTime: string;
  endTime: string;
  appointmentType: string;
}

/**
 * Add a client to the waitlist
 */
export async function addToWaitlist(data: WaitlistEntryData) {
  try {
    const entry = await prisma.waitlistEntry.create({
      data: {
        clientId: data.clientId,
        requestedClinicianId: data.requestedClinicianId,
        alternateClinicianIds: data.alternateClinicianIds || [],
        requestedAppointmentType: data.requestedAppointmentType,
        preferredDays: data.preferredDays,
        preferredTimes: data.preferredTimes,
        priority: data.priority || 'Normal',
        notes: data.notes,
        addedBy: data.addedBy,
        status: 'Active',
      },
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
      },
    });

    auditLogger.info('Client added to waitlist', {
      userId: data.addedBy,
      waitlistEntryId: entry.id,
      clientId: data.clientId,
      action: 'WAITLIST_ENTRY_CREATED',
    });

    return entry;
  } catch (error) {
    auditLogger.error('Failed to add client to waitlist', {
      error: error instanceof Error ? error.message : 'Unknown error',
      clientId: data.clientId,
    });
    throw error;
  }
}

/**
 * Get all waitlist entries with filters
 */
export async function getWaitlistEntries(filters: {
  status?: string;
  clinicianId?: string;
  priority?: string;
}) {
  const where: any = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.clinicianId) {
    where.OR = [
      { requestedClinicianId: filters.clinicianId },
      { alternateClinicianIds: { has: filters.clinicianId } },
    ];
  }

  if (filters.priority) {
    where.priority = filters.priority;
  }

  const entries = await prisma.waitlistEntry.findMany({
    where,
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
    },
    orderBy: [
      { priority: 'desc' }, // High priority first
      { addedDate: 'asc' }, // Oldest first
    ],
  });

  return entries;
}

/**
 * Find matching available slots for a waitlist entry
 */
export async function findAvailableSlots(
  waitlistEntryId: string,
  daysAhead: number = 14
): Promise<AvailabilitySlot[]> {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: waitlistEntryId },
  });

  if (!entry) {
    throw new Error('Waitlist entry not found');
  }

  // Get clinicians to check (requested + alternates)
  const clinicianIds = [
    entry.requestedClinicianId,
    ...entry.alternateClinicianIds,
  ];

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + daysAhead);

  // Find available slots for each clinician
  const availableSlots: AvailabilitySlot[] = [];

  for (const clinicianId of clinicianIds) {
    // Get clinician schedule
    const schedule = await prisma.clinicianSchedule.findFirst({
      where: {
        clinicianId,
        effectiveStartDate: { lte: endDate },
        OR: [
          { effectiveEndDate: null },
          { effectiveEndDate: { gte: startDate } },
        ],
      },
    });

    if (!schedule) continue;

    const clinician = await prisma.user.findUnique({
      where: { id: clinicianId },
      select: { firstName: true, lastName: true },
    });

    if (!clinician) continue;

    // Get existing appointments for this clinician
    const existingAppointments = await prisma.appointment.findMany({
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
      },
    });

    // Get schedule exceptions (time off, holidays, etc.)
    const exceptions = await prisma.scheduleException.findMany({
      where: {
        clinicianId,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
        status: 'Approved',
      },
    });

    // Parse weekly schedule
    const weeklySchedule = schedule.weeklyScheduleJson as any;

    // Generate available slots based on schedule
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayName = currentDate
        .toLocaleDateString('en-US', { weekday: 'long' })
        .toLowerCase();

      // Check if this day matches preferred days
      if (entry.preferredDays.length > 0) {
        const preferredDayNames = entry.preferredDays.map((d) =>
          d.toLowerCase()
        );
        if (!preferredDayNames.includes(dayName)) {
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }
      }

      // Check if clinician works on this day
      const daySchedule = weeklySchedule[dayName];
      if (!daySchedule || !daySchedule.isAvailable) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Check for schedule exceptions on this day
      const hasException = exceptions.some((ex) => {
        const exStart = new Date(ex.startDate);
        const exEnd = new Date(ex.endDate);
        return currentDate >= exStart && currentDate <= exEnd;
      });

      if (hasException) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Generate time slots for this day
      const startTime = daySchedule.startTime || '09:00';
      const endTime = daySchedule.endTime || '17:00';

      // Check for conflicts with existing appointments
      const hasConflict = existingAppointments.some((apt) => {
        const aptDate = new Date(apt.appointmentDate);
        return (
          aptDate.toDateString() === currentDate.toDateString() &&
          apt.startTime === startTime
        );
      });

      if (!hasConflict) {
        availableSlots.push({
          clinicianId,
          clinicianName: `${clinician.firstName} ${clinician.lastName}`,
          date: new Date(currentDate),
          startTime,
          endTime,
          appointmentType: entry.requestedAppointmentType,
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return availableSlots;
}

/**
 * Offer appointment slot to waitlist client
 */
export async function offerAppointment(
  waitlistEntryId: string,
  slotData: {
    clinicianId: string;
    appointmentDate: Date;
    startTime: string;
    endTime: string;
    notificationMethod: string;
  },
  offeredBy: string
) {
  const entry = await prisma.waitlistEntry.update({
    where: { id: waitlistEntryId },
    data: {
      notified: true,
      notifiedDate: new Date(),
      notificationMethod: slotData.notificationMethod,
      status: 'Offered',
    },
  });

  auditLogger.info('Appointment offered to waitlist client', {
    userId: offeredBy,
    waitlistEntryId,
    clientId: entry.clientId,
    clinicianId: slotData.clinicianId,
    appointmentDate: slotData.appointmentDate,
    action: 'WAITLIST_APPOINTMENT_OFFERED',
  });

  // Here you would trigger the actual notification (email/SMS)
  // This will be handled by the reminder service

  return entry;
}

/**
 * Book appointment from waitlist
 */
export async function bookFromWaitlist(
  waitlistEntryId: string,
  appointmentData: {
    clinicianId: string;
    appointmentDate: Date;
    startTime: string;
    endTime: string;
    duration: number;
    serviceLocation: string;
    serviceCodeId: string;
    timezone: string;
    notes?: string;
  },
  bookedBy: string
) {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: waitlistEntryId },
  });

  if (!entry) {
    throw new Error('Waitlist entry not found');
  }

  // Create appointment and update waitlist entry in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create the appointment
    const appointment = await tx.appointment.create({
      data: {
        clientId: entry.clientId,
        clinicianId: appointmentData.clinicianId,
        appointmentDate: appointmentData.appointmentDate,
        startTime: appointmentData.startTime,
        endTime: appointmentData.endTime,
        duration: appointmentData.duration,
        appointmentType: entry.requestedAppointmentType,
        serviceLocation: appointmentData.serviceLocation,
        serviceCodeId: appointmentData.serviceCodeId,
        timezone: appointmentData.timezone,
        notes: appointmentData.notes || entry.notes,
        status: 'Scheduled',
        createdBy: bookedBy,
        statusUpdatedBy: bookedBy,
        lastModifiedBy: bookedBy,
      },
    });

    // Update waitlist entry
    const updatedEntry = await tx.waitlistEntry.update({
      where: { id: waitlistEntryId },
      data: {
        status: 'Scheduled',
        scheduledAppointmentId: appointment.id,
        scheduledDate: new Date(),
      },
    });

    return { appointment, waitlistEntry: updatedEntry };
  });

  auditLogger.info('Appointment booked from waitlist', {
    userId: bookedBy,
    waitlistEntryId,
    appointmentId: result.appointment.id,
    clientId: entry.clientId,
    action: 'WAITLIST_APPOINTMENT_BOOKED',
  });

  return result;
}

/**
 * Remove client from waitlist
 */
export async function removeFromWaitlist(
  waitlistEntryId: string,
  reason: string,
  removedBy: string
) {
  const entry = await prisma.waitlistEntry.update({
    where: { id: waitlistEntryId },
    data: {
      status: 'Removed',
      notes: reason,
    },
  });

  auditLogger.info('Client removed from waitlist', {
    userId: removedBy,
    waitlistEntryId,
    clientId: entry.clientId,
    reason,
    action: 'WAITLIST_ENTRY_REMOVED',
  });

  return entry;
}

/**
 * Update waitlist entry priority
 */
export async function updatePriority(
  waitlistEntryId: string,
  priority: string,
  updatedBy: string
) {
  const entry = await prisma.waitlistEntry.update({
    where: { id: waitlistEntryId },
    data: { priority },
  });

  auditLogger.info('Waitlist entry priority updated', {
    userId: updatedBy,
    waitlistEntryId,
    priority,
    action: 'WAITLIST_PRIORITY_UPDATED',
  });

  return entry;
}
