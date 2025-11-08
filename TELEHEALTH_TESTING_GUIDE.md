# Telehealth Testing Guide - Phase 1

**Status:** ✅ Ready for Testing (Basic Features)
**Date:** January 7, 2025

---

## Prerequisites Completed

✅ Twilio Video credentials configured
✅ Database migration applied (emergency tracking)
✅ All Phase 1 code in place
✅ Frontend and backend servers running

---

## What's Ready to Test

### 1. Basic Video Calling
- Join telehealth session from waiting room
- Audio/video controls (mute, camera on/off)
- Screen sharing
- End call functionality

### 2. Emergency Features
- Emergency button activation
- Display of 3 national crisis hotlines:
  - 988 Suicide & Crisis Lifeline
  - Crisis Text Line (741741)
  - Veterans Crisis Line
- Client emergency contact display
- Emergency notes documentation
- Session continuation or termination

### 3. Consent Management
- Consent signing before session join
- Georgia-compliant telehealth consent form
- 4 required acknowledgment checkboxes
- Electronic signature capture
- Consent verification in waiting room

---

## Testing Steps

### Step 1: Access the Application

1. **Frontend:** http://localhost:5175
2. **Backend:** http://localhost:3001
3. **Login:** Use your existing superadmin credentials

### Step 2: Create a Test Telehealth Session

**Option A: Via Appointments**
1. Go to Appointments page
2. Create a new appointment with type "Telehealth"
3. Set date/time to now or future
4. Assign a clinician and client

**Option B: Via Direct URL**
```
http://localhost:5175/telehealth/session/{sessionId}
```

### Step 3: Test Waiting Room

1. Navigate to the telehealth session as a client
2. Verify consent status badge displays
3. If no consent: Sign consent form
4. Test device (camera/microphone)
5. Click "Join Session"

### Step 4: Test Video Controls

Once in session:

**Basic Controls:**
- Click microphone icon → Should mute/unmute audio
- Click video icon → Should toggle camera on/off
- Click screen share icon → Should share screen
- Click end call → Should end session

**Emergency Button:**
- Click emergency button (⚠️ icon)
- Verify emergency modal opens
- Check crisis hotlines display (3 resources)
- Check client emergency contact shows
- Document emergency notes (min 10 characters)
- Choose resolution:
  - "Document & Continue Session"
  - "End Session Immediately"

### Step 5: Test Consent Flow

1. **As a client without consent:**
   - Try to join session
   - Should block with "Sign Consent Required" message
   - Click "Sign Consent"
   - Fill out consent form (4 checkboxes)
   - Enter full name as signature
   - Submit

2. **Verify consent signed:**
   - Consent badge should show green "✓ Consent Valid"
   - Should now be able to test devices
   - Should be able to join session

---

## What You Should See

### Waiting Room
```
┌────────────────────────────────────┐
│  Telehealth Waiting Room           │
├────────────────────────────────────┤
│  Consent Status: [Valid/Invalid]  │
│                                    │
│  📹 Test Your Device               │
│  ├─ Camera preview                 │
│  ├─ Microphone test                │
│  └─ Audio test                     │
│                                    │
│  [Join Session] button             │
└────────────────────────────────────┘
```

### Video Session
```
┌────────────────────────────────────┐
│  Video Feed (Remote Participant)   │
│                                    │
│  ┌──────────┐                      │
│  │ Self View│                      │
│  └──────────┘                      │
└────────────────────────────────────┘
┌────────────────────────────────────┐
│  Controls:                         │
│  [🎤] [📹] [📺] [⚠️] [🔴]         │
└────────────────────────────────────┘
```

### Emergency Modal
```
┌────────────────────────────────────┐
│  ⚠️ Emergency Activated            │
├────────────────────────────────────┤
│  Client Emergency Contact:         │
│  Name: John Doe                    │
│  Phone: (555) 123-4567            │
│  Relationship: Spouse              │
├────────────────────────────────────┤
│  Crisis Resources:                 │
│                                    │
│  📞 988 Suicide & Crisis Lifeline  │
│     Call: 988                      │
│                                    │
│  📱 Crisis Text Line               │
│     Text HOME to 741741           │
│                                    │
│  🎖️ Veterans Crisis Line           │
│     Call: 1-800-273-8255 (Press 1)│
├────────────────────────────────────┤
│  Emergency Notes:                  │
│  [Textarea - min 10 characters]    │
├────────────────────────────────────┤
│  [Document & Continue]             │
│  [End Session Immediately]         │
└────────────────────────────────────┘
```

---

## Expected Behavior

### ✅ What Should Work

1. **Video connection established** via Twilio Video
2. **Audio/video mute toggles** update UI and stream
3. **Screen sharing** captures desktop/window
4. **Emergency button** opens modal with resources
5. **Emergency notes** require minimum 10 characters
6. **Consent form** blocks session join until signed
7. **Consent signature** captured with IP and timestamp

