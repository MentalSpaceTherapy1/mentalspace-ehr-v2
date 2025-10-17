import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createClientSchema, updateClientSchema } from '../utils/validation';
import { z } from 'zod';

const prisma = new PrismaClient();

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
      page = '1',
      limit = '20',
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { medicalRecordNumber: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (therapistId) {
      where.primaryTherapistId = therapistId;
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take,
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
      prisma.client.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: clients,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve clients',
      errors: [error],
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

    res.status(200).json({
      success: true,
      data: client,
    });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve client',
      errors: [error],
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

    const client = await prisma.client.create({
      data: {
        ...validatedData,
        medicalRecordNumber,
        dateOfBirth: new Date(validatedData.dateOfBirth),
        createdBy: userId,
        lastModifiedBy: userId,
      },
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

      console.log('=== CLIENT VALIDATION FAILED ===');
      console.log('Errors:', JSON.stringify(formattedErrors, null, 2));
      console.log('Request body:', JSON.stringify(req.body, null, 2));

      // Write to file for debugging
      const fs = require('fs');
      const path = require('path');
      const debugLog = {
        timestamp: new Date().toISOString(),
        type: 'CLIENT_CREATION',
        errors: formattedErrors,
        requestBody: req.body,
      };
      const logPath = path.join(__dirname, '../../validation-errors.json');
      fs.writeFileSync(logPath, JSON.stringify(debugLog, null, 2));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: formattedErrors,
      });
    }

    console.error('Create client error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create client',
      errors: [error],
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

    console.error('Update client error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update client',
      errors: [error],
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
        status: 'INACTIVE',
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
    console.error('Delete client error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate client',
      errors: [error],
    });
  }
};

// Get client statistics
export const getClientStats = async (req: Request, res: Response) => {
  try {
    const [total, active, inactive, discharged] = await Promise.all([
      prisma.client.count(),
      prisma.client.count({ where: { status: 'ACTIVE' } }),
      prisma.client.count({ where: { status: 'INACTIVE' } }),
      prisma.client.count({ where: { status: 'DISCHARGED' } }),
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
    console.error('Get client stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve client statistics',
      errors: [error],
    });
  }
};
