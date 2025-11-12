# 🐛 Error Report Template for Cursor

**If you encounter ANY errors during testing, fill out this template and report back to Claude Code.**

---

## ERROR: Appointment Creation Failed

### 1. UI Behavior

**What happened when you tried to create the appointment?**
- [ ] Form submitted but nothing happened
- [ ] Error message appeared (screenshot or exact text): `[PASTE ERROR MESSAGE]`
- [ ] Page crashed/froze
- [ ] Redirected to error page
- [ ] Other: `[DESCRIBE]`

**Screenshot of error (if visible):**
`[ATTACH OR DESCRIBE]`

---

### 2. Network Request (CRITICAL)

**Open Browser DevTools → Network Tab → Find the failed request**

**Request URL:**
```
[EXAMPLE: POST http://localhost:3001/api/appointments]
```

**Request Method:**
```
[EXAMPLE: POST]
```

**Request Headers:**
```json
[PASTE HEADERS, especially Content-Type and Authorization]
```

**Request Payload (Body):**
```json
[PASTE THE EXACT JSON SENT - THIS IS CRITICAL]
Example:
{
  "clientId": "...",
  "clinicianId": "...",
  "appointmentDate": "...",
  "appointmentType": "...",
  ...
}
```

---

### 3. Network Response (CRITICAL)

**Status Code:**
```
[EXAMPLE: 500, 400, 404, etc.]
```

**Response Headers:**
```
[PASTE]
```

**Response Body:**
```json
[PASTE THE EXACT ERROR RESPONSE]
Example:
{
  "error": "Validation failed",
  "message": "appointmentType is required",
  "statusCode": 400
}
```

---

### 4. Browser Console Errors

**Open Browser DevTools → Console Tab**

**Paste ALL console errors:**
```
[PASTE EVERYTHING IN RED]
Example:
Error: Failed to create appointment
    at AppointmentForm.tsx:123
    at ...
```

---

### 5. Backend Logs (MOST CRITICAL)

**Check the backend console (where npm run dev is running)**

**Paste the LAST 50 lines of backend logs:**
```
[PASTE FROM BACKEND CONSOLE]

Look for:
- The API request log
- Any error logs (in RED)
- Stack traces
- Database errors
```

**Specifically look for:**
- Lines starting with `[ERROR]` or `error`
- Lines mentioning "appointment"
- Any stack traces
- Database constraint violations
- Validation errors

---

### 6. Form Data You Entered

**What exact values did you enter in the appointment form?**

```
Client: [NAME OR ID]
Clinician: [NAME OR ID]
Appointment Type: [EXACT VALUE - THIS IS CRITICAL]
Date: [DATE]
Time: [TIME]
Duration: [DURATION]
Notes: [ANY NOTES]
```

---

### 7. Additional Context

**Appointment Type Options Available:**
```
[LIST ALL OPTIONS YOU SAW IN THE DROPDOWN]
Example:
- Individual Therapy
- Group Therapy
- Telehealth
- Initial Consultation
```

**Did you select an option that includes "Video" or "Telehealth"?**
```
[YES/NO - WHICH ONE EXACTLY]
```

---

## 📋 CHECKLIST BEFORE REPORTING

Before reporting this error, make sure you have:
- [ ] Checked Network tab for the failed request
- [ ] Copied the request payload (body)
- [ ] Copied the response body
- [ ] Copied console errors
- [ ] Copied backend logs (last 50 lines)
- [ ] Listed exact form values entered

---

## 📤 HOW TO REPORT

**Copy this template, fill in ALL sections, and report back:**

```
🐛 APPOINTMENT CREATION ERROR

UI Error: [describe what happened]

Network Request:
- URL: [paste]
- Method: [paste]
- Payload: [paste JSON]

Network Response:
- Status: [paste]
- Body: [paste JSON]

Console Errors:
[paste]

Backend Logs (last 50 lines):
[paste]

Form Values:
[paste what you entered]
```

---

## 🎯 MOST IMPORTANT INFORMATION

**If you can only provide 3 things, provide these:**

1. **Request Payload** (what JSON was sent to the server)
2. **Response Body** (what error the server returned)
3. **Backend Logs** (what the server logged when it failed)

These 3 pieces of information will allow Claude Code to diagnose and fix the issue immediately.

---

## ⚠️ COMMON ISSUES TO CHECK FIRST

Before reporting, try these quick fixes:

1. **Check if backend is running:**
   - Look for "🚀 MentalSpace EHR API is running on port 3001"
   - If not running, report: "Backend not running"

2. **Check if you're logged in:**
   - Look for Authorization header in Network request
   - If missing, you may need to log in again

3. **Check Appointment Type:**
   - Make sure you selected a TYPE from dropdown
   - Make sure it's a telehealth/video type

4. **Check required fields:**
   - Make sure all required fields are filled
   - Check for any red validation messages in the UI

---

**Ready to test! If you hit an error, fill this out and report back.** 🚀
