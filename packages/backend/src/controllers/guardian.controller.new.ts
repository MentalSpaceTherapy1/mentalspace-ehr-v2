import logger, { logControllerError } from '../utils/logger';
import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../services/database';
import guardianRelationshipService from '../services/guardian-relationship.service';
import documentUploadService from '../services/document-upload.service';
import auditLogService from '../services/audit-log.service';

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
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const validatedData = createRelationshipSchema.parse(req.body);

    const relationship = await guardianRelationshipService.createGuardianRelationship({
      ...validatedData,
      guardianId: userId,
    });

    res.status(201).json({
      success: true,
      message: 'Guardian access request submitted successfully. Pending admin verification.',
      data: relationship,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors,
      });
    }

    const errorId = logControllerError('Request guardian access', error, {
      userId: (req as any).user?.userId,
    });

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to request guardian access',
      errorId,
    });
  }
};

/**
 * Get all minors for the current guardian
 */
export const getMyMinors = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const minors = await guardianRelationshipService.getMinorsByGuardian(userId);

    res.status(200).json({
      success: true,
      data: minors,
    });
  } catch (error) {
    const errorId = logControllerError('Get my minors', error, {
      userId: (req as any).user?.userId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve minors',
      errorId,
    });
  }
};

/**
 * Get minor profile (if guardian has permission)
 */
export const getMinorProfile = async (req: Request, res: Response) => {
  try {
    const { minorId } = req.params;

    const client = await prisma.client.findUnique({
      where: { id: minorId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        medicalRecordNumber: true,
        dateOfBirth: true,
        email: true,
        primaryPhone: true,
        addressCity: true,
        addressState: true,
        addressZipCode: true,
        // Based on accessLevel, we might filter what's returned
      },
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }

    // Filter based on access level from guardian context
    const guardianContext = req.guardianContext;
    let filteredClient = client;

    if (guardianContext?.accessLevel === 'VIEW_ONLY') {
      // Return limited info for view-only access
      filteredClient = {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        medicalRecordNumber: client.medicalRecordNumber,
        dateOfBirth: client.dateOfBirth,
        email: client.email,
        phoneNumber: client.primaryPhone,
      } as any;
    }

    res.status(200).json({
      success: true,
      data: filteredClient,
    });
  } catch (error) {
    const errorId = logControllerError('Get minor profile', error, {
      userId: (req as any).user?.userId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve minor profile',
      errorId,
    });
  }
};

/**
 * Get minor's appointments
 */
export const getMinorAppointments = async (req: Request, res: Response) => {
  try {
    const { minorId } = req.params;
    const { status, startDate, endDate } = req.query;

    const where: any = { clientId: minorId };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate as string);
      if (endDate) where.startTime.lte = new Date(endDate as string);
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialties: true,
          },
        },
        appointmentTypeObj: {
          select: {
            id: true,
            typeName: true,
            defaultDuration: true,
          },
        },
      },
      orderBy: { appointmentDate: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    const errorId = logControllerError('Get minor appointments', error, {
      userId: (req as any).user?.userId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve appointments',
      errorId,
    });
  }
};

/**
 * Schedule appointment for minor (if permission granted)
 */
