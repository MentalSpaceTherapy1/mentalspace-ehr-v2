# Client Management Module - Comprehensive Test Plan

## Test Coverage: 100% of ALL Functions

### MODULE 1: CLIENT LIST PAGE (`/clients`)

#### 1.1 Page Load & Initial Display
- [ ] Page loads without errors
- [ ] Header displays correctly ("Client Management")
- [ ] "Add New Client" button visible and clickable
- [ ] Client table renders
- [ ] All columns display: MRN, Client Name, Demographics, Contact, Primary Therapist, Status, Actions
- [ ] Pagination controls visible (if applicable)
- [ ] Results summary displays ("Showing X of Y clients")

#### 1.2 Search Functionality
- [ ] Search box is visible and functional
- [ ] Search by client name (first name)
- [ ] Search by client name (last name)
- [ ] Search by MRN
- [ ] Search by email
- [ ] Search with partial match
- [ ] Search with no results
- [ ] Clear search functionality
- [ ] Search updates results in real-time

#### 1.3 Status Filter
- [ ] Status dropdown visible
- [ ] Filter by "All Status"
- [ ] Filter by "Active"
- [ ] Filter by "Inactive"
- [ ] Filter by "Discharged"
- [ ] Filter by "Deceased"
- [ ] Filter resets pagination
- [ ] Filter works with search

#### 1.4 Client Table Display
- [ ] Each client row displays:
  - [ ] MRN (formatted correctly)
  - [ ] Client name (with initials avatar)
  - [ ] Preferred name (if exists)
  - [ ] Demographics (gender icon, age, DOB)
  - [ ] Contact info (phone, email, location)
  - [ ] Primary therapist name and title
  - [ ] Status badge (correct color)
- [ ] Empty state displays when no clients
- [ ] Loading state displays during fetch

#### 1.5 Row Actions
- [ ] Click on row navigates to client detail
- [ ] Edit button visible on each row
- [ ] Edit button click navigates to edit page
- [ ] Edit button click stops row click event

#### 1.6 Pagination
- [ ] Previous button disabled on first page
- [ ] Next button disabled on last page
- [ ] Page number displays correctly
- [ ] Click Previous navigates to previous page
- [ ] Click Next navigates to next page
- [ ] Pagination persists search/filter state

#### 1.7 API Integration
- [ ] API call made to `/clients` endpoint
- [ ] Query parameters include page, limit, search, status
- [ ] Error handling displays error message
- [ ] Loading state during API call

---

### MODULE 2: CLIENT DETAIL PAGE (`/clients/:id`)

#### 2.1 Page Load & Header
- [ ] Page loads without errors
- [ ] "Back to Clients" button visible and functional
- [ ] Client header displays:
  - [ ] Client initials avatar
  - [ ] Full name (first, middle, last, suffix)
  - [ ] Preferred name (if exists)
  - [ ] MRN
  - [ ] Status badge
- [ ] Header styling correct

#### 2.2 Tab Navigation
- [ ] All tabs visible: Demographics, Appointments, Clinical Notes, Diagnoses, Portal, Assessments
- [ ] Click Demographics tab activates it
- [ ] Click Appointments tab activates it
- [ ] Click Clinical Notes tab activates it
- [ ] Click Diagnoses tab activates it
- [ ] Click Portal tab activates it
- [ ] Click Assessments tab activates it
- [ ] Active tab highlighted correctly
- [ ] Tab content switches correctly

#### 2.3 Demographics Tab
- [ ] Personal Information section displays:
  - [ ] First Name
  - [ ] Middle Name
  - [ ] Last Name
  - [ ] Suffix
  - [ ] Preferred Name
  - [ ] Pronouns
  - [ ] Date of Birth
  - [ ] Age (calculated)
- [ ] Contact Information section displays:
  - [ ] Primary Phone
  - [ ] Secondary Phone
  - [ ] Email
  - [ ] Preferred Contact Method
  - [ ] Address (full)
- [ ] Demographics section displays:
  - [ ] Gender
  - [ ] Gender Identity
  - [ ] Sexual Orientation
  - [ ] Religion
  - [ ] Marital Status
  - [ ] Race
  - [ ] Ethnicity
  - [ ] Primary Language
  - [ ] Other Languages
  - [ ] Interpreter needs
