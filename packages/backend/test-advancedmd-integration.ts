/**
 * AdvancedMD Integration Test Script
 *
 * This script tests the Phase 1 implementation:
 * 1. Authentication Service
 * 2. Rate Limiter Service
 * 3. API Client
 *
 * IMPORTANT: Environment variables must be loaded BEFORE importing services
 */

// Load environment variables FIRST (before any imports)
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Verify critical env vars are loaded
if (!process.env.ADVANCEDMD_ENCRYPTION_KEY) {
  console.error('❌ Error: ADVANCEDMD_ENCRYPTION_KEY not found in environment');
  console.error('   Make sure .env file exists at:', path.resolve(__dirname, '.env'));
  process.exit(1);
}

// Now safe to import services
import { AdvancedMDAuthService } from './src/integrations/advancedmd/auth.service';
import { AdvancedMDRateLimiterService } from './src/integrations/advancedmd/rate-limiter.service';
import { AdvancedMDAPIClient } from './src/integrations/advancedmd/api-client';

// Test colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function testAuthentication() {
  section('TEST 1: Authentication Service');

  try {
    const authService = new AdvancedMDAuthService();

    log('  Initializing authentication service...', 'gray');
    await authService.initialize();
    log('  ✅ Authentication service initialized', 'green');

    log('  Getting session token...', 'gray');
    const token = await authService.getToken();
    log(`  ✅ Token received: ${token.substring(0, 20)}...`, 'green');

    log('  Getting session info...', 'gray');
    const sessionInfo = authService.getSessionInfo();
    log(`  ✅ Token expires in: ${sessionInfo.tokenExpiresIn} minutes`, 'green');
    log(`  ✅ Token refreshed: ${sessionInfo.isTokenExpiringSoon ? 'Yes (expiring soon)' : 'No'}`, 'green');

    log('  Getting redirect URLs...', 'gray');
    const xmlrpcURL = await authService.getRedirectURL('XMLRPC');
    const restpmURL = await authService.getRedirectURL('REST_PM');
    log(`  ✅ XMLRPC URL: ${xmlrpcURL}`, 'green');
    log(`  ✅ RESTPM URL: ${restpmURL}`, 'green');

    log('\n✅ Authentication Test: PASSED', 'green');
    return true;
  } catch (error: any) {
    log(`\n❌ Authentication Test: FAILED`, 'red');
    log(`   Error: ${error.message}`, 'red');
    if (error.stack) {
      log(`   Stack: ${error.stack}`, 'gray');
    }
    return false;
  }
}

async function testRateLimiter() {
  section('TEST 2: Rate Limiter Service');

  try {
    const rateLimiter = new AdvancedMDRateLimiterService();

    // Test Tier 1 endpoint
    log('  Testing Tier 1 endpoint (GETUPDATEDPATIENTS)...', 'gray');
    await rateLimiter.checkRateLimit('GETUPDATEDPATIENTS');
    log('  ✅ Rate limit check passed (Tier 1)', 'green');

    const tier1Status = await rateLimiter.getRateLimitStatus('GETUPDATEDPATIENTS');
    log(`  ✅ Tier 1 Status:`, 'green');
    log(`     - Tier: ${tier1Status.tier}`, 'gray');
    log(`     - Peak hours: ${tier1Status.isPeakHours}`, 'gray');
    log(`     - Current limit: ${tier1Status.currentLimit} calls/min`, 'gray');
    log(`     - Remaining: ${tier1Status.remainingCalls}`, 'gray');
    log(`     - Backing off: ${tier1Status.isBackingOff}`, 'gray');

    // Test Tier 2 endpoint
    log('\n  Testing Tier 2 endpoint (SAVECHARGES)...', 'gray');
    await rateLimiter.checkRateLimit('SAVECHARGES');
    log('  ✅ Rate limit check passed (Tier 2)', 'green');

    const tier2Status = await rateLimiter.getRateLimitStatus('SAVECHARGES');
    log(`  ✅ Tier 2 Status:`, 'green');
    log(`     - Tier: ${tier2Status.tier}`, 'gray');
    log(`     - Current limit: ${tier2Status.currentLimit} calls/min`, 'gray');
    log(`     - Remaining: ${tier2Status.remainingCalls}`, 'gray');

    // Test Tier 3 endpoint
    log('\n  Testing Tier 3 endpoint (LOOKUPPATIENT)...', 'gray');
    await rateLimiter.checkRateLimit('LOOKUPPATIENT');
    log('  ✅ Rate limit check passed (Tier 3)', 'green');

    const tier3Status = await rateLimiter.getRateLimitStatus('LOOKUPPATIENT');
    log(`  ✅ Tier 3 Status:`, 'green');
    log(`     - Tier: ${tier3Status.tier}`, 'gray');
    log(`     - Current limit: ${tier3Status.currentLimit} calls/min`, 'gray');
    log(`     - Remaining: ${tier3Status.remainingCalls}`, 'gray');

    // Record success
    log('\n  Recording success for tier tracking...', 'gray');
    await rateLimiter.recordSuccess('GETUPDATEDPATIENTS');
    await rateLimiter.recordSuccess('SAVECHARGES');
    await rateLimiter.recordSuccess('LOOKUPPATIENT');
    log('  ✅ Success recorded for all tiers', 'green');

    log('\n✅ Rate Limiter Test: PASSED', 'green');
    return true;
  } catch (error: any) {
    log(`\n❌ Rate Limiter Test: FAILED`, 'red');
    log(`   Error: ${error.message}`, 'red');
    if (error.stack) {
      log(`   Stack: ${error.stack}`, 'gray');
    }
    return false;
  }
}