export const scheduleMinorAppointment = async (req: Request, res: Response) => {
  try {
    const { minorId } = req.params;
    const { clinicianId, appointmentTypeId, startTime, notes } = req.body;

    // Create appointment
    const startDate = new Date(startTime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour duration
    const appointment = await prisma.appointment.create({
      data: {
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
        statusUpdatedBy: (req as any).user?.userId || 'SYSTEM',
        createdBy: (req as any).user?.userId,
        lastModifiedBy: (req as any).user?.userId || 'SYSTEM',
        appointmentNotes: notes || `Scheduled by guardian: ${(req as any).user?.userId}`,
      },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        appointmentTypeObj: {
          select: {
            id: true,
            typeName: true,
            defaultDuration: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Appointment scheduled successfully',
      data: appointment,
    });
  } catch (error) {
    const errorId = logControllerError('Schedule minor appointment', error, {
      userId: (req as any).user?.userId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to schedule appointment',
      errorId,
    });
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
    res.status(200).json({
      success: true,
      data: [],
      message: 'Messaging integration pending',
    });
  } catch (error) {
    const errorId = logControllerError('Get minor messages', error, {
      userId: (req as any).user?.userId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve messages',
      errorId,
    });
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
    res.status(201).json({
      success: true,
      message: 'Message sent successfully (placeholder)',
      data: {
        minorId,
        message,
        clinicianId,
        sentBy: (req as any).user?.userId,
      },
    });
  } catch (error) {
    const errorId = logControllerError('Send minor message', error, {
      userId: (req as any).user?.userId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      errorId,
    });
  }
};

/**
 * Upload verification document for relationship
 */
export const uploadVerificationDocument = async (req: Request, res: Response) => {
  try {
    const { relationshipId } = req.params;
    const userId = (req as any).user?.userId;
    const file = (req as any).file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
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

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: documentMetadata,
    });
  } catch (error) {
    const errorId = logControllerError('Upload verification document', error, {
      userId: (req as any).user?.userId,
    });

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to upload document',
      errorId,
    });
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

    res.status(200).json({
      success: true,
      data: result.relationships,
      pagination: result.pagination,
    });
  } catch (error) {
    const errorId = logControllerError('Get pending verifications', error, {
      userId: (req as any).user?.userId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pending verifications',
      errorId,
    });
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
      verificationStatus: verificationStatus as any,
      guardianId: guardianId as string,
      minorId: minorId as string,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      data: result.relationships,
      pagination: result.pagination,
    });
  } catch (error) {
    const errorId = logControllerError('Get all relationships', error, {
      userId: (req as any).user?.userId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve relationships',
      errorId,
    });
  }
};

/**
 * Verify guardian relationship
 */
export const verifyRelationship = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = (req as any).user?.userId;
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

    res.status(200).json({
      success: true,
      message: 'Guardian relationship verified successfully',
      data: relationship,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors,
      });
    }

    const errorId = logControllerError('Verify relationship', error, {
      userId: (req as any).user?.userId,
    });

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to verify relationship',
      errorId,
    });
  }
};

/**
 * Reject guardian relationship
 */
export const rejectRelationship = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = (req as any).user?.userId;
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

    res.status(200).json({
      success: true,
      message: 'Guardian relationship rejected',
      data: relationship,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors,
      });
    }

    const errorId = logControllerError('Reject relationship', error, {
      userId: (req as any).user?.userId,
    });

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to reject relationship',
      errorId,
    });
  }
};

/**
 * Revoke guardian relationship
 */
export const revokeRelationship = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = (req as any).user?.userId;
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

    res.status(200).json({
      success: true,
      message: 'Guardian relationship revoked',
      data: relationship,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors,
      });
    }

    const errorId = logControllerError('Revoke relationship', error, {
      userId: (req as any).user?.userId,
    });

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to revoke relationship',
      errorId,
    });
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

    res.status(200).json({
      success: true,
      message: 'Guardian relationship updated successfully',
      data: relationship,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors,
      });
    }

    const errorId = logControllerError('Update guardian relationship', error, {
      userId: (req as any).user?.userId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to update relationship',
      errorId,
    });
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
      return res.status(404).json({
        success: false,
        message: 'Guardian relationship not found',
      });
    }

    res.status(200).json({
      success: true,
      data: relationship,
    });
  } catch (error) {
    const errorId = logControllerError('Get relationship by ID', error, {
      userId: (req as any).user?.userId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve relationship',
      errorId,
    });
  }
};

/**
 * Get document presigned URL for viewing
 */
export const getDocumentUrl = async (req: Request, res: Response) => {
  try {
    const { storageLocation } = req.body;
    const userId = (req as any).user?.userId;

    if (!storageLocation) {
      return res.status(400).json({
        success: false,
        message: 'Storage location required',
      });
    }

    const url = await documentUploadService.getDocumentUrl(storageLocation, userId);

    res.status(200).json({
      success: true,
      data: { url },
    });
  } catch (error) {
    const errorId = logControllerError('Get document URL', error, {
      userId: (req as any).user?.userId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to generate document URL',
      errorId,
    });
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

    res.status(200).json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    const errorId = logControllerError('Get guardian audit log', error, {
      userId: (req as any).user?.userId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit log',
      errorId,
    });
  }
};

// ============================================================================
// LEGACY GUARDIAN ENDPOINTS (keep for backward compatibility)
// ============================================================================

export { getClientGuardians, getGuardianById, createGuardian, updateGuardian, deleteGuardian } from './guardian.controller';
