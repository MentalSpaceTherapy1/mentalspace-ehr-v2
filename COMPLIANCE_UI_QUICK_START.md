# Compliance Management UI - Quick Start Guide

## Installation

### 1. Install Dependencies
```bash
cd packages/frontend
npm install react-quill react-signature-canvas recharts
```

### 2. Import CSS (if needed)
Add to your main App.tsx or index.tsx:
```typescript
import 'react-quill/dist/quill.snow.css';
```

---

## Routes Setup

Add these routes to your React Router configuration:

```typescript
// In your router configuration (e.g., App.tsx or routes.tsx)
import PolicyLibrary from './pages/Compliance/PolicyLibrary';
import PolicyViewer from './pages/Compliance/PolicyViewer';
import PolicyForm from './pages/Compliance/PolicyForm';
import PolicyDistribution from './pages/Compliance/PolicyDistribution';
import AcknowledgmentForm from './pages/Compliance/AcknowledgmentForm';
import IncidentReportingForm from './pages/Compliance/IncidentReportingForm';
import IncidentList from './pages/Compliance/IncidentList';
import IncidentDetails from './pages/Compliance/IncidentDetails';
import InvestigationWorkflow from './pages/Compliance/InvestigationWorkflow';
import ComplianceDashboard from './pages/Compliance/ComplianceDashboard';
import IncidentTrends from './pages/Compliance/IncidentTrends';

// Routes
<Route path="/compliance">
  <Route index element={<ComplianceDashboard />} />

  {/* Policy Routes */}
  <Route path="policies" element={<PolicyLibrary />} />
  <Route path="policies/new" element={<PolicyForm />} />
  <Route path="policies/:id" element={<PolicyViewer />} />
  <Route path="policies/:id/edit" element={<PolicyForm />} />
  <Route path="policies/:id/distribute" element={<PolicyDistribution />} />
  <Route path="policies/:id/acknowledge" element={<AcknowledgmentForm />} />

  {/* Incident Routes */}
  <Route path="incidents" element={<IncidentList />} />
  <Route path="incidents/new" element={<IncidentReportingForm />} />
  <Route path="incidents/:id" element={<IncidentDetails />} />
  <Route path="incidents/:id/investigate" element={<InvestigationWorkflow />} />
  <Route path="incidents/trends" element={<IncidentTrends />} />
</Route>
```

---

## Navigation Menu

Add to your sidebar/navigation:

```typescript
const complianceMenu = {
  label: 'Compliance',
  icon: <Shield />,
  children: [
    {
      label: 'Dashboard',
      path: '/compliance',
      icon: <Dashboard />
    },
    {
      label: 'Policies',
      path: '/compliance/policies',
      icon: <Description />
    },
    {
      label: 'Incidents',
      path: '/compliance/incidents',
      icon: <Warning />
    },
    {
      label: 'Trends & Analytics',
      path: '/compliance/incidents/trends',
      icon: <TrendingUp />
    }
  ]
};
```

---

## Usage Examples

### 1. View Policies
```typescript
// Navigate to policy library
navigate('/compliance/policies');

// This will show:
// - Grid of policy cards
// - Search and filter controls
// - Color-coded categories
// - View/Acknowledge buttons
```

### 2. Create New Policy
```typescript
// Navigate to policy form
navigate('/compliance/policies/new');

// Form includes:
// - Rich text editor for content
// - Category and status selection
// - Date pickers
// - Attachment upload
// - Preview mode
```

### 3. Distribute Policy
```typescript
// After creating/editing a policy
navigate(`/compliance/policies/${policyId}/distribute`);

// Features:
// - Select recipients (Departments/Roles/Individuals)
// - Preview email notification
// - Send to multiple recipients
// - View distribution history
```

### 4. Acknowledge Policy
```typescript
// User clicks "Acknowledge" button
navigate(`/compliance/policies/${policyId}/acknowledge`);

// User will:
// 1. Read policy summary
// 2. Take quiz (if required)
// 3. Check "I understand" box
// 4. Sign digitally
// 5. Submit
```

### 5. Report Incident
```typescript
// Navigate to incident form
navigate('/compliance/incidents/new');

// Multi-step wizard:
// Step 1: Select type and severity
// Step 2: Enter details (date, time, location, description)
// Step 3: Add people involved
// Step 4: Upload photos and note immediate actions
// Step 5: Review and submit
```

### 6. View Incident
```typescript
// Click on incident from list
navigate(`/compliance/incidents/${incidentId}`);

// Shows:
// - Incident summary
// - People involved
// - Timeline of events
// - Investigation notes
// - Actions panel (assign, update status, close)
```

### 7. Investigate Incident
```typescript
// Click "Investigate" button
navigate(`/compliance/incidents/${incidentId}/investigate`);

// Investigation workflow:
// Step 1: Complete checklist
// Step 2: Root cause analysis
// Step 3: Add corrective actions
// Step 4: Add preventive actions
// Step 5: Sign off
```

---

## API Integration

### Environment Variables
Create/update `.env` file:
```env
VITE_API_URL=http://localhost:3000
```

### Custom Hooks Usage

