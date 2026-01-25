/**
 * Appointment Controller Tests
 *
 * HIPAA Compliance: PHI access control and audit logging
 * Tests for CRUD operations, scheduling, check-in/check-out, telehealth
 */

import { Request, Response } from 'express';
import {
  getAppointmentsByClientId,
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  checkInAppointment,
  checkOutAppointment,
  cancelAppointment,
  rescheduleAppointment,
  startTelehealthSession,
  endTelehealthSession,
} from '../appointment.controller';

// Mock dependencies
jest.mock('../../services/database', () => ({
  __esModule: true,
  default: {
    appointment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    client: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    clinicalNote: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../services/accessControl.service', () => ({
  applyAppointmentScope: jest.fn(),
  assertCanAccessClient: jest.fn(),
}));

jest.mock('../../services/compliance.service', () => ({
  calculateNoteDueDate: jest.fn(),
}));

jest.mock('../../services/telehealth.service', () => ({
  createRoom: jest.fn(),
  endSession: jest.fn(),
  getRoomToken: jest.fn(),
}));

jest.mock('../../services/waitlist-integration.service', () => ({
  notifyWaitlistOfCancellation: jest.fn(),
}));

jest.mock('../../services/advancedmd/eligibility.service', () => ({
  AdvancedMDEligibilityService: jest.fn().mockImplementation(() => ({
    checkEligibility: jest.fn().mockResolvedValue({ eligible: true }),
  })),
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logControllerError: jest.fn(),
  auditLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import prisma from '../../services/database';
import { applyAppointmentScope, assertCanAccessClient } from '../../services/accessControl.service';
import { calculateNoteDueDate } from '../../services/compliance.service';
import * as telehealthService from '../../services/telehealth.service';

// Helper to create mock request
const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  params: {},
  query: {},
  body: {},
  user: {
    id: 'user-123',
    organizationId: 'org-123',
    role: 'CLINICIAN',
    email: 'clinician@example.com',
  } as any,
  ...overrides,
});

// Helper to create mock response
const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis() as any,
    json: jest.fn().mockReturnThis() as any,
  };
  return res;
};

