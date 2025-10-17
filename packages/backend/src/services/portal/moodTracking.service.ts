import { PrismaClient } from '@mentalspace/database';
import { AppError } from '../../utils/errors';
import logger from '../../utils/logger';

const prisma = new PrismaClient();

// ============================================================================
// MOOD ENTRIES (Client-side)
// ============================================================================

export async function createMoodEntry(data: {
  clientId: string;
  moodScore: number;
  timeOfDay: 'MORNING' | 'AFTERNOON' | 'EVENING';
  symptoms?: string[];
  customMetrics?: Record<string, number>;
  notes?: string;
  sharedWithClinician?: boolean;
}) {
  try {
    // Validate mood score (1-10)
    if (data.moodScore < 1 || data.moodScore > 10) {
      throw new AppError('Mood score must be between 1 and 10', 400);
    }

    // Create mood entry
    const entry = await prisma.moodEntry.create({
      data: {
        clientId: data.clientId,
        entryDate: new Date(),
        timeOfDay: data.timeOfDay,
        moodScore: data.moodScore,
        symptoms: data.symptoms || [],
        customMetrics: data.customMetrics || {},
        notes: data.notes,
        sharedWithClinician: data.sharedWithClinician ?? true, // Default to shared
      },
    });

    // Update engagement streak
    await updateEngagementStreak(data.clientId);

    logger.info(`Mood entry created for client ${data.clientId}, score: ${data.moodScore}`);

    // Alert therapist if mood is critically low (1-2) and client has crisis toolkit usage
    if (data.moodScore <= 2) {
      await checkForCrisisAlert(data.clientId, data.moodScore);
    }

    return entry;
  } catch (error) {
    logger.error('Error creating mood entry:', error);
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to create mood entry', 500);
  }
}

