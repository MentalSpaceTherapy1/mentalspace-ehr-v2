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
    console.error('Get client notes error:', error);
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
    console.error('Get clinical note error:', error);
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

    const note = await prisma.clinicalNote.create({
      data: {
        ...validatedData,
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

    // If this is an Intake or Treatment Plan with diagnosis codes, update client's diagnosis
    if (
      (validatedData.noteType === 'Intake Assessment' || validatedData.noteType === 'Treatment Plan') &&
      validatedData.diagnosisCodes.length > 0
    ) {
      await prisma.client.update({
        where: { id: validatedData.clientId },
        data: { diagnosisCodes: validatedData.diagnosisCodes },
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Clinical note created successfully',
      data: note,
    });
  } catch (error: any) {
    console.error('Create clinical note error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
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

    // Update client diagnosis if this is Intake or Treatment Plan
    if (
      (note.noteType === 'Intake Assessment' || note.noteType === 'Treatment Plan') &&
      updateData.diagnosisCodes
    ) {
      await prisma.client.update({
        where: { id: note.clientId },
        data: { diagnosisCodes: updateData.diagnosisCodes },
      });
    }

    return res.json({
      success: true,
      message: 'Clinical note updated successfully',
      data: note,
    });
  } catch (error: any) {
    console.error('Update clinical note error:', error);
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
    console.error('Sign clinical note error:', error);
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
    console.error('Cosign clinical note error:', error);
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
    console.error('Delete clinical note error:', error);
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
    console.error('Get notes for cosigning error:', error);
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

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { diagnosisCodes: true },
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }

    return res.json({
      success: true,
      data: { diagnosisCodes: client.diagnosisCodes || [] },
    });
  } catch (error: any) {
    console.error('Get client diagnosis error:', error);
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
    console.error('Get treatment plan status error:', error);
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
    console.error('Get eligible appointments error:', error);
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
    console.error('Get inherited diagnoses error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve inherited diagnoses',
      error: error.message,
    });
  }
};
