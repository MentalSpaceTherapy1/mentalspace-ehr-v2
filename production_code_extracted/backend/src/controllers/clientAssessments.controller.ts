import { Request, Response } from 'express';
import { z } from 'zod';
import logger from '../utils/logger';
import prisma from '../services/database';

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

    const where: any = { clientId };
    if (status) {
      where.status = status;
    }

    const assessments = await prisma.assessmentAssignment.findMany({
      where,
      orderBy: { assignedAt: 'desc' },
    });

    logger.info(`Retrieved ${assessments.length} assessments for client ${clientId}`);

    return res.status(200).json({
      success: true,
      data: assessments,
    });
  } catch (error) {
    logger.error('Error fetching client assessments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch assessments',
    });
  }
};

/**
 * Assign an assessment to a client
 * POST /api/v1/clients/:clientId/assessments/assign
 */
export const assignAssessmentToClient = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const userId = (req as any).user?.userId;

    const validatedData = assignAssessmentSchema.parse({ ...req.body, clientId });

    const assignment = await prisma.assessmentAssignment.create({
      data: {
        clientId,
        assessmentType: validatedData.assessmentType,
        assessmentName: validatedData.assessmentName,
        description: validatedData.description || `Complete the ${validatedData.assessmentName}`,
        assignedBy: userId,
        assignedAt: new Date(),
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        status: 'PENDING',
      },
    });

    logger.info(`Assessment ${validatedData.assessmentType} assigned to client ${clientId} by user ${userId}`);

    return res.status(201).json({
      success: true,
      message: 'Assessment assigned successfully',
      data: assignment,
    });
  } catch (error) {
    logger.error('Error assigning assessment:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to assign assessment',
    });
  }
};

/**
 * Remove an assessment assignment
 * DELETE /api/v1/clients/:clientId/assessments/:assessmentId
 */
export const removeAssessmentAssignment = async (req: Request, res: Response) => {
  try {
    const { clientId, assessmentId } = req.params;
    const userId = (req as any).user?.userId;

    const assessment = await prisma.assessmentAssignment.findFirst({
      where: {
        id: assessmentId,
        clientId,
      },
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment assignment not found',
      });
    }

    if (assessment.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove completed assessment',
      });
    }

    await prisma.assessmentAssignment.delete({
      where: { id: assessmentId },
    });

    logger.info(`Assessment assignment ${assessmentId} removed by user ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'Assessment assignment removed successfully',
    });
  } catch (error) {
    logger.error('Error removing assessment assignment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove assessment assignment',
    });
  }
};

/**
 * Send reminder for pending assessment
 * POST /api/v1/clients/:clientId/assessments/:assessmentId/remind
 */
export const sendAssessmentReminder = async (req: Request, res: Response) => {
  try {
    const { clientId, assessmentId } = req.params;
    const userId = (req as any).user?.userId;

    const assessment = await prisma.assessmentAssignment.findFirst({
      where: {
        id: assessmentId,
        clientId,
        status: 'PENDING',
      },
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Pending assessment not found',
      });
    }

    // TODO: Send actual email/notification to client
    logger.info(`Assessment reminder sent for ${assessmentId} by user ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'Reminder sent successfully',
    });
  } catch (error) {
    logger.error('Error sending assessment reminder:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send reminder',
    });
  }
};

/**
 * View assessment results/details
 * GET /api/v1/clients/:clientId/assessments/:assessmentId/results
 */
export const viewAssessmentResults = async (req: Request, res: Response) => {
  try {
    const { clientId, assessmentId } = req.params;

    const assessment = await prisma.assessmentAssignment.findFirst({
      where: {
        id: assessmentId,
        clientId,
      },
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found',
      });
    }

    logger.info(`Assessment results viewed for ${assessmentId}`);

    return res.status(200).json({
      success: true,
      data: assessment,
    });
  } catch (error) {
    logger.error('Error viewing assessment results:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to view assessment results',
    });
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

    const where: any = {
      clientId,
      status: 'COMPLETED',
    };

    if (assessmentType) {
      where.assessmentType = assessmentType;
    }

    const history = await prisma.assessmentAssignment.findMany({
      where,
      orderBy: { completedAt: 'desc' },
      select: {
        id: true,
        assessmentName: true,
        assessmentType: true,
        assignedAt: true,
        completedAt: true,
        score: true,
        interpretation: true,
      },
    });

    logger.info(`Retrieved assessment history for client ${clientId}`);

    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    logger.error('Error fetching assessment history:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch assessment history',
    });
  }
};

/**
 * Export assessment results as PDF
 * GET /api/v1/clients/:clientId/assessments/:assessmentId/export
 */
export const exportAssessmentPDF = async (req: Request, res: Response) => {
  try {
    const { clientId, assessmentId } = req.params;

    const assessment = await prisma.assessmentAssignment.findFirst({
      where: {
        id: assessmentId,
        clientId,
        status: 'COMPLETED',
      },
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Completed assessment not found',
      });
    }

    // TODO: Generate actual PDF using a library like pdfkit or puppeteer
    logger.info(`PDF export requested for assessment ${assessmentId}`);

    return res.status(200).json({
      success: true,
      message: 'PDF export placeholder - implement PDF generation',
      data: assessment,
    });
  } catch (error) {
    logger.error('Error exporting assessment PDF:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export assessment',
    });
  }
};
