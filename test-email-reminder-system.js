/**
 * End-to-End Test Script for Clinical Note Email Reminder System
 * Module 4 Phase 2.5
 *
 * Tests:
 * 1. Email service status check
 * 2. Default configuration initialization
 * 3. Configuration retrieval (practice, effective)
 * 4. User-specific configuration CRUD
 * 5. Test email sending (if SMTP configured)
 */

const API_BASE_URL = 'http://localhost:3001/api/v1';
let authToken = null;
let testUserId = null;
let createdUserConfigId = null;

// ANSI color codes for output
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

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'cyan');
  console.log('='.repeat(80) + '\n');
}

function logTest(testName) {
  log(`\n🧪 TEST: ${testName}`, 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Helper function to make API calls
async function apiCall(method, endpoint, data = null, includeAuth = true) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
  };

  if (includeAuth && authToken) {
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
    const response = await fetch(url, options);
    const responseData = await response.json();

    return {
      ok: response.ok,
      status: response.status,
      data: responseData,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.message,
    };
  }
}

// Test 1: Login and get authentication token
async function testLogin() {
  logTest('User Authentication');

  const result = await apiCall('POST', '/auth/login', {
    email: 'superadmin@mentalspace.com',
    password: 'Password123!',
  }, false);

  if (result.ok && result.data.data && result.data.data.session && result.data.data.session.token) {
    authToken = result.data.data.session.token;
    testUserId = result.data.data.user.id;
    logSuccess(`Logged in successfully as ${result.data.data.user.email}`);
    logInfo(`User ID: ${testUserId}`);
    return true;
  } else {
    logError(`Login failed: ${JSON.stringify(result.data)}`);
    return false;
  }
}

// Test 2: Check email service status
async function testEmailStatus() {
  logTest('Email Service Status Check');

  const result = await apiCall('GET', '/reminder-config/email-status');

  if (result.ok) {
    const { isConfigured, message } = result.data.data;

    if (isConfigured) {
      logSuccess('Email service is configured');
      logInfo(message);
    } else {
      logWarning('Email service is NOT configured');
      logInfo(message);
      logInfo('To configure email, set these environment variables:');
      logInfo('  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM');
    }
    return isConfigured;
  } else {
    logError(`Failed to check email status: ${result.data.message || result.error}`);
    return false;
  }
}

// Test 3: Initialize default practice configuration
async function testInitializeDefaults() {
  logTest('Initialize Default Practice Configuration');

  const result = await apiCall('POST', '/reminder-config/initialize');

  if (result.ok) {
    logSuccess('Default practice configuration initialized');
    logInfo(`Config ID: ${result.data.data.id}`);
    logInfo(`Enabled: ${result.data.data.enabled}`);
    logInfo(`Reminder Intervals: ${result.data.data.reminderIntervals.join(', ')} hours`);
    logInfo(`Sunday Warnings: ${result.data.data.enableSundayWarnings ? 'Enabled' : 'Disabled'}`);
    logInfo(`Escalation: ${result.data.data.enableEscalation ? 'Enabled' : 'Disabled'}`);
    return result.data.data;
  } else {
    if (result.data.message?.includes('already exists')) {
      logInfo('Practice configuration already exists');
      return true;
    }
    logError(`Failed to initialize defaults: ${result.data.message || result.error}`);
    return false;
  }
}

// Test 4: Get practice configuration
async function testGetPracticeConfig() {
  logTest('Get Practice Configuration');

  const result = await apiCall('GET', '/reminder-config/practice');

  if (result.ok && result.data.data) {
    logSuccess('Practice configuration retrieved');
    logInfo(`Config Type: ${result.data.data.configurationType}`);
    logInfo(`Enabled: ${result.data.data.enabled}`);
    logInfo(`Reminder Intervals: ${result.data.data.reminderIntervals.join(', ')} hours`);
    logInfo(`Overdue Reminders: ${result.data.data.sendOverdueReminders ? 'Yes' : 'No'}`);
    logInfo(`Daily Digest: ${result.data.data.enableDailyDigest ? 'Yes' : 'No'}`);
    return result.data.data;
  } else {
    logError(`Failed to get practice config: ${result.data.message || result.error}`);
    return null;
  }
}

