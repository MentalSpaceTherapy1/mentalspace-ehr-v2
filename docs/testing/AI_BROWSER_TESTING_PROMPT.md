# MentalSpace EHR - Comprehensive AI Browser Testing Prompt

## Application URL
- **Production URL:** https://www.mentalspaceehr.com
- **Test with:** Staff/Clinician credentials (not client portal)

---

## PHASE 1: LOGIN AND INITIAL SETUP

### Step 1.1: Login to the Application
1. Navigate to https://www.mentalspaceehr.com
2. Enter valid clinician credentials:
   - Email: [Use provided test credentials]
   - Password: [Use provided test credentials]
3. Click "Sign In" button
4. Verify successful login by confirming you see the Dashboard
5. Note the logged-in user's name in the top navigation

---

## PHASE 2: CREATE A NEW CLIENT (Complete All Fields)

### Step 2.1: Navigate to Client Creation
1. In the left sidebar, click on "Clients" menu item
2. Click "Client List" from the submenu
3. Click the "+ Add New Client" or "Create Client" button (usually top-right)

### Step 2.2: Complete Personal Information Section
Fill in ALL fields (required and optional):

**Required Fields:**
- First Name: "TestClient"
- Last Name: "AutomatedBrowser"
- Date of Birth: "1985-06-15" (select from date picker)

**Optional Fields:**
- Middle Name: "Marie"
- Suffix: "Jr."
- Preferred Name: "TC"
- Pronouns: Select "they/them" from dropdown
- Previous Names: If field allows, add "Smith" as a previous name

### Step 2.3: Complete Contact Information Section
**Required Fields:**
- Primary Phone: "555-123-4567"
- Email: "testclient.automated@example.com"

**Optional Fields:**
- Primary Phone Type: Select "Mobile"
- Secondary Phone: "555-987-6543"
- Secondary Phone Type: Select "Home"
- Preferred Contact Method: Select "Email"
- Okay to Leave Message: Check/Enable this checkbox

### Step 2.4: Complete Address Information Section
**Required Fields:**
- Street Address 1: "123 Test Avenue"
- City: "New York"
- State: Select "NY" from dropdown
- ZIP Code: "10001"

**Optional Fields:**
- Street Address 2: "Apt 4B"
- County: "New York County"
- Is Temporary Address: Leave unchecked
- Mailing Address (if different section exists):
  - Mailing Street 1: "456 Mail Street"
  - Mailing Street 2: "Suite 100"
  - Mailing City: "Brooklyn"
  - Mailing State: "NY"
  - Mailing ZIP: "11201"

### Step 2.5: Complete Demographics Section
**Required Fields:**
- Gender: Select "NON_BINARY" or "Other"

**Optional Fields:**
- Gender Identity: Select "Non-binary"
- Sex Assigned at Birth: Select appropriate option
- Sexual Orientation: Select "Pansexual"
- Marital Status: Select "SINGLE"
- Race: Select multiple if possible - "White", "Asian"
- Ethnicity: Select "Not Hispanic or Latino"
- Primary Language: Select "English"
- Other Languages: Add "Spanish" if field allows
- Needs Interpreter: Leave unchecked
- Religion: Select "Spiritual but not religious"

### Step 2.6: Complete Social/Socioeconomic Information
- Education: Select "Bachelor's" or equivalent
- Employment Status: Select "Employed"
- Occupation: Type "Software Engineer"
- Employer: Type "Tech Company Inc."
- Living Arrangement: Select "Alone" or "With Partner"
- Housing Status: Select "Rent"

### Step 2.7: Complete Military/Veteran Information
- Is Veteran: Leave unchecked (or check and fill below if testing veteran features)
- If checked: Military Branch: "Army", Discharge Type: "Honorable"

### Step 2.8: Complete Clinical Assignment Section
**Required Field:**
- Primary Therapist: Select any available clinician from dropdown (this is required)

**Optional Fields:**
- Secondary Therapist 1: Select different clinician if available
- Secondary Therapist 2: Leave empty
- Secondary Therapist 3: Leave empty
- Psychiatrist: Select if available
- Case Manager: Select if available

### Step 2.9: Complete Special Needs & Accessibility
- Special Needs: Type "None documented"
- Accessibility Needs: If multi-select, select "None"
- Allergy Alerts: Type "Penicillin allergy - documented"

### Step 2.10: Complete Consent Section (if visible on creation)
- Treatment Consent: Check if available
- HIPAA Acknowledgment: Check if available
- Release of Information: Check if available
- Electronic Communication: Check
- Appointment Reminders: Check
- Photography Consent: Leave unchecked

### Step 2.11: Save the Client
1. Review all entered information
2. Click "Save" or "Create Client" button
3. Wait for success message
4. **IMPORTANT:** Note the client's name or Medical Record Number (MRN) for later reference
5. Verify you're redirected to the client's profile or client list

---

## PHASE 3: ADD EMERGENCY CONTACTS

### Step 3.1: Navigate to Emergency Contacts
1. If not already on client profile, go to Clients → Client List
2. Search for "TestClient AutomatedBrowser" or click on the newly created client
3. Look for "Emergency Contacts" section or tab

### Step 3.2: Add Primary Emergency Contact
Click "Add Emergency Contact" and fill:
- Name: "John Emergency"
- Relationship: "Spouse"
- Phone: "555-111-2222"
- Alternate Phone: "555-111-3333"
- Email: "johnemergency@example.com"
- Address: "123 Emergency Lane, New York, NY 10001"
- Is Primary: Check this box
- Okay to Discuss Health: Check this box
- Okay to Leave Message: Check this box
- Save the emergency contact

### Step 3.3: Add Secondary Emergency Contact
Click "Add Emergency Contact" again:
- Name: "Jane Backup"
- Relationship: "Parent"
- Phone: "555-444-5555"
- Alternate Phone: Leave empty
- Email: "janebackup@example.com"
- Address: "456 Backup Road, Queens, NY 11375"
- Is Primary: Leave unchecked
- Okay to Discuss Health: Check
- Okay to Leave Message: Check
- Save

---

## PHASE 4: ADD INSURANCE INFORMATION

### Step 4.1: Navigate to Insurance Section
1. On the client's profile, find "Insurance" or "Insurance Information" tab/section
2. Click "Add Insurance" or similar button

### Step 4.2: Add Primary Insurance
- Rank: Select "Primary"
- Insurance Company: Type "Blue Cross Blue Shield"
- Plan Name: "PPO Gold"
- Plan Type: Select "PPO" if available
- Member ID: "BCB123456789"
- Group Number: "GRP-001234"
- Effective Date: "2024-01-01"
- Termination Date: Leave empty (active coverage)

**Subscriber Information:**
- Subscriber Is Client: Check this box (auto-fills subscriber fields)
- If unchecked, fill:
  - Subscriber First Name: "TestClient"
  - Subscriber Last Name: "AutomatedBrowser"
  - Subscriber DOB: "1985-06-15"
  - Relationship to Subscriber: "Self"

**Contact Numbers:**
- Customer Service Phone: "800-123-4567"
- Precertification Phone: "800-123-4568"
- Provider Phone: "800-123-4569"

