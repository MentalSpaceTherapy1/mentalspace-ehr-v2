const https = require('https');

const API_BASE = 'https://api.mentalspaceehr.com/api/v1';
const LOGIN_EMAIL = 'ejoseph@chctherapy.com';
const LOGIN_PASSWORD = 'Bing@@0912';

let authToken = '';

// Make HTTPS request
function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body && method !== 'GET') {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    }

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (err) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body && method !== 'GET') {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function login() {
  console.log('=== LOGGING IN ===\n');
  try {
    const response = await makeRequest('POST', '/auth/login', {
      email: LOGIN_EMAIL,
      password: LOGIN_PASSWORD,
    });

    if (response.status === 200 && response.data.token) {
      authToken = response.data.token;
      console.log('✓ Login successful');
      console.log(`  Token: ${authToken.substring(0, 20)}...\n`);
      return true;
    } else {
      console.log('✗ Login failed');
      console.log(`  Status: ${response.status}`);
      console.log(`  Response: ${JSON.stringify(response.data, null, 2)}\n`);
      return false;
    }
  } catch (error) {
    console.log('✗ Login error:', error.message, '\n');
    return false;
  }
}

async function testEndpoint(name, method, path, expectedStatus = 200) {
  try {
    const response = await makeRequest(method, path, null, authToken);

    if (response.status === expectedStatus) {
      console.log(`✓ ${name}`);
      console.log(`  Status: ${response.status}`);
      if (response.data && typeof response.data === 'object') {
        const dataKeys = Object.keys(response.data);
        if (dataKeys.length > 0) {
          console.log(`  Data keys: ${dataKeys.join(', ')}`);
        }
      }
      return { success: true, status: response.status };
    } else {
      console.log(`✗ ${name}`);
      console.log(`  Expected: ${expectedStatus}, Got: ${response.status}`);
      console.log(`  Response: ${JSON.stringify(response.data, null, 2)}`);
      return { success: false, status: response.status, error: response.data };
    }
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('=== COMPREHENSIVE API ENDPOINT TESTING ===\n');
  console.log(`Testing API: ${API_BASE}\n`);

  // Login first
  const loggedIn = await login();
  if (!loggedIn) {
    console.log('Cannot proceed with tests - login failed\n');
    return;
  }

  const results = {
    passed: 0,
    failed: 0,
    errors: [],
  };

  console.log('=== TESTING CRITICAL ENDPOINTS ===\n');

  // Test Group Sessions (original error)
  console.log('--- Module 3: Group Therapy ---');
  let result = await testEndpoint('GET /group-sessions', 'GET', '/group-sessions');
  result.success ? results.passed++ : (results.failed++, results.errors.push('Group Sessions'));

  result = await testEndpoint('GET /group-sessions/categories', 'GET', '/group-sessions/categories');
  result.success ? results.passed++ : (results.failed++, results.errors.push('Group Categories'));
  console.log('');

  // Test Client Management (uses new tables)
  console.log('--- Module 1: Client Management ---');
  result = await testEndpoint('GET /clients', 'GET', '/clients');
  result.success ? results.passed++ : (results.failed++, results.errors.push('Clients'));

  result = await testEndpoint('GET /clients/potential-duplicates', 'GET', '/clients/potential-duplicates');
  result.success ? results.passed++ : (results.failed++, results.errors.push('Potential Duplicates'));
  console.log('');

  // Test Appointments (uses new appointment_types table)
  console.log('--- Module 2: Appointments ---');
  result = await testEndpoint('GET /appointments', 'GET', '/appointments');
  result.success ? results.passed++ : (results.failed++, results.errors.push('Appointments'));

  result = await testEndpoint('GET /appointments/types', 'GET', '/appointments/types');
  result.success ? results.passed++ : (results.failed++, results.errors.push('Appointment Types'));
  console.log('');

  // Test Clinical Notes
  console.log('--- Module 4: Clinical Notes ---');
  result = await testEndpoint('GET /clinical-notes', 'GET', '/clinical-notes');
  result.success ? results.passed++ : (results.failed++, results.errors.push('Clinical Notes'));
  console.log('');

  // Test Waitlist (uses new waitlist_offers table)
  console.log('--- Module 7: Waitlist ---');
  result = await testEndpoint('GET /waitlist', 'GET', '/waitlist');
  result.success ? results.passed++ : (results.failed++, results.errors.push('Waitlist'));
  console.log('');

  // Test Dashboard (uses widgets table)
  console.log('--- Module 8: Dashboard ---');
  result = await testEndpoint('GET /dashboard/stats', 'GET', '/dashboard/stats');
  result.success ? results.passed++ : (results.failed++, results.errors.push('Dashboard Stats'));
  console.log('');

  // Test HR Modules (uses new HR tables)
  console.log('--- Module 9: HR Management ---');
  result = await testEndpoint('GET /hr/employees', 'GET', '/hr/employees');
  result.success ? results.passed++ : (results.failed++, results.errors.push('HR Employees'));

  result = await testEndpoint('GET /hr/time-attendance', 'GET', '/hr/time-attendance');
  result.success ? results.passed++ : (results.failed++, results.errors.push('Time Attendance'));

  result = await testEndpoint('GET /hr/pto-requests', 'GET', '/hr/pto-requests');
  result.success ? results.passed++ : (results.failed++, results.errors.push('PTO Requests'));
  console.log('');

  // Test Communication (uses new messages/channels tables)
  console.log('--- Module 9: Communication ---');
  result = await testEndpoint('GET /messages', 'GET', '/messages');
  result.success ? results.passed++ : (results.failed++, results.errors.push('Messages'));

  result = await testEndpoint('GET /channels', 'GET', '/channels');
  result.success ? results.passed++ : (results.failed++, results.errors.push('Channels'));

  result = await testEndpoint('GET /documents', 'GET', '/documents');
  result.success ? results.passed++ : (results.failed++, results.errors.push('Documents'));
  console.log('');

  // Test Compliance (uses new policies/incidents tables)
  console.log('--- Module 9: Compliance ---');
  result = await testEndpoint('GET /compliance/policies', 'GET', '/compliance/policies');
  result.success ? results.passed++ : (results.failed++, results.errors.push('Policies'));

  result = await testEndpoint('GET /compliance/incidents', 'GET', '/compliance/incidents');
  result.success ? results.passed++ : (results.failed++, results.errors.push('Incidents'));
  console.log('');

  // Test Training (uses new training_records/courses tables)
  console.log('--- Module 9: Training ---');
  result = await testEndpoint('GET /training/courses', 'GET', '/training/courses');
  result.success ? results.passed++ : (results.failed++, results.errors.push('Courses'));

  result = await testEndpoint('GET /training/records', 'GET', '/training/records');
  result.success ? results.passed++ : (results.failed++, results.errors.push('Training Records'));
  console.log('');

  // Test Finance (uses new vendors/budgets/expenses tables)
  console.log('--- Module 9: Finance ---');
  result = await testEndpoint('GET /finance/vendors', 'GET', '/finance/vendors');
  result.success ? results.passed++ : (results.failed++, results.errors.push('Vendors'));

  result = await testEndpoint('GET /finance/budgets', 'GET', '/finance/budgets');
  result.success ? results.passed++ : (results.failed++, results.errors.push('Budgets'));

  result = await testEndpoint('GET /finance/expenses', 'GET', '/finance/expenses');
  result.success ? results.passed++ : (results.failed++, results.errors.push('Expenses'));
  console.log('');

  // Summary
  console.log('\n=== TEST SUMMARY ===');
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`✓ Passed: ${results.passed}`);
  console.log(`✗ Failed: ${results.failed}`);

  if (results.failed > 0) {
    console.log('\nFailed Endpoints:');
    results.errors.forEach((error) => {
      console.log(`  - ${error}`);
    });
  } else {
    console.log('\n🎉 ALL TESTS PASSED! No API errors detected.');
  }
}

runTests().catch(console.error);
