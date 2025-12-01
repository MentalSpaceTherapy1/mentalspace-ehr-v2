import { Request } from 'express';
import { JwtPayload } from '../utils/jwt';

/**
 * Type for requests that have passed through authentication middleware
 * Use this type in controller functions that require authentication
 */
export interface AuthenticatedRequest extends Request {
  user: JwtPayload & { userId: string; roles: string[] };
  session?: {
    sessionId: string;
    token: string;
  };
}

/**
 * Type guard to assert request has authenticated user
 * Use in controllers after authentication middleware
 */
export function assertAuthenticated(req: Request): asserts req is AuthenticatedRequest {
  if (!req.user) {
    throw new Error('User not authenticated');
  }
}

/**
 * Helper to get user from request with non-null assertion
 * Only use in routes that have authentication middleware
 */
export function getAuthenticatedUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) {
    throw new Error('User not authenticated');
  }
  return req.user;
}
