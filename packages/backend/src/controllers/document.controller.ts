import logger, { logControllerError } from '../utils/logger';
import { Request, Response } from 'express';
import { z } from 'zod';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
import * as documentService from '../services/document.service';
import { auditLogger } from '../utils/logger';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound, sendServerError, sendForbidden, sendValidationError } from '../utils/apiResponse';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createDocumentSchema = z.object({
  name: z.string().min(1, 'Document name is required'),
  description: z.string().optional(),
  fileUrl: z.string().url('Invalid file URL'),
  fileType: z.string().min(1, 'File type is required'),
  fileSize: z.number().int().positive('File size must be positive'),
  category: z.enum(['POLICY', 'TRAINING', 'FORM', 'TEMPLATE', 'MEETING_MINUTES', 'REPORT', 'CONTRACT', 'COMPLIANCE', 'OTHER']),
  tags: z.array(z.string()).optional(),
  folderId: z.string().uuid().optional(),
  isPublic: z.boolean().optional(),
  accessList: z.array(z.string().uuid()).optional(),
  expiresAt: z.string().datetime().optional(),
  parentId: z.string().uuid().optional(),
  version: z.string().optional(),
});

const updateDocumentSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.enum(['POLICY', 'TRAINING', 'FORM', 'TEMPLATE', 'MEETING_MINUTES', 'REPORT', 'CONTRACT', 'COMPLIANCE', 'OTHER']).optional(),
  tags: z.array(z.string()).optional(),
  folderId: z.string().uuid().optional(),
  isPublic: z.boolean().optional(),
  accessList: z.array(z.string().uuid()).optional(),
  expiresAt: z.string().datetime().optional(),
});

const createFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required'),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
  isPublic: z.boolean().optional(),
  accessList: z.array(z.string().uuid()).optional(),
});

const updateFolderSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
  accessList: z.array(z.string().uuid()).optional(),
});

// ============================================================================
// DOCUMENT CONTROLLERS
// ============================================================================

/**
 * Create a new document
 */
export const createDocument = async (req: Request, res: Response) => {
  try {
    const validatedData = createDocumentSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const document = await documentService.createDocument({
      name: validatedData.name,
      description: validatedData.description,
      fileUrl: validatedData.fileUrl,
      fileType: validatedData.fileType,
      fileSize: validatedData.fileSize,
      category: validatedData.category,
      tags: validatedData.tags,
      folderId: validatedData.folderId,
      uploadedById: userId,
      isPublic: validatedData.isPublic,
      accessList: validatedData.accessList,
      expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
      parentId: validatedData.parentId,
      version: validatedData.version,
    });

    return sendCreated(res, document, 'Document created successfully');
  } catch (error) {
    logger.error('Create document error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return sendValidationError(res, error.errors.map(e => ({ path: e.path.join('.'), message: e.message })));
    }

    return sendServerError(res, 'Failed to create document');
  }
};

/**
 * Get documents with filters
 */
export const getDocuments = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { category, folderId, uploadedById, isArchived, tags, search, startDate, endDate } = req.query;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const filters: documentService.DocumentFilters = {};

    if (category) filters.category = category as documentService.DocumentFilters['category'];
    if (folderId !== undefined) filters.folderId = folderId === 'null' ? undefined : (folderId as string);
    if (uploadedById) filters.uploadedById = uploadedById as string;
    if (isArchived !== undefined) filters.isArchived = isArchived === 'true';
    if (tags) filters.tags = (tags as string).split(',');
    if (search) filters.search = search as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const documents = await documentService.getDocuments(userId, filters);

    return sendSuccess(res, documents);
  } catch (error) {
    logger.error('Get documents error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    return sendServerError(res, 'Failed to retrieve documents');
  }
};

/**
 * Get document by ID
 */
export const getDocumentById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const document = await documentService.getDocumentById(id, userId);

    return sendSuccess(res, document);
  } catch (error) {
    logger.error('Get document by ID error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof Error && getErrorMessage(error) === 'Document not found') {
      return sendNotFound(res, 'Document');
    }

    if (error instanceof Error && getErrorMessage(error) === 'Access denied') {
      return sendForbidden(res, 'Access denied');
    }

    return sendServerError(res, 'Failed to retrieve document');
  }
};

/**
 * Update a document
 */
