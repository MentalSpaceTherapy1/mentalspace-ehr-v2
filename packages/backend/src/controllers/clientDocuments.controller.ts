import { Request, Response } from 'express';
import { z } from 'zod';
import logger from '../utils/logger';
import prisma from '../services/database';
import {
  uploadDocument,
  generateUploadPresignedUrl,
  generatePresignedUrl,
  getDocumentsBucket,
  isStorageConfigured,
} from '../services/storage.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * EHR-side controller for managing client documents
 * These endpoints are for clinicians/staff to share documents with clients
 */

// Validation schemas
const shareDocumentSchema = z.object({
  clientId: z.string().uuid(),
  documentName: z.string().min(1),
  documentType: z.string().min(1),
  documentS3Key: z.string().min(1), // S3 key for the document
  expiresAt: z.string().datetime().optional(),
});

/**
 * Get all documents shared with a client
 * GET /api/v1/clients/:clientId/documents/shared
 */
export const getSharedDocumentsForClient = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const documents = await prisma.sharedDocument.findMany({
      where: { clientId },
      orderBy: { sharedAt: 'desc' },
    });

    logger.info(`Retrieved ${documents.length} shared documents for client ${clientId}`);

    return res.status(200).json({
      success: true,
      data: documents,
    });
  } catch (error) {
    logger.error('Error fetching shared documents:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch shared documents',
    });
  }
};

/**
 * Share a document with a client
 * POST /api/v1/clients/:clientId/documents/share
 */
export const shareDocumentWithClient = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const userId = (req as any).user?.userId;

    const validatedData = shareDocumentSchema.parse({ ...req.body, clientId });

    const sharedDocument = await prisma.sharedDocument.create({
      data: {
        clientId,
        documentName: validatedData.documentName,
        documentType: validatedData.documentType,
        documentS3Key: validatedData.documentS3Key,
        sharedBy: userId,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
      },
    });

    logger.info(`Document shared with client ${clientId} by user ${userId}`);

    return res.status(201).json({
      success: true,
      message: 'Document shared successfully',
      data: sharedDocument,
    });
  } catch (error) {
    logger.error('Error sharing document:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to share document',
    });
  }
};

/**
 * Revoke document access (delete shared document)
 * DELETE /api/v1/clients/:clientId/documents/shared/:documentId
 */
