const https = require('https');

// Test client ID - we need to get this from the database
const CLIENT_ID = process.argv[2] || 'unknown';
const TOKEN = process.argv[3] || '';

const BASE_URL = 'api.mentalspaceehr.com';

const endpoints = [
  { name: 'Symptoms', path: `/api/v1/tracking/symptoms/${CLIENT_ID}?days=30` },
  { name: 'Symptom Trends', path: `/api/v1/tracking/symptoms/${CLIENT_ID}/trends?days=30` },
  { name: 'Symptom Summary', path: `/api/v1/tracking/symptoms/${CLIENT_ID}/summary?days=30` },
  { name: 'Sleep Logs', path: `/api/v1/tracking/sleep/${CLIENT_ID}?days=30` },
  { name: 'Sleep Metrics', path: `/api/v1/tracking/sleep/${CLIENT_ID}/metrics` },
  { name: 'Sleep Trends', path: `/api/v1/tracking/sleep/${CLIENT_ID}/trends?days=30` },
  { name: 'Exercise Logs', path: `/api/v1/tracking/exercise/${CLIENT_ID}?days=30` },
  { name: 'Exercise Stats', path: `/api/v1/tracking/exercise/${CLIENT_ID}/stats` },
  { name: 'Exercise Trends', path: `/api/v1/tracking/exercise/${CLIENT_ID}/trends?days=30` },
  { name: 'Combined Analytics', path: `/api/v1/tracking/analytics/${CLIENT_ID}/combined?startDate=2025-12-01&endDate=2026-01-02` },
  { name: 'Engagement Score', path: `/api/v1/tracking/reminders/${CLIENT_ID}/engagement?days=30` },
  { name: 'Logging Streak', path: `/api/v1/tracking/reminders/${CLIENT_ID}/streak` },
  { name: 'Reminder Preferences', path: `/api/v1/tracking/reminders/${CLIENT_ID}/preferences` },
];

async function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const options = {
      hostname: BASE_URL,
      port: 443,
      path: endpoint.path,
      method: 'GET',
      headers: {
        'Cookie': `access_token=${TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let body;
        try {
          body = JSON.parse(data);
        } catch {
          body = data.substring(0, 200);
        }
        resolve({
          name: endpoint.name,
          status: res.statusCode,
          success: res.statusCode === 200,
          error: body.error || body.message || null,
          body: res.statusCode !== 200 ? body : null,
        });
      });
    });

    req.on('error', (e) => {
      resolve({
        name: endpoint.name,
        status: 'ERROR',
        success: false,
        error: e.message,
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('Testing tracking endpoints...\n');
  console.log(`Client ID: ${CLIENT_ID}`);
  console.log(`Token: ${TOKEN ? TOKEN.substring(0, 20) + '...' : 'NOT PROVIDED'}\n`);

  const results = [];
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    const status = result.success ? 'OK' : `FAIL (${result.status})`;
    console.log(`[${status}] ${result.name}`);
    if (!result.success && result.error) {
      console.log(`    Error: ${result.error}`);
    }
    if (!result.success && result.body) {
      console.log(`    Body: ${JSON.stringify(result.body).substring(0, 200)}`);
    }
  }

  console.log('\n--- Summary ---');
  const failed = results.filter(r => !r.success);
  console.log(`Total: ${results.length}, Passed: ${results.length - failed.length}, Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nFailed endpoints:');
    failed.forEach(f => console.log(`  - ${f.name}: ${f.status} - ${f.error || 'Unknown error'}`));
  }
}

runTests();
