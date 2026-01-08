// Debug script to see the exact response structure
const https = require('https');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BASE_URL = 'mentalspace-alb-614724140.us-east-1.elb.amazonaws.com';
let cookies = [];

function makeRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (cookies.length > 0) {
      options.headers['Cookie'] = cookies.join('; ');
    }
    const req = https.request(options, (res) => {
      let body = '';
      const setCookies = res.headers['set-cookie'];
      if (setCookies) {
        setCookies.forEach(cookie => {
          const cookiePart = cookie.split(';')[0];
          cookies.push(cookiePart);
        });
      }
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log('Raw response length:', body.length, 'bytes');
        console.log('Raw response (first 500 chars):', body.substring(0, 500));
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body), raw: body });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, raw: body });
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

async function test() {
  console.log('=== Debug Messaging Response ===\n');

  console.log('1. Getting CSRF token...');
  await makeRequest('GET', '/api/v1/csrf-token', null);

  console.log('\n2. Logging in...');
  const loginResult = await makeRequest('POST', '/api/v1/auth/login', {
    email: 'admin@mentalspace.com',
    password: 'SecurePass123!'
  });
  console.log('Login status:', loginResult.status);
  if (loginResult.data?.data?.user) {
    console.log('User email:', loginResult.data.data.user.email);
    console.log('User role:', loginResult.data.data.user.role);
    console.log('User ID:', loginResult.data.data.user.id);
  }

  if (!loginResult.data?.success) {
    console.log('Login failed');
    return;
  }

  console.log('\n3. Testing portal inbox...');
  const inboxResult = await makeRequest('GET', '/api/v1/client-portal/portal-messages/inbox', null);
  console.log('Inbox status:', inboxResult.status);
  console.log('Response size:', inboxResult.raw?.length, 'bytes');
  console.log('\nFull response structure:');
  console.log(JSON.stringify(inboxResult.data, null, 2));

  if (inboxResult.data?.data?.messages) {
    console.log('\nMessages count:', inboxResult.data.data.messages.length);
    if (inboxResult.data.data.messages.length > 0) {
      console.log('\nFirst message:');
      console.log(JSON.stringify(inboxResult.data.data.messages[0], null, 2));
    }
  }

  // Also test getting assigned clients
  console.log('\n4. Testing messaging/clients endpoint...');
  const clientsResult = await makeRequest('GET', '/api/v1/client-portal/messaging/clients', null);
  console.log('Clients status:', clientsResult.status);
  console.log('Response:', JSON.stringify(clientsResult.data, null, 2));
}

test().catch(console.error);
