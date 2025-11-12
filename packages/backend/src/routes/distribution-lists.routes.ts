import { Router } from 'express';
import { distributionListsController } from '../controllers/distribution-lists.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Distribution list management
router.post('/', distributionListsController.createDistributionList);
router.get('/', distributionListsController.getDistributionLists);
router.get('/:id', distributionListsController.getDistributionListById);
router.put('/:id', distributionListsController.updateDistributionList);
router.delete('/:id', distributionListsController.deleteDistributionList);

// Email management within lists
router.post('/:id/emails', distributionListsController.addEmailToList);
router.delete('/:id/emails/:email', distributionListsController.removeEmailFromList);

export default router;
