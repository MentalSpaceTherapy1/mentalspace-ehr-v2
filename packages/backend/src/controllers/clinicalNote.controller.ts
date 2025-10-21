import logger, { logControllerError } from '../utils/logger';
import { Request, Response } from 'express';
import { z } from 'zod';
import { ClinicalNotesValidationService } from '../services/clinical-notes-validation.service';
import prisma from '../lib/prisma';
import { AppointmentEligibilityService } from '../services/appointment-eligibility.service';
import { DiagnosisInheritanceService } from '../services/diagnosis-inheritance.service';

// Note types enum
export const NOTE_TYPES = {
  INTAKE_ASSESSMENT: 'Intake Assessment',
  PROGRESS_NOTE: 'Progress Note',
  TREATMENT_PLAN: 'Treatment Plan',
  CANCELLATION_NOTE: 'Cancellation Note',
  CONSULTATION_NOTE: 'Consultation Note',
  CONTACT_NOTE: 'Contact Note',
  TERMINATION_NOTE: 'Termination Note',
  MISCELLANEOUS_NOTE: 'Miscellaneous Note',
} as const;

// Clinical Note validation schema
const clinicalNoteSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  appointmentId: z.string().uuid('Appointment is required'),
  noteType: z.enum([
    'Intake Assessment',
    'Progress Note',
    'Treatment Plan',
    'Cancellation Note',
    'Consultation Note',
    'Contact Note',
    'Termination Note',
    'Miscellaneous Note',
  ]),
  sessionDate: z.string().datetime('Invalid session date'),
  sessionStartTime: z.string().optional(),
  sessionEndTime: z.string().optional(),
  sessionDuration: z.number().int().positive().optional(),

  // SOAP Note Fields
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),

  // Risk Assessment
  suicidalIdeation: z.boolean().default(false),
  suicidalPlan: z.boolean().default(false),
  homicidalIdeation: z.boolean().default(false),
  selfHarm: z.boolean().default(false),
  riskLevel: z.string().optional(),
  riskAssessmentDetails: z.string().optional(),
  interventionsTaken: z.string().optional(),

  // Diagnosis & Treatment (for Intake and Treatment Plan)
  diagnosisCodes: z.array(z.string()).default([]),
  interventionsUsed: z.array(z.string()).default([]),
  progressTowardGoals: z.string().optional(),

  // Next Session
  nextSessionPlan: z.string().optional(),
  nextSessionDate: z.string().datetime().optional(),

  // Billing
  cptCode: z.string().optional(),
  billingCode: z.string().optional(),
  billable: z.boolean().default(true),

  // Compliance
  dueDate: z.string().datetime('Due date is required'),
});

/**
 * Validate note workflow rules using Business Rules validation service
 */
async function validateNoteWorkflow(
  clientId: string,
  clinicianId: string,
  noteType: string,
  appointmentId?: string
): Promise<{ valid: boolean; message?: string }> {
  try {
    // Use the comprehensive validation service
    await ClinicalNotesValidationService.validateNoteCreation({
      noteType,
      clientId,
      clinicianId,
      appointmentId
    });

    return { valid: true };
  } catch (error: any) {
    return { valid: false, message: error.message };
  }
}

/**
 * Check if Treatment Plan needs updating (3-month rule)
 */
async function checkTreatmentPlanStatus(clientId: string) {
  const latestTreatmentPlan = await prisma.clinicalNote.findFirst({
    where: {
      clientId,
      noteType: 'Treatment Plan',
      status: { in: ['SIGNED', 'COSIGNED', 'LOCKED'] },
    },
    orderBy: { signedDate: 'desc' },
  });

  if (!latestTreatmentPlan || !latestTreatmentPlan.signedDate) {
    return { needsUpdate: true, daysOverdue: null };
  }

  const daysSinceSigned = Math.floor(
    (new Date().getTime() - new Date(latestTreatmentPlan.signedDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  const needsUpdate = daysSinceSigned > 90; // 3 months = 90 days
  const daysOverdue = needsUpdate ? daysSinceSigned - 90 : null;

  return { needsUpdate, daysOverdue, lastTreatmentPlan: latestTreatmentPlan };
}

/**
 * Get all clinical notes for a client
 */
export const getClientNotes = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const notes = await prisma.clinicalNote.findMany({
      where: { clientId },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
        cosigner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
        appointment: {
          select: {
            id: true,
            appointmentDate: true,
            startTime: true,
            endTime: true,
          },
        },
      },
      orderBy: { sessionDate: 'desc' },
    });

    // Check treatment plan status
    const treatmentPlanStatus = await checkTreatmentPlanStatus(clientId);

    return res.json({
      success: true,
      data: notes,
      count: notes.length,
      treatmentPlanStatus,
    });
  } catch (error: any) {
    logger.error('Get client notes error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve clinical notes',
      error: error.message,
    });
  }
};