**Coverage Details:**
- Requires Referral: Leave unchecked
- Requires Prior Auth: Check this box
- Mental Health Coverage: Check this box
- Copay: "30.00"
- Coinsurance: "20" (percentage)
- Deductible: "500.00"
- Deductible Met: "250.00"
- Out of Pocket Max: "3000.00"
- Out of Pocket Met: "500.00"

**Verification:**
- Last Verification Date: Today's date
- Verification Notes: "Verified via phone, coverage active"
- Remaining Sessions: "20"

- Save Primary Insurance

### Step 4.3: Add Secondary Insurance
Click "Add Insurance" again:
- Rank: Select "Secondary"
- Insurance Company: "Aetna"
- Plan Name: "HMO Basic"
- Plan Type: "HMO"
- Member ID: "AET987654321"
- Group Number: "GRP-005678"
- Effective Date: "2024-01-01"
- Termination Date: Leave empty

**Subscriber Information:**
- Subscriber Is Client: Uncheck
- Subscriber First Name: "Parent"
- Subscriber Last Name: "AutomatedBrowser"
- Subscriber DOB: "1960-03-20"
- Relationship to Subscriber: "Child"
- Subscriber Employer: "Parent's Company LLC"

**Coverage Details:**
- Copay: "25.00"
- Coinsurance: "10"
- Mental Health Coverage: Check

- Save Secondary Insurance

---

## PHASE 5: CREATE CLIENT PORTAL CREDENTIALS

### Step 5.1: Navigate to Portal Setup
1. On the client's profile, look for "Portal Access" or "Client Portal" section
2. Or navigate to: Client Portal menu → Client's Portal Status

### Step 5.2: Invite Client to Portal
1. Look for "Invite to Portal" or "Send Portal Invitation" button
2. Click the button
3. Confirm the invitation dialog if prompted
4. **Note:** The system will send an email to the client's email address with a registration link
5. Record the invitation was sent successfully

### Step 5.3: Document Portal Credentials Process
The client will receive an email with:
- Registration link: `/portal/register?token={token}&email={email}`
- They will set their own password
- Password requirements: 8+ characters, uppercase, lowercase, number, special character

**For testing purposes, note:**
- Portal Email: "testclient.automated@example.com" (same as client email)
- Portal Password: Will be set by client via email link
- Status: PENDING_VERIFICATION until client completes registration

---

## PHASE 6: CREATE APPOINTMENTS

### Step 6.1: Navigate to Appointments
1. Click "Appointments" in the left sidebar
2. Click "Calendar" from the submenu

### Step 6.2: Create First Appointment (Initial Intake)
1. Click on a future date/time slot in the calendar, OR
2. Click "+ New Appointment" or "Create Appointment" button
3. Fill in appointment details:
   - Client: Search and select "TestClient AutomatedBrowser"
   - Clinician: Select the primary therapist assigned to client
   - Date: Select a date 2-3 days from now
   - Start Time: "10:00 AM"
   - End Time: "11:00 AM" (or Duration: 60 minutes)
   - Appointment Type: Select "Initial Intake" or "Intake Assessment"
   - Service Location: Select "In Office" or "IN_OFFICE"
   - Room: Select any available room if shown
   - CPT Code: "90791" (Psychiatric Diagnostic Evaluation)
   - Appointment Notes: "Initial intake appointment - comprehensive assessment"
4. Click "Save" or "Create Appointment"
5. Verify appointment appears on calendar

### Step 6.3: Create Second Appointment (Therapy Session)
1. Click "+ New Appointment"
2. Fill in:
   - Client: "TestClient AutomatedBrowser"
   - Clinician: Same therapist
   - Date: 1 week after the intake appointment
   - Start Time: "2:00 PM"
   - End Time: "2:45 PM" (45-minute session)
   - Appointment Type: "Individual Therapy" or "Psychotherapy"
   - Service Location: "Telehealth"
   - CPT Code: "90834" (Psychotherapy, 45 minutes)
   - Notes: "Follow-up therapy session"
3. Save the appointment

### Step 6.4: Create Third Appointment (For Cancellation Testing)
1. Click "+ New Appointment"
2. Fill in:
   - Client: "TestClient AutomatedBrowser"
   - Clinician: Same therapist
   - Date: 2 weeks from now
   - Start Time: "11:00 AM"
   - End Time: "12:00 PM"
   - Appointment Type: "Individual Therapy"
   - Service Location: "In Office"
   - Notes: "Appointment to be cancelled for testing"
3. Save the appointment

### Step 6.5: Cancel the Third Appointment
1. Find the third appointment on the calendar
2. Click on it to open details
3. Look for "Cancel Appointment" button or option
4. Fill in cancellation details:
   - Cancellation Reason: "Client requested reschedule"
   - Cancellation Notes: "Testing cancellation workflow"
   - Cancellation Fee Applied: Leave unchecked
5. Confirm cancellation
6. Verify appointment status changed to "CANCELLED"

---

## PHASE 7: CREATE CLINICAL NOTES

### Step 7.1: Navigate to Clinical Notes
1. Click "Clinical Notes" in the left sidebar
2. Click "Create New Note" from submenu

### Step 7.2: Create Intake Assessment Note
1. Select Note Type: "Intake Assessment"
2. Select Client: "TestClient AutomatedBrowser"
3. Select Appointment: Choose the first appointment (Initial Intake)
4. Fill in all sections:

**Session Information:**
- Session Date: Auto-populated from appointment
- Due Date: 7 days from session date
- Next Session Date: Date of second appointment

**Presenting Problem:**
- Chief Complaint: "Anxiety and depression affecting daily functioning"
- Presenting Problem: "Client reports experiencing persistent anxiety for the past 6 months, with symptoms including excessive worry, difficulty sleeping, and occasional panic attacks. Also experiencing depressive symptoms including low mood and decreased interest in activities."

**Symptoms (rate severity 0-10 for each):**
- Depression: 6
- Anxiety: 8
- Sleep Problems: 7
- Concentration Issues: 5
- Irritability: 4
- Fatigue: 6
- Check "Panic Attacks" if available: Severity 5
- All others: 0 or minimal

**History:**
- Psychiatric History: "No prior psychiatric hospitalizations. Previous outpatient therapy 3 years ago for 6 months."
- Medical History: "Generally healthy. Penicillin allergy documented."
- Current Medications: "None"
- Family History: "Mother has history of depression. Father has history of anxiety."
- Social History: "Works full-time as software engineer. Lives alone. Has supportive friend network."
- Developmental History: "Normal developmental milestones met. No significant childhood trauma reported."
- Substance Use - Alcohol: Select "Social" or "Occasional"
- Substance Use - Tobacco: Select "Never"
- Substance Use - Drugs: Select "Never"

**Mental Status Examination:**
- Appearance/Grooming: "Well-groomed"
- Appearance/Hygiene: "Good"
- Appearance/Dress: "Appropriate"
- Behavior/Eye Contact: "Good"
- Behavior/Motor Activity: "Normal"
- Behavior/Cooperation: "Cooperative"
- Speech/Rate: "Normal"
- Speech/Volume: "Normal"
- Mood: "Anxious"
- Affect/Range: "Full"
- Affect/Appropriateness: "Appropriate"
- Thought Process: "Logical and goal-directed"
- Thought Content - Suicidal Ideation: "Denied"
- Thought Content - Homicidal Ideation: "Denied"
- Thought Content - Delusions: "None"
- Perception - Hallucinations: "None"
- Cognition/Orientation: Check all - Person, Place, Time, Situation
- Cognition/Attention: "Intact"
- Cognition/Memory: "Intact" for immediate, recent, and remote
- Insight: "Good"
- Judgment: "Good"

