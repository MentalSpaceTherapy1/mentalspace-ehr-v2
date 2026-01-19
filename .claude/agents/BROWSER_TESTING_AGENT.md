# MentalSpace EHR - COMPLETE Browser Testing Agent

## Test Environment

```
PRODUCTION URL: https://www.mentalspaceehr.com
CLIENT PORTAL URL: https://www.mentalspaceehr.com/portal (or separate URL)

STAFF LOGIN:
- Username: ejoseph@chctherapy.com
- Password: Bing@@0912
- Role: Administrator (multi-role)

CLIENT LOGIN:
- Create test client during testing OR use existing test account
```

## Test Naming Convention

- **DASH** = Dashboard
- **CLT** = Clients
- **APT** = Appointments
- **GRP** = Group Sessions
- **NOTE** = Clinical Notes
- **BILL** = Billing
- **RPT** = Reports & Analytics
- **PROG** = Progress Tracking
- **HR** = Staff & HR
- **COMP** = Compliance & Training
- **PORT** = Portals
- **ADM** = Admin Tools
- **CLIN** = Clinician Tools
- **TELE** = Telehealth
- **SCHED** = Self-Schedule
- **SUP** = Supervision
- **PROD** = Productivity
- **COMM** = Communication
- **FIN** = Vendors & Finance
- **SET** = Settings
- **CP** = Client Portal

---

# ═══════════════════════════════════════════════════════════════
# PART 1: STAFF/ADMIN PORTAL TESTS (100+ Tests)
# ═══════════════════════════════════════════════════════════════

---

## 🔐 AUTHENTICATION TESTS

### AUTH-01: Staff Login
```
1. Navigate to https://www.mentalspaceehr.com
2. Enter username: ejoseph@chctherapy.com
3. Enter password: Bing@@0912
4. Click "Sign In" / "Login"
5. VERIFY: Dashboard loads
6. VERIFY: User name "Elize Joseph" visible
7. VERIFY: Role "ADMINISTRATOR" visible
8. Screenshot: Dashboard after login
```

### AUTH-02: Logout
```
1. Click user profile at bottom of sidebar
2. Click "Logout"
3. VERIFY: Redirected to login page
4. VERIFY: Session cleared
5. Screenshot: Login page after logout
```

### AUTH-03: Session Persistence
```
1. Login successfully
2. Close browser tab
3. Open new tab, navigate to app
4. VERIFY: Still logged in OR redirected to login
5. Screenshot: Result
```

---

## 📊 DASHBOARD TESTS

### DASH-01: Dashboard Load
```
1. Login to application
2. VERIFY: Dashboard page loads
3. VERIFY: Today's appointments widget visible
4. VERIFY: Notifications/alerts visible
5. VERIFY: Quick stats visible
6. Screenshot: Full dashboard
```

### DASH-02: Dashboard Widgets Interaction
```
1. On Dashboard
2. Click on each widget/card
3. VERIFY: Each widget navigates to appropriate page
4. Screenshot: Each widget interaction
```

---

## 👥 CLIENTS MODULE

### CLT-01: View Client List
```
1. Click "Clients" in sidebar
2. Click "Client List"
3. VERIFY: Client list table loads
4. VERIFY: Columns visible (Name, DOB, Phone, Status, etc.)
5. VERIFY: Pagination works
6. Screenshot: Client list
```

### CLT-02: Search Clients
```
1. On Client List page
2. Find search box
3. Type "TEST" or a known client name
4. VERIFY: Results filter in real-time
5. VERIFY: Matching clients shown
6. Screenshot: Search results
```

### CLT-03: Filter Clients
```
1. On Client List page
2. Find filter options (Status, Provider, etc.)
3. Apply filter (e.g., Active only)
4. VERIFY: List filters correctly
5. Clear filter
6. Screenshot: Filtered results
```

### CLT-04: Create New Client
```
1. On Client List page
2. Click "Add Client" / "New Client" / "+" button
3. Fill ALL fields in the form:
   - First Name: "TEST_Browser"
   - Last Name: "Client_[timestamp]"
   - Date of Birth: "01/15/1990"
   - Email: "testclient_[timestamp]@test.com"
   - Phone: "(555) 123-4567"
   - Address: "123 Test Street"
   - City: "Atlanta"
   - State: "Georgia"
   - ZIP: "30301"
   - Gender: Select option
   - Preferred Contact Method: Select option
   - Emergency Contact Name: "Emergency Person"
   - Emergency Contact Phone: "(555) 987-6543"
   - Emergency Contact Relationship: "Spouse"
4. Click "Save" / "Create"
5. VERIFY: Success message
6. VERIFY: Client appears in list
7. Screenshot: New client form filled
8. Screenshot: Success confirmation
```

### CLT-05: View Client Profile
```
1. On Client List
2. Click on a client name
3. VERIFY: Client profile page loads
4. VERIFY: Demographics tab visible
5. VERIFY: All client info displayed
6. Screenshot: Client profile
```

### CLT-06: Edit Client
```
1. On Client Profile
2. Click "Edit" button
3. Change phone number to "(555) 999-8888"
4. Click "Save"
5. VERIFY: Changes saved successfully
6. VERIFY: New phone number displayed
7. Screenshot: Edit confirmation
```

### CLT-07: Client Profile Tabs
```
1. On Client Profile
2. Click through ALL available tabs:
   - Demographics
   - Appointments
   - Clinical Notes
   - Documents
   - Billing
   - Assessments
   - Treatment Plans
   - Messages
   - Progress
   - (any other tabs)
3. VERIFY: Each tab loads content
4. Screenshot: Each tab
```

### CLT-08: Duplicate Detection
```
1. Click "Clients" > "Duplicate Detection"
2. VERIFY: Page loads
3. VERIFY: Potential duplicates listed (if any)
4. Test merge function if duplicates exist
5. Screenshot: Duplicate detection page
```

---

## 📅 APPOINTMENTS MODULE

### APT-01: View Calendar
```
1. Click "Appointments" > "Calendar"
2. VERIFY: Calendar view loads
3. VERIFY: Appointments visible on calendar
4. Test view toggles (Day, Week, Month)
5. Screenshot: Calendar view
```

### APT-02: Navigate Calendar
```
1. On Calendar
2. Click "Next" to go to next week/month
3. Click "Previous" to go back
4. Click "Today" to return to current date
5. VERIFY: Navigation works correctly
6. Screenshot: Different date ranges
```

### APT-03: Create Appointment
```
1. On Calendar
2. Click on empty time slot OR click "New Appointment"
3. Fill appointment form:
   - Client: Select test client
   - Provider: Select provider
   - Service Type: Select "Individual Therapy 60min" or similar
   - Date: Tomorrow
   - Start Time: 10:00 AM
   - End Time: 11:00 AM
   - Location: Select (Office/Telehealth)
   - Notes: "Test appointment created by browser testing"
4. Click "Save" / "Schedule"
5. VERIFY: Appointment appears on calendar
6. Screenshot: Appointment form
7. Screenshot: Appointment on calendar
```

