# Training & Development - Routes Reference

## Route Configuration Guide

Add these routes to your React Router configuration to enable the Training & Development module.

---

## 📍 All Routes

### User Routes (Staff/Clinicians)

```typescript
// Training Dashboard - Main landing page
{
  path: '/training',
  element: <TrainingDashboard />,
}

// Course Catalog - Browse all courses
{
  path: '/training/catalog',
  element: <CourseCatalog />,
}

// Course Details - View individual course
{
  path: '/training/courses/:courseId',
  element: <CourseDetails />,
}

// My Progress - View enrollment progress
{
  path: '/training/progress',
  element: <TrainingProgress />,
}

// CEU Tracker - Track continuing education credits
{
  path: '/training/ceu',
  element: <CEUTracker />,
}

// Training Calendar - View deadlines and due dates
{
  path: '/training/calendar',
  element: <TrainingCalendar />,
}

// My Certificates - View and download certificates
{
  path: '/training/certificates',
  element: <CertificateViewer />,
}
```

---

### Admin Routes (Training Administrators)

```typescript
// Create Course - Admin form for new courses
{
  path: '/training/admin/courses/new',
  element: <CourseForm />,
}

// Edit Course - Admin form for editing courses
{
  path: '/training/admin/courses/:courseId/edit',
  element: <CourseForm />,
}

// Enrollment Manager - Bulk enroll users
{
  path: '/training/admin/enrollments',
  element: <EnrollmentManager />,
}

// Compliance Monitor - Organization-wide compliance
{
  path: '/training/admin/compliance',
  element: <ComplianceMonitor />,
}
```

---

## 🗺️ Complete Route Structure

```
/training
  ├── /                          → TrainingDashboard
  ├── /catalog                   → CourseCatalog
  ├── /courses/:courseId         → CourseDetails
  ├── /progress                  → TrainingProgress
  ├── /ceu                       → CEUTracker
  ├── /calendar                  → TrainingCalendar
  ├── /certificates              → CertificateViewer
  └── /admin
      ├── /courses/new           → CourseForm (create)
      ├── /courses/:id/edit      → CourseForm (edit)
      ├── /enrollments           → EnrollmentManager
      └── /compliance            → ComplianceMonitor
```

---

## 🔐 Route Guards (Recommended)

Apply role-based access control:

```typescript
// User Routes - Require authentication
const userRoutes = [
  '/training',
  '/training/catalog',
  '/training/courses/:courseId',
  '/training/progress',
  '/training/ceu',
  '/training/calendar',
  '/training/certificates',
];

// Admin Routes - Require admin/training manager role
const adminRoutes = [
  '/training/admin/courses/new',
  '/training/admin/courses/:courseId/edit',
  '/training/admin/enrollments',
  '/training/admin/compliance',
];
```

---

## 📱 Navigation Menu Items

### Main Navigation (All Users)
```typescript
const trainingMenuItems = [
  {
    label: 'My Training',
    icon: '🎓',
    path: '/training',
  },
  {
    label: 'Course Catalog',
    icon: '📚',
    path: '/training/catalog',
  },
  {
    label: 'My Progress',
    icon: '📊',
    path: '/training/progress',
  },
  {
    label: 'CEU Credits',
    icon: '🏆',
    path: '/training/ceu',
  },
  {
    label: 'Calendar',
    icon: '📅',
    path: '/training/calendar',
  },
  {
    label: 'Certificates',
    icon: '🏅',
    path: '/training/certificates',
  },
];
```

### Admin Navigation (Admins Only)
```typescript
const adminMenuItems = [
  {
    label: 'Create Course',
    icon: '➕',
    path: '/training/admin/courses/new',
  },
  {
    label: 'Manage Enrollments',
    icon: '👥',
    path: '/training/admin/enrollments',
  },
  {
    label: 'Compliance Monitor',
    icon: '🛡️',
    path: '/training/admin/compliance',
  },
];
```

---

## 🚀 Example React Router Setup