**Safety Assessment:**
- Self-Harm: "No"
- Suicidal Ideation: "No"
- Homicidal Ideation: "No"
- Risk Level: "Low"
- Risk Factors: "Anxiety symptoms, living alone"
- Protective Factors: "Employment, supportive friends, engaged in treatment"
- Safety Plan: "Client will contact therapist or crisis line if symptoms worsen"

**Diagnosis:**
- ICD-10 Code 1: "F41.1" (Generalized Anxiety Disorder)
- ICD-10 Code 2: "F32.1" (Major Depressive Disorder, single episode, moderate)
- CPT Code: "90791"
- Billable: Check/Yes

**Treatment Recommendations:**
- Recommendations: "Weekly individual psychotherapy using CBT approach. Consider psychiatric evaluation for medication if symptoms do not improve within 4-6 weeks."
- Recommended Frequency: "Weekly"

**Assessment & Plan (SOAP):**
- Assessment: "Client presents with moderate anxiety and depressive symptoms. Good insight and motivation for treatment."
- Plan: "1. Begin weekly CBT-focused therapy. 2. Assign PHQ-9 and GAD-7 for symptom tracking. 3. Provide psychoeducation on anxiety and depression. 4. Review progress in 4 weeks."

5. Click "Save as Draft" to save progress
6. Click "Sign Note" to finalize
7. Confirm signing if prompted

### Step 7.3: Create Progress Note
1. Go to Clinical Notes → Create New Note
2. Select Note Type: "Progress Note"
3. Select Client: "TestClient AutomatedBrowser"
4. Select Appointment: Choose the second appointment (therapy session)
5. Fill in:

**Session Information:**
- Session Date: Auto-populated
- Session Duration: "45 minutes"
- Session Type: "Individual Therapy"
- Location: "Telehealth"

**Current Symptoms (rate each):**
- Depression: 5 (improved from 6)
- Anxiety: 7 (improved from 8)
- Sleep Problems: 6
- Other symptoms as appropriate

**Progress Toward Goals:**
- Goal 1: "Reduce anxiety symptoms"
  - Progress: "Moderate Progress"
  - Notes: "Client practicing breathing exercises daily"
- Goal 2: "Improve sleep quality"
  - Progress: "Some Progress"
  - Notes: "Implementing sleep hygiene recommendations"

**Brief Mental Status:**
- Appearance: "Well-groomed"
- Mood: "Somewhat anxious but improved"
- Affect: "Appropriate"
- Thought Process: "Logical"
- Suicidal Ideation: "No"
- Homicidal Ideation: "No"
- Risk Level: "Low"

**Interventions Used:**
- Check: CBT, Psychoeducation, Relaxation Techniques, Mindfulness

**Client Response:**
- Engagement Level: "Highly Engaged"
- Response to Interventions: "Moderately Responsive"
- Homework Compliance: "Completed"
- Notes: "Client completed daily thought logs and breathing exercises"

**SOAP:**
- Subjective: "Client reports feeling 'somewhat better' this week. States anxiety is more manageable with breathing techniques."
- Objective: "Client appeared well-groomed, calm demeanor. Engaged actively in session. Completed assigned homework."
- Assessment: "Client showing early progress with CBT interventions. Anxiety symptoms reducing. Continue current treatment approach."
- Plan: "1. Continue CBT interventions. 2. Introduce cognitive restructuring next session. 3. Assign thought challenging worksheet. 4. Schedule next session in one week."

**Billing:**
- CPT Code: "90834"
- Billable: Yes

6. Sign the note

### Step 7.4: Create Treatment Plan
1. Go to Clinical Notes → Create New Note
2. Select Note Type: "Treatment Plan"
3. Select Client: "TestClient AutomatedBrowser"
4. Note: Treatment Plan does NOT require an appointment

**Treatment Goals (add 3 goals):**

**Goal 1:**
- Description: "Reduce anxiety symptoms as measured by GAD-7 from 15 to below 10"
- Target Date: 3 months from today
- Current Progress: "Not Started" or "Minimal Progress"
- Objectives:
  - "Learn and practice deep breathing techniques daily"
  - "Identify and challenge anxious thoughts using CBT techniques"
  - "Complete GAD-7 assessment bi-weekly to track progress"

**Goal 2:**
- Description: "Improve mood symptoms as measured by PHQ-9 from 12 to below 8"
- Target Date: 3 months from today
- Current Progress: "Not Started"
- Objectives:
  - "Engage in behavioral activation - schedule 2 enjoyable activities per week"
  - "Practice cognitive restructuring for negative thoughts"
  - "Complete PHQ-9 assessment bi-weekly to track progress"

**Goal 3:**
- Description: "Improve sleep quality - reduce time to fall asleep to under 30 minutes"
- Target Date: 2 months from today
- Current Progress: "Minimal Progress"
- Objectives:
  - "Implement consistent sleep schedule"
  - "Practice sleep hygiene techniques"
  - "Reduce screen time 1 hour before bed"

**Treatment Details:**
- Treatment Modalities: Check "CBT", "Mindfulness", "Psychoeducation"
- Session Duration: "45 minutes"
- Frequency: "Weekly"
- Treatment Setting: "Hybrid" (combination of office and telehealth)
- Estimated Duration: "3-6 months"
- Discharge Criteria: "GAD-7 score below 10, PHQ-9 score below 8, client reports improved daily functioning and sleep quality"

**Diagnosis:**
- ICD-10 Codes: "F41.1", "F32.1"
- CPT Code: "90847" or appropriate treatment planning code
- Billable: Yes

5. Sign the treatment plan

### Step 7.5: Create Consultation Note
1. Go to Clinical Notes → Create New Note
2. Select Note Type: "Consultation Note"
3. Select Client: "TestClient AutomatedBrowser"
4. Select any available appointment

**Consultation Details:**
- Consulted Person: "Dr. Sarah Psychiatrist"
- Organization: "City Psychiatry Associates"
- Reason for Consultation: "Medication evaluation for anxiety and depression"
- Information Shared: "Shared presenting symptoms, diagnostic assessment, and current treatment progress with client consent"
- Recommendations Received: "Consider SSRI if symptoms persist after 6 weeks of psychotherapy"
- Follow-up Actions: "Schedule psychiatric evaluation if needed after 6 weeks"

**Billing:**
- CPT Code: "90887" or appropriate consultation code
- Billable: Yes

5. Sign the note

### Step 7.6: Create Contact Note
1. Go to Clinical Notes → Create New Note
2. Select Note Type: "Contact Note"
3. Select Client: "TestClient AutomatedBrowser"

**Contact Details:**
- Contact Date: Today's date
- Contact Time: Current time
- Contact Type: "Phone"
- Duration: "15 minutes"
- Purpose: "Check-in call regarding medication questions"
- Summary: "Client called to discuss questions about starting medication. Provided psychoeducation about SSRIs and encouraged client to discuss further with prescriber."
- Follow-up Needed: Check Yes
- Follow-up Notes: "Follow up at next session about medication decision"

