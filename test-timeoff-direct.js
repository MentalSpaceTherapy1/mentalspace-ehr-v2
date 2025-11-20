const { PrismaClient } = require('@mentalspace/database');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr'
    }
  }
});

async function testTimeOffRequest() {
  try {
    console.log('=== Testing Time-Off Request Feature (Direct Database) ===\n');

    // Step 1: Get users
    console.log('Step 1: Getting users...');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true
      }
    });

    const admin = users.find(u => u.email === 'admin@mentalspace.com');
    const clinician = users.find(u => u.email === 'clinician1@mentalspace.com');

    if (!admin || !clinician) {
      console.error('❌ Could not find required users');
      return;
    }

    console.log('✅ Found users:');
    console.log('   Admin:', admin.firstName, admin.lastName, `(${admin.id})`);
    console.log('   Clinician:', clinician.firstName, clinician.lastName, `(${clinician.id})\n`);

    // Step 2: Check if time_off_requests table exists
    console.log('Step 2: Checking if time_off_requests table exists...');
    const tableCheck = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'time_off_requests'
      ) as exists;
    `;

    if (!tableCheck[0]?.exists) {
      console.error('❌ time_off_requests table does not exist in production database');
      console.log('   The Time-Off Request feature has not been deployed to production yet.\n');
      return;
    }

    console.log('✅ time_off_requests table exists\n');

    // Step 3: Create time-off request
    console.log('Step 3: Creating time-off request...');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7); // 1 week from now
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 3); // 3-day time off

    console.log('   Request data:');
    console.log('   - Provider:', clinician.firstName, clinician.lastName);
    console.log('   - Requested by:', admin.firstName, admin.lastName);
    console.log('   - Start:', startDate.toLocaleDateString());
    console.log('   - End:', endDate.toLocaleDateString());
    console.log('   - Reason: VACATION');
    console.log('   - Status: PENDING\n');

    const timeOffRequest = await prisma.timeOffRequest.create({
      data: {
        providerId: clinician.id,
        startDate: startDate,
        endDate: endDate,
        reason: 'VACATION',
        notes: 'Test time-off request from automated testing',
        status: 'PENDING',
        requestedBy: admin.id,
        autoReschedule: false,
      },
      include: {
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    console.log('✅ Time-off request created successfully!\n');
    console.log('📋 Request Details:');
    console.log('   ID:', timeOffRequest.id);
    console.log('   Provider:', timeOffRequest.provider.firstName, timeOffRequest.provider.lastName);
    console.log('   Requested By:', timeOffRequest.requester.firstName, timeOffRequest.requester.lastName);
    console.log('   Status:', timeOffRequest.status);
    console.log('   Start Date:', timeOffRequest.startDate.toLocaleDateString());
    console.log('   End Date:', timeOffRequest.endDate.toLocaleDateString());
    console.log('   Reason:', timeOffRequest.reason);
    console.log('   Notes:', timeOffRequest.notes);
    console.log('   Created At:', timeOffRequest.createdAt);

    // Step 4: Verify we can retrieve it
    console.log('\nStep 4: Verifying retrieval...');
    const retrieved = await prisma.timeOffRequest.findUnique({
      where: { id: timeOffRequest.id },
      include: {
        provider: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (retrieved) {
      console.log('✅ Successfully retrieved the time-off request');
      console.log('   Provider:', retrieved.provider.firstName, retrieved.provider.lastName);
      console.log('   Status:', retrieved.status);
    }

    // Step 5: Check all time-off requests for this provider
    console.log('\nStep 5: Getting all time-off requests for provider...');
    const allRequests = await prisma.timeOffRequest.findMany({
      where: {
        providerId: clinician.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`✅ Found ${allRequests.length} total time-off request(s) for ${clinician.firstName} ${clinician.lastName}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error('   Error Code:', error.code);
    }
    if (error.meta) {
      console.error('   Meta:', error.meta);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testTimeOffRequest();
