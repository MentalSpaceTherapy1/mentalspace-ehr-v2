/**
 * Clinical Note Service
 * Phase 3.2: Business logic extracted from clinicalNote.controller.ts
 *
 * Handles all clinical note-related business operations including:
 * - Note CRUD operations with workflow validation
 * - Signing and co-signing with authentication
 * - Treatment plan status tracking
 * - Compliance dashboard data
 * - Revision workflow management
 */

import prisma from './database';
import { ClinicalNote, Prisma } from '@mentalspace/database';
import { z } from 'zod';
import logger from '../utils/logger';
import { UserRoles, NoteStatus } from '@mentalspace/shared';
import { NotFoundError, BadRequestError, ForbiddenError, UnauthorizedError } from '../utils/errors';
import { JwtPayload } from '../utils/jwt';
import { ClinicalNotesValidationService } from './clinical-notes-validation.service';
import { AppointmentEligibilityService } from './appointment-eligibility.service';
import { DiagnosisInheritanceService } from './diagnosis-inheritance.service';
import * as SignatureService from './signature.service';

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
  GROUP_THERAPY: 'Group Therapy Note',
} as const;

export type NoteType = typeof NOTE_TYPES[keyof typeof NOTE_TYPES];

// Validation schemas
export const clinicalNoteSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  appointmentId: z.string().uuid('Invalid appointment ID').nullable().optional(),
  noteType: z.enum([
    'Intake Assessment',
    'Progress Note',
    'Treatment Plan',
    'Cancellation Note',
    'Consultation Note',
    'Contact Note',
    'Termination Note',
    'Miscellaneous Note',
    'Group Therapy Note',
  ]),
  sessionDate: z.string().datetime('Invalid session date').optional(),
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

  // Diagnosis & Treatment
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
  dueDate: z.string().datetime().optional(),
  status: z.enum(['DRAFT', 'PENDING_COSIGN', 'SIGNED', 'COSIGNED', 'RETURNED_FOR_REVISION', 'LOCKED']).optional(),
});

export const updateClinicalNoteSchema = clinicalNoteSchema.partial().omit({ clientId: true, noteType: true });

export const returnForRevisionSchema = z.object({
  comments: z.string().min(10, 'Comments must be at least 10 characters'),
  requiredChanges: z.array(z.string()).min(1, 'At least one required change must be specified'),
});

export const signNoteSchema = z.object({
  pin: z.string().optional(),
  password: z.string().optional(),
});

export const cosignNoteSchema = z.object({
  supervisorComments: z.string().optional(),
  pin: z.string().optional(),
  password: z.string().optional(),
});

// Types
export type CreateNoteInput = z.infer<typeof clinicalNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateClinicalNoteSchema>;

export interface NoteFilters {
  status?: string;
  noteType?: string;
  clientId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface NoteStats {
  total: number;
  draft: number;
  signed: number;
  pendingCosign: number;
  cosigned: number;
  locked: number;
  overdue: number;
}

export interface TreatmentPlanStatus {
  needsUpdate: boolean;
  daysOverdue: number | null;
  lastTreatmentPlan?: ClinicalNote;
}

export interface ComplianceDashboardData {
  notesAwaitingCosign: ClinicalNote[];
  overdueNotes: ClinicalNote[];
  lockedNotes: ClinicalNote[];
  draftNotes: ClinicalNote[];
  appointmentsWithoutNotes: any[];
  stats: {
    awaitingCosign: number;
    overdue: number;
    locked: number;
    drafts: number;
    missingNotes: number;
    urgent: number;
  };
}

// Include configurations for queries
const noteIncludeBasic = {
  clinician: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      title: true,
    },
  },
};

const noteIncludeFull = {
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
};

/**
 * Clinical Note Service Class
 * Encapsulates all clinical note-related business logic
 */
class ClinicalNoteService {
  /**
   * Validate note workflow rules using Business Rules validation service
   */
  async validateNoteWorkflow(
    clientId: string,
    clinicianId: string,
    noteType: string,
    appointmentId?: string,
    status?: string
  ): Promise<{ valid: boolean; message?: string }> {
    try {
      await ClinicalNotesValidationService.validateNoteCreation({
        noteType,
        clientId,
        clinicianId,
        appointmentId,
        status,
      });

      return { valid: true };
    } catch (error: unknown) {
      return { valid: false, message: error.message };
    }
  }

