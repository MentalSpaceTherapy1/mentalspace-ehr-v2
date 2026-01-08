/**
 * Test script to verify tracking endpoint authentication
 * This tests the full flow: login -> get cookies -> make tracking request
 */

const https = require('https');

const API_BASE = 'https://api.mentalspaceehr.com/api/v1';

// Test credentials - use a valid test account
const TEST_EMAIL = 'sara.johnson@example.com'; // Replace with valid test credentials
const TEST_PASSWORD = 'SecurePass123!';

// Store cookies from login
let cookies = {};

function parseCookies(setCookieHeaders) {
  if (!setCookieHeaders) return {};
  const result = {};
  const cookieArray = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];

  cookieArray.forEach(cookie => {
    const parts = cookie.split(';')[0].split('=');
    if (parts.length >= 2) {
      result[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });

  return result;
}

function formatCookiesForRequest(cookieObj) {
  return Object.entries(cookieObj)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

function makeRequest(method, path, data, headers = {}) {
  return new Promise((resolve, reject) => {
    // Construct full URL properly (path should not start with /)
    const fullPath = '/api/v1' + path;
    const url = new URL(fullPath, 'https://api.mentalspaceehr.com');

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://mentalspaceehr.com',
        ...headers
      }
    };

    // Add cookies if we have them
    if (Object.keys(cookies).length > 0) {
      options.headers['Cookie'] = formatCookiesForRequest(cookies);
    }

    console.log(`\n=== ${method} ${path} ===`);
    console.log('Request headers:', JSON.stringify(options.headers, null, 2));

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        // Parse and store any cookies
        const newCookies = parseCookies(res.headers['set-cookie']);
        cookies = { ...cookies, ...newCookies };

        console.log(`Response status: ${res.statusCode}`);
        console.log('Response headers:', JSON.stringify(res.headers, null, 2));

        try {
          const json = JSON.parse(body);
          console.log('Response body:', JSON.stringify(json, null, 2));
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch (e) {
          console.log('Response body (raw):', body.substring(0, 500));
          resolve({ status: res.statusCode, headers: res.headers, body: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('TRACKING AUTHENTICATION TEST');
  console.log('='.repeat(60));

  try {
    // Step 1: Login
    console.log('\n\n>>> STEP 1: LOGIN <<<');
    const loginResult = await makeRequest('POST', '/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (loginResult.status !== 200) {
      console.error('Login failed!');
      return;
    }

    console.log('\nCookies after login:', cookies);
    console.log('Has access_token cookie:', !!cookies['access_token']);

    // Step 2: Test tracking endpoint
    console.log('\n\n>>> STEP 2: TRACKING REQUEST <<<');
    // Get a client ID first
    const clientsResult = await makeRequest('GET', '/clients?limit=1');

    if (clientsResult.status !== 200 || !clientsResult.body?.data?.clients?.[0]) {
      console.error('Could not get client list');
      console.log('Trying with a sample client ID...');
    }

    const clientId = clientsResult.body?.data?.clients?.[0]?.id || 'test-client-id';
    console.log('\nUsing client ID:', clientId);

    // Step 3: Make tracking request
    console.log('\n\n>>> STEP 3: TRACKING ANALYTICS REQUEST <<<');
    const trackingResult = await makeRequest('GET', `/tracking/analytics/${clientId}/combined?startDate=2025-01-01&endDate=2025-12-31`);

    console.log('\n='.repeat(60));
    console.log('TEST RESULTS');
    console.log('='.repeat(60));
    console.log('Login status:', loginResult.status);
    console.log('Tracking status:', trackingResult.status);
    console.log('Cookies present:', Object.keys(cookies));
    console.log('access_token cookie:', cookies['access_token'] ? 'PRESENT' : 'MISSING');

    if (trackingResult.status === 200) {
      console.log('\n✅ SUCCESS: Tracking endpoint works with cookies!');
    } else if (trackingResult.status === 401) {
      console.log('\n❌ FAILURE: Tracking endpoint returned 401');
      console.log('Debug info:', trackingResult.body?.debug);
    } else {
      console.log('\n⚠️ UNEXPECTED: Status', trackingResult.status);
    }

  } catch (error) {
    console.error('Test error:', error);
  }
}

runTests();
