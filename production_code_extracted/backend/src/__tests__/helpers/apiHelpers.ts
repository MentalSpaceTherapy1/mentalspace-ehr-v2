import request from 'supertest';
import { Express } from 'express';
import { generateAccessToken } from '../../utils/jwt';

/**
 * Helper class for API testing
 */
export class ApiTestHelper {
  constructor(private app: Express) {}

  /**
   * Generate authentication token for test user
   */
  generateAuthToken(userId: string, email: string, role: string = 'CLINICIAN'): string {
    return generateAccessToken({ userId, email, role });
  }

  /**
   * Make authenticated GET request
   */
  async get(url: string, token: string) {
    return request(this.app)
      .get(url)
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'application/json');
  }

  /**
   * Make authenticated POST request
   */
  async post(url: string, token: string, data: any) {
    return request(this.app)
      .post(url)
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'application/json')
      .send(data);
  }

  /**
   * Make authenticated PUT request
   */
  async put(url: string, token: string, data: any) {
    return request(this.app)
      .put(url)
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'application/json')
      .send(data);
  }

  /**
   * Make authenticated PATCH request
   */
  async patch(url: string, token: string, data: any) {
    return request(this.app)
      .patch(url)
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'application/json')
      .send(data);
  }

  /**
   * Make authenticated DELETE request
   */
  async delete(url: string, token: string) {
    return request(this.app)
      .delete(url)
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'application/json');
  }

  /**
   * Make unauthenticated GET request (for testing auth failures)
   */
  async getUnauth(url: string) {
    return request(this.app)
      .get(url)
      .set('Accept', 'application/json');
  }

  /**
   * Make unauthenticated POST request (for testing auth failures)
   */
  async postUnauth(url: string, data: any) {
    return request(this.app)
      .post(url)
      .set('Accept', 'application/json')
      .send(data);
  }

  /**
   * Test that endpoint requires authentication
   */
  async expectUnauthorized(method: string, url: string) {
    const response = await request(this.app)[method.toLowerCase()](url);
    expect(response.status).toBe(401);
  }

  /**
   * Test that endpoint requires specific role
   */
  async expectForbidden(method: string, url: string, token: string) {
    const response = await request(this.app)
      [method.toLowerCase()](url)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(403);
  }

  /**
   * Assert response has expected structure
   */
  assertSuccessResponse(response: request.Response, expectedStatus: number = 200) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success', true);
  }

  /**
   * Assert error response has expected structure
   */
  assertErrorResponse(response: request.Response, expectedStatus: number, expectedMessage?: string) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    if (expectedMessage) {
      expect(response.body.error).toContain(expectedMessage);
    }
  }

  /**
   * Assert response does not contain PHI in error messages
   */
  assertNoPHIInError(response: request.Response) {
    const bodyStr = JSON.stringify(response.body);

    // Should not contain common PHI patterns
    expect(bodyStr).not.toMatch(/\b\d{3}-\d{2}-\d{4}\b/); // SSN
    expect(bodyStr).not.toMatch(/\b[A-Z]{2}\d{6}\b/); // MRN pattern
    expect(bodyStr).not.toMatch(/dateOfBirth/i);

    // Should not contain SQL details
    expect(bodyStr).not.toMatch(/SELECT.*FROM/i);
    expect(bodyStr).not.toMatch(/INSERT.*INTO/i);
    expect(bodyStr).not.toMatch(/UPDATE.*SET/i);
  }

  /**
   * Assert response time is acceptable
   */
  assertPerformance(startTime: number, maxMs: number = 2000) {
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(maxMs);
  }
}

/**
 * Common test data generators
 */
export const testData = {
  validClient: {
    firstName: 'Jane',
    lastName: 'Smith',
    dateOfBirth: '1985-05-15',
    email: 'jane.smith@test.com',
    phone: '555-0101',
    address: '123 Test St',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345',
  },

  invalidClient: {
    firstName: '', // Required field empty
    lastName: 'Smith',
    dateOfBirth: '2030-01-01', // Future date
    email: 'invalid-email', // Invalid format
    phone: 'abc', // Invalid format
  },

  validAppointment: {
    appointmentDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    duration: 60,
    appointmentType: 'INITIAL_CONSULTATION',
    status: 'SCHEDULED',
  },

  validClinicalNote: {
    noteType: 'Progress Note',
    sessionDate: new Date().toISOString(),
    chiefComplaint: 'Test complaint',
    presentingProblem: 'Test problem',
    interventions: 'Test interventions',
    response: 'Test response',
    plan: 'Test plan',
  },

  sqlInjectionAttempts: [
    "'; DROP TABLE clients; --",
    "' OR '1'='1",
    "admin'--",
    "' UNION SELECT * FROM users--",
  ],

  xssAttempts: [
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert(1)>',
    'javascript:alert(1)',
    '<iframe src="javascript:alert(1)">',
  ],
};

/**
 * Matchers for common assertions
 */
export const customMatchers = {
  toBeValidUUID: (received: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    return {
      pass,
      message: () => `expected ${received} to be a valid UUID`,
    };
  },

  toBeValidEmail: (received: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    return {
      pass,
      message: () => `expected ${received} to be a valid email`,
    };
  },

  toBeValidPhone: (received: string) => {
    const phoneRegex = /^\d{3}-\d{4}$|^\d{10}$/;
    const pass = phoneRegex.test(received);
    return {
      pass,
      message: () => `expected ${received} to be a valid phone number`,
    };
  },

  toBeValidISODate: (received: string) => {
    const date = new Date(received);
    const pass = !isNaN(date.getTime()) && received === date.toISOString();
    return {
      pass,
      message: () => `expected ${received} to be a valid ISO date string`,
    };
  },
};
