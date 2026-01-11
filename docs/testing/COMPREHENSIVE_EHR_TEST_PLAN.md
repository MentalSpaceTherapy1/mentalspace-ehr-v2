# MentalSpace EHR V2 - Comprehensive End-to-End Test Plan

**Version:** 2.0  
**Last Updated:** January 2026  
**Test Environment:** Production (https://mentalspaceehr.com)  
**Test User:** ejoseph@chctherapy.com  
**Password:** Bing@@0912

---

## TABLE OF CONTENTS

1. [Test Environment Setup](#1-test-environment-setup)
2. [Authentication & Security](#2-authentication--security)
3. [Dashboard & Navigation](#3-dashboard--navigation)
4. [Client Management](#4-client-management)
5. [Scheduling & Appointments](#5-scheduling--appointments)
6. [Clinical Documentation](#6-clinical-documentation)
7. [Telehealth](#7-telehealth)
8. [Billing & Claims](#8-billing--claims)
9. [Reports & Analytics](#9-reports--analytics)
10. [Staff & HR Management](#10-staff--hr-management)
11. [Compliance & Training](#11-compliance--training)
12. [Client Portal](#12-client-portal)
13. [Guardian Portal](#13-guardian-portal)
14. [Communication & Messaging](#14-communication--messaging)
15. [Supervision](#15-supervision)
16. [Productivity Dashboards](#16-productivity-dashboards)
17. [Progress Tracking](#17-progress-tracking)
18. [Group Therapy](#18-group-therapy)
19. [Self-Scheduling](#19-self-scheduling)
20. [AI Features](#20-ai-features)
21. [Admin Tools](#21-admin-tools)
22. [Settings & Configuration](#22-settings--configuration)
23. [Vendor & Finance](#23-vendor--finance)
24. [Error Handling & Edge Cases](#24-error-handling--edge-cases)
25. [Performance & Usability](#25-performance--usability)
26. [Security & Compliance](#26-security--compliance)
27. [API Endpoint Testing](#27-api-endpoint-testing)

---

## 1. TEST ENVIRONMENT SETUP

### 1.1 Pre-Test Checklist
- [ ] Browser: Chrome (latest), Firefox, Safari, Edge
- [ ] Clear browser cache and cookies
- [ ] Disable browser extensions that might interfere
- [ ] Enable browser console (F12)
- [ ] Enable network monitoring (F12 > Network tab)
- [ ] Test credentials verified and active
- [ ] Test client data available (John Doe or equivalent)
- [ ] Backup test data if needed

### 1.2 Test Data Requirements
- [ ] Test Client: John Doe (or equivalent)
- [ ] Test Staff Member: ejoseph@chctherapy.com
- [ ] Test Appointments: At least 3 (past, present, future)
- [ ] Test Notes: At least 2 signed, 1 unsigned
- [ ] Test Insurance: Primary and secondary (if applicable)
- [ ] Test Billing: At least 1 charge, 1 claim, 1 payment

---

## 2. AUTHENTICATION & SECURITY

### 2.1 Staff Login
- [ ] Navigate to https://mentalspaceehr.com/login
- [ ] Verify login page loads correctly
- [ ] Enter email: `ejoseph@chctherapy.com`
- [ ] Enter password: `Bing@@0912`
- [ ] Click "Sign In"
- [ ] Verify successful login - redirected to Dashboard
- [ ] Verify user name appears in top-right corner
- [ ] Verify no console errors (F12 > Console)
- [ ] Verify no network errors (F12 > Network)

### 2.2 MFA (Multi-Factor Authentication)
- [ ] If MFA is enabled, verify MFA prompt appears
- [ ] Enter MFA code from authenticator app
- [ ] Verify successful authentication
- [ ] Test "Remember this device" option (if available)
- [ ] Test MFA recovery codes (if available)

### 2.3 Session Management
- [ ] Refresh the page (F5) - verify still logged in
- [ ] Open new tab, navigate to https://mentalspaceehr.com - verify auto-login
- [ ] Verify session cookie is httpOnly and secure
- [ ] Test session timeout warning (wait 13 minutes)
- [ ] Test session extension option
- [ ] Test automatic logout after 15 minutes of inactivity
- [ ] Verify redirect to login page after logout

### 2.4 Password Security
- [ ] Navigate to Settings > Security (or User Profile)
- [ ] Test password change functionality
- [ ] Verify password requirements enforced:
  - [ ] Minimum length (8+ characters)
  - [ ] Requires uppercase letter
  - [ ] Requires lowercase letter
  - [ ] Requires number
  - [ ] Requires special character
- [ ] Test weak password rejection
- [ ] Test password history (cannot reuse recent passwords)

### 2.5 Authorization & Access Control
- [ ] Verify only authorized menu items visible based on role
- [ ] Try accessing unauthorized URL directly (e.g., `/admin` if not admin)
- [ ] Verify appropriate denial/redirect
- [ ] Test role-based data access (only see assigned clients)
- [ ] Verify proper data isolation between users

### 2.6 Logout
- [ ] Click user menu > Logout
- [ ] Verify successful logout
- [ ] Verify redirect to login page
- [ ] Verify session cleared
- [ ] Try accessing protected route - verify redirect to login

---

## 3. DASHBOARD & NAVIGATION

### 3.1 Dashboard Widgets
- [ ] Verify "Today's Appointments" widget loads with data
- [ ] Verify "Unsigned Notes" widget displays count
- [ ] Verify "Messages" widget shows unread count
- [ ] Verify "Quick Actions" buttons are functional
- [ ] Verify any charts/graphs render without errors
- [ ] Verify revenue/productivity metrics display (if applicable)
- [ ] Verify widget refresh functionality
- [ ] Test widget customization (if available)

### 3.2 Quick Actions
- [ ] Click "New Appointment" - verify modal/form opens
- [ ] Click "New Client" - verify form opens
- [ ] Click "New Note" - verify note selector opens
- [ ] Click "New Message" - verify composer opens
- [ ] Close all modals/forms
- [ ] Verify quick action shortcuts work (keyboard shortcuts if available)

### 3.3 Navigation Menu
- [ ] Verify all sidebar menu items are visible and clickable:
  - [ ] Dashboard
  - [ ] Clients
  - [ ] Appointments
  - [ ] Clinical Notes
  - [ ] Telehealth
  - [ ] Billing
  - [ ] Reports & Analytics
  - [ ] Progress Tracking
  - [ ] Staff & HR
  - [ ] Compliance & Training
  - [ ] Portals
  - [ ] Admin Tools
  - [ ] Clinician Tools
  - [ ] Communication
  - [ ] Settings
- [ ] Test menu expansion/collapse
- [ ] Test submenu navigation
- [ ] Verify active menu item highlighting
- [ ] Test mobile menu (responsive design)

### 3.4 Breadcrumbs & Navigation History
- [ ] Verify breadcrumbs display correctly
- [ ] Test browser back button functionality
- [ ] Test browser forward button functionality
- [ ] Verify deep linking works (direct URL access)

---

## 4. CLIENT MANAGEMENT

### 4.1 Client List & Search
- [ ] Navigate to Clients section
- [ ] Verify client list loads
- [ ] Test search by name: "John Doe"
- [ ] Test search by MRN
- [ ] Test search by DOB
- [ ] Test search by phone number
- [ ] Test search by email
- [ ] Test filters:
  - [ ] Active/Inactive status
  - [ ] Primary clinician
  - [ ] Insurance type
  - [ ] Date range
- [ ] Test sorting (name, DOB, last visit)
- [ ] Test pagination (if applicable)

### 4.2 Client Profile - Demographics Tab
- [ ] Click on John Doe to open client profile
- [ ] Verify client profile loads completely
- [ ] Verify all demographic fields display:
  - [ ] Full name
  - [ ] Date of Birth
  - [ ] Gender
  - [ ] Email
  - [ ] Phone number(s)
  - [ ] Address (street, city, state, zip)
  - [ ] Emergency contact
  - [ ] Preferred contact method
  - [ ] Preferred name/nickname
- [ ] Click "Edit" button
- [ ] Modify a non-critical field (e.g., preferred name)
- [ ] Save changes
- [ ] Verify changes persist after page refresh
- [ ] Verify audit trail logged (if accessible)

### 4.3 Client Profile - Insurance Tab
- [ ] Navigate to Insurance tab
- [ ] Verify primary insurance information displays:
  - [ ] Insurance name
  - [ ] Policy number
  - [ ] Group number
  - [ ] Subscriber name
  - [ ] Effective dates
- [ ] Verify secondary insurance (if applicable)
- [ ] Test "Add Insurance" functionality
- [ ] Test "Edit Insurance" functionality
- [ ] Test "Remove Insurance" functionality
- [ ] Check eligibility verification status
- [ ] Click "Verify Eligibility" button (if available)
- [ ] Verify prior authorizations display
- [ ] Test adding prior authorization

### 4.4 Client Profile - Documents Tab
- [ ] Navigate to Documents tab
- [ ] Verify document list loads
- [ ] Test document upload:
  - [ ] Upload PDF document
  - [ ] Upload image file
  - [ ] Verify upload succeeds
  - [ ] Verify file appears in list
- [ ] Test document viewing:
  - [ ] Click to view/download uploaded document
  - [ ] Verify document opens correctly
- [ ] Test document deletion:
  - [ ] Delete test document
  - [ ] Verify deletion confirmation
  - [ ] Verify document removed from list
- [ ] Test document categorization/tagging (if available)

### 4.5 Client Profile - Appointments Tab
- [ ] Navigate to Appointments tab
- [ ] Verify appointment history displays
- [ ] Verify upcoming appointments display
- [ ] Verify past appointments show correct status
- [ ] Test filtering by date range
- [ ] Test filtering by appointment type
- [ ] Click on appointment - verify details modal opens

### 4.6 Client Profile - Notes Tab
- [ ] Navigate to Notes tab
- [ ] Verify clinical notes list displays
- [ ] Verify notes are sorted by date (newest first)
- [ ] Test filtering by note type
- [ ] Test filtering by signed/unsigned status
- [ ] Click on an existing note to view
- [ ] Verify note content renders correctly
- [ ] Test note search functionality

### 4.7 Client Profile - Billing Tab
- [ ] Navigate to Billing tab
- [ ] Verify charges/claims display
- [ ] Verify account balance shows
- [ ] Verify payment history displays
- [ ] Test filtering by date range
- [ ] Test filtering by status
- [ ] Click on charge/claim - verify details

### 4.8 Client Profile - Portal Tab
- [ ] Navigate to Portal tab
- [ ] Verify portal account status shows
- [ ] If not invited, test "Send Portal Invitation"
- [ ] Verify invitation email is sent (check logs)
- [ ] Test "Resend Invitation" (if available)
- [ ] Verify portal access status updates

### 4.9 Client Profile - Consents Tab
- [ ] Navigate to Consents tab
- [ ] Verify consent forms list displays
- [ ] Check status of each consent (signed/pending/expired)
- [ ] View a signed consent document
- [ ] Test sending consent form to client
- [ ] Test marking consent as received

### 4.10 Client Profile - Diagnoses Tab
- [ ] Navigate to Diagnoses tab
- [ ] Verify diagnoses list displays
- [ ] Test adding new diagnosis:
  - [ ] Select ICD-10 code
  - [ ] Enter diagnosis name
  - [ ] Set as primary/secondary
  - [ ] Enter onset date
  - [ ] Save diagnosis
- [ ] Test editing diagnosis
- [ ] Test removing diagnosis
- [ ] Verify diagnosis appears in billing/notes

### 4.11 Client Profile - Relationships Tab
- [ ] Navigate to Relationships tab
- [ ] Verify relationships list displays
- [ ] Test adding relationship:
  - [ ] Select relationship type (parent, guardian, etc.)
  - [ ] Enter related person's information
  - [ ] Save relationship
- [ ] Test editing relationship
- [ ] Test removing relationship

### 4.12 Create New Client
- [ ] Navigate to Clients > New Client
- [ ] Fill in required fields:
  - [ ] First Name
  - [ ] Last Name
  - [ ] Date of Birth
  - [ ] Gender
  - [ ] Email
  - [ ] Phone
  - [ ] Address
- [ ] Test form validation:
  - [ ] Try submitting with missing required fields
  - [ ] Verify error messages display
- [ ] Save new client
- [ ] Verify client appears in client list
- [ ] Verify MRN assigned automatically

### 4.13 Duplicate Detection
- [ ] Navigate to Clients > Duplicate Detection
- [ ] Verify duplicate detection list displays
- [ ] Test merging duplicates:
  - [ ] Select two duplicate records
  - [ ] Review merge preview
  - [ ] Confirm merge
  - [ ] Verify merge completed
- [ ] Test marking as "Not a Duplicate"

---

## 5. SCHEDULING & APPOINTMENTS

### 5.1 Calendar View
- [ ] Navigate to Calendar/Appointments
- [ ] Verify calendar loads without errors
- [ ] Toggle between Day, Week, Month views
- [ ] Verify existing appointments display correctly
- [ ] Verify color-coding by appointment type
- [ ] Verify color-coding by status
- [ ] Test date navigation (previous/next)
- [ ] Test "Today" button
- [ ] Test provider filter (if multiple providers)
- [ ] Test room/location filter (if applicable)

### 5.2 Create New Appointment
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
  - [ ] Provider: Select provider
  - [ ] Room/Location: (if in-person)
  - [ ] Notes: "Test appointment for QA"
- [ ] Test recurring appointment:
  - [ ] Enable "Recurring" option
  - [ ] Select frequency (weekly)
  - [ ] Select end date or number of occurrences
  - [ ] Verify recurrence preview
- [ ] Save appointment
- [ ] Verify appointment appears on calendar
- [ ] Verify confirmation email sent to client (check logs)
- [ ] Verify appointment reminder scheduled (if applicable)

### 5.3 Modify Appointment
- [ ] Click on the created appointment
- [ ] Test editing appointment:
  - [ ] Change time by 30 minutes
  - [ ] Change duration
  - [ ] Change location
  - [ ] Add notes
  - [ ] Save changes
- [ ] Verify appointment moved on calendar
- [ ] Verify modification logged in audit trail
- [ ] Verify notification sent to client (if applicable)

### 5.4 Appointment Actions
- [ ] Open appointment details
- [ ] Test "Check In" button:
  - [ ] Click Check In
  - [ ] Verify status changes to "Checked In"
  - [ ] Verify check-in time recorded
- [ ] Test "Start Session" button:
  - [ ] Click Start Session
  - [ ] Verify telehealth link opens (if telehealth)
  - [ ] Verify status changes to "In Progress"
- [ ] Test "Cancel" button:
  - [ ] Click Cancel
  - [ ] Select cancellation reason
  - [ ] Add cancellation notes
  - [ ] Confirm cancellation
  - [ ] Verify status changes to "Cancelled"
  - [ ] Verify cancellation notification sent
- [ ] Test "Reschedule" button:
  - [ ] Click Reschedule
  - [ ] Select new date/time
  - [ ] Confirm reschedule
  - [ ] Verify appointment moved
- [ ] Test "No-Show" button:
  - [ ] Mark as No-Show
  - [ ] Verify status changes
  - [ ] Verify no-show logged

### 5.5 Waitlist Management
- [ ] Navigate to Waitlist section
- [ ] Verify waitlist displays
- [ ] Add John Doe to waitlist:
  - [ ] Click "Add to Waitlist"
  - [ ] Select client
  - [ ] Preferred days: Monday, Wednesday, Friday
  - [ ] Preferred times: Morning (9am-12pm)
  - [ ] Priority: High
  - [ ] Notes: "Prefers early morning"
  - [ ] Save waitlist entry
- [ ] Verify entry appears in waitlist
- [ ] Test "Match" functionality:
  - [ ] Click Match on waitlist entry
  - [ ] Review available appointments
  - [ ] Select appointment
  - [ ] Confirm match
  - [ ] Verify appointment created
- [ ] Test editing waitlist entry
- [ ] Test removing from waitlist

### 5.6 Provider Availability
- [ ] Navigate to Settings > Provider Availability
- [ ] View current availability settings
- [ ] Test modifying availability:
  - [ ] Select day of week
  - [ ] Set available hours
  - [ ] Add break times
  - [ ] Save changes
- [ ] Test adding time-off/blocked time:
  - [ ] Select date range
  - [ ] Select reason (vacation, meeting, etc.)
  - [ ] Save blocked time
- [ ] Verify calendar reflects changes
- [ ] Test recurring availability pattern

### 5.7 Appointment Types
- [ ] Navigate to Settings > Appointment Types
- [ ] Verify appointment types list displays
- [ ] Test creating new appointment type:
  - [ ] Name: "Intake Session"
  - [ ] Duration: 90 minutes
  - [ ] Default CPT Code: 90791
  - [ ] Default location
  - [ ] Save appointment type
- [ ] Test editing appointment type
- [ ] Test deleting appointment type
- [ ] Verify appointment type available in appointment form

### 5.8 AI Scheduling Assistant
- [ ] Navigate to Appointments > AI Scheduling Assistant
- [ ] Test AI assistant features:
  - [ ] Ask: "Find available slots for John Doe next week"
  - [ ] Verify AI suggests appointments
  - [ ] Test natural language scheduling
  - [ ] Test conflict detection
  - [ ] Test optimization suggestions

### 5.9 Clinician Schedules
- [ ] Navigate to Appointments > Clinician Schedules
- [ ] Verify schedule view displays
- [ ] Test filtering by clinician
- [ ] Test viewing multiple clinicians
- [ ] Test schedule export (if available)

---

## 6. CLINICAL DOCUMENTATION

### 6.1 Notes Dashboard
- [ ] Navigate to Clinical Notes > Compliance Dashboard
- [ ] Verify dashboard displays:
  - [ ] Unsigned notes count
  - [ ] Notes due for signature
  - [ ] Overdue notes
  - [ ] Notes requiring co-signature
- [ ] Test filtering by date range
- [ ] Test filtering by note type
- [ ] Test filtering by status

### 6.2 My Notes
- [ ] Navigate to Clinical Notes > My Notes
- [ ] Verify notes list displays
- [ ] Test filtering:
  - [ ] By note type
  - [ ] By signed/unsigned status
  - [ ] By date range
  - [ ] By client
- [ ] Test sorting
- [ ] Click on note to view details
- [ ] Test bulk actions (if available)

### 6.3 Create New Note - Note Type Selection
- [ ] Navigate to Clinical Notes > Create New Note
- [ ] Verify note type selector displays
- [ ] Test all note types available:
  - [ ] Intake Assessment
  - [ ] Progress Note
  - [ ] Treatment Plan
  - [ ] Cancellation Note
  - [ ] No-Show Note
  - [ ] Consultation Note
  - [ ] Contact Note
  - [ ] Termination Note
  - [ ] Group Note
  - [ ] Miscellaneous Note
- [ ] Select note type and proceed

### 6.4 Intake Assessment Note
- [ ] Create new Intake Assessment note
- [ ] Select Client: John Doe
- [ ] Select associated appointment (if any)
- [ ] Complete all sections:
  - [ ] Identifying Information
  - [ ] Presenting Problem
  - [ ] Psychiatric History
  - [ ] Medical History
  - [ ] Family History
  - [ ] Social History
  - [ ] Substance Use
  - [ ] Developmental History
  - [ ] Trauma History
  - [ ] Mental Status Examination
  - [ ] Risk Assessment
  - [ ] Diagnostic Impressions
  - [ ] Treatment Recommendations
  - [ ] Clinician Summary
- [ ] Test AI-assisted note generation (if available)
- [ ] Save draft
- [ ] Review note
- [ ] Sign note with PIN/password
- [ ] Verify signature timestamp
- [ ] Verify note status changes to "Signed"
- [ ] Verify note locked after signing

### 6.5 Progress Note
- [ ] Create new Progress Note
- [ ] Select Client: John Doe
- [ ] Select associated appointment
- [ ] Complete all sections:
  - [ ] Session Information
  - [ ] Subjective
  - [ ] Objective
  - [ ] Assessment
  - [ ] Plan
  - [ ] Risk Assessment
- [ ] Test AI transcription integration (if available)
- [ ] Test template usage
- [ ] Save and sign note
- [ ] Verify note appears in client's notes list

### 6.6 Treatment Plan
- [ ] Create new Treatment Plan
- [ ] Select Client: John Doe
- [ ] Complete all sections:
  - [ ] Diagnoses
  - [ ] Presenting Problems
  - [ ] Strengths & Resources
  - [ ] Treatment Goals (with objectives)
  - [ ] Treatment Modalities
  - [ ] Estimated Duration
  - [ ] Crisis Plan
  - [ ] Client Participation
- [ ] Test goal tracking integration
- [ ] Save and sign note
- [ ] Verify treatment plan review date set

### 6.7 Group Therapy Note
- [ ] Create new Group Note
- [ ] Select all group participants including John Doe
- [ ] Complete group information:
  - [ ] Group name/type
  - [ ] Session number
  - [ ] Attendance
  - [ ] Session content
  - [ ] Group process
  - [ ] Individual member notes
- [ ] Save and sign note
- [ ] Verify note linked to all participants

### 6.8 Note Editing & Amendments
- [ ] Open an unsigned note
- [ ] Test editing functionality
- [ ] Save changes
- [ ] Open a signed note
- [ ] Verify note is locked
- [ ] Test amendment functionality:
  - [ ] Click "Add Amendment"
  - [ ] Enter amendment text
  - [ ] Sign amendment
  - [ ] Verify amendment appears in note history

### 6.9 Note Co-Signature
- [ ] Create note requiring co-signature
- [ ] Sign note as primary author
- [ ] Verify note status: "Pending Co-Signature"
- [ ] Log in as supervisor
- [ ] Navigate to Co-Sign Queue
- [ ] Review note
- [ ] Co-sign note
- [ ] Verify both signatures recorded

### 6.10 Smart Note Creator (AI)
- [ ] Navigate to Smart Note Creator
- [ ] Test AI note generation:
  - [ ] Select appointment
  - [ ] Select note type
  - [ ] Review AI-generated content
  - [ ] Edit as needed
  - [ ] Save note
- [ ] Test transcription integration
- [ ] Test clinical suggestions

### 6.11 Note Templates
- [ ] Test using note templates
- [ ] Test creating custom template
- [ ] Test template variables/placeholders
- [ ] Test template library

### 6.12 Note Search & Filtering
- [ ] Test searching notes by:
  - [ ] Client name
  - [ ] Note type
  - [ ] Date range
  - [ ] Keywords in content
  - [ ] Provider
- [ ] Test advanced filters
- [ ] Test note export (if available)

---

## 7. TELEHEALTH

### 7.1 Telehealth Dashboard
- [ ] Navigate to Telehealth
- [ ] Verify dashboard displays:
  - [ ] Upcoming sessions
  - [ ] Active sessions
  - [ ] Recent sessions
- [ ] Test filtering options

### 7.2 Pre-Session Setup
- [ ] Create a new telehealth appointment for "now" or join existing
- [ ] Verify telehealth link is generated
- [ ] Copy client join link
- [ ] Verify consent status checked
- [ ] Test sending join link to client

### 7.3 Start Video Session
- [ ] Click "Start Session" or "Join" button
- [ ] Grant camera/microphone permissions
- [ ] Verify video preview shows
- [ ] Verify audio levels indicator works
- [ ] Enter the session/waiting room
- [ ] Verify waiting room functionality (if applicable)

### 7.4 In-Session Features - Video Controls
- [ ] Toggle camera on/off - verify video stops/starts
- [ ] Toggle microphone on/off - verify mute works
- [ ] Test speaker/audio output selection
- [ ] Test camera selection (if multiple cameras)
- [ ] Test virtual background (if available)
- [ ] Test video quality settings

### 7.5 In-Session Features - Session Controls
- [ ] Test screen sharing:
  - [ ] Share entire screen
  - [ ] Share specific window
  - [ ] Share browser tab
  - [ ] Stop sharing
- [ ] Test chat/messaging within session
- [ ] Test "Raise Hand" feature (if available)
- [ ] Test participant management (if group session)

### 7.6 In-Session Features - Recording
- [ ] Start session recording
- [ ] Verify recording indicator appears
- [ ] Verify consent obtained (if required)
- [ ] Record for at least 30 seconds
- [ ] Stop recording
- [ ] Verify recording saved notification
- [ ] Verify recording accessible post-session

### 7.7 In-Session Features - Transcription
- [ ] Enable live transcription
- [ ] Speak several sentences
- [ ] Verify transcription appears in real-time
- [ ] Verify transcription accuracy
- [ ] Test transcription panel toggle (show/hide)
- [ ] Verify transcription saved post-session

### 7.8 In-Session Features - Clinical Tools
- [ ] Open session notes panel
- [ ] Type session observations
- [ ] Test risk assessment quick buttons
- [ ] Test mood/affect selectors
- [ ] Save in-session notes
- [ ] Test assessment tools (if available)

### 7.9 In-Session Features - Emergency
- [ ] Locate emergency button
- [ ] Verify emergency protocols are accessible
- [ ] Test emergency contact display (DO NOT activate unless testing emergency flow)
- [ ] Verify crisis resources available

### 7.10 End Session
- [ ] Click "End Session" button
- [ ] Confirm end session
- [ ] Verify session summary modal appears
- [ ] Review session duration
- [ ] Add session notes/observations
- [ ] Rate session quality (if prompted)
- [ ] Complete post-session workflow

### 7.11 Post-Session
- [ ] Verify recording is accessible (if recorded)
- [ ] Verify transcription is saved (if enabled)
- [ ] Verify session appears in appointment history
- [ ] Generate clinical note from session (AI-assisted)
- [ ] Test session playback (if available)

### 7.12 Telehealth Consent
- [ ] Navigate to client's Telehealth Consent
- [ ] Verify consent status
- [ ] Test sending consent form
- [ ] Test consent renewal (if expired)

---

## 8. BILLING & CLAIMS

### 8.1 Billing Dashboard
- [ ] Navigate to Billing Dashboard
- [ ] Verify dashboard displays:
  - [ ] Accounts Receivable summary
  - [ ] Aging buckets
  - [ ] Recent charges
  - [ ] Recent payments
  - [ ] Claims status summary
- [ ] Test date range filtering
- [ ] Test provider filtering

### 8.2 View Client Billing
- [ ] Navigate to John Doe's Billing tab
- [ ] Review account balance
- [ ] Review aging buckets (current, 30, 60, 90+ days)
- [ ] Review recent charges
- [ ] Review payment history
- [ ] Review claims history

### 8.3 Create Charge
- [ ] Navigate to Billing > Charges
- [ ] Click "New Charge"
- [ ] Manual Charge Entry:
  - [ ] Select Date of Service
  - [ ] Select Client: John Doe
  - [ ] Select CPT Code: 90837
  - [ ] Verify fee populates
  - [ ] Select diagnosis code
  - [ ] Select rendering provider
  - [ ] Add units: 1
  - [ ] Add modifiers if needed (e.g., 95 for telehealth)
  - [ ] Select place of service
  - [ ] Save charge
- [ ] Verify charge appears in list
- [ ] Charge from Appointment:
  - [ ] Open a completed appointment
  - [ ] Click "Create Charge" or "Bill"
  - [ ] Verify information auto-populates
  - [ ] Review and submit

### 8.4 Claims Management
- [ ] Navigate to Billing > Claims
- [ ] Create Claim:
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
- [ ] View Claim Status:
  - [ ] Navigate to Claims list
  - [ ] Filter by status (Pending, Submitted, Paid, Denied)
  - [ ] View claim details
  - [ ] Track claim status changes
- [ ] Work Denied Claims:
  - [ ] Find denied claim (or simulate)
  - [ ] View denial reason
  - [ ] Document appeal notes
  - [ ] Resubmit if applicable

### 8.5 Payments
- [ ] Navigate to Billing > Payments
- [ ] Post Payment:
  - [ ] Click "Post Payment"
  - [ ] Select payment type (Insurance/Patient)
  - [ ] Enter payment amount
  - [ ] Apply to charges
  - [ ] Enter payment method
  - [ ] Enter reference/check number
  - [ ] Save payment
- [ ] Verify account balance updates
- [ ] Payment Plan:
  - [ ] If available, set up payment plan
  - [ ] Define payment schedule
  - [ ] Save and verify

### 8.6 Statements
- [ ] Navigate to Statements
- [ ] Generate Statement:
  - [ ] Select John Doe
  - [ ] Generate statement
  - [ ] Preview statement
  - [ ] Send statement (email or print)
- [ ] Test statement templates
- [ ] Test batch statement generation

### 8.7 Payer Management
- [ ] Navigate to Billing > Payers
- [ ] View payer list
- [ ] Test creating new payer:
  - [ ] Enter payer information
  - [ ] Configure payer rules
  - [ ] Save payer
- [ ] Test editing payer
- [ ] Test payer rules configuration
- [ ] Test payer rule import

### 8.8 Billing Holds
- [ ] Navigate to Billing > Billing Holds
- [ ] View holds list
- [ ] Test creating hold:
  - [ ] Select client
  - [ ] Select reason
  - [ ] Add notes
  - [ ] Save hold
- [ ] Test releasing hold
- [ ] Verify charges not created while on hold

### 8.9 Billing Readiness Checker
- [ ] Navigate to Billing > Readiness Checker
- [ ] Select client or appointment
- [ ] Run readiness check
- [ ] Review readiness report:
  - [ ] Insurance verified
  - [ ] Authorizations obtained
  - [ ] Diagnosis codes present
  - [ ] Provider credentials verified
- [ ] Address any issues found

### 8.10 AdvancedMD Integration
- [ ] Navigate to Admin > AdvancedMD Settings
- [ ] Verify AdvancedMD connection status
- [ ] Test AdvancedMD Sync:
  - [ ] Run manual sync
  - [ ] Verify sync status
  - [ ] Review sync logs
- [ ] Test claim submission to AdvancedMD
- [ ] Test ERA (Electronic Remittance Advice) processing

---

## 9. REPORTS & ANALYTICS

### 9.1 Reports Dashboard
- [ ] Navigate to Reports & Analytics
- [ ] Verify dashboard displays:
  - [ ] Available reports
  - [ ] Recent reports
  - [ ] Report subscriptions
  - [ ] Custom reports
- [ ] Test report categories/filtering

### 9.2 Clinical Reports
- [ ] Caseload Report:
  - [ ] Select "Caseload Report"
  - [ ] Set parameters (date range, clinician)
  - [ ] Generate report
  - [ ] Review client list with status
  - [ ] Export if needed
- [ ] Productivity Report:
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
- [ ] Unsigned Notes Report:
  - [ ] Select "Unsigned Notes"
  - [ ] Review list of pending signatures
  - [ ] Sign notes directly from report
- [ ] Treatment Plan Due Report:
  - [ ] Select "Treatment Plan Review Due"
  - [ ] Review clients needing plan updates
  - [ ] Click to navigate to client

### 9.3 Administrative Reports
- [ ] Appointment Reports:
  - [ ] Run daily schedule report
  - [ ] Run no-show report
  - [ ] Run cancellation report
  - [ ] Run utilization report
- [ ] Staff Reports:
  - [ ] Run credential expiration report
  - [ ] Run training compliance report
  - [ ] Run performance review report

### 9.4 Financial Reports
- [ ] Revenue Reports:
  - [ ] Run monthly revenue report
  - [ ] Run revenue by payer report
  - [ ] Run revenue by service type report
- [ ] AR Reports:
  - [ ] Run aging summary
  - [ ] Run aging by payer
  - [ ] Run collections forecast
- [ ] Claims Reports:
  - [ ] Run claims status report
  - [ ] Run denial analysis report

### 9.5 Custom Reports
- [ ] Navigate to Report Builder
- [ ] Build Custom Report:
  - [ ] Select data fields
  - [ ] Add filters
  - [ ] Set grouping
  - [ ] Set sorting
  - [ ] Preview report
  - [ ] Save report template
  - [ ] Export results
- [ ] Test saved report templates
- [ ] Test report scheduling

### 9.6 Report Subscriptions
- [ ] Navigate to Report Subscriptions
- [ ] View existing subscriptions
- [ ] Test creating subscription:
  - [ ] Select report
  - [ ] Set frequency (daily, weekly, monthly)
  - [ ] Set recipients
  - [ ] Save subscription
- [ ] Test editing subscription
- [ ] Test deleting subscription

### 9.7 Analytics Dashboard
- [ ] Navigate to Analytics Dashboard
- [ ] Review KPI widgets
- [ ] Review trend charts
- [ ] Test filtering:
  - [ ] By date range
  - [ ] By clinician/department
  - [ ] By client type
- [ ] Test chart interactions
- [ ] Export dashboard data

### 9.8 Provider Comparison
- [ ] Navigate to Provider Comparison
- [ ] Select multiple providers
- [ ] Compare metrics:
  - [ ] Productivity
  - [ ] Revenue
  - [ ] No-show rates
  - [ ] Client satisfaction
- [ ] Review comparison charts

### 9.9 AI Predictions
- [ ] Navigate to AI Predictions
- [ ] Review prediction models:
  - [ ] No-show predictions
  - [ ] Revenue forecasts
  - [ ] Capacity planning
- [ ] Test prediction accuracy
- [ ] Review prediction insights

### 9.10 Custom Dashboards
- [ ] Navigate to Custom Dashboards
- [ ] View existing dashboards
- [ ] Test creating dashboard:
  - [ ] Add widgets
  - [ ] Configure widgets
  - [ ] Set filters
  - [ ] Save dashboard
- [ ] Test dashboard sharing
- [ ] Test dashboard export

---

## 10. STAFF & HR MANAGEMENT

### 10.1 Staff Directory
- [ ] Navigate to Staff & HR > Staff Directory
- [ ] Verify staff directory loads
- [ ] Test search functionality
- [ ] Test filtering by:
  - [ ] Department
  - [ ] Role
  - [ ] Status (active/inactive)
- [ ] Click on staff member to view profile
- [ ] Verify contact information displays

### 10.2 Staff Profile
- [ ] View own profile
- [ ] Update profile information:
  - [ ] Edit contact information
  - [ ] Update profile photo
  - [ ] Update bio
  - [ ] Save changes
- [ ] Review credentials listed
- [ ] Review employment information

### 10.3 Organizational Chart
- [ ] Navigate to Staff > Org Chart
- [ ] Verify org chart displays
- [ ] Test navigation/interaction
- [ ] Verify reporting relationships
- [ ] Test filtering by department

### 10.4 Onboarding Dashboard
- [ ] Navigate to Onboarding Dashboard
- [ ] View onboarding tasks
- [ ] Test creating onboarding checklist
- [ ] Test assigning tasks
- [ ] Test tracking progress
- [ ] Test milestone tracking

### 10.5 Performance Reviews
- [ ] Navigate to HR > Performance Reviews
- [ ] View review list
- [ ] Test creating performance review:
  - [ ] Select employee
  - [ ] Select review period
  - [ ] Complete review form
  - [ ] Set goals
  - [ ] Save review
- [ ] Test review approval workflow
- [ ] Test review history

### 10.6 Time & Attendance
- [ ] Navigate to HR > Time Clock
- [ ] Clock In:
  - [ ] Click "Clock In"
  - [ ] Verify timestamp recorded
  - [ ] Verify location (if GPS enabled)
- [ ] Clock Out:
  - [ ] Complete work period
  - [ ] Click "Clock Out"
  - [ ] Verify hours recorded
- [ ] View Timesheet:
  - [ ] Navigate to Timesheet
  - [ ] Review recorded hours
  - [ ] Test editing time entries
  - [ ] Submit timesheet (if required)
- [ ] Attendance Calendar:
  - [ ] Navigate to Attendance Calendar
  - [ ] View attendance records
  - [ ] Test attendance reports

### 10.7 PTO Management
- [ ] Navigate to HR > PTO Requests
- [ ] View PTO balance
- [ ] Request PTO:
  - [ ] Click "Request Time Off"
  - [ ] Select dates
  - [ ] Select PTO type
  - [ ] Enter reason/notes
  - [ ] Submit request
- [ ] Verify request appears as pending
- [ ] PTO Calendar:
  - [ ] Navigate to PTO Calendar
  - [ ] View all PTO requests
  - [ ] Test filtering
- [ ] PTO Approvals (if supervisor):
  - [ ] Navigate to PTO Approvals
  - [ ] Review pending requests
  - [ ] Approve/deny requests
  - [ ] Add comments

### 10.8 User Management
- [ ] Navigate to Users
- [ ] View user list
- [ ] Test creating new user:
  - [ ] Enter user information
  - [ ] Assign role
  - [ ] Set permissions
  - [ ] Send invitation
- [ ] Test editing user
- [ ] Test deactivating user
- [ ] Test password reset

---

## 11. COMPLIANCE & TRAINING

### 11.1 Credentialing Dashboard
- [ ] Navigate to Compliance & Training > Credentialing
- [ ] Verify dashboard displays:
  - [ ] Credentials overview
  - [ ] Expiration alerts
  - [ ] Compliance status
- [ ] Test filtering options

### 11.2 Credential Management
- [ ] Navigate to Credential List
- [ ] View credentials
- [ ] Test adding credential:
  - [ ] Select credential type (License, NPI, DEA, etc.)
  - [ ] Enter credential number
  - [ ] Enter issue date
  - [ ] Enter expiration date
  - [ ] Upload credential document
  - [ ] Save credential
- [ ] Test editing credential
- [ ] Test credential verification
- [ ] Test expiration alerts

### 11.3 Credential Verification
- [ ] Navigate to Credential Verification
- [ ] Test verification workflow:
  - [ ] Select credential
  - [ ] Run verification check
  - [ ] Review verification results
  - [ ] Update verification status
- [ ] Test bulk verification

### 11.4 Expiration Alerts
- [ ] Navigate to Expiration Alerts
- [ ] View expiring credentials
- [ ] Test alert configuration
- [ ] Test notification settings

### 11.5 Compliance Reports
- [ ] Navigate to Compliance Report
- [ ] Generate compliance report:
  - [ ] Select date range
  - [ ] Select credential types
  - [ ] Generate report
  - [ ] Review compliance status
- [ ] Test report export

### 11.6 Background Screening
- [ ] Navigate to Background Screening
- [ ] View screening status
- [ ] Test initiating screening
- [ ] Test updating screening status
- [ ] Test screening reports

### 11.7 Training Catalog
- [ ] Navigate to Training > Course Catalog
- [ ] View available courses
- [ ] Test course search
- [ ] Test course filtering
- [ ] View course details
- [ ] Test course enrollment

### 11.8 Training Progress
- [ ] Navigate to Training Progress
- [ ] View assigned trainings
- [ ] Test completing training module
- [ ] Test tracking progress
- [ ] Test certificate generation

### 11.9 CEU Tracker
- [ ] Navigate to CEU Tracker
- [ ] View CEU credits
- [ ] Test adding CEU credit:
  - [ ] Enter course information
  - [ ] Enter CEU hours
  - [ ] Upload certificate
  - [ ] Save credit
- [ ] Test CEU reporting

### 11.10 Training Calendar
- [ ] Navigate to Training Calendar
- [ ] View scheduled trainings
- [ ] Test filtering by type
- [ ] Test registration

### 11.11 Policy Library
- [ ] Navigate to Compliance > Policy Library
- [ ] View policies
- [ ] Test policy search
- [ ] View policy details
- [ ] Test policy acknowledgment
- [ ] Test policy distribution

### 11.12 Incident Reporting
- [ ] Navigate to Compliance > Incident Reports
- [ ] View incident list
- [ ] Test creating incident report:
  - [ ] Enter incident details
  - [ ] Select incident type
  - [ ] Add involved parties
  - [ ] Upload documentation
  - [ ] Submit report
- [ ] Test incident investigation workflow
- [ ] Test incident trends

---

## 12. CLIENT PORTAL

### 12.1 Portal Login
- [ ] Navigate to portal login page
- [ ] Test client login with credentials
- [ ] Test "Forgot Password" functionality
- [ ] Test password reset flow
- [ ] Verify successful login

### 12.2 Portal Dashboard
- [ ] Verify dashboard displays:
  - [ ] Upcoming appointments
  - [ ] Messages
  - [ ] Pending forms
  - [ ] Recent activity
- [ ] Test dashboard widgets

### 12.3 Portal Appointments
- [ ] View upcoming appointments
- [ ] View appointment history
- [ ] Test requesting appointment:
  - [ ] Select preferred date/time
  - [ ] Select appointment type
  - [ ] Add notes
  - [ ] Submit request
- [ ] Test rescheduling appointment
- [ ] Test cancelling appointment

### 12.4 Portal Self-Scheduling
- [ ] Navigate to Self-Scheduling
- [ ] View available time slots
- [ ] Test filtering by provider
- [ ] Test filtering by appointment type
- [ ] Select time slot
- [ ] Confirm appointment
- [ ] Verify confirmation email

### 12.5 Portal Forms
- [ ] View pending forms
- [ ] Test completing form:
  - [ ] Open form
  - [ ] Fill in all fields
  - [ ] Sign form (if required)
  - [ ] Submit form
- [ ] View completed forms
- [ ] Test form history

### 12.6 Portal Documents
- [ ] View available documents
- [ ] Test downloading document
- [ ] Test uploading document (if allowed)
- [ ] Test document categories

### 12.7 Portal Assessments
- [ ] View assigned assessments
- [ ] Test taking assessment:
  - [ ] Open assessment
  - [ ] Answer all questions
  - [ ] Submit assessment
- [ ] View assessment results
- [ ] View assessment history

### 12.8 Portal Messaging
- [ ] View messages
- [ ] Test sending message:
  - [ ] Compose message
  - [ ] Attach file (if allowed)
  - [ ] Send message
- [ ] Test replying to message
- [ ] Test message search

### 12.9 Portal Billing
- [ ] View account balance
- [ ] View charges
- [ ] View payment history
- [ ] Test making payment:
  - [ ] Select payment method
  - [ ] Enter payment amount
  - [ ] Process payment
- [ ] View statements
- [ ] Download statement

### 12.10 Portal Profile
- [ ] View profile information
- [ ] Test updating profile:
  - [ ] Update contact information
  - [ ] Update preferences
  - [ ] Save changes
- [ ] Test password change
- [ ] Test notification preferences

### 12.11 Portal Tracking Features
- [ ] Mood Tracking:
  - [ ] Navigate to Mood Tracking
  - [ ] Log mood entry
  - [ ] View mood history/charts
- [ ] Symptom Diary:
  - [ ] Navigate to Symptom Diary
  - [ ] Log symptoms
  - [ ] View symptom trends
- [ ] Sleep Diary:
  - [ ] Navigate to Sleep Diary
  - [ ] Log sleep data
  - [ ] View sleep patterns
- [ ] Exercise Log:
  - [ ] Navigate to Exercise Log
  - [ ] Log exercise
  - [ ] View exercise history

### 12.12 Portal Telehealth
- [ ] View upcoming telehealth sessions
- [ ] Test joining session:
  - [ ] Click join link
  - [ ] Grant permissions
  - [ ] Enter session
- [ ] Test session features (same as staff telehealth)

---

## 13. GUARDIAN PORTAL

### 13.1 Guardian Portal Access
- [ ] Navigate to Guardian Portal
- [ ] Test guardian login
- [ ] Verify access to dependents

### 13.2 Guardian Dashboard
- [ ] Verify dashboard displays:
  - [ ] Dependents list
  - [ ] Upcoming appointments
  - [ ] Pending forms
  - [ ] Messages
- [ ] Test dashboard navigation

### 13.3 Dependent Management
- [ ] View dependents list
- [ ] Select dependent
- [ ] View dependent information:
  - [ ] Appointments
  - [ ] Forms
  - [ ] Documents
  - [ ] Billing
- [ ] Test requesting access (if not already granted)

### 13.4 Guardian Forms
- [ ] View pending forms for dependents
- [ ] Test completing forms on behalf of dependent
- [ ] Test form signing
- [ ] Verify forms submitted

### 13.5 Guardian Appointments
- [ ] View dependent appointments
- [ ] Test scheduling appointment for dependent
- [ ] Test rescheduling appointment
- [ ] Test cancelling appointment

### 13.6 Guardian Verification (Admin)
- [ ] Navigate to Admin > Guardian Verification
- [ ] View pending verification requests
- [ ] Test verification workflow:
  - [ ] Review request
  - [ ] Verify documentation
  - [ ] Approve/deny request
- [ ] Test verification history

---

## 14. COMMUNICATION & MESSAGING

### 14.1 Messaging Hub
- [ ] Navigate to Communication > Messaging Hub
- [ ] Verify messaging interface loads
- [ ] View message list
- [ ] Test message search
- [ ] Test message filtering

### 14.2 Direct Messages
- [ ] Click "New Message" or "Compose"
- [ ] Select colleague as recipient
- [ ] Enter subject: "Test Message - QA"
- [ ] Enter body: "This is a test message for QA purposes."
- [ ] Attach file (if available)
- [ ] Click Send
- [ ] Verify message appears in Sent folder
- [ ] Ask colleague to confirm receipt

### 14.3 Channels
- [ ] Navigate to Channels list
- [ ] View available channels
- [ ] Join an existing channel (or create new)
- [ ] Post a message in the channel
- [ ] Verify message appears
- [ ] React to a message (if emoji reactions available)
- [ ] Reply to a thread (if threading available)
- [ ] Test channel notifications

### 14.4 Message Features
- [ ] Test message search
- [ ] Test message filtering:
  - [ ] By sender
  - [ ] By date
  - [ ] By keywords
- [ ] Test marking as read/unread
- [ ] Test archiving messages
- [ ] Test deleting messages
- [ ] Test message attachments
- [ ] Test message forwarding

### 14.5 Client Messaging (Secure Portal Messages)
- [ ] Navigate to John Doe's profile
- [ ] Go to Messages/Communication tab
- [ ] Click "New Message to Client"
- [ ] Enter subject: "Appointment Reminder"
- [ ] Enter message body with appointment details
- [ ] Click Send
- [ ] Verify message logged in client record
- [ ] View Client Messages:
  - [ ] Check for any incoming client messages
  - [ ] Reply to client message (if any exist)
  - [ ] Mark messages as read

### 14.6 Document Library
- [ ] Navigate to Communication > Document Library
- [ ] View document folders
- [ ] Test folder navigation
- [ ] Test uploading document:
  - [ ] Select folder
  - [ ] Upload file
  - [ ] Add metadata/tags
  - [ ] Save document
- [ ] Test downloading document
- [ ] Test document search
- [ ] Test document sharing

---

## 15. SUPERVISION

### 15.1 Supervision Dashboard
- [ ] Navigate to Supervision
- [ ] View supervision dashboard
- [ ] Verify supervisees list displays
- [ ] Review supervisee activity

### 15.2 Review Notes
- [ ] View supervisee's unsigned notes
- [ ] Click on note to review
- [ ] Review note content
- [ ] Test providing feedback
- [ ] Test co-signing notes
- [ ] Verify co-signature recorded

### 15.3 Supervision Sessions
- [ ] Navigate to Supervision Sessions
- [ ] View session list
- [ ] Log Supervision:
  - [ ] Create supervision note
  - [ ] Document:
    - [ ] Supervision date
    - [ ] Duration
    - [ ] Topics discussed
    - [ ] Cases reviewed
    - [ ] Feedback provided
    - [ ] Goals set
  - [ ] Sign supervision note
- [ ] Test editing supervision session
- [ ] Test session history

### 15.4 Track Hours
- [ ] Navigate to Supervision Hours
- [ ] Review supervision hours logged
- [ ] Test logging hours:
  - [ ] Select supervisee
  - [ ] Enter hours
  - [ ] Enter date
  - [ ] Add notes
  - [ ] Save hours
- [ ] Verify toward licensure requirements
- [ ] Test hours reporting

### 15.5 Supervision Reports
- [ ] Test generating supervision reports:
  - [ ] Hours by supervisee
  - [ ] Hours by date range
  - [ ] Compliance reports
- [ ] Test report export

---

## 16. PRODUCTIVITY DASHBOARDS

### 16.1 Clinician Productivity Dashboard
- [ ] Navigate to Productivity (as clinician)
- [ ] Verify clinician dashboard displays:
  - [ ] Sessions completed
  - [ ] Hours billed
  - [ ] Revenue generated
  - [ ] Unsigned notes
  - [ ] No-show rate
- [ ] Test date range filtering
- [ ] Test metric comparisons

### 16.2 Supervisor Productivity Dashboard
- [ ] Navigate to Productivity (as supervisor)
- [ ] Verify supervisor dashboard displays:
  - [ ] Team productivity
  - [ ] Supervisee metrics
  - [ ] Co-signature queue
- [ ] Test filtering by supervisee
- [ ] Test team comparisons

### 16.3 Administrator Productivity Dashboard
- [ ] Navigate to Productivity (as admin)
- [ ] Verify administrator dashboard displays:
  - [ ] Practice-wide metrics
  - [ ] Provider comparisons
  - [ ] Revenue trends
  - [ ] Utilization rates
- [ ] Test filtering options
- [ ] Test export functionality

### 16.4 Productivity Reports
- [ ] Test generating productivity reports
- [ ] Test report customization
- [ ] Test report scheduling

---

## 17. PROGRESS TRACKING

### 17.1 Progress Tracking Dashboard
- [ ] Navigate to Progress Tracking
- [ ] Verify dashboard displays:
  - [ ] Client progress overview
  - [ ] Outcome measures
  - [ ] Progress trends
- [ ] Test filtering by client
- [ ] Test filtering by measure

### 17.2 Assign Outcome Measures
- [ ] Navigate to Assign Measures
- [ ] Select client: John Doe
- [ ] Test assigning measure:
  - [ ] Select measure type (PHQ-9, GAD-7, etc.)
  - [ ] Set frequency
  - [ ] Set start date
  - [ ] Save assignment
- [ ] Verify assignment appears

### 17.3 Progress Reports
- [ ] Navigate to Progress Reports
- [ ] Select client
- [ ] Generate progress report:
  - [ ] Select date range
  - [ ] Select measures
  - [ ] Generate report
- [ ] Review progress charts
- [ ] Test report export

### 17.4 Client Progress View
- [ ] Navigate to Clinician > Client Progress
- [ ] View client progress dashboard
- [ ] Test measure tracking
- [ ] Test progress visualization

---

## 18. GROUP THERAPY

### 18.1 Group Sessions
- [ ] Navigate to Group Sessions
- [ ] View group list
- [ ] Test creating new group:
  - [ ] Enter group name
  - [ ] Select group type
  - [ ] Set schedule
  - [ ] Add members
  - [ ] Save group
- [ ] Test editing group
- [ ] Test group details view

### 18.2 Group Session Management
- [ ] Select group
- [ ] View session history
- [ ] Test creating session:
  - [ ] Select date/time
  - [ ] Mark attendance
  - [ ] Add session notes
  - [ ] Save session
- [ ] Test session notes (see Clinical Documentation section)

### 18.3 Group Member Management
- [ ] Test adding member to group
- [ ] Test removing member from group
- [ ] Test member attendance tracking
- [ ] Test member progress tracking

---

## 19. SELF-SCHEDULING

### 19.1 Self-Scheduling Dashboard
- [ ] Navigate to Self-Schedule
- [ ] Verify dashboard displays
- [ ] View self-scheduling configuration
- [ ] Test availability settings

### 19.2 Self-Scheduling Rules
- [ ] Navigate to Admin > Scheduling Rules
- [ ] View scheduling rules
- [ ] Test creating rule:
  - [ ] Set rule type
  - [ ] Configure parameters
  - [ ] Set effective dates
  - [ ] Save rule
- [ ] Test rule priority
- [ ] Test rule conflicts

### 19.3 Client Self-Scheduling (Portal)
- [ ] Test client self-scheduling from portal (see Client Portal section)
- [ ] Verify rules enforced
- [ ] Verify notifications sent

---

## 20. AI FEATURES

### 20.1 AI Scheduling Assistant
- [ ] Navigate to Appointments > AI Scheduling Assistant
- [ ] Test natural language scheduling:
  - [ ] Ask: "Find available slots for John Doe next week"
  - [ ] Verify AI suggests appointments
  - [ ] Test conflict detection
  - [ ] Test optimization suggestions
- [ ] Test AI recommendations

### 20.2 AI Note Generation
- [ ] Test AI note generation (see Clinical Documentation section)
- [ ] Test transcription integration
- [ ] Test clinical suggestions

### 20.3 AI Predictions
- [ ] Navigate to AI Predictions
- [ ] Review prediction models:
  - [ ] No-show predictions
  - [ ] Revenue forecasts
  - [ ] Capacity planning
- [ ] Test prediction accuracy
- [ ] Review prediction insights

### 20.4 AI Personal Assistant
- [ ] Navigate to AI Assistant (if available)
- [ ] Test chat functionality:
  - [ ] Ask clinical questions
  - [ ] Request information
  - [ ] Test conversation history
- [ ] Test AI report generation

---

## 21. ADMIN TOOLS

### 21.1 Admin Dashboard
- [ ] Navigate to Admin Tools
- [ ] Verify admin dashboard displays:
  - [ ] System overview
  - [ ] Key metrics
  - [ ] Recent activity
- [ ] Test admin widgets

### 21.2 Crisis Detections
- [ ] Navigate to Admin > Crisis Detections
- [ ] View crisis detection list
- [ ] Test filtering by:
  - [ ] Date range
  - [ ] Severity
  - [ ] Status
- [ ] Test reviewing detection:
  - [ ] View details
  - [ ] Review risk assessment
  - [ ] Update status
  - [ ] Add notes
- [ ] Test crisis response workflow

### 21.3 Session Ratings
- [ ] Navigate to Admin > Session Ratings
- [ ] View session ratings
- [ ] Test filtering options
- [ ] Test rating analytics
- [ ] Test rating reports

### 21.4 Waitlist Management
- [ ] Navigate to Admin > Waitlist Management
- [ ] View waitlist overview
- [ ] Test waitlist analytics
- [ ] Test waitlist matching
- [ ] Test waitlist reports

### 21.5 Scheduling Rules
- [ ] Navigate to Admin > Scheduling Rules
- [ ] View scheduling rules
- [ ] Test rule management (see Self-Scheduling section)

### 21.6 AdvancedMD Integration
- [ ] Navigate to Admin > AdvancedMD Settings
- [ ] Verify AdvancedMD connection
- [ ] Test AdvancedMD Sync (see Billing section)
- [ ] Test AdvancedMD configuration

### 21.7 Audit Log Viewer
- [ ] Navigate to Audit Log Viewer
- [ ] View audit logs
- [ ] Test filtering by:
  - [ ] User
  - [ ] Action type
  - [ ] Date range
  - [ ] Entity type
- [ ] Test log export
- [ ] Test log search

### 21.8 Guardian Verification
- [ ] Navigate to Admin > Guardian Verification
- [ ] Test guardian verification (see Guardian Portal section)

---

## 22. SETTINGS & CONFIGURATION

### 22.1 Practice Settings
- [ ] Navigate to Settings
- [ ] View practice settings
- [ ] Test updating settings:
  - [ ] Practice information
  - [ ] Contact information
  - [ ] Business hours
  - [ ] Time zone
  - [ ] Save changes
- [ ] Verify changes applied

### 22.2 Reminder Settings
- [ ] Navigate to Settings > Reminder Settings
- [ ] View reminder configuration
- [ ] Test configuring reminders:
  - [ ] Appointment reminders
  - [ ] Form reminders
  - [ ] Note reminders
  - [ ] Save settings
- [ ] Test reminder templates

### 22.3 Clinical Note Reminder Settings
- [ ] Navigate to Settings > Clinical Note Reminders
- [ ] Configure note reminder rules:
  - [ ] Set reminder timing
  - [ ] Set reminder frequency
  - [ ] Set reminder recipients
  - [ ] Save settings
- [ ] Test reminder triggers

### 22.4 Appointment Types
- [ ] Navigate to Settings > Appointment Types
- [ ] Test appointment type management (see Scheduling section)

### 22.5 Provider Availability
- [ ] Navigate to Settings > Provider Availability
- [ ] Test availability management (see Scheduling section)

### 22.6 MFA Management
- [ ] Navigate to Settings > MFA Management
- [ ] View MFA settings
- [ ] Test MFA configuration
- [ ] Test MFA enforcement

### 22.7 Session Management
- [ ] Navigate to Settings > Session Management
- [ ] View session settings:
  - [ ] Session timeout
  - [ ] Maximum session duration
  - [ ] Session warning time
- [ ] Test updating settings
- [ ] Verify settings applied

### 22.8 User Preferences
- [ ] Navigate to User Profile
- [ ] Test updating preferences:
  - [ ] Notification preferences
  - [ ] Display preferences
  - [ ] Language preferences
- [ ] Save preferences
- [ ] Verify preferences applied

---

## 23. VENDOR & FINANCE

### 23.1 Vendor Management
- [ ] Navigate to Vendors & Finance > Vendor Management
- [ ] View vendor list
- [ ] Test creating vendor:
  - [ ] Enter vendor information
  - [ ] Add contact details
  - [ ] Add payment terms
  - [ ] Save vendor
- [ ] Test editing vendor
- [ ] Test vendor profile

### 23.2 Budget Dashboard
- [ ] Navigate to Finance > Budget Dashboard
- [ ] View budget overview
- [ ] Test budget allocation
- [ ] Test budget tracking
- [ ] Test budget reports

### 23.3 Expense Management
- [ ] Navigate to Finance > Expense Management
- [ ] View expense list
- [ ] Test creating expense:
  - [ ] Enter expense details
  - [ ] Attach receipt
  - [ ] Select category
  - [ ] Submit expense
- [ ] Test expense approval workflow
- [ ] Test expense reports

### 23.4 Purchase Orders
- [ ] Navigate to Finance > Purchase Orders
- [ ] View PO list
- [ ] Test creating PO:
  - [ ] Select vendor
  - [ ] Add line items
  - [ ] Set approval workflow
  - [ ] Submit PO
- [ ] Test PO approval
- [ ] Test PO tracking

---

## 24. ERROR HANDLING & EDGE CASES

### 24.1 Form Validation
- [ ] Required Fields:
  - [ ] Try to save note without required fields
  - [ ] Verify appropriate error messages
  - [ ] Verify form doesn't submit
- [ ] Data Validation:
  - [ ] Enter invalid date format
  - [ ] Enter invalid phone number
  - [ ] Enter invalid email
  - [ ] Enter invalid MRN
  - [ ] Verify validation messages
- [ ] Field Length Limits:
  - [ ] Test maximum character limits
  - [ ] Test minimum character requirements

### 24.2 Concurrent Access
- [ ] Simultaneous Editing:
  - [ ] Open same record in two tabs
  - [ ] Edit in both tabs
  - [ ] Save in first tab
  - [ ] Try to save in second tab
  - [ ] Verify conflict handling
  - [ ] Verify appropriate error message
- [ ] Data Consistency:
  - [ ] Verify data updates reflect across tabs
  - [ ] Verify real-time updates (if applicable)

### 24.3 Session Timeout
- [ ] Test Timeout:
  - [ ] Stay idle for extended period
  - [ ] Verify session timeout warning appears at 13 minutes
  - [ ] Test session extension option
  - [ ] Test redirect to login after 15 minutes
- [ ] Session Recovery:
  - [ ] Test unsaved work warning
  - [ ] Test session restoration

### 24.4 Network Errors
- [ ] Network Disconnection:
  - [ ] Disable network briefly
  - [ ] Try to save data
  - [ ] Verify error handling
  - [ ] Verify user-friendly error message
  - [ ] Re-enable network
  - [ ] Verify recovery/retry functionality
- [ ] Slow Network:
  - [ ] Test with throttled network
  - [ ] Verify loading indicators
  - [ ] Verify timeout handling

### 24.5 API Errors
- [ ] Monitor Console:
  - [ ] Monitor console for 500 errors
  - [ ] Monitor console for 400 errors
  - [ ] Monitor console for 401/403 errors
  - [ ] Document any encountered
- [ ] Error Messages:
  - [ ] Verify user-friendly error messages
  - [ ] Verify error details logged (not exposed to user)
- [ ] Error Recovery:
  - [ ] Test retry functionality
  - [ ] Test error reporting

### 24.6 Data Edge Cases
- [ ] Empty Data:
  - [ ] Test with no clients
  - [ ] Test with no appointments
  - [ ] Test with no notes
  - [ ] Verify appropriate empty states
- [ ] Large Data:
  - [ ] Test with large number of records
  - [ ] Test pagination
  - [ ] Test performance
- [ ] Special Characters:
  - [ ] Test with special characters in names
  - [ ] Test with unicode characters
  - [ ] Test with SQL injection attempts
  - [ ] Test with XSS attempts

### 24.7 Browser Compatibility
- [ ] Test in Chrome (latest)
- [ ] Test in Firefox (latest)
- [ ] Test in Safari (latest)
- [ ] Test in Edge (latest)
- [ ] Verify all features work in all browsers
- [ ] Document any browser-specific issues

---

## 25. PERFORMANCE & USABILITY

### 25.1 Page Load Times
- [ ] Measure Performance:
  - [ ] Dashboard load time: ___ seconds (target: < 2s)
  - [ ] Client profile load time: ___ seconds (target: < 2s)
  - [ ] Calendar load time: ___ seconds (target: < 3s)
  - [ ] Report generation time: ___ seconds (target: < 5s)
  - [ ] Note save time: ___ seconds (target: < 1s)
  - [ ] Search response time: ___ seconds (target: < 1s)
- [ ] Performance Monitoring:
  - [ ] Use browser DevTools Performance tab
  - [ ] Identify performance bottlenecks
  - [ ] Document findings

### 25.2 Mobile Responsiveness
- [ ] Test Mobile Views:
  - [ ] Open on mobile device or resize browser to mobile size
  - [ ] Verify navigation works
  - [ ] Verify forms are usable
  - [ ] Verify calendar is accessible
  - [ ] Verify tables are scrollable
  - [ ] Verify modals work correctly
- [ ] Touch Interactions:
  - [ ] Test touch gestures
  - [ ] Test swipe actions
  - [ ] Test mobile menu

### 25.3 Accessibility
- [ ] Basic Accessibility:
  - [ ] Tab navigation works
  - [ ] Forms have proper labels
  - [ ] Images have alt text
  - [ ] Color contrast is adequate (WCAG AA)
  - [ ] Focus indicators visible
- [ ] Screen Reader:
  - [ ] Test with screen reader (if available)
  - [ ] Verify content is readable
- [ ] Keyboard Navigation:
  - [ ] Test all features with keyboard only
  - [ ] Verify keyboard shortcuts work

### 25.4 Usability
- [ ] User Flow:
  - [ ] Test common user workflows
  - [ ] Verify intuitive navigation
  - [ ] Verify clear call-to-actions
- [ ] Error Messages:
  - [ ] Verify error messages are clear
  - [ ] Verify error messages are actionable
- [ ] Help & Documentation:
  - [ ] Test help tooltips
  - [ ] Test documentation links
  - [ ] Test onboarding flow

---

## 26. SECURITY & COMPLIANCE

### 26.1 Authentication Security
- [ ] Password Policy:
  - [ ] Try weak password - verify rejection
  - [ ] Verify password requirements displayed
  - [ ] Test password complexity requirements
- [ ] Session Security:
  - [ ] Verify secure cookies (check in DevTools)
  - [ ] Verify HTTPS everywhere
  - [ ] Verify httpOnly cookies
  - [ ] Verify SameSite cookie attributes
- [ ] MFA Security:
  - [ ] Verify MFA enforcement
  - [ ] Test MFA bypass attempts
  - [ ] Verify MFA recovery process

### 26.2 Authorization
- [ ] Role-Based Access:
  - [ ] Verify only authorized features visible
  - [ ] Try accessing unauthorized URL directly
  - [ ] Verify appropriate denial
  - [ ] Test all user roles
- [ ] Client Data Access:
  - [ ] Verify can only see assigned clients
  - [ ] Verify proper data isolation
  - [ ] Test cross-user data access attempts
- [ ] API Authorization:
  - [ ] Test API endpoints with invalid tokens
  - [ ] Test API endpoints with expired sessions
  - [ ] Verify proper error responses

### 26.3 Data Protection
- [ ] PHI Encryption:
  - [ ] Verify PHI encrypted at rest
  - [ ] Verify PHI encrypted in transit
  - [ ] Test PHI encryption middleware
- [ ] Data Masking:
  - [ ] Verify sensitive data masked in logs
  - [ ] Verify sensitive data masked in UI (if applicable)
- [ ] Data Backup:
  - [ ] Verify backup procedures documented
  - [ ] Test data recovery (if possible)

### 26.4 Audit Trail
- [ ] Review Audit Log:
  - [ ] Navigate to Audit Log (if accessible)
  - [ ] Verify actions are logged
  - [ ] Verify PHI access is logged
  - [ ] Verify login/logout logged
  - [ ] Verify data modifications logged
- [ ] Audit Log Integrity:
  - [ ] Verify audit logs cannot be modified
  - [ ] Verify audit log retention

### 26.5 HIPAA Compliance
- [ ] Technical Safeguards:
  - [ ] Verify encryption at rest
  - [ ] Verify encryption in transit
  - [ ] Verify access controls
  - [ ] Verify audit controls
- [ ] Administrative Safeguards:
  - [ ] Verify user access management
  - [ ] Verify training requirements
  - [ ] Verify incident response procedures
- [ ] Physical Safeguards:
  - [ ] Verify cloud infrastructure security
  - [ ] Verify data center security

---

## 27. API ENDPOINT TESTING

### 27.1 Authentication Endpoints
- [ ] POST /api/v1/auth/login
  - [ ] Test successful login
  - [ ] Test invalid credentials
  - [ ] Test missing fields
- [ ] POST /api/v1/auth/logout
  - [ ] Test logout
  - [ ] Verify session cleared
- [ ] POST /api/v1/auth/register
  - [ ] Test user registration
  - [ ] Test validation
- [ ] GET /api/v1/auth/me
  - [ ] Test current user info
  - [ ] Test unauthorized access

### 27.2 Client Endpoints
- [ ] GET /api/v1/clients
  - [ ] Test client list retrieval
  - [ ] Test pagination
  - [ ] Test filtering
  - [ ] Test sorting
- [ ] GET /api/v1/clients/:id
  - [ ] Test client detail retrieval
  - [ ] Test unauthorized access
- [ ] POST /api/v1/clients
  - [ ] Test client creation
  - [ ] Test validation
- [ ] PUT /api/v1/clients/:id
  - [ ] Test client update
  - [ ] Test validation
- [ ] DELETE /api/v1/clients/:id
  - [ ] Test client deletion (if allowed)
  - [ ] Test soft delete

### 27.3 Appointment Endpoints
- [ ] GET /api/v1/appointments
  - [ ] Test appointment list retrieval
  - [ ] Test date filtering
  - [ ] Test provider filtering
- [ ] POST /api/v1/appointments
  - [ ] Test appointment creation
  - [ ] Test validation
  - [ ] Test conflict detection
- [ ] PUT /api/v1/appointments/:id
  - [ ] Test appointment update
  - [ ] Test status changes
- [ ] DELETE /api/v1/appointments/:id
  - [ ] Test appointment cancellation
  - [ ] Test deletion

### 27.4 Clinical Note Endpoints
- [ ] GET /api/v1/clinical-notes
  - [ ] Test note list retrieval
  - [ ] Test filtering
  - [ ] Test pagination
- [ ] GET /api/v1/clinical-notes/:id
  - [ ] Test note detail retrieval
  - [ ] Test access control
- [ ] POST /api/v1/clinical-notes
  - [ ] Test note creation
  - [ ] Test validation
- [ ] PUT /api/v1/clinical-notes/:id
  - [ ] Test note update
  - [ ] Test signed note protection
- [ ] POST /api/v1/clinical-notes/:id/sign
  - [ ] Test note signing
  - [ ] Test signature validation

### 27.5 Billing Endpoints
- [ ] GET /api/v1/billing/charges
  - [ ] Test charge list retrieval
  - [ ] Test filtering
- [ ] POST /api/v1/billing/charges
  - [ ] Test charge creation
  - [ ] Test validation
- [ ] GET /api/v1/billing/claims
  - [ ] Test claim list retrieval
- [ ] POST /api/v1/billing/claims
  - [ ] Test claim creation
  - [ ] Test validation
- [ ] POST /api/v1/billing/payments
  - [ ] Test payment posting
  - [ ] Test validation

### 27.6 Telehealth Endpoints
- [ ] POST /api/v1/telehealth/sessions
  - [ ] Test session creation
  - [ ] Test token generation
- [ ] GET /api/v1/telehealth/sessions/:id
  - [ ] Test session retrieval
- [ ] POST /api/v1/telehealth/sessions/:id/end
  - [ ] Test session ending
  - [ ] Test recording save

### 27.7 Error Handling
- [ ] Test 400 Bad Request responses
- [ ] Test 401 Unauthorized responses
- [ ] Test 403 Forbidden responses
- [ ] Test 404 Not Found responses
- [ ] Test 500 Internal Server Error handling
- [ ] Verify error response format
- [ ] Verify error messages don't expose sensitive info

---

## TEST COMPLETION CHECKLIST

### Summary
- [ ] Total features tested: ___
- [ ] Features passing: ___
- [ ] Features failing: ___
- [ ] Bugs found: ___
- [ ] Critical bugs: ___
- [ ] Medium bugs: ___
- [ ] Minor bugs: ___

### Critical Issues Found
List any critical issues (blocking production):
1. 
2. 
3. 

### Medium Issues Found
List medium priority issues:
1. 
2. 
3. 

### Minor Issues Found
List minor issues:
1. 
2. 
3. 

### Recommendations
List improvement recommendations:
1. 
2. 
3. 

### Performance Metrics
- [ ] Average page load time: ___ seconds
- [ ] Average API response time: ___ milliseconds
- [ ] Largest page size: ___ KB
- [ ] Total API calls tested: ___

### Security Findings
- [ ] Authentication vulnerabilities: ___
- [ ] Authorization vulnerabilities: ___
- [ ] Data protection issues: ___
- [ ] Compliance gaps: ___

### Sign-Off
- [ ] Tester Name: _______________
- [ ] Date: _______________
- [ ] Test Environment: Production / Staging
- [ ] Overall Status: PASS / FAIL / CONDITIONAL PASS
- [ ] Ready for Production: YES / NO

---

## APPENDIX A: TEST DATA

### Test Client: John Doe
- MRN: [Lookup in system]
- DOB: [Lookup in system]
- Insurance: [Lookup in system]
- Primary Clinician: [Lookup in system]

### Test Staff: ejoseph@chctherapy.com
- Role: [Lookup in system]
- Permissions: [Lookup in system]

### CPT Codes for Testing
- 90791 - Psychiatric Diagnostic Evaluation
- 90832 - Individual Psychotherapy, 30 min
- 90834 - Individual Psychotherapy, 45 min
- 90837 - Individual Psychotherapy, 60 min
- 90846 - Family Psychotherapy (without patient)
- 90847 - Family Psychotherapy (with patient)
- 90853 - Group Psychotherapy
- 99213 - Office Visit, Level 3
- 99214 - Office Visit, Level 4

### ICD-10 Codes for Testing
- F32.1 - Major Depressive Disorder, single episode, moderate
- F33.1 - Major Depressive Disorder, recurrent, moderate
- F41.1 - Generalized Anxiety Disorder
- F43.10 - Post-Traumatic Stress Disorder, unspecified
- F90.0 - ADHD, predominantly inattentive type

---

## APPENDIX B: EXPECTED BEHAVIORS

### Note Signing
- Notes should lock after signing
- Amendments should be available post-signing
- Co-signatures should be trackable
- Signature timestamps should be accurate

### Appointment States
- Scheduled → Checked In → In Progress → Completed
- Cancellation should prompt for reason
- No-show should be marked after appointment time
- Status changes should be logged

### Billing Flow
- Charges created from completed appointments
- Claims generated from charges
- Payments applied to charges/claims
- Account balance updates automatically

### Session Management
- Session timeout warning at 13 minutes
- Automatic logout at 15 minutes
- Session extension available
- Unsaved work warning

### Data Access
- Users only see assigned clients
- Role-based feature access
- Proper data isolation
- Audit trail for all access

---

## APPENDIX C: TESTING TOOLS

### Browser DevTools
- Console (F12) - Error monitoring
- Network tab - API call monitoring
- Performance tab - Performance analysis
- Application tab - Storage inspection

### Testing Tools
- Postman/Insomnia - API testing
- BrowserStack - Cross-browser testing
- Lighthouse - Performance auditing
- WAVE - Accessibility testing

---

**END OF COMPREHENSIVE TEST PLAN**

**Version:** 2.0  
**Last Updated:** January 2026  
**Total Test Cases:** 500+  
**Estimated Testing Time:** 40-60 hours
