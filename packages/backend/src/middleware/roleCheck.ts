/**
 * Role Check Middleware
 *
 * Exports requireRole as an alias to the authorize middleware
 * for consistency with route definitions
 */

import { authorize } from './auth';

/**
 * Middleware to require specific roles
 * User must have at least ONE of the required roles
 *
 * @param requiredRoles - Array of role names (e.g., ['ADMIN', 'CLINICIAN'])
 */
export const requireRole = (requiredRoles: string[]) => {
  return authorize(...requiredRoles);
};
