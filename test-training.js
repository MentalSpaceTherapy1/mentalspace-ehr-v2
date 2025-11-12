/**
 * Test Script for Training & Development Module
 *
 * This script tests the training management API endpoints
 * Run with: node test-training.js
 */

const API_BASE = 'http://localhost:3001/api/v1';
let authToken = '';
let testCourseId = '';
let testUserId = '';
let testRecordId = '';

// Helper function to make API calls
async function apiCall(method, endpoint, data = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const options = {
    method,
    headers,
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || result.message || 'API call failed');
    }

    return result;
  } catch (error) {
    console.error(`❌ ${method} ${endpoint} failed:`, error.message);
    throw error;
  }
}

// Test suite
async function runTests() {
  console.log('🧪 Training & Development Module API Tests\n');
  console.log('=' .repeat(70));

  try {
    // Step 1: Login
    console.log('\n1️⃣  Testing Authentication...');
    console.log('⚠️  Please update credentials below or set authToken manually');

    // Uncomment and update with your test credentials:
    // const loginResult = await apiCall('POST', '/auth/login', {
    //   email: 'admin@example.com',
    //   password: 'your-password'
    // });
    // authToken = loginResult.data.token;
    // testUserId = loginResult.data.user.id;
    // console.log('✅ Authentication successful');

    // For manual testing, set these values:
    // authToken = 'YOUR_JWT_TOKEN_HERE';
    // testUserId = 'USER_ID_HERE';

    if (!authToken) {
      console.log('⚠️  Skipping authenticated tests - no token provided');
      console.log('    Set authToken and testUserId in the script to run tests');
      return;
    }

    // Step 2: Create a Training Course
    console.log('\n2️⃣  Testing Course Creation...');
    const courseData = {
      courseName: 'HIPAA Compliance Training 2025',
      provider: 'Internal Training Department',
      description: 'Annual HIPAA compliance training covering privacy, security, and breach notification rules',
      duration: 120, // 2 hours in minutes
      credits: 2.0,
      trainingType: 'HIPAA',
      category: 'MANDATORY',
      passingScore: 80,
      expirationMonths: 12,
      isActive: true,
      materials: [
        'https://example.com/hipaa-manual.pdf',
        'https://example.com/hipaa-presentation.pptx'
      ]
    };

    const createCourseResult = await apiCall('POST', '/training/courses', courseData);
    testCourseId = createCourseResult.data.id;
    console.log('✅ Course created successfully');
    console.log(`   Course ID: ${testCourseId}`);
    console.log(`   Course Name: ${createCourseResult.data.courseName}`);

    // Step 3: Get All Courses
    console.log('\n3️⃣  Testing Get All Courses...');
    const coursesResult = await apiCall('GET', '/training/courses?page=1&limit=10');
    console.log(`✅ Retrieved ${coursesResult.data.length} courses`);
    console.log(`   Total courses: ${coursesResult.pagination.total}`);
    console.log(`   Pages: ${coursesResult.pagination.totalPages}`);

    // Step 4: Get Course by ID
    console.log('\n4️⃣  Testing Get Course by ID...');
    const courseResult = await apiCall('GET', `/training/courses/${testCourseId}`);
    console.log('✅ Course retrieved successfully');
    console.log(`   Name: ${courseResult.data.courseName}`);
    console.log(`   Duration: ${courseResult.data.duration} minutes`);
    console.log(`   Credits: ${courseResult.data.credits}`);

    // Step 5: Update Course
    console.log('\n5️⃣  Testing Course Update...');
    const updateData = {
      description: 'Updated: Annual HIPAA compliance training - Enhanced 2025 edition',
      duration: 150
    };
    const updateResult = await apiCall('PUT', `/training/courses/${testCourseId}`, updateData);
    console.log('✅ Course updated successfully');
    console.log(`   New duration: ${updateResult.data.duration} minutes`);

    // Step 6: Enroll User in Training
    console.log('\n6️⃣  Testing User Enrollment...');
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // Due in 30 days

    const enrollmentData = {
      userId: testUserId,
      courseName: courseData.courseName,
      provider: courseData.provider,
      trainingType: 'HIPAA',
      category: 'MANDATORY',
      dueDate: dueDate.toISOString(),
      required: true,
      passingScore: 80,
      creditsRequired: 2.0
    };

    const enrollResult = await apiCall('POST', '/training/enroll', enrollmentData);
    testRecordId = enrollResult.data.id;
    console.log('✅ User enrolled successfully');
    console.log(`   Record ID: ${testRecordId}`);
    console.log(`   Status: ${enrollResult.data.status}`);

    // Step 7: Update Training Progress
    console.log('\n7️⃣  Testing Progress Update...');
    const progressData = {
      status: 'IN_PROGRESS'
    };
    const progressResult = await apiCall('PUT', `/training/records/${testRecordId}/progress`, progressData);
    console.log('✅ Progress updated successfully');
    console.log(`   New status: ${progressResult.data.status}`);

    // Step 8: Complete Training
    console.log('\n8️⃣  Testing Training Completion...');
    const completionData = {
      score: 95,
      certificateUrl: 'https://example.com/certificates/cert-12345.pdf'
    };
    const completionResult = await apiCall('POST', `/training/records/${testRecordId}/complete`, completionData);
    console.log('✅ Training completed successfully');
    console.log(`   Status: ${completionResult.data.status}`);
    console.log(`   Score: ${completionResult.data.score}`);
    console.log(`   Compliance Met: ${completionResult.data.complianceMet}`);

    // Step 9: Get User Training Records
    console.log('\n9️⃣  Testing Get User Training Records...');
    const userRecordsResult = await apiCall('GET', `/training/user/${testUserId}`);
    console.log(`✅ Retrieved ${userRecordsResult.data.length} training records for user`);
    userRecordsResult.data.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.courseName} - ${record.status}`);
    });

    // Step 10: Get Expiring Training
    console.log('\n🔟 Testing Get Expiring Training...');
    const expiringResult = await apiCall('GET', '/training/expiring?days=60');
    console.log(`✅ Found ${expiringResult.data.length} trainings expiring within 60 days`);
    console.log(`   Total expiring: ${expiringResult.meta.count}`);

    // Step 11: Generate CEU Report
    console.log('\n1️⃣1️⃣  Testing CEU Report Generation...');
    const ceuResult = await apiCall('GET', `/training/ceu-report/${testUserId}`);
    console.log('✅ CEU report generated successfully');
    console.log(`   User: ${ceuResult.data.userName}`);
    console.log(`   Total Credits: ${ceuResult.data.totalCredits}`);
    console.log(`   Completed Trainings: ${ceuResult.data.completedTrainings}`);
    console.log('   Credits by Type:');
    ceuResult.data.trainingsByType.forEach(type => {
      console.log(`     - ${type.type}: ${type.credits} credits (${type.count} trainings)`);
    });

    // Step 12: Get Compliance Report
    console.log('\n1️⃣2️⃣  Testing Compliance Report...');
    const complianceResult = await apiCall('GET', '/training/compliance-report');
    console.log('✅ Compliance report generated successfully');
    console.log(`   Total Staff: ${complianceResult.data.totalStaff}`);
    console.log(`   Compliant: ${complianceResult.data.compliantStaff}`);
    console.log(`   Non-Compliant: ${complianceResult.data.nonCompliantStaff}`);
    console.log(`   Compliance Rate: ${complianceResult.data.complianceRate}%`);
    console.log(`   Expiring within 30 days: ${complianceResult.data.expiringWithin30Days}`);
    console.log(`   Expiring within 60 days: ${complianceResult.data.expiringWithin60Days}`);
    console.log(`   Expiring within 90 days: ${complianceResult.data.expiringWithin90Days}`);

    // Step 13: Auto-enroll New Hire
    console.log('\n1️⃣3️⃣  Testing Auto-enrollment for New Hire...');
    const autoEnrollResult = await apiCall('POST', `/training/auto-enroll/${testUserId}`);
    console.log('✅ Auto-enrollment completed');
    console.log(`   Enrolled in ${autoEnrollResult.meta.enrolledCount} required courses`);

    // Step 14: Filter Courses
    console.log('\n1️⃣4️⃣  Testing Course Filtering...');
    const filteredResult = await apiCall('GET', '/training/courses?category=MANDATORY&isActive=true');
    console.log(`✅ Retrieved ${filteredResult.data.length} mandatory active courses`);

    // Step 15: Search Courses
    console.log('\n1️⃣5️⃣  Testing Course Search...');
    const searchResult = await apiCall('GET', '/training/courses?search=HIPAA');
    console.log(`✅ Found ${searchResult.data.length} courses matching "HIPAA"`);

    // Final Summary
    console.log('\n' + '=' .repeat(70));
    console.log('✅ All tests completed successfully!');
    console.log('\n📊 Test Summary:');
    console.log(`   - Created course ID: ${testCourseId}`);
    console.log(`   - Created training record ID: ${testRecordId}`);
    console.log(`   - User training records: ${userRecordsResult.data.length}`);
    console.log(`   - Total CEU credits: ${ceuResult.data.totalCredits}`);
    console.log(`   - Organization compliance rate: ${complianceResult.data.complianceRate}%`);

    console.log('\n💡 Optional: Clean up test data');
    console.log(`   - Delete course: DELETE /training/courses/${testCourseId}`);

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the tests
console.log('Starting Training & Development Module Tests...\n');
runTests().then(() => {
  console.log('\n✅ Test suite completed');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
