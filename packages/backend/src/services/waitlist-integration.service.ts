import logger, { auditLogger } from '../utils/logger';
import prisma from './database';
import * as waitlistMatchingService from './waitlistMatching.service';
import * as waitlistNotificationService from './waitlist-notification.service';

/**
 * Module 7: Waitlist Integration Service
 * Handles integration between appointment system and waitlist
 */

/**
 * Trigger waitlist matching when an appointment is cancelled
 * Called after an appointment is cancelled to notify waitlist clients
 */
export async function handleAppointmentCancellation(
  appointmentId: string,
  appointmentData: {
    clinicianId: string;
    appointmentDate: Date;
    startTime: string;
    endTime: string;
    appointmentType: string;
  }
): Promise<void> {
  try {
    logger.info('Processing waitlist after appointment cancellation', {
      appointmentId,
      clinicianId: appointmentData.clinicianId,
      appointmentDate: appointmentData.appointmentDate,
    });

    // Find active waitlist entries that might match this slot
    const potentialMatches = await prisma.waitlistEntry.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { clinicianId: appointmentData.clinicianId },
          { clinicianId: null }, // Clients who don't have a clinician preference
        ],
        appointmentType: appointmentData.appointmentType,
      },
      orderBy: [
        { priority: 'desc' },
        { joinedAt: 'asc' },
      ],
      take: 10, // Limit to top 10 matches
    });

    if (potentialMatches.length === 0) {
      logger.info('No matching waitlist entries found');
      return;
    }

    // Score and notify top matches
    const dayOfWeek = appointmentData.appointmentDate
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toUpperCase();

    const hour = parseInt(appointmentData.startTime.split(':')[0]);
    const timeOfDay = hour < 12 ? 'MORNING' : hour < 17 ? 'AFTERNOON' : 'EVENING';

    for (const entry of potentialMatches) {
      // Check if preferences match
      const dayMatches =
        entry.preferredDays.length === 0 ||
        entry.preferredDays.includes(dayOfWeek);
      const timeMatches =
        entry.preferredTimes.length === 0 ||
        entry.preferredTimes.includes(timeOfDay);

      if (dayMatches && timeMatches) {
        // Get clinician name
        const clinician = await prisma.user.findUnique({
          where: { id: appointmentData.clinicianId },
          select: { firstName: true, lastName: true },
        });

        // Send match notification
        await waitlistNotificationService.sendMatchFoundNotification(entry.id, {
          clinicianName: clinician
            ? `${clinician.firstName} ${clinician.lastName}`
            : 'Unknown',
          appointmentDate: appointmentData.appointmentDate,
          startTime: appointmentData.startTime,
          endTime: appointmentData.endTime,
          matchScore: 0.9, // High score for exact slot match
          bookingUrl: `${process.env.FRONTEND_URL}/appointments/book?slot=${appointmentId}`,
        });

        // Update waitlist entry status
        await prisma.waitlistEntry.update({
          where: { id: entry.id },
          data: {
            status: 'MATCHED',
            notificationsSent: { increment: 1 },
            lastNotifiedAt: new Date(),
          },
        });

        logger.info('Notified waitlist client about available slot', {
          waitlistEntryId: entry.id,
          clientId: entry.clientId,
          appointmentId,
        });

        // Only notify top 3 matches
        if (potentialMatches.indexOf(entry) >= 2) {
          break;
        }
      }
    }

    auditLogger.info('Waitlist processing completed after cancellation', {
      appointmentId,
      matchesFound: potentialMatches.length,
      action: 'WAITLIST_CANCELLATION_PROCESSED',
    });
  } catch (error) {
    logger.error('Error handling appointment cancellation for waitlist', {
      appointmentId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Don't throw - this shouldn't block the cancellation
  }
}

/**
 * Trigger waitlist matching when an appointment is rescheduled
 * Called after an appointment is rescheduled to notify waitlist about freed slot
 */
export async function handleAppointmentReschedule(
  appointmentId: string,
  oldSlotData: {
    clinicianId: string;
    appointmentDate: Date;
    startTime: string;
    endTime: string;
    appointmentType: string;
  },
  newSlotData: {
    appointmentDate: Date;
    startTime: string;
    endTime: string;
  }
): Promise<void> {
  try {
    logger.info('Processing waitlist after appointment reschedule', {
      appointmentId,
      oldDate: oldSlotData.appointmentDate,
      newDate: newSlotData.appointmentDate,
    });

    // The old slot is now free, so treat it like a cancellation
    await handleAppointmentCancellation(appointmentId, oldSlotData);

    auditLogger.info('Waitlist processing completed after reschedule', {
      appointmentId,
      action: 'WAITLIST_RESCHEDULE_PROCESSED',
    });
  } catch (error) {
    logger.error('Error handling appointment reschedule for waitlist', {
      appointmentId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Don't throw - this shouldn't block the reschedule
  }
}

/**
 * Mark waitlist entry as matched when appointment is booked from waitlist
 * Called when a client books an appointment after receiving a waitlist notification
 */
export async function handleAppointmentBookedFromWaitlist(
  appointmentId: string,
  waitlistEntryId: string
): Promise<void> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        clinician: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Update waitlist entry
    await prisma.waitlistEntry.update({
      where: { id: waitlistEntryId },
      data: {
        status: 'MATCHED',
      },
    });

    // Send confirmation notification
    await waitlistNotificationService.sendAppointmentBookedNotification(
      waitlistEntryId,
      {
        clinicianName: appointment.clinician
          ? `${appointment.clinician.firstName} ${appointment.clinician.lastName}`
          : 'Unknown',
        appointmentDate: appointment.appointmentDate,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
      }
    );

    auditLogger.info('Appointment booked from waitlist', {
      appointmentId,
      waitlistEntryId,
      action: 'APPOINTMENT_BOOKED_FROM_WAITLIST',
    });
  } catch (error) {
    logger.error('Error marking appointment as booked from waitlist', {
      appointmentId,
      waitlistEntryId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Check if an appointment slot matches any waitlist entries
 * Used before creating new availability to check for potential matches
 */
export async function checkForWaitlistMatches(slotData: {
  clinicianId: string;
  appointmentDate: Date;
  startTime: string;
  endTime: string;
  appointmentType?: string;
}): Promise<{
  hasMatches: boolean;
  matchCount: number;
  topMatches: any[];
}> {
  try {
    const dayOfWeek = slotData.appointmentDate
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toUpperCase();

    const hour = parseInt(slotData.startTime.split(':')[0]);
    const timeOfDay = hour < 12 ? 'MORNING' : hour < 17 ? 'AFTERNOON' : 'EVENING';

    const whereClause: any = {
      status: 'ACTIVE',
      OR: [
        { clinicianId: slotData.clinicianId },
        { clinicianId: null },
      ],
    };

    if (slotData.appointmentType) {
      whereClause.appointmentType = slotData.appointmentType;
    }

    const matches = await prisma.waitlistEntry.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { joinedAt: 'asc' },
      ],
      take: 5,
    });

    // Filter by day and time preferences
    const filteredMatches = matches.filter((entry) => {
      const dayMatches =
        entry.preferredDays.length === 0 ||
        entry.preferredDays.includes(dayOfWeek);
      const timeMatches =
        entry.preferredTimes.length === 0 ||
        entry.preferredTimes.includes(timeOfDay);
      return dayMatches && timeMatches;
    });

    return {
      hasMatches: filteredMatches.length > 0,
      matchCount: filteredMatches.length,
      topMatches: filteredMatches.slice(0, 3),
    };
  } catch (error) {
    logger.error('Error checking for waitlist matches', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      hasMatches: false,
      matchCount: 0,
      topMatches: [],
    };
  }
}

/**
 * Auto-expire old waitlist entries
 * Called by cron job to automatically expire entries that are too old
 */
export async function autoExpireOldEntries(daysThreshold: number = 90): Promise<number> {
  try {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() - daysThreshold);

    const result = await prisma.waitlistEntry.updateMany({
      where: {
        status: 'ACTIVE',
        joinedAt: {
          lt: expirationDate,
        },
        expiresAt: null, // Only auto-expire if no explicit expiration set
      },
      data: {
        status: 'EXPIRED',
      },
    });

    if (result.count > 0) {
      auditLogger.info('Auto-expired old waitlist entries', {
        count: result.count,
        daysThreshold,
        action: 'WAITLIST_AUTO_EXPIRED',
      });
    }

    return result.count;
  } catch (error) {
    logger.error('Error auto-expiring old waitlist entries', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Module 7: Find matching waitlist entries for an available slot
 * Returns top matches with scoring
 */
export async function findMatches(slotDetails: {
  clinicianId: string;
  date: Date;
  time: string;
  appointmentType: string;
}): Promise<{
  id: string;
  clientId: string;
  clientName: string;
  priority: number;
  daysWaiting: number;
  matchScore: number;
  matchReasons: string[];
}[]> {
  try {
    const dayOfWeek = slotDetails.date
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toUpperCase();

    const hour = parseInt(slotDetails.time.split(':')[0]);
    const timeOfDay = hour < 12 ? 'MORNING' : hour < 17 ? 'AFTERNOON' : 'EVENING';

    // Get active entries that could match
    const potentialMatches = await prisma.waitlistEntry.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { clinicianId: slotDetails.clinicianId },
          { clinicianId: null },
        ],
        appointmentType: slotDetails.appointmentType,
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { joinedAt: 'asc' },
      ],
      take: 20, // Get more than we need for scoring
    });

    // Score each match
    const scoredMatches = potentialMatches.map((entry) => {
      let score = 0;
      const reasons: string[] = [];

      // Exact clinician match: +30 points
      if (entry.clinicianId === slotDetails.clinicianId) {
        score += 30;
        reasons.push('Requested clinician');
      } else if (!entry.clinicianId) {
        score += 15;
        reasons.push('Any clinician');
      }

      // Appointment type match: +20 points (already filtered)
      score += 20;
      reasons.push('Appointment type match');

      // Day preference match: +20 points
      const dayMatches =
        entry.preferredDays.length === 0 ||
        entry.preferredDays.includes(dayOfWeek);
      if (dayMatches) {
        score += 20;
        if (entry.preferredDays.includes(dayOfWeek)) {
          reasons.push('Preferred day');
        }
      }

      // Time preference match: +15 points
      const timeMatches =
        entry.preferredTimes.length === 0 ||
        entry.preferredTimes.includes(timeOfDay);
      if (timeMatches) {
        score += 15;
        if (entry.preferredTimes.includes(timeOfDay)) {
          reasons.push('Preferred time');
        }
      }

      // High priority bonus: +0-15 points (normalized)
      const priorityBonus = Math.min((entry.priority / 100) * 15, 15);
      score += priorityBonus;
      if (entry.priority > 40) {
        reasons.push('High priority');
      }

      const daysWaiting = Math.floor(
        (Date.now() - entry.joinedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: entry.id,
        clientId: entry.clientId,
        clientName: `${entry.client.firstName} ${entry.client.lastName}`,
        priority: entry.priority,
        daysWaiting,
        matchScore: Math.min(score, 100),
        matchReasons: reasons,
      };
    });

    // Filter out poor matches (score < 50) and sort by score
    const goodMatches = scoredMatches
      .filter((m) => m.matchScore >= 50)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5); // Return top 5

    logger.info('Found waitlist matches for slot', {
      clinicianId: slotDetails.clinicianId,
      date: slotDetails.date,
      matchCount: goodMatches.length,
    });

    return goodMatches;
  } catch (error) {
    logger.error('Error finding waitlist matches', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return [];
  }
}

/**
 * Module 7: Offer slot to waitlist client
 */
export async function offerSlot(
  waitlistEntryId: string,
  slotDetails: {
    clinicianId: string;
    date: Date;
    time: string;
    endTime: string;
    appointmentType: string;
  },
  expiresInMs: number = 24 * 60 * 60 * 1000 // 24 hours default
): Promise<any> {
  try {
    const entry = await prisma.waitlistEntry.findUnique({
      where: { id: waitlistEntryId },
      include: { client: true },
    });

    if (!entry) {
      throw new Error('Waitlist entry not found');
    }

    if (entry.status !== 'ACTIVE') {
      throw new Error('Waitlist entry is not active');
    }

    // Calculate expiration
    const expiresAt = new Date(Date.now() + expiresInMs);

    // Calculate match score
    const dayOfWeek = slotDetails.date
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toUpperCase();
    const hour = parseInt(slotDetails.time.split(':')[0]);
    const timeOfDay = hour < 12 ? 'MORNING' : hour < 17 ? 'AFTERNOON' : 'EVENING';

    let matchScore = 50; // Base score
    const matchReasons: string[] = [];

    if (entry.clinicianId === slotDetails.clinicianId) {
      matchScore += 30;
      matchReasons.push('Requested clinician');
    }
    if (entry.preferredDays.includes(dayOfWeek)) {
      matchScore += 10;
      matchReasons.push('Preferred day');
    }
    if (entry.preferredTimes.includes(timeOfDay)) {
      matchScore += 10;
      matchReasons.push('Preferred time');
    }

    // Create the offer
    const offer = await prisma.waitlistOffer.create({
      data: {
        waitlistEntryId,
        clinicianId: slotDetails.clinicianId,
        appointmentDate: slotDetails.date,
        startTime: slotDetails.time,
        endTime: slotDetails.endTime,
        appointmentType: slotDetails.appointmentType,
        status: 'PENDING',
        expiresAt,
        matchScore: matchScore / 100,
        matchReasons,
      },
    });

    // Update waitlist entry
    await prisma.waitlistEntry.update({
      where: { id: waitlistEntryId },
      data: {
        notificationsSent: { increment: 1 },
        lastNotifiedAt: new Date(),
      },
    });

    // Send notification
    await waitlistNotificationService.sendSlotOfferNotification(
      waitlistEntryId,
      offer.id,
      slotDetails,
      expiresAt
    );

    auditLogger.info('Slot offered to waitlist client', {
      waitlistEntryId,
      offerId: offer.id,
      clientId: entry.clientId,
      expiresAt,
      action: 'SLOT_OFFERED',
    });

    return offer;
  } catch (error) {
    logger.error('Error offering slot to waitlist client', {
      error: error instanceof Error ? error.message : 'Unknown error',
      waitlistEntryId,
    });
    throw error;
  }
}

/**
 * Module 7: Accept offered slot
 */
export async function acceptOffer(
  waitlistEntryId: string,
  offerId: string
): Promise<any> {
  try {
    const offer = await prisma.waitlistOffer.findUnique({
      where: { id: offerId },
      include: {
        waitlistEntry: {
          include: { client: true },
        },
        clinician: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!offer) {
      throw new Error('Offer not found');
    }

    if (offer.waitlistEntryId !== waitlistEntryId) {
      throw new Error('Offer does not belong to this waitlist entry');
    }

    if (offer.status !== 'PENDING') {
      throw new Error('Offer is no longer pending');
    }

    if (new Date() > offer.expiresAt) {
      throw new Error('Offer has expired');
    }

    // Update offer status
    await prisma.waitlistOffer.update({
      where: { id: offerId },
      data: {
        status: 'ACCEPTED',
        respondedAt: new Date(),
      },
    });

    // Update waitlist entry
    await prisma.waitlistEntry.update({
      where: { id: waitlistEntryId },
      data: {
        status: 'MATCHED',
      },
    });

    // Send confirmation
    await waitlistNotificationService.sendOfferAcceptedNotification(
      waitlistEntryId,
      {
        clinicianName: `${offer.clinician.firstName} ${offer.clinician.lastName}`,
        appointmentDate: offer.appointmentDate,
        startTime: offer.startTime,
        endTime: offer.endTime,
      }
    );

    auditLogger.info('Waitlist offer accepted', {
      waitlistEntryId,
      offerId,
      clientId: offer.waitlistEntry.clientId,
      action: 'OFFER_ACCEPTED',
    });

    return offer;
  } catch (error) {
    logger.error('Error accepting offer', {
      error: error instanceof Error ? error.message : 'Unknown error',
      waitlistEntryId,
      offerId,
    });
    throw error;
  }
}

/**
 * Module 7: Decline offered slot
 */
export async function declineOffer(
  waitlistEntryId: string,
  offerId: string,
  reason?: string
): Promise<void> {
  try {
    const offer = await prisma.waitlistOffer.findUnique({
      where: { id: offerId },
      include: {
        waitlistEntry: true,
      },
    });

    if (!offer) {
      throw new Error('Offer not found');
    }

    if (offer.waitlistEntryId !== waitlistEntryId) {
      throw new Error('Offer does not belong to this waitlist entry');
    }

    if (offer.status !== 'PENDING') {
      throw new Error('Offer is no longer pending');
    }

    // Update offer status
    await prisma.waitlistOffer.update({
      where: { id: offerId },
      data: {
        status: 'DECLINED',
        respondedAt: new Date(),
        declineReason: reason,
      },
    });

    // Update waitlist entry (increment declined count, keep status ACTIVE)
    await prisma.waitlistEntry.update({
      where: { id: waitlistEntryId },
      data: {
        declinedOffers: { increment: 1 },
      },
    });

    // Send acknowledgment
    await waitlistNotificationService.sendOfferDeclinedNotification(waitlistEntryId);

    auditLogger.info('Waitlist offer declined', {
      waitlistEntryId,
      offerId,
      reason,
      action: 'OFFER_DECLINED',
    });

    // Try to offer to next highest match
    const nextMatches = await findMatches({
      clinicianId: offer.clinicianId,
      date: offer.appointmentDate,
      time: offer.startTime,
      appointmentType: offer.appointmentType,
    });

    if (nextMatches.length > 0) {
      // Offer to next person
      await offerSlot(
        nextMatches[0].id,
        {
          clinicianId: offer.clinicianId,
          date: offer.appointmentDate,
          time: offer.startTime,
          endTime: offer.endTime,
          appointmentType: offer.appointmentType,
        },
        24 * 60 * 60 * 1000
      );
    }
  } catch (error) {
    logger.error('Error declining offer', {
      error: error instanceof Error ? error.message : 'Unknown error',
      waitlistEntryId,
      offerId,
    });
    throw error;
  }
}

/**
 * Module 7: Expire old offers
 * Called by cron job to mark expired offers
 */
export async function expireOldOffers(): Promise<number> {
  try {
    const now = new Date();

    const result = await prisma.waitlistOffer.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: {
          lt: now,
        },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    if (result.count > 0) {
      auditLogger.info('Expired old waitlist offers', {
        count: result.count,
        action: 'OFFERS_EXPIRED',
      });
    }

    return result.count;
  } catch (error) {
    logger.error('Error expiring old offers', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
