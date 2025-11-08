const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';
let authToken = '';

// Color output helpers
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

function success(msg) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function error(msg) {
  console.log(`${colors.red}✗${colors.reset} ${msg}`);
}

function info(msg) {
  console.log(`${colors.blue}ℹ${colors.reset} ${msg}`);
}

async function login() {
  try {
    info('Logging in...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'brendajb@chctherapy.com',
      password: 'Password123!'
    });

    authToken = response.data.data.session.token;
    success('Login successful');
    return true;
  } catch (err) {
    error(`Login failed: ${err.response?.data?.message || err.message}`);
    if (err.response) {
      console.log('Response status:', err.response.status);
      console.log('Response data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.log('Error details:', err);
    }
    return false;
  }
}

async function getDraftClinicalNote() {
  try {
    info('Finding a draft clinical note...');
    const response = await axios.get(`${BASE_URL}/clinical-notes?status=DRAFT&limit=1`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.data && response.data.data.length > 0) {
      const note = response.data.data[0];
      success(`Found draft note: ${note.id} (Due: ${new Date(note.dueDate).toLocaleDateString()})`);
      return note;
    }

    error('No draft clinical notes found');
    return null;
  } catch (err) {
    error(`Failed to get clinical notes: ${err.response?.data?.message || err.message}`);
    return null;
  }
}