**Billing:**
- Billable: No (typically non-billable)

5. Sign the note

### Step 7.7: Create Miscellaneous Note
1. Go to Clinical Notes → Create New Note
2. Select Note Type: "Miscellaneous Note"
3. Select Client: "TestClient AutomatedBrowser"
4. Note: Does NOT require appointment

**Note Details:**
- Note Date: Today's date
- Subject: "Insurance Authorization Update"
- Purpose Category: "Administrative"
- Content: "Received insurance authorization for 20 sessions. Authorization valid through [date 6 months from now]. Prior authorization number: PA-12345678."
- Related to Treatment: Check Yes

**Billing:**
- Billable: No

5. Sign the note

### Step 7.8: Create Cancellation Note
1. Go to Clinical Notes → Create New Note
2. Select Note Type: "Cancellation Note"
3. Select Client: "TestClient AutomatedBrowser"
4. Select the cancelled appointment from earlier

**Cancellation Details:**
- Cancellation Date: Date of cancelled appointment
- Cancelled By: "Client"
- Reason: "Client requested reschedule due to work conflict"
- Notification Method: "Phone"
- Notes: "Client called 24 hours in advance to cancel"
- Rescheduled: Check Yes
- New Appointment Date: Date of rescheduled appointment (if created)

**Billing:**
- Billable: No

5. Sign the note

---

## PHASE 8: ASSIGN INTAKE FORMS

### Step 8.1: Navigate to Client Forms
1. Go to the client's profile (Clients → Client List → TestClient AutomatedBrowser)
2. Look for "Forms" or "Intake Forms" tab/section
3. Click "Assign Form" or "Add Form"

### Step 8.2: Assign Client Information Form
1. From form library, select "Client Information Form" or "Demographic Form"
2. Set Due Date: 3 days from now
3. Is Required: Check Yes
4. Assignment Notes: "Please complete all sections including insurance information"
5. Client Message: "Welcome to our practice! Please complete this intake form before your first appointment."
6. Click "Assign" or "Send"

### Step 8.3: Assign Client History Form
1. Click "Assign Form" again
2. Select "Client History Form" or "Medical History Form"
3. Set Due Date: 3 days from now
4. Is Required: Check Yes
5. Assignment Notes: "Need complete medical and psychiatric history"
6. Client Message: "Please provide your complete medical and mental health history."
7. Click "Assign"

### Step 8.4: Assign Consent Forms
1. Click "Assign Form" again
2. Select "Informed Consent Form" or "Treatment Consent"
3. Set Due Date: Before first appointment
4. Is Required: Check Yes
5. Client Message: "Please review and sign the treatment consent form."
6. Assign

### Step 8.5: Verify Form Assignments
1. Return to client's Forms section
2. Verify all 3 forms show status "PENDING"
3. Note the due dates are correct

---

## PHASE 9: ASSIGN ASSESSMENTS

### Step 9.1: Navigate to Client Assessments
1. On client's profile, find "Assessments" tab/section
2. Click "Assign Assessment" or "Add Assessment"

### Step 9.2: Assign PHQ-9 (Depression Screening)
1. Assessment Type: Select "PHQ-9"
2. Assessment Name: "PHQ-9 Depression Screening - Baseline"
3. Description: "Baseline depression assessment for treatment planning"
4. Due Date: 2 days from now
5. Instructions: "Please answer each question based on how you've been feeling over the past 2 weeks."
6. Click "Assign"

### Step 9.3: Assign GAD-7 (Anxiety Screening)
1. Click "Assign Assessment" again
2. Assessment Type: Select "GAD-7"
3. Assessment Name: "GAD-7 Anxiety Screening - Baseline"
4. Description: "Baseline anxiety assessment"
5. Due Date: 2 days from now
6. Instructions: "Please rate how often you've been bothered by each symptom over the past 2 weeks."
7. Click "Assign"

### Step 9.4: Assign PCL-5 (PTSD Screening)
1. Click "Assign Assessment"
2. Assessment Type: Select "PCL-5"
3. Assessment Name: "PCL-5 PTSD Screening"
4. Description: "Screening for trauma-related symptoms"
5. Due Date: 5 days from now
6. Instructions: "Please answer questions about experiences related to stressful life events."
7. Click "Assign"

### Step 9.5: Assign AUDIT (Alcohol Screening)
1. Click "Assign Assessment"
2. Assessment Type: Select "AUDIT"
3. Assessment Name: "AUDIT Alcohol Use Screening"
4. Description: "Routine substance use screening"
5. Due Date: 5 days from now
6. Click "Assign"

### Step 9.6: Verify Assessment Assignments
1. Return to client's Assessments section
2. Verify all 4 assessments show status "PENDING"
3. Note due dates are correct

---

## PHASE 10: SIMULATE CLIENT COMPLETING FORMS (Client Portal Testing)

**Note:** This phase simulates what the client would do in the client portal. If testing the actual client portal:

### Step 10.1: Access Client Portal
1. Open a new browser window/incognito mode
2. Navigate to the client portal URL (usually /portal or separate portal subdomain)
3. If client has completed registration:
   - Login with: testclient.automated@example.com
   - Password: [whatever was set during registration]
4. If testing invitation flow, click the registration link from invitation email

### Step 10.2: Complete Intake Forms
1. In the client portal, find "My Forms" or "Pending Forms"
2. Click on "Client Information Form"
3. Fill in all fields (many will be pre-populated from client record):
   - Verify and update any information
   - Add any additional details requested
   - Sign electronically where required
4. Submit the form
5. Repeat for "Client History Form" and "Consent Forms"

### Step 10.3: Complete Assessments
1. Find "My Assessments" or "Pending Assessments"
2. Click on "PHQ-9 Depression Screening"
3. Answer all 9 questions:
   - Q1: "Little interest or pleasure in doing things" - Select 2 (More than half the days)
   - Q2: "Feeling down, depressed, or hopeless" - Select 2
   - Q3: "Trouble falling or staying asleep" - Select 2
   - Q4: "Feeling tired or having little energy" - Select 2
   - Q5: "Poor appetite or overeating" - Select 1 (Several days)
   - Q6: "Feeling bad about yourself" - Select 1
   - Q7: "Trouble concentrating" - Select 2
   - Q8: "Moving or speaking slowly/restless" - Select 0 (Not at all)
   - Q9: "Thoughts of self-harm" - Select 0
4. Submit assessment
5. Complete GAD-7:
   - Answer all 7 questions with moderate severity (scores 1-2)
6. Submit
7. Complete other assigned assessments

---

## PHASE 11: VERIFY ALL DATA (Staff View)

### Step 11.1: Verify Client Record
1. Return to staff application
2. Go to Clients → Client List → TestClient AutomatedBrowser
3. Verify:
   - All personal information saved correctly
   - Emergency contacts display (2 contacts)
   - Insurance information shows (Primary and Secondary)
   - Portal invitation was sent

### Step 11.2: Verify Appointments
1. Go to Appointments → Calendar
2. Verify:
   - Initial Intake appointment scheduled
   - Therapy session scheduled
   - Cancelled appointment shows as cancelled

