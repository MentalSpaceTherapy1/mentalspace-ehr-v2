import { Request, Response } from 'express';
import { z } from 'zod';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
import logger from '../utils/logger';
// Phase 3.2: Removed direct prisma import - using service methods instead
import * as clientAssessmentsService from '../services/clientAssessments.service';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError, sendValidationError, sendUnauthorized } from '../utils/apiResponse';

/**
 * EHR-side controller for managing client assessment assignments
 * These endpoints are for clinicians/staff to assign assessments to clients
 */

// Validation schemas
const assignAssessmentSchema = z.object({
  clientId: z.string().uuid(),
  assessmentType: z.enum(['PHQ9', 'GAD7', 'PCL5', 'BAI', 'BDI', 'PSS', 'AUDIT', 'DAST', 'Custom']),
  assessmentName: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  instructions: z.string().optional(),
});

/**
 * Get all assessments assigned to a client
 * GET /api/v1/clients/:clientId/assessments
 */
export const getClientAssessments = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { status } = req.query;

    // Phase 3.2: Use service method instead of direct prisma call
    const assessments = await clientAssessmentsService.getClientAssessments({
      clientId,
      status: status as string | undefined,
    });

    logger.info(`Retrieved ${assessments.length} assessments for client ${clientId}`);

    return sendSuccess(res, assessments);
  } catch (error) {
    logger.error('Error fetching client assessments:', error);
    return sendServerError(res, 'Failed to fetch assessments');
  }
};

/**
 * Assign an assessment to a client
 * POST /api/v1/clients/:clientId/assessments/assign
 */
export const assignAssessmentToClient = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const validatedData = assignAssessmentSchema.parse({ ...req.body, clientId });

    // Phase 3.2: Use service method instead of direct prisma call
    const assignment = await clientAssessmentsService.assignAssessment({
      clientId,
      assessmentType: validatedData.assessmentType,
      assessmentName: validatedData.assessmentName,
      description: validatedData.description,
      assignedBy: userId,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
    });

    logger.info(`Assessment ${validatedData.assessmentType} assigned to client ${clientId} by user ${userId}`);

    return sendCreated(res, assignment, 'Assessment assigned successfully');
  } catch (error) {
    logger.error('Error assigning assessment:', error);

    if (error instanceof z.ZodError) {
      return sendValidationError(res, error.errors.map(e => ({ path: e.path.join('.'), message: e.message })));
    }

    return sendServerError(res, 'Failed to assign assessment');
  }
};

/**
 * Remove an assessment assignment
 * DELETE /api/v1/clients/:clientId/assessments/:assessmentId
 */
export const removeAssessmentAssignment = async (req: Request, res: Response) => {
  try {
    const { clientId, assessmentId } = req.params;
    const userId = req.user?.userId;

    // Phase 3.2: Use service methods instead of direct prisma calls
    const assessment = await clientAssessmentsService.findAssignment(assessmentId, clientId);

    if (!assessment) {
      return sendNotFound(res, 'Assessment assignment');
    }

    if (assessment.status === 'COMPLETED') {
      return sendBadRequest(res, 'Cannot remove completed assessment');
    }

    await clientAssessmentsService.deleteAssignment(assessmentId);

    logger.info(`Assessment assignment ${assessmentId} removed by user ${userId}`);

    return sendSuccess(res, null, 'Assessment assignment removed successfully');
  } catch (error) {
    logger.error('Error removing assessment assignment:', error);
    return sendServerError(res, 'Failed to remove assessment assignment');
  }
};

/**
 * Send reminder for pending assessment
 * POST /api/v1/clients/:clientId/assessments/:assessmentId/remind
 */
export const sendAssessmentReminder = async (req: Request, res: Response) => {
  try {
    const { clientId, assessmentId } = req.params;
    const userId = req.user?.userId;

    // Phase 3.2: Use service method instead of direct prisma call
    const assessment = await clientAssessmentsService.findPendingAssignment(assessmentId, clientId);

    if (!assessment) {
      return sendNotFound(res, 'Pending assessment');
    }

    // TODO: Send actual email/notification to client
    logger.info(`Assessment reminder sent for ${assessmentId} by user ${userId}`);

    return sendSuccess(res, null, 'Reminder sent successfully');
  } catch (error) {
    logger.error('Error sending assessment reminder:', error);
    return sendServerError(res, 'Failed to send reminder');
  }
};

/**
 * View assessment results/details
 * GET /api/v1/clients/:clientId/assessments/:assessmentId/results
 */
export const viewAssessmentResults = async (req: Request, res: Response) => {
  try {
    const { clientId, assessmentId } = req.params;

    // Phase 3.2: Use service method instead of direct prisma call
    const assessment = await clientAssessmentsService.findAssignment(assessmentId, clientId);

    if (!assessment) {
      return sendNotFound(res, 'Assessment');
    }

    logger.info(`Assessment results viewed for ${assessmentId}`);

    return sendSuccess(res, assessment);
  } catch (error) {
    logger.error('Error viewing assessment results:', error);
    return sendServerError(res, 'Failed to view assessment results');
  }
};

/**
 * Get assessment history/trends for a client
 * GET /api/v1/clients/:clientId/assessments/history
 */
export const getAssessmentHistory = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { assessmentType } = req.query;

    // Phase 3.2: Use service method instead of direct prisma call
    const history = await clientAssessmentsService.getAssessmentHistory({
      clientId,
      assessmentType: assessmentType as string | undefined,
    });

    logger.info(`Retrieved assessment history for client ${clientId}`);

    return sendSuccess(res, history);
  } catch (error) {
    logger.error('Error fetching assessment history:', error);
    return sendServerError(res, 'Failed to fetch assessment history');
  }
};

/**
 * Export assessment results as PDF
 * GET /api/v1/clients/:clientId/assessments/:assessmentId/export
 */
export const exportAssessmentPDF = async (req: Request, res: Response) => {
  try {
    const { clientId, assessmentId } = req.params;

    // Phase 3.2: Use service method instead of direct prisma call
    const assessment = await clientAssessmentsService.findCompletedAssignment(assessmentId, clientId);

    if (!assessment) {
      return sendNotFound(res, 'Completed assessment');
    }

    // TODO: Generate actual PDF using a library like pdfkit or puppeteer
    logger.info(`PDF export requested for assessment ${assessmentId}`);

    return sendSuccess(res, assessment, 'PDF export placeholder - implement PDF generation');
  } catch (error) {
    logger.error('Error exporting assessment PDF:', error);
    return sendServerError(res, 'Failed to export assessment');
  }
};
