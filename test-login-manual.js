const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing login with admin@example.com...');

    const response = await axios.post('http://localhost:3001/login', {
      email: 'admin@example.com',
      password: 'password'
    });

    console.log('✅ Login successful!');
    console.log('Status:', response.status);
    console.log('Token received:', response.data.token ? 'Yes' : 'No');
    console.log('User:', response.data.user);

  } catch (error) {
    console.log('❌ Login failed!');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
  }
}

testLogin();
