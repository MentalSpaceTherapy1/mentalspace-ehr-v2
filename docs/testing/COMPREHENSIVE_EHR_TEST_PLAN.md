# MentalSpace EHR - Comprehensive End-to-End Test Plan

## Test Environment
- **URL**: https://mentalspaceehr.com
- **Test User**: Elize Joseph (ejoseph@chctherapy.com)
- **Password**: Bing@@0912
- **Test Client**: John Doe
- **Date**: January 2026

---

# PART 1: AUTHENTICATION & LOGIN

## 1.1 Staff Login
- [ ] Navigate to https://mentalspaceehr.com/login
- [ ] Enter email: `ejoseph@chctherapy.com`
- [ ] Enter password: `Bing@@0912`
- [ ] Click "Sign In"
- [ ] Verify successful login - redirected to Dashboard
- [ ] Verify user name appears in top-right corner
- [ ] Verify no console errors (F12 > Console)

## 1.2 Session Persistence
- [ ] Refresh the page (F5)
- [ ] Verify still logged in
- [ ] Open new tab, navigate to https://mentalspaceehr.com
- [ ] Verify automatically logged in

## 1.3 Navigation Access
- [ ] Verify all sidebar menu items are visible and clickable:
  - [ ] Dashboard
  - [ ] Calendar/Scheduling
  - [ ] Clients
  - [ ] Clinical Notes
  - [ ] Telehealth
  - [ ] Messaging
  - [ ] Billing
  - [ ] Reports
  - [ ] Staff/HR
  - [ ] Settings

---

# PART 2: DASHBOARD VERIFICATION

## 2.1 Dashboard Widgets
- [ ] Verify "Today's Appointments" widget loads with data
- [ ] Verify "Unsigned Notes" widget displays count
- [ ] Verify "Messages" widget shows unread count
- [ ] Verify "Quick Actions" buttons are functional
- [ ] Verify any charts/graphs render without errors
- [ ] Verify revenue/productivity metrics display (if applicable)

## 2.2 Quick Actions
- [ ] Click "New Appointment" - verify modal opens
- [ ] Click "New Client" - verify form opens
- [ ] Click "New Note" - verify note selector opens
- [ ] Close all modals

---

# PART 3: CLIENT MANAGEMENT

## 3.1 Find Test Client
- [ ] Navigate to Clients section
- [ ] Use search to find "John Doe"
- [ ] Click on John Doe to open client profile
- [ ] Verify client profile loads completely

## 3.2 Client Demographics Tab
- [ ] Verify all demographic fields display:
  - [ ] Full name
  - [ ] Date of Birth
  - [ ] Gender
  - [ ] Email
  - [ ] Phone number(s)
  - [ ] Address
  - [ ] Emergency contact
  - [ ] Preferred contact method
- [ ] Click "Edit" button
- [ ] Modify a non-critical field (e.g., preferred name)
- [ ] Save changes
- [ ] Verify changes persist after page refresh

## 3.3 Client Insurance Tab
- [ ] Navigate to Insurance tab
- [ ] Verify primary insurance information displays
- [ ] Verify secondary insurance (if applicable)
- [ ] Check eligibility verification status
- [ ] Click "Verify Eligibility" button (if available)
- [ ] Verify prior authorizations display

## 3.4 Client Documents Tab
- [ ] Navigate to Documents tab
- [ ] Verify document list loads
- [ ] Upload a test document (PDF or image)
- [ ] Verify upload succeeds
- [ ] Click to view/download uploaded document
- [ ] Delete test document

## 3.5 Client Appointments Tab
- [ ] Navigate to Appointments tab
- [ ] Verify appointment history displays
- [ ] Verify upcoming appointments display
- [ ] Verify past appointments show correct status

## 3.6 Client Notes Tab
- [ ] Navigate to Notes tab
- [ ] Verify clinical notes list displays
- [ ] Verify notes are sorted by date (newest first)
- [ ] Click on an existing note to view
- [ ] Verify note content renders correctly

## 3.7 Client Billing Tab
- [ ] Navigate to Billing tab
- [ ] Verify charges/claims display
- [ ] Verify account balance shows
- [ ] Verify payment history displays

## 3.8 Client Portal Tab
- [ ] Navigate to Portal tab
- [ ] Verify portal account status shows
- [ ] If not invited, test "Send Portal Invitation"
- [ ] Verify invitation email is sent

## 3.9 Client Consents Tab
- [ ] Navigate to Consents tab
- [ ] Verify consent forms list displays
- [ ] Check status of each consent (signed/pending)
- [ ] View a signed consent document

---

# PART 4: SCHEDULING & APPOINTMENTS

## 4.1 Calendar View
- [ ] Navigate to Calendar/Scheduling
- [ ] Verify calendar loads without errors
- [ ] Toggle between Day, Week, Month views
- [ ] Verify existing appointments display correctly
- [ ] Verify color-coding by appointment type

## 4.2 Create New Appointment
- [ ] Click on empty time slot OR click "New Appointment" button
- [ ] Fill in appointment form:
  - [ ] Client: Select "John Doe"
  - [ ] Appointment Type: Select "Individual Therapy"
  - [ ] Date: Select tomorrow's date
  - [ ] Start Time: 10:00 AM
  - [ ] Duration: 60 minutes
  - [ ] Service Location: Telehealth
  - [ ] CPT Code: 90837 (60-min psychotherapy)
  - [ ] Diagnosis Code: Add appropriate ICD-10
  - [ ] Room/Location: (if in-person)
  - [ ] Notes: "Test appointment for QA"
  - [ ] Recurring: Test setting up weekly recurrence
- [ ] Save appointment
- [ ] Verify appointment appears on calendar
- [ ] Verify confirmation email sent to client (check logs)

## 4.3 Modify Appointment
- [ ] Click on the created appointment
- [ ] Change time by 30 minutes
- [ ] Save changes
- [ ] Verify appointment moved on calendar
- [ ] Verify modification logged in audit trail

## 4.4 Appointment Actions
- [ ] Open appointment details
- [ ] Test "Check In" button - verify status changes
- [ ] Test "Start Session" button - verify telehealth link
- [ ] Test "Cancel" button:
  - [ ] Select cancellation reason
  - [ ] Add cancellation notes
  - [ ] Confirm cancellation
  - [ ] Verify status changes to "Cancelled"

## 4.5 Waitlist Management
- [ ] Navigate to Waitlist section
- [ ] Add John Doe to waitlist:
  - [ ] Preferred days: Monday, Wednesday, Friday
  - [ ] Preferred times: Morning (9am-12pm)
  - [ ] Priority: High
  - [ ] Notes: "Prefers early morning"
- [ ] Save waitlist entry
- [ ] Verify entry appears in waitlist
- [ ] Test "Match" functionality if available

## 4.6 Provider Availability
- [ ] Navigate to My Schedule/Availability
- [ ] View current availability settings
- [ ] Modify availability for one day
- [ ] Add a time-off/blocked time
- [ ] Save changes
- [ ] Verify calendar reflects changes

---

# PART 5: TELEHEALTH VIDEO SESSION