### Step 11.3: Verify Clinical Notes
1. Go to Clinical Notes → My Notes
2. Filter by client "TestClient AutomatedBrowser"
3. Verify all notes created:
   - Intake Assessment (signed)
   - Progress Note (signed)
   - Treatment Plan (signed)
   - Consultation Note (signed)
   - Contact Note (signed)
   - Miscellaneous Note (signed)
   - Cancellation Note (signed)

### Step 11.4: Verify Forms and Assessments
1. On client's profile, check Forms tab
2. Verify form assignments and any completed submissions
3. Check Assessments tab
4. Verify assessment assignments and any completed results with scores

---

## PHASE 12: ADDITIONAL TESTING (Optional)

### Step 12.1: Test Waitlist
1. Go to Appointments → Waitlist
2. Click "Add to Waitlist"
3. Fill in:
   - Client: TestClient AutomatedBrowser
   - Preferred Days: Select "Monday", "Wednesday", "Friday"
   - Preferred Times: Select "Morning"
   - Urgency: "Routine"
   - Notes: "Client flexible with scheduling"
4. Save

### Step 12.2: Test Group Session (if applicable)
1. Go to Group Sessions
2. Create or join an existing group
3. Add TestClient AutomatedBrowser as a group member

### Step 12.3: Test Telehealth Session Setup
1. Find the Telehealth appointment created earlier
2. Verify telehealth session link is generated
3. Test "Start Session" functionality if available

---

## TESTING CHECKLIST

Use this checklist to verify all steps completed:

### Client Creation
- [ ] Client created with all required fields
- [ ] All optional fields populated
- [ ] Emergency contacts added (2)
- [ ] Primary insurance added
- [ ] Secondary insurance added
- [ ] Portal invitation sent

### Appointments
- [ ] Initial Intake appointment created
- [ ] Therapy session appointment created
- [ ] Third appointment created and cancelled
- [ ] Cancellation workflow tested

### Clinical Notes
- [ ] Intake Assessment created and signed
- [ ] Progress Note created and signed
- [ ] Treatment Plan created and signed
- [ ] Consultation Note created and signed
- [ ] Contact Note created and signed
- [ ] Miscellaneous Note created and signed
- [ ] Cancellation Note created and signed

### Forms & Assessments
- [ ] Client Information Form assigned
- [ ] Client History Form assigned
- [ ] Consent Form assigned
- [ ] PHQ-9 assigned
- [ ] GAD-7 assigned
- [ ] PCL-5 assigned
- [ ] AUDIT assigned

### Portal
- [ ] Portal invitation sent
- [ ] (If testing) Client registration completed
- [ ] (If testing) Forms completed by client
- [ ] (If testing) Assessments completed by client

---

## ERROR HANDLING

If you encounter errors:

1. **"Rate limit exceeded"**: Wait 15 minutes and retry
2. **Form validation errors**: Check required fields are filled
3. **Appointment conflicts**: Choose different time slot
4. **Note requires appointment**: Select or create appropriate appointment first
5. **Client not found**: Verify client was saved, refresh page
6. **Portal invitation failed**: Verify client has valid email address

---

## NOTES FOR AI BROWSER TESTER

1. **Wait for page loads**: Always wait for pages to fully load before interacting
2. **Confirm actions**: Look for success messages after save operations
3. **Screenshots**: Take screenshots at key milestones for verification
4. **Sequential execution**: Complete each phase before moving to next
5. **Data dependencies**: Some operations depend on previous steps (e.g., Progress Note requires Intake Assessment)
6. **Dropdowns**: Click to open, wait for options to load, then select
7. **Date pickers**: Use the date picker widget, don't type dates directly
8. **Multi-select fields**: Click each option individually for fields allowing multiple selections
9. **Form scrolling**: Scroll through entire forms to ensure all sections are visible and filled
10. **Save frequently**: Save drafts before signing notes to prevent data loss

---

# PART 2: STAFF & HR MODULE COMPREHENSIVE TESTING (MODULE 9)

## OVERVIEW
This section tests the Staff & Human Resources module, including staff management, organizational structure, PTO management, onboarding, performance reviews, and HR automation features.

**Pre-requisites:**
- Logged in as Administrator or Super Admin
- Staff module accessible in navigation

---

## SECTION S1: STAFF DIRECTORY PAGE

### Test S1.1: Access Staff Directory
1. In the left sidebar, click "Staff" or "Team" menu
2. Click "Staff Directory" or similar submenu item
3. **Expected:** Staff listing page loads with employee cards/rows
4. **Verify no console errors** (F12 > Console)

### Test S1.2: View Staff Directory Statistics
1. Observe the stats bar at the top of the page
2. **Verify these stats are displayed:**
   - [ ] Total Staff count
   - [ ] Active employees count
   - [ ] On Leave count
   - [ ] Number of Departments (or department breakdown)
3. **Verify numbers are accurate** compared to visible staff

### Test S1.3: Staff Card Display
1. Observe individual staff cards/rows
2. **Verify each card shows:**
   - [ ] Profile photo/avatar
   - [ ] Full name
   - [ ] Job title
   - [ ] Department
   - [ ] Employment status badge (Active/On Leave/etc.)
   - [ ] Contact info (email or phone)
   - [ ] Manager name (if assigned)
3. **Check color coding:**
   - Active = Green badge
   - On Leave = Yellow/Orange badge
   - Terminated = Red badge

### Test S1.4: Search Staff
1. Locate the search box
2. Enter partial name of existing staff member (e.g., "John" or "Admin")
3. **Expected:** List filters to show matching results
4. Enter a name that doesn't exist (e.g., "ZZZNONEXISTENT")
5. **Expected:** "No results" or empty state message, not blank page
6. Clear search box
7. **Expected:** Full list returns

### Test S1.5: Filter by Department
1. Find the Department filter dropdown
2. Note how many departments are available
3. Select a specific department (e.g., "Clinical" or "Administration")
4. **Expected:** Only staff from that department shown
5. Verify stats bar updates accordingly
6. Clear the filter
7. **Expected:** Full list returns

### Test S1.6: Filter by Employment Status
1. Find the Status filter dropdown
2. Select "Active"
3. **Expected:** Only active employees shown
4. Select "On Leave" (if any exist)
5. **Expected:** Only on-leave employees shown
6. Select "Terminated" (if any exist)
7. **Expected:** Only terminated employees shown
8. Clear filter

### Test S1.7: Combined Filtering
1. Select a department filter
2. ALSO select a status filter
3. **Expected:** Results match BOTH criteria
4. Verify stats update correctly
5. Clear all filters

---

## SECTION S2: VIEW STAFF PROFILE

### Test S2.1: Open Staff Profile
1. Click on any staff member card/row in the directory
2. **Expected:** Profile page opens with detailed information
3. **Verify URL** changes to include staff ID (e.g., /staff/{id})

