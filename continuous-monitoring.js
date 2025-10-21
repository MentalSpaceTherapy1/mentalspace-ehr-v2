/**
 * Continuous Production Monitoring
 *
 * Runs every 5 minutes to check production health
 * Sends alerts if critical issues detected
 */

const https = require('https');

const CONFIG = {
  API_URL: process.env.PRODUCTION_API_URL || 'https://api.mentalspaceehr.com',
  CHECK_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  ALERT_EMAIL: process.env.ALERT_EMAIL || '',
  MAX_RESPONSE_TIME_MS: 5000,
  MAX_ERROR_RATE_PERCENT: 1,
  RETRY_COUNT: 3,
  RETRY_DELAY_MS: 10000, // 10 seconds
};

const stats = {
  checks: 0,
  successes: 0,
  failures: 0,
  lastFailure: null,
  consecutiveFailures: 0,
  responseTime: [],
};

function log(level, message, details = null) {
  const timestamp = new Date().toISOString();
  const color = {
    INFO: '\x1b[36m',
    WARN: '\x1b[33m',
    ERROR: '\x1b[31m',
    SUCCESS: '\x1b[32m',
  }[level] || '';

  console.log(`${color}[${timestamp}] [${level}] ${message}\x1b[0m`);
  if (details) {
    console.log(details);
  }
}

async function fetchAPI(path) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const url = new URL(path, CONFIG.API_URL);

    const req = https.request(url, {
      method: 'GET',
      timeout: CONFIG.MAX_RESPONSE_TIME_MS,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        try {
          resolve({
            status: res.statusCode,
            body: JSON.parse(data || '{}'),
            duration,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: data,
            duration,
          });
        }
      });
    });

    req.on('error', (error) => {
      const duration = Date.now() - startTime;
      reject({ error, duration });
    });

    req.on('timeout', () => {
      req.destroy();
      const duration = Date.now() - startTime;
      reject({ error: new Error('Request timeout'), duration });
    });

    req.end();
  });
}