## 5.1 Pre-Session Setup
- [ ] Create a new telehealth appointment for "now" or join existing
- [ ] Verify telehealth link is generated
- [ ] Copy client join link

## 5.2 Start Video Session
- [ ] Click "Start Session" or "Join" button
- [ ] Grant camera/microphone permissions
- [ ] Verify video preview shows
- [ ] Verify audio levels indicator works
- [ ] Enter the session/waiting room

## 5.3 In-Session Features - Video Controls
- [ ] Toggle camera on/off - verify video stops/starts
- [ ] Toggle microphone on/off - verify mute works
- [ ] Test speaker/audio output selection
- [ ] Test camera selection (if multiple cameras)
- [ ] Test virtual background (if available)

## 5.4 In-Session Features - Session Controls
- [ ] Test screen sharing:
  - [ ] Share entire screen
  - [ ] Share specific window
  - [ ] Share browser tab
  - [ ] Stop sharing
- [ ] Test chat/messaging within session
- [ ] Test "Raise Hand" feature (if available)

## 5.5 In-Session Features - Recording
- [ ] Start session recording
- [ ] Verify recording indicator appears
- [ ] Record for at least 30 seconds
- [ ] Stop recording
- [ ] Verify recording saved notification

## 5.6 In-Session Features - Transcription
- [ ] Enable live transcription
- [ ] Speak several sentences
- [ ] Verify transcription appears in real-time
- [ ] Verify transcription accuracy
- [ ] Test transcription panel toggle (show/hide)

## 5.7 In-Session Features - Clinical Tools
- [ ] Open session notes panel
- [ ] Type session observations
- [ ] Test risk assessment quick buttons
- [ ] Test mood/affect selectors
- [ ] Save in-session notes

## 5.8 In-Session Features - Emergency
- [ ] Locate emergency button
- [ ] Verify emergency protocols are accessible
- [ ] DO NOT activate unless testing emergency flow

## 5.9 End Session
- [ ] Click "End Session" button
- [ ] Confirm end session
- [ ] Verify session summary modal appears
- [ ] Review session duration
- [ ] Add session notes/observations
- [ ] Rate session quality (if prompted)
- [ ] Complete post-session workflow

## 5.10 Post-Session
- [ ] Verify recording is accessible (if recorded)
- [ ] Verify transcription is saved (if enabled)
- [ ] Verify session appears in appointment history
- [ ] Generate clinical note from session (AI-assisted)

---

# PART 6: CLINICAL DOCUMENTATION - ALL NOTE TYPES

## 6.1 Intake Assessment Note

### Navigate and Create
- [ ] Go to Clinical Notes > New Note
- [ ] Select "Intake Assessment"
- [ ] Select Client: John Doe
- [ ] Select associated appointment (if any)

### Identifying Information Section
- [ ] Verify client info auto-populates
- [ ] Referral Source: Select from dropdown
- [ ] Referral Source Details: Enter "Dr. Smith, PCP"
- [ ] Reason for Referral: Enter detailed text

### Presenting Problem Section
- [ ] Chief Complaint: Enter "Client reports persistent anxiety and depression affecting work performance"
- [ ] History of Present Illness: Enter comprehensive narrative (min 200 words)
- [ ] Onset: Select "Gradual"
- [ ] Duration: Enter "6 months"
- [ ] Severity: Select "Moderate"
- [ ] Frequency: Select "Daily"
- [ ] Precipitating Factors: Enter text
- [ ] Alleviating Factors: Enter text
- [ ] Associated Symptoms: Check multiple boxes:
  - [ ] Sleep disturbance
  - [ ] Appetite changes
  - [ ] Fatigue
  - [ ] Difficulty concentrating
  - [ ] Irritability

### Psychiatric History Section
- [ ] Previous Treatment: Select "Yes"
- [ ] Previous Providers: Enter names and dates
- [ ] Previous Hospitalizations: Enter details or "None"
- [ ] Previous Medications: List with dosages
- [ ] Medication Response: Enter text
- [ ] Current Medications: List all current psychiatric meds
- [ ] Current Prescriber: Enter name
- [ ] ECT History: Select "No"
- [ ] Substance Use Treatment History: Enter details

### Medical History Section
- [ ] Current Medical Conditions: Check applicable:
  - [ ] Hypertension
  - [ ] Diabetes
  - [ ] Thyroid disorder
  - [ ] Chronic pain
  - [ ] Other (specify)
- [ ] Allergies: Enter "NKDA" or list allergies
- [ ] Current Non-Psychiatric Medications: List all
- [ ] Primary Care Physician: Enter name and contact
- [ ] Recent Hospitalizations: Enter or "None"
- [ ] Head Injuries/LOC: Enter history
- [ ] Seizure History: Select "No"
- [ ] Sleep Patterns: Describe in detail
- [ ] Appetite/Weight Changes: Describe
- [ ] Exercise Habits: Enter text

### Family History Section
- [ ] Psychiatric Family History: Check all applicable:
  - [ ] Depression
  - [ ] Anxiety
  - [ ] Bipolar Disorder
  - [ ] Schizophrenia
  - [ ] Substance Abuse
  - [ ] Suicide attempts/completions
- [ ] Family Members Affected: Specify relationships
- [ ] Medical Family History: Enter significant conditions
- [ ] Family Dynamics: Describe family relationships

### Social History Section
- [ ] Marital Status: Select from dropdown
- [ ] Living Situation: Describe
- [ ] Children: Number and ages
- [ ] Employment Status: Select from dropdown
- [ ] Occupation: Enter job title
- [ ] Education Level: Select highest completed
- [ ] Military History: Enter or "N/A"
- [ ] Legal History: Enter or "None"
- [ ] Financial Stressors: Describe
- [ ] Support System: Describe
- [ ] Cultural/Religious Factors: Enter relevant info
- [ ] Hobbies/Interests: List

### Substance Use Section
- [ ] Alcohol Use:
  - [ ] Current Use: Select frequency
  - [ ] Type: Enter preferred drinks
  - [ ] Amount: Enter quantity
  - [ ] Last Use: Enter date
  - [ ] History of problematic use: Describe
- [ ] Tobacco Use:
  - [ ] Current Use: Select Yes/No
  - [ ] Type: Cigarettes/Vape/Other
  - [ ] Amount: Packs per day
  - [ ] Quit attempts: Describe
- [ ] Cannabis Use:
  - [ ] Current Use: Select frequency
  - [ ] Method: Smoke/Edible/Other
  - [ ] Last Use: Enter date
- [ ] Other Substances:
  - [ ] Cocaine: Enter use history
  - [ ] Opioids: Enter use history
  - [ ] Benzodiazepines: Enter use history
  - [ ] Stimulants: Enter use history
  - [ ] Hallucinogens: Enter use history
  - [ ] Other: Specify
- [ ] CAGE/AUDIT Score: Enter if administered

### Developmental History Section
- [ ] Birth/Pregnancy Complications: Enter or "None reported"
- [ ] Developmental Milestones: Enter "Met on time" or describe delays
- [ ] Childhood Abuse/Trauma: Select and describe if applicable
- [ ] Attachment History: Describe
- [ ] School Performance: Describe
- [ ] Behavioral Problems in Childhood: Enter

