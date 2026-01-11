// Create mock functions first
const mockScheduleFindMany = jest.fn();
const mockScheduleFindUnique = jest.fn();
const mockScheduleCreate = jest.fn();
const mockScheduleUpdate = jest.fn();
const mockScheduleDelete = jest.fn();
const mockDeliveryLogCreate = jest.fn();
const mockDeliveryLogUpdate = jest.fn();
const mockDeliveryLogFindUnique = jest.fn();
const mockDeliveryLogFindMany = jest.fn();
const mockDeliveryLogDeleteMany = jest.fn();

// Mock the database module (both @mentalspace/database and ../database)
jest.mock('@mentalspace/database', () => ({
  __esModule: true,
  PrismaClient: jest.fn().mockImplementation(() => ({
    reportSchedule: {
      findMany: mockScheduleFindMany,
      findUnique: mockScheduleFindUnique,
      create: mockScheduleCreate,
      update: mockScheduleUpdate,
      delete: mockScheduleDelete,
    },
    deliveryLog: {
      create: mockDeliveryLogCreate,
      update: mockDeliveryLogUpdate,
      findUnique: mockDeliveryLogFindUnique,
      findMany: mockDeliveryLogFindMany,
      deleteMany: mockDeliveryLogDeleteMany,
    },
  })),
}));

jest.mock('../database', () => ({
  __esModule: true,
  default: {
    reportSchedule: {
      findMany: mockScheduleFindMany,
      findUnique: mockScheduleFindUnique,
      create: mockScheduleCreate,
      update: mockScheduleUpdate,
      delete: mockScheduleDelete,
    },
    deliveryLog: {
      create: mockDeliveryLogCreate,
      update: mockDeliveryLogUpdate,
      findUnique: mockDeliveryLogFindUnique,
      findMany: mockDeliveryLogFindMany,
      deleteMany: mockDeliveryLogDeleteMany,
    },
  },
}));

