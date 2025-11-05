import { Request, Response } from 'express';
import * as BillingReadinessService from '../services/billingReadiness.service';
import logger from '../utils/logger';

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

    return res.json({
      success: true,
      data: holds,
      total: holds.length,
    });
  } catch (error: any) {
    logger.error('Error fetching billing holds', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch billing holds',
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/billing-holds/count
 * Get count of active billing holds
 */
export const getBillingHoldsCount = async (req: Request, res: Response) => {
  try {
    const count = await BillingReadinessService.getActiveHoldsCount();

    return res.json({
      success: true,
      data: { count },
    });
  } catch (error: any) {
    logger.error('Error fetching billing holds count', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch billing holds count',
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/billing-holds/by-reason
 * Get billing holds grouped by reason (for dashboard)
 */
export const getBillingHoldsByReason = async (req: Request, res: Response) => {
  try {
    const holdsByReason = await BillingReadinessService.getHoldsByReason();

    return res.json({
      success: true,
      data: holdsByReason,
    });
  } catch (error: any) {
    logger.error('Error fetching billing holds by reason', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch billing holds by reason',
      error: error.message,
    });
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

    return res.json({
      success: true,
      data: holds,
      total: holds.length,
    });
  } catch (error: any) {
    logger.error('Error fetching billing holds for note', { error: error.message, noteId: req.params.noteId });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch billing holds',
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/billing-holds/:id/resolve
 * Manually resolve a billing hold
 */
export const resolveBillingHold = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    await BillingReadinessService.resolveHold(id, userId);

    return res.json({
      success: true,
      message: 'Billing hold resolved successfully',
    });
  } catch (error: any) {
    logger.error('Error resolving billing hold', { error: error.message, holdId: req.params.id });
    return res.status(500).json({
      success: false,
      message: 'Failed to resolve billing hold',
      error: error.message,
    });
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

    return res.json({
      success: true,
      data: validation,
    });
  } catch (error: any) {
    logger.error('Error checking billing readiness', { error: error.message, noteId: req.params.id });
    return res.status(500).json({
      success: false,
      message: 'Failed to check billing readiness',
      error: error.message,
    });
  }
};
