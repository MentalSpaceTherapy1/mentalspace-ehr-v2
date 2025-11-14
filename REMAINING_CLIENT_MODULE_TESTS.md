# Remaining Client Module Tests

## ✅ COMPLETED TESTS (8)

1. ✅ Client List Page - Load
2. ✅ Client List Page - Search (basic)
3. ✅ Client List Page - Filter by Status (Active)
4. ✅ Client Detail Page - Load
5. ✅ Client Detail Page - All 6 Tabs (navigation)
6. ✅ Edit Client Form - Load & Data Population
7. ✅ Create Client Form - Load & Form Structure

---

## 📋 REMAINING TESTS (192+)

### MODULE 1: CLIENT LIST PAGE (`/clients`) - 15 Remaining

#### Search Functionality (7 remaining)
- [ ] Search by last name
- [ ] Search by MRN
- [ ] Search by email
- [ ] Search with partial match
- [ ] Search with no results
- [ ] Clear search functionality
- [ ] Search updates results in real-time

#### Status Filter (5 remaining)
- [ ] Filter by "Inactive"
- [ ] Filter by "Discharged"
- [ ] Filter by "Deceased"
- [ ] Filter resets pagination
- [ ] Filter works with search (combined)

#### Row Actions (2 remaining)
- [ ] Click on row navigates to client detail
- [ ] Edit button click stops row click event

#### Pagination (6 remaining)
- [ ] Previous button disabled on first page
- [ ] Next button disabled on last page
- [ ] Page number displays correctly
- [ ] Click Previous navigates to previous page
- [ ] Click Next navigates to next page
- [ ] Pagination persists search/filter state

---

### MODULE 2: CLIENT DETAIL PAGE (`/clients/:id`) - 45 Remaining

#### Demographics Tab - Component Details (15 remaining)
- [ ] Emergency Contacts component - Add contact
- [ ] Emergency Contacts component - Edit contact
- [ ] Emergency Contacts component - Delete contact
- [ ] Insurance Info component - Add insurance
- [ ] Insurance Info component - Edit insurance
- [ ] Insurance Info component - Delete insurance
- [ ] Guardians component - Add guardian
- [ ] Guardians component - Edit guardian
- [ ] Guardians component - Delete guardian
- [ ] Verify all personal information fields display correctly
- [ ] Verify all contact information fields display correctly
- [ ] Verify all demographics fields display correctly
- [ ] Verify all assignment fields display correctly
- [ ] Verify all social information fields display correctly
- [ ] Edit button navigates to edit page

#### Appointments Tab (4 remaining)
- [ ] Appointments list displays correctly
- [ ] Each appointment shows relevant info
- [ ] Create appointment button (if exists)
- [ ] Empty state when no appointments

#### Clinical Notes Tab (4 remaining)
- [ ] Notes list displays correctly
- [ ] Each note shows relevant info
- [ ] Create note button navigates correctly
- [ ] Empty state when no notes

#### Diagnoses Tab (4 remaining)
- [ ] Diagnoses list displays correctly
- [ ] Each diagnosis shows relevant info
- [ ] Add diagnosis button (if exists)
- [ ] Link to full diagnoses page works

#### Portal Tab (3 remaining)
- [ ] Portal status displays
- [ ] Portal settings visible
- [ ] Portal management functions

#### Assessments Tab (3 remaining)
- [ ] Assessments list displays correctly
- [ ] Each assessment shows relevant info
- [ ] Add/assign assessment functionality

#### Actions (4 remaining)
- [ ] Deactivate button visible
- [ ] Deactivate confirmation dialog
- [ ] Deactivate functionality works
- [ ] "New Clinical Note" button functionality

#### API Integration (2 remaining)
- [ ] Error handling for client not found
- [ ] Loading state during fetch

---

### MODULE 3: CLIENT FORM - CREATE NEW (`/clients/new`) - 35 Remaining

#### Form Field Testing (20 remaining)
- [ ] First Name field validation
- [ ] Last Name field validation
- [ ] Email format validation
- [ ] Phone format validation
- [ ] Date of Birth validation
- [ ] Age calculation displays
- [ ] Address Autocomplete functionality
- [ ] All dropdown fields functional
- [ ] All checkbox fields functional
- [ ] Conditional fields (interpreter language)
- [ ] Suffix dropdown options
- [ ] Pronouns dropdown options
- [ ] Primary Phone Type dropdown
- [ ] Preferred Contact Method dropdown
- [ ] Gender dropdown options
- [ ] Gender Identity dropdown options
- [ ] Sexual Orientation dropdown options
- [ ] Religion dropdown options
- [ ] Marital Status dropdown options
- [ ] State dropdown (all 50 states)

