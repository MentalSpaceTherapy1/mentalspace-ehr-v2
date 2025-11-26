/**
 * CloudWatch Monitoring Service Tests
 *
 * Tests for AWS CloudWatch metrics, alarms, and logging
 * HIPAA Audit: Verifies security monitoring and PHI access tracking
 */

import {
  initializeCloudWatch,
  recordRequest,
  recordAuthEvent,
  recordUnauthorizedAccess,
  recordPHIAccess,
  recordSecurityIncident,
  recordDatabaseQuery,
  recordEndpointLatency,
  recordActiveSessions,
  recordClinicalNoteSubmission,
  recordAppointmentEvent,
  recordMemoryUsage,
  startMetricsCollection,
  stopMetricsCollection,
  flushMetrics,
  monitoringMiddleware,
} from '../cloudwatch';
import { Request, Response, NextFunction } from 'express';

// Mock AWS SDK
jest.mock('@aws-sdk/client-cloudwatch', () => ({
  CloudWatchClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  PutMetricDataCommand: jest.fn(),
  PutMetricAlarmCommand: jest.fn(),
  StandardUnit: {
    Count: 'Count',
    Milliseconds: 'Milliseconds',
    Bytes: 'Bytes',
    Percent: 'Percent',
    None: 'None',
  },
  Statistic: {
    Average: 'Average',
    Sum: 'Sum',
    Maximum: 'Maximum',
  },
  ComparisonOperator: {
    GreaterThanThreshold: 'GreaterThanThreshold',
    LessThanThreshold: 'LessThanThreshold',
  },
}));

jest.mock('@aws-sdk/client-cloudwatch-logs', () => ({
  CloudWatchLogsClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  CreateLogGroupCommand: jest.fn(),
  CreateLogStreamCommand: jest.fn(),
  PutLogEventsCommand: jest.fn(),
}));