async function testAPIClient() {
  section('TEST 3: API Client');

  try {
    const apiClient = new AdvancedMDAPIClient();

    // Test 1: Simple lookup request (read-only, safe to test)
    log('  Testing LOOKUPPROFILE endpoint...', 'gray');
    const response1 = await apiClient.execute({
      endpoint: 'LOOKUPPROFILE',
      action: 'lookupprofile',
      data: {
        '@lastname': 'Admin',
      },
    });

    if (response1.success) {
      log('  ✅ LOOKUPPROFILE request successful', 'green');
      log(`     Response: ${JSON.stringify(response1.data).substring(0, 100)}...`, 'gray');
      if (response1.syncLogId) {
        log(`     Sync log ID: ${response1.syncLogId}`, 'gray');
      }
    } else {
      log('  ⚠️  LOOKUPPROFILE request returned error (may be expected)', 'yellow');
      log(`     Error: ${response1.error?.message}`, 'yellow');
    }

    // Test 2: Get sync statistics
    log('\n  Getting sync statistics...', 'gray');
    const stats = await apiClient.getSyncStats(24);
    log('  ✅ Sync statistics retrieved:', 'green');
    log(`     - Total operations: ${stats.total}`, 'gray');
    log(`     - Success: ${stats.success}`, 'gray');
    log(`     - Errors: ${stats.error}`, 'gray');
    log(`     - Pending: ${stats.pending}`, 'gray');
    log(`     - Success rate: ${stats.successRate.toFixed(1)}%`, 'gray');
    if (stats.avgDurationMs) {
      log(`     - Avg duration: ${stats.avgDurationMs.toFixed(0)}ms`, 'gray');
    }

    // Test 3: Get recent sync logs
    log('\n  Getting recent sync logs...', 'gray');
    const logs = await apiClient.getRecentSyncLogs({
      limit: 5,
    });
    log(`  ✅ Retrieved ${logs.length} sync log entries`, 'green');
    if (logs.length > 0) {
      log('     Recent logs:', 'gray');
      logs.forEach((logEntry, index) => {
        log(`     ${index + 1}. ${logEntry.syncType} ${logEntry.direction} - ${logEntry.status} (${logEntry.durationMs}ms)`, 'gray');
      });
    }

    log('\n✅ API Client Test: PASSED', 'green');
    return true;
  } catch (error: any) {
    log(`\n❌ API Client Test: FAILED`, 'red');
    log(`   Error: ${error.message}`, 'red');
    if (error.stack) {
      log(`   Stack: ${error.stack}`, 'gray');
    }
    return false;
  }
}

async function runAllTests() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     AdvancedMD Integration Phase 1 Test Suite             ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  const results: { name: string; passed: boolean }[] = [];

  // Run tests sequentially
  results.push({
    name: 'Authentication Service',
    passed: await testAuthentication(),
  });

  results.push({
    name: 'Rate Limiter Service',
    passed: await testRateLimiter(),
  });

  results.push({
    name: 'API Client',
    passed: await testAPIClient(),
  });

  // Summary
  section('TEST SUMMARY');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  results.forEach((result) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const color = result.passed ? 'green' : 'red';
    log(`  ${status} - ${result.name}`, color);
  });

  console.log('\n' + '='.repeat(60));
  log(`Total: ${results.length} tests`, 'cyan');
  log(`Passed: ${passedCount}`, passedCount === results.length ? 'green' : 'yellow');
  log(`Failed: ${failedCount}`, failedCount > 0 ? 'red' : 'gray');
  console.log('='.repeat(60) + '\n');

  if (passedCount === results.length) {
    log('🎉 All tests passed! Phase 1 implementation is working correctly.', 'green');
    log('   Next steps:', 'cyan');
    log('   1. Review sync logs in database', 'gray');
    log('   2. Enable sync features in AdvancedMD config', 'gray');
    log('   3. Proceed to Phase 2: Patient Synchronization', 'gray');
    process.exit(0);
  } else {
    log('⚠️  Some tests failed. Please review the errors above.', 'yellow');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  log(`\n❌ Test suite failed with unexpected error:`, 'red');
  log(`   ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