// Mock email service
jest.mock('../email-distribution.service', () => ({
  __esModule: true,
  sendReportEmail: jest.fn().mockResolvedValue(undefined),
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import after mocking
import {
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getSchedulesByUser,
  pauseSchedule,
  resumeSchedule,
} from '../report-scheduler.service';
import {
  trackDelivery,
  updateDeliveryStatus,
  getDeliveryHistory,
  getDeliveryStats,
  cleanupOldDeliveryLogs,
} from '../delivery-tracker.service';

describe('Report Scheduler Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSchedule', () => {
    it('should create a new schedule', async () => {
      const scheduleData = {
        reportId: 'report-123',
        reportType: 'credentialing',
        userId: 'user-123',
        frequency: 'WEEKLY',
        format: 'PDF',
        recipients: { to: ['test@example.com'] },
      };

      const expectedSchedule = {
        id: 'schedule-123',
        ...scheduleData,
        status: 'ACTIVE',
        nextRunDate: expect.any(Date),
      };

      mockScheduleCreate.mockResolvedValue(expectedSchedule);

      const result = await createSchedule(scheduleData);

      expect(result).toEqual(expectedSchedule);
      expect(mockScheduleCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reportId: scheduleData.reportId,
          reportType: scheduleData.reportType,
          userId: scheduleData.userId,
          frequency: scheduleData.frequency,
          format: scheduleData.format,
          recipients: scheduleData.recipients,
          status: 'ACTIVE',
        }),
      });
    });

    it('should set correct nextRunDate for DAILY frequency', async () => {
      const scheduleData = {
        reportId: 'report-123',
        reportType: 'credentialing',
        userId: 'user-123',
        frequency: 'DAILY',
        format: 'PDF',
        recipients: { to: ['test@example.com'] },
      };

      mockScheduleCreate.mockResolvedValue({ id: 'schedule-123' });

      await createSchedule(scheduleData);

      const createCall = mockScheduleCreate.mock.calls[0][0];
      const nextRunDate = new Date(createCall.data.nextRunDate);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Should be roughly 1 day from now
      const diffInHours = Math.abs(nextRunDate.getTime() - tomorrow.getTime()) / (1000 * 60 * 60);
      expect(diffInHours).toBeLessThan(1);
    });

    it('should set correct nextRunDate for MONTHLY frequency', async () => {
      const scheduleData = {
        reportId: 'report-123',
        reportType: 'credentialing',
        userId: 'user-123',
        frequency: 'MONTHLY',
        format: 'EXCEL',
        recipients: { to: ['test@example.com'] },
      };

      mockScheduleCreate.mockResolvedValue({ id: 'schedule-123' });

      await createSchedule(scheduleData);

      const createCall = mockScheduleCreate.mock.calls[0][0];
      const nextRunDate = new Date(createCall.data.nextRunDate);
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      // Should be roughly 1 month from now
      const diffInDays = Math.abs(nextRunDate.getTime() - nextMonth.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffInDays).toBeLessThan(2);
    });

    it('should include custom timezone', async () => {
      const scheduleData = {
        reportId: 'report-123',
        reportType: 'credentialing',
        userId: 'user-123',
        frequency: 'WEEKLY',
        format: 'PDF',
        recipients: { to: ['test@example.com'] },
        timezone: 'America/Los_Angeles',
      };

      mockScheduleCreate.mockResolvedValue({ id: 'schedule-123' });

      await createSchedule(scheduleData);

      expect(mockScheduleCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          timezone: 'America/Los_Angeles',
        }),
      });
    });
  });

  describe('updateSchedule', () => {
    it('should update a schedule', async () => {
      const scheduleId = 'schedule-123';
      const updateData = { frequency: 'MONTHLY' };

      mockScheduleUpdate.mockResolvedValue({
        id: scheduleId,
        frequency: 'MONTHLY',
      });

      const result = await updateSchedule(scheduleId, updateData);

      expect(mockScheduleUpdate).toHaveBeenCalledWith({
        where: { id: scheduleId },
        data: expect.objectContaining({
          frequency: 'MONTHLY',
          updatedAt: expect.any(Date),
        }),
      });
      expect(result.frequency).toBe('MONTHLY');
    });
  });

  describe('deleteSchedule', () => {
    it('should delete a schedule', async () => {
      const scheduleId = 'schedule-123';

      mockScheduleDelete.mockResolvedValue({ id: scheduleId });

      const result = await deleteSchedule(scheduleId);

      expect(mockScheduleDelete).toHaveBeenCalledWith({
        where: { id: scheduleId },
      });
      expect(result.id).toBe(scheduleId);
    });
  });

  describe('getSchedulesByUser', () => {
    it('should return all schedules for a user', async () => {
      const userId = 'user-123';
      const schedules = [
        { id: 'schedule-1', reportType: 'credentialing' },
        { id: 'schedule-2', reportType: 'audit-trail' },
      ];

      mockScheduleFindMany.mockResolvedValue(schedules);

      const result = await getSchedulesByUser(userId);

      expect(mockScheduleFindMany).toHaveBeenCalledWith({
        where: { userId },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('pauseSchedule', () => {
    it('should pause a schedule', async () => {
      const scheduleId = 'schedule-123';

      mockScheduleUpdate.mockResolvedValue({
        id: scheduleId,
        status: 'PAUSED',
      });

      const result = await pauseSchedule(scheduleId);

      expect(mockScheduleUpdate).toHaveBeenCalledWith({
        where: { id: scheduleId },
        data: { status: 'PAUSED' },
      });
      expect(result.status).toBe('PAUSED');
    });
  });

  describe('resumeSchedule', () => {
    it('should resume a schedule', async () => {
      const scheduleId = 'schedule-123';

      mockScheduleUpdate.mockResolvedValue({
        id: scheduleId,
        status: 'ACTIVE',
      });

      const result = await resumeSchedule(scheduleId);

      expect(mockScheduleUpdate).toHaveBeenCalledWith({
        where: { id: scheduleId },
        data: { status: 'ACTIVE' },
      });
      expect(result.status).toBe('ACTIVE');
    });
  });
});

describe('Delivery Tracker Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('trackDelivery', () => {
    it('should create a new delivery log', async () => {
      const deliveryData = {
        scheduleId: 'schedule-123',
        reportId: 'report-123',
        recipients: { to: ['test@example.com'] },
        format: 'PDF',
        status: 'PENDING',
      };

      const expectedLog = {
        id: 'log-123',
        ...deliveryData,
        attemptCount: 1,
      };

      mockDeliveryLogCreate.mockResolvedValue(expectedLog);

      const result = await trackDelivery(deliveryData);

      expect(result).toEqual(expectedLog);
      expect(mockDeliveryLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          scheduleId: deliveryData.scheduleId,
          reportId: deliveryData.reportId,
          status: 'PENDING',
          attemptCount: 1,
        }),
      });
    });
  });

  describe('updateDeliveryStatus', () => {
    it('should update delivery status to SENT', async () => {
      const deliveryId = 'log-123';
      const sentAt = new Date();

      mockDeliveryLogUpdate.mockResolvedValue({
        id: deliveryId,
        status: 'SENT',
        sentAt,
      });

      const result = await updateDeliveryStatus(deliveryId, 'SENT', undefined, sentAt);

      expect(mockDeliveryLogUpdate).toHaveBeenCalledWith({
        where: { id: deliveryId },
        data: expect.objectContaining({
          status: 'SENT',
          sentAt,
        }),
      });
      expect(result.status).toBe('SENT');
    });

    it('should update delivery status to FAILED with error message', async () => {
      const deliveryId = 'log-123';
      const errorMessage = 'Connection timeout';

      mockDeliveryLogUpdate.mockResolvedValue({
        id: deliveryId,
        status: 'FAILED',
        errorMessage,
      });

      const result = await updateDeliveryStatus(deliveryId, 'FAILED', errorMessage);

      expect(mockDeliveryLogUpdate).toHaveBeenCalledWith({
        where: { id: deliveryId },
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage,
          attemptCount: { increment: 1 },
        }),
      });
      expect(result.status).toBe('FAILED');
    });
  });

  describe('getDeliveryHistory', () => {
    it('should return delivery history for a schedule', async () => {
      const scheduleId = 'schedule-123';
      const logs = [
        { id: 'log-1', status: 'SENT' },
        { id: 'log-2', status: 'FAILED' },
        { id: 'log-3', status: 'SENT' },
      ];

      mockDeliveryLogFindMany.mockResolvedValue(logs);

      const result = await getDeliveryHistory(scheduleId);

      expect(mockDeliveryLogFindMany).toHaveBeenCalledWith({
        where: { scheduleId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      expect(result).toHaveLength(3);
    });

    it('should respect custom limit', async () => {
      const scheduleId = 'schedule-123';
      const limit = 10;

      mockDeliveryLogFindMany.mockResolvedValue([]);

      await getDeliveryHistory(scheduleId, limit);

      expect(mockDeliveryLogFindMany).toHaveBeenCalledWith({
        where: { scheduleId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    });
  });

  describe('getDeliveryStats', () => {
    it('should calculate delivery statistics', async () => {
      const scheduleId = 'schedule-123';
      const logs = [
        { id: 'log-1', status: 'SENT' },
        { id: 'log-2', status: 'SENT' },
        { id: 'log-3', status: 'FAILED' },
        { id: 'log-4', status: 'PENDING' },
        { id: 'log-5', status: 'SKIPPED' },
      ];

      mockDeliveryLogFindMany.mockResolvedValue(logs);

      const result = await getDeliveryStats(scheduleId);

      expect(result).toEqual({
        total: 5,
        sent: 2,
        failed: 1,
        pending: 1,
        skipped: 1,
        successRate: 40, // 2/5 * 100
      });
    });

    it('should handle empty delivery history', async () => {
      mockDeliveryLogFindMany.mockResolvedValue([]);

      const result = await getDeliveryStats('schedule-123');

      expect(result).toEqual({
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0,
        skipped: 0,
        successRate: 0,
      });
    });
  });

  describe('cleanupOldDeliveryLogs', () => {
    it('should delete logs older than specified days', async () => {
      mockDeliveryLogDeleteMany.mockResolvedValue({ count: 50 });

      const result = await cleanupOldDeliveryLogs(90);

      expect(mockDeliveryLogDeleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: expect.any(Date),
          },
        },
      });
      expect(result).toBe(50);
    });

    it('should default to 90 days', async () => {
      mockDeliveryLogDeleteMany.mockResolvedValue({ count: 0 });

      await cleanupOldDeliveryLogs();

      expect(mockDeliveryLogDeleteMany).toHaveBeenCalled();
    });
  });
});
