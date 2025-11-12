# Module 9: Staff Management UI - Quick Start Guide

## Installation

### 1. Install Dependencies
```bash
npm install canvas-confetti
npm install --save-dev @types/canvas-confetti
```

### 2. Add Routes to App.tsx
```tsx
import StaffDirectory from './pages/Staff/StaffDirectory';
import StaffProfile from './pages/Staff/StaffProfile';
import EmploymentForm from './pages/Staff/EmploymentForm';
import OrganizationalChart from './pages/Staff/OrganizationalChart';
import OnboardingDashboard from './pages/Staff/OnboardingDashboard';
import OnboardingChecklist from './pages/Staff/OnboardingChecklist';
import MilestoneTracker from './pages/Staff/MilestoneTracker';

// In your routes:
<Route path="/staff" element={<StaffDirectory />} />
<Route path="/staff/:id" element={<StaffProfile />} />
<Route path="/staff/new" element={<EmploymentForm />} />
<Route path="/staff/:id/edit" element={<EmploymentForm />} />
<Route path="/staff/org-chart" element={<OrganizationalChart />} />
<Route path="/onboarding" element={<OnboardingDashboard />} />
<Route path="/onboarding/:id" element={<OnboardingChecklist />} />
<Route path="/onboarding/:id/milestones" element={<MilestoneTracker />} />
```

---

## Component Usage

### StaffDirectory
```tsx
// Navigate to: /staff
// Features: Grid view, search, filters, add new staff
```

### StaffProfile
```tsx
// Navigate to: /staff/:id
// Features: View employee details, credentials, training
// Tabs: Overview, Credentials, Training, Performance
```

### EmploymentForm
```tsx
// Navigate to: /staff/new (create) or /staff/:id/edit (edit)
// Features: Multi-section form, photo upload, validation
// Sections: Personal Info, Employment, Emergency Contact
```

### OrganizationalChart
```tsx
// Navigate to: /staff/org-chart
// Features: Interactive tree, zoom, search, export
```

### OnboardingDashboard
```tsx
// Navigate to: /onboarding
// Features: List all onboardings, stats, progress bars
// Click card to view checklist
```

### OnboardingChecklist
```tsx
// Navigate to: /onboarding/:id
// Features: Checklist items, add custom items, progress tracking
```

### MilestoneTracker
```tsx
// Navigate to: /onboarding/:id/milestones
// Features: Timeline view, confetti celebrations, modal details
```

---

## API Hook Usage

### useStaff Hook
```tsx
import { useStaff } from '../hooks/useStaff';

function MyComponent() {
  const { staff, loading, error, fetchStaff, createStaff } = useStaff();

  // Filter staff
  fetchStaff({ department: 'Clinical', status: 'ACTIVE' });

  // Create new staff
  await createStaff({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    department: 'Clinical',
    title: 'Therapist',
    employmentType: 'FULL_TIME',
    employmentStatus: 'ACTIVE',
    hireDate: '2025-01-01'
  });
}
```

### useOnboarding Hook
```tsx
import { useOnboarding } from '../hooks/useOnboarding';

function MyComponent() {
  const { onboardings, loading, fetchOnboardings } = useOnboarding();

  // Filter onboardings
  fetchOnboardings({ status: 'IN_PROGRESS' });
}
```

### useOnboardingChecklist Hook
```tsx
import { useOnboardingChecklist } from '../hooks/useOnboarding';

function MyComponent() {
  const { checklist, toggleChecklistItem } = useOnboardingChecklist('onboarding-id');

  // Toggle item completion
  await toggleChecklistItem('item-id', true);
}
```

### useOnboardingMilestones Hook
```tsx
import { useOnboardingMilestones } from '../hooks/useOnboarding';

function MyComponent() {
  const { milestones, completeMilestone } = useOnboardingMilestones('onboarding-id');

  // Complete milestone
  await completeMilestone('milestone-id');
}
```

---

## Status Values

### Employment Status
- `ACTIVE` - Currently employed
- `ON_LEAVE` - On leave
- `TERMINATED` - No longer employed
- `PENDING` - Pending start

### Employment Type
- `FULL_TIME` - Full-time employee
- `PART_TIME` - Part-time employee
- `CONTRACT` - Contractor
- `INTERN` - Intern

### Credential Status
- `ACTIVE` - Valid credential
- `EXPIRED` - Expired credential
- `PENDING` - Pending verification

### Training Status
- `COMPLETED` - Training completed
- `IN_PROGRESS` - Currently in progress
- `REQUIRED` - Required but not started
- `OVERDUE` - Past due date

### Onboarding Status
- `NOT_STARTED` - Not yet begun
- `IN_PROGRESS` - Currently onboarding
- `COMPLETED` - Onboarding complete
- `DELAYED` - Behind schedule

### Milestone Status
- `UPCOMING` - Scheduled for future
- `IN_PROGRESS` - Currently active
- `COMPLETED` - Successfully completed
- `MISSED` - Past due date

---

## Color Scheme Reference

### Gradients
```css
Primary: from-blue-600 to-indigo-600
Success: from-green-600 to-emerald-600
Warning: from-yellow-500 to-orange-500
Danger: from-red-500 to-pink-600
Info: from-purple-500 to-violet-600
```

