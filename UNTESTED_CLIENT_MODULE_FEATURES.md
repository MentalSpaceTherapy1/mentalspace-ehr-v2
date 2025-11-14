# Untested Client Module Features

**Generated**: Based on comprehensive test review  
**Status**: Items that have NOT been tested or are BLOCKED

---

## 🚨 CRITICAL MISSING TESTS

### 1. **Outcome Measures Page** (`/clients/:clientId/outcome-measures`) ❌ **NOT TESTED**
   - **Route**: `/clients/:clientId/outcome-measures`
   - **Status**: **COMPLETELY UNTESTED**
   - **Missing Tests**:
     - [ ] Page load and navigation
     - [ ] Outcome measures list display
     - [ ] Add outcome measure functionality
     - [ ] Edit outcome measure functionality
     - [ ] Charts/graphs display (if applicable)
     - [ ] Empty state when no measures
     - [ ] Client name/header display

### 2. **Create Client Form - Successful Submission** ❌ **BLOCKED**
   - **Status**: Form submission FAILS with 400 Bad Request
   - **Missing**: Cannot test successful client creation flow
   - **Impact**: Cannot verify:
     - [ ] Success message display
     - [ ] Redirect to client detail page after creation
     - [ ] New client appears in client list
     - [ ] Created client data persistence

### 3. **Edit/Delete Functionality** ❌ **BLOCKED** (All entities)
   - **Status**: Cannot test because Add functionality is broken
   - **Missing Tests**:
     - [ ] **Emergency Contacts**:
       - [ ] Edit existing contact
       - [ ] Delete existing contact
       - [ ] Edit form pre-population
       - [ ] Delete confirmation dialog
     - [ ] **Insurance Information**:
       - [ ] Edit existing insurance
       - [ ] Delete existing insurance
       - [ ] Edit form pre-population
       - [ ] Delete confirmation dialog
     - [ ] **Legal Guardians**:
       - [ ] Edit existing guardian
       - [ ] Delete existing guardian
       - [ ] Edit form pre-population
       - [ ] Delete confirmation dialog
     - [ ] **Client Diagnoses**:
       - [ ] Edit existing diagnosis
       - [ ] Delete existing diagnosis
       - [ ] Edit form pre-population
       - [ ] Delete confirmation dialog

---

## 📋 CLIENT LIST PAGE - INCOMPLETE TESTS

### Search Functionality (7 missing)
- [ ] Search by last name (only first name tested)
- [ ] Search by MRN (Medical Record Number)
- [ ] Search by email address
- [ ] Search with partial match (e.g., "Jan" finds "Jane")
- [ ] Search with no results (empty state)
- [ ] Clear search functionality (button/action)
- [ ] Search updates results in real-time (debouncing)

### Status Filter (3 missing)
- [ ] Filter by "Inactive" status
- [ ] Filter by "Discharged" status  
- [ ] Filter by "Deceased" status
- [ ] Filter resets pagination when changed
- [ ] Filter works with search (combined filter + search)

### Pagination (6 missing)
- [ ] Previous button disabled on first page
- [ ] Next button disabled on last page
- [ ] Page number displays correctly
- [ ] Click Previous navigates to previous page
- [ ] Click Next navigates to next page
- [ ] Pagination persists search/filter state

---

## 📝 CREATE CLIENT FORM - INCOMPLETE TESTS