### Test S2.2: Profile Overview Tab
1. Ensure "Overview" tab is active (usually default)
2. **Verify these fields are displayed:**
   - [ ] Full Name (First + Last)
   - [ ] Profile Photo
   - [ ] Job Title
   - [ ] Department
   - [ ] Email Address
   - [ ] Phone Number
   - [ ] Employee ID
   - [ ] Employment Status (Active/On Leave/etc.)
   - [ ] Employment Type (Full-time/Part-time/etc.)
   - [ ] Hire Date
   - [ ] Work Location
   - [ ] Manager (if assigned)
   - [ ] Roles/Permissions

### Test S2.3: Credentials Tab
1. Click on "Credentials" tab
2. **Expected:** Tab content loads without errors
3. **Verify these sections exist:**
   - [ ] License Information section
   - [ ] Certifications section
   - [ ] Add Credential button (for admins)
4. If credentials exist, verify:
   - [ ] License type displayed
   - [ ] License number displayed
   - [ ] State/Jurisdiction
   - [ ] Expiration date
   - [ ] Status (Active/Expired)

### Test S2.4: Add New Credential (Admin Only)
1. Click "Add Credential" or "+" button
2. Fill in credential form:
   - License Type: "LPC" or "LCSW"
   - License Number: "TEST-12345"
   - State: Select "GA" (Georgia)
   - Issue Date: 2 years ago
   - Expiration Date: 1 year from now
   - Status: "Active"
3. Save the credential
4. **Expected:** Credential appears in the list
5. **Verify expiration warning** if date is within 90 days

### Test S2.5: Training Tab
1. Click on "Training" tab
2. **Expected:** Tab content loads without errors
3. **Verify these elements:**
   - [ ] Training records list
   - [ ] Completion status indicators
   - [ ] Due dates for required training
   - [ ] Add Training button (for admins)
4. If training records exist, verify:
   - [ ] Training name
   - [ ] Completion date
   - [ ] Expiration (if applicable)
   - [ ] Certificate/documentation link

### Test S2.6: Add New Training Record
1. Click "Add Training" or "+" button
2. Fill in training form:
   - Training Type: "HIPAA Compliance"
   - Completion Date: Today
   - Expiration Date: 1 year from now
   - Provider: "Online Training Inc."
   - Notes: "Annual refresher completed"
3. Save the training record
4. **Expected:** Record appears in training list

### Test S2.7: Performance Tab
1. Click on "Performance" tab
2. **Expected:** Either:
   - Performance reviews listed, OR
   - "Coming Soon" placeholder displayed
3. If implemented, verify:
   - [ ] Review history visible
   - [ ] Review dates
   - [ ] Review status
   - [ ] Ratings/scores

### Test S2.8: Back Navigation
1. Click "Back to Directory" or browser back button
2. **Expected:** Returns to Staff Directory
3. Verify filters are preserved (if any were set)

---

## SECTION S3: ADD NEW STAFF MEMBER

### Test S3.1: Access Add Staff Form
1. From Staff Directory, click "Add Staff" or "+" button
2. **Expected:** Employment Form / Add Staff page opens
3. Verify form is empty (not pre-filled)

### Test S3.2: Form Validation - Empty Submit
1. Without filling any fields, click "Save" or "Submit"
2. **Expected:** Validation errors appear for required fields
3. **Document which fields are required:**
   - [ ] First Name - Required?
   - [ ] Last Name - Required?
   - [ ] Email - Required?
   - [ ] Employee ID - Required?
   - [ ] Department - Required?
   - [ ] Job Title - Required?
   - [ ] Hire Date - Required?
   - [ ] Employment Type - Required?
   - [ ] Roles - Required?

### Test S3.3: Email Format Validation
1. Enter invalid email format (e.g., "notanemail")
2. Tab to next field or try to submit
3. **Expected:** Email validation error displayed
4. Correct to valid format (e.g., "test@test.com")
5. **Expected:** Error clears

### Test S3.4: Create New Staff Member Successfully
1. Fill in all required fields:
   - First Name: "Test"
   - Last Name: "StaffMember" + current timestamp
   - Email: "test.staff.[timestamp]@mentalspace.test"
   - Employee ID: "EMP-TEST-[timestamp]"
   - Department: Select any available
   - Job Title: "Test Position"
   - Hire Date: Today's date
   - Employment Type: "FULL_TIME"
   - Work Location: Select any (or "Main Office")
   - Roles: Select "CLINICIAN" or "STAFF"
2. Click Save/Submit
3. **Expected:**
   - [ ] Success message appears
   - [ ] Redirected to Staff Directory or new profile
   - [ ] New employee visible in staff listing

### Test S3.5: Duplicate Email Prevention
1. Try to create another staff member with SAME email used in S3.4
2. **Expected:** Error message about duplicate email
3. Note exact error message: ____________________

### Test S3.6: Duplicate Employee ID Prevention
1. Try to create staff member with SAME Employee ID from S3.4
2. **Expected:** Error message about duplicate Employee ID
3. Note exact error message: ____________________

### Test S3.7: Optional Fields
1. Create another staff member, this time filling ALL fields:
   - All required fields (as above)
   - Phone Number: "555-999-8888"
   - Work Location: Different from first
   - Manager: Select an existing staff member
   - Address: "123 Test Street"
   - Notes: "Test employee with all fields"
2. Save
3. **Expected:** All data saved and visible on profile

---

## SECTION S4: EDIT STAFF MEMBER

### Test S4.1: Access Edit Mode
1. Navigate to a staff member's profile (use one created in S3)
2. Click "Edit" button
3. **Expected:** Edit form opens with pre-filled data

### Test S4.2: Modify Basic Details
1. Change Job Title to something different
2. Change Department to a different option
3. Add or change Phone Number
4. Click Save
5. **Expected:**
   - [ ] Success message
   - [ ] Profile reflects updated information
6. Refresh page
7. **Expected:** Changes persisted

### Test S4.3: Edit Validation
1. Open edit mode
2. Clear a required field (e.g., First Name)
3. Try to save
4. **Expected:** Validation error prevents save
5. Cancel edit

### Test S4.4: Change Employment Type
1. Edit staff member
2. Change Employment Type (e.g., FULL_TIME to PART_TIME)
3. Save
4. **Expected:** Status updates correctly

---

## SECTION S5: MANAGER ASSIGNMENT

### Test S5.1: Assign Manager
1. Open a staff member's profile (NOT a top-level manager)
2. Look for "Manager" field or "Assign Manager" option
3. Click to assign/change manager
4. Select a different employee as manager
5. Save
6. **Expected:**
   - [ ] Manager relationship saved
   - [ ] Manager name displayed on profile

### Test S5.2: Self-Assignment Prevention
1. Try to assign a staff member as their OWN manager
2. **Expected:** Error message "Cannot be their own manager" or similar
3. Note exact error: ____________________

### Test S5.3: Circular Reference Prevention
1. Create scenario: Employee A reports to Employee B
2. Now try to make Employee B report to Employee A
3. **Expected:** System prevents circular reporting chain
4. Note exact behavior: ____________________

### Test S5.4: Remove Manager
1. Open a staff member with an assigned manager
2. Find option to remove/clear manager
3. Remove the manager assignment
4. Save
5. **Expected:**
   - [ ] Manager field cleared
   - [ ] Relationship removed
   - [ ] No orphaned data

---

## SECTION S6: EMPLOYMENT LIFECYCLE

