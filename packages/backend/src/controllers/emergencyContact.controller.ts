import logger, { logControllerError } from '../utils/logger';
import { Request, Response } from 'express';
import { z } from 'zod';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
// Phase 3.2: Removed direct prisma import - using service methods instead
import * as emergencyContactService from '../services/emergencyContact.service';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError } from '../utils/apiResponse';

// Helper to clean empty strings from object
const cleanEmptyStrings = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  const cleaned: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === '' || value === null) {
      // Don't include empty strings or null in the cleaned object
      continue;
    }
    (cleaned as Record<string, unknown>)[key] = value;
  }
  return cleaned;
};

// Emergency Contact schema for create
const emergencyContactSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  relationship: z.string().min(1, 'Relationship is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  alternatePhone: z.string().optional(),
  email: z.string().email('Invalid email format').optional(),
  address: z.string().optional(),
  isPrimary: z.boolean().default(false),
  canPickup: z.boolean().default(false),
  notes: z.string().optional(),
});

// Update schema for update operations
const updateEmergencyContactSchema = emergencyContactSchema.partial().omit({ clientId: true });

// Get all emergency contacts for a client
export const getEmergencyContacts = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    // Phase 3.2: Use service method instead of direct prisma call
    const contacts = await emergencyContactService.getEmergencyContacts(clientId);

    return sendSuccess(res, contacts);
  } catch (error) {
    const errorId = logControllerError('Get emergency contacts', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, `Failed to retrieve emergency contacts (${errorId})`);
  }
};

// Get single emergency contact
export const getEmergencyContactById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Phase 3.2: Use service method instead of direct prisma call
    const contact = await emergencyContactService.getEmergencyContactById(id);

    if (!contact) {
      return sendNotFound(res, 'Emergency contact');
    }

    return sendSuccess(res, contact);
  } catch (error) {
    const errorId = logControllerError('Get emergency contact', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, `Failed to retrieve emergency contact (${errorId})`);
  }
};

// Create emergency contact
export const createEmergencyContact = async (req: Request, res: Response) => {
  try {
    // Clean empty strings before validation
    const cleanedBody = cleanEmptyStrings(req.body);
    const validatedData = emergencyContactSchema.parse(cleanedBody);

    // Phase 3.2: Use service method instead of direct prisma calls
    const contact = await emergencyContactService.createEmergencyContact(validatedData);

    return sendCreated(res, contact, 'Emergency contact created successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendBadRequest(res, `Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }

    const errorId = logControllerError('Create emergency contact', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, `Failed to create emergency contact (${errorId})`);
  }
};

// Update emergency contact
export const updateEmergencyContact = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Clean empty strings before validation
    const cleanedBody = cleanEmptyStrings(req.body);
    const validatedData = updateEmergencyContactSchema.parse(cleanedBody);

    // Phase 3.2: Use service method instead of direct prisma calls
    const contact = await emergencyContactService.updateEmergencyContact(id, validatedData);

    if (!contact) {
      return sendNotFound(res, 'Emergency contact');
    }

    return sendSuccess(res, contact, 'Emergency contact updated successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendBadRequest(res, `Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }

    const errorId = logControllerError('Update emergency contact', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, `Failed to update emergency contact (${errorId})`);
  }
};

// Delete emergency contact
export const deleteEmergencyContact = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Phase 3.2: Use service method instead of direct prisma calls
    const result = await emergencyContactService.deleteEmergencyContact(id);

    if (!result) {
      return sendNotFound(res, 'Emergency contact');
    }

    return sendSuccess(res, null, 'Emergency contact deleted successfully');
  } catch (error) {
    const errorId = logControllerError('Delete emergency contact', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, `Failed to delete emergency contact (${errorId})`);
  }
};