### Trauma History Section
- [ ] Physical Abuse: Select Yes/No, describe if yes
- [ ] Sexual Abuse: Select Yes/No, describe if yes
- [ ] Emotional Abuse: Select Yes/No, describe if yes
- [ ] Neglect: Select Yes/No, describe if yes
- [ ] Domestic Violence: Select Yes/No, describe if yes
- [ ] Witness to Violence: Select Yes/No, describe if yes
- [ ] Accidents/Injuries: Describe
- [ ] Natural Disasters: Describe
- [ ] Combat/War: Describe
- [ ] Other Trauma: Describe
- [ ] PTSD Symptoms: Check applicable symptoms

### Mental Status Examination
- [ ] Appearance:
  - [ ] Grooming: Select (Well-groomed/Disheveled/etc.)
  - [ ] Dress: Select (Appropriate/Inappropriate/etc.)
  - [ ] Build: Select
  - [ ] Eye Contact: Select (Good/Poor/Avoidant)
  - [ ] Distinguishing Features: Enter
- [ ] Behavior:
  - [ ] Psychomotor Activity: Select (Normal/Agitated/Retarded)
  - [ ] Cooperation: Select (Cooperative/Uncooperative)
  - [ ] Attitude: Select (Friendly/Hostile/Guarded)
  - [ ] Abnormal Movements: Enter if any
- [ ] Speech:
  - [ ] Rate: Select (Normal/Rapid/Slow)
  - [ ] Volume: Select (Normal/Loud/Soft)
  - [ ] Tone: Select (Normal/Monotone)
  - [ ] Articulation: Select (Clear/Slurred)
  - [ ] Spontaneity: Select
- [ ] Mood: Enter client's stated mood
- [ ] Affect:
  - [ ] Quality: Select (Euthymic/Depressed/Anxious/etc.)
  - [ ] Range: Select (Full/Restricted/Blunted/Flat)
  - [ ] Congruence: Select (Congruent/Incongruent)
  - [ ] Stability: Select (Stable/Labile)
- [ ] Thought Process:
  - [ ] Organization: Select (Logical/Tangential/Circumstantial)
  - [ ] Goal-directedness: Select
  - [ ] Associations: Select (Intact/Loose)
- [ ] Thought Content:
  - [ ] Suicidal Ideation: Select and describe
  - [ ] Homicidal Ideation: Select and describe
  - [ ] Delusions: Select type if present
  - [ ] Obsessions: Describe if present
  - [ ] Phobias: List if present
  - [ ] Preoccupations: Describe
- [ ] Perceptions:
  - [ ] Hallucinations: Select type if present (Auditory/Visual/etc.)
  - [ ] Illusions: Describe if present
  - [ ] Depersonalization: Select Yes/No
  - [ ] Derealization: Select Yes/No
- [ ] Cognition:
  - [ ] Orientation: Check all that apply (Person/Place/Time/Situation)
  - [ ] Attention: Select (Intact/Impaired)
  - [ ] Concentration: Select
  - [ ] Memory: Select (Intact/Impaired - specify type)
  - [ ] Fund of Knowledge: Select (Average/Above/Below)
  - [ ] Abstraction: Select (Intact/Concrete)
- [ ] Insight: Select (Good/Fair/Poor/None)
- [ ] Judgment: Select (Good/Fair/Poor)

### Risk Assessment Section
- [ ] Suicidal Ideation: Select level
- [ ] Suicide Plan: Select Yes/No, describe
- [ ] Suicide Intent: Select level
- [ ] Access to Means: Select Yes/No, describe
- [ ] Previous Attempts: Enter number and describe
- [ ] Protective Factors: Check all that apply
- [ ] Risk Level: Select (None/Low/Moderate/High/Imminent)
- [ ] Homicidal Ideation: Select level
- [ ] Homicidal Plan: Describe if yes
- [ ] Identified Target: Describe if yes
- [ ] Self-Harm Behaviors: Describe
- [ ] Reckless Behaviors: Describe
- [ ] Safety Plan: Document or create

### Diagnostic Impressions Section
- [ ] Primary Diagnosis:
  - [ ] ICD-10 Code: Enter (e.g., F32.1)
  - [ ] Diagnosis Name: Major Depressive Disorder, Moderate
- [ ] Secondary Diagnoses: Add all applicable
- [ ] Rule Out Diagnoses: List considerations
- [ ] Differential Diagnosis Discussion: Enter clinical reasoning

### Treatment Recommendations Section
- [ ] Recommended Level of Care: Select
- [ ] Treatment Modality: Check all recommended:
  - [ ] Individual Therapy
  - [ ] Group Therapy
  - [ ] Family Therapy
  - [ ] Medication Management
  - [ ] Case Management
- [ ] Recommended Frequency: Select
- [ ] Estimated Duration: Enter
- [ ] Referrals Needed: List
- [ ] Additional Assessments Needed: List

### Clinician Summary Section
- [ ] Clinical Summary: Enter comprehensive paragraph
- [ ] Prognosis: Select (Good/Fair/Guarded/Poor)
- [ ] Prognosis Rationale: Enter text

### Signature Section
- [ ] Review all sections for completion
- [ ] Click "Sign Note"
- [ ] Enter signature PIN/password
- [ ] Verify signature timestamp
- [ ] Verify note status changes to "Signed"

---

## 6.2 Progress Note

### Navigate and Create
- [ ] Go to Clinical Notes > New Note
- [ ] Select "Progress Note"
- [ ] Select Client: John Doe
- [ ] Select associated appointment

### Session Information
- [ ] Session Date: Verify auto-populated
- [ ] Session Type: Select "Individual"
- [ ] Session Duration: Select "60 minutes"
- [ ] Service Location: Select "Telehealth"
- [ ] CPT Code: Select "90837"
- [ ] Diagnosis Codes: Add relevant codes

### Subjective Section
- [ ] Chief Complaint: Enter client's main concern
- [ ] Client's Report: Enter detailed narrative of client's statements
- [ ] Mood Rating (Client-Reported): Enter 1-10 scale
- [ ] Sleep: Describe quality and duration
- [ ] Appetite: Describe changes
- [ ] Energy Level: Select from dropdown
- [ ] Medication Compliance: Select Yes/Partial/No
- [ ] Side Effects Reported: Enter if any
- [ ] Homework Compliance: Select Completed/Partial/Not Completed
- [ ] Homework Review: Describe client's experience
- [ ] Stressors Since Last Session: Enter text
- [ ] Positive Events Since Last Session: Enter text
- [ ] Symptoms Reported: Check all present:
  - [ ] Depression
  - [ ] Anxiety
  - [ ] Panic attacks
  - [ ] Irritability
  - [ ] Sleep problems
  - [ ] Appetite changes
  - [ ] Concentration difficulties
  - [ ] Fatigue
  - [ ] Hopelessness
  - [ ] Worthlessness
  - [ ] Anhedonia
  - [ ] Guilt
  - [ ] Social withdrawal
  - [ ] Other (specify)
- [ ] Symptom Severity: Rate each checked symptom

