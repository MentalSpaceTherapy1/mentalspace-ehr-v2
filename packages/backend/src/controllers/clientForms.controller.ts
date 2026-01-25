import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@mentalspace/database';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
import logger from '../utils/logger';
// Phase 3.2: Removed direct prisma import - using service methods instead
import * as clientFormsService from '../services/clientForms.service';
import { assertCanAccessClient } from '../services/accessControl.service';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError, sendValidationError, sendConflict, sendError, sendUnauthorized } from '../utils/apiResponse';

/**
 * EHR-side controller for managing client form assignments
 * These endpoints are for clinicians/staff to assign forms to clients
 */

// Validation schemas
const assignFormSchema = z.object({
  clientId: z.string().uuid(),
  formId: z.string().uuid(),
  dueDate: z.string().optional().nullable(),
  isRequired: z.boolean().default(false),
  assignmentNotes: z.string().optional(),
  clientMessage: z.string().optional(), // Custom message to send to client
});

/**
 * Get all forms available for assignment
 * GET /api/v1/clients/forms/library
 */
export const getFormLibrary = async (req: Request, res: Response) => {
  try {
    const { isActive } = req.query;

    // Phase 3.2: Use service method instead of direct prisma call
    const forms = await clientFormsService.getFormLibrary({
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });

    logger.info(`Retrieved ${forms.length} forms from library`);

    return sendSuccess(res, forms);
  } catch (error) {
    logger.error('Error fetching form library:', error);
    return sendServerError(res, 'Failed to fetch form library');
  }
};

/**
 * Get form assignments for a specific client
 * GET /api/v1/clients/:clientId/forms
 */
export const getClientFormAssignments = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    await assertCanAccessClient(req.user, { clientId });
    const { status } = req.query;

    // Phase 3.2: Use service method instead of direct prisma call
    const assignments = await clientFormsService.getClientFormAssignments({
      clientId,
      status: status as string | undefined,
    });

    logger.info(`Retrieved ${assignments.length} form assignments for client ${clientId}`);

    return sendSuccess(res, assignments);
  } catch (error) {
    logger.error('Error fetching client form assignments:', error);
    return sendServerError(res, 'Failed to fetch form assignments');
  }
};

/**
 * Assign a form to a client
 * POST /api/v1/clients/:clientId/forms/assign
 */
export const assignFormToClient = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const validatedData = assignFormSchema.parse({ ...req.body, clientId });

    // Phase 3.2: Use service methods instead of direct prisma calls
    // Check if form exists
    const form = await clientFormsService.findFormById(validatedData.formId);

    if (!form) {
      return sendNotFound(res, 'Form');
    }

    // Check if already assigned
    const existing = await clientFormsService.findExistingAssignment(clientId, validatedData.formId);

    if (existing) {
      return sendConflict(res, 'Form already assigned to this client');
    }

    // Create assignment
    const assignment = await clientFormsService.createFormAssignment({
      clientId,
      formId: validatedData.formId,
      assignedBy: userId,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
      isRequired: validatedData.isRequired,
      assignmentNotes: validatedData.assignmentNotes,
      clientMessage: validatedData.clientMessage,
    });

    logger.info(`Form ${validatedData.formId} assigned to client ${clientId} by user ${userId}`);

    return sendCreated(res, assignment, 'Form assigned successfully');
  } catch (error) {
    logger.error('Error assigning form to client:', error);

    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return sendValidationError(res, formattedErrors);
    }

    return sendServerError(res, 'Failed to assign form');
  }
};

/**
 * Remove a form assignment
 * DELETE /api/v1/clients/:clientId/forms/:assignmentId
 */
export const removeFormAssignment = async (req: Request, res: Response) => {
  try {
    const { clientId, assignmentId } = req.params;
    const userId = req.user?.userId;

    // Phase 3.2: Use service methods instead of direct prisma calls
    const assignment = await clientFormsService.findFormAssignment(assignmentId, clientId);

    if (!assignment) {
      return sendNotFound(res, 'Form assignment');
    }

    if (assignment.status === 'COMPLETED') {
      return sendBadRequest(res, 'Cannot remove completed form assignment');
    }

    await clientFormsService.deleteFormAssignment(assignmentId);

    logger.info(`Form assignment ${assignmentId} removed by user ${userId}`);

    return sendSuccess(res, null, 'Form assignment removed successfully');
  } catch (error) {
    logger.error('Error removing form assignment:', error);
    return sendServerError(res, 'Failed to remove form assignment');
  }
};

/**
 * Send reminder for pending form
 * POST /api/v1/clients/:clientId/forms/:assignmentId/remind
 */
