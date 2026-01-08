const https = require('https');

const API_BASE = 'https://api.mentalspaceehr.com/api/v1';

// Get credentials from environment or use defaults (you'll need to update these)
const EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const PASSWORD = process.env.ADMIN_PASSWORD || 'password';

async function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      const cookies = res.headers['set-cookie'] || [];

      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
            cookies
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            cookies
          });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function seedForms() {
  console.log('Step 1: Logging in...');

  const loginData = JSON.stringify({ email: EMAIL, password: PASSWORD });
  const loginResponse = await makeRequest({
    hostname: 'api.mentalspaceehr.com',
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length
    }
  }, loginData);

  if (loginResponse.status !== 200) {
    console.error('Login failed:', loginResponse.data);
    process.exit(1);
  }

  console.log('Login successful');

  // Extract cookies for subsequent request
  const cookieHeader = loginResponse.cookies.map(c => c.split(';')[0]).join('; ');
  console.log('Got auth cookies');

  // Get CSRF token
  console.log('\nStep 2: Getting CSRF token...');
  const csrfResponse = await makeRequest({
    hostname: 'api.mentalspaceehr.com',
    path: '/api/v1/csrf-token',
    method: 'GET',
    headers: {
      'Cookie': cookieHeader
    }
  });

  if (csrfResponse.status !== 200) {
    console.error('CSRF fetch failed:', csrfResponse.data);
    process.exit(1);
  }

  const csrfToken = csrfResponse.data.csrfToken;
  console.log('Got CSRF token');

  // Also get any cookies from CSRF response
  const allCookies = [...loginResponse.cookies, ...csrfResponse.cookies]
    .map(c => c.split(';')[0])
    .filter((v, i, a) => a.findIndex(t => t.split('=')[0] === v.split('=')[0]) === i)
    .join('; ');

  // Call seed endpoint
  console.log('\nStep 3: Seeding intake forms...');
  const seedResponse = await makeRequest({
    hostname: 'api.mentalspaceehr.com',
    path: '/api/v1/admin/seed/intake-forms',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': allCookies,
      'x-csrf-token': csrfToken
    }
  }, '{}');

  console.log('Seed response status:', seedResponse.status);
  console.log('Seed response:', JSON.stringify(seedResponse.data, null, 2));
}

seedForms().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