### Test S6.1: Terminate Employment
1. Navigate to an ACTIVE staff member's profile (preferably test account)
2. Find "Terminate" or "End Employment" button/action
3. Click the termination action
4. **Expected:** Confirmation dialog appears with:
   - [ ] Termination date field
   - [ ] Reason field (optional or required?)
   - [ ] Clear warning about action
5. Fill in:
   - Termination Date: Today
   - Reason: "Test termination"
6. Confirm termination
7. **Expected:**
   - [ ] Status changes to "TERMINATED"
   - [ ] Termination date recorded
   - [ ] Red badge/indicator shown

### Test S6.2: Terminated Employee in Directory
1. Go to Staff Directory
2. Filter by "Active" status
3. **Expected:** Terminated employee NOT shown
4. Filter by "Terminated" or "All"
5. **Expected:** Terminated employee visible

### Test S6.3: Reactivate Employee
1. Find the terminated employee
2. Look for "Reactivate" button
3. Click reactivate
4. **Expected:** Confirmation dialog (optional)
5. Confirm reactivation
6. **Expected:**
   - [ ] Status changes to "ACTIVE"
   - [ ] Termination date cleared (or retained as historical)
   - [ ] Green badge shown
   - [ ] Employee appears in Active filter

### Test S6.4: Status Change Audit
1. Check if status changes are logged
2. Look for "Activity" or "History" section on profile
3. **Expected:** Status changes recorded with timestamps

---

## SECTION S7: ORGANIZATIONAL CHART

### Test S7.1: Access Org Chart
1. Navigate to Organizational Chart page (Staff > Org Chart)
2. **Expected:** Hierarchical chart visualization loads
3. **Verify no console errors**

### Test S7.2: View Hierarchy Structure
1. Observe the org chart layout
2. **Verify:**
   - [ ] Top-level executives/managers at top
   - [ ] Direct reports shown below their managers
   - [ ] Lines/connections between levels
   - [ ] Employee names visible
   - [ ] Job titles visible

### Test S7.3: Chart Interactivity
1. Click on an employee node
2. **Expected:** Either:
   - Profile popup appears, OR
   - Navigate to full profile
3. If expandable nodes exist:
   - Click to expand a department/team
   - **Expected:** Smooth animation
   - Click to collapse
   - **Expected:** Section collapses

### Test S7.4: Chart Responsiveness
1. Resize browser window
2. **Expected:** Chart adapts to screen size
3. Check mobile width (~375px)
4. **Expected:** Chart remains usable (may change to list view)

### Test S7.5: Empty State
1. If possible, view org chart with no manager relationships
2. **Expected:** Helpful message, not broken chart

---

## SECTION S8: ONBOARDING (IF IMPLEMENTED)

### Test S8.1: Access Onboarding Dashboard
1. Navigate to Onboarding section (Staff > Onboarding)
2. **Expected:** Onboarding dashboard loads
3. **Verify elements:**
   - [ ] List of employees in onboarding
   - [ ] Progress indicators
   - [ ] Due dates

### Test S8.2: View Onboarding Checklist
1. Open a new employee's onboarding checklist
2. **Verify checklist items exist:**
   - [ ] Paperwork completion tasks
   - [ ] IT setup items
   - [ ] Training requirements
   - [ ] Benefits enrollment
   - [ ] Policy acknowledgments

### Test S8.3: Complete Checklist Item
1. Find an uncompleted checklist item
2. Mark it as complete
3. **Expected:**
   - [ ] Checkmark appears
   - [ ] Progress bar/percentage updates
   - [ ] Completion timestamp recorded

### Test S8.4: Onboarding Progress
1. Observe overall progress indicator
2. Complete multiple items
3. **Expected:** Progress updates in real-time

### Test S8.5: Add Checklist Item (Admin)
1. If available, click "Add Item" to checklist
2. Fill in:
   - Task Name: "Complete Background Check"
   - Description: "Submit fingerprints for background verification"
   - Due Date: 5 days from now
   - Assigned To: Select staff member or HR
3. Save
4. **Expected:** New item appears in checklist

---

## SECTION S9: PTO / TIME-OFF MANAGEMENT

### Test S9.1: Access PTO Section
1. Navigate to PTO management (Staff > PTO or HR > Time Off)
2. **Expected:** PTO request list or dashboard loads

### Test S9.2: View PTO Requests
1. Observe the PTO request listing
2. **Verify columns/data:**
   - [ ] Employee name
   - [ ] Request type (Vacation/Sick/Personal)
   - [ ] Date range
   - [ ] Status (Pending/Approved/Denied)
   - [ ] Days requested
   - [ ] Submitted date
   - [ ] Notes/Reason

### Test S9.3: Filter PTO Requests
1. Filter by status "Pending"
2. **Expected:** Only pending requests shown
3. Filter by date range (if available)
4. **Expected:** Appropriate filtering works

### Test S9.4: Create PTO Request
1. Click "New Request" or "Request Time Off"
2. Fill in:
   - Employee: Select staff member (or self)
   - Type: "Vacation"
   - Start Date: 2 weeks from now
   - End Date: 2 weeks + 3 days from now
   - Reason: "Test vacation request"
3. Submit
4. **Expected:** Request created with PENDING status

### Test S9.5: Approve PTO Request
1. Find a pending PTO request
2. Click "Approve" button
3. **Expected:**
   - [ ] Status changes to APPROVED
   - [ ] Approval timestamp recorded
   - [ ] Approver name recorded
   - [ ] PTO balance updated for employee

### Test S9.6: Deny PTO Request
1. Create another pending request (or use existing)
2. Click "Deny" button
3. Add denial reason: "Insufficient coverage on requested dates"
4. **Expected:**
   - [ ] Status changes to DENIED
   - [ ] Denial reason saved
   - [ ] PTO balance NOT affected

### Test S9.7: View PTO Balances
1. Look for PTO Balance section (may be on employee profile)
2. **Verify balance types displayed:**
   - [ ] PTO days remaining
   - [ ] Vacation days remaining
   - [ ] Sick days remaining
   - [ ] Accrued vs. Used breakdown

### Test S9.8: Cancel PTO Request
1. Find an approved PTO request
2. Click "Cancel" (if available)
3. **Expected:**
   - [ ] Status changes to CANCELLED
   - [ ] Balance restored to employee

---

## SECTION S10: PERFORMANCE REVIEWS (IF IMPLEMENTED)

### Test S10.1: Access Performance Reviews
1. Navigate to Performance Reviews section
2. **Expected:** Review list or dashboard loads

### Test S10.2: View Review Listing
1. Check the review listing displays:
   - [ ] Employee name
   - [ ] Review period
   - [ ] Review type (Annual/Quarterly/etc.)
   - [ ] Review status
   - [ ] Reviewer name
   - [ ] Due date

### Test S10.3: Create New Review
1. Click "Create Review" or "New Review"
2. Fill in:
   - Employee: Select staff member
   - Review Type: "Annual Review"
   - Period: Current year
   - Due Date: 30 days from now
   - Reviewer: Select manager
3. Save as Draft
4. **Expected:** Review created in DRAFT status