#### usePolicy Hook
```typescript
import { usePolicy } from '../hooks/usePolicy';

function MyComponent() {
  const {
    policies,
    loading,
    error,
    fetchPolicies,
    createPolicy,
    acknowledgePolicy
  } = usePolicy();

  useEffect(() => {
    fetchPolicies({ status: 'ACTIVE' });
  }, []);

  const handleAcknowledge = async (policyId: string) => {
    const success = await acknowledgePolicy(policyId, {
      signature: 'base64-signature-data'
    });
    if (success) {
      // Handle success
    }
  };

  return (
    // Your component JSX
  );
}
```

#### useIncident Hook
```typescript
import { useIncident } from '../hooks/useIncident';

function MyComponent() {
  const {
    incidents,
    loading,
    error,
    fetchIncidents,
    createIncident,
    exportIncidents
  } = useIncident();

  useEffect(() => {
    fetchIncidents({ severity: 'HIGH' });
  }, []);

  const handleExport = async () => {
    const blob = await exportIncidents();
    if (blob) {
      // Download the file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'incidents.xlsx';
      a.click();
    }
  };

  return (
    // Your component JSX
  );
}
```

---

## Customization

### Change Colors

Edit the color constants in each component:

```typescript
// In PolicyLibrary.tsx
const categoryColors: Record<string, string> = {
  'HIPAA': '#9333EA',        // Change to your brand color
  'Clinical': '#0EA5E9',
  'Safety': '#F59E0B',
  // ... etc
};

// In IncidentList.tsx
const severityColors = {
  LOW: '#10B981',            // Change severity colors
  MEDIUM: '#F59E0B',
  HIGH: '#F97316',
  CRITICAL: '#EF4444'
};
```

### Change Gradients

```typescript
// Example gradient usage
sx={{
  background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)'
}}

// Change to your brand gradient
sx={{
  background: 'linear-gradient(135deg, #YOUR_COLOR_1 0%, #YOUR_COLOR_2 100%)'
}}
```

### Add Custom Fields

To add custom fields to forms:

```typescript
// In PolicyForm.tsx
<Grid item xs={12}>
  <TextField
    fullWidth
    label="Your Custom Field"
    value={formData.customField}
    onChange={(e) => handleChange('customField', e.target.value)}
  />
</Grid>
```

---

## Mock Data

For testing without backend, use the mock data already included:

```typescript
// PolicyLibrary.tsx uses policies from usePolicy() hook
// The hook returns empty array if API fails - add fallback:

const mockPolicies = [
  {
    id: '1',
    title: 'HIPAA Privacy Policy',
    category: 'HIPAA',
    content: '<p>Policy content here...</p>',
    version: '2.0',
    status: 'ACTIVE',
    effectiveDate: '2024-01-01',
    createdBy: 'Admin',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  }
  // ... more policies
];
```

---

## Troubleshooting

### ReactQuill Not Rendering
```typescript
// Make sure to import CSS
import 'react-quill/dist/quill.snow.css';

// Or add to index.html
<link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
```

### Signature Canvas Blank
```typescript
// Ensure canvas has proper dimensions
<SignatureCanvas
  canvasProps={{
    width: 600,
    height: 200,
    style: { width: '100%', height: '200px' }
  }}
/>
```

### Charts Not Displaying
```typescript
// Wrap charts in ResponsiveContainer
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={data}>
    {/* chart content */}
  </BarChart>
</ResponsiveContainer>
```

### API Errors
```typescript
// Check API URL in .env
console.log(import.meta.env.VITE_API_URL);

// Check network tab for failed requests
// Ensure backend is running on correct port
```

---

## Performance Tips

### 1. Lazy Load Routes
```typescript
import { lazy, Suspense } from 'react';

const PolicyLibrary = lazy(() => import('./pages/Compliance/PolicyLibrary'));

<Suspense fallback={<Loading />}>
  <Route path="/compliance/policies" element={<PolicyLibrary />} />
</Suspense>
```

### 2. Memoize Expensive Calculations
```typescript
import { useMemo } from 'react';

const filteredIncidents = useMemo(() => {
  return incidents.filter(inc =>
    inc.title.toLowerCase().includes(search.toLowerCase())
  );
}, [incidents, search]);
```

### 3. Debounce Search
```typescript
import { useState, useEffect } from 'react';

const [search, setSearch] = useState('');
const [debouncedSearch, setDebouncedSearch] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(search);
  }, 300);

  return () => clearTimeout(timer);
}, [search]);

// Use debouncedSearch for API calls
```

---

## Accessibility

All components include:
- ✅ Proper ARIA labels
- ✅ Keyboard navigation
- ✅ Focus management
- ✅ Color contrast ratios
- ✅ Screen reader support

### Example ARIA Usage
```typescript
<Button
  aria-label="Report new incident"
  aria-describedby="incident-help-text"
>
  Report Incident
</Button>
```

---

## Mobile Responsiveness

All components are responsive with breakpoints:

```typescript
<Grid container spacing={3}>
  <Grid item xs={12} sm={6} md={4} lg={3}>
    {/* xs: Mobile, sm: Tablet, md: Desktop, lg: Large */}
  </Grid>
</Grid>
```

---

## Support

For issues or questions:
1. Check component file comments
2. Review implementation report: `MODULE_9_COMPLIANCE_UI_IMPLEMENTATION_REPORT.md`
3. Check Material-UI documentation: https://mui.com
4. Check Recharts documentation: https://recharts.org

---

**Happy Coding! 🚀**