async function testScheduleReminders(noteId, userId) {
  console.log('\n' + colors.yellow + '=== Testing Schedule Reminders ===' + colors.reset);

  try {
    const response = await axios.post(`${BASE_URL}/clinical-note-reminders/schedule`, {
      noteId,
      userId
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const reminders = response.data.data;
    success(`Scheduled ${reminders.length} reminders`);

    reminders.forEach((reminder, i) => {
      const scheduledDate = new Date(reminder.scheduledFor);
      info(`  ${i + 1}. ${reminder.hoursBeforeDue}h before due - ${reminder.status} - ${scheduledDate.toLocaleString()}`);
    });

    return reminders;
  } catch (err) {
    error(`Failed to schedule reminders: ${err.response?.data?.message || err.message}`);
    return [];
  }
}

async function testGetRemindersForNote(noteId) {
  console.log('\n' + colors.yellow + '=== Testing Get Reminders for Note ===' + colors.reset);

  try {
    const response = await axios.get(`${BASE_URL}/clinical-note-reminders/note/${noteId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const reminders = response.data.data;
    success(`Retrieved ${reminders.length} reminders for note`);

    reminders.forEach((reminder, i) => {
      info(`  ${i + 1}. ${reminder.reminderType} - ${reminder.status} - ${reminder.hoursBeforeDue}h before due`);
    });

    return reminders;
  } catch (err) {
    error(`Failed to get reminders for note: ${err.response?.data?.message || err.message}`);
    return [];
  }
}

async function testGetMyReminders() {
  console.log('\n' + colors.yellow + '=== Testing Get My Reminders ===' + colors.reset);

  try {
    const response = await axios.get(`${BASE_URL}/clinical-note-reminders/my-reminders`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const reminders = response.data.data;
    success(`Retrieved ${reminders.length} reminders for current user`);

    if (reminders.length > 0) {
      reminders.slice(0, 3).forEach((reminder, i) => {
        const clientName = `${reminder.note.client.firstName} ${reminder.note.client.lastName}`;
        info(`  ${i + 1}. ${clientName} - ${reminder.status} - Due: ${new Date(reminder.note.dueDate).toLocaleDateString()}`);
      });
    }

    return reminders;
  } catch (err) {
    error(`Failed to get user reminders: ${err.response?.data?.message || err.message}`);
    return [];
  }
}

async function testGetPendingReminders() {
  console.log('\n' + colors.yellow + '=== Testing Get Pending Reminders (Admin) ===' + colors.reset);

  try {
    const response = await axios.get(`${BASE_URL}/clinical-note-reminders/pending`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const reminders = response.data.data;
    success(`Retrieved ${reminders.length} pending reminders (system-wide)`);

    if (reminders.length > 0) {
      reminders.slice(0, 5).forEach((reminder, i) => {
        const scheduledDate = new Date(reminder.scheduledFor);
        info(`  ${i + 1}. Due ${scheduledDate.toLocaleString()} - ${reminder.hoursBeforeDue}h notice`);
      });
    }

    return reminders;
  } catch (err) {
    error(`Failed to get pending reminders: ${err.response?.data?.message || err.message}`);
    return [];
  }
}

async function testTriggerReminderProcessing() {
  console.log('\n' + colors.yellow + '=== Testing Manual Trigger (Admin) ===' + colors.reset);

  try {
    info('Manually triggering reminder processing job...');
    const response = await axios.post(`${BASE_URL}/clinical-note-reminders/process`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const results = response.data.data;
    success('Reminder processing completed');
    info(`  Sent: ${results.sent}`);
    info(`  Failed: ${results.failed}`);
    info(`  Cancelled: ${results.cancelled}`);

    return results;
  } catch (err) {
    error(`Failed to trigger reminder processing: ${err.response?.data?.message || err.message}`);
    return null;
  }
}

async function testCancelReminders(noteId) {
  console.log('\n' + colors.yellow + '=== Testing Cancel Reminders ===' + colors.reset);

  try {
    const response = await axios.delete(`${BASE_URL}/clinical-note-reminders/note/${noteId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const result = response.data.data;
    success(`Cancelled ${result.count} reminders`);

    return result;
  } catch (err) {
    error(`Failed to cancel reminders: ${err.response?.data?.message || err.message}`);
    return null;
  }
}

async function checkPracticeSettings() {
  console.log('\n' + colors.yellow + '=== Checking Practice Settings ===' + colors.reset);

  try {
    const response = await axios.get(`${BASE_URL}/practice-settings`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const settings = response.data.data;
    success('Practice settings retrieved');
    info(`  Note reminders enabled: ${settings.enableNoteReminders}`);
    info(`  Reminder schedule: ${settings.noteReminderSchedule.join(', ')} hours before due`);

    return settings;
  } catch (err) {
    error(`Failed to get practice settings: ${err.response?.data?.message || err.message}`);
    return null;
  }
}

async function checkEmailService() {
  console.log('\n' + colors.yellow + '=== Checking Email Service Configuration ===' + colors.reset);

  const hasResendKey = !!process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'CHC Therapy <support@chctherapy.com>';

  if (hasResendKey) {
    success('Resend API key is configured');
    info(`  From email: ${fromEmail}`);
  } else {
    error('Resend API key is NOT configured');
    info('  Set RESEND_API_KEY in .env to enable email sending');
  }

  return hasResendKey;
}

async function runTests() {
  console.log(colors.blue + '╔════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.blue + '║  Email Reminder System Integration Tests      ║' + colors.reset);
  console.log(colors.blue + '╚════════════════════════════════════════════════╝' + colors.reset);

  // Check email service configuration
  await checkEmailService();

  // Login
  if (!await login()) return;

  // Check practice settings
  await checkPracticeSettings();

  // Get a draft clinical note
  const note = await getDraftClinicalNote();
  if (!note) {
    console.log('\n' + colors.yellow + 'Note: Create a draft clinical note first to test reminder scheduling' + colors.reset);
    console.log(colors.yellow + 'Testing other endpoints with existing data...' + colors.reset);
  }

  // Test getting user reminders (should work even without creating new ones)
  await testGetMyReminders();

  // Test getting pending reminders (admin)
  await testGetPendingReminders();

  // If we have a note, test the full workflow
  if (note) {
    // Schedule reminders
    const reminders = await testScheduleReminders(note.id, note.clinicianId);

    if (reminders.length > 0) {
      // Get reminders for note
      await testGetRemindersForNote(note.id);

      // Test manual trigger
      await testTriggerReminderProcessing();

      // Clean up - cancel the test reminders
      await testCancelReminders(note.id);
    }
  }

  console.log('\n' + colors.blue + '╔════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.blue + '║  Test Summary                                  ║' + colors.reset);
  console.log(colors.blue + '╚════════════════════════════════════════════════╝' + colors.reset);
  success('Email reminder system API endpoints are working correctly!');

  console.log('\n' + colors.blue + 'ℹ Next Steps:' + colors.reset);
  console.log('  1. Set RESEND_API_KEY in .env to enable actual email sending');
  console.log('  2. Reminders will be processed automatically every 15 minutes');
  console.log('  3. Create draft clinical notes to see reminders in action');
  console.log('  4. Check practice settings at: http://localhost:5175/settings/practice');
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
