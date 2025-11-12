import { Router } from 'express';
import {
  getDataSources,
  getTemplates,
  createReport,
  getReports,
  getReportById,
  updateReport,
  deleteReport,
  executeReport,
  cloneReport,
  shareReport,
  getReportVersions,
  rollbackToVersion,
  validateQuery,
  previewQuery
} from '../controllers/custom-reports.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Data source metadata
router.get('/data-sources', getDataSources);

// Report templates
router.get('/templates', getTemplates);

// Query validation and preview
router.post('/validate', validateQuery);
router.post('/preview', previewQuery);

// Report CRUD
router.post('/', createReport);
router.get('/', getReports);
router.get('/:id', getReportById);
router.put('/:id', updateReport);
router.delete('/:id', deleteReport);

// Report execution
router.post('/:id/execute', executeReport);

// Report cloning
router.post('/:id/clone', cloneReport);

// Report sharing
router.post('/:id/share', shareReport);

// Report versions
router.get('/:id/versions', getReportVersions);
router.post('/:id/versions/:versionId/rollback', rollbackToVersion);

export default router;
