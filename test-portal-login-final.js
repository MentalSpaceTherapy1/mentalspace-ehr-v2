const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing portal login with correct credentials...\n');
    const response = await axios.post('http://localhost:3001/api/v1/portal-auth/login', {
      email: 'jessica.anderson@example.com',
      password: 'SecurePass123!'
    });

    if (response.data.success) {
      console.log('✅ LOGIN SUCCESSFUL!');
      console.log(`   Token: ${response.data.data.token.substring(0, 50)}...`);
      console.log(`   Client: ${response.data.data.client.firstName} ${response.data.data.client.lastName}`);
      console.log(`   Email: ${response.data.data.client.email}`);
      console.log(`   Account Status: ${response.data.data.portalAccount.accountStatus}`);
      console.log(`   Email Verified: ${response.data.data.portalAccount.emailVerified}`);
      console.log('\n✅ Portal login is working correctly!');
      console.log('\nCredentials to use in browser:');
      console.log('   Email: jessica.anderson@example.com');
      console.log('   Password: SecurePass123!');
    } else {
      console.log('❌ Login failed:', response.data.message);
    }
  } catch (error) {
    console.log('❌ Login error:', error.response?.data?.message || error.message);
  }
}

testLogin();
