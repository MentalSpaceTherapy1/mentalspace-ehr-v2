import { auditLogger } from '../utils/logger';
import prisma from './database';
import { AppointmentStatus, WaitlistStatus } from '@mentalspace/database';

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
        priority: data.priority || 1,
        notes: data.notes,
        addedBy: data.addedBy,
        status: WaitlistStatus.ACTIVE,
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
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
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
      status: WaitlistStatus.MATCHED,
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
        timezone: appointmentData.timezone,
        appointmentNotes: appointmentData.notes || entry.notes,
        status: AppointmentStatus.SCHEDULED,
        statusUpdatedBy: bookedBy,
      } as any,
    });

    // Update waitlist entry
    const updatedEntry = await tx.waitlistEntry.update({
      where: { id: waitlistEntryId },
      data: {
        status: WaitlistStatus.MATCHED,
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
      status: WaitlistStatus.CANCELLED,
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

/**
 * Module 7: Join waitlist with validation and automatic priority calculation
 */
export async function joinWaitlist(data: {
  clientId: string;
  clinicianId?: string;
  appointmentType: string;
  preferredDays: string[];
  preferredTimes: string[];
  notes?: string;
  urgencyLevel?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}) {
  try {
    // Validate clinician if specified
    if (data.clinicianId) {
      const clinician = await prisma.user.findUnique({
        where: { id: data.clinicianId },
        select: { roles: true, isActive: true },
      });

      if (!clinician || !clinician.isActive) {
        throw new Error('Clinician not found or inactive');
      }

      if (!clinician.roles.includes('CLINICIAN') && !clinician.roles.includes('ADMINISTRATOR')) {
        throw new Error('Selected user is not a clinician');
      }
    }

    // Calculate initial priority
    const urgencyScore = {
      URGENT: 30,
      HIGH: 20,
      NORMAL: 10,
      LOW: 0,
    }[data.urgencyLevel || 'NORMAL'];

    // Flexibility bonus
    const flexibilityBonus = data.preferredDays.length >= 3 && data.preferredTimes.length >= 2 ? 5 : 0;

    const initialPriority = urgencyScore + flexibilityBonus;

    // Set expiration date (90 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    // Create waitlist entry
    const entry = await prisma.waitlistEntry.create({
      data: {
        clientId: data.clientId,
        clinicianId: data.clinicianId,
        appointmentType: data.appointmentType,
        preferredDays: data.preferredDays,
        preferredTimes: data.preferredTimes,
        notes: data.notes,
        priority: initialPriority,
        expiresAt,
        status: 'ACTIVE',
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        clinician: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    auditLogger.info('Client joined waitlist', {
      waitlistEntryId: entry.id,
      clientId: data.clientId,
      clinicianId: data.clinicianId,
      priority: initialPriority,
      action: 'WAITLIST_JOINED',
    });

    // Send confirmation notification
    const waitlistNotificationService = await import('./waitlist-notification.service');
    await waitlistNotificationService.sendWaitlistConfirmation(entry.id);

    return entry;
  } catch (error) {
    auditLogger.error('Failed to join waitlist', {
      error: error instanceof Error ? error.message : 'Unknown error',
      clientId: data.clientId,
    });
    throw error;
  }
}

/**
 * Module 7: Calculate dynamic priority score
 */
export async function calculatePriority(waitlistEntryId: string): Promise<number> {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: waitlistEntryId },
  });

  if (!entry) {
    throw new Error('Waitlist entry not found');
  }

  let score = entry.priority; // Base priority (0-35 from urgency + flexibility)

  // Wait time bonus: +1 per 7 days waiting (max +20)
  const daysWaiting = Math.floor(
    (Date.now() - entry.joinedAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  const waitTimeBonus = Math.min(Math.floor(daysWaiting / 7), 20);
  score += waitTimeBonus;

  // Decline penalty: -5 per declined offer
  const declinePenalty = entry.declinedOffers * 5;
  score -= declinePenalty;

  // Ensure score is non-negative
  const finalScore = Math.max(0, score);

  // Update the entry
  await prisma.waitlistEntry.update({
    where: { id: waitlistEntryId },
    data: { priority: finalScore },
  });

  return finalScore;
}

/**
 * Module 7: Get waitlist statistics
 */
export async function getWaitlistStats() {
  const [
    totalActive,
    totalMatched,
    totalCancelled,
    totalExpired,
    entriesByType,
    avgWaitTime,
  ] = await Promise.all([
    prisma.waitlistEntry.count({ where: { status: 'ACTIVE' } }),
    prisma.waitlistEntry.count({ where: { status: 'MATCHED' } }),
    prisma.waitlistEntry.count({ where: { status: 'CANCELLED' } }),
    prisma.waitlistEntry.count({ where: { status: 'EXPIRED' } }),
    prisma.waitlistEntry.groupBy({
      by: ['appointmentType'],
      where: { status: 'ACTIVE' },
      _count: true,
    }),
    prisma.waitlistEntry.aggregate({
      where: { status: 'ACTIVE' },
      _avg: {
        priority: true,
      },
    }),
  ]);

  // Calculate average wait time for active entries
  const activeEntries = await prisma.waitlistEntry.findMany({
    where: { status: 'ACTIVE' },
    select: { joinedAt: true },
  });

  const totalWaitDays = activeEntries.reduce((sum, entry) => {
    const days = Math.floor((Date.now() - entry.joinedAt.getTime()) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0);

  const averageWaitDays = activeEntries.length > 0 ? totalWaitDays / activeEntries.length : 0;

  // Calculate match rate (matched / (matched + active + cancelled + expired))
  const totalEntries = totalActive + totalMatched + totalCancelled + totalExpired;
  const matchRate = totalEntries > 0 ? (totalMatched / totalEntries) * 100 : 0;

  // Priority distribution
  const priorityRanges = await Promise.all([
    prisma.waitlistEntry.count({ where: { status: 'ACTIVE', priority: { gte: 0, lt: 20 } } }),
    prisma.waitlistEntry.count({ where: { status: 'ACTIVE', priority: { gte: 20, lt: 40 } } }),
    prisma.waitlistEntry.count({ where: { status: 'ACTIVE', priority: { gte: 40, lt: 60 } } }),
    prisma.waitlistEntry.count({ where: { status: 'ACTIVE', priority: { gte: 60 } } }),
  ]);

  return {
    totalActive,
    totalMatched,
    totalCancelled,
    totalExpired,
    averageWaitDays: Math.round(averageWaitDays * 10) / 10,
    matchRate: Math.round(matchRate * 10) / 10,
    entriesByType: entriesByType.map((entry) => ({
      type: entry.appointmentType,
      count: entry._count,
    })),
    priorityDistribution: {
      low: priorityRanges[0],      // 0-19
      normal: priorityRanges[1],   // 20-39
      high: priorityRanges[2],     // 40-59
      urgent: priorityRanges[3],   // 60+
    },
  };
}

/**
 * Module 7: Expire old waitlist entries
 */
export async function expireOldEntries(): Promise<number> {
  try {
    const now = new Date();

    // Find entries past their expiration date
    const expiredEntries = await prisma.waitlistEntry.updateMany({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          lt: now,
        },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    if (expiredEntries.count > 0) {
      auditLogger.info('Expired old waitlist entries', {
        count: expiredEntries.count,
        action: 'WAITLIST_ENTRIES_EXPIRED',
      });
    }

    return expiredEntries.count;
  } catch (error) {
    auditLogger.error('Error expiring old waitlist entries', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Module 7: Update waitlist entry preferences
 */
export async function updateWaitlistEntry(
  waitlistEntryId: string,
  data: {
    clinicianId?: string;
    preferredDays?: string[];
    preferredTimes?: string[];
    notes?: string;
  }
) {
  const entry = await prisma.waitlistEntry.update({
    where: { id: waitlistEntryId },
    data: {
      ...(data.clinicianId !== undefined && { clinicianId: data.clinicianId }),
      ...(data.preferredDays && { preferredDays: data.preferredDays }),
      ...(data.preferredTimes && { preferredTimes: data.preferredTimes }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
    include: {
      client: true,
      clinician: true,
    },
  });

  auditLogger.info('Waitlist entry updated', {
    waitlistEntryId,
    action: 'WAITLIST_ENTRY_UPDATED',
  });

  return entry;
}

/**
 * Module 7: Cancel waitlist entry
 */
export async function cancelWaitlistEntry(
  waitlistEntryId: string,
  reason: string,
  cancelledBy: string
) {
  const entry = await prisma.waitlistEntry.update({
    where: { id: waitlistEntryId },
    data: {
      status: 'CANCELLED',
      notes: reason,
    },
  });

  auditLogger.info('Waitlist entry cancelled', {
    waitlistEntryId,
    clientId: entry.clientId,
    reason,
    cancelledBy,
    action: 'WAITLIST_ENTRY_CANCELLED',
  });

  return entry;
}

/**
 * Module 7: Get position in queue
 */
export async function getPositionInQueue(waitlistEntryId: string): Promise<number> {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: waitlistEntryId },
    select: {
      priority: true,
      joinedAt: true,
      clinicianId: true,
      appointmentType: true,
    },
  });

  if (!entry) {
    throw new Error('Waitlist entry not found');
  }

  // Count entries with higher priority or same priority but earlier join date
  const position = await prisma.waitlistEntry.count({
    where: {
      status: 'ACTIVE',
      appointmentType: entry.appointmentType,
      OR: [
        { clinicianId: entry.clinicianId },
        { clinicianId: null },
      ],
      OR: [
        { priority: { gt: entry.priority } },
        {
          AND: [
            { priority: entry.priority },
            { joinedAt: { lt: entry.joinedAt } },
          ],
        },
      ],
    },
  });

  return position + 1; // Position is 1-indexed
}