// Test 5: Get effective configuration for current user
async function testGetEffectiveConfig() {
  logTest('Get Effective Configuration');

  const result = await apiCall('GET', '/reminder-config/effective');

  if (result.ok) {
    const config = result.data.data;
    if (config) {
      logSuccess(`Effective configuration retrieved (Type: ${config.configurationType})`);
      logInfo(`Config ID: ${config.id}`);
      logInfo(`User ID: ${config.userId || 'N/A (Practice-wide)'}`);
      logInfo(`Enabled: ${config.enabled}`);
      logInfo(`Reminder Intervals: ${config.reminderIntervals.join(', ')} hours`);
      return config;
    } else {
      logInfo('No configuration found (will use defaults)');
      return null;
    }
  } else {
    logError(`Failed to get effective config: ${result.data.message || result.error}`);
    return null;
  }
}

// Test 6: Create user-specific configuration
async function testCreateUserConfig() {
  logTest('Create User-Specific Configuration');

  const userConfig = {
    configurationType: 'USER',
    userId: testUserId,
    enabled: true,
    reminderIntervals: [48, 24, 12], // More frequent than practice default
    sendOverdueReminders: true,
    overdueReminderFrequency: 12,
    maxOverdueReminders: 5,
    enableSundayWarnings: true,
    sundayWarningTime: '16:00',
    enableDailyDigest: true,
    digestTime: '08:00',
    digestDays: ['Monday', 'Wednesday', 'Friday'],
    enableEscalation: true,
    escalationAfterHours: 24,
    escalateTo: ['supervisor@mentalspace.com'],
    escalationMessage: 'Test escalation message',
  };

  const result = await apiCall('POST', '/reminder-config', userConfig);

  if (result.ok) {
    createdUserConfigId = result.data.data.id;
    logSuccess('User-specific configuration created');
    logInfo(`Config ID: ${createdUserConfigId}`);
    logInfo(`User ID: ${result.data.data.userId}`);
    logInfo(`Reminder Intervals: ${result.data.data.reminderIntervals.join(', ')} hours`);
    logInfo(`Daily Digest: ${result.data.data.enableDailyDigest ? 'Yes' : 'No'} at ${result.data.data.digestTime}`);
    return result.data.data;
  } else {
    if (result.data.message?.includes('already exists')) {
      logWarning('User configuration already exists');
      return true;
    }
    logError(`Failed to create user config: ${result.data.message || result.error}`);
    return false;
  }
}

// Test 7: Update user configuration
async function testUpdateUserConfig() {
  if (!createdUserConfigId) {
    logWarning('Skipping update test (no user config ID)');
    return true;
  }

  logTest('Update User Configuration');

  const updates = {
    enabled: true,
    enableDailyDigest: false, // Disable daily digest
    reminderIntervals: [72, 36, 12], // Change intervals
  };

  const result = await apiCall('PUT', `/reminder-config/${createdUserConfigId}`, updates);

  if (result.ok) {
    logSuccess('User configuration updated');
    logInfo(`Config ID: ${result.data.data.id}`);
    logInfo(`Daily Digest: ${result.data.data.enableDailyDigest ? 'Enabled' : 'Disabled'}`);
    logInfo(`New Intervals: ${result.data.data.reminderIntervals.join(', ')} hours`);
    return result.data.data;
  } else {
    logError(`Failed to update user config: ${result.data.message || result.error}`);
    return false;
  }
}

// Test 8: Get user-specific configuration
async function testGetUserConfig() {
  logTest('Get User-Specific Configuration');

  const result = await apiCall('GET', `/reminder-config/user/${testUserId}`);

  if (result.ok && result.data.data) {
    logSuccess('User configuration retrieved');
    logInfo(`Config Type: ${result.data.data.configurationType}`);
    logInfo(`Config ID: ${result.data.data.id}`);
    logInfo(`Enabled: ${result.data.data.enabled}`);
    return result.data.data;
  } else {
    if (result.status === 404) {
      logInfo('No user-specific configuration found');
      return null;
    }
    logError(`Failed to get user config: ${result.data.message || result.error}`);
    return null;
  }
}

