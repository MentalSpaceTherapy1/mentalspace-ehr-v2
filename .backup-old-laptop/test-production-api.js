const https = require('https');

const API_BASE = 'https://api.mentalspaceehr.com';
let authToken = null;

const makeRequest = (method, path, data = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
};

async function testProductionAPI() {
  console.log('='.repeat(80));
  console.log('PRODUCTION API COMPREHENSIVE TEST');
  console.log('='.repeat(80));
  console.log('');

  // Test 1: Health Check
  console.log('1. Testing Health Endpoint...');
  try {
    const health = await makeRequest('GET', '/api/v1/health');
    console.log(`   ✅ Health: ${health.status} - ${health.data.status}`);
    console.log(`   Environment: ${health.data.environment}`);
    console.log(`   Version: ${health.data.version}`);
  } catch (e) {
    console.log(`   ❌ Health check failed: ${e.message}`);
  }
  console.log('');

  // Test 2: Login (using test credentials)
  console.log('2. Testing Authentication...');

  // Try to get credentials from environment or use test defaults
  const email = process.env.TEST_EMAIL || 'ejoseph@mentalspaceehr.com';
  const password = process.env.TEST_PASSWORD || 'TestPassword123!';

  console.log(`   Attempting login with: ${email}`);

  try {
    const login = await makeRequest('POST', '/api/v1/auth/login', {
      email,
      password
    });

    if (login.status === 200 && login.data.data?.token) {
      authToken = login.data.data.token;
      console.log(`   ✅ Login successful`);
      console.log(`   User: ${login.data.data.user.firstName} ${login.data.data.user.lastName}`);
      console.log(`   Roles: ${login.data.data.user.roles.join(', ')}`);
    } else {
      console.log(`   ❌ Login failed: ${login.status} - ${JSON.stringify(login.data).substring(0, 100)}`);
    }
  } catch (e) {
    console.log(`   ❌ Login error: ${e.message}`);
  }
  console.log('');

  if (!authToken) {
    console.log('⚠️  Cannot continue tests without authentication token');
    return;
  }

  // Test 3: Get Users
  console.log('3. Testing Users Endpoint...');
  try {
    const users = await makeRequest('GET', '/api/v1/users', null, authToken);
    if (users.status === 200) {
      console.log(`   ✅ Users: ${users.data.data.length} users found`);
    } else {
      console.log(`   ❌ Users failed: ${users.status}`);
    }
  } catch (e) {
    console.log(`   ❌ Users error: ${e.message}`);
  }
  console.log('');

  // Test 4: Get Clients
  console.log('4. Testing Clients Endpoint...');
  try {
    const clients = await makeRequest('GET', '/api/v1/clients', null, authToken);
    if (clients.status === 200) {
      console.log(`   ✅ Clients: ${clients.data.data.length} clients found`);
    } else {
      console.log(`   ❌ Clients failed: ${clients.status}`);
    }
  } catch (e) {
    console.log(`   ❌ Clients error: ${e.message}`);
  }
  console.log('');

  // Test 5: Get Appointments
  console.log('5. Testing Appointments Endpoint...');
  try {
    const appointments = await makeRequest('GET', '/api/v1/appointments', null, authToken);
    if (appointments.status === 200) {
      console.log(`   ✅ Appointments: ${appointments.data.data.length} appointments found`);
    } else {
      console.log(`   ❌ Appointments failed: ${appointments.status}`);
    }
  } catch (e) {
    console.log(`   ❌ Appointments error: ${e.message}`);
  }
  console.log('');

  // Test 6: Get Clinical Notes
  console.log('6. Testing Clinical Notes Endpoint...');
  try {
    const notes = await makeRequest('GET', '/api/v1/clinical-notes/my-notes', null, authToken);
    if (notes.status === 200) {
      console.log(`   ✅ Clinical Notes: ${notes.data.data.length} notes found`);
    } else {
      console.log(`   ❌ Clinical Notes failed: ${notes.status}`);
    }
  } catch (e) {
    console.log(`   ❌ Clinical Notes error: ${e.message}`);
  }
  console.log('');

  // Test 7: Get Service Codes (CPT)
  console.log('7. Testing Service Codes Endpoint...');
  try {
    const codes = await makeRequest('GET', '/api/v1/service-codes', null, authToken);
    if (codes.status === 200) {
      console.log(`   ✅ Service Codes: ${codes.data.data.length} codes found`);
    } else {
      console.log(`   ❌ Service Codes failed: ${codes.status}`);
    }
  } catch (e) {
    console.log(`   ❌ Service Codes error: ${e.message}`);
  }
  console.log('');

  // Test 8: Get Diagnoses (ICD-10)
  console.log('8. Testing Diagnoses Endpoint...');
  try {
    const diagnoses = await makeRequest('GET', '/api/v1/diagnoses?limit=10', null, authToken);
    if (diagnoses.status === 200) {
      console.log(`   ✅ Diagnoses: ${diagnoses.data.data.length} diagnoses found`);
    } else {
      console.log(`   ❌ Diagnoses failed: ${diagnoses.status}`);
    }
  } catch (e) {
    console.log(`   ❌ Diagnoses error: ${e.message}`);
  }
  console.log('');

  console.log('='.repeat(80));
  console.log('TEST COMPLETE');
  console.log('='.repeat(80));
}

testProductionAPI();
