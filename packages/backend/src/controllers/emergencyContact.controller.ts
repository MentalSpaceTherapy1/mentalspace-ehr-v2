import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

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
    console.error('Get emergency contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve emergency contacts',
      errors: [error],
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
    console.error('Get emergency contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve emergency contact',
      errors: [error],
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
      data: validatedData,
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

    console.error('Create emergency contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create emergency contact',
      errors: [error],
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

    console.error('Update emergency contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update emergency contact',
      errors: [error],
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
    console.error('Delete emergency contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete emergency contact',
      errors: [error],
    });
  }
};