### Test S10.4: Review Workflow States
1. Check if reviews follow workflow:
   - DRAFT -> PENDING_MANAGER_REVIEW
   - PENDING_MANAGER_REVIEW -> PENDING_EMPLOYEE_SIGNATURE
   - PENDING_EMPLOYEE_SIGNATURE -> COMPLETED
2. Test transitioning through states (if buttons available)
3. **Document available actions at each state**

### Test S10.5: Submit Self-Evaluation
1. If self-evaluation feature exists:
   - Open review as the employee being reviewed
   - Fill in self-evaluation section
   - Submit
2. **Expected:** Status moves to next workflow step

### Test S10.6: Manager Review Submission
1. As manager, complete review assessment
2. Add ratings/scores
3. Add comments
4. Submit for employee signature
5. **Expected:** Status changes appropriately

### Test S10.7: Employee Acknowledgment
1. As employee, acknowledge/sign review
2. **Expected:** Review marked as COMPLETED

---

## SECTION S11: ROLE-BASED ACCESS CONTROL

### Test S11.1: Admin Full Access Verification
1. As Administrator, verify you can:
   - [ ] View all staff in directory
   - [ ] View any staff profile
   - [ ] Create new staff member
   - [ ] Edit staff profiles
   - [ ] Terminate/reactivate employees
   - [ ] Assign managers
   - [ ] Approve/deny PTO
   - [ ] Create performance reviews
   - [ ] View organizational chart
   - [ ] Access onboarding

### Test S11.2: Supervisor Limited Access
1. Log out and log in as SUPERVISOR role user
2. Navigate to Staff section
3. **Verify restrictions:**
   - [ ] Can view staff directory? (Expected: Yes)
   - [ ] Can view profiles? (Expected: Yes for subordinates)
   - [ ] Cannot create new staff (button hidden/disabled)
   - [ ] Cannot edit staff (button hidden/disabled)
   - [ ] Cannot terminate (action unavailable)
   - [ ] Can view own team only?

### Test S11.3: Clinician Access
1. Log in as CLINICIAN role user
2. Try to access Staff section
3. **Expected:** Either:
   - Menu item hidden, OR
   - Access denied message
4. **Document actual behavior:** ____________________

### Test S11.4: Unauthorized API Access Attempt
1. Open browser DevTools (F12) > Network tab
2. As non-admin user, try to access:
   - /api/staff-management (should fail)
   - /api/staff-management/create (should fail)
3. **Expected:** 401 Unauthorized or 403 Forbidden response

---

## SECTION S12: ERROR HANDLING & EDGE CASES

### Test S12.1: Network Error Recovery
1. Open DevTools > Network > Set Offline
2. Try to load Staff Directory
3. **Expected:** User-friendly error message, not crash
4. Re-enable network
5. **Expected:** Page recovers on refresh

### Test S12.2: Invalid Staff ID
1. Navigate to a profile with fake ID:
   `/staff/fake-id-12345-nonexistent`
2. **Expected:** "Staff not found" error handled gracefully

### Test S12.3: Long Input Handling
1. Create/edit staff with very long inputs:
   - Name: 100+ characters
   - Notes: 5000+ characters
2. **Expected:** Either accepts or shows max length validation

### Test S12.4: Special Characters in Name
1. Create staff with special characters:
   - Name: "O'Brien-Smith Jr."
2. **Expected:** Characters handled correctly, no SQL errors

### Test S12.5: Concurrent Edits
1. Open same profile in two browser tabs
2. Edit different fields in each
3. Save both
4. **Expected:** Last save wins or conflict warning shown

---

## SECTION S13: UI/UX QUALITY

### Test S13.1: Responsive Design
1. Test at 1920px width (desktop)
2. Test at 1024px width (tablet landscape)
3. Test at 768px width (tablet portrait)
4. Test at 375px width (mobile)
5. **Verify at each breakpoint:**
   - [ ] Layout adapts appropriately
   - [ ] No horizontal scrolling
   - [ ] All features accessible
   - [ ] Text readable

### Test S13.2: Loading States
1. Observe page loads
2. **Expected:** Loading spinners or skeleton screens shown
3. Check for any "flashing" content during load

### Test S13.3: Empty States
1. Search for non-existent staff
2. **Expected:** "No results found" message
3. View empty department
4. **Expected:** Appropriate empty state message

### Test S13.4: Confirmation Dialogs
1. For destructive actions (terminate, delete):
   - **Expected:** Confirmation dialog
   - Clear warning message
   - Cancel option available
   - Must explicitly confirm

### Test S13.5: Success Feedback
1. After save/update operations:
   - **Expected:** Toast notification or success message
   - Message auto-dismisses after ~3 seconds
2. After errors:
   - **Expected:** Clear error message
   - Stays until user dismisses

### Test S13.6: Form Usability
1. Test tab navigation through forms
2. **Expected:** Logical tab order
3. Test keyboard shortcuts (if any)
4. Test enter key to submit

---

## TEST RESULTS TEMPLATE

```markdown
# Staff & HR Module - Browser Test Report

## Test Date: [DATE]
## Tester: [AI Browser / Claude]
## Environment: Production (mentalspaceehr.com)

## Executive Summary
- Total Tests Executed: ___
- Passed: ___
- Failed: ___
- Partial: ___
- Blocked: ___
- Not Implemented: ___

## Critical Issues (Must Fix)
| Test ID | Description | Severity |
|---------|-------------|----------|
| S__.__ | | Critical |

## Major Issues (Should Fix)
| Test ID | Description | Severity |
|---------|-------------|----------|
| S__.__ | | Major |

## Minor Issues (Nice to Fix)
| Test ID | Description | Severity |
|---------|-------------|----------|
| S__.__ | | Minor |

## Detailed Results by Section

### S1: Staff Directory
| Test | Status | Notes |
|------|--------|-------|
| S1.1 Access | PASS/FAIL | |
| S1.2 Stats | PASS/FAIL | |
| S1.3 Cards | PASS/FAIL | |
| S1.4 Search | PASS/FAIL | |
| S1.5 Dept Filter | PASS/FAIL | |
| S1.6 Status Filter | PASS/FAIL | |
| S1.7 Combined | PASS/FAIL | |

### S2: Staff Profile
| Test | Status | Notes |
|------|--------|-------|
| S2.1 Open Profile | PASS/FAIL | |
| S2.2 Overview Tab | PASS/FAIL | |
| S2.3 Credentials Tab | PASS/FAIL | |
| S2.4 Add Credential | PASS/FAIL | |
| S2.5 Training Tab | PASS/FAIL | |
| S2.6 Add Training | PASS/FAIL | |
| S2.7 Performance Tab | PASS/FAIL | |
| S2.8 Back Nav | PASS/FAIL | |

[Continue for all sections S3-S13...]

## Console Errors Observed
[List any JavaScript errors from browser console]

## Performance Notes
- Page load times: ___
- API response times: ___
- Any noticeable lag: ___

## Recommendations
1. [Priority improvements]
2. [Bug fixes needed]
3. [UX enhancements]
```

---

## FINAL CHECKLIST

Before completing testing, verify:

- [ ] All 13 sections tested
- [ ] Screenshots taken of any failures
- [ ] Console errors documented
- [ ] Test data cleaned up (optional)
- [ ] Report compiled with findings

**END OF STAFF & HR MODULE TESTING PROMPT**
