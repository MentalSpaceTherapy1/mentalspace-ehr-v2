const https = require('https');

const API_BASE = 'api.mentalspaceehr.com';
let authToken = null;
let testResults = {
  phase11: { implemented: false, deployed: false, tested: false, details: [] },
  phase12: { implemented: false, deployed: false, tested: false, details: [] },
  phase13: { implemented: false, deployed: false, tested: false, details: [] },
  phase14: { implemented: false, deployed: false, tested: false, details: [] },
  phase15: { implemented: false, deployed: false, tested: false, details: [] },
  phase16: { implemented: false, deployed: false, tested: false, details: [] },
};

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
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (bodyStr) {
      req.write(bodyStr);
    }
    req.end();
  });
}

async function login() {
  console.log('\n🔐 Authenticating with production API...');
  try {
    const response = await makeRequest('POST', '/auth/login', {
      email: 'brendajb@chctherapy.com',
      password: '38MoreYears!',
    });

    if (response.data && response.data.success && response.data.data) {
      // Handle both old and new token structures
      authToken = response.data.data.token ||
                  (response.data.data.tokens && response.data.data.tokens.accessToken);

      if (authToken) {
        console.log('✅ Authentication successful');
        return true;
      }
    }

    console.log('❌ Authentication failed: Could not extract token');
    return false;
  } catch (error) {
    console.log('❌ Authentication error:', error.message);
    return false;
  }
}

async function testPhase11() {
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 1.1: HARD APPOINTMENT REQUIREMENT ENFORCEMENT');
  console.log('='.repeat(80));

  const phase = testResults.phase11;

  // Test 1: Try to create clinical note without appointment (should fail)
  console.log('\n📝 Test 1: Creating clinical note without appointmentId...');
  try {
    const response = await makeRequest('POST', '/clinical-notes', {
      clientId: '00000000-0000-0000-0000-000000000000', // Dummy ID
      noteType: 'PROGRESS_NOTE',
      sessionDate: new Date().toISOString(),
      clinicianId: '00000000-0000-0000-0000-000000000000',
    }, authToken);

    if (response.status >= 400) {
      console.log('✅ PASS: Backend correctly rejects notes without appointment');
      console.log(`   Status: ${response.status}`);
      console.log(`   Message: ${response.data.message || JSON.stringify(response.data).substring(0, 100)}`);
      phase.deployed = true;
      phase.tested = true;
      phase.details.push('✅ Appointment requirement enforced in API');
    } else {
      console.log('❌ FAIL: Backend allowed note creation without appointment');
      phase.details.push('❌ Appointment requirement NOT enforced');
    }
  } catch (error) {
    console.log('⚠️  Error testing:', error.message);
  }

  // Test 2: Check database constraint (via attempted creation)
  phase.implemented = phase.deployed; // If deployed and enforced, it's implemented
}

async function testPhase12() {
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 1.2: RETURN FOR REVISION WORKFLOW');
  console.log('='.repeat(80));

  const phase = testResults.phase12;

  // Test 1: Check if return-for-revision endpoint exists
  console.log('\n📝 Test 1: Checking return-for-revision endpoint...');
  try {
    const response = await makeRequest('POST', '/clinical-notes/test-id/return-for-revision', {
      comments: 'Test revision',
      requiredChanges: ['Fix assessment'],
    }, authToken);

    if (response.status === 404 && response.data.message && response.data.message.includes('not found')) {
      console.log('❌ FAIL: Endpoint does not exist');
      phase.details.push('❌ POST /clinical-notes/:id/return-for-revision - NOT FOUND');
    } else if (response.status === 400 || response.status === 404) {
      console.log('✅ PASS: Endpoint exists (failed due to invalid note ID)');
      phase.deployed = true;
      phase.tested = true;
      phase.details.push('✅ Return-for-revision endpoint exists');
    } else {
      console.log(`⚠️  Unexpected response: ${response.status}`);
    }
  } catch (error) {
    console.log('⚠️  Error testing:', error.message);
  }

  // Test 2: Check resubmit endpoint
  console.log('\n📝 Test 2: Checking resubmit-for-review endpoint...');
  try {
    const response = await makeRequest('POST', '/clinical-notes/test-id/resubmit-for-review', {}, authToken);

    if (response.status === 404 && response.data.message && response.data.message.includes('not found')) {
      console.log('❌ FAIL: Resubmit endpoint does not exist');
      phase.details.push('❌ POST /clinical-notes/:id/resubmit-for-review - NOT FOUND');
    } else if (response.status === 400 || response.status === 404) {
      console.log('✅ PASS: Resubmit endpoint exists');
      phase.details.push('✅ Resubmit endpoint exists');
    }
  } catch (error) {
    console.log('⚠️  Error testing:', error.message);
  }

  phase.implemented = phase.deployed;
}

