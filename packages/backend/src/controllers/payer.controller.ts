import { Request, Response } from 'express';
import * as PayerService from '../services/payer.service';
import logger from '../utils/logger';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError } from '../utils/apiResponse';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';

/**
 * Phase 2.1: Payer Controller
 * Manages insurance payers
 */

/**
 * GET /api/v1/payers
 * List all payers with optional filters
 */
export const getPayers = async (req: Request, res: Response) => {
  try {
    const filters = {
      payerType: req.query.payerType as string | undefined,
      isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
      search: req.query.search as string | undefined,
    };

    const payers = await PayerService.getPayers(filters);

    return sendSuccess(res, { payers, total: payers.length });
  } catch (error) {
    logger.error('Error fetching payers', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to fetch payers');
  }
};

/**
 * GET /api/v1/payers/stats
 * Get payer statistics
 */
export const getPayerStats = async (req: Request, res: Response) => {
  try {
    const stats = await PayerService.getPayerStats();

    return sendSuccess(res, stats);
  } catch (error) {
    logger.error('Error fetching payer stats', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to fetch payer statistics');
  }
};

/**
 * GET /api/v1/payers/:id
 * Get payer by ID
 */
export const getPayerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payer = await PayerService.getPayerById(id);

    if (!payer) {
      return sendNotFound(res, 'Payer');
    }

    return sendSuccess(res, payer);
  } catch (error) {
    logger.error('Error fetching payer', { error: getErrorMessage(error), payerId: req.params.id });
    return sendServerError(res, 'Failed to fetch payer');
  }
};

/**
 * POST /api/v1/payers
 * Create new payer
 */
export const createPayer = async (req: Request, res: Response) => {
  try {
    const { name, payerType, requiresPreAuth, isActive } = req.body;

    // Validation
    if (!name || !payerType) {
      return sendBadRequest(res, 'Name and payer type are required');
    }

    const validPayerTypes = ['COMMERCIAL', 'MEDICAID', 'MEDICARE', 'EAP', 'SELF_PAY'];
    if (!validPayerTypes.includes(payerType)) {
      return sendBadRequest(res, `Invalid payer type. Must be one of: ${validPayerTypes.join(', ')}`);
    }

    const payer = await PayerService.createPayer({
      name,
      payerType,
      requiresPreAuth,
      isActive,
    });

    return sendCreated(res, payer, 'Payer created successfully');
  } catch (error) {
    logger.error('Error creating payer', { error: getErrorMessage(error), body: req.body });
    return sendServerError(res, 'Failed to create payer');
  }
};

/**
 * PUT /api/v1/payers/:id
 * Update payer
 */
export const updatePayer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const payer = await PayerService.updatePayer(id, updates);

    return sendSuccess(res, payer, 'Payer updated successfully');
  } catch (error) {
    logger.error('Error updating payer', { error: getErrorMessage(error), payerId: req.params.id });
    return sendServerError(res, 'Failed to update payer');
  }
};

/**
 * DELETE /api/v1/payers/:id
 * Delete payer (soft delete)
 */
export const deletePayer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payer = await PayerService.deletePayer(id);

    return sendSuccess(res, payer, 'Payer deleted successfully');
  } catch (error) {
    logger.error('Error deleting payer', { error: getErrorMessage(error), payerId: req.params.id });
    return sendServerError(res, 'Failed to delete payer');
  }
};