async function checkWithRetry(checkFn, retries = CONFIG.RETRY_COUNT) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await checkFn();
      if (result.success) {
        return result;
      }

      if (i < retries - 1) {
        log('WARN', `Check failed, retrying in ${CONFIG.RETRY_DELAY_MS / 1000}s... (attempt ${i + 2}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY_MS));
      }
    } catch (error) {
      if (i === retries - 1) {
        return { success: false, error: error.message || error };
      }
    }
  }

  return { success: false, error: 'All retries exhausted' };
}

async function checkHealth() {
  try {
    const response = await fetchAPI('/api/v1/health');

    if (response.status === 200 && response.body.status === 'healthy') {
      return {
        success: true,
        duration: response.duration,
        data: response.body,
      };
    }

    return {
      success: false,
      error: `Unhealthy status: ${response.status}`,
      duration: response.duration,
    };
  } catch (error) {
    return {
      success: false,
      error: error.error?.message || error,
      duration: error.duration,
    };
  }
}

async function checkDatabase() {
  // This would require database credentials
  // For now, we check via API endpoints that hit the database
  try {
    const response = await fetchAPI('/api/v1/health');

    if (response.status === 200) {
      return { success: true, duration: response.duration };
    }

    return { success: false, error: `Status ${response.status}` };
  } catch (error) {
    return { success: false, error: error.error?.message || error };
  }
}

async function checkResponseTime() {
  const endpoints = [
    '/api/v1/health',
  ];

  const results = [];

  for (const endpoint of endpoints) {
    try {
      const response = await fetchAPI(endpoint);
      results.push({
        endpoint,
        duration: response.duration,
        success: response.status === 200 || response.status === 401,
      });
    } catch (error) {
      results.push({
        endpoint,
        duration: error.duration || CONFIG.MAX_RESPONSE_TIME_MS,
        success: false,
      });
    }
  }

  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  return {
    success: avgDuration < CONFIG.MAX_RESPONSE_TIME_MS,
    avgDuration,
    results,
  };
}

async function sendAlert(title, message, details = null) {
  log('ERROR', `ALERT: ${title}`);
  log('ERROR', message);
  if (details) {
    log('ERROR', JSON.stringify(details, null, 2));
  }

  // TODO: Implement email/SMS/Slack alerts
  // For now, just log
  if (CONFIG.ALERT_EMAIL) {
    log('INFO', `Alert would be sent to: ${CONFIG.ALERT_EMAIL}`);
  }
}

async function runChecks() {
  stats.checks++;

  log('INFO', `Running health checks... (Check #${stats.checks})`);

  let allPassed = true;

  // 1. Application Health
  const healthResult = await checkWithRetry(checkHealth);

  if (healthResult.success) {
    log('SUCCESS', `Application is healthy (${healthResult.duration}ms)`);
    stats.responseTime.push(healthResult.duration);

    // Keep only last 100 response times
    if (stats.responseTime.length > 100) {
      stats.responseTime.shift();
    }
  } else {
    log('ERROR', `Application health check FAILED: ${healthResult.error}`);
    allPassed = false;
    await sendAlert(
      'Application Down',
      'Production application health check failed',
      healthResult
    );
  }

  // 2. Database Connectivity
  const dbResult = await checkWithRetry(checkDatabase);

  if (dbResult.success) {
    log('SUCCESS', 'Database is accessible');
  } else {
    log('ERROR', `Database check FAILED: ${dbResult.error}`);
    allPassed = false;
    await sendAlert(
      'Database Connection Lost',
      'Cannot connect to production database',
      dbResult
    );
  }

  // 3. Response Time
  const responseTimeResult = await checkResponseTime();

  if (responseTimeResult.success) {
    log('SUCCESS', `Response time OK (avg: ${Math.round(responseTimeResult.avgDuration)}ms)`);
  } else {
    log('WARN', `Response time high (avg: ${Math.round(responseTimeResult.avgDuration)}ms)`);
    allPassed = false;
    await sendAlert(
      'High Response Time',
      `API response time exceeds ${CONFIG.MAX_RESPONSE_TIME_MS}ms`,
      responseTimeResult
    );
  }

  // Update stats
  if (allPassed) {
    stats.successes++;
    stats.consecutiveFailures = 0;
  } else {
    stats.failures++;
    stats.lastFailure = new Date().toISOString();
    stats.consecutiveFailures++;
  }

  // Alert on consecutive failures
  if (stats.consecutiveFailures >= 3) {
    await sendAlert(
      'CRITICAL: System Down',
      `Production system has failed ${stats.consecutiveFailures} consecutive health checks`,
      { stats }
    );
  }

  // Log stats
  const uptime = stats.checks > 0 ? (stats.successes / stats.checks * 100).toFixed(2) : 100;
  const avgResponseTime = stats.responseTime.length > 0
    ? Math.round(stats.responseTime.reduce((a, b) => a + b, 0) / stats.responseTime.length)
    : 0;

  log('INFO', `Stats: ${stats.successes}/${stats.checks} successful (${uptime}% uptime)`);
  log('INFO', `Average response time: ${avgResponseTime}ms`);

  if (stats.consecutiveFailures > 0) {
    log('WARN', `Consecutive failures: ${stats.consecutiveFailures}`);
  }
}

async function startMonitoring() {
  log('INFO', '=== CONTINUOUS PRODUCTION MONITORING STARTED ===');
  log('INFO', `Monitoring: ${CONFIG.API_URL}`);
  log('INFO', `Check interval: ${CONFIG.CHECK_INTERVAL_MS / 1000}s`);
  log('INFO', `Max response time: ${CONFIG.MAX_RESPONSE_TIME_MS}ms`);
  log('INFO', '');

  // Run initial check
  await runChecks();

  // Schedule periodic checks
  setInterval(async () => {
    await runChecks();
  }, CONFIG.CHECK_INTERVAL_MS);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('INFO', '=== MONITORING STOPPED ===');
  log('INFO', `Total checks: ${stats.checks}`);
  log('INFO', `Successful: ${stats.successes}`);
  log('INFO', `Failed: ${stats.failures}`);
  log('INFO', `Uptime: ${(stats.successes / stats.checks * 100).toFixed(2)}%`);
  process.exit(0);
});

// Start monitoring
startMonitoring().catch((error) => {
  log('ERROR', 'Fatal error in monitoring:', error);
  process.exit(1);
});
