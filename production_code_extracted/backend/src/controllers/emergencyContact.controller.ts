import logger, { logControllerError } from '../utils/logger';
import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../services/database';

// Emergency Contact validation schema
const emergencyContactSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  relationship: z.string().min(1, 'Relationship is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  alternatePhone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  isPrimary: z.boolean().default(false),
  canPickup: z.boolean().default(false),
  notes: z.string().optional(),
});

const updateEmergencyContactSchema = emergencyContactSchema.partial().omit({ clientId: true });

// Get all emergency contacts for a client
export const getEmergencyContacts = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const contacts = await prisma.emergencyContact.findMany({
      where: { clientId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    res.status(200).json({
      success: true,
      data: contacts,
    });
  } catch (error) {
    const errorId = logControllerError('Get emergency contacts', error, {
      userId: (req as any).user?.userId,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve emergency contacts',
      errorId,
    });
  }
};

// Get single emergency contact
export const getEmergencyContactById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const contact = await prisma.emergencyContact.findUnique({
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

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Emergency contact not found',
      });
    }

    res.status(200).json({
      success: true,
      data: contact,
    });
  } catch (error) {
    const errorId = logControllerError('Get emergency contact', error, {
      userId: (req as any).user?.userId,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve emergency contact',
      errorId,
    });
  }
};

// Create emergency contact
export const createEmergencyContact = async (req: Request, res: Response) => {
  try {
    const validatedData = emergencyContactSchema.parse(req.body);

    // If this contact is marked as primary, unset any other primary contacts for this client
    if (validatedData.isPrimary) {
      await prisma.emergencyContact.updateMany({
        where: {
          clientId: validatedData.clientId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    const contact = await prisma.emergencyContact.create({
      data: validatedData as any,
    });

    res.status(201).json({
      success: true,
      message: 'Emergency contact created successfully',
      data: contact,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors,
      });
    }

    const errorId = logControllerError('Create emergency contact', error, {
      userId: (req as any).user?.userId,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to create emergency contact',
      errorId,
    });
  }
};

// Update emergency contact
export const updateEmergencyContact = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateEmergencyContactSchema.parse(req.body);

    const existingContact = await prisma.emergencyContact.findUnique({
      where: { id },
    });

    if (!existingContact) {
      return res.status(404).json({
        success: false,
        message: 'Emergency contact not found',
      });
    }

    // If this contact is being set as primary, unset other primary contacts
    if (validatedData.isPrimary) {
      await prisma.emergencyContact.updateMany({
        where: {
          clientId: existingContact.clientId,
          isPrimary: true,
          id: { not: id },
        },
        data: {
          isPrimary: false,
        },
      });
    }

    const contact = await prisma.emergencyContact.update({
      where: { id },
      data: validatedData,
    });

    res.status(200).json({
      success: true,
      message: 'Emergency contact updated successfully',
      data: contact,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors,
      });
    }

    const errorId = logControllerError('Update emergency contact', error, {
      userId: (req as any).user?.userId,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to update emergency contact',
      errorId,
    });
  }
};

// Delete emergency contact
export const deleteEmergencyContact = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingContact = await prisma.emergencyContact.findUnique({
      where: { id },
    });

    if (!existingContact) {
      return res.status(404).json({
        success: false,
        message: 'Emergency contact not found',
      });
    }

    await prisma.emergencyContact.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: 'Emergency contact deleted successfully',
    });
  } catch (error) {
    const errorId = logControllerError('Delete emergency contact', error, {
      userId: (req as any).user?.userId,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to delete emergency contact',
      errorId,
    });
  }
};