### Objective Section
- [ ] Appearance: Select from options
- [ ] Behavior: Select from options
- [ ] Psychomotor Activity: Select
- [ ] Speech: Describe characteristics
- [ ] Mood (Observed): Enter clinician observation
- [ ] Affect: Select quality, range, congruence
- [ ] Thought Process: Select
- [ ] Thought Content: Describe
- [ ] Cognition: Note any concerns
- [ ] Insight: Select level
- [ ] Judgment: Select level
- [ ] Engagement Level: Select (Highly engaged/Moderately/Minimally/Resistant)

### Risk Assessment
- [ ] Suicidal Ideation: Select current level
- [ ] If present, complete Columbia Protocol questions
- [ ] Homicidal Ideation: Select current level
- [ ] Self-Harm Urges: Select present/absent
- [ ] Risk Level: Select overall risk
- [ ] Changes from Last Session: Document
- [ ] Safety Plan: Review/update if needed

### Assessment Section
- [ ] Clinical Impressions: Enter detailed clinical reasoning
- [ ] Progress Toward Goals: Select for each treatment goal:
  - [ ] Goal 1: Select (Progressing/Stable/Regressing/Achieved)
  - [ ] Goal 2: Select status
  - [ ] Goal 3: Select status
- [ ] Treatment Response: Describe overall response
- [ ] Barriers to Treatment: Identify any
- [ ] Diagnostic Considerations: Note any changes

### Plan Section
- [ ] Interventions Used This Session: Check all applied:
  - [ ] Supportive listening
  - [ ] Psychoeducation
  - [ ] Cognitive restructuring
  - [ ] Behavioral activation
  - [ ] Exposure techniques
  - [ ] Relaxation training
  - [ ] Mindfulness
  - [ ] Skills training
  - [ ] Role-playing
  - [ ] Homework review
  - [ ] Crisis intervention
  - [ ] Other (specify)
- [ ] Intervention Details: Describe specific techniques
- [ ] Client Response to Interventions: Describe
- [ ] Homework Assigned: Enter specific assignments
- [ ] Next Session Focus: Enter planned topics
- [ ] Next Appointment: Enter date/time
- [ ] Referrals Made: List any
- [ ] Coordination of Care: Document communications
- [ ] Medication Recommendations: If applicable

### Signature
- [ ] Review note for completeness
- [ ] Sign note with PIN/password
- [ ] Verify signature and timestamp

---

## 6.3 Treatment Plan

### Navigate and Create
- [ ] Go to Clinical Notes > New Note
- [ ] Select "Treatment Plan"
- [ ] Select Client: John Doe

### Client Information
- [ ] Verify demographics auto-populate
- [ ] Plan Start Date: Enter date
- [ ] Plan Review Date: Enter 90-day future date
- [ ] Plan Type: Select Initial/Update/Discharge

### Diagnoses
- [ ] Primary Diagnosis: Enter with ICD-10 code
- [ ] Secondary Diagnoses: Add all relevant
- [ ] Medical Diagnoses: Add relevant medical conditions
- [ ] Diagnosis Justification: Enter clinical reasoning

### Presenting Problems
- [ ] Problem 1:
  - [ ] Problem Statement: Enter specific, measurable problem
  - [ ] Duration: How long present
  - [ ] Severity: Rate current severity
  - [ ] Functional Impact: Describe impact on functioning
- [ ] Problem 2: Complete all fields
- [ ] Problem 3: Complete all fields
- [ ] Add additional problems as needed

### Strengths & Resources
- [ ] Client Strengths: List personal strengths
- [ ] Support System: Describe available support
- [ ] Resources: List community/financial resources
- [ ] Protective Factors: List all identified

### Treatment Goals (Complete for each problem)

#### Goal 1
- [ ] Long-Term Goal: Enter SMART goal
- [ ] Target Date: Enter date
- [ ] Baseline: Describe current functioning
- [ ] Short-Term Objective 1:
  - [ ] Objective Statement: Enter specific, measurable objective
  - [ ] Target Date: Enter date
  - [ ] Measurement Method: How progress will be measured
  - [ ] Intervention: What clinician will do
  - [ ] Responsible Party: Clinician/Client/Both
  - [ ] Frequency: How often intervention applied
- [ ] Short-Term Objective 2: Complete all fields
- [ ] Short-Term Objective 3: Complete all fields

#### Goal 2
- [ ] Complete same structure as Goal 1

#### Goal 3
- [ ] Complete same structure as Goal 1

### Treatment Modalities
- [ ] Modality 1:
  - [ ] Type: Select (Individual Therapy/Group/Family/etc.)
  - [ ] Frequency: Select (Weekly/Bi-weekly/Monthly)
  - [ ] Duration: Enter session length
  - [ ] Theoretical Orientation: Select (CBT/DBT/Psychodynamic/etc.)
- [ ] Modality 2: Complete if applicable
- [ ] Modality 3: Complete if applicable

### Treatment Setting
- [ ] Primary Setting: Select (Outpatient/IOP/PHP/etc.)
- [ ] Service Location: Select (Office/Telehealth/Home)

### Estimated Duration
- [ ] Estimated Length of Treatment: Enter
- [ ] Estimated Number of Sessions: Enter
- [ ] Discharge Criteria: Enter specific criteria

### Medications (if applicable)
- [ ] Current Medications: List all psychiatric meds
- [ ] Medication Goals: Enter
- [ ] Prescriber: Enter name
- [ ] Coordination Plan: Describe

### Crisis Plan
- [ ] Warning Signs: List client-specific signs
- [ ] Coping Strategies: List techniques to try first
- [ ] Support Contacts: List names and numbers
- [ ] Professional Contacts: List providers to contact
- [ ] Emergency Contacts: List 911, crisis line, ER
- [ ] Safety Plan Location: Note where plan is kept

### Client Participation
- [ ] Client Input: Document client's involvement in planning
- [ ] Client Preferences: Note treatment preferences
- [ ] Barriers Identified: List potential barriers
- [ ] Barrier Mitigation: Plan to address barriers

### Signatures
- [ ] Clinician Signature: Sign with PIN
- [ ] Client Signature: Mark as pending/obtained
- [ ] Guardian Signature (if minor): Mark status
- [ ] Plan Agreement Date: Enter

---

## 6.4 Cancellation/No-Show Note

### Navigate and Create
- [ ] Go to Clinical Notes > New Note
- [ ] Select "Cancellation Note" or "No-Show Note"
- [ ] Select Client: John Doe
- [ ] Select the cancelled/missed appointment

### Cancellation Details
- [ ] Date of Scheduled Appointment: Verify
- [ ] Time of Scheduled Appointment: Verify
- [ ] Appointment Type: Verify
- [ ] Cancellation Type: Select:
  - [ ] Client Cancelled
  - [ ] Clinician Cancelled
  - [ ] No-Show
  - [ ] Late Cancellation
- [ ] Cancellation Date/Time: When cancellation occurred
- [ ] Cancellation Method: Select (Phone/Email/Portal/Other)
- [ ] Cancelled By: Select (Client/Clinician/Other)

### Reason for Cancellation
- [ ] Reason Category: Select from dropdown:
  - [ ] Illness
  - [ ] Transportation
  - [ ] Work conflict
  - [ ] Family emergency
  - [ ] Forgot appointment
  - [ ] Financial
  - [ ] No longer needs services
  - [ ] Unknown/No reason given
  - [ ] Other