### Badge Colors
```tsx
// Active status
className="bg-green-100 text-green-800 border-green-200"

// On Leave status
className="bg-yellow-100 text-yellow-800 border-yellow-200"

// Terminated status
className="bg-red-100 text-red-800 border-red-200"

// Full Time type
className="bg-purple-100 text-purple-800"
```

---

## Backend API Requirements

### Staff Endpoints
```
GET    /api/staff                          - List all staff (with filters)
GET    /api/staff/:id                      - Get single staff
POST   /api/staff                          - Create staff
PUT    /api/staff/:id                      - Update staff
DELETE /api/staff/:id                      - Delete staff
GET    /api/staff/org-chart                - Get organizational chart
POST   /api/staff/:id/photo                - Upload photo
GET    /api/staff/:id/credentials          - Get credentials
POST   /api/staff/:id/credentials          - Add credential
GET    /api/staff/:id/training             - Get training
POST   /api/staff/:id/training             - Add training
```

### Onboarding Endpoints
```
GET    /api/onboarding                     - List all onboardings (with filters)
GET    /api/onboarding/:id                 - Get single onboarding
POST   /api/onboarding                     - Create onboarding
PUT    /api/onboarding/:id                 - Update onboarding
GET    /api/onboarding/stats               - Get statistics
GET    /api/onboarding/:id/checklist       - Get checklist
POST   /api/onboarding/:id/checklist       - Add item
PUT    /api/onboarding/:id/checklist/:itemId - Update item
PATCH  /api/onboarding/:id/checklist/:itemId/toggle - Toggle completion
GET    /api/onboarding/:id/milestones      - Get milestones
POST   /api/onboarding/:id/milestones      - Add milestone
PATCH  /api/onboarding/:id/milestones/:milestoneId/complete - Complete milestone
```

---

## Common Customizations

### Change Primary Color
```tsx
// Replace all instances of:
from-blue-600 to-indigo-600

// With your brand colors:
from-brand-600 to-brand-700
```

### Add Custom Employment Type
```tsx
// In EmploymentForm.tsx, add to the array:
{ value: 'SEASONAL', label: 'Seasonal', color: 'teal' }
```

### Add Custom Checklist Category
```tsx
// In OnboardingChecklist.tsx:
<option value="Legal">Legal</option>

// And add color mapping:
Legal: 'bg-teal-100 text-teal-700'
```

### Customize Milestone Types
```tsx
// In useOnboarding.ts, extend the type:
milestoneType: 'DAY_1' | 'WEEK_1' | 'DAY_30' | 'DAY_60' | 'DAY_90' | 'DAY_180' | 'CUSTOM'
```

---

## Troubleshooting

### Issue: Confetti not showing
**Solution**: Ensure canvas-confetti is installed
```bash
npm install canvas-confetti
```

### Issue: Photos not uploading
**Solution**: Check backend supports multipart/form-data and file size limits

### Issue: Org chart not rendering
**Solution**: Ensure org chart data follows the OrgChartNode structure with recursive children

### Issue: Progress bars not animating
**Solution**: Check that completionPercentage is a number between 0-100

---

## Testing Checklist

- [ ] Can view staff directory
- [ ] Can search and filter staff
- [ ] Can click to view staff profile
- [ ] Can create new staff member
- [ ] Can edit existing staff
- [ ] Can upload staff photo
- [ ] Can view org chart
- [ ] Can expand/collapse org chart nodes
- [ ] Can zoom org chart
- [ ] Can search org chart
- [ ] Can view onboarding dashboard
- [ ] Can create new onboarding
- [ ] Can view onboarding checklist
- [ ] Can toggle checklist items
- [ ] Can add custom checklist items
- [ ] Can view milestone tracker
- [ ] Can complete milestones
- [ ] Can see confetti animation
- [ ] Responsive on mobile
- [ ] All colors render correctly

---

## Performance Tips

1. **Lazy Loading**: Consider lazy loading heavy components
```tsx
const OrganizationalChart = lazy(() => import('./pages/Staff/OrganizationalChart'));
```

2. **Memoization**: Use React.memo for list items
```tsx
const StaffCard = React.memo(({ staff }) => { ... });
```

3. **Virtualization**: For large lists, consider react-window
```bash
npm install react-window
```

4. **Image Optimization**: Compress photos before upload

5. **API Pagination**: Implement pagination for large datasets

---

## Security Considerations

1. **Authorization**: Check user role before showing admin buttons
2. **File Validation**: Validate photo file types and sizes
3. **XSS Prevention**: Sanitize user input in forms
4. **CSRF Protection**: Include CSRF tokens in requests
5. **Photo URLs**: Use signed URLs for sensitive photos

---

## Accessibility

All components include:
- ✅ Proper ARIA labels
- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ Color contrast compliance
- ✅ Focus indicators

---

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

Note: Confetti animation requires canvas support

---

## Need Help?

1. Check the main implementation report: `MODULE_9_STAFF_MANAGEMENT_UI_IMPLEMENTATION.md`
2. Review TypeScript types in the hooks files
3. Check Lucide React docs for icon usage: https://lucide.dev
4. Check canvas-confetti docs: https://github.com/catdad/canvas-confetti

---

**Quick Links**:
- [Full Implementation Report](./MODULE_9_STAFF_MANAGEMENT_UI_IMPLEMENTATION.md)
- Components: `packages/frontend/src/pages/Staff/`
- Hooks: `packages/frontend/src/hooks/`
