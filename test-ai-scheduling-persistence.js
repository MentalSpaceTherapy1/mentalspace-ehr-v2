const axios = require('axios');

async function testAISchedulingPersistence() {
  try {
    console.log('🧪 Testing AI Scheduling Persistence\n');

    // Step 1: Login (using super admin)
    console.log('1️⃣  Logging in...');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      email: 'superadmin@mentalspace.com',
      password: 'Password123!'
    });
    const token = loginResponse.data.data.session.token;
    console.log('✅ Login successful\n');

    // Step 2: Get a client and provider
    console.log('2️⃣  Fetching clients and providers...');
    const clientsResponse = await axios.get('http://localhost:3001/api/v1/clients', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const client = clientsResponse.data.data[0];

    const providersResponse = await axios.get('http://localhost:3001/api/v1/users?role=CLINICIAN', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const provider = providersResponse.data.data[0];

    console.log(`✅ Found client: ${client.firstName} ${client.lastName} (ID: ${client.id})`);
    console.log(`✅ Found provider: ${provider.firstName} ${provider.lastName} (ID: ${provider.id})\n`);

    // Step 3: Count appointments before
    console.log('3️⃣  Counting appointments before...');
    const appointmentsBeforeResponse = await axios.get('http://localhost:3001/api/v1/appointments', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const appointmentsBefore = appointmentsBeforeResponse.data.data.length;
    console.log(`📊 Appointments before: ${appointmentsBefore}\n`);

    // Step 4: Make AI scheduling request
    console.log('4️⃣  Making AI scheduling request...');
    const schedulingRequest = `Schedule an appointment for ${client.firstName} ${client.lastName} tomorrow at 2pm with ${provider.firstName} ${provider.lastName}`;
    console.log(`   Request: "${schedulingRequest}"`);

    const nlpResponse = await axios.post('http://localhost:3001/api/v1/ai-scheduling/nlp/execute', {
      request: schedulingRequest
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('\n📋 NLP Response:');
    console.log(JSON.stringify(nlpResponse.data, null, 2));

    // Step 5: Count appointments after
    console.log('\n5️⃣  Counting appointments after...');
    const appointmentsAfterResponse = await axios.get('http://localhost:3001/api/v1/appointments', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const appointmentsAfter = appointmentsAfterResponse.data.data.length;
    console.log(`📊 Appointments after: ${appointmentsAfter}`);

    // Step 6: Verify persistence
    console.log('\n6️⃣  Verification:');
    if (appointmentsAfter > appointmentsBefore) {
      console.log('✅ SUCCESS! Appointment was created and persisted!');
      console.log(`   ${appointmentsAfter - appointmentsBefore} new appointment(s) added\n`);

      // Show the new appointment details
      const newAppointments = appointmentsAfterResponse.data.data.slice(appointmentsBefore);
      console.log('📅 New Appointment Details:');
      newAppointments.forEach(apt => {
        console.log(`   Client: ${apt.client?.firstName} ${apt.client?.lastName}`);
        console.log(`   Provider: ${apt.provider?.firstName} ${apt.provider?.lastName}`);
        console.log(`   Date: ${apt.date}`);
        console.log(`   Time: ${apt.startTime} - ${apt.endTime}`);
        console.log(`   Status: ${apt.status}`);
      });
    } else {
      console.log('❌ FAILURE! No new appointment was created');
      console.log('   Appointments still not persisting!\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testAISchedulingPersistence();