- [ ] Assignment section displays:
  - [ ] Primary Therapist
  - [ ] Secondary Therapists
  - [ ] Psychiatrist
  - [ ] Case Manager
- [ ] Social Information section displays:
  - [ ] Education
  - [ ] Employment Status
  - [ ] Occupation
  - [ ] Living Arrangement
  - [ ] Housing Status
- [ ] Emergency Contacts component displays
- [ ] Insurance Info component displays
- [ ] Guardians component displays
- [ ] Edit button visible and functional

#### 2.4 Appointments Tab
- [ ] AppointmentsTab component loads
- [ ] Appointments list displays
- [ ] Each appointment shows relevant info
- [ ] Create appointment button (if exists)

#### 2.5 Clinical Notes Tab
- [ ] ClinicalNotesList component loads
- [ ] Notes list displays
- [ ] Each note shows relevant info
- [ ] Create note button (if exists)

#### 2.6 Diagnoses Tab
- [ ] Diagnoses list displays
- [ ] Each diagnosis shows relevant info
- [ ] Add diagnosis button (if exists)
- [ ] Link to full diagnoses page works

#### 2.7 Portal Tab
- [ ] PortalTab component loads
- [ ] Portal status displays
- [ ] Portal settings visible

#### 2.8 Assessments Tab
- [ ] AssessmentTab component loads
- [ ] Assessments list displays
- [ ] Each assessment shows relevant info

#### 2.9 Actions
- [ ] Edit button navigates to edit page
- [ ] Deactivate button visible
- [ ] Deactivate confirmation dialog
- [ ] Deactivate functionality works

#### 2.10 API Integration
- [ ] API call made to `/clients/:id`
- [ ] Error handling for not found
- [ ] Loading state during fetch

---

### MODULE 3: CLIENT FORM - CREATE NEW (`/clients/new`)

#### 3.1 Page Load
- [ ] Page loads without errors
- [ ] Form displays all sections
- [ ] "Cancel" button visible
- [ ] "Save" button visible

#### 3.2 Personal Information Section
- [ ] First Name field (required)
- [ ] Middle Name field (optional)
- [ ] Last Name field (required)
- [ ] Suffix dropdown
- [ ] Preferred Name field
- [ ] Pronouns dropdown
- [ ] Date of Birth date picker
- [ ] Age calculation displays

#### 3.3 Contact Information Section
- [ ] Primary Phone field
- [ ] Primary Phone Type dropdown
- [ ] Secondary Phone field
- [ ] Secondary Phone Type dropdown
- [ ] Email field
- [ ] Preferred Contact Method dropdown
- [ ] "Okay to leave message" checkbox

#### 3.4 Address Section
- [ ] Address Autocomplete component
- [ ] Street Address 1 field
- [ ] Street Address 2 field
- [ ] City field
- [ ] State dropdown
- [ ] Zip Code field
- [ ] County field

#### 3.5 Demographics Section
- [ ] Gender dropdown
- [ ] Gender Identity dropdown
- [ ] Sexual Orientation dropdown
- [ ] Religion dropdown
- [ ] Marital Status dropdown
- [ ] Race checkboxes (multiple)
- [ ] Ethnicity field
- [ ] Primary Language dropdown
- [ ] Other Languages (multi-select)
- [ ] Needs Interpreter checkbox
- [ ] Interpreter Language field (conditional)

#### 3.6 Assignment Section
- [ ] Primary Therapist dropdown (populated with clinicians)
- [ ] Secondary Therapist 1 dropdown
- [ ] Secondary Therapist 2 dropdown
- [ ] Secondary Therapist 3 dropdown
- [ ] Psychiatrist dropdown
- [ ] Case Manager dropdown

#### 3.7 Social Information Section
- [ ] Education field
- [ ] Employment Status dropdown
- [ ] Occupation field
- [ ] Living Arrangement dropdown
- [ ] Housing Status dropdown

#### 3.8 Form Validation
- [ ] Required fields validated
- [ ] Email format validated
- [ ] Phone format validated
- [ ] Date of Birth validated
- [ ] Error messages display
- [ ] Form prevents submission with errors

#### 3.9 Form Submission
- [ ] Save button creates new client
- [ ] Success message displays
- [ ] Redirects to client detail page
- [ ] API call made to POST `/clients`
- [ ] Error handling displays error message

