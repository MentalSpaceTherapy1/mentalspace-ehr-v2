import { Request, Response } from 'express';
import { z } from 'zod';
import logger from '../utils/logger';
import * as waitlistMatchingService from '../services/waitlistMatching.service';
import * as waitlistJobService from '../jobs/processWaitlist.job';
import { sendSuccess, sendServerError, sendValidationError } from '../utils/apiResponse';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';

/**
 * Module 3 Phase 2.2: Waitlist Automation Controller
 * HTTP handlers for smart matching, priority scoring, and slot offers
 */

// Validation schemas
const recordOfferResponseSchema = z.object({
  accepted: z.boolean(),
  notes: z.string().optional(),
});

const sendOfferSchema = z.object({
  clinicianId: z.string().uuid('Invalid clinician ID'),
  appointmentDate: z.string().datetime('Invalid appointment date'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid start time'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid end time'),
  notificationMethod: z.enum(['Email', 'SMS', 'Portal']).default('Email'),
});

/**
 * Calculate priority score for a specific waitlist entry
 * GET /api/waitlist-matching/:id/priority-score
 */
export const calculatePriorityScore = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const score = await waitlistMatchingService.calculatePriorityScore(id);

    return sendSuccess(res, {
      waitlistEntryId: id,
      priorityScore: score,
    });
  } catch (error) {
    logger.error('Calculate priority score error:', {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? getErrorMessage(error) : 'Unknown error',
    });

    return sendServerError(res, 'Failed to calculate priority score');
  }
};

/**
 * Update all priority scores
 * POST /api/waitlist-matching/update-all-scores
 */
export const updateAllPriorityScores = async (req: Request, res: Response) => {
  try {
    await waitlistMatchingService.updateAllPriorityScores();

    return sendSuccess(res, null, 'All priority scores updated successfully');
  } catch (error) {
    logger.error('Update all priority scores error:', {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? getErrorMessage(error) : 'Unknown error',
    });

    return sendServerError(res, 'Failed to update priority scores');
  }
};

/**
 * Find matching slots for a waitlist entry
 * GET /api/waitlist-matching/:id/matches
 */
export const findMatchingSlots = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const daysAhead = req.query.daysAhead
      ? parseInt(req.query.daysAhead as string, 10)
      : 14;

    const matches = await waitlistMatchingService.findMatchingSlots(id, daysAhead);

    return sendSuccess(res, { data: matches, count: matches.length });
  } catch (error) {
    logger.error('Find matching slots error:', {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? getErrorMessage(error) : 'Unknown error',
    });

    return sendServerError(res, 'Failed to find matching slots');
  }
};

/**
 * Run matching algorithm for all waitlist entries
 * POST /api/waitlist-matching/match-all
 */
export const matchAllEntries = async (req: Request, res: Response) => {
  try {
    const result = await waitlistMatchingService.matchWaitlistToSlots();

    return sendSuccess(res, {
      matched: result.matched,
      stats: result.stats,
    }, 'Waitlist matching completed');
  } catch (error) {
    logger.error('Match all entries error:', {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? getErrorMessage(error) : 'Unknown error',
    });

    return sendServerError(res, 'Failed to match waitlist entries');
  }
};

/**
 * Send slot offer to waitlist member
 * POST /api/waitlist-matching/:id/send-offer
 */
export const sendSlotOffer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = sendOfferSchema.parse(req.body);

    const matchedSlot = {
      waitlistEntryId: id,
      clinicianId: validatedData.clinicianId,
      clinicianName: '', // Will be fetched by service
      appointmentDate: new Date(validatedData.appointmentDate),
      startTime: validatedData.startTime,
      endTime: validatedData.endTime,
      matchScore: 0, // Manual offer
      matchReasons: ['Manual offer'],
    };

    await waitlistMatchingService.sendSlotOffer(
      matchedSlot,
      validatedData.notificationMethod
    );

    return sendSuccess(res, null, 'Slot offer sent successfully');
  } catch (error) {
    logger.error('Send slot offer error:', {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? getErrorMessage(error) : 'Unknown error',
    });

    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return sendValidationError(res, formattedErrors);
    }

    return sendServerError(res, 'Failed to send slot offer');
  }
};

/**
 * Record offer response (accepted/declined)
 * POST /api/waitlist-matching/:id/offer-response
 */
export const recordOfferResponse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = recordOfferResponseSchema.parse(req.body);

    await waitlistMatchingService.recordOfferResponse(
      id,
      validatedData.accepted,
      validatedData.notes
    );

    return sendSuccess(res, null, `Offer ${validatedData.accepted ? 'accepted' : 'declined'} successfully`);
  } catch (error) {
    logger.error('Record offer response error:', {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? getErrorMessage(error) : 'Unknown error',
    });

    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return sendValidationError(res, formattedErrors);
    }

    return sendServerError(res, 'Failed to record offer response');
  }
};

/**
 * Get matching statistics
 * GET /api/waitlist-matching/stats
 */
export const getMatchingStats = async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;

    const stats = await waitlistMatchingService.getMatchingStats(
      startDate,
      endDate
    );

    return sendSuccess(res, stats);
  } catch (error) {
    logger.error('Get matching stats error:', {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? getErrorMessage(error) : 'Unknown error',
    });

    return sendServerError(res, 'Failed to get matching statistics');
  }
};

/**
 * Trigger manual waitlist processing (admin only)
 * POST /api/waitlist-matching/process-now
 */
export const triggerManualProcessing = async (req: Request, res: Response) => {
  try {
    const results = await waitlistJobService.triggerWaitlistProcessing();

    return sendSuccess(res, results, 'Waitlist processing completed');
  } catch (error) {
    logger.error('Trigger manual processing error:', {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? getErrorMessage(error) : 'Unknown error',
    });

    return sendServerError(res, 'Failed to process waitlist');
  }
};

/**
 * Get waitlist job status
 * GET /api/waitlist-matching/job-status
 */
export const getJobStatus = async (req: Request, res: Response) => {
  try {
    const status = waitlistJobService.getWaitlistJobStatus();

    return sendSuccess(res, status);
  } catch (error) {
    logger.error('Get job status error:', {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? getErrorMessage(error) : 'Unknown error',
    });

    return sendServerError(res, 'Failed to get job status');
  }
};
