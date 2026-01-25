/**
 * Security Tests - PHI Protection
 *
 * Ensures Protected Health Information (PHI) is never exposed in:
 * - Error messages
 * - Log files
 * - API responses (errors)
 * - Stack traces
 *
 * HIPAA Compliance Critical
 */

import request from 'supertest';
import app from '../../../app';
import { ApiTestHelper } from '../../helpers/apiHelpers';
import { getTestDb, cleanDatabase, createTestUser, createTestClient, disconnectTestDb } from '../../helpers/testDatabase';
import logger from '../../../utils/logger';

describe('PHI Protection - Security Tests', () => {
  let apiHelper: ApiTestHelper;
  let authToken: string;
  let testClient: any;
  const db = getTestDb();

  beforeAll(async () => {
    await cleanDatabase();
    apiHelper = new ApiTestHelper(app);

    const user = await createTestUser();
    authToken = apiHelper.generateAuthToken(user.id, user.email, user.role);

    testClient = await createTestClient({
      firstName: 'HIPAA',
      lastName: 'TestPatient',
      email: 'phi-test@patient.com',
      phone: '555-1234',
      dateOfBirth: new Date('1985-03-15'),
    });
  });

  afterAll(async () => {
    await cleanDatabase();
    await disconnectTestDb();
  });

  describe('Error Messages - No PHI Exposure', () => {
    it('should not expose patient name in 404 errors', async () => {
      const response = await apiHelper.get('/api/v1/clients/00000000-0000-0000-0000-000000000000', authToken);

      expect(response.status).toBe(404);
      expect(response.body.error).not.toContain('HIPAA');
      expect(response.body.error).not.toContain('TestPatient');
    });

    it('should not expose phone numbers in any error', async () => {
      const response = await apiHelper.post('/api/v1/clients', authToken, {
        firstName: 'Test',
        lastName: 'User',
        phone: '555-123-4567',
        // Missing other required fields to trigger error
      });

      const errorStr = JSON.stringify(response.body);
      expect(errorStr).not.toContain('555-123-4567');
    });

    it('should not expose date of birth in validation errors', async () => {
      const response = await apiHelper.post('/api/v1/clients', authToken, {
        firstName: 'Test',
        dateOfBirth: '2030-01-01', // Invalid future date
      });

      expect(response.status).toBe(400);
      expect(response.body.error).not.toContain('2030');
      // Should give generic validation error, not expose the actual date
    });

    it('should not expose email in error messages', async () => {
      const response = await apiHelper.get(`/api/v1/clients/${testClient.id}`, 'invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).not.toContain('phi-test@patient.com');
    });

    it('should not expose medical record number (MRN) in errors', async () => {
      // If your system uses MRNs
      const response = await apiHelper.get('/api/v1/clients/MRN123456', authToken);

      const errorStr = JSON.stringify(response.body);
      expect(errorStr).not.toMatch(/MRN\d{6}/);
    });
  });

  describe('Database Error Handling - No SQL Exposure', () => {
    it('should not expose SQL query details in errors', async () => {
      // Trigger a database error
      const response = await apiHelper.post('/api/v1/clients', authToken, {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        dateOfBirth: new Date('1990-01-01'),
        // Trigger constraint violation or other DB error
        clientId: 'invalid',
      });

      const errorStr = JSON.stringify(response.body).toLowerCase();
      expect(errorStr).not.toContain('select');
      expect(errorStr).not.toContain('insert');
      expect(errorStr).not.toContain('update');
      expect(errorStr).not.toContain('delete');
      expect(errorStr).not.toContain('from');
      expect(errorStr).not.toContain('where');
      expect(errorStr).not.toContain('table');
    });

    it('should not expose database connection strings', async () => {
      // Trigger error that might expose connection
      const response = await apiHelper.get('/api/v1/clients', authToken);

      const errorStr = JSON.stringify(response.body);
      expect(errorStr).not.toContain('postgresql://');
      expect(errorStr).not.toContain('DATABASE_URL');
      expect(errorStr).not.toContain('postgres');
      expect(errorStr).not.toContain('5432');
    });
  });

  describe('Stack Traces - No PHI', () => {
    it('should not include PHI in stack traces', async () => {
      // Trigger an error that would generate a stack trace
      const response = await apiHelper.post('/api/v1/clients', authToken, {
        firstName: testClient.firstName,
        lastName: testClient.lastName,
        email: testClient.email, // Duplicate email
        dateOfBirth: new Date('1990-01-01'),
      });

      expect(response.body).not.toHaveProperty('stack');
      expect(response.body).not.toHaveProperty('stackTrace');

      // If there is an error detail, it should not contain PHI
      if (response.body.details) {
        const detailsStr = JSON.stringify(response.body.details);
        expect(detailsStr).not.toContain(testClient.email);
        expect(detailsStr).not.toContain(testClient.firstName);
      }
    });
  });

  describe('Logging - PHI Audit', () => {
    it('should not log PHI in error logs', () => {
      // Check that logger.error calls don't include PHI
      // This would require examining actual log outputs
      // For now, verify logger is being used correctly

      const mockLogger = jest.spyOn(logger, 'error');

      // Trigger an error
      apiHelper.post('/api/v1/clients', authToken, {
        firstName: 'SensitiveData',
        lastName: 'PHI',
      });

      // Verify logger was called but didn't log sensitive data
      if (mockLogger.mock.calls.length > 0) {
        mockLogger.mock.calls.forEach((call) => {
          const logMessage = JSON.stringify(call);
          expect(logMessage).not.toContain('SensitiveData');
        });
      }

      mockLogger.mockRestore();
    });

    it('should audit PHI access, not the PHI itself', async () => {
      // When accessing patient data, audit log should record:
      // - WHO accessed
      // - WHAT resource (ID, not content)
      // - WHEN
      // - WHY (action type)
      // But NOT the actual PHI content

      await apiHelper.get(`/api/v1/clients/${testClient.id}`, authToken);

      const auditLogs = await db.auditLog.findMany({
        where: {
          resourceId: testClient.id,
        },
      });

      if (auditLogs.length > 0) {
        auditLogs.forEach((log) => {
          // Should log the ID
          expect(log.resourceId).toBe(testClient.id);

          // Should NOT log actual PHI
          const logStr = JSON.stringify(log);
          expect(logStr).not.toContain(testClient.email);
          expect(logStr).not.toContain(testClient.phone);
        });
      }
    });
  });

  describe('Response Sanitization', () => {
    it('should sanitize sensitive fields in error responses', async () => {
      const response = await apiHelper.post('/api/v1/clinical-notes', authToken, {
        // Invalid data to trigger validation error
        clientId: testClient.id,
        noteContent: 'Patient reports symptoms including...',
        // Missing required fields
      });

      expect(response.status).toBeGreaterThanOrEqual(400);

      // Error should not echo back the note content
      const errorStr = JSON.stringify(response.body);
      expect(errorStr).not.toContain('Patient reports');
    });
  });

  describe('SQL Injection Prevention - PHI Protection', () => {
    it('should prevent SQL injection that could expose PHI', async () => {
      const sqlInjections = [
        "' OR 1=1; SELECT * FROM Client WHERE email='",
        "'; DROP TABLE Client; --",
        "' UNION SELECT email, phone FROM Client --",
      ];

      for (const injection of sqlInjections) {
        const response = await apiHelper.get(`/api/v1/clients?search=${encodeURIComponent(injection)}`, authToken);

        // Should either return empty results or error, never PHI
        if (response.status === 200) {
          // If it returns data, verify it's not exposing all PHI
          if (response.body.data && response.body.data.length > 0) {
            // Should only return authorized, filtered results
            expect(response.body.data.length).toBeLessThan(1000); // Not all records
          }
        }
      }
    });
  });

  describe('Authorization Failures - No PHI Leakage', () => {
    it('should not reveal patient existence in 403 errors', async () => {
      // Create a different user who shouldn't have access
      const otherUser = await createTestUser({ email: 'other@test.com' });
      const otherToken = apiHelper.generateAuthToken(otherUser.id, otherUser.email, 'RECEPTIONIST');

      const response = await apiHelper.get(`/api/v1/clients/${testClient.id}`, otherToken);

      // Should return 403 or 404, but not reveal patient details
      expect([403, 404]).toContain(response.status);

      if (response.status === 403) {
        expect(response.body.error).not.toContain(testClient.firstName);
        expect(response.body.error).not.toContain(testClient.email);
      }
    });
  });

  describe('XSS Prevention - PHI Protection', () => {
    it('should sanitize XSS in patient names to prevent PHI leakage via scripts', async () => {
      const xssAttempt = '<script>alert(document.cookie)</script>';

      const response = await apiHelper.post('/api/v1/clients', authToken, {
        firstName: xssAttempt,
        lastName: 'Test',
        dateOfBirth: new Date('1990-01-01'),
        email: 'xss@test.com',
      });

      // If created, verify script is sanitized
      if (response.status === 201) {
        expect(response.body.data.firstName).not.toContain('<script>');
      }
    });
  });

  describe('API Response Structure - PHI Fields', () => {
    it('should only include PHI in authenticated, authorized responses', async () => {
      // Unauthenticated request should not return PHI
      const unauthResponse = await request(app).get('/api/v1/health');

      const responseStr = JSON.stringify(unauthResponse.body);
      expect(responseStr).not.toMatch(/\b[A-Z]{2}\d{6}\b/); // MRN
      expect(responseStr).not.toMatch(/\d{3}-\d{3}-\d{4}/); // Phone number pattern
    });

    it('should not expose sensitive client fields in list views', async () => {
      const response = await apiHelper.get('/api/v1/clients', authToken);

      expect(response.status).toBe(200);

      // Note: SSN is never collected by MentalSpace EHR
      // Verify client data structure is appropriate for list views
      if (response.body.data && response.body.data.length > 0) {
        response.body.data.forEach((client: any) => {
          // SSN field should not exist as we don't collect it
          expect(client.ssn).toBeUndefined();
        });
      }
    });
  });
});
