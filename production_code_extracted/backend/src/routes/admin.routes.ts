import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as seedFormsController from '../controllers/admin/seedForms.controller';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

/**
 * Temporary admin routes for database seeding
 * These should be removed or secured in production
 */

// Seed intake forms
router.post('/seed/intake-forms', seedFormsController.seedIntakeForms);

export default router;
