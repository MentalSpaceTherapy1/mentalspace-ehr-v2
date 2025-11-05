# Phase 1 UI Testing Guide
**Purpose:** Manual testing of Phase 1.1, 1.2, and 1.6 features in production
**Environment:** Production (https://mentalspaceehr.com)
**Date Created:** 2025-10-23

---

## Prerequisites

### Test Accounts Needed
- [ ] **Administrator Account** (for Phase 1.3, 1.4 configuration)
- [ ] **Clinician Account** (for Phase 1.1, 1.4, 1.5, 1.6)
- [ ] **Client Account** (for Phase 1.2 portal testing)

### Test Data Needed
- [ ] At least one client with upcoming appointment
- [ ] At least one completed clinical note (for Phase 1.5 testing)
- [ ] At least one signed clinical note (for Phase 1.5 amendment testing)

---

## Phase 1.1: Appointment Enforcement System

### Feature Description
Clinical notes must be linked to appointments. Prevents creating notes without appointments, ensures proper clinical documentation workflow.

### Database Components
- Table: `appointment_clinical_notes`
- Junction table linking appointments to clinical notes

### Testing Steps

#### Test 1.1.1: Attempt to Create Note Without Appointment (Should FAIL)
1. **Login** as a clinician
2. **Navigate** to: Clinical Notes → Create New Note
3. **Select** a client who has NO upcoming or recent appointments
4. **Fill out** the note form with minimal data:
   - Note Type: Progress Note
   - Session Date: Today
   - Duration: 50 minutes
   - Any required fields
5. **Try to Submit** the note
6. **Expected Result:** ❌ **Should be BLOCKED** with error message:
   - "Clinical note must be associated with an appointment"
   - OR "Please select an appointment for this note"
   - OR similar validation error
7. **Actual Result:** _[User to document]_

#### Test 1.1.2: Create Note WITH Appointment (Should SUCCEED)
1. **Ensure** the client has an appointment (create one if needed)
2. **Navigate** to: Clinical Notes → Create New Note
3. **Select** the client with an appointment
4. **The system should:**
   - Show a dropdown or selector for appointments
   - OR automatically link to the appointment
5. **Select** the appointment
6. **Fill out** the note form
7. **Submit** the note
8. **Expected Result:** ✅ **Should SUCCEED**
   - Note created successfully
   - Note is linked to appointment in database
9. **Actual Result:** _[User to document]_

#### Test 1.1.3: Verify Note-Appointment Link in Database
```sql
-- Run this query to verify the link exists
SELECT
  cn.id as note_id,
  cn.noteType,
  cn.sessionDate,
  acn.appointmentId,
  a.appointmentDateTime,
  a.status as appointment_status
FROM clinical_notes cn
INNER JOIN appointment_clinical_notes acn ON cn.id = acn.noteId
INNER JOIN appointments a ON acn.appointmentId = a.id
WHERE cn.id = '[NOTE_ID_FROM_TEST_1.1.2]';
```
**Expected Result:** Should return one row showing the link

#### Test 1.1.4: Appointment-Note Relationship
1. **Navigate** to: Appointments → View Appointment Details
2. **Select** an appointment that has a linked note
3. **Verify** the note appears in the appointment details
4. **Expected Result:** Note should be visible/linked from appointment view

### Test Results Summary
| Test | Expected | Actual | Pass/Fail | Notes |
|------|----------|--------|-----------|-------|
| 1.1.1 | Block creation | | | |
| 1.1.2 | Allow creation | | | |
| 1.1.3 | DB link exists | | | |
| 1.1.4 | View from appt | | | |

---

## Phase 1.2: Client Portal Forms & Billing

### Feature Description
Enhanced client portal with intake forms, billing information, appointment requests, and improved user experience.

### Testing Steps

#### Test 1.2.1: Client Portal Login
1. **Navigate** to: Client portal login page
2. **Login** with client credentials
3. **Expected Result:** ✅ Successfully logged in
4. **Verify** dashboard loads correctly
5. **Actual Result:** _[User to document]_

#### Test 1.2.2: Intake Form Submission
1. **Navigate** to: Forms or Assessments section in portal
2. **Select** an intake form (e.g., Initial Intake Assessment)
3. **Fill out** the form completely:
   - Demographic information
   - Medical history
   - Insurance information
   - Emergency contacts
   - Consent forms
4. **Submit** the form
5. **Expected Result:** ✅
   - Form submitted successfully
   - Confirmation message displayed
   - Form data saved to database
6. **Verify** in admin portal:
   - Navigate to client's profile
   - Check that submitted form appears
   - Verify all data is present
7. **Actual Result:** _[User to document]_

#### Test 1.2.3: Billing Information View
1. **Navigate** to: Billing or Payments section
2. **Verify** can see:
   - Current balance
   - Recent charges
   - Payment history
   - Insurance information
3. **Expected Result:** ✅ All billing info displayed correctly
4. **Actual Result:** _[User to document]_

#### Test 1.2.4: Appointment Request
1. **Navigate** to: Appointments or Schedule section
2. **Click** "Request Appointment" or similar
3. **Select:**
   - Preferred date/time
   - Type of appointment
   - Reason for visit (optional)
4. **Submit** request
5. **Expected Result:** ✅
   - Request submitted
   - Confirmation message
   - Request appears in admin pending list
6. **Verify** in admin portal:
   - Navigate to appointment requests
   - Verify new request appears
7. **Actual Result:** _[User to document]_

#### Test 1.2.5: Document Upload/View
1. **Navigate** to: Documents section
2. **Try to:**
   - View existing documents
   - Upload a new document (if allowed)
   - Download a document
3. **Expected Result:** ✅ All document operations work
4. **Actual Result:** _[User to document]_

### Test Results Summary
| Test | Expected | Actual | Pass/Fail | Notes |
|------|----------|--------|-----------|-------|
| 1.2.1 | Portal login | | | |
| 1.2.2 | Form submission | | | |
| 1.2.3 | Billing view | | | |
| 1.2.4 | Appt request | | | |
| 1.2.5 | Documents | | | |

---

## Phase 1.6: Signature Capture UI & Signing Workflow

### Feature Description
Signature capture interface allowing clinicians to create digital signatures and use them to sign clinical notes. Frontend implementation of Phase 1.4 backend.

### Testing Steps

#### Test 1.6.1: Navigate to Signature Settings
1. **Login** as a clinician
2. **Click** on user menu (top right)
3. **Select** "My Profile" or "User Profile"
4. **Navigate** to "Signature Settings" tab/section
5. **Expected Result:** ✅ Signature settings page loads
6. **Actual Result:** _[User to document]_

#### Test 1.6.2: Create Signature with Drawing
1. **In Signature Settings**, find the signature capture area
2. **Draw** your signature using mouse/trackpad/touchscreen
3. **Verify** signature appears in the canvas
4. **Expected Result:** ✅ Signature rendered clearly
5. **Try** the "Clear" button - should erase signature
6. **Draw** signature again
7. **Click** "Save Signature" or similar
8. **Expected Result:** ✅
   - Success message
   - Signature saved
   - Preview of signature shown
9. **Actual Result:** _[User to document]_

#### Test 1.6.3: Verify Signature Saved
1. **Refresh** the page
2. **Navigate** back to Signature Settings
3. **Expected Result:** ✅ Saved signature should be displayed
4. **Actual Result:** _[User to document]_

#### Test 1.6.4: Use Signature to Sign Clinical Note (with PIN)
1. **Navigate** to a clinical note in "Draft" status
2. **Click** "Sign Note" or similar button
3. **A signature modal should appear** showing:
   - Your saved signature preview
   - PIN input field
   - Legal attestation text
4. **Enter** your PIN
5. **Click** "Sign" or "Confirm"
6. **Expected Result:** ✅
   - Note status changes to "Signed"
   - Signature event recorded
   - Timestamp and IP address captured
   - Cannot edit note anymore (locked)
7. **Verify** note details show:
   - Signed by: [Your Name]
   - Signature date/time
   - Signature type: PIN
8. **Actual Result:** _[User to document]_

#### Test 1.6.5: Use Signature to Sign with Password
1. **Navigate** to another draft clinical note
2. **Click** "Sign Note"
3. **In the modal**, select "Sign with Password" (if option exists)
4. **Enter** your account password
5. **Click** "Sign"
6. **Expected Result:** ✅
   - Note signed successfully
   - Signature event shows "Password" as auth method
7. **Actual Result:** _[User to document]_

#### Test 1.6.6: Test Invalid PIN/Password
1. **Navigate** to a draft note
2. **Try to sign** with incorrect PIN
3. **Expected Result:** ❌ Error message "Invalid PIN"
4. **Try to sign** with incorrect password
5. **Expected Result:** ❌ Error message "Invalid password"
6. **Actual Result:** _[User to document]_

#### Test 1.6.7: Update Signature
1. **Navigate** back to Signature Settings
2. **Draw** a different signature
3. **Save** the new signature
4. **Expected Result:** ✅ Signature updated
5. **Sign** a new note
6. **Verify** the NEW signature is used
7. **Actual Result:** _[User to document]_

### Test Results Summary
| Test | Expected | Actual | Pass/Fail | Notes |
|------|----------|--------|-----------|-------|
| 1.6.1 | Settings page | | | |
| 1.6.2 | Create signature | | | |
| 1.6.3 | Signature saved | | | |
| 1.6.4 | Sign with PIN | | | |
| 1.6.5 | Sign with password | | | |
| 1.6.6 | Invalid auth | | | |
| 1.6.7 | Update signature | | | |

---

## Phase 1.3: Note Validation Rules (Quick Verification)

### Testing Steps

#### Test 1.3.1: View Validation Rules (Admin)
1. **Login** as administrator
2. **Navigate** to: Settings → Clinical Notes → Validation Rules
3. **Expected Result:** ✅ List of validation rules displayed
4. **Verify** rules exist for different note types
5. **Actual Result:** _[User to document]_

#### Test 1.3.2: Validation Rule Enforcement
1. **Login** as clinician
2. **Create** a new clinical note
3. **Try to save** without required fields
4. **Expected Result:** ❌ Validation errors displayed
5. **Fill in** required fields
6. **Save** note
7. **Expected Result:** ✅ Note saved successfully
8. **Actual Result:** _[User to document]_

---

## Phase 1.4: Electronic Signatures (Quick Verification)

### Testing Steps

#### Test 1.4.1: Signature Settings (Admin)
1. **Login** as administrator
2. **Navigate** to: Settings → Signatures
3. **Verify** can configure:
   - PIN requirements
   - Signature attestations
   - Signature policies
4. **Actual Result:** _[User to document]_

#### Test 1.4.2: View Signature History
1. **Login** as clinician
2. **Navigate** to a signed note
3. **View** signature details
4. **Verify** shows:
   - Signer name
   - Date/time
   - Authentication method (PIN/Password)
   - IP address
5. **Actual Result:** _[User to document]_

---

## Phase 1.5: Amendment History (Quick Verification)

### Testing Steps

#### Test 1.5.1: Create Amendment
1. **Login** as clinician
2. **Navigate** to a SIGNED clinical note
3. **Click** "Amend Note" button
4. **Fill out** amendment wizard:
   - Step 1: Reason (min 20 characters)
   - Step 2: Select fields to amend
   - Step 3: Edit field values
   - Step 4: Summary of changes
5. **Submit** amendment
6. **Expected Result:** ✅ Amendment created, ready to sign
7. **Actual Result:** _[User to document]_

#### Test 1.5.2: Sign Amendment
1. **After creating amendment**, signature modal appears
2. **Enter** PIN or password
3. **Sign** the amendment
4. **Expected Result:** ✅ Amendment signed and applied
5. **Actual Result:** _[User to document]_

#### Test 1.5.3: View Amendment History
1. **Navigate** to amended note
2. **Click** "Amendment History" tab
3. **Verify** timeline shows:
   - Amendment number
   - Date/time
   - Amended by
   - Reason
   - Fields changed
   - Status (Signed)
4. **Actual Result:** _[User to document]_

#### Test 1.5.4: Compare Versions
1. **In amendment history**, click "View Changes"
2. **Verify** side-by-side comparison shows:
   - Previous version (orange)
   - New version (green)
   - Field-by-field differences
3. **Actual Result:** _[User to document]_

---

## Overall Test Results

### Phase 1.1: Appointment Enforcement
- **Status:** ⬜ Not Tested / ✅ Pass / ❌ Fail / ⚠️ Issues Found
- **Issues:** _[Document any issues]_

### Phase 1.2: Client Portal Forms & Billing
- **Status:** ⬜ Not Tested / ✅ Pass / ❌ Fail / ⚠️ Issues Found
- **Issues:** _[Document any issues]_

### Phase 1.3: Note Validation Rules
- **Status:** ⬜ Not Tested / ✅ Pass / ❌ Fail / ⚠️ Issues Found
- **Issues:** _[Document any issues]_

### Phase 1.4: Electronic Signatures
- **Status:** ⬜ Not Tested / ✅ Pass / ❌ Fail / ⚠️ Issues Found
- **Issues:** _[Document any issues]_

### Phase 1.5: Amendment History
- **Status:** ⬜ Not Tested / ✅ Pass / ❌ Fail / ⚠️ Issues Found
- **Issues:** _[Document any issues]_

### Phase 1.6: Signature Capture UI
- **Status:** ⬜ Not Tested / ✅ Pass / ❌ Fail / ⚠️ Issues Found
- **Issues:** _[Document any issues]_

---

## Common Issues & Troubleshooting

### Issue: Cannot access Signature Settings
- **Cause:** User role may not have permission
- **Solution:** Ensure user has CLINICIAN role

### Issue: Signature not saving
- **Check:** Browser console for JavaScript errors
- **Check:** Network tab for API errors
- **Solution:** May need to check CORS settings

### Issue: Note validation not working
- **Cause:** Validation rules may not be configured
- **Solution:** Admin needs to set up rules in settings

### Issue: Appointment enforcement not blocking
- **Cause:** Feature may not be deployed
- **Solution:** Verify with endpoint test: `curl https://api.mentalspaceehr.com/api/v1/clinical-notes`

### Issue: Portal forms not submitting
- **Check:** Browser console errors
- **Check:** Network errors
- **Solution:** Verify portal authentication is working

---

## Test Environment Information

**Production URLs:**
- Frontend: https://mentalspaceehr.com
- API: https://api.mentalspaceehr.com
- Health: https://api.mentalspaceehr.com/api/v1/health/live

**Production Version:**
- Git SHA: `b2590657727e6c40666ab4a5d55e0f94f4ff935d`
- Build Time: 2025-10-23T16:45:37.364Z
- Revision: 17

**Browser Requirements:**
- Modern browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- Cookies enabled
- Canvas support (for signature capture)

---

## Reporting Issues

If you find any issues during testing:

1. **Document:**
   - Exact steps to reproduce
   - Expected vs actual behavior
   - Browser/device information
   - Screenshots/videos if possible

2. **Check:**
   - Browser console for errors (F12 → Console)
   - Network tab for failed API calls (F12 → Network)

3. **Report:**
   - Create GitHub issue with "[Phase X.X]" prefix
   - Include all documentation and screenshots
   - Tag with `bug` label

---

## Sign-off

After completing all tests:

**Tested By:** _________________
**Date:** _________________
**Overall Status:** ⬜ All Pass / ⬜ Some Issues / ⬜ Critical Issues
**Ready for Production Use:** ⬜ Yes / ⬜ No / ⬜ With Fixes

**Notes:** _[Any additional comments]_

---

*Testing Guide Version 1.0*
*Created: 2025-10-23*
*For Production Deployment: Revision 17*
