import logger, { auditLogger } from '../utils/logger';
import prisma from './database';

/**
 * Module 7: Waitlist Notification Service
 * Handles all notifications related to waitlist management
 */

interface WaitlistNotificationData {
  clientId: string;
  clientEmail: string;
  clientPhone?: string;
  clientName: string;
  notificationType: 'WAITLIST_CONFIRMATION' | 'MATCH_FOUND' | 'POSITION_UPDATE' | 'EXPIRATION_WARNING' | 'APPOINTMENT_BOOKED';
  data?: any;
}

/**
 * Send waitlist confirmation notification
 * Sent when client first joins the waitlist
 */
export async function sendWaitlistConfirmation(
  waitlistEntryId: string
): Promise<void> {
  try {
    const entry = await prisma.waitlistEntry.findUnique({
      where: { id: waitlistEntryId },
      include: {
        client: true,
        clinician: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!entry) {
      throw new Error('Waitlist entry not found');
    }

    const notification = {
      subject: 'Waitlist Confirmation - MentalSpace',
      message: `
Hello ${entry.client.firstName},

You have been successfully added to our waitlist.

Waitlist Details:
- Preferred Clinician: ${entry.clinician ? `${entry.clinician.firstName} ${entry.clinician.lastName}` : 'Any available clinician'}
- Appointment Type: ${entry.appointmentType}
- Preferred Days: ${entry.preferredDays.join(', ')}
- Preferred Times: ${entry.preferredTimes.join(', ')}
- Priority Level: ${entry.priority}

We will notify you as soon as a matching appointment slot becomes available. You can expect to hear from us within the next few days.

If you have any questions or need to update your preferences, please contact us.

Best regards,
MentalSpace Team
      `.trim(),
    };

    // TODO: Integrate with actual email/SMS service
    logger.info('Waitlist confirmation notification prepared', {
      waitlistEntryId,
      clientId: entry.clientId,
      clientEmail: entry.client.email,
    });

    auditLogger.info('Waitlist confirmation sent', {
      waitlistEntryId,
      clientId: entry.clientId,
      action: 'WAITLIST_CONFIRMATION_SENT',
    });

    // Update notification count
    await prisma.waitlistEntry.update({
      where: { id: waitlistEntryId },
      data: {
        notificationsSent: { increment: 1 },
        lastNotifiedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Failed to send waitlist confirmation', {
      error: error instanceof Error ? error.message : 'Unknown error',
      waitlistEntryId,
    });
    throw error;
  }
}

/**
 * Send match found notification with booking link
 * Sent when a matching slot is found
 */
export async function sendMatchFoundNotification(
  waitlistEntryId: string,
  matchedSlotData: {
    clinicianName: string;
    appointmentDate: Date;
    startTime: string;
    endTime: string;
    matchScore: number;
    bookingUrl?: string;
  }
): Promise<void> {
  try {
    const entry = await prisma.waitlistEntry.findUnique({
      where: { id: waitlistEntryId },
      include: {
        client: true,
      },
    });

    if (!entry) {
      throw new Error('Waitlist entry not found');
    }

    const formattedDate = matchedSlotData.appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const notification = {
      subject: 'Appointment Slot Available - MentalSpace',
      message: `
Hello ${entry.client.firstName},

Great news! We found an appointment slot that matches your preferences.

Appointment Details:
- Clinician: ${matchedSlotData.clinicianName}
- Date: ${formattedDate}
- Time: ${matchedSlotData.startTime} - ${matchedSlotData.endTime}
- Match Quality: ${(matchedSlotData.matchScore * 100).toFixed(0)}%

This slot matches your preferences for:
- ${entry.preferredDays.join(', ')}
- ${entry.preferredTimes.join(', ')}

${matchedSlotData.bookingUrl ? `Click here to book this appointment: ${matchedSlotData.bookingUrl}` : 'Please contact us to book this appointment.'}

This offer is valid for the next 24 hours. After that, the slot may be offered to another client on the waitlist.

If this time doesn't work for you, you'll remain on the waitlist and we'll notify you when other slots become available.

Best regards,
MentalSpace Team
      `.trim(),
    };

    // TODO: Integrate with actual email/SMS service
    logger.info('Match found notification prepared', {
      waitlistEntryId,
      clientId: entry.clientId,
      matchScore: matchedSlotData.matchScore,
    });

    auditLogger.info('Match found notification sent', {
      waitlistEntryId,
      clientId: entry.clientId,
      appointmentDate: matchedSlotData.appointmentDate,
      action: 'MATCH_FOUND_NOTIFICATION_SENT',
    });

    // Update notification tracking
    await prisma.waitlistEntry.update({
      where: { id: waitlistEntryId },
      data: {
        notificationsSent: { increment: 1 },
        lastNotifiedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Failed to send match found notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
      waitlistEntryId,
    });
    throw error;
  }
}

/**
 * Send position update notification (weekly digest)
 * Sent weekly to keep clients informed of their position
 */
export async function sendPositionUpdateNotification(
  waitlistEntryId: string,
  position: number,
  totalEntries: number
): Promise<void> {
  try {
    const entry = await prisma.waitlistEntry.findUnique({
      where: { id: waitlistEntryId },
      include: {
        client: true,
      },
    });

    if (!entry) {
      throw new Error('Waitlist entry not found');
    }

    // Only send if at least 7 days since last notification
    if (entry.lastNotifiedAt) {
      const daysSinceLastNotification =
        (Date.now() - entry.lastNotifiedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastNotification < 7) {
        logger.debug('Skipping position update - too recent', {
          waitlistEntryId,
          daysSinceLastNotification,
        });
        return;
      }
    }

    const daysWaiting = Math.floor(
      (Date.now() - new Date(entry.joinedAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    const notification = {
      subject: 'Waitlist Position Update - MentalSpace',
      message: `
Hello ${entry.client.firstName},

This is your weekly waitlist update.

Current Status:
- Position: ${position} of ${totalEntries}
- Days on waitlist: ${daysWaiting}
- Priority Level: ${entry.priority}

We're actively working to find an appointment slot that matches your preferences. You'll receive an immediate notification when a suitable slot becomes available.

Preferences on file:
- Preferred Days: ${entry.preferredDays.join(', ')}
- Preferred Times: ${entry.preferredTimes.join(', ')}

If you'd like to update your preferences or have any questions, please contact us.

Thank you for your patience.

Best regards,
MentalSpace Team
      `.trim(),
    };

    // TODO: Integrate with actual email/SMS service
    logger.info('Position update notification prepared', {
      waitlistEntryId,
      position,
      totalEntries,
    });

    auditLogger.info('Position update notification sent', {
      waitlistEntryId,
      clientId: entry.clientId,
      position,
      action: 'POSITION_UPDATE_NOTIFICATION_SENT',
    });

    // Update notification tracking
    await prisma.waitlistEntry.update({
      where: { id: waitlistEntryId },
      data: {
        notificationsSent: { increment: 1 },
        lastNotifiedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Failed to send position update notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
      waitlistEntryId,
    });
    throw error;
  }
}

/**
 * Send expiration warning notification
 * Sent 24 hours before waitlist entry expires
 */
export async function sendExpirationWarning(
  waitlistEntryId: string
): Promise<void> {
  try {
    const entry = await prisma.waitlistEntry.findUnique({
      where: { id: waitlistEntryId },
      include: {
        client: true,
      },
    });

    if (!entry || !entry.expiresAt) {
      return;
    }

    const hoursUntilExpiration =
      (entry.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);

    // Only send if within 24-48 hours of expiration
    if (hoursUntilExpiration > 48 || hoursUntilExpiration < 0) {
      return;
    }

    const notification = {
      subject: 'Waitlist Entry Expiring Soon - MentalSpace',
      message: `
Hello ${entry.client.firstName},

This is a reminder that your waitlist entry will expire in approximately ${Math.round(hoursUntilExpiration)} hours.

After expiration, you'll need to rejoin the waitlist if you still need an appointment.

To keep your place on the waitlist:
1. Contact us to confirm you still need an appointment
2. Update your preferences if needed

We're actively searching for appointment slots that match your preferences.

If you have any questions, please reach out to us.

Best regards,
MentalSpace Team
      `.trim(),
    };

    // TODO: Integrate with actual email/SMS service
    logger.info('Expiration warning notification prepared', {
      waitlistEntryId,
      hoursUntilExpiration,
    });

    auditLogger.info('Expiration warning notification sent', {
      waitlistEntryId,
      clientId: entry.clientId,
      action: 'EXPIRATION_WARNING_SENT',
    });

    // Update notification tracking
    await prisma.waitlistEntry.update({
      where: { id: waitlistEntryId },
      data: {
        notificationsSent: { increment: 1 },
        lastNotifiedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Failed to send expiration warning', {
      error: error instanceof Error ? error.message : 'Unknown error',
      waitlistEntryId,
    });
    throw error;
  }
}

/**
 * Send appointment booked confirmation
 * Sent when client books an appointment from waitlist
 */
export async function sendAppointmentBookedNotification(
  waitlistEntryId: string,
  appointmentData: {
    clinicianName: string;
    appointmentDate: Date;
    startTime: string;
    endTime: string;
  }
): Promise<void> {
  try {
    const entry = await prisma.waitlistEntry.findUnique({
      where: { id: waitlistEntryId },
      include: {
        client: true,
      },
    });

    if (!entry) {
      throw new Error('Waitlist entry not found');
    }

    const formattedDate = appointmentData.appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const notification = {
      subject: 'Appointment Confirmed - MentalSpace',
      message: `
Hello ${entry.client.firstName},

Your appointment has been successfully booked!

Appointment Details:
- Clinician: ${appointmentData.clinicianName}
- Date: ${formattedDate}
- Time: ${appointmentData.startTime} - ${appointmentData.endTime}

You have been removed from the waitlist. You'll receive a reminder notification before your appointment.

If you need to reschedule or cancel, please contact us as soon as possible.

We look forward to seeing you!

Best regards,
MentalSpace Team
      `.trim(),
    };

    // TODO: Integrate with actual email/SMS service
    logger.info('Appointment booked notification prepared', {
      waitlistEntryId,
      clientId: entry.clientId,
    });

    auditLogger.info('Appointment booked notification sent', {
      waitlistEntryId,
      clientId: entry.clientId,
      action: 'APPOINTMENT_BOOKED_NOTIFICATION_SENT',
    });

    // Final notification count update
    await prisma.waitlistEntry.update({
      where: { id: waitlistEntryId },
      data: {
        notificationsSent: { increment: 1 },
        lastNotifiedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Failed to send appointment booked notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
      waitlistEntryId,
    });
    throw error;
  }
}

/**
 * Send batch position updates (weekly digest)
 * Called by cron job to send weekly updates to all active waitlist members
 */
export async function sendWeeklyPositionUpdates(): Promise<{
  sent: number;
  errors: number;
}> {
  try {
    const activeEntries = await prisma.waitlistEntry.findMany({
      where: {
        status: 'ACTIVE',
      },
      orderBy: [
        { priority: 'desc' },
        { joinedAt: 'asc' },
      ],
    });

    let sent = 0;
    let errors = 0;

    for (let i = 0; i < activeEntries.length; i++) {
      try {
        await sendPositionUpdateNotification(
          activeEntries[i].id,
          i + 1,
          activeEntries.length
        );
        sent++;
      } catch (error) {
        errors++;
        logger.error('Error sending position update', {
          waitlistEntryId: activeEntries[i].id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    auditLogger.info('Weekly position updates completed', {
      sent,
      errors,
      total: activeEntries.length,
      action: 'WEEKLY_POSITION_UPDATES_COMPLETED',
    });

    return { sent, errors };
  } catch (error) {
    logger.error('Failed to send weekly position updates', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Check for expiring entries and send warnings
 * Called by cron job daily
 */
export async function checkExpiringEntries(): Promise<{
  sent: number;
  expired: number;
}> {
  try {
    const now = new Date();
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Find entries expiring in next 48 hours
    const expiringEntries = await prisma.waitlistEntry.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          gte: now,
          lte: in48Hours,
        },
      },
    });

    let sent = 0;
    for (const entry of expiringEntries) {
      try {
        await sendExpirationWarning(entry.id);
        sent++;
      } catch (error) {
        logger.error('Error sending expiration warning', {
          waitlistEntryId: entry.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Mark expired entries
    const expiredResult = await prisma.waitlistEntry.updateMany({
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

    auditLogger.info('Expiration check completed', {
      warningsSent: sent,
      entriesExpired: expiredResult.count,
      action: 'EXPIRATION_CHECK_COMPLETED',
    });

    return {
      sent,
      expired: expiredResult.count,
    };
  } catch (error) {
    logger.error('Failed to check expiring entries', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Module 7: Send slot offer notification
 * Sent when an appointment slot becomes available and is offered to client
 */
export async function sendSlotOfferNotification(
  waitlistEntryId: string,
  offerId: string,
  slotDetails: {
    clinicianId: string;
    date: Date;
    time: string;
    endTime: string;
    appointmentType: string;
  },
  expiresAt: Date
): Promise<void> {
  try {
    const entry = await prisma.waitlistEntry.findUnique({
      where: { id: waitlistEntryId },
      include: {
        client: true,
        clinician: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!entry) {
      throw new Error('Waitlist entry not found');
    }

    const clinician = await prisma.user.findUnique({
      where: { id: slotDetails.clinicianId },
      select: {
        firstName: true,
        lastName: true,
      },
    });

    const formattedDate = slotDetails.date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const hoursUntilExpiration = Math.round(
      (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)
    );

    const acceptUrl = `${process.env.FRONTEND_URL}/waitlist/offers/${offerId}/accept`;
    const declineUrl = `${process.env.FRONTEND_URL}/waitlist/offers/${offerId}/decline`;

    const notification = {
      subject: 'Appointment Slot Available - Action Required',
      message: `
Hello ${entry.client.firstName},

Great news! An appointment slot matching your preferences is now available.

Appointment Details:
- Clinician: ${clinician ? `${clinician.firstName} ${clinician.lastName}` : 'Unknown'}
- Date: ${formattedDate}
- Time: ${slotDetails.time} - ${slotDetails.endTime}
- Type: ${slotDetails.appointmentType}

IMPORTANT: This offer expires in ${hoursUntilExpiration} hours
Deadline: ${expiresAt.toLocaleString()}

To claim this appointment:
${acceptUrl}

If this time doesn't work:
${declineUrl}

You will remain on the waitlist if you decline, and we'll notify you when other slots become available.

Best regards,
MentalSpace Team
      `.trim(),
    };

    // TODO: Integrate with actual email/SMS service
    logger.info('Slot offer notification prepared', {
      waitlistEntryId,
      offerId,
      clientEmail: entry.client.email,
      expiresAt,
    });

    auditLogger.info('Slot offer notification sent', {
      waitlistEntryId,
      offerId,
      clientId: entry.clientId,
      action: 'SLOT_OFFER_SENT',
    });
  } catch (error) {
    logger.error('Failed to send slot offer notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
      waitlistEntryId,
      offerId,
    });
    throw error;
  }
}

/**
 * Module 7: Send offer accepted notification
 * Sent when client accepts an offered slot
 */
export async function sendOfferAcceptedNotification(
  waitlistEntryId: string,
  appointmentData: {
    clinicianName: string;
    appointmentDate: Date;
    startTime: string;
    endTime: string;
  }
): Promise<void> {
  try {
    const entry = await prisma.waitlistEntry.findUnique({
      where: { id: waitlistEntryId },
      include: {
        client: true,
      },
    });

    if (!entry) {
      throw new Error('Waitlist entry not found');
    }

    const formattedDate = appointmentData.appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const notification = {
      subject: 'Appointment Confirmed - MentalSpace',
      message: `
Hello ${entry.client.firstName},

Your appointment has been successfully confirmed!

Appointment Details:
- Clinician: ${appointmentData.clinicianName}
- Date: ${formattedDate}
- Time: ${appointmentData.startTime} - ${appointmentData.endTime}

You have been removed from the waitlist. You will receive a reminder before your appointment.

If you need to reschedule or cancel, please contact us as soon as possible.

We look forward to seeing you!

Best regards,
MentalSpace Team
      `.trim(),
    };

    logger.info('Offer accepted notification prepared', {
      waitlistEntryId,
      clientEmail: entry.client.email,
    });

    auditLogger.info('Offer accepted notification sent', {
      waitlistEntryId,
      clientId: entry.clientId,
      action: 'OFFER_ACCEPTED_NOTIFICATION_SENT',
    });
  } catch (error) {
    logger.error('Failed to send offer accepted notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
      waitlistEntryId,
    });
    throw error;
  }
}

/**
 * Module 7: Send offer declined notification
 * Sent when client declines an offered slot
 */
export async function sendOfferDeclinedNotification(
  waitlistEntryId: string
): Promise<void> {
  try {
    const entry = await prisma.waitlistEntry.findUnique({
      where: { id: waitlistEntryId },
      include: {
        client: true,
      },
    });

    if (!entry) {
      throw new Error('Waitlist entry not found');
    }

    const notification = {
      subject: 'Waitlist Status Update - MentalSpace',
      message: `
Hello ${entry.client.firstName},

Thank you for your response to the appointment offer.

Your Status:
- You remain on our active waitlist
- Current Priority Level: ${entry.priority}
- We will continue searching for appointment slots that match your preferences

We'll notify you as soon as another suitable appointment becomes available.

If you'd like to update your preferences or have any questions, please contact us.

Best regards,
MentalSpace Team
      `.trim(),
    };

    logger.info('Offer declined notification prepared', {
      waitlistEntryId,
      clientEmail: entry.client.email,
    });

    auditLogger.info('Offer declined notification sent', {
      waitlistEntryId,
      clientId: entry.clientId,
      action: 'OFFER_DECLINED_NOTIFICATION_SENT',
    });
  } catch (error) {
    logger.error('Failed to send offer declined notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
      waitlistEntryId,
    });
    throw error;
  }
}

/**
 * Module 7: Send expired entry notification
 * Sent when a waitlist entry expires
 */
export async function sendExpiredNotification(waitlistEntryId: string): Promise<void> {
  try {
    const entry = await prisma.waitlistEntry.findUnique({
      where: { id: waitlistEntryId },
      include: {
        client: true,
      },
    });

    if (!entry) {
      return;
    }

    const notification = {
      subject: 'Waitlist Entry Expired - MentalSpace',
      message: `
Hello ${entry.client.firstName},

Your waitlist entry has expired as of today.

If you still need an appointment, you can:
1. Rejoin the waitlist through the client portal
2. Contact us directly to schedule

We're here to help. Please don't hesitate to reach out.

Best regards,
MentalSpace Team
      `.trim(),
    };

    logger.info('Expired entry notification prepared', {
      waitlistEntryId,
      clientEmail: entry.client.email,
    });

    auditLogger.info('Expired entry notification sent', {
      waitlistEntryId,
      clientId: entry.clientId,
      action: 'EXPIRED_NOTIFICATION_SENT',
    });
  } catch (error) {
    logger.error('Failed to send expired notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
      waitlistEntryId,
    });
  }
}
