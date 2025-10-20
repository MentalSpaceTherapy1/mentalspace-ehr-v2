import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { requireClientAccess } from '../middleware/clientAccess';
import * as clientDocumentsController from '../controllers/clientDocuments.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(authorize('ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN'));

/**
 * Document Sharing Routes
 */

// Document upload (general)
router.post('/upload', clientDocumentsController.uploadDocumentFile);

// Client-specific document routes
router.use('/:clientId', requireClientAccess('clientId'));
router.get('/:clientId/documents/shared', clientDocumentsController.getSharedDocumentsForClient);
router.post('/:clientId/documents/share', clientDocumentsController.shareDocumentWithClient);
router.delete('/:clientId/documents/shared/:documentId', clientDocumentsController.revokeDocumentAccess);
router.get('/:clientId/documents/shared/:documentId/analytics', clientDocumentsController.getDocumentAnalytics);

export default router;

