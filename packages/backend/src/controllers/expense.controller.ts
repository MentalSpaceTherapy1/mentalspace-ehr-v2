/**
 * Expense Controller
 *
 * REST API endpoints for expense management operations
 *
 * @module controllers/expense
 */

import { Request, Response } from 'express';
import { logControllerError } from '../utils/logger';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError } from '../utils/apiResponse';
import * as expenseService from '../services/expense.service';
import { ExpenseStatus, BudgetCategory } from '@prisma/client';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';

/**
 * POST /api/expenses
 * Create a new expense
 */
export async function createExpense(req: Request, res: Response): Promise<void> {
  try {
    const expense = await expenseService.createExpense(req.body);
    sendCreated(res, expense, 'Expense created successfully');
  } catch (error) {
    logControllerError('Error creating expense', error);
    sendBadRequest(res, getErrorMessage(error));
  }
}

/**
 * GET /api/expenses/:id
 * Get expense by ID
 */
export async function getExpense(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const expense = await expenseService.getExpenseById(id);

    if (!expense) {
      sendNotFound(res, 'Expense');
      return;
    }

    sendSuccess(res, expense);
  } catch (error) {
    logControllerError('Error fetching expense', error);
    sendServerError(res, getErrorMessage(error));
  }
}

/**
 * GET /api/expenses
 * List expenses with filtering
 */
export async function listExpenses(req: Request, res: Response): Promise<void> {
  try {
    const {
      status,
      category,
      submittedById,
      approvedById,
      vendorId,
      budgetId,
      department,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      page,
      limit,
    } = req.query;

    const result = await expenseService.listExpenses({
      status: status as ExpenseStatus,
      category: category as BudgetCategory,
      submittedById: submittedById as string,
      approvedById: approvedById as string,
      vendorId: vendorId as string,
      budgetId: budgetId as string,
      department: department as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      minAmount: minAmount ? parseFloat(minAmount as string) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    sendSuccess(res, result);
  } catch (error) {
    logControllerError('Error listing expenses', error);
    sendServerError(res, getErrorMessage(error));
  }
}

/**
 * PUT /api/expenses/:id
 * Update expense information
 */
export async function updateExpense(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const expense = await expenseService.updateExpense(id, req.body);
    sendSuccess(res, expense, 'Expense updated successfully');
  } catch (error) {
    logControllerError('Error updating expense', error);
    sendBadRequest(res, getErrorMessage(error));
  }
}

/**
 * POST /api/expenses/:id/approve
 * Approve an expense
 */
export async function approveExpense(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { approvedById, approvalNotes } = req.body;

    if (!approvedById) {
      sendBadRequest(res, 'Approver ID is required');
      return;
    }

    const expense = await expenseService.approveExpense(id, approvedById, approvalNotes);
    sendSuccess(res, expense, 'Expense approved successfully');
  } catch (error) {
    logControllerError('Error approving expense', error);
    sendBadRequest(res, getErrorMessage(error));
  }
}

/**
 * POST /api/expenses/:id/deny
 * Deny an expense
 */
export async function denyExpense(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { approvedById, approvalNotes } = req.body;

    if (!approvedById || !approvalNotes) {
      sendBadRequest(res, 'Approver ID and approval notes are required');
      return;
    }

    const expense = await expenseService.denyExpense(id, approvedById, approvalNotes);
    sendSuccess(res, expense, 'Expense denied successfully');
  } catch (error) {
    logControllerError('Error denying expense', error);
    sendBadRequest(res, getErrorMessage(error));
  }
}

/**
 * POST /api/expenses/:id/mark-paid
 * Mark expense as paid
 */
export async function markExpensePaid(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { reimbursementDate } = req.body;

    const expense = await expenseService.markExpensePaid(
      id,
      reimbursementDate ? new Date(reimbursementDate) : new Date()
    );

    sendSuccess(res, expense, 'Expense marked as paid');
  } catch (error) {
    logControllerError('Error marking expense as paid', error);
    sendBadRequest(res, getErrorMessage(error));
  }
}

/**
 * GET /api/expenses/summary
 * Get expense summary statistics
 */
export async function getExpenseSummary(req: Request, res: Response): Promise<void> {
  try {
    const { dateFrom, dateTo, department, category } = req.query;

    const summary = await expenseService.getExpenseSummary({
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      department: department as string,
      category: category as BudgetCategory,
    });

    sendSuccess(res, summary);
  } catch (error) {
    logControllerError('Error fetching expense summary', error);
    sendServerError(res, getErrorMessage(error));
  }
}

/**
 * GET /api/expenses/pending
 * Get pending expenses
 */
export async function getPendingExpenses(req: Request, res: Response): Promise<void> {
  try {
    const { limit } = req.query;
    const expenses = await expenseService.getPendingExpenses(
      limit ? parseInt(limit as string) : undefined
    );
    sendSuccess(res, expenses);
  } catch (error) {
    logControllerError('Error fetching pending expenses', error);
    sendServerError(res, getErrorMessage(error));
  }
}

/**
 * GET /api/expenses/user/:userId/history
 * Get user's expense history
 */
export async function getUserExpenseHistory(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const { page, limit } = req.query;

    const result = await expenseService.getUserExpenseHistory(
      userId,
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    sendSuccess(res, result);
  } catch (error) {
    logControllerError('Error fetching user expense history', error);
    sendServerError(res, getErrorMessage(error));
  }
}