/**
 * Get clinical note by ID
 */
export const getClinicalNoteById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const note = await prisma.clinicalNote.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            medicalRecordNumber: true,
            dateOfBirth: true,
          },
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
        cosigner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
        appointment: true,
      },
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Clinical note not found',
      });
    }

    return res.json({
      success: true,
      data: note,
    });
  } catch (error: any) {
    logger.error('Get clinical note error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve clinical note',
      error: error.message,
    });
  }
};

/**
 * Create new clinical note with workflow validation
 */
export const createClinicalNote = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const validatedData = clinicalNoteSchema.parse(req.body);

    // Validate workflow rules (Business Rules #1 and #2)
    const workflowCheck = await validateNoteWorkflow(
      validatedData.clientId,
      userId,
      validatedData.noteType,
      validatedData.appointmentId
    );

    if (!workflowCheck.valid) {
      return res.status(400).json({
        success: false,
        message: workflowCheck.message,
      });
    }

    // Check if user is under supervision
    const clinician = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        isUnderSupervision: true,
        supervisorId: true,
      },
    });

    const requiresCosign = clinician?.isUnderSupervision || false;

    // DEBUG: Log the sessionDate being received
    logger.info('🟢 CREATING CLINICAL NOTE - sessionDate received:', {
      sessionDateRaw: validatedData.sessionDate,
      sessionDateType: typeof validatedData.sessionDate,
      sessionDateParsed: new Date(validatedData.sessionDate).toISOString(),
      appointmentId: validatedData.appointmentId,
      clientId: validatedData.clientId,
      noteType: validatedData.noteType
    });

    const note = await prisma.clinicalNote.create({
      data: {
        ...(validatedData as any),
        clinicianId: userId,
        requiresCosign,
        lastModifiedBy: userId,
        sessionDate: new Date(validatedData.sessionDate),
        dueDate: new Date(validatedData.dueDate),
        nextSessionDate: validatedData.nextSessionDate
          ? new Date(validatedData.nextSessionDate)
          : null,
      },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Clinical note created successfully',
      data: note,
    });
  } catch (error: any) {
    logger.error('Create clinical note error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    // Handle Prisma unique constraint violation (duplicate appointment + noteType)
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'A clinical note of this type already exists for this appointment. Please select a different appointment or edit the existing note.',
        errorCode: 'DUPLICATE_NOTE',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to create clinical note',
      error: error.message,
    });
  }
};

/**
 * Update clinical note
 */
