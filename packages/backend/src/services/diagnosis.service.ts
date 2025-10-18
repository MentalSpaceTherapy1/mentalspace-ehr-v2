/**
 * Diagnosis Service
 *
 * Handles CRUD operations for diagnoses with Clinical Notes Business Rules enforcement:
 * - Diagnoses can only be created/modified in INTAKE or TREATMENT_PLAN notes
 * - Tracks diagnosis origin and modification history
 * - Provides read-only access for other note types
 */

import { PrismaClient } from '@mentalspace/database';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { createDiagnosisHistory } from './clinical-notes-validation.service';

const prisma = new PrismaClient();

export interface CreateDiagnosisDto {
  clientId: string;
  icdCode: string;
  diagnosisDescription: string;
  diagnosisType?: string; // 'Primary', 'Secondary', 'Tertiary'
  severity?: string; // 'Mild', 'Moderate', 'Severe'
  specifiers?: string;
  onsetDate?: Date;
  notes?: string;
  diagnosedBy: string; // User ID
  diagnosisNoteId: string; // Clinical Note where diagnosis was created
  createdInNoteType: string; // 'INTAKE' or 'TREATMENT_PLAN'
}

export interface UpdateDiagnosisDto {
  icdCode?: string;
  diagnosisDescription?: string;
  diagnosisType?: string;
  severity?: string;
  specifiers?: string;
  onsetDate?: Date;
  resolvedDate?: Date;
  status?: string; // 'Active', 'Inactive', 'Resolved'
  notes?: string;
  lastUpdatedNoteId: string; // Clinical Note where diagnosis was updated
  lastUpdatedInNoteType: string; // Note type
  updatedBy: string; // User ID for audit trail
  changeReason?: string; // Reason for the change
}

/**
 * Create a new diagnosis (only from INTAKE or TREATMENT_PLAN notes)
 */
export async function createDiagnosis(data: CreateDiagnosisDto) {
  // Validate note type
  if (!['INTAKE', 'TREATMENT_PLAN'].includes(data.createdInNoteType)) {
    throw new BadRequestError(
      `Diagnoses can only be created in Intake Assessments or Treatment Plans. Cannot create diagnosis in ${data.createdInNoteType} note.`
    );
  }

  // Verify the note exists and belongs to the client
  const note = await prisma.clinicalNote.findUnique({
    where: { id: data.diagnosisNoteId },
    select: { clientId: true, noteType: true }
  });

  if (!note) {
    throw new NotFoundError('Clinical note not found');
  }

  if (note.clientId !== data.clientId) {
    throw new BadRequestError('Clinical note does not belong to this client');
  }

  if (note.noteType !== data.createdInNoteType) {
    throw new BadRequestError(
      `Note type mismatch: expected ${data.createdInNoteType}, got ${note.noteType}`
    );
  }

  // Create the diagnosis
  const diagnosis = await prisma.diagnosis.create({
    data: {
      clientId: data.clientId,
      icdCode: data.icdCode,
      diagnosisDescription: data.diagnosisDescription,
      diagnosisType: data.diagnosisType || 'Primary',
      severity: data.severity,
      specifiers: data.specifiers,
      onsetDate: data.onsetDate,
      status: 'Active',
      notes: data.notes,
      diagnosedBy: data.diagnosedBy,
      diagnosisDate: new Date(),
      // Business Rule tracking fields
      diagnosisNoteId: data.diagnosisNoteId,
      createdInNoteType: data.createdInNoteType,
      lastUpdatedNoteId: data.diagnosisNoteId,
      lastUpdatedInNoteType: data.createdInNoteType
    }
  });

  // Create history entry
  await createDiagnosisHistory(
    diagnosis.id,
    data.diagnosedBy,
    data.diagnosisNoteId,
    data.createdInNoteType,
    'CREATED',
    null,
    {
      icdCode: diagnosis.icdCode,
      diagnosisDescription: diagnosis.diagnosisDescription,
      diagnosisType: diagnosis.diagnosisType,
      severity: diagnosis.severity,
      status: diagnosis.status
    },
    'Initial diagnosis'
  );

  return diagnosis;
}

