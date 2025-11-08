# VideoControls.tsx - Quick Test Checklist

## Test Environment Setup

### Prerequisites
- ✅ Twilio account with active credentials
- ✅ Backend server running with Twilio integration
- ✅ Frontend dev server running (`npm run dev`)
- ✅ Two test user accounts (clinician and client)
- ✅ Camera and microphone connected
- ✅ Two browser windows or devices for testing

### Access URL
```
http://localhost:5175/telehealth/session/{VALID_APPOINTMENT_ID}?role=clinician
http://localhost:5175/telehealth/session/{VALID_APPOINTMENT_ID}?role=client
```

---

## Quick Test Checklist

### 🎤 Audio Controls
- [ ] Microphone button visible (gray/unmuted initially)
- [ ] Click mute - button turns red, MicOff icon appears
- [ ] Remote participant confirms no audio
- [ ] Click unmute - button returns gray, Mic icon appears
- [ ] Remote participant confirms audio restored
- [ ] Button disabled when session not connected

### 📹 Video Controls
- [ ] Camera button visible (gray/on initially)
- [ ] Click video off - button turns red, VideoOff icon appears
- [ ] Local video shows placeholder (no camera feed)
- [ ] Remote participant sees no video
- [ ] Click video on - button returns gray, Video icon appears
- [ ] Local video shows camera feed
- [ ] Remote participant sees video restored
- [ ] Button disabled when session not connected

### 🖥️ Screen Share (Clinician Only)
- [ ] Screen share button visible for clinicians
- [ ] Screen share button hidden for clients
- [ ] Click share - browser dialog appears
- [ ] Select window/screen
- [ ] Button turns blue, MonitorX icon appears
- [ ] Remote participant sees shared screen
- [ ] Click stop share - button returns gray, MonitorUp icon
- [ ] Remote participant confirms screen share stopped
- [ ] Click "Stop Sharing" in browser UI - app updates automatically
- [ ] Button disabled when session not connected

### 🔴 Recording Controls (Clinician Only)
- [ ] "Start Recording" button visible for clinicians
- [ ] Recording controls hidden for clients
- [ ] Click "Start Recording"
- [ ] HIPAA consent modal appears
- [ ] Click "Cancel" - modal closes, no recording
- [ ] Click "Start Recording" again
- [ ] Click "Yes, I have consent"
- [ ] Recording indicator appears (red pulsing dot)
- [ ] "Stop Recording" button replaces start button
- [ ] Click "Stop Recording"
- [ ] Recording indicator disappears
- [ ] "Start Recording" button returns

### ☎️ End Call
- [ ] Red "End Session" button visible
- [ ] Click end call
- [ ] Confirmation prompt appears (if implemented)
- [ ] Confirm end session
- [ ] Redirected to appointments page
- [ ] No console errors
- [ ] Video/audio tracks stopped cleanly

### ⚙️ Settings Button
- [ ] Settings button visible
- [ ] Currently non-functional (placeholder)
- [ ] No errors when clicked

---

## Error Scenarios

### Permission Denied
- [ ] Deny microphone access - controls gracefully disabled
- [ ] Deny camera access - video controls disabled
- [ ] Deny screen share - error handled, no app crash

### Network Issues
- [ ] Poor network - controls continue working
- [ ] Disconnect/reconnect - state preserved
- [ ] Complete disconnect - controls disabled appropriately

### Edge Cases
- [ ] Rapid clicking controls - no race conditions
- [ ] Screen share while video off - both work independently
- [ ] Mute while speaking - immediate effect
- [ ] Multiple screen share attempts - handled correctly

---

## Browser Compatibility

Test in:
- [ ] Chrome (primary)
- [ ] Firefox
- [ ] Edge
- [ ] Safari (if available)

---

## Console Checks

### Expected Logs
✅ "Connecting to Twilio room: {roomName}"
✅ "Successfully connected to Twilio room"
✅ "Participant connected: {identity}"
✅ Track subscription messages

### No Errors For
❌ Chime SDK references
❌ "Cannot read property of undefined"
❌ Twilio connection errors (in normal operation)
❌ Memory leaks on cleanup

---

## Performance Checks

- [ ] UI responsive during video session
- [ ] No lag when toggling controls
- [ ] Screen share quality acceptable
- [ ] Audio sync maintained
- [ ] No memory leaks (check DevTools Memory tab)

---

## Pass/Fail Criteria

### PASS Requirements
✅ All audio controls functional
✅ All video controls functional
✅ Screen share works end-to-end
✅ Recording controls work (if backend ready)
✅ End call cleans up properly
✅ No console errors during normal operation
✅ Disabled states work correctly

### FAIL Indicators
❌ Any control non-functional
❌ Console errors related to Chime SDK
❌ Twilio errors during operation
❌ Memory leaks detected
❌ Poor performance or lag
❌ Broken state transitions

---

## Quick Debug Commands

```javascript
// In browser console during session:

// Check room state
window.room

// Check local tracks
window.room?.localParticipant.audioTracks
window.room?.localParticipant.videoTracks

// Check remote participants
window.room?.participants

// Check track states
Array.from(window.room?.localParticipant.audioTracks.values())[0].track.isEnabled
Array.from(window.room?.localParticipant.videoTracks.values())[0].track.isEnabled
```

---

## Testing Notes

**Date:** _____________
**Tester:** _____________
**Browser:** _____________
**Test Result:** ☐ PASS  ☐ FAIL

**Issues Found:**
_______________________________________
_______________________________________
_______________________________________

**Additional Comments:**
_______________________________________
_______________________________________
_______________________________________
