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
  role: z.enum(['ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'BILLING_STAFF', 'FRONT_DESK', 'ASSOCIATE']),
  licenseNumber: z.string().optional(),
  licenseState: z.string().optional(),
  licenseExpiration: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().datetime().optional()
  ),
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
  phoneNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseState: z.string().optional(),
  licenseExpiration: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().datetime().optional()
  ),
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

// Create User Schema (for admin creating users)
export const createUserSchema = z.object({
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
  role: z.enum(['ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'BILLING_STAFF', 'FRONT_DESK', 'ASSOCIATE']),
  npiNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseState: z.string().optional(),
  licenseExpiration: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().datetime('Invalid license expiration date').optional()
  ),
  phoneNumber: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Update User Admin Schema (for admin updating users)
export const updateUserAdminSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  title: z.string().optional(),
  role: z.enum(['ADMINISTRATOR', 'SUPERVISOR', 'CLINICIAN', 'BILLER', 'RECEPTIONIST']).optional(),
  npiNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseState: z.string().optional(),
  phoneNumber: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Reset Password Schema (for admin resetting user passwords)
export const resetPasswordSchema = z.object({
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

// Client Creation Schema (comprehensive fields for Phase 2)
export const createClientSchema = z.object({
  // Personal Information
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  suffix: z.string().optional(),
  preferredName: z.string().optional(),
  pronouns: z.string().optional(),

  // Date of Birth
  dateOfBirth: z.string().datetime('Invalid date of birth'),

  // Contact Information
  primaryPhone: z.string().min(1, 'Primary phone is required'),
  primaryPhoneType: z.string().default('Mobile'),
  secondaryPhone: z.string().optional(),
  secondaryPhoneType: z.string().optional(),
  email: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().email('Invalid email address').optional()
  ),
  preferredContactMethod: z.string().default('Phone'),
  okayToLeaveMessage: z.boolean().default(true),

  // Address (State is required for demographics)
  addressStreet1: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.string().min(1, 'Street address is required')
  ),
  addressStreet2: z.string().optional(),
  addressCity: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.string().min(1, 'City is required')
  ),
  addressState: z.string().min(1, 'State is required'),
  addressZipCode: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.string().min(1, 'ZIP code is required')
  ),
  addressCounty: z.string().optional(),

  // Demographics
  gender: z.enum(['MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY']).default('PREFER_NOT_TO_SAY'),
  genderIdentity: z.string().optional(),
  sexualOrientation: z.string().optional(),
  religion: z.string().optional(),
  maritalStatus: z.string().optional(),
  race: z.array(z.string()).default([]),
  ethnicity: z.string().optional(),
  primaryLanguage: z.string().default('English'),
  otherLanguages: z.array(z.string()).default([]),
  needsInterpreter: z.boolean().default(false),
  interpreterLanguage: z.string().optional(),

  // Assignment (Primary + up to 3 secondary therapists)
  primaryTherapistId: z.string().uuid('Invalid therapist ID'),
  secondaryTherapist1Id: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().uuid().optional()
  ),
  secondaryTherapist2Id: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().uuid().optional()
  ),
  secondaryTherapist3Id: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().uuid().optional()
  ),
  psychiatristId: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().uuid().optional()
  ),
  caseManagerId: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().uuid().optional()
  ),

  // Social Information
  education: z.string().optional(),
  employmentStatus: z.string().optional(),
  occupation: z.string().optional(),
  livingArrangement: z.string().optional(),
  housingStatus: z.string().optional(),

  // Legal Guardian (deprecated - moved to separate guardian table)
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  guardianRelationship: z.string().optional(),
});

// Client Update Schema
export const updateClientSchema = createClientSchema.partial();

// Appointment Creation Schema
export const createAppointmentSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  clinicianId: z.string().uuid('Invalid clinician ID'),
  appointmentDate: z.string().datetime('Invalid appointment date'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  duration: z.number().int().min(15).max(480, 'Duration must be between 15 and 480 minutes'),
  appointmentType: z.string().min(1, 'Appointment type is required'),
  serviceLocation: z.string().min(1, 'Service location is required'),
  officeLocationId: z.string().uuid().optional(),
  room: z.string().optional(),
  timezone: z.string().default('America/New_York'),
  cptCode: z.string().optional(),
  icdCodes: z.array(z.string()).optional(),
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