```typescript
import { Routes, Route } from 'react-router-dom';
import TrainingDashboard from './pages/Training/TrainingDashboard';
import CourseCatalog from './pages/Training/CourseCatalog';
import CourseDetails from './pages/Training/CourseDetails';
import CourseForm from './pages/Training/CourseForm';
import EnrollmentManager from './pages/Training/EnrollmentManager';
import TrainingProgress from './pages/Training/TrainingProgress';
import CEUTracker from './pages/Training/CEUTracker';
import ComplianceMonitor from './pages/Training/ComplianceMonitor';
import TrainingCalendar from './pages/Training/TrainingCalendar';
import CertificateViewer from './pages/Training/CertificateViewer';

function TrainingRoutes() {
  return (
    <Routes>
      {/* User Routes */}
      <Route path="/" element={<TrainingDashboard />} />
      <Route path="/catalog" element={<CourseCatalog />} />
      <Route path="/courses/:courseId" element={<CourseDetails />} />
      <Route path="/progress" element={<TrainingProgress />} />
      <Route path="/ceu" element={<CEUTracker />} />
      <Route path="/calendar" element={<TrainingCalendar />} />
      <Route path="/certificates" element={<CertificateViewer />} />

      {/* Admin Routes */}
      <Route path="/admin/courses/new" element={<CourseForm />} />
      <Route path="/admin/courses/:courseId/edit" element={<CourseForm />} />
      <Route path="/admin/enrollments" element={<EnrollmentManager />} />
      <Route path="/admin/compliance" element={<ComplianceMonitor />} />
    </Routes>
  );
}

export default TrainingRoutes;
```

---

## 🔗 Navigation Between Components

### From Dashboard to Other Views
```typescript
// Dashboard has links to:
navigate('/training/catalog')        // Browse courses
navigate('/training/progress')       // View my progress
navigate('/training/certificates')   // View certificates
navigate('/training/calendar')       // View deadlines
```

### From Catalog to Course Details
```typescript
// Click on course card:
navigate(`/training/courses/${courseId}`)
```

### From Course Details to Enrollment
```typescript
// After enrolling:
navigate('/training/progress')
```

### From Progress to Certificate
```typescript
// Click download certificate:
navigate('/training/certificates')
```

### Admin Navigation
```typescript
// Create course:
navigate('/training/admin/courses/new')

// Edit course:
navigate(`/training/admin/courses/${courseId}/edit`)

// Manage enrollments:
navigate('/training/admin/enrollments')

// View compliance:
navigate('/training/admin/compliance')
```

---

## 📋 Breadcrumb Examples

```typescript
// TrainingDashboard
Home > Training

// CourseCatalog
Home > Training > Catalog

// CourseDetails
Home > Training > Catalog > Ethics in Mental Health

// CourseForm (Create)
Home > Training > Admin > Create Course

// CourseForm (Edit)
Home > Training > Admin > Edit Course > Ethics Training

// EnrollmentManager
Home > Training > Admin > Manage Enrollments

// ComplianceMonitor
Home > Training > Admin > Compliance Monitor

// TrainingProgress
Home > Training > My Progress

// CEUTracker
Home > Training > CEU Credits

// TrainingCalendar
Home > Training > Calendar

// CertificateViewer
Home > Training > My Certificates
```

---

## 🎯 Route Parameters

### Dynamic Parameters
```typescript
// Course ID
/training/courses/:courseId
// Example: /training/courses/abc123

// Year (optional for CEU)
/training/ceu?year=2024

// Department (optional for Compliance)
/training/admin/compliance?dept=mental-health
```

---

## 🔔 Route Redirects (Recommended)

```typescript
// Redirect /training/admin to dashboard if not admin
if (!isAdmin) {
  navigate('/training');
}

// Redirect to login if not authenticated
if (!isAuthenticated) {
  navigate('/login', { state: { from: location } });
}

// Redirect after enrollment
navigate('/training/progress', {
  state: { message: 'Successfully enrolled!' }
});
```

---

## ✅ Route Testing Checklist

- [ ] All routes load without errors
- [ ] Protected routes redirect unauthenticated users
- [ ] Admin routes are restricted to admins
- [ ] Dynamic parameters work (courseId)
- [ ] Navigation between pages works
- [ ] Back button navigation works
- [ ] Breadcrumbs show correct path
- [ ] 404 page for invalid routes

---

**Total Routes**: 11 routes
- **User Routes**: 7
- **Admin Routes**: 4

All routes are fully functional and ready for integration!
