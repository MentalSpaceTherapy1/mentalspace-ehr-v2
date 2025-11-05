import prisma from './database';
import type { PriorAuthorization } from '@prisma/client';
import logger from '../utils/logger';
import * as EmailService from './email.service';

/**
 * Phase 2: Prior Authorization Service (Module 2)
 *
 * Manages prior authorizations with session tracking, expiration monitoring,
 * and automated warnings for approaching limits.
 */

export interface CreateAuthorizationRequest {
  clientId: string;
  insuranceId: string;
  authorizationNumber: string;
  authorizationType: 'OUTPATIENT_THERAPY' | 'INPATIENT' | 'ASSESSMENT' | 'MEDICATION_MANAGEMENT';
  cptCodes: string[];
  diagnosisCodes: string[];
  sessionsAuthorized: number;
  sessionUnit?: string;
  startDate: Date;
  endDate: Date;
  requestingProviderId: string;
  performingProviderId?: string;
  clinicalJustification?: string;
  supportingDocuments?: string[];
  createdBy: string;
}

export interface UpdateAuthorizationRequest {
  authorizationNumber?: string;
  authorizationType?: string;
  cptCodes?: string[];
  diagnosisCodes?: string[];
  sessionsAuthorized?: number;
  startDate?: Date;
  endDate?: Date;
  performingProviderId?: string;
  status?: string;
  denialReason?: string;
  clinicalJustification?: string;
  supportingDocuments?: string[];
  approvalDate?: Date;
}

export interface UseSessionRequest {
  authId: string;
  sessionDate: Date;
  providerId: string;
}

export interface RenewalRequest {
  currentAuthId: string;
  newSessionsRequested: number;
  newEndDate: Date;
  renewalJustification: string;
  requestingProviderId: string;
}

export interface AuthorizationFilters {
  clientId?: string;
  insuranceId?: string;
  status?: string;
  authorizationType?: string;
  expiringWithinDays?: number;
  lowSessionsThreshold?: number;
}

/**
 * Create a new prior authorization
 */
export async function createAuthorization(
  data: CreateAuthorizationRequest
): Promise<PriorAuthorization> {
  // Check for duplicate authorization number
  const existing = await prisma.priorAuthorization.findUnique({
    where: { authorizationNumber: data.authorizationNumber },
  });

  if (existing) {
    throw new Error(`Authorization number ${data.authorizationNumber} already exists`);
  }

  // Verify client and insurance exist
  const client = await prisma.client.findUnique({
    where: { id: data.clientId },
  });

  if (!client) {
    throw new Error(`Client ${data.clientId} not found`);
  }

  const insurance = await prisma.insuranceInformation.findUnique({
    where: { id: data.insuranceId },
  });

  if (!insurance) {
    throw new Error(`Insurance ${data.insuranceId} not found`);
  }

  if (insurance.clientId !== data.clientId) {
    throw new Error('Insurance does not belong to the specified client');
  }

  // Create the authorization
  const auth = await prisma.priorAuthorization.create({
    data: {
      clientId: data.clientId,
      insuranceId: data.insuranceId,
      authorizationNumber: data.authorizationNumber,
      authorizationType: data.authorizationType,
      cptCodes: data.cptCodes,
      diagnosisCodes: data.diagnosisCodes,
      sessionsAuthorized: data.sessionsAuthorized,
      sessionsUsed: 0,
      sessionsRemaining: data.sessionsAuthorized,
      sessionUnit: data.sessionUnit || 'SESSIONS',
      startDate: data.startDate,
      endDate: data.endDate,
      requestingProviderId: data.requestingProviderId,
      performingProviderId: data.performingProviderId,
      status: 'PENDING',
      clinicalJustification: data.clinicalJustification,
      supportingDocuments: data.supportingDocuments || [],
      createdBy: data.createdBy,
    },
    include: {
      client: true,
      insurance: true,
      requestingProvider: true,
      performingProvider: true,
    },
  });

  logger.info('Prior authorization created', {
    authId: auth.id,
    authNumber: auth.authorizationNumber,
    clientId: auth.clientId,
  });

  return auth;
}

/**
 * Update an existing authorization
 */
