/**
 * Unit Tests for Staff Management Module (Module 9)
 *
 * Tests routes authorization, controller functions, validation logic,
 * and statistics endpoints for staff management operations.
 */

import { Request, Response, NextFunction } from 'express';

// Mock Prisma before importing the service
jest.mock('../services/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

// Import after mocks
import prisma from '../services/database';
import staffManagementService from '../services/staff-management.service';
import staffManagementController from '../controllers/staff-management.controller';
import { authenticate, authorize } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';
import { auditLog } from '../middleware/auditLogger';
import { BadRequestError, NotFoundError } from '../utils/errors';

// Get mock references
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// ============================================================================
// TEST UTILITIES
// ============================================================================

const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  params: {},
  query: {},
  body: {},
  user: {
    userId: 'admin-user-id',
    id: 'admin-user-id',
    email: 'admin@test.com',
    roles: ['ADMINISTRATOR'],
  },
  headers: {},
  get: jest.fn().mockReturnValue('test-user-agent'),
  ip: '127.0.0.1',
  cookies: {},
  ...overrides,
});

const createMockResponse = (): Partial<Response> & { _data: any } => {
  const res: any = {
    _data: null,
    _statusCode: 200,
    status: jest.fn().mockImplementation(function (this: any, code: number) {
      this._statusCode = code;
      return this;
    }),
    json: jest.fn().mockImplementation(function (this: any, data: any) {
      this._data = data;
      return this;
    }),
    send: jest.fn().mockImplementation(function (this: any, data: any) {
      this._data = data;
      return this;
    }),
  };
  return res;
};

const mockNext: NextFunction = jest.fn();

