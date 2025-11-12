# Module 9: Practice Management & Administration - Comprehensive Testing Guide

**Created**: 2025-01-11
**Status**: Ready for Testing
**Modules**: All 8 Subsystems (64 Components)
**Test Scripts**: 6 Backend Scripts + Frontend Manual Tests

---

## 📋 Quick Start Testing Checklist

### Prerequisites
```bash
# 1. Ensure database is migrated
cd packages/database
npx prisma migrate dev

# 2. Generate Prisma client
npx prisma generate

# 3. Start backend server
cd packages/backend
npm run dev

# 4. Start frontend server (separate terminal)
cd packages/frontend
npm run dev
```

---

## 🧪 Test Prompt 1: Credentialing & Licensing System

### Backend API Tests
```bash
# Run automated test script
node test-credentialing.js
```

### Frontend Manual Test Prompt for Cursor:
```
Test the Credentialing & Licensing system:

1. Navigate to http://localhost:5173/credentialing
2. Verify the dashboard displays:
   - Total Credentials count
   - Expiring Soon count (licenses expiring in 90 days)
   - Expired count
   - Verification Pending count
3. Click "Add New Credential" button
4. Fill in credential form with:
   - Credential Type: State License
   - License Number: PSY123456
   - Issuing Authority: California Board of Psychology
   - Issue Date: 2023-01-15
   - Expiration Date: 2026-01-15
5. Submit and verify credential appears in list
6. Navigate to /credentialing/alerts
7. Verify expiration alerts are grouped by urgency:
   - CRITICAL (< 30 days)
   - HIGH (30-60 days)
   - MEDIUM (60-90 days)
   - LOW (> 90 days)
8. Test credential verification workflow
9. Test document upload functionality
10. View credential timeline history

Expected Results:
✅ All credential data displays correctly
✅ Expiration alerts show proper urgency levels
✅ Form validation works (required fields, date validation)
✅ Beautiful gradient background: from-purple-50 via-blue-50 to-indigo-50
✅ Status badges are colorful (green/yellow/red)
```

---

## 🧪 Test Prompt 2: Training & Development System

### Backend API Tests
```bash
# Run automated test script
node test-training.js
```

### Frontend Manual Test Prompt for Cursor:
```
Test the Training & Development system:

1. Navigate to http://localhost:5173/training
2. Verify dashboard shows:
   - Total Courses available
   - Completed training count
   - Required Pending count
   - CEU Credits earned
3. Verify required training progress bar displays correctly
4. Filter enrollments by: All / Required / Optional
5. Click "Browse Catalog" to view course catalog
6. View course details for a specific course
7. Enroll in a course
8. Navigate to /training/progress
9. Mark course modules as complete
10. Navigate to /training/ceu-tracker
11. Verify CEU credits accumulation
12. View certificate for completed course
13. Check training calendar for upcoming sessions

Expected Results:
✅ Training dashboard shows accurate statistics
✅ Course catalog displays beautifully with course cards
✅ Enrollment process works smoothly
✅ Progress tracking updates in real-time
✅ CEU tracker accumulates credits correctly
✅ Certificates generate for completed courses
✅ Gradient background: from-indigo-50 via-purple-50 to-pink-50
```

---

## 🧪 Test Prompt 3: Compliance Management (Policy & Incidents)

### Backend API Tests
```bash
# Run automated test script
node test-compliance.js
```

### Frontend Manual Test Prompt for Cursor:
```
Test the Compliance Management system:

PART A - Policy Management:
1. Navigate to http://localhost:5173/compliance
2. Verify compliance dashboard displays:
   - Active Policies count
   - Pending Acknowledgments count
   - Open Incidents count
   - Overdue Trainings count
3. Navigate to /policy/library
4. Verify policies grouped by category:
   - HIPAA (purple)
   - Clinical (blue)
   - Safety (amber)
   - HR (green)
   - Financial (red)
   - IT Security (indigo)
5. Create new policy with:
   - Title: "Updated HIPAA Privacy Policy"
   - Category: HIPAA
   - Version: 2.0
   - Effective Date: 2025-02-01
   - Upload policy document (PDF)
6. Distribute policy to staff
7. View policy acknowledgment tracking
8. Verify staff can acknowledge policies

PART B - Incident Reporting:
1. Navigate to /compliance/incidents/new
2. Complete multi-step incident report:
   STEP 1: Incident Type
   - Select: SAFETY / CLINICAL / SECURITY / EQUIPMENT / EMERGENCY

   STEP 2: Details
   - Date/Time of incident
   - Location
   - Severity: Critical / High / Medium / Low
   - Description

   STEP 3: People Involved
   - Add staff members
   - Add witnesses
   - Add affected clients

   STEP 4: Documentation
   - Upload photos/documents
   - Add detailed notes

   STEP 5: Review & Submit
3. View incident list with filters
4. View incident details
5. Assign investigation workflow
6. View incident trends analytics

Expected Results:
✅ Policy library displays all categories with color coding
✅ Policy distribution workflow completes successfully
✅ Acknowledgment tracking shows who has/hasn't acknowledged
✅ Incident reporting form has smooth multi-step wizard
✅ Incident types have proper icons and colors
✅ Investigation workflow assigns tasks correctly
✅ Incident trends show analytics charts
```

