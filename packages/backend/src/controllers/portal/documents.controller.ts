import { Response } from 'express';

import logger, { logControllerError } from '../../utils/logger';
import prisma from '../../services/database';
import { PortalRequest } from '../../types/express.d';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound, sendError, sendServerError } from '../../utils/apiResponse';

/**
 * Get client's assigned forms
 * GET /api/v1/portal/forms/assignments
 */
export const getFormAssignments = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
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

    return sendSuccess(res, assignments);
  } catch (error) {
    logger.error('Error fetching form assignments:', error);
    return sendServerError(res, 'Failed to fetch form assignments');
  }
};

/**
 * Get form details for completion
 * GET /api/v1/portal/forms/:formId
 */
export const getFormDetails = async (req: PortalRequest, res: Response) => {
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
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
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
      return sendNotFound(res, 'Form assignment');
    }

    const form = await prisma.intakeForm.findUnique({
      where: { id: formId },
    });

    if (!form) {
      return sendNotFound(res, 'Form');
    }

    logger.info(`Client ${clientId} accessed form ${formId}`);

    // Convert formFieldsJson to string if it's an object (Prisma returns it as object)
    const formToSend = {
      ...form,
      formFieldsJson: typeof form.formFieldsJson === 'object'
        ? JSON.stringify(form.formFieldsJson)
        : form.formFieldsJson
    };

    return sendSuccess(res, { form: formToSend, assignment });
  } catch (error) {
    logger.error('Error fetching form details:', error);
    return sendServerError(res, 'Failed to fetch form details');
  }
};

/**
 * Submit completed form
 * POST /api/v1/portal/forms/:formId/submit
 */
export const submitForm = async (req: PortalRequest, res: Response) => {
  try {
    const { formId } = req.params;
    const {
      assignmentId,
      responses,
      signatureData,
      signedByName,
      consentAgreed
    } = req.body;
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
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
      return sendNotFound(res, 'Form assignment');
    }

    // Validate e-signature if provided
    if (signatureData || signedByName) {
      // If any signature field is provided, all required fields must be present
      if (!signatureData) {
        return sendBadRequest(res, 'Signature image is required when submitting with e-signature');
      }

      if (!signedByName || signedByName.trim().length === 0) {
        return sendBadRequest(res, 'Signed name is required when submitting with e-signature');
      }

      if (!consentAgreed) {
        return sendBadRequest(res, 'You must agree to the e-signature consent to submit');
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

    return sendSuccess(res, submission, 'Form submitted successfully');
  } catch (error) {
    logger.error('Error submitting form:', error);
    return sendServerError(res, 'Failed to submit form');
  }
};

/**
 * Get shared documents
 * GET /api/v1/portal/documents/shared
 */
export const getSharedDocuments = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
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

    return sendSuccess(res, documents);
  } catch (error) {
    logger.error('Error fetching shared documents:', error);
    return sendServerError(res, 'Failed to fetch shared documents');
  }
};

/**
 * Download a shared document
 * GET /api/v1/portal/documents/:documentId/download
 */
export const downloadDocument = async (req: PortalRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    const document = await prisma.sharedDocument.findFirst({
      where: {
        id: documentId,
        clientId,
      },
    });

    if (!document) {
      return sendNotFound(res, 'Document');
    }

    // Check if document is expired
    if (document.expiresAt && document.expiresAt < new Date()) {
      return sendError(res, 410, 'Document has expired', 'EXPIRED');
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
    return sendSuccess(res, document, 'Document download endpoint - implement file streaming from storage');
  } catch (error) {
    logger.error('Error downloading document:', error);
    return sendServerError(res, 'Failed to download document');
  }
};

/**
 * Upload a document from client
 * POST /api/v1/portal/documents/upload
 */
export const uploadDocument = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
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

    return sendCreated(res, document, 'Document uploaded successfully');
  } catch (error) {
    logger.error('Error uploading document:', error);
    return sendServerError(res, 'Failed to upload document');
  }
};

/**
 * Get client's uploaded documents
 * GET /api/v1/portal/documents/uploads
 */
export const getUploadedDocuments = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    const documents = await prisma.clientDocument.findMany({
      where: {
        clientId,
        uploadedBy: clientId, // Only documents uploaded by the client themselves
      },
      orderBy: { uploadedDate: 'desc' },
    });

    logger.info(`Retrieved ${documents.length} uploaded documents for client ${clientId}`);

    return sendSuccess(res, documents);
  } catch (error) {
    logger.error('Error fetching uploaded documents:', error);
    return sendServerError(res, 'Failed to fetch uploaded documents');
  }
};