/**
 * Update an existing diagnosis (only from INTAKE or TREATMENT_PLAN notes)
 */
export async function updateDiagnosis(
  diagnosisId: string,
  data: UpdateDiagnosisDto
) {
  // Validate note type
  if (!['INTAKE', 'TREATMENT_PLAN'].includes(data.lastUpdatedInNoteType)) {
    throw new BadRequestError(
      `Diagnoses can only be modified in Intake Assessments or Treatment Plans. Cannot modify diagnosis in ${data.lastUpdatedInNoteType} note.`
    );
  }

  // Get existing diagnosis
  const existingDiagnosis = await prisma.diagnosis.findUnique({
    where: { id: diagnosisId }
  });

  if (!existingDiagnosis) {
    throw new NotFoundError('Diagnosis not found');
  }

  // Verify the note exists
  const note = await prisma.clinicalNote.findUnique({
    where: { id: data.lastUpdatedNoteId },
    select: { clientId: true, noteType: true }
  });

  if (!note) {
    throw new NotFoundError('Clinical note not found');
  }

  if (note.clientId !== existingDiagnosis.clientId) {
    throw new BadRequestError('Clinical note does not belong to the same client as the diagnosis');
  }

  // Prepare old values for history
  const oldValues = {
    icdCode: existingDiagnosis.icdCode,
    diagnosisDescription: existingDiagnosis.diagnosisDescription,
    diagnosisType: existingDiagnosis.diagnosisType,
    severity: existingDiagnosis.severity,
    specifiers: existingDiagnosis.specifiers,
    status: existingDiagnosis.status,
    onsetDate: existingDiagnosis.onsetDate,
    resolvedDate: existingDiagnosis.resolvedDate
  };

  // Update the diagnosis
  const updatedDiagnosis = await prisma.diagnosis.update({
    where: { id: diagnosisId },
    data: {
      ...(data.icdCode && { icdCode: data.icdCode }),
      ...(data.diagnosisDescription && { diagnosisDescription: data.diagnosisDescription }),
      ...(data.diagnosisType && { diagnosisType: data.diagnosisType }),
      ...(data.severity && { severity: data.severity }),
      ...(data.specifiers !== undefined && { specifiers: data.specifiers }),
      ...(data.onsetDate && { onsetDate: data.onsetDate }),
      ...(data.resolvedDate !== undefined && { resolvedDate: data.resolvedDate }),
      ...(data.status && { status: data.status }),
      ...(data.notes !== undefined && { notes: data.notes }),
      // Update tracking fields
      lastUpdatedNoteId: data.lastUpdatedNoteId,
      lastUpdatedInNoteType: data.lastUpdatedInNoteType
    }
  });

  // Prepare new values for history
  const newValues = {
    icdCode: updatedDiagnosis.icdCode,
    diagnosisDescription: updatedDiagnosis.diagnosisDescription,
    diagnosisType: updatedDiagnosis.diagnosisType,
    severity: updatedDiagnosis.severity,
    specifiers: updatedDiagnosis.specifiers,
    status: updatedDiagnosis.status,
    onsetDate: updatedDiagnosis.onsetDate,
    resolvedDate: updatedDiagnosis.resolvedDate
  };

  // Determine change type
  const changeType = data.status !== existingDiagnosis.status ? 'STATUS_CHANGE' : 'MODIFIED';

  // Create history entry
  await createDiagnosisHistory(
    diagnosisId,
    data.updatedBy,
    data.lastUpdatedNoteId,
    data.lastUpdatedInNoteType,
    changeType,
    oldValues,
    newValues,
    data.changeReason
  );

  return updatedDiagnosis;
}

