import prisma from './database';
/**
 * Clinical Notes Business Rules Validation Service
 *
 * Implements validation for three core business rules:
 * 1. Appointment-based note creation
 * 2. Sequential documentation workflow
 * 3. Diagnosis management and propagation
 */

import { PrismaClient, AppointmentStatus, NoteStatus } from '@mentalspace/database';
import { BadRequestError } from '../utils/errors';

// Note types that require appointments (Business Rule #1)
const APPOINTMENT_REQUIRED_NOTE_TYPES = [
  'Intake Assessment',
  'Progress Note',
  'SOAP',
  'Group Therapy Note',
  'Cancellation Note',
  'Consultation Note',
  'Contact Note'
];

// Note types that require completed Intake (Business Rule #2)
const INTAKE_REQUIRED_NOTE_TYPES = [
  'Progress Note',
  'SOAP',
  'Treatment Plan'
];

// Valid appointment statuses for note creation
const VALID_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'SCHEDULED',
  'CONFIRMED',
  'IN_SESSION',
  'COMPLETED',
  'CHECKED_IN'
];

// Note statuses considered "completed"
const COMPLETED_NOTE_STATUSES: NoteStatus[] = [
  'SIGNED',
  'LOCKED',
  'COSIGNED'
];

export interface ValidateNoteCreationParams {
  noteType: string;
  clientId: string;
  clinicianId: string;
  appointmentId?: string;
  status?: string;
}

export interface ValidateDiagnosisUpdateParams {
  diagnosisId: string;
  noteType: string;
  noteId: string;
  clinicianId: string;
}

/**
 * Business Rule #1: Validate appointment requirement for note creation
 */
export async function validateAppointmentRequirement(
  params: ValidateNoteCreationParams
): Promise<void> {
  const { noteType, clientId, clinicianId, appointmentId, status } = params;

  // Skip appointment requirement for draft notes
  if (status === 'DRAFT') {
    return; // Draft notes can be saved without appointments
  }

  // Check if this note type requires an appointment
  if (!APPOINTMENT_REQUIRED_NOTE_TYPES.includes(noteType)) {
    return; // No appointment required for this note type
  }

  // Verify appointment is provided
  if (!appointmentId) {
    throw new BadRequestError(
      `Note type "${noteType}" requires an appointment. Please select an appointment before creating this note.`
    );
  }

  // Verify appointment exists and is valid
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      clientId: true,
      clinicianId: true,
      status: true,
      appointmentDate: true
    }
  });

  if (!appointment) {
    throw new BadRequestError(
      `The selected appointment does not exist. Please select a valid appointment.`
    );
  }

  // Verify appointment belongs to the same client
  if (appointment.clientId !== clientId) {
    throw new BadRequestError(
      `The selected appointment does not belong to this client. Please select the correct appointment.`
    );
  }

  // Verify appointment belongs to the same clinician
  if (appointment.clinicianId !== clinicianId) {
    throw new BadRequestError(
      `The selected appointment does not belong to this clinician. Please select the correct appointment.`
    );
  }

  // Verify appointment status is valid
  if (!VALID_APPOINTMENT_STATUSES.includes(appointment.status)) {
    throw new BadRequestError(
      `The selected appointment has status "${appointment.status}" which is not valid for creating notes. Valid statuses are: ${VALID_APPOINTMENT_STATUSES.join(', ')}.`
    );
  }
}

/**
 * Business Rule #2: Validate sequential documentation requirement
 */
export async function validateSequentialDocumentation(
  params: ValidateNoteCreationParams
): Promise<void> {
  const { noteType, clientId } = params;

  // Check if this note type requires a completed Intake
  if (!INTAKE_REQUIRED_NOTE_TYPES.includes(noteType)) {
    return; // No Intake requirement for this note type
  }

  // Check if completed Intake exists for this client
  const completedIntake = await prisma.clinicalNote.findFirst({
    where: {
      clientId: clientId,
      noteType: 'Intake Assessment',
      status: {
        in: COMPLETED_NOTE_STATUSES
      }
    },
    select: {
      id: true,
      sessionDate: true,
      status: true
    },
    orderBy: {
      sessionDate: 'desc'
    }
  });

  if (!completedIntake) {
    throw new BadRequestError(
      `Cannot create ${noteType} note without a completed Intake Assessment. Please complete and sign an Intake Assessment first.`
    );
  }
}