#### 3.10 Cancel Functionality
- [ ] Cancel button navigates back
- [ ] Unsaved changes warning (if implemented)

---

### MODULE 4: CLIENT FORM - EDIT EXISTING (`/clients/:id/edit`)

#### 4.1 Page Load
- [ ] Page loads without errors
- [ ] Form pre-populated with client data
- [ ] All fields display existing values
- [ ] "Cancel" button visible
- [ ] "Save" button visible

#### 4.2 Data Pre-population
- [ ] All personal information fields populated
- [ ] All contact information fields populated
- [ ] All address fields populated
- [ ] All demographics fields populated
- [ ] All assignment fields populated
- [ ] All social information fields populated

#### 4.3 Form Editing
- [ ] Can edit first name
- [ ] Can edit last name
- [ ] Can edit all other fields
- [ ] Changes persist in form state

#### 4.4 Form Submission
- [ ] Save button updates client
- [ ] Success message displays
- [ ] Redirects to client detail page
- [ ] API call made to PATCH `/clients/:id`
- [ ] Error handling displays error message

---

### MODULE 5: CLIENT DIAGNOSES PAGE (`/clients/:clientId/diagnoses`)

#### 5.1 Page Load
- [ ] Page loads without errors
- [ ] Client name/header displays
- [ ] Diagnoses list displays
- [ ] Add diagnosis button visible

#### 5.2 Diagnoses Display
- [ ] Each diagnosis shows:
  - [ ] Diagnosis code
  - [ ] Diagnosis name
  - [ ] Date diagnosed
  - [ ] Status
  - [ ] Provider
- [ ] Empty state when no diagnoses

#### 5.3 Add Diagnosis
- [ ] Add button opens form/modal
- [ ] Form fields available
- [ ] Can search/select diagnosis
- [ ] Can save new diagnosis
- [ ] List updates after save

#### 5.4 Edit/Delete Diagnosis
- [ ] Edit button on each diagnosis
- [ ] Delete button on each diagnosis
- [ ] Edit functionality works
- [ ] Delete confirmation
- [ ] Delete functionality works

---

### MODULE 6: OUTCOME MEASURES PAGE (`/clients/:clientId/outcome-measures`)

#### 6.1 Page Load
- [ ] Page loads without errors
- [ ] Client name/header displays
- [ ] Outcome measures list displays

#### 6.2 Outcome Measures Display
- [ ] Each measure shows relevant info
- [ ] Charts/graphs display (if applicable)
- [ ] Empty state when no measures

#### 6.3 Add/Edit Outcome Measure
- [ ] Add button visible
- [ ] Add functionality works
- [ ] Edit functionality works

---

### MODULE 7: DUPLICATE DETECTION PAGE (`/clients/duplicates`)

#### 7.1 Page Load
- [ ] Page loads without errors
- [ ] Header displays
- [ ] Duplicate detection interface visible

#### 7.2 Duplicate Detection
- [ ] Can run duplicate check
- [ ] Potential duplicates display
- [ ] Can review each duplicate pair
- [ ] Can merge duplicates
- [ ] Can mark as not duplicates

---

### MODULE 8: COMPONENT TESTING

#### 8.1 Emergency Contacts Component
- [ ] Displays in client detail
- [ ] Shows all emergency contacts
- [ ] Add contact button works
- [ ] Edit contact works
- [ ] Delete contact works

#### 8.2 Insurance Info Component
- [ ] Displays in client detail
- [ ] Shows insurance information
- [ ] Add insurance button works
- [ ] Edit insurance works
- [ ] Delete insurance works

#### 8.3 Guardians Component
- [ ] Displays in client detail
- [ ] Shows all guardians
- [ ] Add guardian button works
- [ ] Edit guardian works
- [ ] Delete guardian works

---

## Test Execution Order

1. Start with Client List - test all functions
2. Test Create New Client - complete form submission
3. Test Client Detail - all tabs and components
4. Test Edit Client - modify and save
5. Test Diagnoses page
6. Test Outcome Measures page
7. Test Duplicate Detection page
8. Test all components within detail page

## Success Criteria

- ✅ Every function tested
- ✅ Every button clicked
- ✅ Every form field tested
- ✅ Every API call verified
- ✅ Every error state tested
- ✅ Screenshots captured for each test
- ✅ All results documented

