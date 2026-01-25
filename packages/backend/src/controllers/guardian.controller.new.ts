import logger, { logControllerError } from '../utils/logger';
import { Request, Response } from 'express';
import { z } from 'zod';
import { AppointmentStatus } from '@mentalspace/database';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';

// Type for filtered client with minimal fields
interface FilteredClientProfile {
  id: string;
  firstName: string;
  lastName: string;
  medicalRecordNumber: string;
  dateOfBirth: Date | null;
  email: string | null;
  phoneNumber: string | null;
}
// Phase 3.2: Removed direct prisma import - using service methods instead
import * as guardianService from '../services/guardian.service';
import guardianRelationshipService from '../services/guardian-relationship.service';
import documentUploadService from '../services/document-upload.service';
import auditLogService from '../services/audit-log.service';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound, sendServerError, sendValidationError } from '../utils/apiResponse';

// Validation schemas
const createRelationshipSchema = z.object({
  minorId: z.string().uuid('Invalid minor ID'),
  relationshipType: z.enum(['PARENT', 'LEGAL_GUARDIAN', 'HEALTHCARE_PROXY']),
  accessLevel: z.enum(['FULL', 'LIMITED', 'VIEW_ONLY']),
  canScheduleAppointments: z.boolean().optional(),
  canViewRecords: z.boolean().optional(),
  canCommunicateWithClinician: z.boolean().optional(),
  notes: z.string().optional(),
});

const updateRelationshipSchema = z.object({
  relationshipType: z.enum(['PARENT', 'LEGAL_GUARDIAN', 'HEALTHCARE_PROXY']).optional(),
  accessLevel: z.enum(['FULL', 'LIMITED', 'VIEW_ONLY']).optional(),
  canScheduleAppointments: z.boolean().optional(),
  canViewRecords: z.boolean().optional(),
  canCommunicateWithClinician: z.boolean().optional(),
  endDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const verifyRelationshipSchema = z.object({
  notes: z.string().optional(),
});

const rejectRelationshipSchema = z.object({
  reason: z.string().min(10, 'Rejection reason must be at least 10 characters'),
});

const revokeRelationshipSchema = z.object({
  reason: z.string().min(10, 'Revocation reason must be at least 10 characters'),
});

// ============================================================================
// GUARDIAN ENDPOINTS (for guardians to manage their access)
// ============================================================================

/**
 * Request guardian access to a minor
 */
export const requestGuardianAccess = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const validatedData = createRelationshipSchema.parse(req.body);

    const relationship = await guardianRelationshipService.createGuardianRelationship({
      ...validatedData,
      guardianId: userId,
    });

    return sendCreated(res, relationship, 'Guardian access request submitted successfully. Pending admin verification.');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error.errors.map(e => ({ path: e.path.join('.'), message: e.message })));
    }

    const errorId = logControllerError('Request guardian access', error, {
      userId: req.user?.userId,
    });

    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to request guardian access', errorId);
  }
};

/**
 * Get all minors for the current guardian
 */
export const getMyMinors = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const minors = await guardianRelationshipService.getMinorsByGuardian(userId);

    return sendSuccess(res, minors);
  } catch (error) {
    const errorId = logControllerError('Get my minors', error, {
      userId: req.user?.userId,
    });

    return sendServerError(res, 'Failed to retrieve minors', errorId);
  }
};

/**
 * Get minor profile (if guardian has permission)
 */
export const getMinorProfile = async (req: Request, res: Response) => {
  try {
    const { minorId } = req.params;

    // Phase 3.2: Use service method instead of direct prisma call
    const client = await guardianService.getMinorProfileById(minorId);

    if (!client) {
      return sendNotFound(res, 'Client');
    }

    // Filter based on access level from guardian context
    const guardianContext = req.guardianContext;

    if (guardianContext?.accessLevel === 'VIEW_ONLY') {
      // Return limited info for view-only access
      const limitedProfile: FilteredClientProfile = {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        medicalRecordNumber: client.medicalRecordNumber,
        dateOfBirth: client.dateOfBirth,
        email: client.email,
        phoneNumber: client.primaryPhone,
      };
      return sendSuccess(res, limitedProfile);
    }

    return sendSuccess(res, client);
  } catch (error) {
    const errorId = logControllerError('Get minor profile', error, {
      userId: req.user?.userId,
    });

    return sendServerError(res, 'Failed to retrieve minor profile', errorId);
  }
};

/**
 * Get minor's appointments
 */
