import { Request, Response } from 'express';
import { createClientSchema, updateClientSchema } from '../utils/validation';
import { z } from 'zod';
import prisma from '../services/database';
import { Prisma, ClientStatus } from '@mentalspace/database';
import { applyClientScope, assertCanAccessClient } from '../services/accessControl.service';
import logger, { logControllerError } from '../utils/logger';
import { sanitizeSearchInput, sanitizePagination } from '../utils/sanitize';
import { AppError } from '../utils/errors';
import { sendEmail, EmailTemplates } from '../services/resend.service';

// Generate Medical Record Number
function generateMRN(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `MRN-${timestamp}${random}`;
}

// Get all clients with search and filters
export const getAllClients = async (req: Request, res: Response) => {
  try {
    const {
      search,
      status,
      therapistId,
      page,
      limit,
    } = req.query;

    // Sanitize pagination parameters
    const pagination = sanitizePagination(
      typeof page === 'string' ? page : undefined,
      typeof limit === 'string' ? limit : undefined
    );

    const where: any = {};

    // Sanitize search input to prevent SQL injection
    if (search) {
      const sanitizedSearch = sanitizeSearchInput(search as string);
      if (sanitizedSearch) {
        // Split search by spaces and filter empty strings
        const searchTerms = sanitizedSearch.split(/\s+/).filter(term => term.length > 0);

        if (searchTerms.length === 1) {
          // Single word search - check all fields
          where.OR = [
            { firstName: { contains: searchTerms[0], mode: 'insensitive' } },
            { lastName: { contains: searchTerms[0], mode: 'insensitive' } },
            { medicalRecordNumber: { contains: searchTerms[0], mode: 'insensitive' } },
            { email: { contains: searchTerms[0], mode: 'insensitive' } },
          ];
        } else {
          // Multi-word search - likely "firstName lastName" format
          // Match if: (firstName OR lastName contains first term) AND (firstName OR lastName contains second term)
          // Also try exact firstName+lastName match
          where.OR = [
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
          ];
        }
      }
    }

    if (status) {
      where.status = status;
    }

    if (therapistId) {
      where.primaryTherapistId = therapistId;
    }

    const scopedWhere = await applyClientScope(req.user, where, { allowBillingView: true });

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where: scopedWhere,
        skip: pagination.skip,
        take: pagination.limit,
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

    res.status(200).json({
      success: true,
      data: clients,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    });
  } catch (error) {
    // Handle known operational errors (ForbiddenError, UnauthorizedError, etc.)
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errorCode: error.errorCode,
      });
    }

    const errorId = logControllerError('Get clients error', error, {
      userId: (req as any).user?.userId,
      url: req.url,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve clients',
      errorId,
    });
  }
};

// Get client by ID
export const getClientById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

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
          // Select only fields that exist in production database
          // Excludes AdvancedMD fields that may not be migrated yet
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
            subscriberSSN: true,
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
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }

    await assertCanAccessClient(req.user, {
      clientId: id,
      allowBillingView: true,
      clientRecord: {
        primaryTherapistId: client.primaryTherapistId,
        secondaryTherapistId: client.secondaryTherapistId,
      },
    });

    res.status(200).json({
      success: true,
      data: client,
    });
  } catch (error) {
    // Handle known operational errors (ForbiddenError, UnauthorizedError, etc.)
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errorCode: error.errorCode,
      });
    }

    const errorId = logControllerError('Get client error', error, {
      userId: (req as any).user?.userId,
      clientId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve client',
      errorId,
    });
  }
};

