/**
 * Module 9 Reports Testing Script
 * Tests all 10 Module 9 report endpoints
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.API_URL || 'http://localhost:3001/api/v1';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

// Test configuration
const config = {
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  }
};

// Utility function to make API requests
async function testEndpoint(name, endpoint, params = {}) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${name}`);
  console.log(`Endpoint: GET ${endpoint}`);
  console.log(`Params:`, params);
  console.log('='.repeat(60));

  try {
    const response = await axios.get(
      `${BASE_URL}${endpoint}`,
      {
        ...config,
        params
      }
    );

    console.log('✓ SUCCESS');
    console.log('Status:', response.status);
    console.log('Data structure:', Object.keys(response.data));

    if (response.data.data) {
      console.log('Summary keys:', Object.keys(response.data.data.summary || {}));

      // Count records
      const recordsField = Object.keys(response.data.data).find(key =>
        Array.isArray(response.data.data[key]) && key !== 'period'
      );
      if (recordsField) {
        console.log(`Records (${recordsField}):`, response.data.data[recordsField].length);
      }
    }

    return {
      success: true,
      name,
      endpoint,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    console.log('✗ FAILED');
    console.error('Error:', error.response?.data || error.message);

    return {
      success: false,
      name,
      endpoint,
      error: error.response?.data || error.message
    };
  }
}

// Main test function
async function runTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         MODULE 9 REPORTS TESTING SUITE                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  if (!AUTH_TOKEN) {
    console.error('ERROR: AUTH_TOKEN environment variable not set');
    console.log('\nUsage:');
    console.log('  AUTH_TOKEN=your_token_here node test-reports.js');
    console.log('\nOr set environment variables:');
    console.log('  export API_URL=http://localhost:3001/api');
    console.log('  export AUTH_TOKEN=your_token_here');
    process.exit(1);
  }

  const results = [];

  // Test 1: Credentialing Report
  results.push(await testEndpoint(
    'Credentialing Report',
    '/reports/module9/credentialing',
    {
      includeExpiringSoon: true,
      daysUntilExpiration: 90
    }
  ));

  // Test 2: Training Compliance Report
  results.push(await testEndpoint(
    'Training Compliance Report',
    '/reports/module9/training-compliance',
    {
      includeExpired: true
    }
  ));

  // Test 3: Policy Compliance Report
  results.push(await testEndpoint(
    'Policy Compliance Report',
    '/reports/module9/policy-compliance',
    {}
  ));

  // Test 4: Incident Analysis Report
  results.push(await testEndpoint(
    'Incident Analysis Report',
    '/reports/module9/incident-analysis',
    {
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    }
  ));

  // Test 5: Performance Report
  results.push(await testEndpoint(
    'Performance Report',
    '/reports/module9/performance',
    {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    }
  ));

  // Test 6: Attendance Report
  results.push(await testEndpoint(
    'Attendance Report',
    '/reports/module9/attendance',
    {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    }
  ));

  // Test 7: Financial Report
  results.push(await testEndpoint(
    'Financial Report',
    '/reports/module9/financial',
    {
      startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    }
  ));

  // Test 8: Vendor Report
  results.push(await testEndpoint(
    'Vendor Report',
    '/reports/module9/vendor',
    {
      includePerformance: true
    }
  ));

  // Test 9: Practice Management Dashboard
  results.push(await testEndpoint(
    'Practice Management Dashboard',
    '/reports/module9/practice-management',
    {
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    }
  ));

  // Test 10: Audit Trail Report
  results.push(await testEndpoint(
    'Audit Trail Report',
    '/reports/module9/audit-trail',
    {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    }
  ));

  // Summary
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✓ Passed: ${passed}`);
  console.log(`✗ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  console.log('\n');

  // Failed tests details
  if (failed > 0) {
    console.log('Failed Tests:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`  - ${result.name}`);
      console.log(`    Endpoint: ${result.endpoint}`);
      console.log(`    Error: ${JSON.stringify(result.error, null, 2)}`);
    });
    console.log('\n');
  }

  // Save results to file
  const resultsFile = path.join(__dirname, 'test-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed,
      failed,
      successRate: ((passed / results.length) * 100).toFixed(1) + '%'
    },
    results
  }, null, 2));

  console.log(`Results saved to: ${resultsFile}`);
  console.log('\n');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
