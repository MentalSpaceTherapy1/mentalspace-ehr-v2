/**
 * Budget Controller
 *
 * REST API endpoints for budget management operations
 *
 * @module controllers/budget
 */

import { Request, Response } from 'express';
import { logControllerError } from '../utils/logger';
import * as budgetService from '../services/budget.service';
import { BudgetCategory } from '@prisma/client';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError } from '../utils/apiResponse';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';

/**
 * POST /api/budgets
 * Create a new budget
 */
export async function createBudget(req: Request, res: Response): Promise<void> {
  try {
    const budget = await budgetService.createBudget(req.body);
    sendCreated(res, budget);
    return;
  } catch (error) {
    logControllerError('Error creating budget', error);
    sendBadRequest(res, getErrorMessage(error));
    return;
  }
}

/**
 * GET /api/budgets/:id
 * Get budget by ID
 */
export async function getBudget(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const includeExpenses = req.query.includeExpenses === 'true';
    const includePurchaseOrders = req.query.includePurchaseOrders === 'true';

    const budget = await budgetService.getBudgetById(id, includeExpenses, includePurchaseOrders);

    if (!budget) {
      sendNotFound(res, 'Budget');
      return;
    }

    sendSuccess(res, budget);
    return;
  } catch (error) {
    logControllerError('Error fetching budget', error);
    sendServerError(res, getErrorMessage(error));
    return;
  }
}

/**
 * GET /api/budgets
 * List budgets with filtering
 */
export async function listBudgets(req: Request, res: Response): Promise<void> {
  try {
    const {
      fiscalYear,
      category,
      department,
      ownerId,
      overBudget,
      nearingLimit,
      page,
      limit,
    } = req.query;

    const result = await budgetService.listBudgets({
      fiscalYear: fiscalYear ? parseInt(fiscalYear as string) : undefined,
      category: category as BudgetCategory,
      department: department as string,
      ownerId: ownerId as string,
      overBudget: overBudget === 'true',
      nearingLimit: nearingLimit === 'true',
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    sendSuccess(res, result);
    return;
  } catch (error) {
    logControllerError('Error listing budgets', error);
    sendServerError(res, getErrorMessage(error));
    return;
  }
}

/**
 * PUT /api/budgets/:id
 * Update budget information
 */
export async function updateBudget(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const budget = await budgetService.updateBudget(id, req.body);
    sendSuccess(res, budget);
    return;
  } catch (error) {
    logControllerError('Error updating budget', error);
    sendBadRequest(res, getErrorMessage(error));
    return;
  }
}

/**
 * GET /api/budgets/:id/utilization
 * Get budget utilization metrics
 */
export async function getBudgetUtilization(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const utilization = await budgetService.getBudgetUtilization(id);
    sendSuccess(res, utilization);
    return;
  } catch (error) {
    logControllerError('Error fetching budget utilization', error);
    sendServerError(res, getErrorMessage(error));
    return;
  }
}

/**
 * GET /api/budgets/department/:department/summary
 * Get department budget summary
 */
export async function getDepartmentSummary(req: Request, res: Response): Promise<void> {
  try {
    const { department } = req.params;
    const { fiscalYear } = req.query;

    if (!fiscalYear) {
      sendBadRequest(res, 'Fiscal year is required');
      return;
    }

    const summary = await budgetService.getDepartmentBudgetSummary(
      department,
      parseInt(fiscalYear as string)
    );

    sendSuccess(res, summary);
    return;
  } catch (error) {
    logControllerError('Error fetching department summary', error);
    sendServerError(res, getErrorMessage(error));
    return;
  }
}

/**
 * GET /api/budgets/organization/summary
 * Get organization-wide budget summary
 */
export async function getOrganizationSummary(req: Request, res: Response): Promise<void> {
  try {
    const { fiscalYear } = req.query;

    if (!fiscalYear) {
      sendBadRequest(res, 'Fiscal year is required');
      return;
    }

    const summary = await budgetService.getOrganizationBudgetSummary(
      parseInt(fiscalYear as string)
    );

    sendSuccess(res, summary);
    return;
  } catch (error) {
    logControllerError('Error fetching organization summary', error);
    sendServerError(res, getErrorMessage(error));
    return;
  }
}

/**
 * POST /api/budgets/:id/check-availability
 * Check budget availability for a requested amount
 */
export async function checkBudgetAvailability(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { requestedAmount } = req.body;

    if (!requestedAmount || requestedAmount <= 0) {
      sendBadRequest(res, 'Valid requested amount is required');
      return;
    }

    const result = await budgetService.checkBudgetAvailability(id, requestedAmount);
    sendSuccess(res, result);
    return;
  } catch (error) {
    logControllerError('Error checking budget availability', error);
    sendServerError(res, getErrorMessage(error));
    return;
  }
}
