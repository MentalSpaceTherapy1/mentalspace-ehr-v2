/**
 * Appointment Service Tests
 * Phase 5.1: Comprehensive test coverage for critical services
 */

import { appointmentService } from '../appointment.service';
import { NotFoundError, BadRequestError, ConflictError } from '../../utils/errors';
import { AppointmentStatus } from '@mentalspace/database';
import { JwtPayload } from '../../utils/jwt';
import { UserRoles } from '@mentalspace/shared';

// Mock dependencies before imports
jest.mock('../database', () => ({
  __esModule: true,
  default: {
    appointment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    clinicalNote: {
      updateMany: jest.fn(),
    },
    appointmentReminder: {
      deleteMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn({
      appointment: {
        create: jest.fn().mockResolvedValue({
          id: 'apt-123',
          clientId: 'client-123',
          clinicianId: 'clinician-123',
          appointmentDate: new Date('2024-01-15'),
          startTime: '09:00',
          endTime: '10:00',
          duration: 60,
          status: 'SCHEDULED',
          client: { id: 'client-123', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
          clinician: { id: 'clinician-123', firstName: 'Dr. Jane', lastName: 'Smith', title: 'LCSW' },
        }),
      },
    })),
  },
}));

jest.mock('../accessControl.service', () => ({
  applyAppointmentScope: jest.fn().mockImplementation((user, where) => where),
  assertCanAccessClient: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../compliance.service', () => ({
  calculateNoteDueDate: jest.fn().mockReturnValue(new Date('2024-01-20')),
}));

jest.mock('../telehealth.service', () => ({
  createTelehealthSession: jest.fn().mockResolvedValue({ id: 'session-123' }),
}));

jest.mock('../waitlist-integration.service', () => ({
  handleAppointmentCancellation: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  auditLogger: {
    info: jest.fn(),
  },
}));

import prisma from '../database';
import * as accessControlService from '../accessControl.service';
import * as telehealthService from '../telehealth.service';

describe('AppointmentService', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockClientId = 'client-123e4567-e89b-12d3-a456-426614174000';
  const mockClinicianId = 'clinician-123e4567-e89b-12d3-a456-426614174000';
  const mockAppointmentId = 'apt-123e4567-e89b-12d3-a456-426614174000';

  const mockUser: JwtPayload = {
    userId: mockUserId,
    email: 'test@example.com',
    roles: [UserRoles.CLINICIAN],
    practiceId: 'practice-123',
    sessionId: 'session-123',
    iat: Date.now(),
    exp: Date.now() + 3600000,
  };

  const mockAdminUser: JwtPayload = {
    ...mockUser,
    roles: [UserRoles.ADMINISTRATOR],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // TIME UTILITIES
  // ==========================================================================

  describe('Time Utilities', () => {
    describe('normalizeTimeFormat', () => {
      it('should pad single-digit hours with leading zero', () => {
        expect(appointmentService.normalizeTimeFormat('8:30')).toBe('08:30');
        expect(appointmentService.normalizeTimeFormat('9:00')).toBe('09:00');
      });

      it('should keep double-digit hours unchanged', () => {
        expect(appointmentService.normalizeTimeFormat('10:30')).toBe('10:30');
        expect(appointmentService.normalizeTimeFormat('14:00')).toBe('14:00');
      });

      it('should handle midnight correctly', () => {
        expect(appointmentService.normalizeTimeFormat('0:00')).toBe('00:00');
      });
    });

    describe('timeToMinutes', () => {
      it('should convert time string to minutes since midnight', () => {
        expect(appointmentService.timeToMinutes('00:00')).toBe(0);
        expect(appointmentService.timeToMinutes('01:00')).toBe(60);
        expect(appointmentService.timeToMinutes('08:30')).toBe(510);
        expect(appointmentService.timeToMinutes('14:15')).toBe(855);
        expect(appointmentService.timeToMinutes('23:59')).toBe(1439);
      });
    });

    describe('calculateDuration', () => {
      it('should calculate duration in minutes between start and end time', () => {
        expect(appointmentService.calculateDuration('09:00', '10:00')).toBe(60);
        expect(appointmentService.calculateDuration('08:30', '09:15')).toBe(45);
        expect(appointmentService.calculateDuration('14:00', '15:30')).toBe(90);
      });

      it('should handle times with single-digit hours', () => {
        expect(appointmentService.calculateDuration('8:00', '9:30')).toBe(90);
      });
    });
  });

  // ==========================================================================
  // CONFLICT DETECTION
  // ==========================================================================

  describe('Conflict Detection', () => {
    describe('checkConflicts', () => {
      it('should return empty array when no conflicts exist', async () => {
        (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);

        const conflicts = await appointmentService.checkConflicts(
          mockClinicianId,
          new Date('2024-01-15'),
          '09:00',
          '10:00'
        );

        expect(conflicts).toEqual([]);
      });

      it('should detect overlapping appointments', async () => {
        const existingAppointment = {
          id: 'existing-apt',
          startTime: '09:30',
          endTime: '10:30',
          status: 'SCHEDULED',
          client: { firstName: 'Jane', lastName: 'Doe' },
        };

        (prisma.appointment.findMany as jest.Mock).mockResolvedValue([existingAppointment]);

        const conflicts = await appointmentService.checkConflicts(
          mockClinicianId,
          new Date('2024-01-15'),
          '09:00',
          '10:00'
        );

        expect(conflicts).toHaveLength(1);
        expect(conflicts[0].id).toBe('existing-apt');
        expect(conflicts[0].clientName).toBe('Jane Doe');
      });

      it('should detect when new appointment starts within existing', async () => {
        const existingAppointment = {
          id: 'existing-apt',
          startTime: '09:00',
          endTime: '10:00',
          status: 'SCHEDULED',
          client: { firstName: 'Jane', lastName: 'Doe' },
        };

        (prisma.appointment.findMany as jest.Mock).mockResolvedValue([existingAppointment]);

        const conflicts = await appointmentService.checkConflicts(
          mockClinicianId,
          new Date('2024-01-15'),
          '09:30',
          '10:30'
        );

        expect(conflicts).toHaveLength(1);
      });

      it('should detect when new appointment contains existing', async () => {
        const existingAppointment = {
          id: 'existing-apt',
          startTime: '09:30',
          endTime: '10:00',
          status: 'SCHEDULED',
          client: { firstName: 'Jane', lastName: 'Doe' },
        };

        (prisma.appointment.findMany as jest.Mock).mockResolvedValue([existingAppointment]);

        const conflicts = await appointmentService.checkConflicts(
          mockClinicianId,
          new Date('2024-01-15'),
          '09:00',
          '11:00'
        );

        expect(conflicts).toHaveLength(1);
      });

      it('should not detect back-to-back appointments as conflicts', async () => {
        const existingAppointment = {
          id: 'existing-apt',
          startTime: '10:00',
          endTime: '11:00',
          status: 'SCHEDULED',
          client: { firstName: 'Jane', lastName: 'Doe' },
        };

        (prisma.appointment.findMany as jest.Mock).mockResolvedValue([existingAppointment]);

        const conflicts = await appointmentService.checkConflicts(
          mockClinicianId,
          new Date('2024-01-15'),
          '09:00',
          '10:00'
        );

        expect(conflicts).toHaveLength(0);
      });

      it('should exclude specific appointment from conflict check', async () => {
        const existingAppointment = {
          id: 'existing-apt',
          startTime: '09:00',
          endTime: '10:00',
          status: 'SCHEDULED',
          client: { firstName: 'Jane', lastName: 'Doe' },
        };

        (prisma.appointment.findMany as jest.Mock).mockResolvedValue([existingAppointment]);

        // When checking for the same appointment (update scenario)
        await appointmentService.checkConflicts(
          mockClinicianId,
          new Date('2024-01-15'),
          '09:00',
          '10:00',
          'existing-apt'
        );

        expect(prisma.appointment.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              id: { not: 'existing-apt' },
            }),
          })
        );
      });
    });

    describe('validateTimeSlot', () => {
      it('should return isAvailable true when no conflicts', async () => {
        (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);

        const result = await appointmentService.validateTimeSlot(
          mockClinicianId,
          new Date('2024-01-15'),
          '09:00',
          '10:00'
        );

        expect(result.isAvailable).toBe(true);
        expect(result.conflicts).toEqual([]);
      });

      it('should return isAvailable false when conflicts exist', async () => {
        const existingAppointment = {
          id: 'existing-apt',
          startTime: '09:00',
          endTime: '10:00',
          status: 'SCHEDULED',
          client: { firstName: 'Jane', lastName: 'Doe' },
        };

        (prisma.appointment.findMany as jest.Mock).mockResolvedValue([existingAppointment]);

        const result = await appointmentService.validateTimeSlot(
          mockClinicianId,
          new Date('2024-01-15'),
          '09:00',
          '10:00'
        );

        expect(result.isAvailable).toBe(false);
        expect(result.conflicts).toHaveLength(1);
      });
    });
  });

  // ==========================================================================
  // CRUD OPERATIONS
  // ==========================================================================

  describe('CRUD Operations', () => {
    describe('getAppointments', () => {
      it('should return paginated appointments', async () => {
        const mockAppointments = [
          { id: 'apt-1', clientId: mockClientId },
          { id: 'apt-2', clientId: mockClientId },
        ];

        (prisma.appointment.findMany as jest.Mock).mockResolvedValue(mockAppointments);
        (prisma.appointment.count as jest.Mock).mockResolvedValue(2);

        const result = await appointmentService.getAppointments({}, mockUser);

        expect(result.appointments).toHaveLength(2);
        expect(result.pagination.total).toBe(2);
        expect(result.pagination.page).toBe(1);
      });

      it('should apply filters correctly', async () => {
        (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.appointment.count as jest.Mock).mockResolvedValue(0);

        await appointmentService.getAppointments(
          {
            clientId: mockClientId,
            clinicianId: mockClinicianId,
            status: 'SCHEDULED' as AppointmentStatus,
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-31'),
          },
          mockUser
        );

        expect(prisma.appointment.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              clientId: mockClientId,
              clinicianId: mockClinicianId,
              status: 'SCHEDULED',
              appointmentDate: {
                gte: new Date('2024-01-01'),
                lte: new Date('2024-01-31'),
              },
            }),
          })
        );
      });

      it('should limit page size to 100 max', async () => {
        (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.appointment.count as jest.Mock).mockResolvedValue(0);

        await appointmentService.getAppointments({ limit: 500 }, mockUser);

        expect(prisma.appointment.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 100,
          })
        );
      });
    });

    describe('getAppointmentById', () => {
      it('should return appointment when found', async () => {
        const mockAppointment = {
          id: mockAppointmentId,
          clientId: mockClientId,
          clinicianId: mockClinicianId,
          client: { id: mockClientId, firstName: 'John', lastName: 'Doe' },
          clinician: { id: mockClinicianId, firstName: 'Jane', lastName: 'Smith' },
        };

        (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(mockAppointment);

        const result = await appointmentService.getAppointmentById(mockAppointmentId, mockUser);

        expect(result).toEqual(mockAppointment);
        expect(accessControlService.assertCanAccessClient).toHaveBeenCalledWith(
          mockUser,
          expect.objectContaining({ clientId: mockClientId })
        );
      });

      it('should throw NotFoundError when appointment not found', async () => {
        (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(
          appointmentService.getAppointmentById('non-existent-id', mockUser)
        ).rejects.toThrow(NotFoundError);
      });
    });

    describe('createAppointment', () => {
      const validAppointmentData = {
        clientId: mockClientId,
        clinicianId: mockClinicianId,
        appointmentDate: '2024-01-15T00:00:00.000Z',
        startTime: '09:00',
        endTime: '10:00',
        duration: 60,
        appointmentType: 'Individual Therapy',
        serviceLocation: 'Office',
        timezone: 'America/New_York',
      };

      it('should create appointment successfully', async () => {
        (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]); // No conflicts

        const result = await appointmentService.createAppointment(
          validAppointmentData,
          mockUserId,
          mockUser
        );

        expect(result).toBeDefined();
        expect(result.id).toBe('apt-123');
      });

      it('should throw ConflictError when scheduling conflict exists', async () => {
        const existingAppointment = {
          id: 'existing-apt',
          startTime: '09:00',
          endTime: '10:00',
          status: 'SCHEDULED',
          client: { firstName: 'Jane', lastName: 'Doe' },
        };

        (prisma.appointment.findMany as jest.Mock).mockResolvedValue([existingAppointment]);

        await expect(
          appointmentService.createAppointment(validAppointmentData, mockUserId, mockUser)
        ).rejects.toThrow(ConflictError);
      });

      it('should create telehealth session for Telehealth service location', async () => {
        (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);

        const telehealthData = {
          ...validAppointmentData,
          serviceLocation: 'Telehealth',
        };

        await appointmentService.createAppointment(telehealthData, mockUserId, mockUser);

        expect(telehealthService.createTelehealthSession).toHaveBeenCalled();
      });

      it('should validate group appointments have at least 2 clients', async () => {
        const invalidGroupData = {
          ...validAppointmentData,
          clientId: undefined,
          isGroupAppointment: true,
          clientIds: [mockClientId], // Only 1 client
        };

        await expect(
          appointmentService.createAppointment(invalidGroupData, mockUserId, mockUser)
        ).rejects.toThrow();
      });
    });

    describe('updateAppointment', () => {
      it('should update appointment successfully', async () => {
        const existingAppointment = {
          id: mockAppointmentId,
          clientId: mockClientId,
          clinicianId: mockClinicianId,
          appointmentDate: new Date('2024-01-15'),
          startTime: '09:00',
          endTime: '10:00',
        };

        const updatedAppointment = {
          ...existingAppointment,
          appointmentNotes: 'Updated notes',
        };

        (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(existingAppointment);
        (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]); // No conflicts
        (prisma.appointment.update as jest.Mock).mockResolvedValue(updatedAppointment);

        const result = await appointmentService.updateAppointment(
          mockAppointmentId,
          { appointmentNotes: 'Updated notes' },
          mockUserId,
          mockUser
        );

        expect(result.appointmentNotes).toBe('Updated notes');
      });

      it('should throw NotFoundError when appointment not found', async () => {
        (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(
          appointmentService.updateAppointment(
            'non-existent-id',
            { appointmentNotes: 'test' },
            mockUserId,
            mockUser
          )
        ).rejects.toThrow(NotFoundError);
      });

      it('should check for conflicts when time is being changed', async () => {
        const existingAppointment = {
          id: mockAppointmentId,
          clientId: mockClientId,
          clinicianId: mockClinicianId,
          appointmentDate: new Date('2024-01-15'),
          startTime: '09:00',
          endTime: '10:00',
        };

        (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(existingAppointment);
        (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]); // No conflicts
        (prisma.appointment.update as jest.Mock).mockResolvedValue(existingAppointment);

        await appointmentService.updateAppointment(
          mockAppointmentId,
          { startTime: '10:00', endTime: '11:00' },
          mockUserId,
          mockUser
        );

        expect(prisma.appointment.findMany).toHaveBeenCalled();
      });
    });

    describe('cancelAppointment', () => {
      it('should cancel appointment with reason', async () => {
        const existingAppointment = {
          id: mockAppointmentId,
          clientId: mockClientId,
          clinicianId: mockClinicianId,
          appointmentDate: new Date('2024-01-15'),
          startTime: '09:00',
          endTime: '10:00',
          appointmentType: 'Individual Therapy',
        };

        const cancelledAppointment = {
          ...existingAppointment,
          status: 'CANCELLED',
          cancellationReason: 'Client request',
        };

        (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(existingAppointment);
        (prisma.appointment.update as jest.Mock).mockResolvedValue(cancelledAppointment);

        const result = await appointmentService.cancelAppointment(
          mockAppointmentId,
          {
            cancellationReason: 'Client request',
            cancellationFeeApplied: false,
          },
          mockUserId,
          mockUser
        );

        expect(result.status).toBe('CANCELLED');
        expect(prisma.appointment.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              status: 'CANCELLED',
              cancellationReason: 'Client request',
            }),
          })
        );
      });

      it('should throw NotFoundError when appointment not found', async () => {
        (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(
          appointmentService.cancelAppointment(
            'non-existent-id',
            { cancellationReason: 'test', cancellationFeeApplied: false },
            mockUserId,
            mockUser
          )
        ).rejects.toThrow(NotFoundError);
      });
    });

    describe('deleteAppointment', () => {
      it('should delete appointment', async () => {
        const existingAppointment = {
          id: mockAppointmentId,
          clientId: mockClientId,
        };

        (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(existingAppointment);
        (prisma.appointment.delete as jest.Mock).mockResolvedValue(existingAppointment);

        await appointmentService.deleteAppointment(mockAppointmentId, mockUserId, mockUser);

        expect(prisma.appointment.delete).toHaveBeenCalledWith({
          where: { id: mockAppointmentId },
        });
      });
    });
  });

  // ==========================================================================
  // STATUS OPERATIONS
  // ==========================================================================

  describe('Status Operations', () => {
    describe('checkInAppointment', () => {
      it('should check in appointment', async () => {
        const existingAppointment = {
          id: mockAppointmentId,
          clientId: mockClientId,
        };

        const checkedInAppointment = {
          ...existingAppointment,
          status: 'CHECKED_IN',
          checkedInTime: '09:05',
        };

        (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(existingAppointment);
        (prisma.appointment.update as jest.Mock).mockResolvedValue(checkedInAppointment);

        const result = await appointmentService.checkInAppointment(
          mockAppointmentId,
          '09:05',
          mockUserId,
          mockUser
        );

        expect(result.status).toBe('CHECKED_IN');
        expect(result.checkedInTime).toBe('09:05');
      });
    });

    describe('checkOutAppointment', () => {
      it('should check out appointment', async () => {
        const existingAppointment = {
          id: mockAppointmentId,
          clientId: mockClientId,
        };

        const checkedOutAppointment = {
          ...existingAppointment,
          status: 'COMPLETED',
          checkedOutTime: '10:00',
        };

        (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(existingAppointment);
        (prisma.appointment.update as jest.Mock).mockResolvedValue(checkedOutAppointment);

        const result = await appointmentService.checkOutAppointment(
          mockAppointmentId,
          { checkedOutTime: '10:00' },
          mockUserId,
          mockUser
        );

        expect(result.status).toBe('COMPLETED');
        expect(result.checkedOutTime).toBe('10:00');
      });

      it('should allow setting actual duration on checkout', async () => {
        const existingAppointment = {
          id: mockAppointmentId,
          clientId: mockClientId,
        };

        (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(existingAppointment);
        (prisma.appointment.update as jest.Mock).mockResolvedValue({
          ...existingAppointment,
          actualDuration: 55,
        });

        await appointmentService.checkOutAppointment(
          mockAppointmentId,
          { checkedOutTime: '10:00', actualDuration: 55 },
          mockUserId,
          mockUser
        );

        expect(prisma.appointment.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              actualDuration: 55,
            }),
          })
        );
      });
    });

    describe('markNoShow', () => {
      it('should mark appointment as no-show', async () => {
        const existingAppointment = {
          id: mockAppointmentId,
          clientId: mockClientId,
        };

        const noShowAppointment = {
          ...existingAppointment,
          status: 'NO_SHOW',
          noShowFeeApplied: true,
        };

        (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(existingAppointment);
        (prisma.appointment.update as jest.Mock).mockResolvedValue(noShowAppointment);

        const result = await appointmentService.markNoShow(
          mockAppointmentId,
          true,
          'Client did not arrive',
          mockUserId,
          mockUser
        );

        expect(result.status).toBe('NO_SHOW');
        expect(result.noShowFeeApplied).toBe(true);
      });
    });

    describe('rescheduleAppointment', () => {
      it('should reschedule appointment to new time', async () => {
        const existingAppointment = {
          id: mockAppointmentId,
          clientId: mockClientId,
          clinicianId: mockClinicianId,
          appointmentDate: new Date('2024-01-15'),
          startTime: '09:00',
          endTime: '10:00',
        };

        const rescheduledAppointment = {
          ...existingAppointment,
          appointmentDate: new Date('2024-01-16'),
          startTime: '14:00',
          endTime: '15:00',
          status: 'RESCHEDULED',
        };

        (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(existingAppointment);
        (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]); // No conflicts
        (prisma.appointment.update as jest.Mock).mockResolvedValue(rescheduledAppointment);
        (prisma.clinicalNote.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

        const result = await appointmentService.rescheduleAppointment(
          mockAppointmentId,
          {
            appointmentDate: '2024-01-16T00:00:00.000Z',
            startTime: '14:00',
            endTime: '15:00',
          },
          mockUserId,
          mockUser
        );

        expect(result.status).toBe('RESCHEDULED');
        expect(result.startTime).toBe('14:00');
      });

      it('should throw ConflictError when new time has conflicts', async () => {
        const existingAppointment = {
          id: mockAppointmentId,
          clientId: mockClientId,
          clinicianId: mockClinicianId,
        };

        const conflictingAppointment = {
          id: 'other-apt',
          startTime: '14:00',
          endTime: '15:00',
          status: 'SCHEDULED',
          client: { firstName: 'Other', lastName: 'Client' },
        };

        (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(existingAppointment);
        (prisma.appointment.findMany as jest.Mock).mockResolvedValue([conflictingAppointment]);

        await expect(
          appointmentService.rescheduleAppointment(
            mockAppointmentId,
            {
              appointmentDate: '2024-01-16T00:00:00.000Z',
              startTime: '14:00',
              endTime: '15:00',
            },
            mockUserId,
            mockUser
          )
        ).rejects.toThrow(ConflictError);
      });

      it('should update linked clinical notes when rescheduling', async () => {
        const existingAppointment = {
          id: mockAppointmentId,
          clientId: mockClientId,
          clinicianId: mockClinicianId,
        };

        (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(existingAppointment);
        (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.appointment.update as jest.Mock).mockResolvedValue({
          ...existingAppointment,
          status: 'RESCHEDULED',
        });
        (prisma.clinicalNote.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

        await appointmentService.rescheduleAppointment(
          mockAppointmentId,
          {
            appointmentDate: '2024-01-16T00:00:00.000Z',
            startTime: '14:00',
            endTime: '15:00',
          },
          mockUserId,
          mockUser
        );

        expect(prisma.clinicalNote.updateMany).toHaveBeenCalledWith({
          where: { appointmentId: mockAppointmentId },
          data: expect.objectContaining({
            sessionDate: expect.any(Date),
            dueDate: expect.any(Date),
          }),
        });
      });
    });
  });

  // ==========================================================================
  // BULK OPERATIONS
  // ==========================================================================

  describe('Bulk Operations', () => {
    describe('bulkUpdateStatus', () => {
      it('should update multiple appointments status', async () => {
        const appointmentIds = ['apt-1', 'apt-2', 'apt-3'];

        (prisma.appointment.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

        const result = await appointmentService.bulkUpdateStatus(
          appointmentIds,
          'CONFIRMED' as AppointmentStatus,
          undefined,
          mockUserId
        );

        expect(result).toBe(3);
        expect(prisma.appointment.updateMany).toHaveBeenCalledWith({
          where: { id: { in: appointmentIds } },
          data: expect.objectContaining({
            status: 'CONFIRMED',
          }),
        });
      });

      it('should throw BadRequestError for invalid status', async () => {
        await expect(
          appointmentService.bulkUpdateStatus(
            ['apt-1'],
            'INVALID_STATUS' as AppointmentStatus,
            undefined,
            mockUserId
          )
        ).rejects.toThrow(BadRequestError);
      });

      it('should include notes in update when provided', async () => {
        (prisma.appointment.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

        await appointmentService.bulkUpdateStatus(
          ['apt-1'],
          'CONFIRMED' as AppointmentStatus,
          'Bulk confirmed',
          mockUserId
        );

        expect(prisma.appointment.updateMany).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              appointmentNotes: 'Bulk confirmed',
            }),
          })
        );
      });
    });

    describe('bulkCancelAppointments', () => {
      it('should cancel multiple appointments', async () => {
        const appointmentIds = ['apt-1', 'apt-2'];

        (prisma.appointment.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

        const result = await appointmentService.bulkCancelAppointments(
          appointmentIds,
          'Schedule change',
          'Rescheduling due to holiday',
          mockUserId
        );

        expect(result).toBe(2);
        expect(prisma.appointment.updateMany).toHaveBeenCalledWith({
          where: { id: { in: appointmentIds } },
          data: expect.objectContaining({
            status: 'CANCELLED',
            cancellationReason: 'Schedule change',
          }),
        });
      });
    });

    describe('bulkDeleteAppointments', () => {
      it('should delete multiple appointments and their reminders', async () => {
        const appointmentIds = ['apt-1', 'apt-2'];

        (prisma.appointmentReminder.deleteMany as jest.Mock).mockResolvedValue({ count: 4 });
        (prisma.appointment.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });

        const result = await appointmentService.bulkDeleteAppointments(appointmentIds, mockUserId);

        expect(result).toBe(2);
        expect(prisma.appointmentReminder.deleteMany).toHaveBeenCalledWith({
          where: { appointmentId: { in: appointmentIds } },
        });
        expect(prisma.appointment.deleteMany).toHaveBeenCalledWith({
          where: { id: { in: appointmentIds } },
        });
      });
    });

    describe('bulkAssignRoom', () => {
      it('should assign room to multiple appointments', async () => {
        const appointmentIds = ['apt-1', 'apt-2'];

        (prisma.appointment.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

        const result = await appointmentService.bulkAssignRoom(
          appointmentIds,
          'Room A',
          mockUserId
        );

        expect(result).toBe(2);
        expect(prisma.appointment.updateMany).toHaveBeenCalledWith({
          where: { id: { in: appointmentIds } },
          data: { room: 'Room A' },
        });
      });
    });
  });

  // ==========================================================================
  // RESOURCE VIEWS
  // ==========================================================================

  describe('Resource Views', () => {
    describe('getRoomView', () => {
      it('should return room schedules with occupancy rates', async () => {
        const mockAppointments = [
          {
            id: 'apt-1',
            room: 'Room A',
            appointmentDate: new Date('2024-01-15'),
            startTime: '09:00',
            endTime: '10:00',
            duration: 60,
            status: 'SCHEDULED',
            client: { id: 'client-1', firstName: 'John', lastName: 'Doe' },
            clinician: { id: 'clinician-1', firstName: 'Jane', lastName: 'Smith', title: 'LCSW' },
            appointmentTypeObj: { typeName: 'Individual', colorCode: '#3b82f6', category: 'Therapy' },
            confirmedAt: null,
          },
          {
            id: 'apt-2',
            room: 'Room B',
            appointmentDate: new Date('2024-01-15'),
            startTime: '10:00',
            endTime: '11:00',
            duration: 60,
            status: 'CONFIRMED',
            client: { id: 'client-2', firstName: 'Jane', lastName: 'Doe' },
            clinician: { id: 'clinician-1', firstName: 'Jane', lastName: 'Smith', title: 'LCSW' },
            appointmentTypeObj: { typeName: 'Group', colorCode: '#10b981', category: 'Group' },
            confirmedAt: new Date(),
          },
        ];

        (prisma.appointment.findMany as jest.Mock).mockResolvedValue(mockAppointments);

        const result = await appointmentService.getRoomView(
          new Date('2024-01-15'),
          new Date('2024-01-15')
        );

        expect(result.summary.totalRooms).toBe(2);
        expect(result.summary.totalAppointments).toBe(2);
        expect(result.roomSchedules).toHaveLength(2);
        expect(result.roomSchedules[0].room).toBe('Room A');
        expect(result.roomSchedules[0].totalAppointments).toBe(1);
      });
    });

    describe('getProviderComparison', () => {
      it('should return provider schedules for comparison', async () => {
        const mockProviders = [
          { id: 'provider-1', firstName: 'Jane', lastName: 'Smith', title: 'LCSW' },
          { id: 'provider-2', firstName: 'John', lastName: 'Doe', title: 'LPC' },
        ];

        const mockAppointments = [
          {
            id: 'apt-1',
            clinicianId: 'provider-1',
            client: { id: 'client-1', firstName: 'Client', lastName: 'One', dateOfBirth: new Date() },
            clinician: mockProviders[0],
            appointmentDate: new Date('2024-01-15'),
            startTime: '09:00',
            endTime: '10:00',
            duration: 60,
            status: 'SCHEDULED',
            appointmentType: 'Individual',
            serviceLocation: 'Office',
            room: 'Room A',
            appointmentTypeObj: { typeName: 'Individual', colorCode: '#3b82f6', category: 'Therapy' },
            confirmedAt: null,
            noShowRiskLevel: null,
          },
        ];

        (prisma.user.findMany as jest.Mock).mockResolvedValue(mockProviders);
        (prisma.appointment.findMany as jest.Mock).mockResolvedValue(mockAppointments);

        const result = await appointmentService.getProviderComparison(
          ['provider-1', 'provider-2'],
          new Date('2024-01-15'),
          new Date('2024-01-15')
        );

        expect(result.summary.totalProviders).toBe(2);
        expect(result.summary.totalAppointments).toBe(1);
        expect(result.providerSchedules).toHaveLength(2);
        expect(result.providerSchedules[0].providerId).toBe('provider-1');
        expect(result.providerSchedules[0].totalAppointments).toBe(1);
        expect(result.providerSchedules[1].totalAppointments).toBe(0);
      });
    });
  });

  // ==========================================================================
  // SPECIAL OPERATIONS
  // ==========================================================================

  describe('Special Operations', () => {
    describe('getOrCreateAppointment', () => {
      it('should return existing appointment if found', async () => {
        const existingAppointment = {
          id: mockAppointmentId,
          clientId: mockClientId,
          clinicianId: mockClinicianId,
          appointmentDate: new Date('2024-01-15'),
          startTime: '09:00',
          endTime: '10:00',
          client: { id: mockClientId, firstName: 'John', lastName: 'Doe' },
          clinician: { id: mockClinicianId, firstName: 'Jane', lastName: 'Smith', title: 'LCSW' },
        };

        (prisma.appointment.findFirst as jest.Mock).mockResolvedValue(existingAppointment);

        const result = await appointmentService.getOrCreateAppointment(
          mockClientId,
          mockClinicianId,
          new Date('2024-01-15'),
          '09:00',
          '10:00',
          'Individual Therapy',
          'Office',
          mockUserId,
          mockUser
        );

        expect(result.created).toBe(false);
        expect(result.appointment.id).toBe(mockAppointmentId);
        expect(prisma.appointment.create).not.toHaveBeenCalled();
      });

      it('should create new appointment if not found', async () => {
        const newAppointment = {
          id: 'new-apt-id',
          clientId: mockClientId,
          clinicianId: mockClinicianId,
          client: { id: mockClientId, firstName: 'John', lastName: 'Doe' },
          clinician: { id: mockClinicianId, firstName: 'Jane', lastName: 'Smith', title: 'LCSW' },
        };

        (prisma.appointment.findFirst as jest.Mock).mockResolvedValue(null);
        (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]); // No conflicts
        (prisma.appointment.create as jest.Mock).mockResolvedValue(newAppointment);

        const result = await appointmentService.getOrCreateAppointment(
          mockClientId,
          mockClinicianId,
          new Date('2024-01-15'),
          '09:00',
          '10:00',
          'Individual Therapy',
          'Office',
          mockUserId,
          mockUser
        );

        expect(result.created).toBe(true);
        expect(prisma.appointment.create).toHaveBeenCalled();
      });

      it('should throw BadRequestError for invalid duration', async () => {
        (prisma.appointment.findFirst as jest.Mock).mockResolvedValue(null);

        await expect(
          appointmentService.getOrCreateAppointment(
            mockClientId,
            mockClinicianId,
            new Date('2024-01-15'),
            '10:00', // End before start = negative duration
            '09:00',
            'Individual Therapy',
            'Office',
            mockUserId,
            mockUser
          )
        ).rejects.toThrow(BadRequestError);
      });
    });

    describe('quickReschedule', () => {
      it('should reschedule and recalculate duration', async () => {
        const existingAppointment = {
          id: mockAppointmentId,
          clientId: mockClientId,
          clinicianId: mockClinicianId,
          appointmentDate: new Date('2024-01-15'),
          startTime: '09:00',
          endTime: '10:00',
          client: { id: mockClientId, firstName: 'John', lastName: 'Doe' },
          clinician: { id: mockClinicianId, firstName: 'Jane', lastName: 'Smith', title: 'LCSW' },
        };

        const rescheduledAppointment = {
          ...existingAppointment,
          appointmentDate: new Date('2024-01-16'),
          startTime: '14:00',
          endTime: '15:30',
          duration: 90,
          status: 'RESCHEDULED',
        };

        (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(existingAppointment);
        (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]); // No conflicts
        (prisma.appointment.update as jest.Mock).mockResolvedValue(rescheduledAppointment);
        (prisma.clinicalNote.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

        const result = await appointmentService.quickReschedule(
          mockAppointmentId,
          new Date('2024-01-16'),
          '14:00',
          '15:30',
          undefined,
          mockUserId,
          mockUser
        );

        expect(prisma.appointment.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              duration: 90, // Calculated: 15:30 - 14:00 = 90 minutes
            }),
          })
        );
      });

      it('should allow reassignment to different clinician', async () => {
        const existingAppointment = {
          id: mockAppointmentId,
          clientId: mockClientId,
          clinicianId: mockClinicianId,
          client: { id: mockClientId },
          clinician: { id: mockClinicianId },
        };

        const newClinicianId = 'new-clinician-id';

        (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(existingAppointment);
        (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.appointment.update as jest.Mock).mockResolvedValue({
          ...existingAppointment,
          clinicianId: newClinicianId,
        });
        (prisma.clinicalNote.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

        await appointmentService.quickReschedule(
          mockAppointmentId,
          new Date('2024-01-16'),
          '14:00',
          '15:00',
          newClinicianId,
          mockUserId,
          mockUser
        );

        expect(prisma.appointment.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              clinicianId: newClinicianId,
            }),
          })
        );
      });
    });
  });
});