### ❌ What Won't Work Yet (Phase 2 Features)

1. **AI Transcription** - Not enabled (needs AWS Transcribe setup)
2. **AI Note Generation** - Not enabled (needs Anthropic API testing)
3. **Session Recording** - Not enabled (needs S3 bucket setup)
4. **Location Tracking** - Not enabled (Phase 2 enhancement)
5. **Crisis Resources Database** - Not enabled (Phase 2 enhancement)

---

## Troubleshooting

### Problem: "Cannot connect to Twilio"
**Solution:**
- Verify Twilio credentials in `packages/backend/.env`
- Restart backend: `cd packages/backend && npm run dev`
- Check backend logs for Twilio connection errors

### Problem: "Video/audio not working"
**Solution:**
- Grant browser permissions for camera/microphone
- Check device is not in use by another application
- Try different browser (Chrome recommended)

### Problem: "Consent form doesn't save"
**Solution:**
- Check all 4 checkboxes are selected
- Ensure full name is entered
- Check backend logs for API errors

### Problem: "Emergency contact not displaying"
**Solution:**
- Verify client has emergency contact in database
- Check client record has: `emergencyContactName`, `emergencyContactPhone`, `emergencyContactRelationship` fields

### Problem: "Database error on join session"
**Solution:**
- Verify migration applied: `cd packages/database && npx prisma migrate status`
- Check backend logs for specific error
- Ensure PostgreSQL is running

---

## Testing Checklist

### Pre-Test Setup
- [ ] Backend running on port 3001
- [ ] Frontend running on port 5175
- [ ] PostgreSQL database accessible
- [ ] Twilio credentials configured
- [ ] Migration applied successfully

### Basic Functionality
- [ ] Can access waiting room
- [ ] Consent status badge displays
- [ ] Can sign consent form
- [ ] Can test camera/microphone
- [ ] Can join video session
- [ ] Can see remote participant (if available)
- [ ] Can see self-view video

### Video Controls
- [ ] Mute button toggles microphone
- [ ] Video button toggles camera
- [ ] Screen share button works
- [ ] End call button ends session

### Emergency Features
- [ ] Emergency button opens modal
- [ ] 3 crisis hotlines display
- [ ] Client emergency contact shows
- [ ] Can enter emergency notes (10+ chars)
- [ ] Can document and continue session
- [ ] Can end session immediately
- [ ] Emergency data saved to database

### Consent Flow
- [ ] Consent form displays correctly
- [ ] All 4 checkboxes required
- [ ] Full name signature required
- [ ] Submit button enabled when complete
- [ ] Consent saved to database
- [ ] Consent badge updates to "Valid"
- [ ] Can join session after consent

---

## Backend Logs to Monitor

When testing, watch the backend console for:

```
✅ Good logs to see:
- "Twilio client initialized"
- "Telehealth session created"
- "Consent verified for client"
- "Emergency activated for session"

❌ Errors to watch for:
- "Twilio authentication failed"
- "Missing emergency contact"
- "Consent verification failed"
- "Database connection error"
```

---

## Next Steps After Testing

### If Everything Works:
1. ✅ Phase 1 telehealth is production-ready
2. 📝 Document any bugs or UX improvements
3. 🚀 Consider deploying to staging environment
4. 🎯 Decide whether to implement Phase 2 (AI features)

### If Issues Found:
1. 📋 Document specific errors with screenshots
2. 🔍 Check backend logs for stack traces
3. 🐛 Report issues for fixing
4. 🔄 Re-test after fixes applied

---

## Additional Resources

### Documentation
- [Phase 1 Completion Report](docs/agent-reports/MODULE_6_PHASE_1_COMPLETION_REPORT.md)
- [Phase 2 Completion Report](docs/agent-reports/MODULE_6_PHASE_2_COMPLETION_REPORT.md)
- [Implementation Plan](docs/implementation-plans/MODULE_6_TELEHEALTH_IMPLEMENTATION_PLAN.md)

### API Endpoints (for testing)
- `GET /api/v1/telehealth/sessions/:id` - Get session details
- `POST /api/v1/telehealth/sessions/:id/join` - Join session (creates Twilio token)
- `POST /api/v1/telehealth/sessions/:id/emergency` - Activate emergency
- `GET /api/v1/telehealth-consent/validate?clientId={id}` - Check consent status

### Database Tables to Check
- `telehealth_sessions` - Session records
- `telehealth_consents` - Consent records
- `appointments` - Appointment records with telehealth sessions

---

## Support

If you encounter issues during testing:

1. Check backend console logs
2. Check browser console (F12)
3. Verify all prerequisites met
4. Review troubleshooting section above
5. Check database records for data integrity

**Happy Testing!** 🎉
