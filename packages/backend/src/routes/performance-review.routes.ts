import express from 'express';
import performanceReviewController from '../controllers/performance-review.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';
import { auditLog } from '../middleware/auditLogger';
import { UserRoles } from '@mentalspace/shared';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Statistics and special endpoints (must come before :id routes)
// Statistics - admin/supervisor only (HR reporting data)
router.get('/statistics', requireRole([UserRoles.ADMINISTRATOR, UserRoles.SUPER_ADMIN, UserRoles.SUPERVISOR]), performanceReviewController.getStatistics.bind(performanceReviewController));
router.get('/stats', requireRole([UserRoles.ADMINISTRATOR, UserRoles.SUPER_ADMIN, UserRoles.SUPERVISOR]), performanceReviewController.getStatistics.bind(performanceReviewController)); // Alias for frontend compatibility
// Upcoming reviews - admin/supervisor only (to manage review schedule)
router.get('/upcoming', requireRole([UserRoles.ADMINISTRATOR, UserRoles.SUPER_ADMIN, UserRoles.SUPERVISOR]), performanceReviewController.getUpcomingReviews.bind(performanceReviewController));
// Employee reviews - ownership validated in controller (user can see own, admin/supervisor can see any)
router.get('/employee/:userId', performanceReviewController.getReviewsByEmployee.bind(performanceReviewController));
// Reviewer reviews - ownership validated in controller (reviewer can see own assigned, admin can see any)
router.get('/reviewer/:reviewerId', performanceReviewController.getReviewsByReviewer.bind(performanceReviewController));

// CRUD operations
// Create review - supervisor/admin only (managers initiate reviews)
router.post('/', requireRole([UserRoles.ADMINISTRATOR, UserRoles.SUPER_ADMIN, UserRoles.SUPERVISOR]), auditLog({ entityType: 'PerformanceReview', action: 'CREATE' }), performanceReviewController.createReview.bind(performanceReviewController));
// Get all - admin/supervisor see all, others see own (filtered in controller)
router.get('/', performanceReviewController.getAllReviews.bind(performanceReviewController));
router.get('/reviews', performanceReviewController.getAllReviews.bind(performanceReviewController)); // Alias for frontend compatibility
// Get by ID - ownership validated in controller
router.get('/:id', auditLog({ entityType: 'PerformanceReview', action: 'VIEW' }), performanceReviewController.getReviewById.bind(performanceReviewController));
// Update - ownership validated in controller (only creator/admin can update)
router.put('/:id', auditLog({ entityType: 'PerformanceReview', action: 'UPDATE' }), performanceReviewController.updateReview.bind(performanceReviewController));
// Delete - admin only
router.delete('/:id', requireRole([UserRoles.ADMINISTRATOR, UserRoles.SUPER_ADMIN]), auditLog({ entityType: 'PerformanceReview', action: 'DELETE' }), performanceReviewController.deleteReview.bind(performanceReviewController));

// Workflow actions - ownership validated in controller
// Self-evaluation - only the employee being reviewed can submit
router.post('/:id/self-evaluation', auditLog({ entityType: 'PerformanceReview', action: 'SUBMIT' }), performanceReviewController.submitSelfEvaluation.bind(performanceReviewController));
// Manager review - only the assigned reviewer can submit
router.post('/:id/manager-review', auditLog({ entityType: 'PerformanceReview', action: 'SUBMIT' }), performanceReviewController.submitManagerReview.bind(performanceReviewController));
// Signature - only the employee being reviewed can sign
router.post('/:id/signature', auditLog({ entityType: 'PerformanceReview', action: 'SIGN' }), performanceReviewController.employeeSignature.bind(performanceReviewController));

export default router;
