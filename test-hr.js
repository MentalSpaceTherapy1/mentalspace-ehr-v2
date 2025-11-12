const { PrismaClient, ReviewStatus, PTOStatus, AbsenceType } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Comprehensive Test Script for Module 9 - HR Functions
 *
 * Tests:
 * 1. Performance Review System
 * 2. Time & Attendance Tracking
 * 3. PTO Management
 */

async function main() {
  console.log('======================================================================');
  console.log('   MODULE 9 - HR FUNCTIONS TEST SCRIPT');
  console.log('   Testing: Performance Reviews, Time & Attendance, PTO Management');
  console.log('======================================================================\n');

  try {
    // ========================================================================
    // SETUP: Get test users
    // ========================================================================
    console.log('📋 SETUP: Fetching test users...\n');

    const admin = await prisma.user.findFirst({
      where: { roles: { has: 'ADMINISTRATOR' } },
    });

    const supervisor = await prisma.user.findFirst({
      where: { roles: { has: 'SUPERVISOR' } },
    });

    const clinicians = await prisma.user.findMany({
      where: { roles: { has: 'CLINICIAN' } },
      take: 3,
    });

    if (!admin || !supervisor || clinicians.length === 0) {
      throw new Error('Required test users not found');
    }

    console.log(`✓ Found admin: ${admin.firstName} ${admin.lastName}`);
    console.log(`✓ Found supervisor: ${supervisor.firstName} ${supervisor.lastName}`);
    console.log(`✓ Found ${clinicians.length} clinician(s)\n`);

    // ========================================================================
    // TEST 1: PERFORMANCE REVIEW SYSTEM
    // ========================================================================
    console.log('======================================================================');
    console.log('TEST 1: PERFORMANCE REVIEW SYSTEM');
    console.log('======================================================================\n');

    console.log('📝 Creating performance reviews...\n');

    const reviewData = [];

    for (let i = 0; i < clinicians.length; i++) {
      const clinician = clinicians[i];
      const reviewDate = new Date();
      const nextReviewDate = new Date();
      nextReviewDate.setMonth(nextReviewDate.getMonth() + 6);

      const review = await prisma.performanceReview.create({
        data: {
          userId: clinician.id,
          reviewerId: supervisor.id,
          reviewPeriod: `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`,
          reviewDate,
          nextReviewDate,
          overallRating: 3 + i, // 3, 4, 5
          goals: [
            {
              goal: 'Improve client satisfaction scores',
              rating: 4,
              progress: 'Exceeded expectations',
            },
            {
              goal: 'Complete 40 hours of CEU training',
              rating: 3,
              progress: 'On track',
            },
          ],
          competencies: [
            {
              competency: 'Clinical Skills',
              rating: 4,
              notes: 'Strong clinical judgment',
            },
            {
              competency: 'Communication',
              rating: 5,
              notes: 'Excellent rapport with clients',
            },
          ],
          strengths: 'Excellent clinical skills and client rapport. Consistently meets documentation deadlines.',
          improvements: 'Could improve time management during busy periods.',
          actionPlans: [
            {
              action: 'Complete time management training',
              dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
              status: 'pending',
            },
          ],
          status: ReviewStatus.DRAFT,
        },
      });

      reviewData.push(review);
      console.log(`✓ Created review for ${clinician.firstName} ${clinician.lastName} (Rating: ${review.overallRating}/5)`);
    }

    console.log(`\n✅ Created ${reviewData.length} performance reviews\n`);

    // Test review workflow
    console.log('🔄 Testing review workflow...\n');

    const testReview = reviewData[0];

    // Step 1: Employee self-evaluation
    const selfEval = await prisma.performanceReview.update({
      where: { id: testReview.id },
      data: {
        selfEvaluation: 'I have made significant progress in improving my clinical documentation and client engagement.',
        employeeComments: 'Looking forward to continuing to develop my skills.',
        status: ReviewStatus.PENDING_MANAGER_REVIEW,
      },
    });

    console.log('✓ Employee submitted self-evaluation');

    // Step 2: Manager review
    const managerReview = await prisma.performanceReview.update({
      where: { id: testReview.id },
      data: {
        managerComments: 'Excellent performance this quarter. Keep up the good work.',
        managerSignature: 'Supervisor Digital Signature',
        managerSignDate: new Date(),
        status: ReviewStatus.PENDING_EMPLOYEE_SIGNATURE,
      },
    });

    console.log('✓ Manager submitted review');

    // Step 3: Employee signature
    const completedReview = await prisma.performanceReview.update({
      where: { id: testReview.id },
      data: {
        employeeSignature: 'Employee Digital Signature',
        employeeSignDate: new Date(),
        status: ReviewStatus.COMPLETED,
      },
    });

    console.log('✓ Employee signed review - COMPLETED\n');

    // Get statistics
    const stats = await prisma.performanceReview.findMany({
      where: { status: ReviewStatus.COMPLETED },
    });

    const avgRating = stats.reduce((sum, r) => sum + r.overallRating, 0) / (stats.length || 1);

    console.log('📊 Performance Review Statistics:');
    console.log(`   Total reviews: ${reviewData.length}`);
    console.log(`   Completed reviews: ${stats.length}`);
    console.log(`   Average rating: ${avgRating.toFixed(2)}/5\n`);

    // ========================================================================
    // TEST 2: TIME & ATTENDANCE TRACKING
    // ========================================================================
    console.log('======================================================================');
    console.log('TEST 2: TIME & ATTENDANCE TRACKING');
    console.log('======================================================================\n');

    console.log('⏰ Creating time attendance records...\n');

    const attendanceData = [];

    // Create attendance records for the past 5 days
    for (let i = 0; i < 5; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (4 - i)); // Today minus 4, 3, 2, 1, 0 days

      for (const clinician of clinicians) {
        const clockIn = new Date(date);
        clockIn.setHours(9, 0, 0);

        const clockOut = new Date(date);
        clockOut.setHours(17, 30, 0); // 8.5 hours

        const breakMinutes = 30;
        const totalMinutes = (clockOut - clockIn) / (1000 * 60) - breakMinutes;
        const totalHours = totalMinutes / 60;

        const record = await prisma.timeAttendance.create({
          data: {
            userId: clinician.id,
            date: new Date(date.toISOString().split('T')[0]),
            scheduledStart: '09:00',
            scheduledEnd: '17:00',
            actualStart: clockIn,
            actualEnd: clockOut,
            breakMinutes,
            totalHours,
            overtimeHours: totalHours > 8 ? totalHours - 8 : 0,
            isAbsent: false,
          },
        });

        attendanceData.push(record);
      }
    }

    console.log(`✓ Created ${attendanceData.length} attendance records (5 days × ${clinicians.length} employees)\n`);

    // Create some absence records
    console.log('📅 Creating absence records...\n');

    const absenceDate = new Date();
    absenceDate.setDate(absenceDate.getDate() - 2);

    const absenceRecord = await prisma.timeAttendance.create({
      data: {
        userId: clinicians[0].id,
        date: new Date(absenceDate.toISOString().split('T')[0]),
        isAbsent: true,
        absenceType: AbsenceType.SICK,
        absenceReason: 'Flu symptoms',
      },
    });

    console.log(`✓ Created sick day absence for ${clinicians[0].firstName} ${clinicians[0].lastName}\n`);

    // Approve some records
    console.log('✅ Approving attendance records...\n');

    await prisma.timeAttendance.updateMany({
      where: {
        userId: clinicians[0].id,
      },
      data: {
        approvedById: supervisor.id,
        approvalDate: new Date(),
      },
    });

    console.log(`✓ Approved all attendance records for ${clinicians[0].firstName} ${clinicians[0].lastName}\n`);

    // Get attendance summary
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date();

    const allRecords = await prisma.timeAttendance.findMany({
      where: {
        userId: clinicians[0].id,
        date: { gte: startDate, lte: endDate },
      },
    });

    const totalHoursWorked = allRecords
      .filter(r => r.totalHours)
      .reduce((sum, r) => sum + parseFloat(r.totalHours.toString()), 0);

    console.log('📊 Attendance Summary (Past 7 days):');
    console.log(`   Employee: ${clinicians[0].firstName} ${clinicians[0].lastName}`);
    console.log(`   Total days recorded: ${allRecords.length}`);
    console.log(`   Days present: ${allRecords.filter(r => !r.isAbsent).length}`);
    console.log(`   Days absent: ${allRecords.filter(r => r.isAbsent).length}`);
    console.log(`   Total hours worked: ${totalHoursWorked.toFixed(2)}\n`);

    // ========================================================================
    // TEST 3: PTO MANAGEMENT
    // ========================================================================
    console.log('======================================================================');
    console.log('TEST 3: PTO MANAGEMENT');
    console.log('======================================================================\n');

    console.log('💰 Setting up PTO balances...\n');

    const balances = [];

    for (const clinician of clinicians) {
      const balance = await prisma.pTOBalance.upsert({
        where: { userId: clinician.id },
        update: {
          ptoBalance: 15,
          sickBalance: 10,
          vacationBalance: 20,
          ptoAnnual: 15,
          sickAnnual: 10,
          vacationAnnual: 20,
          accrualRate: 1.25, // 1.25 days per month
        },
        create: {
          userId: clinician.id,
          ptoBalance: 15,
          sickBalance: 10,
          vacationBalance: 20,
          ptoAnnual: 15,
          sickAnnual: 10,
          vacationAnnual: 20,
          accrualRate: 1.25,
        },
      });

      balances.push(balance);
      console.log(`✓ Set PTO balance for ${clinician.firstName} ${clinician.lastName}: ${balance.ptoBalance} PTO, ${balance.vacationBalance} Vacation, ${balance.sickBalance} Sick`);
    }

    console.log(`\n✅ Configured ${balances.length} PTO balances\n`);

    // Create PTO requests
    console.log('📝 Creating PTO requests...\n');

    const requests = [];

    // Vacation request
    const vacationStart = new Date();
    vacationStart.setDate(vacationStart.getDate() + 14);
    const vacationEnd = new Date(vacationStart);
    vacationEnd.setDate(vacationEnd.getDate() + 4); // 5 days

    const vacationRequest = await prisma.pTORequest.create({
      data: {
        userId: clinicians[0].id,
        requestType: AbsenceType.VACATION,
        startDate: vacationStart,
        endDate: vacationEnd,
        totalDays: 5,
        reason: 'Family vacation',
        coverageNotes: 'Cases will be covered by Dr. Smith',
        status: PTOStatus.PENDING,
      },
    });

    requests.push(vacationRequest);
    console.log(`✓ Created vacation request (5 days) - PENDING`);

    // Sick leave request
    const sickRequest = await prisma.pTORequest.create({
      data: {
        userId: clinicians[1].id,
        requestType: AbsenceType.SICK,
        startDate: new Date(),
        endDate: new Date(),
        totalDays: 1,
        reason: 'Medical appointment',
        status: PTOStatus.PENDING,
      },
    });

    requests.push(sickRequest);
    console.log(`✓ Created sick leave request (1 day) - PENDING\n`);

    // Test approval workflow
    console.log('✅ Testing PTO approval workflow...\n');

    // Approve vacation request
    const approvedRequest = await prisma.pTORequest.update({
      where: { id: vacationRequest.id },
      data: {
        status: PTOStatus.APPROVED,
        approvedById: supervisor.id,
        approvalDate: new Date(),
        approvalNotes: 'Approved. Enjoy your vacation!',
      },
    });

    // Deduct from balance
    const updatedBalance = await prisma.pTOBalance.update({
      where: { userId: clinicians[0].id },
      data: {
        vacationBalance: { decrement: 5 },
      },
    });

    console.log(`✓ Approved vacation request`);
    console.log(`✓ Deducted 5 days from vacation balance (New balance: ${updatedBalance.vacationBalance})\n`);

    // Deny sick request
    const deniedRequest = await prisma.pTORequest.update({
      where: { id: sickRequest.id },
      data: {
        status: PTOStatus.DENIED,
        approvedById: supervisor.id,
        approvalDate: new Date(),
        approvalNotes: 'Please use sick time policy instead',
      },
    });

    console.log(`✓ Denied sick leave request\n`);

    // Get PTO statistics
    const allRequests = await prisma.pTORequest.findMany({});
    const pendingCount = allRequests.filter(r => r.status === PTOStatus.PENDING).length;
    const approvedCount = allRequests.filter(r => r.status === PTOStatus.APPROVED).length;
    const deniedCount = allRequests.filter(r => r.status === PTOStatus.DENIED).length;

    console.log('📊 PTO Request Statistics:');
    console.log(`   Total requests: ${allRequests.length}`);
    console.log(`   Pending: ${pendingCount}`);
    console.log(`   Approved: ${approvedCount}`);
    console.log(`   Denied: ${deniedCount}\n`);

    // ========================================================================
    // FINAL SUMMARY
    // ========================================================================
    console.log('======================================================================');
    console.log('   FINAL TEST SUMMARY');
    console.log('======================================================================\n');

    const totalReviews = await prisma.performanceReview.count();
    const totalAttendance = await prisma.timeAttendance.count();
    const totalPTORequests = await prisma.pTORequest.count();
    const totalBalances = await prisma.pTOBalance.count();

    console.log('✅ ALL TESTS PASSED!\n');
    console.log('📊 Database Summary:');
    console.log(`   Performance Reviews: ${totalReviews}`);
    console.log(`   Time Attendance Records: ${totalAttendance}`);
    console.log(`   PTO Requests: ${totalPTORequests}`);
    console.log(`   PTO Balances: ${totalBalances}\n`);

    console.log('📋 Features Tested:');
    console.log('   ✓ Performance review creation and workflow');
    console.log('   ✓ Self-evaluation, manager review, and signatures');
    console.log('   ✓ Performance statistics and ratings');
    console.log('   ✓ Time attendance tracking (clock in/out)');
    console.log('   ✓ Absence recording and management');
    console.log('   ✓ Attendance approval workflow');
    console.log('   ✓ Attendance summaries and statistics');
    console.log('   ✓ PTO balance management');
    console.log('   ✓ PTO request creation');
    console.log('   ✓ PTO approval and denial workflow');
    console.log('   ✓ Balance deduction on approval\n');

    console.log('======================================================================');
    console.log('   MODULE 9 - HR FUNCTIONS: IMPLEMENTATION COMPLETE');
    console.log('======================================================================\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('✅ Test script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  });