export const revokeDocumentAccess = async (req: Request, res: Response) => {
  try {
    const { clientId, documentId } = req.params;
    const userId = (req as any).user?.userId;

    const document = await prisma.sharedDocument.findFirst({
      where: {
        id: documentId,
        clientId,
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Shared document not found',
      });
    }

    await prisma.sharedDocument.delete({
      where: { id: documentId },
    });

    logger.info(`Document access revoked for document ${documentId} by user ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'Document access revoked successfully',
    });
  } catch (error) {
    logger.error('Error revoking document access:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to revoke document access',
    });
  }
};

/**
 * Get document view analytics
 * GET /api/v1/clients/:clientId/documents/shared/:documentId/analytics
 */
export const getDocumentAnalytics = async (req: Request, res: Response) => {
  try {
    const { clientId, documentId } = req.params;

    const document = await prisma.sharedDocument.findFirst({
      where: {
        id: documentId,
        clientId,
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Shared document not found',
      });
    }

    const analytics = {
      viewCount: document.viewCount,
      lastViewedAt: document.lastViewedAt,
      sharedAt: document.sharedAt,
      expiresAt: document.expiresAt,
      hasBeenViewed: document.viewCount > 0,
    };

    return res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('Error fetching document analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch document analytics',
    });
  }
};

/**
 * Upload file to S3
 * POST /api/v1/clients/documents/upload
 *
 * Supports two modes:
 * 1. Direct upload: Send file in request body (for small files)
 * 2. Presigned URL: Request a presigned URL for client-side upload (for large files)
 */
export const uploadDocumentFile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Check if S3 is configured
    if (!isStorageConfigured()) {
      logger.error('S3 storage not configured');
      return res.status(503).json({
        success: false,
        message: 'File storage service is not configured. Please contact administrator.',
      });
    }

    const { fileName, mimeType, clientId, documentType, requestPresignedUrl } = req.body;

    if (!fileName) {
      return res.status(400).json({
        success: false,
        message: 'fileName is required',
      });
    }

    const bucket = getDocumentsBucket();
    const fileExtension = fileName.split('.').pop() || 'pdf';
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `documents/${clientId || 'general'}/${Date.now()}_${uuidv4()}.${fileExtension}`;

    // Mode 1: Return presigned URL for client-side upload
    if (requestPresignedUrl) {
      const { url, key: s3Key } = await generateUploadPresignedUrl({
        bucket,
        key,
        contentType: mimeType || 'application/octet-stream',
        expiresIn: 3600, // 1 hour
      });

      logger.info(`Presigned upload URL generated for user ${userId}`, {
        bucket,
        key: s3Key,
        fileName: sanitizedFileName,
      });

      return res.status(200).json({
        success: true,
        message: 'Presigned URL generated for upload',
        data: {
          uploadUrl: url,
          s3Key: s3Key,
          bucket,
          expiresIn: 3600,
          method: 'PUT',
          headers: {
            'Content-Type': mimeType || 'application/octet-stream',
          },
        },
      });
    }

    // Mode 2: Direct upload from request body (for small files via base64)
    const { fileContent } = req.body;

    if (!fileContent) {
      return res.status(400).json({
        success: false,
        message: 'Either fileContent (base64) or requestPresignedUrl must be provided',
      });
    }

    // Decode base64 file content
    const fileBuffer = Buffer.from(fileContent, 'base64');

    // Upload to S3
    const uploadResult = await uploadDocument({
      bucket,
      key,
      body: fileBuffer,
      contentType: mimeType || 'application/octet-stream',
      metadata: {
        'original-filename': sanitizedFileName,
        'uploaded-by': userId,
        'client-id': clientId || '',
        'document-type': documentType || '',
      },
      tags: {
        Type: 'ClientDocument',
        UploadedBy: userId,
        ClientId: clientId || 'general',
      },
    });

    // Generate a presigned URL for accessing the uploaded file
    const downloadUrl = await generatePresignedUrl({
      bucket,
      key,
      expiresIn: 86400, // 24 hours for download
      contentType: mimeType || 'application/octet-stream',
    });

    logger.info(`File uploaded successfully by user ${userId}`, {
      bucket,
      key,
      size: uploadResult.size,
      fileName: sanitizedFileName,
    });

    return res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        s3Key: key,
        bucket,
        fileUrl: downloadUrl,
        fileName: sanitizedFileName,
        fileSize: uploadResult.size,
        mimeType: mimeType || 'application/octet-stream',
        etag: uploadResult.etag,
      },
    });
  } catch (error: any) {
    logger.error('Error uploading file:', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to upload file: ' + error.message,
    });
  }
};

/**
 * Get a presigned URL for downloading a document
 * GET /api/v1/clients/documents/download/:s3Key
 */
export const getDocumentDownloadUrl = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { s3Key } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!s3Key) {
      return res.status(400).json({
        success: false,
        message: 's3Key is required',
      });
    }

    const bucket = getDocumentsBucket();
    const downloadUrl = await generatePresignedUrl({
      bucket,
      key: decodeURIComponent(s3Key),
      expiresIn: 3600, // 1 hour
    });

    logger.info(`Download URL generated for document by user ${userId}`, { s3Key });

    return res.status(200).json({
      success: true,
      data: {
        downloadUrl,
        expiresIn: 3600,
      },
    });
  } catch (error: any) {
    logger.error('Error generating download URL:', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to generate download URL',
    });
  }
};