// Mock appointment data
const mockAppointment = {
  id: 'appt-123',
  clientId: 'client-123',
  clinicianId: 'clinician-123',
  appointmentDate: new Date('2024-01-15T09:00:00Z'),
  startTime: '09:00',
  endTime: '10:00',
  duration: 60,
  appointmentType: 'Initial Evaluation',
  status: 'SCHEDULED',
  serviceLocation: 'Office',
  timezone: 'America/New_York',
  organizationId: 'org-123',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockClient = {
  id: 'client-123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  primaryPhone: '555-123-4567',
};

const mockClinician = {
  id: 'clinician-123',
  firstName: 'Dr. Jane',
  lastName: 'Smith',
  title: 'MD',
  email: 'jane.smith@example.com',
};

describe('Appointment Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAppointmentsByClientId', () => {
    it('should return appointments for a specific client', async () => {
      const req = createMockRequest({
        params: { clientId: 'client-123' },
      });
      const res = createMockResponse();

      (assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([
        { ...mockAppointment, clinician: mockClinician },
      ]);

      await getAppointmentsByClientId(req as Request, res as Response);

      expect(assertCanAccessClient).toHaveBeenCalledWith(
        req.user,
        { clientId: 'client-123', allowBillingView: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ id: 'appt-123' }),
        ]),
      });
    });

    it('should return 500 on database error', async () => {
      const req = createMockRequest({
        params: { clientId: 'client-123' },
      });
      const res = createMockResponse();

      (assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
      (prisma.appointment.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      await getAppointmentsByClientId(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Failed to retrieve client appointments',
        })
      );
    });

    it('should enforce access control for client access', async () => {
      const req = createMockRequest({
        params: { clientId: 'client-123' },
      });
      const res = createMockResponse();

      (assertCanAccessClient as jest.Mock).mockRejectedValue(new Error('Access denied'));

      await getAppointmentsByClientId(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllAppointments', () => {
    it('should return paginated appointments with filters', async () => {
      const req = createMockRequest({
        query: {
          clinicianId: 'clinician-123',
          status: 'SCHEDULED',
          page: '1',
          limit: '10',
        },
      });
      const res = createMockResponse();

      (applyAppointmentScope as jest.Mock).mockResolvedValue({
        clinicianId: 'clinician-123',
        status: 'SCHEDULED',
      });
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([
        { ...mockAppointment, client: mockClient, clinician: mockClinician },
      ]);
      (prisma.appointment.count as jest.Mock).mockResolvedValue(1);

      await getAllAppointments(req as Request, res as Response);

      expect(applyAppointmentScope).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Array),
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
        },
      });
    });

    it('should filter appointments by date range', async () => {
      const req = createMockRequest({
        query: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
        },
      });
      const res = createMockResponse();

      (applyAppointmentScope as jest.Mock).mockImplementation(
        (user, where) => Promise.resolve(where)
      );
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.appointment.count as jest.Mock).mockResolvedValue(0);

      await getAllAppointments(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createAppointment', () => {
    const validAppointmentData = {
      clientId: 'client-123',
      clinicianId: 'clinician-123',
      appointmentDate: '2024-01-15T09:00:00Z',
      startTime: '09:00',
      endTime: '10:00',
      duration: 60,
      appointmentType: 'Initial Evaluation',
      serviceLocation: 'Office',
    };

    it('should create a new appointment', async () => {
      const req = createMockRequest({
        body: validAppointmentData,
      });
      const res = createMockResponse();

      (assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]); // No conflicts
      (prisma.appointment.create as jest.Mock).mockResolvedValue({
        ...mockAppointment,
        client: mockClient,
        clinician: mockClinician,
      });
      (calculateNoteDueDate as jest.Mock).mockReturnValue(new Date('2024-01-17'));

      await createAppointment(req as Request, res as Response);

      expect(assertCanAccessClient).toHaveBeenCalled();
      expect(prisma.appointment.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should reject appointment creation with validation errors', async () => {
      const req = createMockRequest({
        body: {
          // Missing required fields
          appointmentType: 'Initial Evaluation',
        },
      });
      const res = createMockResponse();

      await createAppointment(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });

    it('should detect scheduling conflicts', async () => {
      const req = createMockRequest({
        body: validAppointmentData,
      });
      const res = createMockResponse();

      (assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
      // Return existing appointment at same time
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([mockAppointment]);

      await createAppointment(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('conflict'),
        })
      );
    });
  });

  describe('updateAppointment', () => {
    it('should update an existing appointment', async () => {
      const req = createMockRequest({
        params: { id: 'appt-123' },
        body: {
          appointmentNotes: 'Updated notes',
        },
      });
      const res = createMockResponse();

      (prisma.appointment.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockAppointment)
        .mockResolvedValueOnce({ ...mockAppointment, appointmentNotes: 'Updated notes' });
      (assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
      (prisma.appointment.update as jest.Mock).mockResolvedValue({
        ...mockAppointment,
        appointmentNotes: 'Updated notes',
        client: mockClient,
        clinician: mockClinician,
      });

      await updateAppointment(req as Request, res as Response);

      expect(prisma.appointment.update).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 for non-existent appointment', async () => {
      const req = createMockRequest({
        params: { id: 'non-existent' },
        body: { appointmentNotes: 'Updated notes' },
      });
      const res = createMockResponse();

      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(null);

      await updateAppointment(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('checkInAppointment', () => {
    it('should check in a scheduled appointment', async () => {
      const req = createMockRequest({
        params: { id: 'appt-123' },
        body: { checkedInTime: '09:05' },
      });
      const res = createMockResponse();

      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(mockAppointment);
      (assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
      (prisma.appointment.update as jest.Mock).mockResolvedValue({
        ...mockAppointment,
        status: 'CHECKED_IN',
        checkedInTime: '09:05',
      });

      await checkInAppointment(req as Request, res as Response);

      expect(prisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'CHECKED_IN',
            checkedInTime: '09:05',
          }),
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should reject check-in for non-scheduled appointment', async () => {
      const req = createMockRequest({
        params: { id: 'appt-123' },
        body: { checkedInTime: '09:05' },
      });
      const res = createMockResponse();

      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue({
        ...mockAppointment,
        status: 'CANCELLED',
      });
      (assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);

      await checkInAppointment(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('checkOutAppointment', () => {
    it('should check out a checked-in appointment', async () => {
      const req = createMockRequest({
        params: { id: 'appt-123' },
        body: { checkedOutTime: '10:00' },
      });
      const res = createMockResponse();

      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue({
        ...mockAppointment,
        status: 'IN_PROGRESS',
      });
      (assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
      (prisma.appointment.update as jest.Mock).mockResolvedValue({
        ...mockAppointment,
        status: 'COMPLETED',
        checkedOutTime: '10:00',
      });

      await checkOutAppointment(req as Request, res as Response);

      expect(prisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
            checkedOutTime: '10:00',
          }),
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('cancelAppointment', () => {
    it('should cancel a scheduled appointment', async () => {
      const req = createMockRequest({
        params: { id: 'appt-123' },
        body: {
          cancellationReason: 'Client request',
          cancellationNotes: 'Rescheduling for next week',
        },
      });
      const res = createMockResponse();

      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(mockAppointment);
      (assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
      (prisma.appointment.update as jest.Mock).mockResolvedValue({
        ...mockAppointment,
        status: 'CANCELLED',
      });

      await cancelAppointment(req as Request, res as Response);

      expect(prisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'CANCELLED',
            cancellationReason: 'Client request',
          }),
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should require cancellation reason', async () => {
      const req = createMockRequest({
        params: { id: 'appt-123' },
        body: {}, // Missing required reason
      });
      const res = createMockResponse();

      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(mockAppointment);
      (assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);

      await cancelAppointment(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('rescheduleAppointment', () => {
    it('should reschedule an appointment to a new time', async () => {
      const req = createMockRequest({
        params: { id: 'appt-123' },
        body: {
          appointmentDate: '2024-01-16T10:00:00Z',
          startTime: '10:00',
          endTime: '11:00',
        },
      });
      const res = createMockResponse();

      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(mockAppointment);
      (assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]); // No conflicts
      (prisma.appointment.update as jest.Mock).mockResolvedValue({
        ...mockAppointment,
        appointmentDate: new Date('2024-01-16T10:00:00Z'),
        startTime: '10:00',
        endTime: '11:00',
      });

      await rescheduleAppointment(req as Request, res as Response);

      expect(prisma.appointment.update).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should detect conflicts when rescheduling', async () => {
      const req = createMockRequest({
        params: { id: 'appt-123' },
        body: {
          appointmentDate: '2024-01-16T10:00:00Z',
          startTime: '10:00',
          endTime: '11:00',
        },
      });
      const res = createMockResponse();

      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(mockAppointment);
      (assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
      // Return conflicting appointment
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([
        { ...mockAppointment, id: 'other-appt' },
      ]);

      await rescheduleAppointment(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('deleteAppointment', () => {
    it('should soft delete an appointment', async () => {
      const req = createMockRequest({
        params: { id: 'appt-123' },
      });
      const res = createMockResponse();

      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(mockAppointment);
      (assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
      (prisma.appointment.update as jest.Mock).mockResolvedValue({
        ...mockAppointment,
        deletedAt: new Date(),
      });

      await deleteAppointment(req as Request, res as Response);

      // Should use soft delete (update with deletedAt) rather than hard delete
      expect(prisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('HIPAA Compliance', () => {
    it('should enforce access control on all PHI operations', async () => {
      const req = createMockRequest({
        params: { clientId: 'client-123' },
        user: {
          id: 'unauthorized-user',
          organizationId: 'different-org',
          role: 'CLINICIAN',
        } as any,
      });
      const res = createMockResponse();

      (assertCanAccessClient as jest.Mock).mockRejectedValue(
        new Error('Access denied: User cannot access this client')
      );

      await getAppointmentsByClientId(req as Request, res as Response);

      expect(assertCanAccessClient).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should apply organization scope to appointment queries', async () => {
      const req = createMockRequest({
        query: {},
      });
      const res = createMockResponse();

      (applyAppointmentScope as jest.Mock).mockResolvedValue({
        organizationId: 'org-123',
      });
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.appointment.count as jest.Mock).mockResolvedValue(0);

      await getAllAppointments(req as Request, res as Response);

      expect(applyAppointmentScope).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('Group Appointments', () => {
    it('should create a group appointment with multiple clients', async () => {
      const req = createMockRequest({
        body: {
          isGroupAppointment: true,
          clientIds: ['client-1', 'client-2', 'client-3'],
          clinicianId: 'clinician-123',
          appointmentDate: '2024-01-15T14:00:00Z',
          startTime: '14:00',
          endTime: '15:30',
          duration: 90,
          appointmentType: 'Group Therapy',
          serviceLocation: 'Office',
        },
      });
      const res = createMockResponse();

      (assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.appointment.create as jest.Mock).mockResolvedValue({
        id: 'group-appt-123',
        isGroupAppointment: true,
        groupClientIds: ['client-1', 'client-2', 'client-3'],
      });
      (calculateNoteDueDate as jest.Mock).mockReturnValue(new Date('2024-01-17'));

      await createAppointment(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should require at least 2 clients for group appointments', async () => {
      const req = createMockRequest({
        body: {
          isGroupAppointment: true,
          clientIds: ['client-1'], // Only 1 client
          clinicianId: 'clinician-123',
          appointmentDate: '2024-01-15T14:00:00Z',
          startTime: '14:00',
          endTime: '15:30',
          duration: 90,
          appointmentType: 'Group Therapy',
          serviceLocation: 'Office',
        },
      });
      const res = createMockResponse();

      await createAppointment(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Telehealth Integration', () => {
    it('should start a telehealth session', async () => {
      const req = createMockRequest({
        params: { id: 'appt-123' },
      });
      const res = createMockResponse();

      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue({
        ...mockAppointment,
        serviceLocation: 'Telehealth',
      });
      (assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);
      (telehealthService.createRoom as jest.Mock).mockResolvedValue({
        roomSid: 'room-123',
        roomName: 'appt-123-room',
      });

      await startTelehealthSession(req as Request, res as Response);

      expect(telehealthService.createRoom).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should reject telehealth for non-telehealth appointments', async () => {
      const req = createMockRequest({
        params: { id: 'appt-123' },
      });
      const res = createMockResponse();

      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue({
        ...mockAppointment,
        serviceLocation: 'Office', // Not telehealth
      });
      (assertCanAccessClient as jest.Mock).mockResolvedValue(undefined);

      await startTelehealthSession(req as Request, res as Response);

      expect(telehealthService.createRoom).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
