const axios = require('axios');

const API_URL = 'https://api.mentalspaceehr.com/api/v1';

async function testTimeOffList() {
  try {
    console.log('=== Testing Time-Off List API ===\n');

    // Step 1: Login as admin
    console.log('Step 1: Logging in as admin...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@mentalspace.com',
      password: 'Password123!'
    });

    if (!loginResponse.data.success) {
      console.error('❌ Login failed:', loginResponse.data.message);
      return;
    }

    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    console.log('   User:', loginResponse.data.user.firstName, loginResponse.data.user.lastName);
    console.log('   User ID:', loginResponse.data.user.id);
    console.log('   Token:', token.substring(0, 20) + '...\n');

    // Step 2: Get time-off requests
    console.log('Step 2: Fetching time-off requests...');
    console.log('   Endpoint: GET', `${API_URL}/time-off`);
    console.log('   Headers: Authorization Bearer token\n');

    const listResponse = await axios.get(`${API_URL}/time-off`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📋 Response Status:', listResponse.status);
    console.log('📋 Response Data:');
    console.log(JSON.stringify(listResponse.data, null, 2));

    if (listResponse.data.success) {
      const requests = listResponse.data.data || [];
      console.log(`\n✅ Found ${requests.length} time-off request(s)`);

      if (requests.length > 0) {
        requests.forEach((req, idx) => {
          console.log(`\n   Request ${idx + 1}:`);
          console.log(`     - ID: ${req.id}`);
          console.log(`     - Provider: ${req.provider?.firstName || 'N/A'} ${req.provider?.lastName || ''}`);
          console.log(`     - Status: ${req.status}`);
          console.log(`     - Start: ${req.startDate}`);
          console.log(`     - End: ${req.endDate}`);
          console.log(`     - Reason: ${req.reason}`);
        });
      }
    } else {
      console.error('❌ Request failed:', listResponse.data.message);
    }

  } catch (error) {
    if (error.response) {
      console.error('\n❌ Request failed:');
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('\n❌ Error:', error.message);
    }
  }
}

testTimeOffList();