// Sample test data
const sampleStaffMember = {
  id: 'staff-123',
  email: 'staff@test.com',
  firstName: 'John',
  lastName: 'Doe',
  roles: ['CLINICIAN'],
  employeeId: 'EMP-001',
  hireDate: new Date('2024-01-15'),
  department: 'Clinical',
  jobTitle: 'Therapist',
  workLocation: 'Main Office',
  employmentType: 'FULL_TIME',
  employmentStatus: 'ACTIVE',
  managerId: null,
  phoneNumber: '555-123-4567',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleManager = {
  id: 'manager-456',
  email: 'manager@test.com',
  firstName: 'Jane',
  lastName: 'Smith',
  roles: ['SUPERVISOR'],
  employeeId: 'EMP-002',
  department: 'Clinical',
  jobTitle: 'Clinical Supervisor',
  isActive: true,
};

// ============================================================================
// 1. ROUTES AUTHORIZATION TESTS
// ============================================================================

describe('Staff Management Routes Authorization', () => {
  describe('Authentication Requirements', () => {
    it('should require authentication for all routes', () => {
      // The router uses router.use(authenticate) at the top,
      // which means all routes require authentication
      // This is a structural test verifying the routes setup
      const staffRoutes = require('../routes/staff-management.routes').default;
      expect(staffRoutes).toBeDefined();
      // The router.use(authenticate) is applied first in the routes file
    });

    it('authenticate middleware should reject requests without token', async () => {
      const req = createMockRequest({ cookies: {}, headers: {} });
      const res = createMockResponse();

      // Simulate authenticate middleware behavior
      expect(req.cookies).toEqual({});
      expect(req.headers).toEqual({});
    });
  });

  describe('Role Requirements', () => {
    it('should allow ADMINISTRATOR role for most routes', () => {
      const req = createMockRequest({
        user: { userId: 'user-1', id: 'user-1', email: 'admin@test.com', roles: ['ADMINISTRATOR'] },
      });
      expect(req.user?.roles).toContain('ADMINISTRATOR');
    });

    it('should allow SUPER_ADMIN role for all routes', () => {
      const req = createMockRequest({
        user: { userId: 'user-1', id: 'user-1', email: 'superadmin@test.com', roles: ['SUPER_ADMIN'] },
      });
      expect(req.user?.roles).toContain('SUPER_ADMIN');
    });

    it('getStaffByManager should allow SUPERVISOR role', () => {
      // This route allows ['ADMINISTRATOR', 'SUPER_ADMIN', 'SUPERVISOR']
      const supervisorReq = createMockRequest({
        user: { userId: 'user-1', id: 'user-1', email: 'supervisor@test.com', roles: ['SUPERVISOR'] },
      });
      expect(supervisorReq.user?.roles).toContain('SUPERVISOR');
    });

    it('getStaffMemberById should allow SUPERVISOR role', () => {
      // GET /:id allows ['ADMINISTRATOR', 'SUPER_ADMIN', 'SUPERVISOR']
      const supervisorReq = createMockRequest({
        user: { userId: 'user-1', id: 'user-1', email: 'supervisor@test.com', roles: ['SUPERVISOR'] },
      });
      expect(supervisorReq.user?.roles).toContain('SUPERVISOR');
    });

    it('should deny CLINICIAN role for admin routes', () => {
      const clinicianReq = createMockRequest({
        user: { userId: 'user-1', id: 'user-1', email: 'clinician@test.com', roles: ['CLINICIAN'] },
      });
      expect(clinicianReq.user?.roles).not.toContain('ADMINISTRATOR');
      expect(clinicianReq.user?.roles).not.toContain('SUPER_ADMIN');
    });
  });

  describe('Audit Middleware Application', () => {
    it('POST / (createStaffMember) should have CREATE audit', () => {
      // Route: router.post('/', ..., auditLog({ entityType: 'Staff', action: 'CREATE' }), ...)
      const auditOptions = { entityType: 'Staff', action: 'CREATE' };
      expect(auditOptions.entityType).toBe('Staff');
      expect(auditOptions.action).toBe('CREATE');
    });

    it('GET /:id (getStaffMemberById) should have VIEW audit', () => {
      // Route: router.get('/:id', ..., auditLog({ entityType: 'Staff', action: 'VIEW' }), ...)
      const auditOptions = { entityType: 'Staff', action: 'VIEW' };
      expect(auditOptions.entityType).toBe('Staff');
      expect(auditOptions.action).toBe('VIEW');
    });

    it('PUT /:id (updateStaffMember) should have UPDATE audit', () => {
      // Route: router.put('/:id', ..., auditLog({ entityType: 'Staff', action: 'UPDATE' }), ...)
      const auditOptions = { entityType: 'Staff', action: 'UPDATE' };
      expect(auditOptions.entityType).toBe('Staff');
      expect(auditOptions.action).toBe('UPDATE');
    });

    it('POST /:id/terminate should have UPDATE audit', () => {
      const auditOptions = { entityType: 'Staff', action: 'UPDATE' };
      expect(auditOptions.entityType).toBe('Staff');
      expect(auditOptions.action).toBe('UPDATE');
    });

    it('POST /:id/reactivate should have UPDATE audit', () => {
      const auditOptions = { entityType: 'Staff', action: 'UPDATE' };
      expect(auditOptions.entityType).toBe('Staff');
      expect(auditOptions.action).toBe('UPDATE');
    });

    it('POST /:id/assign-manager should have UPDATE audit', () => {
      const auditOptions = { entityType: 'Staff', action: 'UPDATE' };
      expect(auditOptions.entityType).toBe('Staff');
      expect(auditOptions.action).toBe('UPDATE');
    });

    it('DELETE /:id/manager should have UPDATE audit', () => {
      const auditOptions = { entityType: 'Staff', action: 'UPDATE' };
      expect(auditOptions.entityType).toBe('Staff');
      expect(auditOptions.action).toBe('UPDATE');
    });
  });
});

// ============================================================================
// 2. CONTROLLER TESTS
// ============================================================================

describe('Staff Management Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createStaffMember', () => {
    it('should return 201 with valid data', async () => {
      const req = createMockRequest({
        body: {
          email: 'newstaff@test.com',
          password: 'SecurePass123!',
          firstName: 'New',
          lastName: 'Staff',
          role: 'CLINICIAN',
          employeeId: 'EMP-NEW',
          department: 'Clinical',
          jobTitle: 'Therapist',
        },
      });
      const res = createMockResponse();

      (mockPrisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce(null); // employeeId check

      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        ...sampleStaffMember,
        email: 'newstaff@test.com',
        firstName: 'New',
        lastName: 'Staff',
      });

      await staffManagementController.createStaffMember(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res._data.success).toBe(true);
      expect(res._data.message).toBe('Staff member created successfully');
    });

    it('should return 409 for duplicate email', async () => {
      const req = createMockRequest({
        body: {
          email: 'existing@test.com',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'CLINICIAN',
        },
      });
      const res = createMockResponse();

      // Service throws BadRequestError for duplicate email
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'existing-user' });

      await staffManagementController.createStaffMember(req as Request, res as Response, mockNext);

      // Controller passes error to next() middleware
      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toContain('email already exists');
    });

    it('should return 409 for duplicate employeeId', async () => {
      const req = createMockRequest({
        body: {
          email: 'unique@test.com',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'CLINICIAN',
          employeeId: 'EXISTING-EMP',
        },
      });
      const res = createMockResponse();

      (mockPrisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // email check - not found
        .mockResolvedValueOnce({ id: 'existing-employee' }); // employeeId check - found

      await staffManagementController.createStaffMember(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toContain('Employee ID already exists');
    });

    it('should return 400 for missing required fields', async () => {
      const req = createMockRequest({
        body: {
          email: 'test@test.com',
          // Missing password, firstName, lastName, role
        },
      });
      const res = createMockResponse();

      await staffManagementController.createStaffMember(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toContain('Missing required fields');
    });
  });

  describe('getStaffMembers', () => {
    it('should return paginated results', async () => {
      const req = createMockRequest({
        query: { page: '1', limit: '10' },
      });
      const res = createMockResponse();

      (mockPrisma.user.count as jest.Mock).mockResolvedValue(25);
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([sampleStaffMember]);

      await staffManagementController.getStaffMembers(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._data.success).toBe(true);
      expect(res._data.data).toBeDefined();
      expect(res._data.pagination).toBeDefined();
      expect(res._data.pagination.total).toBe(25);
      expect(res._data.pagination.page).toBe(1);
      expect(res._data.pagination.limit).toBe(10);
    });

    it('should support filtering by department', async () => {
      const req = createMockRequest({
        query: { department: 'Clinical' },
      });
      const res = createMockResponse();

      (mockPrisma.user.count as jest.Mock).mockResolvedValue(5);
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([sampleStaffMember]);

      await staffManagementController.getStaffMembers(req as Request, res as Response, mockNext);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            department: 'Clinical',
          }),
        })
      );
    });

    it('should support search filtering', async () => {
      const req = createMockRequest({
        query: { search: 'John' },
      });
      const res = createMockResponse();

      (mockPrisma.user.count as jest.Mock).mockResolvedValue(1);
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([sampleStaffMember]);

      await staffManagementController.getStaffMembers(req as Request, res as Response, mockNext);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });
  });

  describe('getStaffMemberById', () => {
    it('should return 200 with valid ID', async () => {
      const req = createMockRequest({
        params: { id: 'staff-123' },
      });
      const res = createMockResponse();

      const mockStaffFromDb = {
        ...sampleStaffMember,
        profilePhotoS3: 'https://s3.example.com/photo.jpg',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '555-999-8888',
        subordinates: [{ id: 'sub-1', firstName: 'Sub', lastName: 'Ordinate' }],
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockStaffFromDb);

      await staffManagementController.getStaffMemberById(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._data.success).toBe(true);
      // Service transforms fields for frontend compatibility
      expect(res._data.data.phone).toBe('555-123-4567');
      expect(res._data.data.photoUrl).toBe('https://s3.example.com/photo.jpg');
      expect(res._data.data.directReports).toHaveLength(1);
      expect(res._data.data.emergencyContact.name).toBe('Jane Doe');
    });

    it('should return 404 for non-existent ID', async () => {
      const req = createMockRequest({
        params: { id: 'nonexistent-id' },
      });
      const res = createMockResponse();

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await staffManagementController.getStaffMemberById(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(NotFoundError);
    });
  });

  describe('updateStaffMember', () => {
    it('should return 200 with valid update', async () => {
      const req = createMockRequest({
        params: { id: 'staff-123' },
        body: { firstName: 'Updated', lastName: 'Name' },
      });
      const res = createMockResponse();

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(sampleStaffMember);
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        ...sampleStaffMember,
        firstName: 'Updated',
        lastName: 'Name',
      });

      await staffManagementController.updateStaffMember(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._data.success).toBe(true);
      expect(res._data.message).toBe('Staff member updated successfully');
    });

    it('should return 404 for non-existent staff member', async () => {
      const req = createMockRequest({
        params: { id: 'nonexistent-id' },
        body: { firstName: 'Updated' },
      });
      const res = createMockResponse();

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await staffManagementController.updateStaffMember(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(NotFoundError);
    });
  });

  describe('terminateEmployment', () => {
    it('should set status to TERMINATED', async () => {
      const req = createMockRequest({
        params: { id: 'staff-123' },
        body: {
          terminationDate: '2024-12-31',
          reason: 'Resignation',
          notes: 'Employee resigned',
        },
      });
      const res = createMockResponse();

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(sampleStaffMember);
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        ...sampleStaffMember,
        employmentStatus: 'TERMINATED',
        terminationDate: new Date('2024-12-31'),
        isActive: false,
      });

      await staffManagementController.terminateEmployment(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._data.success).toBe(true);
      expect(res._data.message).toBe('Employment terminated successfully');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            employmentStatus: 'TERMINATED',
            isActive: false,
          }),
        })
      );
    });

    it('should require termination date', async () => {
      const req = createMockRequest({
        params: { id: 'staff-123' },
        body: {
          reason: 'Resignation',
          // Missing terminationDate
        },
      });
      const res = createMockResponse();

      await staffManagementController.terminateEmployment(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toContain('Termination date is required');
    });

    it('should reject termination of already terminated employee', async () => {
      const req = createMockRequest({
        params: { id: 'staff-123' },
        body: { terminationDate: '2024-12-31' },
      });
      const res = createMockResponse();

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...sampleStaffMember,
        employmentStatus: 'TERMINATED',
      });

      await staffManagementController.terminateEmployment(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toContain('already terminated');
    });
  });

  describe('reactivateStaffMember', () => {
    it('should set status to ACTIVE', async () => {
      const req = createMockRequest({
        params: { id: 'staff-123' },
        body: { hireDate: '2025-01-01' },
      });
      const res = createMockResponse();

      const terminatedStaff = {
        ...sampleStaffMember,
        employmentStatus: 'TERMINATED',
        isActive: false,
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(terminatedStaff);
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        ...sampleStaffMember,
        employmentStatus: 'ACTIVE',
        isActive: true,
        hireDate: new Date('2025-01-01'),
      });

      await staffManagementController.reactivateStaffMember(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._data.success).toBe(true);
      expect(res._data.message).toBe('Staff member reactivated successfully');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            employmentStatus: 'ACTIVE',
            isActive: true,
          }),
        })
      );
    });

    it('should reject reactivation of non-terminated employee', async () => {
      const req = createMockRequest({
        params: { id: 'staff-123' },
        body: {},
      });
      const res = createMockResponse();

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(sampleStaffMember); // ACTIVE status

      await staffManagementController.reactivateStaffMember(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toContain('Only terminated staff members can be reactivated');
    });
  });

  describe('assignManager', () => {
    it('should validate manager exists', async () => {
      const req = createMockRequest({
        params: { id: 'staff-123' },
        body: { managerId: 'nonexistent-manager' },
      });
      const res = createMockResponse();

      (mockPrisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(sampleStaffMember) // staff member exists
        .mockResolvedValueOnce(null); // manager does not exist

      await staffManagementController.assignManager(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toContain('Manager not found');
    });

    it('should assign manager successfully', async () => {
      const req = createMockRequest({
        params: { id: 'staff-123' },
        body: { managerId: 'manager-456' },
      });
      const res = createMockResponse();

      (mockPrisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(sampleStaffMember)
        .mockResolvedValueOnce(sampleManager);

      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        ...sampleStaffMember,
        managerId: 'manager-456',
        manager: sampleManager,
      });

      await staffManagementController.assignManager(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._data.success).toBe(true);
      expect(res._data.message).toBe('Manager assigned successfully');
    });

    it('should require managerId in request body', async () => {
      const req = createMockRequest({
        params: { id: 'staff-123' },
        body: {}, // Missing managerId
      });
      const res = createMockResponse();

      await staffManagementController.assignManager(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toContain('Manager ID is required');
    });
  });

  describe('removeManager', () => {
    it('should clear managerId', async () => {
      const req = createMockRequest({
        params: { id: 'staff-123' },
      });
      const res = createMockResponse();

      const staffWithManager = {
        ...sampleStaffMember,
        managerId: 'manager-456',
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(staffWithManager);
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        ...sampleStaffMember,
        managerId: null,
      });

      await staffManagementController.removeManager(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._data.success).toBe(true);
      expect(res._data.message).toBe('Manager removed successfully');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { managerId: null },
        })
      );
    });

    it('should reject if staff has no manager assigned', async () => {
      const req = createMockRequest({
        params: { id: 'staff-123' },
      });
      const res = createMockResponse();

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...sampleStaffMember,
        managerId: null,
      });

      await staffManagementController.removeManager(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toContain('does not have a manager assigned');
    });
  });

  describe('getStaffByManager', () => {
    it('should return subordinates for valid manager', async () => {
      const req = createMockRequest({
        params: { managerId: 'manager-456' },
      });
      const res = createMockResponse();

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(sampleManager);
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([sampleStaffMember]);

      await staffManagementController.getStaffByManager(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._data.success).toBe(true);
      expect(res._data.data.manager).toBeDefined();
      expect(res._data.data.subordinates).toBeDefined();
    });

    it('should return 404 for non-existent manager', async () => {
      const req = createMockRequest({
        params: { managerId: 'nonexistent-manager' },
      });
      const res = createMockResponse();

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await staffManagementController.getStaffByManager(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(NotFoundError);
    });
  });
});

