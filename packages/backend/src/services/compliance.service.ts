import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import { sendEmail } from './email.service';

const prisma = new PrismaClient();

// Compliance Configuration (can be moved to database later)
const COMPLIANCE_CONFIG = {
  noteDueDays: 3, // Notes must be completed within 3 days of session
  lockoutDay: 'Sunday', // Day of week to lock notes
  lockoutTime: '23:59:59', // Time to lock notes
  gracePeriodHours: 0, // Optional grace period
  reminderDays: [2, 1, 0], // Send reminders 2 days before, 1 day before, day of
};

/**
 * Calculate if a note is overdue based on session date
 */
export function isNoteOverdue(sessionDate: Date, signedDate: Date | null): boolean {
  if (signedDate) return false; // Note is signed, not overdue

  const now = new Date();
  const daysSinceSession = Math.floor((now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

  return daysSinceSession > COMPLIANCE_CONFIG.noteDueDays;
}

/**
 * Calculate due date for a note
 */
export function calculateNoteDueDate(sessionDate: Date): Date {
  const dueDate = new Date(sessionDate);
  dueDate.setDate(dueDate.getDate() + COMPLIANCE_CONFIG.noteDueDays);
  return dueDate;
}

/**
 * Get the next Sunday at 11:59:59 PM
 */
function getNextSundayLockout(): Date {
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7; // 0 = Sunday, so if today is Sunday, get next Sunday
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + daysUntilSunday);
  nextSunday.setHours(23, 59, 59, 999);
  return nextSunday;
}

/**
 * Sunday Lockout: Lock all unsigned notes that are past due
 * Runs every Sunday at 11:59:59 PM
 */
export async function sundayLockout() {
  console.log('🔒 Running Sunday Lockout...');

  try {
    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - COMPLIANCE_CONFIG.noteDueDays);

    // Find all notes that should be locked
    const notesToLock = await prisma.clinicalNote.findMany({
      where: {
        status: {
          in: ['DRAFT', 'PENDING_COSIGN'], // Only lock unsigned or pending notes
        },
        signedDate: null,
        sessionDate: {
          lt: cutoffDate, // Session date is more than 3 days ago
        },
        isLocked: false, // Not already locked
      },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            supervisorId: true,
            supervisor: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    console.log(`Found ${notesToLock.length} notes to lock`);

    // Lock each note and send notifications
    for (const note of notesToLock) {
      const daysSinceSession = Math.floor((now.getTime() - new Date(note.sessionDate).getTime()) / (1000 * 60 * 60 * 24));

      // Lock the note
      await prisma.clinicalNote.update({
        where: { id: note.id },
        data: {
          isLocked: true,
          lockedDate: now,
          lockReason: `Automatically locked on Sunday due to note being ${daysSinceSession} days overdue (session date: ${new Date(note.sessionDate).toLocaleDateString()})`,
        },
      });

      // Create compliance alert
      await prisma.complianceAlert.create({
        data: {
          alertType: 'UNSIGNED_NOTE',
          severity: 'CRITICAL',
          targetUserId: note.clinicianId,
          supervisorId: note.clinician.supervisorId || undefined,
          message: `Clinical note locked: ${note.noteType} for client ${note.client.firstName} ${note.client.lastName}`,
          actionRequired: `Complete and sign the note, then request unlock from supervisor/administrator`,
          metadata: {
            noteId: note.id,
            clientId: note.clientId,
            sessionDate: note.sessionDate,
            daysSinceSession,
            lockedDate: now,
          },
        },
      });

      // Send email to clinician
      await sendEmail({
        to: note.clinician.email,
        subject: '🔒 Clinical Note Locked - Action Required',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Clinical Note Locked</h2>
            <p>Dear ${note.clinician.firstName} ${note.clinician.lastName},</p>
            <p>A clinical note has been automatically locked due to being past the documentation deadline.</p>

            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 16px 0;">
              <strong>Note Details:</strong><br>
              <strong>Note Type:</strong> ${note.noteType}<br>
              <strong>Client:</strong> ${note.client.firstName} ${note.client.lastName}<br>
              <strong>Session Date:</strong> ${new Date(note.sessionDate).toLocaleDateString()}<br>
              <strong>Days Since Session:</strong> ${daysSinceSession} days<br>
              <strong>Due Date:</strong> ${calculateNoteDueDate(new Date(note.sessionDate)).toLocaleDateString()}<br>
              <strong>Locked Date:</strong> ${now.toLocaleDateString()}
            </div>

            <p><strong>Action Required:</strong></p>
            <ul>
              <li>Complete and sign the clinical note</li>
              <li>Request unlock from your supervisor or administrator</li>
              <li>Provide explanation for late completion</li>
            </ul>

            <p><strong>To Request Unlock:</strong></p>
            <ol>
              <li>Log into the EHR system</li>
              <li>Navigate to the locked note</li>
              <li>Click "Request Unlock"</li>
              <li>Provide explanation for the delay</li>
            </ol>

            <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
              This is an automated compliance notification from MentalSpace EHR.<br>
              Georgia requires clinical notes to be completed within ${COMPLIANCE_CONFIG.noteDueDays} days of the session.
            </p>
          </div>
        `,
      });

      // Send email to supervisor if clinician has one
      if (note.clinician.supervisor) {
        await sendEmail({
          to: note.clinician.supervisor.email,
          subject: `⚠️ Supervisee Note Locked - ${note.clinician.firstName} ${note.clinician.lastName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Supervisee Note Locked</h2>
              <p>Dear ${note.clinician.supervisor.firstName} ${note.clinician.supervisor.lastName},</p>
              <p>A clinical note by your supervisee has been automatically locked for non-compliance.</p>

              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 16px 0;">
                <strong>Supervisee:</strong> ${note.clinician.firstName} ${note.clinician.lastName}<br>
                <strong>Note Type:</strong> ${note.noteType}<br>
                <strong>Client:</strong> ${note.client.firstName} ${note.client.lastName}<br>
                <strong>Session Date:</strong> ${new Date(note.sessionDate).toLocaleDateString()}<br>
                <strong>Days Overdue:</strong> ${daysSinceSession - COMPLIANCE_CONFIG.noteDueDays} days
              </div>

              <p>Please follow up with your supervisee to ensure timely documentation compliance.</p>
            </div>
          `,
        });
      }

      console.log(`✅ Locked note ${note.id} for ${note.clinician.firstName} ${note.clinician.lastName}`);
    }

    console.log(`🔒 Sunday Lockout Complete: ${notesToLock.length} notes locked`);
    return { locked: notesToLock.length, notes: notesToLock };

  } catch (error) {
    console.error('❌ Error during Sunday Lockout:', error);
    throw error;
  }
}

/**
 * Send reminder emails for notes approaching due date
 */
export async function sendNoteReminders() {
  console.log('📧 Sending note reminders...');

  try {
    const now = new Date();

    // Check for notes due in 2 days, 1 day, or today
    for (const daysUntilDue of COMPLIANCE_CONFIG.reminderDays) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - COMPLIANCE_CONFIG.noteDueDays + daysUntilDue);
      targetDate.setHours(0, 0, 0, 0);

      const targetDateEnd = new Date(targetDate);
      targetDateEnd.setHours(23, 59, 59, 999);

      const notesApproachingDue = await prisma.clinicalNote.findMany({
        where: {
          status: {
            in: ['DRAFT', 'PENDING_COSIGN'],
          },
          signedDate: null,
          sessionDate: {
            gte: targetDate,
            lte: targetDateEnd,
          },
          isLocked: false,
        },
        include: {
          clinician: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
              noteReminders: true,
            },
          },
          client: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      for (const note of notesApproachingDue) {
        // Only send if clinician has reminders enabled
        if (!note.clinician.noteReminders) continue;

        const dueDate = calculateNoteDueDate(new Date(note.sessionDate));
        const urgency = daysUntilDue === 0 ? 'TODAY' : daysUntilDue === 1 ? 'TOMORROW' : `in ${daysUntilDue} days`;

        await sendEmail({
          to: note.clinician.email,
          subject: `⏰ Clinical Note Due ${urgency === 'TODAY' ? 'Today' : urgency === 'TOMORROW' ? 'Tomorrow' : urgency}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: ${daysUntilDue === 0 ? '#dc2626' : '#f59e0b'};">Clinical Note Due ${urgency === 'TODAY' ? 'Today' : urgency}</h2>
              <p>Dear ${note.clinician.firstName} ${note.clinician.lastName},</p>
              <p>This is a reminder that you have a clinical note due ${urgency}.</p>

              <div style="background-color: ${daysUntilDue === 0 ? '#fef2f2' : '#fef3c7'}; border-left: 4px solid ${daysUntilDue === 0 ? '#dc2626' : '#f59e0b'}; padding: 16px; margin: 16px 0;">
                <strong>Note Type:</strong> ${note.noteType}<br>
                <strong>Client:</strong> ${note.client.firstName} ${note.client.lastName}<br>
                <strong>Session Date:</strong> ${new Date(note.sessionDate).toLocaleDateString()}<br>
                <strong>Due Date:</strong> ${dueDate.toLocaleDateString()}<br>
                ${daysUntilDue === 0 ? '<strong style="color: #dc2626;">⚠️ This note will be locked tonight at 11:59 PM if not completed!</strong>' : ''}
              </div>

              <p>Please log in to complete and sign this note before the deadline.</p>
            </div>
          `,
        });
      }

      console.log(`Sent ${notesApproachingDue.length} reminders for notes due ${urgency}`);
    }

  } catch (error) {
    console.error('❌ Error sending note reminders:', error);
  }
}

/**
 * Initialize cron jobs for compliance
 */
export function initializeComplianceCronJobs() {
  console.log('⏰ Initializing compliance cron jobs...');

  // Sunday Lockout: Every Sunday at 11:59 PM
  // Cron format: second minute hour day-of-month month day-of-week
  cron.schedule('59 23 * * 0', async () => {
    console.log('🔒 Running scheduled Sunday Lockout...');
    await sundayLockout();
  }, {
    timezone: 'America/New_York', // Adjust to your practice timezone
  });

  console.log('✅ Sunday Lockout scheduled: Every Sunday at 11:59 PM EST');

  // Daily reminder check: Every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('📧 Running daily reminder check...');
    await sendNoteReminders();
  }, {
    timezone: 'America/New_York',
  });

  console.log('✅ Daily reminders scheduled: Every day at 9:00 AM EST');

  // For testing: Run lockout check every hour (commented out for production)
  // cron.schedule('0 * * * *', async () => {
  //   console.log('🔒 Running hourly lockout check (TEST MODE)...');
  //   await sundayLockout();
  // });
}

/**
 * Manual trigger for testing Sunday Lockout
 */
export async function triggerSundayLockoutManually() {
  console.log('🔒 Manually triggering Sunday Lockout...');
  return await sundayLockout();
}

/**
 * Get compliance statistics
 */
export async function getComplianceStats() {
  const now = new Date();
  const cutoffDate = new Date(now);
  cutoffDate.setDate(cutoffDate.getDate() - COMPLIANCE_CONFIG.noteDueDays);

  const [
    totalUnsignedNotes,
    overdueNotes,
    lockedNotes,
    dueToday,
    dueTomorrow,
  ] = await Promise.all([
    // Total unsigned notes
    prisma.clinicalNote.count({
      where: {
        signedDate: null,
        status: { in: ['DRAFT', 'PENDING_COSIGN'] },
      },
    }),
    // Overdue notes (not locked yet)
    prisma.clinicalNote.count({
      where: {
        signedDate: null,
        sessionDate: { lt: cutoffDate },
        isLocked: false,
        status: { in: ['DRAFT', 'PENDING_COSIGN'] },
      },
    }),
    // Locked notes
    prisma.clinicalNote.count({
      where: {
        isLocked: true,
      },
    }),
    // Due today
    prisma.clinicalNote.count({
      where: {
        signedDate: null,
        sessionDate: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - COMPLIANCE_CONFIG.noteDueDays),
          lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - COMPLIANCE_CONFIG.noteDueDays + 1),
        },
        isLocked: false,
        status: { in: ['DRAFT', 'PENDING_COSIGN'] },
      },
    }),
    // Due tomorrow
    prisma.clinicalNote.count({
      where: {
        signedDate: null,
        sessionDate: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - COMPLIANCE_CONFIG.noteDueDays + 1),
          lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - COMPLIANCE_CONFIG.noteDueDays + 2),
        },
        isLocked: false,
        status: { in: ['DRAFT', 'PENDING_COSIGN'] },
      },
    }),
  ]);

  return {
    totalUnsignedNotes,
    overdueNotes,
    lockedNotes,
    dueToday,
    dueTomorrow,
    nextLockout: getNextSundayLockout(),
    config: COMPLIANCE_CONFIG,
  };
}
