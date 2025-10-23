# Quick Test Checklist - Phase 1 Features

**For:** Rapid production verification
**Time:** ~30 minutes for complete test

---

## 🚀 Quick Start

1. Open **3 browser tabs:**
   - Tab 1: https://mentalspaceehr.com (Admin login)
   - Tab 2: https://mentalspaceehr.com (Clinician login)
   - Tab 3: https://mentalspaceehr.com (Client portal)

2. Have ready:
   - Admin credentials
   - Clinician credentials
   - Client credentials
   - One client with an appointment

---

## ✅ Phase 1.1: Appointment Enforcement (5 min)

**As Clinician:**
- [ ] Try to create note WITHOUT appointment → Should FAIL ❌
- [ ] Create note WITH appointment → Should WORK ✅
- [ ] Verify note shows linked appointment

**Pass Criteria:** Cannot create notes without appointments

---

## ✅ Phase 1.2: Client Portal (10 min)

**As Client:**
- [ ] Login to portal
- [ ] Submit an intake form
- [ ] View billing information
- [ ] Request an appointment
- [ ] View documents

**Pass Criteria:** All portal functions work

---

## ✅ Phase 1.3: Validation Rules (3 min)

**As Clinician:**
- [ ] Create note, leave required fields blank
- [ ] Try to save → Should show validation errors ❌
- [ ] Fill required fields → Should save ✅

**Pass Criteria:** Validation rules prevent incomplete notes

---

## ✅ Phase 1.4: Electronic Signatures (5 min)

**As Clinician:**
- [ ] Create and save a draft note
- [ ] Click "Sign Note"
- [ ] Enter PIN → Note signed ✅
- [ ] Verify cannot edit signed note
- [ ] Check signature shows: date, time, auth method

**Pass Criteria:** Can sign notes with PIN/password

---

## ✅ Phase 1.5: Amendment History (7 min)

**As Clinician:**
- [ ] Open a SIGNED note
- [ ] Click "Amend Note"
- [ ] Complete 4-step wizard
- [ ] Sign amendment with PIN
- [ ] View "Amendment History" tab
- [ ] Click "View Changes" to see diff

**Pass Criteria:** Can amend signed notes with audit trail

---

## ✅ Phase 1.6: Signature Capture (5 min)

**As Clinician:**
- [ ] Go to My Profile → Signature Settings
- [ ] Draw signature with mouse
- [ ] Save signature
- [ ] Refresh page → Signature still there ✅
- [ ] Sign a note → Your signature appears

**Pass Criteria:** Can create and use digital signature

---

## 🎯 Critical Path Test (15 min)

**Complete Workflow:**
1. **Create appointment** for client
2. **Create clinical note** linked to appointment
3. **Set up signature** in profile
4. **Sign note** with PIN
5. **Amend note** (change one field)
6. **Sign amendment**
7. **View amendment history**

**If this workflow completes successfully, Phase 1 is working! ✅**

---

## 🚨 Red Flags

Stop testing and report if you see:

- ❌ Can create notes WITHOUT appointments (1.1 broken)
- ❌ Portal login fails (1.2 broken)
- ❌ No validation on required fields (1.3 broken)
- ❌ Cannot sign notes (1.4 broken)
- ❌ No "Amend Note" button on signed notes (1.5 broken)
- ❌ No "Signature Settings" in profile (1.6 broken)
- ❌ 404 errors on any endpoint
- ❌ JavaScript errors in console

---

## 📊 Quick Status Check

```bash
# Run this to verify API endpoints:
node verify-production-features.js

# Should show:
# ✅ Phase 1.3, 1.4, 1.5: DEPLOYED (AUTH REQUIRED)
```

---

## 🐛 Found an Issue?

1. **Note:** Which test failed
2. **Screenshot:** The error
3. **Check:** Browser console (F12)
4. **Report:** In Slack or create GitHub issue

---

**Estimated Total Time:** 30-35 minutes
**Best Time to Test:** During office hours (in case you find issues)
**Recommended Tester:** Clinical staff who use notes daily

---

*Quick reference for PHASE-1-UI-TESTING-GUIDE.md*
