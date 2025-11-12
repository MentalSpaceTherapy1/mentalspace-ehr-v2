# HR Functions UI - Quick Start Guide

## Installation

```bash
# Install required dependencies
npm install react-signature-canvas recharts date-fns
```

## Component Overview

### Performance Reviews (3 Components)

**PerformanceReviewForm** - Create/edit performance reviews
```tsx
import { PerformanceReviewForm } from './pages/HR';

<PerformanceReviewForm
  employeeId="emp123"
  employeeName="John Doe"
  reviewId="rev456" // Optional for editing
  onSuccess={() => navigate('/reviews')}
  onCancel={() => navigate('/back')}
/>
```

**ReviewList** - Browse all reviews
```tsx
import { ReviewList } from './pages/HR';

<ReviewList
  onViewReview={(id) => navigate(`/review/${id}`)}
  onEditReview={(id) => navigate(`/review/${id}/edit`)}
  onSignReview={(id) => navigate(`/review/${id}/sign`)}
/>
```

**ReviewViewer** - View and sign reviews
```tsx
import { ReviewViewer } from './pages/HR';

<ReviewViewer
  reviewId="rev123"
  onClose={() => navigate('/reviews')}
/>
```

### Attendance (3 Components)

**TimeClockInterface** - Clock in/out interface
```tsx
import { TimeClockInterface } from './pages/HR';

<TimeClockInterface
  employeeId="emp123"
  employeeName="John Doe"
/>
```

**AttendanceCalendar** - Monthly attendance view
```tsx
import { AttendanceCalendar } from './pages/HR';

<AttendanceCalendar
  employeeId="emp123"
  employeeName="John Doe"
/>
```

**AttendanceReport** - Analytics and reports
```tsx
import { AttendanceReport } from './pages/HR';

<AttendanceReport
  employeeId="emp123"
  employeeName="John Doe"
/>
```

### PTO Management (3 Components)

**PTORequestForm** - Request time off
```tsx
import { PTORequestForm } from './pages/HR';

<PTORequestForm
  employeeId="emp123"
  employeeName="John Doe"
  onSuccess={() => loadRequests()}
  onCancel={() => setShowForm(false)}
/>
```

**PTOCalendar** - Team PTO schedule
```tsx
import { PTOCalendar } from './pages/HR';

<PTOCalendar
  departmentId="dept123" // Optional
/>
```

**PTOApproval** - Manager approval dashboard
```tsx
import { PTOApproval } from './pages/HR';

<PTOApproval
  managerId="mgr123" // Optional
/>
```

## API Hooks Usage

### Performance Hook
```tsx
import { usePerformance } from './hooks/usePerformance';

const MyComponent = () => {
  const {
    getReviews,
    createReview,
    signReview,
    loading,
    error
  } = usePerformance();

  const loadReviews = async () => {
    const reviews = await getReviews({ status: 'PENDING' });
  };
};
```

### Attendance Hook
```tsx
import { useAttendance } from './hooks/useAttendance';

const MyComponent = () => {
  const {
    clockIn,
    clockOut,
    getCurrentStatus,
    loading
  } = useAttendance();

  const handleClockIn = async () => {
    await clockIn('emp123');
  };
};
```

### PTO Hook
```tsx
import { usePTO } from './hooks/usePTO';

const MyComponent = () => {
  const {
    createRequest,
    approveRequest,
    getBalance,
    loading
  } = usePTO();

  const requestPTO = async () => {
    await createRequest({
      employeeId: 'emp123',
      type: 'VACATION',
      startDate: '2025-12-01',
      endDate: '2025-12-05',
      totalDays: 5,
      totalHours: 40,
    });
  };
};
```

## Color Reference

### Gradients
- Primary: `linear-gradient(135deg, #667EEA 0%, #764BA2 100%)`
- Green: `linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)`
- Red: `linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)`
- Orange: `linear-gradient(135deg, #F39C12 0%, #E67E22 100%)`
- Blue: `linear-gradient(135deg, #3498DB 0%, #2980B9 100%)`
- Purple: `linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)`

### Status Colors
```tsx
const STATUS_COLORS = {
  PRESENT: '#2ECC71',
  ABSENT: '#E74C3C',
  LATE: '#F39C12',
  PTO: '#3498DB',
  APPROVED: '#2ECC71',
  DENIED: '#E74C3C',
  PENDING: '#F39C12',
};
```

## Common Patterns

### Loading States
```tsx
{loading ? (
  <CircularProgress />
) : (
  <YourContent />
)}
```

### Error Handling
```tsx
{error && (
  <Alert severity="error">
    {error}
  </Alert>
)}
```

### Success Messages
```tsx
{successMessage && (
  <Alert severity="success">
    {successMessage}
  </Alert>
)}
```

## Routing Setup

```tsx
import {
  PerformanceReviewForm,
  ReviewList,
  ReviewViewer,
  TimeClockInterface,
  AttendanceCalendar,
  AttendanceReport,
  PTORequestForm,
  PTOCalendar,
  PTOApproval,
} from './pages/HR';

// In your routes
<Route path="/hr/reviews" element={<ReviewList />} />
<Route path="/hr/review/new" element={<PerformanceReviewForm />} />
<Route path="/hr/review/:id" element={<ReviewViewer />} />
<Route path="/hr/timeclock" element={<TimeClockInterface />} />
<Route path="/hr/attendance" element={<AttendanceCalendar />} />
<Route path="/hr/reports" element={<AttendanceReport />} />
<Route path="/hr/pto/request" element={<PTORequestForm />} />
<Route path="/hr/pto/calendar" element={<PTOCalendar />} />
<Route path="/hr/pto/approvals" element={<PTOApproval />} />
```

## Environment Variables

```env
VITE_API_URL=http://localhost:3000/api
```

## Backend API Requirements

All endpoints should return JSON and accept the following formats:

### Performance
- POST /api/performance/reviews
- GET /api/performance/reviews?status=PENDING
- PUT /api/performance/reviews/:id
- POST /api/performance/reviews/:id/sign

### Attendance
- POST /api/attendance/clock-in
- POST /api/attendance/clock-out
- GET /api/attendance/current/:employeeId
- GET /api/attendance/stats/:employeeId

### PTO
- POST /api/pto/requests
- GET /api/pto/requests?status=PENDING
- POST /api/pto/requests/:id/approve
- GET /api/pto/balance/:employeeId

## Tips

1. **Always pass employee info**: Components need employeeId and employeeName
2. **Handle callbacks**: Provide onSuccess/onCancel for forms
3. **Loading states**: All hooks provide loading boolean
4. **Error handling**: All hooks provide error state
5. **Date formatting**: Use date-fns for consistent formatting
6. **Responsive**: All components are mobile-friendly
7. **Accessibility**: Components use proper ARIA labels

## Support

For issues or questions:
1. Check the main documentation: `MODULE_9_HR_FUNCTIONS_UI_COMPLETION_REPORT.md`
2. Review component props in the source files
3. Check TypeScript interfaces in hooks

---

**Quick Start Complete** - You're ready to integrate! 🚀
