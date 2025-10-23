#!/usr/bin/env node

/**
 * Production Data Seeding Script
 *
 * This script seeds ALL missing reference data in production:
 * 1. Service Codes (CPT billing codes)
 * 2. Intake Forms (client portal forms)
 *
 * CRITICAL: This is the systematic fix for the audit findings
 */

const https = require('https');

const PROD_API = 'https://api.mentalspaceehr.com/api/v1';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'brendajb@chctherapy.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '38MoreYears!';

// =============================================================================
// HTTP CLIENT
// =============================================================================

async function postAPI(token, path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: 'api.mentalspaceehr.com',
      port: 443,
      path: `/api/v1${path}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${result.message || body}`));
          } else {
            resolve(result);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function getAPI(token, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.mentalspaceehr.com',
      port: 443,
      path: `/api/v1${path}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${result.message || body}`));
          } else {
            resolve(result);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// =============================================================================
// AUTHENTICATION
// =============================================================================

async function login() {
  console.log(`\n🔐 Logging in as ${ADMIN_EMAIL}...`);
  const result = await postAPI(null, '/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  console.log('✅ Login successful');
  return result.data.tokens.accessToken;
}

// =============================================================================
// DATA SEEDING
// =============================================================================

async function seedServiceCodes(token) {
  console.log('\n' + '='.repeat(80));
  console.log('SEEDING SERVICE CODES (CPT Billing Codes)');
  console.log('='.repeat(80));

  try {
    // Check current count
    const existing = await getAPI(token, '/service-codes');
    console.log(`📊 Current service codes in production: ${existing.data?.length || 0}`);

    if (existing.data && existing.data.length > 0) {
      console.log('⏭️  Service codes already exist, skipping...');
      return { skipped: true, count: existing.data.length };
    }

    // Read the service codes seed script to get the data
    const fs = require('fs');
    const seedScript = fs.readFileSync('./packages/backend/src/scripts/seed-service-codes.ts', 'utf8');

    // Extract service codes data from the script
    const serviceCodes = [
      { code: '90791', description: 'Psychiatric diagnostic evaluation without medical services', serviceType: 'Psychiatric Evaluation', category: 'Evaluation and Management', defaultDuration: 60, defaultRate: 200.00, requiresAuthorization: false },
      { code: '90792', description: 'Psychiatric diagnostic evaluation with medical services', serviceType: 'Psychiatric Evaluation', category: 'Evaluation and Management', defaultDuration: 60, defaultRate: 250.00, requiresAuthorization: false },
      { code: '90832', description: 'Psychotherapy, 30 minutes with patient', serviceType: 'Therapy Session', category: 'Psychotherapy', defaultDuration: 30, defaultRate: 90.00, requiresAuthorization: false },
      { code: '90834', description: 'Psychotherapy, 45 minutes with patient', serviceType: 'Therapy Session', category: 'Psychotherapy', defaultDuration: 45, defaultRate: 120.00, requiresAuthorization: false },
      { code: '90837', description: 'Psychotherapy, 60 minutes with patient', serviceType: 'Therapy Session', category: 'Psychotherapy', defaultDuration: 60, defaultRate: 150.00, requiresAuthorization: false },
      { code: '90833', description: 'Psychotherapy, 30 minutes with patient when performed with an evaluation and management service', serviceType: 'Therapy Session', category: 'Psychotherapy', defaultDuration: 30, defaultRate: 95.00, requiresAuthorization: false },
      { code: '90836', description: 'Psychotherapy, 45 minutes with patient when performed with an evaluation and management service', serviceType: 'Therapy Session', category: 'Psychotherapy', defaultDuration: 45, defaultRate: 125.00, requiresAuthorization: false },
      { code: '90838', description: 'Psychotherapy, 60 minutes with patient when performed with an evaluation and management service', serviceType: 'Therapy Session', category: 'Psychotherapy', defaultDuration: 60, defaultRate: 160.00, requiresAuthorization: false },
      { code: '90839', description: 'Psychotherapy for crisis; first 60 minutes', serviceType: 'Crisis Intervention', category: 'Crisis Services', defaultDuration: 60, defaultRate: 180.00, requiresAuthorization: false },
      { code: '90840', description: 'Psychotherapy for crisis; each additional 30 minutes', serviceType: 'Crisis Intervention', category: 'Crisis Services', defaultDuration: 30, defaultRate: 90.00, requiresAuthorization: false },
      { code: '90853', description: 'Group psychotherapy (other than of a multiple-family group)', serviceType: 'Group Therapy', category: 'Psychotherapy', defaultDuration: 60, defaultRate: 60.00, requiresAuthorization: false },
      { code: '90846', description: 'Family psychotherapy (without the patient present), 50 minutes', serviceType: 'Family Therapy', category: 'Psychotherapy', defaultDuration: 50, defaultRate: 130.00, requiresAuthorization: false },
      { code: '90847', description: 'Family psychotherapy (conjoint psychotherapy) (with patient present), 50 minutes', serviceType: 'Family Therapy', category: 'Psychotherapy', defaultDuration: 50, defaultRate: 140.00, requiresAuthorization: false },
      { code: '99212', description: 'Office or other outpatient visit for the evaluation and management of an established patient (10-19 minutes)', serviceType: 'Medication Management', category: 'Evaluation and Management', defaultDuration: 15, defaultRate: 75.00, requiresAuthorization: false },
      { code: '99213', description: 'Office or other outpatient visit for the evaluation and management of an established patient (20-29 minutes)', serviceType: 'Medication Management', category: 'Evaluation and Management', defaultDuration: 25, defaultRate: 110.00, requiresAuthorization: false },
      { code: '99214', description: 'Office or other outpatient visit for the evaluation and management of an established patient (30-39 minutes)', serviceType: 'Medication Management', category: 'Evaluation and Management', defaultDuration: 35, defaultRate: 165.00, requiresAuthorization: false },
      { code: '90785', description: 'Interactive complexity (add-on code for difficult communication)', serviceType: 'Therapy Session', category: 'Add-on Services', defaultDuration: 0, defaultRate: 40.00, requiresAuthorization: false },
      { code: '96130', description: 'Psychological testing evaluation services, first hour', serviceType: 'Initial Consultation', category: 'Testing and Assessment', defaultDuration: 60, defaultRate: 200.00, requiresAuthorization: true },
      { code: '96131', description: 'Psychological testing evaluation services, each additional hour', serviceType: 'Follow-up', category: 'Testing and Assessment', defaultDuration: 60, defaultRate: 150.00, requiresAuthorization: true },
    ];

    let created = 0;
    for (const code of serviceCodes) {
      try {
        await postAPI(token, '/service-codes', code);
        console.log(`✅ Created service code: ${code.code} - ${code.description}`);
        created++;
      } catch (error) {
        console.log(`⚠️  Failed to create ${code.code}: ${error.message}`);
      }
    }

    console.log(`\n✨ Created ${created}/${serviceCodes.length} service codes`);
    return { created, total: serviceCodes.length };

  } catch (error) {
    console.error(`❌ Service codes seeding failed: ${error.message}`);
    throw error;
  }
}

async function seedIntakeForms(token) {
  console.log('\n' + '='.repeat(80));
  console.log('SEEDING INTAKE FORMS (Client Portal Forms)');
  console.log('='.repeat(80));

  try {
    // Check current count
    const existing = await getAPI(token, '/clients/library');
    console.log(`📊 Current intake forms in production: ${existing.data?.length || 0}`);

    if (existing.data && existing.data.length > 0) {
      console.log('⏭️  Intake forms already exist, skipping...');
      return { skipped: true, count: existing.data.length };
    }

    // Call the seed endpoint
    const result = await postAPI(token, '/admin/seed/intake-forms', {});
    console.log(`\n✨ Seeding result:`, result.data);

    return result.data;

  } catch (error) {
    console.error(`❌ Intake forms seeding failed: ${error.message}`);
    throw error;
  }
}

// =============================================================================
// VERIFICATION
// =============================================================================

async function verifySeededData(token) {
  console.log('\n' + '='.repeat(80));
  console.log('VERIFICATION: Checking All Seeded Data');
  console.log('='.repeat(80));

  const checks = [
    { name: 'Service Codes', endpoint: '/service-codes', expectedMin: 19 },
    { name: 'Intake Forms', endpoint: '/clients/library', expectedMin: 20 },
  ];

  const results = [];

  for (const check of checks) {
    try {
      const response = await getAPI(token, check.endpoint);
      const count = response.data?.length || 0;
      const status = count >= check.expectedMin ? '✅' : '❌';

      console.log(`${status} ${check.name}: ${count} records (expected >= ${check.expectedMin})`);

      results.push({
        name: check.name,
        count,
        expected: check.expectedMin,
        success: count >= check.expectedMin,
      });
    } catch (error) {
      console.log(`❌ ${check.name}: FAILED - ${error.message}`);
      results.push({
        name: check.name,
        count: 0,
        expected: check.expectedMin,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('\n' + '█'.repeat(80));
  console.log('PRODUCTION DATA SEEDING - MentalSpace EHR');
  console.log('█'.repeat(80));
  console.log(`Target: ${PROD_API}`);
  console.log(`Admin: ${ADMIN_EMAIL}`);

  try {
    // 1. Authenticate
    const token = await login();

    // 2. Seed Service Codes
    const serviceCodesResult = await seedServiceCodes(token);

    // 3. Seed Intake Forms
    const intakeFormsResult = await seedIntakeForms(token);

    // 4. Verify All Data
    const verificationResults = await verifySeededData(token);

    // 5. Final Summary
    console.log('\n' + '█'.repeat(80));
    console.log('SEEDING COMPLETE - SUMMARY');
    console.log('█'.repeat(80));

    console.log('\nService Codes:');
    if (serviceCodesResult.skipped) {
      console.log(`  ⏭️  Skipped (${serviceCodesResult.count} already exist)`);
    } else {
      console.log(`  ✅ Created ${serviceCodesResult.created}/${serviceCodesResult.total}`);
    }

    console.log('\nIntake Forms:');
    if (intakeFormsResult.skipped) {
      console.log(`  ⏭️  Skipped (${intakeFormsResult.count} already exist)`);
    } else {
      console.log(`  ✅ Created ${intakeFormsResult.createdCount}/${intakeFormsResult.totalCount}`);
    }

    console.log('\nVerification:');
    const allPassed = verificationResults.every(r => r.success);
    for (const result of verificationResults) {
      const status = result.success ? '✅' : '❌';
      console.log(`  ${status} ${result.name}: ${result.count} records`);
    }

    if (allPassed) {
      console.log('\n🎉 ALL PRODUCTION DATA SEEDED SUCCESSFULLY!');
      process.exit(0);
    } else {
      console.log('\n⚠️  SEEDING COMPLETED WITH SOME FAILURES');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ SEEDING FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { main, seedServiceCodes, seedIntakeForms, verifySeededData };