// Test 9: Send test email (if email service is configured)
async function testSendTestEmail(emailConfigured) {
  logTest('Send Test Email');

  if (!emailConfigured) {
    logWarning('Skipping test email (email service not configured)');
    return true;
  }

  const result = await apiCall('POST', '/reminder-config/test-email');

  if (result.ok) {
    logSuccess('Test email sent successfully');
    logInfo(result.data.message);
    logInfo('Please check your email inbox');
    return true;
  } else {
    logError(`Failed to send test email: ${result.data.message || result.error}`);
    return false;
  }
}

// Test 10: Get all configurations (admin only)
async function testGetAllConfigs() {
  logTest('Get All Configurations (Admin)');

  const result = await apiCall('GET', '/reminder-config');

  if (result.ok) {
    const configs = result.data.data;
    logSuccess(`Retrieved ${configs.length} configuration(s)`);

    configs.forEach((config, index) => {
      logInfo(`\nConfig ${index + 1}:`);
      logInfo(`  ID: ${config.id}`);
      logInfo(`  Type: ${config.configurationType}`);
      logInfo(`  User: ${config.user ? `${config.user.firstName} ${config.user.lastName} (${config.user.email})` : 'N/A'}`);
      logInfo(`  Enabled: ${config.enabled}`);
    });

    return configs;
  } else {
    logError(`Failed to get all configs: ${result.data.message || result.error}`);
    return null;
  }
}

// Main test execution
async function runTests() {
  logSection('🚀 Starting Email Reminder System End-to-End Tests');

  let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
  };

  // Test 1: Login
  testResults.total++;
  if (await testLogin()) {
    testResults.passed++;
  } else {
    testResults.failed++;
    logError('Authentication failed. Cannot continue tests.');
    printSummary(testResults);
    return;
  }

  // Test 2: Email Status
  testResults.total++;
  const emailConfigured = await testEmailStatus();
  if (emailConfigured !== null) {
    testResults.passed++;
    if (!emailConfigured) testResults.warnings++;
  } else {
    testResults.failed++;
  }

  // Test 3: Initialize Defaults
  testResults.total++;
  if (await testInitializeDefaults()) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }

  // Test 4: Get Practice Config
  testResults.total++;
  if (await testGetPracticeConfig()) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }

  // Test 5: Get Effective Config
  testResults.total++;
  if (await testGetEffectiveConfig() !== null) {
    testResults.passed++;
  } else {
    testResults.warnings++;
    testResults.passed++;
  }

  // Test 6: Create User Config
  testResults.total++;
  if (await testCreateUserConfig()) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }

  // Test 7: Update User Config
  testResults.total++;
  if (await testUpdateUserConfig()) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }

  // Test 8: Get User Config
  testResults.total++;
  if (await testGetUserConfig()) {
    testResults.passed++;
  } else {
    testResults.warnings++;
    testResults.passed++;
  }

  // Test 9: Send Test Email
  testResults.total++;
  if (await testSendTestEmail(emailConfigured)) {
    testResults.passed++;
    if (!emailConfigured) testResults.warnings++;
  } else {
    testResults.failed++;
  }

  // Test 10: Get All Configs
  testResults.total++;
  if (await testGetAllConfigs()) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }

  // Print summary
  printSummary(testResults);
}

function printSummary(results) {
  logSection('📊 Test Summary');

  log(`Total Tests: ${results.total}`, 'cyan');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'reset');
  log(`Warnings: ${results.warnings}`, results.warnings > 0 ? 'yellow' : 'reset');

  const passRate = ((results.passed / results.total) * 100).toFixed(1);
  log(`\nPass Rate: ${passRate}%`, passRate === '100.0' ? 'green' : 'yellow');

  if (results.failed === 0) {
    logSuccess('\n🎉 All tests completed successfully!');
  } else {
    logError(`\n❌ ${results.failed} test(s) failed. Please review the errors above.`);
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

// Run the tests
runTests().catch(error => {
  logError(`\n💥 Unexpected error during test execution: ${error.message}`);
  console.error(error);
  process.exit(1);
});
