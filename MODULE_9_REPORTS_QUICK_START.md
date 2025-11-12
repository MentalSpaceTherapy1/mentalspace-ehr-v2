# Module 9 Reports UI - Quick Start Guide

## Installation

### 1. Install Required Dependencies

```bash
npm install recharts react-grid-layout react-beautiful-dnd @mui/x-date-pickers date-fns
```

Or with the workspace:
```bash
cd packages/frontend
npm install recharts react-grid-layout react-beautiful-dnd @mui/x-date-pickers date-fns
```

### 2. Import Components

Add to your routes configuration:

```typescript
import {
  Module9ReportsDashboard,
  ReportViewer,
  ReportBuilder,
  DashboardWidgets,
  AnalyticsCharts,
  AuditLogViewer
} from './pages/Module9Reports';
```

### 3. Configure Routes

```typescript
// In your App.tsx or routes config
<Routes>
  {/* Reports Dashboard */}
  <Route path="/reports" element={<Module9ReportsDashboard />} />

  {/* Report Viewer */}
  <Route path="/reports/:reportId" element={<ReportViewer />} />

  {/* Custom Report Builder */}
  <Route path="/reports/builder" element={<ReportBuilder />} />

  {/* Dashboard Widgets */}
  <Route path="/reports/widgets" element={<DashboardWidgets />} />

  {/* Analytics Charts */}
  <Route path="/reports/analytics" element={<AnalyticsCharts />} />

  {/* Audit Logs */}
  <Route path="/reports/audit-logs" element={<AuditLogViewer />} />
</Routes>
```

### 4. Navigation Links

Add to your main navigation:

```typescript
<MenuItem onClick={() => navigate('/reports')}>
  📊 Reports & Analytics
</MenuItem>
```

## Component Usage

### Module9ReportsDashboard

**Purpose:** Main entry point for reports system

**Features:**
- 10 report category cards
- Search and filter functionality
- Favorite reports section
- Recent reports list

**Usage:**
```typescript
import { Module9ReportsDashboard } from './pages/Module9Reports';

<Route path="/reports" element={<Module9ReportsDashboard />} />
```

**Navigation:**
- Click any report card → Navigate to ReportViewer
- Click "Create Custom Report" → Navigate to ReportBuilder
- Click "Schedule Reports" → Navigate to schedules page
- Click "Export All Data" → Open export menu

---

### ReportViewer

**Purpose:** Display generated reports with charts and data

**Features:**
- Multiple chart types (bar, line, pie, area)
- Data table with pagination
- Summary statistics
- Date range filtering
- Export options

**Usage:**
```typescript
import { ReportViewer } from './pages/Module9Reports';

<Route path="/reports/:reportId" element={<ReportViewer />} />
```

**Props:** Reads `reportId` from URL params

**Navigation:**
```typescript
navigate(`/reports/${reportId}`)
```

---

### ReportBuilder

**Purpose:** Create custom reports with wizard interface

**Features:**
- 5-step wizard
- Drag-and-drop filters and columns
- Chart type selection
- Preview pane

**Usage:**
```typescript
import { ReportBuilder } from './pages/Module9Reports';

<Route path="/reports/builder" element={<ReportBuilder />} />
```

**Steps:**
1. Select report type
2. Configure filters
3. Choose columns
4. Select chart type
5. Preview and save

---

### DashboardWidgets

**Purpose:** Build custom dashboards with drag-and-drop widgets

**Features:**
- 8 widget types
- Drag-and-drop positioning
- Resizable widgets
- Save dashboard layout

**Usage:**
```typescript
import { DashboardWidgets } from './pages/Module9Reports';

<Route path="/reports/widgets" element={<DashboardWidgets />} />
```

**Widget Types:**
- Credential Expiry
- Training Compliance
- Incident Trends
- Budget Utilization
- Staff Onboarding
- Policy Status
- Guardian Activity
- Messaging Volume

---

### AnalyticsCharts

**Purpose:** Showcase advanced analytics and trends

**Features:**
- 6+ chart types
- Time range selector
- Summary cards
- Key insights

**Usage:**
```typescript
import { AnalyticsCharts } from './pages/Module9Reports';

<Route path="/reports/analytics" element={<AnalyticsCharts />} />
```

**Chart Types:**
- Area Chart (Credential trends)
- Bar Chart (Training compliance)
- Composed Chart (Incident patterns)
- Pie Chart (Vendor performance)
- Radar Chart (Department performance)

---

### AuditLogViewer

**Purpose:** View and filter system audit logs

**Features:**
- Advanced filtering
- Event details modal
- Export audit trail
- Statistics dashboard

**Usage:**
```typescript
import { AuditLogViewer } from './pages/Module9Reports';

<Route path="/reports/audit-logs" element={<AuditLogViewer />} />
```

**Filters:**
- Action type
- Module
- User
- Date range

---

## API Hooks

### useModule9Reports

**Purpose:** Manage reports, favorites, and generation

```typescript
import { useModule9Reports } from '../hooks/useModule9Reports';

const {
  reports,              // Available reports
  favoriteReports,      // User's favorite report IDs
  recentReports,        // Recently generated reports
  loading,              // Loading state
  error,                // Error message
  toggleFavorite,       // Toggle favorite status
  generateReport,       // Generate new report
  exportReport,         // Export report
  loadRecentReports     // Refresh recent reports
} = useModule9Reports();
```