### APT-04: Edit Appointment
```
1. On Calendar
2. Click on existing appointment
3. Click "Edit"
4. Change time to 2:00 PM - 3:00 PM
5. Save changes
6. VERIFY: Appointment moved on calendar
7. Screenshot: Updated appointment
```

### APT-05: Cancel Appointment
```
1. Click on existing appointment
2. Click "Cancel" / "Cancel Appointment"
3. Select cancellation reason
4. Choose whether to notify client
5. Confirm cancellation
6. VERIFY: Appointment removed or marked cancelled
7. Screenshot: Cancellation confirmation
```

### APT-06: AI Scheduling Assistant
```
1. Click "Appointments" > "AI Scheduling Assistant"
2. VERIFY: Page loads
3. Test AI suggestions feature
4. Screenshot: AI Scheduling interface
```

### APT-07: Provider Availability
```
1. Click "Appointments" > "Provider Availability"
2. VERIFY: Availability grid/calendar loads
3. VERIFY: Can see provider schedules
4. Test editing availability if permitted
5. Screenshot: Provider availability view
```

### APT-08: Appointment Types
```
1. Click "Appointments" > "Appointment Types"
2. VERIFY: List of appointment types loads
3. View existing types
4. Test creating new type (if permitted):
   - Name: "TEST_Appointment_Type"
   - Duration: 45 minutes
   - Color: Select color
5. Screenshot: Appointment types list
```

### APT-09: Waitlist Management
```
1. Click "Appointments" > "Waitlist Management"
2. VERIFY: Waitlist page loads
3. View clients on waitlist
4. Test adding client to waitlist
5. Test removing from waitlist
6. Screenshot: Waitlist page
```

---

## 👥 GROUP SESSIONS MODULE

### GRP-01: View Group Sessions
```
1. Click "Group Sessions" in sidebar
2. VERIFY: Group sessions list loads
3. View existing groups
4. Screenshot: Group sessions list
```

### GRP-02: Create Group Session
```
1. On Group Sessions
2. Click "New Group" / "Create"
3. Fill form:
   - Group Name: "TEST_Therapy_Group"
   - Facilitator: Select provider
   - Max Participants: 8
   - Schedule: Weekly
   - Day: Wednesday
   - Time: 3:00 PM
   - Duration: 90 minutes
4. Save group
5. VERIFY: Group created
6. Screenshot: Group creation
```

### GRP-03: Manage Group Participants
```
1. Open existing group
2. Add participant (client)
3. VERIFY: Client added to group
4. Remove participant
5. Screenshot: Group participants
```

### GRP-04: Group Attendance
```
1. Open group session
2. Mark attendance for session
3. VERIFY: Attendance recorded
4. Screenshot: Attendance marking
```

---

## 📝 CLINICAL NOTES MODULE

### NOTE-01: Compliance Dashboard
```
1. Click "Clinical Notes" > "Compliance Dashboard"
2. VERIFY: Dashboard loads
3. VERIFY: Note compliance metrics visible
4. VERIFY: Charts/graphs display
5. Screenshot: Compliance dashboard
```

### NOTE-02: My Notes
```
1. Click "Clinical Notes" > "My Notes"
2. VERIFY: List of your notes loads
3. VERIFY: Filter options available (Draft, Signed, All)
4. Filter by status
5. Screenshot: My notes list
```

### NOTE-03: Create Progress Note (SOAP)
```
1. Click "Clinical Notes" > "Create New Note"
2. Select client
3. Select note type: "Progress Note"
4. Select linked appointment if prompted
5. Fill SOAP format:
   
   SUBJECTIVE:
   "Client reports moderate improvement in anxiety symptoms since last session. States they have been practicing deep breathing exercises 'about 3-4 times per week.' Reports sleep has improved slightly, now averaging 6 hours per night compared to 4-5 hours previously. Client mentions ongoing stress related to work deadlines. Denies any thoughts of self-harm or suicide. Reports appetite is 'okay' and denies any changes in weight."
   
   OBJECTIVE:
   "Client arrived on time for scheduled appointment. Appearance was neat and appropriately dressed. Client was alert and oriented x4. Eye contact was appropriate throughout session. Speech was normal in rate, rhythm, and volume. Mood described as 'anxious but better.' Affect was congruent with stated mood, ranging from anxious to hopeful. Thought process was logical and goal-directed. No evidence of hallucinations or delusions. Judgment and insight appear intact."
   
   ASSESSMENT:
   "Generalized Anxiety Disorder (F41.1) - Client showing gradual improvement with current treatment approach. GAD-7 score decreased from 14 to 11, indicating moderate anxiety (previously moderate-severe). Client demonstrates increased awareness of anxiety triggers and is actively implementing coping strategies. Treatment goals being addressed include: 1) Reducing anxiety symptoms - IN PROGRESS, 2) Improving sleep quality - IN PROGRESS, 3) Developing healthy coping mechanisms - IN PROGRESS."
   
   PLAN:
   "1. Continue weekly individual therapy sessions (60 minutes)
   2. Continue CBT interventions focusing on cognitive restructuring
   3. Introduce progressive muscle relaxation technique next session
   4. Client to continue practicing deep breathing exercises, increase to daily practice
   5. Client to maintain sleep diary for next session
   6. Discuss medication evaluation with psychiatrist if symptoms plateau
   7. Next appointment scheduled for [one week from today]
   8. Crisis resources reviewed - client verbalized understanding"

6. Add diagnosis code: F41.1
7. Set service code/CPT if required
8. Click "Save as Draft"
9. VERIFY: Note saved as draft
10. Screenshot: Completed note form
```

### NOTE-04: Edit Draft Note
```
1. Go to "My Notes"
2. Find draft note just created
3. Click to open
4. Add to Plan: "9. Consider group therapy referral"
5. Save changes
6. VERIFY: Changes saved
7. Screenshot: Edited note
```

### NOTE-05: Sign Clinical Note
```
1. Open draft note
2. Review all content
3. Click "Sign" / "Sign Note" / "Finalize"
4. Enter signature PIN/password if required
5. Confirm signature
6. VERIFY: Note status changes to "Signed"
7. VERIFY: Signature timestamp appears
8. VERIFY: Note is now locked
9. Screenshot: Signed note
```

