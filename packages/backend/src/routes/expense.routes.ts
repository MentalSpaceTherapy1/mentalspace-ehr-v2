/**
 * Expense Routes
 *
 * Defines API routes for expense management
 *
 * @module routes/expense
 */

import { Router } from 'express';
import * as expenseController from '../controllers/expense.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All expense routes require authentication
router.use(authenticate);

// Expense CRUD operations
router.post('/', expenseController.createExpense);
router.get('/summary', expenseController.getExpenseSummary);
router.get('/pending', expenseController.getPendingExpenses);
router.get('/user/:userId/history', expenseController.getUserExpenseHistory);
router.get('/:id', expenseController.getExpense);
router.get('/', expenseController.listExpenses);
router.put('/:id', expenseController.updateExpense);

// Expense workflow operations
router.post('/:id/approve', expenseController.approveExpense);
router.post('/:id/deny', expenseController.denyExpense);
router.post('/:id/mark-paid', expenseController.markExpensePaid);

export default router;