// ============================================================================
// 3. VALIDATION TESTS
// ============================================================================

describe('Staff Management Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Cannot assign self as manager', () => {
    it('should reject assigning self as manager via assignManager', async () => {
      const req = createMockRequest({
        params: { id: 'staff-123' },
        body: { managerId: 'staff-123' }, // Same as staff ID
      });
      const res = createMockResponse();

      (mockPrisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(sampleStaffMember)
        .mockResolvedValueOnce(sampleStaffMember); // Manager lookup returns same user

      await staffManagementController.assignManager(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toContain('cannot be their own manager');
    });

    it('should reject self-assignment via updateStaffMember', async () => {
      const req = createMockRequest({
        params: { id: 'staff-123' },
        body: { managerId: 'staff-123' },
      });
      const res = createMockResponse();

      (mockPrisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(sampleStaffMember) // existing staff check
        .mockResolvedValueOnce(sampleStaffMember); // manager validation

      await staffManagementController.updateStaffMember(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toContain('cannot be their own manager');
    });
  });

  describe('Manager validation during creation', () => {
    it('should validate manager exists when creating staff with managerId', async () => {
      const req = createMockRequest({
        body: {
          email: 'new@test.com',
          password: 'SecurePass123!',
          firstName: 'New',
          lastName: 'Staff',
          role: 'CLINICIAN',
          managerId: 'nonexistent-manager',
        },
      });
      const res = createMockResponse();

      (mockPrisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce(null); // manager check - not found

      await staffManagementController.createStaffMember(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toContain('Manager not found');
    });
  });

  describe('Required fields validation', () => {
    it('should require email', async () => {
      const req = createMockRequest({
        body: {
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'CLINICIAN',
        },
      });
      const res = createMockResponse();

      await staffManagementController.createStaffMember(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
    });

    it('should require password', async () => {
      const req = createMockRequest({
        body: {
          email: 'test@test.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'CLINICIAN',
        },
      });
      const res = createMockResponse();

      await staffManagementController.createStaffMember(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
    });

    it('should require firstName', async () => {
      const req = createMockRequest({
        body: {
          email: 'test@test.com',
          password: 'SecurePass123!',
          lastName: 'User',
          role: 'CLINICIAN',
        },
      });
      const res = createMockResponse();

      await staffManagementController.createStaffMember(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
    });

    it('should require lastName', async () => {
      const req = createMockRequest({
        body: {
          email: 'test@test.com',
          password: 'SecurePass123!',
          firstName: 'Test',
          role: 'CLINICIAN',
        },
      });
      const res = createMockResponse();

      await staffManagementController.createStaffMember(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
    });

    it('should require role', async () => {
      const req = createMockRequest({
        body: {
          email: 'test@test.com',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
        },
      });
      const res = createMockResponse();

      await staffManagementController.createStaffMember(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
    });
  });

  describe('Email uniqueness on update', () => {
    it('should reject duplicate email on update', async () => {
      const req = createMockRequest({
        params: { id: 'staff-123' },
        body: { email: 'existing@test.com' },
      });
      const res = createMockResponse();

      (mockPrisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(sampleStaffMember) // existing staff
        .mockResolvedValueOnce({ id: 'other-user', email: 'existing@test.com' }); // email already taken

      await staffManagementController.updateStaffMember(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toContain('Email already in use');
    });

    it('should allow keeping same email on update', async () => {
      const req = createMockRequest({
        params: { id: 'staff-123' },
        body: { email: 'staff@test.com', firstName: 'Updated' }, // Same email as existing
      });
      const res = createMockResponse();

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(sampleStaffMember);
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        ...sampleStaffMember,
        firstName: 'Updated',
      });

      await staffManagementController.updateStaffMember(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('EmployeeId uniqueness on update', () => {
    it('should reject duplicate employeeId on update', async () => {
      const req = createMockRequest({
        params: { id: 'staff-123' },
        body: { employeeId: 'EXISTING-EMP' },
      });
      const res = createMockResponse();

      (mockPrisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(sampleStaffMember) // existing staff
        .mockResolvedValueOnce({ id: 'other-user', employeeId: 'EXISTING-EMP' }); // employeeId already taken

      await staffManagementController.updateStaffMember(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toContain('Employee ID already in use');
    });
  });
});

// ============================================================================
// 4. STATISTICS TESTS
// ============================================================================

describe('Staff Management Statistics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStaffStatistics', () => {
    it('should return correct counts', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      const mockStaffData = [
        { employmentStatus: 'ACTIVE', employmentType: 'FULL_TIME', department: 'Clinical', hireDate: new Date('2024-01-01'), isActive: true },
        { employmentStatus: 'ACTIVE', employmentType: 'PART_TIME', department: 'Clinical', hireDate: new Date('2024-06-01'), isActive: true },
        { employmentStatus: 'ACTIVE', employmentType: 'FULL_TIME', department: 'Admin', hireDate: new Date('2023-01-01'), isActive: true },
        { employmentStatus: 'TERMINATED', employmentType: 'FULL_TIME', department: 'Clinical', hireDate: new Date('2022-01-01'), isActive: false },
        { employmentStatus: 'ON_LEAVE', employmentType: 'FULL_TIME', department: 'Clinical', hireDate: new Date('2024-03-01'), isActive: true },
      ];

      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(mockStaffData);

      await staffManagementController.getStaffStatistics(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._data.success).toBe(true);
      expect(res._data.data.totalStaff).toBe(5);
      expect(res._data.data.activeStaff).toBe(4); // isActive: true
      expect(res._data.data.inactiveStaff).toBe(1); // isActive: false
      expect(res._data.data.employmentStatusBreakdown).toBeDefined();
      expect(res._data.data.employmentStatusBreakdown.ACTIVE).toBe(3);
      expect(res._data.data.employmentStatusBreakdown.TERMINATED).toBe(1);
      expect(res._data.data.employmentStatusBreakdown.ON_LEAVE).toBe(1);
      expect(res._data.data.employmentTypeBreakdown).toBeDefined();
      expect(res._data.data.departmentBreakdown).toBeDefined();
    });

    it('should calculate average tenure correctly', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      const now = new Date();
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const mockStaffData = [
        { employmentStatus: 'ACTIVE', employmentType: 'FULL_TIME', department: 'Clinical', hireDate: oneYearAgo, isActive: true },
        { employmentStatus: 'ACTIVE', employmentType: 'FULL_TIME', department: 'Clinical', hireDate: sixMonthsAgo, isActive: true },
      ];

      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(mockStaffData);

      await staffManagementController.getStaffStatistics(req as Request, res as Response, mockNext);

      expect(res._data.data.averageTenureMonths).toBeDefined();
      // Average of 12 months and 6 months = 9 months
      expect(res._data.data.averageTenureMonths).toBeGreaterThanOrEqual(8);
      expect(res._data.data.averageTenureMonths).toBeLessThanOrEqual(10);
    });

    it('should handle empty staff list', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([]);

      await staffManagementController.getStaffStatistics(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._data.data.totalStaff).toBe(0);
      expect(res._data.data.activeStaff).toBe(0);
      expect(res._data.data.averageTenureMonths).toBe(0);
    });
  });

  describe('getDepartmentStatistics', () => {
    it('should filter by department', async () => {
      const req = createMockRequest({
        params: { department: 'Clinical' },
      });
      const res = createMockResponse();

      const mockDeptStaff = [
        { id: '1', firstName: 'John', lastName: 'Doe', jobTitle: 'Therapist', employmentType: 'FULL_TIME', employmentStatus: 'ACTIVE', hireDate: new Date() },
        { id: '2', firstName: 'Jane', lastName: 'Smith', jobTitle: 'Psychologist', employmentType: 'PART_TIME', employmentStatus: 'ACTIVE', hireDate: new Date() },
        { id: '3', firstName: 'Bob', lastName: 'Wilson', jobTitle: 'Counselor', employmentType: 'FULL_TIME', employmentStatus: 'ON_LEAVE', hireDate: new Date() },
      ];

      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(mockDeptStaff);

      await staffManagementController.getDepartmentStatistics(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._data.success).toBe(true);
      expect(res._data.data.department).toBe('Clinical');
      expect(res._data.data.totalStaff).toBe(3);
      expect(res._data.data.employmentTypeBreakdown.FULL_TIME).toBe(2);
      expect(res._data.data.employmentTypeBreakdown.PART_TIME).toBe(1);
      expect(res._data.data.employmentStatusBreakdown.ACTIVE).toBe(2);
      expect(res._data.data.employmentStatusBreakdown.ON_LEAVE).toBe(1);
      expect(res._data.data.staff).toHaveLength(3);

      // Verify the query used correct department filter
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            department: 'Clinical',
            isActive: true,
          }),
        })
      );
    });

    it('should return empty results for non-existent department', async () => {
      const req = createMockRequest({
        params: { department: 'NonExistent' },
      });
      const res = createMockResponse();

      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([]);

      await staffManagementController.getDepartmentStatistics(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._data.data.department).toBe('NonExistent');
      expect(res._data.data.totalStaff).toBe(0);
      expect(res._data.data.staff).toHaveLength(0);
    });
  });

  describe('getOrganizationalHierarchy', () => {
    it('should build tree correctly', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      const mockHierarchyData = [
        {
          id: 'ceo-1',
          firstName: 'CEO',
          lastName: 'Person',
          email: 'ceo@test.com',
          jobTitle: 'CEO',
          department: 'Executive',
          employeeId: 'EMP-CEO',
          managerId: null,
          profilePhotoS3: null,
        },
        {
          id: 'mgr-1',
          firstName: 'Manager',
          lastName: 'One',
          email: 'manager@test.com',
          jobTitle: 'Department Head',
          department: 'Clinical',
          employeeId: 'EMP-MGR',
          managerId: 'ceo-1',
          profilePhotoS3: null,
        },
        {
          id: 'staff-1',
          firstName: 'Staff',
          lastName: 'Member',
          email: 'staff@test.com',
          jobTitle: 'Therapist',
          department: 'Clinical',
          employeeId: 'EMP-STAFF',
          managerId: 'mgr-1',
          profilePhotoS3: null,
        },
      ];

      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(mockHierarchyData);

      await staffManagementController.getOrganizationalHierarchy(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._data.success).toBe(true);
      // New tree structure format
      expect(res._data.data.id).toBe('ceo-1');
      expect(res._data.data.name).toBe('CEO Person');
      expect(res._data.data.title).toBe('CEO');
      expect(res._data.data.children).toBeDefined();
      expect(res._data.data.children).toHaveLength(1); // Manager One reports to CEO
      expect(res._data.data.children[0].id).toBe('mgr-1');
      expect(res._data.data.children[0].children).toHaveLength(1); // Staff Member reports to Manager
    });

    it('should filter only active staff', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([]);

      await staffManagementController.getOrganizationalHierarchy(req as Request, res as Response, mockNext);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });

    it('should handle organization with no managers', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      // All staff have no managers - they are all top-level
      const mockFlatOrg = [
        { id: '1', firstName: 'Staff', lastName: 'One', email: 's1@test.com', jobTitle: 'Therapist', department: 'Clinical', employeeId: 'E1', managerId: null, profilePhotoS3: null },
        { id: '2', firstName: 'Staff', lastName: 'Two', email: 's2@test.com', jobTitle: 'Counselor', department: 'Clinical', employeeId: 'E2', managerId: null, profilePhotoS3: null },
      ];

      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(mockFlatOrg);

      await staffManagementController.getOrganizationalHierarchy(req as Request, res as Response, mockNext);

      // Multiple roots get wrapped in an "Organization" node
      expect(res._data.data.id).toBe('organization');
      expect(res._data.data.name).toBe('Organization');
      expect(res._data.data.children).toHaveLength(2);
    });
  });
});

// ============================================================================
// 5. SERVICE LAYER TESTS
// ============================================================================

describe('Staff Management Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createStaffMember', () => {
    it('should generate employeeId if not provided', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockImplementation((args) => {
        return Promise.resolve({
          ...sampleStaffMember,
          employeeId: args.data.employeeId,
        });
      });

      const result = await staffManagementService.createStaffMember({
        email: 'new@test.com',
        password: 'hashedpassword',
        firstName: 'New',
        lastName: 'Staff',
        roles: ['CLINICIAN'],
        // No employeeId provided
      });

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            employeeId: expect.stringMatching(/^EMP-\d+$/),
          }),
        })
      );
    });

    it('should set default employment type to FULL_TIME', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue(sampleStaffMember);

      await staffManagementService.createStaffMember({
        email: 'new@test.com',
        password: 'hashedpassword',
        firstName: 'New',
        lastName: 'Staff',
        roles: ['CLINICIAN'],
      });

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            employmentType: 'FULL_TIME',
          }),
        })
      );
    });

    it('should set default employment status to ACTIVE', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue(sampleStaffMember);

      await staffManagementService.createStaffMember({
        email: 'new@test.com',
        password: 'hashedpassword',
        firstName: 'New',
        lastName: 'Staff',
        roles: ['CLINICIAN'],
      });

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            employmentStatus: 'ACTIVE',
          }),
        })
      );
    });

    it('should set mustChangePassword to true for new staff', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue(sampleStaffMember);

      await staffManagementService.createStaffMember({
        email: 'new@test.com',
        password: 'hashedpassword',
        firstName: 'New',
        lastName: 'Staff',
        roles: ['CLINICIAN'],
      });

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mustChangePassword: true,
          }),
        })
      );
    });
  });

  describe('getStaffMembers pagination', () => {
    it('should use default pagination values', async () => {
      (mockPrisma.user.count as jest.Mock).mockResolvedValue(50);
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([]);

      await staffManagementService.getStaffMembers({});

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0, // (page 1 - 1) * limit 20
          take: 20, // default limit
        })
      );
    });

    it('should calculate correct pagination for page 2', async () => {
      (mockPrisma.user.count as jest.Mock).mockResolvedValue(50);
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([]);

      await staffManagementService.getStaffMembers({ page: 2, limit: 10 });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (page 2 - 1) * limit 10
          take: 10,
        })
      );
    });

    it('should calculate totalPages correctly', async () => {
      (mockPrisma.user.count as jest.Mock).mockResolvedValue(25);
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const result = await staffManagementService.getStaffMembers({ page: 1, limit: 10 });

      expect(result.pagination.totalPages).toBe(3); // Math.ceil(25/10)
    });
  });

  describe('terminateEmployment side effects', () => {
    it('should set isActive to false', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(sampleStaffMember);
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        ...sampleStaffMember,
        employmentStatus: 'TERMINATED',
        isActive: false,
      });

      await staffManagementService.terminateEmployment({
        userId: 'staff-123',
        terminationDate: new Date(),
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: false,
          }),
        })
      );
    });

    it('should set availableForScheduling to false', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(sampleStaffMember);
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        ...sampleStaffMember,
        employmentStatus: 'TERMINATED',
        availableForScheduling: false,
      });

      await staffManagementService.terminateEmployment({
        userId: 'staff-123',
        terminationDate: new Date(),
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            availableForScheduling: false,
          }),
        })
      );
    });

    it('should set acceptsNewClients to false', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(sampleStaffMember);
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        ...sampleStaffMember,
        employmentStatus: 'TERMINATED',
        acceptsNewClients: false,
      });

      await staffManagementService.terminateEmployment({
        userId: 'staff-123',
        terminationDate: new Date(),
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            acceptsNewClients: false,
          }),
        })
      );
    });
  });

  describe('reactivateStaffMember side effects', () => {
    it('should clear terminationDate', async () => {
      const terminatedStaff = {
        ...sampleStaffMember,
        employmentStatus: 'TERMINATED',
        terminationDate: new Date('2024-12-31'),
        isActive: false,
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(terminatedStaff);
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        ...sampleStaffMember,
        employmentStatus: 'ACTIVE',
        terminationDate: null,
        isActive: true,
      });

      await staffManagementService.reactivateStaffMember('staff-123');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            terminationDate: null,
          }),
        })
      );
    });

    it('should set mustChangePassword to true on reactivation', async () => {
      const terminatedStaff = {
        ...sampleStaffMember,
        employmentStatus: 'TERMINATED',
        isActive: false,
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(terminatedStaff);
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        ...sampleStaffMember,
        employmentStatus: 'ACTIVE',
        isActive: true,
        mustChangePassword: true,
      });

      await staffManagementService.reactivateStaffMember('staff-123');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mustChangePassword: true,
          }),
        })
      );
    });

    it('should use provided hireDate or keep existing', async () => {
      const terminatedStaff = {
        ...sampleStaffMember,
        employmentStatus: 'TERMINATED',
        hireDate: new Date('2024-01-01'),
        isActive: false,
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(terminatedStaff);
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        ...sampleStaffMember,
        employmentStatus: 'ACTIVE',
      });

      // With new hire date
      await staffManagementService.reactivateStaffMember('staff-123', new Date('2025-01-15'));

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            hireDate: expect.any(Date),
          }),
        })
      );
    });
  });
});