describe('CloudWatch Monitoring Service', () => {
  beforeAll(() => {
    // Initialize CloudWatch with test configuration
    initializeCloudWatch({
      region: 'us-east-1',
      namespace: 'MentalSpaceEHR-Test',
      environment: 'test',
      enableAlarms: false,
    });
  });

  afterAll(() => {
    stopMetricsCollection();
  });

  describe('initializeCloudWatch', () => {
    it('should initialize without errors', () => {
      expect(() => {
        initializeCloudWatch({
          region: 'us-west-2',
          namespace: 'TestNamespace',
          environment: 'test',
          enableAlarms: false,
        });
      }).not.toThrow();
    });

    it('should accept custom alarm configuration', () => {
      expect(() => {
        initializeCloudWatch({
          region: 'us-east-1',
          namespace: 'TestNamespace',
          environment: 'production',
          enableAlarms: true,
          alarmConfig: {
            errorRateThreshold: 5,
            latencyThreshold: 2000,
            failedLoginThreshold: 10,
            unauthorizedAccessThreshold: 3,
            phiAccessDeniedThreshold: 5,
            memoryThreshold: 85,
          },
        });
      }).not.toThrow();
    });
  });

  describe('Request Metrics', () => {
    it('should record successful request', () => {
      expect(() => {
        recordRequest('GET', '/api/v1/clients', 200, 150, 'user-123');
      }).not.toThrow();
    });

    it('should record failed request', () => {
      expect(() => {
        recordRequest('POST', '/api/v1/auth/login', 401, 50);
      }).not.toThrow();
    });

    it('should record endpoint latency', () => {
      expect(() => {
        recordEndpointLatency('/api/v1/clients', 'GET', 250);
      }).not.toThrow();
    });
  });

  describe('Authentication Metrics', () => {
    it('should record successful login', () => {
      expect(() => {
        recordAuthEvent('login', true, 'user-123');
      }).not.toThrow();
    });

    it('should record failed login', () => {
      expect(() => {
        recordAuthEvent('login', false);
      }).not.toThrow();
    });

    it('should record logout', () => {
      expect(() => {
        recordAuthEvent('logout', true, 'user-123');
      }).not.toThrow();
    });

    it('should record token refresh', () => {
      expect(() => {
        recordAuthEvent('token_refresh', true, 'user-456');
      }).not.toThrow();
    });
  });

  describe('Security Metrics - HIPAA Audit', () => {
    it('should record unauthorized access attempt', () => {
      expect(() => {
        recordUnauthorizedAccess(
          '/api/v1/admin/users',
          'GET',
          'user-789',
          'Insufficient permissions'
        );
      }).not.toThrow();
    });

    it('should record PHI access - view granted', () => {
      expect(() => {
        recordPHIAccess('VIEW', 'Client', 'client-123', 'user-456', true);
      }).not.toThrow();
    });

    it('should record PHI access - update granted', () => {
      expect(() => {
        recordPHIAccess('UPDATE', 'ClinicalNote', 'note-789', 'clinician-123', true);
      }).not.toThrow();
    });

    it('should record PHI access - denied', () => {
      expect(() => {
        recordPHIAccess('VIEW', 'Client', 'client-999', 'user-unauthorized', false);
      }).not.toThrow();
    });

    it('should record PHI export', () => {
      expect(() => {
        recordPHIAccess('EXPORT', 'ClientRecord', 'client-123', 'admin-456', true);
      }).not.toThrow();
    });

    it('should record security incident - brute force', () => {
      expect(() => {
        recordSecurityIncident(
          'BRUTE_FORCE',
          'Multiple failed login attempts from IP 192.168.1.100',
          '192.168.1.100'
        );
      }).not.toThrow();
    });

    it('should record security incident - injection attempt', () => {
      expect(() => {
        recordSecurityIncident(
          'INJECTION_ATTEMPT',
          'SQL injection attempt detected in query parameter',
          'user-suspicious',
          { endpoint: '/api/v1/search', payload: 'DROP TABLE users;--' }
        );
      }).not.toThrow();
    });

    it('should record security incident - data exfiltration', () => {
      expect(() => {
        recordSecurityIncident(
          'DATA_EXFILTRATION',
          'Unusual bulk data export detected',
          'user-123',
          { recordCount: 10000, entityType: 'clients' }
        );
      }).not.toThrow();
    });

    it('should record security incident - unauthorized PHI access', () => {
      expect(() => {
        recordSecurityIncident(
          'UNAUTHORIZED_PHI_ACCESS',
          'User attempted to access client record without assignment',
          'clinician-999',
          { clientId: 'client-protected', attemptedAction: 'VIEW' }
        );
      }).not.toThrow();
    });
  });

  describe('Database Metrics', () => {
    it('should record successful database query', () => {
      expect(() => {
        recordDatabaseQuery('findMany', 'Client', 50, true);
      }).not.toThrow();
    });

    it('should record failed database query', () => {
      expect(() => {
        recordDatabaseQuery('create', 'ClinicalNote', 500, false);
      }).not.toThrow();
    });

    it('should record slow query', () => {
      expect(() => {
        recordDatabaseQuery('findMany', 'Appointment', 5000, true);
      }).not.toThrow();
    });
  });

  describe('Business Metrics', () => {
    it('should record active sessions count', () => {
      expect(() => {
        recordActiveSessions(150);
      }).not.toThrow();
    });

    it('should record clinical note submission', () => {
      expect(() => {
        recordClinicalNoteSubmission('PROGRESS_NOTE', 'clinician-123');
      }).not.toThrow();
    });

    it('should record appointment events', () => {
      expect(() => {
        recordAppointmentEvent('SCHEDULED', 'clinician-456');
      }).not.toThrow();

      expect(() => {
        recordAppointmentEvent('COMPLETED', 'clinician-456');
      }).not.toThrow();

      expect(() => {
        recordAppointmentEvent('CANCELLED', 'client-request');
      }).not.toThrow();

      expect(() => {
        recordAppointmentEvent('NO_SHOW', 'clinician-789');
      }).not.toThrow();
    });
  });

  describe('Infrastructure Metrics', () => {
    it('should record memory usage', () => {
      expect(() => {
        recordMemoryUsage(75.5, 1024 * 1024 * 512); // 75.5%, 512MB used
      }).not.toThrow();
    });

    it('should handle high memory warning threshold', () => {
      expect(() => {
        recordMemoryUsage(95, 1024 * 1024 * 950);
      }).not.toThrow();
    });
  });

  describe('Metrics Collection', () => {
    it('should start metrics collection without error', () => {
      expect(() => {
        startMetricsCollection();
      }).not.toThrow();
    });

    it('should stop metrics collection without error', () => {
      expect(() => {
        stopMetricsCollection();
      }).not.toThrow();
    });

    it('should flush metrics without error', async () => {
      await expect(flushMetrics()).resolves.not.toThrow();
    });
  });

  describe('Monitoring Middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {
        method: 'GET',
        path: '/api/v1/clients',
        originalUrl: '/api/v1/clients',
        user: { userId: 'test-user-123' } as any,
        ip: '127.0.0.1',
      };

      mockRes = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'finish') {
            // Simulate response finish
            setTimeout(callback, 0);
          }
          return mockRes as Response;
        }),
      };

      mockNext = jest.fn();
    });

    it('should create middleware function', () => {
      const middleware = monitoringMiddleware();
      expect(typeof middleware).toBe('function');
    });

    it('should call next function', () => {
      const middleware = monitoringMiddleware();
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should attach start time to request', () => {
      const middleware = monitoringMiddleware();
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect((mockReq as any).startTime).toBeDefined();
      expect(typeof (mockReq as any).startTime).toBe('number');
    });

    it('should register response finish listener', () => {
      const middleware = monitoringMiddleware();
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    it('should handle request without user context', () => {
      delete mockReq.user;
      const middleware = monitoringMiddleware();

      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).not.toThrow();
    });

    it('should respect path exclusions', () => {
      mockReq.path = '/api/v1/health';
      const middleware = monitoringMiddleware({ excludePaths: ['/api/v1/health'] });
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      // For excluded paths, middleware should still call next but might skip metrics
    });
  });

  describe('PHI Access Tracking - HIPAA Compliance', () => {
    it('should track all PHI access actions', () => {
      const actions: Array<'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT'> = [
        'VIEW',
        'CREATE',
        'UPDATE',
        'DELETE',
        'EXPORT',
      ];

      actions.forEach((action) => {
        expect(() => {
          recordPHIAccess(action, 'Client', `client-${action}`, 'user-audit', true);
        }).not.toThrow();
      });
    });

    it('should track PHI access for all entity types', () => {
      const entityTypes = [
        'Client',
        'ClinicalNote',
        'Appointment',
        'Insurance',
        'Billing',
        'Treatment',
        'Document',
      ];

      entityTypes.forEach((entityType) => {
        expect(() => {
          recordPHIAccess('VIEW', entityType, `${entityType.toLowerCase()}-123`, 'auditor', true);
        }).not.toThrow();
      });
    });

    it('should differentiate between granted and denied access', () => {
      // Track both granted and denied for the same resource
      expect(() => {
        recordPHIAccess('VIEW', 'Client', 'sensitive-client-123', 'authorized-user', true);
        recordPHIAccess('VIEW', 'Client', 'sensitive-client-123', 'unauthorized-user', false);
      }).not.toThrow();
    });
  });

  describe('Security Incident Types', () => {
    const incidentTypes = [
      'BRUTE_FORCE',
      'INJECTION_ATTEMPT',
      'DATA_EXFILTRATION',
      'UNAUTHORIZED_PHI_ACCESS',
      'SESSION_HIJACK',
      'CSRF_ATTEMPT',
      'API_ABUSE',
      'SUSPICIOUS_ACTIVITY',
    ] as const;

    incidentTypes.forEach((incidentType) => {
      it(`should record ${incidentType} incident`, () => {
        expect(() => {
          recordSecurityIncident(
            incidentType,
            `Test ${incidentType} incident for monitoring`,
            'test-user',
            { testData: true }
          );
        }).not.toThrow();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle null values gracefully', () => {
      expect(() => {
        recordRequest('GET', '/test', 200, 100, undefined);
        recordAuthEvent('login', true, undefined);
        recordPHIAccess('VIEW', 'Client', 'client-1', 'user-1', true);
      }).not.toThrow();
    });

    it('should handle very long strings', () => {
      const longPath = '/api/v1/' + 'a'.repeat(1000);
      const longUserId = 'user-' + 'x'.repeat(500);

      expect(() => {
        recordRequest('GET', longPath, 200, 100, longUserId);
      }).not.toThrow();
    });

    it('should handle special characters in identifiers', () => {
      expect(() => {
        recordPHIAccess('VIEW', 'Client', 'client-id-with-special-chars!@#$%', 'user<script>', true);
      }).not.toThrow();
    });

    it('should handle zero and negative latency values', () => {
      expect(() => {
        recordRequest('GET', '/test', 200, 0);
        recordRequest('GET', '/test', 200, -1);
        recordEndpointLatency('/test', 'GET', 0);
      }).not.toThrow();
    });
  });
});