  /**
   * Check if Treatment Plan needs updating (3-month rule)
   */
  async checkTreatmentPlanStatus(clientId: string): Promise<TreatmentPlanStatus> {
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
   * Calculate days since session and compliance status
   */
  calculateComplianceMetrics(sessionDate: Date | null, signedDate: Date | null): {
    daysToComplete: number;
    completedOnTime: boolean;
    isOverdue: boolean;
    isUrgent: boolean;
  } {
    const now = new Date();
    const sessionDateValue = sessionDate ? new Date(sessionDate) : now;

    const daysToComplete = Math.floor(
      (now.getTime() - sessionDateValue.getTime()) / (1000 * 60 * 60 * 24)
    );

    const completedOnTime = signedDate
      ? Math.floor((new Date(signedDate).getTime() - sessionDateValue.getTime()) / (1000 * 60 * 60 * 24)) <= 7
      : false;

    const isOverdue = !signedDate && daysToComplete > 3;
    const isUrgent = !signedDate && daysToComplete > 7;

    return { daysToComplete, completedOnTime, isOverdue, isUrgent };
  }

  /**
   * Get all clinical notes for a client
   */
  async getClientNotes(clientId: string): Promise<{ notes: ClinicalNote[]; treatmentPlanStatus: TreatmentPlanStatus }> {
    const [notes, treatmentPlanStatus] = await Promise.all([
      prisma.clinicalNote.findMany({
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
      }),
      this.checkTreatmentPlanStatus(clientId),
    ]);

    return { notes, treatmentPlanStatus };
  }

  /**
   * Get clinical note by ID
   */
  async getNoteById(id: string): Promise<ClinicalNote> {
    const note = await prisma.clinicalNote.findUnique({
      where: { id },
      include: noteIncludeFull,
    });

    if (!note) {
      throw new NotFoundError('Clinical note');
    }

    return note;
  }

  /**
   * Create new clinical note with workflow validation
   */
  async createNote(data: CreateNoteInput, userId: string): Promise<ClinicalNote> {
    const validatedData = clinicalNoteSchema.parse(data);

    const isDraft = validatedData.status === 'DRAFT';

    // Non-draft notes require appointmentId
    if (!isDraft && !validatedData.appointmentId) {
      throw new BadRequestError('Appointment is required for non-draft notes');
    }

    // Validate workflow rules for non-draft notes
    if (!isDraft) {
      const workflowCheck = await this.validateNoteWorkflow(
        validatedData.clientId,
        userId,
        validatedData.noteType,
        validatedData.appointmentId || undefined,
        validatedData.status
      );

      if (!workflowCheck.valid) {
        throw new BadRequestError(workflowCheck.message || 'Workflow validation failed');
      }
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

    logger.info('Creating clinical note', {
      clientId: validatedData.clientId,
      noteType: validatedData.noteType,
      isDraft,
      requiresCosign,
    });

    // Extract date fields for separate handling
    const { sessionDate: rawSessionDate, dueDate: rawDueDate, nextSessionDate: rawNextSessionDate, ...restValidatedData } = validatedData as any;

    // Determine the effective session date - default to today if not provided
    const effectiveSessionDate = rawSessionDate ? new Date(rawSessionDate) : new Date();

    try {
      const note = await prisma.clinicalNote.create({
        data: {
          ...restValidatedData,
          clinicianId: userId,
          requiresCosign,
          lastModifiedBy: userId,
          sessionDate: effectiveSessionDate,
          dueDate: rawDueDate ? new Date(rawDueDate) : null,
          nextSessionDate: rawNextSessionDate ? new Date(rawNextSessionDate) : null,
        },
        include: noteIncludeBasic,
      });

      return note;
    } catch (error: unknown) {
      // Handle Prisma unique constraint violation
      if (error.code === 'P2002') {
        throw new BadRequestError(
          'A clinical note of this type already exists for this appointment. Please select a different appointment or edit the existing note.'
        );
      }
      throw error;
    }
  }

  /**
   * Update clinical note
   */
  async updateNote(id: string, data: any, userId: string): Promise<ClinicalNote> {
    // Check if note exists and is editable
    const existingNote = await prisma.clinicalNote.findUnique({
      where: { id },
    });

    if (!existingNote) {
      throw new NotFoundError('Clinical note');
    }

    // Can't edit locked, signed, or cosigned notes
    if (['LOCKED', 'SIGNED', 'COSIGNED'].includes(existingNote.status)) {
      throw new ForbiddenError('Cannot edit locked, signed, or cosigned notes');
    }

    const updateData = { ...data, lastModifiedBy: userId };

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
      include: noteIncludeBasic,
    });

    return note;
  }

