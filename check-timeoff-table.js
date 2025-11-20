const { PrismaClient } = require('@mentalspace/database');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr'
    }
  }
});

async function checkTimeOffTable() {
  try {
    console.log('=== Checking time_off_requests Table Status ===\n');

    // Check if table exists
    console.log('1. Checking if time_off_requests table exists...');
    const tableCheck = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'time_off_requests'
      ) as exists;
    `;

    const tableExists = tableCheck[0]?.exists;
    console.log(`   Table exists: ${tableExists ? '✅ YES' : '❌ NO'}\n`);

    if (tableExists) {
      // Count records
      console.log('2. Counting time-off requests...');
      const count = await prisma.timeOffRequest.count();
      console.log(`   Total requests: ${count}\n`);

      if (count > 0) {
        console.log('3. Fetching recent requests...');
        const recent = await prisma.timeOffRequest.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            provider: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        });

        recent.forEach((req, idx) => {
          console.log(`   Request ${idx + 1}:`);
          console.log(`     - ID: ${req.id}`);
          console.log(`     - Provider: ${req.provider.firstName} ${req.provider.lastName}`);
          console.log(`     - Dates: ${req.startDate.toLocaleDateString()} - ${req.endDate.toLocaleDateString()}`);
          console.log(`     - Status: ${req.status}`);
          console.log(`     - Created: ${req.createdAt.toLocaleString()}`);
        });
      }
    } else {
      console.log('⚠️  Table does not exist in production database');
      console.log('   The Time-Off Request feature needs to be migrated to production.\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error('   Error Code:', error.code);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkTimeOffTable();