- [ ] Reason Details: Enter specific information
- [ ] Notice Given: Select timeframe
- [ ] Within 24-hour Policy: Select Yes/No

### Follow-Up Actions
- [ ] Rescheduled: Select Yes/No
- [ ] New Appointment Date: Enter if rescheduled
- [ ] Outreach Attempted: Select Yes/No
- [ ] Outreach Method: Select (Phone/Email/Letter)
- [ ] Outreach Date: Enter date
- [ ] Outreach Outcome: Describe response
- [ ] Additional Outreach Planned: Describe

### Clinical Considerations
- [ ] Pattern of Cancellations: Note if recurring issue
- [ ] Treatment Implications: Describe impact on treatment
- [ ] Risk Considerations: Note any safety concerns
- [ ] Discharge Consideration: Select if applicable

### Billing
- [ ] Late Cancellation Fee: Select if applicable
- [ ] Fee Amount: Enter if charged
- [ ] Fee Waived: Select Yes/No
- [ ] Waiver Reason: Enter if waived

### Signature
- [ ] Sign note
- [ ] Verify timestamp

---

## 6.5 Consultation Note

### Navigate and Create
- [ ] Go to Clinical Notes > New Note
- [ ] Select "Consultation Note"
- [ ] Select Client: John Doe

### Consultation Information
- [ ] Consultation Date: Enter
- [ ] Consultation Type: Select:
  - [ ] Peer Consultation
  - [ ] Supervisor Consultation
  - [ ] Medical Consultation
  - [ ] Specialist Consultation
  - [ ] Case Conference
- [ ] Consultation Method: Select (In-person/Phone/Video)
- [ ] Consultant Name: Enter
- [ ] Consultant Credentials: Enter
- [ ] Consultant Organization: Enter if applicable

### Reason for Consultation
- [ ] Primary Reason: Enter detailed reason
- [ ] Specific Questions: List questions asked
- [ ] Clinical Concerns: Describe concerns prompting consultation

### Information Shared
- [ ] Client History Summary: What was shared
- [ ] Current Symptoms: Describe presentation
- [ ] Treatment History: What was discussed
- [ ] Current Treatment Plan: Summary shared
- [ ] Diagnostic Questions: Enter if applicable

### Consultant Recommendations
- [ ] Diagnostic Recommendations: Enter
- [ ] Treatment Recommendations: Enter detailed recommendations
- [ ] Medication Recommendations: Enter if applicable
- [ ] Referral Recommendations: Enter if applicable
- [ ] Safety Recommendations: Enter if applicable
- [ ] Follow-up Recommendations: Enter

### Action Plan
- [ ] Recommendations Accepted: Select which
- [ ] Recommendations Declined: Note any declined with reasoning
- [ ] Implementation Plan: Describe how recommendations will be implemented
- [ ] Timeline: When actions will be taken
- [ ] Follow-up Consultation: Schedule if needed

### Signature
- [ ] Sign note
- [ ] Verify timestamp

---

## 6.6 Contact Note (Phone/Email/Other)

### Navigate and Create
- [ ] Go to Clinical Notes > New Note
- [ ] Select "Contact Note"
- [ ] Select Client: John Doe

### Contact Information
- [ ] Contact Date: Enter
- [ ] Contact Time: Enter
- [ ] Contact Duration: Enter minutes
- [ ] Contact Type: Select:
  - [ ] Phone call - incoming
  - [ ] Phone call - outgoing
  - [ ] Email received
  - [ ] Email sent
  - [ ] Text message
  - [ ] Video call (non-session)
  - [ ] In-person (non-session)
  - [ ] Letter/mail
  - [ ] Fax
  - [ ] Other
- [ ] Contact With: Select:
  - [ ] Client
  - [ ] Family member (specify)
  - [ ] Other provider (specify)
  - [ ] Insurance company
  - [ ] School personnel
  - [ ] Attorney/Legal
  - [ ] Other (specify)
- [ ] Person's Name: Enter
- [ ] Person's Role/Relationship: Enter

### Contact Purpose
- [ ] Purpose Category: Select:
  - [ ] Scheduling
  - [ ] Clinical update
  - [ ] Crisis/Emergency
  - [ ] Coordination of care
  - [ ] Insurance/Billing
  - [ ] Records request
  - [ ] Referral
  - [ ] Other
- [ ] Purpose Details: Enter specific reason

### Contact Content
- [ ] Summary of Discussion: Enter detailed summary
- [ ] Client Status (if discussed): Enter
- [ ] Concerns Raised: Enter any concerns
- [ ] Questions Asked: List questions
- [ ] Information Provided: What information shared
- [ ] Information Received: What information obtained

### Clinical Relevance
- [ ] Risk Assessment: Note if any risk factors discussed
- [ ] Treatment Implications: How this affects treatment
- [ ] Urgent Matters: Note any urgent issues

### Follow-Up
- [ ] Action Items: List needed actions
- [ ] Follow-up Needed: Select Yes/No
- [ ] Follow-up Plan: Describe
- [ ] Documentation Needed: Note any forms to complete

### Billable Contact
- [ ] Billable: Select Yes/No
- [ ] CPT Code: Enter if billable
- [ ] Time: Enter billable time

### Signature
- [ ] Sign note
- [ ] Verify timestamp

---

## 6.7 Termination/Discharge Note

### Navigate and Create
- [ ] Go to Clinical Notes > New Note
- [ ] Select "Termination Note" or "Discharge Summary"
- [ ] Select Client: John Doe

### Discharge Information
- [ ] Discharge Date: Enter
- [ ] Date of First Session: Enter
- [ ] Total Sessions Attended: Enter number
- [ ] Total Sessions Cancelled/No-show: Enter number
- [ ] Length of Treatment: Enter duration

### Reason for Termination
- [ ] Termination Type: Select:
  - [ ] Treatment goals achieved
  - [ ] Client request
  - [ ] Mutual decision
  - [ ] Client non-compliance
  - [ ] Client relocated
  - [ ] Client deceased
  - [ ] Referred to higher level of care
  - [ ] Referred to different provider
  - [ ] Lost to follow-up
  - [ ] Insurance/financial
  - [ ] Other
- [ ] Termination Initiated By: Select (Client/Clinician/Mutual)
- [ ] Detailed Reason: Enter comprehensive explanation

### Treatment Summary
- [ ] Presenting Problems at Intake: Summarize
- [ ] Diagnoses at Intake: List
- [ ] Diagnoses at Discharge: List (note any changes)
- [ ] Treatment Provided: Summarize interventions
- [ ] Theoretical Approach: Note modalities used
- [ ] Medications (if applicable): List current meds

### Progress Summary
- [ ] Goal 1 Status:
  - [ ] Goal Statement: Enter
  - [ ] Status: Select (Achieved/Partially Achieved/Not Achieved/Ongoing)
  - [ ] Progress Description: Detail progress made
- [ ] Goal 2 Status: Complete same
- [ ] Goal 3 Status: Complete same
- [ ] Overall Progress: Select (Significant/Moderate/Minimal/None/Declined)
- [ ] Functional Improvement: Describe areas of improvement
- [ ] Remaining Concerns: List ongoing issues

