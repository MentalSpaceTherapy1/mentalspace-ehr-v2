import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as seedFormsController from '../controllers/admin/seedForms.controller';
import * as guardianAdminController from '../controllers/admin/guardianAdmin.controller';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

/**
 * Temporary admin routes for database seeding
 * These should be removed or secured in production
 */

// Seed intake forms
router.post('/seed/intake-forms', seedFormsController.seedIntakeForms);

/**
 * Guardian Verification Admin Routes
 * For managing guardian-minor relationship verification
 */
router.get('/guardian/stats', guardianAdminController.getGuardianStats);
router.get('/guardian/relationships', guardianAdminController.getGuardianRelationships);
router.put('/guardian/:id/verify', guardianAdminController.verifyGuardianRelationship);
router.put('/guardian/:id/reject', guardianAdminController.rejectGuardianRelationship);
router.put('/guardian/:id/revoke', guardianAdminController.revokeGuardianRelationship);
router.post('/guardian/document-url', guardianAdminController.getDocumentUrl);

export default router;
