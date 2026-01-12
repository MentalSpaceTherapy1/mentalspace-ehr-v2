/**
 * Breach Detection Service Unit Tests
 *
 * Tests HIPAA-required breach detection functionality
 */

import { BreachDetectionService } from '../breachDetection.service';

// Mock dependencies
jest.mock('../database', () => ({
  __esModule: true,
  default: {
    auditLog: {
      groupBy: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('../../utils/logger', () => ({
  auditLogger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

import prisma from '../database';
import { auditLogger } from '../../utils/logger';

describe('BreachDetectionService', () => {
  let service: BreachDetectionService;

  beforeEach(() => {
    service = new BreachDetectionService();
    jest.clearAllMocks();
    // Default mock for findMany to return empty array (prevents "not iterable" errors)
    (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.auditLog.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.auditLog.count as jest.Mock).mockResolvedValue(0);
  });

  describe('detectExcessivePHIAccess', () => {
    it('should detect when user accesses too many PHI records in an hour', async () => {
      // Mock high access count
      (prisma.auditLog.groupBy as jest.Mock).mockResolvedValue([
        { userId: 'user-123', _count: { id: 150 } },
      ]);
      (prisma.auditLog.count as jest.Mock).mockResolvedValue(120); // Over hourly threshold

      const result = await service.runDetectionSuite('user-123');

      expect(result.detected).toBe(true);
      expect(result.indicators.length).toBeGreaterThan(0);
      expect(result.indicators[0].type).toBe('EXCESSIVE_PHI_ACCESS');
      expect(result.indicators[0].severity).toBe('HIGH');
    });

    it('should detect critical daily access threshold violations', async () => {
      // Mock excessive daily access
      (prisma.auditLog.groupBy as jest.Mock).mockResolvedValue([
        { userId: 'user-456', _count: { id: 600 } }, // Over 500 daily threshold
      ]);
      (prisma.auditLog.count as jest.Mock).mockResolvedValue(50); // Under hourly threshold

      const result = await service.runDetectionSuite('user-456');

      expect(result.detected).toBe(true);
      const criticalIndicator = result.indicators.find(
        i => i.type === 'EXCESSIVE_PHI_ACCESS_DAILY'
      );
      expect(criticalIndicator).toBeDefined();
      expect(criticalIndicator?.severity).toBe('CRITICAL');
    });

    it('should not flag normal PHI access patterns', async () => {
      // Mock normal access
      (prisma.auditLog.groupBy as jest.Mock).mockResolvedValue([
        { userId: 'user-789', _count: { id: 50 } },
      ]);
      (prisma.auditLog.count as jest.Mock).mockResolvedValue(20);
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.runDetectionSuite('user-789');

      // Should not have excessive access indicators
      const excessiveAccessIndicators = result.indicators.filter(
        i => i.type.includes('EXCESSIVE_PHI_ACCESS')
      );
      expect(excessiveAccessIndicators.length).toBe(0);
    });
  });

  describe('detectFailedLoginPatterns', () => {
    it('should detect brute force attempts from single IP', async () => {
      // Mock failed logins from one IP
      (prisma.auditLog.groupBy as jest.Mock).mockResolvedValue([
        { ipAddress: '192.168.1.100', _count: { id: 15 } },
      ]);
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([
        { entityId: 'user1' },
        { entityId: 'user2' },
        { entityId: 'user3' },
      ]);

      const result = await service.runDetectionSuite();

      expect(result.detected).toBe(true);
      const bruteForceIndicator = result.indicators.find(
        i => i.type === 'BRUTE_FORCE_ATTEMPT'
      );
      expect(bruteForceIndicator).toBeDefined();
      expect(bruteForceIndicator?.ipAddress).toBe('192.168.1.100');
    });

    it('should escalate to critical for very high attempt counts', async () => {
      (prisma.auditLog.groupBy as jest.Mock).mockResolvedValue([
        { ipAddress: '10.0.0.1', _count: { id: 25 } }, // Over 20 = critical
      ]);
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.runDetectionSuite();

      const indicator = result.indicators.find(i => i.type === 'BRUTE_FORCE_ATTEMPT');
      expect(indicator?.severity).toBe('CRITICAL');
    });
  });

  describe('detectDataExfiltration', () => {
    it('should detect excessive downloads/exports', async () => {
      (prisma.auditLog.groupBy as jest.Mock).mockResolvedValue([
        { userId: 'suspicious-user', _count: { id: 25 } }, // Over 20 threshold
      ]);

      const result = await service.runDetectionSuite('suspicious-user');

      const exfilIndicator = result.indicators.find(
        i => i.type === 'DATA_EXFILTRATION_INDICATOR'
      );
      expect(exfilIndicator).toBeDefined();
      expect(exfilIndicator?.severity).toBe('CRITICAL');
    });

    it('should detect access to many unique clients', async () => {
      (prisma.auditLog.groupBy as jest.Mock).mockResolvedValue([
        { userId: 'user-abc', _count: { id: 60 } },
      ]);
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue(
        Array.from({ length: 55 }, (_, i) => ({ entityId: `client-${i}` }))
      );

      const result = await service.runDetectionSuite('user-abc');

      const indicator = result.indicators.find(i => i.type === 'EXCESSIVE_CLIENT_ACCESS');
      expect(indicator).toBeDefined();
      expect(indicator?.severity).toBe('HIGH');
    });
  });

  describe('detectRoleEscalationAttempts', () => {
    it('should detect multiple authorization denied events', async () => {
      const mockAttempts = Array.from({ length: 8 }, (_, i) => ({
        userId: 'low-priv-user',
        entityType: 'ADMIN_PANEL',
        action: 'AUTHORIZATION_DENIED',
      }));

      (prisma.auditLog.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue(mockAttempts);

      const result = await service.runDetectionSuite('low-priv-user');

      const indicator = result.indicators.find(i => i.type === 'ROLE_ESCALATION_ATTEMPT');
      expect(indicator).toBeDefined();
      expect(indicator?.evidence.deniedCount).toBe(8);
    });
  });

  describe('storeBreachIndicators', () => {
    it('should store all indicators in audit log', async () => {
      (prisma.auditLog.groupBy as jest.Mock).mockResolvedValue([
        { userId: 'user-1', _count: { id: 600 } },
      ]);
      (prisma.auditLog.count as jest.Mock).mockResolvedValue(10);
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      await service.runDetectionSuite('user-1');

      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('sendBreachAlerts', () => {
    it('should log critical alerts', async () => {
      (prisma.auditLog.groupBy as jest.Mock).mockResolvedValue([
        { userId: 'attacker', _count: { id: 1000 } },
      ]);
      (prisma.auditLog.count as jest.Mock).mockResolvedValue(200);
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      await service.runDetectionSuite('attacker');

      expect(auditLogger.error).toHaveBeenCalledWith(
        'CRITICAL BREACH INDICATOR',
        expect.objectContaining({
          action: 'BREACH_ALERT',
        })
      );
    });
  });

  describe('getRecentIndicators', () => {
    it('should return recent indicators for dashboard', async () => {
      const mockIndicators = [
        { id: '1', action: 'BREACH_INDICATOR_DETECTED', timestamp: new Date() },
        { id: '2', action: 'BREACH_INDICATOR_DETECTED', timestamp: new Date() },
      ];

      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue(mockIndicators);

      const indicators = await service.getRecentIndicators(7);

      expect(indicators).toHaveLength(2);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: 'BREACH_INDICATOR_DETECTED',
          }),
        })
      );
    });
  });
});
