/**
 * Row-Level Security (RLS) Middleware Tests
 *
 * Tests for HIPAA-compliant data access control
 */

import { Request, Response, NextFunction } from 'express';
import {
  buildRLSContext,
  canAccessClient,
  canAccessAppointment,
  canAccessClinicalNote,
  canAccessBillingData,
  buildClientFilter,
  buildAppointmentFilter,
  buildClinicalNoteFilter,
  attachRLSContext,
  enforceClientAccess,
  enforceAppointmentAccess,
  enforceClinicalNoteAccess,
  enforceBillingAccess,
  RLSContext,
  UserRole,
} from '../rowLevelSecurity';

// Mock Prisma
jest.mock('../../services/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    client: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    appointment: {
      findUnique: jest.fn(),
    },
    clinicalNote: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import prisma from '../../services/database';

describe('Row-Level Security Middleware', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // RLS Context Builder Tests
  // ==========================================================================
  describe('buildRLSContext', () => {
    it('should throw UnauthorizedError if user is not authenticated', async () => {
      const req = { user: null } as any;

      await expect(buildRLSContext(req)).rejects.toThrow('User not authenticated');
    });

    it('should build context for SUPER_ADMIN', async () => {
      const req = {
        user: {
          userId: 'user-123',
          roles: ['SUPER_ADMIN'],
        },
      } as any;

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        organizationId: 'org-123',
      });

      const context = await buildRLSContext(req);

      expect(context.userId).toBe('user-123');
      expect(context.roles).toContain('SUPER_ADMIN');
      expect(context.isSuperAdmin).toBe(true);
      expect(context.isAdmin).toBe(true);
      expect(context.organizationId).toBe('org-123');
    });

    it('should build context for CLINICIAN with assigned clients', async () => {
      const req = {
        user: {
          userId: 'clinician-123',
          roles: ['CLINICIAN'],
        },
      } as any;

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        organizationId: 'org-123',
      });

      (prisma.client.findMany as jest.Mock).mockResolvedValue([
        { id: 'client-1' },
        { id: 'client-2' },
        { id: 'client-3' },
      ]);

      const context = await buildRLSContext(req);

      expect(context.userId).toBe('clinician-123');
      expect(context.isClinicalStaff).toBe(true);
      expect(context.isAdmin).toBe(false);
      expect(context.allowedClientIds).toEqual(['client-1', 'client-2', 'client-3']);
    });

    it('should build context for SUPERVISOR with supervisee clients', async () => {
      const req = {
        user: {
          userId: 'supervisor-123',
          roles: ['SUPERVISOR'],
        },
      } as any;

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        organizationId: 'org-123',
      });

      (prisma.client.findMany as jest.Mock).mockResolvedValue([
        { id: 'client-1' },
        { id: 'client-2' },
        { id: 'supervisee-client-1' },
      ]);

      const context = await buildRLSContext(req);

      expect(context.roles).toContain('SUPERVISOR');
      expect(context.isClinicalStaff).toBe(true);
      expect(context.allowedClientIds).toHaveLength(3);
    });

    it('should build context for BILLING_STAFF', async () => {
      const req = {
        user: {
          userId: 'billing-123',
          roles: ['BILLING_STAFF'],
        },
      } as any;

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        organizationId: 'org-123',
      });

      const context = await buildRLSContext(req);

      expect(context.isBillingStaff).toBe(true);
      expect(context.isClinicalStaff).toBe(false);
      expect(context.allowedClientIds).toBeUndefined();
    });
  });

  // ==========================================================================
  // Client Access Tests
  // ==========================================================================
  describe('canAccessClient', () => {
    it('should allow SUPER_ADMIN to access any client', async () => {
      const context: RLSContext = {
        userId: 'admin-123',
        roles: ['SUPER_ADMIN'],
        isSuperAdmin: true,
        isAdmin: true,
        isClinicalStaff: false,
        isBillingStaff: false,
      };

      const result = await canAccessClient(context, 'any-client-id');
      expect(result).toBe(true);
    });

    it('should allow ADMINISTRATOR to access clients in their organization', async () => {
      const context: RLSContext = {
        userId: 'admin-123',
        roles: ['ADMINISTRATOR'],
        organizationId: 'org-123',
        isSuperAdmin: false,
        isAdmin: true,
        isClinicalStaff: false,
        isBillingStaff: false,
      };

      (prisma.client.findUnique as jest.Mock).mockResolvedValue({
        organizationId: 'org-123',
      });

      const result = await canAccessClient(context, 'client-123');
      expect(result).toBe(true);
    });

    it('should deny ADMINISTRATOR access to clients in other organizations', async () => {
      const context: RLSContext = {
        userId: 'admin-123',
        roles: ['ADMINISTRATOR'],
        organizationId: 'org-123',
        isSuperAdmin: false,
        isAdmin: true,
        isClinicalStaff: false,
        isBillingStaff: false,
      };

      (prisma.client.findUnique as jest.Mock).mockResolvedValue({
        organizationId: 'other-org',
      });

      const result = await canAccessClient(context, 'client-456');
      expect(result).toBe(false);
    });

    it('should allow CLINICIAN to access assigned clients only', async () => {
      const context: RLSContext = {
        userId: 'clinician-123',
        roles: ['CLINICIAN'],
        organizationId: 'org-123',
        allowedClientIds: ['client-1', 'client-2', 'client-3'],
        isSuperAdmin: false,
        isAdmin: false,
        isClinicalStaff: true,
        isBillingStaff: false,
      };

      expect(await canAccessClient(context, 'client-2')).toBe(true);
      expect(await canAccessClient(context, 'client-999')).toBe(false);
    });

    it('should allow BILLING_STAFF access for billing purposes', async () => {
      const context: RLSContext = {
        userId: 'billing-123',
        roles: ['BILLING_STAFF'],
        organizationId: 'org-123',
        isSuperAdmin: false,
        isAdmin: false,
        isClinicalStaff: false,
        isBillingStaff: true,
      };

      const result = await canAccessClient(context, 'any-client');
      expect(result).toBe(true);
    });
  });

  // ==========================================================================
  // Appointment Access Tests
  // ==========================================================================
  describe('canAccessAppointment', () => {
    it('should allow SUPER_ADMIN to access any appointment', async () => {
      const context: RLSContext = {
        userId: 'admin-123',
        roles: ['SUPER_ADMIN'],
        isSuperAdmin: true,
        isAdmin: true,
        isClinicalStaff: false,
        isBillingStaff: false,
      };

      const result = await canAccessAppointment(context, 'any-appointment-id');
      expect(result).toBe(true);
    });

    it('should allow CLINICIAN to access their own appointments', async () => {
      const context: RLSContext = {
        userId: 'clinician-123',
        roles: ['CLINICIAN'],
        organizationId: 'org-123',
        allowedClientIds: ['client-1'],
        isSuperAdmin: false,
        isAdmin: false,
        isClinicalStaff: true,
        isBillingStaff: false,
      };

      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue({
        clientId: 'client-1',
        clinicianId: 'clinician-123',
        organizationId: 'org-123',
      });

      const result = await canAccessAppointment(context, 'appointment-123');
      expect(result).toBe(true);
    });

    it('should allow FRONT_DESK to access appointments for scheduling', async () => {
      const context: RLSContext = {
        userId: 'frontdesk-123',
        roles: ['FRONT_DESK'],
        organizationId: 'org-123',
        isSuperAdmin: false,
        isAdmin: false,
        isClinicalStaff: false,
        isBillingStaff: false,
      };

      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue({
        clientId: 'client-1',
        clinicianId: 'clinician-123',
        organizationId: 'org-123',
      });

      const result = await canAccessAppointment(context, 'appointment-123');
      expect(result).toBe(true);
    });

    it('should deny access to non-existent appointments', async () => {
      const context: RLSContext = {
        userId: 'clinician-123',
        roles: ['CLINICIAN'],
        organizationId: 'org-123',
        allowedClientIds: [],
        isSuperAdmin: false,
        isAdmin: false,
        isClinicalStaff: true,
        isBillingStaff: false,
      };

      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await canAccessAppointment(context, 'non-existent');
      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // Clinical Note Access Tests
  // ==========================================================================
  describe('canAccessClinicalNote', () => {
    it('should allow CLINICIAN to access notes for their assigned clients', async () => {
      const context: RLSContext = {
        userId: 'clinician-123',
        roles: ['CLINICIAN'],
        organizationId: 'org-123',
        allowedClientIds: ['client-1', 'client-2'],
        isSuperAdmin: false,
        isAdmin: false,
        isClinicalStaff: true,
        isBillingStaff: false,
      };

      (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue({
        clientId: 'client-1',
        clinicianId: 'other-clinician',
        client: { organizationId: 'org-123' },
      });

      const result = await canAccessClinicalNote(context, 'note-123');
      expect(result).toBe(true);
    });

    it('should deny BILLING_STAFF access to clinical notes', async () => {
      const context: RLSContext = {
        userId: 'billing-123',
        roles: ['BILLING_STAFF'],
        organizationId: 'org-123',
        isSuperAdmin: false,
        isAdmin: false,
        isClinicalStaff: false,
        isBillingStaff: true,
      };

      (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue({
        clientId: 'client-1',
        clinicianId: 'clinician-123',
        client: { organizationId: 'org-123' },
      });

      const result = await canAccessClinicalNote(context, 'note-123');
      expect(result).toBe(false);
    });

    it('should allow CLINICAL_DIRECTOR to access all notes in organization', async () => {
      const context: RLSContext = {
        userId: 'director-123',
        roles: ['CLINICAL_DIRECTOR'],
        organizationId: 'org-123',
        allowedClientIds: [],
        isSuperAdmin: false,
        isAdmin: false,
        isClinicalStaff: true,
        isBillingStaff: false,
      };

      (prisma.clinicalNote.findUnique as jest.Mock).mockResolvedValue({
        clientId: 'client-1',
        clinicianId: 'director-123',
        client: { organizationId: 'org-123' },
      });

      const result = await canAccessClinicalNote(context, 'note-123');
      expect(result).toBe(true);
    });
  });

  // ==========================================================================
  // Billing Data Access Tests
  // ==========================================================================
  describe('canAccessBillingData', () => {
    it('should allow BILLING_STAFF to access billing data', async () => {
      const context: RLSContext = {
        userId: 'billing-123',
        roles: ['BILLING_STAFF'],
        organizationId: 'org-123',
        isSuperAdmin: false,
        isAdmin: false,
        isClinicalStaff: false,
        isBillingStaff: true,
      };

      const result = await canAccessBillingData(context);
      expect(result).toBe(true);
    });

    it('should allow ADMINISTRATOR to access billing data', async () => {
      const context: RLSContext = {
        userId: 'admin-123',
        roles: ['ADMINISTRATOR'],
        organizationId: 'org-123',
        isSuperAdmin: false,
        isAdmin: true,
        isClinicalStaff: false,
        isBillingStaff: false,
      };

      const result = await canAccessBillingData(context);
      expect(result).toBe(true);
    });

    it('should allow CLINICIAN to access billing for their assigned clients', async () => {
      const context: RLSContext = {
        userId: 'clinician-123',
        roles: ['CLINICIAN'],
        organizationId: 'org-123',
        allowedClientIds: ['client-1', 'client-2'],
        isSuperAdmin: false,
        isAdmin: false,
        isClinicalStaff: true,
        isBillingStaff: false,
      };

      expect(await canAccessBillingData(context, 'client-1')).toBe(true);
      expect(await canAccessBillingData(context, 'client-999')).toBe(false);
    });

    it('should deny FRONT_DESK access to billing data', async () => {
      const context: RLSContext = {
        userId: 'frontdesk-123',
        roles: ['FRONT_DESK'],
        organizationId: 'org-123',
        isSuperAdmin: false,
        isAdmin: false,
        isClinicalStaff: false,
        isBillingStaff: false,
      };

      const result = await canAccessBillingData(context);
      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // Query Filter Tests
  // ==========================================================================
  describe('buildClientFilter', () => {
    it('should return empty filter for SUPER_ADMIN', () => {
      const context: RLSContext = {
        userId: 'admin-123',
        roles: ['SUPER_ADMIN'],
        isSuperAdmin: true,
        isAdmin: true,
        isClinicalStaff: false,
        isBillingStaff: false,
      };

      const filter = buildClientFilter(context);
      expect(filter).toEqual({});
    });

    it('should filter by organization for ADMINISTRATOR', () => {
      const context: RLSContext = {
        userId: 'admin-123',
        roles: ['ADMINISTRATOR'],
        organizationId: 'org-123',
        isSuperAdmin: false,
        isAdmin: true,
        isClinicalStaff: false,
        isBillingStaff: false,
      };

      const filter = buildClientFilter(context);
      expect(filter).toEqual({ organizationId: 'org-123' });
    });

    it('should filter by allowed client IDs for CLINICIAN', () => {
      const context: RLSContext = {
        userId: 'clinician-123',
        roles: ['CLINICIAN'],
        organizationId: 'org-123',
        allowedClientIds: ['client-1', 'client-2'],
        isSuperAdmin: false,
        isAdmin: false,
        isClinicalStaff: true,
        isBillingStaff: false,
      };

      const filter = buildClientFilter(context);
      expect(filter).toEqual({ id: { in: ['client-1', 'client-2'] } });
    });

    it('should return empty array filter for unauthorized roles', () => {
      const context: RLSContext = {
        userId: 'unknown-123',
        roles: [],
        isSuperAdmin: false,
        isAdmin: false,
        isClinicalStaff: false,
        isBillingStaff: false,
      };

      const filter = buildClientFilter(context);
      expect(filter).toEqual({ id: { in: [] } });
    });
  });

  describe('buildAppointmentFilter', () => {
    it('should return OR filter for CLINICIAN', () => {
      const context: RLSContext = {
        userId: 'clinician-123',
        roles: ['CLINICIAN'],
        organizationId: 'org-123',
        allowedClientIds: ['client-1', 'client-2'],
        isSuperAdmin: false,
        isAdmin: false,
        isClinicalStaff: true,
        isBillingStaff: false,
      };

      const filter = buildAppointmentFilter(context);
      expect(filter.OR).toBeDefined();
      expect(filter.OR).toContainEqual({ clinicianId: 'clinician-123' });
      expect(filter.OR).toContainEqual({ clientId: { in: ['client-1', 'client-2'] } });
    });
  });

  describe('buildClinicalNoteFilter', () => {
    it('should return empty array filter for BILLING_STAFF', () => {
      const context: RLSContext = {
        userId: 'billing-123',
        roles: ['BILLING_STAFF'],
        organizationId: 'org-123',
        isSuperAdmin: false,
        isAdmin: false,
        isClinicalStaff: false,
        isBillingStaff: true,
      };

      const filter = buildClinicalNoteFilter(context);
      expect(filter).toEqual({ id: { in: [] } });
    });

    it('should filter by organization for ADMINISTRATOR', () => {
      const context: RLSContext = {
        userId: 'admin-123',
        roles: ['ADMINISTRATOR'],
        organizationId: 'org-123',
        isSuperAdmin: false,
        isAdmin: true,
        isClinicalStaff: false,
        isBillingStaff: false,
      };

      const filter = buildClinicalNoteFilter(context);
      expect(filter).toEqual({ client: { organizationId: 'org-123' } });
    });
  });

  // ==========================================================================
  // Express Middleware Tests
  // ==========================================================================
  describe('attachRLSContext middleware', () => {
    it('should attach RLS context to request', async () => {
      const req = {
        user: {
          userId: 'user-123',
          roles: ['CLINICIAN'],
        },
      } as any;
      const res = {} as Response;
      const next = jest.fn();

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        organizationId: 'org-123',
      });

      (prisma.client.findMany as jest.Mock).mockResolvedValue([
        { id: 'client-1' },
      ]);

      await attachRLSContext(req, res, next);

      expect((req as any).rlsContext).toBeDefined();
      expect((req as any).rlsContext.userId).toBe('user-123');
      expect(next).toHaveBeenCalled();
    });

    it('should call next without context if user not authenticated', async () => {
      const req = { user: null } as any;
      const res = {} as Response;
      const next = jest.fn();

      await attachRLSContext(req, res, next);

      expect((req as any).rlsContext).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('enforceClientAccess middleware', () => {
    it('should allow access when user has permission', async () => {
      const req = {
        user: {
          userId: 'clinician-123',
          roles: ['CLINICIAN'],
        },
        params: { clientId: 'client-1' },
        body: {},
        query: {},
      } as any;
      const res = {} as Response;
      const next = jest.fn();

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        organizationId: 'org-123',
      });

      (prisma.client.findMany as jest.Mock).mockResolvedValue([
        { id: 'client-1' },
      ]);

      const middleware = enforceClientAccess();
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should deny access when user lacks permission', async () => {
      const req = {
        user: {
          userId: 'clinician-123',
          roles: ['CLINICIAN'],
        },
        params: { clientId: 'client-999' },
        body: {},
        query: {},
      } as any;
      const res = {} as Response;
      const next = jest.fn();

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        organizationId: 'org-123',
      });

      (prisma.client.findMany as jest.Mock).mockResolvedValue([
        { id: 'client-1' },
      ]);

      const middleware = enforceClientAccess();
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should skip check if no clientId in request', async () => {
      const req = {
        user: {
          userId: 'clinician-123',
          roles: ['CLINICIAN'],
        },
        params: {},
        body: {},
        query: {},
      } as any;
      const res = {} as Response;
      const next = jest.fn();

      const middleware = enforceClientAccess();
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('enforceBillingAccess middleware', () => {
    it('should allow BILLING_STAFF access', async () => {
      const req = {
        user: {
          userId: 'billing-123',
          roles: ['BILLING_STAFF'],
        },
        params: {},
        body: {},
        query: {},
      } as any;
      const res = {} as Response;
      const next = jest.fn();

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        organizationId: 'org-123',
      });

      await enforceBillingAccess(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should deny FRONT_DESK access to billing', async () => {
      const req = {
        user: {
          userId: 'frontdesk-123',
          roles: ['FRONT_DESK'],
        },
        params: {},
        body: {},
        query: {},
      } as any;
      const res = {} as Response;
      const next = jest.fn();

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        organizationId: 'org-123',
      });

      await enforceBillingAccess(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle user with multiple roles', async () => {
      const req = {
        user: {
          userId: 'multi-role-123',
          roles: ['CLINICIAN', 'BILLING_STAFF'],
        },
      } as any;

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        organizationId: 'org-123',
      });

      (prisma.client.findMany as jest.Mock).mockResolvedValue([
        { id: 'client-1' },
      ]);

      const context = await buildRLSContext(req);

      expect(context.isClinicalStaff).toBe(true);
      expect(context.isBillingStaff).toBe(true);
    });

    it('should handle user without organization', async () => {
      const req = {
        user: {
          userId: 'user-123',
          roles: ['CLINICIAN'],
        },
      } as any;

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        organizationId: null,
      });

      (prisma.client.findMany as jest.Mock).mockResolvedValue([]);

      const context = await buildRLSContext(req);

      expect(context.organizationId).toBeUndefined();
    });

    it('should handle single role string instead of array', async () => {
      const req = {
        user: {
          userId: 'user-123',
          role: 'ADMINISTRATOR',
        },
      } as any;

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        organizationId: 'org-123',
      });

      const context = await buildRLSContext(req);

      expect(context.roles).toContain('ADMINISTRATOR');
      expect(context.isAdmin).toBe(true);
    });
  });
});
