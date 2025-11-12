# 🎯 CURSOR QUICK REFERENCE CARD

## 🔐 TEST CREDENTIALS

**Client Portal Login:**
```
URL:      http://localhost:5175/portal/login
Email:    john.doe@example.com
Password: TestClient123!
```

**System Users:**
```
Dr. John Smith (Clinician):
  Email: dr.smith@chctherapy.com
  ID: 73819251-ecba-4976-a281-3bfe5947ef94

Super Admin:
  Email: superadmin@mentalspace.com
  ID: 3b8e0405-d629-407f-ab40-c77f8b83527e
```

---

## 🚀 QUICK START

```bash
# Start backend
cd packages/backend && npm run dev

# Start frontend
cd packages/frontend && npm run dev

# Create test client
node create-test-client.js

# Verify test client
node verify-test-client.js

# Database GUI
npx prisma studio
```

---

## 📍 MODULE 7 ROUTES

### Client Portal Pages:
- `/client/symptoms` - Symptom Diary
- `/client/sleep` - Sleep Diary
- `/client/exercise` - Exercise Log
- `/portal/schedule` - Self-Scheduling

### Guardian Pages:
- `/guardian/portal` - Guardian Dashboard
- `/guardian/request-access` - Request Access
- `/client/guardian-consent` - Consent Management

### Admin Pages:
- `/admin/session-ratings` - Session Ratings
- `/admin/crisis-detections` - Crisis Alerts
- `/admin/guardian-verification` - Guardian Approval
- `/admin/scheduling-rules` - Scheduling Config
- `/admin/waitlist-management` - Waitlist Admin

### Clinician Pages:
- `/clinician/client-progress` - Progress Dashboard
- `/clinician/my-waitlist` - Clinician Waitlist

---

## ⚠️ CRITICAL SCHEMA NOTES

### ✅ VALID Client Fields:
```typescript
// Required
firstName, lastName, dateOfBirth
primaryTherapistId, createdBy, lastModifiedBy
medicalRecordNumber (unique)
addressStreet1, addressCity, addressState, addressZipCode
gender, primaryLanguage, primaryPhone

// Consent (VALID - these exist!)
treatmentConsent, treatmentConsentDate
hipaaAcknowledgment, hipaaAcknowledgmentDate
```

### ❌ INVALID Field:
```typescript
referralSource  // Does NOT exist - use ClientReferral model
```

---

## 📊 MODULE 7 STATUS

**Total Components:** 12
**Total Lines:** 13,241
**Backend:** ✅ Complete
**Frontend:** ✅ Complete
**Navigation:** ✅ Integrated
**Routes:** ✅ Registered
**Test Client:** ✅ Created & Verified

---

## 🧪 TESTING PRIORITY

1. **Client Portal Login** - Test credentials above
2. **Progress Tracking** - Add symptom/sleep/exercise data
3. **Self-Scheduling** - Book/cancel appointments
4. **Clinician View** - View client progress
5. **Admin Tools** - Test all admin functions

---

## 📁 KEY FILES

**Frontend:**
- `packages/frontend/src/App.tsx` (routes: lines 850-944)
- `packages/frontend/src/components/Layout.tsx` (nav: lines 112-159)

**Backend:**
- `packages/backend/src/routes/index.ts` (routes: lines 191-198)

**Database:**
- `packages/database/prisma/schema.prisma`
  - Client: lines 423-562
  - PortalAccount: lines 1843-1882

**Utilities:**
- `create-test-client.js`
- `verify-test-client.js`
- `check-users.js`

---

## 🎯 NEXT ACTIONS FOR CURSOR

1. Read `CURSOR_COMPREHENSIVE_PROJECT_STATUS.md` (full details)
2. Test login with test client
3. Navigate through all Module 7 pages
4. Document bugs/issues
5. Report findings

---

## 🔗 URLS

- Frontend: http://localhost:5175
- Backend: http://localhost:3001
- Prisma Studio: http://localhost:5555 (after `npx prisma studio`)

---

**For comprehensive details, see:** `CURSOR_COMPREHENSIVE_PROJECT_STATUS.md`
