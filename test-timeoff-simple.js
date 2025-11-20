const axios = require('axios');

const API_URL = 'https://api.mentalspaceehr.com/api/v1';

async function testTimeOff() {
  try {
    console.log('=== Step 1: Login ===');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'ejoseph@chctherapy.com',
      password: 'Bing@@0912'
    });

    console.log('Login Response:');
    console.log(JSON.stringify(loginResponse.data, null, 2));

    const token = loginResponse.data.data?.session?.token;

    if (!token) {
      console.error('\n❌ No token found in response');
      return;
    }

    console.log(`\n✅ Token obtained: ${token.substring(0, 20)}...`);

    console.log('\n=== Step 2: Fetch Time-Off Requests ===');
    const response = await axios.get(`${API_URL}/time-off`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('\nTime-Off API Response:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.success && response.data.count > 0) {
      console.log(`\n✅ SUCCESS! API returned ${response.data.count} time-off request(s)`);
    } else if (response.data.featureStatus === 'NOT_ENABLED') {
      console.log('\n❌ FAILED - Feature still showing as NOT_ENABLED');
      console.log('Error:', response.data.error);
    } else {
      console.log('\n⚠️  Unexpected response');
    }

  } catch (error) {
    if (error.response) {
      console.error('\n❌ Request failed:');
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('\n❌ Error:', error.message);
    }
  }
}

testTimeOff();
