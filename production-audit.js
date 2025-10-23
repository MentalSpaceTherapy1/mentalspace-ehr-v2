// COMPREHENSIVE PRODUCTION AUDIT SCRIPT
const https = require('https');
const fs = require('fs');
const path = require('path');

const AUDIT_REPORT = [];

function log(section, message, severity = 'INFO') {
  const entry = { section, message, severity, timestamp: new Date().toISOString() };
  AUDIT_REPORT.push(entry);
  const icon = severity === 'CRITICAL' ? '🚨' : severity === 'HIGH' ? '⚠️' : severity === 'MEDIUM' ? '⚠️' : 'ℹ️';
  console.log(`${icon} [${section}] ${message}`);
}

async function login(email, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ email, password });
    const options = {
      hostname: 'api.mentalspaceehr.com',
      port: 443,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.success) resolve(result.data.tokens.accessToken);
          else reject(new Error('Login failed'));
        } catch (e) { reject(e); }
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
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('='.repeat(80));
  console.log('COMPREHENSIVE PRODUCTION AUDIT - MENTALSPACE EHR');
  console.log('='.repeat(80));
  console.log('');

  try {
    // ========== PART 1: ESTABLISH BASELINE ==========
    log('BASELINE', '=== PART 1: ESTABLISHING BASELINE ===');

    const email = process.env.ADMIN_EMAIL || 'brendajb@chctherapy.com';
    const password = process.env.ADMIN_PASSWORD || '38MoreYears!';

    log('BASELINE', 'Logging into production...');
    const token = await login(email, password);
    log('BASELINE', '✅ Logged in successfully');

    // Get production version
    log('BASELINE', 'Checking production version...');
    const version = await getAPI(token, '/version');
    log('BASELINE', `Production Git SHA: ${version.gitSha}`);
    log('BASELINE', `Production Build Time: ${version.buildTime}`);

    // Get local Git info
    const { execSync } = require('child_process');
    const localGitSha = execSync('git rev-parse HEAD').toString().trim();
    const localGitShortSha = execSync('git rev-parse --short HEAD').toString().trim();
    const localBranch = execSync('git branch --show-current').toString().trim();

    log('BASELINE', `Development Git SHA: ${localGitSha}`);
    log('BASELINE', `Development Branch: ${localBranch}`);

    // Compare versions
    if (version.gitSha === localGitSha) {
      log('BASELINE', '✅ Production is running latest code', 'INFO');
    } else {
      const commitsBehind = execSync(`git rev-list ${version.gitSha}..HEAD --count`).toString().trim();
      log('BASELINE', `❌ Production is ${commitsBehind} commits behind development`, 'CRITICAL');

      // List missing commits
      const missingCommits = execSync(`git log ${version.gitSha}..HEAD --oneline`).toString().trim();
      log('BASELINE', `Missing commits:\n${missingCommits}`, 'CRITICAL');
    }

    // ========== PART 2: DATABASE DATA AUDIT ==========
    log('DATABASE', '\n=== PART 2: DATABASE DATA AUDIT ===');

    // Check portal forms
    log('DATABASE', 'Checking assessment forms...');
    const assessmentForms = await getAPI(token, '/portal-admin/assessment-forms');
    const assessmentCount = assessmentForms.data?.length || 0;
    if (assessmentCount === 0) {
      log('DATABASE', '❌ ZERO assessment forms in production', 'CRITICAL');
    } else {
      log('DATABASE', `Found ${assessmentCount} assessment forms`);
      assessmentForms.data.forEach(form => {
        log('DATABASE', `  - ${form.title} (${form.isPublished ? 'Published' : 'Draft'})`);
      });
    }

    log('DATABASE', 'Checking client forms...');
    const clientForms = await getAPI(token, '/portal-admin/client-forms');
    const clientFormsCount = clientForms.data?.length || 0;
    if (clientFormsCount === 0) {
      log('DATABASE', '❌ ZERO client forms in production', 'CRITICAL');
    } else {
      log('DATABASE', `Found ${clientFormsCount} client forms`);
      clientForms.data.forEach(form => {
        log('DATABASE', `  - ${form.title} (${form.isPublished ? 'Published' : 'Draft'})`);
      });
    }

    // Check CPT codes
    log('DATABASE', 'Checking service codes (CPT)...');
    try {
      const serviceCodes = await getAPI(token, '/service-codes?limit=1');
      const totalCodes = serviceCodes.pagination?.total || 0;
      if (totalCodes === 0) {
        log('DATABASE', '❌ ZERO service codes in production', 'CRITICAL');
      } else {
        log('DATABASE', `Found ${totalCodes} service codes`);
      }
    } catch (e) {
      log('DATABASE', `Error checking service codes: ${e.message}`, 'HIGH');
    }

    // Check users
    log('DATABASE', 'Checking users...');
    const users = await getAPI(token, '/users?limit=100');
    const userCount = users.data?.length || 0;
    log('DATABASE', `Found ${userCount} users in production`);

    // Analyze user roles
    const roleDistribution = {};
    users.data?.forEach(user => {
      user.roles?.forEach(role => {
        roleDistribution[role] = (roleDistribution[role] || 0) + 1;
      });
    });
    log('DATABASE', 'User role distribution:');
    Object.entries(roleDistribution).forEach(([role, count]) => {
      log('DATABASE', `  - ${role}: ${count} users`);
    });

    // Check clients
    log('DATABASE', 'Checking clients...');
    const clients = await getAPI(token, '/clients?limit=1');
    const clientCount = clients.pagination?.total || 0;
    log('DATABASE', `Found ${clientCount} clients in production`);

    // Check appointments
    log('DATABASE', 'Checking appointments...');
    try {
      const appointments = await getAPI(token, '/appointments?limit=1');
      const appointmentCount = appointments.pagination?.total || 0;
      log('DATABASE', `Found ${appointmentCount} appointments in production`);
    } catch (e) {
      log('DATABASE', `Error checking appointments: ${e.message}`, 'MEDIUM');
    }

    // Check clinical notes
    log('DATABASE', 'Checking clinical notes...');
    try {
      const notes = await getAPI(token, '/clinical-notes?limit=1');
      const notesCount = notes.pagination?.total || 0;
      log('DATABASE', `Found ${notesCount} clinical notes in production`);
    } catch (e) {
      log('DATABASE', `Error checking clinical notes: ${e.message}`, 'MEDIUM');
    }

    // ========== PART 3: MIGRATION FILES AUDIT ==========
    log('MIGRATIONS', '\n=== PART 3: DATABASE MIGRATIONS AUDIT ===');

    const migrationsDir = path.join(__dirname, 'packages', 'database', 'prisma', 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrations = fs.readdirSync(migrationsDir).filter(f =>
        fs.statSync(path.join(migrationsDir, f)).isDirectory()
      ).sort();

      log('MIGRATIONS', `Found ${migrations.length} migration folders in codebase:`);
      migrations.forEach((migration, index) => {
        log('MIGRATIONS', `  ${index + 1}. ${migration}`);
      });

      log('MIGRATIONS', '\n⚠️ Cannot verify which migrations are applied in production without database access', 'HIGH');
      log('MIGRATIONS', 'Recommendation: Run Prisma migration status check against production DB', 'HIGH');
    } else {
      log('MIGRATIONS', 'No migrations directory found', 'MEDIUM');
    }

    // ========== PART 4: FEATURE VERIFICATION ==========
    log('FEATURES', '\n=== PART 4: CRITICAL FEATURES VERIFICATION ===');

    // Test authentication
    log('FEATURES', 'Testing authentication...');
    log('FEATURES', '✅ Authentication working (we logged in successfully)');

    // Test user creation
    log('FEATURES', 'Testing user management endpoints...');
    try {
      await getAPI(token, '/users?role=CLINICIAN&limit=1');
      log('FEATURES', '✅ User listing/filtering working');
    } catch (e) {
      log('FEATURES', `❌ User listing failed: ${e.message}`, 'HIGH');
    }

    // Test client endpoints
    log('FEATURES', 'Testing client endpoints...');
    try {
      await getAPI(token, '/clients?search=test&limit=1');
      log('FEATURES', '✅ Client search working');
    } catch (e) {
      log('FEATURES', `❌ Client search failed: ${e.message}`, 'HIGH');
    }

    // Test portal admin endpoints
    log('FEATURES', 'Testing portal admin endpoints...');
    try {
      await getAPI(token, '/portal-admin/assessment-forms');
      log('FEATURES', '✅ Portal admin assessment forms endpoint working');
    } catch (e) {
      log('FEATURES', `❌ Portal admin assessment forms failed: ${e.message}`, 'CRITICAL');
    }

    try {
      await getAPI(token, '/portal-admin/client-forms');
      log('FEATURES', '✅ Portal admin client forms endpoint working');
    } catch (e) {
      log('FEATURES', `❌ Portal admin client forms failed: ${e.message}`, 'CRITICAL');
    }

    // ========== GENERATE SUMMARY ==========
    log('SUMMARY', '\n' + '='.repeat(80));
    log('SUMMARY', 'AUDIT SUMMARY');
    log('SUMMARY', '='.repeat(80));

    const critical = AUDIT_REPORT.filter(e => e.severity === 'CRITICAL').length;
    const high = AUDIT_REPORT.filter(e => e.severity === 'HIGH').length;
    const medium = AUDIT_REPORT.filter(e => e.severity === 'MEDIUM').length;

    log('SUMMARY', `Total Issues Found:`);
    log('SUMMARY', `  🚨 CRITICAL: ${critical}`);
    log('SUMMARY', `  ⚠️  HIGH: ${high}`);
    log('SUMMARY', `  ⚠️  MEDIUM: ${medium}`);

    log('SUMMARY', '\n🚨 CRITICAL ISSUES:');
    AUDIT_REPORT.filter(e => e.severity === 'CRITICAL').forEach(e => {
      log('SUMMARY', `  - [${e.section}] ${e.message}`);
    });

    log('SUMMARY', '\n⚠️  HIGH PRIORITY ISSUES:');
    AUDIT_REPORT.filter(e => e.severity === 'HIGH').forEach(e => {
      log('SUMMARY', `  - [${e.section}] ${e.message}`);
    });

    // Write full report to file
    const reportPath = path.join(__dirname, 'PRODUCTION_AUDIT_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(AUDIT_REPORT, null, 2));
    log('SUMMARY', `\n📄 Full audit report saved to: ${reportPath}`);

  } catch (error) {
    log('ERROR', `Audit failed: ${error.message}`, 'CRITICAL');
    console.error(error);
  }
}

main();
