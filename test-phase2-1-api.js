/**
 * Phase 2.1: API Testing Script
 * Tests all payer policy engine endpoints
 */

const axios = require('axios');

const API_BASE = process.env.API_URL || 'http://localhost:3001/api/v1';
const TEST_USER = {
  email: process.env.TEST_EMAIL || 'brendajb@chctherapy.com',
  password: process.env.TEST_PASSWORD || '38MoreYears!'
};

let authToken = null;
let testPayerId = null;
let testRuleId = null;

console.log('🧪 PHASE 2.1 API TESTING');
console.log('='.repeat(80));
console.log(`API Base: ${API_BASE}\n`);

async function login() {
  console.log('🔐 Step 1: Authenticating...');
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });

    const data = response.data.data;
    authToken = data.tokens.accessToken;

    console.log(`✅ Login successful`);
    console.log(`   User: ${data.user.firstName} ${data.user.lastName}\n`);
    return true;
  } catch (error) {
    console.log(`❌ Login failed: ${error.response?.data?.message || error.message}\n`);
    return false;
  }
}

function getAuthHeaders() {
  return {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };
}

async function testPayerEndpoints() {
  console.log('📋 Step 2: Testing Payer Endpoints');
  console.log('-'.repeat(80));

  // Test 1: GET /payers
  try {
    const response = await axios.get(`${API_BASE}/payers`, {
      headers: getAuthHeaders()
    });

    console.log(`✅ GET /payers - Success`);
    console.log(`   Found ${response.data.total} payers`);

    if (response.data.data.length > 0) {
      const testPayer = response.data.data[0];
      console.log(`   Sample: ${testPayer.name} (${testPayer.payerType})`);
    }
  } catch (error) {
    console.log(`❌ GET /payers - Failed: ${error.response?.data?.message || error.message}`);
  }

  // Test 2: GET /payers/stats
  try {
    const response = await axios.get(`${API_BASE}/payers/stats`, {
      headers: getAuthHeaders()
    });

    console.log(`✅ GET /payers/stats - Success`);
    console.log(`   Total: ${response.data.data.total}, Active: ${response.data.data.active}`);
  } catch (error) {
    console.log(`❌ GET /payers/stats - Failed: ${error.response?.data?.message || error.message}`);
  }

  // Test 3: GET /payers/:id (get a specific payer)
  try {
    // Get BlueCross GA
    const listResponse = await axios.get(`${API_BASE}/payers`, {
      headers: getAuthHeaders()
    });

    const blueCross = listResponse.data.data.find(p => p.name.includes('BlueCross'));

    if (blueCross) {
      const response = await axios.get(`${API_BASE}/payers/${blueCross.id}`, {
        headers: getAuthHeaders()
      });

      console.log(`✅ GET /payers/:id - Success`);
      console.log(`   ${response.data.data.name} has ${response.data.data.rules?.length || 0} rules`);
    }
  } catch (error) {
    console.log(`❌ GET /payers/:id - Failed: ${error.response?.data?.message || error.message}`);
  }

  console.log();
}

