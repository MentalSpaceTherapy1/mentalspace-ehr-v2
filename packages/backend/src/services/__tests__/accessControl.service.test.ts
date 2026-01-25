/**
 * Access Control Service Tests
 *
 * HIPAA Compliance: Tests for the "Minimum Necessary" principle
 * ensuring proper role-based access control and data scoping.
 */

import {
  isSuperAdmin,
  isAdministrator,
  isSupervisor,
  isClinicalDirector,
  isClinician,
  isIntern,
  isBillingStaff,
  isFrontDesk,
  isClinicalStaff,
  hasSchedulingAccess,
  buildRLSContext,
  assertCanAccessClient,
  applyClientScope,
  applyAppointmentScope,
  applyClinicalNoteScope,
} from '../accessControl.service';
import { JwtPayload } from '../../utils/jwt';
import { UserRoles } from '@mentalspace/shared';

// Mock dependencies
jest.mock('../database', () => ({
  __esModule: true,
  default: {
    client: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    appointment: {
      findFirst: jest.fn(),
    },
    clinicalNote: {
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import prisma from '../database';

// Helper to create mock users with specific roles
const createMockUser = (role: string, overrides = {}): JwtPayload => ({
  userId: 'user-123',
  id: 'user-123',
  email: 'user@example.com',
  organizationId: 'org-123',
  role,
  roles: [role],
  ...overrides,
} as any);

describe('Access Control Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // ROLE CHECK TESTS
  // ==========================================================================

  describe('Role Check Functions', () => {
    describe('isSuperAdmin', () => {
      it('should return true for SUPER_ADMIN role', () => {
        const user = createMockUser(UserRoles.SUPER_ADMIN);
        expect(isSuperAdmin(user)).toBe(true);
      });

      it('should return false for other roles', () => {
        const user = createMockUser(UserRoles.ADMINISTRATOR);
        expect(isSuperAdmin(user)).toBe(false);
      });

      it('should return false for undefined user', () => {
        expect(isSuperAdmin(undefined)).toBe(false);
      });
    });

    describe('isAdministrator', () => {
      it('should return true for SUPER_ADMIN', () => {
        const user = createMockUser(UserRoles.SUPER_ADMIN);
        expect(isAdministrator(user)).toBe(true);
      });

      it('should return true for ADMINISTRATOR', () => {
        const user = createMockUser(UserRoles.ADMINISTRATOR);
        expect(isAdministrator(user)).toBe(true);
      });

      it('should return false for CLINICIAN', () => {
        const user = createMockUser(UserRoles.CLINICIAN);
        expect(isAdministrator(user)).toBe(false);
      });
    });

    describe('isSupervisor', () => {
      it('should return true for SUPERVISOR role', () => {
        const user = createMockUser(UserRoles.SUPERVISOR);
        expect(isSupervisor(user)).toBe(true);
      });

      it('should return false for CLINICIAN', () => {
        const user = createMockUser(UserRoles.CLINICIAN);
        expect(isSupervisor(user)).toBe(false);
      });
    });

    describe('isClinicalDirector', () => {
      it('should return true for CLINICAL_DIRECTOR', () => {
        const user = createMockUser(UserRoles.CLINICAL_DIRECTOR);
        expect(isClinicalDirector(user)).toBe(true);
      });
    });

    describe('isClinician', () => {
      it('should return true for CLINICIAN', () => {
        const user = createMockUser(UserRoles.CLINICIAN);
        expect(isClinician(user)).toBe(true);
      });
    });

    describe('isIntern', () => {
      it('should return true for INTERN', () => {
        const user = createMockUser(UserRoles.INTERN);
        expect(isIntern(user)).toBe(true);
      });
    });

    describe('isBillingStaff', () => {
      it('should return true for BILLING_STAFF', () => {
        const user = createMockUser(UserRoles.BILLING_STAFF);
        expect(isBillingStaff(user)).toBe(true);
      });

      it('should return true for OFFICE_MANAGER', () => {
        const user = createMockUser(UserRoles.OFFICE_MANAGER);
        expect(isBillingStaff(user)).toBe(true);
      });

      it('should return false for CLINICIAN', () => {
        const user = createMockUser(UserRoles.CLINICIAN);
        expect(isBillingStaff(user)).toBe(false);
      });
    });

    describe('isFrontDesk', () => {
      it('should return true for FRONT_DESK', () => {
        const user = createMockUser(UserRoles.FRONT_DESK);
        expect(isFrontDesk(user)).toBe(true);
      });

      it('should return true for SCHEDULER', () => {
        const user = createMockUser(UserRoles.SCHEDULER);
        expect(isFrontDesk(user)).toBe(true);
      });

      it('should return true for RECEPTIONIST', () => {
        const user = createMockUser(UserRoles.RECEPTIONIST);
        expect(isFrontDesk(user)).toBe(true);
      });
    });

    describe('isClinicalStaff', () => {
      it('should return true for CLINICAL_DIRECTOR', () => {
        const user = createMockUser(UserRoles.CLINICAL_DIRECTOR);
        expect(isClinicalStaff(user)).toBe(true);
      });

      it('should return true for SUPERVISOR', () => {
        const user = createMockUser(UserRoles.SUPERVISOR);
        expect(isClinicalStaff(user)).toBe(true);
      });

      it('should return true for CLINICIAN', () => {
        const user = createMockUser(UserRoles.CLINICIAN);
        expect(isClinicalStaff(user)).toBe(true);
      });

      it('should return true for INTERN', () => {
        const user = createMockUser(UserRoles.INTERN);
        expect(isClinicalStaff(user)).toBe(true);
      });

      it('should return false for BILLING_STAFF', () => {
        const user = createMockUser(UserRoles.BILLING_STAFF);
        expect(isClinicalStaff(user)).toBe(false);
      });
    });

    describe('hasSchedulingAccess', () => {
      it('should return true for FRONT_DESK', () => {
        const user = createMockUser(UserRoles.FRONT_DESK);
        expect(hasSchedulingAccess(user)).toBe(true);
      });

      it('should return true for clinical roles', () => {
        expect(hasSchedulingAccess(createMockUser(UserRoles.CLINICIAN))).toBe(true);
        expect(hasSchedulingAccess(createMockUser(UserRoles.SUPERVISOR))).toBe(true);
      });

      it('should return true for admin roles', () => {
        expect(hasSchedulingAccess(createMockUser(UserRoles.ADMINISTRATOR))).toBe(true);
      });

      it('should return false for BILLING_STAFF', () => {
        const user = createMockUser(UserRoles.BILLING_STAFF);
        expect(hasSchedulingAccess(user)).toBe(false);
      });
    });
  });

  // ==========================================================================
  // RLS CONTEXT TESTS
  // ==========================================================================

  describe('buildRLSContext', () => {
    it('should throw UnauthorizedError for undefined user', async () => {
      await expect(buildRLSContext(undefined)).rejects.toThrow('Authentication required');
    });

    it('should build context for admin user without client restrictions', async () => {
      const user = createMockUser(UserRoles.ADMINISTRATOR);

      const context = await buildRLSContext(user);

      expect(context.isAdmin).toBe(true);
      expect(context.allowedClientIds).toBeUndefined();
    });

    it('should build context with allowed client IDs for clinician', async () => {
      const user = createMockUser(UserRoles.CLINICIAN);

      (prisma.client.findMany as jest.Mock).mockResolvedValue([
        { id: 'client-1' },
        { id: 'client-2' },
      ]);

      const context = await buildRLSContext(user);

      expect(context.isClinicalStaff).toBe(true);
      expect(context.allowedClientIds).toEqual(['client-1', 'client-2']);
    });

    it('should include supervisees clients for supervisor', async () => {
      const user = createMockUser(UserRoles.SUPERVISOR);

      (prisma.client.findMany as jest.Mock).mockResolvedValue([
        { id: 'client-1' },
        { id: 'client-2' },
        { id: 'supervisee-client-1' },
      ]);

      const context = await buildRLSContext(user);

      expect(context.allowedClientIds).toHaveLength(3);
    });
  });

  // ==========================================================================
  // CLIENT ACCESS TESTS
  // ==========================================================================

  describe('assertCanAccessClient', () => {
    it('should allow admin to access any client', async () => {
      const user = createMockUser(UserRoles.ADMINISTRATOR);

      await expect(
        assertCanAccessClient(user, { clientId: 'any-client-123' })
      ).resolves.not.toThrow();
    });

    it('should allow clinician to access their assigned client', async () => {
      const user = createMockUser(UserRoles.CLINICIAN);

      (prisma.client.findUnique as jest.Mock).mockResolvedValue({
        id: 'client-123',
        primaryTherapistId: 'user-123',
      });

      await expect(
        assertCanAccessClient(user, { clientId: 'client-123' })
      ).resolves.not.toThrow();
    });

    it('should deny clinician access to non-assigned client', async () => {
      const user = createMockUser(UserRoles.CLINICIAN);

      (prisma.client.findUnique as jest.Mock).mockResolvedValue({
        id: 'client-123',
        primaryTherapistId: 'other-clinician',
        secondaryTherapistId: null,
      });

      await expect(
        assertCanAccessClient(user, { clientId: 'client-123' })
      ).rejects.toThrow();
    });

    it('should allow supervisor to access supervisee client', async () => {
      const user = createMockUser(UserRoles.SUPERVISOR);

      (prisma.client.findUnique as jest.Mock).mockResolvedValue({
        id: 'client-123',
        primaryTherapistId: 'supervisee-id',
        primaryTherapist: {
          supervisorId: 'user-123',
        },
      });

      await expect(
        assertCanAccessClient(user, { clientId: 'client-123' })
      ).resolves.not.toThrow();
    });

    it('should allow billing view access for billing staff', async () => {
      const user = createMockUser(UserRoles.BILLING_STAFF);

      await expect(
        assertCanAccessClient(user, { clientId: 'client-123', allowBillingView: true })
      ).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // SCOPE APPLICATION TESTS
  // ==========================================================================

  describe('applyClientScope', () => {
    it('should not add filters for admin', async () => {
      const user = createMockUser(UserRoles.ADMINISTRATOR);
      const baseWhere = { status: 'ACTIVE' };

      const scopedWhere = await applyClientScope(user, baseWhere);

      // Admin should not have additional client restrictions
      expect(scopedWhere).toEqual(expect.objectContaining({ status: 'ACTIVE' }));
    });

    it('should add client ID filter for clinician', async () => {
      const user = createMockUser(UserRoles.CLINICIAN);
      const baseWhere = { status: 'ACTIVE' };

      (prisma.client.findMany as jest.Mock).mockResolvedValue([
        { id: 'client-1' },
        { id: 'client-2' },
      ]);

      const scopedWhere = await applyClientScope(user, baseWhere);

      expect(scopedWhere).toEqual(
        expect.objectContaining({
          status: 'ACTIVE',
          id: { in: ['client-1', 'client-2'] },
        })
      );
    });
  });

  describe('applyAppointmentScope', () => {
    it('should not add filters for admin', async () => {
      const user = createMockUser(UserRoles.ADMINISTRATOR);
      const baseWhere = { status: 'SCHEDULED' };

      const scopedWhere = await applyAppointmentScope(user, baseWhere);

      expect(scopedWhere).toEqual(expect.objectContaining({ status: 'SCHEDULED' }));
    });

    it('should filter by clinician ID for non-admin clinicians', async () => {
      const user = createMockUser(UserRoles.CLINICIAN);
      const baseWhere = { status: 'SCHEDULED' };

      const scopedWhere = await applyAppointmentScope(user, baseWhere);

      expect(scopedWhere).toEqual(
        expect.objectContaining({
          status: 'SCHEDULED',
          clinicianId: 'user-123',
        })
      );
    });

    it('should allow billing view to see all appointments', async () => {
      const user = createMockUser(UserRoles.BILLING_STAFF);
      const baseWhere = { status: 'COMPLETED' };

      const scopedWhere = await applyAppointmentScope(user, baseWhere, { allowBillingView: true });

      // Billing should see all without clinician filter when allowBillingView is true
      expect(scopedWhere).toEqual(expect.objectContaining({ status: 'COMPLETED' }));
    });
  });

  describe('applyClinicalNoteScope', () => {
    it('should not add filters for clinical director', async () => {
      const user = createMockUser(UserRoles.CLINICAL_DIRECTOR);
      const baseWhere = { status: 'DRAFT' };

      const scopedWhere = await applyClinicalNoteScope(user, baseWhere);

      expect(scopedWhere).toEqual(expect.objectContaining({ status: 'DRAFT' }));
    });

    it('should filter by clinician ID for regular clinicians', async () => {
      const user = createMockUser(UserRoles.CLINICIAN);
      const baseWhere = { status: 'DRAFT' };

      const scopedWhere = await applyClinicalNoteScope(user, baseWhere);

      expect(scopedWhere).toEqual(
        expect.objectContaining({
          status: 'DRAFT',
          clinicianId: 'user-123',
        })
      );
    });

    it('should deny access to billing staff for clinical notes', async () => {
      const user = createMockUser(UserRoles.BILLING_STAFF);
      const baseWhere = {};

      await expect(applyClinicalNoteScope(user, baseWhere)).rejects.toThrow();
    });
  });

  // ==========================================================================
  // HIPAA MINIMUM NECESSARY PRINCIPLE
  // ==========================================================================

  describe('HIPAA Minimum Necessary Principle', () => {
    it('should restrict clinician to only their clients', async () => {
      const user = createMockUser('CLINICIAN', { userId: 'clinician-1' });

      (prisma.client.findMany as jest.Mock).mockResolvedValue([
        { id: 'assigned-client-1' },
        { id: 'assigned-client-2' },
      ]);

      const context = await buildRLSContext(user);

      expect(context.allowedClientIds).toHaveLength(2);
      expect(context.allowedClientIds).toContain('assigned-client-1');
      expect(context.allowedClientIds).not.toContain('unassigned-client');
    });

    it('should allow supervisor to access supervisees clients', async () => {
      const user = createMockUser('SUPERVISOR', { userId: 'supervisor-1' });

      (prisma.client.findMany as jest.Mock).mockResolvedValue([
        { id: 'own-client' },
        { id: 'supervisee-client-1' },
        { id: 'supervisee-client-2' },
      ]);

      const context = await buildRLSContext(user);

      expect(context.allowedClientIds).toHaveLength(3);
    });

    it('should prevent data leakage across organizations', async () => {
      const user = createMockUser('CLINICIAN', { organizationId: 'org-1' });
      const baseWhere = {};

      const scopedWhere = await applyClientScope(user, baseWhere);

      // Organization filter should be applied
      expect(scopedWhere).toHaveProperty('organizationId', 'org-1');
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle user with multiple roles', async () => {
      const user = {
        userId: 'user-123',
        id: 'user-123',
        email: 'multi@example.com',
        organizationId: 'org-123',
        roles: ['CLINICIAN', 'SUPERVISOR'],
      } as any;

      expect(isClinician(user)).toBe(true);
      expect(isSupervisor(user)).toBe(true);
    });

    it('should handle user with legacy role field', async () => {
      const user = {
        userId: 'user-123',
        id: 'user-123',
        email: 'legacy@example.com',
        organizationId: 'org-123',
        role: 'CLINICIAN', // Legacy single role field
      } as any;

      expect(isClinician(user)).toBe(true);
    });

    it('should handle missing client assignments gracefully', async () => {
      const user = createMockUser(UserRoles.CLINICIAN);

      (prisma.client.findMany as jest.Mock).mockResolvedValue([]);

      const context = await buildRLSContext(user);

      expect(context.allowedClientIds).toEqual([]);
    });
  });
});