### NOTE-06: Create Intake Note
```
1. Click "Create New Note"
2. Select client (preferably new client)
3. Select note type: "Intake" / "Initial Assessment"
4. Fill comprehensive intake sections:
   
   IDENTIFYING INFORMATION:
   "Client is a 34-year-old married female presenting for outpatient mental health treatment."
   
   CHIEF COMPLAINT:
   "Client states: 'I can't stop worrying about everything. It's affecting my sleep and my work.'"
   
   HISTORY OF PRESENT ILLNESS:
   "Client reports experiencing excessive worry and anxiety for approximately 2 years, with significant worsening over the past 6 months. Symptoms include persistent worry about work, health, family, and finances. Physical symptoms include muscle tension, restlessness, difficulty concentrating, and sleep disturbance (difficulty falling asleep and staying asleep). Client reports symptoms are present 'most days' and rates current anxiety as 7/10. Previous treatment includes brief counseling 5 years ago for adjustment issues related to job change. No previous psychiatric hospitalizations."
   
   PAST PSYCHIATRIC HISTORY:
   "- Previous outpatient therapy: 2019, 6 sessions for adjustment disorder
   - No previous psychiatric hospitalizations
   - No previous suicide attempts
   - No history of self-harm behaviors"
   
   MEDICAL HISTORY:
   "- Hypertension (controlled with medication)
   - No other significant medical conditions
   - No history of seizures or head injury
   - Allergies: Penicillin"
   
   CURRENT MEDICATIONS:
   "- Lisinopril 10mg daily for hypertension
   - Multivitamin daily
   - No current psychiatric medications"
   
   SUBSTANCE USE:
   "- Alcohol: Social, 1-2 drinks per month
   - Tobacco: Never
   - Cannabis: Denies
   - Other substances: Denies
   - No history of substance abuse treatment"
   
   FAMILY PSYCHIATRIC HISTORY:
   "- Mother: History of depression, treated with medication
   - Father: No known psychiatric history
   - Siblings: Brother with anxiety
   - No family history of suicide or psychiatric hospitalization"
   
   SOCIAL HISTORY:
   "- Education: Bachelor's degree in Business Administration
   - Employment: Marketing Manager, employed 5 years at current company
   - Marital Status: Married 8 years
   - Children: 2 children (ages 5 and 7)
   - Living situation: Owns home, lives with spouse and children
   - Support system: Spouse, parents nearby, close friend group
   - Legal history: No legal issues
   - Trauma history: Denies significant trauma"
   
   MENTAL STATUS EXAM:
   "- Appearance: Well-groomed, appropriate dress, good hygiene
   - Behavior: Cooperative, appropriate, slightly restless
   - Speech: Normal rate, rhythm, volume
   - Mood: 'Anxious'
   - Affect: Anxious, congruent, full range
   - Thought Process: Linear, logical, goal-directed
   - Thought Content: No SI/HI, no delusions, preoccupied with worry
   - Perceptions: No hallucinations reported
   - Cognition: Alert and oriented x4, memory intact
   - Insight: Good
   - Judgment: Good"
   
   RISK ASSESSMENT:
   "- Suicidal ideation: Denied
   - Homicidal ideation: Denied
   - Self-harm urges: Denied
   - Access to weapons: Denies firearms in home
   - Protective factors: Strong family support, children, future orientation, engaged in treatment
   - Risk level: LOW"
   
   DIAGNOSIS:
   "F41.1 - Generalized Anxiety Disorder"
   
   RECOMMENDATIONS:
   "1. Weekly individual psychotherapy (CBT focus)
   2. Consider psychiatric evaluation for medication if symptoms persist
   3. Sleep hygiene education
   4. Stress management techniques
   5. Regular exercise recommended"

5. Save and sign note
6. Screenshot: Intake note
```

### NOTE-07: Create Treatment Plan
```
1. Navigate to client profile OR Create New Note
2. Select "Treatment Plan" type
3. Fill treatment plan:

   DIAGNOSIS: F41.1 Generalized Anxiety Disorder
   
   PROBLEM 1: Excessive worry and anxiety symptoms
   GOAL 1: Reduce anxiety symptoms to mild level (GAD-7 < 10) within 90 days
   
   OBJECTIVE 1.1: Client will identify 3 anxiety triggers by session 4
   - Intervention: Psychoeducation on anxiety, thought monitoring
   - Frequency: Weekly
   - Responsible: Therapist and Client
   - Target Date: 30 days
   
   OBJECTIVE 1.2: Client will demonstrate 2 coping skills during session by session 6
   - Intervention: CBT, teach deep breathing and grounding techniques
   - Frequency: Weekly practice
   - Responsible: Client with therapist guidance
   - Target Date: 45 days
   
   OBJECTIVE 1.3: Client will report using coping skills 3x/week outside session
   - Intervention: Homework assignments, coping skills log
   - Frequency: Daily practice
   - Responsible: Client
   - Target Date: 60 days
   
   PROBLEM 2: Sleep disturbance related to anxiety
   GOAL 2: Improve sleep to 7+ hours per night within 60 days
   
   OBJECTIVE 2.1: Client will implement sleep hygiene routine within 2 weeks
   - Intervention: Sleep hygiene education, behavioral strategies
   - Frequency: Nightly
   - Responsible: Client
   - Target Date: 14 days
   
   OBJECTIVE 2.2: Client will reduce bedtime worry using relaxation techniques
   - Intervention: Progressive muscle relaxation, guided imagery
   - Frequency: Nightly before bed
   - Responsible: Client
   - Target Date: 30 days
   
   ESTIMATED TREATMENT DURATION: 12-16 weeks
   FREQUENCY: Weekly 60-minute sessions
   
4. Add client signature section
5. Add therapist signature
6. Save treatment plan
7. Screenshot: Treatment plan
```

### NOTE-08: Co-Sign Queue
```
1. Click "Clinical Notes" > "Co-Sign Queue"
2. VERIFY: Queue loads
3. VERIFY: Notes pending co-signature visible (if any)
4. If notes exist:
   - Click on note to review
   - Review content
   - Click "Co-Sign" / "Approve"
   - Enter credentials if required
   - VERIFY: Note co-signed
5. Screenshot: Co-sign queue
```

### NOTE-09: Send Note Back for Revision
```
1. In Co-Sign Queue
2. Open a note pending review
3. Click "Request Revision" / "Return" / "Send Back"
4. Add feedback:
   "Please add more detail to the Assessment section regarding symptom severity and treatment progress. Also include the client's GAD-7 score from this session."
5. Submit
6. VERIFY: Note returned to author
7. Screenshot: Revision request
```

### NOTE-10: Crisis Detections
```
1. Click "Clinical Notes" > "Crisis Detections"
2. VERIFY: Page loads
3. VERIFY: Any AI-detected crisis flags visible
4. Review flagged content if any exists
5. Screenshot: Crisis detections page
```

### NOTE-11: Unlock Signed Note (Supervisor/Admin)
```
1. Navigate to a signed note
2. Click "Unlock" / "Amend" / "Request Amendment"
3. Enter reason: "Adding late entry for medication discussion"
4. Unlock note
5. Add amendment text with clear label:
   "LATE ENTRY [date]: Client also reported starting new medication (Buspirone 5mg BID) prescribed by PCP. Will monitor for effectiveness and side effects."
6. Re-sign note
7. VERIFY: Amendment trail visible
8. Screenshot: Amended note
```

---

## 💰 BILLING MODULE

### BILL-01: Billing Dashboard
```
1. Click "Billing" > "Billing Dashboard"
2. VERIFY: Dashboard loads
3. VERIFY: Key metrics visible:
   - Revenue
   - Outstanding claims
   - Collections
4. Screenshot: Billing dashboard
```

### BILL-02: Payer Dashboard
```
1. Click "Billing" > "Payer Dashboard"
2. VERIFY: Page loads
3. VERIFY: Payer performance metrics visible
4. Screenshot: Payer dashboard
```