export const sendFormReminder = async (req: Request, res: Response) => {
  try {
    const { clientId, assignmentId } = req.params;
    const userId = req.user?.userId;

    // Phase 3.2: Use service methods instead of direct prisma calls
    const assignment = await clientFormsService.findPendingAssignmentWithForm(assignmentId, clientId);

    if (!assignment) {
      return sendNotFound(res, 'Pending form assignment');
    }

    // Update last reminder sent timestamp
    await clientFormsService.updateLastReminderSent(assignmentId);

    // TODO: Send actual email/notification to client
    logger.info(`Form reminder sent for assignment ${assignmentId} by user ${userId}`);

    return sendSuccess(res, null, 'Reminder sent successfully');
  } catch (error) {
    logger.error('Error sending form reminder:', error);
    return sendServerError(res, 'Failed to send reminder');
  }
};

/**
 * View form submission
 * GET /api/v1/clients/:clientId/forms/:assignmentId/submission
 */
export const viewFormSubmission = async (req: Request, res: Response) => {
  try {
    const { clientId, assignmentId } = req.params;

    // Phase 3.2: Use service methods instead of direct prisma calls
    const assignment = await clientFormsService.findCompletedAssignmentWithSubmission(assignmentId, clientId);

    if (!assignment || !assignment.submission) {
      return sendNotFound(res, 'Form submission');
    }

    // Look up the user names for assignedBy and reviewedBy
    let assignedByName = 'System';
    let reviewedByName: string | null = null;

    if (assignment.assignedBy) {
      const assignedByUser = await clientFormsService.getUserById(assignment.assignedBy);
      if (assignedByUser) {
        assignedByName = `${assignedByUser.firstName} ${assignedByUser.lastName}`;
      }
    }

    if (assignment.submission.reviewedBy) {
      const reviewedByUser = await clientFormsService.getUserById(assignment.submission.reviewedBy);
      if (reviewedByUser) {
        reviewedByName = `${reviewedByUser.firstName} ${reviewedByUser.lastName}`;
      }
    }

    logger.info(`Form submission ${assignment.submission.id} viewed`);

    // Transform data to match frontend expected format
    return sendSuccess(res, {
      form: {
        id: assignment.form.id,
        name: assignment.form.formName,
        description: assignment.form.formDescription,
        formType: assignment.form.formType,
      },
      assignment: {
        id: assignment.id,
        assignedDate: assignment.assignedAt?.toISOString() || null,
        dueDate: assignment.dueDate?.toISOString() || null,
        completedDate: assignment.completedAt?.toISOString() || null,
        status: assignment.status,
        assignedByName,
        messageFromAssigner: assignment.clientMessage || null,
      },
      submission: {
        id: assignment.submission.id,
        responsesJson: assignment.submission.responsesJson,
        status: assignment.submission.status,
        submittedDate: assignment.submission.submittedDate?.toISOString() || null,
        reviewedDate: assignment.submission.reviewedDate?.toISOString() || null,
        reviewedByName,
        reviewerNotes: assignment.submission.reviewerNotes || null,
        // E-signature fields
        signatureData: assignment.submission.signatureData || null,
        signedByName: assignment.submission.signedByName || null,
        signedDate: assignment.submission.signedDate?.toISOString() || null,
        signatureIpAddress: assignment.submission.signatureIpAddress || null,
        consentAgreed: assignment.submission.consentAgreed || false,
      },
    });
  } catch (error) {
    logger.error('Error viewing form submission:', error);
    return sendServerError(res, 'Failed to view form submission');
  }
};

/**
 * Transfer form submission data to client demographics
 * POST /api/v1/clients/:clientId/forms/:assignmentId/transfer-to-demographics
 */