### Form Field Testing (20 missing)
- [ ] First Name field validation (required, min length, etc.)
- [ ] Last Name field validation (required, min length, etc.)
- [ ] Email format validation (already tested HTML5, but need submission test)
- [ ] Phone format validation (already tested HTML5, but need submission test)
- [ ] Date of Birth validation (already tested HTML5, but need submission test)
- [ ] Age calculation displays automatically
- [ ] Address Autocomplete functionality (Google Maps integration)
- [ ] All dropdown fields functional (suffix, pronouns, phone type, etc.)
- [ ] All checkbox fields functional
- [ ] Conditional fields (interpreter language when needed)
- [ ] Suffix dropdown options (all options available)
- [ ] Pronouns dropdown options (all options available)
- [ ] Primary Phone Type dropdown (all options)
- [ ] Preferred Contact Method dropdown (all options)
- [ ] Gender dropdown options (all options)
- [ ] Gender Identity dropdown options (all options)
- [ ] Sexual Orientation dropdown options (all options)
- [ ] Religion dropdown options (all options)
- [ ] Marital Status dropdown options (all options)
- [ ] State dropdown (all 50 states available)

### Form Validation (5 missing)
- [ ] Required fields show error when empty on submit
- [ ] Email format validation error message
- [ ] Phone format validation error message
- [ ] Date of Birth validation error message
- [ ] Form prevents submission with validation errors

### Form Submission (3 missing - BLOCKED)
- [ ] Save button creates new client (with valid data) ❌ **BLOCKED** (400 error)
- [ ] Success message displays ❌ **BLOCKED**
- [ ] Redirects to client detail page after creation ❌ **BLOCKED**

### Therapist Dropdowns (5 missing)
- [ ] Primary Therapist dropdown populated (tested display, need to test selection)
- [ ] Secondary Therapist 1 dropdown populated
- [ ] Secondary Therapist 2 dropdown populated
- [ ] Psychiatrist dropdown populated
- [ ] Case Manager dropdown populated

---

## ✏️ EDIT CLIENT FORM - INCOMPLETE TESTS

