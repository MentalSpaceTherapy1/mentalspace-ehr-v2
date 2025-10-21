/**
 * Production Validation Suite
 *
 * CRITICAL: These tests run against PRODUCTION but are READ-ONLY
 * Never create/modify/delete real patient data
 *
 * Validates:
 * - Database connectivity
 * - Schema integrity
 * - Authentication workflows
 * - Core read-only operations
 * - API health
 * - Data integrity
 * - Performance
 * - Security
 */

const https = require('https');
const { PrismaClient } = require('@mentalspace/database');

// Configuration
const PRODUCTION_API_URL = process.env.PRODUCTION_API_URL || 'https://api.mentalspaceehr.com';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@mentalspace.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || '';

// Results tracking
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: [],
};

// Utility functions
function log(type, message, details = null) {
  const timestamp = new Date().toISOString();
  const entry = { timestamp, type, message, details };
  results.tests.push(entry);

  const color = {
    PASS: '\x1b[32m',
    FAIL: '\x1b[31m',
    WARN: '\x1b[33m',
    INFO: '\x1b[36m',
  }[type] || '';

  console.log(`${color}[${type}] ${message}\x1b[0m`);
  if (details) {
    console.log(details);
  }

  if (type === 'PASS') results.passed++;
  if (type === 'FAIL') results.failed++;
  if (type === 'WARN') results.warnings++;
}

