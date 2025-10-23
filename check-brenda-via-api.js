// This script calls the production API to check Brenda's roles
const https = require('https');

// You'll need to provide a valid admin token
const ADMIN_TOKEN = process.argv[2];

if (!ADMIN_TOKEN) {
  console.error('Usage: node check-brenda-via-api.js <ADMIN_TOKEN>');
  console.error('\nTo get the token:');
  console.error('1. Login to https://mentalspaceehr.com');
  console.error('2. Open browser devtools (F12)');
  console.error('3. Go to Application > Local Storage > https://mentalspaceehr.com');
  console.error('4. Copy the value of "accessToken"');
  process.exit(1);
}

const options = {
  hostname: 'api.mentalspaceehr.com',
  port: 443,
  path: '/api/v1/users?search=brenda',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${ADMIN_TOKEN}`,
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('=== Users matching "brenda" ===\n');
      console.log(JSON.stringify(result, null, 2));

      if (result.data && result.data.length > 0) {
        console.log('\n=== Role Analysis ===');
        result.data.forEach(user => {
          console.log(`\nUser: ${user.firstName} ${user.lastName} (${user.email})`);
          console.log(`Roles in database: ${JSON.stringify(user.roles)}`);
          console.log(`Is Active: ${user.isActive}`);
          console.log(`Number of roles: ${user.roles ? user.roles.length : 0}`);
        });
      }
    } catch (e) {
      console.error('Error parsing response:', e.message);
      console.error('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.end();
