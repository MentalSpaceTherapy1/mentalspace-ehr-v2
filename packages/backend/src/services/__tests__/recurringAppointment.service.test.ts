// Create mock functions first
const mockAppointmentFindMany = jest.fn();
const mockAppointmentUpdate = jest.fn();

// Mock the database module
jest.mock('../database', () => ({
  __esModule: true,
  default: {
    appointment: {
      findMany: mockAppointmentFindMany,
      update: mockAppointmentUpdate,
    },
  },
}));

// Import after mocking
import {
  generateRecurringAppointments,
  updateSingleOccurrence,
  updateEntireSeries,
  cancelSingleOccurrence,
  cancelEntireSeries,
  checkSeriesConflicts,
  getSeriesAppointments,
} from '../recurringAppointment.service';

describe('RecurringAppointment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseAppointmentData = {
    clientId: 'client-123',
    clinicianId: 'clinician-456',
    appointmentDate: '2024-01-15T09:00:00.000Z',
    startTime: '09:00',
    endTime: '10:00',
    duration: 60,
    appointmentType: 'Individual Therapy',
    serviceLocation: 'Office',
    timezone: 'America/New_York',
    createdBy: 'admin-user',
    statusUpdatedBy: 'admin-user',
  };

  describe('generateRecurringAppointments', () => {
    it('should generate weekly appointments for specified count', async () => {
      const pattern = {
        frequency: 'weekly' as const,
        count: 4,
      };

      const appointments = await generateRecurringAppointments(baseAppointmentData, pattern);

      // Should generate 4+ appointments for weekly pattern
      expect(appointments.length).toBeGreaterThanOrEqual(4);
      expect(appointments[0].isRecurring).toBe(true);
      expect(appointments[0].recurrenceFrequency).toBe('weekly');
      expect(appointments[0].clientId).toBe('client-123');
      expect(appointments[0].clinicianId).toBe('clinician-456');
    });

    it('should generate bi-weekly appointments', async () => {
      const pattern = {
        frequency: 'bi_weekly' as const,
        count: 3,
      };

      const appointments = await generateRecurringAppointments(baseAppointmentData, pattern);

      expect(appointments.length).toBeGreaterThanOrEqual(3);
      expect(appointments[0].recurrenceFrequency).toBe('bi_weekly');

      // Bi-weekly appointments should be 14 days apart
      if (appointments.length >= 2) {
        const date1 = new Date(appointments[0].appointmentDate as Date);
        const date2 = new Date(appointments[1].appointmentDate as Date);
        const daysDiff = Math.round((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
        expect(daysDiff).toBe(14);
      }
    });

    it('should generate monthly appointments', async () => {
      const pattern = {
        frequency: 'monthly' as const,
        count: 3,
      };

      const appointments = await generateRecurringAppointments(baseAppointmentData, pattern);

      expect(appointments.length).toBeGreaterThanOrEqual(3);
      expect(appointments[0].recurrenceFrequency).toBe('monthly');
    });

    it('should generate twice weekly appointments', async () => {
      const pattern = {
        frequency: 'twice_weekly' as const,
        daysOfWeek: ['Monday', 'Thursday'],
        count: 6,
      };

      const appointments = await generateRecurringAppointments(baseAppointmentData, pattern);

      expect(appointments.length).toBeGreaterThan(0);
      expect(appointments[0].recurrenceFrequency).toBe('twice_weekly');
      expect(appointments[0].recurrenceDaysOfWeek).toEqual(['Monday', 'Thursday']);
    });

    it('should generate custom day appointments', async () => {
      const pattern = {
        frequency: 'custom' as const,
        daysOfWeek: ['Tuesday', 'Friday'],
        count: 4,
      };

      const appointments = await generateRecurringAppointments(baseAppointmentData, pattern);

      expect(appointments.length).toBeGreaterThan(0);
      expect(appointments[0].recurrenceFrequency).toBe('custom');
      expect(appointments[0].recurrenceDaysOfWeek).toEqual(['Tuesday', 'Friday']);
    });

    it('should use end date when provided', async () => {
      const endDate = new Date('2024-02-15');
      const pattern = {
        frequency: 'weekly' as const,
        endDate: endDate.toISOString(),
      };

      const appointments = await generateRecurringAppointments(baseAppointmentData, pattern);

      expect(appointments.length).toBeGreaterThan(0);
      expect(appointments[0].recurrenceEndDate).toEqual(endDate);

      // All appointments should be before end date
      for (const apt of appointments) {
        const aptDate = new Date(apt.appointmentDate as Date);
        expect(aptDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
      }
    });

    it('should default to 6 months when no end date or count provided', async () => {
      const pattern = {
        frequency: 'weekly' as const,
      };

      const appointments = await generateRecurringAppointments(baseAppointmentData, pattern);

      expect(appointments.length).toBeGreaterThan(0);

      // Should be approximately 26 weeks worth of appointments
      const startDate = new Date(baseAppointmentData.appointmentDate);
      const lastApt = new Date(appointments[appointments.length - 1].appointmentDate as Date);
      const monthsDiff = (lastApt.getFullYear() - startDate.getFullYear()) * 12 +
                         (lastApt.getMonth() - startDate.getMonth());
      expect(monthsDiff).toBeLessThanOrEqual(6);
    });

    it('should preserve appointment data in generated appointments', async () => {
      const pattern = {
        frequency: 'weekly' as const,
        count: 2,
      };

      const dataWithOptions = {
        ...baseAppointmentData,
        cptCode: '90837',
        icdCodes: ['F32.1', 'F41.1'],
        appointmentNotes: 'Weekly session',
      };

      const appointments = await generateRecurringAppointments(dataWithOptions, pattern);

      expect(appointments[0].cptCode).toBe('90837');
      expect(appointments[0].icdCodes).toEqual(['F32.1', 'F41.1']);
      expect(appointments[0].appointmentNotes).toBe('Weekly session');
      expect(appointments[0].status).toBe('SCHEDULED');
    });

    it('should assign same parentRecurrenceId to all appointments in series', async () => {
      const pattern = {
        frequency: 'weekly' as const,
        count: 4,
      };

      const appointments = await generateRecurringAppointments(baseAppointmentData, pattern);

      const parentId = appointments[0].parentRecurrenceId;
      expect(parentId).toBeDefined();
      expect(parentId).toMatch(/^REC-\d+-\w+$/);

      // All appointments should have the same parent ID
      for (const apt of appointments) {
        expect(apt.parentRecurrenceId).toBe(parentId);
      }
    });
  });

  describe('updateSingleOccurrence', () => {
    it('should update a single appointment in series', async () => {
      const updateData = {
        startTime: '10:00',
        endTime: '11:00',
      };

      mockAppointmentUpdate.mockResolvedValue({
        id: 'apt-123',
        ...updateData,
        isRecurring: true,
      });

      const result = await updateSingleOccurrence('apt-123', updateData);

      expect(mockAppointmentUpdate).toHaveBeenCalledWith({
        where: { id: 'apt-123' },
        data: {
          ...updateData,
          isRecurring: true,
        },
      });
      expect(result.startTime).toBe('10:00');
    });
  });

  describe('updateEntireSeries', () => {
    it('should update all future appointments in series', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      mockAppointmentFindMany.mockResolvedValue([
        { id: 'apt-1', appointmentDate: pastDate, status: 'COMPLETED' },
        { id: 'apt-2', appointmentDate: futureDate, status: 'SCHEDULED' },
        { id: 'apt-3', appointmentDate: new Date(futureDate.getTime() + 7 * 24 * 60 * 60 * 1000), status: 'SCHEDULED' },
      ]);
      mockAppointmentUpdate.mockResolvedValue({});

      const updateData = { appointmentNotes: 'Updated notes' };
      await updateEntireSeries('REC-12345', updateData);

      expect(mockAppointmentFindMany).toHaveBeenCalledWith({
        where: { parentRecurrenceId: 'REC-12345' },
      });

      // Should only update future appointments (apt-2 and apt-3)
      expect(mockAppointmentUpdate).toHaveBeenCalledTimes(2);
    });
  });

  describe('cancelSingleOccurrence', () => {
    it('should cancel a single appointment', async () => {
      mockAppointmentUpdate.mockResolvedValue({
        id: 'apt-123',
        status: 'CANCELLED',
        cancellationReason: 'Client requested',
        cancelledBy: 'admin-user',
      });

      const result = await cancelSingleOccurrence('apt-123', 'Client requested', 'admin-user');

      expect(mockAppointmentUpdate).toHaveBeenCalledWith({
        where: { id: 'apt-123' },
        data: {
          status: 'CANCELLED',
          cancellationReason: 'Client requested',
          cancellationDate: expect.any(Date),
          cancelledBy: 'admin-user',
        },
      });
      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('cancelEntireSeries', () => {
    it('should cancel all future non-completed appointments in series', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      mockAppointmentFindMany.mockResolvedValue([
        { id: 'apt-1', appointmentDate: pastDate, status: 'COMPLETED' },
        { id: 'apt-2', appointmentDate: futureDate, status: 'SCHEDULED' },
        { id: 'apt-3', appointmentDate: new Date(futureDate.getTime() + 7 * 24 * 60 * 60 * 1000), status: 'SCHEDULED' },
      ]);
      mockAppointmentUpdate.mockResolvedValue({});

      await cancelEntireSeries('REC-12345', 'Series cancelled', 'admin-user');

      expect(mockAppointmentFindMany).toHaveBeenCalledWith({
        where: { parentRecurrenceId: 'REC-12345' },
      });

      // Should only cancel future non-completed appointments (apt-2 and apt-3)
      expect(mockAppointmentUpdate).toHaveBeenCalledTimes(2);
      expect(mockAppointmentUpdate).toHaveBeenCalledWith({
        where: { id: 'apt-2' },
        data: expect.objectContaining({
          status: 'CANCELLED',
          cancellationReason: 'Series cancelled',
          cancelledBy: 'admin-user',
        }),
      });
    });

    it('should not cancel past or completed appointments', async () => {
      const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      mockAppointmentFindMany.mockResolvedValue([
        { id: 'apt-1', appointmentDate: pastDate, status: 'COMPLETED' },
      ]);

      await cancelEntireSeries('REC-12345', 'Series cancelled', 'admin-user');

      // No updates should be made for past/completed appointments
      expect(mockAppointmentUpdate).not.toHaveBeenCalled();
    });
  });

  describe('checkSeriesConflicts', () => {
    it('should detect conflicts when time overlaps', async () => {
      const dates = [new Date('2024-01-15')];
      mockAppointmentFindMany.mockResolvedValue([
        { id: 'apt-existing', startTime: '09:30', endTime: '10:30', status: 'SCHEDULED' },
      ]);

      const result = await checkSeriesConflicts('clinician-123', dates, '09:00', '10:00');

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0].existingAppointment.id).toBe('apt-existing');
    });

    it('should not detect conflict when times do not overlap', async () => {
      const dates = [new Date('2024-01-15')];
      mockAppointmentFindMany.mockResolvedValue([
        { id: 'apt-existing', startTime: '11:00', endTime: '12:00', status: 'SCHEDULED' },
      ]);

      const result = await checkSeriesConflicts('clinician-123', dates, '09:00', '10:00');

      expect(result.hasConflicts).toBe(false);
      expect(result.conflicts.length).toBe(0);
    });

    it('should ignore cancelled appointments when checking conflicts', async () => {
      const dates = [new Date('2024-01-15')];
      // Mock returns no appointments because cancelled/no-show are filtered
      mockAppointmentFindMany.mockResolvedValue([]);

      const result = await checkSeriesConflicts('clinician-123', dates, '09:00', '10:00');

      expect(result.hasConflicts).toBe(false);
      expect(mockAppointmentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: {
              notIn: ['CANCELLED', 'NO_SHOW'],
            },
          }),
        })
      );
    });

    it('should check multiple dates for conflicts', async () => {
      const dates = [new Date('2024-01-15'), new Date('2024-01-22')];
      mockAppointmentFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
        { id: 'apt-conflict', startTime: '09:00', endTime: '10:00', status: 'SCHEDULED' },
      ]);

      const result = await checkSeriesConflicts('clinician-123', dates, '09:00', '10:00');

      expect(mockAppointmentFindMany).toHaveBeenCalledTimes(2);
      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts.length).toBe(1);
    });
  });

  describe('getSeriesAppointments', () => {
    it('should retrieve all appointments in a series ordered by date', async () => {
      const mockAppointments = [
        { id: 'apt-1', appointmentDate: new Date('2024-01-15') },
        { id: 'apt-2', appointmentDate: new Date('2024-01-22') },
        { id: 'apt-3', appointmentDate: new Date('2024-01-29') },
      ];

      mockAppointmentFindMany.mockResolvedValue(mockAppointments);

      const result = await getSeriesAppointments('REC-12345');

      expect(mockAppointmentFindMany).toHaveBeenCalledWith({
        where: { parentRecurrenceId: 'REC-12345' },
        orderBy: { appointmentDate: 'asc' },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              primaryPhone: true,
            },
          },
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              title: true,
              email: true,
            },
          },
        },
      });
      expect(result).toEqual(mockAppointments);
    });
  });
});
