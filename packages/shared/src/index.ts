// Shared types and utilities for MentalSpace EHR

export interface UserRolePermissions {
  canManageUsers: boolean;
  canManageClients: boolean;
  canManageAppointments: boolean;
  canViewReports: boolean;
}

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  CLINICIAN: 'CLINICIAN',
  SUPPORT_STAFF: 'SUPPORT_STAFF',
  BILLING: 'BILLING',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