export async function updateAuthorization(
  id: string,
  data: UpdateAuthorizationRequest
): Promise<PriorAuthorization> {
  const auth = await prisma.priorAuthorization.findUnique({
    where: { id },
  });

  if (!auth) {
    throw new Error(`Authorization ${id} not found`);
  }

  // If changing sessions authorized, recalculate sessions remaining
  let updateData: any = { ...data };

  if (data.sessionsAuthorized !== undefined) {
    updateData.sessionsRemaining = data.sessionsAuthorized - auth.sessionsUsed;
  }

  // If approving, set approval date
  if (data.status === 'APPROVED' && !data.approvalDate) {
    updateData.approvalDate = new Date();
  }

  const updated = await prisma.priorAuthorization.update({
    where: { id },
    data: updateData,
    include: {
      client: true,
      insurance: true,
      requestingProvider: true,
      performingProvider: true,
    },
  });

  logger.info('Prior authorization updated', {
    authId: updated.id,
    authNumber: updated.authorizationNumber,
    status: updated.status,
  });

  return updated;
}

/**
 * Use a session from an authorization
 * Auto-decrements sessions and checks for warnings
 */
export async function useSession(data: UseSessionRequest): Promise<PriorAuthorization> {
  const auth = await prisma.priorAuthorization.findUnique({
    where: { id: data.authId },
    include: {
      client: true,
      insurance: true,
      requestingProvider: true,
      performingProvider: true,
    },
  });

  if (!auth) {
    throw new Error(`Authorization ${data.authId} not found`);
  }

  // Validate authorization status
  if (auth.status !== 'APPROVED') {
    throw new Error(`Authorization is not approved. Current status: ${auth.status}`);
  }

  // Check if expired
  if (new Date() > auth.endDate) {
    await prisma.priorAuthorization.update({
      where: { id: data.authId },
      data: { status: 'EXPIRED' },
    });
    throw new Error('Authorization has expired');
  }

  // Check if sessions exhausted
  if (auth.sessionsRemaining <= 0) {
    await prisma.priorAuthorization.update({
      where: { id: data.authId },
      data: { status: 'EXHAUSTED' },
    });
    throw new Error('Authorization has no remaining sessions');
  }

  // Use a session
  const updated = await prisma.priorAuthorization.update({
    where: { id: data.authId },
    data: {
      sessionsUsed: { increment: 1 },
      sessionsRemaining: { decrement: 1 },
      lastUsedDate: data.sessionDate,
    },
    include: {
      client: true,
      insurance: true,
      requestingProvider: true,
      performingProvider: true,
    },
  });

  // Check and send warnings if needed
  await checkAndSendWarnings(updated);

  // Check if exhausted after this session
  if (updated.sessionsRemaining === 0) {
    await prisma.priorAuthorization.update({
      where: { id: data.authId },
      data: { status: 'EXHAUSTED' },
    });
  }

  logger.info('Session used from authorization', {
    authId: updated.id,
    authNumber: updated.authorizationNumber,
    sessionsRemaining: updated.sessionsRemaining,
  });

  return updated;
}

/**
 * Check and send warnings for low sessions (5, 3, 1 remaining)
 */
export async function checkAndSendWarnings(
  auth: PriorAuthorization & {
    client: any;
    requestingProvider: any;
    performingProvider: any;
  }
): Promise<void> {
  const warningThresholds = [5, 3, 1];
  const warningsSent = (auth.warningsSent as any) || {};

  for (const threshold of warningThresholds) {
    if (
      auth.sessionsRemaining === threshold &&
      !warningsSent[`sessions_${threshold}`]
    ) {
      // Send email notification
      const provider = auth.performingProvider || auth.requestingProvider;
      if (provider.email) {
        await EmailService.sendEmail({
          to: provider.email,
          subject: `Prior Authorization Low Sessions Warning - ${auth.authorizationNumber}`,
          html: `
            <h2>Prior Authorization Low Sessions Alert</h2>
            <p>The following prior authorization is running low on sessions:</p>
            <ul>
              <li><strong>Client:</strong> ${auth.client.firstName} ${auth.client.lastName}</li>
              <li><strong>Authorization Number:</strong> ${auth.authorizationNumber}</li>
              <li><strong>Sessions Remaining:</strong> ${auth.sessionsRemaining}</li>
              <li><strong>Sessions Authorized:</strong> ${auth.sessionsAuthorized}</li>
              <li><strong>End Date:</strong> ${auth.endDate.toLocaleDateString()}</li>
            </ul>
            <p>Please consider requesting a renewal to avoid service interruption.</p>
          `,
        });
      }

      // Update warnings sent
      warningsSent[`sessions_${threshold}`] = new Date().toISOString();
      await prisma.priorAuthorization.update({
        where: { id: auth.id },
        data: { warningsSent: warningsSent as any },
      });

      logger.info('Session warning sent', {
        authId: auth.id,
        threshold,
        sessionsRemaining: auth.sessionsRemaining,
      });
    }
  }
}

