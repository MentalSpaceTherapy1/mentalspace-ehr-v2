import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as clientDocumentsController from '../controllers/clientDocuments.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Document Sharing Routes
 */

// Document upload (general)
router.post('/upload', clientDocumentsController.uploadDocumentFile);

// Client-specific document routes
router.get('/:clientId/documents/shared', clientDocumentsController.getSharedDocumentsForClient);
router.post('/:clientId/documents/share', clientDocumentsController.shareDocumentWithClient);
router.delete('/:clientId/documents/shared/:documentId', clientDocumentsController.revokeDocumentAccess);
router.get('/:clientId/documents/shared/:documentId/analytics', clientDocumentsController.getDocumentAnalytics);

export default router;
