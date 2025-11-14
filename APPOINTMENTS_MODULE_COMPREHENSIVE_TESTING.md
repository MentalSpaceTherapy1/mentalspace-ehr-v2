# Appointments Module - Comprehensive Browser Testing Guide

**Target Module:** Appointments Module (All 6 Sub-modules)
**Testing Date:** 2025-01-14
**Environment:** Production (https://mentalspaceehr.com)
**Test User:** ejoseph@chctherapy.com / Bing@@0912

---

## TESTING REQUIREMENTS

**CRITICAL RULES:**
1. Test EVERY single button, link, tab, form field, dropdown, checkbox, and interaction
2. Test ALL validation rules (required fields, formats, date ranges, etc.)
3. Test ALL error states and error messages
4. Test ALL success states and success messages
5. Test ALL CRUD operations (Create, Read, Update, Delete)
6. Test ALL filters, search functions, and sort options
7. Test ALL modals, popups, tooltips, and overlays
8. Test ALL permissions and access controls
9. Test ALL data displays, tables, calendars, and lists
10. Test ALL edge cases and boundary conditions

**DOCUMENTATION:**
- Screenshot EVERY page/view tested
- Document EVERY bug, error, or unexpected behavior
- Note EVERY missing feature or incomplete functionality
- Record EVERY API response (success and error)
- Capture EVERY console error or warning

---

## MODULE 1: CALENDAR

### 1.1 CALENDAR - INITIAL PAGE LOAD

**Test Steps:**
1. Navigate to Appointments → Calendar
2. Verify page loads without errors
3. Check console for JavaScript errors
4. Verify all UI elements render correctly

**Expected Results:**
- [ ] Page loads successfully (no 500 errors)
- [ ] Calendar grid displays correctly
- [ ] Current date is highlighted
- [ ] No console errors
- [ ] Loading states work properly

**Verify UI Elements:**
- [ ] Calendar header with month/year
- [ ] Navigation arrows (previous/next month)
- [ ] Today button
- [ ] View switcher (Day/Week/Month/Agenda)
- [ ] Filter options
- [ ] Search bar
- [ ] "New Appointment" button
- [ ] Provider filter dropdown
- [ ] Room filter dropdown
- [ ] Appointment type filter
- [ ] Status filter

**Screenshot Required:** ✅ Full page screenshot

---

### 1.2 CALENDAR - VIEW MODES

#### 1.2.1 Day View

**Test Steps:**
1. Click "Day" view button
2. Verify day view displays correctly
3. Test navigation between days
4. Test scrolling through time slots

**Verify:**
- [ ] Time slots displayed (hourly/30-min intervals)
- [ ] Current time indicator shown
- [ ] Appointments display in correct time slots
- [ ] Multi-provider columns (if applicable)
- [ ] Business hours highlighted
- [ ] Non-business hours grayed out
- [ ] Today indicator works
- [ ] Navigation arrows work (previous/next day)
- [ ] Date picker works
- [ ] Jump to today works

**Test Actions:**
- [ ] Click previous day arrow
- [ ] Click next day arrow
- [ ] Click "Today" button
- [ ] Select date from date picker
- [ ] Scroll up/down through time slots
- [ ] Click on empty time slot (should open new appointment)
- [ ] Click on existing appointment (should open details)
- [ ] Drag appointment to different time (if supported)
- [ ] Resize appointment duration (if supported)

**Screenshot Required:** ✅ Day view with appointments

---

#### 1.2.2 Week View

**Test Steps:**
1. Click "Week" view button
2. Verify week view displays correctly
3. Test navigation between weeks
4. Test all interactions

**Verify:**
- [ ] 7 days displayed (or 5 for workweek)
- [ ] Day headers show day name and date
- [ ] Time slots displayed vertically
- [ ] Current day highlighted
- [ ] Current time indicator shown
- [ ] Appointments display in correct day/time
- [ ] Multi-day appointments span correctly
- [ ] Weekend days formatted differently (if applicable)

**Test Actions:**
- [ ] Click previous week arrow
- [ ] Click next week arrow
- [ ] Click "Today" button (jumps to current week)
- [ ] Click on empty time slot in each day
- [ ] Click on existing appointments
- [ ] Test week/workweek toggle (if available)
- [ ] Scroll vertically through time
- [ ] Zoom in/out (if supported)
- [ ] Drag appointments between days (if supported)

**Screenshot Required:** ✅ Week view with appointments

---

#### 1.2.3 Month View

**Test Steps:**
1. Click "Month" view button
2. Verify month view displays correctly
3. Test navigation between months
4. Test all interactions

**Verify:**
- [ ] Full month calendar grid displayed
- [ ] Current day highlighted
- [ ] Days from previous/next month shown (grayed out)
- [ ] Appointments shown as blocks/indicators
- [ ] Appointment count shown per day
- [ ] "More appointments" indicator (if >X per day)
- [ ] Month/year header correct
- [ ] Weekday headers shown

**Test Actions:**
- [ ] Click previous month arrow
- [ ] Click next month arrow
- [ ] Click "Today" button
- [ ] Click on a day (should show day's appointments)
- [ ] Click on appointment indicator
- [ ] Click on "X more" link (if applicable)
- [ ] Click on empty day (should create new appointment)
- [ ] Double-click on day
- [ ] Navigate to different month and back

**Screenshot Required:** ✅ Month view with appointments

---

#### 1.2.4 Agenda View

**Test Steps:**
1. Click "Agenda" view button
2. Verify agenda list displays correctly
3. Test filtering and sorting
4. Test pagination/infinite scroll

**Verify:**
- [ ] Appointments listed chronologically
- [ ] Date headers/separators shown
- [ ] Appointment cards show all key info
- [ ] Past appointments styled differently
- [ ] Cancelled appointments shown/hidden correctly
- [ ] No appointments message shown when empty
- [ ] Scroll/pagination works

**Test Data Displayed Per Appointment:**
- [ ] Date and time
- [ ] Client name
- [ ] Provider name
- [ ] Appointment type
- [ ] Status badge
- [ ] Duration
- [ ] Room/location
- [ ] Quick action buttons

**Test Actions:**
- [ ] Scroll through list
- [ ] Click on appointment (opens details)
- [ ] Click edit button
- [ ] Click delete button
- [ ] Click "View Client" button
- [ ] Filter by date range
- [ ] Filter by provider
- [ ] Filter by status
- [ ] Search by client name

**Screenshot Required:** ✅ Agenda view with multiple appointments

---

### 1.3 CALENDAR - FILTERS & SEARCH

#### 1.3.1 Provider Filter

**Test Steps:**
1. Locate provider filter dropdown
2. Test all provider filtering options
3. Verify calendar updates correctly

**Test Cases:**
- [ ] Open provider dropdown
- [ ] Verify all providers listed
- [ ] Select single provider
- [ ] Verify only that provider's appointments show
- [ ] Select "All Providers"
- [ ] Verify all appointments show
- [ ] Select multiple providers (if multi-select supported)
- [ ] Verify selected providers' appointments show
- [ ] Test with provider who has 0 appointments
- [ ] Clear filter
- [ ] Verify filter persists across view changes

**Screenshot Required:** ✅ Provider filter dropdown & filtered results

---

#### 1.3.2 Room/Location Filter

**Test Steps:**
1. Locate room filter dropdown
2. Test all room filtering options
3. Verify calendar updates correctly

**Test Cases:**
- [ ] Open room dropdown
- [ ] Verify all rooms listed
- [ ] Select single room
- [ ] Verify only that room's appointments show
- [ ] Select "All Rooms"
- [ ] Verify all appointments show
- [ ] Select "Virtual" (if applicable)
- [ ] Select "In-Person" (if applicable)
- [ ] Test with room that has 0 appointments
- [ ] Clear filter

**Screenshot Required:** ✅ Room filter dropdown & filtered results

---

#### 1.3.3 Appointment Type Filter

**Test Steps:**
1. Locate appointment type filter
2. Test all type filtering options
3. Verify calendar updates correctly

**Test Cases:**
- [ ] Open type dropdown
- [ ] Verify all appointment types listed (Intake, Follow-up, Therapy, etc.)
- [ ] Select single type
- [ ] Verify only that type shows
- [ ] Select "All Types"
- [ ] Select multiple types (if supported)
- [ ] Clear filter

**Screenshot Required:** ✅ Type filter dropdown & filtered results

---

#### 1.3.4 Status Filter

**Test Steps:**
1. Locate status filter
2. Test all status filtering options
3. Verify calendar updates correctly

**Test Cases:**
- [ ] Open status dropdown
- [ ] Verify all statuses listed (Scheduled, Completed, Cancelled, No-Show, etc.)
- [ ] Select "Scheduled"
- [ ] Verify only scheduled appointments show
- [ ] Select "Completed"
- [ ] Select "Cancelled"
- [ ] Select "No-Show"
- [ ] Select "All Statuses"
- [ ] Select multiple statuses (if supported)
- [ ] Clear filter

**Screenshot Required:** ✅ Status filter dropdown & filtered results

---

#### 1.3.5 Date Range Filter

**Test Steps:**
1. Locate date range filter
2. Test custom date range selection
3. Verify results

**Test Cases:**
- [ ] Click date range selector
- [ ] Select "Today"
- [ ] Select "This Week"
- [ ] Select "This Month"
- [ ] Select "Next 7 Days"
- [ ] Select "Next 30 Days"
- [ ] Select "Custom Range"
- [ ] Enter custom start date
- [ ] Enter custom end date
- [ ] Apply date range
- [ ] Verify appointments filtered correctly
- [ ] Test invalid date ranges (end before start)
- [ ] Clear date range

**Screenshot Required:** ✅ Date range picker & filtered results

---

#### 1.3.6 Search Functionality

**Test Steps:**
1. Locate search bar
2. Test search with various inputs
3. Verify results

**Test Cases:**
- [ ] Search by client first name
- [ ] Search by client last name
- [ ] Search by client full name
- [ ] Search by provider name
- [ ] Search by appointment ID
- [ ] Search by room name
- [ ] Search with partial text
- [ ] Search with special characters
- [ ] Search with numbers
- [ ] Search with empty string
- [ ] Search with no results
- [ ] Clear search
- [ ] Verify search is case-insensitive
- [ ] Test search while other filters active

**Screenshot Required:** ✅ Search results

---

### 1.4 CALENDAR - CREATE NEW APPOINTMENT

#### 1.4.1 Open Create Appointment Modal

**Test Steps:**
1. Click "New Appointment" button
2. Verify modal opens correctly
3. Check all form fields present

**Verify Modal Elements:**
- [ ] Modal opens without errors
- [ ] Modal title displayed
- [ ] Close button (X) present
- [ ] Cancel button present
- [ ] Save button present
- [ ] All form fields visible
- [ ] Form fields in correct layout
- [ ] No console errors

**Form Fields Expected:**
- [ ] Client selector/search (required)
- [ ] Provider selector (required)
- [ ] Appointment type dropdown (required)
- [ ] Date picker (required)
- [ ] Start time picker (required)
- [ ] End time picker / Duration selector (required)
- [ ] Room/Location selector
- [ ] Virtual/In-Person toggle
- [ ] Recurring appointment checkbox
- [ ] Notes/Reason field
- [ ] Status dropdown
- [ ] Send notification checkbox

**Screenshot Required:** ✅ Empty new appointment modal

---

#### 1.4.2 Test Client Selection

**Test Steps:**
1. Click/focus on client selector
2. Test all client selection methods
3. Verify validation

**Test Cases:**
- [ ] Click client field
- [ ] Verify dropdown/search opens
- [ ] Type partial client name
- [ ] Verify autocomplete works
- [ ] Verify clients filtered by input
- [ ] Select client from dropdown
- [ ] Verify client name populates
- [ ] Clear selection
- [ ] Search for non-existent client
- [ ] Verify "No results" message
- [ ] Test with special characters
- [ ] Try to submit without client (should show error)
- [ ] Verify required field indicator shown

**Client Search Display:**
- [ ] Shows client full name
- [ ] Shows client ID/MRN
- [ ] Shows client photo (if applicable)
- [ ] Shows active/inactive status
- [ ] Highlights search term

**Screenshot Required:** ✅ Client search dropdown with results

---

#### 1.4.3 Test Provider Selection

**Test Steps:**
1. Click provider selector
2. Test provider selection
3. Verify validation

**Test Cases:**
- [ ] Open provider dropdown
- [ ] Verify all active providers listed
- [ ] Verify providers sorted alphabetically
- [ ] Select provider
- [ ] Verify provider name populates
- [ ] Change provider selection
- [ ] Clear selection
- [ ] Try to submit without provider (should show error)
- [ ] Verify required field indicator shown
- [ ] Test filter by provider specialty (if applicable)
- [ ] Test show only available providers (if applicable)

**Provider Display:**
- [ ] Shows provider full name
- [ ] Shows provider title/credentials
- [ ] Shows provider specialty
- [ ] Shows availability indicator (if applicable)

**Screenshot Required:** ✅ Provider dropdown

---

#### 1.4.4 Test Appointment Type Selection

**Test Steps:**
1. Click appointment type dropdown
2. Test all types
3. Verify duration auto-fill (if applicable)

**Test Cases:**
- [ ] Open appointment type dropdown
- [ ] Verify all types listed (Intake, Follow-up, Therapy Session, etc.)
- [ ] Select "Intake"
- [ ] Verify duration auto-fills (if configured)
- [ ] Select "Follow-up"
- [ ] Select "Therapy Session - Individual"
- [ ] Select "Therapy Session - Group"
- [ ] Select "Psychiatric Evaluation"
- [ ] Select "Medication Management"
- [ ] Clear selection
- [ ] Try to submit without type (should show error)

**Screenshot Required:** ✅ Appointment type dropdown

---

#### 1.4.5 Test Date Selection

**Test Steps:**
1. Click date picker
2. Test date selection
3. Verify validation rules

**Test Cases:**
- [ ] Click date field
- [ ] Verify calendar popup opens
- [ ] Select today's date
- [ ] Select tomorrow's date
- [ ] Select date in next week
- [ ] Select date in next month
- [ ] Navigate months forward
- [ ] Navigate months backward
- [ ] Use date navigation arrows
- [ ] Type date manually (if supported)
- [ ] Test date format validation
- [ ] Try to select past date (should warn/prevent)
- [ ] Select far future date
- [ ] Clear date
- [ ] Try to submit without date (should show error)

**Date Picker Features:**
- [ ] Today highlighted
- [ ] Selected date highlighted
- [ ] Weekends styled differently (if applicable)
- [ ] Unavailable dates disabled (if applicable)
- [ ] Quick select buttons (Today, Tomorrow, etc.)

**Screenshot Required:** ✅ Date picker calendar

---

#### 1.4.6 Test Time Selection

**Test Steps:**
1. Click start time picker
2. Click end time picker
3. Test time validation

**Test Cases - Start Time:**
- [ ] Click start time field
- [ ] Verify time picker opens
- [ ] Select morning time (9:00 AM)
- [ ] Select afternoon time (2:00 PM)
- [ ] Select evening time (6:00 PM)
- [ ] Select early time (8:00 AM)
- [ ] Select late time (8:00 PM)
- [ ] Type time manually (if supported)
- [ ] Test 12-hour format
- [ ] Test 24-hour format (if supported)
- [ ] Verify business hours highlighted
- [ ] Clear time
- [ ] Try to submit without time (should show error)

**Test Cases - End Time:**
- [ ] Select end time before start time (should error)
- [ ] Select end time = start time (should error)
- [ ] Select end time 30 min after start
- [ ] Select end time 1 hour after start
- [ ] Verify duration calculated automatically
- [ ] Test maximum duration limit (if applicable)

**Test Cases - Duration:**
- [ ] Change duration to 15 minutes
- [ ] Change duration to 30 minutes
- [ ] Change duration to 45 minutes
- [ ] Change duration to 60 minutes
- [ ] Change duration to 90 minutes
- [ ] Verify end time updates when duration changes
- [ ] Verify duration updates when end time changes

**Screenshot Required:** ✅ Time picker

---

#### 1.4.7 Test Room/Location Selection

**Test Steps:**
1. Click room selector
2. Test room selection
3. Verify virtual vs in-person

**Test Cases:**
- [ ] Open room dropdown
- [ ] Verify all active rooms listed
- [ ] Select "Room 101"
- [ ] Select "Room 102"
- [ ] Select "Virtual - Zoom"
- [ ] Select "Virtual - Telehealth"
- [ ] Clear selection
- [ ] Toggle "Virtual" checkbox
- [ ] Verify room field disabled when virtual selected
- [ ] Toggle back to "In-Person"
- [ ] Verify room field enabled
- [ ] Test room with unavailable status (if applicable)

**Screenshot Required:** ✅ Room selector dropdown

---

#### 1.4.8 Test Recurring Appointments

**Test Steps:**
1. Check "Recurring Appointment" checkbox
2. Configure recurrence pattern
3. Verify all options work

**Test Cases:**
- [ ] Check "Recurring Appointment" checkbox
- [ ] Verify recurrence options appear
- [ ] Select "Daily" frequency
- [ ] Select "Weekly" frequency
- [ ] Select "Bi-weekly" frequency
- [ ] Select "Monthly" frequency
- [ ] Set number of occurrences (e.g., 10)
- [ ] Set end date instead
- [ ] Select "Every Monday"
- [ ] Select "Every Monday and Wednesday"
- [ ] Select "Every weekday"
- [ ] Verify preview of dates generated
- [ ] Test skip holidays option (if available)
- [ ] Clear recurrence
- [ ] Uncheck recurring checkbox

**Screenshot Required:** ✅ Recurring appointment options

---

#### 1.4.9 Test Notes/Reason Field

**Test Steps:**
1. Click notes field
2. Enter various text
3. Verify character limits

**Test Cases:**
- [ ] Click notes field
- [ ] Enter short text (10 chars)
- [ ] Enter medium text (100 chars)
- [ ] Enter long text (500 chars)
- [ ] Test character counter (if present)
- [ ] Test maximum character limit
- [ ] Enter special characters
- [ ] Enter line breaks
- [ ] Copy/paste text
- [ ] Clear notes
- [ ] Verify notes optional (not required)

**Screenshot Required:** ✅ Notes field with text

---

#### 1.4.10 Test Send Notification

**Test Steps:**
1. Locate notification checkbox
2. Test notification options
3. Verify settings

**Test Cases:**
- [ ] Check "Send Notification" checkbox
- [ ] Verify notification method options appear (Email, SMS)
- [ ] Select "Email" only
- [ ] Select "SMS" only
- [ ] Select both Email and SMS
- [ ] Verify client contact info shown (if available)
- [ ] Uncheck notification checkbox
- [ ] Verify default state on new appointment

**Screenshot Required:** ✅ Notification options

---

#### 1.4.11 Test Form Validation

**Test Steps:**
1. Try to submit with missing required fields
2. Verify all validation messages
3. Fix errors and submit

**Validation Test Cases:**
- [ ] Click Save with completely empty form
- [ ] Verify all required field errors shown
- [ ] Fill only client field, try to save
- [ ] Verify other required fields error
- [ ] Enter end time before start time
- [ ] Verify time validation error
- [ ] Select past date
- [ ] Verify date validation error
- [ ] Select time slot that conflicts with another appointment
- [ ] Verify conflict warning shown
- [ ] Fill all required fields correctly
- [ ] Verify Save button enables

**Error Message Verification:**
- [ ] "Client is required"
- [ ] "Provider is required"
- [ ] "Appointment type is required"
- [ ] "Date is required"
- [ ] "Start time is required"
- [ ] "End time must be after start time"
- [ ] "This time slot conflicts with another appointment"
- [ ] "Please select a future date"

**Screenshot Required:** ✅ Form with validation errors

---

#### 1.4.12 Test Save New Appointment

**Test Steps:**
1. Fill all required fields correctly
2. Click Save button
3. Verify appointment created

**Success Test Cases:**
- [ ] Fill all required fields
- [ ] Click "Save" button
- [ ] Verify loading state shown
- [ ] Verify success message appears
- [ ] Verify modal closes
- [ ] Verify new appointment appears on calendar
- [ ] Verify appointment in correct date/time slot
- [ ] Verify appointment shows correct client
- [ ] Verify appointment shows correct provider
- [ ] Verify appointment has correct status (Scheduled)
- [ ] Click on new appointment
- [ ] Verify all details saved correctly

**Notification Verification (if enabled):**
- [ ] Verify API call to send notification
- [ ] Check email sent (if email selected)
- [ ] Check SMS sent (if SMS selected)

**Screenshot Required:** ✅ Success message & new appointment on calendar

---

### 1.5 CALENDAR - VIEW APPOINTMENT DETAILS

**Test Steps:**
1. Click on existing appointment in calendar
2. Verify details modal opens
3. Check all information displayed

**Verify Appointment Details Displayed:**
- [ ] Modal opens successfully
- [ ] Client full name
- [ ] Client photo (if available)
- [ ] Client ID/MRN
- [ ] Client contact info
- [ ] Provider full name
- [ ] Provider title/credentials
- [ ] Appointment type
- [ ] Date
- [ ] Start time
- [ ] End time / Duration
- [ ] Room/location
- [ ] Virtual vs In-Person indicator
- [ ] Status badge (with color coding)
- [ ] Notes/Reason
- [ ] Created by / Created date
- [ ] Last modified by / Last modified date
- [ ] Check-in time (if applicable)
- [ ] Check-out time (if applicable)

**Verify Action Buttons:**
- [ ] Edit button present
- [ ] Delete button present
- [ ] Cancel button present
- [ ] Check-In button (if not checked in)
- [ ] Check-Out button (if checked in)
- [ ] View Client button
- [ ] View Provider button
- [ ] Print button (if available)
- [ ] Close button (X)

**Screenshot Required:** ✅ Appointment details modal

---

### 1.6 CALENDAR - EDIT APPOINTMENT

**Test Steps:**
1. Open appointment details
2. Click "Edit" button
3. Modify fields and save
4. Verify changes

**Edit Test Cases:**

#### 1.6.1 Edit Client
- [ ] Click Edit button
- [ ] Change client selection
- [ ] Verify warning about changing client (if applicable)
- [ ] Save changes
- [ ] Verify client updated

#### 1.6.2 Edit Provider
- [ ] Click Edit button
- [ ] Change provider selection
- [ ] Verify provider availability check (if applicable)
- [ ] Save changes
- [ ] Verify provider updated
- [ ] Verify notification sent to new provider (if configured)

#### 1.6.3 Edit Date/Time
- [ ] Click Edit button
- [ ] Change date to tomorrow
- [ ] Verify new date accepted
- [ ] Change start time
- [ ] Change end time
- [ ] Verify duration recalculated
- [ ] Test conflict detection with new time
- [ ] Save changes
- [ ] Verify date/time updated on calendar
- [ ] Verify reschedule notification sent (if configured)

#### 1.6.4 Edit Appointment Type
- [ ] Click Edit button
- [ ] Change appointment type
- [ ] Verify duration updates (if auto-fill configured)
- [ ] Save changes
- [ ] Verify type updated

#### 1.6.5 Edit Room/Location
- [ ] Click Edit button
- [ ] Change room selection
- [ ] Toggle virtual/in-person
- [ ] Save changes
- [ ] Verify location updated

#### 1.6.6 Edit Notes
- [ ] Click Edit button
- [ ] Modify notes field
- [ ] Add new notes
- [ ] Clear notes
- [ ] Save changes
- [ ] Verify notes updated

#### 1.6.7 Edit Status
- [ ] Click Edit button
- [ ] Change status to "Completed"
- [ ] Verify completion fields appear (if applicable)
- [ ] Change status to "Cancelled"
- [ ] Verify cancellation reason field appears
- [ ] Enter cancellation reason
- [ ] Save changes
- [ ] Verify status updated
- [ ] Verify status badge color changed

**Screenshot Required:** ✅ Edit appointment modal with changes

---

### 1.7 CALENDAR - DELETE/CANCEL APPOINTMENT

#### 1.7.1 Cancel Appointment

**Test Steps:**
1. Open appointment details
2. Click "Cancel" button
3. Complete cancellation flow

**Test Cases:**
- [ ] Click "Cancel Appointment" button
- [ ] Verify cancellation confirmation modal appears
- [ ] Verify "Are you sure?" message displayed
- [ ] Verify cancellation reason dropdown present
- [ ] Select reason: "Client Request"
- [ ] Select reason: "Provider Unavailable"
- [ ] Select reason: "Other"
- [ ] Enter additional notes (if other selected)
- [ ] Check "Notify Client" checkbox
- [ ] Click "Confirm Cancel" button
- [ ] Verify success message appears
- [ ] Verify appointment status changed to "Cancelled"
- [ ] Verify appointment styled as cancelled (strikethrough/grayed)
- [ ] Verify cancellation notification sent (if selected)
- [ ] Verify appointment still visible in calendar (not deleted)

**Screenshot Required:** ✅ Cancellation confirmation & cancelled appointment

---

#### 1.7.2 Delete Appointment

**Test Steps:**
1. Open appointment details
2. Click "Delete" button
3. Complete deletion flow

**Test Cases:**
- [ ] Click "Delete Appointment" button
- [ ] Verify delete confirmation modal appears
- [ ] Verify warning message displayed
- [ ] Verify "This action cannot be undone" message
- [ ] Verify "Delete" button is red/destructive style
- [ ] Click "Cancel" to abort
- [ ] Verify appointment not deleted
- [ ] Click "Delete" again
- [ ] Click "Confirm Delete" button
- [ ] Verify loading state
- [ ] Verify success message appears
- [ ] Verify appointment removed from calendar
- [ ] Verify appointment cannot be found in search
- [ ] Verify deletion notification NOT sent to client (permanent delete)

**Screenshot Required:** ✅ Delete confirmation modal

---

### 1.8 CALENDAR - CHECK-IN / CHECK-OUT

#### 1.8.1 Check-In Client

**Test Steps:**
1. Find appointment at current time
2. Click Check-In button
3. Verify check-in process

**Test Cases:**
- [ ] Open appointment details for today's appointment
- [ ] Verify "Check-In" button visible
- [ ] Click "Check-In" button
- [ ] Verify check-in confirmation modal (if applicable)
- [ ] Confirm check-in
- [ ] Verify success message appears
- [ ] Verify check-in time recorded
- [ ] Verify appointment status changed to "In Progress" or "Checked In"
- [ ] Verify check-in timestamp displayed
- [ ] Verify "Check-In" button replaced with "Check-Out" button
- [ ] Verify check-in notification sent (if configured)

**Early Check-In Test:**
- [ ] Try to check in >15 minutes early
- [ ] Verify warning message shown
- [ ] Confirm early check-in
- [ ] Verify check-in successful

**Screenshot Required:** ✅ Check-in confirmation & checked-in appointment

---

#### 1.8.2 Check-Out Client

**Test Steps:**
1. Find checked-in appointment
2. Click Check-Out button
3. Verify check-out process

**Test Cases:**
- [ ] Open checked-in appointment
- [ ] Verify "Check-Out" button visible
- [ ] Click "Check-Out" button
- [ ] Verify check-out modal appears (if applicable)
- [ ] Verify option to create clinical note (if integrated)
- [ ] Add notes about session (if field available)
- [ ] Confirm check-out
- [ ] Verify success message appears
- [ ] Verify check-out time recorded
- [ ] Verify appointment status changed to "Completed"
- [ ] Verify check-out timestamp displayed
- [ ] Calculate session duration = check-out - check-in
- [ ] Verify duration displayed correctly

**Screenshot Required:** ✅ Check-out confirmation & completed appointment

---

### 1.9 CALENDAR - QUICK ACTIONS

**Test Steps:**
1. Right-click on appointment (if context menu supported)
2. Test all quick actions
3. Verify functionality

**Quick Actions to Test:**
- [ ] Right-click on appointment
- [ ] Verify context menu appears
- [ ] Click "Edit"
- [ ] Verify edit modal opens
- [ ] Right-click again
- [ ] Click "Cancel"
- [ ] Verify cancel flow
- [ ] Right-click again
- [ ] Click "View Client"
- [ ] Verify client profile opens
- [ ] Right-click again
- [ ] Click "Copy Appointment Link"
- [ ] Verify link copied to clipboard
- [ ] Right-click again
- [ ] Click "Duplicate Appointment"
- [ ] Verify duplicate created with new date

**Screenshot Required:** ✅ Context menu

---

### 1.10 CALENDAR - DRAG & DROP (If Supported)

**Test Steps:**
1. Try to drag appointment to new time
2. Verify drag & drop functionality
3. Test validation

**Test Cases:**
- [ ] Hover over appointment
- [ ] Verify cursor changes to move cursor
- [ ] Click and hold appointment
- [ ] Drag to new time slot (same day)
- [ ] Release mouse
- [ ] Verify confirmation dialog appears
- [ ] Confirm move
- [ ] Verify appointment moved
- [ ] Verify reschedule notification sent

**Cross-Day Drag Test:**
- [ ] Drag appointment to different day
- [ ] Verify date and time both update
- [ ] Confirm move
- [ ] Verify appointment appears on new day

**Resize Test:**
- [ ] Hover over appointment bottom edge
- [ ] Verify cursor changes to resize cursor
- [ ] Click and drag to extend duration
- [ ] Release mouse
- [ ] Verify end time updated
- [ ] Verify duration recalculated

**Conflict Test:**
- [ ] Drag appointment to time slot that conflicts
- [ ] Verify conflict warning shown
- [ ] Verify move blocked or warning displayed
- [ ] Cancel or choose different time

**Screenshot Required:** ✅ Drag & drop in progress

---

### 1.11 CALENDAR - MULTI-SELECT & BULK ACTIONS (If Supported)

**Test Steps:**
1. Select multiple appointments
2. Perform bulk actions
3. Verify results

**Test Cases:**
- [ ] Click first appointment
- [ ] Hold Ctrl/Cmd and click second appointment
- [ ] Hold Ctrl/Cmd and click third appointment
- [ ] Verify all selected appointments highlighted
- [ ] Verify bulk action toolbar appears
- [ ] Click "Bulk Cancel" button
- [ ] Verify confirmation for multiple appointments
- [ ] Confirm bulk cancel
- [ ] Verify all selected appointments cancelled

**Other Bulk Actions:**
- [ ] Multi-select appointments
- [ ] Click "Bulk Reschedule"
- [ ] Select new date
- [ ] Confirm reschedule
- [ ] Verify all appointments moved

**Screenshot Required:** ✅ Multi-select with bulk actions

---

### 1.12 CALENDAR - PRINT & EXPORT

**Test Steps:**
1. Click Print button
2. Test print preview
3. Test export options

**Print Test Cases:**
- [ ] Click "Print" or "Print Schedule" button
- [ ] Verify print preview opens
- [ ] Verify appointment details formatted correctly
- [ ] Verify date range shown
- [ ] Verify provider info shown
- [ ] Change print settings (landscape/portrait)
- [ ] Print to PDF
- [ ] Verify PDF generated correctly

**Export Test Cases:**
- [ ] Click "Export" button
- [ ] Verify export options: CSV, Excel, PDF, iCal
- [ ] Export as CSV
- [ ] Verify CSV file downloaded
- [ ] Open CSV and verify data correct
- [ ] Export as Excel
- [ ] Verify Excel file downloaded
- [ ] Export as iCal
- [ ] Verify calendar file downloaded
- [ ] Import iCal to Outlook/Google Calendar
- [ ] Verify appointments imported correctly

**Screenshot Required:** ✅ Print preview & export options

---

### 1.13 CALENDAR - CONFLICT DETECTION

**Test Steps:**
1. Create appointment that conflicts with existing one
2. Verify conflict warning
3. Test override

**Test Cases:**
- [ ] Open new appointment modal
- [ ] Select client who already has appointment at that time
- [ ] Select same date and time as existing appointment
- [ ] Try to save
- [ ] Verify conflict error: "Client already has appointment at this time"
- [ ] Verify existing appointment details shown in error
- [ ] Verify option to "View Conflict" or "Override"
- [ ] Click "View Conflict"
- [ ] Verify existing appointment details displayed
- [ ] Go back and change time
- [ ] Save successfully

**Provider Conflict Test:**
- [ ] Create appointment for Provider A at 2:00 PM
- [ ] Create another appointment for same Provider A at 2:00 PM
- [ ] Verify conflict: "Provider is already scheduled at this time"
- [ ] Verify override option available (if double-booking allowed)
- [ ] Select "Allow Double-Booking"
- [ ] Confirm override
- [ ] Verify both appointments created

**Room Conflict Test:**
- [ ] Create appointment in Room 101 at 3:00 PM
- [ ] Create another appointment in same Room 101 at 3:00 PM
- [ ] Verify conflict: "Room is already booked at this time"
- [ ] Change room
- [ ] Save successfully

**Screenshot Required:** ✅ Conflict warning message

---

### 1.14 CALENDAR - APPOINTMENT STATUS WORKFLOW

**Test Complete Appointment Lifecycle:**

**Status: Scheduled**
- [ ] Create new appointment
- [ ] Verify initial status = "Scheduled"
- [ ] Verify status badge color (e.g., blue)
- [ ] Verify appointment appears in future appointments

**Status: Confirmed**
- [ ] Change status to "Confirmed"
- [ ] Verify status badge color changed (e.g., green)
- [ ] Verify confirmation timestamp recorded

**Status: Checked-In**
- [ ] On appointment day, check in client
- [ ] Verify status = "Checked-In" or "In Progress"
- [ ] Verify check-in time recorded
- [ ] Verify appointment highlighted differently

**Status: Completed**
- [ ] Check out client
- [ ] Verify status = "Completed"
- [ ] Verify completion time recorded
- [ ] Verify duration calculated
- [ ] Verify appointment styled as past (if same day)

**Status: Cancelled**
- [ ] Cancel appointment
- [ ] Verify status = "Cancelled"
- [ ] Verify cancellation reason recorded
- [ ] Verify cancelled appointments styled (strikethrough/gray)

**Status: No-Show**
- [ ] Mark appointment as "No-Show"
- [ ] Verify status = "No-Show"
- [ ] Verify no-show time recorded
- [ ] Verify no-show count incremented for client (if tracked)

**Screenshot Required:** ✅ Each status type

---

### 1.15 CALENDAR - ACCESSIBILITY TESTS

**Keyboard Navigation:**
- [ ] Tab through all interactive elements
- [ ] Verify tab order is logical
- [ ] Press Enter on "New Appointment" button
- [ ] Verify modal opens
- [ ] Tab through form fields
- [ ] Use arrow keys to navigate calendar
- [ ] Press Escape to close modal
- [ ] Use Space to select checkboxes
- [ ] Navigate date picker with arrow keys

**Screen Reader Test:**
- [ ] Enable screen reader (NVDA/JAWS)
- [ ] Navigate to calendar
- [ ] Verify calendar structure announced
- [ ] Navigate to appointment
- [ ] Verify appointment details read aloud
- [ ] Open new appointment modal
- [ ] Verify form labels read correctly
- [ ] Verify required fields announced
- [ ] Verify error messages read aloud

**Color Contrast:**
- [ ] Verify all text meets WCAG AA standards
- [ ] Verify status badge colors have sufficient contrast
- [ ] Verify disabled states visible
- [ ] Verify focus indicators visible

**Screenshot Required:** ✅ Keyboard focus states

---

### 1.16 CALENDAR - MOBILE RESPONSIVE TESTS

**Test on Mobile Viewport:**
- [ ] Resize browser to mobile width (375px)
- [ ] Verify calendar layout responsive
- [ ] Verify navigation menu accessible (hamburger)
- [ ] Verify filters collapse into dropdown
- [ ] Verify calendar view switches to mobile-friendly format
- [ ] Verify touch gestures work (swipe to navigate)
- [ ] Verify appointment cards stack vertically
- [ ] Verify modals full-screen on mobile
- [ ] Verify form fields usable on small screen
- [ ] Verify buttons large enough for touch

**Screenshot Required:** ✅ Mobile calendar view

---

### 1.17 CALENDAR - ERROR HANDLING

**Network Error Test:**
- [ ] Disable network (DevTools → Network → Offline)
- [ ] Try to load calendar
- [ ] Verify offline message displayed
- [ ] Verify graceful error handling
- [ ] Re-enable network
- [ ] Verify calendar reloads

**API Error Test:**
- [ ] Simulate 500 server error (if possible)
- [ ] Verify error message displayed
- [ ] Verify retry option available
- [ ] Verify calendar doesn't crash

**Validation Error Test:**
- [ ] Submit form with invalid data
- [ ] Verify specific error messages shown
- [ ] Verify field-level errors highlighted
- [ ] Fix errors one by one
- [ ] Verify errors clear as fixed

**Screenshot Required:** ✅ Error states

---

## MODULE 2: AI SCHEDULING ASSISTANT ✨

### 2.1 AI SCHEDULING - INITIAL PAGE LOAD

**Test Steps:**
1. Navigate to Appointments → AI Scheduling Assistant
2. Verify page loads without errors
3. Check all UI elements

**Verify UI Elements:**
- [ ] Page loads successfully
- [ ] AI assistant icon/branding visible
- [ ] Chat interface displayed (if applicable)
- [ ] Input area for natural language
- [ ] Submit button
- [ ] Example prompts/suggestions shown
- [ ] Help text explaining how to use AI assistant
- [ ] No console errors

**Screenshot Required:** ✅ AI Scheduling Assistant home page

---

### 2.2 AI SCHEDULING - NATURAL LANGUAGE INPUT

**Test Steps:**
1. Type natural language scheduling request
2. Submit request
3. Verify AI processes correctly

**Test Cases:**

#### Simple Requests:
- [ ] Type: "Schedule John Doe for therapy tomorrow at 2pm"
- [ ] Submit
- [ ] Verify AI parses client name, date, time, type
- [ ] Verify appointment suggestions shown
- [ ] Confirm appointment
- [ ] Verify appointment created

- [ ] Type: "Book Maria Garcia next Monday at 10am"
- [ ] Verify AI understands "next Monday"
- [ ] Verify correct date calculated

- [ ] Type: "Schedule intake for new client Sarah Miller on Friday"
- [ ] Verify AI recognizes intake appointment type
- [ ] Verify time suggestions provided (if no time specified)

#### Complex Requests:
- [ ] Type: "Schedule weekly therapy sessions for Alex Kim every Tuesday at 3pm for the next 8 weeks"
- [ ] Verify AI creates recurring appointments
- [ ] Verify 8 occurrences generated
- [ ] Verify all on Tuesdays at 3pm
- [ ] Review and confirm

- [ ] Type: "Find the next available slot for Dr. Johnson this week"
- [ ] Verify AI searches provider availability
- [ ] Verify available times shown
- [ ] Select time and confirm

- [ ] Type: "Reschedule all of Robert Taylor's appointments next week to the following week"
- [ ] Verify AI identifies client's appointments
- [ ] Verify bulk reschedule options shown
- [ ] Confirm reschedule

#### Ambiguous Requests:
- [ ] Type: "Schedule appointment for John"
- [ ] Verify AI asks clarifying questions: "Which John? (John Doe, John Smith)"
- [ ] Select correct client
- [ ] Verify AI continues with scheduling

- [ ] Type: "Book therapy tomorrow"
- [ ] Verify AI asks: "What time would you like?"
- [ ] Specify time
- [ ] Verify AI asks: "Which provider?"
- [ ] Complete booking

**Screenshot Required:** ✅ AI processing natural language request

---

### 2.3 AI SCHEDULING - INTELLIGENT SUGGESTIONS

**Test Steps:**
1. Make scheduling request
2. Review AI suggestions
3. Test suggestion logic

**Test Cases:**

**Client Preference Detection:**
- [ ] Request appointment for client with history
- [ ] Verify AI suggests same provider as previous appointments
- [ ] Verify AI suggests same time slot as usual appointments
- [ ] Verify AI suggests same room/location

**Provider Availability:**
- [ ] Request appointment with busy provider
- [ ] Verify AI shows only available time slots
- [ ] Verify AI indicates "Provider has limited availability"
- [ ] Verify alternative providers suggested if fully booked

**Optimal Scheduling:**
- [ ] Request appointment "sometime next week"
- [ ] Verify AI suggests times that minimize gaps in provider's schedule
- [ ] Verify AI avoids back-to-back appointments if buffer needed
- [ ] Verify AI considers travel time between locations

**Conflict Avoidance:**
- [ ] Request time when client already has appointment
- [ ] Verify AI warns: "Client already has appointment at this time"
- [ ] Verify AI suggests alternative times

**Screenshot Required:** ✅ AI suggestions with reasoning

---

### 2.4 AI SCHEDULING - CONFIRMATION & BOOKING

**Test Steps:**
1. Review AI-generated appointment details
2. Confirm booking
3. Verify creation

**Test Cases:**
- [ ] AI displays appointment preview
- [ ] Verify all details correct: Client, Provider, Date, Time, Type
- [ ] Verify "Confirm" button shown
- [ ] Verify "Edit" option available
- [ ] Click "Edit"
- [ ] Modify details
- [ ] Save edits
- [ ] Click "Confirm Booking"
- [ ] Verify success message
- [ ] Verify appointment appears in calendar
- [ ] Verify notification sent (if enabled)

**Screenshot Required:** ✅ AI confirmation screen

---

### 2.5 AI SCHEDULING - CONVERSATION CONTEXT

**Test Steps:**
1. Have multi-turn conversation with AI
2. Verify context maintained
3. Test follow-up requests

**Test Cases:**
- [ ] Say: "Schedule John Doe tomorrow at 2pm"
- [ ] AI confirms details
- [ ] Say: "Actually, make it 3pm instead"
- [ ] Verify AI updates time (remembers John Doe and tomorrow)
- [ ] Say: "And send him a reminder"
- [ ] Verify AI enables notification
- [ ] Confirm final booking

**Screenshot Required:** ✅ Multi-turn conversation

---

### 2.6 AI SCHEDULING - ERROR HANDLING

**Test Steps:**
1. Make impossible/invalid requests
2. Verify AI handles gracefully
3. Check error messages

**Test Cases:**
- [ ] Say: "Schedule appointment for client that doesn't exist"
- [ ] Verify AI responds: "I couldn't find that client. Did you mean...?"
- [ ] Say: "Book appointment last week"
- [ ] Verify AI responds: "I can only schedule future appointments"
- [ ] Say: "Schedule at midnight"
- [ ] Verify AI warns about unusual time
- [ ] Say: "Book 50 appointments"
- [ ] Verify AI asks for clarification or limits

**Screenshot Required:** ✅ AI error handling

---

### 2.7 AI SCHEDULING - ADVANCED FEATURES

**Batch Scheduling:**
- [ ] Say: "Schedule appointments for all clients in my caseload next week"
- [ ] Verify AI generates multiple appointments
- [ ] Verify AI uses smart scheduling to fill week efficiently
- [ ] Review and confirm batch

**Pattern Recognition:**
- [ ] Say: "Schedule same appointments as last week"
- [ ] Verify AI identifies previous week's appointments
- [ ] Verify AI replicates pattern
- [ ] Confirm duplication

**Cancellation via AI:**
- [ ] Say: "Cancel John Doe's appointment tomorrow"
- [ ] Verify AI finds appointment
- [ ] Verify AI asks for cancellation reason
- [ ] Provide reason
- [ ] Verify AI cancels appointment
- [ ] Verify notification sent

**Reschedule via AI:**
- [ ] Say: "Move Maria's appointment from Tuesday to Thursday"
- [ ] Verify AI identifies appointment
- [ ] Verify AI finds available Thursday slots
- [ ] Select time
- [ ] Confirm reschedule

**Screenshot Required:** ✅ Advanced AI features

---

## MODULE 3: PROVIDER COMPARISON

### 3.1 PROVIDER COMPARISON - INITIAL PAGE LOAD

**Test Steps:**
1. Navigate to Appointments → Provider Comparison
2. Verify page loads
3. Check all UI elements

**Verify UI Elements:**
- [ ] Page loads successfully
- [ ] Provider selection dropdowns visible
- [ ] Date range selector visible
- [ ] Comparison metrics displayed
- [ ] Chart/graph area present
- [ ] Export button available
- [ ] No console errors

**Screenshot Required:** ✅ Provider Comparison page

---

### 3.2 PROVIDER COMPARISON - SELECT PROVIDERS

**Test Steps:**
1. Select providers to compare
2. Verify selection works
3. Test multi-select

**Test Cases:**
- [ ] Click "Select Providers" dropdown
- [ ] Verify all providers listed
- [ ] Select first provider
- [ ] Verify provider added to comparison
- [ ] Select second provider
- [ ] Select third provider
- [ ] Verify up to X providers can be selected
- [ ] Try to select more than maximum
- [ ] Verify error/limit message
- [ ] Deselect one provider
- [ ] Verify removed from comparison

**Screenshot Required:** ✅ Provider selection dropdown

---

### 3.3 PROVIDER COMPARISON - DATE RANGE

**Test Steps:**
1. Set date range for comparison
2. Test different ranges
3. Verify data updates

**Test Cases:**
- [ ] Click date range selector
- [ ] Select "Last 7 Days"
- [ ] Verify data refreshes for last week
- [ ] Select "Last 30 Days"
- [ ] Verify data refreshes for last month
- [ ] Select "Last 3 Months"
- [ ] Select "Last 6 Months"
- [ ] Select "Last Year"
- [ ] Select "Custom Range"
- [ ] Set custom start date
- [ ] Set custom end date
- [ ] Apply custom range
- [ ] Verify data refreshes

**Screenshot Required:** ✅ Date range selector

---

### 3.4 PROVIDER COMPARISON - METRICS

**Test Steps:**
1. Review all comparison metrics
2. Verify calculations correct
3. Test sorting

**Metrics to Verify:**

**Appointment Volume:**
- [ ] Total appointments scheduled
- [ ] Total appointments completed
- [ ] Total appointments cancelled
- [ ] Total appointments no-show
- [ ] Verify numbers accurate (cross-check with calendar)

**Utilization:**
- [ ] Available hours
- [ ] Scheduled hours
- [ ] Utilization percentage (scheduled/available)
- [ ] Verify calculation correct

**Client Metrics:**
- [ ] Total unique clients seen
- [ ] New clients
- [ ] Returning clients
- [ ] Average appointments per client

**Cancellation Metrics:**
- [ ] Cancellation rate (%)
- [ ] No-show rate (%)
- [ ] Same-day cancellation rate

**Revenue (if applicable):**
- [ ] Total revenue
- [ ] Average revenue per appointment
- [ ] Collections rate

**Verify Data Display:**
- [ ] Metrics shown in table format
- [ ] Metrics shown in chart/graph format
- [ ] Each provider has separate column/bar
- [ ] Values formatted correctly (numbers, percentages, currency)
- [ ] Totals/averages calculated

**Screenshot Required:** ✅ Comparison metrics table

---

### 3.5 PROVIDER COMPARISON - CHARTS & VISUALIZATIONS

**Test Steps:**
1. Review all charts
2. Verify data accuracy
3. Test interactivity

**Chart Types to Test:**

**Bar Chart - Appointment Volume:**
- [ ] Verify bar chart displays
- [ ] Each provider has separate bar
- [ ] Bars sized proportionally to data
- [ ] Hover over bar shows exact value
- [ ] Verify chart legend
- [ ] Verify axis labels

**Line Chart - Trend Over Time:**
- [ ] Verify line chart displays
- [ ] Each provider has separate line (different color)
- [ ] Lines show appointments over time
- [ ] Hover over point shows date and value
- [ ] Verify time axis (dates)
- [ ] Verify value axis (appointment count)

**Pie Chart - Distribution:**
- [ ] Verify pie chart (if used)
- [ ] Each provider has slice
- [ ] Slices sized by percentage
- [ ] Hover shows provider and percentage
- [ ] Verify colors distinct

**Utilization Gauge:**
- [ ] Verify gauge/meter for each provider
- [ ] Gauge shows utilization %
- [ ] Color coding (green = good, yellow = medium, red = low)

**Screenshot Required:** ✅ All chart types

---

### 3.6 PROVIDER COMPARISON - SORTING & FILTERING

**Test Steps:**
1. Sort by different metrics
2. Filter providers
3. Verify results

**Sorting Test Cases:**
- [ ] Click "Total Appointments" column header
- [ ] Verify sorted descending (highest first)
- [ ] Click again
- [ ] Verify sorted ascending (lowest first)
- [ ] Sort by "Utilization %"
- [ ] Sort by "Cancellation Rate"
- [ ] Sort by "New Clients"
- [ ] Sort by "Revenue" (if applicable)

**Filtering Test Cases:**
- [ ] Filter by provider specialty
- [ ] Filter by employment type (FT/PT)
- [ ] Filter by location
- [ ] Verify only matching providers shown
- [ ] Clear filters

**Screenshot Required:** ✅ Sorted/filtered results

---

### 3.7 PROVIDER COMPARISON - DRILL-DOWN

**Test Steps:**
1. Click on provider name
2. View detailed breakdown
3. Test detail view

**Test Cases:**
- [ ] Click on provider name in comparison
- [ ] Verify detail modal/page opens
- [ ] Verify detailed metrics for that provider
- [ ] Verify appointment list shown
- [ ] Verify day-by-day breakdown
- [ ] Verify appointment types breakdown
- [ ] Close detail view
- [ ] Return to comparison

**Detailed Metrics:**
- [ ] Appointments by type (Intake, Follow-up, etc.)
- [ ] Appointments by day of week
- [ ] Average appointments per day
- [ ] Peak hours
- [ ] Client satisfaction (if tracked)
- [ ] Clinical outcomes (if tracked)

**Screenshot Required:** ✅ Provider detail view

---

### 3.8 PROVIDER COMPARISON - EXPORT

**Test Steps:**
1. Click Export button
2. Test export formats
3. Verify data exported

**Test Cases:**
- [ ] Click "Export" button
- [ ] Verify export options: Excel, CSV, PDF
- [ ] Export as Excel
- [ ] Verify Excel file downloads
- [ ] Open Excel file
- [ ] Verify all metrics included
- [ ] Verify formatting correct
- [ ] Export as CSV
- [ ] Verify CSV downloads
- [ ] Export as PDF
- [ ] Verify PDF includes charts and metrics

**Screenshot Required:** ✅ Export options & exported file

---

## MODULE 4: ROOM VIEW

### 4.1 ROOM VIEW - INITIAL PAGE LOAD

**Test Steps:**
1. Navigate to Appointments → Room View
2. Verify page loads
3. Check layout

**Verify UI Elements:**
- [ ] Page loads successfully
- [ ] Room grid/list displayed
- [ ] Each room shows current status
- [ ] Time selector visible
- [ ] Date selector visible
- [ ] Room filter available
- [ ] Legend for room statuses
- [ ] No console errors

**Screenshot Required:** ✅ Room View page

---

### 4.2 ROOM VIEW - ROOM DISPLAY

**Test Steps:**
1. Review all rooms
2. Verify status indicators
3. Check room details

**Room Card Elements:**
- [ ] Room number/name
- [ ] Room type (Therapy, Evaluation, etc.)
- [ ] Current status (Available, Occupied, Scheduled, Maintenance)
- [ ] Current appointment (if occupied)
- [ ] Client name (if occupied)
- [ ] Provider name (if occupied)
- [ ] Appointment time
- [ ] Next appointment time
- [ ] Room capacity
- [ ] Equipment/amenities list

**Status Colors:**
- [ ] Green = Available
- [ ] Blue = Scheduled (future appointment)
- [ ] Red/Orange = Occupied (current appointment)
- [ ] Yellow = In Transition (between appointments)
- [ ] Gray = Closed/Maintenance

**Screenshot Required:** ✅ Room grid with all statuses

---

### 4.3 ROOM VIEW - TIME NAVIGATION

**Test Steps:**
1. Change time slider
2. View room status at different times
3. Test time jump

**Test Cases:**
- [ ] Use time slider to move to 9:00 AM
- [ ] Verify room statuses updated for 9 AM
- [ ] Move to 10:00 AM
- [ ] Verify statuses updated
- [ ] Move to 2:00 PM
- [ ] Move to 5:00 PM
- [ ] Jump to current time
- [ ] Verify "Now" indicator shown

**Screenshot Required:** ✅ Room view at different times

---

### 4.4 ROOM VIEW - ROOM DETAILS

**Test Steps:**
1. Click on room card
2. View detailed information
3. Test room schedule

**Test Cases:**
- [ ] Click on "Room 101"
- [ ] Verify detail modal opens
- [ ] Verify room information displayed
- [ ] Verify today's schedule shown
- [ ] Verify timeline with all appointments
- [ ] Verify gaps/available slots highlighted
- [ ] Click "View Full Week"
- [ ] Verify week view for room
- [ ] Navigate days
- [ ] Close detail view

**Room Detail Information:**
- [ ] Room name and number
- [ ] Room type
- [ ] Floor/location
- [ ] Capacity
- [ ] Equipment list (TV, whiteboard, etc.)
- [ ] Accessibility features
- [ ] Today's schedule (timeline)
- [ ] Utilization percentage
- [ ] Next available slot
- [ ] Cleaning status

**Screenshot Required:** ✅ Room detail modal

---

### 4.5 ROOM VIEW - BOOK FROM ROOM VIEW

**Test Steps:**
1. Click available time slot in room
2. Create appointment
3. Verify room assigned

**Test Cases:**
- [ ] Click on green (available) room card
- [ ] Verify option to "Book Appointment"
- [ ] Click "Book Appointment"
- [ ] Verify new appointment modal opens
- [ ] Verify room pre-filled
- [ ] Verify time slot pre-filled (if clicked on specific time)
- [ ] Fill client and provider
- [ ] Save appointment
- [ ] Verify appointment created
- [ ] Verify room status updated to "Scheduled"

**Screenshot Required:** ✅ Book appointment from room view

---

### 4.6 ROOM VIEW - ROOM FILTERS

**Test Steps:**
1. Apply room filters
2. Verify filtering works
3. Test combinations

**Test Cases:**
- [ ] Filter by "Available Only"
- [ ] Verify only available rooms shown
- [ ] Filter by "Occupied Only"
- [ ] Filter by room type: "Therapy Rooms"
- [ ] Verify only therapy rooms shown
- [ ] Filter by floor: "Floor 1"
- [ ] Filter by capacity: "1-2 people"
- [ ] Filter by amenities: "Has TV"
- [ ] Combine multiple filters
- [ ] Clear all filters

**Screenshot Required:** ✅ Filtered room view

---

### 4.7 ROOM VIEW - ROOM UTILIZATION

**Test Steps:**
1. View utilization metrics
2. Verify calculations
3. Test date ranges

**Test Cases:**
- [ ] Click "Utilization Report"
- [ ] Verify report opens
- [ ] Verify metrics for each room:
  - [ ] Total hours available
  - [ ] Total hours booked
  - [ ] Utilization percentage
  - [ ] Peak usage hours
  - [ ] Idle time
- [ ] Select date range: "This Week"
- [ ] Verify metrics updated
- [ ] Select "This Month"
- [ ] Verify monthly utilization shown
- [ ] Identify underutilized rooms
- [ ] Identify overbooked rooms

**Screenshot Required:** ✅ Room utilization report

---

### 4.8 ROOM VIEW - CLEANING & MAINTENANCE

**Test Steps:**
1. Mark room for cleaning
2. Update maintenance status
3. Verify room unavailable

**Test Cases:**
- [ ] Click on room
- [ ] Click "Mark for Cleaning"
- [ ] Verify cleaning status updated
- [ ] Verify room shows "Cleaning in Progress"
- [ ] Verify room unavailable for booking
- [ ] Click "Cleaning Complete"
- [ ] Verify room available again
- [ ] Click "Schedule Maintenance"
- [ ] Set maintenance window (start/end time)
- [ ] Verify room blocked for that window
- [ ] Complete maintenance
- [ ] Verify room available again

**Screenshot Required:** ✅ Room in maintenance status

---

## MODULE 5: WAITLIST

### 5.1 WAITLIST - INITIAL PAGE LOAD

**Test Steps:**
1. Navigate to Appointments → Waitlist
2. Verify page loads
3. Check all sections

**Verify UI Elements:**
- [ ] Page loads successfully
- [ ] Waitlist table/list displayed
- [ ] Add to Waitlist button visible
- [ ] Search waitlist field
- [ ] Filter options
- [ ] Sort options
- [ ] Status indicators
- [ ] Actions column
- [ ] No console errors

**Screenshot Required:** ✅ Waitlist page

---

### 5.2 WAITLIST - ADD CLIENT TO WAITLIST

**Test Steps:**
1. Click "Add to Waitlist" button
2. Fill form
3. Verify client added

**Test Cases:**
- [ ] Click "Add to Waitlist" button
- [ ] Verify modal opens
- [ ] Verify form fields:
  - [ ] Client selector (required)
  - [ ] Provider preference (optional)
  - [ ] Appointment type (required)
  - [ ] Preferred days (checkboxes: Mon-Sun)
  - [ ] Preferred times (Morning, Afternoon, Evening)
  - [ ] Preferred dates (date range)
  - [ ] Urgency level (Low, Medium, High, Urgent)
  - [ ] Notes/Reason
  - [ ] Contact preference
  - [ ] Notify when available (checkbox)

**Fill Test:**
- [ ] Select client: "John Doe"
- [ ] Select provider: "Dr. Johnson"
- [ ] Select type: "Follow-up"
- [ ] Check preferred days: Mon, Wed, Fri
- [ ] Select time: Morning (8am-12pm)
- [ ] Set date range: Next 2 weeks
- [ ] Set urgency: High
- [ ] Add notes: "Prefers morning appointments"
- [ ] Check "Notify when slot available"
- [ ] Click "Add to Waitlist"
- [ ] Verify success message
- [ ] Verify client appears in waitlist

**Validation Test:**
- [ ] Try to add without client
- [ ] Verify error: "Client is required"
- [ ] Try to add without appointment type
- [ ] Verify error
- [ ] Fill required fields and save successfully

**Screenshot Required:** ✅ Add to waitlist modal & new waitlist entry

---

### 5.3 WAITLIST - VIEW WAITLIST ENTRIES

**Test Steps:**
1. Review all waitlist entries
2. Verify information displayed
3. Test sorting

**Waitlist Entry Display:**
- [ ] Client name
- [ ] Client photo (if available)
- [ ] Date added to waitlist
- [ ] Urgency indicator (color-coded)
- [ ] Preferred provider
- [ ] Preferred appointment type
- [ ] Preferred days/times
- [ ] Days waiting (calculated)
- [ ] Status (Active, Contacted, Scheduled, Removed)
- [ ] Contact attempts
- [ ] Last contact date
- [ ] Action buttons

**Sort Test:**
- [ ] Click "Date Added" column
- [ ] Verify sorted by date (oldest first)
- [ ] Click again
- [ ] Verify sorted newest first
- [ ] Sort by "Urgency"
- [ ] Verify urgent clients at top
- [ ] Sort by "Days Waiting"
- [ ] Verify longest waiting at top

**Screenshot Required:** ✅ Waitlist table with entries

---

### 5.4 WAITLIST - FILTER WAITLIST

**Test Steps:**
1. Apply various filters
2. Verify results
3. Test combinations

**Test Cases:**
- [ ] Filter by urgency: "High"
- [ ] Verify only high urgency shown
- [ ] Filter by urgency: "Urgent"
- [ ] Filter by provider: "Dr. Johnson"
- [ ] Verify only clients preferring Dr. Johnson shown
- [ ] Filter by appointment type: "Intake"
- [ ] Filter by status: "Active"
- [ ] Verify only active (not yet scheduled) shown
- [ ] Filter by date range: "Last 7 days"
- [ ] Verify only clients added in last week
- [ ] Combine filters: High urgency + Dr. Johnson
- [ ] Clear all filters

**Screenshot Required:** ✅ Filtered waitlist

---

### 5.5 WAITLIST - SEARCH WAITLIST

**Test Steps:**
1. Search for client
2. Verify search works
3. Test partial matches

**Test Cases:**
- [ ] Type client name in search: "John"
- [ ] Verify results filtered to matching clients
- [ ] Search by partial name: "Doe"
- [ ] Search by client ID
- [ ] Search by phone number (if supported)
- [ ] Search with no results
- [ ] Verify "No results found" message
- [ ] Clear search

**Screenshot Required:** ✅ Search results

---

### 5.6 WAITLIST - CONTACT CLIENT

**Test Steps:**
1. Click contact button
2. Record contact attempt
3. Verify logged

**Test Cases:**
- [ ] Click on waitlist entry
- [ ] Verify detail view/modal opens
- [ ] Click "Contact Client" button
- [ ] Verify contact options: Call, Email, SMS
- [ ] Select "Call"
- [ ] Verify contact method logged
- [ ] Enter outcome: Reached, Left Message, No Answer
- [ ] Select "Reached"
- [ ] Add notes about call
- [ ] Save contact log
- [ ] Verify contact attempt count incremented
- [ ] Verify "Last Contact" date updated
- [ ] Verify notes saved

**Multiple Contact Attempts:**
- [ ] Contact client again
- [ ] Verify previous attempts shown
- [ ] Add new contact log
- [ ] Verify all attempts tracked

**Screenshot Required:** ✅ Contact log

---

### 5.7 WAITLIST - SCHEDULE FROM WAITLIST

**Test Steps:**
1. Find available slot for waitlist client
2. Schedule appointment
3. Update waitlist status

**Test Cases:**
- [ ] Click on waitlist entry
- [ ] Click "Schedule Appointment" button
- [ ] Verify new appointment modal opens
- [ ] Verify client pre-filled
- [ ] Verify provider pre-filled (if preference set)
- [ ] Verify type pre-filled
- [ ] Select date and time
- [ ] Verify date/time match preferences (if possible)
- [ ] Save appointment
- [ ] Verify appointment created
- [ ] Verify waitlist status updated to "Scheduled"
- [ ] Verify scheduled appointment linked
- [ ] Verify "Scheduled" badge shown
- [ ] Verify scheduled date/time shown in waitlist

**Screenshot Required:** ✅ Scheduled waitlist entry

---

### 5.8 WAITLIST - REMOVE FROM WAITLIST

**Test Steps:**
1. Remove client from waitlist
2. Provide reason
3. Verify removed

**Test Cases:**
- [ ] Click on waitlist entry
- [ ] Click "Remove from Waitlist" button
- [ ] Verify confirmation modal
- [ ] Verify reason dropdown:
  - [ ] Scheduled
  - [ ] No Longer Needed
  - [ ] Client Unresponsive
  - [ ] Client Declined
  - [ ] Other
- [ ] Select "Client Declined"
- [ ] Add notes
- [ ] Confirm removal
- [ ] Verify entry removed from active waitlist
- [ ] Verify entry in "Removed" filter (if available)
- [ ] Verify removal reason recorded

**Screenshot Required:** ✅ Remove confirmation

---

### 5.9 WAITLIST - WAITLIST NOTIFICATIONS

**Test Steps:**
1. Enable notifications
2. Trigger notification
3. Verify sent

**Test Cases:**
- [ ] Edit waitlist entry
- [ ] Check "Notify when slot available"
- [ ] Save
- [ ] Create appointment matching preferences
- [ ] Verify notification triggered
- [ ] Verify email/SMS sent to client
- [ ] Verify notification logged

**Automatic Matching:**
- [ ] Create new appointment with open slot
- [ ] Verify system checks waitlist for matches
- [ ] Verify notification sent if match found
- [ ] Verify waitlist entry updated

**Screenshot Required:** ✅ Notification settings

---

### 5.10 WAITLIST - URGENCY ESCALATION

**Test Steps:**
1. Review urgency levels
2. Test escalation
3. Verify alerts

**Test Cases:**
- [ ] View client with "Low" urgency
- [ ] Wait X days (or change urgency)
- [ ] Verify urgency auto-escalates to "Medium" after 7 days
- [ ] Verify urgency escalates to "High" after 14 days
- [ ] Verify urgent badge after 21 days
- [ ] Verify alert shown for urgent clients
- [ ] Verify dashboard shows urgent waitlist count

**Screenshot Required:** ✅ Urgency escalation

---

### 5.11 WAITLIST - WAITLIST REPORTS

**Test Steps:**
1. View waitlist analytics
2. Verify metrics
3. Test date ranges

**Metrics to Verify:**
- [ ] Total active waitlist count
- [ ] Average days waiting
- [ ] Longest wait time
- [ ] Waitlist by urgency (breakdown)
- [ ] Waitlist by provider (breakdown)
- [ ] Waitlist by appointment type
- [ ] Scheduled from waitlist this week
- [ ] Removed from waitlist this week
- [ ] Trend chart (waitlist over time)

**Test Cases:**
- [ ] Click "Waitlist Analytics"
- [ ] Verify dashboard loads
- [ ] Verify all metrics displayed
- [ ] Select date range: "Last 30 Days"
- [ ] Verify metrics recalculated
- [ ] Export report as PDF
- [ ] Verify PDF includes all metrics and charts

**Screenshot Required:** ✅ Waitlist analytics

---

## MODULE 6: TIME-OFF REQUESTS

### 6.1 TIME-OFF - INITIAL PAGE LOAD

**Test Steps:**
1. Navigate to Appointments → Time-Off Requests
2. Verify page loads
3. Check layout

**Verify UI Elements:**
- [ ] Page loads successfully
- [ ] Time-off calendar displayed
- [ ] Request time-off button visible
- [ ] My requests list shown
- [ ] Pending approval count (if manager)
- [ ] Filter options
- [ ] Status legend
- [ ] No console errors

**Screenshot Required:** ✅ Time-off requests page

---

### 6.2 TIME-OFF - REQUEST TIME OFF

**Test Steps:**
1. Click "Request Time Off" button
2. Fill form
3. Submit request

**Test Cases:**
- [ ] Click "Request Time Off" button
- [ ] Verify modal opens
- [ ] Verify form fields:
  - [ ] Provider (pre-filled with current user)
  - [ ] Start date (required)
  - [ ] End date (required)
  - [ ] Time-off type (Vacation, Sick, Personal, etc.)
  - [ ] Partial day option (Morning/Afternoon)
  - [ ] Reason/Notes
  - [ ] Recurring (checkbox)
  - [ ] Notify clients (checkbox)

**Fill Test:**
- [ ] Select start date: Next Monday
- [ ] Select end date: Next Friday (5 days)
- [ ] Select type: "Vacation"
- [ ] Select "Full Days"
- [ ] Add reason: "Family vacation"
- [ ] Check "Notify affected clients"
- [ ] Click "Submit Request"
- [ ] Verify success message
- [ ] Verify request appears in "My Requests" list
- [ ] Verify status = "Pending"

**Validation Test:**
- [ ] Try to submit without dates
- [ ] Verify error
- [ ] Try end date before start date
- [ ] Verify error
- [ ] Try to request time off in past
- [ ] Verify error/warning
- [ ] Fill correctly and submit

**Screenshot Required:** ✅ Request time-off modal

---

### 6.3 TIME-OFF - PARTIAL DAY REQUEST

**Test Steps:**
1. Request partial day off
2. Verify half-day handling
3. Check availability

**Test Cases:**
- [ ] Click "Request Time Off"
- [ ] Select tomorrow's date (both start and end)
- [ ] Select type: "Personal"
- [ ] Select "Partial Day"
- [ ] Select "Morning (8AM-12PM)"
- [ ] Submit request
- [ ] Verify half-day shown on calendar
- [ ] Verify afternoon still shows as available
- [ ] Verify appointments in afternoon not affected

**Test Afternoon:**
- [ ] Request another partial day
- [ ] Select "Afternoon (12PM-5PM)"
- [ ] Verify morning still available

**Screenshot Required:** ✅ Partial day time-off

---

### 6.4 TIME-OFF - RECURRING TIME OFF

**Test Steps:**
1. Request recurring time off
2. Configure pattern
3. Verify all dates blocked

**Test Cases:**
- [ ] Click "Request Time Off"
- [ ] Check "Recurring"
- [ ] Verify recurrence options appear
- [ ] Select "Weekly"
- [ ] Select "Every Friday"
- [ ] Set start date: This Friday
- [ ] Set recurrence end: 4 weeks from now
- [ ] Verify preview shows 4 Fridays
- [ ] Submit request
- [ ] Verify all 4 Fridays marked as time-off

**Screenshot Required:** ✅ Recurring time-off

---

### 6.5 TIME-OFF - VIEW MY REQUESTS

**Test Steps:**
1. View all submitted requests
2. Check status indicators
3. Test filtering

**My Requests List Display:**
- [ ] Request ID
- [ ] Dates (start - end)
- [ ] Type (Vacation, Sick, etc.)
- [ ] Total days
- [ ] Status badge (Pending, Approved, Denied)
- [ ] Submitted date
- [ ] Approved/Denied by (if processed)
- [ ] Approval/Denial date
- [ ] Reason/Notes
- [ ] Action buttons

**Status Types:**
- [ ] Pending (yellow/orange badge)
- [ ] Approved (green badge)
- [ ] Denied (red badge)
- [ ] Cancelled (gray badge)

**Test Cases:**
- [ ] Verify all requests shown
- [ ] Click "Pending" filter
- [ ] Verify only pending shown
- [ ] Click "Approved" filter
- [ ] Click "All Requests"
- [ ] Verify all statuses shown

**Screenshot Required:** ✅ My requests list

---

### 6.6 TIME-OFF - EDIT PENDING REQUEST

**Test Steps:**
1. Find pending request
2. Edit details
3. Resubmit

**Test Cases:**
- [ ] Click on pending request
- [ ] Verify "Edit" button available (only if pending)
- [ ] Click "Edit"
- [ ] Change end date (extend vacation by 1 day)
- [ ] Update reason
- [ ] Click "Update Request"
- [ ] Verify success message
- [ ] Verify request updated
- [ ] Verify status still "Pending"
- [ ] Verify updated timestamp shown

**Already Approved:**
- [ ] Try to edit approved request
- [ ] Verify edit button disabled or warning shown
- [ ] Verify message: "Contact manager to modify approved time-off"

**Screenshot Required:** ✅ Edit request modal

---

### 6.7 TIME-OFF - CANCEL REQUEST

**Test Steps:**
1. Cancel pending request
2. Verify cancellation
3. Check calendar updated

**Test Cases:**
- [ ] Click on pending request
- [ ] Click "Cancel Request" button
- [ ] Verify confirmation: "Are you sure?"
- [ ] Confirm cancellation
- [ ] Verify request status = "Cancelled"
- [ ] Verify dates removed from time-off calendar
- [ ] Verify availability restored

**Cancel Approved:**
- [ ] Try to cancel approved request
- [ ] Verify requires reason
- [ ] Enter reason: "Plans changed"
- [ ] Confirm cancellation
- [ ] Verify status = "Cancelled"
- [ ] Verify manager notified (if configured)

**Screenshot Required:** ✅ Cancellation confirmation

---

### 6.8 TIME-OFF - APPROVAL (Manager View)

**Test Steps:**
1. Log in as manager
2. View pending requests
3. Approve/deny requests

**Manager Dashboard:**
- [ ] Verify "Pending Approvals" section shown
- [ ] Verify count of pending requests
- [ ] Click "Pending Approvals"
- [ ] Verify all team's pending requests listed

**Approve Request:**
- [ ] Click on pending request
- [ ] Verify provider details shown
- [ ] Verify dates requested
- [ ] Verify reason shown
- [ ] Check "Affected Appointments" (if any)
- [ ] Verify list of appointments during time-off
- [ ] Click "Approve" button
- [ ] Verify confirmation: "This will block X days"
- [ ] Confirm approval
- [ ] Verify status = "Approved"
- [ ] Verify provider notified
- [ ] Verify calendar blocked

**Deny Request:**
- [ ] Click on another pending request
- [ ] Click "Deny" button
- [ ] Verify reason field required
- [ ] Enter reason: "Coverage needed during this period"
- [ ] Confirm denial
- [ ] Verify status = "Denied"
- [ ] Verify provider notified with reason

**Screenshot Required:** ✅ Approval interface & approved request

---

### 6.9 TIME-OFF - AFFECTED APPOINTMENTS

**Test Steps:**
1. Request time-off when appointments exist
2. Review affected appointments
3. Handle reschedule

**Test Cases:**
- [ ] Schedule appointments for next week
- [ ] Request time-off for next week
- [ ] Submit request
- [ ] Verify warning: "You have X appointments during this time"
- [ ] Verify list of affected appointments shown
- [ ] Options:
  - [ ] Automatically cancel appointments
  - [ ] Notify to reschedule
  - [ ] Reassign to another provider
- [ ] Select "Notify to reschedule"
- [ ] Submit request
- [ ] Verify appointments flagged for reschedule
- [ ] Verify clients notified (if selected)

**Screenshot Required:** ✅ Affected appointments warning

---

### 6.10 TIME-OFF - CALENDAR VIEW

**Test Steps:**
1. View time-off calendar
2. Test different views
3. Verify all providers

**Test Cases:**
- [ ] Click "Calendar View"
- [ ] Verify month calendar displayed
- [ ] Verify all providers' time-off shown
- [ ] Verify each provider has unique color
- [ ] Verify legend showing color per provider
- [ ] Click on time-off block
- [ ] Verify details popup
- [ ] Switch to "Week View"
- [ ] Verify week layout
- [ ] Switch to "List View"
- [ ] Verify chronological list

**Multi-Provider View:**
- [ ] Toggle "Show All Providers"
- [ ] Verify all team time-off visible
- [ ] Filter to "My Time-Off Only"
- [ ] Verify only current user's time-off shown

**Screenshot Required:** ✅ Time-off calendar

---

### 6.11 TIME-OFF - BALANCE TRACKING

**Test Steps:**
1. View time-off balance
2. Verify calculations
3. Check accrual

**Test Cases:**
- [ ] Click "My Balance"
- [ ] Verify balance dashboard opens
- [ ] Verify vacation days: Accrued, Used, Remaining
- [ ] Verify sick days: Accrued, Used, Remaining
- [ ] Verify personal days
- [ ] Verify calculations correct
- [ ] Verify accrual rate shown
- [ ] Verify next accrual date shown
- [ ] View balance history
- [ ] Verify all approved time-off deducted from balance

**Screenshot Required:** ✅ Time-off balance dashboard

---

### 6.12 TIME-OFF - REPORTS

**Test Steps:**
1. Generate time-off report
2. Verify data
3. Export

**Test Cases:**
- [ ] Click "Reports"
- [ ] Select date range: "This Year"
- [ ] Verify report shows:
  - [ ] Total days off by type
  - [ ] By provider (if manager)
  - [ ] Utilization rates
  - [ ] Pending requests count
  - [ ] Approved/Denied ratio
- [ ] Export report as PDF
- [ ] Verify PDF includes all data and charts
- [ ] Export as Excel
- [ ] Verify Excel file downloads

**Screenshot Required:** ✅ Time-off report

---

## CROSS-MODULE INTEGRATION TESTS

### INT-1: CALENDAR → CLIENT PROFILE

**Test Steps:**
1. Click on appointment in calendar
2. Click "View Client"
3. Verify navigation

**Test Cases:**
- [ ] Open appointment details
- [ ] Click "View Client" button
- [ ] Verify navigated to Client Profile page
- [ ] Verify correct client loaded
- [ ] Verify client appointments shown
- [ ] Click "Back to Calendar"
- [ ] Verify return to calendar

**Screenshot Required:** ✅ Navigation flow

---

### INT-2: WAITLIST → CALENDAR

**Test Steps:**
1. Schedule from waitlist
2. Verify appears in calendar
3. Check linking

**Test Cases:**
- [ ] Schedule appointment from waitlist
- [ ] Navigate to Calendar
- [ ] Find newly created appointment
- [ ] Open appointment details
- [ ] Verify "Scheduled from Waitlist" indicator
- [ ] Verify link back to waitlist entry
- [ ] Click link
- [ ] Verify waitlist entry shows scheduled status

**Screenshot Required:** ✅ Waitlist-to-calendar link

---

### INT-3: AI ASSISTANT → CALENDAR

**Test Cases:**
- [ ] Use AI to schedule appointment
- [ ] Verify appointment created in calendar
- [ ] Open appointment from calendar
- [ ] Verify all AI-selected details correct
- [ ] Verify "Scheduled via AI" note (if tracked)

---

### INT-4: PROVIDER COMPARISON → TIME-OFF

**Test Cases:**
- [ ] View provider comparison
- [ ] Notice low utilization for a provider
- [ ] Click on that provider
- [ ] Verify shows time-off dates
- [ ] Click "View Time-Off"
- [ ] Navigate to time-off calendar
- [ ] Verify provider's time-off shown

---

### INT-5: ROOM VIEW → CALENDAR

**Test Cases:**
- [ ] Book appointment from Room View
- [ ] Navigate to Calendar
- [ ] Find appointment
- [ ] Verify room assigned correctly
- [ ] Open appointment
- [ ] Click "View Room Schedule"
- [ ] Verify navigates back to Room View
- [ ] Verify room's schedule shown

---

### INT-6: TIME-OFF → CALENDAR BLOCKING

**Test Cases:**
- [ ] Approve time-off request
- [ ] Navigate to Calendar
- [ ] Verify provider's calendar blocked for time-off dates
- [ ] Try to schedule appointment for provider during time-off
- [ ] Verify error: "Provider is on time-off"
- [ ] Cancel time-off
- [ ] Verify calendar unblocked

---

## PERFORMANCE TESTS

### PERF-1: CALENDAR LOAD TIME

**Test Steps:**
1. Clear cache
2. Load calendar with many appointments
3. Measure load time

**Test Cases:**
- [ ] Navigate to Calendar (month with 100+ appointments)
- [ ] Measure time to interactive (should be <3 seconds)
- [ ] Verify no lag when scrolling
- [ ] Verify no lag when switching views
- [ ] Test with slow network (3G throttle)
- [ ] Verify graceful loading states

**Screenshot Required:** ✅ Network timing

---

### PERF-2: SEARCH PERFORMANCE

**Test Cases:**
- [ ] Search for client with 1000+ results
- [ ] Verify autocomplete responds quickly (<500ms)
- [ ] Verify results paginated
- [ ] Verify no UI freeze

---

### PERF-3: BULK OPERATIONS

**Test Cases:**
- [ ] Select 50 appointments
- [ ] Bulk cancel
- [ ] Verify operation completes in reasonable time (<10 seconds)
- [ ] Verify UI remains responsive

---

## SECURITY TESTS

### SEC-1: PERMISSION CHECKS

**Test as Different Roles:**

**Administrator:**
- [ ] Log in as admin
- [ ] Verify can view all appointments
- [ ] Verify can edit all appointments
- [ ] Verify can delete appointments
- [ ] Verify can approve time-off

**Provider:**
- [ ] Log in as provider
- [ ] Verify can only view own appointments
- [ ] Verify cannot edit other providers' appointments
- [ ] Verify can request time-off
- [ ] Verify cannot approve time-off

**Front Desk Staff:**
- [ ] Log in as staff
- [ ] Verify can create appointments
- [ ] Verify can check-in clients
- [ ] Verify cannot delete appointments
- [ ] Verify limited access to reports

**Screenshot Required:** ✅ Permission denied messages

---

### SEC-2: DATA PRIVACY

**Test Cases:**
- [ ] Open appointment
- [ ] Verify client info not logged in console
- [ ] Verify sensitive data masked in logs
- [ ] Verify audit trail for who viewed appointment
- [ ] Test direct URL access to appointment ID
- [ ] Verify authentication required

---

## BROWSER COMPATIBILITY

**Test Browsers:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

**For Each Browser:**
- [ ] Calendar displays correctly
- [ ] All modals open/close
- [ ] Date/time pickers work
- [ ] Drag & drop works (if supported)
- [ ] Filters work
- [ ] Search works
- [ ] No console errors

---

## FINAL CHECKLIST

### Console Errors
- [ ] No JavaScript errors on any page
- [ ] No 404 errors for assets
- [ ] No CORS errors
- [ ] No authentication errors

### Accessibility
- [ ] All images have alt text
- [ ] All buttons have aria-labels
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast passes WCAG AA

### Data Integrity
- [ ] No duplicate appointments created
- [ ] Times saved in correct timezone
- [ ] Dates saved correctly
- [ ] All fields saved when expected
- [ ] No data loss on errors

### User Experience
- [ ] Loading states shown
- [ ] Success messages clear
- [ ] Error messages helpful
- [ ] Confirmation dialogs appropriate
- [ ] Help text available
- [ ] Tooltips informative

---

## BUG TRACKING TEMPLATE

**For Each Bug Found:**

```markdown
### BUG-XXX: [Short Description]

**Module:** [Calendar / AI Assistant / Provider Comparison / Room View / Waitlist / Time-Off]
**Severity:** [Critical / High / Medium / Low]
**Priority:** [P0 / P1 / P2 / P3]

**Steps to Reproduce:**
1.
2.
3.

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happens]

**Screenshot:**
[Attach screenshot]

**Console Errors:**
[Copy any console errors]

**Browser:** [Chrome 120 / Firefox 121 / etc.]
**Environment:** [Production / Dev]
**User Role:** [Admin / Provider / Staff]

**Additional Notes:**
[Any other relevant information]
```

---

## SUMMARY REPORT TEMPLATE

```markdown
# Appointments Module Testing Summary

**Test Date:** YYYY-MM-DD
**Tester:** [Name]
**Environment:** Production
**Total Test Cases:** XXX
**Test Cases Passed:** XXX
**Test Cases Failed:** XXX
**Bugs Found:** XXX

## Module-by-Module Results

### 1. Calendar Module
- Total Tests: XX
- Passed: XX
- Failed: XX
- Critical Issues: X

### 2. AI Scheduling Assistant
- Total Tests: XX
- Passed: XX
- Failed: XX
- Critical Issues: X

### 3. Provider Comparison
- Total Tests: XX
- Passed: XX
- Failed: XX
- Critical Issues: X

### 4. Room View
- Total Tests: XX
- Passed: XX
- Failed: XX
- Critical Issues: X

### 5. Waitlist
- Total Tests: XX
- Passed: XX
- Failed: XX
- Critical Issues: X

### 6. Time-Off Requests
- Total Tests: XX
- Passed: XX
- Failed: XX
- Critical Issues: X

## Critical Blockers
[List any P0 bugs that prevent module from functioning]

## High Priority Issues
[List P1 bugs that significantly impact UX]

## Medium/Low Issues
[List P2/P3 bugs]

## Recommendations
[Any suggestions for improvements]

## Sign-Off
- [ ] All critical bugs fixed
- [ ] All high priority bugs fixed or accepted
- [ ] Module ready for production use
```

---

**END OF TESTING GUIDE**

**Total Estimated Test Cases: 800+**
**Estimated Testing Time: 40-60 hours for complete coverage**
**Recommended: Split across multiple testing sessions**
