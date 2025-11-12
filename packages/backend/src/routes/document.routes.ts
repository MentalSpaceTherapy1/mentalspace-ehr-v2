import { Router } from 'express';
import * as documentController from '../controllers/document.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// DOCUMENT ROUTES
// ============================================================================

/**
 * @route   POST /api/v1/documents
 * @desc    Create a new document
 * @access  Private
 */
router.post('/', documentController.createDocument);

/**
 * @route   GET /api/v1/documents
 * @desc    Get documents with filters
 * @access  Private
 */
router.get('/', documentController.getDocuments);

/**
 * @route   GET /api/v1/documents/:id
 * @desc    Get document by ID
 * @access  Private
 */
router.get('/:id', documentController.getDocumentById);

/**
 * @route   PUT /api/v1/documents/:id
 * @desc    Update a document
 * @access  Private
 */
router.put('/:id', documentController.updateDocument);

/**
 * @route   POST /api/v1/documents/:id/version
 * @desc    Create a new version of a document
 * @access  Private
 */
router.post('/:id/version', documentController.createDocumentVersion);

/**
 * @route   PUT /api/v1/documents/:id/archive
 * @desc    Archive a document
 * @access  Private
 */
router.put('/:id/archive', documentController.archiveDocument);

/**
 * @route   DELETE /api/v1/documents/:id
 * @desc    Delete a document
 * @access  Private
 */
router.delete('/:id', documentController.deleteDocument);

// ============================================================================
// FOLDER ROUTES
// ============================================================================

/**
 * @route   POST /api/v1/documents/folders
 * @desc    Create a new folder
 * @access  Private
 */
router.post('/folders', documentController.createFolder);

/**
 * @route   GET /api/v1/documents/folders
 * @desc    Get folders for current user
 * @access  Private
 */
router.get('/folders', documentController.getFolders);

/**
 * @route   GET /api/v1/documents/folders/:id
 * @desc    Get folder by ID with contents
 * @access  Private
 */
router.get('/folders/:id', documentController.getFolderById);

/**
 * @route   PUT /api/v1/documents/folders/:id
 * @desc    Update a folder
 * @access  Private
 */
router.put('/folders/:id', documentController.updateFolder);

/**
 * @route   DELETE /api/v1/documents/folders/:id
 * @desc    Delete a folder
 * @access  Private
 */
router.delete('/folders/:id', documentController.deleteFolder);

export default router;
