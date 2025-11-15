import logger, { logControllerError } from '../utils/logger';
import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../services/database';

// Guardian schema for create
const guardianSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  relationship: z.string().min(1, 'Relationship is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  email: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().email('Invalid email format').optional()
  ),
  address: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().optional()
  ),
  isPrimary: z.boolean().default(false),
  notes: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().optional()
  ),
});

// Update schema for update operations
const updateGuardianSchema = guardianSchema.partial().omit({ clientId: true });

// Get all guardians for a client
export const getClientGuardians = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const guardians = await prisma.legalGuardian.findMany({
      where: { clientId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    res.status(200).json({
      success: true,
      data: guardians,
    });
  } catch (error) {
    const errorId = logControllerError('Get guardians', error, {
      userId: (req as any).user?.userId,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve guardians',
      errorId,
    });
  }
};

// Get single guardian
export const getGuardianById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const guardian = await prisma.legalGuardian.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            medicalRecordNumber: true,
          },
        },
      },
    });

    if (!guardian) {
      return res.status(404).json({
        success: false,
        message: 'Guardian not found',
      });
    }

    res.status(200).json({
      success: true,
      data: guardian,
    });
  } catch (error) {
    const errorId = logControllerError('Get guardian', error, {
      userId: (req as any).user?.userId,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve guardian',
      errorId,
    });
  }
};

// Create guardian
export const createGuardian = async (req: Request, res: Response) => {
  try {
    const validatedData = guardianSchema.parse(req.body);

    // If this guardian is marked as primary, unset any other primary guardians for this client
    if (validatedData.isPrimary) {
      await prisma.legalGuardian.updateMany({
        where: {
          clientId: validatedData.clientId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    // Convert empty strings to undefined for database
    const dataToCreate = {
      ...validatedData,
      email: validatedData.email === '' ? undefined : validatedData.email,
      address: validatedData.address === '' ? undefined : validatedData.address,
    };

    const guardian = await prisma.legalGuardian.create({
      data: dataToCreate as any,
    });

    res.status(201).json({
      success: true,
      message: 'Guardian created successfully',
      data: guardian,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors,
      });
    }

    const errorId = logControllerError('Create guardian', error, {
      userId: (req as any).user?.userId,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to create guardian',
      errorId,
    });
  }
};

// Update guardian
export const updateGuardian = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateGuardianSchema.parse(req.body);

    const existingGuardian = await prisma.legalGuardian.findUnique({
      where: { id },
    });

    if (!existingGuardian) {
      return res.status(404).json({
        success: false,
        message: 'Guardian not found',
      });
    }

    // If this guardian is being set as primary, unset other primary guardians
    if (validatedData.isPrimary) {
      await prisma.legalGuardian.updateMany({
        where: {
          clientId: existingGuardian.clientId,
          isPrimary: true,
          id: { not: id },
        },
        data: {
          isPrimary: false,
        },
      });
    }

    const guardian = await prisma.legalGuardian.update({
      where: { id },
      data: validatedData,
    });

    res.status(200).json({
      success: true,
      message: 'Guardian updated successfully',
      data: guardian,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors,
      });
    }

    const errorId = logControllerError('Update guardian', error, {
      userId: (req as any).user?.userId,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to update guardian',
      errorId,
    });
  }
};

// Delete guardian
export const deleteGuardian = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingGuardian = await prisma.legalGuardian.findUnique({
      where: { id },
    });

    if (!existingGuardian) {
      return res.status(404).json({
        success: false,
        message: 'Guardian not found',
      });
    }

    await prisma.legalGuardian.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: 'Guardian deleted successfully',
    });
  } catch (error) {
    const errorId = logControllerError('Delete guardian', error, {
      userId: (req as any).user?.userId,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to delete guardian',
      errorId,
    });
  }
};
