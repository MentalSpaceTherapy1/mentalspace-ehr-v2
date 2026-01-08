import { z } from 'zod';

/**
 * Validation schemas for PTO (Paid Time Off) endpoints
 */

// Create PTO Request Schema
export const createPTORequestSchema = z.object({
  startDate: z.string().datetime({ message: 'Start date must be a valid ISO datetime' }),
  endDate: z.string().datetime({ message: 'End date must be a valid ISO datetime' }),
  requestType: z.enum(['VACATION', 'SICK', 'PERSONAL', 'BEREAVEMENT', 'OTHER'], {
    errorMap: () => ({ message: 'Request type must be VACATION, SICK, PERSONAL, BEREAVEMENT, or OTHER' })
  }),
  reason: z.string().max(500, 'Reason must be 500 characters or less').optional(),
  totalDays: z.number()
    .positive('Total days must be positive')
    .max(365, 'Total days cannot exceed 365'),
}).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  { message: 'End date must be on or after start date', path: ['endDate'] }
);

// Update PTO Request Schema
export const updatePTORequestSchema = z.object({
  startDate: z.string().datetime({ message: 'Start date must be a valid ISO datetime' }).optional(),
  endDate: z.string().datetime({ message: 'End date must be a valid ISO datetime' }).optional(),
  requestType: z.enum(['VACATION', 'SICK', 'PERSONAL', 'BEREAVEMENT', 'OTHER']).optional(),
  reason: z.string().max(500, 'Reason must be 500 characters or less').optional(),
  totalDays: z.number().positive().max(365).optional(),
});

// Approve/Deny PTO Schema
export const approveDenyPTOSchema = z.object({
  approvalNotes: z.string().max(500, 'Approval notes must be 500 characters or less').optional(),
});

// Deny PTO Schema (notes required)
export const denyPTOSchema = z.object({
  approvalNotes: z.string()
    .min(1, 'Denial reason is required')
    .max(500, 'Denial reason must be 500 characters or less'),
});

// Update PTO Balance Schema
export const updatePTOBalanceSchema = z.object({
  ptoBalance: z.number().min(0, 'PTO balance cannot be negative').optional(),
  sickBalance: z.number().min(0, 'Sick balance cannot be negative').optional(),
  personalBalance: z.number().min(0, 'Personal balance cannot be negative').optional(),
  carryoverBalance: z.number().min(0, 'Carryover balance cannot be negative').optional(),
});

// PTO Calendar Query Schema
export const ptoCalendarQuerySchema = z.object({
  startDate: z.string().datetime({ message: 'Start date must be a valid ISO datetime' }),
  endDate: z.string().datetime({ message: 'End date must be a valid ISO datetime' }),
}).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  { message: 'End date must be on or after start date', path: ['endDate'] }
);

// UUID param validation
export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export const userIdParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});
