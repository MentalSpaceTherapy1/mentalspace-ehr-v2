/**
 * Expense Controller
 *
 * REST API endpoints for expense management operations
 *
 * @module controllers/expense
 */

import { Request, Response } from 'express';
import { logControllerError } from '../utils/logger';
import * as expenseService from '../services/expense.service';
import { ExpenseStatus, BudgetCategory } from '@prisma/client';

/**
 * POST /api/expenses
 * Create a new expense
 */
export async function createExpense(req: Request, res: Response): Promise<void> {
  try {
    const expense = await expenseService.createExpense(req.body);
    res.status(201).json(expense);
  } catch (error: any) {
    logControllerError('Error creating expense', error);
    res.status(400).json({ error: error.message });
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
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    res.json(expense);
  } catch (error: any) {
    logControllerError('Error fetching expense', error);
    res.status(500).json({ error: error.message });
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

    res.json(result);
  } catch (error: any) {
    logControllerError('Error listing expenses', error);
    res.status(500).json({ error: error.message });
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
    res.json(expense);
  } catch (error: any) {
    logControllerError('Error updating expense', error);
    res.status(400).json({ error: error.message });
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
      res.status(400).json({ error: 'Approver ID is required' });
      return;
    }

    const expense = await expenseService.approveExpense(id, approvedById, approvalNotes);
    res.json(expense);
  } catch (error: any) {
    logControllerError('Error approving expense', error);
    res.status(400).json({ error: error.message });
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
      res.status(400).json({ error: 'Approver ID and approval notes are required' });
      return;
    }

    const expense = await expenseService.denyExpense(id, approvedById, approvalNotes);
    res.json(expense);
  } catch (error: any) {
    logControllerError('Error denying expense', error);
    res.status(400).json({ error: error.message });
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

    res.json(expense);
  } catch (error: any) {
    logControllerError('Error marking expense as paid', error);
    res.status(400).json({ error: error.message });
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

    res.json(summary);
  } catch (error: any) {
    logControllerError('Error fetching expense summary', error);
    res.status(500).json({ error: error.message });
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
    res.json(expenses);
  } catch (error: any) {
    logControllerError('Error fetching pending expenses', error);
    res.status(500).json({ error: error.message });
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

    res.json(result);
  } catch (error: any) {
    logControllerError('Error fetching user expense history', error);
    res.status(500).json({ error: error.message });
  }
}
