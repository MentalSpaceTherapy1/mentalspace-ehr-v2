const axios = require('axios');

async function testAppointmentCreationViaAPI() {
  try {
    console.log('Testing appointment creation via API...\n');

    // First, login as admin to get JWT token
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      email: 'admin@mentalspace.com',
      password: 'SecureAdmin123!'
    });

    const { token } = loginResponse.data;
    console.log('✅ Login successful, got JWT token\n');

    // Set up headers with JWT token
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Create appointment data matching the frontend form
    const appointmentData = {
      appointmentDate: '2025-01-10T14:00:00.000Z',
      startTime: '14:00',
      endTime: '15:00',
      duration: 60,
      appointmentType: 'Telehealth',
      serviceLocation: 'Telehealth',
      timezone: 'America/New_York',
      clientId: 'ec66e7d0-58ac-4062-9e02-2a87f88e8ead', // Kevin Johnson
      clinicianId: '3b8e0405-d629-407f-ab40-c77f8b83527e', // Dr. Sarah Johnson
      cptCode: '90837',
      appointmentNotes: 'Test appointment created via API',
      isGroupAppointment: false
    };

    console.log('2. Creating appointment...');
    console.log('Data:', JSON.stringify(appointmentData, null, 2));

    const appointmentResponse = await axios.post(
      'http://localhost:3001/api/v1/appointments',
      appointmentData,
      { headers }
    );

    console.log('\n✅ SUCCESS! Appointment created via API');
    console.log('Response:', JSON.stringify(appointmentResponse.data, null, 2));

    // Extract appointment ID
    const appointmentId = appointmentResponse.data.appointment?.id || appointmentResponse.data.data?.id;
    console.log('\n📅 Appointment ID:', appointmentId);

    // Create telehealth session
    if (appointmentId) {
      console.log('\n3. Creating telehealth session...');
      try {
        const telehealthResponse = await axios.post(
          'http://localhost:3001/api/v1/telehealth/sessions',
          { appointmentId },
          { headers }
        );
        console.log('✅ Telehealth session created:', telehealthResponse.data);
      } catch (telehealthError) {
        console.log('⚠️ Telehealth session creation failed:', telehealthError.response?.data?.message || telehealthError.message);
      }
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.response?.data || error.message);

    if (error.response?.status === 400 && error.response?.data?.message?.includes('authentication context')) {
      console.error('\n🔍 The userId issue is still present. The backend is not properly extracting the user ID.');
      console.error('Debug info from error:', error.response?.data);
    }
  }
}

testAppointmentCreationViaAPI();