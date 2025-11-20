const axios = require('axios');

const API_URL = 'https://api.mentalspaceehr.com/api/v1';

async function testTimeOffRequest() {
  try {
    console.log('=== Testing Time-Off Request Feature ===\n');

    // Step 1: Login
    console.log('Step 1: Logging in...');
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
    console.log('   Token:', token.substring(0, 20) + '...\n');

    // Step 2: Get a provider ID (using Emily Rodriguez - clinician)
    const providerId = '6d3f63fb-bc06-48a3-b487-566f555739ea'; // Emily Rodriguez
    const requestedBy = loginResponse.data.user.id; // Admin user

    console.log('Step 2: Preparing time-off request');
    console.log('   Provider ID:', providerId);
    console.log('   Requested By:', requestedBy);
    console.log('   Provider: Emily Rodriguez (CLINICIAN)\n');

    // Step 3: Submit time-off request
    console.log('Step 3: Submitting time-off request...');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7); // 1 week from now
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 3); // 3-day time off

    const timeOffData = {
      providerId: providerId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      reason: 'VACATION',
      notes: 'Test time-off request from automated testing',
      requestedBy: requestedBy,
      autoReschedule: false
    };

    console.log('   Request data:');
    console.log('   - Start:', startDate.toLocaleDateString());
    console.log('   - End:', endDate.toLocaleDateString());
    console.log('   - Reason: VACATION');
    console.log('   - Notes: Test time-off request\n');

    const timeOffResponse = await axios.post(`${API_URL}/time-off`, timeOffData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (timeOffResponse.data.success) {
      console.log('✅ Time-off request submitted successfully!');
      console.log('\n📋 Request Details:');
      console.log(JSON.stringify(timeOffResponse.data.data, null, 2));
    } else {
      console.error('❌ Time-off request failed:', timeOffResponse.data.message);
    }

  } catch (error) {
    if (error.response) {
      console.error('\n❌ Request failed:');
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data.message || error.response.data);
      if (error.response.data.errorId) {
        console.error('   Error ID:', error.response.data.errorId);
      }
    } else {
      console.error('\n❌ Error:', error.message);
    }
  }
}

testTimeOffRequest();