### BILL-03: Payer Management
```
1. Click "Billing" > "Payer Management"
2. VERIFY: List of payers loads
3. View existing payers
4. Test adding new payer (if permitted):
   - Name: "TEST_Insurance_Co"
   - Payer ID: "99999"
   - Type: Commercial
5. Screenshot: Payer management
```

### BILL-04: Billing Holds
```
1. Click "Billing" > "Billing Holds"
2. VERIFY: Page loads
3. VERIFY: Held claims visible (if any)
4. Review hold reasons
5. Screenshot: Billing holds
```

### BILL-05: Readiness Checker
```
1. Click "Billing" > "Readiness Checker"
2. VERIFY: Page loads
3. VERIFY: Claims ready for submission shown
4. VERIFY: Issues/missing info flagged
5. Screenshot: Readiness checker
```

### BILL-06: View Charges
```
1. Click "Billing" > "Charges"
2. VERIFY: Charges list loads
3. Filter by date range
4. Filter by status
5. Screenshot: Charges list
```

### BILL-07: Create Charge
```
1. On Charges page
2. Click "New Charge" / "Add"
3. Fill charge details:
   - Client: Select client
   - Service Date: Today
   - CPT Code: 90837 (or select from list)
   - Diagnosis: F41.1
   - Provider: Select
   - Units: 1
   - Fee: (auto or manual)
4. Save charge
5. VERIFY: Charge created
6. Screenshot: New charge
```

### BILL-08: Payments
```
1. Click "Billing" > "Payments"
2. VERIFY: Payments list loads
3. View payment history
4. Test recording new payment:
   - Client: Select
   - Amount: $50.00
   - Payment Method: Credit Card
   - Date: Today
   - Apply to: Outstanding balance
5. Screenshot: Payments
```

### BILL-09: Generate Statement
```
1. Navigate to client billing OR Billing section
2. Click "Generate Statement"
3. Select date range
4. Generate statement
5. VERIFY: Statement preview loads
6. Download/print if available
7. Screenshot: Statement
```

---

## 📈 REPORTS & ANALYTICS MODULE

### RPT-01: Reports Dashboard
```
1. Click "Reports & Analytics" > "Reports Dashboard"
2. VERIFY: Dashboard loads
3. VERIFY: Key reports/charts visible
4. Screenshot: Reports dashboard
```

### RPT-02: Custom Reports
```
1. Click "Reports & Analytics" > "Custom Reports"
2. VERIFY: Report builder/list loads
3. View existing reports
4. Screenshot: Custom reports
```

### RPT-03: Create Custom Report
```
1. On Custom Reports
2. Click "New Report" / "Create"
3. Build report:
   - Name: "TEST_Client_Activity_Report"
   - Type: Select type
   - Date Range: Last 30 days
   - Columns: Select relevant fields
   - Filters: Add if needed
4. Run report
5. VERIFY: Report generates
6. Export to CSV/PDF if available
7. Screenshot: Custom report
```

### RPT-04: Report Subscriptions
```
1. Click "Reports & Analytics" > "Report Subscriptions"
2. VERIFY: Page loads
3. View existing subscriptions
4. Test creating subscription:
   - Report: Select report
   - Frequency: Weekly
   - Recipients: Your email
5. Screenshot: Report subscriptions
```

### RPT-05: Custom Dashboards
```
1. Click "Reports & Analytics" > "Custom Dashboards"
2. VERIFY: Page loads
3. View existing dashboards
4. Test creating/editing dashboard
5. Screenshot: Custom dashboards
```

### RPT-06: AI Predictions
```
1. Click "Reports & Analytics" > "AI Predictions"
2. VERIFY: Page loads
3. VERIFY: AI-generated predictions visible
4. Review prediction accuracy/details
5. Screenshot: AI predictions
```

### RPT-07: Provider Comparison
```
1. Click "Reports & Analytics" > "Provider Comparison"
2. VERIFY: Page loads
3. VERIFY: Provider metrics comparison visible
4. Screenshot: Provider comparison
```

### RPT-08: Session Ratings
```
1. Click "Reports & Analytics" > "Session Ratings"
2. VERIFY: Page loads
3. VERIFY: Client session ratings/feedback visible
4. Screenshot: Session ratings
```

### RPT-09: Report Builder
```
1. Click "Reports & Analytics" > "Report Builder"
2. VERIFY: Builder interface loads
3. Test drag-and-drop or configuration
4. Screenshot: Report builder
```

### RPT-10: Dashboard Widgets
```
1. Click "Reports & Analytics" > "Dashboard Widgets"
2. VERIFY: Widget configuration loads
3. View available widgets
4. Test adding/removing widgets
5. Screenshot: Dashboard widgets
```

### RPT-11: Analytics Charts
```
1. Click "Reports & Analytics" > "Analytics Charts"
2. VERIFY: Charts page loads
3. VERIFY: Various charts display
4. Test filtering/date range changes
5. Screenshot: Analytics charts
```

---

## 📊 PROGRESS TRACKING MODULE

### PROG-01: Progress Dashboard
```
1. Click "Progress Tracking" > "Progress Dashboard"
2. VERIFY: Dashboard loads
3. VERIFY: Client progress metrics visible
4. Screenshot: Progress dashboard
```

### PROG-02: Client Progress
```
1. Click "Progress Tracking" > "Client Progress"
2. VERIFY: Page loads
3. Select a client
4. VERIFY: Progress data visible (assessments over time, goals, etc.)
5. Screenshot: Client progress view
```

---

## 👨‍💼 STAFF & HR MODULE

### HR-01: Staff Directory
```
1. Click "Staff & HR" > "Staff Directory"
2. VERIFY: Staff list loads
3. VERIFY: Staff info visible (name, role, contact)
4. Search for staff member
5. Screenshot: Staff directory
```

### HR-02: Org Chart
```
1. Click "Staff & HR" > "Org Chart"
2. VERIFY: Organization chart loads
3. VERIFY: Hierarchy visible
4. Screenshot: Org chart
```

### HR-03: Onboarding Dashboard
```
1. Click "Staff & HR" > "Onboarding Dashboard"
2. VERIFY: Page loads
3. VERIFY: New hire onboarding status visible
4. Screenshot: Onboarding dashboard
```

### HR-04: Performance Reviews
```
1. Click "Staff & HR" > "Performance Reviews"
2. VERIFY: Page loads
3. View existing reviews
4. Test creating review if permitted
5. Screenshot: Performance reviews
```

### HR-05: Time Clock
```
1. Click "Staff & HR" > "Time Clock"
2. VERIFY: Time clock interface loads
3. Test clock in/out (if appropriate)
4. View time entries
5. Screenshot: Time clock
```

### HR-06: Attendance Calendar
```
1. Click "Staff & HR" > "Attendance Calendar"
2. VERIFY: Calendar loads
3. VERIFY: Attendance marked
4. Screenshot: Attendance calendar
```

### HR-07: Attendance Reports
```
1. Click "Staff & HR" > "Attendance Reports"
2. VERIFY: Reports load
3. Filter by date range
4. Screenshot: Attendance reports
```