export const transferToDemographics = async (req: Request, res: Response) => {
  try {
    const { clientId, assignmentId } = req.params;
    const { selectedFields, mappedData } = req.body;

    // Verify user has access to this client
    await assertCanAccessClient(req.user, { clientId });

    // Phase 3.2: Use service methods instead of direct prisma calls
    // Get the form submission
    const assignment = await clientFormsService.findAssignmentWithSubmission(assignmentId, clientId);

    if (!assignment || !assignment.submission) {
      return sendNotFound(res, 'Form submission');
    }

    // Verify this is a Client Information Form
    if (assignment.form.formName !== 'Client Information Form') {
      return sendBadRequest(res, 'This form cannot be transferred to demographics');
    }

    // Get current client data for audit trail
    const currentClient = await clientFormsService.getClientById(clientId);

    if (!currentClient) {
      return sendNotFound(res, 'Client');
    }

    // Create audit record of what's being changed
    const changedFields: Record<string, { old: any; new: any }> = {};
    Object.keys(mappedData).forEach(field => {
      const oldValue = (currentClient as any)[field];
      const newValue = mappedData[field];
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changedFields[field] = { old: oldValue, new: newValue };
      }
    });

    // Update client demographics
    const updatedClient = await clientFormsService.updateClientDemographics(clientId, mappedData);

    // Log the transfer
    logger.info(`Demographics transferred from form submission ${assignment.submission.id} to client ${clientId}`, {
      selectedFields,
      changedFields: Object.keys(changedFields),
      transferredBy: req.user!.userId,
    });

    // Create activity log (if you have activity logging)
    // await prisma.activityLog.create({
    //   data: {
    //     userId: req.user!.userId,
    //     action: 'TRANSFER_FORM_TO_DEMOGRAPHICS',
    //     entityType: 'Client',
    //     entityId: clientId,
    //     details: { formSubmissionId: assignment.submission.id, changedFields },
    //   },
    // });

    return sendSuccess(res, {
      updatedClient,
      changedFields,
      transferredFields: selectedFields,
    }, 'Client information transferred successfully to demographics');
  } catch (error) {
    logger.error('Error transferring to demographics:', error);
    return sendServerError(res, 'Failed to transfer data to demographics');
  }
};

/**
 * Mark a form submission as reviewed
 * PATCH /api/v1/clients/:clientId/forms/:assignmentId/review
 */
export const markFormAsReviewed = async (req: Request, res: Response) => {
  try {
    const { clientId, assignmentId } = req.params;
    const { notes } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    // Verify user has access to this client
    await assertCanAccessClient(req.user, { clientId });

    // Phase 3.2: Use service methods instead of direct prisma calls
    // Get the form assignment and submission
    const assignment = await clientFormsService.findCompletedAssignmentWithSubmission(assignmentId, clientId);

    if (!assignment) {
      return sendNotFound(res, 'Completed form assignment');
    }

    if (!assignment.submission) {
      return sendNotFound(res, 'Form submission');
    }

    // Check if already reviewed
    if (assignment.submission.reviewedDate) {
      return sendBadRequest(res, 'Form has already been reviewed');
    }

    // Update the submission with review information
    const updatedSubmission = await clientFormsService.markSubmissionAsReviewed(
      assignment.submission.id,
      userId,
      notes
    );

    // Get reviewer name for response
    const reviewer = await clientFormsService.getUserById(userId);

    logger.info(`Form submission ${assignment.submission.id} marked as reviewed by user ${userId}`);

    return sendSuccess(res, {
      submissionId: updatedSubmission.id,
      reviewedDate: updatedSubmission.reviewedDate,
      reviewedBy: userId,
      reviewedByName: reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : null,
      reviewerNotes: updatedSubmission.reviewerNotes,
    }, 'Form marked as reviewed');
  } catch (error) {
    logger.error('Error marking form as reviewed:', error);
    return sendServerError(res, 'Failed to mark form as reviewed');
  }
};

/**
 * Transfer form submission data to clinical intake assessment
 * POST /api/v1/clients/:clientId/forms/:assignmentId/transfer-to-intake
 */
export const transferToIntake = async (req: Request, res: Response) => {
  try {
    const { clientId, assignmentId } = req.params;
    const { selectedFields, mappedData, intakeAssessmentId } = req.body;

    // Verify user has access to this client
    await assertCanAccessClient(req.user, { clientId });

    // Phase 3.2: Use service method instead of direct prisma call
    // Get the form submission
    const assignment = await clientFormsService.findAssignmentWithSubmission(assignmentId, clientId);

    if (!assignment || !assignment.submission) {
      return sendNotFound(res, 'Form submission');
    }

    // Verify this is a Client History Form
    if (assignment.form.formName !== 'Client History Form') {
      return sendBadRequest(res, 'This form cannot be transferred to intake assessment');
    }

    // TODO: Re-enable when clientAssessmentForm model is added to schema
    // Feature temporarily disabled - clientAssessmentForm model not yet in schema
    logger.warn('Transfer to intake requested but clientAssessmentForm model not available', {
      clientId,
      assignmentId,
      transferredBy: req.user!.userId,
    });

    return sendError(res, 501, 'Transfer to intake assessment feature is currently unavailable. Please contact support.', 'CLIENT_ASSESSMENT_FORM_MODEL_NOT_IMPLEMENTED');
  } catch (error) {
    logger.error('Error transferring to intake:', error);
    return sendServerError(res, 'Failed to transfer data to intake assessment');
  }
};


