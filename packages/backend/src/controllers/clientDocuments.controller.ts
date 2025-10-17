import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import logger from '../utils/logger';

const prisma = new PrismaClient();

/**
 * EHR-side controller for managing client documents
 * These endpoints are for clinicians/staff to share documents with clients
 */

// Validation schemas
const shareDocumentSchema = z.object({
  clientId: z.string().uuid(),
  documentTitle: z.string().min(1),
  documentType: z.string().min(1),
  fileUrl: z.string().optional(), // S3 URL after upload
  expiresAt: z.string().datetime().optional(),
  sharedNotes: z.string().optional(),
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
        documentTitle: validatedData.documentTitle,
        documentType: validatedData.documentType,
        fileUrl: validatedData.fileUrl,
        sharedBy: userId,
        sharedAt: new Date(),
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
        sharedNotes: validatedData.sharedNotes,
        viewCount: 0,
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
 * Upload file endpoint placeholder
 * POST /api/v1/clients/documents/upload
 */
export const uploadDocumentFile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    // TODO: Implement actual file upload to S3
    // This is a placeholder that returns a mock S3 URL

    const mockFileUrl = `https://s3.amazonaws.com/mentalspace-documents/${Date.now()}_document.pdf`;

    logger.info(`File upload initiated by user ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'File upload placeholder - implement S3 integration',
      data: {
        fileUrl: mockFileUrl,
        fileName: req.body.fileName || 'document.pdf',
        fileSize: req.body.fileSize || 0,
        mimeType: req.body.mimeType || 'application/pdf',
      },
    });
  } catch (error) {
    logger.error('Error uploading file:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload file',
    });
  }
};
