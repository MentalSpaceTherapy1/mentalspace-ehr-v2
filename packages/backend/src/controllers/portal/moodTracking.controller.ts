import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedPortalRequest } from '../../middleware/portalAuth';
import logger from '../../utils/logger';

const prisma = new PrismaClient();

/**
 * Create a new mood entry
 * POST /api/v1/portal/mood-entries
 */
export const createMoodEntry = async (req: AuthenticatedPortalRequest, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;
    const {
      moodScore,
      timeOfDay,
      notes,
      symptoms,
      customMetrics,
    } = req.body;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Validate required fields
    if (moodScore === undefined || moodScore === null) {
      return res.status(400).json({
        success: false,
        message: 'Mood score is required',
      });
    }

    // Validate mood score range (1-10)
    if (moodScore < 1 || moodScore > 10) {
      return res.status(400).json({
        success: false,
        message: 'Mood score must be between 1 and 10',
      });
    }

    // Create mood entry
    const moodEntry = await prisma.moodEntry.create({
      data: {
        clientId,
        moodScore,
        entryDate: new Date(),
        timeOfDay: timeOfDay || 'MORNING',
        notes,
        symptoms: symptoms || [],
        customMetrics: customMetrics || undefined,
      },
    });

    logger.info(`Mood entry created for client ${clientId}: score ${moodScore}`);

    return res.status(201).json({
      success: true,
      message: 'Mood entry created successfully',
      data: {
        id: moodEntry.id,
        moodScore: moodEntry.moodScore,
        entryDate: moodEntry.entryDate,
        timeOfDay: moodEntry.timeOfDay,
        notes: moodEntry.notes,
        symptoms: moodEntry.symptoms,
        customMetrics: moodEntry.customMetrics,
      },
    });
  } catch (error: any) {
    logger.error('Error creating mood entry:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create mood entry',
    });
  }
};

/**
 * Get mood entries for client with optional date filtering
 * GET /api/v1/portal/mood-entries?days=7
 */
export const getMoodEntries = async (req: AuthenticatedPortalRequest, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;
    const { days } = req.query;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Calculate date filter
    let dateFilter = {};
    if (days) {
      const daysNum = parseInt(days as string);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);
      dateFilter = { gte: startDate };
    }

    // Get mood entries
    const moodEntries = await prisma.moodEntry.findMany({
      where: {
        clientId,
        ...(Object.keys(dateFilter).length > 0 && { entryDate: dateFilter }),
      },
      orderBy: { entryDate: 'desc' },
    });

    const formattedEntries = moodEntries.map(entry => ({
      id: entry.id,
      moodScore: entry.moodScore,
      entryDate: entry.entryDate,
      timeOfDay: entry.timeOfDay,
      notes: entry.notes,
      symptoms: entry.symptoms,
      customMetrics: entry.customMetrics,
    }));

    logger.info(`Retrieved ${formattedEntries.length} mood entries for client ${clientId}`);

    return res.status(200).json({
      success: true,
      data: formattedEntries,
    });
  } catch (error: any) {
    logger.error('Error fetching mood entries:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch mood entries',
    });
  }
};

/**
 * Get mood trends analysis
 * GET /api/v1/portal/mood-entries/trends
 */
export const getMoodTrends = async (req: AuthenticatedPortalRequest, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get mood entries from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const moodEntries = await prisma.moodEntry.findMany({
      where: {
        clientId,
        entryDate: { gte: thirtyDaysAgo },
      },
      orderBy: { entryDate: 'asc' },
    });

    if (moodEntries.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          averageMood: 0,
          moodTrend: 'stable',
          totalEntries: 0,
          streakDays: 0,
          weeklyAverage: [],
        },
      });
    }

    // Calculate average mood
    const totalMood = moodEntries.reduce((sum, entry) => sum + entry.moodScore, 0);
    const averageMood = totalMood / moodEntries.length;

    // Calculate mood trend (comparing first half vs second half)
    const midPoint = Math.floor(moodEntries.length / 2);
    const firstHalf = moodEntries.slice(0, midPoint);
    const secondHalf = moodEntries.slice(midPoint);

    const firstHalfAvg = firstHalf.reduce((sum, e) => sum + e.moodScore, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, e) => sum + e.moodScore, 0) / secondHalf.length;

    let moodTrend = 'stable';
    if (secondHalfAvg > firstHalfAvg + 0.5) moodTrend = 'improving';
    else if (secondHalfAvg < firstHalfAvg - 0.5) moodTrend = 'declining';

    // Calculate entry streak (consecutive days)
    let streakDays = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);

      const hasEntry = moodEntries.some(entry => {
        const entryDate = new Date(entry.entryDate);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate.getTime() === checkDate.getTime();
      });

      if (hasEntry) {
        streakDays++;
      } else {
        break;
      }
    }

    // Calculate weekly averages for chart
    const weeklyAverage: { week: string; average: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekEntries = moodEntries.filter(entry => {
        const entryDate = new Date(entry.entryDate);
        return entryDate >= weekStart && entryDate < weekEnd;
      });

      if (weekEntries.length > 0) {
        const weekAvg = weekEntries.reduce((sum, e) => sum + e.moodScore, 0) / weekEntries.length;
        weeklyAverage.unshift({
          week: `Week ${4 - i}`,
          average: Math.round(weekAvg * 10) / 10,
        });
      }
    }

    logger.info(`Calculated mood trends for client ${clientId}: ${moodTrend}`);

    return res.status(200).json({
      success: true,
      data: {
        averageMood: Math.round(averageMood * 10) / 10,
        moodTrend,
        totalEntries: moodEntries.length,
        streakDays,
        weeklyAverage,
      },
    });
  } catch (error: any) {
    logger.error('Error calculating mood trends:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate mood trends',
    });
  }
};