/**
 * Get diagnosis by ID
 */
export async function getDiagnosisById(diagnosisId: string) {
  const diagnosis = await prisma.diagnosis.findUnique({
    where: { id: diagnosisId },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          medicalRecordNumber: true
        }
      },
      diagnosisNote: {
        select: {
          id: true,
          noteType: true,
          sessionDate: true
        }
      },
      lastUpdatedNote: {
        select: {
          id: true,
          noteType: true,
          sessionDate: true
        }
      }
    }
  });

  if (!diagnosis) {
    throw new NotFoundError('Diagnosis not found');
  }

  return diagnosis;
}

/**
 * Get all diagnoses for a client
 */
export async function getClientDiagnoses(
  clientId: string,
  activeOnly: boolean = false
) {
  const where: any = { clientId };

  if (activeOnly) {
    where.status = 'Active';
  }

  return await prisma.diagnosis.findMany({
    where,
    orderBy: [
      { diagnosisType: 'asc' }, // Primary, Secondary, Tertiary
      { diagnosisDate: 'desc' }  // Most recent first
    ],
    include: {
      diagnosisNote: {
        select: {
          id: true,
          noteType: true,
          sessionDate: true
        }
      },
      lastUpdatedNote: {
        select: {
          id: true,
          noteType: true,
          sessionDate: true
        }
      }
    }
  });
}

/**
 * Get diagnosis history (audit trail)
 */
export async function getDiagnosisHistory(diagnosisId: string) {
  return await prisma.diagnosisHistory.findMany({
    where: { diagnosisId },
    orderBy: { changedAt: 'desc' },
    include: {
      changedByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true
        }
      },
      changedInNote: {
        select: {
          id: true,
          noteType: true,
          sessionDate: true
        }
      }
    }
  });
}

/**
 * Delete a diagnosis (soft delete by changing status)
 */
export async function deleteDiagnosis(
  diagnosisId: string,
  deletedBy: string,
  noteId: string,
  noteType: string,
  reason?: string
) {
  const diagnosis = await getDiagnosisById(diagnosisId);

  const oldValues = {
    status: diagnosis.status
  };

  const updatedDiagnosis = await prisma.diagnosis.update({
    where: { id: diagnosisId },
    data: {
      status: 'Inactive',
      lastUpdatedNoteId: noteId,
      lastUpdatedInNoteType: noteType
    }
  });

  // Create history entry
  await createDiagnosisHistory(
    diagnosisId,
    deletedBy,
    noteId,
    noteType,
    'DELETED',
    oldValues,
    { status: 'Inactive' },
    reason || 'Diagnosis deactivated'
  );

  return updatedDiagnosis;
}

/**
 * Get diagnosis statistics for a client
 */
export async function getClientDiagnosisStats(clientId: string) {
  const [total, active, resolved] = await Promise.all([
    prisma.diagnosis.count({ where: { clientId } }),
    prisma.diagnosis.count({ where: { clientId, status: 'Active' } }),
    prisma.diagnosis.count({ where: { clientId, status: 'Resolved' } })
  ]);

  // Count by type
  const allDiagnoses = await prisma.diagnosis.findMany({
    where: { clientId, status: 'Active' },
    select: { diagnosisType: true }
  });

  const byType = {
    Primary: allDiagnoses.filter(d => d.diagnosisType === 'Primary').length,
    Secondary: allDiagnoses.filter(d => d.diagnosisType === 'Secondary').length,
    Tertiary: allDiagnoses.filter(d => d.diagnosisType === 'Tertiary').length
  };

  return {
    total,
    active,
    resolved,
    byType
  };
}

export const DiagnosisService = {
  createDiagnosis,
  updateDiagnosis,
  getDiagnosisById,
  getClientDiagnoses,
  getDiagnosisHistory,
  deleteDiagnosis,
  getClientDiagnosisStats
};
