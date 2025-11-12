const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';
let authToken = '';
let userId = '';

/**
 * Test Module 9 - Credentialing & Licensing System
 *
 * This script tests all credentialing endpoints including:
 * - Creating credentials
 * - Verifying credentials
 * - Running OIG/SAM screening
 * - Checking expiring credentials
 * - Compliance checking
 * - Document management
 */

async function testCredentialing() {
  console.log('\n=================================================');
  console.log('🧪 Testing Module 9 - Credentialing System');
  console.log('=================================================\n');

  try {
    // ============================================================================
    // STEP 1: LOGIN AS ADMIN
    // ============================================================================
    console.log('📝 STEP 1: Logging in as admin...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@mentalspace.com',
      password: 'Admin123!',
    });
    authToken = loginRes.data.token;
    userId = loginRes.data.user.id;
    console.log('✅ Login successful');
    console.log(`   User ID: ${userId}\n`);

    // ============================================================================
    // STEP 2: CREATE STATE LICENSE CREDENTIAL
    // ============================================================================
    console.log('📝 STEP 2: Creating state license credential...');
    const licenseRes = await axios.post(
      `${BASE_URL}/credentialing`,
      {
        userId: userId,
        credentialType: 'STATE_LICENSE',
        credentialNumber: 'PSY123456',
        issuingAuthority: 'California Board of Psychology',
        issuingState: 'CA',
        issueDate: '2023-01-15',
        expirationDate: '2025-01-15',
        ceuRequirements: 36,
        scope: 'Clinical Psychology - All Ages',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    const licenseId = licenseRes.data.data.id;
    console.log('✅ State license created');
    console.log(`   License ID: ${licenseId}`);
    console.log(`   Number: ${licenseRes.data.data.credentialNumber}`);
    console.log(`   Expires: ${licenseRes.data.data.expirationDate}\n`);

    // ============================================================================
    // STEP 3: CREATE DEA LICENSE CREDENTIAL
    // ============================================================================
    console.log('📝 STEP 3: Creating DEA license credential...');
    const deaRes = await axios.post(
      `${BASE_URL}/credentialing`,
      {
        userId: userId,
        credentialType: 'DEA_LICENSE',
        credentialNumber: 'BD1234563',
        issuingAuthority: 'Drug Enforcement Administration',
        issueDate: '2022-06-01',
        expirationDate: '2025-06-01',
        restrictions: 'Schedule II-V controlled substances',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    const deaId = deaRes.data.data.id;
    console.log('✅ DEA license created');
    console.log(`   DEA ID: ${deaId}`);
    console.log(`   Number: ${deaRes.data.data.credentialNumber}\n`);

    // ============================================================================
    // STEP 4: CREATE BOARD CERTIFICATION
    // ============================================================================
    console.log('📝 STEP 4: Creating board certification...');
    const boardRes = await axios.post(
      `${BASE_URL}/credentialing`,
      {
        userId: userId,
        credentialType: 'BOARD_CERTIFICATION',
        credentialNumber: 'ABPP-12345',
        issuingAuthority: 'American Board of Professional Psychology',
        issueDate: '2020-03-15',
        expirationDate: '2030-03-15',
        scope: 'Clinical Psychology',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    const boardId = boardRes.data.data.id;
    console.log('✅ Board certification created');
    console.log(`   Cert ID: ${boardId}`);
    console.log(`   Number: ${boardRes.data.data.credentialNumber}\n`);

    // ============================================================================
    // STEP 5: GET USER CREDENTIALS
    // ============================================================================
    console.log('📝 STEP 5: Fetching user credentials...');
    const userCredsRes = await axios.get(`${BASE_URL}/credentialing/user/${userId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    console.log(`✅ Found ${userCredsRes.data.count} credential(s)`);
    userCredsRes.data.data.forEach((cred, index) => {
      console.log(`   ${index + 1}. ${cred.credentialType} - ${cred.credentialNumber}`);
    });
    console.log('');

    // ============================================================================
    // STEP 6: VERIFY STATE LICENSE
    // ============================================================================
    console.log('📝 STEP 6: Verifying state license...');
    const verifyRes = await axios.post(
      `${BASE_URL}/credentialing/${licenseId}/verify`,
      {
        verificationStatus: 'VERIFIED',
        verificationMethod: 'Primary Source Verification - CA Board Website',
        verificationNotes: 'Verified active status on 01/15/2025',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    console.log('✅ Credential verified');
    console.log(`   Status: ${verifyRes.data.data.verificationStatus}`);
    console.log(`   Method: ${verifyRes.data.data.verificationMethod}\n`);

    // ============================================================================
    // STEP 7: RUN OIG/SAM SCREENING
    // ============================================================================
    console.log('📝 STEP 7: Running OIG/SAM screening...');
    const screeningRes = await axios.post(
      `${BASE_URL}/credentialing/${licenseId}/screening`,
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    console.log('✅ Screening completed');
    console.log(`   Status: ${screeningRes.data.data.screeningStatus}`);
    console.log(`   Date: ${screeningRes.data.data.lastScreeningDate}`);
    console.log(`   Notes: ${screeningRes.data.data.screeningNotes}\n`);

    // ============================================================================
    // STEP 8: GET EXPIRING CREDENTIALS (90 DAYS)
    // ============================================================================
    console.log('📝 STEP 8: Checking for expiring credentials (next 90 days)...');
    const expiringRes = await axios.get(`${BASE_URL}/credentialing/expiring?days=90`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    console.log(`✅ Found ${expiringRes.data.count} expiring credential(s)`);
    if (expiringRes.data.count > 0) {
      expiringRes.data.data.forEach((alert, index) => {
        console.log(`   ${index + 1}. ${alert.credentialType} - ${alert.daysUntilExpiration} days (${alert.alertLevel})`);
      });
    }
    console.log('');

    // ============================================================================
    // STEP 9: GET CREDENTIAL ALERTS
    // ============================================================================
    console.log('📝 STEP 9: Fetching credential alerts...');
    const alertsRes = await axios.get(`${BASE_URL}/credentialing/alerts`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    console.log(`✅ Found ${alertsRes.data.count} active alert(s)`);
    console.log(`   Total alerts (all levels): ${alertsRes.data.allAlerts}\n`);

    // ============================================================================
    // STEP 10: ADD DOCUMENT TO CREDENTIAL
    // ============================================================================
    console.log('📝 STEP 10: Adding document to credential...');
    const docRes = await axios.post(
      `${BASE_URL}/credentialing/${licenseId}/documents`,
      {
        documentUrl: 'https://storage.example.com/credentials/license-psy123456.pdf',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    console.log('✅ Document added');
    console.log(`   Documents count: ${docRes.data.data.documents.length}\n`);

    // ============================================================================
    // STEP 11: CHECK USER COMPLIANCE
    // ============================================================================
    console.log('📝 STEP 11: Checking user compliance...');
    const complianceRes = await axios.get(`${BASE_URL}/credentialing/compliance/${userId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    console.log(`✅ Compliance check completed`);
    console.log(`   Compliant: ${complianceRes.data.data.isCompliant}`);
    console.log(`   Issues: ${complianceRes.data.data.issues.length}`);
    if (complianceRes.data.data.issues.length > 0) {
      complianceRes.data.data.issues.forEach((issue, index) => {
        console.log(`     ${index + 1}. ${issue}`);
      });
    }
    console.log('');

    // ============================================================================
    // STEP 12: GENERATE CREDENTIALING REPORT
    // ============================================================================
    console.log('📝 STEP 12: Generating credentialing report...');
    const reportRes = await axios.get(`${BASE_URL}/credentialing/report`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    console.log('✅ Report generated');
    console.log('   Summary:');
    console.log(`     Total: ${reportRes.data.data.summary.total}`);
    console.log(`     Verified: ${reportRes.data.data.summary.verified}`);
    console.log(`     Pending: ${reportRes.data.data.summary.pending}`);
    console.log(`     Expired: ${reportRes.data.data.summary.expired}`);
    console.log(`     Expiring (30 days): ${reportRes.data.data.summary.expiringWithin30Days}`);
    console.log(`     Expiring (60 days): ${reportRes.data.data.summary.expiringWithin60Days}`);
    console.log(`     Expiring (90 days): ${reportRes.data.data.summary.expiringWithin90Days}`);
    console.log(`     Screening Flagged: ${reportRes.data.data.summary.screeningFlagged}\n`);

    // ============================================================================
    // STEP 13: UPDATE CREDENTIAL
    // ============================================================================
    console.log('📝 STEP 13: Updating credential...');
    const updateRes = await axios.put(
      `${BASE_URL}/credentialing/${licenseId}`,
      {
        ceuRequirements: 40,
        scope: 'Clinical Psychology - Adults and Adolescents',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    console.log('✅ Credential updated');
    console.log(`   CEU Requirements: ${updateRes.data.data.ceuRequirements}`);
    console.log(`   Scope: ${updateRes.data.data.scope}\n`);

    // ============================================================================
    // STEP 14: GET CREDENTIAL BY ID
    // ============================================================================
    console.log('📝 STEP 14: Fetching credential by ID...');
    const getRes = await axios.get(`${BASE_URL}/credentialing/${licenseId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    console.log('✅ Credential retrieved');
    console.log(`   Type: ${getRes.data.data.credentialType}`);
    console.log(`   Number: ${getRes.data.data.credentialNumber}`);
    console.log(`   Status: ${getRes.data.data.verificationStatus}`);
    console.log(`   User: ${getRes.data.data.user.firstName} ${getRes.data.data.user.lastName}\n`);

    // ============================================================================
    // STEP 15: INITIATE RENEWAL
    // ============================================================================
    console.log('📝 STEP 15: Initiating credential renewal...');
    const renewalRes = await axios.post(
      `${BASE_URL}/credentialing/${licenseId}/renewal`,
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    console.log('✅ Renewal initiated');
    console.log(`   Renewal Date: ${renewalRes.data.data.renewalDate}\n`);

    // ============================================================================
    // SUMMARY
    // ============================================================================
    console.log('\n=================================================');
    console.log('✅ ALL CREDENTIALING TESTS PASSED!');
    console.log('=================================================');
    console.log('\nTested Features:');
    console.log('  ✅ Create credentials (State License, DEA, Board Cert)');
    console.log('  ✅ Get user credentials');
    console.log('  ✅ Verify credential with primary source');
    console.log('  ✅ Run OIG/SAM screening');
    console.log('  ✅ Check expiring credentials');
    console.log('  ✅ Get credential alerts');
    console.log('  ✅ Add documents to credentials');
    console.log('  ✅ Check user compliance');
    console.log('  ✅ Generate credentialing report');
    console.log('  ✅ Update credential');
    console.log('  ✅ Get credential by ID');
    console.log('  ✅ Initiate renewal process');
    console.log('\n=================================================\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED\n');
    if (error.response) {
      console.error('Response Error:');
      console.error('  Status:', error.response.status);
      console.error('  Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('Request Error:');
      console.error('  No response received from server');
      console.error('  Make sure the backend is running on', BASE_URL);
    } else {
      console.error('Error:', error.message);
    }
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run the tests
testCredentialing();
