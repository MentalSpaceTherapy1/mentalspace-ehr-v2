import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as AmendmentController from '../controllers/amendment.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Amendment routes
router.post('/clinical-notes/:id/amend', AmendmentController.amendClinicalNote);
router.post('/amendments/:id/sign', AmendmentController.signAmendment);
router.get('/clinical-notes/:id/amendments', AmendmentController.getAmendments);
router.get('/clinical-notes/:id/versions', AmendmentController.getVersionHistory);
router.get('/versions/compare', AmendmentController.compareVersions);

export default router;
