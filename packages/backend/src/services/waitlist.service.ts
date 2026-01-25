import { auditLogger } from '../utils/logger';
import prisma from './database';
import { UserRoles } from '@mentalspace/shared';
import { Prisma, AppointmentStatus, WaitlistStatus } from '@mentalspace/database';

interface WaitlistEntryData {
  clientId: string;
  requestedClinicianId: string;
  alternateClinicianIds?: string[];
  requestedAppointmentType: string;
  preferredDays: string[];
  preferredTimes: string[];
  priority?: number;
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
        clinicianId: data.requestedClinicianId,
        requestedClinicianId: data.requestedClinicianId,
        alternateClinicianIds: data.alternateClinicianIds || [],
        appointmentType: data.requestedAppointmentType,
        requestedAppointmentType: data.requestedAppointmentType,
        preferredDays: data.preferredDays,
        preferredTimes: data.preferredTimes,
        priority: data.priority || 1,
        notes: data.notes,
        addedBy: data.addedBy,
        addedDate: new Date(),
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
  const where: Prisma.WaitlistEntryWhereInput = {};

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
 * OPTIMIZED: Uses batch queries instead of N+1 pattern for enterprise scale
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
  ].filter((id): id is string => id != null); // Remove any null/undefined values

  if (clinicianIds.length === 0) {
    return [];
  }

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + daysAhead);

  // ============================================================================
  // OPTIMIZED: Batch all queries upfront instead of N+1 pattern
  // This reduces 4N queries to 4 queries for significant performance improvement
  // ============================================================================

  // Batch query 1: Get ALL clinician schedules in one query
  const schedules = await prisma.clinicianSchedule.findMany({
    where: {
      clinicianId: { in: clinicianIds },
      effectiveStartDate: { lte: endDate },
      OR: [
        { effectiveEndDate: null },
        { effectiveEndDate: { gte: startDate } },
      ],
    },
  });

  // Create a map for quick lookup
  const scheduleMap = new Map<string, typeof schedules[0]>();
  schedules.forEach(schedule => {
    // Only store the first (most recent effective) schedule for each clinician
    if (!scheduleMap.has(schedule.clinicianId)) {
      scheduleMap.set(schedule.clinicianId, schedule);
    }
  });

  // Batch query 2: Get ALL clinicians in one query
  const clinicians = await prisma.user.findMany({
    where: { id: { in: clinicianIds } },
    select: { id: true, firstName: true, lastName: true },
  });

  // Create a map for quick lookup
  const clinicianMap = new Map<string, { firstName: string; lastName: string }>();
  clinicians.forEach(c => {
    clinicianMap.set(c.id, { firstName: c.firstName, lastName: c.lastName });
  });

  // Batch query 3: Get ALL existing appointments in one query
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      clinicianId: { in: clinicianIds },
      appointmentDate: {
        gte: startDate,
        lte: endDate,
      },
      status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
    },
    select: {
      clinicianId: true,
      appointmentDate: true,
      startTime: true,
      endTime: true,
    },
  });

  // Group appointments by clinician for efficient lookup
  const appointmentMap = new Map<string, typeof existingAppointments>();
  clinicianIds.forEach(id => appointmentMap.set(id, []));
  existingAppointments.forEach(apt => {
    const list = appointmentMap.get(apt.clinicianId) || [];
    list.push(apt);
    appointmentMap.set(apt.clinicianId, list);
  });

  // Batch query 4: Get ALL schedule exceptions in one query
  const allExceptions = await prisma.scheduleException.findMany({
    where: {
      clinicianId: { in: clinicianIds },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
      status: 'Approved',
    },
  });

  // Group exceptions by clinician for efficient lookup
  const exceptionMap = new Map<string, typeof allExceptions>();
  clinicianIds.forEach(id => exceptionMap.set(id, []));
  allExceptions.forEach(ex => {
    const list = exceptionMap.get(ex.clinicianId) || [];
    list.push(ex);
    exceptionMap.set(ex.clinicianId, list);
  });

  // ============================================================================
  // Process results using the pre-fetched data (no more database queries in loop)
  // ============================================================================

  const availableSlots: AvailabilitySlot[] = [];

  for (const clinicianId of clinicianIds) {
    // Get data from maps (O(1) lookup instead of database query)
    const schedule = scheduleMap.get(clinicianId);
    if (!schedule) continue;

    const clinician = clinicianMap.get(clinicianId);
    if (!clinician) continue;

    const clinicianAppointments = appointmentMap.get(clinicianId) || [];
    const exceptions = exceptionMap.get(clinicianId) || [];

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

      // Check for conflicts with existing appointments (using pre-fetched data)
      const hasConflict = clinicianAppointments.some((apt) => {
        const aptDate = new Date(apt.appointmentDate);
        return (
          aptDate.toDateString() === currentDate.toDateString() &&
          apt.startTime === startTime
        );
      });

      if (!hasConflict) {
        availableSlots.push({
          clinicianId: clinicianId as string,
          clinicianName: `${clinician.firstName} ${clinician.lastName}`,
          date: new Date(currentDate),
          startTime,
          endTime: endTime as string,
          appointmentType: entry.requestedAppointmentType || entry.appointmentType,
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
  priority: number | string,
  updatedBy: string
) {
  const entry = await prisma.waitlistEntry.update({
    where: { id: waitlistEntryId },
    data: { priority: typeof priority === 'string' ? parseInt(priority, 10) : priority },
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

      if (!clinician.roles.includes(UserRoles.CLINICIAN) && !clinician.roles.includes(UserRoles.ADMINISTRATOR)) {
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

// ============================================================================
// CLIENT PORTAL METHODS (Phase 3.2)
// ============================================================================

/**
 * Get waitlist entries for a specific client
 * Phase 3.2: Moved from controller to service
 */
export async function getClientWaitlistEntries(clientId: string) {
  const entries = await prisma.waitlistEntry.findMany({
    where: {
      clientId,
      status: 'ACTIVE',
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
      joinedAt: 'desc',
    },
  });

  auditLogger.info('Client retrieved their waitlist entries', {
    clientId,
    count: entries.length,
    action: 'VIEW_MY_WAITLIST_ENTRIES',
  });

  return entries;
}

/**
 * Get pending waitlist offers for a specific client
 * Phase 3.2: Moved from controller to service
 */
export async function getClientWaitlistOffers(clientId: string) {
  // Find active waitlist entries for this client
  const myEntries = await prisma.waitlistEntry.findMany({
    where: {
      clientId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
    },
  });

  const entryIds = myEntries.map((e) => e.id);

  if (entryIds.length === 0) {
    return [];
  }

  // Find offers for these entries
  const offers = await prisma.waitlistOffer.findMany({
    where: {
      waitlistEntryId: {
        in: entryIds,
      },
      status: 'PENDING',
      expiresAt: {
        gte: new Date(),
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
      waitlistEntry: {
        select: {
          appointmentType: true,
        },
      },
    },
    orderBy: {
      offeredAt: 'desc',
    },
  });

  auditLogger.info('Client retrieved their waitlist offers', {
    clientId,
    count: offers.length,
    action: 'VIEW_MY_WAITLIST_OFFERS',
  });

  return offers;
}

/**
 * Accept a waitlist offer for a client
 * Phase 3.2: Moved from controller to service
 */
export async function acceptClientWaitlistOffer(
  entryId: string,
  offerId: string,
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  // Verify the entry belongs to this client
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: entryId },
  });

  if (!entry || entry.clientId !== clientId) {
    return { success: false, error: 'UNAUTHORIZED' };
  }

  // Get the offer details
  const offer = await prisma.waitlistOffer.findUnique({
    where: { id: offerId },
  });

  if (!offer || offer.waitlistEntryId !== entryId) {
    return { success: false, error: 'NOT_FOUND' };
  }

  if (offer.status !== 'PENDING') {
    return { success: false, error: 'NOT_AVAILABLE' };
  }

  if (offer.expiresAt < new Date()) {
    return { success: false, error: 'EXPIRED' };
  }

  // Update offer and entry in a transaction
  await prisma.$transaction([
    prisma.waitlistOffer.update({
      where: { id: offerId },
      data: {
        status: 'ACCEPTED',
        respondedAt: new Date(),
      },
    }),
    prisma.waitlistEntry.update({
      where: { id: entryId },
      data: {
        status: 'MATCHED',
      },
    }),
  ]);

  auditLogger.info('Client accepted waitlist offer', {
    clientId,
    entryId,
    offerId,
    action: 'ACCEPT_WAITLIST_OFFER',
  });

  return { success: true };
}

/**
 * Decline a waitlist offer for a client
 * Phase 3.2: Moved from controller to service
 */
export async function declineClientWaitlistOffer(
  entryId: string,
  offerId: string,
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  // Verify the entry belongs to this client
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: entryId },
  });

  if (!entry || entry.clientId !== clientId) {
    return { success: false, error: 'UNAUTHORIZED' };
  }

  // Get the offer details
  const offer = await prisma.waitlistOffer.findUnique({
    where: { id: offerId },
  });

  if (!offer || offer.waitlistEntryId !== entryId) {
    return { success: false, error: 'NOT_FOUND' };
  }

  if (offer.status !== 'PENDING') {
    return { success: false, error: 'NOT_AVAILABLE' };
  }

  // Update offer status
  await prisma.waitlistOffer.update({
    where: { id: offerId },
    data: {
      status: 'DECLINED',
      respondedAt: new Date(),
    },
  });

  auditLogger.info('Client declined waitlist offer', {
    clientId,
    entryId,
    offerId,
    action: 'DECLINE_WAITLIST_OFFER',
  });

  return { success: true };
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
      AND: [
        // Match clinician or any clinician
        {
          OR: [
            { clinicianId: entry.clinicianId },
            { clinicianId: null },
          ],
        },
        // Higher priority or same priority but earlier join time
        {
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
      ],
    },
  });

  return position + 1; // Position is 1-indexed
}
