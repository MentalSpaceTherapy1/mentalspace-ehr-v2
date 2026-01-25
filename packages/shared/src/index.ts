// Shared types and utilities for MentalSpace EHR

// Export all constants
export * from './constants';

// Export types
export * from './types';

export interface UserRolePermissions {
  canManageUsers: boolean;
  canManageClients: boolean;
  canManageAppointments: boolean;
  canViewReports: boolean;
}
