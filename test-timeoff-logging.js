const axios = require('axios');

const API_URL = 'https://api.mentalspaceehr.com/api/v1';

async function testTimeOffLogging() {
  try {
    console.log('=== Testing Time-Off API with Logging ===\n');

    // Step 1: Login
    console.log('Step 1: Logging in...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'ejoseph@chctherapy.com',
      password: 'Bing@@0912'
    });

    if (!loginResponse.data.success) {
      console.error('❌ Login failed:', loginResponse.data.message);
      return;
    }

    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    if (loginResponse.data.user) {
      console.log('   User:', loginResponse.data.user.firstName || 'N/A', loginResponse.data.user.lastName || '');
      if (loginResponse.data.user.roles) {
        console.log('   Roles:', loginResponse.data.user.roles.join(', '));
      }
    }
    console.log('   Token:', token.substring(0, 20) + '...\n');

    // Step 2: Fetch time-off requests (this will trigger backend logging)
    console.log('Step 2: Fetching time-off requests (triggering backend logging)...');
    console.log('   Endpoint: GET', `${API_URL}/time-off`);
    console.log('   Headers: Authorization Bearer token\n');

    const response = await axios.get(`${API_URL}/time-off`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📋 Response Status:', response.status);
    console.log('📋 Response Data:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      const requests = response.data.data || [];
      console.log(`\n✅ API returned ${requests.length} time-off request(s)`);

      if (requests.length > 0) {
        console.log('\n📝 Requests:');
        requests.forEach((req, idx) => {
          console.log(`\n   Request ${idx + 1}:`);
          console.log(`     - ID: ${req.id}`);
          console.log(`     - Provider: ${req.provider?.firstName || 'N/A'} ${req.provider?.lastName || ''}`);
          console.log(`     - Status: ${req.status}`);
          console.log(`     - Start: ${req.startDate}`);
          console.log(`     - End: ${req.endDate}`);
        });
      }
    } else {
      console.error('❌ Request failed:', response.data.message);
    }

    console.log('\n✅ Test complete! Now check CloudWatch logs for backend logging output.');

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

testTimeOffLogging();
