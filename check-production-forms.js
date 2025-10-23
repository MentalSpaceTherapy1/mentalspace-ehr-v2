// Check what forms exist in production database
const https = require('https');

async function login(email, password) {
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
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.success && result.data.tokens.accessToken) {
            resolve(result.data.tokens.accessToken);
          } else {
            reject(new Error('Login failed'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function getAPI(token, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.mentalspaceehr.com',
      port: 443,
      path: `/api/v1${path}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  try {
    console.log('=== CHECKING PRODUCTION DATABASE FOR PORTAL FORMS ===\n');

    const email = process.env.ADMIN_EMAIL || 'brendajb@chctherapy.com';
    const password = process.env.ADMIN_PASSWORD || '38MoreYears!';

    console.log('Logging in...');
    const token = await login(email, password);
    console.log('✅ Logged in successfully\n');

    // Check for client assessment forms
    console.log('--- CLIENT ASSESSMENT FORMS ---');
    const assessmentForms = await getAPI(token, '/portal-admin/assessment-forms');
    console.log(`Total assessment forms: ${assessmentForms.data?.length || 0}`);
    if (assessmentForms.data && assessmentForms.data.length > 0) {
      assessmentForms.data.forEach(form => {
        console.log(`  - ${form.title} (ID: ${form.id})`);
        console.log(`    Published: ${form.isPublished}, Active: ${form.isActive}`);
      });
    } else {
      console.log('  ⚠️  NO ASSESSMENT FORMS FOUND IN PRODUCTION');
    }

    console.log('\n--- CLIENT FORMS (Intake/Consent) ---');
    const clientForms = await getAPI(token, '/portal-admin/client-forms');
    console.log(`Total client forms: ${clientForms.data?.length || 0}`);
    if (clientForms.data && clientForms.data.length > 0) {
      clientForms.data.forEach(form => {
        console.log(`  - ${form.title} (ID: ${form.id})`);
        console.log(`    Published: ${form.isPublished}, Active: ${form.isActive}`);
      });
    } else {
      console.log('  ⚠️  NO CLIENT FORMS FOUND IN PRODUCTION');
    }

    console.log('\n--- CHECKING CLIENTS WITH FORMS ---');
    const clients = await getAPI(token, '/clients?limit=5');
    if (clients.data && clients.data.length > 0) {
      console.log(`Sample of ${clients.data.length} clients:`);
      for (const client of clients.data) {
        console.log(`\n  Client: ${client.firstName} ${client.lastName}`);

        // Check if client has any assessments
        try {
          const clientAssessments = await getAPI(token, `/clients/${client.id}/assessments`);
          console.log(`    Assessments: ${clientAssessments.data?.length || 0}`);
        } catch (e) {
          console.log(`    Assessments: Error fetching`);
        }

        // Check if client has any forms
        try {
          const clientForms = await getAPI(token, `/clients/${client.id}/forms`);
          console.log(`    Forms: ${clientForms.data?.length || 0}`);
        } catch (e) {
          console.log(`    Forms: Error fetching`);
        }
      }
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Assessment Forms in Production: ${assessmentForms.data?.length || 0}`);
    console.log(`Client Forms in Production: ${clientForms.data?.length || 0}`);

    if ((assessmentForms.data?.length || 0) === 0 && (clientForms.data?.length || 0) === 0) {
      console.log('\n❌ CRITICAL: NO FORMS FOUND IN PRODUCTION DATABASE');
      console.log('This confirms that forms were NOT migrated to production.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

main();
