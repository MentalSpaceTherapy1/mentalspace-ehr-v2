const axios = require('axios');

async function testProviderComparison() {
  try {
    console.log('🧪 Testing Provider Comparison API\n');

    // Step 1: Login
    console.log('1️⃣  Logging in...');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      email: 'superadmin@mentalspace.com',
      password: 'Password123!'
    });
    const token = loginResponse.data.data.session.token;
    console.log('✅ Login successful\n');

    // Step 2: Get all clinicians
    console.log('2️⃣  Fetching all clinicians...');
    const cliniciansResponse = await axios.get('http://localhost:3001/api/v1/users?role=CLINICIAN', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const clinicians = cliniciansResponse.data.data;
    console.log(`✅ Found ${clinicians.length} clinicians:`);
    clinicians.forEach(c => {
      console.log(`   - ${c.firstName} ${c.lastName} (ID: ${c.id})`);
    });
    console.log('');

    // Step 3: Get 4 clinician IDs
    const providerIds = clinicians.slice(0, 4).map(c => c.id);
    console.log('3️⃣  Testing with these 4 providers:');
    providerIds.forEach((id, idx) => {
      const clinician = clinicians.find(c => c.id === id);
      console.log(`   ${idx + 1}. ${clinician.firstName} ${clinician.lastName} (${id})`);
    });
    console.log('');

    // Step 4: Call provider comparison API
    console.log('4️⃣  Calling provider comparison API...');
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const params = new URLSearchParams({
      providerIds: providerIds.join(','),
      startDate: today,
      endDate: tomorrow,
      viewType: 'day'
    });

    console.log(`   URL: http://localhost:3001/api/v1/appointments/provider-comparison?${params.toString()}\n`);

    const comparisonResponse = await axios.get(
      `http://localhost:3001/api/v1/appointments/provider-comparison?${params.toString()}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    const data = comparisonResponse.data.data;

    console.log('📊 API Response:');
    console.log(`   Total Providers Requested: ${providerIds.length}`);
    console.log(`   Total Providers in Response: ${data.providerSchedules.length}`);
    console.log(`   Total Appointments: ${data.summary.totalAppointments}\n`);

    console.log('5️⃣  Provider Schedules:');
    data.providerSchedules.forEach((schedule, idx) => {
      console.log(`   ${idx + 1}. Provider ID: ${schedule.providerId}`);
      console.log(`      Provider Name: ${schedule.provider ? `${schedule.provider.firstName} ${schedule.provider.lastName}` : 'NULL'}`);
      console.log(`      Total Appointments: ${schedule.totalAppointments}`);
      console.log(`      Confirmed: ${schedule.confirmedCount}, Pending: ${schedule.pendingCount}`);

      if (schedule.appointments.length > 0) {
        console.log(`      Appointments:`);
        schedule.appointments.forEach(apt => {
          console.log(`        - ${apt.startTime}-${apt.endTime}: ${apt.clientName} (${apt.appointmentType})`);
        });
      }
      console.log('');
    });

    // Step 6: Verify issue
    console.log('6️⃣  Issue Analysis:');
    const nullProviders = data.providerSchedules.filter(s => s.provider === null);
    if (nullProviders.length > 0) {
      console.log(`   ❌ ISSUE FOUND: ${nullProviders.length} provider(s) have NULL provider data`);
      console.log(`   These providers have no appointments in the date range:`);
      nullProviders.forEach(s => {
        console.log(`      - Provider ID: ${s.providerId} (${s.totalAppointments} appointments)`);
      });
      console.log('\n   This is why they don\'t show up in the UI!');
    } else {
      console.log('   ✅ All providers have valid provider data');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testProviderComparison();