### Final Mental Status
- [ ] Complete abbreviated MSE
- [ ] Current Symptoms: List remaining symptoms
- [ ] Current Severity: Rate overall severity
- [ ] Current Risk Level: Select

### Discharge Plan
- [ ] Aftercare Recommendations: List all recommendations
- [ ] Referrals Made: List providers/services
- [ ] Referral Contact Info: Include details
- [ ] Medications at Discharge: List with prescriber
- [ ] Follow-up Appointments: List scheduled appointments
- [ ] Self-Help Resources: List resources provided
- [ ] Crisis Resources: Include hotline numbers

### Relapse Prevention
- [ ] Warning Signs: List client-specific signs
- [ ] Coping Strategies: List effective strategies
- [ ] Support System: List contacts
- [ ] When to Seek Help: Criteria for returning to treatment

### Prognosis
- [ ] Prognosis: Select (Excellent/Good/Fair/Guarded/Poor)
- [ ] Prognosis Rationale: Enter clinical reasoning

### Final Session Summary
- [ ] Termination Session Content: Describe final session
- [ ] Client Reaction: Note client's response
- [ ] Open Door Policy: Note if client can return

### Signature
- [ ] Sign note
- [ ] Verify timestamp

---

## 6.8 Group Note

### Navigate and Create
- [ ] Go to Clinical Notes > New Note
- [ ] Select "Group Note"
- [ ] Select all group participants including John Doe

### Group Information
- [ ] Group Name: Enter
- [ ] Group Type: Select (Process/Psychoeducation/Skills/Support)
- [ ] Session Number: Enter
- [ ] Session Date: Enter
- [ ] Session Duration: Enter
- [ ] Location: Select

### Attendance
- [ ] List all members present
- [ ] List all members absent
- [ ] Note any new members
- [ ] Note any terminating members

### Session Content
- [ ] Session Topic: Enter
- [ ] Session Goals: List
- [ ] Activities/Exercises: Describe
- [ ] Materials Used: List
- [ ] Discussion Summary: Enter group themes

### Group Process
- [ ] Group Cohesion: Rate and describe
- [ ] Group Dynamics: Describe interactions
- [ ] Significant Interactions: Note important exchanges
- [ ] Conflicts/Tensions: Note if any

### Individual Member Notes (for John Doe)
- [ ] Attendance: Present/Absent
- [ ] Participation Level: Select (Active/Moderate/Minimal/None)
- [ ] Mood/Affect: Describe
- [ ] Interactions with Others: Describe
- [ ] Themes Addressed: Enter personal themes
- [ ] Progress Observed: Note any progress
- [ ] Concerns: Note any concerns
- [ ] Individual Follow-up Needed: Select Yes/No

### Facilitator Observations
- [ ] Session Effectiveness: Rate
- [ ] Challenges: Note any difficulties
- [ ] Adjustments Needed: Note for future

### Next Session
- [ ] Planned Topic: Enter
- [ ] Goals for Next Session: List
- [ ] Homework/Tasks: Enter if assigned

### Signature
- [ ] Sign note
- [ ] Verify timestamp

---

## 6.9 Miscellaneous/Other Note

### Navigate and Create
- [ ] Go to Clinical Notes > New Note
- [ ] Select "Miscellaneous" or "Other"
- [ ] Select Client: John Doe

### Note Information
- [ ] Note Date: Enter
- [ ] Note Type/Category: Select or enter:
  - [ ] Administrative
  - [ ] Coordination of Care
  - [ ] Letter/Document
  - [ ] Clinical observation
  - [ ] Incident report
  - [ ] Other
- [ ] Related Appointment: Link if applicable

### Note Content
- [ ] Purpose: Enter reason for note
- [ ] Detailed Content: Enter comprehensive information
- [ ] Clinical Relevance: Explain how this relates to treatment
- [ ] Actions Taken: List any actions
- [ ] Follow-up Required: Note any needed follow-up

### Attachments
- [ ] Attach any relevant documents
- [ ] Describe attachments

### Signature
- [ ] Sign note
- [ ] Verify timestamp

---

# PART 7: MESSAGING & COMMUNICATION

## 7.1 Internal Staff Messaging

### Direct Messages
- [ ] Navigate to Messaging/Communication
- [ ] Click "New Message" or "Compose"
- [ ] Select a colleague as recipient
- [ ] Enter subject: "Test Message - QA"
- [ ] Enter body: "This is a test message for QA purposes."
- [ ] Click Send
- [ ] Verify message appears in Sent folder
- [ ] Ask colleague to confirm receipt

### Channels
- [ ] Navigate to Channels list
- [ ] Join an existing channel (or create new)
- [ ] Post a message in the channel
- [ ] Verify message appears
- [ ] React to a message (if emoji reactions available)
- [ ] Reply to a thread (if threading available)

### Message Features
- [ ] Test message search
- [ ] Test message filtering
- [ ] Test marking as read/unread
- [ ] Test archiving messages
- [ ] Test attaching files to messages

## 7.2 Client Messaging (Secure Portal Messages)

### Send Message to Client
- [ ] Navigate to John Doe's profile
- [ ] Go to Messages/Communication tab
- [ ] Click "New Message to Client"
- [ ] Enter subject: "Appointment Reminder"
- [ ] Enter message body with appointment details
- [ ] Click Send
- [ ] Verify message logged in client record

### View Client Messages
- [ ] Check for any incoming client messages
- [ ] Reply to client message (if any exist)
- [ ] Mark messages as read

---

# PART 8: FORMS & ASSESSMENTS

## 8.1 Send Intake Forms

### Select Forms to Send
- [ ] Navigate to John Doe's profile
- [ ] Go to Forms tab
- [ ] Click "Send Forms" or "Assign Forms"
- [ ] Select forms to send:
  - [ ] New Client Intake Form
  - [ ] Personal History Questionnaire
  - [ ] Consent for Treatment
  - [ ] HIPAA Acknowledgment
  - [ ] Telehealth Consent
  - [ ] Release of Information (if needed)
  - [ ] Financial Agreement
  - [ ] Emergency Contact Form
- [ ] Review selected forms
- [ ] Click "Send to Client"
- [ ] Verify confirmation message
- [ ] Check that forms appear as "Pending" in client record

### Monitor Form Status
- [ ] View form completion status
- [ ] Resend forms if needed
- [ ] View completed forms
- [ ] Download/print completed forms

## 8.2 Clinical Assessments

### PHQ-9 (Depression)
- [ ] Navigate to Assessments tab
- [ ] Click "New Assessment"
- [ ] Select "PHQ-9"
- [ ] Complete on behalf of client OR send to client
- [ ] If completing:
  - [ ] Enter scores for all 9 items (0-3 each)
  - [ ] Calculate total score
  - [ ] Note severity level
- [ ] Save assessment
- [ ] Review score interpretation
- [ ] Track historical scores if previous administrations exist

### GAD-7 (Anxiety)
- [ ] Select "GAD-7"
- [ ] Complete all 7 items
- [ ] Calculate total
- [ ] Save and review interpretation