export async function getMoodEntries(data: {
  clientId: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  try {
    const where: any = { clientId: data.clientId };

    if (data.startDate || data.endDate) {
      where.entryDate = {};
      if (data.startDate) where.entryDate.gte = data.startDate;
      if (data.endDate) where.entryDate.lte = data.endDate;
    }

    const entries = await prisma.moodEntry.findMany({
      where,
      orderBy: { entryDate: 'desc' },
      take: data.limit || 100,
    });

    return entries;
  } catch (error) {
    logger.error('Error fetching mood entries:', error);
    throw new AppError('Failed to fetch mood entries', 500);
  }
}

export async function getMoodTrends(data: {
  clientId: string;
  days?: number;
}) {
  try {
    const days = data.days || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const entries = await prisma.moodEntry.findMany({
      where: {
        clientId: data.clientId,
        entryDate: { gte: startDate },
      },
      orderBy: { entryDate: 'asc' },
    });

    // Calculate statistics
    const totalEntries = entries.length;
    const avgMood = totalEntries > 0
      ? entries.reduce((sum, e) => sum + e.moodScore, 0) / totalEntries
      : 0;

    // Count symptom frequency
    const symptomCounts: Record<string, number> = {};
    entries.forEach((entry) => {
      entry.symptoms.forEach((symptom) => {
        symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
      });
    });

    // Identify patterns (e.g., mood by day of week)
    const moodByDayOfWeek: Record<number, number[]> = {};
    entries.forEach((entry) => {
      const dayOfWeek = entry.entryDate.getDay();
      if (!moodByDayOfWeek[dayOfWeek]) moodByDayOfWeek[dayOfWeek] = [];
      moodByDayOfWeek[dayOfWeek].push(entry.moodScore);
    });

    const avgMoodByDayOfWeek: Record<number, number> = {};
    Object.keys(moodByDayOfWeek).forEach((day) => {
      const dayNum = parseInt(day);
      const scores = moodByDayOfWeek[dayNum];
      avgMoodByDayOfWeek[dayNum] = scores.reduce((a, b) => a + b, 0) / scores.length;
    });

    return {
      totalEntries,
      avgMood: Math.round(avgMood * 10) / 10,
      entries,
      symptomCounts,
      avgMoodByDayOfWeek,
      bestDay: Object.keys(avgMoodByDayOfWeek).reduce((a, b) =>
        avgMoodByDayOfWeek[parseInt(a)] > avgMoodByDayOfWeek[parseInt(b)] ? a : b
      , '0'),
      worstDay: Object.keys(avgMoodByDayOfWeek).reduce((a, b) =>
        avgMoodByDayOfWeek[parseInt(a)] < avgMoodByDayOfWeek[parseInt(b)] ? a : b
      , '0'),
    };
  } catch (error) {
    logger.error('Error fetching mood trends:', error);
    throw new AppError('Failed to fetch mood trends', 500);
  }
}

export async function updateMoodSharing(data: {
  clientId: string;
  entryId: string;
  sharedWithClinician: boolean;
}) {
  try {
    const entry = await prisma.moodEntry.findFirst({
      where: {
        id: data.entryId,
        clientId: data.clientId,
      },
    });

    if (!entry) {
      throw new AppError('Mood entry not found', 404);
    }

    const updated = await prisma.moodEntry.update({
      where: { id: data.entryId },
      data: { sharedWithClinician: data.sharedWithClinician },
    });

    return updated;
  } catch (error) {
    logger.error('Error updating mood sharing:', error);
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update mood sharing', 500);
  }
}

// ============================================================================
// MOOD TRACKING (Therapist-side - EHR)
// ============================================================================

export async function getClientMoodData(data: {
  therapistId: string;
  clientId: string;
  days?: number;
}) {
  try {
    // Verify therapist has access to this client
    const client = await prisma.client.findFirst({
      where: {
        id: data.clientId,
        primaryTherapistId: data.therapistId,
      },
    });

    if (!client) {
      throw new AppError('Client not found or not assigned to this therapist', 404);
    }

    // Get mood entries shared with clinician
    const days = data.days || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const entries = await prisma.moodEntry.findMany({
      where: {
        clientId: data.clientId,
        sharedWithClinician: true,
        entryDate: { gte: startDate },
      },
      orderBy: { entryDate: 'asc' },
    });

    return entries;
  } catch (error) {
    logger.error('Error fetching client mood data:', error);
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch client mood data', 500);
  }
}

export async function getClientMoodSummary(data: {
  therapistId: string;
  clientId: string;
}) {
  try {
    // Verify access
    const client = await prisma.client.findFirst({
      where: {
        id: data.clientId,
        primaryTherapistId: data.therapistId,
      },
    });

    if (!client) {
      throw new AppError('Client not found or not assigned to this therapist', 404);
    }

    // Get last 7 days and last 30 days for comparison
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [recentEntries, monthEntries, latestEntry] = await Promise.all([
      prisma.moodEntry.findMany({
        where: {
          clientId: data.clientId,
          sharedWithClinician: true,
          entryDate: { gte: sevenDaysAgo },
        },
      }),
      prisma.moodEntry.findMany({
        where: {
          clientId: data.clientId,
          sharedWithClinician: true,
          entryDate: { gte: thirtyDaysAgo },
        },
      }),
      prisma.moodEntry.findFirst({
        where: {
          clientId: data.clientId,
          sharedWithClinician: true,
        },
        orderBy: { entryDate: 'desc' },
      }),
    ]);

    const avgRecentMood = recentEntries.length > 0
      ? recentEntries.reduce((sum, e) => sum + e.moodScore, 0) / recentEntries.length
      : null;

    const avgMonthMood = monthEntries.length > 0
      ? monthEntries.reduce((sum, e) => sum + e.moodScore, 0) / monthEntries.length
      : null;

    // Most common symptoms
    const symptomCounts: Record<string, number> = {};
    monthEntries.forEach((entry) => {
      entry.symptoms.forEach((symptom) => {
        symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
      });
    });

    const topSymptoms = Object.entries(symptomCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([symptom, count]) => ({ symptom, count }));

    return {
      latestMood: latestEntry?.moodScore || null,
      latestDate: latestEntry?.entryDate || null,
      avgRecentMood: avgRecentMood ? Math.round(avgRecentMood * 10) / 10 : null,
      avgMonthMood: avgMonthMood ? Math.round(avgMonthMood * 10) / 10 : null,
      entriesLast7Days: recentEntries.length,
      entriesLast30Days: monthEntries.length,
      topSymptoms,
      moodTrend: avgRecentMood && avgMonthMood
        ? avgRecentMood > avgMonthMood ? 'IMPROVING' : avgRecentMood < avgMonthMood ? 'DECLINING' : 'STABLE'
        : null,
    };
  } catch (error) {
    logger.error('Error fetching client mood summary:', error);
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch client mood summary', 500);
  }
}

// ============================================================================
// SYMPTOM TRACKING
// ============================================================================

export async function getStandardSymptoms() {
  try {
    const symptoms = await prisma.symptomDefinition.findMany({
      where: {
        symptomType: 'STANDARD',
        isActive: true,
      },
      orderBy: { symptomName: 'asc' },
    });

    return symptoms;
  } catch (error) {
    logger.error('Error fetching standard symptoms:', error);
    throw new AppError('Failed to fetch symptoms', 500);
  }
}

export async function getClientSymptomTrackers(clientId: string) {
  try {
    const trackers = await prisma.clientSymptomTracker.findMany({
      where: { clientId, isEnabled: true },
    });

    return trackers;
  } catch (error) {
    logger.error('Error fetching client symptom trackers:', error);
    throw new AppError('Failed to fetch symptom trackers', 500);
  }
}

// ============================================================================
// ENGAGEMENT STREAK
// ============================================================================

async function updateEngagementStreak(clientId: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get or create streak record
    let streak = await prisma.engagementStreak.findUnique({
      where: { clientId },
    });

    if (!streak) {
      streak = await prisma.engagementStreak.create({
        data: {
          clientId,
          currentStreak: 1,
          longestStreak: 1,
          lastCheckInDate: today,
          totalCheckIns: 1,
          milestonesAchieved: [],
        },
      });
    } else {
      const lastCheckIn = streak.lastCheckInDate
        ? new Date(streak.lastCheckInDate)
        : null;

      if (lastCheckIn) {
        lastCheckIn.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((today.getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff === 0) {
          // Already checked in today, no streak update
          return;
        } else if (daysDiff === 1) {
          // Consecutive day - increment streak
          const newStreak = streak.currentStreak + 1;
          const newLongest = Math.max(newStreak, streak.longestStreak);

          await prisma.engagementStreak.update({
            where: { clientId },
            data: {
              currentStreak: newStreak,
              longestStreak: newLongest,
              lastCheckInDate: today,
              totalCheckIns: streak.totalCheckIns + 1,
            },
          });

          // Check for milestones
          await checkMilestones(clientId, newStreak, 'STREAK');
        } else {
          // Streak broken - reset to 1
          await prisma.engagementStreak.update({
            where: { clientId },
            data: {
              currentStreak: 1,
              lastCheckInDate: today,
              totalCheckIns: streak.totalCheckIns + 1,
            },
          });
        }
      }
    }
  } catch (error) {
    logger.error('Error updating engagement streak:', error);
    // Don't throw - this is a nice-to-have feature
  }
}

async function checkMilestones(clientId: string, value: number, type: string) {
  const milestones = [7, 14, 30, 60, 90, 180, 365];

  if (milestones.includes(value)) {
    // Check if milestone already achieved
    const existing = await prisma.milestone.findFirst({
      where: {
        clientId,
        milestoneType: type,
        milestoneValue: value,
      },
    });

    if (!existing) {
      await prisma.milestone.create({
        data: {
          clientId,
          milestoneType: type,
          milestoneValue: value,
          badgeName: `${value} Day Streak!`,
          isViewed: false,
        },
      });

      logger.info(`Milestone achieved: ${clientId} - ${value} day streak`);
    }
  }
}

async function checkForCrisisAlert(clientId: string, moodScore: number) {
  try {
    // Check if client has used crisis toolkit in last 48 hours
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const recentUsage = await prisma.crisisToolkitUsage.count({
      where: {
        clientId,
        accessedAt: { gte: twoDaysAgo },
      },
    });

    if (recentUsage >= 3) {
      // High crisis toolkit usage + low mood = alert therapist
      logger.warn(`CRISIS ALERT: Client ${clientId} has mood score ${moodScore} and ${recentUsage} crisis toolkit uses in 48h`);
      // TODO: Create ComplianceAlert for therapist
    }
  } catch (error) {
    logger.error('Error checking for crisis alert:', error);
  }
}
