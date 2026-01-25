import { Request, Response } from 'express';
import { z } from 'zod';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
import logger from '../utils/logger';
// Phase 3.2: Removed direct prisma import - using service methods instead
import * as clientDocumentsService from '../services/clientDocuments.service';
import {
  uploadDocument,
  generateUploadPresignedUrl,
  generatePresignedUrl,
  getDocumentsBucket,
  isStorageConfigured,
} from '../services/storage.service';
import { v4 as uuidv4 } from 'uuid';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound, sendServerError, sendValidationError, sendError } from '../utils/apiResponse';

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

    // Phase 3.2: Use service method instead of direct prisma call
    const documents = await clientDocumentsService.getSharedDocumentsForClient(clientId);

    logger.info(`Retrieved ${documents.length} shared documents for client ${clientId}`);

    return sendSuccess(res, documents);
  } catch (error) {
    logger.error('Error fetching shared documents:', error);
    return sendServerError(res, 'Failed to fetch shared documents');
  }
};

/**
 * Share a document with a client
 * POST /api/v1/clients/:clientId/documents/share
 */
export const shareDocumentWithClient = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const validatedData = shareDocumentSchema.parse({ ...req.body, clientId });

    // Phase 3.2: Use service method instead of direct prisma call
    const sharedDocument = await clientDocumentsService.shareDocument({
      clientId,
      documentName: validatedData.documentName,
      documentType: validatedData.documentType,
      documentS3Key: validatedData.documentS3Key,
      sharedBy: userId,
      expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
    });

    logger.info(`Document shared with client ${clientId} by user ${userId}`);

    return sendCreated(res, sharedDocument, 'Document shared successfully');
  } catch (error) {
    logger.error('Error sharing document:', error);

    if (error instanceof z.ZodError) {
      return sendValidationError(res, error.errors.map(e => ({ path: e.path.join('.'), message: e.message })));
    }

    return sendServerError(res, 'Failed to share document');
  }
};

/**
 * Revoke document access (delete shared document)
 * DELETE /api/v1/clients/:clientId/documents/shared/:documentId
 */
export const revokeDocumentAccess = async (req: Request, res: Response) => {
  try {
    const { clientId, documentId } = req.params;
    const userId = req.user?.userId;

    // Phase 3.2: Use service methods instead of direct prisma calls
    const document = await clientDocumentsService.findSharedDocument(documentId, clientId);

    if (!document) {
      return sendNotFound(res, 'Shared document');
    }

    await clientDocumentsService.deleteSharedDocument(documentId);

    logger.info(`Document access revoked for document ${documentId} by user ${userId}`);

    return sendSuccess(res, null, 'Document access revoked successfully');
  } catch (error) {
    logger.error('Error revoking document access:', error);
    return sendServerError(res, 'Failed to revoke document access');
  }
};

/**
 * Get document view analytics
 * GET /api/v1/clients/:clientId/documents/shared/:documentId/analytics
 */
export const getDocumentAnalytics = async (req: Request, res: Response) => {
  try {
    const { clientId, documentId } = req.params;

    // Phase 3.2: Use service method instead of direct prisma call
    const result = await clientDocumentsService.getDocumentWithAnalytics(documentId, clientId);

    if (!result) {
      return sendNotFound(res, 'Shared document');
    }

    return sendSuccess(res, result.analytics);
  } catch (error) {
    logger.error('Error fetching document analytics:', error);
    return sendServerError(res, 'Failed to fetch document analytics');
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
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    // Check if S3 is configured
    if (!isStorageConfigured()) {
      logger.error('S3 storage not configured');
      return sendError(res, 503, 'File storage service is not configured. Please contact administrator.');
    }

    const { fileName, mimeType, clientId, documentType, requestPresignedUrl } = req.body;

    if (!fileName) {
      return sendBadRequest(res, 'fileName is required');
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

      return sendSuccess(res, {
        uploadUrl: url,
        s3Key: s3Key,
        bucket,
        expiresIn: 3600,
        method: 'PUT',
        headers: {
          'Content-Type': mimeType || 'application/octet-stream',
        },
      }, 'Presigned URL generated for upload');
    }

    // Mode 2: Direct upload from request body (for small files via base64)
    const { fileContent } = req.body;

    if (!fileContent) {
      return sendBadRequest(res, 'Either fileContent (base64) or requestPresignedUrl must be provided');
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

    return sendSuccess(res, {
      s3Key: key,
      bucket,
      fileUrl: downloadUrl,
      fileName: sanitizedFileName,
      fileSize: uploadResult.size,
      mimeType: mimeType || 'application/octet-stream',
      etag: uploadResult.etag,
    }, 'File uploaded successfully');
  } catch (error) {
    logger.error('Error uploading file:', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to upload file: ' + getErrorMessage(error));
  }
};

/**
 * Get a presigned URL for downloading a document
 * GET /api/v1/clients/documents/download/:s3Key
 */
export const getDocumentDownloadUrl = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { s3Key } = req.params;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    if (!s3Key) {
      return sendBadRequest(res, 's3Key is required');
    }

    const bucket = getDocumentsBucket();
    const downloadUrl = await generatePresignedUrl({
      bucket,
      key: decodeURIComponent(s3Key),
      expiresIn: 3600, // 1 hour
    });

    logger.info(`Download URL generated for document by user ${userId}`, { s3Key });

    return sendSuccess(res, {
      downloadUrl,
      expiresIn: 3600,
    });
  } catch (error) {
    logger.error('Error generating download URL:', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to generate download URL');
  }
};
