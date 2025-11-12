import { Router } from 'express';
import { subscriptionsController } from '../controllers/subscriptions.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Subscription management
router.post('/', subscriptionsController.createSubscription);
router.get('/', subscriptionsController.getSubscriptions);
router.get('/:id', subscriptionsController.getSubscriptionById);
router.put('/:id', subscriptionsController.updateSubscription);
router.delete('/:id', subscriptionsController.deleteSubscription);

// Subscription actions
router.post('/:id/pause', subscriptionsController.pauseSubscription);
router.post('/:id/resume', subscriptionsController.resumeSubscription);

// Subscription history
router.get('/:id/history', subscriptionsController.getSubscriptionHistory);

export default router;
