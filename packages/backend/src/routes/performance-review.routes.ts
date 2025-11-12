import express from 'express';
import performanceReviewController from '../controllers/performance-review.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Statistics and special endpoints (must come before :id routes)
router.get('/statistics', performanceReviewController.getStatistics.bind(performanceReviewController));
router.get('/stats', performanceReviewController.getStatistics.bind(performanceReviewController)); // Alias for frontend compatibility
router.get('/upcoming', performanceReviewController.getUpcomingReviews.bind(performanceReviewController));
router.get('/employee/:userId', performanceReviewController.getReviewsByEmployee.bind(performanceReviewController));
router.get('/reviewer/:reviewerId', performanceReviewController.getReviewsByReviewer.bind(performanceReviewController));

// CRUD operations
router.post('/', performanceReviewController.createReview.bind(performanceReviewController));
router.get('/', performanceReviewController.getAllReviews.bind(performanceReviewController));
router.get('/reviews', performanceReviewController.getAllReviews.bind(performanceReviewController)); // Alias for frontend compatibility
router.get('/:id', performanceReviewController.getReviewById.bind(performanceReviewController));
router.put('/:id', performanceReviewController.updateReview.bind(performanceReviewController));
router.delete('/:id', performanceReviewController.deleteReview.bind(performanceReviewController));

// Workflow actions
router.post('/:id/self-evaluation', performanceReviewController.submitSelfEvaluation.bind(performanceReviewController));
router.post('/:id/manager-review', performanceReviewController.submitManagerReview.bind(performanceReviewController));
router.post('/:id/signature', performanceReviewController.employeeSignature.bind(performanceReviewController));

export default router;