### PCL-5 (PTSD)
- [ ] Select "PCL-5"
- [ ] Complete all 20 items
- [ ] Calculate cluster scores and total
- [ ] Save and review

### Columbia Suicide Severity Rating Scale
- [ ] Select "C-SSRS"
- [ ] Complete all screening questions
- [ ] If positive, complete full assessment
- [ ] Document risk level
- [ ] Save and review

### Other Assessments
- [ ] Test any other available assessments:
  - [ ] AUDIT (Alcohol)
  - [ ] DAST (Drug)
  - [ ] MDQ (Bipolar)
  - [ ] ASRS (ADHD)
  - [ ] Outcome measures
- [ ] Verify scoring accuracy
- [ ] Verify historical tracking

## 8.3 Custom Forms

### Create Custom Form (if admin)
- [ ] Navigate to Form Builder
- [ ] Create simple test form
- [ ] Add various field types
- [ ] Save form
- [ ] Assign to client
- [ ] Complete form
- [ ] View results

---

# PART 9: BILLING & CLAIMS

## 9.1 View Client Billing

### Billing Overview
- [ ] Navigate to John Doe's Billing tab
- [ ] Review account balance
- [ ] Review aging buckets (current, 30, 60, 90+ days)
- [ ] Review recent charges
- [ ] Review payment history

## 9.2 Create Charge

### Manual Charge Entry
- [ ] Click "New Charge"
- [ ] Select Date of Service
- [ ] Select CPT Code: 90837
- [ ] Verify fee populates
- [ ] Select diagnosis code
- [ ] Select rendering provider
- [ ] Add units: 1
- [ ] Add modifiers if needed (e.g., 95 for telehealth)
- [ ] Select place of service
- [ ] Save charge
- [ ] Verify charge appears in list

### Charge from Appointment
- [ ] Open a completed appointment
- [ ] Click "Create Charge" or "Bill"
- [ ] Verify information auto-populates
- [ ] Review and submit

## 9.3 Claims Management

### Create Claim
- [ ] Select unbilled charges
- [ ] Click "Create Claim"
- [ ] Review claim information:
  - [ ] Patient demographics
  - [ ] Insurance information
  - [ ] Service lines
  - [ ] Diagnosis codes
  - [ ] Referring provider
- [ ] Validate claim
- [ ] Submit claim (or queue for submission)

### View Claim Status
- [ ] Navigate to Claims list
- [ ] Filter by status (Pending, Submitted, Paid, Denied)
- [ ] View claim details
- [ ] Track claim status changes

### Work Denied Claims
- [ ] Find denied claim (or simulate)
- [ ] View denial reason
- [ ] Document appeal notes
- [ ] Resubmit if applicable

## 9.4 Payments

### Post Payment
- [ ] Navigate to Payments
- [ ] Click "Post Payment"
- [ ] Select payment type (Insurance/Patient)
- [ ] Enter payment amount
- [ ] Apply to charges
- [ ] Enter payment method
- [ ] Enter reference/check number
- [ ] Save payment
- [ ] Verify account balance updates

### Payment Plan
- [ ] If available, set up payment plan
- [ ] Define payment schedule
- [ ] Save and verify

## 9.5 Statements

### Generate Statement
- [ ] Navigate to Statements
- [ ] Select John Doe
- [ ] Generate statement
- [ ] Preview statement
- [ ] Send statement (email or print)

## 9.6 Reports

### Billing Reports
- [ ] Run Accounts Receivable Aging report
- [ ] Run Collections report
- [ ] Run Payment report
- [ ] Export report to Excel/PDF

---

# PART 10: REPORTS & ANALYTICS

## 10.1 Clinical Reports

### Caseload Report
- [ ] Navigate to Reports
- [ ] Select "Caseload Report"
- [ ] Set parameters (date range, clinician)
- [ ] Generate report
- [ ] Review client list with status
- [ ] Export if needed

### Productivity Report
- [ ] Select "Productivity Report"
- [ ] Select clinician: Self
- [ ] Select date range
- [ ] Generate report
- [ ] Review:
  - [ ] Sessions completed
  - [ ] Hours billed
  - [ ] Revenue generated
  - [ ] No-show rate
  - [ ] Cancellation rate

### Unsigned Notes Report
- [ ] Select "Unsigned Notes"
- [ ] Review list of pending signatures
- [ ] Sign notes directly from report

### Treatment Plan Due Report
- [ ] Select "Treatment Plan Review Due"
- [ ] Review clients needing plan updates
- [ ] Click to navigate to client

## 10.2 Administrative Reports

### Appointment Reports
- [ ] Run daily schedule report
- [ ] Run no-show report
- [ ] Run cancellation report

### Staff Reports
- [ ] Run credential expiration report
- [ ] Run training compliance report

## 10.3 Financial Reports

### Revenue Reports
- [ ] Run monthly revenue report
- [ ] Run revenue by payer report
- [ ] Run revenue by service type report

### AR Reports
- [ ] Run aging summary
- [ ] Run aging by payer
- [ ] Run collections forecast

## 10.4 Custom Reports

### Build Custom Report
- [ ] Navigate to Report Builder
- [ ] Select data fields
- [ ] Add filters
- [ ] Set grouping
- [ ] Preview report
- [ ] Save report template
- [ ] Export results

## 10.5 Dashboard Analytics

### Review Dashboards
- [ ] Navigate to Analytics Dashboard
- [ ] Review KPI widgets
- [ ] Review trend charts
- [ ] Filter by date range
- [ ] Filter by clinician/department
- [ ] Export dashboard data

---

# PART 11: STAFF & HR FUNCTIONS

## 11.1 Staff Directory

### View Directory
- [ ] Navigate to Staff/HR
- [ ] View staff directory
- [ ] Search for specific staff member
- [ ] View staff profile
- [ ] Verify contact information

### Staff Profile
- [ ] View own profile
- [ ] Update profile information
- [ ] Update profile photo
- [ ] Review credentials listed

## 11.2 Credentials Management

### View Credentials
- [ ] Navigate to Credentials section
- [ ] View own credentials:
  - [ ] License
  - [ ] NPI
  - [ ] DEA (if applicable)
  - [ ] Certifications
  - [ ] Insurance panels
- [ ] Verify expiration dates
- [ ] Upload updated credential documents

### Credential Alerts
- [ ] Review any expiration alerts
- [ ] Update expiring credentials

## 11.3 Time & Attendance

### Clock In/Out
- [ ] Clock in (if time tracking enabled)
- [ ] Complete work period
- [ ] Clock out
- [ ] Verify hours recorded

### View Timesheet
- [ ] Navigate to Timesheet
- [ ] Review recorded hours
- [ ] Submit timesheet (if required)

## 11.4 PTO Management

### Request PTO
- [ ] Navigate to PTO section
- [ ] Click "Request Time Off"
- [ ] Select dates
- [ ] Select PTO type
- [ ] Enter reason/notes
- [ ] Submit request
- [ ] Verify request appears as pending

### View PTO Balance
- [ ] Review available PTO balance
- [ ] Review PTO history

## 11.5 Training & Compliance