// Create new client
export const createClient = async (req: Request, res: Response) => {
  // IMMEDIATE LOG - this should appear in CloudWatch immediately
  console.log('[CLIENT CREATE] Request received', {
    timestamp: new Date().toISOString(),
    userId: (req as any).user?.userId,
    bodyKeys: Object.keys(req.body || {}),
    hasBody: !!req.body,
  });

  try {
    const validatedData = createClientSchema.parse(req.body);
    const userId = (req as any).user.userId;

    // Generate unique Medical Record Number
    const medicalRecordNumber = generateMRN();

    const clientData: Prisma.ClientUncheckedCreateInput = {
      ...(validatedData as any),
      medicalRecordNumber,
      dateOfBirth: new Date(validatedData.dateOfBirth),
      createdBy: userId,
      lastModifiedBy: userId,
    };

    // Debug logging for client creation
    logger.info('Creating client', {
      mrn: medicalRecordNumber,
      userId,
      hasFirstName: !!clientData.firstName,
      hasLastName: !!clientData.lastName,
      hasDOB: !!clientData.dateOfBirth,
      hasAddress: !!clientData.addressStreet1,
      dataKeys: Object.keys(clientData),
    });

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

    // Send welcome email with MRN and portal signup instructions
    if (client.email) {
      try {
        const clinicianName = client.primaryTherapist
          ? `${client.primaryTherapist.firstName} ${client.primaryTherapist.lastName}`
          : 'your therapist';

        const portalUrl = process.env.PORTAL_URL || 'https://portal.mentalspace.io';

        const emailTemplate = EmailTemplates.clientWelcome(
          client.firstName,
          medicalRecordNumber,
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
          mrn: medicalRecordNumber,
          email: client.email.substring(0, 3) + '***',
        });
      } catch (emailError) {
        // Log but don't fail the request - client was created successfully
        logger.error('Failed to send client welcome email', {
          clientId: client.id,
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
        });
      }
    } else {
      logger.warn('Client created without email - welcome email not sent', {
        clientId: client.id,
        mrn: medicalRecordNumber,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: client,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));

      logger.warn('Client creation validation failed', {
        errors: formattedErrors,
        path: req.originalUrl,
        method: req.method,
        userId: (req as any).user?.userId,
      });

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: formattedErrors,
      });
    }

    // Handle known operational errors (ForbiddenError, UnauthorizedError, etc.)
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errorCode: error.errorCode,
      });
    }

    // CONSOLE LOG for CloudWatch visibility
    console.error('[CLIENT CREATE ERROR]', {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      prismaCode: (error as any)?.code,
      prismaMeta: (error as any)?.meta,
      userId: (req as any).user?.userId,
    });

    // Enhanced logging for debugging production issues
    logger.error('Create client error - detailed', {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      prismaCode: (error as any)?.code,
      prismaClientVersion: (error as any)?.clientVersion,
      prismaMeta: (error as any)?.meta,
      userId: (req as any).user?.userId,
      requestBody: Object.keys(req.body || {}),
    });

    const errorId = logControllerError('Create client error', error, {
      userId: (req as any).user?.userId,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to create client',
      errorId,
    });
  }
};

// Update client
export const updateClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateClientSchema.parse(req.body);
    const userId = (req as any).user.userId;

    const existingClient = await prisma.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }

    const updateData: any = {
      ...validatedData,
      lastModifiedBy: userId,
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

    res.status(200).json({
      success: true,
      message: 'Client updated successfully',
      data: client,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors,
      });
    }

    // Handle known operational errors (ForbiddenError, UnauthorizedError, etc.)
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errorCode: error.errorCode,
      });
    }

    const errorId = logControllerError('Update client error', error, {
      userId: (req as any).user?.userId,
      clientId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to update client',
      errorId,
    });
  }
};

// Delete client (soft delete by setting status to INACTIVE)
export const deleteClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    const existingClient = await prisma.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        status: ClientStatus.INACTIVE,
        statusDate: new Date(),
        lastModifiedBy: userId,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Client deactivated successfully',
      data: client,
    });
  } catch (error) {
    // Handle known operational errors (ForbiddenError, UnauthorizedError, etc.)
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errorCode: error.errorCode,
      });
    }

    const errorId = logControllerError('Delete client error', error, {
      userId: (req as any).user?.userId,
      clientId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate client',
      errorId,
    });
  }
};

// Get client statistics
export const getClientStats = async (req: Request, res: Response) => {
  try {
    const baseWhere = await applyClientScope(req.user, {}, { allowBillingView: true });
    const withStatus = (status: ClientStatus) => ({ ...baseWhere, status });

    const [total, active, inactive, discharged] = await Promise.all([
      prisma.client.count({ where: baseWhere }),
      prisma.client.count({ where: withStatus(ClientStatus.ACTIVE) }),
      prisma.client.count({ where: withStatus(ClientStatus.INACTIVE) }),
      prisma.client.count({ where: withStatus(ClientStatus.DISCHARGED) }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        active,
        inactive,
        discharged,
      },
    });
  } catch (error) {
    // Handle known operational errors (ForbiddenError, UnauthorizedError, etc.)
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errorCode: error.errorCode,
      });
    }

    const errorId = logControllerError('Get client stats error', error, {
      userId: (req as any).user?.userId,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve client statistics',
      errorId,
    });
  }
};

