import { Request, Response } from 'express';
import { createClientSchema, updateClientSchema } from '../utils/validation';
import { z } from 'zod';
import prisma from '../services/database';
import { Prisma, ClientStatus } from '@mentalspace/database';
import { applyClientScope, assertCanAccessClient } from '../services/accessControl.service';
import logger, { logControllerError } from '../utils/logger';
import { sanitizeSearchInput, sanitizePagination } from '../utils/sanitize';

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
        where.OR = [
          { firstName: { contains: sanitizedSearch, mode: 'insensitive' } },
          { lastName: { contains: sanitizedSearch, mode: 'insensitive' } },
          { medicalRecordNumber: { contains: sanitizedSearch, mode: 'insensitive' } },
          { email: { contains: sanitizedSearch, mode: 'insensitive' } },
        ];
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