#### Form Validation (5 remaining)
- [ ] Required fields show error when empty
- [ ] Email format validation error
- [ ] Phone format validation error
- [ ] Date of Birth validation error
- [ ] Form prevents submission with errors

#### Form Submission (3 remaining)
- [ ] Save button creates new client (with valid data)
- [ ] Success message displays
- [ ] Redirects to client detail page after creation

#### Cancel Functionality (2 remaining)
- [ ] Cancel button navigates back
- [ ] Unsaved changes warning (if implemented)

#### Therapist Dropdowns (5 remaining)
- [ ] Primary Therapist dropdown populated
- [ ] Secondary Therapist 1 dropdown populated
- [ ] Secondary Therapist 2 dropdown populated
- [ ] Psychiatrist dropdown populated
- [ ] Case Manager dropdown populated

---

### MODULE 4: CLIENT FORM - EDIT EXISTING (`/clients/:id/edit`) - 12 Remaining

#### Form Editing (5 remaining)
- [ ] Can edit first name
- [ ] Can edit last name
- [ ] Can edit all other fields
- [ ] Changes persist in form state
- [ ] All fields editable

#### Form Submission (3 remaining)
- [ ] Save button updates client
- [ ] Success message displays
- [ ] Redirects to client detail page after update

#### Data Pre-population Verification (4 remaining)
- [ ] Verify all personal information fields populated
- [ ] Verify all contact information fields populated
- [ ] Verify all address fields populated
- [ ] Verify all demographics/assignment/social fields populated

---

### MODULE 5: CLIENT DIAGNOSES PAGE (`/clients/:clientId/diagnoses`) - 12 Remaining

#### Page Load (3 remaining)
- [ ] Client name/header displays
- [ ] Diagnoses list displays
- [ ] Add diagnosis button visible

#### Diagnoses Display (5 remaining)
- [ ] Each diagnosis shows: code, name, date, status, provider
- [ ] Empty state when no diagnoses
- [ ] Diagnoses sorted correctly
- [ ] Status badges display correctly
- [ ] Date formatting correct

#### Add Diagnosis (4 remaining)
- [ ] Add button opens form/modal
- [ ] Form fields available
- [ ] Can search/select diagnosis
- [ ] Can save new diagnosis

#### Edit/Delete Diagnosis (4 remaining)
- [ ] Edit button on each diagnosis
- [ ] Delete button on each diagnosis
- [ ] Edit functionality works
- [ ] Delete confirmation and functionality

---

### MODULE 6: OUTCOME MEASURES PAGE (`/clients/:clientId/outcome-measures`) - 8 Remaining

#### Page Load (3 remaining)
- [ ] Page loads without errors
- [ ] Client name/header displays
- [ ] Outcome measures list displays

#### Outcome Measures Display (3 remaining)
- [ ] Each measure shows relevant info
- [ ] Charts/graphs display (if applicable)
- [ ] Empty state when no measures

#### Add/Edit Outcome Measure (2 remaining)
- [ ] Add functionality works
- [ ] Edit functionality works

---

### MODULE 7: DUPLICATE DETECTION PAGE (`/clients/duplicates`) - 5 Remaining

#### Duplicate Detection (5 remaining)
- [ ] Can run duplicate check
- [ ] Potential duplicates display
- [ ] Can review each duplicate pair
- [ ] Can merge duplicates
- [ ] Can mark as not duplicates

---

### MODULE 8: COMPONENT TESTING - 18 Remaining

#### Emergency Contacts Component (5 remaining)
- [ ] Displays in client detail
- [ ] Shows all emergency contacts
- [ ] Add contact button works
- [ ] Edit contact works
- [ ] Delete contact works

#### Insurance Info Component (5 remaining)
- [ ] Displays in client detail
- [ ] Shows insurance information
- [ ] Add insurance button works
- [ ] Edit insurance works
- [ ] Delete insurance works

#### Guardians Component (5 remaining)
- [ ] Displays in client detail
- [ ] Shows all guardians
- [ ] Add guardian button works
- [ ] Edit guardian works
- [ ] Delete guardian works

#### Address Autocomplete Component (3 remaining)
- [ ] Google Maps autocomplete works
- [ ] Address fields auto-populate
- [ ] Manual address entry works

---

## SUMMARY

**Total Remaining Tests**: 192+
- Client List: 15
- Client Detail: 45
- Create Form: 35
- Edit Form: 12
- Diagnoses Page: 12
- Outcome Measures: 8
- Duplicate Detection: 5
- Components: 18
- Other/Edge Cases: ~42

**Priority Order**:
1. **High Priority**: Form submissions, navigation, critical actions
2. **Medium Priority**: All field validations, component interactions
3. **Low Priority**: Edge cases, error states, empty states

