# 🚀 START HERE - CURSOR ASSIGNMENT

**From:** Claude Code (Your Boss)
**To:** Cursor AI
**Date:** November 8, 2025
**Priority:** CRITICAL

---

## ⚡ STEP 1: Restart Backend (DO THIS FIRST!)

The `.env` file was updated with `TWILIO_MOCK_MODE=false`. Backend MUST restart.

```bash
# Stop backend if running, then:
cd packages/backend
npm run dev
```

**Wait for:** `Server started successfully on port 3001`

---

## 🎯 STEP 2: Test REAL Twilio Video (30 min)

**Good News:** Twilio credentials are VALID! Mock mode is now DISABLED.

### Test Procedure:

**Navigate to:**
```
http://localhost:5175/telehealth/session/7d04ac6c-0c6f-4f90-8b2a-9fa5c0a20d19
```

### Expected (Real Twilio):
- ✅ Real JWT token (starts with `eyJ...`, NOT `MOCK_TOKEN_`)
- ✅ "Connected to telehealth session" toast
- ✅ Camera/mic permissions requested
- ✅ Local video feed appears
- ❌ NO "Development Mode" message

### Check Console:
```
✅ Join successful, checking token type...
🔌 Connecting to Twilio room: telehealth-...
✅ Connected to Twilio room
```

### Document:
- Screenshot of working video
- Console logs
- Network request showing real token

---

## 🔍 STEP 3: System Audit (3-4 hrs)

Test ALL features in MentalSpace EHR.

**Test Credentials (LOCAL TESTING):**
```
Email: superadmin@mentalspace.com
Password: Password123!
```
*Note: brendajb@chctherapy.com is for PRODUCTION/AWS only*

**See detailed checklist:**
`CURSOR_TASK_COMPREHENSIVE_FEATURE_AUDIT.md`

### Quick Test (each module):
1. Can access?
2. Data loads?
3. Can create?
4. Can edit?
5. Any errors?

### Modules to Test:
1. ✅ Authentication
2. ✅ Appointments
3. ✅ Client Management
4. ✅ Telehealth (already tested in Step 2)
5. ✅ Settings
6. ✅ Waitlist (if exists)
7. ✅ AI Scheduling (if exists)
8. ✅ Billing (if exists)
9. ✅ Clinical Docs (if exists)
10. ✅ Security/MFA (if exists)
11. ✅ Reports (if exists)

---

## 📄 STEP 4: Create Report

**File:** `docs/testing/comprehensive-feature-audit-report.md`

**Template:**
```markdown
# Feature Audit Report
**Date:** Nov 8, 2025
**Time:** X hours

## Real Twilio Video: ✅ PASS / ❌ FAIL
- Real tokens: ✅/❌
- Video connection: ✅/❌
[Screenshots]

## Module 1: Authentication - ✅/⚠️/❌
- Feature 1: ✅ Works
- Feature 2: ❌ Broken (error details)

[Continue for all modules...]

## Top 5 Critical Issues
1. [Issue + severity]
2. [Issue + severity]
...

## Recommendations
[What to fix first]
```

---

## ✅ When Done

Report: "Testing complete - report at docs/testing/comprehensive-feature-audit-report.md"

---

**Estimated Time:** 4-5 hours
**START NOW!** 🚀

**Detailed Instructions:**
- `CURSOR_ASSIGNMENT_REAL_TWILIO_AND_AUDIT.md`
- `CURSOR_TASK_COMPREHENSIVE_FEATURE_AUDIT.md`
