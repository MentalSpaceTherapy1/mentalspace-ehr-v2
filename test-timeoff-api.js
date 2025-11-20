const axios = require('axios');

const API_URL = 'https://api.mentalspaceehr.com/api/v1';
const REQUEST_ID = 'af04072e-26ef-4ec4-936e-21d960af9365'; // The request we just created

async function testTimeOffAPI() {
  try {
    console.log('=== Testing Time-Off Request API Endpoint ===\n');

    console.log('Step 1: Testing GET /time-off (list all requests)...');
    const listResponse = await axios.get(`${API_URL}/time-off`, {
      validateStatus: () => true // Accept any status code
    });

    console.log('   Status:', listResponse.status);
    console.log('   Response:', JSON.stringify(listResponse.data, null, 2));

    if (listResponse.status === 401) {
      console.log('\n✅ Endpoint is accessible (requires authentication - expected)');
    } else if (listResponse.status === 200) {
      console.log('\n✅ Endpoint returned data successfully');
      console.log('   Found', listResponse.data.count, 'time-off requests');
    } else if (listResponse.status === 404) {
      console.log('\n❌ Endpoint not found - this suggests the routes are not loaded');
    }

    console.log('\nStep 2: Testing GET /time-off/:id (get specific request)...');
    const getResponse = await axios.get(`${API_URL}/time-off/${REQUEST_ID}`, {
      validateStatus: () => true
    });

    console.log('   Status:', getResponse.status);
    console.log('   Response:', JSON.stringify(getResponse.data, null, 2));

    if (getResponse.status === 401) {
      console.log('\n✅ Endpoint is accessible (requires authentication - expected)');
    } else if (getResponse.status === 200) {
      console.log('\n✅ Successfully retrieved the time-off request via API!');
      console.log('   Provider:', getResponse.data.data.provider.firstName, getResponse.data.data.provider.lastName);
      console.log('   Status:', getResponse.data.data.status);
    } else if (getResponse.status === 404) {
      console.log('\n❌ Endpoint not found - routes may not be loaded');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testTimeOffAPI();
