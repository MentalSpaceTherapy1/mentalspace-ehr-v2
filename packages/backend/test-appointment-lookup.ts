/**
 * Test Appointment Lookup in AdvancedMD
 *
 * Phase 3: Appointment Synchronization
 * Tests basic appointment lookup functionality
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { AdvancedMDAppointmentSyncService } from './src/integrations/advancedmd/appointment-sync.service';

async function testAppointmentLookup() {
  console.log('🔍 Testing AdvancedMD Appointment Lookup\n');

  try {
    const appointmentSync = new AdvancedMDAppointmentSyncService();

    console.log('1. Initializing appointment sync service...');
    await appointmentSync.initialize();
    console.log('✅ Initialized\n');

    // Test 1: Get appointments by date range
    console.log('2. Testing get appointments by date range...');
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const startDate = formatDateForAMD(today);
    const endDate = formatDateForAMD(nextWeek);

    console.log(`   Date range: ${startDate} to ${endDate}`);

    const appointments = await appointmentSync.getAppointments(startDate, endDate);

    console.log(`✅ Found ${appointments.length} appointment(s)\n`);

    if (appointments.length > 0) {
      console.log('   Sample appointments:');
      appointments.slice(0, 3).forEach((appt, index) => {
        console.log(`   ${index + 1}. Visit ID: ${appt.visitId || 'N/A'}`);
        console.log(`      Date: ${appt.appointmentDate}`);
        console.log(`      Patient ID: ${appt.patientId}`);
        console.log(`      Provider ID: ${appt.providerId}`);
        console.log(`      Status: ${appt.status || 'N/A'}`);
        console.log('');
      });

      // Test 2: Get specific appointment by ID
      const firstVisitId = appointments[0].visitId;
      if (firstVisitId) {
        console.log('3. Testing get appointment by visit ID...');
        console.log(`   Visit ID: ${firstVisitId}`);

        const result = await appointmentSync.getAppointmentById(firstVisitId);

        if (result.found) {
          console.log('✅ Appointment found by ID');
          console.log('   Details:', JSON.stringify(result.visitData, null, 2));
        } else {
          console.log('❌ Appointment not found by ID (unexpected)');
        }
      }
    }

    console.log('\n🎉 Appointment lookup test completed!');
  } catch (error: any) {
    console.error('\n❌ Appointment lookup test failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Format Date object to AdvancedMD date string (MM/DD/YYYY)
 */
function formatDateForAMD(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

testAppointmentLookup();