export const getMinorAppointments = async (req: Request, res: Response) => {
  try {
    const { minorId } = req.params;
    const { status, startDate, endDate } = req.query;

    // Phase 3.2: Use service method instead of direct prisma call
    const appointments = await guardianService.getMinorAppointments({
      minorId,
      status: status as AppointmentStatus | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    return sendSuccess(res, appointments);
  } catch (error) {
    const errorId = logControllerError('Get minor appointments', error, {
      userId: req.user?.userId,
    });

    return sendServerError(res, 'Failed to retrieve appointments', errorId);
  }
};

/**
 * Schedule appointment for minor (if permission granted)
 */
export const scheduleMinorAppointment = async (req: Request, res: Response) => {
  try {
    const { minorId } = req.params;
    const { clinicianId, appointmentTypeId, startTime, notes } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    // Phase 3.2: Use service method instead of direct prisma call
    // Create appointment
    const startDate = new Date(startTime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour duration
    const appointment = await guardianService.createMinorAppointment({
      clientId: minorId,
      clinicianId,
      appointmentTypeId,
      appointmentDate: startDate,
      startTime: startDate.toTimeString().slice(0, 5), // HH:MM format
      endTime: endDate.toTimeString().slice(0, 5),
      duration: 60, // Default 60 minutes
      appointmentType: 'INDIVIDUAL_THERAPY',
      serviceLocation: 'IN_PERSON',
      status: 'SCHEDULED',
      statusUpdatedBy: userId,
      createdBy: userId,
      lastModifiedBy: userId,
      appointmentNotes: notes || `Scheduled by guardian: ${userId}`,
    });

    return sendCreated(res, appointment, 'Appointment scheduled successfully');
  } catch (error) {
    const errorId = logControllerError('Schedule minor appointment', error, {
      userId: req.user?.userId,
    });

    return sendServerError(res, 'Failed to schedule appointment', errorId);
  }
};

/**
 * Get messages for minor (if permission granted)
 */
export const getMinorMessages = async (req: Request, res: Response) => {
  try {
    const { minorId } = req.params;

    // This would integrate with your messaging system
    // For now, return a placeholder
    return sendSuccess(res, [], 'Messaging integration pending');
  } catch (error) {
    const errorId = logControllerError('Get minor messages', error, {
      userId: req.user?.userId,
    });

    return sendServerError(res, 'Failed to retrieve messages', errorId);
  }
};

/**
 * Send message to clinician on behalf of minor
 */
export const sendMinorMessage = async (req: Request, res: Response) => {
  try {
    const { minorId } = req.params;
    const { message, clinicianId } = req.body;

    // This would integrate with your messaging system
    // For now, return a placeholder
    return sendCreated(res, {
      minorId,
      message,
      clinicianId,
      sentBy: req.user?.userId,
    }, 'Message sent successfully (placeholder)');
  } catch (error) {
    const errorId = logControllerError('Send minor message', error, {
      userId: req.user?.userId,
    });

    return sendServerError(res, 'Failed to send message', errorId);
  }
};

/**
 * Upload verification document for relationship
 */
export const uploadVerificationDocument = async (req: Request, res: Response) => {
  try {
    const { relationshipId } = req.params;
    const userId = req.user?.userId;
    const file = req.file;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    if (!file) {
      return sendBadRequest(res, 'No file uploaded');
    }

    const documentMetadata = await documentUploadService.uploadDocument({
      relationshipId,
      file: {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
      uploadedBy: userId,
      documentType: req.body.documentType || 'OTHER',
    });

    return sendCreated(res, documentMetadata, 'Document uploaded successfully');
  } catch (error) {
    const errorId = logControllerError('Upload verification document', error, {
      userId: req.user?.userId,
    });

    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to upload document', errorId);
  }
};

// ============================================================================
// ADMIN ENDPOINTS (for admins to verify/manage relationships)
// ============================================================================

/**
 * Get pending verification requests
 */
export const getPendingVerifications = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await guardianRelationshipService.getGuardianRelationships({
      verificationStatus: 'PENDING',
      page,
      limit,
    });

    return sendSuccess(res, { relationships: result.relationships, pagination: result.pagination });
  } catch (error) {
    const errorId = logControllerError('Get pending verifications', error, {
      userId: req.user?.userId,
    });

    return sendServerError(res, 'Failed to retrieve pending verifications', errorId);
  }
};

/**
 * Get all guardian relationships (admin)
 */
export const getAllRelationships = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const { verificationStatus, guardianId, minorId } = req.query;

    const result = await guardianRelationshipService.getGuardianRelationships({
      verificationStatus: verificationStatus as 'PENDING' | 'VERIFIED' | 'REJECTED' | undefined,
      guardianId: guardianId as string | undefined,
      minorId: minorId as string | undefined,
      page,
      limit,
    });

    return sendSuccess(res, { relationships: result.relationships, pagination: result.pagination });
  } catch (error) {
    const errorId = logControllerError('Get all relationships', error, {
      userId: req.user?.userId,
    });

    return sendServerError(res, 'Failed to retrieve relationships', errorId);
  }
};

/**
 * Verify guardian relationship
 */