---

## 🧪 Test Prompt 4: HR Functions (Performance, Attendance, PTO)

### Backend API Tests
```bash
# Run automated test script
node test-hr.js
```

### Frontend Manual Test Prompt for Cursor:
```
Test the HR Functions system:

PART A - Performance Reviews:
1. Navigate to http://localhost:5173/hr/performance
2. View list of performance reviews
3. Create new review:
   - Select employee
   - Review period: Q4 2024
   - Review type: Quarterly / Annual / 90-Day
   - Complete evaluation sections:
     * Clinical Skills (1-5 rating)
     * Communication (1-5 rating)
     * Professionalism (1-5 rating)
     * Documentation (1-5 rating)
   - Add goals for next period
   - Add manager comments
4. Submit review
5. View review history for employee

PART B - Attendance Tracking:
1. Navigate to /hr/attendance
2. View attendance calendar
3. Log attendance:
   - Clock in/out times
   - Break times
   - Absence type (Sick / Vacation / Personal)
4. View attendance reports:
   - Monthly summary
   - Tardiness report
   - Absence patterns
5. Export attendance data

PART C - PTO Management:
1. Navigate to /hr/pto
2. View PTO balances:
   - Vacation hours available
   - Sick leave available
   - Personal days available
3. Request PTO:
   - Select dates
   - Select PTO type
   - Add reason
   - Submit request
4. Manager approves/denies PTO request
5. View PTO calendar
6. View accrual history

Expected Results:
✅ Performance review form captures all evaluation criteria
✅ Reviews save and display correctly
✅ Attendance tracking logs clock in/out accurately
✅ Attendance reports show correct data
✅ PTO requests workflow properly (request → approve → update balance)
✅ PTO balances calculate correctly based on accrual rules
✅ Calendar shows approved PTO visually
```

---

## 🧪 Test Prompt 5: Staff Management & Onboarding

### Backend API Tests
```bash
# Run automated test script
node test-staff-management.js
```

### Frontend Manual Test Prompt for Cursor:
```
Test the Staff Management & Onboarding system:

PART A - Staff Directory:
1. Navigate to http://localhost:5173/staff
2. Verify staff directory displays:
   - Grid of staff cards with photos
   - Filter by department (Clinical / Admin / Support)
   - Filter by role (Psychiatrist / Therapist / Admin / etc.)
   - Filter by employment status (Active / On Leave / Terminated)
3. Click on staff member to view profile:
   - Contact information
   - Department & role
   - Start date
   - Credentials summary
   - Training completion
   - Performance summary
4. Search for staff by name

PART B - Onboarding Workflow:
1. Navigate to /staff/onboarding
2. View onboarding dashboard showing:
   - New Hires This Month
   - In Progress count
   - Completed count
   - Overdue Tasks count
3. Create new onboarding workflow:
   - Select new hire
   - Assign onboarding buddy
   - Generate checklist:
     □ Complete I-9 form
     □ Sign employee handbook
     □ Complete HR orientation
     □ Set up email account
     □ Complete HIPAA training
     □ Complete EHR training
     □ Shadow clinical sessions
     □ Complete competency assessments
4. Track checklist completion
5. View onboarding progress for each new hire
6. Mark onboarding complete

Expected Results:
✅ Staff directory displays all employees with beautiful cards
✅ Filters work correctly (department, role, status)
✅ Search functionality finds staff quickly
✅ Staff profiles show comprehensive information
✅ Onboarding checklist is customizable
✅ Progress tracking shows completion percentage
✅ Notifications sent when tasks overdue
✅ Employment status badges are color-coded
```

---

## 🧪 Test Prompt 6: Communication & Document Management

