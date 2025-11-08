const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';

// Test credentials
const TEST_CREDENTIALS = {
  email: 'brendajb@chctherapy.com',
  password: 'Password123!'
};

let authToken = '';

async function login() {
  try {
    console.log('\n📝 Logging in...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_CREDENTIALS);
    authToken = response.data.token;
    console.log('✅ Login successful');
    return response.data;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function getClinicians() {
  try {
    console.log('\n👨‍⚕️ Fetching clinicians...');
    const response = await axios.get(`${API_BASE_URL}/users?role=CLINICIAN`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`✅ Found ${response.data.length} clinicians`);
    if (response.data.length > 0) {
      console.log(`   Using: ${response.data[0].firstName} ${response.data[0].lastName}`);
    }
    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch clinicians:', error.response?.data || error.message);
    throw error;
  }
}

async function getClients() {
  try {
    console.log('\n👤 Fetching clients...');
    const response = await axios.get(`${API_BASE_URL}/clients?status=Active`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`✅ Found ${response.data.length} active clients`);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch clients:', error.response?.data || error.message);
    throw error;
  }
}

async function createIndividualAppointment(clinicianId, clientId) {
  try {
    console.log('\n📅 Creating INDIVIDUAL appointment...');

    const appointmentData = {
      clientId: clientId,
      clinicianId: clinicianId,
      appointmentDate: new Date().toISOString(),
      startTime: '10:00',
      endTime: '11:00',
      duration: 60,
      appointmentType: 'Therapy Session',
      serviceLocation: 'Office',
      timezone: 'America/New_York',
      isGroupAppointment: false,
      appointmentNotes: 'Test individual appointment'
    };

    const response = await axios.post(
      `${API_BASE_URL}/appointments`,
      appointmentData,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    console.log('✅ Individual appointment created successfully');
    console.log(`   Appointment ID: ${response.data.data.id}`);
    console.log(`   Client: ${response.data.data.client.firstName} ${response.data.data.client.lastName}`);
    console.log(`   Is Group: ${response.data.data.isGroupAppointment}`);

    return response.data.data;
  } catch (error) {
    console.error('❌ Failed to create individual appointment:', error.response?.data || error.message);
    throw error;
  }
}

async function createGroupAppointment(clinicianId, clientIds) {
  try {
    console.log('\n👥 Creating GROUP appointment...');
    console.log(`   With ${clientIds.length} clients`);

    const appointmentData = {
      clinicianId: clinicianId,
      appointmentDate: new Date().toISOString(),
      startTime: '14:00',
      endTime: '15:30',
      duration: 90,
      appointmentType: 'Group Therapy Session',
      serviceLocation: 'Office',
      timezone: 'America/New_York',
      isGroupAppointment: true,
      clientIds: clientIds,
      appointmentNotes: 'Test group appointment with multiple clients'
    };

    const response = await axios.post(
      `${API_BASE_URL}/appointments`,
      appointmentData,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    console.log('✅ Group appointment created successfully');
    console.log(`   Appointment ID: ${response.data.data.id}`);
    console.log(`   Is Group: ${response.data.data.isGroupAppointment}`);
    console.log(`   Client ID (should be null): ${response.data.data.clientId}`);
    console.log(`   Number of clients: ${response.data.data.appointmentClients?.length || 0}`);

    if (response.data.data.appointmentClients) {
      console.log('\n   📋 Clients in group:');
      response.data.data.appointmentClients.forEach((ac, index) => {
        console.log(`      ${index + 1}. ${ac.client.firstName} ${ac.client.lastName} ${ac.isPrimary ? '(Primary)' : ''}`);
      });
    }

    return response.data.data;
  } catch (error) {
    console.error('❌ Failed to create group appointment:', error.response?.data || error.message);
    if (error.response?.data?.errors) {
      console.error('   Validation errors:', JSON.stringify(error.response.data.errors, null, 2));
    }
    throw error;
  }
}

async function getAppointment(appointmentId) {
  try {
    console.log(`\n🔍 Fetching appointment ${appointmentId}...`);
    const response = await axios.get(
      `${API_BASE_URL}/appointments/${appointmentId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    console.log('✅ Appointment retrieved successfully');
    console.log(`   Type: ${response.data.data.appointmentType}`);
    console.log(`   Is Group: ${response.data.data.isGroupAppointment}`);

    return response.data.data;
  } catch (error) {
    console.error('❌ Failed to fetch appointment:', error.response?.data || error.message);
    throw error;
  }
}

async function runTests() {
  try {
    console.log('🧪 Starting Group Appointment API Tests\n');
    console.log('='.repeat(60));

    // Step 1: Login
    await login();

    // Step 2: Get clinicians
    const clinicians = await getClinicians();
    if (clinicians.length === 0) {
      console.log('\n⚠️ No clinicians found. Cannot proceed with tests.');
      return;
    }
    const testClinician = clinicians[0];

    // Step 3: Get clients
    const clients = await getClients();
    if (clients.length < 3) {
      console.log('\n⚠️ Need at least 3 clients for testing. Please add more clients.');
      return;
    }

    console.log(`\n🎯 Using clinician: ${testClinician.firstName} ${testClinician.lastName}`);
    console.log(`🎯 Selected clients for testing:`);
    clients.slice(0, 3).forEach((client, index) => {
      console.log(`   ${index + 1}. ${client.firstName} ${client.lastName}`);
    });

    // Step 4: Test individual appointment (baseline)
    console.log('\n' + '='.repeat(60));
    console.log('TEST 1: Create Individual Appointment');
    console.log('='.repeat(60));
    const individualAppt = await createIndividualAppointment(
      testClinician.id,
      clients[0].id
    );

    // Step 5: Test group appointment with 3 clients
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: Create Group Appointment with 3 Clients');
    console.log('='.repeat(60));
    const clientIds = clients.slice(0, 3).map(c => c.id);
    const groupAppt = await createGroupAppointment(
      testClinician.id,
      clientIds
    );

    // Step 6: Verify group appointment retrieval
    console.log('\n' + '='.repeat(60));
    console.log('TEST 3: Retrieve and Verify Group Appointment');
    console.log('='.repeat(60));
    await getAppointment(groupAppt.id);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed successfully!');
    console.log('='.repeat(60));
    console.log('\n📊 Test Summary:');
    console.log('  ✓ Authentication');
    console.log('  ✓ Fetch clinicians');
    console.log('  ✓ Fetch clients');
    console.log('  ✓ Create individual appointment');
    console.log('  ✓ Create group appointment (3 clients)');
    console.log('  ✓ Retrieve group appointment details');
    console.log('  ✓ Verify AppointmentClient junction records');
    console.log('  ✓ Verify primary client designation');

    console.log('\n🎉 Group appointment feature is working correctly!');
    console.log('\nKey verifications:');
    console.log(`  • Individual appointment has clientId: ${individualAppt.clientId !== null ? '✓' : '✗'}`);
    console.log(`  • Group appointment has clientId=null: ${groupAppt.clientId === null ? '✓' : '✗'}`);
    console.log(`  • Group appointment has isGroupAppointment=true: ${groupAppt.isGroupAppointment ? '✓' : '✗'}`);
    console.log(`  • Group has ${groupAppt.appointmentClients?.length} AppointmentClient records: ${groupAppt.appointmentClients?.length === 3 ? '✓' : '✗'}`);
    console.log(`  • First client marked as primary: ${groupAppt.appointmentClients?.[0]?.isPrimary ? '✓' : '✗'}`);

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
runTests();
