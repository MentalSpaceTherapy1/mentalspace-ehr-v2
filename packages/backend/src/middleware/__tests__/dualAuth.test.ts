/**
 * Dual Authentication Middleware Unit Tests
 *
 * Tests IDOR protection and role-based access control for client data
 */

import { Request, Response, NextFunction } from 'express';
import { canAccessClientData, verifyClinicianClientAccess } from '../dualAuth';

// Mock dependencies
jest.mock('../../services/database', () => ({
  __esModule: true,
  default: {
    client: {
      findFirst: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

import prisma from '../../services/database';

describe('canAccessClientData', () => {
  let mockRequest: Partial<Request>;

  beforeEach(() => {
    mockRequest = {
      user: undefined,
    };
    jest.clearAllMocks();
  });

  describe('Administrative Roles (Global Access)', () => {
    const globalAccessRoles = [
      'SUPER_ADMIN',
      'ADMINISTRATOR',
      'CLINICAL_DIRECTOR',
      'BILLING_STAFF',
      'OFFICE_MANAGER',
      'SCHEDULER',
      'RECEPTIONIST',
    ];

    globalAccessRoles.forEach(role => {
      it(`should grant access to ${role} for any client`, () => {
        mockRequest.user = {
          userId: 'admin-123',
          roles: [role],
          email: 'admin@test.com',
        } as any;

        const result = canAccessClientData(
          mockRequest as Request,
          'any-client-id'
        );

        expect(result).toBe(true);
      });
    });
  });

  describe('Portal Account Access', () => {
    it('should allow portal user to access own data', () => {
      mockRequest.user = undefined;
      (mockRequest as any).portalAccount = {
        clientId: 'client-123',
      };

      const result = canAccessClientData(
        mockRequest as Request,
        'client-123' // Same as portal account
      );

      expect(result).toBe(true);
    });

    it('should deny portal user access to other client data', () => {
      mockRequest.user = undefined;
      (mockRequest as any).portalAccount = {
        clientId: 'client-123',
      };

      const result = canAccessClientData(
        mockRequest as Request,
        'different-client-456' // Different from portal account
      );

      expect(result).toBe(false);
    });
  });

  describe('Clinical Roles (Requires Assignment Check)', () => {
    it('should mark request for clinician-client check for CLINICIAN role', () => {
      mockRequest.user = {
        userId: 'clinician-456',
        roles: ['CLINICIAN'],
        email: 'clinician@test.com',
      } as any;

      const result = canAccessClientData(
        mockRequest as Request,
        'client-789'
      );

      expect(result).toBe(true);
      expect((mockRequest as any).requiresClinicianClientCheck).toBe(true);
      expect((mockRequest as any).targetClientId).toBe('client-789');
    });

    it('should mark request for clinician-client check for SUPERVISOR role', () => {
      mockRequest.user = {
        userId: 'supervisor-123',
        roles: ['SUPERVISOR'],
        email: 'supervisor@test.com',
      } as any;

      const result = canAccessClientData(
        mockRequest as Request,
        'client-999'
      );

      expect(result).toBe(true);
      expect((mockRequest as any).requiresClinicianClientCheck).toBe(true);
    });

    it('should mark request for clinician-client check for INTERN role', () => {
      mockRequest.user = {
        userId: 'intern-789',
        roles: ['INTERN'],
        email: 'intern@test.com',
      } as any;

      const result = canAccessClientData(
        mockRequest as Request,
        'client-111'
      );

      expect(result).toBe(true);
      expect((mockRequest as any).requiresClinicianClientCheck).toBe(true);
    });
  });

  describe('Unknown Roles', () => {
    it('should deny access for unrecognized roles', () => {
      mockRequest.user = {
        userId: 'unknown-user',
        roles: ['UNKNOWN_ROLE'],
        email: 'unknown@test.com',
      } as any;

      const result = canAccessClientData(
        mockRequest as Request,
        'client-123'
      );

      expect(result).toBe(false);
    });

    it('should deny access when no roles present', () => {
      mockRequest.user = {
        userId: 'no-role-user',
        roles: [],
        email: 'norole@test.com',
      } as any;

      const result = canAccessClientData(
        mockRequest as Request,
        'client-123'
      );

      expect(result).toBe(false);
    });
  });

  describe('Backward Compatibility', () => {
    it('should handle single role as string (legacy format)', () => {
      mockRequest.user = {
        userId: 'admin-old',
        roles: 'ADMINISTRATOR', // String instead of array
        email: 'admin@test.com',
      } as any;

      const result = canAccessClientData(
        mockRequest as Request,
        'any-client'
      );

      expect(result).toBe(true);
    });
  });
});

describe('verifyClinicianClientAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow access when clinician is primary clinician', async () => {
    (prisma.client.findFirst as jest.Mock).mockResolvedValue({
      id: 'client-123',
      primaryClinicianId: 'clinician-456',
    });

    const result = await verifyClinicianClientAccess('clinician-456', 'client-123');

    expect(result).toBe(true);
    expect(prisma.client.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: 'client-123',
        OR: expect.arrayContaining([
          { primaryClinicianId: 'clinician-456' },
        ]),
      }),
    });
  });

  it('should allow access when clinician is secondary clinician', async () => {
    (prisma.client.findFirst as jest.Mock).mockResolvedValue({
      id: 'client-123',
      secondaryClinicianId: 'clinician-789',
    });

    const result = await verifyClinicianClientAccess('clinician-789', 'client-123');

    expect(result).toBe(true);
  });

  it('should allow access when clinician has appointments with client', async () => {
    (prisma.client.findFirst as jest.Mock).mockResolvedValue({
      id: 'client-123',
      appointments: [{ clinicianId: 'clinician-111' }],
    });

    const result = await verifyClinicianClientAccess('clinician-111', 'client-123');

    expect(result).toBe(true);
  });

  it('should allow supervisor access through supervisee assignments', async () => {
    // First call returns null (clinician not directly assigned)
    (prisma.client.findFirst as jest.Mock).mockResolvedValue(null);
    // Second call checks supervisee assignments
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      id: 'supervisee-123',
      supervisorId: 'supervisor-456',
    });

    const result = await verifyClinicianClientAccess('supervisor-456', 'client-789');

    expect(result).toBe(true);
    expect(prisma.user.findFirst).toHaveBeenCalled();
  });

  it('should deny access when clinician has no relationship with client', async () => {
    (prisma.client.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await verifyClinicianClientAccess('unrelated-clinician', 'client-xyz');

    expect(result).toBe(false);
  });

  it('should handle database errors gracefully', async () => {
    (prisma.client.findFirst as jest.Mock).mockRejectedValue(new Error('DB error'));

    const result = await verifyClinicianClientAccess('clinician-123', 'client-456');

    expect(result).toBe(false);
  });
});

