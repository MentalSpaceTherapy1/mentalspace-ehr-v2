import { Request, Response } from 'express';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
import * as BillingReadinessService from '../services/billingReadiness.service';
import logger from '../utils/logger';
import { sendSuccess, sendServerError } from '../utils/apiResponse';

/**
 * Phase 2.1: Billing Hold Controller
 * Manages billing holds on clinical notes
 */

/**
 * GET /api/v1/billing-holds
 * List all active billing holds
 */
export const getBillingHolds = async (req: Request, res: Response) => {
  try {
    const isActive = req.query.isActive !== 'false'; // Default to true

    const holds = await BillingReadinessService.getHoldsForNote(''); // Get all if no noteId

    return sendSuccess(res, { data: holds, total: holds.length });
  } catch (error) {
    logger.error('Error fetching billing holds', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to fetch billing holds');
  }
};

/**
 * GET /api/v1/billing-holds/count
 * Get count of active billing holds
 */
export const getBillingHoldsCount = async (req: Request, res: Response) => {
  try {
    const count = await BillingReadinessService.getActiveHoldsCount();

    return sendSuccess(res, { count });
  } catch (error) {
    logger.error('Error fetching billing holds count', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to fetch billing holds count');
  }
};

/**
 * GET /api/v1/billing-holds/by-reason
 * Get billing holds grouped by reason (for dashboard)
 */
export const getBillingHoldsByReason = async (req: Request, res: Response) => {
  try {
    const holdsByReason = await BillingReadinessService.getHoldsByReason();

    return sendSuccess(res, holdsByReason);
  } catch (error) {
    logger.error('Error fetching billing holds by reason', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to fetch billing holds by reason');
  }
};

/**
 * GET /api/v1/billing-holds/note/:noteId
 * Get billing holds for a specific note
 */
export const getBillingHoldsByNote = async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    const holds = await BillingReadinessService.getHoldsForNote(noteId);

    return sendSuccess(res, { data: holds, total: holds.length });
  } catch (error) {
    logger.error('Error fetching billing holds for note', { error: getErrorMessage(error), noteId: req.params.noteId });
    return sendServerError(res, 'Failed to fetch billing holds');
  }
};

/**
 * POST /api/v1/billing-holds/:id/resolve
 * Manually resolve a billing hold
 */
export const resolveBillingHold = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    await BillingReadinessService.resolveHold(id, userId);

    return sendSuccess(res, null, 'Billing hold resolved successfully');
  } catch (error) {
    logger.error('Error resolving billing hold', { error: getErrorMessage(error), holdId: req.params.id });
    return sendServerError(res, 'Failed to resolve billing hold');
  }
};

/**
 * GET /api/v1/clinical-notes/:id/billing-readiness
 * Check billing readiness for a specific note
 */
export const checkBillingReadiness = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const createHolds = req.query.createHolds !== 'false'; // Default to true

    const validation = await BillingReadinessService.validateNoteForBilling(id, createHolds);

    return sendSuccess(res, validation);
  } catch (error) {
    logger.error('Error checking billing readiness', { error: getErrorMessage(error), noteId: req.params.id });
    return sendServerError(res, 'Failed to check billing readiness');
  }
};
