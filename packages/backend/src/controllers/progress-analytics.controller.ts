import { Request, Response } from 'express';
import progressAnalyticsService from '../services/progress-analytics.service';
import dataExportService from '../services/data-export.service';
import trackingRemindersService from '../services/tracking-reminders.service';
import { ValidationError } from '../utils/errors';
import logger, { logControllerError } from '../utils/logger';

/**
 * Get combined analytics across all tracking domains
 */
export const getCombinedAnalytics = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new ValidationError('Start date and end date are required');
    }

    const dateRange = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
    };

    const analytics = await progressAnalyticsService.getCombinedAnalytics(clientId, dateRange);

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logControllerError('getCombinedAnalytics', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch combined analytics',
    });
  }
};

/**
 * Generate progress report
 */
export const generateProgressReport = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new ValidationError('Start date and end date are required');
    }

    const dateRange = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
    };

    const report = await progressAnalyticsService.generateProgressReport(clientId, dateRange);

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    logControllerError('generateProgressReport', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate progress report',
    });
  }
};

/**
 * Compare metrics to goals
 */
export const compareToGoals = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new ValidationError('Start date and end date are required');
    }

    const dateRange = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
    };

    const comparison = await progressAnalyticsService.compareToGoals(clientId, dateRange);

    res.status(200).json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    logControllerError('compareToGoals', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to compare to goals',
    });
  }
};

/**
 * Export data to CSV
 */
export const exportToCSV = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { startDate, endDate, includeSymptoms, includeSleep, includeExercise } = req.query;

    if (!startDate || !endDate) {
      throw new ValidationError('Start date and end date are required');
    }

    const dateRange = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
    };

    const options = {
      format: 'CSV' as const,
      includeSymptoms: includeSymptoms !== 'false',
      includeSleep: includeSleep !== 'false',
      includeExercise: includeExercise !== 'false',
    };

    const exports = await dataExportService.exportToCSV(clientId, dateRange, options);

    res.status(200).json({
      success: true,
      data: exports,
    });
  } catch (error) {
    logControllerError('exportToCSV', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export to CSV',
    });
  }
};

/**
 * Export data to JSON
 */
export const exportToJSON = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { startDate, endDate, includeSymptoms, includeSleep, includeExercise } = req.query;

    if (!startDate || !endDate) {
      throw new ValidationError('Start date and end date are required');
    }

    const dateRange = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
    };

    const options = {
      format: 'JSON' as const,
      includeSymptoms: includeSymptoms !== 'false',
      includeSleep: includeSleep !== 'false',
      includeExercise: includeExercise !== 'false',
    };

    const exportData = await dataExportService.exportToJSON(clientId, dateRange, options);

    res.status(200).json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    logControllerError('exportToJSON', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export to JSON',
    });
  }
};

/**
 * Generate PDF data
 */
export const generatePDFData = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new ValidationError('Start date and end date are required');
    }

    const dateRange = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
    };

    const pdfData = await dataExportService.generatePDFData(clientId, dateRange);

    res.status(200).json({
      success: true,
      data: pdfData,
    });
  } catch (error) {
    logControllerError('generatePDFData', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate PDF data',
    });
  }
};

/**
 * Get reminder preferences
 */
export const getReminderPreferences = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const preferences = await trackingRemindersService.getReminderPreferences(clientId);

    res.status(200).json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    logControllerError('getReminderPreferences', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch reminder preferences',
    });
  }
};

/**
 * Update reminder preferences
 */
export const updateReminderPreferences = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const preferences = req.body;

    const result = await trackingRemindersService.updateReminderPreferences(
      clientId,
      preferences,
      req.user!.id
    );

    res.status(200).json({
      success: true,
      data: result,
      message: 'Reminder preferences updated successfully',
    });
  } catch (error) {
    logControllerError('updateReminderPreferences', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update reminder preferences',
    });
  }
};

/**
 * Get logging streak
 */
export const getLoggingStreak = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const streak = await trackingRemindersService.getLoggingStreak(clientId);

    res.status(200).json({
      success: true,
      data: streak,
    });
  } catch (error) {
    logControllerError('getLoggingStreak', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch logging streak',
    });
  }
};

/**
 * Get engagement score
 */
export const getEngagementScore = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { days } = req.query;

    const daysParam = days ? parseInt(days as string) : 30;

    const score = await trackingRemindersService.calculateEngagementScore(clientId, daysParam);

    res.status(200).json({
      success: true,
      data: {
        engagementScore: score,
        period: `Last ${daysParam} days`,
      },
    });
  } catch (error) {
    logControllerError('getEngagementScore', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch engagement score',
    });
  }
};