export const updateClinicalNote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    // Check if note exists and is editable
    const existingNote = await prisma.clinicalNote.findUnique({
      where: { id },
    });

    if (!existingNote) {
      return res.status(404).json({
        success: false,
        message: 'Clinical note not found',
      });
    }

    // Can't edit locked, signed, or cosigned notes
    if (['LOCKED', 'SIGNED', 'COSIGNED'].includes(existingNote.status)) {
      return res.status(403).json({
        success: false,
        message: 'Cannot edit locked, signed, or cosigned notes',
      });
    }

    const updateData = { ...req.body, lastModifiedBy: userId };

    // Map frontend field names to database field names
    if (updateData.riskAssessmentNotes !== undefined) {
      updateData.riskAssessmentDetails = updateData.riskAssessmentNotes;
      delete updateData.riskAssessmentNotes;
    }
    if (updateData.interventions !== undefined) {
      updateData.interventionsTaken = updateData.interventions;
      delete updateData.interventions;
    }

    // Remove fields that cannot/should not be updated
    // These are relational fields or identifiers that define the note's identity
    delete updateData.id;
    delete updateData.clientId;
    delete updateData.noteType;
    delete updateData.appointmentId;
    delete updateData.clinicianId;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.client;
    delete updateData.clinician;
    delete updateData.appointment;
    delete updateData.cosigner;

    // Convert date strings to Date objects if present
    if (updateData.sessionDate) {
      updateData.sessionDate = new Date(updateData.sessionDate);
    }
    if (updateData.dueDate) {
      updateData.dueDate = new Date(updateData.dueDate);
    }
    if (updateData.nextSessionDate) {
      updateData.nextSessionDate = new Date(updateData.nextSessionDate);
    }

    const note = await prisma.clinicalNote.update({
      where: { id },
      data: updateData,
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      message: 'Clinical note updated successfully',
      data: note,
    });
  } catch (error: any) {
    logger.error('Update clinical note error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    return res.status(500).json({
      success: false,
      message: 'Failed to update clinical note',
      error: error.message,
    });
  }
};

/**
 * Sign clinical note
 */
export const signClinicalNote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    const note = await prisma.clinicalNote.findUnique({
      where: { id },
      include: { clinician: true },
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Clinical note not found',
      });
    }

    // Only the note creator can sign it
    if (note.clinicianId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the note creator can sign it',
      });
    }

    // Can't sign if already signed or locked
    if (['SIGNED', 'LOCKED', 'COSIGNED'].includes(note.status)) {
      return res.status(400).json({
        success: false,
        message: 'Note is already signed or locked',
      });
    }

    // Calculate days to complete
    const daysToComplete = Math.floor(
      (new Date().getTime() - new Date(note.sessionDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    const completedOnTime = daysToComplete <= 7; // 7-day rule

    const updatedNote = await prisma.clinicalNote.update({
      where: { id },
      data: {
        status: note.requiresCosign ? 'PENDING_COSIGN' : 'SIGNED',
        signedDate: new Date(),
        signedBy: userId,
        daysToComplete,
        completedOnTime,
        lastModifiedBy: userId,
      },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      message: note.requiresCosign
        ? 'Note signed and sent for co-signature'
        : 'Note signed successfully',
      data: updatedNote,
    });
  } catch (error: any) {
    logger.error('Sign clinical note error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    return res.status(500).json({
      success: false,
      message: 'Failed to sign clinical note',
      error: error.message,
    });
  }
};

/**
 * Co-sign clinical note (supervisor)
 */
export const cosignClinicalNote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { supervisorComments } = req.body;
    const supervisorId = (req as any).user.userId;

    const note = await prisma.clinicalNote.findUnique({
      where: { id },
      include: {
        clinician: {
          select: {
            supervisorId: true,
          },
        },
      },
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Clinical note not found',
      });
    }

    // Check if user is the supervisor
    if (note.clinician.supervisorId !== supervisorId) {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned supervisor can co-sign this note',
      });
    }

    // Check if note is in correct status
    if (note.status !== 'PENDING_COSIGN') {
      return res.status(400).json({
        success: false,
        message: 'Note is not pending co-signature',
      });
    }

    const updatedNote = await prisma.clinicalNote.update({
      where: { id },
      data: {
        status: 'COSIGNED',
        cosignedDate: new Date(),
        cosignedBy: supervisorId,
        supervisorComments: supervisorComments || null,
        lastModifiedBy: supervisorId,
      },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
        cosigner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      message: 'Note co-signed successfully',
      data: updatedNote,
    });
  } catch (error: any) {
    logger.error('Cosign clinical note error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    return res.status(500).json({
      success: false,
      message: 'Failed to co-sign clinical note',
      error: error.message,
    });
  }
};

/**
 * Delete clinical note (soft delete - change status)
 */
