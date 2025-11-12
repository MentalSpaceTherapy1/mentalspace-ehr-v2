# Clinician Dashboards - Integration Guide

## Quick Start - 5 Steps to Deploy

### Step 1: Add Routes to App.tsx

**File:** `packages/frontend/src/App.tsx`

Add import at top of file:
```typescript
import ClientProgress from './pages/Clinician/ClientProgress';
import MyWaitlist from './pages/Clinician/MyWaitlist';
```

Add routes inside the `<Routes>` component (around line 200):
```typescript
{/* Clinician Routes */}
<Route
  path="/clinician/client-progress"
  element={<PrivateRoute><ClientProgress /></PrivateRoute>}
/>
<Route
  path="/clinician/my-waitlist"
  element={<PrivateRoute><MyWaitlist /></PrivateRoute>}
/>
```

---

### Step 2: Add Navigation Menu Items

**File:** `packages/frontend/src/components/Layout.tsx`

Find the navigation drawer menu items section and add:

```typescript
import { Assessment, Schedule } from '@mui/icons-material';

// Inside the drawer menu items (for clinicians only):
{user?.role === 'CLINICIAN' && (
  <>
    <ListItem
      button
      onClick={() => navigate('/clinician/client-progress')}
    >
      <ListItemIcon>
        <Assessment />
      </ListItemIcon>
      <ListItemText primary="Client Progress" />
    </ListItem>

    <ListItem
      button
      onClick={() => navigate('/clinician/my-waitlist')}
    >
      <ListItemIcon>
        <Schedule />
      </ListItemIcon>
      <ListItemText primary="My Waitlist" />
    </ListItem>
  </>
)}
```

---

### Step 3: Verify Backend API Endpoints

Test these endpoints are working:

**Progress Tracking APIs:**
```bash
# Test symptom tracking
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/v1/tracking/symptoms?clientId=CLIENT_ID

# Test sleep tracking
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/v1/tracking/sleep?clientId=CLIENT_ID

# Test exercise tracking
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/v1/tracking/exercise?clientId=CLIENT_ID

# Test health score
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/v1/tracking/analytics/health-score?clientId=CLIENT_ID&days=30
```

**Waitlist Management APIs:**
```bash
# Test waitlist fetch
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/v1/admin/waitlist?clinicianId=CLINICIAN_ID&status=ACTIVE

# Test waitlist stats
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/v1/admin/waitlist/stats?clinicianId=CLINICIAN_ID

# Test calendar
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/v1/admin/waitlist/calendar?clinicianId=CLINICIAN_ID&days=7
```

---

### Step 4: Install Dependencies (if needed)

The following packages should already be installed, but verify:

```bash
cd packages/frontend
npm list react-query
npm list recharts
npm list date-fns
npm list react-hot-toast
```

If any are missing:
```bash
npm install @tanstack/react-query recharts date-fns react-hot-toast
```

---

### Step 5: Test the Implementation

**Test ClientProgress:**
1. Login as a clinician user
2. Navigate to `/clinician/client-progress`
3. Select a client from dropdown
4. Verify overview cards display
5. Switch through all 4 tabs
6. Verify charts render
7. Add a clinical note
8. Try exporting data

**Test MyWaitlist:**
1. Login as a clinician user
2. Navigate to `/clinician/my-waitlist`
3. Verify statistics cards display
4. Verify waitlist table displays
5. Try filtering by appointment type
6. Try sorting by different columns
7. Click "Offer Slot" on an entry
8. Fill in the offer form
9. Test priority adjustment

---

## Troubleshooting

### Issue: "Cannot find module" errors

**Solution:**
Ensure chart components exist at:
- `packages/frontend/src/components/charts/SymptomTrendChart.tsx`
- `packages/frontend/src/components/charts/SleepQualityChart.tsx`
- `packages/frontend/src/components/charts/ExerciseActivityChart.tsx`
- `packages/frontend/src/components/charts/MoodCorrelationChart.tsx`
- `packages/frontend/src/components/charts/CalendarHeatmap.tsx`

Check the index file:
- `packages/frontend/src/components/charts/index.ts`

---

### Issue: API calls return 404

**Solution:**
1. Verify backend is running on `http://localhost:3001`
2. Check API base URL in `packages/frontend/src/lib/api.ts`
3. Ensure backend routes are registered
4. Check CORS settings

---

### Issue: Charts not rendering