  /**
   * Sign clinical note
   */
  async signNote(
    id: string,
    userId: string,
    authData: { pin?: string; password?: string },
    requestInfo: { ipAddress: string; userAgent: string }
  ): Promise<ClinicalNote> {
    const note = await prisma.clinicalNote.findUnique({
      where: { id },
      include: { clinician: true },
    });

    if (!note) {
      throw new NotFoundError('Clinical note');
    }

    // Only the note creator can sign it
    if (note.clinicianId !== userId) {
      throw new ForbiddenError('Only the note creator can sign it');
    }

    // Can't sign if already signed or locked
    if (['SIGNED', 'LOCKED', 'COSIGNED'].includes(note.status)) {
      throw new BadRequestError('Note is already signed or locked');
    }

    // Verify signature authentication
    const isAuthValid = await SignatureService.verifySignatureAuth({
      userId,
      pin: authData.pin,
      password: authData.password,
    });

    if (!isAuthValid) {
      throw new UnauthorizedError('Invalid signature PIN or password');
    }

    // Validate note before signing
    const validationResult = await ClinicalNotesValidationService.validateNote(note.noteType, note);
    if (!validationResult.isValid) {
      throw new BadRequestError('Note validation failed. Please complete all required fields.');
    }

    // Calculate compliance metrics
    const metrics = this.calculateComplianceMetrics(note.sessionDate, null);

    // Create signature event
    await SignatureService.createSignatureEvent({
      noteId: id,
      userId,
      signatureType: 'AUTHOR',
      authMethod: authData.pin ? 'PIN' : 'PASSWORD',
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
    });

    const updatedNote = await prisma.clinicalNote.update({
      where: { id },
      data: {
        status: note.requiresCosign ? 'PENDING_COSIGN' : 'SIGNED',
        signedDate: new Date(),
        signedBy: userId,
        daysToComplete: metrics.daysToComplete,
        completedOnTime: metrics.completedOnTime,
        lastModifiedBy: userId,
      },
      include: noteIncludeBasic,
    });

    return updatedNote;
  }

  /**
   * Co-sign clinical note (supervisor)
   */
  async cosignNote(
    id: string,
    supervisorId: string,
    data: { supervisorComments?: string; pin?: string; password?: string },
    requestInfo: { ipAddress: string; userAgent: string }
  ): Promise<ClinicalNote> {
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
      throw new NotFoundError('Clinical note');
    }

    // Check if user is the supervisor
    if (note.clinician.supervisorId !== supervisorId) {
      throw new ForbiddenError('Only the assigned supervisor can co-sign this note');
    }

    // Check if note is in correct status
    if (note.status !== 'PENDING_COSIGN') {
      throw new BadRequestError('Note is not pending co-signature');
    }

    // Verify signature authentication
    const isAuthValid = await SignatureService.verifySignatureAuth({
      userId: supervisorId,
      pin: data.pin,
      password: data.password,
    });

    if (!isAuthValid) {
      throw new UnauthorizedError('Invalid signature PIN or password');
    }

    // Create signature event
    await SignatureService.createSignatureEvent({
      noteId: id,
      userId: supervisorId,
      signatureType: 'COSIGN',
      authMethod: data.pin ? 'PIN' : 'PASSWORD',
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
    });

