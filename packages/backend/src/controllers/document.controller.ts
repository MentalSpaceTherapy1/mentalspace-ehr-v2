import logger, { logControllerError } from '../utils/logger';
import { Request, Response } from 'express';
import { z } from 'zod';
import * as documentService from '../services/document.service';
import { auditLogger } from '../utils/logger';

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
    const userId = (req as any).user?.userId;

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

    res.status(201).json({
      success: true,
      message: 'Document created successfully',
      data: document,
    });
  } catch (error) {
    logger.error('Create document error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create document',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get documents with filters
 */
export const getDocuments = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { category, folderId, uploadedById, isArchived, tags, search, startDate, endDate } = req.query;

    const filters: documentService.DocumentFilters = {};

    if (category) filters.category = category as any;
    if (folderId !== undefined) filters.folderId = folderId === 'null' ? null : (folderId as string);
    if (uploadedById) filters.uploadedById = uploadedById as string;
    if (isArchived !== undefined) filters.isArchived = isArchived === 'true';
    if (tags) filters.tags = (tags as string).split(',');
    if (search) filters.search = search as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const documents = await documentService.getDocuments(userId, filters);

    res.json({
      success: true,
      data: documents,
      count: documents.length,
    });
  } catch (error) {
    logger.error('Get documents error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve documents',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get document by ID
 */
export const getDocumentById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;

    const document = await documentService.getDocumentById(id, userId);

    res.json({
      success: true,
      data: document,
    });
  } catch (error) {
    logger.error('Get document by ID error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof Error && error.message === 'Document not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve document',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Update a document
 */
export const updateDocument = async (req: Request, res: Response) => {
  try {
    const validatedData = updateDocumentSchema.parse(req.body);
    const userId = (req as any).user?.userId;
    const { id } = req.params;

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

    res.json({
      success: true,
      message: 'Document updated successfully',
      data: document,
    });
  } catch (error) {
    logger.error('Update document error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update document',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Create a new version of a document
 */
export const createDocumentVersion = async (req: Request, res: Response) => {
  try {
    const validatedData = createDocumentSchema.parse(req.body);
    const userId = (req as any).user?.userId;
    const { id } = req.params;

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

    res.status(201).json({
      success: true,
      message: 'Document version created successfully',
      data: newVersion,
    });
  } catch (error) {
    logger.error('Create document version error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create document version',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Archive a document
 */
export const archiveDocument = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;

    const document = await documentService.archiveDocument(id, userId);

    res.json({
      success: true,
      message: 'Document archived successfully',
      data: document,
    });
  } catch (error) {
    logger.error('Archive document error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    res.status(500).json({
      success: false,
      message: 'Failed to archive document',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Delete a document
 */
export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;

    await documentService.deleteDocument(id, userId);

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    logger.error('Delete document error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    res.status(500).json({
      success: false,
      message: 'Failed to delete document',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
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
    const userId = (req as any).user?.userId;

    const folder = await documentService.createFolder({
      name: validatedData.name,
      description: validatedData.description,
      parentId: validatedData.parentId,
      isPublic: validatedData.isPublic,
      accessList: validatedData.accessList,
      createdById: userId,
    });

    res.status(201).json({
      success: true,
      message: 'Folder created successfully',
      data: folder,
    });
  } catch (error) {
    logger.error('Create folder error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create folder',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get folders for current user
 */
export const getFolders = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { parentId } = req.query;

    const folders = await documentService.getFolders(
      userId,
      parentId ? (parentId as string) : undefined
    );

    res.json({
      success: true,
      data: folders,
      count: folders.length,
    });
  } catch (error) {
    logger.error('Get folders error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve folders',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get folder by ID with contents
 */
export const getFolderById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;

    const folder = await documentService.getFolderById(id, userId);

    res.json({
      success: true,
      data: folder,
    });
  } catch (error) {
    logger.error('Get folder by ID error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof Error && error.message === 'Folder not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve folder',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Update a folder
 */
export const updateFolder = async (req: Request, res: Response) => {
  try {
    const validatedData = updateFolderSchema.parse(req.body);
    const userId = (req as any).user?.userId;
    const { id } = req.params;

    const folder = await documentService.updateFolder(id, userId, validatedData);

    res.json({
      success: true,
      message: 'Folder updated successfully',
      data: folder,
    });
  } catch (error) {
    logger.error('Update folder error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update folder',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Delete a folder
 */
export const deleteFolder = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;

    await documentService.deleteFolder(id, userId);

    res.json({
      success: true,
      message: 'Folder deleted successfully',
    });
  } catch (error) {
    logger.error('Delete folder error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    res.status(500).json({
      success: false,
      message: 'Failed to delete folder',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
