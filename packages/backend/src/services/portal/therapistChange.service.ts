import { AppError } from '../../utils/errors';
import logger from '../../utils/logger';
import prisma from '../database';
import { UserRoles } from '@mentalspace/shared';

// ============================================================================
// THERAPIST CHANGE REQUESTS (Client-side)
// ============================================================================

export async function createChangeRequest(data: {
  clientId: string;
  requestReason: 'SCHEDULE_CONFLICT' | 'THERAPEUTIC_FIT' | 'SPECIALTY_NEEDS' | 'PERSONAL_PREFERENCE' | 'OTHER';
  reasonDetails: string;
  isSensitive?: boolean;
}) {
  try {
    // Get client's current therapist
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
      select: {
        primaryTherapistId: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!client || !client.primaryTherapistId) {
      throw new AppError('Client not found or no assigned therapist', 404);
    }

    // Check for existing pending request
    const existingRequest = await prisma.therapistChangeRequest.findFirst({
      where: {
        clientId: data.clientId,
        status: { in: ['PENDING', 'UNDER_REVIEW'] },
      },
    });

    if (existingRequest) {
      throw new AppError('You already have a pending therapist change request', 400);
    }

    // Create change request
    const request = await prisma.therapistChangeRequest.create({
      data: {
        clientId: data.clientId,
        currentClinicianId: client.primaryTherapistId,
        requestReason: data.requestReason,
        reasonDetails: data.reasonDetails,
        isSensitive: data.isSensitive || false,
        status: 'PENDING',
      },
      include: {
        currentClinician: {
          select: {
            firstName: true,
            lastName: true,
            title: true,
          },
        },
      },
    });

    logger.info(`Therapist change request created by client ${data.clientId}, sensitive: ${data.isSensitive}`);

    // TODO: Notify admin of new request
    // If sensitive, do NOT notify current therapist

    return request;
  } catch (error) {
    logger.error('Error creating therapist change request:', error);
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to create change request', 500);
  }
}