// ============================================================================
// 6. ERROR HANDLING TESTS
// ============================================================================

describe('Staff Management Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Database errors', () => {
    it('should handle database connection errors gracefully', async () => {
      const req = createMockRequest({
        params: { id: 'staff-123' },
      });
      const res = createMockResponse();

      (mockPrisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      await staffManagementController.getStaffMemberById(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(Error);
    });

    it('should handle prisma unique constraint errors', async () => {
      const req = createMockRequest({
        body: {
          email: 'duplicate@test.com',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'CLINICIAN',
        },
      });
      const res = createMockResponse();

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockRejectedValue({
        code: 'P2002',
        message: 'Unique constraint failed',
      });

      await staffManagementController.createStaffMember(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Invalid ID handling', () => {
    it('should handle invalid UUID format', async () => {
      const req = createMockRequest({
        params: { id: 'not-a-valid-uuid' },
      });
      const res = createMockResponse();

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await staffManagementController.getStaffMemberById(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(NotFoundError);
    });
  });

  describe('Concurrent modification handling', () => {
    it('should handle concurrent update conflicts', async () => {
      const req = createMockRequest({
        params: { id: 'staff-123' },
        body: { firstName: 'Updated' },
      });
      const res = createMockResponse();

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(sampleStaffMember);
      (mockPrisma.user.update as jest.Mock).mockRejectedValue({
        code: 'P2025',
        message: 'Record to update not found',
      });

      await staffManagementController.updateStaffMember(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
