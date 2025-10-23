// Script to login and check Brenda's roles
const https = require('https');

// First, we'll login to get a token
function login(email, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ email, password });

    const options = {
      hostname: 'api.mentalspaceehr.com',
      port: 443,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
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
          if (result.success && result.data.accessToken) {
            resolve(result.data.accessToken);
          } else {
            reject(new Error('Login failed: ' + JSON.stringify(result)));
          }
        } catch (e) {
          reject(new Error('Error parsing login response: ' + e.message));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Then check users
function getUsers(token, search) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.mentalspaceehr.com',
      port: 443,
      path: `/api/v1/users?search=${encodeURIComponent(search)}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
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
          resolve(result);
        } catch (e) {
          reject(new Error('Error parsing response: ' + e.message));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Main execution
async function main() {
  try {
    console.log('Attempting to login to production API...');

    // Try to login with the admin credentials from environment or provide your own
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@mentalspaceehr.com';
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      console.error('\n❌ ERROR: No admin password provided');
      console.error('Please set ADMIN_PASSWORD environment variable or modify the script with credentials');
      console.error('\nUsage:');
      console.error('  ADMIN_EMAIL=your@email.com ADMIN_PASSWORD=yourpassword node get-brenda-roles.js');
      process.exit(1);
    }

    const token = await login(adminEmail, adminPassword);
    console.log('✅ Login successful!\n');

    console.log('Searching for Brenda...');
    const result = await getUsers(token, 'brenda');

    console.log('=== Users matching "brenda" ===\n');
    console.log(JSON.stringify(result, null, 2));

    if (result.success && result.data && result.data.length > 0) {
      console.log('\n=== Role Analysis ===');
      result.data.forEach(user => {
        console.log(`\n👤 User: ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`🎭 Roles in database: ${JSON.stringify(user.roles)}`);
        console.log(`✓ Is Active: ${user.isActive}`);
        console.log(`# Number of roles: ${user.roles ? user.roles.length : 0}`);

        if (user.roles && user.roles.length > 0) {
          console.log('\n📋 Detailed roles:');
          user.roles.forEach(role => {
            console.log(`   - ${role}`);
          });
        } else {
          console.log('\n⚠️  WARNING: User has NO roles assigned!');
        }
      });
    } else {
      console.log('\n❌ No users found matching "brenda"');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

main();
