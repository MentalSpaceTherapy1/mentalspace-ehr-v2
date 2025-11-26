/**
 * Client Access Middleware
 *
 * HIPAA Compliance: Enforces row-level security for client data access.
 * Ensures users can only access clients they are authorized to see.
 */

import { Request, Response, NextFunction } from 'express';
import {
  assertCanAccessClient,
  assertCanAccessClinicalNote,
  assertCanAccessAppointment,
  assertCanAccessBillingData,
} from '../services/accessControl.service';

// =============================================================================
// TYPES
// =============================================================================

interface ClientAccessOptions {
  allowBillingView?: boolean;
  source?: 'params' | 'body' | 'query';
}

interface NoteAccessOptions {
  source?: 'params' | 'body' | 'query';
}

interface AppointmentAccessOptions {
  source?: 'params' | 'body' | 'query';
}

interface BillingAccessOptions {
  requireClientId?: boolean;
  source?: 'params' | 'body' | 'query';
}

// =============================================================================
// CLIENT ACCESS MIDDLEWARE
// =============================================================================

/**
 * Middleware to enforce client-level access control
 *
 * Usage:
 *   router.get('/:clientId', requireClientAccess('clientId'), handler);
 *   router.post('/', requireClientAccess('clientId', { source: 'body' }), handler);
 */
export const requireClientAccess = (
  key: string,
  options: ClientAccessOptions = {}
) => {
  const { allowBillingView = false, source = 'params' } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const container =
        source === 'body' ? req.body : source === 'query' ? req.query : req.params;
      const clientId = container[key];

      if (typeof clientId !== 'string' || !clientId) {
        return next();
      }

      await assertCanAccessClient(req.user, { clientId, allowBillingView });
      next();
    } catch (error) {
      next(error);
    }
  };
};

// =============================================================================
// CLINICAL NOTE ACCESS MIDDLEWARE
// =============================================================================

/**
 * Middleware to enforce clinical note access control
 *
 * IMPORTANT: Billing staff are automatically denied access to clinical notes.
 *
 * Usage:
 *   router.get('/:noteId', requireNoteAccess('noteId'), handler);
 *   router.get('/:id', requireNoteAccess('id'), handler);
 */
export const requireNoteAccess = (
  key: string = 'id',
  options: NoteAccessOptions = {}
) => {
  const { source = 'params' } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const container =
        source === 'body' ? req.body : source === 'query' ? req.query : req.params;
      const noteId = container[key];

      if (typeof noteId !== 'string' || !noteId) {
        return next();
      }

      await assertCanAccessClinicalNote(req.user, { noteId });
      next();
    } catch (error) {
      next(error);
    }
  };
};

// =============================================================================
// APPOINTMENT ACCESS MIDDLEWARE
// =============================================================================

/**
 * Middleware to enforce appointment access control
 *
 * Usage:
 *   router.get('/:appointmentId', requireAppointmentAccess('appointmentId'), handler);
 *   router.get('/:id', requireAppointmentAccess('id'), handler);
 */
export const requireAppointmentAccess = (
  key: string = 'id',
  options: AppointmentAccessOptions = {}
) => {
  const { source = 'params' } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const container =
        source === 'body' ? req.body : source === 'query' ? req.query : req.params;
      const appointmentId = container[key];

      if (typeof appointmentId !== 'string' || !appointmentId) {
        return next();
      }

      await assertCanAccessAppointment(req.user, { appointmentId });
      next();
    } catch (error) {
      next(error);
    }
  };
};

// =============================================================================
// BILLING ACCESS MIDDLEWARE
// =============================================================================

/**
 * Middleware to enforce billing data access control
 *
 * Usage:
 *   router.get('/billing', requireBillingAccess(), handler);
 *   router.get('/billing/:clientId', requireBillingAccess({ requireClientId: true }), handler);
 */
export const requireBillingAccess = (
  options: BillingAccessOptions = {}
) => {
  const { requireClientId = false, source = 'params' } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const container =
        source === 'body' ? req.body : source === 'query' ? req.query : req.params;
      const clientId = container.clientId;

      // If clientId is required but not provided, skip to next middleware
      if (requireClientId && (!clientId || typeof clientId !== 'string')) {
        return next();
      }

      await assertCanAccessBillingData(
        req.user,
        typeof clientId === 'string' ? clientId : undefined
      );
      next();
    } catch (error) {
      next(error);
    }
  };
};

// =============================================================================
// COMPOSITE MIDDLEWARE
// =============================================================================

/**
 * Middleware that checks access for a client via multiple possible fields
 *
 * Usage:
 *   router.post('/', requireClientAccessFromAny(['clientId', 'client_id']), handler);
 */
export const requireClientAccessFromAny = (
  keys: string[],
  options: ClientAccessOptions = {}
) => {
  const { allowBillingView = false } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Search in params, body, and query for any of the keys
      let clientId: string | undefined;

      for (const key of keys) {
        const fromParams = req.params[key];
        const fromBody = req.body?.[key];
        const fromQuery = req.query?.[key];

        clientId = fromParams || fromBody || (typeof fromQuery === 'string' ? fromQuery : undefined);
        if (clientId) break;
      }

      if (!clientId) {
        return next();
      }

      await assertCanAccessClient(req.user, { clientId, allowBillingView });
      next();
    } catch (error) {
      next(error);
    }
  };
};