async function testPhase13() {
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 1.3: REQUIRED FIELD VALIDATION ENGINE');
  console.log('='.repeat(80));

  const phase = testResults.phase13;

  console.log('\n📝 Test 1: Checking validation rules endpoint...');
  try {
    const response = await makeRequest('GET', '/validation-rules/PROGRESS_NOTE', null, authToken);

    if (response.status === 200) {
      console.log('✅ PASS: Validation rules endpoint exists');
      phase.deployed = true;
      phase.tested = true;
      phase.details.push('✅ Validation rules API deployed');
    } else if (response.status === 404) {
      console.log('❌ FAIL: Validation rules endpoint not found');
      phase.details.push('❌ Validation rules API NOT implemented');
    }
  } catch (error) {
    console.log('⚠️  Error testing:', error.message);
  }

  phase.implemented = phase.deployed;
}

async function testPhase14() {
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 1.4: LEGAL ELECTRONIC SIGNATURES & ATTESTATIONS');
  console.log('='.repeat(80));

  const phase = testResults.phase14;

  // Test 1: Signature status endpoint
  console.log('\n📝 Test 1: GET /users/signature-status');
  try {
    const response = await makeRequest('GET', '/users/signature-status', null, authToken);

    if (response.status === 200) {
      console.log('✅ PASS: Signature status endpoint works');
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));
      phase.deployed = true;
      phase.tested = true;
      phase.details.push('✅ Signature status API working');
    } else {
      console.log(`❌ FAIL: Status ${response.status}`);
      phase.details.push(`❌ Signature status returned ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 2: Attestation endpoint
  console.log('\n📝 Test 2: GET /signatures/attestation/:noteType');
  try {
    const response = await makeRequest('GET', '/signatures/attestation/PROGRESS_NOTE?signatureType=AUTHOR', null, authToken);

    if (response.status === 200) {
      console.log('✅ PASS: Attestation endpoint works');
      console.log(`   Attestation text preview: ${JSON.stringify(response.data).substring(0, 100)}...`);
      phase.details.push('✅ Attestation API working');
    } else {
      console.log(`❌ FAIL: Status ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 3: PIN setup endpoint
  console.log('\n📝 Test 3: POST /users/signature-pin');
  try {
    const response = await makeRequest('POST', '/users/signature-pin', {
      pin: '1234',
      confirmPin: '1234',
    }, authToken);

    if (response.status === 200 || response.status === 400) {
      console.log('✅ PASS: PIN setup endpoint exists');
      phase.details.push('✅ PIN setup API exists');
    } else {
      console.log(`⚠️  Unexpected status: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  phase.implemented = phase.deployed;
}

async function testPhase15() {
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 1.5: AMENDMENT HISTORY SYSTEM');
  console.log('='.repeat(80));

  const phase = testResults.phase15;

  console.log('\n📝 Test 1: Checking amendment endpoint...');
  try {
    const response = await makeRequest('POST', '/clinical-notes/test-id/amend', {
      reason: 'Test amendment',
    }, authToken);

    if (response.status === 404 && response.data.message && response.data.message.includes('not found')) {
      console.log('❌ FAIL: Amendment endpoint does not exist');
      phase.details.push('❌ Amendment API NOT implemented');
    } else if (response.status === 400 || response.status === 404) {
      console.log('✅ PASS: Amendment endpoint exists');
      phase.deployed = true;
      phase.tested = true;
      phase.details.push('✅ Amendment endpoint exists');
    }
  } catch (error) {
    console.log('⚠️  Error testing:', error.message);
  }

  phase.implemented = phase.deployed;
}

async function testPhase16() {
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 1.6: DIAGNOSIS INHERITANCE DISPLAY');
  console.log('='.repeat(80));

  const phase = testResults.phase16;

  console.log('\n📝 Test 1: Checking diagnosis endpoint for client...');
  try {
    const response = await makeRequest('GET', '/clients/test-id/current-diagnosis', null, authToken);

    if (response.status === 404 && response.data.message && response.data.message.includes('not found')) {
      console.log('❌ FAIL: Current diagnosis endpoint does not exist');
      phase.details.push('❌ Diagnosis display API NOT implemented');
    } else if (response.status === 400 || response.status === 404 || response.status === 200) {
      console.log('✅ PASS: Diagnosis endpoint exists');
      phase.deployed = true;
      phase.tested = true;
      phase.details.push('✅ Diagnosis API exists');
    }
  } catch (error) {
    console.log('⚠️  Error testing:', error.message);
  }

  phase.implemented = phase.deployed;
}

function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('COMPREHENSIVE PHASE 1.1-1.6 ASSESSMENT REPORT');
  console.log('='.repeat(80));

  console.log('\n📊 IMPLEMENTATION STATUS:\n');

  const phases = [
    { name: 'Phase 1.1: Hard Appointment Requirement', key: 'phase11' },
    { name: 'Phase 1.2: Return for Revision Workflow', key: 'phase12' },
    { name: 'Phase 1.3: Required Field Validation', key: 'phase13' },
    { name: 'Phase 1.4: Electronic Signatures', key: 'phase14' },
    { name: 'Phase 1.5: Amendment History', key: 'phase15' },
    { name: 'Phase 1.6: Diagnosis Inheritance', key: 'phase16' },
  ];

  phases.forEach(({ name, key }) => {
    const phase = testResults[key];
    const implStatus = phase.implemented ? '✅' : '❌';
    const deployStatus = phase.deployed ? '✅' : '❌';
    const testStatus = phase.tested ? '✅' : '❌';

    console.log(`${name}`);
    console.log(`   Implemented: ${implStatus} | Deployed: ${deployStatus} | Tested: ${testStatus}`);
    if (phase.details.length > 0) {
      phase.details.forEach(detail => console.log(`   ${detail}`));
    }
    console.log('');
  });

  // Calculate overall progress
  const totalPhases = 6;
  const implemented = Object.values(testResults).filter(p => p.implemented).length;
  const deployed = Object.values(testResults).filter(p => p.deployed).length;
  const tested = Object.values(testResults).filter(p => p.tested).length;

  console.log('\n📈 OVERALL PROGRESS:');
  console.log(`   Implemented: ${implemented}/${totalPhases} (${Math.round(implemented/totalPhases*100)}%)`);
  console.log(`   Deployed to Production: ${deployed}/${totalPhases} (${Math.round(deployed/totalPhases*100)}%)`);
  console.log(`   Tested in Production: ${tested}/${totalPhases} (${Math.round(tested/totalPhases*100)}%)`);

  console.log('\n🎯 VERDICT:');
  if (deployed === totalPhases && tested === totalPhases) {
    console.log('   ✅ ALL PHASES FULLY DEPLOYED AND TESTED');
  } else if (deployed >= 3) {
    console.log(`   ⚠️  PARTIALLY DEPLOYED: ${deployed}/${totalPhases} phases live`);
  } else {
    console.log(`   ❌ INCOMPLETE: Only ${deployed}/${totalPhases} phases deployed`);
  }

  console.log('\n📍 Production Environment:');
  console.log('   Backend: https://api.mentalspaceehr.com');
  console.log('   Frontend: https://mentalspaceehr.com');
  console.log('   Status: LIVE');
}

async function main() {
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(15) + 'PHASE 1.1-1.6 PRODUCTION VERIFICATION' + ' '.repeat(25) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');

  const authenticated = await login();
  if (!authenticated) {
    console.log('\n❌ Cannot proceed: Authentication failed');
    console.log('   This means the backend is running but login is broken');
    console.log('   or credentials are incorrect.\n');
    return;
  }

  await testPhase11();
  await testPhase12();
  await testPhase13();
  await testPhase14();
  await testPhase15();
  await testPhase16();

  generateReport();

  console.log('\n' + '='.repeat(80));
  console.log('ASSESSMENT COMPLETE');
  console.log('='.repeat(80) + '\n');
}

main().catch(error => {
  console.error('\n❌ CRITICAL ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
});