### HR-08: PTO Requests
```
1. Click "Staff & HR" > "PTO Requests"
2. VERIFY: Page loads
3. View existing requests
4. Test submitting new PTO request:
   - Type: Vacation
   - Start Date: Next month
   - End Date: +2 days
   - Notes: "Test PTO request"
5. Screenshot: PTO requests
```

### HR-09: PTO Calendar
```
1. Click "Staff & HR" > "PTO Calendar"
2. VERIFY: Calendar loads
3. VERIFY: Approved PTO visible
4. Screenshot: PTO calendar
```

### HR-10: PTO Approvals
```
1. Click "Staff & HR" > "PTO Approvals"
2. VERIFY: Page loads
3. View pending approvals
4. Test approving/denying request (if any pending)
5. Screenshot: PTO approvals
```

### HR-11: Clinician Schedules
```
1. Click "Staff & HR" > "Clinician Schedules"
2. VERIFY: Page loads
3. VERIFY: Clinician availability/schedules visible
4. Screenshot: Clinician schedules
```

### HR-12: User Management
```
1. Click "Staff & HR" > "User Management"
2. VERIFY: User list loads
3. Search for user
4. View user details
5. Test editing user (change a non-critical field)
6. Screenshot: User management
```

### HR-13: Create New User
```
1. On User Management
2. Click "Add User" / "Invite User"
3. Fill user details:
   - First Name: "TEST"
   - Last Name: "User_[timestamp]"
   - Email: "testuser_[timestamp]@test.com"
   - Role: Select (Therapist)
   - Status: Active
4. Save/Invite
5. VERIFY: User created
6. Screenshot: New user creation
```

---

## 🎓 COMPLIANCE & TRAINING MODULE

### COMP-01: Compliance Dashboard
```
1. Click "Compliance & Training" > "Dashboard"
2. VERIFY: Dashboard loads
3. VERIFY: Compliance metrics visible
4. Screenshot: Compliance dashboard
```

### COMP-02: Credential List
```
1. Click "Compliance & Training" > "Credential List"
2. VERIFY: Credentials list loads
3. View credential details
4. Screenshot: Credential list
```

### COMP-03: Verification
```
1. Click "Compliance & Training" > "Verification"
2. VERIFY: Page loads
3. View verification status
4. Screenshot: Verification page
```

### COMP-04: Expiration Alerts
```
1. Click "Compliance & Training" > "Expiration Alerts"
2. VERIFY: Page loads
3. VERIFY: Upcoming expirations listed
4. Screenshot: Expiration alerts
```

### COMP-05: Compliance Report
```
1. Click "Compliance & Training" > "Compliance Report"
2. VERIFY: Report loads
3. Filter by date/staff
4. Screenshot: Compliance report
```

### COMP-06: Background Screening
```
1. Click "Compliance & Training" > "Background Screening"
2. VERIFY: Page loads
3. View screening status
4. Screenshot: Background screening
```

### COMP-07: Document Upload
```
1. Click "Compliance & Training" > "Document Upload"
2. VERIFY: Page loads
3. Test uploading document (if test file available)
4. Screenshot: Document upload
```

### COMP-08: Course Catalog
```
1. Click "Compliance & Training" > "Course Catalog"
2. VERIFY: Courses list loads
3. View course details
4. Screenshot: Course catalog
```

### COMP-09: CEU Tracker
```
1. Click "Compliance & Training" > "CEU Tracker"
2. VERIFY: Page loads
3. VERIFY: CEU credits tracked
4. Screenshot: CEU tracker
```

### COMP-10: Training Calendar
```
1. Click "Compliance & Training" > "Training Calendar"
2. VERIFY: Calendar loads
3. VERIFY: Training events visible
4. Screenshot: Training calendar
```

### COMP-11: Policy Library
```
1. Click "Compliance & Training" > "Policy Library"
2. VERIFY: Policies list loads
3. View policy document
4. Screenshot: Policy library
```

### COMP-12: Incident Reports
```
1. Click "Compliance & Training" > "Incident Reports"
2. VERIFY: Page loads
3. View existing incidents
4. Test creating incident report if appropriate
5. Screenshot: Incident reports
```

### COMP-13: Incident Trends
```
1. Click "Compliance & Training" > "Incident Trends"
2. VERIFY: Page loads
3. VERIFY: Trend charts/data visible
4. Screenshot: Incident trends
```

---

## 🌐 PORTALS MODULE

### PORT-01: Client Portal Admin
```
1. Click "Portals" > "Client Portal"
2. VERIFY: Client portal admin page loads
3. View portal settings/status
4. Screenshot: Client portal admin
```

### PORT-02: Guardian Dashboard
```
1. Click "Portals" > "Guardian Dashboard"
2. VERIFY: Page loads
3. View guardian accounts
4. Screenshot: Guardian dashboard
```

### PORT-03: My Dependents
```
1. Click "Portals" > "My Dependents"
2. VERIFY: Page loads
3. View dependent relationships
4. Screenshot: My dependents
```

### PORT-04: Request Access
```
1. Click "Portals" > "Request Access"
2. VERIFY: Page loads
3. View access requests
4. Approve/deny if any pending
5. Screenshot: Request access
```

### PORT-05: Guardian Verification
```
1. Click "Portals" > "Guardian Verification"
2. VERIFY: Page loads
3. View verification queue
4. Screenshot: Guardian verification
```

---

## 🔧 ADMIN TOOLS MODULE

### ADM-01: Admin Dashboard
```
1. Click "Admin Tools" > "Admin Dashboard"
2. VERIFY: Dashboard loads
3. VERIFY: System metrics visible
4. Screenshot: Admin dashboard
```

### ADM-02: Audit Log Viewer
```
1. Click "Admin Tools" > "Audit Log Viewer"
2. VERIFY: Audit logs load
3. Filter by date
4. Filter by user
5. Filter by action type
6. Search for specific action
7. Screenshot: Audit log viewer
```

---

## 🩺 CLINICIAN TOOLS MODULE

### CLIN-01: Clinician Dashboard
```
1. Click "Clinician Tools" > "Clinician Dashboard"
2. VERIFY: Dashboard loads
3. VERIFY: Clinician-specific metrics visible
4. Screenshot: Clinician dashboard
```

---

## 📹 TELEHEALTH MODULE

### TELE-01: View Telehealth Sessions
```
1. Click "Telehealth" in sidebar
2. VERIFY: Telehealth page loads
3. View scheduled telehealth sessions
4. Screenshot: Telehealth list
```

### TELE-02: Start Telehealth Session
```
1. Find telehealth appointment
2. Click "Start Session" / "Join"
3. VERIFY: Video interface loads
4. VERIFY: Camera/mic permissions requested
5. Test mute/unmute
6. Test camera on/off
7. End session
8. Screenshot: Telehealth interface
```

---

## 📅 SELF-SCHEDULE MODULE

### SCHED-01: Self-Schedule Settings
```
1. Click "Self-Schedule" in sidebar
2. VERIFY: Page loads
3. View self-scheduling settings
4. Test configuration options
5. Screenshot: Self-schedule settings
```

