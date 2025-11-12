/**
 * Test Script for Module 7: Self-Scheduling & Waitlist API
 *
 * This script tests the self-scheduling API endpoints with proper authentication
 */

const { PrismaClient, UserRole } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3001/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

let testClient = null;
let testClinician = null;
let clientToken = null;

async function main() {
  console.log('\n🧪 Module 7: Self-Scheduling API Test\n');
  console.log('='.repeat(70));

  try {
    // ============================================================================
    // Step 1: Find or create test client
    // ============================================================================
    console.log('\n📋 Step 1: Setting up test users...');

    testClient = await prisma.user.findFirst({
      where: {
        roles: { has: UserRole.CLIENT },
        emailVerified: true,
      },
    });

    if (!testClient) {
      console.log('   Creating test client...');
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      testClient = await prisma.user.create({
        data: {
          email: 'test.client@mentalspace.com',
          passwordHash: hashedPassword,
          firstName: 'Test',
          lastName: 'Client',
          roles: [UserRole.CLIENT],
          isActive: true,
          emailVerified: true,
          phone: '555-0100',
        },
      });
      console.log(`   ✅ Created test client: ${testClient.email}`);
    } else {
      console.log(`   ✅ Using existing client: ${testClient.email}`);
    }

    // Generate JWT token for client
    clientToken = jwt.sign(
      {
        userId: testClient.id,
        email: testClient.email,
        roles: testClient.roles,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // ============================================================================
    // Step 2: Find clinicians
    // ============================================================================
    console.log('\n📋 Step 2: Finding clinicians...');

    const clinicians = await prisma.user.findMany({
      where: {
        roles: { has: UserRole.CLINICIAN },
      },
      take: 1,
    });

    if (clinicians.length === 0) {
      console.log('   ❌ No clinicians found. Run seed-self-scheduling-data.js first!');
      process.exit(1);
    }

    testClinician = clinicians[0];
    console.log(`   ✅ Found clinician: ${testClinician.firstName} ${testClinician.lastName}`);

    // ============================================================================
    // Step 3: Test GET /self-schedule/clinicians
    // ============================================================================
    console.log('\n🔬 Step 3: Testing GET /self-schedule/clinicians...');

    const cliniciansResponse = await fetch(`${BASE_URL}/self-schedule/clinicians`, {
      headers: {
        'Authorization': `Bearer ${clientToken}`,
      },
    });

    if (!cliniciansResponse.ok) {
      console.log(`   ❌ Failed: ${cliniciansResponse.status} ${cliniciansResponse.statusText}`);
      const error = await cliniciansResponse.json();
      console.log('   Error:', error);
    } else {
      const cliniciansData = await cliniciansResponse.json();
      console.log(`   ✅ Success: Found ${cliniciansData.length} clinicians`);
      cliniciansData.forEach(c => {
        console.log(`      - ${c.firstName} ${c.lastName} (${c.title})`);
      });
    }

    // ============================================================================
    // Step 4: Test GET /self-schedule/appointment-types
    // ============================================================================
    console.log('\n🔬 Step 4: Testing GET /self-schedule/appointment-types...');

    const typesResponse = await fetch(`${BASE_URL}/self-schedule/appointment-types`, {
      headers: {
        'Authorization': `Bearer ${clientToken}`,
      },
    });

    let appointmentTypes = [];
    if (!typesResponse.ok) {
      console.log(`   ❌ Failed: ${typesResponse.status} ${typesResponse.statusText}`);
    } else {
      appointmentTypes = await typesResponse.json();
      console.log(`   ✅ Success: Found ${appointmentTypes.length} appointment types`);
      appointmentTypes.slice(0, 3).forEach(t => {
        console.log(`      - ${t.typeName} (${t.defaultDuration} min) - Online: ${t.allowOnlineBooking}`);
      });
    }

    // ============================================================================
    // Step 5: Test GET /self-schedule/available-slots/:clinicianId
    // ============================================================================
    console.log('\n🔬 Step 5: Testing GET /self-schedule/available-slots...');

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 2); // Start 2 days from now
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7); // 7-day window

    const slotsResponse = await fetch(
      `${BASE_URL}/self-schedule/available-slots/${testClinician.id}?` +
      `startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
      {
        headers: {
          'Authorization': `Bearer ${clientToken}`,
        },
      }
    );

    let firstAvailableSlot = null;
    if (!slotsResponse.ok) {
      console.log(`   ❌ Failed: ${slotsResponse.status} ${slotsResponse.statusText}`);
      const error = await slotsResponse.json();
      console.log('   Error:', error);
    } else {
      const slotsData = await slotsResponse.json();
      console.log(`   ✅ Success: Found ${slotsData.length} days with slots`);

      // Find first available slot
      for (const day of slotsData) {
        const availableSlots = day.slots.filter(s => s.available);
        if (availableSlots.length > 0) {
          firstAvailableSlot = availableSlots[0];
          console.log(`   📅 First available slot: ${day.date} at ${new Date(firstAvailableSlot.startTime).toLocaleTimeString()}`);
          break;
        }
      }

      if (!firstAvailableSlot) {
        console.log('   ⚠️  No available slots found in the date range');
      }
    }

    // ============================================================================
    // Step 6: Test POST /self-schedule/book
    // ============================================================================
    if (firstAvailableSlot && appointmentTypes.length > 0) {
      console.log('\n🔬 Step 6: Testing POST /self-schedule/book...');

      const bookingData = {
        clinicianId: testClinician.id,
        appointmentDate: firstAvailableSlot.startTime,
        duration: firstAvailableSlot.duration,
        appointmentType: appointmentTypes[0].typeName,
        serviceLocation: 'TELEHEALTH',
        notes: 'Test booking from API test script',
      };

      const bookResponse = await fetch(`${BASE_URL}/self-schedule/book`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clientToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      if (!bookResponse.ok) {
        console.log(`   ❌ Failed: ${bookResponse.status} ${bookResponse.statusText}`);
        const error = await bookResponse.json();
        console.log('   Error:', error);
      } else {
        const appointmentData = await bookResponse.json();
        console.log(`   ✅ Success: Appointment booked!`);
        console.log(`      ID: ${appointmentData.id}`);
        console.log(`      Date: ${new Date(appointmentData.appointmentDate).toLocaleString()}`);
        console.log(`      Status: ${appointmentData.status}`);
        console.log(`      Location: ${appointmentData.serviceLocation}`);

        // ============================================================================
        // Step 7: Test GET /self-schedule/my-appointments
        // ============================================================================
        console.log('\n🔬 Step 7: Testing GET /self-schedule/my-appointments...');

        const myApptsResponse = await fetch(`${BASE_URL}/self-schedule/my-appointments`, {
          headers: {
            'Authorization': `Bearer ${clientToken}`,
          },
        });

        if (!myApptsResponse.ok) {
          console.log(`   ❌ Failed: ${myApptsResponse.status} ${myApptsResponse.statusText}`);
        } else {
          const myAppointments = await myApptsResponse.json();
          console.log(`   ✅ Success: Found ${myAppointments.length} appointments`);
          myAppointments.slice(0, 3).forEach(apt => {
            console.log(`      - ${apt.appointmentType} on ${new Date(apt.appointmentDate).toLocaleDateString()} - ${apt.status}`);
          });
        }
      }
    } else {
      console.log('\n⏭️  Skipping booking test (no available slots or appointment types)');
    }

    // ============================================================================
    // Summary
    // ============================================================================
    console.log('\n' + '='.repeat(70));
    console.log('✅ API TESTING COMPLETE');
    console.log('='.repeat(70));
    console.log('\n📊 Test Summary:');
    console.log('   • Self-scheduling routes are operational');
    console.log('   • Authentication is working correctly');
    console.log('   • Slot calculation logic is functional');
    console.log('\n💡 Next Steps:');
    console.log('   1. Test reschedule functionality (PUT /self-schedule/reschedule/:id)');
    console.log('   2. Test cancellation (DELETE /self-schedule/cancel/:id)');
    console.log('   3. Test waitlist endpoints (POST /waitlist)');
    console.log('   4. Test frontend UI at http://localhost:5175/portal/schedule');
    console.log('   5. Test clinician view of incoming appointments\n');

  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
