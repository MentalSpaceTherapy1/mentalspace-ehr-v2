# Module 3 Phase 2.2: Waitlist Automation - Verification Guide

## Quick Start Verification

### 1. Database Setup
```bash
cd packages/database

# Generate Prisma client (already done)
npx prisma generate

# Apply migration (when database is running)
npx prisma migrate deploy
```

### 2. Start Backend
```bash
cd packages/backend
npm run dev

# Look for these log messages:
# ✅ Database connected successfully
# ⏳ Starting Module 3 Phase 2.2 waitlist automation jobs...
# ✅ Waitlist automation jobs started
# 📅 Waitlist automation jobs started successfully
```

### 3. Start Frontend
```bash
cd packages/frontend
npm run dev
```

### 4. Test Endpoints

#### Calculate Priority Score
```bash
curl -X GET "http://localhost:3001/api/v1/waitlist-matching/{entry-id}/priority-score" \
  -H "Authorization: Bearer {token}"
```

#### Find Matching Slots
```bash
curl -X GET "http://localhost:3001/api/v1/waitlist-matching/{entry-id}/matches?daysAhead=14" \
  -H "Authorization: Bearer {token}"
```

#### Run Smart Match for All Entries
```bash
curl -X POST "http://localhost:3001/api/v1/waitlist-matching/match-all" \
  -H "Authorization: Bearer {token}"
```

#### Send Slot Offer
```bash
curl -X POST "http://localhost:3001/api/v1/waitlist-matching/{entry-id}/send-offer" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "clinicianId": "uuid",
    "appointmentDate": "2025-01-10T00:00:00.000Z",
    "startTime": "10:00",
    "endTime": "11:00",
    "notificationMethod": "Email"
  }'
```

#### Get Matching Statistics
```bash
curl -X GET "http://localhost:3001/api/v1/waitlist-matching/stats" \
  -H "Authorization: Bearer {token}"
```

#### Check Job Status
```bash
curl -X GET "http://localhost:3001/api/v1/waitlist-matching/job-status" \
  -H "Authorization: Bearer {token}"
```

### 5. Frontend Testing

1. **Navigate to Waitlist**
   - Go to http://localhost:5175/appointments/waitlist
   - Login required

2. **Verify New UI Elements**
   - ✅ Priority Score column with progress bar
   - ✅ Offers column showing count and declines
   - ✅ "Run Smart Match" button in header
   - ✅ "Smart Match" button per entry (green gradient)
   - ✅ "Send Offer" button per entry (blue)
   - ✅ Refresh icon (↻) to recalculate score
   - ✅ Enhanced action buttons layout

3. **Test Smart Matching**
   - Click "Smart Match" on an entry
   - Should show matching slots dialog
   - Verify match scores displayed (0-100%)
   - Check match reasons badges

4. **Test Offer Dialog**
   - Click "Send Offer" on an entry
   - Select notification method (Email/SMS/Portal)
   - Choose a slot from the list
   - Click "Send Offer" or "Book Direct"

5. **Test Bulk Matching**
   - Click "Run Smart Match" in header
   - Wait for processing
   - Should show toast with match count
   - Verify entries updated

### 6. Verify Cron Jobs

```bash
# Check backend logs for:
# ⏳ Starting waitlist automation job...
# ✅ Waitlist automation complete
# 📊 Waitlist metrics: matchRate: XX%, offerRate: XX%

# Jobs run on schedule:
# - processWaitlistJob: Every hour (0 * * * *)
# - updatePriorityScoresJob: Every 4 hours (0 */4 * * *)
```

## Files to Review

### Database
- ✅ `packages/database/prisma/schema.prisma` - WaitlistEntry model updated
- ✅ `packages/database/prisma/migrations/20250103_add_waitlist_automation_fields/migration.sql` - Migration created

### Backend Services (New Files)
- ✅ `packages/backend/src/services/waitlistMatching.service.ts` - Smart matching logic
- ✅ `packages/backend/src/jobs/processWaitlist.job.ts` - Cron jobs
- ✅ `packages/backend/src/controllers/waitlistMatching.controller.ts` - HTTP handlers
- ✅ `packages/backend/src/routes/waitlistMatching.routes.ts` - API routes

### Backend Integration (Modified Files)
- ✅ `packages/backend/src/routes/index.ts` - Routes registered
- ✅ `packages/backend/src/index.ts` - Jobs started/stopped

### Frontend (Modified Files)
- ✅ `packages/frontend/src/pages/Appointments/Waitlist.tsx` - Enhanced UI
- ✅ `packages/frontend/src/components/Waitlist/WaitlistOfferDialog.tsx` - New dialog

### Documentation
- ✅ `docs/prd/MODULE-3-PHASE-2.2-IMPLEMENTATION-COMPLETE.md` - Full implementation guide

## Expected Behavior

### Priority Score Calculation
- Score range: 0.0 to 1.0 (displayed as 0-100%)
- Updates automatically every 4 hours
- Can be manually triggered
- Factors: Wait time (40%), urgency (30%), referral (20%), declines (-10%)

### Smart Matching
- Finds slots within specified days ahead (default 14 days)
- Considers: Provider, days, times, insurance
- Returns matches sorted by score
- Match score threshold: 0.7 (70%) for automatic offers

### Automated Processing
- Runs every hour
- Updates all priority scores
- Matches entries to slots
- Sends offers for high-quality matches (>= 70%)
- Logs metrics to console

### Notifications
- Supports: Email, SMS, Portal
- Tracks: Sent count, last sent date
- Records: Offers sent, accepted, declined

## Troubleshooting

### Issue: Jobs not running
**Solution:** Check backend logs for startup messages. Manually trigger via API endpoint.

### Issue: No matches found
**Solution:**
- Increase daysAhead parameter
- Verify clinician schedules exist
- Check for alternate clinicians
- Review time-off/exceptions

### Issue: Priority score not updating
**Solution:**
- Manually trigger: GET /waitlist-matching/:id/priority-score
- Check entry wait time
- Verify declined offers count

### Issue: Frontend not showing new fields
**Solution:**
- Clear browser cache
- Check API response includes new fields
- Verify Prisma client regenerated

## Production Checklist

Before deploying to production:

- [ ] Database migration applied
- [ ] Prisma client regenerated
- [ ] Backend tests passing
- [ ] Frontend builds successfully
- [ ] Cron jobs configured correctly
- [ ] Monitoring setup for job execution
- [ ] API endpoints secured with auth
- [ ] Role-based permissions verified
- [ ] Documentation reviewed
- [ ] Sample data tested

## Success Metrics

Target metrics to monitor:

- **Match Accuracy:** >= 70% of entries find suitable matches
- **Average Match Score:** >= 0.75
- **Offer Acceptance Rate:** Target >= 60%
- **Processing Time:** < 5 seconds per entry
- **Job Success Rate:** >= 95% successful runs

## Next Steps

After verification:

1. Monitor cron job execution for 24 hours
2. Review matching accuracy metrics
3. Gather user feedback on UI enhancements
4. Consider ML integration for improved matching
5. Plan Phase 2.3: Provider Availability & Time-Off
