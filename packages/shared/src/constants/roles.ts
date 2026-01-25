/**
 * User Role Constants
 *
 * Defines all user roles used throughout the MentalSpace EHR system.
 * Use these constants instead of magic strings for type safety and consistency.
 */

export const UserRoles = {
  // Core roles
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMINISTRATOR: 'ADMINISTRATOR',
  CLINICAL_DIRECTOR: 'CLINICAL_DIRECTOR',
  SUPERVISOR: 'SUPERVISOR',
  CLINICIAN: 'CLINICIAN',
  BILLING_STAFF: 'BILLING_STAFF',
  FRONT_DESK: 'FRONT_DESK',
  SCHEDULER: 'SCHEDULER',
  ASSOCIATE: 'ASSOCIATE',
  INTERN: 'INTERN',
  OFFICE_MANAGER: 'OFFICE_MANAGER',
  CLIENT: 'CLIENT',
  PRACTICE_ADMIN: 'PRACTICE_ADMIN',
  // Legacy/alias roles (some parts of codebase use these)
  ADMIN: 'ADMINISTRATOR',
  THERAPIST: 'CLINICIAN',
  BILLING: 'BILLING_STAFF',
  RECEPTIONIST: 'FRONT_DESK',
} as const;

export type UserRole = (typeof UserRoles)[keyof typeof UserRoles];

/**
 * Role groups for permission checks
 */
export const RoleGroups = {
  // Roles with full super admin access
  SUPER_ADMIN_ROLES: [UserRoles.SUPER_ADMIN] as const,

  // Roles with full administrative access
  ADMIN_ROLES: [UserRoles.SUPER_ADMIN, UserRoles.ADMINISTRATOR] as const,

  // Roles that can supervise other clinicians
  SUPERVISOR_ROLES: [
    UserRoles.SUPER_ADMIN,
    UserRoles.ADMINISTRATOR,
    UserRoles.CLINICAL_DIRECTOR,
    UserRoles.SUPERVISOR,
  ] as const,

  // Roles that provide clinical services
  CLINICAL_ROLES: [
    UserRoles.SUPER_ADMIN,
    UserRoles.ADMINISTRATOR,
    UserRoles.CLINICAL_DIRECTOR,
    UserRoles.SUPERVISOR,
    UserRoles.CLINICIAN,
    UserRoles.ASSOCIATE,
  ] as const,

  // Roles that handle billing
  BILLING_ROLES: [
    UserRoles.SUPER_ADMIN,
    UserRoles.ADMINISTRATOR,
    UserRoles.BILLING_STAFF,
  ] as const,

  // Roles that handle front desk operations
  FRONT_DESK_ROLES: [
    UserRoles.SUPER_ADMIN,
    UserRoles.ADMINISTRATOR,
    UserRoles.FRONT_DESK,
    UserRoles.SCHEDULER,
  ] as const,

  // Roles that require supervision
  ASSOCIATE_ROLES: [
    UserRoles.SUPER_ADMIN,
    UserRoles.ADMINISTRATOR,
    UserRoles.CLINICAL_DIRECTOR,
    UserRoles.SUPERVISOR,
    UserRoles.ASSOCIATE,
    UserRoles.INTERN,
  ] as const,

  // Office management roles
  OFFICE_MANAGER_ROLES: [
    UserRoles.SUPER_ADMIN,
    UserRoles.ADMINISTRATOR,
    UserRoles.OFFICE_MANAGER,
  ] as const,

  // All staff roles (excludes clients/portal users)
  ALL_STAFF_ROLES: [
    UserRoles.SUPER_ADMIN,
    UserRoles.ADMINISTRATOR,
    UserRoles.CLINICAL_DIRECTOR,
    UserRoles.SUPERVISOR,
    UserRoles.CLINICIAN,
    UserRoles.BILLING_STAFF,
    UserRoles.FRONT_DESK,
    UserRoles.SCHEDULER,
    UserRoles.ASSOCIATE,
  ] as const,

  // Roles that can schedule appointments
  SCHEDULING_ROLES: [
    UserRoles.SUPER_ADMIN,
    UserRoles.ADMINISTRATOR,
    UserRoles.CLINICAL_DIRECTOR,
    UserRoles.SUPERVISOR,
    UserRoles.CLINICIAN,
    UserRoles.FRONT_DESK,
    UserRoles.SCHEDULER,
  ] as const,

  // Client portal roles
  CLIENT_ROLES: [UserRoles.CLIENT] as const,

  // Roles that can access client progress tracking
  PROGRESS_TRACKING_ROLES: [
    UserRoles.SUPER_ADMIN,
    UserRoles.ADMINISTRATOR,
    UserRoles.SUPERVISOR,
    UserRoles.CLINICIAN,
    UserRoles.CLIENT,
  ] as const,
} as const;

/**
 * Helper to check if a role is in a group
 */
export function hasRole(
  userRole: string | undefined,
  allowedRoles: readonly string[]
): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

/**
 * Helper to check if user has admin privileges
 */
export function isAdmin(userRole: string | undefined): boolean {
  return hasRole(userRole, RoleGroups.ADMIN_ROLES);
}

/**
 * Helper to check if user has supervisor privileges
 */
export function isSupervisor(userRole: string | undefined): boolean {
  return hasRole(userRole, RoleGroups.SUPERVISOR_ROLES);
}

/**
 * Helper to check if user is a clinical role
 */
export function isClinical(userRole: string | undefined): boolean {
  return hasRole(userRole, RoleGroups.CLINICAL_ROLES);
}
