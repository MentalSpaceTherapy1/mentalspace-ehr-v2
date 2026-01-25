/**
 * Client Service
 * Phase 3.2: Business logic extracted from client.controller.ts
 *
 * Handles all client-related business operations including:
 * - Client CRUD operations
 * - Medical Record Number (MRN) generation
 * - Search query building
 * - Welcome email notifications
 */

import prisma from './database';
import { Prisma, ClientStatus, Client } from '@mentalspace/database';
import { createClientSchema, updateClientSchema } from '../utils/validation';
import { sendEmail, EmailTemplates } from './resend.service';
import { applyClientScope, assertCanAccessClient } from './accessControl.service';
import logger from '../utils/logger';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { JwtPayload } from '../utils/jwt';
import { z } from 'zod';

// Types
export interface ClientFilters {
  search?: string;
  status?: ClientStatus;
  therapistId?: string;
  page?: number;
  limit?: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ClientListResult {
  clients: Client[];
  pagination: PaginationInfo;
}

export interface ClientStats {
  total: number;
  active: number;
  inactive: number;
  discharged: number;
}

/**
 * Client Service Class
 * Encapsulates all client-related business logic
 */
class ClientService {
  /**
   * Generate a unique Medical Record Number (MRN)
   * Format: MRN-TTTTTTRRR where T=timestamp digits, R=random digits
   */
  generateMRN(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `MRN-${timestamp}${random}`;
  }

  /**
   * Build Prisma where clause for client search
   * Handles single-word and multi-word searches across firstName, lastName, email, MRN
   */
  buildSearchWhereClause(search: string): Prisma.ClientWhereInput {
    const sanitizedSearch = search.trim();
    if (!sanitizedSearch) {
      return {};
    }

    // Split search by spaces and filter empty strings
    const searchTerms = sanitizedSearch.split(/\s+/).filter(term => term.length > 0);

    if (searchTerms.length === 1) {
      // Single word search - check all fields
      return {
        OR: [
          { firstName: { contains: searchTerms[0], mode: 'insensitive' } },
          { lastName: { contains: searchTerms[0], mode: 'insensitive' } },
          { medicalRecordNumber: { contains: searchTerms[0], mode: 'insensitive' } },
          { email: { contains: searchTerms[0], mode: 'insensitive' } },
        ],
      };
    }

    // Multi-word search - likely "firstName lastName" format
    // Match if: (firstName OR lastName contains first term) AND (firstName OR lastName contains second term)
    // Also try exact firstName+lastName match
    return {
      OR: [
        // Try firstName + lastName combination
        {
          AND: [
            { firstName: { contains: searchTerms[0], mode: 'insensitive' } },
            { lastName: { contains: searchTerms.slice(1).join(' '), mode: 'insensitive' } },
          ],
        },
        // Try lastName + firstName combination
        {
          AND: [
            { lastName: { contains: searchTerms[0], mode: 'insensitive' } },
            { firstName: { contains: searchTerms.slice(1).join(' '), mode: 'insensitive' } },
          ],
        },
        // Try each word matching across firstName and lastName
        {
          AND: searchTerms.map(term => ({
            OR: [
              { firstName: { contains: term, mode: 'insensitive' } },
              { lastName: { contains: term, mode: 'insensitive' } },
            ],
          })),
        },
        // Also check email and MRN with full string
        { email: { contains: sanitizedSearch, mode: 'insensitive' } },
        { medicalRecordNumber: { contains: sanitizedSearch, mode: 'insensitive' } },
      ],
    };
  }

  /**
   * Get all clients with filtering, pagination, and access control
   */
  async getClients(
    filters: ClientFilters,
    user: JwtPayload
  ): Promise<ClientListResult> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Build where clause
    let where: Prisma.ClientWhereInput = {};

    // Apply search filter
    if (filters.search) {
      where = { ...where, ...this.buildSearchWhereClause(filters.search) };
    }

    // Apply status filter
    if (filters.status) {
      where.status = filters.status;
    }

    // Apply therapist filter
    if (filters.therapistId) {
      where.primaryTherapistId = filters.therapistId;
    }

    // Apply access control scope
    const scopedWhere = await applyClientScope(user, where, { allowBillingView: true });

    // Execute queries in parallel
    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where: scopedWhere,
        skip,
        take: limit,
        include: {
          primaryTherapist: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              title: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.client.count({ where: scopedWhere }),
    ]);