**Solution:**
1. Check browser console for errors
2. Verify Recharts is installed: `npm list recharts`
3. Check data format matches expected interface
4. Try wrapping chart in `<ResponsiveContainer>`

---

### Issue: "No data available" messages

**Solution:**
1. Verify backend has data for selected client
2. Check network tab for API responses
3. Verify query keys in React Query DevTools
4. Check date range filter settings

---

### Issue: Permission errors

**Solution:**
1. Verify user has role === 'CLINICIAN'
2. Check JWT token includes correct permissions
3. Verify backend authorization middleware
4. Check route guards in PrivateRoute component

---

## Optional Enhancements

### Add Dashboard Cards to Main Dashboard

**File:** `packages/frontend/src/pages/Dashboard.tsx`

Add quick links for clinicians:

```typescript
{user?.role === 'CLINICIAN' && (
  <Grid container spacing={3} sx={{ mt: 2 }}>
    <Grid item xs={12} md={6}>
      <Card>
        <CardActionArea onClick={() => navigate('/clinician/client-progress')}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Assessment sx={{ fontSize: 48, color: 'primary.main' }} />
              <Box>
                <Typography variant="h6">Client Progress</Typography>
                <Typography variant="body2" color="text.secondary">
                  Track client self-monitoring and progress
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </CardActionArea>
      </Card>
    </Grid>

    <Grid item xs={12} md={6}>
      <Card>
        <CardActionArea onClick={() => navigate('/clinician/my-waitlist')}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Schedule sx={{ fontSize: 48, color: 'primary.main' }} />
              <Box>
                <Typography variant="h6">My Waitlist</Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage clients waiting for appointments
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </CardActionArea>
      </Card>
    </Grid>
  </Grid>
)}
```

---

### Enable Deep Linking

Both pages support URL parameters for deep linking:

**ClientProgress:**
```
/clinician/client-progress?clientId=123&tab=symptoms
/clinician/client-progress?clientId=456&tab=sleep
/clinician/client-progress?clientId=789&tab=exercise
/clinician/client-progress?clientId=101&tab=analytics
```

**MyWaitlist:**
```
/clinician/my-waitlist
```

You can create direct links from other parts of the app:
```typescript
// From client profile page
<Button
  onClick={() => navigate(`/clinician/client-progress?clientId=${client.id}`)}
>
  View Progress
</Button>

// From appointment calendar
<Button
  onClick={() => navigate('/clinician/my-waitlist')}
>
  Manage Waitlist
</Button>
```

---

### Add Breadcrumbs

**File:** `packages/frontend/src/pages/Clinician/ClientProgress.tsx`

Add at top of return statement (line ~530):

```typescript
<Breadcrumbs sx={{ mb: 2 }}>
  <Link href="/">Home</Link>
  <Link href="/clinician">Clinician</Link>
  <Typography color="text.primary">Client Progress</Typography>
</Breadcrumbs>
```

---

### Enable Notifications

For real-time updates, add WebSocket connection:

