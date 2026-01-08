const https = require('https');

const BASE_URL = 'mentalspace-alb-614724140.us-east-1.elb.amazonaws.com';

// Allow self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Store cookies from responses
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

    // Include cookies if we have them
    if (cookies.length > 0) {
      options.headers['Cookie'] = cookies.join('; ');
    }

    const req = https.request(options, (res) => {
      let body = '';

      // Capture cookies from response
      const setCookies = res.headers['set-cookie'];
      if (setCookies) {
        setCookies.forEach(cookie => {
          // Extract the cookie name=value part
          const cookiePart = cookie.split(';')[0];
          cookies.push(cookiePart);
        });
        console.log('  [Cookies received:', setCookies.length, ']');
      }

      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
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

async function testMessagingAPI() {
  console.log('=== Testing Messaging API ===\n');

  // Step 1: Get CSRF token first
  console.log('1. Getting CSRF token...');
  const csrfResult = await makeRequest('GET', '/api/v1/csrf-token', null);
  console.log('CSRF status:', csrfResult.status);
  const csrfToken = csrfResult.data?.csrfToken;
  console.log('CSRF token obtained:', csrfToken ? 'Yes' : 'No');
  console.log();

  // Step 2: Login
  console.log('2. Logging in...');
  const loginResult = await makeRequest('POST', '/api/v1/auth/login', {
    email: 'admin@mentalspace.com',
    password: 'SecurePass123!'
  });
  console.log('Login status:', loginResult.status);
  console.log('Login success:', loginResult.data?.success);
  console.log('User:', loginResult.data?.data?.user?.email);
  console.log();

  if (!loginResult.data?.success) {
    console.log('Login failed:', loginResult.data);
    return;
  }

  // Step 3: Test GET /messages
  console.log('3. Testing GET /api/v1/messages...');
  const messagesResult = await makeRequest('GET', '/api/v1/messages', null);
  console.log('Messages status:', messagesResult.status);
  if (messagesResult.status === 200) {
    console.log('Messages success:', messagesResult.data?.success);
    console.log('Messages count:', messagesResult.data?.data?.length || 0);
    console.log('Total count:', messagesResult.data?.count);
  } else {
    console.log('Messages error:', messagesResult.data);
  }
  console.log();

  // Step 4: Test GET /messages/channels
  console.log('4. Testing GET /api/v1/messages/channels...');
  const channelsResult = await makeRequest('GET', '/api/v1/messages/channels', null);
  console.log('Channels status:', channelsResult.status);
  if (channelsResult.status === 200) {
    console.log('Channels success:', channelsResult.data?.success);
    console.log('Channels count:', channelsResult.data?.data?.length || 0);
    if (channelsResult.data?.data?.length > 0) {
      console.log('First channel:', JSON.stringify(channelsResult.data.data[0], null, 2));
    }
  } else {
    console.log('Channels error:', channelsResult.data);
  }
  console.log();

  // Step 5: Test portal inbox
  console.log('5. Testing GET /api/v1/client-portal/portal-messages/inbox...');
  const portalInboxResult = await makeRequest('GET', '/api/v1/client-portal/portal-messages/inbox', null);
  console.log('Portal inbox status:', portalInboxResult.status);
  if (portalInboxResult.status === 200) {
    console.log('Portal inbox success:', portalInboxResult.data?.success);
    console.log('Portal messages count:', portalInboxResult.data?.data?.messages?.length || 0);
    console.log('Unread count:', portalInboxResult.data?.data?.unreadCount);
  } else {
    console.log('Portal inbox error:', portalInboxResult.data);
  }
  console.log();

  console.log('=== Tests Complete ===');
}

testMessagingAPI().catch(console.error);
