import { Request, Response } from 'express';

import logger, { logControllerError } from '../../utils/logger';
import prisma from '../../services/database';

/**
 * Get client's assigned forms
 * GET /api/v1/portal/forms/assignments
 */
export const getFormAssignments = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get all form assignments for this client
    const assignments = await prisma.formAssignment.findMany({
      where: {
        clientId,
      },
      include: {
        form: {
          select: {
            id: true,
            formName: true,
            formDescription: true,
            formType: true,
            formFieldsJson: true,
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });

    logger.info(`Retrieved ${assignments.length} form assignments for client ${clientId}`);

    return res.status(200).json({
      success: true,
      data: assignments,
    });
  } catch (error: any) {
    logger.error('Error fetching form assignments:', error);
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
export const getFormDetails = async (req: Request, res: Response) => {
  logger.info('🔵🔵🔵 getFormDetails CALLED 🔵🔵🔵', {
    formId: req.params.formId,
    assignmentId: req.query.assignmentId,
    fullUrl: req.url,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    path: req.path,
    method: req.method
  });
  logger.info('🔵 getFormDetails CALLED', { formId: req.params.formId, assignmentId: req.query.assignmentId });

  // Add cache-control headers to prevent browser caching
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

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

    // Convert formFieldsJson to string if it's an object (Prisma returns it as object)
    const formToSend = {
      ...form,
      formFieldsJson: typeof form.formFieldsJson === 'object'
        ? JSON.stringify(form.formFieldsJson)
        : form.formFieldsJson
    };

    return res.status(200).json({
      success: true,
      data: {
        form: formToSend,
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
export const submitForm = async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;
    const {
      assignmentId,
      responses,
      signatureData,
      signedByName,
      consentAgreed
    } = req.body;
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

    // Validate e-signature if provided
    if (signatureData || signedByName) {
      // If any signature field is provided, all required fields must be present
      if (!signatureData) {
        return res.status(400).json({
          success: false,
          message: 'Signature image is required when submitting with e-signature',
        });
      }

      if (!signedByName || signedByName.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Signed name is required when submitting with e-signature',
        });
      }

      if (!consentAgreed) {
        return res.status(400).json({
          success: false,
          message: 'You must agree to the e-signature consent to submit',
        });
      }
    }

    // Get client's IP address for audit trail
    const ipAddress = req.ip ||
                     req.headers['x-forwarded-for'] as string ||
                     req.socket.remoteAddress ||
                     'unknown';

    // Create submission with e-signature data
    const submission = await prisma.intakeFormSubmission.create({
      data: {
        formId,
        clientId,
        responsesJson: responses,
        status: 'Submitted',
        submittedDate: new Date(),
        // E-signature fields
        signatureData: signatureData || null,
        signedByName: signedByName ? signedByName.trim() : null,
        signedDate: signatureData ? new Date() : null,
        signatureIpAddress: signatureData ? ipAddress : null,
        consentAgreed: consentAgreed || false,
        // Audit fields
        ipAddress: ipAddress,
        userAgent: req.get('user-agent') || 'unknown',
      },
    });

    // Update assignment status
    await prisma.formAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        submissionId: submission.id,
      },
    });

    logger.info(`Client ${clientId} submitted form ${formId}`, {
      submissionId: submission.id,
      hasSignature: !!signatureData,
      signedByName: signedByName || 'N/A',
    });

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
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get shared documents
 * GET /api/v1/portal/documents/shared
 */
export const getSharedDocuments = async (req: Request, res: Response) => {
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
export const downloadDocument = async (req: Request, res: Response) => {
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
export const uploadDocument = async (req: Request, res: Response) => {
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
        uploadedDate: new Date(),
        uploadedBy: clientId,
        // In real implementation: add fileUrl, fileSize, mimeType
      } as any,
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
export const getUploadedDocuments = async (req: Request, res: Response) => {
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
      orderBy: { uploadedDate: 'desc' },
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