**Example:**
```typescript
// Generate a report
const reportData = await generateReport(
  'credentialing',
  [{ field: 'status', operator: 'equals', value: 'active' }],
  { startDate: '2024-01-01', endDate: '2024-12-31' }
);

// Export a report
const blob = await exportReport('report-123', 'pdf', {
  orientation: 'landscape',
  includeCharts: true
});
```

---

### useCustomReports

**Purpose:** Manage custom report definitions

```typescript
import { useCustomReports } from '../hooks/useModule9Reports';

const {
  customReports,        // User's custom reports
  loading,
  error,
  saveCustomReport,     // Save new custom report
  deleteCustomReport,   // Delete custom report
  loadCustomReports     // Refresh list
} = useCustomReports();
```

**Example:**
```typescript
// Save a custom report
await saveCustomReport({
  name: 'My Custom Report',
  description: 'Description here',
  reportType: 'credentialing',
  filters: [...],
  columns: ['column1', 'column2'],
  chartType: 'bar'
});
```

---

### useAuditLogs

**Purpose:** Query and export audit logs

```typescript
import { useAuditLogs } from '../hooks/useModule9Reports';

const {
  logs,                 // Audit log entries
  totalCount,           // Total count for pagination
  loading,
  error,
  fetchAuditLogs,       // Fetch with filters
  exportAuditLogs       // Export logs
} = useAuditLogs();
```

**Example:**
```typescript
// Fetch logs with filters
await fetchAuditLogs({
  action: 'CREATE',
  module: 'Credentialing',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  page: 1,
  limit: 25
});

// Export logs
const blob = await exportAuditLogs(filters, 'excel');
```

---

### useDashboardWidgets

**Purpose:** Manage dashboard widget layouts

```typescript
import { useDashboardWidgets } from '../hooks/useModule9Reports';

const {
  widgets,              // Current widgets
  loading,
  setWidgets,           // Update widget state
  saveDashboard,        // Persist to backend
  loadDashboard         // Load from backend
} = useDashboardWidgets();
```

**Example:**
```typescript
// Add a new widget
const newWidget = {
  id: 'widget-123',
  type: 'credentialExpiry',
  title: 'Credential Expiry',
  config: {},
  position: { x: 0, y: 0, w: 4, h: 4 }
};
setWidgets([...widgets, newWidget]);

// Save dashboard
await saveDashboard(widgets);
```

---

## Styling Customization

### Color Themes

Customize report colors in the components:

```typescript
// In Module9ReportsDashboard.tsx
const reportTypes = [
  {
    id: 'credentialing',
    name: 'Credentialing Report',
    icon: '📋',
    color: '#3B82F6'  // Change this
  },
  // ...
];
```

### Gradients

Modify gradient backgrounds:

```typescript
sx={{
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  // Change colors here
}}
```

### Chart Colors

Update chart color schemes:

```typescript
const COLORS = [
  '#3B82F6',  // Blue
  '#8B5CF6',  // Purple
  '#10B981',  // Green
  // Add your colors
];
```

---

## Environment Variables

Set API URL in `.env`:

```
VITE_API_URL=http://localhost:3001
```

Or use in code:

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

---

## Testing

### Quick Test

1. Start frontend: `npm run dev`
2. Navigate to `/reports`
3. Click on report cards
4. Test search and filtering
5. Try creating a custom report
6. Explore analytics charts

### Component Tests

```typescript
import { render, screen } from '@testing-library/react';
import { Module9ReportsDashboard } from './pages/Module9Reports';

test('renders report dashboard', () => {
  render(<Module9ReportsDashboard />);
  expect(screen.getByText(/Module 9 Reports/i)).toBeInTheDocument();
});
```

---

## Troubleshooting

### Charts Not Rendering

**Issue:** Charts appear blank

**Solution:**
- Ensure data is in correct format
- Check console for Recharts errors
- Verify ResponsiveContainer has parent with height

### Drag-and-Drop Not Working

**Issue:** Widgets won't drag

**Solution:**
- Import react-grid-layout CSS: `import 'react-grid-layout/css/styles.css'`
- Check draggableHandle prop matches className

### Date Picker Issues

**Issue:** Date picker not opening

**Solution:**
- Wrap in LocalizationProvider
- Import AdapterDateFns
- Check @mui/x-date-pickers is installed

---

## Backend API Requirements

Create these endpoints for full functionality:

```typescript
// Reports
GET    /api/reports/favorites
POST   /api/reports/favorites
DELETE /api/reports/favorites/:id
GET    /api/reports/recent
POST   /api/reports/generate
POST   /api/reports/:id/export

// Custom Reports
GET    /api/custom-reports
POST   /api/custom-reports
DELETE /api/custom-reports/:id

// Audit Logs
GET    /api/audit-logs
POST   /api/audit-logs/export

// Widgets
GET    /api/dashboards/widgets
POST   /api/dashboards/widgets
```

---

## Next Steps

1. ✅ Install dependencies
2. ✅ Configure routes
3. ✅ Add navigation links
4. 🔲 Implement backend APIs
5. 🔲 Connect to real data
6. 🔲 Add authentication
7. 🔲 Test all features
8. 🔲 Deploy to production

---

## Support

For questions or issues:
- Check component documentation
- Review mock data for expected formats
- Test with included mock data first
- Verify all dependencies are installed

---

## Summary

All 7 components are ready to use with:
- Modern, colorful designs
- Rich data visualizations
- Responsive layouts
- Interactive features
- Mock data for testing
- Complete API hooks
- Comprehensive documentation

Start with the dashboard and explore each component to see all features in action!