### Frontend Manual Test Prompt for Cursor:
```
Test the Communication & Document Management system:

PART A - Internal Messaging:
1. Navigate to http://localhost:5173/messages
2. Verify messaging hub displays:
   - Inbox with unread count
   - Sent messages
   - Drafts
3. Compose new message:
   - Select recipients (individual or department)
   - Add subject
   - Compose message with rich text editor
   - Attach files
   - Set priority (Normal / High / Urgent)
   - Send
4. View message thread
5. Reply to message
6. Mark as read/unread
7. Archive message

PART B - Document Library:
1. Navigate to /documents
2. View document library organized by:
   - Policies
   - Forms
   - Templates
   - Training Materials
   - HR Documents
3. Upload new document:
   - Select file (PDF, DOC, XLSX)
   - Add title and description
   - Assign category
   - Set access permissions (All Staff / Managers Only / Admin Only)
4. Search documents by keyword
5. Filter by category and date
6. Download document
7. View document version history
8. Share document with specific users

Expected Results:
✅ Messaging system sends/receives messages correctly
✅ Unread count updates in real-time
✅ Rich text editor works (bold, italic, lists, etc.)
✅ File attachments upload and download correctly
✅ Document library organizes files properly
✅ Search finds documents quickly
✅ Permissions restrict access appropriately
✅ Version control tracks document changes
```

---

## 🧪 Test Prompt 7: Vendor & Financial Administration

### Backend API Tests
```bash
# Run automated test script
node test-vendor-financial.js
```

### Frontend Manual Test Prompt for Cursor:
```
Test the Vendor & Financial Administration system:

PART A - Vendor Management:
1. Navigate to http://localhost:5173/vendors
2. Verify vendor list displays with categories:
   - Insurance Payers (blue)
   - Clinical Supplies (green)
   - Office Supplies (amber)
   - IT Services (purple)
   - Professional Services (indigo)
   - Facilities (gray)
3. Add new vendor:
   - Vendor name
   - Category
   - Contact person
   - Phone/Email
   - Address
   - Tax ID
   - Payment terms
   - W-9 upload
4. View vendor details
5. Track contracts:
   - Contract start/end dates
   - Auto-renewal settings
   - Contract amount
   - Upload contract document
6. View contract expiration alerts

PART B - Budget Management:
1. Navigate to /finance/budget
2. View annual budget dashboard:
   - Budget vs Actual by category
   - Variance analysis
   - YTD spending
3. Create department budget:
   - Select fiscal year
   - Allocate budget by category:
     * Salaries
     * Benefits
     * Supplies
     * Rent
     * Utilities
     * Marketing
     * Technology
     * Professional Development
4. Track budget utilization
5. View budget reports with charts

PART C - Expense Tracking:
1. Navigate to /finance/expenses
2. Submit expense report:
   - Date of expense
   - Category
   - Amount
   - Vendor
   - Description
   - Upload receipt
3. Submit for approval
4. Manager approves/denies expense
5. View expense history
6. Export expense report to Excel

PART D - Purchase Orders:
1. Navigate to /finance/purchase-orders
2. Create purchase order:
   - Select vendor
   - Add line items (item, quantity, price)
   - Calculate total
   - Add notes
   - Submit for approval
3. Approve purchase order
4. Mark as received
5. Close purchase order
6. View PO history

Expected Results:
✅ Vendor list displays with color-coded categories
✅ Vendor contact information saves correctly
✅ Contract tracking alerts before expiration
✅ Budget dashboard shows accurate spending data
✅ Budget vs actual charts display correctly
✅ Expense submission workflow completes
✅ Expense approval updates status properly
✅ Purchase order workflow tracks from creation to closure
✅ All financial data exports to Excel correctly
```

---

## 🧪 Test Prompt 8: Reports & Analytics Dashboard

### Frontend Manual Test Prompt for Cursor:
```
Test the Module 9 Reports & Analytics system:

1. Navigate to http://localhost:5173/module9/reports
2. Verify reports dashboard displays sections:
   - Credentialing Reports
   - Training Reports
   - Compliance Reports
   - HR Reports
   - Financial Reports
3. Generate Credentialing Compliance Report:
   - Select date range
   - Select credential types to include
   - Select staff members (or All Staff)
   - Generate report
   - Verify report shows:
     * Staff member name
     * Credential type
     * Expiration date
     * Days until expiration
     * Status (Current / Expiring Soon / Expired)
   - Export to PDF and Excel
4. Generate Training Completion Report:
   - Select training courses
   - Select date range
   - Generate report showing:
     * Course name
     * Enrolled count
     * Completed count
     * In Progress count
     * Completion percentage
   - View charts (bar chart, pie chart)
   - Export report
5. Generate Incident Trends Report:
   - Select date range (Last 3 months)
   - Group by: Type / Severity / Department
   - View trend line chart
   - Export report
6. Generate Budget Variance Report:
   - Select fiscal year
   - Select departments
   - View budget vs actual comparison
   - View variance percentage
   - Export to Excel
7. Schedule automated report:
   - Select report type
   - Select frequency (Daily / Weekly / Monthly)
   - Select recipients
   - Save schedule
8. View report history
9. Download previously generated reports

Expected Results:
✅ All reports generate with accurate data
✅ Date range filters work correctly
✅ Charts display data visually (Recharts)
✅ PDF exports are formatted properly
✅ Excel exports contain all data
✅ Scheduled reports save and trigger correctly
✅ Report history shows past reports
✅ Reports dashboard is beautiful with gradient backgrounds
```