**File:** `packages/frontend/src/lib/socket.ts` (create if doesn't exist)

```typescript
import io from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: {
    token: localStorage.getItem('token'),
  },
});

socket.on('waitlist:offer:accepted', (data) => {
  toast.success(`${data.clientName} accepted your appointment offer!`);
  queryClient.invalidateQueries(['pendingOffers']);
});

socket.on('waitlist:offer:declined', (data) => {
  toast.info(`${data.clientName} declined your appointment offer`);
  queryClient.invalidateQueries(['pendingOffers']);
});

export default socket;
```

Then import in MyWaitlist.tsx:
```typescript
import socket from '../../lib/socket';

// In component
useEffect(() => {
  socket.connect();
  return () => socket.disconnect();
}, []);
```

---

## Testing Checklist

### Manual Testing

**ClientProgress Page:**
- [ ] Page loads without errors
- [ ] Client autocomplete works
- [ ] Recently viewed clients appear first
- [ ] Overview cards display correct data
- [ ] Health score color matches value
- [ ] Engagement percentage calculates correctly
- [ ] Streak counts are accurate
- [ ] Alerts count is correct
- [ ] Date range toggle (7/30/90 days) works
- [ ] Symptoms tab displays
  - [ ] Trend chart renders
  - [ ] Frequency bar chart renders
  - [ ] Key insights card populates
  - [ ] Mood pie chart renders
  - [ ] Recent logs table displays
  - [ ] Export button works
- [ ] Sleep tab displays
  - [ ] Quality chart renders
  - [ ] Calendar heatmap renders
  - [ ] Metrics card populates
  - [ ] Recommendations appear
  - [ ] Recent logs table displays
- [ ] Exercise tab displays
  - [ ] Weekly activity chart renders
  - [ ] Activity pie chart renders
  - [ ] Stats card populates
  - [ ] Recent logs table displays
- [ ] Analytics tab displays
  - [ ] Patterns detected
  - [ ] Correlation matrix shows
  - [ ] Health score breakdown displays
- [ ] Clinical notes section works
  - [ ] Can type in text area
  - [ ] Save button works
  - [ ] Previous notes display
  - [ ] Timestamps are correct
- [ ] Export full report works
  - [ ] PDF downloads
  - [ ] Contains all sections

**MyWaitlist Page:**
- [ ] Page loads without errors
- [ ] Statistics cards display
  - [ ] Total waiting count
  - [ ] High priority count
  - [ ] Average wait time
  - [ ] This week's matches
- [ ] Waitlist table displays
  - [ ] All active entries show
  - [ ] Client info is correct
  - [ ] Appointment types formatted
  - [ ] Preferences display as chips
  - [ ] Priority badges color-coded
  - [ ] Days waiting calculated
- [ ] Filters work
  - [ ] Appointment type dropdown
  - [ ] Priority range slider
  - [ ] Table updates in real-time
- [ ] Sorting works
  - [ ] Priority sort (asc/desc)
  - [ ] Wait time sort
  - [ ] Name sort
  - [ ] Arrow indicators display
- [ ] Offer slot dialog
  - [ ] Opens on button click
  - [ ] Date defaults to tomorrow
  - [ ] Time picker works
  - [ ] Duration auto-fills
  - [ ] Preview shows correct message
  - [ ] Send button works
  - [ ] Success toast appears
- [ ] Priority adjustment
  - [ ] Quick buttons (+5, -5) work
  - [ ] Dialog opens for manual
  - [ ] Slider works
  - [ ] Reason required for large changes
  - [ ] Update saves correctly
- [ ] Pending offers table
  - [ ] Shows pending offers
  - [ ] Expiration countdown updates
  - [ ] Cancel button works
- [ ] Recent matches table
  - [ ] Shows accepted offers
  - [ ] Last 30 days filter works
  - [ ] View appointment button works
- [ ] Calendar widget
  - [ ] Next 7 days display
  - [ ] Scheduled count correct
  - [ ] Available slots count correct
  - [ ] Matching entries badge shows
  - [ ] Expand/collapse works
  - [ ] "Offer to Top Match" works
- [ ] Auto-refresh toggle works
- [ ] Real-time updates work (if WebSocket enabled)

---

## Performance Benchmarks

Run these tests to ensure performance:

```bash
# Build production bundle
npm run build

# Analyze bundle size
npm run analyze

# Run Lighthouse audit
lighthouse http://localhost:3000/clinician/client-progress --view

# Expected scores:
# Performance: >90
# Accessibility: >95
# Best Practices: >95
# SEO: >90
```

---

## Support & Maintenance

### Common Questions

**Q: How do I add a new chart type?**
A: Create component in `packages/frontend/src/components/charts/`, export from index.ts, import in page.

**Q: How do I add a new tab to ClientProgress?**
A: Add tab to `<Tabs>`, create content section with conditional render based on `activeTab`.

**Q: How do I customize the date range options?**
A: Modify the `ToggleButtonGroup` in ClientProgress.tsx (currently 7/30/90).

**Q: How do I add more waitlist filters?**
A: Add state variable, filter control, update `filteredAndSortedEntries` useMemo.

**Q: How do I change the auto-refresh interval?**
A: Modify `refetchInterval` in React Query options (currently 30000ms for waitlist, 15000ms for offers).

---

## Documentation Links

- [React Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [Recharts Docs](https://recharts.org/en-US)
- [Material-UI Docs](https://mui.com/material-ui/getting-started/overview/)
- [date-fns Docs](https://date-fns.org/docs/Getting-Started)

---

## Contact

For issues or questions about these dashboards:
1. Check this integration guide
2. Review the implementation report
3. Check browser console for errors
4. Review network tab for API issues
5. Check React Query DevTools for cache issues

---

**Last Updated:** November 9, 2025
**Version:** 1.0.0
**Status:** ✅ Ready for Production