export const deleteClinicalNote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    const note = await prisma.clinicalNote.findUnique({
      where: { id },
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Clinical note not found',
      });
    }

    // Can only delete draft notes
    if (note.status !== 'DRAFT') {
      return res.status(403).json({
        success: false,
        message: 'Only draft notes can be deleted',
      });
    }

    // Only the creator can delete
    if (note.clinicianId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the note creator can delete it',
      });
    }

    await prisma.clinicalNote.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'Clinical note deleted successfully',
    });
  } catch (error: any) {
    logger.error('Delete clinical note error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    return res.status(500).json({
      success: false,
      message: 'Failed to delete clinical note',
      error: error.message,
    });
  }
};

/**
 * Get notes requiring co-signature for supervisor
 */
export const getNotesForCosigning = async (req: Request, res: Response) => {
  try {
    const supervisorId = (req as any).user.userId;

    // Find all supervisees
    const supervisees = await prisma.user.findMany({
      where: { supervisorId },
      select: { id: true },
    });

    const superviseeIds = supervisees.map((s) => s.id);

    const notes = await prisma.clinicalNote.findMany({
      where: {
        clinicianId: { in: superviseeIds },
        status: 'PENDING_COSIGN',
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            medicalRecordNumber: true,
          },
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
      },
      orderBy: { sessionDate: 'desc' },
    });

    return res.json({
      success: true,
      data: notes,
      count: notes.length,
    });
  } catch (error: any) {
    logger.error('Get notes for cosigning error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notes for co-signing',
      error: error.message,
    });
  }
};

/**
 * Get client's current diagnosis from latest Intake or Treatment Plan
 */
export const getClientDiagnosis = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    // Get diagnosis from latest signed Intake Assessment or Treatment Plan
    const latestDiagnosisNote = await prisma.clinicalNote.findFirst({
      where: {
        clientId,
        noteType: { in: ['Intake Assessment', 'Treatment Plan'] },
        status: { in: ['SIGNED', 'COSIGNED', 'LOCKED'] },
        diagnosisCodes: { isEmpty: false },
      },
      orderBy: { signedDate: 'desc' },
      select: { diagnosisCodes: true },
    });

    return res.json({
      success: true,
      data: { diagnosisCodes: latestDiagnosisNote?.diagnosisCodes || [] },
    });
  } catch (error: any) {
    logger.error('Get client diagnosis error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve client diagnosis',
      error: error.message,
    });
  }
};

/**
 * Get Treatment Plan update status for client
 */
export const getTreatmentPlanStatus = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const status = await checkTreatmentPlanStatus(clientId);

    return res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    logger.error('Get treatment plan status error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    return res.status(500).json({
      success: false,
      message: 'Failed to check treatment plan status',
      error: error.message,
    });
  }
};

/**
 * Get eligible appointments for creating a specific note type
 */
export const getEligibleAppointments = async (req: Request, res: Response) => {
  try {
    const { clientId, noteType } = req.params;

    const appointments = await AppointmentEligibilityService.getEligibleAppointments(
      clientId,
      noteType
    );

    const defaultConfig = AppointmentEligibilityService.getDefaultAppointmentConfig(noteType);

    return res.json({
      success: true,
      data: {
        appointments,
        defaultConfig,
        hasEligible: appointments.length > 0,
      },
    });
  } catch (error: any) {
    logger.error('Get eligible appointments error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve eligible appointments',
      error: error.message,
    });
  }
};

/**
 * Get inherited diagnoses for a new note (for Progress Notes and Treatment Plans)
 */
export const getInheritedDiagnoses = async (req: Request, res: Response) => {
  try {
    const { clientId, noteType } = req.params;

    const diagnoses = await DiagnosisInheritanceService.getInheritedDiagnosesForNote(
      clientId,
      noteType
    );

    const validation = await DiagnosisInheritanceService.validateDiagnosesForNoteType(
      clientId,
      noteType
    );

    return res.json({
      success: true,
      data: {
        diagnosisCodes: diagnoses,
        canSign: validation.valid,
        validationMessage: validation.message,
      },
    });
  } catch (error: any) {
    logger.error('Get inherited diagnoses error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve inherited diagnoses',
      error: error.message,
    });
  }
};

/**
 * Get all notes for the logged-in clinician (My Notes)
 */
