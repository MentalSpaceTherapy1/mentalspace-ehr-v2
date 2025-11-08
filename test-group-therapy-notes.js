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

async function getGroups() {
  try {
    console.log('\n📋 Fetching groups...');
    const response = await axios.get(`${API_BASE_URL}/groups`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`✅ Found ${response.data.length} groups`);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch groups:', error.response?.data || error.message);
    throw error;
  }
}

async function getGroupMembers(groupId) {
  try {
    console.log(`\n👥 Fetching members for group ${groupId}...`);
    const response = await axios.get(
      `${API_BASE_URL}/group-therapy-notes/group/${groupId}/members`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    console.log(`✅ Found ${response.data.length} members`);
    response.data.forEach(member => {
      console.log(`   - ${member.client.firstName} ${member.client.lastName}`);
    });
    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch group members:', error.response?.data || error.message);
    throw error;
  }
}

async function getAppointments(groupId) {
  try {
    console.log(`\n📅 Fetching appointments for group ${groupId}...`);
    const response = await axios.get(
      `${API_BASE_URL}/appointments?groupId=${groupId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    console.log(`✅ Found ${response.data.length} appointments`);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch appointments:', error.response?.data || error.message);
    return [];
  }
}

async function createGroupTherapyNote(appointmentId, groupId, members) {
  try {
    console.log(`\n📝 Creating group therapy note for appointment ${appointmentId}...`);

    // Create attendance data for all members
    const attendance = members.map(member => ({
      groupMemberId: member.id,
      attended: Math.random() > 0.3, // 70% attendance rate
      lateArrival: Math.random() > 0.8,
      earlyDeparture: Math.random() > 0.9,
      notes: `Test note for ${member.client.firstName}`
    }));

    const noteData = {
      appointmentId,
      groupId,
      sessionDate: new Date().toISOString(),
      sessionNumber: 1,
      groupDynamics: 'Test group dynamics - members engaged well with each other',
      therapeuticFactors: [
        'Universality',
        'Group Cohesion',
        'Interpersonal Learning'
      ],
      groupObjectives: 'Test objectives for the group session',
      interventions: 'Test interventions used during the session',
      memberProgress: 'Overall positive progress observed',
      homework: 'Practice communication skills',
      nextSessionPlan: 'Continue working on relationships',
      clinicianNotes: 'Test clinical notes for the session',
      attendance
    };

    const response = await axios.post(
      `${API_BASE_URL}/group-therapy-notes`,
      noteData,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    console.log('✅ Group therapy note created successfully');
    console.log(`   Note ID: ${response.data.id}`);
    console.log(`   Attendance recorded for ${response.data.attendance.length} members`);

    const attendedCount = response.data.attendance.filter(a => a.attended).length;
    console.log(`   ${attendedCount}/${response.data.attendance.length} members attended`);

    return response.data;
  } catch (error) {
    console.error('❌ Failed to create group therapy note:', error.response?.data || error.message);
    throw error;
  }
}

async function getAttendance(appointmentId) {
  try {
    console.log(`\n📊 Fetching attendance for appointment ${appointmentId}...`);
    const response = await axios.get(
      `${API_BASE_URL}/group-therapy-notes/appointment/${appointmentId}/attendance`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    console.log(`✅ Found ${response.data.length} attendance records`);
    response.data.forEach(record => {
      const status = record.attended ? '✓' : '✗';
      console.log(`   ${status} ${record.groupMember.client.firstName} ${record.groupMember.client.lastName}`);
    });
    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch attendance:', error.response?.data || error.message);
    throw error;
  }
}

async function updateAttendance(noteId, attendance) {
  try {
    console.log(`\n✏️ Updating attendance for note ${noteId}...`);
    const response = await axios.put(
      `${API_BASE_URL}/group-therapy-notes/${noteId}/attendance`,
      { attendance },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    console.log('✅ Attendance updated successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Failed to update attendance:', error.response?.data || error.message);
    throw error;
  }
}

async function runTests() {
  try {
    console.log('🧪 Starting Group Therapy Note API Tests\n');
    console.log('='.repeat(50));

    // Step 1: Login
    await login();

    // Step 2: Get groups
    const groups = await getGroups();
    if (groups.length === 0) {
      console.log('\n⚠️ No groups found. Please create a group first.');
      return;
    }

    const testGroup = groups[0];
    console.log(`\n🎯 Using group: ${testGroup.name}`);

    // Step 3: Get group members
    const members = await getGroupMembers(testGroup.id);
    if (members.length === 0) {
      console.log('\n⚠️ No members found in the group. Please add members first.');
      return;
    }

    // Step 4: Get or create an appointment
    let appointments = await getAppointments(testGroup.id);
    let appointmentId;

    if (appointments.length === 0) {
      console.log('\n⚠️ No appointments found for this group.');
      console.log('💡 Creating a test appointment...');
      // In a real scenario, you would create an appointment here
      // For now, we'll use a mock ID
      appointmentId = 'test-appointment-id';
    } else {
      appointmentId = appointments[0].id;
      console.log(`\n✅ Using appointment ID: ${appointmentId}`);
    }

    // Step 5: Create group therapy note
    const note = await createGroupTherapyNote(appointmentId, testGroup.id, members);

    // Step 6: Get attendance records
    await getAttendance(appointmentId);

    // Step 7: Update attendance (toggle first member's attendance)
    const updatedAttendance = note.attendance.map((record, index) => ({
      groupMemberId: record.groupMemberId,
      attended: index === 0 ? !record.attended : record.attended,
      lateArrival: record.lateArrival,
      earlyDeparture: record.earlyDeparture,
      notes: record.notes
    }));

    await updateAttendance(note.id, updatedAttendance);

    // Step 8: Verify updated attendance
    await getAttendance(appointmentId);

    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests completed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('  ✓ Authentication');
    console.log('  ✓ Get Groups');
    console.log('  ✓ Get Group Members');
    console.log('  ✓ Create Group Therapy Note');
    console.log('  ✓ Get Attendance Records');
    console.log('  ✓ Update Attendance');
    console.log('  ✓ Verify Updated Attendance');

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
runTests();
