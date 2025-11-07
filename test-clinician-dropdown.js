const axios = require('axios');

async function testClinicianDropdown() {
  try {
    console.log('🔍 Testing Clinician Dropdown Issue...\n');

    // Step 1: Login
    console.log('Step 1: Logging in...');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      email: 'admin@mentalspace.com',
      password: 'Admin123!'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // Step 2: Fetch clinicians (same API call the frontend makes)
    console.log('Step 2: Fetching clinicians from /users?role=CLINICIAN...');
    const cliniciansResponse = await axios.get('http://localhost:3001/api/v1/users?role=CLINICIAN', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Clinicians API Response:');
    console.log(`   Status: ${cliniciansResponse.status}`);
    console.log(`   Data structure:`, JSON.stringify(cliniciansResponse.data, null, 2));

    const clinicians = cliniciansResponse.data.data;
    console.log(`\n📊 Found ${clinicians ? clinicians.length : 0} clinicians:`);

    if (clinicians && clinicians.length > 0) {
      clinicians.forEach((clinician, index) => {
        console.log(`   ${index + 1}. ${clinician.firstName} ${clinician.lastName} (ID: ${clinician.id})`);
        console.log(`      Email: ${clinician.email}`);
        console.log(`      Roles: ${clinician.roles?.join(', ') || 'N/A'}`);
      });
    } else {
      console.log('   ❌ NO CLINICIANS FOUND!');
      console.log('   This explains why the dropdown appears empty.');
    }

    // Step 3: Check all users with CLINICIAN role
    console.log('\n\nStep 3: Fetching all users to check who has CLINICIAN role...');
    const allUsersResponse = await axios.get('http://localhost:3001/api/v1/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const allUsers = allUsersResponse.data.data;
    console.log(`📊 Total users in database: ${allUsers.length}`);

    const usersWithClinicianRole = allUsers.filter(user =>
      user.roles && user.roles.includes('CLINICIAN')
    );

    console.log(`📊 Users with CLINICIAN role: ${usersWithClinicianRole.length}`);
    if (usersWithClinicianRole.length > 0) {
      usersWithClinicianRole.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`      Roles: ${user.roles.join(', ')}`);
      });
    }

    // Diagnosis
    console.log('\n\n🔎 DIAGNOSIS:');
    if (!clinicians || clinicians.length === 0) {
      if (usersWithClinicianRole.length === 0) {
        console.log('❌ ROOT CAUSE: No users have the CLINICIAN role in the database');
        console.log('   SOLUTION: You need to add CLINICIAN role to at least one user');
      } else {
        console.log('❌ ROOT CAUSE: Backend is not properly filtering users by CLINICIAN role');
        console.log('   The database has users with CLINICIAN role, but the API is not returning them');
        console.log('   SOLUTION: Check the user.service.ts filtering logic');
      }
    } else {
      console.log('✅ Clinicians are being returned correctly');
      console.log('   The dropdown should work properly in the frontend');
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testClinicianDropdown();