export const updateDocument = async (req: Request, res: Response) => {
  try {
    const validatedData = updateDocumentSchema.parse(req.body);
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const updateData: documentService.UpdateDocumentData = {};

    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.category) updateData.category = validatedData.category;
    if (validatedData.tags) updateData.tags = validatedData.tags;
    if (validatedData.folderId !== undefined) updateData.folderId = validatedData.folderId;
    if (validatedData.isPublic !== undefined) updateData.isPublic = validatedData.isPublic;
    if (validatedData.accessList) updateData.accessList = validatedData.accessList;
    if (validatedData.expiresAt) updateData.expiresAt = new Date(validatedData.expiresAt);

    const document = await documentService.updateDocument(id, userId, updateData);

    return sendSuccess(res, document, 'Document updated successfully');
  } catch (error) {
    logger.error('Update document error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return sendValidationError(res, error.errors.map(e => ({ path: e.path.join('.'), message: e.message })));
    }

    return sendServerError(res, 'Failed to update document');
  }
};

/**
 * Create a new version of a document
 */
export const createDocumentVersion = async (req: Request, res: Response) => {
  try {
    const validatedData = createDocumentSchema.parse(req.body);
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const newVersion = await documentService.createDocumentVersion(id, {
      name: validatedData.name,
      description: validatedData.description,
      fileUrl: validatedData.fileUrl,
      fileType: validatedData.fileType,
      fileSize: validatedData.fileSize,
      category: validatedData.category,
      tags: validatedData.tags,
      folderId: validatedData.folderId,
      uploadedById: userId,
      isPublic: validatedData.isPublic,
      accessList: validatedData.accessList,
      expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
    });

    return sendCreated(res, newVersion, 'Document version created successfully');
  } catch (error) {
    logger.error('Create document version error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return sendValidationError(res, error.errors.map(e => ({ path: e.path.join('.'), message: e.message })));
    }

    return sendServerError(res, 'Failed to create document version');
  }
};

/**
 * Archive a document
 */
export const archiveDocument = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const document = await documentService.archiveDocument(id, userId);

    return sendSuccess(res, document, 'Document archived successfully');
  } catch (error) {
    logger.error('Archive document error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    return sendServerError(res, 'Failed to archive document');
  }
};

/**
 * Delete a document
 */
export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    await documentService.deleteDocument(id, userId);

    return sendSuccess(res, null, 'Document deleted successfully');
  } catch (error) {
    logger.error('Delete document error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    return sendServerError(res, 'Failed to delete document');
  }
};

// ============================================================================
// FOLDER CONTROLLERS
// ============================================================================

/**
 * Create a new folder
 */
export const createFolder = async (req: Request, res: Response) => {
  try {
    const validatedData = createFolderSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const folder = await documentService.createFolder({
      name: validatedData.name,
      description: validatedData.description,
      parentId: validatedData.parentId,
      isPublic: validatedData.isPublic,
      accessList: validatedData.accessList,
      createdById: userId,
    });

    return sendCreated(res, folder, 'Folder created successfully');
  } catch (error) {
    logger.error('Create folder error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return sendValidationError(res, error.errors.map(e => ({ path: e.path.join('.'), message: e.message })));
    }

    return sendServerError(res, 'Failed to create folder');
  }
};

/**
 * Get folders for current user
 */
export const getFolders = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { parentId } = req.query;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const folders = await documentService.getFolders(
      userId,
      parentId ? (parentId as string) : undefined
    );

    return sendSuccess(res, folders);
  } catch (error) {
    logger.error('Get folders error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    return sendServerError(res, 'Failed to retrieve folders');
  }
};

/**
 * Get folder by ID with contents
 */
export const getFolderById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const folder = await documentService.getFolderById(id, userId);

    return sendSuccess(res, folder);
  } catch (error) {
    logger.error('Get folder by ID error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof Error && getErrorMessage(error) === 'Folder not found') {
      return sendNotFound(res, 'Folder');
    }

    if (error instanceof Error && getErrorMessage(error) === 'Access denied') {
      return sendForbidden(res, 'Access denied');
    }

    return sendServerError(res, 'Failed to retrieve folder');
  }
};

/**
 * Update a folder
 */
export const updateFolder = async (req: Request, res: Response) => {
  try {
    const validatedData = updateFolderSchema.parse(req.body);
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const folder = await documentService.updateFolder(id, userId, validatedData);

    return sendSuccess(res, folder, 'Folder updated successfully');
  } catch (error) {
    logger.error('Update folder error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return sendValidationError(res, error.errors.map(e => ({ path: e.path.join('.'), message: e.message })));
    }

    return sendServerError(res, 'Failed to update folder');
  }
};

/**
 * Delete a folder
 */
export const deleteFolder = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    await documentService.deleteFolder(id, userId);

    return sendSuccess(res, null, 'Folder deleted successfully');
  } catch (error) {
    logger.error('Delete folder error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    return sendServerError(res, 'Failed to delete folder');
  }
};