### View Training
- [ ] Navigate to Training section
- [ ] Review assigned trainings
- [ ] Complete a training module (if available)
- [ ] Review completion certificates

### Policy Acknowledgments
- [ ] Review required policy acknowledgments
- [ ] Acknowledge any pending policies

---

# PART 12: ADMINISTRATIVE FUNCTIONS

## 12.1 Client Search & Management

### Advanced Search
- [ ] Navigate to Client Search
- [ ] Test search by:
  - [ ] Name
  - [ ] DOB
  - [ ] MRN
  - [ ] Phone
  - [ ] Email
  - [ ] Insurance ID
- [ ] Test filters:
  - [ ] Active/Inactive
  - [ ] Primary clinician
  - [ ] Insurance type
  - [ ] Date range

### Batch Operations
- [ ] Select multiple clients
- [ ] Test batch actions (if available):
  - [ ] Send forms
  - [ ] Update status
  - [ ] Assign to clinician

## 12.2 Schedule Management

### Provider Schedule
- [ ] Navigate to Schedule Management
- [ ] View provider calendars
- [ ] Block time for meeting
- [ ] Unblock time

### Room Management
- [ ] View room availability (if applicable)
- [ ] Reserve room for appointment

## 12.3 System Settings

### View Settings
- [ ] Navigate to Settings
- [ ] Review practice settings
- [ ] Review user preferences
- [ ] Update notification preferences

### Templates
- [ ] View note templates
- [ ] View email templates
- [ ] Edit template (if permitted)

---

# PART 13: SUPERVISION (If Applicable)

## 13.1 Supervision Dashboard

### View Supervisees
- [ ] Navigate to Supervision section
- [ ] View list of supervisees
- [ ] Review supervisee activity

### Review Notes
- [ ] View supervisee's unsigned notes
- [ ] Review and co-sign notes
- [ ] Provide feedback

## 13.2 Supervision Sessions

### Log Supervision
- [ ] Create supervision note
- [ ] Document:
  - [ ] Supervision date
  - [ ] Duration
  - [ ] Topics discussed
  - [ ] Cases reviewed
  - [ ] Feedback provided
  - [ ] Goals set
- [ ] Sign supervision note

### Track Hours
- [ ] Review supervision hours logged
- [ ] Verify toward licensure requirements

---

# PART 14: ERROR HANDLING & EDGE CASES

## 14.1 Form Validation

### Required Fields
- [ ] Try to save note without required fields
- [ ] Verify appropriate error messages
- [ ] Verify form doesn't submit

### Data Validation
- [ ] Enter invalid date format
- [ ] Enter invalid phone number
- [ ] Enter invalid email
- [ ] Verify validation messages

## 14.2 Concurrent Access

### Simultaneous Editing
- [ ] Open same record in two tabs
- [ ] Edit in both
- [ ] Save in first tab
- [ ] Try to save in second tab
- [ ] Verify conflict handling

## 14.3 Session Timeout

### Test Timeout
- [ ] Stay idle for extended period
- [ ] Verify session timeout warning
- [ ] Test session extension
- [ ] Test redirect to login

## 14.4 Error States

### Network Errors
- [ ] Disable network briefly
- [ ] Try to save
- [ ] Verify error handling
- [ ] Re-enable network
- [ ] Verify recovery

### API Errors
- [ ] Monitor console for 500 errors
- [ ] Document any encountered
- [ ] Verify user-friendly error messages

---

# PART 15: PERFORMANCE & USABILITY

## 15.1 Page Load Times

### Measure Performance
- [ ] Dashboard load time: ___ seconds
- [ ] Client profile load time: ___ seconds
- [ ] Calendar load time: ___ seconds
- [ ] Report generation time: ___ seconds
- [ ] Note save time: ___ seconds

## 15.2 Mobile Responsiveness

### Test Mobile Views
- [ ] Open on mobile device or resize browser
- [ ] Verify navigation works
- [ ] Verify forms are usable
- [ ] Verify calendar is accessible

## 15.3 Browser Compatibility

### Test Browsers
- [ ] Chrome: All features work
- [ ] Firefox: All features work
- [ ] Safari: All features work
- [ ] Edge: All features work

## 15.4 Accessibility

### Basic Accessibility
- [ ] Tab navigation works
- [ ] Forms have proper labels
- [ ] Images have alt text
- [ ] Color contrast is adequate

---

# PART 16: SECURITY VERIFICATION

## 16.1 Authentication Security

### Password Policy
- [ ] Try weak password - verify rejection
- [ ] Verify password requirements displayed

### Session Security
- [ ] Verify secure cookies (check in DevTools)
- [ ] Verify HTTPS everywhere

## 16.2 Authorization

### Role-Based Access
- [ ] Verify only authorized features visible
- [ ] Try accessing unauthorized URL directly
- [ ] Verify appropriate denial

### Client Data Access
- [ ] Verify can only see assigned clients
- [ ] Verify proper data isolation

## 16.3 Audit Trail

### Review Audit Log
- [ ] Navigate to Audit Log (if accessible)
- [ ] Verify actions are logged
- [ ] Verify PHI access is logged

---

# TEST COMPLETION CHECKLIST

## Summary
- [ ] Total features tested: ___
- [ ] Features passing: ___
- [ ] Features failing: ___
- [ ] Bugs found: ___

## Critical Issues Found
List any critical issues:
1.
2.
3.

## Medium Issues Found
List medium priority issues:
1.
2.
3.

## Minor Issues Found
List minor issues:
1.
2.
3.

## Recommendations
List improvement recommendations:
1.
2.
3.

## Sign-Off
- [ ] Tester Name: _______________
- [ ] Date: _______________
- [ ] Test Environment: Production / Staging
- [ ] Overall Status: PASS / FAIL / CONDITIONAL PASS

---

# APPENDIX A: TEST DATA

## Client: John Doe
- MRN: [Lookup in system]
- DOB: [Lookup in system]
- Insurance: [Lookup in system]

## CPT Codes for Testing
- 90791 - Psychiatric Diagnostic Evaluation
- 90832 - Individual Psychotherapy, 30 min
- 90834 - Individual Psychotherapy, 45 min
- 90837 - Individual Psychotherapy, 60 min
- 90846 - Family Psychotherapy (without patient)
- 90847 - Family Psychotherapy (with patient)
- 90853 - Group Psychotherapy
- 99213 - Office Visit, Level 3
- 99214 - Office Visit, Level 4

## ICD-10 Codes for Testing
- F32.1 - Major Depressive Disorder, single episode, moderate
- F33.1 - Major Depressive Disorder, recurrent, moderate
- F41.1 - Generalized Anxiety Disorder
- F43.10 - Post-Traumatic Stress Disorder, unspecified
- F90.0 - ADHD, predominantly inattentive type

---

# APPENDIX B: EXPECTED BEHAVIORS

## Note Signing
- Notes should lock after signing
- Amendments should be available post-signing
- Co-signatures should be trackable

## Appointment States
- Scheduled → Checked In → In Progress → Completed
- Cancellation should prompt for reason
- No-show should be marked after appointment time

## Billing Flow
- Charges created from completed appointments
- Claims generated from charges
- Payments applied to claims

---

**END OF TEST PLAN**