---

## 👨‍🏫 SUPERVISION MODULE

### SUP-01: Supervision Dashboard
```
1. Click "Supervision" in sidebar
2. VERIFY: Dashboard loads
3. VERIFY: Supervisee list visible
4. VERIFY: Pending reviews visible
5. Screenshot: Supervision dashboard
```

### SUP-02: Review Supervisee Work
```
1. On Supervision page
2. Select supervisee
3. View their notes/work
4. Provide feedback if applicable
5. Screenshot: Supervisee review
```

---

## 📊 PRODUCTIVITY MODULE

### PROD-01: Productivity Dashboard
```
1. Click "Productivity" in sidebar
2. VERIFY: Dashboard loads
3. VERIFY: Productivity metrics visible
4. Screenshot: Productivity dashboard
```

---

## 💬 COMMUNICATION MODULE

### COMM-01: Messaging Hub
```
1. Click "Communication" > "Messaging Hub"
2. VERIFY: Messaging interface loads
3. View conversations
4. Send test message to colleague (internal)
5. Screenshot: Messaging hub
```

### COMM-02: Channels
```
1. Click "Communication" > "Channels"
2. VERIFY: Page loads
3. View existing channels
4. Test creating channel if permitted
5. Screenshot: Channels
```

### COMM-03: Document Library
```
1. Click "Communication" > "Document Library"
2. VERIFY: Page loads
3. View documents
4. Test uploading document
5. Screenshot: Document library
```

---

## 💵 VENDORS & FINANCE MODULE

### FIN-01: Vendor Management
```
1. Click "Vendors & Finance" > "Vendor Management"
2. VERIFY: Page loads
3. View vendors
4. Test adding vendor if permitted
5. Screenshot: Vendor management
```

### FIN-02: Budget Dashboard
```
1. Click "Vendors & Finance" > "Budget Dashboard"
2. VERIFY: Dashboard loads
3. VERIFY: Budget metrics visible
4. Screenshot: Budget dashboard
```

### FIN-03: Expense Management
```
1. Click "Vendors & Finance" > "Expense Management"
2. VERIFY: Page loads
3. View expenses
4. Test creating expense if permitted
5. Screenshot: Expense management
```

### FIN-04: Purchase Orders
```
1. Click "Vendors & Finance" > "Purchase Orders"
2. VERIFY: Page loads
3. View existing POs
4. Test creating PO if permitted
5. Screenshot: Purchase orders
```

---

## ⚙️ SETTINGS MODULE

### SET-01: Practice Settings
```
1. Click "Settings" > "Practice Settings"
2. VERIFY: Settings page loads
3. View current settings
4. Test editing non-critical setting
5. Screenshot: Practice settings
```

### SET-02: Reminder Settings
```
1. Click "Settings" > "Reminder Settings"
2. VERIFY: Page loads
3. View reminder configuration
4. Screenshot: Reminder settings
```

### SET-03: Scheduling Rules
```
1. Click "Settings" > "Scheduling Rules"
2. VERIFY: Page loads
3. View scheduling rules
4. Screenshot: Scheduling rules
```

### SET-04: AdvancedMD Sync
```
1. Click "Settings" > "AdvancedMD Sync"
2. VERIFY: Page loads
3. View sync status
4. Screenshot: AdvancedMD sync
```

### SET-05: AdvancedMD Settings
```
1. Click "Settings" > "AdvancedMD Settings"
2. VERIFY: Page loads
3. View integration settings
4. Screenshot: AdvancedMD settings
```

---

## 👤 PROFILE

### PROF-01: View My Profile
```
1. Click user avatar/name at bottom of sidebar
2. Click "My Profile"
3. VERIFY: Profile page loads
4. VERIFY: Personal info visible
5. Screenshot: My profile
```

### PROF-02: Edit My Profile
```
1. On Profile page
2. Click "Edit"
3. Update phone number or non-critical field
4. Save changes
5. VERIFY: Changes saved
6. Screenshot: Profile edit
```

---

# ═══════════════════════════════════════════════════════════════
# PART 2: CLIENT PORTAL TESTS (25+ Tests)
# ═══════════════════════════════════════════════════════════════

## CLIENT PORTAL LOGIN INSTRUCTIONS
```
1. Navigate to client portal URL
2. Login with test client credentials
   (Create client in staff portal first, then use portal credentials)
```

---

## 🏠 CLIENT PORTAL - DASHBOARD

### CP-01: Client Portal Login
```
1. Navigate to client portal login page
2. Enter client email
3. Enter client password
4. Click "Login"
5. VERIFY: Client dashboard loads
6. Screenshot: Client portal dashboard
```

### CP-02: Client Dashboard
```
1. After login
2. VERIFY: Dashboard shows:
   - Upcoming appointments
   - Messages notification
   - Quick actions
3. Screenshot: Dashboard
```

---

## 📅 CLIENT PORTAL - APPOINTMENTS

### CP-03: View Appointments
```
1. Click "Appointments" in sidebar
2. VERIFY: Appointments list loads
3. VERIFY: Upcoming appointments visible
4. VERIFY: Past appointments visible
5. Screenshot: Appointments list
```

### CP-04: Self-Schedule Appointment
```
1. Click "Self-Schedule" in sidebar
2. VERIFY: Scheduling interface loads
3. Select provider (if multiple)
4. Select appointment type
5. Select available date
6. Select available time
7. Add reason/notes: "Test appointment from portal"
8. Confirm booking
9. VERIFY: Appointment confirmed
10. Screenshot: Self-scheduling flow
```

### CP-05: Cancel Appointment (Client)
```
1. Go to Appointments
2. Find upcoming appointment
3. Click "Cancel"
4. Select cancellation reason
5. Confirm cancellation
6. VERIFY: Appointment cancelled
7. Screenshot: Cancellation
```

---

## 👨‍⚕️ CLIENT PORTAL - MY THERAPIST

### CP-06: View My Therapist
```
1. Click "My Therapist" in sidebar
2. VERIFY: Therapist info loads
3. VERIFY: Name, credentials visible
4. VERIFY: Contact info or message button visible
5. Screenshot: My therapist page
```

---

## 💬 CLIENT PORTAL - MESSAGES

### CP-07: View Messages
```
1. Click "Messages" in sidebar
2. VERIFY: Messages/inbox loads
3. View existing conversations
4. Screenshot: Messages list
```

### CP-08: Send Message to Therapist
```
1. In Messages
2. Click "New Message" or open existing conversation
3. Type message:
   "Hi, I wanted to let you know that I've been practicing the breathing exercises we discussed. I'm also wondering if we could talk about some work stress I've been experiencing. Looking forward to our next session!"
4. Click "Send"
5. VERIFY: Message sent
6. Screenshot: Sent message
```

### CP-09: Read Message from Therapist
```
1. In Messages
2. Click on unread message
3. Read message content
4. VERIFY: Marked as read
5. Screenshot: Read message
```

---

## 📄 CLIENT PORTAL - DOCUMENTS