export const getMyNotes = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { status, noteType, clientId, startDate, endDate, search } = req.query;

    // Build where clause
    const where: any = {
      clinicianId: userId,
    };

    if (status) {
      where.status = status;
    }

    if (noteType) {
      where.noteType = noteType;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (startDate || endDate) {
      where.sessionDate = {};
      if (startDate) {
        where.sessionDate.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.sessionDate.lte = new Date(endDate as string);
      }
    }

    // Search filter (client name or note content)
    if (search) {
      where.OR = [
        {
          client: {
            OR: [
              { firstName: { contains: search as string, mode: 'insensitive' } },
              { lastName: { contains: search as string, mode: 'insensitive' } },
            ],
          },
        },
        { subjective: { contains: search as string, mode: 'insensitive' } },
        { objective: { contains: search as string, mode: 'insensitive' } },
        { assessment: { contains: search as string, mode: 'insensitive' } },
        { plan: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const notes = await prisma.clinicalNote.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            medicalRecordNumber: true,
          },
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
        cosigner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
        appointment: {
          select: {
            id: true,
            appointmentDate: true,
            startTime: true,
            endTime: true,
          },
        },
      },
      orderBy: { sessionDate: 'desc' },
    });

    // Calculate statistics
    const stats = {
      total: notes.length,
      draft: notes.filter((n) => n.status === 'DRAFT').length,
      signed: notes.filter((n) => n.status === 'SIGNED').length,
      pendingCosign: notes.filter((n) => n.status === 'PENDING_COSIGN').length,
      cosigned: notes.filter((n) => n.status === 'COSIGNED').length,
      locked: notes.filter((n) => n.isLocked).length,
      overdue: notes.filter((n) => {
        if (n.signedDate) return false;
        const daysSince = Math.floor((new Date().getTime() - new Date(n.sessionDate).getTime()) / (1000 * 60 * 60 * 24));
        return daysSince > 3;
      }).length,
    };

    return res.json({
      success: true,
      data: notes,
      stats,
      count: notes.length,
    });
  } catch (error: any) {
    logger.error('Get my notes error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notes',
      error: error.message,
    });
  }
};

/**
 * Get appointments without notes (Compliance Dashboard)
 * Shows past completed appointments that don't have signed notes
 */
export const getAppointmentsWithoutNotes = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });

    // Build filter based on role
    let appointmentFilter: any = {
      status: 'COMPLETED',
      appointmentDate: { lt: new Date() }, // Past appointments only
    };

    // Supervisors see supervisees' appointments, admins see all, clinicians see their own
    if (user?.roles.includes('ADMINISTRATOR')) {
      // Admins see all
    } else if (user?.roles.includes('SUPERVISOR')) {
      // Get all supervisees
      const supervisees = await prisma.user.findMany({
        where: { supervisorId: userId },
        select: { id: true },
      });
      const superviseeIds = supervisees.map((s) => s.id);
      appointmentFilter.clinicianId = { in: [...superviseeIds, userId] };
    } else {
      // Clinicians see their own
      appointmentFilter.clinicianId = userId;
    }

    // Get all completed appointments
    const appointments = await prisma.appointment.findMany({
      where: appointmentFilter,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            medicalRecordNumber: true,
          },
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
        clinicalNotes: {
          where: {
            status: { in: ['SIGNED', 'COSIGNED', 'LOCKED'] },
          },
        },
      },
      orderBy: { appointmentDate: 'desc' },
    });

    // Filter to only appointments without signed notes
    const appointmentsWithoutNotes = appointments.filter(
      (apt) => apt.clinicalNotes.length === 0
    );

    // Calculate days since appointment
    const enrichedAppointments = appointmentsWithoutNotes.map((apt) => {
      const daysSince = Math.floor(
        (new Date().getTime() - new Date(apt.appointmentDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      const isOverdue = daysSince > 3; // 3-day rule
      const isUrgent = daysSince > 7; // 7-day rule

      return {
        ...apt,
        daysSince,
        isOverdue,
        isUrgent,
      };
    });

    return res.json({
      success: true,
      data: enrichedAppointments,
      count: enrichedAppointments.length,
      stats: {
        total: enrichedAppointments.length,
        overdue: enrichedAppointments.filter((a) => a.isOverdue).length,
        urgent: enrichedAppointments.filter((a) => a.isUrgent).length,
      },
    });
  } catch (error: any) {
    logger.error('Get appointments without notes error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve appointments without notes',
      error: error.message,
    });
  }
};

