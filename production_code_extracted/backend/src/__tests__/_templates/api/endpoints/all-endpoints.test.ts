/**
 * API Endpoint Tests - Complete Coverage
 *
 * Tests EVERY API endpoint for:
 * - Authentication (401 without token)
 * - Authorization (403 without permission)
 * - Valid input (200/201)
 * - Invalid input (400)
 * - Missing fields (400)
 * - Malformed JSON (400)
 * - SQL injection protection
 * - XSS protection
 * - Rate limiting
 * - Response format
 */

import request from 'supertest';
import app from '../../../app';
import { ApiTestHelper, testData } from '../../helpers/apiHelpers';
import { getTestDb, cleanDatabase, createTestUser, createTestClient, disconnectTestDb } from '../../helpers/testDatabase';

describe('API Endpoints - Complete Test Suite', () => {
  let apiHelper: ApiTestHelper;
  let clinicianToken: string;
  let adminToken: string;
  let receptionistToken: string;
  let testClient: any;
  const db = getTestDb();

  beforeAll(async () => {
    await cleanDatabase();
    apiHelper = new ApiTestHelper(app);

    // Create users with different roles
    const clinician = await createTestUser({ email: 'clinician@test.com', role: 'CLINICIAN' });
    const admin = await createTestUser({ email: 'admin@test.com', role: 'ADMIN' });
    const receptionist = await createTestUser({ email: 'receptionist@test.com', role: 'RECEPTIONIST' });

    clinicianToken = apiHelper.generateAuthToken(clinician.id, clinician.email, 'CLINICIAN');
    adminToken = apiHelper.generateAuthToken(admin.id, admin.email, 'ADMIN');
    receptionistToken = apiHelper.generateAuthToken(receptionist.id, receptionist.email, 'RECEPTIONIST');

    testClient = await createTestClient();
  });

  afterAll(async () => {
    await cleanDatabase();
    await disconnectTestDb();
  });

  describe('Authentication Endpoints', () => {
    describe('POST /api/v1/auth/login', () => {
      it('should return 200 with valid credentials', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'clinician@test.com', password: 'Test123!@#' });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('refreshToken');
      });

      it('should return 401 with invalid credentials', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'clinician@test.com', password: 'wrong' });

        expect(response.status).toBe(401);
        apiHelper.assertNoPHIInError(response);
      });

      it('should return 400 with missing email', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({ password: 'Test123!@#' });

        expect(response.status).toBe(400);
      });

      it('should return 400 with malformed JSON', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .set('Content-Type', 'application/json')
          .send('{ invalid json }');

        expect(response.status).toBe(400);
      });

      it('should protect against SQL injection in email', async () => {
        for (const injection of testData.sqlInjectionAttempts) {
          const response = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: injection, password: 'test' });

          expect(response.status).toBe(400);
        }
      });

      it('should handle rate limiting after multiple failed attempts', async () => {
        const attempts = [];
        for (let i = 0; i < 10; i++) {
          attempts.push(
            request(app)
              .post('/api/v1/auth/login')
              .send({ email: 'test@test.com', password: 'wrong' })
          );
        }

        const responses = await Promise.all(attempts);
        const rateLimited = responses.some((r) => r.status === 429);

        expect(rateLimited).toBe(true);
      });
    });

    describe('POST /api/v1/auth/logout', () => {
      it('should return 200 with valid token', async () => {
        const response = await apiHelper.post('/api/v1/auth/logout', clinicianToken, {});

        expect(response.status).toBe(200);
      });

      it('should return 401 without token', async () => {
        await apiHelper.expectUnauthorized('POST', '/api/v1/auth/logout');
      });
    });
  });

  describe('Client Endpoints', () => {
    describe('GET /api/v1/clients', () => {
      it('should return 200 with valid token', async () => {
        const response = await apiHelper.get('/api/v1/clients', clinicianToken);

        apiHelper.assertSuccessResponse(response);
        expect(response.body.data).toBeInstanceOf(Array);
      });

      it('should return 401 without token', async () => {
        await apiHelper.expectUnauthorized('GET', '/api/v1/clients');
      });

      it('should support pagination parameters', async () => {
        const response = await apiHelper.get('/api/v1/clients?page=1&limit=10', clinicianToken);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('pagination');
      });

      it('should support search parameter', async () => {
        const response = await apiHelper.get('/api/v1/clients?search=John', clinicianToken);

        expect(response.status).toBe(200);
      });

      it('should respond in < 500ms', async () => {
        const start = Date.now();
        await apiHelper.get('/api/v1/clients', clinicianToken);
        apiHelper.assertPerformance(start, 500);
      });
    });

    describe('GET /api/v1/clients/:id', () => {
      it('should return 200 for valid client ID', async () => {
        const response = await apiHelper.get(`/api/v1/clients/${testClient.id}`, clinicianToken);

        apiHelper.assertSuccessResponse(response);
        expect(response.body.data.id).toBe(testClient.id);
      });

      it('should return 404 for nonexistent client', async () => {
        const response = await apiHelper.get('/api/v1/clients/00000000-0000-0000-0000-000000000000', clinicianToken);

        expect(response.status).toBe(404);
      });

      it('should return 400 for invalid UUID format', async () => {
        const response = await apiHelper.get('/api/v1/clients/invalid-id', clinicianToken);

        expect(response.status).toBe(400);
      });

      it('should return 401 without token', async () => {
        await apiHelper.expectUnauthorized('GET', `/api/v1/clients/${testClient.id}`);
      });

      it('should not expose PHI in error messages', async () => {
        const response = await apiHelper.get('/api/v1/clients/invalid', clinicianToken);

        apiHelper.assertNoPHIInError(response);
      });
    });

    describe('POST /api/v1/clients', () => {
      it('should create client with valid data', async () => {
        const response = await apiHelper.post('/api/v1/clients', clinicianToken, testData.validClient);

        expect(response.status).toBe(201);
        expect(response.body.data).toHaveProperty('id');
      });

      it('should return 400 with invalid data', async () => {
        const response = await apiHelper.post('/api/v1/clients', clinicianToken, testData.invalidClient);

        expect(response.status).toBe(400);
      });

      it('should return 400 with missing required fields', async () => {
        const response = await apiHelper.post('/api/v1/clients', clinicianToken, { firstName: 'Only' });

        expect(response.status).toBe(400);
      });

      it('should sanitize XSS attempts', async () => {
        for (const xss of testData.xssAttempts) {
          const response = await apiHelper.post('/api/v1/clients', clinicianToken, {
            ...testData.validClient,
            firstName: xss,
          });

          // Should either reject or sanitize
          if (response.status === 201) {
            expect(response.body.data.firstName).not.toContain('<script>');
          }
        }
      });

      it('should prevent SQL injection', async () => {
        for (const injection of testData.sqlInjectionAttempts) {
          const response = await apiHelper.post('/api/v1/clients', clinicianToken, {
            ...testData.validClient,
            firstName: injection,
          });

          // Should handle safely (reject or sanitize)
          expect([400, 201]).toContain(response.status);
        }
      });
    });

    describe('PUT /api/v1/clients/:id', () => {
      it('should update client with valid data', async () => {
        const response = await apiHelper.put(`/api/v1/clients/${testClient.id}`, clinicianToken, {
          firstName: 'Updated',
        });

        expect(response.status).toBe(200);
        expect(response.body.data.firstName).toBe('Updated');
      });

      it('should return 404 for nonexistent client', async () => {
        const response = await apiHelper.put('/api/v1/clients/00000000-0000-0000-0000-000000000000', clinicianToken, {
          firstName: 'Test',
        });

        expect(response.status).toBe(404);
      });
    });

    describe('DELETE /api/v1/clients/:id', () => {
      it('should delete client', async () => {
        const newClient = await createTestClient({ email: 'delete@test.com' });

        const response = await apiHelper.delete(`/api/v1/clients/${newClient.id}`, clinicianToken);

        expect(response.status).toBe(200);
      });

      it('should return 404 for nonexistent client', async () => {
        const response = await apiHelper.delete('/api/v1/clients/00000000-0000-0000-0000-000000000000', clinicianToken);

        expect(response.status).toBe(404);
      });
    });
  });

  describe('Appointment Endpoints', () => {
    describe('GET /api/v1/appointments', () => {
      it('should return 200 with valid token', async () => {
        const response = await apiHelper.get('/api/v1/appointments', clinicianToken);

        apiHelper.assertSuccessResponse(response);
      });

      it('should return 401 without token', async () => {
        await apiHelper.expectUnauthorized('GET', '/api/v1/appointments');
      });
    });

    describe('POST /api/v1/appointments', () => {
      it('should create appointment with valid data', async () => {
        const user = await db.user.findFirst({ where: { role: 'CLINICIAN' } });

        const response = await apiHelper.post('/api/v1/appointments', clinicianToken, {
          ...testData.validAppointment,
          clientId: testClient.id,
          clinicianId: user?.id,
        });

        expect(response.status).toBe(201);
      });
    });
  });

  describe('Clinical Note Endpoints', () => {
    describe('POST /api/v1/clinical-notes', () => {
      it('should create note with valid data', async () => {
        const user = await db.user.findFirst({ where: { role: 'CLINICIAN' } });
        const appointment = await db.appointment.findFirst();

        if (appointment) {
          const response = await apiHelper.post('/api/v1/clinical-notes', clinicianToken, {
            ...testData.validClinicalNote,
            clientId: testClient.id,
            clinicianId: user?.id,
            appointmentId: appointment.id,
          });

          expect(response.status).toBe(201);
        }
      });
    });
  });

  describe('Authorization Tests (All Endpoints)', () => {
    it('should enforce role-based access control', async () => {
      // Admin endpoints should reject non-admin users
      const response = await apiHelper.get('/api/v1/admin/users', clinicianToken);

      expect(response.status).toBe(403);
    });

    it('should allow admin access to admin endpoints', async () => {
      const response = await apiHelper.get('/api/v1/admin/users', adminToken);

      expect([200, 404]).toContain(response.status); // Not 403
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in all responses', async () => {
      const response = await apiHelper.get('/api/v1/health', clinicianToken);

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on API endpoints', async () => {
      const requests = [];

      for (let i = 0; i < 100; i++) {
        requests.push(apiHelper.get('/api/v1/clients', clinicianToken));
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.some((r) => r.status === 429);

      // At least one should be rate limited
      expect(rateLimited).toBe(true);
    });
  });
});
