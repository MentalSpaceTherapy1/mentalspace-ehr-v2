import prisma from './database';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger';

export interface SignatureAuthRequest {
  userId: string;
  pin?: string;
  password?: string;
}

export interface CreateSignatureEventRequest {
  noteId: string;
  userId: string;
  signatureType: 'AUTHOR' | 'COSIGN' | 'AMENDMENT';
  authMethod: 'PASSWORD' | 'PIN' | 'BIOMETRIC' | 'MFA';
  ipAddress: string;
  userAgent: string;
  signatureData?: string; // Base64 image if drawn
}

/**
 * Get applicable attestation for a user signing a note
 */
export async function getApplicableAttestation(
  userId: string,
  noteType: string,
  signatureType: 'AUTHOR' | 'COSIGN' | 'AMENDMENT'
) {
  try {
    // Get user details including license jurisdiction
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        licenseState: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Determine role for attestation lookup
    let attestationRole = 'CLINICIAN';
    if (signatureType === 'COSIGN') {
      attestationRole = 'SUPERVISOR';
    } else if (user.role === 'ADMINISTRATOR') {
      attestationRole = 'ADMIN';
    }

    // Get jurisdiction (state license or default to GA)
    const jurisdiction = user.licenseState || 'GA';

    // Try to find specific attestation
    let attestation = await prisma.signatureAttestation.findFirst({
      where: {
        role: attestationRole,
        noteType: noteType,
        jurisdiction: jurisdiction,
        isActive: true,
      },
      orderBy: {
        effectiveDate: 'desc',
      },
    });

    // If not found, try with noteType = 'ALL'
    if (!attestation) {
      attestation = await prisma.signatureAttestation.findFirst({
        where: {
          role: attestationRole,
          noteType: 'ALL',
          jurisdiction: jurisdiction,
          isActive: true,
        },
        orderBy: {
          effectiveDate: 'desc',
        },
      });
    }

    // If still not found, try generic US attestation
    if (!attestation) {
      attestation = await prisma.signatureAttestation.findFirst({
        where: {
          role: attestationRole,
          noteType: 'ALL',
          jurisdiction: 'US',
          isActive: true,
        },
        orderBy: {
          effectiveDate: 'desc',
        },
      });
    }

    if (!attestation) {
      throw new Error('No applicable attestation found');
    }

    return attestation;
  } catch (error) {
    logger.error('Error getting applicable attestation', { error, userId, noteType });
    throw error;
  }
}

/**
 * Verify signature PIN or password
 */
export async function verifySignatureAuth(request: SignatureAuthRequest): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: {
        signaturePin: true,
        signaturePassword: true,
      },
    });

    if (!user) {
      return false;
    }

    // Verify PIN if provided
    if (request.pin) {
      if (!user.signaturePin) {
        throw new Error('Signature PIN not configured');
      }
      return await bcrypt.compare(request.pin, user.signaturePin);
    }

    // Verify password if provided
    if (request.password) {
      if (!user.signaturePassword) {
        throw new Error('Signature password not configured');
      }
      return await bcrypt.compare(request.password, user.signaturePassword);
    }

    return false;
  } catch (error) {
    logger.error('Error verifying signature auth', { error, userId: request.userId });
    throw error;
  }
}

/**
 * Create a signature event record
 */
export async function createSignatureEvent(request: CreateSignatureEventRequest) {
  try {
    // Get applicable attestation
    const note = await prisma.clinicalNote.findUnique({
      where: { id: request.noteId },
      select: { noteType: true },
    });

    if (!note) {
      throw new Error('Note not found');
    }

    const attestation = await getApplicableAttestation(
      request.userId,
      note.noteType,
      request.signatureType
    );

    // Create signature event
    const signatureEvent = await prisma.signatureEvent.create({
      data: {
        noteId: request.noteId,
        userId: request.userId,
        signatureType: request.signatureType,
        attestationId: attestation.id,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        authMethod: request.authMethod,
        signatureData: request.signatureData,
        isValid: true,
      },
      include: {
        attestation: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            credentials: true,
            licenseNumber: true,
          },
        },
      },
    });

    logger.info('Signature event created', {
      signatureEventId: signatureEvent.id,
      noteId: request.noteId,
      userId: request.userId,
      signatureType: request.signatureType,
    });

    return signatureEvent;
  } catch (error) {
    logger.error('Error creating signature event', { error, request });
    throw error;
  }
}

/**
 * Get all signature events for a note
 */
export async function getSignatureEvents(noteId: string) {
  try {
    const events = await prisma.signatureEvent.findMany({
      where: { noteId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            credentials: true,
            licenseNumber: true,
            licenseState: true,
          },
        },
        attestation: true,
      },
      orderBy: {
        signedAt: 'asc',
      },
    });

    return events;
  } catch (error) {
    logger.error('Error getting signature events', { error, noteId });
    throw error;
  }
}

/**
 * Revoke a signature (admin only)
 */
export async function revokeSignature(
  signatureEventId: string,
  revokedBy: string,
  reason: string
) {
  try {
    const signatureEvent = await prisma.signatureEvent.update({
      where: { id: signatureEventId },
      data: {
        isValid: false,
        revokedAt: new Date(),
        revokedBy,
        revokedReason: reason,
      },
    });

    logger.warn('Signature revoked', {
      signatureEventId,
      revokedBy,
      reason,
    });

    return signatureEvent;
  } catch (error) {
    logger.error('Error revoking signature', { error, signatureEventId });
    throw error;
  }
}

/**
 * Set user's signature PIN
 */
export async function setSignaturePin(userId: string, pin: string): Promise<void> {
  try {
    // Validate PIN (4-6 digits)
    if (!/^\d{4,6}$/.test(pin)) {
      throw new Error('PIN must be 4-6 digits');
    }

    const hashedPin = await bcrypt.hash(pin, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { signaturePin: hashedPin },
    });

    logger.info('Signature PIN set', { userId });
  } catch (error) {
    logger.error('Error setting signature PIN', { error, userId });
    throw error;
  }
}

/**
 * Set user's signature password
 */
export async function setSignaturePassword(userId: string, password: string): Promise<void> {
  try {
    // Validate password (min 8 characters)
    if (password.length < 8) {
      throw new Error('Signature password must be at least 8 characters');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { signaturePassword: hashedPassword },
    });

    logger.info('Signature password set', { userId });
  } catch (error) {
    logger.error('Error setting signature password', { error, userId });
    throw error;
  }
}