/**
 * Business Rule #3: Validate diagnosis can be modified in this note type
 */
export async function validateDiagnosisModification(
  params: ValidateDiagnosisUpdateParams
): Promise<void> {
  const { diagnosisId, noteType, noteId, clinicianId } = params;

  // Only INTAKE and TREATMENT_PLAN notes can modify diagnoses
  const DIAGNOSIS_EDITABLE_NOTE_TYPES = ['Intake Assessment', 'Treatment Plan'];

  if (!DIAGNOSIS_EDITABLE_NOTE_TYPES.includes(noteType)) {
    throw new BadRequestError(
      `Diagnoses can only be created or modified in Intake Assessments or Treatment Plans. In ${noteType} notes, diagnoses are read-only.`
    );
  }

  // Verify diagnosis exists
  const diagnosis = await prisma.diagnosis.findUnique({
    where: { id: diagnosisId },
    select: {
      id: true,
      clientId: true,
      diagnosisNoteId: true,
      createdInNoteType: true
    }
  });

  if (!diagnosis) {
    throw new BadRequestError(`Diagnosis not found.`);
  }

  // Verify the note belongs to the same client as the diagnosis
  const note = await prisma.clinicalNote.findUnique({
    where: { id: noteId },
    select: { clientId: true }
  });

  if (!note || note.clientId !== diagnosis.clientId) {
    throw new BadRequestError(
      `This diagnosis belongs to a different client and cannot be modified in this note.`
    );
  }
}

/**
 * Get available diagnoses for a client (for read-only display in Progress Notes)
 */
export async function getClientActiveDiagnoses(clientId: string) {
  return await prisma.diagnosis.findMany({
    where: {
      clientId: clientId,
      status: 'Active'
    },
    orderBy: [
      { diagnosisType: 'asc' }, // Primary first
      { diagnosisDate: 'desc' }  // Most recent first
    ],
    select: {
      id: true,
      icdCode: true,
      diagnosisDescription: true,
      diagnosisType: true,
      severity: true,
      specifiers: true,
      createdInNoteType: true,
      diagnosisDate: true,
      diagnosedBy: true
    }
  });
}

/**
 * Create diagnosis history entry when diagnosis is modified
 */
export async function createDiagnosisHistory(
  diagnosisId: string,
  changedBy: string,
  changedInNoteId: string,
  changedInNoteType: string,
  changeType: 'CREATED' | 'MODIFIED' | 'STATUS_CHANGE' | 'DELETED',
  oldValues?: any,
  newValues?: any,
  changeReason?: string
): Promise<void> {
  await prisma.diagnosisHistory.create({
    data: {
      diagnosisId,
      changedBy,
      changedInNoteId,
      changedInNoteType,
      changeType,
      oldValues: oldValues || null,
      newValues: newValues || null,
      changeReason: changeReason || null
    }
  });
}

/**
 * Link diagnosis to a clinical note (for billing)
 */
export async function linkDiagnosisToNote(
  noteId: string,
  diagnosisId: string,
  pointerOrder: number = 1
): Promise<void> {
  await prisma.clinicalNoteDiagnosis.create({
    data: {
      noteId,
      diagnosisId,
      pointerOrder
    }
  });
}

/**
 * Get diagnoses linked to a note (for billing)
 */
export async function getNoteDiagnoses(noteId: string) {
  return await prisma.clinicalNoteDiagnosis.findMany({
    where: { noteId },
    include: {
      diagnosis: {
        select: {
          id: true,
          icdCode: true,
          diagnosisDescription: true,
          diagnosisType: true,
          severity: true,
          specifiers: true
        }
      }
    },
    orderBy: {
      pointerOrder: 'asc'
    }
  });
}

/**
 * Validate note creation (combines all business rules)
 */
export async function validateNoteCreation(
  params: ValidateNoteCreationParams
): Promise<void> {
  // Business Rule #1: Appointment requirement
  await validateAppointmentRequirement(params);

  // Business Rule #2: Sequential documentation
  await validateSequentialDocumentation(params);
}

export const ClinicalNotesValidationService = {
  validateNoteCreation,
  validateAppointmentRequirement,
  validateSequentialDocumentation,
  validateDiagnosisModification,
  getClientActiveDiagnoses,
  createDiagnosisHistory,
  linkDiagnosisToNote,
  getNoteDiagnoses
};
