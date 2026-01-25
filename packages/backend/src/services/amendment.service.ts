import prisma from './database';
import logger from '../utils/logger';
import { Prisma } from '@prisma/client';

// ============================================================================
// HELPER METHODS FOR CONTROLLER (Phase 3.2)
// ============================================================================

/**
 * Find user by ID (basic lookup)
 */
export async function findUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
}

/**
 * Get user roles by ID
 */
export async function getUserRoles(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  });
}

/**
 * Find clinical note for access check
 */
export async function findNoteForAccessCheck(noteId: string) {
  return prisma.clinicalNote.findUnique({
    where: { id: noteId },
    select: {
      id: true,
      clinicianId: true,
      cosignedBy: true,
    },
  });
}

// ============================================================================
// TYPES
// ============================================================================

export interface CreateAmendmentRequest {
  noteId: string;
  reason: string;
  amendedBy: string;
  fieldsChanged: string[];
  changeSummary: string;
  ipAddress: string;
  userAgent: string;
}

export interface AmendNoteDataRequest extends CreateAmendmentRequest {
  newNoteData: Record<string, any>;
}

/**
 * Create a version snapshot of a clinical note
 */
export async function createNoteVersion(
  noteId: string,
  createdBy: string,
  versionType: 'ORIGINAL' | 'EDIT' | 'AMENDMENT' | 'REVISION'
) {
  try {
    // Get current note data
    const note = await prisma.clinicalNote.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      throw new Error('Clinical note not found');
    }

    // Get current version count
    const versionCount = await prisma.noteVersion.count({
      where: { noteId },
    });

    // Create version snapshot
    const version = await prisma.noteVersion.create({
      data: {
        noteId,
        versionNumber: versionCount + 1,
        createdBy,
        versionType,
        noteData: note as unknown as Prisma.InputJsonValue,
      },
    });

    logger.info('Note version created', {
      versionId: version.id,
      noteId,
      versionNumber: version.versionNumber,
      versionType,
    });

    return version;
  } catch (error) {
    logger.error('Error creating note version', { error, noteId });
    throw error;
  }
}

/**
 * Create an amendment record
 */
export async function createAmendment(request: CreateAmendmentRequest) {
  try {
    // Get current amendment count for this note
    const amendmentCount = await prisma.noteAmendment.count({
      where: { noteId: request.noteId },
    });

    // Create previous version snapshot
    const previousVersion = await createNoteVersion(
      request.noteId,
      request.amendedBy,
      'AMENDMENT'
    );

    // Create amendment record
    const amendment = await prisma.noteAmendment.create({
      data: {
        noteId: request.noteId,
        amendmentNumber: amendmentCount + 1,
        reason: request.reason,
        amendedBy: request.amendedBy,
        fieldsChanged: request.fieldsChanged,
        changeSummary: request.changeSummary,
        previousVersionId: previousVersion.id,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        status: 'PENDING',
        requiresSignature: true,
      },
      include: {
        amendingUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            credentials: true,
          },
        },
        previousVersion: true,
      },
    });

    logger.info('Amendment created', {
      amendmentId: amendment.id,
      noteId: request.noteId,
      amendmentNumber: amendment.amendmentNumber,
    });

    return amendment;
  } catch (error) {
    logger.error('Error creating amendment', { error, request });
    throw error;
  }
}

/**
 * Amend a clinical note with new data
 */
export async function amendNote(request: AmendNoteDataRequest) {
  try {
    // Create amendment record and previous version
    const amendment = await createAmendment(request);

    // Update the clinical note with new data
    const updatedNote = await prisma.clinicalNote.update({
      where: { id: request.noteId },
      data: request.newNoteData,
    });

    // Create new version snapshot
    const newVersion = await createNoteVersion(
      request.noteId,
      request.amendedBy,
      'AMENDMENT'
    );

    // Link new version to amendment
    await prisma.noteAmendment.update({
      where: { id: amendment.id },
      data: { newVersionId: newVersion.id },
    });

    logger.info('Note amended successfully', {
      amendmentId: amendment.id,
      noteId: request.noteId,
      fieldsChanged: request.fieldsChanged,
    });

    return {
      amendment,
      updatedNote,
      newVersion,
    };
  } catch (error) {
    logger.error('Error amending note', { error, request });
    throw error;
  }
}