/**
 * Check for expiring authorizations (30 days before end date)
 * This should be called daily by a cron job
 */
export async function checkExpiringAuthorizations(): Promise<void> {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const expiringAuths = await prisma.priorAuthorization.findMany({
    where: {
      status: 'APPROVED',
      endDate: {
        lte: thirtyDaysFromNow,
        gte: new Date(),
      },
    },
    include: {
      client: true,
      requestingProvider: true,
      performingProvider: true,
    },
  });

  for (const auth of expiringAuths) {
    const warningsSent = (auth.warningsSent as any) || {};
    const daysUntilExpiry = Math.floor(
      (auth.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    // Send warnings at 30, 14, and 7 days
    const shouldSendWarning =
      (daysUntilExpiry <= 30 && !warningsSent.expiry_30) ||
      (daysUntilExpiry <= 14 && !warningsSent.expiry_14) ||
      (daysUntilExpiry <= 7 && !warningsSent.expiry_7);

    if (shouldSendWarning) {
      const provider = auth.performingProvider || auth.requestingProvider;
      if (provider.email) {
        await EmailService.sendEmail({
          to: provider.email,
          subject: `Prior Authorization Expiring Soon - ${auth.authorizationNumber}`,
          html: `
            <h2>Prior Authorization Expiration Alert</h2>
            <p>The following prior authorization will expire in ${daysUntilExpiry} days:</p>
            <ul>
              <li><strong>Client:</strong> ${auth.client.firstName} ${auth.client.lastName}</li>
              <li><strong>Authorization Number:</strong> ${auth.authorizationNumber}</li>
              <li><strong>End Date:</strong> ${auth.endDate.toLocaleDateString()}</li>
              <li><strong>Sessions Remaining:</strong> ${auth.sessionsRemaining} of ${auth.sessionsAuthorized}</li>
            </ul>
            <p>Please request a renewal to maintain authorization for services.</p>
          `,
        });
      }

      // Update warnings sent
      if (daysUntilExpiry <= 30) warningsSent.expiry_30 = new Date().toISOString();
      if (daysUntilExpiry <= 14) warningsSent.expiry_14 = new Date().toISOString();
      if (daysUntilExpiry <= 7) warningsSent.expiry_7 = new Date().toISOString();

      await prisma.priorAuthorization.update({
        where: { id: auth.id },
        data: { warningsSent: warningsSent as any },
      });

      logger.info('Expiration warning sent', {
        authId: auth.id,
        daysUntilExpiry,
      });
    }
  }

  // Mark truly expired authorizations
  await prisma.priorAuthorization.updateMany({
    where: {
      status: 'APPROVED',
      endDate: {
        lt: new Date(),
      },
    },
    data: {
      status: 'EXPIRED',
    },
  });

  logger.info('Checked expiring authorizations', {
    found: expiringAuths.length,
  });
}

/**
 * Initiate a renewal request
 */
export async function initiateRenewal(data: RenewalRequest): Promise<PriorAuthorization> {
  const currentAuth = await prisma.priorAuthorization.findUnique({
    where: { id: data.currentAuthId },
    include: {
      client: true,
      insurance: true,
    },
  });

  if (!currentAuth) {
    throw new Error(`Authorization ${data.currentAuthId} not found`);
  }

  // Create a new authorization as a renewal
  const newAuth = await prisma.priorAuthorization.create({
    data: {
      clientId: currentAuth.clientId,
      insuranceId: currentAuth.insuranceId,
      authorizationNumber: `${currentAuth.authorizationNumber}-R${Date.now()}`,
      authorizationType: currentAuth.authorizationType,
      cptCodes: currentAuth.cptCodes,
      diagnosisCodes: currentAuth.diagnosisCodes,
      sessionsAuthorized: data.newSessionsRequested,
      sessionsUsed: 0,
      sessionsRemaining: data.newSessionsRequested,
      sessionUnit: currentAuth.sessionUnit,
      startDate: new Date(),
      endDate: data.newEndDate,
      requestingProviderId: data.requestingProviderId,
      performingProviderId: currentAuth.performingProviderId,
      status: 'PENDING',
      clinicalJustification: data.renewalJustification,
      renewedFromId: currentAuth.id,
      createdBy: data.requestingProviderId,
    },
    include: {
      client: true,
      insurance: true,
      requestingProvider: true,
    },
  });

  // Update current authorization to mark renewal requested
  await prisma.priorAuthorization.update({
    where: { id: data.currentAuthId },
    data: {
      renewalRequested: true,
      renewalRequestDate: new Date(),
      renewedToId: newAuth.id,
    },
  });

  logger.info('Renewal initiated', {
    currentAuthId: currentAuth.id,
    newAuthId: newAuth.id,
    newAuthNumber: newAuth.authorizationNumber,
  });

  return newAuth;
}

/**
 * Get authorization by ID
 */
export async function getAuthorizationById(
  id: string
): Promise<PriorAuthorization | null> {
  return await prisma.priorAuthorization.findUnique({
    where: { id },
    include: {
      client: true,
      insurance: true,
      requestingProvider: true,
      performingProvider: true,
      renewedFrom: true,
      renewedTo: true,
      creator: true,
    },
  });
}

/**
 * Get authorizations with filters
 */
export async function getAuthorizations(
  filters?: AuthorizationFilters
): Promise<PriorAuthorization[]> {
  const where: any = {};

  if (filters?.clientId) {
    where.clientId = filters.clientId;
  }

  if (filters?.insuranceId) {
    where.insuranceId = filters.insuranceId;
  }

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.authorizationType) {
    where.authorizationType = filters.authorizationType;
  }

  if (filters?.expiringWithinDays) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + filters.expiringWithinDays);
    where.endDate = {
      lte: futureDate,
      gte: new Date(),
    };
    where.status = 'APPROVED';
  }

  if (filters?.lowSessionsThreshold) {
    where.sessionsRemaining = {
      lte: filters.lowSessionsThreshold,
    };
    where.status = 'APPROVED';
  }

  return await prisma.priorAuthorization.findMany({
    where,
    include: {
      client: true,
      insurance: true,
      requestingProvider: true,
      performingProvider: true,
    },
    orderBy: [
      { status: 'asc' },
      { endDate: 'asc' },
    ],
  });
}