    return {
      clients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single client by ID with access control
   */
  async getClientById(id: string, user: JwtPayload): Promise<Client> {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        primaryTherapist: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            email: true,
            phoneNumber: true,
          },
        },
        emergencyContacts: true,
        insuranceInfo: {
          orderBy: { rank: 'asc' },
          select: {
            id: true,
            clientId: true,
            rank: true,
            insuranceCompany: true,
            insuranceCompanyId: true,
            planName: true,
            planType: true,
            memberId: true,
            groupNumber: true,
            effectiveDate: true,
            terminationDate: true,
            subscriberIsClient: true,
            subscriberFirstName: true,
            subscriberLastName: true,
            subscriberDOB: true,
            relationshipToSubscriber: true,
            subscriberEmployer: true,
            customerServicePhone: true,
            precertificationPhone: true,
            providerPhone: true,
            requiresReferral: true,
            requiresPriorAuth: true,
            mentalHealthCoverage: true,
            copay: true,
            coinsurance: true,
            deductible: true,
            deductibleMet: true,
            outOfPocketMax: true,
            outOfPocketMet: true,
            lastVerificationDate: true,
            lastVerifiedBy: true,
            verificationNotes: true,
            remainingSessions: true,
            frontCardImage: true,
            backCardImage: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundError('Client');
    }

    // Verify access
    await assertCanAccessClient(user, {
      clientId: id,
      allowBillingView: true,
      clientRecord: {
        primaryTherapistId: client.primaryTherapistId,
        secondaryTherapistId: client.secondaryTherapistId,
      },
    });

    return client;
  }

  /**
   * Create a new client with MRN generation and welcome email
   */
  async createClient(
    data: z.infer<typeof createClientSchema>,
    createdBy: string
  ): Promise<Client> {
    // Validate input
    const validatedData = createClientSchema.parse(data);

    // Generate unique MRN
    const medicalRecordNumber = this.generateMRN();

    logger.info('Creating client', {
      mrn: medicalRecordNumber,
      userId: createdBy,
      hasFirstName: !!validatedData.firstName,
      hasLastName: !!validatedData.lastName,
    });

    // Create the client
    const clientData: Prisma.ClientUncheckedCreateInput = {
      ...(validatedData as any),
      medicalRecordNumber,
      dateOfBirth: new Date(validatedData.dateOfBirth),
      createdBy,
      lastModifiedBy: createdBy,
    };

    const client = await prisma.client.create({
      data: clientData,
      include: {
        primaryTherapist: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
      },
    });

    // Send welcome email (non-blocking)
    await this.sendWelcomeEmail(client);

    return client;
  }

  /**
   * Send welcome email to new client with MRN and portal info
   */
  private async sendWelcomeEmail(client: Client & { primaryTherapist?: { firstName: string; lastName: string } | null }): Promise<void> {
    if (!client.email) {
      logger.warn('Client created without email - welcome email not sent', {
        clientId: client.id,
        mrn: client.medicalRecordNumber,
      });
      return;
    }

    try {
      const clinicianName = client.primaryTherapist
        ? `${client.primaryTherapist.firstName} ${client.primaryTherapist.lastName}`
        : 'your therapist';

      const portalUrl = process.env.PORTAL_URL || 'https://portal.mentalspace.io';

      const emailTemplate = EmailTemplates.clientWelcome(
        client.firstName,
        client.medicalRecordNumber,
        clinicianName,
        portalUrl
      );

      await sendEmail({
        to: client.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      });

      logger.info('Client welcome email sent', {
        clientId: client.id,
        mrn: client.medicalRecordNumber,
        email: client.email.substring(0, 3) + '***',
      });
    } catch (emailError) {
      // Log but don't fail - client was created successfully
      logger.error('Failed to send client welcome email', {
        clientId: client.id,
        error: emailError instanceof Error ? emailError.message : 'Unknown error',
      });
    }
  }

  /**
   * Update an existing client
   */
  async updateClient(
    id: string,
    data: z.infer<typeof updateClientSchema>,
    updatedBy: string
  ): Promise<Client> {
    // Validate input
    const validatedData = updateClientSchema.parse(data);

    // Check client exists
    const existingClient = await prisma.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      throw new NotFoundError('Client');
    }

    // Build update data
    const updateData: Prisma.ClientUncheckedUpdateInput = {
      ...validatedData,
      lastModifiedBy: updatedBy,
    };

    // Convert dateOfBirth if provided
    if (validatedData.dateOfBirth) {
      updateData.dateOfBirth = new Date(validatedData.dateOfBirth);
    }

    const client = await prisma.client.update({
      where: { id },
      data: updateData,
      include: {
        primaryTherapist: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
      },
    });

    return client;
  }

  /**
   * Soft delete a client by setting status to INACTIVE
   */
  async deleteClient(id: string, deletedBy: string): Promise<Client> {
    const existingClient = await prisma.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      throw new NotFoundError('Client');
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        status: ClientStatus.INACTIVE,
        statusDate: new Date(),
        lastModifiedBy: deletedBy,
      },
    });

    return client;
  }

  /**
   * Get client statistics with access control
   */
  async getClientStats(user: JwtPayload): Promise<ClientStats> {
    const baseWhere = await applyClientScope(user, {}, { allowBillingView: true });

    const withStatus = (status: ClientStatus): Prisma.ClientWhereInput => ({
      ...baseWhere,
      status,
    });

    const [total, active, inactive, discharged] = await Promise.all([
      prisma.client.count({ where: baseWhere }),
      prisma.client.count({ where: withStatus(ClientStatus.ACTIVE) }),
      prisma.client.count({ where: withStatus(ClientStatus.INACTIVE) }),
      prisma.client.count({ where: withStatus(ClientStatus.DISCHARGED) }),
    ]);

    return {
      total,
      active,
      inactive,
      discharged,
    };
  }
}

// Export singleton instance
export const clientService = new ClientService();
export default clientService;
