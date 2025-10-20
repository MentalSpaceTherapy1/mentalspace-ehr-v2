import { Request, Response } from 'express';
import { z } from 'zod';
import logger from '../utils/logger';
import prisma from '../services/database';
import { assertCanAccessClient } from '../services/accessControl.service';

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

    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const forms = await prisma.intakeForm.findMany({
      where,
      orderBy: { formName: 'asc' },
      select: {
        id: true,
        formName: true,
        formDescription: true,
        formType: true,
        isActive: true,
        isRequired: true,
        assignedToNewClients: true,
      },
    });

    logger.info(`Retrieved ${forms.length} forms from library`);

    return res.status(200).json({
      success: true,
      data: forms,
    });
  } catch (error) {
    logger.error('Error fetching form library:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch form library',
    });
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

    const where: any = { clientId };
    if (status) {
      where.status = status;
    }

    const assignments = await prisma.formAssignment.findMany({
      where,
      include: {
        form: {
          select: {
            id: true,
            formName: true,
            formDescription: true,
            formType: true,
          },
        },
        submission: {
          select: {
            id: true,
            submittedDate: true,
            reviewedDate: true,
            reviewedBy: true,
            reviewerNotes: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    logger.info(`Retrieved ${assignments.length} form assignments for client ${clientId}`);

    return res.status(200).json({
      success: true,
      data: assignments,
    });
  } catch (error) {
    logger.error('Error fetching client form assignments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch form assignments',
    });
  }
};

/**
 * Assign a form to a client
 * POST /api/v1/clients/:clientId/forms/assign
 */
export const assignFormToClient = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const userId = (req as any).user?.userId;

    const validatedData = assignFormSchema.parse({ ...req.body, clientId });

    // Check if form exists
    const form = await prisma.intakeForm.findUnique({
      where: { id: validatedData.formId },
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found',
      });
    }

    // Check if already assigned
    const existing = await prisma.formAssignment.findFirst({
      where: {
        clientId,
        formId: validatedData.formId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Form already assigned to this client',
      });
    }

    // Create assignment
    const assignment = await prisma.formAssignment.create({
      data: {
        clientId,
        formId: validatedData.formId,
        assignedBy: userId,
        assignedAt: new Date(),
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        isRequired: validatedData.isRequired,
        assignmentNotes: validatedData.assignmentNotes,
        clientMessage: validatedData.clientMessage,
        status: 'PENDING',
      },
      include: {
        form: {
          select: {
            formName: true,
            formDescription: true,
          },
        },
      },
    });

    logger.info(`Form ${validatedData.formId} assigned to client ${clientId} by user ${userId}`);

    return res.status(201).json({
      success: true,
      message: 'Form assigned successfully',
      data: assignment,
    });
  } catch (error) {
    logger.error('Error assigning form to client:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to assign form',
    });
  }
};

/**
 * Remove a form assignment
 * DELETE /api/v1/clients/:clientId/forms/:assignmentId
 */
export const removeFormAssignment = async (req: Request, res: Response) => {
  try {
    const { clientId, assignmentId } = req.params;
    const userId = (req as any).user?.userId;

    const assignment = await prisma.formAssignment.findFirst({
      where: {
        id: assignmentId,
        clientId,
      },
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Form assignment not found',
      });
    }

    if (assignment.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove completed form assignment',
      });
    }

    await prisma.formAssignment.delete({
      where: { id: assignmentId },
    });

    logger.info(`Form assignment ${assignmentId} removed by user ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'Form assignment removed successfully',
    });
  } catch (error) {
    logger.error('Error removing form assignment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove form assignment',
    });
  }
};

/**
 * Send reminder for pending form
 * POST /api/v1/clients/:clientId/forms/:assignmentId/remind
 */
export const sendFormReminder = async (req: Request, res: Response) => {
  try {
    const { clientId, assignmentId } = req.params;
    const userId = (req as any).user?.userId;

    const assignment = await prisma.formAssignment.findFirst({
      where: {
        id: assignmentId,
        clientId,
        status: 'PENDING',
      },
      include: {
        form: true,
      },
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Pending form assignment not found',
      });
    }

    // Update last reminder sent timestamp
    await prisma.formAssignment.update({
      where: { id: assignmentId },
      data: {
        lastReminderSent: new Date(),
      },
    });

    // TODO: Send actual email/notification to client
    logger.info(`Form reminder sent for assignment ${assignmentId} by user ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'Reminder sent successfully',
    });
  } catch (error) {
    logger.error('Error sending form reminder:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send reminder',
    });
  }
};

/**
 * View form submission
 * GET /api/v1/clients/:clientId/forms/:assignmentId/submission
 */
export const viewFormSubmission = async (req: Request, res: Response) => {
  try {
    const { clientId, assignmentId } = req.params;

    const assignment = await prisma.formAssignment.findFirst({
      where: {
        id: assignmentId,
        clientId,
        status: 'COMPLETED',
      },
      include: {
        form: true,
        submission: true,
      },
    });

    if (!assignment || !assignment.submission) {
      return res.status(404).json({
        success: false,
        message: 'Form submission not found',
      });
    }

    logger.info(`Form submission ${assignment.submission.id} viewed`);

    return res.status(200).json({
      success: true,
      data: {
        form: assignment.form,
        submission: assignment.submission,
        assignment,
      },
    });
  } catch (error) {
    logger.error('Error viewing form submission:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to view form submission',
    });
  }
};


