const https = require('https');

const API_BASE = 'api.mentalspaceehr.com';
let authToken = null;

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_BASE,
      port: 443,
      path: `/api/v1${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const bodyStr = body ? JSON.stringify(body) : '';
    if (bodyStr) {
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function login() {
  const response = await makeRequest('POST', '/auth/login', {
    email: 'brendajb@chctherapy.com',
    password: '38MoreYears!',
  });

  if (response.data && response.data.success && response.data.data) {
    authToken = response.data.data.token ||
                (response.data.data.tokens && response.data.data.tokens.accessToken);
    if (authToken) {
      console.log('✅ Authenticated\n');
      return true;
    }
  }
  console.log('❌ Auth failed');
  return false;
}

async function testPhase12() {
  console.log('='.repeat(80));
  console.log('PHASE 1.2 ENDPOINT TESTING');
  console.log('='.repeat(80) + '\n');

  // Test 1: Return for revision
  console.log('Test 1: POST /clinical-notes/:id/return-for-revision');
  const test1 = await makeRequest('POST', '/clinical-notes/00000000-0000-0000-0000-000000000000/return-for-revision', {
    comments: 'Please fix the assessment section',
    requiredChanges: ['assessment', 'plan'],
  }, authToken);

  console.log(`Status: ${test1.status}`);
  console.log(`Response:`, JSON.stringify(test1.data, null, 2).substring(0, 200));

  if (test1.status === 404 && test1.data.message && test1.data.message.includes('not found')) {
    console.log('✅ Endpoint EXISTS (note not found is expected for test ID)\n');
  } else if (test1.status === 404 && test1.data.message && test1.data.message.includes('Route')) {
    console.log('❌ Endpoint DOES NOT EXIST\n');
  } else {
    console.log(`✅ Endpoint EXISTS (status: ${test1.status})\n`);
  }

  // Test 2: Resubmit for review
  console.log('Test 2: POST /clinical-notes/:id/resubmit-for-review');
  const test2 = await makeRequest('POST', '/clinical-notes/00000000-0000-0000-0000-000000000000/resubmit-for-review', {}, authToken);

  console.log(`Status: ${test2.status}`);
  console.log(`Response:`, JSON.stringify(test2.data, null, 2).substring(0, 200));

  if (test2.status === 404 && test2.data.message && test2.data.message.includes('not found')) {
    console.log('✅ Endpoint EXISTS (note not found is expected)\n');
  } else if (test2.status === 404 && test2.data.message && test2.data.message.includes('Route')) {
    console.log('❌ Endpoint DOES NOT EXIST\n');
  } else {
    console.log(`✅ Endpoint EXISTS (status: ${test2.status})\n`);
  }
}

async function testPhase13() {
  console.log('='.repeat(80));
  console.log('PHASE 1.3 ENDPOINT TESTING');
  console.log('='.repeat(80) + '\n');

  // Test 1: Get validation rules
  console.log('Test 1: GET /clinical-notes/validation-rules/:noteType');
  const test1 = await makeRequest('GET', '/clinical-notes/validation-rules/PROGRESS_NOTE', null, authToken);

  console.log(`Status: ${test1.status}`);
  console.log(`Response:`, JSON.stringify(test1.data, null, 2).substring(0, 300));

  if (test1.status === 200) {
    console.log('✅ Endpoint WORKING\n');
  } else if (test1.status === 404 && test1.data.message && test1.data.message.includes('Route')) {
    console.log('❌ Endpoint DOES NOT EXIST\n');
  } else {
    console.log(`⚠️  Endpoint EXISTS but returned ${test1.status}\n`);
  }

  // Test 2: Validate note data
  console.log('Test 2: POST /clinical-notes/validate');
  const test2 = await makeRequest('POST', '/clinical-notes/validate', {
    noteType: 'PROGRESS_NOTE',
    subjective: 'Test',
  }, authToken);

  console.log(`Status: ${test2.status}`);
  console.log(`Response:`, JSON.stringify(test2.data, null, 2).substring(0, 300));

  if (test2.status === 200) {
    console.log('✅ Endpoint WORKING\n');
  } else if (test2.status === 404 && test2.data.message && test2.data.message.includes('Route')) {
    console.log('❌ Endpoint DOES NOT EXIST\n');
  } else {
    console.log(`⚠️  Endpoint EXISTS but returned ${test2.status}\n`);
  }

  // Test 3: Get validation summary
  console.log('Test 3: GET /clinical-notes/validation-summary/:noteType');
  const test3 = await makeRequest('GET', '/clinical-notes/validation-summary/PROGRESS_NOTE', null, authToken);

  console.log(`Status: ${test3.status}`);
  console.log(`Response:`, JSON.stringify(test3.data, null, 2).substring(0, 300));

  if (test3.status === 200) {
    console.log('✅ Endpoint WORKING\n');
  } else if (test3.status === 404 && test3.data.message && test3.data.message.includes('Route')) {
    console.log('❌ Endpoint DOES NOT EXIST\n');
  } else {
    console.log(`⚠️  Endpoint EXISTS but returned ${test3.status}\n');
  }
}

async function main() {
  const authenticated = await login();
  if (!authenticated) {
    console.log('Cannot proceed without authentication');
    return;
  }

  await testPhase12();
  await testPhase13();

  console.log('='.repeat(80));
  console.log('TESTING COMPLETE');
  console.log('='.repeat(80));
}

main().catch(console.error);
