import { z } from 'zod';

// User Registration Schema
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  title: z.string().optional(),
  role: z.enum(['ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'BILLER', 'RECEPTIONIST']),
  licenseNumber: z.string().optional(),
  licenseState: z.string().optional(),
  licenseExpiration: z.string().datetime().optional(),
  npiNumber: z.string().optional(),
});

// User Login Schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Update User Schema
export const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  title: z.string().optional(),
  phone: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseState: z.string().optional(),
  licenseExpiration: z.string().datetime().optional(),
  npiNumber: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Change Password Schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
});

// Refresh Token Schema
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Client Creation Schema (subset of fields for initial creation)
export const createClientSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().datetime('Invalid date of birth'),
  gender: z.enum(['MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY']),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  primaryTherapistId: z.string().uuid('Invalid therapist ID'),
});

// Appointment Creation Schema
export const createAppointmentSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  clinicianId: z.string().uuid('Invalid clinician ID'),
  appointmentDate: z.string().datetime('Invalid appointment date'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  appointmentType: z.string().min(1, 'Appointment type is required'),
  notes: z.string().optional(),
});

// Export type helpers
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
