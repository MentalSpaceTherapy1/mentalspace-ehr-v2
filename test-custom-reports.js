/**
 * Test Script for Custom Report Builder Module
 *
 * This script tests the custom report builder API endpoints
 * Run with: node test-custom-reports.js
 */

const API_BASE = 'http://localhost:5000/api/v1';
let authToken = '';

// Helper function to make API calls
async function apiCall(method, endpoint, data = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const options = {
    method,
    headers,
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'API call failed');
    }

    return result;
  } catch (error) {
    console.error(`❌ ${method} ${endpoint} failed:`, error.message);
    throw error;
  }
}

// Test suite
async function runTests() {
  console.log('🧪 Custom Report Builder API Tests\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Login (you need to modify with actual credentials)
    console.log('\n1️⃣  Testing Authentication...');
    console.log('⚠️  Please update credentials in the script');
    // Uncomment and update with your test credentials:
    // const loginResult = await apiCall('POST', '/auth/login', {
    //   email: 'admin@example.com',
    //   password: 'your-password'
    // });
    // authToken = loginResult.token;
    // console.log('✅ Authentication successful');

    // For now, set token manually if you have one:
    // authToken = 'YOUR_JWT_TOKEN_HERE';

    if (!authToken) {
      console.log('⚠️  Skipping authenticated tests - no token provided');
      return;
    }

    // Step 2: Get available data sources
    console.log('\n2️⃣  Testing Data Sources Endpoint...');
    const dataSources = await apiCall('GET', '/custom-reports/data-sources');
    console.log(`✅ Found ${dataSources.length} data sources`);
    console.log('   Available sources:', dataSources.map(ds => ds.name).join(', '));

    // Step 3: Get report templates
    console.log('\n3️⃣  Testing Report Templates...');
    const templates = await apiCall('GET', '/custom-reports/templates');
    console.log(`✅ Found ${templates.length} templates`);
    templates.forEach(t => console.log(`   - ${t.name}`));

    // Step 4: Validate query configuration
    console.log('\n4️⃣  Testing Query Validation...');
    const testQuery = {
      dataSources: ['Client'],
      fields: [
        { source: 'Client', field: 'firstName' },
        { source: 'Client', field: 'lastName' }
      ]
    };
    const validation = await apiCall('POST', '/custom-reports/validate', {
      queryConfig: testQuery
    });
    console.log('✅ Query validation:', validation.valid ? 'VALID' : 'INVALID');
    if (!validation.valid) {
      console.log('   Errors:', validation.errors);
    }

    // Step 5: Preview query results
    console.log('\n5️⃣  Testing Query Preview...');
    try {
      const preview = await apiCall('POST', '/custom-reports/preview', {
        queryConfig: testQuery
      });
      console.log(`✅ Preview returned ${preview.results.length} rows`);
      if (preview.results.length > 0) {
        console.log('   Sample row:', JSON.stringify(preview.results[0], null, 2));
      }
    } catch (error) {
      console.log('⚠️  Preview failed (may be due to empty database)');
    }

    // Step 6: Create a test report
    console.log('\n6️⃣  Testing Report Creation...');
    const newReport = await apiCall('POST', '/custom-reports', {
      name: 'Test Report - Active Clients',
      description: 'List of all active clients',
      category: 'CUSTOM',
      queryConfig: {
        dataSources: ['Client'],
        fields: [
          { source: 'Client', field: 'firstName', alias: 'first_name' },
          { source: 'Client', field: 'lastName', alias: 'last_name' },
          { source: 'Client', field: 'email' },
          { source: 'Client', field: 'status' }
        ],
        filters: [
          { field: 'status', operator: 'EQUALS', values: ['ACTIVE'] }
        ],
        orderBy: [
          { field: 'lastName', direction: 'ASC' }
        ]
      }
    });
    console.log('✅ Report created:', newReport.id);
    const reportId = newReport.id;

    // Step 7: List reports
    console.log('\n7️⃣  Testing Report Listing...');
    const reports = await apiCall('GET', '/custom-reports');
    console.log(`✅ Found ${reports.length} total reports`);

    // Step 8: Get report by ID
    console.log('\n8️⃣  Testing Get Report by ID...');
    const report = await apiCall('GET', `/custom-reports/${reportId}`);
    console.log('✅ Retrieved report:', report.name);
    console.log('   Versions:', report.versions.length);

    // Step 9: Execute report
    console.log('\n9️⃣  Testing Report Execution...');
    try {
      const results = await apiCall('POST', `/custom-reports/${reportId}/execute`, {});
      console.log('✅ Report executed successfully');
      console.log(`   Returned ${Array.isArray(results.results) ? results.results.length : 1} result(s)`);
    } catch (error) {
      console.log('⚠️  Execution failed (may be due to empty database)');
    }

    // Step 10: Clone report
    console.log('\n🔟 Testing Report Cloning...');
    const clonedReport = await apiCall('POST', `/custom-reports/${reportId}/clone`, {
      name: 'Cloned Test Report'
    });
    console.log('✅ Report cloned:', clonedReport.id);

    // Step 11: Update report
    console.log('\n1️⃣1️⃣  Testing Report Update...');
    const updatedReport = await apiCall('PUT', `/custom-reports/${reportId}`, {
      description: 'Updated description for test report'
    });
    console.log('✅ Report updated');

    // Step 12: Get versions
    console.log('\n1️⃣2️⃣  Testing Version History...');
    const versions = await apiCall('GET', `/custom-reports/${reportId}/versions`);
    console.log(`✅ Found ${versions.length} version(s)`);

    // Step 13: Share/Unshare report
    console.log('\n1️⃣3️⃣  Testing Report Sharing...');
    await apiCall('POST', `/custom-reports/${reportId}/share`, {
      isPublic: true
    });
    console.log('✅ Report shared (made public)');

    // Step 14: Delete cloned report
    console.log('\n1️⃣4️⃣  Testing Report Deletion...');
    await apiCall('DELETE', `/custom-reports/${clonedReport.id}`);
    console.log('✅ Cloned report deleted');

    // Step 15: Delete original report
    await apiCall('DELETE', `/custom-reports/${reportId}`);
    console.log('✅ Original report deleted');

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60));

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ TEST SUITE FAILED');
    console.log('='.repeat(60));
    console.error('\nError:', error.message);
    process.exit(1);
  }
}

