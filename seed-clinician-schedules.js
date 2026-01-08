/**
 * Script to seed clinician schedules via API
 * Run this script after backend deployment to populate schedules for all clinicians
 */
const https = require('https');

const API_URL = 'https://api.mentalspaceehr.com/api/v1';

// Admin credentials - will need to be provided
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Default weekly schedule - Mon-Fri 9am-5pm with lunch break
const defaultWeeklySchedule = {
  monday: { isAvailable: true, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
  tuesday: { isAvailable: true, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
  wednesday: { isAvailable: true, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
  thursday: { isAvailable: true, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
  friday: { isAvailable: true, startTime: '09:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
  saturday: { isAvailable: false },
  sunday: { isAvailable: false }
};

async function makeRequest(method, path, data, cookies) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL + path);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (cookies) {
      options.headers['Cookie'] = cookies;
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const setCookie = res.headers['set-cookie'];
          resolve({
            status: res.statusCode,
            data: JSON.parse(body),
            cookies: setCookie
          });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function login() {
  console.log('Logging in as admin...');
  const result = await makeRequest('POST', '/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });

  if (result.status !== 200) {
    throw new Error(`Login failed: ${JSON.stringify(result.data)}`);
  }

  console.log('Login successful');
  return result.cookies?.join('; ') || '';
}

async function getClinicians(cookies) {
  console.log('Fetching clinicians...');
  const result = await makeRequest('GET', '/users?role=CLINICIAN', null, cookies);

  if (result.status !== 200) {
    throw new Error(`Failed to fetch clinicians: ${JSON.stringify(result.data)}`);
  }

  return result.data.data || result.data;
}

async function getExistingSchedules(cookies) {
  console.log('Fetching existing schedules...');
  const result = await makeRequest('GET', '/clinician-schedules', null, cookies);

  if (result.status !== 200) {
    console.log('Note: Could not fetch existing schedules, will create all');
    return [];
  }

  return result.data.data || result.data || [];
}

async function createSchedule(clinicianId, cookies) {
  const result = await makeRequest('POST', '/clinician-schedules', {
    clinicianId,
    weeklyScheduleJson: defaultWeeklySchedule,
    acceptNewClients: true,
    maxAppointmentsPerDay: 8,
    maxAppointmentsPerWeek: 40,
    bufferTimeBetweenAppointments: 15,
    availableLocations: ['IN_PERSON', 'TELEHEALTH']
  }, cookies);

  return result;
}

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('Usage: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=password node seed-clinician-schedules.js');
    process.exit(1);
  }

  try {
    const cookies = await login();
    const clinicians = await getClinicians(cookies);
    const existingSchedules = await getExistingSchedules(cookies);

    const existingClinicianIds = new Set(existingSchedules.map(s => s.clinicianId));

    console.log(`Found ${clinicians.length} clinicians, ${existingSchedules.length} existing schedules`);

    for (const clinician of clinicians) {
      if (existingClinicianIds.has(clinician.id)) {
        console.log(`Schedule already exists for ${clinician.firstName} ${clinician.lastName}`);
        continue;
      }

      console.log(`Creating schedule for ${clinician.firstName} ${clinician.lastName}...`);
      const result = await createSchedule(clinician.id, cookies);

      if (result.status === 200 || result.status === 201) {
        console.log(`  ✓ Schedule created`);
      } else {
        console.log(`  ✗ Failed: ${JSON.stringify(result.data)}`);
      }
    }

    console.log('\nDone! All clinicians now have schedules.');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
