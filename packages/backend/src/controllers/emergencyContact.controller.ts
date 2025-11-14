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
  alternatePhone: z.string().min(1).or(z.literal('')).optional(),
  email: z.string().email().or(z.literal('')).optional(),
  address: z.string().min(1).or(z.literal('')).optional(),
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

    // Transform the data to match database schema
    // Frontend sends: firstName, lastName, phoneNumber, canPickup, notes
    // Database expects: name, phone (no canPickup or notes columns)
    const dbData = {
      clientId: validatedData.clientId,
      name: `${validatedData.firstName} ${validatedData.lastName}`.trim(),
      relationship: validatedData.relationship,
      phone: validatedData.phoneNumber,
      alternatePhone: validatedData.alternatePhone || null,
      email: validatedData.email || null,
      address: validatedData.address || null,
      isPrimary: validatedData.isPrimary,
      okayToDiscussHealth: false, // Default value, can be added to schema later if needed
      okayToLeaveMessage: true,   // Default value, can be added to schema later if needed
    };

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
      data: dbData,
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

    // Transform the data to match database schema
    const dbData: any = {};
    if (validatedData.firstName !== undefined && validatedData.lastName !== undefined) {
      dbData.name = `${validatedData.firstName} ${validatedData.lastName}`.trim();
    } else if (validatedData.firstName !== undefined || validatedData.lastName !== undefined) {
      // If only one name field is provided, we need to handle it carefully
      // Parse existing name if needed
      const parts = existingContact.name.split(' ');
      const currentFirst = parts[0] || '';
      const currentLast = parts.slice(1).join(' ') || '';
      const newFirst = validatedData.firstName !== undefined ? validatedData.firstName : currentFirst;
      const newLast = validatedData.lastName !== undefined ? validatedData.lastName : currentLast;
      dbData.name = `${newFirst} ${newLast}`.trim();
    }
    if (validatedData.phoneNumber !== undefined) dbData.phone = validatedData.phoneNumber;
    if (validatedData.relationship !== undefined) dbData.relationship = validatedData.relationship;
    if (validatedData.alternatePhone !== undefined) dbData.alternatePhone = validatedData.alternatePhone || null;
    if (validatedData.email !== undefined) dbData.email = validatedData.email || null;
    if (validatedData.address !== undefined) dbData.address = validatedData.address || null;
    if (validatedData.isPrimary !== undefined) dbData.isPrimary = validatedData.isPrimary;

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
      data: dbData,
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