describe('IDOR Prevention', () => {
  let mockRequest: Partial<Request>;

  beforeEach(() => {
    mockRequest = {};
    jest.clearAllMocks();
  });

  it('should prevent CLINICIAN from accessing arbitrary client data without assignment', async () => {
    // Setup: Clinician trying to access client they're not assigned to
    mockRequest.user = {
      userId: 'clinician-attacker',
      roles: ['CLINICIAN'],
      email: 'attacker@test.com',
    } as any;

    // Step 1: canAccessClientData marks for further check
    const accessAllowed = canAccessClientData(
      mockRequest as Request,
      'victim-client-id'
    );

    expect(accessAllowed).toBe(true); // Passes first gate
    expect((mockRequest as any).requiresClinicianClientCheck).toBe(true);

    // Step 2: verifyClinicianClientAccess should deny
    (prisma.client.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    const assignmentVerified = await verifyClinicianClientAccess(
      'clinician-attacker',
      'victim-client-id'
    );

    expect(assignmentVerified).toBe(false); // IDOR prevented!
  });

  it('should allow legitimate clinician access to assigned client', async () => {
    mockRequest.user = {
      userId: 'legitimate-clinician',
      roles: ['CLINICIAN'],
      email: 'good@test.com',
    } as any;

    const accessAllowed = canAccessClientData(
      mockRequest as Request,
      'assigned-client-id'
    );

    expect(accessAllowed).toBe(true);
    expect((mockRequest as any).requiresClinicianClientCheck).toBe(true);

    // Verify assignment exists
    (prisma.client.findFirst as jest.Mock).mockResolvedValue({
      id: 'assigned-client-id',
      primaryClinicianId: 'legitimate-clinician',
    });

    const assignmentVerified = await verifyClinicianClientAccess(
      'legitimate-clinician',
      'assigned-client-id'
    );

    expect(assignmentVerified).toBe(true);
  });
});
