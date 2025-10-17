import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedPortalRequest } from '../../middleware/portalAuth';
import logger from '../../utils/logger';

const prisma = new PrismaClient();

/**
 * Get client's assigned forms
 * GET /api/v1/portal/forms/assignments
 */
export const getFormAssignments = async (req: AuthenticatedPortalRequest, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // TODO: Implement form assignments functionality
    // For now, return empty array
    const assignments: any[] = [];

    logger.info(`Retrieved ${assignments.length} form assignments for client ${clientId}`);

    return res.status(200).json({
      success: true,
      data: assignments,
    });
  } catch (error: any) {
    console.error('Error fetching form assignments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch form assignments',
    });
  }
};

/**
 * Get form details for completion
 * GET /api/v1/portal/forms/:formId
 */
export const getFormDetails = async (req: AuthenticatedPortalRequest, res: Response) => {
  try {
    const { formId } = req.params;
    const { assignmentId } = req.query;
    const clientId = (req as any).portalAccount?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Verify the form is assigned to this client
    const assignment = await prisma.formAssignment.findFirst({
      where: {
        id: assignmentId as string,
        formId,
        clientId,
      },
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Form assignment not found',
      });
    }

    const form = await prisma.intakeForm.findUnique({
      where: { id: formId },
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found',
      });
    }

    logger.info(`Client ${clientId} accessed form ${formId}`);

    return res.status(200).json({
      success: true,
      data: {
        form,
        assignment,
      },
    });
  } catch (error) {
    logger.error('Error fetching form details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch form details',
    });
  }
};

/**
 * Submit completed form
 * POST /api/v1/portal/forms/:formId/submit
 */
export const submitForm = async (req: AuthenticatedPortalRequest, res: Response) => {
  try {
    const { formId } = req.params;
    const { assignmentId, responses, signature } = req.body;
    const clientId = (req as any).portalAccount?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Verify assignment
    const assignment = await prisma.formAssignment.findFirst({
      where: {
        id: assignmentId,
        formId,
        clientId,
      },
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Form assignment not found',
      });
    }

    // Create submission
    const submission = await prisma.intakeFormSubmission.create({
      data: {
        formId,
        clientId,
        responses,
        submittedBy: clientId,
        submittedAt: new Date(),
      },
    });

    // Update assignment status
    await prisma.formAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Create signature record if provided
    if (signature) {
      await prisma.documentSignature.create({
        data: {
          documentId: submission.id,
          signedBy: clientId,
          signatureImageS3: signature, // In real implementation, upload to S3 first
          signedAt: new Date(),
          ipAddress: req.ip || '',
          userAgent: req.get('user-agent') || '',
          signatureType: 'ELECTRONIC',
        },
      });
    }

    logger.info(`Client ${clientId} submitted form ${formId}`);

    return res.status(200).json({
      success: true,
      message: 'Form submitted successfully',
      data: submission,
    });
  } catch (error) {
    logger.error('Error submitting form:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit form',
    });
  }
};

/**
 * Get shared documents
 * GET /api/v1/portal/documents/shared
 */
export const getSharedDocuments = async (req: AuthenticatedPortalRequest, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const documents = await prisma.sharedDocument.findMany({
      where: {
        clientId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
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
 * Download a shared document
 * GET /api/v1/portal/documents/:documentId/download
 */
export const downloadDocument = async (req: AuthenticatedPortalRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const clientId = (req as any).portalAccount?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const document = await prisma.sharedDocument.findFirst({
      where: {
        id: documentId,
        clientId,
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Check if document is expired
    if (document.expiresAt && document.expiresAt < new Date()) {
      return res.status(410).json({
        success: false,
        message: 'Document has expired',
      });
    }

    // Update view count and last viewed timestamp
    await prisma.sharedDocument.update({
      where: { id: documentId },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
    });

    logger.info(`Client ${clientId} downloaded document ${documentId}`);

    // In a real implementation, this would stream the file from S3 or file storage
    // For now, return the document metadata
    return res.status(200).json({
      success: true,
      message: 'Document download endpoint - implement file streaming from storage',
      data: document,
    });
  } catch (error) {
    logger.error('Error downloading document:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to download document',
    });
  }
};

/**
 * Upload a document from client
 * POST /api/v1/portal/documents/upload
 */
export const uploadDocument = async (req: AuthenticatedPortalRequest, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // In a real implementation, this would handle file upload to S3 or file storage
    // For now, create a placeholder document record
    const { documentType, documentName } = req.body;

    const document = await prisma.clientDocument.create({
      data: {
        clientId,
        documentType: documentType || 'CLIENT_UPLOAD',
        documentName: documentName || 'Uploaded Document',
        uploadedAt: new Date(),
        uploadedBy: clientId,
        // In real implementation: add fileUrl, fileSize, mimeType
      },
    });

    logger.info(`Client ${clientId} uploaded document ${document.id}`);

    return res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: document,
    });
  } catch (error) {
    logger.error('Error uploading document:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload document',
    });
  }
};

/**
 * Get client's uploaded documents
 * GET /api/v1/portal/documents/uploads
 */
export const getUploadedDocuments = async (req: AuthenticatedPortalRequest, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const documents = await prisma.clientDocument.findMany({
      where: {
        clientId,
        uploadedBy: clientId, // Only documents uploaded by the client themselves
      },
      orderBy: { uploadedAt: 'desc' },
    });

    logger.info(`Retrieved ${documents.length} uploaded documents for client ${clientId}`);

    return res.status(200).json({
      success: true,
      data: documents,
    });
  } catch (error) {
    logger.error('Error fetching uploaded documents:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch uploaded documents',
    });
  }
};
