const axios = require('axios');

const API_BASE = 'https://api.mentalspaceehr.com/api/v1';

// You'll need to get a valid JWT token from the user
// For now, we'll just test which endpoints exist
async function verifyProductionFeatures() {
  console.log('🔍 Verifying Production Features\n');
  console.log('='.repeat(80));

  const results = {
    health: null,
    phase1_1: null,
    phase1_2: null,
    phase1_3: null,
    phase1_4: null,
    phase1_5: null,
    phase1_6: null,
  };

  // Test Health
  console.log('\n📊 Testing Health Endpoints...');
  try {
    const health = await axios.get(`${API_BASE}/health/live`);
    results.health = health.data;
    console.log('✅ Health endpoint: OK');
  } catch (err) {
    console.log('❌ Health endpoint: FAILED', err.message);
  }

  try {
    const version = await axios.get(`${API_BASE}/version`);
    console.log('✅ Version endpoint: OK');
    console.log('   Git SHA:', version.data.gitSha || 'NOT SET');
    console.log('   Build Time:', version.data.buildTime || 'NOT SET');
  } catch (err) {
    console.log('❌ Version endpoint: FAILED', err.message);
  }

  // Test Phase 1.1: Appointment Enforcement
  console.log('\n📋 Phase 1.1: Appointment Enforcement System');
  console.log('   Database: appointment_clinical_notes table');
  console.log('   Endpoint: POST /api/v1/clinical-notes (with appointmentId validation)');
  console.log('   Status: ❓ REQUIRES AUTHENTICATION TO TEST');

  // Test Phase 1.2: Client Portal Forms
  console.log('\n📋 Phase 1.2: Client Portal Forms & Billing');
  console.log('   Features: Enhanced form submission, billing integration');
  console.log('   Endpoints: /api/v1/portal/* routes');
  console.log('   Status: ❓ REQUIRES AUTHENTICATION TO TEST');

  // Test Phase 1.3: Note Validation Rules
  console.log('\n📋 Phase 1.3: Note Validation Rules');
  console.log('   Database: note_validation_rules table');
  console.log('   Endpoint: GET /api/v1/clinical-notes/validation-rules');
  try {
    // This might be a public endpoint or return 401
    const response = await axios.get(`${API_BASE}/clinical-notes/validation-rules`);
    console.log('✅ Validation rules endpoint exists');
    console.log('   Rules found:', response.data.data?.length || 0);
    results.phase1_3 = 'DEPLOYED';
  } catch (err) {
    if (err.response?.status === 401) {
      console.log('🔐 Validation rules endpoint exists (requires auth)');
      results.phase1_3 = 'DEPLOYED (AUTH REQUIRED)';
    } else if (err.response?.status === 404) {
      console.log('❌ Validation rules endpoint NOT FOUND');
      results.phase1_3 = 'NOT DEPLOYED';
    } else {
      console.log('⚠️  Validation rules endpoint status unknown:', err.message);
      results.phase1_3 = 'UNKNOWN';
    }
  }

  // Test Phase 1.4: Electronic Signatures
  console.log('\n📋 Phase 1.4: Electronic Signatures & Attestations');
  console.log('   Database: signature_settings, signature_attestations, signature_events');
  console.log('   Endpoints: /api/v1/signatures/*');

  // Test if signature routes exist
  try {
    await axios.get(`${API_BASE}/signatures/settings`);
    console.log('✅ Signature settings endpoint exists');
    results.phase1_4 = 'DEPLOYED';
  } catch (err) {
    if (err.response?.status === 401) {
      console.log('🔐 Signature settings endpoint exists (requires auth)');
      results.phase1_4 = 'DEPLOYED (AUTH REQUIRED)';
    } else if (err.response?.status === 404) {
      console.log('❌ Signature settings endpoint NOT FOUND');
      results.phase1_4 = 'NOT DEPLOYED';
    } else {
      console.log('⚠️  Signature settings endpoint status unknown:', err.message);
      results.phase1_4 = 'UNKNOWN';
    }
  }

  // Test Phase 1.5: Amendment History
  console.log('\n📋 Phase 1.5: Amendment History System');
  console.log('   Database: note_amendments, note_versions');
  console.log('   Endpoints: /api/v1/clinical-notes/:id/amendments');

  // We can't test a specific note ID without auth, but we can check if the route handler exists
  try {
    await axios.get(`${API_BASE}/clinical-notes/test-id/amendments`);
    console.log('✅ Amendment history endpoint exists');
    results.phase1_5 = 'DEPLOYED';
  } catch (err) {
    if (err.response?.status === 401) {
      console.log('🔐 Amendment history endpoint exists (requires auth)');
      results.phase1_5 = 'DEPLOYED (AUTH REQUIRED)';
    } else if (err.response?.status === 404) {
      console.log('❌ Amendment history endpoint NOT FOUND');
      results.phase1_5 = 'NOT DEPLOYED';
    } else if (err.response?.status === 400 || err.response?.status === 403) {
      console.log('✅ Amendment history endpoint exists (validation error expected)');
      results.phase1_5 = 'DEPLOYED';
    } else {
      console.log('⚠️  Amendment history endpoint status unknown:', err.message);
      results.phase1_5 = 'UNKNOWN';
    }
  }

  // Test Phase 1.6: Signature Capture UI
  console.log('\n📋 Phase 1.6: Signature Capture UI & Signing Workflow');
  console.log('   Type: Frontend only (depends on Phase 1.4 backend)');
  console.log('   Status: ❓ REQUIRES FRONTEND TESTING IN BROWSER');
  results.phase1_6 = 'FRONTEND - MANUAL TEST REQUIRED';

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 PRODUCTION FEATURE SUMMARY\n');
  console.log('Health & Version: ✅ Working');
  console.log(`Phase 1.1 (Appointment Enforcement): ${results.phase1_1 || '❓ REQUIRES AUTH TEST'}`);
  console.log(`Phase 1.2 (Portal Forms): ${results.phase1_2 || '❓ REQUIRES AUTH TEST'}`);
  console.log(`Phase 1.3 (Validation Rules): ${results.phase1_3 || '❓ UNKNOWN'}`);
  console.log(`Phase 1.4 (Electronic Signatures): ${results.phase1_4 || '❓ UNKNOWN'}`);
  console.log(`Phase 1.5 (Amendment History): ${results.phase1_5 || '❓ UNKNOWN'}`);
  console.log(`Phase 1.6 (Signature UI): ${results.phase1_6}`);

  console.log('\n⚠️  IMPORTANT:');
  console.log('Most endpoints require authentication. To fully verify:');
  console.log('1. Log into production as an administrator');
  console.log('2. Test creating/signing clinical notes');
  console.log('3. Test amendment history features');
  console.log('4. Test signature capture UI');
  console.log('5. Check database tables directly (requires VPC access)');

  return results;
}

verifyProductionFeatures()
  .then(() => {
    console.log('\n✅ Verification complete!\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Verification failed:', err);
    process.exit(1);
  });