### Form Editing (5 missing)
- [ ] Can edit first name (tested form load, need to test actual editing)
- [ ] Can edit last name
- [ ] Can edit all other fields (comprehensive field-by-field editing)
- [ ] Changes persist in form state (don't reset on blur)
- [ ] All fields editable (verify no read-only fields)

### Form Submission (3 missing)
- [ ] Save button updates client (tested form load, need to test submission)
- [ ] Success message displays
- [ ] Redirects to client detail page after update

### Data Pre-population Verification (4 missing)
- [ ] Verify all personal information fields populated correctly
- [ ] Verify all contact information fields populated correctly
- [ ] Verify all address fields populated correctly
- [ ] Verify all demographics/assignment/social fields populated correctly

---

## 🏥 CLIENT DIAGNOSES PAGE - INCOMPLETE TESTS

### Page Load (3 missing)
- [ ] Client name/header displays correctly
- [ ] Diagnoses list displays correctly (if diagnoses exist)
- [ ] Add diagnosis button visible and functional

### Diagnoses Display (5 missing)
- [ ] Each diagnosis shows: code, name, date, status, provider
- [ ] Empty state when no diagnoses
- [ ] Diagnoses sorted correctly (by date, status, etc.)
- [ ] Status badges display correctly
- [ ] Date formatting correct

### Add Diagnosis (4 missing - BLOCKED)
- [ ] Add button opens form/modal ❌ **BLOCKED** (form tested, but submission fails)
- [ ] Form fields available ✅ **TESTED**
- [ ] Can search/select diagnosis ✅ **TESTED**
- [ ] Can save new diagnosis ❌ **BLOCKED** (500 error)

### Edit/Delete Diagnosis (4 missing - BLOCKED)
- [ ] Edit button on each diagnosis ❌ **BLOCKED** (no records to edit)
- [ ] Delete button on each diagnosis ❌ **BLOCKED** (no records to delete)
- [ ] Edit functionality works ❌ **BLOCKED**
- [ ] Delete confirmation and functionality ❌ **BLOCKED**

---

## 🔍 CLIENT DETAIL PAGE - INCOMPLETE TESTS

### Demographics Tab - Field Display (5 missing)
- [ ] Verify all personal information fields display correctly
- [ ] Verify all contact information fields display correctly
- [ ] Verify all demographics fields display correctly
- [ ] Verify all assignment fields display correctly
- [ ] Verify all social information fields display correctly

### Appointments Tab (4 missing)
- [ ] Appointments list displays correctly (when appointments exist)
- [ ] Each appointment shows relevant info (date, time, provider, type)
- [ ] Create appointment button (if exists) functionality
- [ ] Empty state when no appointments ✅ **TESTED**

### Clinical Notes Tab (4 missing)
- [ ] Notes list displays correctly (when notes exist) ❌ **BLOCKED** (500 API error)
- [ ] Each note shows relevant info (date, type, provider, status)
- [ ] Create note button navigates correctly ✅ **TESTED**
- [ ] Empty state when no notes ✅ **TESTED**

### Portal Tab (3 missing)
- [ ] Portal status displays ✅ **TESTED**
- [ ] Portal settings visible ✅ **TESTED**
- [ ] Portal management functions ✅ **TESTED** (but API errors present)

### Assessments Tab (3 missing)
- [ ] Assessments list displays correctly (when assessments exist)
- [ ] Each assessment shows relevant info (type, date, score, status)
- [ ] Add/assign assessment functionality ✅ **TESTED** (initiated)

---

## 🧩 COMPONENT TESTING - MISSING

### Address Autocomplete Component (3 missing)
- [ ] Google Maps autocomplete works
- [ ] Address fields auto-populate from autocomplete
- [ ] Manual address entry works (when autocomplete not used)

---

## 📊 DUPLICATE DETECTION PAGE - INCOMPLETE TESTS

### Merge/Dismiss Functionality (2 missing - BLOCKED)
- [ ] Can merge duplicates ❌ **BLOCKED** (no duplicates in system)
- [ ] Can mark as not duplicates ❌ **BLOCKED** (no duplicates in system)
- [ ] Can review each duplicate pair ❌ **BLOCKED** (no duplicates in system)

**Note**: Basic page load and navigation ✅ **TESTED**, but core functionality cannot be tested without duplicate records.

---

## 🔄 STATUS CHANGE FUNCTIONALITY

### Client Activation (1 missing)
- [ ] Activate inactive client ❌ **MISSING FEATURE** (no UI button exists)
- [ ] Status change from INACTIVE to ACTIVE ❌ **MISSING FEATURE**

**Note**: Deactivation ✅ **TESTED**, but activation is missing.

---

## 📤 EXPORT FUNCTIONALITY

### Client List Export (1 missing)
- [ ] Export clients to CSV/Excel ❌ **NOT TESTED**
- [ ] Export filtered results ❌ **NOT TESTED**
- [ ] Export includes all columns ❌ **NOT TESTED**

---

## 🎯 SUMMARY

### By Priority:

**CRITICAL (Blocking Core Functionality):**
1. Create Client Form Submission (400 error)
2. Add Emergency Contact (500 error)
3. Add Insurance Information (400 error)
4. Add Legal Guardian (400 error)
5. Add Client Diagnosis (500 error)
6. Portal Forms API (500 error)

**HIGH PRIORITY (Major Features Untested):**
1. Outcome Measures Page (completely untested)
2. Edit/Delete functionality (all entities - blocked)
3. Client Diagnoses Page full functionality
4. Address Autocomplete

**MEDIUM PRIORITY (Detailed Testing):**
1. Client List search/filter/pagination details
2. Create Client Form field validations and dropdowns
3. Edit Client Form field editing and submission
4. Client Detail field display verification

**LOW PRIORITY (Edge Cases):**
1. Duplicate Detection merge/dismiss (requires test data)
2. Export functionality
3. Status change edge cases

---

## 📈 TEST COVERAGE ESTIMATE

**Total Client Module Features**: ~250+  
**Tested**: ~142  
**Untested/Blocked**: ~108+

**Coverage**: ~57% (excluding blocked tests)

**Note**: Many "tested" items are partial (UI tested but functionality blocked by API errors).