export async function getClientChangeRequests(clientId: string) {
  try {
    const requests = await prisma.therapistChangeRequest.findMany({
      where: { clientId },
      include: {
        currentClinician: {
          select: {
            firstName: true,
            lastName: true,
            title: true,
          },
        },
        newClinician: {
          select: {
            firstName: true,
            lastName: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests;
  } catch (error) {
    logger.error('Error fetching client change requests:', error);
    throw new AppError('Failed to fetch change requests', 500);
  }
}

export async function cancelChangeRequest(data: {
  clientId: string;
  requestId: string;
}) {
  try {
    const request = await prisma.therapistChangeRequest.findFirst({
      where: {
        id: data.requestId,
        clientId: data.clientId,
        status: { in: ['PENDING', 'UNDER_REVIEW'] }, // Can only cancel pending/under review
      },
    });

    if (!request) {
      throw new AppError('Request not found or cannot be cancelled', 404);
    }

    // Update status
    const updated = await prisma.therapistChangeRequest.update({
      where: { id: data.requestId },
      data: {
        status: 'DENIED', // Using DENIED status for client cancellation
        denialReason: 'Cancelled by client',
      },
    });

    logger.info(`Change request ${data.requestId} cancelled by client`);
    return updated;
  } catch (error) {
    logger.error('Error cancelling change request:', error);
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to cancel change request', 500);
  }
}

// ============================================================================
// THERAPIST CHANGE REQUESTS (Admin-side)
// ============================================================================

export async function getAllChangeRequests(filters?: {
  status?: string;
  onlySensitive?: boolean;
}) {
  try {
    const where: Prisma.TherapistChangeRequestWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.onlySensitive) {
      where.isSensitive = true;
    }

    const requests = await prisma.therapistChangeRequest.findMany({
      where,
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            primaryPhone: true,
          },
        },
        currentClinician: {
          select: {
            firstName: true,
            lastName: true,
            title: true,
            specialties: true,
          },
        },
        newClinician: {
          select: {
            firstName: true,
            lastName: true,
            title: true,
          },
        },
      },
      orderBy: [
        { isSensitive: 'desc' }, // Sensitive requests first
        { createdAt: 'desc' },
      ],
    });

    return requests;
  } catch (error) {
    logger.error('Error fetching all change requests:', error);
    throw new AppError('Failed to fetch change requests', 500);
  }
}

export async function reviewChangeRequest(data: {
  adminUserId: string;
  requestId: string;
  reviewNotes?: string;
}) {
  try {
    const request = await prisma.therapistChangeRequest.findUnique({
      where: { id: data.requestId },
    });

    if (!request) {
      throw new AppError('Request not found', 404);
    }

    if (request.status !== 'PENDING') {
      throw new AppError('Request is not in pending status', 400);
    }

    const updated = await prisma.therapistChangeRequest.update({
      where: { id: data.requestId },
      data: {
        status: 'UNDER_REVIEW',
        reviewedBy: data.adminUserId,
        reviewedAt: new Date(),
        reviewNotes: data.reviewNotes,
      },
    });

    logger.info(`Change request ${data.requestId} marked as under review by admin ${data.adminUserId}`);
    return updated;
  } catch (error) {
    logger.error('Error reviewing change request:', error);
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to review change request', 500);
  }
}

export async function assignNewTherapist(data: {
  adminUserId: string;
  requestId: string;
  newClinicianId: string;
}) {
  try {
    const request = await prisma.therapistChangeRequest.findUnique({
      where: { id: data.requestId },
      include: {
        client: true,
      },
    });

    if (!request) {
      throw new AppError('Request not found', 404);
    }

    if (request.status === 'COMPLETED' || request.status === 'DENIED') {
      throw new AppError('Request has already been processed', 400);
    }

    // Verify new clinician exists and is active
    const newClinician = await prisma.user.findFirst({
      where: {
        id: data.newClinicianId,
        roles: { hasSome: [UserRoles.CLINICIAN, UserRoles.SUPERVISOR] },
        isActive: true,
        acceptsNewClients: true,
      },
    });

    if (!newClinician) {
      throw new AppError('New clinician not found or not accepting clients', 404);
    }

    // Update request
    const updated = await prisma.therapistChangeRequest.update({
      where: { id: data.requestId },
      data: {
        status: 'APPROVED',
        newClinicianId: data.newClinicianId,
        assignedAt: new Date(),
        reviewedBy: data.adminUserId,
        reviewedAt: new Date(),
      },
    });

    logger.info(`New therapist ${data.newClinicianId} assigned to change request ${data.requestId}`);

    // TODO: Notify client and new therapist
    // Do NOT notify old therapist if request is sensitive

    return updated;
  } catch (error) {
    logger.error('Error assigning new therapist:', error);
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to assign new therapist', 500);
  }
}

export async function completeTransfer(data: {
  adminUserId: string;
  requestId: string;
}) {
  try {
    const request = await prisma.therapistChangeRequest.findUnique({
      where: { id: data.requestId },
    });

    if (!request) {
      throw new AppError('Request not found', 404);
    }

    if (request.status !== 'APPROVED' || !request.newClinicianId) {
      throw new AppError('Request must be approved with new clinician assigned', 400);
    }

    // Use transaction to ensure atomic update
    const result = await prisma.$transaction(async (tx) => {
      // Update client's primary therapist
      await tx.client.update({
        where: { id: request.clientId },
        data: { primaryTherapistId: request.newClinicianId! },
      });

      // Mark request as completed
      const completedRequest = await tx.therapistChangeRequest.update({
        where: { id: data.requestId },
        data: {
          status: 'COMPLETED',
          transferCompletedAt: new Date(),
        },
      });

      return completedRequest;
    });

    logger.info(`Therapist transfer completed for request ${data.requestId}. Client ${request.clientId} now assigned to therapist ${request.newClinicianId}`);

    // TODO: Notify all parties (client, new therapist, old therapist if not sensitive)

    return result;
  } catch (error) {
    logger.error('Error completing transfer:', error);
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to complete transfer', 500);
  }
}

export async function denyChangeRequest(data: {
  adminUserId: string;
  requestId: string;
  denialReason: string;
}) {
  try {
    const request = await prisma.therapistChangeRequest.findUnique({
      where: { id: data.requestId },
    });

    if (!request) {
      throw new AppError('Request not found', 404);
    }

    if (request.status === 'COMPLETED' || request.status === 'DENIED') {
      throw new AppError('Request has already been processed', 400);
    }

    const updated = await prisma.therapistChangeRequest.update({
      where: { id: data.requestId },
      data: {
        status: 'DENIED',
        denialReason: data.denialReason,
        reviewedBy: data.adminUserId,
        reviewedAt: new Date(),
      },
    });

    logger.info(`Change request ${data.requestId} denied by admin ${data.adminUserId}`);

    // TODO: Notify client of denial with reason

    return updated;
  } catch (error) {
    logger.error('Error denying change request:', error);
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to deny change request', 500);
  }
}

// ============================================================================
// ANALYTICS
// ============================================================================

export async function getChangeRequestStatistics(filters?: {
  clinicianId?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  try {
    const where: Prisma.TherapistChangeRequestWhereInput = {};

    if (filters?.clinicianId) {
      where.currentClinicianId = filters.clinicianId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [total, byReason, byStatus] = await Promise.all([
      prisma.therapistChangeRequest.count({ where }),
      prisma.therapistChangeRequest.groupBy({
        by: ['requestReason'],
        where,
        _count: { requestReason: true },
      }),
      prisma.therapistChangeRequest.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      }),
    ]);

    return {
      total,
      byReason: byReason.reduce(
        (acc, curr) => {
          acc[curr.requestReason] = curr._count.requestReason;
          return acc;
        },
        {} as Record<string, number>
      ),
      byStatus: byStatus.reduce(
        (acc, curr) => {
          acc[curr.status] = curr._count.status;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  } catch (error) {
    logger.error('Error fetching change request statistics:', error);
    throw new AppError('Failed to fetch statistics', 500);
  }
}