async function testPayerRuleEndpoints() {
  console.log('📋 Step 3: Testing Payer Rule Endpoints');
  console.log('-'.repeat(80));

  // Test 1: GET /payer-rules
  try {
    const response = await axios.get(`${API_BASE}/payer-rules`, {
      headers: getAuthHeaders()
    });

    console.log(`✅ GET /payer-rules - Success`);
    console.log(`   Found ${response.data.total} rules`);

    if (response.data.data.length > 0) {
      testRuleId = response.data.data[0].id;
      const rule = response.data.data[0];
      console.log(`   Sample: ${rule.payer.name} - ${rule.clinicianCredential} + ${rule.serviceType}`);
    }
  } catch (error) {
    console.log(`❌ GET /payer-rules - Failed: ${error.response?.data?.message || error.message}`);
  }

  // Test 2: GET /payer-rules/stats
  try {
    const response = await axios.get(`${API_BASE}/payer-rules/stats`, {
      headers: getAuthHeaders()
    });

    console.log(`✅ GET /payer-rules/stats - Success`);
    console.log(`   Total: ${response.data.data.total}, Active: ${response.data.data.active}, Prohibited: ${response.data.data.prohibited}`);
  } catch (error) {
    console.log(`❌ GET /payer-rules/stats - Failed: ${error.response?.data?.message || error.message}`);
  }

  // Test 3: GET /payer-rules/find-match
  try {
    // Get a payer first
    const payersResponse = await axios.get(`${API_BASE}/payers`, {
      headers: getAuthHeaders()
    });

    const blueCross = payersResponse.data.data.find(p => p.name.includes('BlueCross'));

    if (blueCross) {
      const response = await axios.get(`${API_BASE}/payer-rules/find-match`, {
        headers: getAuthHeaders(),
        params: {
          payerId: blueCross.id,
          clinicianCredential: 'LAMFT',
          serviceType: 'PSYCHOTHERAPY',
          placeOfService: 'OFFICE'
        }
      });

      if (response.data.success) {
        console.log(`✅ GET /payer-rules/find-match - Success`);
        console.log(`   Found rule: Cosign required: ${response.data.data.cosignRequired}, Timeframe: ${response.data.data.cosignTimeframeDays || 'N/A'} days`);
      }
    }
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`✅ GET /payer-rules/find-match - Success (no match found - expected behavior)`);
    } else {
      console.log(`❌ GET /payer-rules/find-match - Failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // Test 4: GET /payer-rules/:id
  if (testRuleId) {
    try {
      const response = await axios.get(`${API_BASE}/payer-rules/${testRuleId}`, {
        headers: getAuthHeaders()
      });

      console.log(`✅ GET /payer-rules/:id - Success`);
      console.log(`   Rule: ${response.data.data.payer.name} - ${response.data.data.clinicianCredential}`);
    } catch (error) {
      console.log(`❌ GET /payer-rules/:id - Failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // Test 5: POST /payer-rules/:id/test
  if (testRuleId) {
    try {
      const response = await axios.post(`${API_BASE}/payer-rules/${testRuleId}/test`, {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate: new Date()
      }, {
        headers: getAuthHeaders()
      });

      console.log(`✅ POST /payer-rules/:id/test - Success`);
      console.log(`   Tested ${response.data.data.noteTested} notes`);
      console.log(`   Would block: ${response.data.data.wouldBlock}, Would pass: ${response.data.data.wouldPass}`);
    } catch (error) {
      console.log(`❌ POST /payer-rules/:id/test - Failed: ${error.response?.data?.message || error.message}`);
    }
  }

  console.log();
}

async function testBillingHoldEndpoints() {
  console.log('📋 Step 4: Testing Billing Hold Endpoints');
  console.log('-'.repeat(80));

  // Test 1: GET /billing-holds/count
  try {
    const response = await axios.get(`${API_BASE}/billing-holds/count`, {
      headers: getAuthHeaders()
    });

    console.log(`✅ GET /billing-holds/count - Success`);
    console.log(`   Active holds: ${response.data.data.count}`);
  } catch (error) {
    console.log(`❌ GET /billing-holds/count - Failed: ${error.response?.data?.message || error.message}`);
  }

  // Test 2: GET /billing-holds/by-reason
  try {
    const response = await axios.get(`${API_BASE}/billing-holds/by-reason`, {
      headers: getAuthHeaders()
    });

    console.log(`✅ GET /billing-holds/by-reason - Success`);
    const reasons = Object.keys(response.data.data);
    if (reasons.length > 0) {
      console.log(`   Hold reasons: ${reasons.join(', ')}`);
    } else {
      console.log(`   No holds currently (expected for fresh database)`);
    }
  } catch (error) {
    console.log(`❌ GET /billing-holds/by-reason - Failed: ${error.response?.data?.message || error.message}`);
  }

  // Test 3: GET /billing-holds
  try {
    const response = await axios.get(`${API_BASE}/billing-holds`, {
      headers: getAuthHeaders()
    });

    console.log(`✅ GET /billing-holds - Success`);
    console.log(`   Total holds: ${response.data.total}`);
  } catch (error) {
    console.log(`❌ GET /billing-holds - Failed: ${error.response?.data?.message || error.message}`);
  }

  console.log();
}

async function testBillingReadiness() {
  console.log('📋 Step 5: Testing Billing Readiness Validation');
  console.log('-'.repeat(80));

  // First, try to find a clinical note to test with
  try {
    const notesResponse = await axios.get(`${API_BASE}/clinical-notes`, {
      headers: getAuthHeaders(),
      params: { limit: 1 }
    });

    if (notesResponse.data.data && notesResponse.data.data.length > 0) {
      const noteId = notesResponse.data.data[0].id;

      // Test billing readiness check
      try {
        const response = await axios.get(`${API_BASE}/clinical-notes/${noteId}/billing-readiness`, {
          headers: getAuthHeaders(),
          params: { createHolds: false } // Don't create holds during testing
        });

        console.log(`✅ GET /clinical-notes/:id/billing-readiness - Success`);
        console.log(`   Can bill: ${response.data.data.canBill}`);
        console.log(`   Holds: ${response.data.data.holds.length}`);
        console.log(`   Warnings: ${response.data.data.warnings.length}`);

        if (response.data.data.holds.length > 0) {
          console.log(`   First hold reason: ${response.data.data.holds[0].reason}`);
        }
      } catch (error) {
        console.log(`❌ GET /clinical-notes/:id/billing-readiness - Failed: ${error.response?.data?.message || error.message}`);
      }
    } else {
      console.log(`⚠️  No clinical notes found to test billing readiness`);
    }
  } catch (error) {
    console.log(`⚠️  Could not fetch clinical notes: ${error.response?.data?.message || error.message}`);
  }

  console.log();
}

async function runTests() {
  const loggedIn = await login();

  if (!loggedIn) {
    console.log('❌ Cannot continue without authentication');
    return;
  }

  await testPayerEndpoints();
  await testPayerRuleEndpoints();
  await testBillingHoldEndpoints();
  await testBillingReadiness();

  console.log('='.repeat(80));
  console.log('✅ API Testing Complete!');
  console.log('='.repeat(80));
}

runTests().catch(error => {
  console.error('❌ Test suite failed:', error.message);
  process.exit(1);
});