### CP-10: View Documents
```
1. Click "Documents" in sidebar
2. VERIFY: Documents list loads
3. View available documents
4. Screenshot: Documents list
```

### CP-11: Download Document
```
1. In Documents
2. Click on a document
3. Download or view document
4. VERIFY: Document opens/downloads
5. Screenshot: Document view
```

### CP-12: Sign Document
```
1. Find document requiring signature
2. Open document
3. Review content
4. Sign (type name or draw signature)
5. Submit signed document
6. VERIFY: Document marked as signed
7. Screenshot: Signed document
```

---

## 📋 CLIENT PORTAL - ASSESSMENTS

### CP-13: View Assessments
```
1. Click "Assessments" in sidebar
2. VERIFY: Assessments page loads
3. View pending assessments
4. View completed assessments
5. Screenshot: Assessments list
```

### CP-14: Complete PHQ-9 Assessment
```
1. Find PHQ-9 assessment
2. Click to start
3. Answer ALL 9 questions:
   Q1: "Little interest or pleasure in doing things" → 1 (Several days)
   Q2: "Feeling down, depressed, or hopeless" → 1 (Several days)
   Q3: "Trouble falling/staying asleep, or sleeping too much" → 2 (More than half the days)
   Q4: "Feeling tired or having little energy" → 1 (Several days)
   Q5: "Poor appetite or overeating" → 0 (Not at all)
   Q6: "Feeling bad about yourself" → 1 (Several days)
   Q7: "Trouble concentrating" → 1 (Several days)
   Q8: "Moving or speaking slowly/being fidgety" → 0 (Not at all)
   Q9: "Thoughts of self-harm" → 0 (Not at all)
4. Answer difficulty question
5. Submit assessment
6. VERIFY: Submitted successfully
7. Screenshot: Completed PHQ-9
```

### CP-15: Complete GAD-7 Assessment
```
1. Find GAD-7 assessment
2. Click to start
3. Answer ALL 7 questions:
   Q1: "Feeling nervous, anxious, or on edge" → 2 (More than half the days)
   Q2: "Not being able to stop or control worrying" → 2 (More than half the days)
   Q3: "Worrying too much about different things" → 2 (More than half the days)
   Q4: "Trouble relaxing" → 1 (Several days)
   Q5: "Being so restless it's hard to sit still" → 1 (Several days)
   Q6: "Becoming easily annoyed or irritable" → 1 (Several days)
   Q7: "Feeling afraid something awful might happen" → 1 (Several days)
4. Submit assessment
5. VERIFY: Submitted successfully
6. Screenshot: Completed GAD-7
```

---

## 📔 CLIENT PORTAL - SYMPTOM DIARY

### CP-16: Symptom Diary
```
1. Click "Symptom Diary" in sidebar
2. VERIFY: Page loads
3. View existing entries
4. Add new entry:
   - Date: Today
   - Symptoms: Select/enter symptoms
   - Severity: Rate 1-10
   - Notes: "Felt anxious in the morning, improved after lunch"
5. Save entry
6. VERIFY: Entry saved
7. Screenshot: Symptom diary
```

---

## 😴 CLIENT PORTAL - SLEEP DIARY

### CP-17: Sleep Diary
```
1. Click "Sleep Diary" in sidebar
2. VERIFY: Page loads
3. View existing entries
4. Add new entry:
   - Date: Last night
   - Bedtime: 11:00 PM
   - Wake time: 6:30 AM
   - Hours slept: 6.5
   - Quality: 3/5
   - Notes: "Woke up once around 3am"
5. Save entry
6. VERIFY: Entry saved
7. Screenshot: Sleep diary
```

---

## 🏃 CLIENT PORTAL - EXERCISE LOG

### CP-18: Exercise Log
```
1. Click "Exercise Log" in sidebar
2. VERIFY: Page loads
3. View existing entries
4. Add new entry:
   - Date: Today
   - Activity: Walking
   - Duration: 30 minutes
   - Intensity: Moderate
   - Notes: "Walked around neighborhood"
5. Save entry
6. VERIFY: Entry saved
7. Screenshot: Exercise log
```

---

## 😊 CLIENT PORTAL - MOOD JOURNAL

### CP-19: Mood Journal
```
1. Click "Mood Journal" in sidebar
2. VERIFY: Page loads
3. View existing entries
4. Add new entry:
   - Date: Today
   - Mood: Select (e.g., "Okay" or 6/10)
   - Notes: "Feeling a bit stressed about work deadline, but managing okay. Used breathing exercises this morning which helped."
5. Save entry
6. VERIFY: Entry saved
7. Screenshot: Mood journal
```

---

## 💳 CLIENT PORTAL - BILLING

### CP-20: View Billing
```
1. Click "Billing" in sidebar
2. VERIFY: Page loads
3. View outstanding balance
4. View payment history
5. View statements
6. Screenshot: Billing page
```

### CP-21: Make Payment (if available)
```
1. In Billing
2. Click "Make Payment"
3. Enter amount or select balance
4. Enter payment method
5. Submit payment
6. VERIFY: Payment processed
7. Screenshot: Payment confirmation
```

---

## 🔗 CLIENT PORTAL - REFER A FRIEND

### CP-22: Refer a Friend
```
1. Click "Refer a Friend" in sidebar
2. VERIFY: Page loads
3. View referral program info
4. Test sending referral:
   - Friend's name: "Test Friend"
   - Friend's email: "testfriend@test.com"
5. Submit referral
6. Screenshot: Referral page
```

---

## 👤 CLIENT PORTAL - PROFILE

### CP-23: View Profile
```
1. Click "Profile" in sidebar
2. VERIFY: Profile page loads
3. VERIFY: Personal info visible
4. Screenshot: Profile page
```

### CP-24: Edit Profile
```
1. On Profile
2. Click "Edit"
3. Update phone number: "(555) 999-1111"
4. Save changes
5. VERIFY: Changes saved
6. Screenshot: Updated profile
```

### CP-25: Change Password
```
1. On Profile
2. Find "Change Password" or security section
3. Enter current password
4. Enter new password
5. Confirm new password
6. Save
7. VERIFY: Password changed
8. Screenshot: Password change
```

---

# ═══════════════════════════════════════════════════════════════
# PART 3: CROSS-MODULE WORKFLOW TESTS (10 Tests)
# ═══════════════════════════════════════════════════════════════

### FLOW-01: Complete Client Onboarding Flow
```
STAFF ACTIONS:
1. Create new client (CLT-04)
2. Send intake documents to client
3. Send assessments to client

CLIENT ACTIONS:
4. Login to portal
5. Complete intake forms
6. Sign consent documents
7. Complete PHQ-9 assessment
8. Complete GAD-7 assessment

STAFF ACTIONS:
9. Review completed forms
10. Review assessment scores
11. Create intake note
12. Create treatment plan
13. Schedule first appointment

VERIFY: All data flows correctly between portals
Screenshot: Each major step
```

