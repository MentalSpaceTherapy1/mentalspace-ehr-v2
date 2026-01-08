const https = require('https');

const BASE_URL = 'api.mentalspaceehr.com';

// Login and then test form library
async function testFormLibrary() {
  try {
    // First login to get auth cookies
    const loginResponse = await new Promise((resolve, reject) => {
      const loginData = JSON.stringify({
        email: 'admin@mentalspaceehr.com',
        password: 'AdminPass123!'
      });

      const options = {
        hostname: BASE_URL,
        port: 443,
        path: '/api/v1/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': loginData.length
        },
        rejectUnauthorized: false
      };

      const req = https.request(options, (res) => {
        let data = '';
        const cookies = res.headers['set-cookie'] || [];
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data, cookies }));
      });

      req.on('error', reject);
      req.write(loginData);
      req.end();
    });

    console.log('Login status:', loginResponse.status);

    if (loginResponse.status !== 200) {
      console.log('Login failed:', loginResponse.data);
      return;
    }

    // Extract cookies for authenticated request
    const cookieHeader = loginResponse.cookies.map(c => c.split(';')[0]).join('; ');
    console.log('Got auth cookies');

    // Now test the form library endpoint
    const libraryResponse = await new Promise((resolve, reject) => {
      const options = {
        hostname: BASE_URL,
        port: 443,
        path: '/api/v1/clients/library?isActive=true',
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cookie': cookieHeader
        },
        rejectUnauthorized: false
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });

      req.on('error', reject);
      req.end();
    });

    console.log('\nForm Library API Response:');
    console.log('Status:', libraryResponse.status);

    try {
      const parsed = JSON.parse(libraryResponse.data);
      if (parsed.success && parsed.data) {
        console.log(`\nFound ${parsed.data.length} intake forms:`);
        parsed.data.slice(0, 10).forEach((form, i) => {
          console.log(`  ${i + 1}. ${form.formName} (${form.formType}) - Active: ${form.isActive}`);
        });
        if (parsed.data.length > 10) {
          console.log(`  ... and ${parsed.data.length - 10} more`);
        }
      } else {
        console.log('Response:', parsed);
      }
    } catch (e) {
      console.log('Raw response:', libraryResponse.data);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testFormLibrary();