/**
 * Sign an amendment (creates signature event)
 */
export async function signAmendment(
  amendmentId: string,
  userId: string,
  authMethod: 'PASSWORD' | 'PIN',
  ipAddress: string,
  userAgent: string
) {
  try {
    const amendment = await prisma.noteAmendment.findUnique({
      where: { id: amendmentId },
      include: {
        note: {
          select: { noteType: true },
        },
      },
    });

    if (!amendment) {
      throw new Error('Amendment not found');
    }

    if (amendment.status === 'SIGNED') {
      throw new Error('Amendment is already signed');
    }

    // Get applicable attestation
    const { getApplicableAttestation } = await import('./signature.service');
    const attestation = await getApplicableAttestation(
      userId,
      amendment.note.noteType,
      'AMENDMENT'
    );

    // Create signature event
    const signatureEvent = await prisma.signatureEvent.create({
      data: {
        noteId: amendment.noteId,
        userId,
        signatureType: 'AMENDMENT',
        attestationId: attestation.id,
        ipAddress,
        userAgent,
        authMethod,
        amendmentId,
        isValid: true,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            credentials: true,
          },
        },
        attestation: true,
      },
    });

    // Update amendment status
    await prisma.noteAmendment.update({
      where: { id: amendmentId },
      data: { status: 'SIGNED' },
    });

    logger.info('Amendment signed', {
      amendmentId,
      signatureEventId: signatureEvent.id,
      userId,
    });

    return signatureEvent;
  } catch (error) {
    logger.error('Error signing amendment', { error, amendmentId, userId });
    throw error;
  }
}

/**
 * Get all amendments for a note
 */
export async function getAmendmentsForNote(noteId: string) {
  try {
    const amendments = await prisma.noteAmendment.findMany({
      where: { noteId },
      include: {
        amendingUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            credentials: true,
          },
        },
        previousVersion: true,
        newVersion: true,
        signatureEvent: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                credentials: true,
              },
            },
            attestation: true,
          },
        },
      },
      orderBy: { amendmentNumber: 'asc' },
    });

    return amendments;
  } catch (error) {
    logger.error('Error getting amendments', { error, noteId });
    throw error;
  }
}

/**
 * Get version history for a note
 */
export async function getVersionHistory(noteId: string) {
  try {
    const versions = await prisma.noteVersion.findMany({
      where: { noteId },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            credentials: true,
          },
        },
      },
      orderBy: { versionNumber: 'asc' },
    });

    return versions;
  } catch (error) {
    logger.error('Error getting version history', { error, noteId });
    throw error;
  }
}

/**
 * Compare two versions of a note
 */
export async function compareVersions(versionId1: string, versionId2: string) {
  try {
    const [version1, version2] = await Promise.all([
      prisma.noteVersion.findUnique({ where: { id: versionId1 } }),
      prisma.noteVersion.findUnique({ where: { id: versionId2 } }),
    ]);

    if (!version1 || !version2) {
      throw new Error('One or both versions not found');
    }

    // Simple field-by-field comparison
    const noteData1 = version1.noteData as Record<string, any>;
    const noteData2 = version2.noteData as Record<string, any>;

    const differences: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }> = [];

    // Get all unique keys from both versions
    const allKeys = new Set([
      ...Object.keys(noteData1),
      ...Object.keys(noteData2),
    ]);

    for (const key of allKeys) {
      const value1 = noteData1[key];
      const value2 = noteData2[key];

      if (JSON.stringify(value1) !== JSON.stringify(value2)) {
        differences.push({
          field: key,
          oldValue: value1,
          newValue: value2,
        });
      }
    }

    return {
      version1,
      version2,
      differences,
      changedFieldsCount: differences.length,
    };
  } catch (error) {
    logger.error('Error comparing versions', { error, versionId1, versionId2 });
    throw error;
  }
}