### FLOW-02: Appointment Lifecycle
```
1. Create appointment (staff)
2. Client views appointment in portal
3. Send reminder (if manual trigger available)
4. Check-in client for appointment
5. Start telehealth OR mark as arrived
6. Complete session
7. Create progress note
8. Sign note
9. Generate charge
10. Verify charge in billing

Screenshot: Each step
```

### FLOW-03: Clinical Note Supervision Flow
```
1. Therapist creates progress note (NOTE-03)
2. Therapist signs note (NOTE-05)
3. Note appears in Co-Sign Queue
4. Supervisor reviews note
5. Supervisor co-signs OR sends back
6. If sent back: Therapist edits and resubmits
7. Final co-signature applied
8. Note fully complete

Screenshot: Each step
```

### FLOW-04: Billing Complete Flow
```
1. Complete session with client
2. Create and sign progress note
3. Navigate to Billing > Charges
4. Verify charge created (or create manually)
5. Run Readiness Checker
6. Submit claim (if applicable)
7. Record payment when received
8. Generate client statement
9. Client views statement in portal

Screenshot: Each step
```

### FLOW-05: Staff Onboarding Flow
```
1. Create new user (HR-13)
2. Assign credentials/training
3. User appears in Compliance tracking
4. Verify in Staff Directory
5. Assign to Org Chart position
6. Set up availability/schedule

Screenshot: Each step
```

### FLOW-06: Client Communication Flow
```
STAFF ACTIONS:
1. Navigate to Messaging Hub
2. Find client conversation
3. Send message to client

CLIENT ACTIONS:
4. Login to portal
5. View new message notification
6. Read message
7. Reply to message

STAFF ACTIONS:
8. Receive and read reply

Screenshot: Each message
```

### FLOW-07: Assessment and Progress Tracking Flow
```
1. Send PHQ-9 assessment to client
2. Client completes assessment
3. View results in staff portal
4. Check Progress Tracking dashboard
5. View Client Progress with assessment over time
6. Document in clinical note

Screenshot: Each step
```

### FLOW-08: PTO Request Flow
```
1. Staff submits PTO request (HR-08)
2. Request appears in PTO Approvals
3. Manager approves request
4. Approved PTO appears on PTO Calendar
5. Staff schedule reflects time off

Screenshot: Each step
```

### FLOW-09: Incident Reporting Flow
```
1. Create incident report (COMP-12)
2. Incident appears in reports list
3. Review incident details
4. Check Incident Trends
5. Generate Compliance Report

Screenshot: Each step
```

### FLOW-10: Group Session Flow
```
1. Create group session (GRP-02)
2. Add participants (GRP-03)
3. Schedule group session
4. Mark attendance (GRP-04)
5. Create group note
6. Generate charges for participants

Screenshot: Each step
```

---

# ═══════════════════════════════════════════════════════════════
# PART 4: ERROR HANDLING TESTS (10 Tests)
# ═══════════════════════════════════════════════════════════════

### ERR-01: Invalid Login
```
1. Navigate to login
2. Enter wrong email/password
3. VERIFY: Error message displayed
4. VERIFY: No access granted
Screenshot: Error message
```

### ERR-02: Required Field Validation
```
1. Open Create Client form
2. Leave required fields empty
3. Click Save
4. VERIFY: Validation errors shown for each required field
Screenshot: Validation errors
```

### ERR-03: Invalid Data Format
```
1. Open any form with date/email/phone fields
2. Enter invalid formats:
   - Email: "notanemail"
   - Phone: "abc"
   - Date: "99/99/9999"
3. VERIFY: Format validation errors shown
Screenshot: Format errors
```

### ERR-04: Duplicate Record Prevention
```
1. Try to create client with same email as existing
2. VERIFY: Duplicate warning or prevention
Screenshot: Duplicate handling
```

### ERR-05: Permission Denied (if testable)
```
1. Try to access admin feature without permission
2. VERIFY: Access denied message
Screenshot: Permission error
```

### ERR-06: Session Timeout
```
1. Login successfully
2. Wait for session timeout (or manually clear cookies)
3. Try to perform action
4. VERIFY: Redirected to login or session expired message
Screenshot: Timeout handling
```

### ERR-07: Network Error Handling
```
1. Disconnect network briefly
2. Try to submit form
3. VERIFY: Error message displayed (not just spinning forever)
Screenshot: Network error
```

### ERR-08: Concurrent Edit Warning
```
1. Open same record in two tabs
2. Edit in tab 1 and save
3. Edit in tab 2 and try to save
4. VERIFY: Conflict warning shown
Screenshot: Concurrent edit handling
```

### ERR-09: Character Limit Validation
```
1. Find text field with character limit
2. Enter text exceeding limit
3. VERIFY: Limit enforced or warning shown
Screenshot: Character limit
```

### ERR-10: Cancel Without Save Warning
```
1. Open form and enter data
2. Navigate away without saving
3. VERIFY: Warning prompt to save changes
Screenshot: Unsaved changes warning
```

---

# ═══════════════════════════════════════════════════════════════
# TEST EXECUTION SUMMARY
# ═══════════════════════════════════════════════════════════════

## Total Test Count

| Section | Tests |
|---------|-------|
| Authentication | 3 |
| Dashboard | 2 |
| Clients | 8 |
| Appointments | 9 |
| Group Sessions | 4 |
| Clinical Notes | 11 |
| Billing | 9 |
| Reports & Analytics | 11 |
| Progress Tracking | 2 |
| Staff & HR | 13 |
| Compliance & Training | 13 |
| Portals | 5 |
| Admin Tools | 2 |
| Clinician Tools | 1 |
| Telehealth | 2 |
| Self-Schedule | 1 |
| Supervision | 2 |
| Productivity | 1 |
| Communication | 3 |
| Vendors & Finance | 4 |
| Settings | 5 |
| Profile | 2 |
| **Staff Portal Subtotal** | **~113** |
| Client Portal | 25 |
| Cross-Module Workflows | 10 |
| Error Handling | 10 |
| **GRAND TOTAL** | **~158 Tests** |

---

## Execution Order

1. AUTH tests (login first)
2. DASH tests
3. CLT tests (create test client)
4. APT tests
5. NOTE tests
6. Continue through all staff modules
7. CP tests (client portal)
8. FLOW tests (cross-module)
9. ERR tests (error handling)

---

## Documentation

For each test, document:
```
Test ID: [XXX-##]
Test Name: [Name]
Status: ✅ PASS | ❌ FAIL | ⏭️ SKIPPED
Date/Time: [timestamp]
Notes: [Any observations]
Screenshot: [filename or reference]
Issues Found: [If any]
```

---

## Final Report Template

```
# MentalSpace EHR Comprehensive Test Report

Date: [Date]
Tester: Claude Browser Testing Agent
Environment: https://www.mentalspaceehr.com

## Summary
- Total Tests: 158
- Passed: [X]
- Failed: [X]
- Skipped: [X]
- Pass Rate: [X]%

## Results by Module
[Table of pass/fail by module]

## Critical Issues
[List any blocking issues]

## Minor Issues
[List non-blocking issues]

## Screenshots
[Index of all screenshots]

## Recommendations
[Suggested fixes or improvements]
```
