/**
 * Insurance Controller
 * Phase 3.2: Refactored to thin controller pattern
 *
 * Handles HTTP request/response only - all business logic delegated to insuranceService
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
import { insuranceService } from '../services/insurance.service';
import { logControllerError } from '../utils/logger';
import { AppError } from '../utils/errors';
import {
  sendSuccess,
  sendCreated,
  sendNotFound,
  sendBadRequest,
  sendValidationError,
  sendServerError,
} from '../utils/apiResponse';

/**
 * Get all insurance for a client
 * GET /api/clients/:clientId/insurance
 */
export const getClientInsurance = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const insurance = await insuranceService.getClientInsurance(clientId);

    return sendSuccess(res, insurance);
  } catch (error) {
    if (error instanceof AppError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Get insurance', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to retrieve insurance information', errorId);
  }
};

/**
 * Get single insurance by ID
 * GET /api/insurance/:id
 */
export const getInsuranceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const insurance = await insuranceService.getInsuranceById(id);

    return sendSuccess(res, insurance);
  } catch (error) {
    if (error instanceof AppError) {
      if (getErrorMessage(error).includes('not found')) {
        return sendNotFound(res, 'Insurance information');
      }
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Get insurance', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to retrieve insurance information', errorId);
  }
};

/**
 * Create insurance
 * POST /api/insurance
 */
export const createInsurance = async (req: Request, res: Response) => {
  try {
    const insurance = await insuranceService.createInsurance(req.body);

    return sendCreated(res, insurance, 'Insurance information created successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return sendValidationError(res, formattedErrors);
    }

    if (error instanceof AppError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Create insurance', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to create insurance information', errorId);
  }
};

/**
 * Update insurance
 * PUT /api/insurance/:id
 */
export const updateInsurance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const insurance = await insuranceService.updateInsurance(id, req.body);

    return sendSuccess(res, insurance, 'Insurance information updated successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return sendValidationError(res, formattedErrors);
    }

    if (error instanceof AppError) {
      if (getErrorMessage(error).includes('not found')) {
        return sendNotFound(res, 'Insurance information');
      }
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Update insurance', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to update insurance information', errorId);
  }
};

/**
 * Delete insurance
 * DELETE /api/insurance/:id
 */
export const deleteInsurance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await insuranceService.deleteInsurance(id);

    return sendSuccess(res, null, 'Insurance information deleted successfully');
  } catch (error) {
    if (error instanceof AppError) {
      if (getErrorMessage(error).includes('not found')) {
        return sendNotFound(res, 'Insurance information');
      }
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Delete insurance', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to delete insurance information', errorId);
  }
};

/**
 * Verify insurance
 * POST /api/insurance/:id/verify
 */
export const verifyInsurance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const notes = req.body?.notes;

    const insurance = await insuranceService.verifyInsurance(id, userId, notes);

    return sendSuccess(res, insurance, 'Insurance verified successfully');
  } catch (error) {
    if (error instanceof AppError) {
      if (getErrorMessage(error).includes('not found')) {
        return sendNotFound(res, 'Insurance information');
      }
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Verify insurance', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to verify insurance', errorId);
  }
};
