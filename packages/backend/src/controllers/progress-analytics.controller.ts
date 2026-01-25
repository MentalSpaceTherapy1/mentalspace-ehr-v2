import { Request, Response } from 'express';
import progressAnalyticsService from '../services/progress-analytics.service';
import dataExportService from '../services/data-export.service';
import trackingRemindersService from '../services/tracking-reminders.service';
import { ValidationError } from '../utils/errors';
import logger, { logControllerError } from '../utils/logger';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';
// Phase 3.2: Removed direct prisma import - using service methods instead
import { sendSuccess, sendCreated, sendBadRequest, sendServerError } from '../utils/apiResponse';

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

    return sendSuccess(res, analytics);
  } catch (error) {
    logControllerError('getCombinedAnalytics', error, { params: req.params });
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to fetch combined analytics');
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

    return sendSuccess(res, report);
  } catch (error) {
    logControllerError('generateProgressReport', error, { params: req.params });
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to generate progress report');
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

    return sendSuccess(res, comparison);
  } catch (error) {
    logControllerError('compareToGoals', error, { params: req.params });
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to compare to goals');
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

    return sendSuccess(res, exports);
  } catch (error) {
    logControllerError('exportToCSV', error, { params: req.params });
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to export to CSV');
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

    return sendSuccess(res, exportData);
  } catch (error) {
    logControllerError('exportToJSON', error, { params: req.params });
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to export to JSON');
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

    return sendSuccess(res, pdfData);
  } catch (error) {
    logControllerError('generatePDFData', error, { params: req.params });
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to generate PDF data');
  }
};

/**
 * Get reminder preferences
 */
export const getReminderPreferences = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const preferences = await trackingRemindersService.getReminderPreferences(clientId);

    return sendSuccess(res, preferences);
  } catch (error) {
    logControllerError('getReminderPreferences', error, { params: req.params });
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to fetch reminder preferences');
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

    return sendSuccess(res, result, 'Reminder preferences updated successfully');
  } catch (error) {
    logControllerError('updateReminderPreferences', error, { params: req.params });
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to update reminder preferences');
  }
};

/**
 * Get logging streak
 */
export const getLoggingStreak = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const streak = await trackingRemindersService.getLoggingStreak(clientId);

    return sendSuccess(res, streak);
  } catch (error) {
    logControllerError('getLoggingStreak', error, { params: req.params });
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to fetch logging streak');
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

    return sendSuccess(res, {
      engagementScore: score,
      period: `Last ${daysParam} days`,
    });
  } catch (error) {
    logControllerError('getEngagementScore', error, { params: req.params });
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to fetch engagement score');
  }
};

/**
 * Get clinician notes for a client (from clinical notes)
 * Returns simplified note data for progress tracking view
 */
export const getClinicianNotes = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { startDate, endDate, limit = '20' } = req.query;

    // Phase 3.2: Use service method instead of direct prisma call
    const notes = await progressAnalyticsService.getClinicianNotesForClient(clientId, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: parseInt(limit as string),
    });

    // Transform to simplified format expected by frontend
    const formattedNotes = notes.map((note) => ({
      id: note.id,
      content: note.progressTowardGoals || note.assessment || note.plan || 'Session note',
      createdAt: note.sessionDate?.toISOString() || note.createdAt.toISOString(),
      clinicianName: `${note.clinician.firstName} ${note.clinician.lastName}`,
      noteType: note.noteType,
    }));

    return sendSuccess(res, formattedNotes);
  } catch (error) {
    logControllerError('getClinicianNotes', error, { params: req.params });
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to fetch clinician notes');
  }
};

/**
 * Create a progress observation note
 * Quick note for clinicians to add observations about client progress
 */
export const createProgressNote = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { content } = req.body;
    const clinicianId = req.user!.id;

    if (!content || content.trim().length === 0) {
      throw new ValidationError('Note content is required');
    }

    // Phase 3.2: Use service methods instead of direct prisma calls
    const note = await progressAnalyticsService.createProgressNote(clientId, clinicianId, content);

    // Get clinician info for response
    const clinician = await progressAnalyticsService.getClinicianInfo(clinicianId);

    return sendCreated(res, {
      id: note.id,
      content: note.progressTowardGoals,
      createdAt: note.sessionDate?.toISOString() || note.createdAt.toISOString(),
      clinicianName: clinician ? `${clinician.firstName} ${clinician.lastName}` : 'Unknown',
      noteType: note.noteType,
    }, 'Progress note created successfully');
  } catch (error) {
    logControllerError('createProgressNote', error, { params: req.params });
    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to create progress note');
  }
};