/**
 * Get compliance dashboard data
 * Comprehensive view of all compliance-related items
 */
export const getComplianceDashboard = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });

    // Build filter based on role
    let clinicianFilter: any = {};
    if (user?.roles.includes('ADMINISTRATOR')) {
      // Admins see all
    } else if (user?.roles.includes('SUPERVISOR')) {
      // Get all supervisees
      const supervisees = await prisma.user.findMany({
        where: { supervisorId: userId },
        select: { id: true },
      });
      const superviseeIds = supervisees.map((s) => s.id);
      clinicianFilter = { in: [...superviseeIds, userId] };
    } else {
      // Clinicians see their own
      clinicianFilter = userId;
    }

    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - 3); // 3-day rule

    // Get all relevant data
    const [
      notesAwaitingCosign,
      overdueNotes,
      lockedNotes,
      draftNotes,
      appointmentsWithoutNotes,
    ] = await Promise.all([
      // Notes awaiting co-signature
      prisma.clinicalNote.findMany({
        where: {
          clinicianId: clinicianFilter,
          status: 'PENDING_COSIGN',
          requiresCosign: true,
          cosignedDate: null,
        },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              title: true,
            },
          },
        },
        orderBy: { signedDate: 'desc' },
      }),

      // Overdue notes (not signed, past 3-day deadline)
      prisma.clinicalNote.findMany({
        where: {
          clinicianId: clinicianFilter,
          signedDate: null,
          sessionDate: { lt: cutoffDate },
          isLocked: false,
          status: { in: ['DRAFT', 'PENDING_COSIGN'] },
        },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              title: true,
            },
          },
        },
        orderBy: { sessionDate: 'asc' },
      }),

      // Locked notes
      prisma.clinicalNote.findMany({
        where: {
          clinicianId: clinicianFilter,
          isLocked: true,
        },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              title: true,
            },
          },
        },
        orderBy: { lockedDate: 'desc' },
      }),

      // Draft notes
      prisma.clinicalNote.findMany({
        where: {
          clinicianId: clinicianFilter,
          status: 'DRAFT',
        },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              title: true,
            },
          },
        },
        orderBy: { sessionDate: 'desc' },
      }),

      // Appointments without signed notes
      prisma.appointment.findMany({
        where: {
          clinicianId: clinicianFilter,
          status: 'COMPLETED',
          appointmentDate: { lt: now },
        },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              title: true,
            },
          },
          clinicalNotes: {
            where: {
              status: { in: ['SIGNED', 'COSIGNED', 'LOCKED'] },
            },
          },
        },
        orderBy: { appointmentDate: 'desc' },
      }),
    ]);

    // Filter appointments to only those without signed notes
    const appointmentsWithoutSignedNotes = appointmentsWithoutNotes
      .filter((apt) => apt.clinicalNotes.length === 0)
      .map((apt) => {
        const daysSince = Math.floor(
          (now.getTime() - new Date(apt.appointmentDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          ...apt,
          daysSince,
          isOverdue: daysSince > 3,
          isUrgent: daysSince > 7,
        };
      });

    // Calculate statistics
    const stats = {
      awaitingCosign: notesAwaitingCosign.length,
      overdue: overdueNotes.length,
      locked: lockedNotes.length,
      drafts: draftNotes.length,
      missingNotes: appointmentsWithoutSignedNotes.length,
      urgent: appointmentsWithoutSignedNotes.filter((a) => a.isUrgent).length,
    };

    return res.json({
      success: true,
      data: {
        notesAwaitingCosign,
        overdueNotes,
        lockedNotes,
        draftNotes,
        appointmentsWithoutNotes: appointmentsWithoutSignedNotes,
        stats,
      },
    });
  } catch (error: any) {
    logger.error('Get compliance dashboard error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve compliance dashboard',
      error: error.message,
    });
  }
};
