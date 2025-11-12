/**
 * Budget Routes
 *
 * Defines API routes for budget management
 *
 * @module routes/budget
 */

import { Router } from 'express';
import * as budgetController from '../controllers/budget.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All budget routes require authentication
router.use(authenticate);

// Budget CRUD operations
router.post('/', budgetController.createBudget);
router.get('/organization/summary', budgetController.getOrganizationSummary);
router.get('/department/:department/summary', budgetController.getDepartmentSummary);
router.get('/:id', budgetController.getBudget);
router.get('/', budgetController.listBudgets);
router.put('/:id', budgetController.updateBudget);

// Budget metrics and utilities
router.get('/:id/utilization', budgetController.getBudgetUtilization);
router.post('/:id/check-availability', budgetController.checkBudgetAvailability);

export default router;