export const verifyRelationship = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.userId;

    if (!adminId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const validatedData = verifyRelationshipSchema.parse(req.body);

    const relationship = await guardianRelationshipService.verifyRelationship(
      id,
      adminId,
      validatedData.notes
    );

    // Log the verification
    await auditLogService.logRelationshipVerification(adminId, id, 'VERIFY', {
      guardianId: relationship.guardianId,
      minorId: relationship.minorId,
    });

    return sendSuccess(res, relationship, 'Guardian relationship verified successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error.errors.map(e => ({ path: e.path.join('.'), message: e.message })));
    }

    const errorId = logControllerError('Verify relationship', error, {
      userId: req.user?.userId,
    });

    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to verify relationship', errorId);
  }
};

/**
 * Reject guardian relationship
 */
export const rejectRelationship = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.userId;

    if (!adminId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const validatedData = rejectRelationshipSchema.parse(req.body);

    const relationship = await guardianRelationshipService.rejectRelationship(
      id,
      adminId,
      validatedData.reason
    );

    // Log the rejection
    await auditLogService.logRelationshipVerification(adminId, id, 'REJECT', {
      guardianId: relationship.guardianId,
      minorId: relationship.minorId,
      reason: validatedData.reason,
    });

    return sendSuccess(res, relationship, 'Guardian relationship rejected');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error.errors.map(e => ({ path: e.path.join('.'), message: e.message })));
    }

    const errorId = logControllerError('Reject relationship', error, {
      userId: req.user?.userId,
    });

    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to reject relationship', errorId);
  }
};

/**
 * Revoke guardian relationship
 */
export const revokeRelationship = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.userId;

    if (!adminId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const validatedData = revokeRelationshipSchema.parse(req.body);

    const relationship = await guardianRelationshipService.revokeRelationship(
      id,
      validatedData.reason
    );

    // Log the revocation
    await auditLogService.logRelationshipVerification(adminId, id, 'REVOKE', {
      guardianId: relationship.guardianId,
      minorId: relationship.minorId,
      reason: validatedData.reason,
    });

    return sendSuccess(res, relationship, 'Guardian relationship revoked');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error.errors.map(e => ({ path: e.path.join('.'), message: e.message })));
    }

    const errorId = logControllerError('Revoke relationship', error, {
      userId: req.user?.userId,
    });

    return sendServerError(res, error instanceof Error ? getErrorMessage(error) : 'Failed to revoke relationship', errorId);
  }
};

/**
 * Update guardian relationship
 */
export const updateGuardianRelationship = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateRelationshipSchema.parse(req.body);

    const relationship = await guardianRelationshipService.updateRelationship(id, {
      ...validatedData,
      endDate: validatedData.endDate ? new Date(validatedData.endDate) : undefined,
    });

    return sendSuccess(res, relationship, 'Guardian relationship updated successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error.errors.map(e => ({ path: e.path.join('.'), message: e.message })));
    }

    const errorId = logControllerError('Update guardian relationship', error, {
      userId: req.user?.userId,
    });

    return sendServerError(res, 'Failed to update relationship', errorId);
  }
};

/**
 * Get relationship by ID
 */
export const getRelationshipById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const relationship = await guardianRelationshipService.getRelationshipById(id);

    if (!relationship) {
      return sendNotFound(res, 'Guardian relationship');
    }

    return sendSuccess(res, relationship);
  } catch (error) {
    const errorId = logControllerError('Get relationship by ID', error, {
      userId: req.user?.userId,
    });

    return sendServerError(res, 'Failed to retrieve relationship', errorId);
  }
};

/**
 * Get document presigned URL for viewing
 */
export const getDocumentUrl = async (req: Request, res: Response) => {
  try {
    const { storageLocation } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'Authentication required');
    }

    if (!storageLocation) {
      return sendBadRequest(res, 'Storage location required');
    }

    const url = await documentUploadService.getDocumentUrl(storageLocation, userId);

    return sendSuccess(res, { url });
  } catch (error) {
    const errorId = logControllerError('Get document URL', error, {
      userId: req.user?.userId,
    });

    return sendServerError(res, 'Failed to generate document URL', errorId);
  }
};

/**
 * Get audit log for guardian access
 */
export const getGuardianAuditLog = async (req: Request, res: Response) => {
  try {
    const { minorId, guardianId } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await auditLogService.getAuditLogs({
      resource: 'GuardianAccess',
      resourceId: minorId as string,
      userId: guardianId as string,
      page,
      limit,
    });

    return sendSuccess(res, { logs: result.logs, pagination: result.pagination });
  } catch (error) {
    const errorId = logControllerError('Get guardian audit log', error, {
      userId: req.user?.userId,
    });

    return sendServerError(res, 'Failed to retrieve audit log', errorId);
  }
};

// ============================================================================
// LEGACY GUARDIAN ENDPOINTS (keep for backward compatibility)
// ============================================================================

export { getClientGuardians, getGuardianById, createGuardian, updateGuardian, deleteGuardian } from './guardian.controller';
