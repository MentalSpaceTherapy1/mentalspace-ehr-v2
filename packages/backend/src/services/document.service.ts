import { auditLogger } from '../utils/logger';
import prisma from './database';
import { DocumentCategory } from '@mentalspace/database';

// ============================================================================
// DOCUMENT OPERATIONS
// ============================================================================

export interface CreateDocumentData {
  name: string;
  description?: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: DocumentCategory;
  tags?: string[];
  folderId?: string;
  uploadedById: string;
  isPublic?: boolean;
  accessList?: string[];
  expiresAt?: Date;
  parentId?: string;
  version?: string;
}

export interface UpdateDocumentData {
  name?: string;
  description?: string;
  category?: DocumentCategory;
  tags?: string[];
  folderId?: string;
  isPublic?: boolean;
  accessList?: string[];
  expiresAt?: Date;
}

export interface DocumentFilters {
  category?: DocumentCategory;
  folderId?: string;
  uploadedById?: string;
  isArchived?: boolean;
  tags?: string[];
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Create a new document
 */
export async function createDocument(data: CreateDocumentData) {
  try {
    // Validate uploader exists
    const uploader = await prisma.user.findUnique({
      where: { id: data.uploadedById },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!uploader) {
      throw new Error('Uploader not found');
    }

    // Validate folder if provided
    if (data.folderId) {
      const folder = await prisma.documentFolder.findUnique({
        where: { id: data.folderId },
      });

      if (!folder) {
        throw new Error('Folder not found');
      }

      // Check if user has access to the folder
      if (!folder.isPublic && !folder.accessList.includes(data.uploadedById)) {
        throw new Error('Access denied to folder');
      }
    }

    // Create the document
    const document = await prisma.document.create({
      data: {
        name: data.name,
        description: data.description,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        fileSize: data.fileSize,
        category: data.category,
        tags: data.tags || [],
        folderId: data.folderId,
        uploadedById: data.uploadedById,
        isPublic: data.isPublic || false,
        accessList: data.accessList || [],
        expiresAt: data.expiresAt,
        parentId: data.parentId,
        version: data.version || '1.0',
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    auditLogger.info('Document created', {
      userId: data.uploadedById,
      documentId: document.id,
      documentName: document.name,
      category: document.category,
      fileSize: document.fileSize,
      action: 'DOCUMENT_CREATED',
    });

    return document;
  } catch (error) {
    auditLogger.error('Create document error', {
      userId: data.uploadedById,
      error: error instanceof Error ? error.message : 'Unknown error',
      action: 'DOCUMENT_CREATE_FAILED',
    });
    throw error;
  }
}

/**
 * Get documents with filters
 */
export async function getDocuments(userId: string, filters: DocumentFilters = {}) {
  try {
    const where: any = {
      OR: [
        { isPublic: true },
        { uploadedById: userId },
        { accessList: { has: userId } },
      ],
    };

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.folderId !== undefined) {
      where.folderId = filters.folderId;
    }

    if (filters.uploadedById) {
      where.uploadedById = filters.uploadedById;
    }

    if (filters.isArchived !== undefined) {
      where.isArchived = filters.isArchived;
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
            version: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return documents;
  } catch (error) {
    auditLogger.error('Get documents error', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Get document by ID
 */
export async function getDocumentById(documentId: string, userId: string) {
  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
            version: true,
          },
        },
        versions: {
          select: {
            id: true,
            name: true,
            version: true,
            createdAt: true,
            uploadedBy: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Check access permissions
    if (!document.isPublic && document.uploadedById !== userId && !document.accessList.includes(userId)) {
      throw new Error('Access denied');
    }

    return document;
  } catch (error) {
    auditLogger.error('Get document by ID error', {
      userId,
      documentId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Update a document
 */
export async function updateDocument(documentId: string, userId: string, data: UpdateDocumentData) {
  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { uploadedById: true },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    if (document.uploadedById !== userId) {
      throw new Error('Only the document owner can update it');
    }

    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data,
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    auditLogger.info('Document updated', {
      userId,
      documentId,
      action: 'DOCUMENT_UPDATED',
    });

    return updatedDocument;
  } catch (error) {
    auditLogger.error('Update document error', {
      userId,
      documentId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Create a new version of a document
 */
export async function createDocumentVersion(parentId: string, data: CreateDocumentData) {
  try {
    const parent = await prisma.document.findUnique({
      where: { id: parentId },
      select: { uploadedById: true, name: true, category: true, version: true },
    });

    if (!parent) {
      throw new Error('Parent document not found');
    }

    if (parent.uploadedById !== data.uploadedById) {
      throw new Error('Only the document owner can create a new version');
    }

    // Calculate new version number
    const currentVersion = parseFloat(parent.version);
    const newVersion = (currentVersion + 0.1).toFixed(1);

    const newDocument = await createDocument({
      ...data,
      parentId,
      version: newVersion,
    });

    auditLogger.info('Document version created', {
      userId: data.uploadedById,
      parentId,
      newDocumentId: newDocument.id,
      version: newVersion,
      action: 'DOCUMENT_VERSION_CREATED',
    });

    return newDocument;
  } catch (error) {
    auditLogger.error('Create document version error', {
      userId: data.uploadedById,
      parentId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Archive a document
 */
export async function archiveDocument(documentId: string, userId: string) {
  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { uploadedById: true },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    if (document.uploadedById !== userId) {
      throw new Error('Only the document owner can archive it');
    }

    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: { isArchived: true },
    });

    auditLogger.info('Document archived', {
      userId,
      documentId,
      action: 'DOCUMENT_ARCHIVED',
    });

    return updatedDocument;
  } catch (error) {
    auditLogger.error('Archive document error', {
      userId,
      documentId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Delete a document (only if user is owner)
 */
export async function deleteDocument(documentId: string, userId: string) {
  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { uploadedById: true },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    if (document.uploadedById !== userId) {
      throw new Error('Only the document owner can delete it');
    }

    await prisma.document.delete({
      where: { id: documentId },
    });

    auditLogger.info('Document deleted', {
      userId,
      documentId,
      action: 'DOCUMENT_DELETED',
    });

    return { success: true };
  } catch (error) {
    auditLogger.error('Delete document error', {
      userId,
      documentId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// ============================================================================
// FOLDER OPERATIONS
// ============================================================================

export interface CreateFolderData {
  name: string;
  description?: string;
  parentId?: string;
  isPublic?: boolean;
  accessList?: string[];
  createdById: string;
}

export interface UpdateFolderData {
  name?: string;
  description?: string;
  isPublic?: boolean;
  accessList?: string[];
}

/**
 * Create a new folder
 */
export async function createFolder(data: CreateFolderData) {
  try {
    // Validate creator exists
    const creator = await prisma.user.findUnique({
      where: { id: data.createdById },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!creator) {
      throw new Error('Creator not found');
    }

    // Validate parent folder if provided
    if (data.parentId) {
      const parent = await prisma.documentFolder.findUnique({
        where: { id: data.parentId },
      });

      if (!parent) {
        throw new Error('Parent folder not found');
      }

      // Check if user has access to parent folder
      if (!parent.isPublic && !parent.accessList.includes(data.createdById)) {
        throw new Error('Access denied to parent folder');
      }
    }

    // Create the folder
    const folder = await prisma.documentFolder.create({
      data: {
        name: data.name,
        description: data.description,
        parentId: data.parentId,
        isPublic: data.isPublic || false,
        accessList: data.accessList || [],
        createdById: data.createdById,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    auditLogger.info('Folder created', {
      userId: data.createdById,
      folderId: folder.id,
      folderName: folder.name,
      action: 'FOLDER_CREATED',
    });

    return folder;
  } catch (error) {
    auditLogger.error('Create folder error', {
      userId: data.createdById,
      error: error instanceof Error ? error.message : 'Unknown error',
      action: 'FOLDER_CREATE_FAILED',
    });
    throw error;
  }
}

/**
 * Get all folders for a user
 */
export async function getFolders(userId: string, parentId?: string) {
  try {
    const folders = await prisma.documentFolder.findMany({
      where: {
        OR: [
          { isPublic: true },
          { createdById: userId },
          { accessList: { has: userId } },
        ],
        parentId: parentId || null,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            documents: true,
            subfolders: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return folders;
  } catch (error) {
    auditLogger.error('Get folders error', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Get folder by ID with contents
 */
export async function getFolderById(folderId: string, userId: string) {
  try {
    const folder = await prisma.documentFolder.findUnique({
      where: { id: folderId },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        subfolders: {
          include: {
            _count: {
              select: {
                documents: true,
                subfolders: true,
              },
            },
          },
        },
        documents: {
          where: {
            isArchived: false,
          },
          include: {
            uploadedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!folder) {
      throw new Error('Folder not found');
    }

    // Check access permissions
    if (!folder.isPublic && folder.createdById !== userId && !folder.accessList.includes(userId)) {
      throw new Error('Access denied');
    }

    return folder;
  } catch (error) {
    auditLogger.error('Get folder by ID error', {
      userId,
      folderId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Update a folder
 */
export async function updateFolder(folderId: string, userId: string, data: UpdateFolderData) {
  try {
    const folder = await prisma.documentFolder.findUnique({
      where: { id: folderId },
      select: { createdById: true },
    });

    if (!folder) {
      throw new Error('Folder not found');
    }

    if (folder.createdById !== userId) {
      throw new Error('Only the folder creator can update it');
    }

    const updatedFolder = await prisma.documentFolder.update({
      where: { id: folderId },
      data,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    auditLogger.info('Folder updated', {
      userId,
      folderId,
      action: 'FOLDER_UPDATED',
    });

    return updatedFolder;
  } catch (error) {
    auditLogger.error('Update folder error', {
      userId,
      folderId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Delete a folder (only if empty)
 */
export async function deleteFolder(folderId: string, userId: string) {
  try {
    const folder = await prisma.documentFolder.findUnique({
      where: { id: folderId },
      select: {
        createdById: true,
        _count: {
          select: {
            documents: true,
            subfolders: true,
          },
        },
      },
    });

    if (!folder) {
      throw new Error('Folder not found');
    }

    if (folder.createdById !== userId) {
      throw new Error('Only the folder creator can delete it');
    }

    if (folder._count.documents > 0 || folder._count.subfolders > 0) {
      throw new Error('Cannot delete folder with contents. Please move or delete all documents and subfolders first.');
    }

    await prisma.documentFolder.delete({
      where: { id: folderId },
    });

    auditLogger.info('Folder deleted', {
      userId,
      folderId,
      action: 'FOLDER_DELETED',
    });

    return { success: true };
  } catch (error) {
    auditLogger.error('Delete folder error', {
      userId,
      folderId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
