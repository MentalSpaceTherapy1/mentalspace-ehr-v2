import { auditLogger } from '../utils/logger';
import prisma from './database';
import { AppointmentStatus } from '@mentalspace/database';

/**
 * Module 3 Phase 2.2: Waitlist Automation Service
 * Smart matching algorithm with priority scoring and automated notifications
 */

interface MatchCriteria {
  providerSpecialty?: string;
  insuranceId?: string;
  preferredTimes?: string[];
  preferredDays?: string[];
  location?: string;
}

interface MatchedSlot {
  waitlistEntryId: string;
  clinicianId: string;
  clinicianName: string;
  appointmentDate: Date;
  startTime: string;
  endTime: string;
  matchScore: number;
  matchReasons: string[];
}

interface PriorityScoreFactors {
  waitTime: number; // days waiting
  clinicalUrgency: string; // priority level
  referralSource?: string;
  previousDeclines: number;
}

interface MatchingStats {
  totalEntries: number;
  matched: number;
  offered: number;
  accuracy: number;
  averageMatchScore: number;
}

/**
 * Calculate dynamic priority score for waitlist entry
 * Priority = Wait Time (40%) + Clinical Urgency (30%) + Referral Priority (20%) - Decline Penalty (10%)
 */
export async function calculatePriorityScore(
  waitlistEntryId: string
): Promise<number> {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: waitlistEntryId },
  });

  if (!entry) {
    throw new Error('Waitlist entry not found');
  }

  // Calculate wait time score (0-1, max at 30 days)
  const waitDays = Math.floor(
    (Date.now() - new Date(entry.addedDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const waitTimeScore = Math.min(waitDays / 30, 1.0);

  // Clinical urgency score (0-1)
  const urgencyMap: Record<string, number> = {
    Urgent: 1.0,
    High: 0.75,
    Normal: 0.5,
    Low: 0.25,
  };
  const urgencyScore = urgencyMap[entry.priority] || 0.5;

  // Referral priority score (0-1) - assume urgent referrals have higher priority
  const referralScore = entry.priority === 'Urgent' ? 1.0 : 0.5;

  // Decline penalty (0-1) - reduces score based on declined offers
  const declinePenalty = Math.min(entry.declinedOffers * 0.1, 1.0);

  // Calculate weighted priority score
  const priorityScore =
    waitTimeScore * 0.4 +
    urgencyScore * 0.3 +
    referralScore * 0.2 -
    declinePenalty * 0.1;

  // Ensure score is between 0 and 1
  const finalScore = Math.max(0, Math.min(1, priorityScore));

  // Update the entry with new score
  await prisma.waitlistEntry.update({
    where: { id: waitlistEntryId },
    data: { priorityScore: finalScore },
  });

  auditLogger.info('Priority score calculated', {
    waitlistEntryId,
    priorityScore: finalScore,
    factors: {
      waitDays,
      waitTimeScore,
      urgencyScore,
      referralScore,
      declinePenalty,
    },
  });

  return finalScore;
}

/**
 * Update priority scores for all active waitlist entries
 */
export async function updateAllPriorityScores(): Promise<void> {
  const activeEntries = await prisma.waitlistEntry.findMany({
    where: {
      status: 'ACTIVE',
      autoMatchEnabled: true,
    },
    select: { id: true },
  });

  for (const entry of activeEntries) {
    await calculatePriorityScore(entry.id);
  }

  auditLogger.info('All priority scores updated', {
    count: activeEntries.length,
  });
}

/**
 * Find available slots matching waitlist entry preferences
 */
export async function findMatchingSlots(
  waitlistEntryId: string,
  daysAhead: number = 14
): Promise<MatchedSlot[]> {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: waitlistEntryId },
    include: {
      client: {
        include: {
          insuranceInformation: true,
        },
      },
    },
  });

  if (!entry) {
    throw new Error('Waitlist entry not found');
  }

  // Get clinicians to check (requested + alternates + preferred)
  const clinicianIds = Array.from(
    new Set([
      entry.requestedClinicianId,
      ...entry.alternateClinicianIds,
      ...(entry.preferredProviderId ? [entry.preferredProviderId] : []),
    ])
  );

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + daysAhead);

  // Respect maxWaitDays if set
  if (entry.maxWaitDays) {
    const maxDate = new Date(entry.addedDate);
    maxDate.setDate(maxDate.getDate() + entry.maxWaitDays);
    if (maxDate < endDate) {
      endDate.setTime(maxDate.getTime());
    }
  }

  const matchedSlots: MatchedSlot[] = [];

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
      select: {
        firstName: true,
        lastName: true,
        specialties: true,
        npiNumber: true,
      },
    });

    if (!clinician) continue;

    // Get existing appointments
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

    // Get schedule exceptions
    const exceptions = await prisma.scheduleException.findMany({
      where: {
        clinicianId,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
        status: 'Approved',
      },
    });

    const weeklySchedule = schedule.weeklyScheduleJson as any;

    // Generate and score slots
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayName = currentDate
        .toLocaleDateString('en-US', { weekday: 'long' })
        .toLowerCase();

      // Check preferred days
      if (entry.preferredDays.length > 0) {
        const preferredDayNames = entry.preferredDays.map((d) =>
          d.toLowerCase()
        );
        if (!preferredDayNames.includes(dayName)) {
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }
      }

      const daySchedule = weeklySchedule[dayName];
      if (!daySchedule || !daySchedule.isAvailable) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Check for exceptions
      const hasException = exceptions.some((ex) => {
        const exStart = new Date(ex.startDate);
        const exEnd = new Date(ex.endDate);
        return currentDate >= exStart && currentDate <= exEnd;
      });

      if (hasException) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      const startTime = daySchedule.startTime || '09:00';
      const endTime = daySchedule.endTime || '17:00';

      // Check conflicts
      const hasConflict = existingAppointments.some((apt) => {
        const aptDate = new Date(apt.appointmentDate);
        return (
          aptDate.toDateString() === currentDate.toDateString() &&
          apt.startTime === startTime
        );
      });

      if (!hasConflict) {
        // Calculate match score
        const matchScore = calculateMatchScore(
          entry,
          clinician,
          currentDate,
          startTime
        );

        const matchReasons: string[] = [];
        if (clinicianId === entry.preferredProviderId) {
          matchReasons.push('Preferred provider');
        }
        if (entry.preferredDays.includes(dayName.toUpperCase())) {
          matchReasons.push('Preferred day');
        }
        if (clinicianId === entry.requestedClinicianId) {
          matchReasons.push('Requested clinician');
        }

        matchedSlots.push({
          waitlistEntryId: entry.id,
          clinicianId,
          clinicianName: `${clinician.firstName} ${clinician.lastName}`,
          appointmentDate: new Date(currentDate),
          startTime,
          endTime,
          matchScore,
          matchReasons,
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  // Sort by match score (highest first)
  matchedSlots.sort((a, b) => b.matchScore - a.matchScore);

  return matchedSlots;
}

/**
 * Calculate match score for a specific slot
 * Factors: Provider preference, time preference, insurance compatibility, wait time
 */
function calculateMatchScore(
  entry: any,
  clinician: any,
  date: Date,
  time: string
): number {
  let score = 0;

  // Provider match (30%)
  if (entry.preferredProviderId === clinician.id) {
    score += 0.3;
  } else if (entry.requestedClinicianId === clinician.id) {
    score += 0.25;
  } else if (entry.alternateClinicianIds.includes(clinician.id)) {
    score += 0.15;
  }

  // Day preference match (20%)
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  if (entry.preferredDays.includes(dayName)) {
    score += 0.2;
  }

  // Time preference match (20%)
  const hour = parseInt(time.split(':')[0]);
  const timeOfDay =
    hour < 12 ? 'MORNING' : hour < 17 ? 'AFTERNOON' : 'EVENING';

  // Handle old format (string) and new format (array)
  const preferredTimes = Array.isArray(entry.preferredTimes)
    ? entry.preferredTimes
    : [entry.preferredTimes];

  if (preferredTimes.includes(timeOfDay) || preferredTimes.includes('Anytime')) {
    score += 0.2;
  }

  // Sooner is better (15%)
  const daysUntilAppointment = Math.floor(
    (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const soonerScore = Math.max(0, 1 - daysUntilAppointment / 30) * 0.15;
  score += soonerScore;

  // Priority boost (15%)
  score += entry.priorityScore * 0.15;

  return Math.min(1, score);
}

/**
 * Main matching algorithm - match waitlist entries to available slots
 */
export async function matchWaitlistToSlots(): Promise<{
  matched: MatchedSlot[];
  stats: MatchingStats;
}> {
  // Update all priority scores first
  await updateAllPriorityScores();

  // Get active waitlist entries sorted by priority score
  const entries = await prisma.waitlistEntry.findMany({
    where: {
      status: 'ACTIVE',
      autoMatchEnabled: true,
    },
    orderBy: [
      { priorityScore: 'desc' },
      { addedDate: 'asc' },
    ],
  });

  const matched: MatchedSlot[] = [];
  let totalMatchScore = 0;

  for (const entry of entries) {
    try {
      const slots = await findMatchingSlots(entry.id, 14);

      if (slots.length > 0) {
        // Get best match
        const bestMatch = slots[0];
        matched.push(bestMatch);
        totalMatchScore += bestMatch.matchScore;

        auditLogger.info('Waitlist match found', {
          waitlistEntryId: entry.id,
          clientId: entry.clientId,
          matchScore: bestMatch.matchScore,
          clinicianId: bestMatch.clinicianId,
          appointmentDate: bestMatch.appointmentDate,
        });
      }
    } catch (error) {
      auditLogger.error('Error matching waitlist entry', {
        waitlistEntryId: entry.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const stats: MatchingStats = {
    totalEntries: entries.length,
    matched: matched.length,
    offered: 0, // Will be updated after offers are sent
    accuracy: matched.length > 0 ? (matched.length / entries.length) * 100 : 0,
    averageMatchScore:
      matched.length > 0 ? totalMatchScore / matched.length : 0,
  };

  auditLogger.info('Waitlist matching complete', stats);

  return { matched, stats };
}

/**
 * Send slot offer to waitlist member
 */
export async function sendSlotOffer(
  matchedSlot: MatchedSlot,
  notificationMethod: 'Email' | 'SMS' | 'Portal' = 'Email'
): Promise<void> {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: matchedSlot.waitlistEntryId },
    include: {
      client: true,
    },
  });

  if (!entry) {
    throw new Error('Waitlist entry not found');
  }

  // Update waitlist entry
  await prisma.waitlistEntry.update({
    where: { id: matchedSlot.waitlistEntryId },
    data: {
      status: 'OFFERED',
      lastOfferDate: new Date(),
      offerCount: { increment: 1 },
      notificationsSent: { increment: 1 },
      lastNotification: new Date(),
      notified: true,
      notifiedDate: new Date(),
      notificationMethod,
    },
  });

  // TODO: Integrate with notification service (SMS/Email)
  // This will be handled by reminder service or notification service

  auditLogger.info('Slot offer sent', {
    waitlistEntryId: matchedSlot.waitlistEntryId,
    clientId: entry.clientId,
    clinicianId: matchedSlot.clinicianId,
    appointmentDate: matchedSlot.appointmentDate,
    notificationMethod,
  });
}

/**
 * Record waitlist member's response to offer
 */
export async function recordOfferResponse(
  waitlistEntryId: string,
  accepted: boolean,
  notes?: string
): Promise<void> {
  const updateData: any = {
    updatedAt: new Date(),
  };

  if (accepted) {
    updateData.status = 'SCHEDULED';
  } else {
    updateData.status = 'ACTIVE';
    updateData.declinedOffers = { increment: 1 };
    if (notes) {
      updateData.notes = notes;
    }
  }

  await prisma.waitlistEntry.update({
    where: { id: waitlistEntryId },
    data: updateData,
  });

  // Recalculate priority score after decline
  if (!accepted) {
    await calculatePriorityScore(waitlistEntryId);
  }

  auditLogger.info('Offer response recorded', {
    waitlistEntryId,
    accepted,
    action: accepted ? 'OFFER_ACCEPTED' : 'OFFER_DECLINED',
  });
}

/**
 * Get matching accuracy and performance stats
 */
export async function getMatchingStats(
  startDate?: Date,
  endDate?: Date
): Promise<MatchingStats> {
  const where: any = {};

  if (startDate || endDate) {
    where.updatedAt = {};
    if (startDate) where.updatedAt.gte = startDate;
    if (endDate) where.updatedAt.lte = endDate;
  }

  const totalEntries = await prisma.waitlistEntry.count({
    where: {
      ...where,
      status: { in: ['ACTIVE', 'OFFERED', 'SCHEDULED'] },
    },
  });

  const matched = await prisma.waitlistEntry.count({
    where: {
      ...where,
      status: { in: ['OFFERED', 'SCHEDULED'] },
    },
  });

  const offered = await prisma.waitlistEntry.count({
    where: {
      ...where,
      status: 'OFFERED',
    },
  });

  const entries = await prisma.waitlistEntry.findMany({
    where: {
      ...where,
      status: { in: ['OFFERED', 'SCHEDULED'] },
      priorityScore: { not: null },
    },
    select: { priorityScore: true },
  });

  const averageMatchScore =
    entries.length > 0
      ? entries.reduce((sum, e) => sum + (e.priorityScore || 0), 0) /
        entries.length
      : 0;

  return {
    totalEntries,
    matched,
    offered,
    accuracy: totalEntries > 0 ? (matched / totalEntries) * 100 : 0,
    averageMatchScore,
  };
}

/**
 * Process automatic matching for all active entries (called by cron job)
 */
export async function processAutomaticMatching(): Promise<{
  processed: number;
  matched: number;
  offered: number;
  errors: number;
}> {
  auditLogger.info('Starting automatic waitlist matching...');

  const result = await matchWaitlistToSlots();
  let offered = 0;
  let errors = 0;

  // Send offers for top matches
  for (const match of result.matched) {
    try {
      // Only send offers for high-quality matches (score > 0.7)
      if (match.matchScore >= 0.7) {
        await sendSlotOffer(match, 'Email');
        offered++;
      }
    } catch (error) {
      errors++;
      auditLogger.error('Error sending slot offer', {
        matchedSlot: match,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const summary = {
    processed: result.stats.totalEntries,
    matched: result.matched.length,
    offered,
    errors,
  };

  auditLogger.info('Automatic waitlist matching complete', summary);

  return summary;
}
