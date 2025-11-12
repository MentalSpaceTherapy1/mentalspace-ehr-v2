# Twilio Video Setup Guide

**Purpose:** Get real Twilio credentials for production telehealth testing
**Assigned To:** User (requires Twilio account access)
**Priority:** HIGH

---

## Current Status

**Existing Credentials (in .env):**
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY_SID=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
**Note:** Replace with your actual Twilio credentials from console.twilio.com

**Problem:** These credentials are either:
- Expired test credentials
- Placeholder/demo credentials never activated
- Invalid for production use

**Evidence:** Backend generates tokens successfully, but Twilio SDK rejects them with "Invalid Access Token" error.

---

## Option 1: Verify Existing Credentials (Quick Test)

If you have access to the Twilio Console for your account:

1. **Log into Twilio Console:** https://console.twilio.com
2. **Check Account SID:** Verify it matches your account (starts with AC...)
3. **Check API Keys:**
   - Go to Settings > API Keys
   - Look for your existing API key (starts with SK...)
   - Check if it's active/expired
4. **If expired:** Create new API key and update `.env`

---

## Option 2: Set Up New Twilio Account (Recommended)

### Step 1: Create Twilio Account
1. Go to https://www.twilio.com/try-twilio
2. Sign up for free trial (provides $15 credit)
3. Verify phone number and email

### Step 2: Get Account SID & Auth Token
1. From Twilio Console Dashboard
2. Copy **Account SID** (starts with AC...)
3. Copy **Auth Token** (click to reveal)

### Step 3: Create API Key for Video
1. Go to **Settings → API Keys**
2. Click **Create new API Key**
3. **Friendly Name:** "MentalSpace Telehealth"
4. **Key Type:** "Standard"
5. Click **Create**
6. **IMPORTANT:** Copy the **SID** and **Secret** immediately (shown only once!)

### Step 4: Enable Twilio Video
1. Go to **Explore Products**
2. Find **Twilio Video**
3. Click **Enable** or **Get Started**
4. Video is included in trial credits

### Step 5: Update .env File

Replace the credentials in `.env`:

```bash
# Twilio Video for Telehealth Sessions
TWILIO_ACCOUNT_SID=AC... # From Step 2
TWILIO_AUTH_TOKEN=...    # From Step 2
TWILIO_API_KEY_SID=SK... # From Step 3
TWILIO_API_KEY_SECRET=... # From Step 3

# Twilio SMS (for appointment reminders)
TWILIO_PHONE_NUMBER=+18556311517 # Keep existing or get new one
```

### Step 6: Disable Mock Mode

Add this to `.env` to force production mode:
```bash
TWILIO_MOCK_MODE=false
```

### Step 7: Restart Backend
```bash
# Kill current backend
# Restart to load new credentials
cd packages/backend && npm run dev
```

---

## Testing Real Twilio Video

### Quick Verification Test

1. **Check Twilio Status Endpoint:**
   ```bash
   curl http://localhost:3001/api/v1/telehealth/twilio-status
   ```

   Expected response:
   ```json
   {
     "success": true,
     "data": {
       "configured": true,
       "hasAccountSid": true,
       "hasAuthToken": true,
       "hasApiKeySid": true,
       "hasApiKeySecret": true,
       "message": "Twilio is properly configured and ready to use"
     }
   }
   ```

2. **Navigate to Telehealth Session:**
   ```
   http://localhost:5175/telehealth/session/7d04ac6c-0c6f-4f90-8b2a-9fa5c0a20d19
   ```

3. **Expected Behavior:**
   - Should NOT show "Development Mode" message
   - Should connect to actual Twilio Video room
   - Should see/hear real video feed (if camera/mic are enabled)
   - Should see "Connected to telehealth session" toast

### Full Production Test

Have Cursor run comprehensive test:
1. Create new appointment
2. Join as clinician in one browser
3. Join as client in another browser (incognito mode)
4. Verify both can see/hear each other
5. Test video controls (mute, camera, screen share)
6. Test emergency button
7. Test session end

---

## Cost Considerations

**Twilio Video Pricing (as of 2024):**
- **Free Trial:** $15.50 credit (no credit card required initially)
- **Group Rooms:** $0.0015/participant/minute
- **P2P Rooms:** $0.0005/participant/minute

**Example Cost:**
- 1-hour session with 2 participants (group room): $0.18
- Your free trial covers ~86 hours of 2-person sessions

**For Production:**
- Pay-as-you-go (no monthly fees)
- Only charged for active sessions
- Can set spending limits

---

## Security Recommendations

1. **Never commit credentials to git**
   - Already in `.gitignore` ✓

2. **Rotate API keys regularly**
   - Create new keys every 90 days

3. **Use different credentials for dev/staging/prod**
   - Current setup uses same for all
   - Consider separate Twilio accounts

4. **Monitor usage**
   - Check Twilio Console for unexpected usage
   - Set up usage alerts

---

## Troubleshooting

### "Invalid Access Token" Error
- **Cause:** Expired or incorrect API key
- **Fix:** Create new API key (Step 3 above)

### "Twilio client not initialized"
- **Cause:** Missing Account SID or Auth Token
- **Fix:** Verify all 4 credentials in `.env`

### "Room creation failed"
- **Cause:** Trial account restrictions or quota exceeded
- **Fix:** Verify phone number, upgrade account, or check quotas

### Token works but video doesn't connect
- **Cause:** Firewall, WebRTC blocked, or TURN server issues
- **Fix:** Test on different network, check browser console

---

## Next Steps

**User Action Required:**
1. [ ] Choose Option 1 (verify existing) or Option 2 (create new)
2. [ ] Get valid Twilio credentials
3. [ ] Update `.env` file
4. [ ] Set `TWILIO_MOCK_MODE=false`
5. [ ] Restart backend
6. [ ] Test /twilio-status endpoint
7. [ ] Report back: credentials working or not

**Then Claude Code will:**
- Assign Cursor to test production Twilio integration
- Validate real video connections work
- Create production deployment guide

---

**Bottom Line:** We need VALID Twilio credentials to test production video. Current credentials in `.env` are placeholders/expired.

**Recommended:** Create new free trial account (15 minutes, $15 free credit, 86 hours of testing).