---

## 🎯 Integration Testing Prompts

### Test Prompt 9: Cross-Module Integration
```
Test how Module 9 integrates with other modules:

1. CREDENTIALING + USER MANAGEMENT:
   - Create new clinician user
   - Add credentials for the clinician
   - Verify credentials appear on user profile
   - Test credential expiration affects user status

2. TRAINING + COMPLIANCE:
   - Assign required HIPAA training to staff
   - Track training completion in Compliance dashboard
   - Verify training completion satisfies policy requirements

3. ONBOARDING + CREDENTIALING + TRAINING:
   - Start onboarding for new hire
   - Verify checklist includes credential verification
   - Verify checklist includes required training
   - Complete onboarding workflow
   - Verify all credentials and training are tracked

4. VENDOR + EXPENSES:
   - Add vendor
   - Submit expense for that vendor
   - Verify expense links to vendor correctly
   - Approve expense
   - Track spending with vendor

5. BUDGET + PURCHASE ORDERS:
   - Create department budget
   - Create purchase order
   - Verify PO amount deducts from budget
   - Track budget utilization

Expected Results:
✅ Data flows correctly between modules
✅ No data loss during cross-module operations
✅ UI updates reflect changes across modules
✅ Relationships between entities are maintained
```

---

## 🔍 Database Verification Tests

### Test Prompt 10: Database Integrity
```bash
# Connect to database and verify Module 9 tables
cd packages/database
npx prisma studio

# Verify these tables exist and have data:
1. Credential - Check credentials are stored
2. TrainingCourse - Check courses exist
3. TrainingEnrollment - Check enrollments tracked
4. PolicyDocument - Check policies stored
5. PolicyAcknowledgment - Check acknowledgments tracked
6. IncidentReport - Check incidents recorded
7. PerformanceReview - Check reviews saved
8. TimeAttendance - Check attendance logged
9. PTORequest - Check PTO requests stored
10. Vendor - Check vendors added
11. Budget - Check budgets created
12. Expense - Check expenses recorded
13. PurchaseOrder - Check POs tracked
14. OnboardingChecklist - Check onboarding tasks saved
15. InternalMessage - Check messages stored
16. DocumentLibrary - Check documents uploaded

For each table, verify:
✅ Primary keys are UUIDs
✅ Foreign keys reference correct tables
✅ Timestamps (createdAt, updatedAt) populate
✅ Enums are stored correctly
✅ JSON fields parse correctly
✅ Indexes exist on frequently queried fields
```

---

## 📊 Performance Testing

### Test Prompt 11: Performance Benchmarks
```
Test Module 9 performance:

1. Load Testing - Credentialing List:
   - Add 100 credentials
   - Navigate to /credentialing/list
   - Measure page load time (should be < 2 seconds)
   - Test pagination (50 items per page)
   - Test sorting by expiration date
   - Test filtering by credential type

2. Load Testing - Training Dashboard:
   - Create 50 training courses
   - Enroll 20 staff in each course
   - Navigate to /training
   - Verify dashboard loads quickly (< 2 seconds)
   - Verify stats calculate correctly

3. Load Testing - Incident Reports:
   - Create 200 incident reports
   - Navigate to /compliance/incidents
   - Test filtering and search performance
   - Generate incident trends report
   - Verify chart renders quickly

4. Load Testing - Document Library:
   - Upload 100 documents
   - Navigate to /documents
   - Test search performance (should be < 1 second)
   - Test document preview load time

Expected Results:
✅ All pages load in < 3 seconds with 100+ records
✅ Search returns results in < 1 second
✅ Charts render smoothly without lag
✅ Pagination handles large datasets efficiently
✅ No memory leaks during extended use
```

---

## 🐛 Error Handling Tests

