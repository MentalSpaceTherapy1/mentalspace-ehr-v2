// Test script for Module 2 Phase 1 Backend APIs
// Tests: Duplicate Detection, Diagnoses, Relationships, Prior Authorizations

const baseURL = 'http://localhost:3001/api/v1';
let authToken = '';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function makeRequest(method, endpoint, body = null) {
  const url = `${baseURL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type');
    const data = contentType && contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    return {
      status: response.status,
      ok: response.ok,
      data,
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
    };
  }
}

async function login() {
  log('\n📝 Authenticating...', 'cyan');
  const result = await makeRequest('POST', '/auth/login', {
    email: 'admin@mentalspaceehr.com',
    password: 'Admin@123',
  });

  if (result.ok && result.data.token) {
    authToken = result.data.token;
    log('✅ Authentication successful', 'green');
    return true;
  } else {
    log('❌ Authentication failed', 'red');
    console.log(result);
    return false;
  }
}

// ============================================================================
// TEST 1: DUPLICATE DETECTION
// ============================================================================
async function testDuplicateDetection() {
  log('\n' + '='.repeat(80), 'blue');
  log('TEST 1: DUPLICATE DETECTION APIs', 'blue');
  log('='.repeat(80), 'blue');

  let passed = 0, failed = 0;

  // Test 1.1: Check for duplicates
  log('\n🧪 Test 1.1: POST /clients/check-duplicates', 'yellow');
  const duplicateCheck = await makeRequest('POST', '/clients/check-duplicates', {
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-01-15',
    email: 'john.doe@example.com',
    primaryPhone: '555-1234',
  });

  if (duplicateCheck.ok) {
    log('✅ Duplicate detection endpoint working', 'green');
    console.log(`   Found ${duplicateCheck.data.data?.length || 0} potential duplicates`);
    passed++;
  } else {
    log('❌ Duplicate detection endpoint failed', 'red');
    console.log(`   Status: ${duplicateCheck.status}`);
    console.log(`   Error:`, duplicateCheck.data);
    failed++;
  }

  // Test 1.2: Get pending duplicates
  log('\n🧪 Test 1.2: GET /duplicates/pending', 'yellow');
  const pendingDuplicates = await makeRequest('GET', '/duplicates/pending');

  if (pendingDuplicates.ok) {
    log('✅ Get pending duplicates endpoint working', 'green');
    console.log(`   Found ${pendingDuplicates.data.data?.length || 0} pending duplicates`);
    passed++;
  } else {
    log('❌ Get pending duplicates endpoint failed', 'red');
    console.log(`   Status: ${pendingDuplicates.status}`);
    console.log(`   Error:`, pendingDuplicates.data);
    failed++;
  }

  // Test 1.3: Get duplicate stats
  log('\n🧪 Test 1.3: GET /duplicates/stats', 'yellow');
  const duplicateStats = await makeRequest('GET', '/duplicates/stats');

  if (duplicateStats.ok) {
    log('✅ Get duplicate stats endpoint working', 'green');
    console.log(`   Stats:`, duplicateStats.data.data);
    passed++;
  } else {
    log('❌ Get duplicate stats endpoint failed', 'red');
    console.log(`   Status: ${duplicateStats.status}`);
    console.log(`   Error:`, duplicateStats.data);
    failed++;
  }

  log(`\n📊 Duplicate Detection Results: ${passed} passed, ${failed} failed`, passed === 3 ? 'green' : 'red');
  return { passed, failed };
}

// ============================================================================
// TEST 2: CLIENT DIAGNOSES
// ============================================================================
async function testClientDiagnoses() {
  log('\n' + '='.repeat(80), 'blue');
  log('TEST 2: CLIENT DIAGNOSES APIs', 'blue');
  log('='.repeat(80), 'blue');

  let passed = 0, failed = 0;

  // First, get a client ID to test with
  const clientsResult = await makeRequest('GET', '/clients?limit=1');
  const clientId = clientsResult.ok && clientsResult.data.data?.clients?.[0]?.id;

  if (!clientId) {
    log('❌ No clients found in database - skipping diagnosis tests', 'red');
    return { passed: 0, failed: 3 };
  }

  // Test 2.1: Search ICD-10 codes
  log('\n🧪 Test 2.1: GET /diagnoses/icd10/search?query=depression', 'yellow');
  const icd10Search = await makeRequest('GET', '/diagnoses/icd10/search?query=depression');

  if (icd10Search.ok) {
    log('✅ ICD-10 search endpoint working', 'green');
    console.log(`   Found ${icd10Search.data.data?.length || 0} matching codes`);
    passed++;
  } else {
    log('❌ ICD-10 search endpoint failed', 'red');
    console.log(`   Status: ${icd10Search.status}`);
    console.log(`   Error:`, icd10Search.data);
    failed++;
  }

  // Test 2.2: Get client diagnoses (should be empty initially)
  log(`\n🧪 Test 2.2: GET /clients/${clientId}/diagnoses`, 'yellow');
  const clientDiagnoses = await makeRequest('GET', `/clients/${clientId}/diagnoses`);

  if (clientDiagnoses.ok) {
    log('✅ Get client diagnoses endpoint working', 'green');
    console.log(`   Found ${clientDiagnoses.data.data?.length || 0} diagnoses for client`);
    passed++;
  } else {
    log('❌ Get client diagnoses endpoint failed', 'red');
    console.log(`   Status: ${clientDiagnoses.status}`);
    console.log(`   Error:`, clientDiagnoses.data);
    failed++;
  }

  // Test 2.3: Test diagnosis statistics
  log(`\n🧪 Test 2.3: GET /clients/${clientId}/diagnoses/statistics`, 'yellow');
  const diagnosisStats = await makeRequest('GET', `/clients/${clientId}/diagnoses/statistics`);

  if (diagnosisStats.ok) {
    log('✅ Get diagnosis statistics endpoint working', 'green');
    console.log(`   Stats:`, diagnosisStats.data.data);
    passed++;
  } else {
    log('❌ Get diagnosis statistics endpoint failed', 'red');
    console.log(`   Status: ${diagnosisStats.status}`);
    console.log(`   Error:`, diagnosisStats.data);
    failed++;
  }

  log(`\n📊 Client Diagnoses Results: ${passed} passed, ${failed} failed`, passed === 3 ? 'green' : 'red');
  return { passed, failed };
}

// ============================================================================
// TEST 3: CLIENT RELATIONSHIPS
// ============================================================================
async function testClientRelationships() {
  log('\n' + '='.repeat(80), 'blue');
  log('TEST 3: CLIENT RELATIONSHIPS APIs', 'blue');
  log('='.repeat(80), 'blue');

  let passed = 0, failed = 0;

  // Get a client ID to test with
  const clientsResult = await makeRequest('GET', '/clients?limit=1');
  const clientId = clientsResult.ok && clientsResult.data.data?.clients?.[0]?.id;

  if (!clientId) {
    log('❌ No clients found in database - skipping relationship tests', 'red');
    return { passed: 0, failed: 3 };
  }

  // Test 3.1: Get client relationships
  log(`\n🧪 Test 3.1: GET /client-relationships/client/${clientId}`, 'yellow');
  const relationships = await makeRequest('GET', `/client-relationships/client/${clientId}`);

  if (relationships.ok) {
    log('✅ Get client relationships endpoint working', 'green');
    console.log(`   Found ${relationships.data.data?.length || 0} relationships for client`);
    passed++;
  } else {
    log('❌ Get client relationships endpoint failed', 'red');
    console.log(`   Status: ${relationships.status}`);
    console.log(`   Error:`, relationships.data);
    failed++;
  }

  // Test 3.2: Get family tree
  log(`\n🧪 Test 3.2: GET /client-relationships/family-tree/${clientId}`, 'yellow');
  const familyTree = await makeRequest('GET', `/client-relationships/family-tree/${clientId}`);

  if (familyTree.ok) {
    log('✅ Get family tree endpoint working', 'green');
    console.log(`   Family tree nodes:`, familyTree.data.data?.length || 0);
    passed++;
  } else {
    log('❌ Get family tree endpoint failed', 'red');
    console.log(`   Status: ${familyTree.status}`);
    console.log(`   Error:`, familyTree.data);
    failed++;
  }

  // Test 3.3: Get care team
  log(`\n🧪 Test 3.3: GET /client-relationships/care-team/${clientId}`, 'yellow');
  const careTeam = await makeRequest('GET', `/client-relationships/care-team/${clientId}`);

  if (careTeam.ok) {
    log('✅ Get care team endpoint working', 'green');
    console.log(`   Care team size:`, careTeam.data.data?.length || 0);
    passed++;
  } else {
    log('❌ Get care team endpoint failed', 'red');
    console.log(`   Status: ${careTeam.status}`);
    console.log(`   Error:`, careTeam.data);
    failed++;
  }

  log(`\n📊 Client Relationships Results: ${passed} passed, ${failed} failed`, passed === 3 ? 'green' : 'red');
  return { passed, failed };
}

// ============================================================================
// TEST 4: PRIOR AUTHORIZATIONS
// ============================================================================
async function testPriorAuthorizations() {
  log('\n' + '='.repeat(80), 'blue');
  log('TEST 4: PRIOR AUTHORIZATIONS APIs', 'blue');
  log('='.repeat(80), 'blue');

  let passed = 0, failed = 0;

  // Get a client ID to test with
  const clientsResult = await makeRequest('GET', '/clients?limit=1');
  const clientId = clientsResult.ok && clientsResult.data.data?.clients?.[0]?.id;

  if (!clientId) {
    log('❌ No clients found in database - skipping prior authorization tests', 'red');
    return { passed: 0, failed: 3 };
  }

  // Test 4.1: Get client prior authorizations
  log(`\n🧪 Test 4.1: GET /prior-authorizations/client/${clientId}`, 'yellow');
  const priorAuths = await makeRequest('GET', `/prior-authorizations/client/${clientId}`);

  if (priorAuths.ok) {
    log('✅ Get prior authorizations endpoint working', 'green');
    console.log(`   Found ${priorAuths.data.data?.length || 0} prior authorizations`);
    passed++;
  } else {
    log('❌ Get prior authorizations endpoint failed', 'red');
    console.log(`   Status: ${priorAuths.status}`);
    console.log(`   Error:`, priorAuths.data);
    failed++;
  }

  // Test 4.2: Get expiring authorizations
  log('\n🧪 Test 4.2: GET /prior-authorizations/expiring?days=30', 'yellow');
  const expiringAuths = await makeRequest('GET', '/prior-authorizations/expiring?days=30');

  if (expiringAuths.ok) {
    log('✅ Get expiring authorizations endpoint working', 'green');
    console.log(`   Found ${expiringAuths.data.data?.length || 0} expiring authorizations`);
    passed++;
  } else {
    log('❌ Get expiring authorizations endpoint failed', 'red');
    console.log(`   Status: ${expiringAuths.status}`);
    console.log(`   Error:`, expiringAuths.data);
    failed++;
  }

  // Test 4.3: Get low session count authorizations
  log('\n🧪 Test 4.3: GET /prior-authorizations/low-sessions?threshold=5', 'yellow');
  const lowSessions = await makeRequest('GET', '/prior-authorizations/low-sessions?threshold=5');

  if (lowSessions.ok) {
    log('✅ Get low session count endpoint working', 'green');
    console.log(`   Found ${lowSessions.data.data?.length || 0} authorizations with low sessions`);
    passed++;
  } else {
    log('❌ Get low session count endpoint failed', 'red');
    console.log(`   Status: ${lowSessions.status}`);
    console.log(`   Error:`, lowSessions.data);
    failed++;
  }

  log(`\n📊 Prior Authorizations Results: ${passed} passed, ${failed} failed`, passed === 3 ? 'green' : 'red');
  return { passed, failed };
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================
async function runAllTests() {
  log('\n' + '='.repeat(80), 'cyan');
  log('MODULE 2 PHASE 1 BACKEND API TESTS', 'cyan');
  log('='.repeat(80), 'cyan');

  // Login first
  const authenticated = await login();
  if (!authenticated) {
    log('\n❌ Cannot proceed without authentication', 'red');
    process.exit(1);
  }

  // Run all tests
  const results = {
    duplicateDetection: await testDuplicateDetection(),
    clientDiagnoses: await testClientDiagnoses(),
    clientRelationships: await testClientRelationships(),
    priorAuthorizations: await testPriorAuthorizations(),
  };

  // Calculate totals
  const totalPassed = Object.values(results).reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = Object.values(results).reduce((sum, r) => sum + r.failed, 0);
  const totalTests = totalPassed + totalFailed;

  // Print final summary
  log('\n' + '='.repeat(80), 'cyan');
  log('FINAL SUMMARY', 'cyan');
  log('='.repeat(80), 'cyan');
  log(`\nTotal Tests: ${totalTests}`, 'cyan');
  log(`✅ Passed: ${totalPassed}`, 'green');
  log(`❌ Failed: ${totalFailed}`, totalFailed > 0 ? 'red' : 'green');
  log(`\nSuccess Rate: ${Math.round((totalPassed / totalTests) * 100)}%`, totalFailed === 0 ? 'green' : 'yellow');

  if (totalFailed === 0) {
    log('\n🎉 ALL TESTS PASSED! Module 2 Phase 1 backend is working correctly.', 'green');
  } else {
    log('\n⚠️ Some tests failed. Please review the errors above.', 'yellow');
  }

  log('\n' + '='.repeat(80), 'cyan');
}

// Run the tests
runAllTests().catch((error) => {
  log(`\n❌ Fatal Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
