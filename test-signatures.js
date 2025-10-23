const https = require('https');

// Login and test signature endpoints
async function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.mentalspaceehr.com',
      port: 443,
      path: `/api/v1${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
      const bodyStr = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function testSignatures() {
  console.log('🔐 Step 1: Logging in as Brenda...');
  const loginResponse = await makeRequest('POST', '/auth/login', {
    email: 'brendajb@chctherapy.com',
    password: '38MoreYears!',
  });

  if (!loginResponse.success) {
    console.error('❌ Login failed:', loginResponse);
    return;
  }

  const token = loginResponse.data.token;
  console.log('✅ Login successful!');
  console.log(`Token: ${token.substring(0, 20)}...`);

  console.log('\n📊 Step 2: Checking signature status...');
  const statusResponse = await makeRequest('GET', '/users/signature-status', null, token);
  console.log('Signature Status:', JSON.stringify(statusResponse, null, 2));

  console.log('\n🔢 Step 3: Setting up signature PIN...');
  const pinResponse = await makeRequest('POST', '/users/signature-pin', {
    pin: '1234',
    confirmPin: '1234',
  }, token);
  console.log('PIN Setup:', JSON.stringify(pinResponse, null, 2));

  console.log('\n📊 Step 4: Checking signature status again...');
  const statusResponse2 = await makeRequest('GET', '/users/signature-status', null, token);
  console.log('Updated Signature Status:', JSON.stringify(statusResponse2, null, 2));

  console.log('\n🔒 Step 5: Testing signature attestation endpoint...');
  const attestationResponse = await makeRequest('GET', '/signatures/attestation/PROGRESS_NOTE?signatureType=AUTHOR', null, token);
  console.log('Attestation:', JSON.stringify(attestationResponse, null, 2));

  console.log('\n✅ All tests completed!');
}

testSignatures().catch(console.error);
