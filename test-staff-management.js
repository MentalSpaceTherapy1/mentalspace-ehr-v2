/**
 * Module 9: Staff Management & Onboarding Test Script
 *
 * Tests all staff management and onboarding API endpoints
 *
 * Usage:
 *   node test-staff-management.js
 *
 * Prerequisites:
 *   - Backend server running on http://localhost:3001
 *   - Valid admin user credentials
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';
let authToken = '';
let testStaffId = '';
let testChecklistId = '';

// ANSI color codes for console output
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

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

function logSection(message) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(message, 'cyan');
  log('='.repeat(60), 'cyan');
}

// Login to get auth token
async function login() {
  try {
    logSection('AUTHENTICATION');
    logInfo('Logging in as admin...');

    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@mentalspace.com',
      password: 'Admin123!',
    });

    authToken = response.data.token;
    logSuccess('Authentication successful');
    return true;
  } catch (error) {
    logError(`Login failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Helper function to make authenticated requests
async function apiRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      status: error.response?.status,
    };
  }
}

// Test 1: Create Staff Member
async function testCreateStaffMember() {
  logSection('TEST 1: Create Staff Member');

  const staffData = {
    email: `test.clinician.${Date.now()}@mentalspace.com`,
    password: 'TempPass123!',
    firstName: 'Test',
    lastName: 'Clinician',
    role: 'CLINICIAN',
    employeeId: `EMP-TEST-${Date.now()}`,
    hireDate: new Date().toISOString(),
    department: 'Clinical Services',
    jobTitle: 'Licensed Clinical Social Worker',
    workLocation: 'Main Office',
    employmentType: 'FULL_TIME',
    employmentStatus: 'ACTIVE',
    phoneNumber: '555-0123',
    licenseNumber: 'LCSW12345',
    licenseState: 'NY',
    licenseType: 'LCSW',
    npiNumber: '1234567890',
  };

  const result = await apiRequest('POST', '/staff', staffData);

  if (result.success) {
    testStaffId = result.data.data.id;
    logSuccess('Staff member created successfully');
    logInfo(`Staff ID: ${testStaffId}`);
    logInfo(`Employee ID: ${result.data.data.employeeId}`);
  } else {
    logError(`Failed to create staff member: ${result.error}`);
  }

  return result.success;
}

// Test 2: Get Staff Member by ID
async function testGetStaffMember() {
  logSection('TEST 2: Get Staff Member by ID');

  if (!testStaffId) {
    logError('No test staff ID available');
    return false;
  }

  const result = await apiRequest('GET', `/staff/${testStaffId}`);

  if (result.success) {
    logSuccess('Staff member retrieved successfully');
    logInfo(`Name: ${result.data.data.firstName} ${result.data.data.lastName}`);
    logInfo(`Department: ${result.data.data.department}`);
    logInfo(`Job Title: ${result.data.data.jobTitle}`);
  } else {
    logError(`Failed to get staff member: ${result.error}`);
  }

  return result.success;
}

// Test 3: Get All Staff Members
async function testGetAllStaff() {
  logSection('TEST 3: Get All Staff Members');

  const result = await apiRequest('GET', '/staff?limit=5');

  if (result.success) {
    logSuccess('Staff list retrieved successfully');
    logInfo(`Total staff: ${result.data.pagination.total}`);
    logInfo(`Returned: ${result.data.data.length} records`);
  } else {
    logError(`Failed to get staff list: ${result.error}`);
  }

  return result.success;
}

// Test 4: Update Staff Member
async function testUpdateStaffMember() {
  logSection('TEST 4: Update Staff Member');

  if (!testStaffId) {
    logError('No test staff ID available');
    return false;
  }

  const updateData = {
    phoneNumber: '555-9999',
    jobTitle: 'Senior Clinical Social Worker',
  };

  const result = await apiRequest('PUT', `/staff/${testStaffId}`, updateData);

  if (result.success) {
    logSuccess('Staff member updated successfully');
    logInfo(`New phone: ${result.data.data.phoneNumber}`);
    logInfo(`New title: ${result.data.data.jobTitle}`);
  } else {
    logError(`Failed to update staff member: ${result.error}`);
  }

  return result.success;
}

// Test 5: Get Staff Statistics
async function testGetStaffStatistics() {
  logSection('TEST 5: Get Staff Statistics');

  const result = await apiRequest('GET', '/staff/statistics');

  if (result.success) {
    logSuccess('Staff statistics retrieved successfully');
    logInfo(`Total staff: ${result.data.data.totalStaff}`);
    logInfo(`Active staff: ${result.data.data.activeStaff}`);
    logInfo(`Average tenure: ${result.data.data.averageTenureMonths} months`);
  } else {
    logError(`Failed to get staff statistics: ${result.error}`);
  }

  return result.success;
}

// Test 6: Create Onboarding Checklist
async function testCreateOnboardingChecklist() {
  logSection('TEST 6: Create Onboarding Checklist');

  if (!testStaffId) {
    logError('No test staff ID available');
    return false;
  }

  const checklistData = {
    userId: testStaffId,
    startDate: new Date().toISOString(),
  };

  const result = await apiRequest('POST', '/onboarding', checklistData);

  if (result.success) {
    testChecklistId = result.data.data.id;
    logSuccess('Onboarding checklist created successfully');
    logInfo(`Checklist ID: ${testChecklistId}`);
    logInfo(`Total items: ${result.data.data.items.length}`);
  } else {
    logError(`Failed to create onboarding checklist: ${result.error}`);
  }

  return result.success;
}

// Test 7: Get Onboarding Checklist
async function testGetOnboardingChecklist() {
  logSection('TEST 7: Get Onboarding Checklist');

  if (!testChecklistId) {
    logError('No test checklist ID available');
    return false;
  }

  const result = await apiRequest('GET', `/onboarding/${testChecklistId}`);

  if (result.success) {
    logSuccess('Onboarding checklist retrieved successfully');
    logInfo(`Completion: ${result.data.data.completionPercentage}%`);
    logInfo(`Items: ${result.data.data.items.length}`);
  } else {
    logError(`Failed to get onboarding checklist: ${result.error}`);
  }

  return result.success;
}

// Test 8: Update Checklist Item
async function testUpdateChecklistItem() {
  logSection('TEST 8: Update Checklist Item');

  if (!testChecklistId) {
    logError('No test checklist ID available');
    return false;
  }

  // Get the checklist first to get an item ID
  const getResult = await apiRequest('GET', `/onboarding/${testChecklistId}`);
  if (!getResult.success || !getResult.data.data.items.length) {
    logError('Could not get checklist items');
    return false;
  }

  const firstItemId = getResult.data.data.items[0].id;

  const updateData = {
    completed: true,
    notes: 'Completed during testing',
  };

  const result = await apiRequest(
    'PUT',
    `/onboarding/${testChecklistId}/items/${firstItemId}`,
    updateData
  );

  if (result.success) {
    logSuccess('Checklist item updated successfully');
    logInfo(`New completion: ${result.data.data.completionPercentage}%`);
  } else {
    logError(`Failed to update checklist item: ${result.error}`);
  }

  return result.success;
}

// Test 9: Get Onboarding Statistics
async function testGetOnboardingStatistics() {
  logSection('TEST 9: Get Onboarding Statistics');

  const result = await apiRequest('GET', '/onboarding/statistics');

  if (result.success) {
    logSuccess('Onboarding statistics retrieved successfully');
    logInfo(`Total checklists: ${result.data.data.total}`);
    logInfo(`Completed: ${result.data.data.completed}`);
    logInfo(`In progress: ${result.data.data.inProgress}`);
    logInfo(`Average completion: ${result.data.data.averageCompletion}%`);
  } else {
    logError(`Failed to get onboarding statistics: ${result.error}`);
  }

  return result.success;
}

// Test 10: Add Custom Checklist Item
async function testAddChecklistItem() {
  logSection('TEST 10: Add Custom Checklist Item');

  if (!testChecklistId) {
    logError('No test checklist ID available');
    return false;
  }

  const itemData = {
    category: 'Custom',
    task: 'Test custom task',
    description: 'This is a custom test task',
    priority: 'MEDIUM',
  };

  const result = await apiRequest('POST', `/onboarding/${testChecklistId}/items`, itemData);

  if (result.success) {
    logSuccess('Custom checklist item added successfully');
    logInfo(`Total items: ${result.data.data.items.length}`);
  } else {
    logError(`Failed to add checklist item: ${result.error}`);
  }

  return result.success;
}

// Test 11: Get Organizational Hierarchy
async function testGetOrganizationalHierarchy() {
  logSection('TEST 11: Get Organizational Hierarchy');

  const result = await apiRequest('GET', '/staff/organization/hierarchy');

  if (result.success) {
    logSuccess('Organizational hierarchy retrieved successfully');
    logInfo(`Total staff: ${result.data.data.totalStaff}`);
    logInfo(`Top-level managers: ${result.data.data.topLevelManagers.length}`);
    logInfo(`Departments: ${result.data.data.departments.length}`);
  } else {
    logError(`Failed to get organizational hierarchy: ${result.error}`);
  }

  return result.success;
}

// Test 12: Filter Staff by Department
async function testFilterStaffByDepartment() {
  logSection('TEST 12: Filter Staff by Department');

  const result = await apiRequest('GET', '/staff?department=Clinical Services&limit=5');

  if (result.success) {
    logSuccess('Staff filtered by department successfully');
    logInfo(`Results: ${result.data.data.length}`);
  } else {
    logError(`Failed to filter staff: ${result.error}`);
  }

  return result.success;
}

// Main test runner
async function runTests() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║  Module 9: Staff Management & Onboarding Test Suite      ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    logError('Cannot proceed without authentication');
    return;
  }

  const tests = [
    { name: 'Create Staff Member', fn: testCreateStaffMember },
    { name: 'Get Staff Member', fn: testGetStaffMember },
    { name: 'Get All Staff', fn: testGetAllStaff },
    { name: 'Update Staff Member', fn: testUpdateStaffMember },
    { name: 'Get Staff Statistics', fn: testGetStaffStatistics },
    { name: 'Create Onboarding Checklist', fn: testCreateOnboardingChecklist },
    { name: 'Get Onboarding Checklist', fn: testGetOnboardingChecklist },
    { name: 'Update Checklist Item', fn: testUpdateChecklistItem },
    { name: 'Get Onboarding Statistics', fn: testGetOnboardingStatistics },
    { name: 'Add Custom Checklist Item', fn: testAddChecklistItem },
    { name: 'Get Organizational Hierarchy', fn: testGetOrganizationalHierarchy },
    { name: 'Filter Staff by Department', fn: testFilterStaffByDepartment },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      logError(`Test "${test.name}" threw an error: ${error.message}`);
      failed++;
    }
  }

  // Summary
  logSection('TEST SUMMARY');
  log(`Total tests: ${tests.length}`, 'blue');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, 'red');
  log(`Success rate: ${((passed / tests.length) * 100).toFixed(1)}%`, 'yellow');

  if (failed === 0) {
    log('\n🎉 All tests passed! Staff Management & Onboarding is working correctly.', 'green');
  } else {
    log(
      '\n⚠️  Some tests failed. Please review the errors above and fix the issues.',
      'yellow'
    );
  }
}

// Run the tests
runTests().catch((error) => {
  logError(`Fatal error: ${error.message}`);
  process.exit(1);
});