    const updatedNote = await prisma.clinicalNote.update({
      where: { id },
      data: {
        status: 'COSIGNED',
        cosignedDate: new Date(),
        cosignedBy: supervisorId,
        supervisorComments: data.supervisorComments || null,
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

    return updatedNote;
  }

  /**
   * Delete clinical note (only drafts can be deleted)
   */
  async deleteNote(id: string, userId: string): Promise<void> {
    const note = await prisma.clinicalNote.findUnique({
      where: { id },
    });

    if (!note) {
      throw new NotFoundError('Clinical note');
    }

    // Can only delete draft notes
    if (note.status !== 'DRAFT') {
      throw new ForbiddenError('Only draft notes can be deleted');
    }

    // Only the creator can delete
    if (note.clinicianId !== userId) {
      throw new ForbiddenError('Only the note creator can delete it');
    }

    await prisma.clinicalNote.delete({
      where: { id },
    });

    logger.info('Clinical note deleted', { noteId: id, userId });
  }

  /**
   * Get notes requiring co-signature for supervisor
   */
  async getNotesForCosigning(supervisorId: string): Promise<ClinicalNote[]> {
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

    return notes;
  }

  /**
   * Get client's current diagnosis from latest Intake or Treatment Plan
   */
  async getClientDiagnosis(clientId: string): Promise<string[]> {
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

    return latestDiagnosisNote?.diagnosisCodes || [];
  }

  /**
   * Get eligible appointments for creating a specific note type
   */
  async getEligibleAppointments(clientId: string, noteType: string): Promise<{
    appointments: any[];
    defaultConfig: any;
    hasEligible: boolean;
  }> {
    const appointments = await AppointmentEligibilityService.getEligibleAppointments(clientId, noteType);
    const defaultConfig = AppointmentEligibilityService.getDefaultAppointmentConfig(noteType);

    return {
      appointments,
      defaultConfig,
      hasEligible: appointments.length > 0,
    };
  }

  /**
   * Get inherited diagnoses for a new note
   */
  async getInheritedDiagnoses(clientId: string, noteType: string): Promise<{
    diagnosisCodes: string[];
    canSign: boolean;
    validationMessage: string | null;
  }> {
    const diagnoses = await DiagnosisInheritanceService.getInheritedDiagnosesForNote(clientId, noteType);
    const validation = await DiagnosisInheritanceService.validateDiagnosesForNoteType(clientId, noteType);

    return {
      diagnosisCodes: diagnoses,
      canSign: validation.valid,
      validationMessage: validation.message ?? null,
    };
  }

  /**
   * Get all notes for the logged-in clinician (My Notes)
   */
  async getMyNotes(userId: string, filters: NoteFilters): Promise<{ notes: ClinicalNote[]; stats: NoteStats }> {
    // Build where clause
    const where: any = {
      clinicianId: userId,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.noteType) {
      where.noteType = filters.noteType;
    }

    if (filters.clientId) {
      where.clientId = filters.clientId;
    }

    if (filters.startDate || filters.endDate) {
      where.sessionDate = {};
      if (filters.startDate) {
        where.sessionDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.sessionDate.lte = new Date(filters.endDate);
      }
    }

    // Search filter (client name or note content)
    if (filters.search) {
      where.OR = [
        {
          client: {
            OR: [
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
            ],
          },
        },
        { subjective: { contains: filters.search, mode: 'insensitive' } },
        { objective: { contains: filters.search, mode: 'insensitive' } },
        { assessment: { contains: filters.search, mode: 'insensitive' } },
        { plan: { contains: filters.search, mode: 'insensitive' } },
        { riskAssessmentDetails: { contains: filters.search, mode: 'insensitive' } },
        { interventionsTaken: { contains: filters.search, mode: 'insensitive' } },
        { progressTowardGoals: { contains: filters.search, mode: 'insensitive' } },
        { nextSessionPlan: { contains: filters.search, mode: 'insensitive' } },
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
    const stats: NoteStats = {
      total: notes.length,
      draft: notes.filter((n) => n.status === 'DRAFT').length,
      signed: notes.filter((n) => n.status === 'SIGNED').length,
      pendingCosign: notes.filter((n) => n.status === 'PENDING_COSIGN').length,
      cosigned: notes.filter((n) => n.status === 'COSIGNED').length,
      locked: notes.filter((n) => n.isLocked).length,
      overdue: notes.filter((n) => {
        if (n.signedDate) return false;
        if (!n.sessionDate) return false;
        const daysSince = Math.floor(
          (new Date().getTime() - new Date(n.sessionDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysSince > 3;
      }).length,
    };

    return { notes, stats };
  }

  /**
   * Build clinician filter based on role
   */
  private async buildClinicianFilter(userId: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });

    if (user?.roles.includes(UserRoles.ADMINISTRATOR)) {
      return {}; // Admins see all
    }

    if (user?.roles.includes(UserRoles.SUPERVISOR)) {
      const supervisees = await prisma.user.findMany({
        where: { supervisorId: userId },
        select: { id: true },
      });
      const superviseeIds = supervisees.map((s) => s.id);
      return { in: [...superviseeIds, userId] };
    }

    return userId; // Clinicians see their own
  }

  /**
   * Get appointments without signed notes (Compliance Dashboard)
   */
  async getAppointmentsWithoutNotes(userId: string): Promise<any[]> {
    const clinicianFilter = await this.buildClinicianFilter(userId);

    const appointmentFilter: any = {
      status: 'COMPLETED',
      appointmentDate: { lt: new Date() },
    };

    // Check if clinicianFilter has meaningful content (not empty object)
    if (typeof clinicianFilter === 'string') {
      appointmentFilter.clinicianId = clinicianFilter;
    } else if (clinicianFilter && typeof clinicianFilter === 'object' && 'in' in clinicianFilter) {
      appointmentFilter.clinicianId = clinicianFilter;
    }

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

    // Filter to only appointments without signed notes and enrich with compliance data
    return appointments
      .filter((apt) => apt.clinicalNotes.length === 0)
      .map((apt) => {
        const daysSince = Math.floor(
          (new Date().getTime() - new Date(apt.appointmentDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          ...apt,
          daysSince,
          isOverdue: daysSince > 3,
          isUrgent: daysSince > 7,
        };
      });
  }

  /**
   * Get compliance dashboard data
   */
  async getComplianceDashboard(userId: string): Promise<ComplianceDashboardData> {
    const clinicianFilter = await this.buildClinicianFilter(userId);

    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - 3); // 3-day rule

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
            select: { id: true, firstName: true, lastName: true },
          },
          clinician: {
            select: { id: true, firstName: true, lastName: true, title: true },
          },
        },
        orderBy: { signedDate: 'desc' },
      }),

      // Overdue notes
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
            select: { id: true, firstName: true, lastName: true },
          },
          clinician: {
            select: { id: true, firstName: true, lastName: true, title: true },
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
            select: { id: true, firstName: true, lastName: true },
          },
          clinician: {
            select: { id: true, firstName: true, lastName: true, title: true },
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
            select: { id: true, firstName: true, lastName: true },
          },
          clinician: {
            select: { id: true, firstName: true, lastName: true, title: true },
          },
        },
        orderBy: { sessionDate: 'desc' },
      }),

      // Appointments without signed notes
      this.getAppointmentsWithoutNotes(userId),
    ]);

    const stats = {
      awaitingCosign: notesAwaitingCosign.length,
      overdue: overdueNotes.length,
      locked: lockedNotes.length,
      drafts: draftNotes.length,
      missingNotes: appointmentsWithoutNotes.length,
      urgent: appointmentsWithoutNotes.filter((a: any) => a.isUrgent).length,
    };

    return {
      notesAwaitingCosign,
      overdueNotes,
      lockedNotes,
      draftNotes,
      appointmentsWithoutNotes,
      stats,
    };
  }

  /**
   * Return a note for revision (supervisor to clinician)
   */
  async returnForRevision(
    id: string,
    supervisorId: string,
    supervisorName: string,
    userRole: string,
    data: { comments: string; requiredChanges: string[] }
  ): Promise<ClinicalNote> {
    const validatedData = returnForRevisionSchema.parse(data);

    const note = await prisma.clinicalNote.findUnique({
      where: { id },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!note) {
      throw new NotFoundError('Clinical note');
    }

    // Only supervisors/administrators can return notes for revision
    if (userRole !== UserRoles.SUPERVISOR && userRole !== UserRoles.ADMINISTRATOR) {
      throw new ForbiddenError('Only supervisors can return notes for revision');
    }

    // Note must be PENDING_COSIGN to be returned
    if (note.status !== 'PENDING_COSIGN') {
      throw new BadRequestError(`Note must be in PENDING_COSIGN status. Current status: ${note.status}`);
    }

    // Create revision history entry
    const revisionEntry = {
      date: new Date().toISOString(),
      returnedBy: supervisorId,
      returnedByName: supervisorName,
      comments: validatedData.comments,
      requiredChanges: validatedData.requiredChanges,
      resolvedDate: null,
      resubmittedDate: null,
    };

    const updatedNote = await prisma.clinicalNote.update({
      where: { id },
      data: {
        status: 'RETURNED_FOR_REVISION',
        revisionHistory: {
          push: revisionEntry,
        },
        revisionCount: {
          increment: 1,
        },
        currentRevisionComments: validatedData.comments,
        currentRevisionRequiredChanges: validatedData.requiredChanges,
        lastModifiedBy: supervisorId,
      },
      include: {
        clinician: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    logger.info('Note returned for revision', {
      noteId: id,
      returnedBy: supervisorId,
      clinicianId: note.clinicianId,
      revisionCount: updatedNote.revisionCount,
    });

    return updatedNote;
  }

  /**
   * Resubmit a note for review after revisions
   */
  async resubmitForReview(id: string, userId: string): Promise<ClinicalNote> {
    const note = await prisma.clinicalNote.findUnique({
      where: { id },
      include: {
        cosigner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!note) {
      throw new NotFoundError('Clinical note');
    }

    // Only the note creator can resubmit
    if (note.clinicianId !== userId) {
      throw new ForbiddenError('Only the note creator can resubmit for review');
    }

    // Note must be RETURNED_FOR_REVISION to be resubmitted
    if (note.status !== 'RETURNED_FOR_REVISION') {
      throw new BadRequestError(`Note must be in RETURNED_FOR_REVISION status. Current status: ${note.status}`);
    }

    // Update the latest revision history entry with resubmission date
    const revisionHistory = note.revisionHistory as any[];
    if (revisionHistory && revisionHistory.length > 0) {
      const latestRevision = revisionHistory[revisionHistory.length - 1];
      latestRevision.resubmittedDate = new Date().toISOString();
    }

    const updatedNote = await prisma.clinicalNote.update({
      where: { id },
      data: {
        status: 'PENDING_COSIGN',
        revisionHistory: revisionHistory,
        currentRevisionComments: null,
        currentRevisionRequiredChanges: [],
        lastModifiedBy: userId,
      },
      include: {
        clinician: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        cosigner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    logger.info('Note resubmitted for review', {
      noteId: id,
      clinicianId: userId,
      revisionCount: note.revisionCount,
    });

    return updatedNote;
  }

  /**
   * Get clinical notes with filtering (for billing readiness, etc.)
   */
  async getClinicalNotes(
    userId: string,
    userRole: string,
    filters: { status?: string; limit?: number; noteType?: string; clientId?: string }
  ): Promise<ClinicalNote[]> {
    const where: any = {};

    // Handle status filter (supports comma-separated values)
    if (filters.status) {
      const statusArray = filters.status.split(',').map((s) => s.trim());
      if (statusArray.length === 1) {
        where.status = statusArray[0];
      } else {
        where.status = { in: statusArray };
      }
    }

    if (filters.noteType) {
      where.noteType = filters.noteType;
    }

    if (filters.clientId) {
      where.clientId = filters.clientId;
    }

    // Apply role-based access control
    const adminRoles: readonly string[] = [UserRoles.SUPER_ADMIN, UserRoles.ADMINISTRATOR, UserRoles.CLINICAL_DIRECTOR];
    if (!adminRoles.includes(userRole)) {
      where.OR = [{ clinicianId: userId }, { cosignedBy: userId }];
    }

    const takeLimit = filters.limit ? Math.min(filters.limit, 100) : 50;

    const notes = await prisma.clinicalNote.findMany({
      where,
      take: takeLimit,
      orderBy: { sessionDate: 'desc' },
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
        clinician: {
          select: { id: true, firstName: true, lastName: true, title: true },
        },
      },
    });

    return notes;
  }
}

// Export singleton instance
export const clinicalNoteService = new ClinicalNoteService();
export default clinicalNoteService;