async function fetchAPI(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, PRODUCTION_API_URL);

    const req = https.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data || '{}'),
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function runTests() {
  log('INFO', 'Starting Production Validation Suite...');
  log('INFO', `Target: ${PRODUCTION_API_URL}`);

  // 1. DATABASE CONNECTIVITY & SCHEMA
  log('INFO', '=== PHASE 1: Database Connectivity & Schema ===');

  try {
    const prisma = new PrismaClient();

    // Test connection
    await prisma.$connect();
    log('PASS', 'Database connection successful');

    // Test each critical table
    const tables = [
      { name: 'User', model: prisma.user },
      { name: 'Client', model: prisma.client },
      { name: 'Appointment', model: prisma.appointment },
      { name: 'ClinicalNote', model: prisma.clinicalNote },
      { name: 'Insurance', model: prisma.insurance },
      { name: 'Billing', model: prisma.billing },
    ];

    for (const table of tables) {
      try {
        const count = await table.model.count();
        log('PASS', `Table '${table.name}' exists and accessible (${count} records)`);
      } catch (error) {
        log('FAIL', `Table '${table.name}' check failed`, error.message);
      }
    }

    // Check for orphaned records
    const orphanedAppointments = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM "Appointment" a
      LEFT JOIN "Client" c ON a."clientId" = c.id
      WHERE c.id IS NULL
    `;

    if (Number(orphanedAppointments[0].count) === 0) {
      log('PASS', 'No orphaned appointments found');
    } else {
      log('WARN', `Found ${orphanedAppointments[0].count} orphaned appointments`);
    }

    // Check for NULL values in required fields
    const nullTimestamps = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM "Client"
      WHERE "createdAt" IS NULL OR "updatedAt" IS NULL
    `;

    if (Number(nullTimestamps[0].count) === 0) {
      log('PASS', 'No NULL timestamps in Client table');
    } else {
      log('FAIL', `Found ${nullTimestamps[0].count} NULL timestamps`);
    }

    await prisma.$disconnect();

  } catch (error) {
    log('FAIL', 'Database connection failed', error.message);
  }

  // 2. AUTHENTICATION & AUTHORIZATION
  log('INFO', '=== PHASE 2: Authentication & Authorization ===');

  let authToken = null;

  try {
    // Test health endpoint (no auth required)
    const healthResponse = await fetchAPI('/api/v1/health');

    if (healthResponse.status === 200) {
      log('PASS', 'Health endpoint accessible');
      log('INFO', `API Version: ${healthResponse.body.version}`);
      log('INFO', `Environment: ${healthResponse.body.environment}`);
    } else {
      log('FAIL', `Health endpoint returned ${healthResponse.status}`);
    }

    // Test login (if credentials provided)
    if (TEST_USER_EMAIL && TEST_USER_PASSWORD) {
      const loginResponse = await fetchAPI('/api/v1/auth/login', {
        method: 'POST',
        body: {
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD,
        },
      });

      if (loginResponse.status === 200 && loginResponse.body.accessToken) {
        log('PASS', 'Authentication successful');
        authToken = loginResponse.body.accessToken;
      } else {
        log('FAIL', `Authentication failed with status ${loginResponse.status}`);
      }
    } else {
      log('WARN', 'Test credentials not provided, skipping auth tests');
    }

    // Test protected endpoint without token
    const unauthResponse = await fetchAPI('/api/v1/clients');

    if (unauthResponse.status === 401) {
      log('PASS', 'Protected endpoint requires authentication');
    } else {
      log('FAIL', `Protected endpoint did not require auth (status: ${unauthResponse.status})`);
    }

  } catch (error) {
    log('FAIL', 'Authentication tests failed', error.message);
  }

  // 3. CORE WORKFLOWS (READ-ONLY)
  if (authToken) {
    log('INFO', '=== PHASE 3: Core Workflows (Read-Only) ===');

    try {
      // Test client list
      const startTime = Date.now();
      const clientsResponse = await fetchAPI('/api/v1/clients?limit=10', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const duration = Date.now() - startTime;

      if (clientsResponse.status === 200) {
        log('PASS', `Client list retrieved successfully (${duration}ms)`);

        if (duration < 500) {
          log('PASS', 'Response time < 500ms');
        } else {
          log('WARN', `Response time ${duration}ms exceeds target of 500ms`);
        }
      } else {
        log('FAIL', `Client list failed with status ${clientsResponse.status}`);
      }

      // Test appointments
      const appointmentsResponse = await fetchAPI('/api/v1/appointments?limit=10', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (appointmentsResponse.status === 200) {
        log('PASS', 'Appointments retrieved successfully');
      } else {
        log('FAIL', `Appointments failed with status ${appointmentsResponse.status}`);
      }

    } catch (error) {
      log('FAIL', 'Core workflow tests failed', error.message);
    }
  }

  // 4. API ENDPOINT HEALTH
  log('INFO', '=== PHASE 4: API Endpoint Health ===');

  const endpoints = [
    { path: '/api/v1/health', requiresAuth: false },
    { path: '/api/v1/clients', requiresAuth: true },
    { path: '/api/v1/appointments', requiresAuth: true },
    { path: '/api/v1/clinical-notes', requiresAuth: true },
  ];

  for (const endpoint of endpoints) {
    try {
      const startTime = Date.now();
      const response = await fetchAPI(endpoint.path, {
        headers: endpoint.requiresAuth && authToken
          ? { Authorization: `Bearer ${authToken}` }
          : {},
      });
      const duration = Date.now() - startTime;

      const expectedStatus = endpoint.requiresAuth && !authToken ? 401 : 200;

      if (response.status === expectedStatus) {
        log('PASS', `${endpoint.path} returns ${expectedStatus} (${duration}ms)`);
      } else {
        log('FAIL', `${endpoint.path} returned ${response.status}, expected ${expectedStatus}`);
      }

      if (duration > 2000) {
        log('WARN', `${endpoint.path} response time ${duration}ms exceeds 2s threshold`);
      }

    } catch (error) {
      log('FAIL', `${endpoint.path} failed`, error.message);
    }
  }

  // 5. SECURITY VALIDATION
  log('INFO', '=== PHASE 5: Security Validation ===');

  try {
    // Check HTTPS enforcement
    if (PRODUCTION_API_URL.startsWith('https://')) {
      log('PASS', 'HTTPS is enforced');
    } else {
      log('FAIL', 'API is not using HTTPS');
    }

    // Check security headers
    const response = await fetchAPI('/api/v1/health');

    const requiredHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
    ];

    for (const header of requiredHeaders) {
      if (response.headers[header]) {
        log('PASS', `Security header '${header}' is set`);
      } else {
        log('WARN', `Security header '${header}' is missing`);
      }
    }

    // Check PHI not exposed in errors
    const errorResponse = await fetchAPI('/api/v1/clients/invalid-id', {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });

    const errorBody = JSON.stringify(errorResponse.body);
    if (!errorBody.match(/\d{3}-\d{2}-\d{4}/) && !errorBody.match(/SELECT|INSERT|UPDATE/i)) {
      log('PASS', 'Error responses do not expose PHI or SQL');
    } else {
      log('FAIL', 'Error response may expose sensitive data');
    }

  } catch (error) {
    log('FAIL', 'Security validation failed', error.message);
  }

  // FINAL REPORT
  log('INFO', '=== PRODUCTION VALIDATION COMPLETE ===');
  log('INFO', `Passed: ${results.passed}`);
  log('INFO', `Failed: ${results.failed}`);
  log('INFO', `Warnings: ${results.warnings}`);

  // Generate report file
  const report = {
    timestamp: new Date().toISOString(),
    apiUrl: PRODUCTION_API_URL,
    summary: {
      passed: results.passed,
      failed: results.failed,
      warnings: results.warnings,
      total: results.tests.length,
    },
    tests: results.tests,
  };

  const fs = require('fs');
  const reportFilename = `PRODUCTION_VALIDATION_REPORT_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(reportFilename, JSON.stringify(report, null, 2));

  log('INFO', `Report saved to: ${reportFilename}`);

  // Exit with error code if any tests failed
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