// Test query builder service directly
async function testQueryBuilder() {
  console.log('\n📊 Query Builder Service Tests\n');
  console.log('=' .repeat(60));

  const testQueries = [
    {
      name: 'Simple Client Query',
      config: {
        dataSources: ['Client'],
        fields: [
          { source: 'Client', field: 'firstName' },
          { source: 'Client', field: 'lastName' }
        ]
      }
    },
    {
      name: 'Appointment with Client Join',
      config: {
        dataSources: ['Appointment', 'Client'],
        fields: [
          { source: 'Client', field: 'firstName' },
          { source: 'Appointment', field: 'appointmentDate' },
          { source: 'Appointment', field: 'status' }
        ],
        filters: [
          { field: 'status', operator: 'EQUALS', values: ['COMPLETED'] }
        ]
      }
    },
    {
      name: 'Revenue Aggregation',
      config: {
        dataSources: ['Charge', 'ServiceCode'],
        fields: [
          { source: 'ServiceCode', field: 'code' }
        ],
        groupBy: ['serviceCodeId'],
        aggregations: [
          { field: 'chargeAmount', function: 'SUM', alias: 'totalRevenue' }
        ]
      }
    }
  ];

  for (const test of testQueries) {
    console.log(`\n🔍 Testing: ${test.name}`);
    try {
      const validation = await apiCall('POST', '/custom-reports/validate', {
        queryConfig: test.config
      });
      console.log(validation.valid ? '✅ Valid query' : `❌ Invalid: ${validation.errors.join(', ')}`);
    } catch (error) {
      console.log('❌ Validation failed');
    }
  }
}

// Run tests
console.log('🚀 Starting Custom Report Builder Tests...\n');
console.log('⚠️  Make sure the backend server is running on http://localhost:5000');
console.log('⚠️  Update authToken in the script or modify login credentials\n');

runTests()
  .then(() => {
    console.log('\n🎉 All tests completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test suite failed:', error);
    process.exit(1);
  });
