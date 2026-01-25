/**
 * Billing Controller
 * Phase 3.2: Refactored to thin controller pattern
 *
 * Handles HTTP request/response only - all business logic delegated to billingService
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
import {
  billingService,
  createChargeSchema,
  createPaymentSchema,
} from '../services/billing.service';
import { logControllerError } from '../utils/logger';
import { NotFoundError, BadRequestError } from '../utils/errors';
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendNotFound,
  sendBadRequest,
  sendValidationError,
  sendServerError,
  sendUnauthorized,
  calculatePagination,
} from '../utils/apiResponse';

// ============================================================================
// CHARGES
// ============================================================================

/**
 * Get all charges
 * GET /api/billing/charges
 */
export const getAllCharges = async (req: Request, res: Response) => {
  try {
    const { clientId, status, startDate, endDate, page, limit } = req.query;

    const result = await billingService.getAllCharges({
      clientId: clientId as string,
      status: status as string,
      startDate: startDate as string,
      endDate: endDate as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    return sendPaginated(res, result.charges, result.pagination);
  } catch (error) {
    const errorId = logControllerError('Get charges', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to retrieve charges', errorId);
  }
};

/**
 * Get single charge by ID
 * GET /api/billing/charges/:id
 */
export const getChargeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const charge = await billingService.getChargeById(id);

    return sendSuccess(res, charge);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Charge');
    }

    const errorId = logControllerError('Get charge', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to retrieve charge', errorId);
  }
};

/**
 * Create a new charge
 * POST /api/billing/charges
 */
export const createCharge = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const result = await billingService.createCharge(req.body, userId);

    return sendCreated(res, { charge: result.charge, amdSync: result.amdSync }, result.message);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return sendValidationError(res, formattedErrors);
    }

    if (error instanceof BadRequestError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Create charge', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to create charge', errorId);
  }
};

/**
 * Update a charge
 * PUT /api/billing/charges/:id
 */
export const updateCharge = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const charge = await billingService.updateCharge(id, req.body, userId);

    return sendSuccess(res, charge, 'Charge updated successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return sendValidationError(res, formattedErrors);
    }

    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Charge');
    }

    if (error instanceof BadRequestError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Update charge', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to update charge', errorId);
  }
};

/**
 * Delete a charge
 * DELETE /api/billing/charges/:id
 */
export const deleteCharge = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    await billingService.deleteCharge(id, userId);

    return sendSuccess(res, null, 'Charge deleted successfully');
  } catch (error) {
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Charge');
    }

    const errorId = logControllerError('Delete charge', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to delete charge', errorId);
  }
};

// ============================================================================
// PAYMENTS
// ============================================================================

/**
 * Get all payments
 * GET /api/billing/payments
 */
export const getAllPayments = async (req: Request, res: Response) => {
  try {
    const { clientId, paymentSource, startDate, endDate, page, limit } = req.query;

    const result = await billingService.getAllPayments({
      clientId: clientId as string,
      paymentSource: paymentSource as string,
      startDate: startDate as string,
      endDate: endDate as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    return sendPaginated(res, result.payments, result.pagination);
  } catch (error) {
    const errorId = logControllerError('Get payments', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to retrieve payments', errorId);
  }
};

/**
 * Get single payment by ID
 * GET /api/billing/payments/:id
 */
export const getPaymentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const payment = await billingService.getPaymentById(id);

    return sendSuccess(res, payment);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Payment');
    }

    const errorId = logControllerError('Get payment', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to retrieve payment', errorId);
  }
};

/**
 * Create a new payment
 * POST /api/billing/payments
 */
export const createPayment = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const payment = await billingService.createPayment(req.body, userId);

    return sendCreated(res, payment, 'Payment created successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return sendValidationError(res, formattedErrors);
    }

    if (error instanceof BadRequestError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Create payment', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to create payment', errorId);
  }
};

/**
 * Update a payment
 * PUT /api/billing/payments/:id
 */
export const updatePayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const payment = await billingService.updatePayment(id, req.body, userId);

    return sendSuccess(res, payment, 'Payment updated successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return sendValidationError(res, formattedErrors);
    }

    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Payment');
    }

    if (error instanceof BadRequestError) {
      return sendBadRequest(res, getErrorMessage(error));
    }

    const errorId = logControllerError('Update payment', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to update payment', errorId);
  }
};

/**
 * Delete a payment
 * DELETE /api/billing/payments/:id
 */
export const deletePayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    await billingService.deletePayment(id, userId);

    return sendSuccess(res, null, 'Payment deleted successfully');
  } catch (error) {
    if (error instanceof NotFoundError) {
      return sendNotFound(res, 'Payment');
    }

    const errorId = logControllerError('Delete payment', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to delete payment', errorId);
  }
};

// ============================================================================
// BILLING REPORTS
// ============================================================================

/**
 * Get aging report
 * GET /api/billing/reports/aging
 */
export const getAgingReport = async (req: Request, res: Response) => {
  try {
    const agingReport = await billingService.getAgingReport();

    return sendSuccess(res, agingReport);
  } catch (error) {
    const errorId = logControllerError('Get aging report', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to generate aging report', errorId);
  }
};

/**
 * Get revenue report
 * GET /api/billing/reports/revenue
 */
export const getRevenueReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, groupBy } = req.query;

    const revenueReport = await billingService.getRevenueReport(
      startDate as string,
      endDate as string,
      (groupBy as string) || 'month'
    );

    return sendSuccess(res, revenueReport);
  } catch (error) {
    const errorId = logControllerError('Get revenue report', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to generate revenue report', errorId);
  }
};