### Test Prompt 12: Error Scenarios
```
Test Module 9 error handling:

1. Test credential creation with missing required fields
   - Verify validation errors display
   - Verify form doesn't submit

2. Test credential with past expiration date
   - Verify warning message displays
   - Verify admin can override

3. Test incident report without selecting type
   - Verify step 1 validation prevents next

4. Test PTO request exceeding available balance
   - Verify error message displays
   - Verify request is blocked

5. Test expense submission without receipt
   - Verify warning (optional field)
   - Verify can submit with override

6. Test purchase order creation for $0
   - Verify validation prevents submission

7. Test policy distribution with no recipients
   - Verify error displays

8. Test training enrollment when course is full
   - Verify waitlist option appears

9. Test duplicate credential creation
   - Verify system prevents duplicates
   - Verify helpful error message

10. Test API timeout scenarios:
    - Disconnect internet
    - Attempt to save data
    - Verify error toast notification
    - Verify data not lost
    - Reconnect and retry

Expected Results:
✅ All validation errors display clearly
✅ Error messages are helpful and specific
✅ Forms prevent invalid data submission
✅ No console errors in browser
✅ API errors handled gracefully
✅ User data is preserved during errors
```

---

## ✅ Final Acceptance Criteria

### Module 9 is considered COMPLETE when:

**Credentialing System:**
- ✅ All 9 credential types can be added
- ✅ Expiration alerts trigger at 90/60/30 days
- ✅ OIG/SAM screening integrates
- ✅ Document uploads work
- ✅ Compliance report generates

**Training System:**
- ✅ Courses can be created and assigned
- ✅ Enrollments track progress
- ✅ CEU credits accumulate
- ✅ Certificates generate
- ✅ Training calendar displays

**Compliance System:**
- ✅ Policies can be distributed
- ✅ Acknowledgments track who signed
- ✅ Incidents can be reported (all 5 types)
- ✅ Investigation workflow assigns tasks
- ✅ Trend analytics display

**HR System:**
- ✅ Performance reviews save and display
- ✅ Attendance tracks clock in/out
- ✅ PTO requests workflow properly
- ✅ Balances calculate correctly

**Staff Management:**
- ✅ Staff directory displays all employees
- ✅ Onboarding checklists are customizable
- ✅ Progress tracking works
- ✅ Filters and search work

**Communication:**
- ✅ Messages send and receive
- ✅ Documents upload and download
- ✅ Permissions restrict access
- ✅ Version control tracks changes

**Vendor/Financial:**
- ✅ Vendors can be added and managed
- ✅ Budgets track spending
- ✅ Expenses workflow (submit → approve)
- ✅ Purchase orders track lifecycle
- ✅ All exports work (Excel/PDF)

**Reports:**
- ✅ All reports generate with accurate data
- ✅ Charts display correctly
- ✅ Exports work (PDF and Excel)
- ✅ Scheduled reports trigger

**General:**
- ✅ All 64 components render without errors
- ✅ Beautiful design matches application style
- ✅ No console errors
- ✅ Mobile responsive
- ✅ All backend APIs return 200 responses

---

## 🚀 Quick Test All Command

Run all Module 9 backend tests in sequence:
```bash
# Test all Module 9 backend APIs
node test-credentialing.js && \
node test-training.js && \
node test-compliance.js && \
node test-hr.js && \
node test-staff-management.js && \
node test-vendor-financial.js
```

---

## 📝 Test Results Template

After completing tests, document results in: `MODULE_9_TEST_RESULTS.md`

```markdown
# Module 9 Test Results

**Date**: YYYY-MM-DD
**Tester**: [Name]
**Environment**: Development

## Test Summary
- Total Tests: 64
- Passed: __
- Failed: __
- Blocked: __

## Detailed Results

### Credentialing System
- [ ] Dashboard loads
- [ ] Can create credentials
- [ ] Expiration alerts work
- [ ] Document upload works
- [ ] Compliance report generates

[Continue for all 8 subsystems...]

## Bugs Found
1. [Bug description]
   - Severity: High/Medium/Low
   - Component: [Component name]
   - Steps to reproduce:
   - Expected vs Actual:

## Notes
[Any additional observations]
```

---

**END OF TESTING GUIDE**

For questions or issues, refer to:
- [MODULE_9_IMPLEMENTATION_PLAN.md](MODULE_9_IMPLEMENTATION_PLAN.md)
- [MODULE_9_QUICK_START_GUIDE.md](MODULE_9_QUICK_START_GUIDE.md)
- Backend services in `packages/backend/src/services/`
- Frontend components in `packages/frontend/src/pages/`