/**
 * Delete (deactivate) an authorization
 */
export async function deleteAuthorization(id: string): Promise<PriorAuthorization> {
  const auth = await prisma.priorAuthorization.findUnique({
    where: { id },
  });

  if (!auth) {
    throw new Error(`Authorization ${id} not found`);
  }

  // Don't allow deleting approved authorizations with used sessions
  if (auth.status === 'APPROVED' && auth.sessionsUsed > 0) {
    throw new Error('Cannot delete an authorization with used sessions. Consider marking it as expired instead.');
  }

  return await prisma.priorAuthorization.delete({
    where: { id },
  });
}

/**
 * Get authorization statistics
 */
export async function getAuthorizationStats() {
  const [total, byStatus, lowSessions, expiringSoon] = await Promise.all([
    prisma.priorAuthorization.count(),
    prisma.priorAuthorization.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.priorAuthorization.count({
      where: {
        status: 'APPROVED',
        sessionsRemaining: { lte: 3 },
      },
    }),
    prisma.priorAuthorization.count({
      where: {
        status: 'APPROVED',
        endDate: {
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          gte: new Date(),
        },
      },
    }),
  ]);

  return {
    total,
    byStatus: byStatus.reduce((acc, item) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {} as Record<string, number>),
    lowSessions,
    expiringSoon,
  };
}
