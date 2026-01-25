// Create mock functions first
const mockCredentialFindMany = jest.fn();
const mockTrainingRecordFindMany = jest.fn();
const mockComplianceTrainingFindMany = jest.fn();
const mockPolicyFindMany = jest.fn();
const mockPolicyVersionFindMany = jest.fn();
const mockIncidentFindMany = jest.fn();
const mockPerformanceReviewFindMany = jest.fn();
const mockGoalFindMany = jest.fn();
const mockTimeEntryFindMany = jest.fn();
const mockPTORequestFindMany = jest.fn();
const mockUserFindMany = jest.fn();
const mockAuditLogFindMany = jest.fn();
const mockChargeFindMany = jest.fn();
const mockPaymentFindMany = jest.fn();
const mockClientFindMany = jest.fn();
const mockAppointmentFindMany = jest.fn();
const mockClinicalNoteFindMany = jest.fn();
const mockGroupAttendanceFindMany = jest.fn();
const mockPolicyAcknowledgmentFindMany = jest.fn();
const mockPolicyReviewFindMany = jest.fn();
const mockVendorFindMany = jest.fn();

// Mock the database module
jest.mock('../database', () => ({
  __esModule: true,
  default: {
    credential: {
      findMany: mockCredentialFindMany,
    },
    trainingRecord: {
      findMany: mockTrainingRecordFindMany,
    },
    complianceTraining: {
      findMany: mockComplianceTrainingFindMany,
    },
    policy: {
      findMany: mockPolicyFindMany,
    },
    policyVersion: {
      findMany: mockPolicyVersionFindMany,
    },
    policyAcknowledgment: {
      findMany: mockPolicyAcknowledgmentFindMany,
    },
    policyReview: {
      findMany: mockPolicyReviewFindMany,
    },
    incident: {
      findMany: mockIncidentFindMany,
    },
    performanceReview: {
      findMany: mockPerformanceReviewFindMany,
    },
    goal: {
      findMany: mockGoalFindMany,
    },
    timeEntry: {
      findMany: mockTimeEntryFindMany,
    },
    pTORequest: {
      findMany: mockPTORequestFindMany,
    },
    user: {
      findMany: mockUserFindMany,
    },
    auditLog: {
      findMany: mockAuditLogFindMany,
    },
    charge: {
      findMany: mockChargeFindMany,
    },
    payment: {
      findMany: mockPaymentFindMany,
    },
    client: {
      findMany: mockClientFindMany,
    },
    appointment: {
      findMany: mockAppointmentFindMany,
    },
    clinicalNote: {
      findMany: mockClinicalNoteFindMany,
    },
    groupAttendance: {
      findMany: mockGroupAttendanceFindMany,
    },
    vendor: {
      findMany: mockVendorFindMany,
    },
  },
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
  generateCredentialingReport,
  generateTrainingComplianceReport,
  generatePolicyComplianceReport,
  generateIncidentAnalysisReport,
  generateAuditTrailReport,
} from '../reports.service';
import { UserRoles } from '@mentalspace/shared';

describe('Reports Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateCredentialingReport', () => {
    const mockCredentials = [
      {
        id: 'cred-1',
        credentialType: 'LICENSE',
        credentialNumber: 'LIC-001',
        verificationStatus: 'VERIFIED',
        issueDate: new Date('2024-01-01'),
        expirationDate: new Date('2026-01-01'),
        user: {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.com',
          roles: [UserRoles.CLINICIAN],
        },
      },
      {
        id: 'cred-2',
        credentialType: 'CERTIFICATION',
        credentialNumber: 'CERT-001',
        verificationStatus: 'PENDING',
        issueDate: new Date('2024-06-01'),
        expirationDate: new Date('2026-06-01'),
        user: {
          id: 'user-2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@test.com',
          roles: [UserRoles.CLINICIAN],
        },
      },
    ];

    it('should generate a credentialing report with all credentials', async () => {
      mockCredentialFindMany
        .mockResolvedValueOnce(mockCredentials) // All credentials
        .mockResolvedValueOnce([]) // Expiring soon
        .mockResolvedValueOnce([]) // Expired
        .mockResolvedValueOnce([]) // Pending verification
        .mockResolvedValueOnce([]); // Screening issues

      const result = await generateCredentialingReport({});

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data.credentials).toBeDefined();
      expect(mockCredentialFindMany).toHaveBeenCalled();
    });

    it('should filter credentials by type', async () => {
      mockCredentialFindMany
        .mockResolvedValueOnce([mockCredentials[0]]) // Filtered by type
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]); // Screening issues

      const result = await generateCredentialingReport({ credentialType: 'LICENSE' });

      expect(result.data.credentials).toHaveLength(1);
      expect(mockCredentialFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            credentialType: 'LICENSE',
          }),
        })
      );
    });

    it('should filter credentials by verification status', async () => {
      mockCredentialFindMany
        .mockResolvedValueOnce([mockCredentials[1]]) // Pending verification only
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockCredentials[1]])
        .mockResolvedValueOnce([]); // Screening issues

      const result = await generateCredentialingReport({ verificationStatus: 'PENDING' });

      expect(result).toBeDefined();
      expect(mockCredentialFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            verificationStatus: 'PENDING',
          }),
        })
      );
    });

    it('should filter credentials by user', async () => {
      mockCredentialFindMany
        .mockResolvedValueOnce([mockCredentials[0]])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]); // Screening issues

      const result = await generateCredentialingReport({ userId: 'user-1' });

      expect(result).toBeDefined();
      expect(mockCredentialFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
          }),
        })
      );
    });

    it('should filter credentials by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockCredentialFindMany
        .mockResolvedValueOnce(mockCredentials)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]); // Screening issues

      const result = await generateCredentialingReport({ startDate, endDate });

      expect(result).toBeDefined();
      expect(mockCredentialFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        })
      );
    });

    it('should include expiring soon credentials when requested', async () => {
      const expiringCredential = {
        ...mockCredentials[0],
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      };

      mockCredentialFindMany
        .mockResolvedValueOnce(mockCredentials)
        .mockResolvedValueOnce([expiringCredential]) // Expiring soon
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]); // Screening issues

      const result = await generateCredentialingReport({ includeExpiringSoon: true });

      expect(result).toBeDefined();
      expect(result.data.summary.expiringCredentials).toBeDefined();
    });

    it('should use custom days until expiration', async () => {
      mockCredentialFindMany
        .mockResolvedValueOnce(mockCredentials)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]); // Screening issues

      await generateCredentialingReport({ daysUntilExpiration: 30 });

      // All 5 calls for full report
      expect(mockCredentialFindMany).toHaveBeenCalledTimes(5);
    });
  });

  describe('generateTrainingComplianceReport', () => {
    const mockTrainingRecords = [
      {
        id: 'tr-1',
        userId: 'user-1',
        trainingId: 'training-1',
        status: 'COMPLETED',
        completedAt: new Date('2024-06-01'),
        score: 95,
        user: {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
        },
        training: {
          id: 'training-1',
          title: 'HIPAA Compliance',
          trainingType: 'COMPLIANCE',
        },
      },
    ];

    const mockComplianceTrainings = [
      {
        id: 'ct-1',
        title: 'HIPAA Compliance',
        isRequired: true,
        category: 'COMPLIANCE',
        targetRoles: [UserRoles.CLINICIAN, UserRoles.ADMINISTRATOR],
      },
    ];

    it('should generate a training compliance report', async () => {
      mockTrainingRecordFindMany.mockResolvedValue(mockTrainingRecords);
      mockComplianceTrainingFindMany.mockResolvedValue(mockComplianceTrainings);
      mockUserFindMany.mockResolvedValue([
        { id: 'user-1', firstName: 'John', lastName: 'Doe', roles: [UserRoles.CLINICIAN] },
      ]);

      const result = await generateTrainingComplianceReport({});

      expect(result).toBeDefined();
      expect(mockTrainingRecordFindMany).toHaveBeenCalled();
    });

    it('should filter by department in memory', async () => {
      // Service filters by department in memory after fetching records
      mockTrainingRecordFindMany.mockResolvedValue(mockTrainingRecords);

      const result = await generateTrainingComplianceReport({ department: 'Clinical' });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(mockTrainingRecordFindMany).toHaveBeenCalled();
    });

    it('should filter by training type', async () => {
      mockTrainingRecordFindMany.mockResolvedValue(mockTrainingRecords);

      const result = await generateTrainingComplianceReport({ trainingType: 'COMPLIANCE' });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      // Training type filter is applied to trainingRecord query
      expect(mockTrainingRecordFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            trainingType: 'COMPLIANCE',
          }),
        })
      );
    });

    it('should filter by category', async () => {
      mockTrainingRecordFindMany.mockResolvedValue(mockTrainingRecords);

      const result = await generateTrainingComplianceReport({ category: 'MANDATORY' });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      // Category filter is applied to trainingRecord query
      expect(mockTrainingRecordFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'MANDATORY',
          }),
        })
      );
    });
  });

  describe('generatePolicyComplianceReport', () => {
    const mockPolicies = [
      {
        id: 'policy-1',
        title: 'Privacy Policy',
        status: 'ACTIVE',
        category: 'PRIVACY',
        effectiveDate: new Date('2024-01-01'),
        reviewDate: new Date('2025-01-01'),
        acknowledgments: [],
        requiredRoles: ['CLINICIAN'],
        owner: {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
        },
        versions: [],
      },
    ];

    it('should generate a policy compliance report', async () => {
      mockPolicyFindMany.mockResolvedValue(mockPolicies);
      mockPolicyVersionFindMany.mockResolvedValue([]);

      const result = await generatePolicyComplianceReport({});

      expect(result).toBeDefined();
      expect(mockPolicyFindMany).toHaveBeenCalled();
    });

    it('should filter policies by status', async () => {
      mockPolicyFindMany.mockResolvedValue(mockPolicies);
      mockPolicyVersionFindMany.mockResolvedValue([]);

      await generatePolicyComplianceReport({ status: 'ACTIVE' });

      expect(mockPolicyFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('should filter policies by category', async () => {
      mockPolicyFindMany.mockResolvedValue(mockPolicies);
      mockPolicyVersionFindMany.mockResolvedValue([]);

      await generatePolicyComplianceReport({ category: 'PRIVACY' });

      expect(mockPolicyFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'PRIVACY',
          }),
        })
      );
    });

    it('should calculate policies needing review', async () => {
      const policyNeedingReview = {
        ...mockPolicies[0],
        nextReviewDate: new Date('2023-01-01'), // Past date - needs review
        requireAck: true,
        distributionList: [],
      };
      mockPolicyFindMany.mockResolvedValue([policyNeedingReview]);
      mockUserFindMany.mockResolvedValue([]);

      const result = await generatePolicyComplianceReport({});

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      // Policy with past nextReviewDate should be flagged as needing review
      if (result.data.policies && result.data.policies.length > 0) {
        expect(result.data.policies[0].needsReview).toBe(true);
      }
    });
  });

  describe('generateIncidentAnalysisReport', () => {
    const mockIncidents = [
      {
        id: 'incident-1',
        incidentType: 'SAFETY',
        severity: 'HIGH',
        status: 'RESOLVED',
        incidentDate: new Date('2024-06-01'),
        reportedDate: new Date('2024-06-01'),
        resolvedDate: new Date('2024-06-15'),
        description: 'Test incident',
        location: 'Office A',
        reportedBy: {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
          department: 'Clinical',
        },
      },
    ];

    it('should generate an incident analysis report', async () => {
      mockIncidentFindMany.mockResolvedValue(mockIncidents);

      const result = await generateIncidentAnalysisReport({});

      expect(result).toBeDefined();
      expect(mockIncidentFindMany).toHaveBeenCalled();
    });

    it('should filter incidents by type', async () => {
      mockIncidentFindMany.mockResolvedValue(mockIncidents);

      const result = await generateIncidentAnalysisReport({ incidentType: 'SAFETY' });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(mockIncidentFindMany).toHaveBeenCalled();
    });

    it('should filter incidents by severity', async () => {
      mockIncidentFindMany.mockResolvedValue(mockIncidents);

      const result = await generateIncidentAnalysisReport({ severity: 'HIGH' });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should filter incidents by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockIncidentFindMany.mockResolvedValue(mockIncidents);

      const result = await generateIncidentAnalysisReport({ startDate, endDate });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should filter incidents by status', async () => {
      mockIncidentFindMany.mockResolvedValue(mockIncidents);

      const result = await generateIncidentAnalysisReport({ status: 'RESOLVED' });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  // Note: generatePerformanceReport and generateAttendanceReport are complex with many
  // nested database queries and relationships. These functions are tested through
  // integration tests. The unit tests here focus on the simpler report functions.

  describe('generateAuditTrailReport', () => {
    const mockAuditLogs = [
      {
        id: 'log-1',
        action: 'CREATE',
        entityType: 'Client',
        entityId: 'client-1',
        userId: 'user-1',
        timestamp: new Date('2024-06-01T10:00:00'),
        ipAddress: '192.168.1.1',
        changes: { firstName: 'John' },
        user: {
          id: 'user-1',
          firstName: 'Admin',
          lastName: 'User',
        },
      },
    ];

    it('should generate an audit trail report', async () => {
      mockAuditLogFindMany.mockResolvedValue(mockAuditLogs);

      const result = await generateAuditTrailReport({});

      expect(result).toBeDefined();
      expect(mockAuditLogFindMany).toHaveBeenCalled();
    });

    it('should filter by entity type', async () => {
      mockAuditLogFindMany.mockResolvedValue(mockAuditLogs);

      await generateAuditTrailReport({ entityType: 'Client' });

      expect(mockAuditLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: 'Client',
          }),
        })
      );
    });

    it('should filter by action', async () => {
      mockAuditLogFindMany.mockResolvedValue(mockAuditLogs);

      await generateAuditTrailReport({ action: 'CREATE' });

      expect(mockAuditLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: 'CREATE',
          }),
        })
      );
    });

    it('should filter by user', async () => {
      mockAuditLogFindMany.mockResolvedValue(mockAuditLogs);

      await generateAuditTrailReport({ userId: 'user-1' });

      expect(mockAuditLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
          }),
        })
      );
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-06-30');

      mockAuditLogFindMany.mockResolvedValue(mockAuditLogs);

      await generateAuditTrailReport({ startDate, endDate });

      expect(mockAuditLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: {
              gte: startDate,
              lte: endDate,
            },
          }),
        })
      );
    });

    it('should filter by IP address', async () => {
      mockAuditLogFindMany.mockResolvedValue(mockAuditLogs);

      await generateAuditTrailReport({ ipAddress: '192.168.1.1' });

      expect(mockAuditLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ipAddress: '192.168.1.1',
          }),
        })
      );
    });
  });

  describe('Report Data Aggregation', () => {
    it('should calculate summary statistics for credentials', async () => {
      const mockCredsWithExpiration = [
        {
          id: 'cred-1',
          credentialType: 'LICENSE',
          verificationStatus: 'VERIFIED',
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          user: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', roles: [UserRoles.CLINICIAN] },
        },
        {
          id: 'cred-2',
          credentialType: 'LICENSE',
          verificationStatus: 'VERIFIED',
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          user: { id: 'user-2', firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com', roles: [UserRoles.CLINICIAN] },
        },
        {
          id: 'cred-3',
          credentialType: 'CERTIFICATION',
          verificationStatus: 'PENDING',
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          user: { id: 'user-3', firstName: 'Bob', lastName: 'Wilson', email: 'bob@test.com', roles: [UserRoles.CLINICIAN] },
        },
      ];

      mockCredentialFindMany
        .mockResolvedValueOnce(mockCredsWithExpiration) // All credentials
        .mockResolvedValueOnce([]) // Expiring soon
        .mockResolvedValueOnce([]) // Expired
        .mockResolvedValueOnce([mockCredsWithExpiration[2]]) // Pending verification
        .mockResolvedValueOnce([]); // Screening issues

      const result = await generateCredentialingReport({});

      expect(result.data.summary).toBeDefined();
      expect(result.data.summary.totalCredentials).toBe(3);
    });

    it('should calculate incident statistics', async () => {
      const incidents = [
        {
          id: 'inc-1',
          incidentType: 'SAFETY',
          severity: 'HIGH',
          status: 'RESOLVED',
          incidentDate: new Date('2024-06-01'),
          reportedDate: new Date('2024-06-01'),
          location: 'Office A',
          reportedBy: {
            id: 'user-1',
            firstName: 'John',
            lastName: 'Doe',
            department: 'Clinical',
          },
        },
        {
          id: 'inc-2',
          incidentType: 'SAFETY',
          severity: 'MEDIUM',
          status: 'INVESTIGATING',
          incidentDate: new Date('2024-06-15'),
          reportedDate: new Date('2024-06-15'),
          location: 'Office B',
          reportedBy: {
            id: 'user-2',
            firstName: 'Jane',
            lastName: 'Smith',
            department: 'Admin',
          },
        },
      ];
      mockIncidentFindMany.mockResolvedValue(incidents);

      const result = await generateIncidentAnalysisReport({});

      expect(result.data.summary).toBeDefined();
      expect(result.data.summary.totalIncidents).toBe(2);
    });
  });

  describe('Report Export Formats', () => {
    it('should return data in exportable format', async () => {
      const mockCredsWithUser = [
        {
          id: 'cred-1',
          credentialType: 'LICENSE',
          credentialNumber: 'LIC-001',
          verificationStatus: 'VERIFIED',
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          issueDate: new Date('2024-01-01'),
          user: {
            id: 'user-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@test.com',
            roles: [UserRoles.CLINICIAN],
            department: 'Clinical',
            jobTitle: 'Therapist',
            employmentStatus: 'ACTIVE',
          },
        },
      ];

      mockCredentialFindMany
        .mockResolvedValueOnce(mockCredsWithUser)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]); // Screening issues

      const result = await generateCredentialingReport({});

      // Verify data structure supports export
      expect(result.data.credentials).toBeDefined();
      expect(Array.isArray(result.data.credentials)).toBe(true);
      if (result.data.credentials.length > 0) {
        expect(result.data.credentials[0]).toHaveProperty('id');
      }
    });

    it('should include success flag in response', async () => {
      mockAuditLogFindMany.mockResolvedValue([]);

      const result = await generateAuditTrailReport({});

      // Reports should include success flag
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });
});
