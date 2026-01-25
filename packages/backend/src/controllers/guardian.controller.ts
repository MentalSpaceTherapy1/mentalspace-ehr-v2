import logger, { logControllerError } from '../utils/logger';
import { Request, Response } from 'express';
import { z } from 'zod';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
// Phase 3.2: Removed direct prisma import - using service methods instead
import * as guardianService from '../services/guardian.service';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError, sendValidationError } from '../utils/apiResponse';

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

// Guardian schema for create
const guardianSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  relationship: z.string().min(1, 'Relationship is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email format').optional(),
  address: z.string().optional(),
  isPrimary: z.boolean().default(false),
  notes: z.string().optional(),
});

// Update schema for update operations
const updateGuardianSchema = guardianSchema.partial().omit({ clientId: true });

// Get all guardians for a client
export const getClientGuardians = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    // Phase 3.2: Use service method instead of direct prisma call
    const guardians = await guardianService.getClientGuardians(clientId);

    return sendSuccess(res, guardians);
  } catch (error) {
    const errorId = logControllerError('Get guardians', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to retrieve guardians', errorId);
  }
};

// Get single guardian
export const getGuardianById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Phase 3.2: Use service method instead of direct prisma call
    const guardian = await guardianService.getGuardianById(id);

    if (!guardian) {
      return sendNotFound(res, 'Guardian');
    }

    return sendSuccess(res, guardian);
  } catch (error) {
    const errorId = logControllerError('Get guardian', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to retrieve guardian', errorId);
  }
};

// Create guardian
export const createGuardian = async (req: Request, res: Response) => {
  try {
    // Clean empty strings before validation
    const cleanedBody = cleanEmptyStrings(req.body);
    const validatedData = guardianSchema.parse(cleanedBody);

    // Phase 3.2: Use service method instead of direct prisma calls
    const guardian = await guardianService.createGuardian(validatedData);

    return sendCreated(res, guardian, 'Guardian created successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error.errors.map(e => ({ path: e.path.join('.'), message: e.message })));
    }

    const errorId = logControllerError('Create guardian', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to create guardian', errorId);
  }
};

// Update guardian
export const updateGuardian = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Clean empty strings before validation
    const cleanedBody = cleanEmptyStrings(req.body);
    const validatedData = updateGuardianSchema.parse(cleanedBody);

    // Phase 3.2: Use service method instead of direct prisma calls
    const guardian = await guardianService.updateGuardian(id, validatedData);

    if (!guardian) {
      return sendNotFound(res, 'Guardian');
    }

    return sendSuccess(res, guardian, 'Guardian updated successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendValidationError(res, error.errors.map(e => ({ path: e.path.join('.'), message: e.message })));
    }

    const errorId = logControllerError('Update guardian', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to update guardian', errorId);
  }
};

// Delete guardian
export const deleteGuardian = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Phase 3.2: Use service method instead of direct prisma call
    const result = await guardianService.deleteGuardian(id);

    if (!result) {
      return sendNotFound(res, 'Guardian');
    }

    return sendSuccess(res, null, 'Guardian deleted successfully');
  } catch (error) {
    const errorId = logControllerError('Delete guardian', error, {
      userId: req.user?.userId,
    });
    return sendServerError(res, 'Failed to delete guardian', errorId);
  }
};
