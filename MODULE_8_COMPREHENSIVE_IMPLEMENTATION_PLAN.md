# Module 8: Reporting & Analytics - Comprehensive Implementation Plan

**MentalSpaceEHR V2**
**Date**: January 10, 2025
**Current Status**: 30% Complete
**Target Status**: 100% Complete
**Execution Strategy**: 8 Parallel Specialized Agents

---

## Executive Summary

This plan addresses the **70% implementation gap** in Module 8 (Reporting & Analytics) by deploying **8 specialized agents working in parallel** to implement:

1. **Dashboard Framework** (0% → 100%)
2. **Data Visualization** (25% → 100%)
3. **Predictive Analytics** (0% → 100%)
4. **Custom Report Builder** (0% → 100%)
5. **Export Functionality** (0% → 100%)
6. **Automated Distribution** (0% → 100%)
7. **Expanded Report Library** (10 reports → 50+ reports)
8. **Database Schema** (3 models → 15+ models)

**Estimated Timeline**: 10-12 days (with 8 agents in parallel)
**Total Deliverables**: 85+ features, 40+ reports, 12+ database models

---

## Table of Contents

1. [Agent Architecture](#agent-architecture)
2. [Agent 1: Dashboard Framework Engineer](#agent-1-dashboard-framework-engineer)
3. [Agent 2: Data Visualization Specialist](#agent-2-data-visualization-specialist)
4. [Agent 3: Predictive Analytics Engineer](#agent-3-predictive-analytics-engineer)
5. [Agent 4: Report Builder Developer](#agent-4-report-builder-developer)
6. [Agent 5: Export & Integration Specialist](#agent-5-export--integration-specialist)
7. [Agent 6: Automated Distribution Engineer](#agent-6-automated-distribution-engineer)
8. [Agent 7: Report Library Expander](#agent-7-report-library-expander)
9. [Agent 8: Database Schema Architect](#agent-8-database-schema-architect)
10. [Integration & Testing Strategy](#integration--testing-strategy)
11. [Comprehensive Test Prompts for Cursor](#comprehensive-test-prompts-for-cursor)

---

## Agent Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  MODULE 8 IMPLEMENTATION                     │
│                   8 Parallel Agents                          │
└─────────────────────────────────────────────────────────────┘
         │
         ├─ Agent 1: Dashboard Framework Engineer
         │    └─ Deliverables: Dashboard system, widgets, drag-drop
         │
         ├─ Agent 2: Data Visualization Specialist
         │    └─ Deliverables: Charts, graphs, heat maps, interactive viz
         │
         ├─ Agent 3: Predictive Analytics Engineer
         │    └─ Deliverables: ML models, forecasting, risk scoring
         │
         ├─ Agent 4: Report Builder Developer
         │    └─ Deliverables: Custom report builder, query engine
         │
         ├─ Agent 5: Export & Integration Specialist
         │    └─ Deliverables: PDF/Excel/CSV export, Power BI, Tableau
         │
         ├─ Agent 6: Automated Distribution Engineer
         │    └─ Deliverables: Scheduling, email delivery, subscriptions
         │
         ├─ Agent 7: Report Library Expander
         │    └─ Deliverables: 40+ new reports (AR aging, denial analysis, etc.)
         │
         └─ Agent 8: Database Schema Architect
              └─ Deliverables: 12+ new models for all features
```

### Agent Independence Matrix

| Agent | Dependencies | Can Start Immediately | Requires Schema First |
|-------|--------------|----------------------|----------------------|
| Agent 1 | Agent 8 (Dashboard models) | ❌ No | ✅ Yes |
| Agent 2 | None | ✅ Yes | ❌ No |
| Agent 3 | Agent 8 (Prediction models) | ❌ No | ✅ Yes |
| Agent 4 | Agent 8 (Report models) | ❌ No | ✅ Yes |
| Agent 5 | None | ✅ Yes | ❌ No |
| Agent 6 | Agent 8 (Schedule models) | ❌ No | ✅ Yes |
| Agent 7 | None | ✅ Yes | ❌ No |
| Agent 8 | None | ✅ Yes | ❌ No |

**Execution Strategy:**
- **Phase 1** (Day 1-2): Agent 8 completes database schema
- **Phase 2** (Day 3-10): All 8 agents work in parallel on their deliverables
- **Phase 3** (Day 11-12): Integration testing and bug fixes

---

## Agent 1: Dashboard Framework Engineer

### Mission

Build a **comprehensive, customizable dashboard system** with drag-and-drop widgets, real-time updates, and role-based configurations.

### Scope

**Target**: Dashboard Framework (0% → 100%)

### Detailed Deliverables

#### 1.1 Backend API Endpoints (8 endpoints)

**File**: `packages/backend/src/controllers/dashboard.controller.ts` (NEW)

```typescript
// Dashboard Configuration
POST   /api/v1/dashboards              // Create new dashboard
GET    /api/v1/dashboards              // List user's dashboards
GET    /api/v1/dashboards/:id          // Get dashboard by ID
PUT    /api/v1/dashboards/:id          // Update dashboard
DELETE /api/v1/dashboards/:id          // Delete dashboard

// Widget Management
POST   /api/v1/dashboards/:id/widgets  // Add widget to dashboard
PUT    /api/v1/widgets/:widgetId       // Update widget config
DELETE /api/v1/widgets/:widgetId       // Remove widget

// Real-time Data Feeds
GET    /api/v1/dashboards/:id/data     // Get all widget data for dashboard
```

**Features**:
- ✅ Dashboard CRUD operations
- ✅ Widget CRUD operations
- ✅ Layout persistence (grid positions)
- ✅ User preferences storage
- ✅ Role-based default dashboards
- ✅ Dashboard sharing/cloning
- ✅ Auto-refresh intervals

#### 1.2 Frontend Dashboard Builder (4 components)

**Files**:
- `packages/frontend/src/pages/Dashboards/DashboardBuilder.tsx` (NEW)
- `packages/frontend/src/components/Dashboard/DashboardGrid.tsx` (NEW)
- `packages/frontend/src/components/Dashboard/WidgetLibrary.tsx` (NEW)
- `packages/frontend/src/components/Dashboard/WidgetRenderer.tsx` (NEW)

**Features**:
- ✅ Drag-and-drop dashboard builder (React Grid Layout)
- ✅ Widget library panel (30+ widget types)
- ✅ Grid layout customization
- ✅ Widget resize and reposition
- ✅ Dashboard templates (Executive, Clinical, Billing, Scheduling)
- ✅ Save/load dashboard configurations
- ✅ Dashboard preview mode
- ✅ Full-screen presentation mode

#### 1.3 Widget Library (30+ widgets)

**KPI Widgets**:
- Revenue Today/Week/Month/Year
- Active Clients Count
- KVR (Keep Visit Rate)
- Unsigned Notes Count
- No-Show Rate
- Collection Rate
- AR Balance
- Outstanding Claims

**Chart Widgets**:
- Revenue Trend (Line Chart)
- Appointments by Status (Pie Chart)
- Clinician Productivity (Bar Chart)
- Payer Mix (Donut Chart)
- Client Demographics (Stacked Bar)
- Session Volume Trend (Area Chart)

**Table Widgets**:
- Recent Appointments
- Unsigned Notes List
- Overdue Treatment Plans
- High-Value Clients
- Top Performing Clinicians

**Alert Widgets**:
- Compliance Alerts
- System Notifications
- Threshold Alerts
- Critical Items

**Gauge Widgets**:
- Capacity Utilization
- Staff Utilization
- Revenue vs Target
- Client Satisfaction Score

#### 1.4 Real-Time Updates

**Technology**: WebSockets (Socket.io)

**File**: `packages/backend/src/services/dashboard-realtime.service.ts` (NEW)

**Features**:
- ✅ WebSocket connections for live data
- ✅ Auto-refresh intervals (5s, 15s, 30s, 1m, 5m)
- ✅ Manual refresh button
- ✅ Last updated timestamp
- ✅ Connection status indicator

#### 1.5 Threshold Alerts

**File**: `packages/backend/src/services/dashboard-alerts.service.ts` (NEW)

**Features**:
- ✅ Configurable KPI thresholds
- ✅ Alert notifications on threshold breach
- ✅ Email/SMS alerts (optional)
- ✅ Alert history tracking

### Dependencies

- **Agent 8**: Dashboard, Widget, DashboardConfiguration, ThresholdAlert models
- **Agent 2**: Chart components for widget library

### Test Strategy

See [Test Prompt #1](#test-prompt-1-dashboard-framework) in Section 11.

---

## Agent 2: Data Visualization Specialist

### Mission

Transform **table-only displays** into **rich interactive visualizations** with charts, graphs, heat maps, and drill-down capabilities.

### Scope

**Target**: Data Visualization (25% → 100%)

### Detailed Deliverables

#### 2.1 Charting Library Integration

**Library**: Recharts (React-based, TypeScript-friendly)

**Installation**:
```bash
npm install recharts
```

**Alternative Libraries** (for advanced use cases):
- Chart.js with react-chartjs-2
- D3.js (for custom visualizations)
- ApexCharts

#### 2.2 Chart Components (15 components)

**Files**: `packages/frontend/src/components/charts/` (NEW)

```
charts/
├── LineChart.tsx              // Trend charts
├── BarChart.tsx               // Comparison charts
├── StackedBarChart.tsx        // Multi-series comparisons
├── PieChart.tsx               // Distribution charts
├── DonutChart.tsx             // Enhanced distribution
├── AreaChart.tsx              // Volume trends
├── ScatterPlot.tsx            // Correlation analysis
├── HeatMap.tsx                // Scheduling utilization
├── Gauge.tsx                  // KPI gauges
├── SparkLine.tsx              // Inline trend indicators
├── ComboChart.tsx             // Mixed chart types
├── RadarChart.tsx             // Multi-dimensional comparison
├── TreeMap.tsx                // Hierarchical data
├── SankeyDiagram.tsx          // Flow visualization
└── GeographicMap.tsx          // Location-based data
```

**Features for Each Chart**:
- ✅ Interactive tooltips
- ✅ Hover effects
- ✅ Click-to-drill-down
- ✅ Legend toggle
- ✅ Export as image (PNG/SVG)
- ✅ Responsive design
- ✅ Animation on load
- ✅ Custom color schemes
- ✅ Accessibility (ARIA labels)

#### 2.3 Report Visualization Enhancement

**Update Files**:
- `packages/frontend/src/pages/Reports/ReportsDashboard.tsx`
- `packages/frontend/src/components/ReportViewModal.tsx`

**Changes**:
- ✅ Replace table-only displays with chart + table combo
- ✅ Add chart type selector (Line, Bar, Pie, Table)
- ✅ Add interactive legends
- ✅ Add drill-down to detailed views
- ✅ Add comparison mode (year-over-year, month-over-month)

#### 2.4 Specific Report Visualizations

**Revenue Reports**:
- Revenue by Clinician → Bar Chart + Table
- Revenue by CPT → Donut Chart + Table
- Revenue by Payer → Pie Chart + Table
- Revenue Trend → Line Chart + Table

**Productivity Reports**:
- KVR Analysis → Bar Chart (sorted by KVR) + Table
- Sessions per Day → Area Chart + Table
- Clinician Utilization → Heat Map (clinician × weekday)

**Compliance Reports**:
- Unsigned Notes → Bar Chart (clinician × overdue days) + Table
- Treatment Plans → Gauge (completion rate) + Table

**Demographics**:
- Age Distribution → Bar Chart + Table
- Gender Distribution → Pie Chart + Table

#### 2.5 Advanced Visualizations

**Heat Maps**:
- Scheduling utilization (hour × day)
- Clinician productivity (clinician × metric)
- Client demographics (location × age group)

**Geographic Maps** (Optional):
- Client distribution by ZIP code
- Referral source locations
- Service area coverage

**Sankey Diagrams**:
- Client journey (referral → intake → treatment → discharge)
- Revenue flow (service → payer → collection)

### Dependencies

- **None** (can work independently)

### Test Strategy

See [Test Prompt #2](#test-prompt-2-data-visualization) in Section 11.

---

## Agent 3: Predictive Analytics Engineer

### Mission

Build **AI-powered predictive models** for no-show risk, dropout prediction, revenue forecasting, and demand forecasting.

### Scope

**Target**: Predictive Analytics (0% → 100%)

### Detailed Deliverables

#### 3.1 ML Model Infrastructure

**Technology Stack**:
- Python (scikit-learn, pandas, numpy)
- Node.js child_process for Python integration
- Alternative: TensorFlow.js (if pure JS required)

**Files**:
- `packages/backend/src/ml/` (NEW)
  - `models/noshow-predictor.py`
  - `models/dropout-predictor.py`
  - `models/revenue-forecaster.py`
  - `models/demand-forecaster.py`
- `packages/backend/src/services/prediction.service.ts` (NEW)

#### 3.2 Model #1: No-Show Risk Scoring

**Algorithm**: Logistic Regression

**Features**:
- Historical no-show rate (client)
- Days since last appointment
- Appointment type
- Time of day
- Day of week
- Weather (optional)
- Distance from clinic (optional)

**Output**:
- No-show probability (0-1)
- Risk level (Low, Medium, High)
- Recommended actions (confirmation call, SMS reminder)

**Training Data**:
- Use historical appointment data (last 12 months)
- Features: Appointment status, client history, appointment metadata

**Endpoint**:
```typescript
GET /api/v1/predictions/noshow/:appointmentId
Response: {
  probability: 0.35,
  riskLevel: "MEDIUM",
  recommendedActions: ["Send SMS reminder", "Call client 24h before"]
}
```

#### 3.3 Model #2: Dropout Prediction

**Algorithm**: Survival Analysis (Cox Proportional Hazards)

**Features**:
- Number of sessions completed
- Session frequency
- Treatment adherence
- Missed appointments
- Client engagement metrics
- Treatment plan progress
- Assessment scores trend

**Output**:
- Dropout probability (next 30/60/90 days)
- Risk level (Low, Medium, High)
- Recommended interventions

**Endpoint**:
```typescript
GET /api/v1/predictions/dropout/:clientId
Response: {
  probability30d: 0.15,
  probability60d: 0.28,
  probability90d: 0.42,
  riskLevel: "MEDIUM",
  recommendedInterventions: ["Check-in call", "Adjust treatment plan"]
}
```

#### 3.4 Model #3: Revenue Forecasting

**Algorithm**: ARIMA (AutoRegressive Integrated Moving Average)

**Features**:
- Historical revenue (daily, weekly, monthly)
- Seasonality patterns
- Scheduled appointments
- Payer mix trends
- Staff capacity

**Output**:
- Revenue forecast (next 7, 30, 60, 90 days)
- Confidence interval (95%)
- Trend direction (increasing, decreasing, stable)

**Endpoint**:
```typescript
GET /api/v1/predictions/revenue?period=30d
Response: {
  forecast: [
    { date: "2025-11-11", predicted: 15000, lower: 12000, upper: 18000 },
    { date: "2025-11-12", predicted: 14500, lower: 11500, upper: 17500 },
    // ... 30 days
  ],
  totalPredicted: 450000,
  trend: "increasing"
}
```

#### 3.5 Model #4: Demand Forecasting

**Algorithm**: Time Series Decomposition + ARIMA

**Features**:
- Historical appointment volume
- Seasonality (day of week, month, holidays)
- Marketing campaigns
- Referral trends
- Staff availability

**Output**:
- Appointment demand forecast (next 30 days)
- Capacity utilization prediction
- Staffing recommendations

**Endpoint**:
```typescript
GET /api/v1/predictions/demand?period=30d
Response: {
  forecast: [
    { date: "2025-11-11", predictedAppointments: 45, capacity: 50, utilization: 0.9 },
    // ... 30 days
  ],
  staffingRecommendations: [
    { date: "2025-11-11", action: "Add 1 clinician", reason: "95% utilization predicted" }
  ]
}
```

#### 3.6 Model Training & Retraining

**File**: `packages/backend/src/jobs/ml-training.job.ts` (NEW)

**Features**:
- ✅ Nightly model retraining (cron job)
- ✅ Model validation (test/train split)
- ✅ Model versioning
- ✅ Performance metrics tracking (accuracy, precision, recall)
- ✅ A/B testing for model improvements

#### 3.7 Frontend Prediction Displays

**Files**:
- `packages/frontend/src/pages/Predictions/PredictionsDashboard.tsx` (NEW)
- `packages/frontend/src/components/Predictions/NoShowRiskIndicator.tsx` (NEW)
- `packages/frontend/src/components/Predictions/DropoutRiskIndicator.tsx` (NEW)
- `packages/frontend/src/components/Predictions/RevenueForecast.tsx` (NEW)
- `packages/frontend/src/components/Predictions/DemandForecast.tsx` (NEW)

**Features**:
- ✅ Risk indicators on appointment list
- ✅ Dropout risk on client profiles
- ✅ Revenue forecast charts (line + confidence interval)
- ✅ Demand forecast heat map
- ✅ AI-powered insights and recommendations

### Dependencies

- **Agent 8**: PredictionModel, ModelTraining, PredictionHistory models

### Test Strategy

See [Test Prompt #3](#test-prompt-3-predictive-analytics) in Section 11.

---

## Agent 4: Report Builder Developer

### Mission

Build a **drag-and-drop custom report builder** allowing users to create, save, and share custom reports without coding.

### Scope

**Target**: Custom Report Builder (0% → 100%)

### Detailed Deliverables

#### 4.1 Backend Report Definition System

**File**: `packages/backend/src/controllers/custom-reports.controller.ts` (NEW)

**Endpoints**:
```typescript
POST   /api/v1/custom-reports                // Create report definition
GET    /api/v1/custom-reports                // List user's reports
GET    /api/v1/custom-reports/:id            // Get report definition
PUT    /api/v1/custom-reports/:id            // Update report definition
DELETE /api/v1/custom-reports/:id            // Delete report definition
POST   /api/v1/custom-reports/:id/execute    // Execute custom report
POST   /api/v1/custom-reports/:id/share      // Share report with users
```

#### 4.2 Query Builder Engine

**File**: `packages/backend/src/services/query-builder.service.ts` (NEW)

**Features**:
- ✅ Data source selection (Clients, Appointments, Charges, Claims, etc.)
- ✅ Field selection (drag-and-drop fields)
- ✅ Joins across tables
- ✅ Filters and conditions (WHERE clauses)
- ✅ Grouping and aggregations (GROUP BY, SUM, COUNT, AVG)
- ✅ Sorting (ORDER BY)
- ✅ Calculated fields (formulas)
- ✅ Date range filters
- ✅ Dynamic parameter placeholders

**SQL Generation**:
```typescript
// User-defined report configuration
const reportDef = {
  dataSources: ["Appointment", "Client"],
  fields: [
    { source: "Client", field: "firstName" },
    { source: "Client", field: "lastName" },
    { source: "Appointment", field: "appointmentDate" },
    { source: "Appointment", field: "status" }
  ],
  filters: [
    { field: "Appointment.status", operator: "IN", values: ["COMPLETED", "NO_SHOW"] },
    { field: "Appointment.appointmentDate", operator: "BETWEEN", values: ["2025-01-01", "2025-01-31"] }
  ],
  groupBy: ["Client.id"],
  aggregations: [
    { field: "Appointment.id", function: "COUNT", alias: "totalAppointments" }
  ],
  orderBy: [{ field: "totalAppointments", direction: "DESC" }]
};

// Generated SQL (Prisma query)
const result = await prisma.client.findMany({
  include: {
    appointments: {
      where: {
        status: { in: ["COMPLETED", "NO_SHOW"] },
        appointmentDate: { gte: "2025-01-01", lte: "2025-01-31" }
      }
    }
  }
});
// Process aggregations...
```

#### 4.3 Frontend Report Builder UI

**File**: `packages/frontend/src/pages/Reports/CustomReportBuilder.tsx` (NEW)

**Components**:
- `DataSourceSelector.tsx` - Select tables/models
- `FieldSelector.tsx` - Drag-and-drop field selection
- `FilterBuilder.tsx` - Visual filter builder
- `AggregationBuilder.tsx` - Aggregation functions
- `FormulaEditor.tsx` - Calculated field formulas
- `ReportPreview.tsx` - Live preview of results

**UI Flow**:
1. **Step 1: Data Sources** - Select tables (Clients, Appointments, etc.)
2. **Step 2: Fields** - Drag fields from left panel to report canvas
3. **Step 3: Filters** - Add WHERE conditions
4. **Step 4: Aggregations** - Add SUM, COUNT, AVG, etc.
5. **Step 5: Sorting** - Define ORDER BY
6. **Step 6: Preview** - See results
7. **Step 7: Save** - Save report definition

#### 4.4 Report Templates

**Pre-built Templates**:
- Revenue by Service Type
- Client Retention Analysis
- Clinician Productivity Comparison
- Payer Performance Analysis
- Appointment Utilization
- Treatment Outcome Trends
- Compliance Scorecard
- Financial Summary

**Template Features**:
- ✅ One-click template selection
- ✅ Customizable parameters
- ✅ Save as new report
- ✅ Template marketplace (future)

#### 4.5 Report Versioning

**Features**:
- ✅ Version history for report definitions
- ✅ Compare versions
- ✅ Rollback to previous version
- ✅ Change tracking (who modified, when)

#### 4.6 Report Sharing & Permissions

**Features**:
- ✅ Share report with specific users/roles
- ✅ Public vs private reports
- ✅ Read-only vs edit permissions
- ✅ Report cloning

### Dependencies

- **Agent 8**: ReportDefinition, ReportField, ReportFilter, ReportVersion models

### Test Strategy

See [Test Prompt #4](#test-prompt-4-custom-report-builder) in Section 11.

---

## Agent 5: Export & Integration Specialist

### Mission

Implement **data export functionality** (PDF, Excel, CSV) and **external BI tool integrations** (Power BI, Tableau).

### Scope

**Target**: Export & Integration (0% → 100%)

### Detailed Deliverables

#### 5.1 PDF Export

**Library**: Puppeteer (headless Chrome)

**Installation**:
```bash
npm install puppeteer
```

**File**: `packages/backend/src/services/export-pdf.service.ts` (NEW)

**Endpoints**:
```typescript
POST /api/v1/reports/:id/export/pdf
POST /api/v1/dashboards/:id/export/pdf
POST /api/v1/custom-reports/:id/export/pdf
```

**Features**:
- ✅ Generate PDF from HTML report
- ✅ Company logo and branding
- ✅ Page headers and footers
- ✅ Page numbers
- ✅ Table of contents (for multi-page reports)
- ✅ Print-optimized layout
- ✅ Chart rendering in PDF

**Example**:
```typescript
export async function exportReportToPDF(reportId: string, userId: string) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Generate HTML content
  const htmlContent = await generateReportHTML(reportId);

  await page.setContent(htmlContent);
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
  });

  await browser.close();

  // Save to file system or S3
  const filename = `report-${reportId}-${Date.now()}.pdf`;
  fs.writeFileSync(`./exports/${filename}`, pdf);

  return { filename, path: `./exports/${filename}` };
}
```

#### 5.2 Excel Export

**Library**: ExcelJS

**Installation**:
```bash
npm install exceljs
```

**File**: `packages/backend/src/services/export-excel.service.ts` (NEW)

**Endpoints**:
```typescript
POST /api/v1/reports/:id/export/excel
POST /api/v1/custom-reports/:id/export/excel
```

**Features**:
- ✅ Multi-sheet workbooks
- ✅ Formatted headers (bold, colors)
- ✅ Column auto-sizing
- ✅ Data types (number, date, currency)
- ✅ Formulas in cells
- ✅ Charts in Excel (optional)
- ✅ Freeze panes for headers

**Example**:
```typescript
export async function exportReportToExcel(reportId: string) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Report Data');

  // Add headers
  worksheet.columns = [
    { header: 'Client Name', key: 'clientName', width: 25 },
    { header: 'Appointment Date', key: 'appointmentDate', width: 15 },
    { header: 'Revenue', key: 'revenue', width: 12 }
  ];

  // Add data rows
  const data = await getReportData(reportId);
  data.forEach(row => worksheet.addRow(row));

  // Style headers
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F81BD' }
  };

  // Save to file
  const filename = `report-${reportId}-${Date.now()}.xlsx`;
  await workbook.xlsx.writeFile(`./exports/${filename}`);

  return { filename };
}
```

#### 5.3 CSV Export

**File**: `packages/backend/src/services/export-csv.service.ts` (NEW)

**Endpoints**:
```typescript
POST /api/v1/reports/:id/export/csv
```

**Features**:
- ✅ Simple CSV generation
- ✅ Proper escaping (commas, quotes)
- ✅ UTF-8 encoding
- ✅ BOM for Excel compatibility

**Example**:
```typescript
export async function exportReportToCSV(reportId: string) {
  const data = await getReportData(reportId);

  const csv = [
    Object.keys(data[0]).join(','), // Headers
    ...data.map(row => Object.values(row).map(v => `"${v}"`).join(','))
  ].join('\n');

  const filename = `report-${reportId}-${Date.now()}.csv`;
  fs.writeFileSync(`./exports/${filename}`, '\uFEFF' + csv); // BOM for Excel

  return { filename };
}
```

#### 5.4 Bulk Export

**Endpoint**:
```typescript
POST /api/v1/reports/bulk-export
Body: {
  reportIds: ["report1", "report2", "report3"],
  format: "PDF" | "EXCEL" | "CSV"
}
```

**Features**:
- ✅ Export multiple reports at once
- ✅ ZIP file for multiple exports
- ✅ Background job for large exports
- ✅ Email notification when complete

#### 5.5 Power BI Integration

**File**: `packages/backend/src/integrations/powerbi.integration.ts` (NEW)

**Features**:
- ✅ REST API connector for Power BI
- ✅ OData endpoint for report data
- ✅ Authentication token support
- ✅ Real-time data refresh

**OData Endpoint**:
```typescript
GET /api/v1/odata/reports/:reportId
Response: OData JSON format
```

**Power BI Connection**:
1. In Power BI Desktop: Get Data → Web
2. Enter URL: `https://mentalspace.com/api/v1/odata/reports/revenue-by-clinician`
3. Enter API token for authentication
4. Load data into Power BI

#### 5.6 Tableau Integration

**File**: `packages/backend/src/integrations/tableau.integration.ts` (NEW)

**Features**:
- ✅ Tableau Web Data Connector (WDC)
- ✅ JSON data source
- ✅ OAuth authentication
- ✅ Incremental refresh support

**Tableau WDC**:
```html
<!-- packages/frontend/public/tableau-wdc.html -->
<script src="https://connectors.tableau.com/libs/tableauwdc-2.3.latest.js"></script>
<script>
  const myConnector = tableau.makeConnector();

  myConnector.getSchema = function(schemaCallback) {
    // Define schema for Tableau
    const schema = {
      id: "mentalspace_reports",
      alias: "MentalSpace Reports",
      columns: [
        { id: "clinicianName", dataType: tableau.dataTypeEnum.string },
        { id: "revenue", dataType: tableau.dataTypeEnum.float },
        // ... more columns
      ]
    };
    schemaCallback([schema]);
  };

  myConnector.getData = function(table, doneCallback) {
    // Fetch data from MentalSpace API
    fetch('/api/v1/reports/revenue-by-clinician')
      .then(res => res.json())
      .then(data => {
        table.appendRows(data.report);
        doneCallback();
      });
  };

  tableau.registerConnector(myConnector);
</script>
```

#### 5.7 Frontend Export UI

**Update Files**:
- `packages/frontend/src/components/ReportViewModal.tsx`
- `packages/frontend/src/pages/Reports/ReportsDashboard.tsx`

**Features**:
- ✅ Export button dropdown (PDF, Excel, CSV)
- ✅ Bulk export checkbox selection
- ✅ Export progress indicator
- ✅ Download link when ready
- ✅ Export history (recent exports)

### Dependencies

- **None** (can work independently)

### Test Strategy

See [Test Prompt #5](#test-prompt-5-export--integration) in Section 11.

---

## Agent 6: Automated Distribution Engineer

### Mission

Build **automated report scheduling and distribution** with email delivery, subscriptions, and conditional triggers.

### Scope

**Target**: Automated Distribution (0% → 100%)

### Detailed Deliverables

#### 6.1 Backend Scheduling Engine

**File**: `packages/backend/src/services/report-scheduler.service.ts` (NEW)

**Features**:
- ✅ Cron-based scheduling (node-cron)
- ✅ Recurring schedules (daily, weekly, monthly, quarterly)
- ✅ One-time scheduled reports
- ✅ Custom cron expressions
- ✅ Timezone support

**Cron Job Setup**:
```typescript
import cron from 'node-cron';

export function startReportScheduler() {
  // Check for scheduled reports every minute
  cron.schedule('* * * * *', async () => {
    const dueReports = await prisma.reportSchedule.findMany({
      where: {
        nextRunDate: { lte: new Date() },
        status: 'ACTIVE'
      }
    });

    for (const schedule of dueReports) {
      await executeScheduledReport(schedule.id);
    }
  });
}
```

#### 6.2 Email Distribution System

**File**: `packages/backend/src/services/email-distribution.service.ts` (NEW)

**Library**: Nodemailer

**Installation**:
```bash
npm install nodemailer
```

**Features**:
- ✅ Email report delivery
- ✅ Multiple recipients (TO, CC, BCC)
- ✅ Distribution lists
- ✅ HTML email templates
- ✅ Attachment support (PDF, Excel, CSV)
- ✅ Inline charts (embedded images)
- ✅ Email personalization (recipient name, etc.)

**Example**:
```typescript
export async function sendReportEmail(reportId: string, recipients: string[]) {
  const report = await generateReport(reportId);
  const pdfBuffer = await exportReportToPDF(reportId);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const htmlContent = `
    <h2>MentalSpace Report: ${report.name}</h2>
    <p>Please find your scheduled report attached.</p>
    <p>Generated on: ${new Date().toLocaleDateString()}</p>
  `;

  await transporter.sendMail({
    from: 'reports@mentalspace.com',
    to: recipients.join(', '),
    subject: `MentalSpace Report: ${report.name}`,
    html: htmlContent,
    attachments: [
      {
        filename: `${report.name}.pdf`,
        content: pdfBuffer
      }
    ]
  });
}
```

#### 6.3 Subscription Management

**File**: `packages/backend/src/controllers/subscriptions.controller.ts` (NEW)

**Endpoints**:
```typescript
POST   /api/v1/subscriptions                // Subscribe to report
GET    /api/v1/subscriptions                // List user's subscriptions
PUT    /api/v1/subscriptions/:id            // Update subscription
DELETE /api/v1/subscriptions/:id            // Unsubscribe
GET    /api/v1/subscriptions/:id/history    // Delivery history
```

**Features**:
- ✅ Subscribe to specific reports
- ✅ Choose delivery frequency
- ✅ Choose delivery format (PDF, Excel, CSV)
- ✅ Delivery preferences (email, portal, both)
- ✅ Pause/resume subscriptions
- ✅ Unsubscribe link in emails

#### 6.4 Conditional Distribution

**Features**:
- ✅ Threshold-based distribution (only send if KPI exceeds threshold)
- ✅ Change detection (only send if data changed from last run)
- ✅ Exception-based (only send if anomalies detected)

**Example**:
```typescript
const schedule = await prisma.reportSchedule.create({
  data: {
    reportId: 'unsigned-notes-report',
    frequency: 'DAILY',
    distributionCondition: {
      type: 'THRESHOLD',
      field: 'unsignedNotesCount',
      operator: '>',
      value: 10
    },
    recipients: ['supervisor@mentalspace.com']
  }
});

// In scheduler:
const reportData = await executeReport(schedule.reportId);
const conditionMet = evaluateCondition(reportData, schedule.distributionCondition);

if (conditionMet) {
  await sendReportEmail(schedule.reportId, schedule.recipients);
}
```

#### 6.5 Delivery Confirmation & Retry

**Features**:
- ✅ Delivery status tracking (PENDING, SENT, FAILED)
- ✅ Retry logic for failed deliveries (3 retries with exponential backoff)
- ✅ Bounce handling
- ✅ Delivery receipts (email read tracking - optional)

**File**: `packages/backend/src/services/delivery-tracker.service.ts` (NEW)

```typescript
export async function trackDelivery(scheduleId: string, status: string) {
  await prisma.deliveryLog.create({
    data: {
      scheduleId,
      status,
      attemptedAt: new Date(),
      metadata: { /* email details */ }
    }
  });

  if (status === 'FAILED') {
    const retryCount = await getRetryCount(scheduleId);
    if (retryCount < 3) {
      // Retry after exponential backoff (5m, 15m, 30m)
      const delay = Math.pow(2, retryCount) * 5 * 60 * 1000;
      setTimeout(() => retryDelivery(scheduleId), delay);
    } else {
      // Alert admin after 3 failed attempts
      await alertAdmin(scheduleId);
    }
  }
}
```

#### 6.6 Distribution Audit Trail

**Features**:
- ✅ Log all distribution attempts
- ✅ Track recipients, timestamps, status
- ✅ Compliance audit (who received what, when)
- ✅ HIPAA-compliant logging

**Model**: DeliveryLog (from Agent 8)

#### 6.7 Frontend Subscription UI

**Files**:
- `packages/frontend/src/pages/Reports/ReportSubscriptions.tsx` (NEW)
- `packages/frontend/src/components/Reports/SubscriptionManager.tsx` (NEW)

**Features**:
- ✅ Subscribe button on reports
- ✅ Subscription management page
- ✅ Delivery history view
- ✅ Pause/resume toggle
- ✅ Unsubscribe button

### Dependencies

- **Agent 8**: ReportSchedule, Subscription, DeliveryLog, DistributionList models
- **Agent 5**: Export services for PDF/Excel/CSV generation

### Test Strategy

See [Test Prompt #6](#test-prompt-6-automated-distribution) in Section 11.

---

## Agent 7: Report Library Expander

### Mission

Expand the report library from **10 reports to 50+ reports** covering all business needs (financial, clinical, operational, compliance).

### Scope

**Target**: Report Library (20% → 100%)

### Detailed Deliverables

#### 7.1 Financial Reports (15 new reports)

**File**: `packages/backend/src/controllers/reports.controller.ts`

**New Reports**:

1. **AR Aging Report** ⚠️ **CRITICAL - MISSING**
   - Group accounts receivable by aging buckets (0-30, 31-60, 61-90, 90+ days)
   - Show total AR, average days outstanding
   - Drill-down by payer

2. **Claim Denial Analysis**
   - Denial rate by payer
   - Denial reasons (top 10)
   - Financial impact of denials
   - Trend over time

3. **Service Line Profitability**
   - Revenue by service type (individual therapy, group, testing, etc.)
   - Cost allocation (clinician time, overhead)
   - Profit margin by service

4. **Payer Performance Scorecard**
   - Payment speed by payer
   - Denial rate by payer
   - Average reimbursement rate
   - Contract compliance

5. **Revenue Variance Report**
   - Budget vs actual revenue
   - Variance analysis (favorable/unfavorable)
   - Trend comparison (YoY, MoM)

6. **Cash Flow Forecast**
   - Projected collections (next 30/60/90 days)
   - AR collection estimates
   - Upcoming expenses

7. **Write-Off Analysis**
   - Total write-offs by reason
   - Write-off rate by payer
   - Trend over time

8. **Fee Schedule Compliance**
   - Charges vs fee schedule
   - Under/over charges
   - Adjustment analysis

9. **Revenue Cycle Metrics**
   - Days in AR
   - Collection rate
   - Clean claim rate
   - First-pass resolution rate

10. **Financial Summary Dashboard**
    - Monthly revenue, expenses, net income
    - KPIs (profit margin, collection rate, AR days)
    - Trend charts

11-15. **Additional financial reports** (Bad debt, contractual adjustments, revenue by location, revenue by diagnosis, financial benchmarking)

#### 7.2 Clinical Reports (10 new reports)

**New Reports**:

1. **Treatment Outcome Trends**
   - Assessment score changes over time
   - Treatment effectiveness by modality
   - Improvement rate by diagnosis

2. **Diagnosis Distribution**
   - Client count by primary diagnosis
   - Comorbidity analysis
   - Diagnosis trends over time

3. **Treatment Modality Effectiveness**
   - Outcomes by therapy type (CBT, DBT, EMDR, etc.)
   - Session count vs improvement
   - Dropout rate by modality

4. **Care Gap Identification**
   - Clients overdue for assessments
   - Clients without treatment plans
   - Clients with missed follow-ups

5. **Clinical Quality Metrics**
   - Treatment plan completion rate
   - Assessment completion rate
   - Documentation timeliness
   - Supervision compliance

6. **Population Health Risk Stratification**
   - High-risk clients (predictive model)
   - Crisis risk indicators
   - Readmission risk

7. **Provider Performance Comparison**
   - Treatment outcomes by clinician
   - Client satisfaction by clinician
   - Productivity metrics by clinician

8. **Client Progress Tracking**
   - Goal attainment rate
   - Treatment plan adherence
   - Session frequency trends

9. **Assessment Score Trends**
   - PHQ-9, GAD-7, etc. over time
   - Improvement trajectories
   - Relapse indicators

10. **Supervision Hours Report**
    - Supervision hours by supervisee
    - Compliance with licensure requirements
    - Supervisor capacity utilization

#### 7.3 Operational Reports (10 new reports)

**New Reports**:

1. **Scheduling Utilization Heat Map**
   - Appointment slots filled vs available
   - Heat map by hour × day
   - Utilization by clinician

2. **No-Show Pattern Analysis**
   - No-show rate by day of week
   - No-show rate by time of day
   - No-show rate by client demographics
   - No-show cost impact

3. **Wait Time Analytics**
   - Average wait time from referral to intake
   - Average wait time from intake to first session
   - Wait time by appointment type
   - Wait time trends

4. **Workflow Efficiency Metrics**
   - Time to complete intake
   - Time to create treatment plan
   - Time to sign notes
   - Bottleneck identification

5. **Resource Utilization Tracking**
   - Room utilization by hour
   - Equipment usage
   - Staff utilization

6. **Client Flow Analysis**
   - Referral → Intake → Active → Discharged flow
   - Drop-off points in client journey
   - Average time in each stage

7. **Retention Rate Tracking**
   - Client retention by month
   - Dropout rate analysis
   - Retention by treatment modality

8. **Referral Source Analytics**
   - Referrals by source
   - Conversion rate by source
   - Revenue by referral source
   - ROI on marketing channels

9. **Capacity Planning Report**
   - Current capacity vs demand
   - Projected capacity needs
   - Staffing recommendations
   - Growth projections

10. **Bottleneck Identification**
    - Process bottlenecks (intake, billing, documentation)
    - Wait times by process step
    - Resource constraints

#### 7.4 Compliance Reports (5 new reports)

**New Reports**:

1. **Audit Trail Report**
   - User activity log
   - Data access audit
   - Changes to sensitive data
   - HIPAA compliance tracking

2. **Incident Reporting**
   - Security incidents
   - Privacy breaches
   - System errors
   - Corrective actions

3. **Grant Reporting Templates**
   - SAMHSA reporting
   - State grant compliance
   - Outcome metrics for funders

4. **Accreditation Reports**
   - CARF requirements
   - Joint Commission metrics
   - State licensing compliance

5. **Compliance Scorecard**
   - Overall compliance score
   - Compliance by category (clinical, billing, privacy)
   - Trend over time
   - Action items

#### 7.5 Demographic & Marketing Reports (5 new reports)

**New Reports**:

1. **Client Demographics Deep Dive**
   - Age, gender, race, ethnicity distribution
   - Insurance type distribution
   - Geographic distribution
   - Language preferences

2. **Payer Mix Analysis**
   - Client count by insurance type
   - Revenue by insurance type
   - Trends over time

3. **Marketing Campaign ROI**
   - Referrals by campaign
   - Cost per acquisition
   - Conversion rate by campaign

4. **Client Satisfaction Analysis**
   - Satisfaction scores by clinician
   - Satisfaction trends over time
   - Correlation with outcomes

5. **Market Share Analysis**
   - Client demographics vs market demographics
   - Service gaps
   - Competitive positioning

#### 7.6 Additional Reports (5 new reports)

1. **Staff Performance Dashboard**
2. **Telehealth Utilization Report**
3. **Crisis Intervention Report**
4. **Medication Management Tracking**
5. **Group Therapy Attendance**

**Total New Reports: 50 reports**

### Implementation Strategy

**Week 1-2**: Financial reports (15 reports)
**Week 2-3**: Clinical reports (10 reports)
**Week 3-4**: Operational reports (10 reports)
**Week 4**: Compliance + Demographics + Additional (15 reports)

### Dependencies

- **None** (can work independently, uses existing database schema)

### Test Strategy

See [Test Prompt #7](#test-prompt-7-report-library-expansion) in Section 11.

---

## Agent 8: Database Schema Architect

### Mission

Design and implement **12+ new database models** to support all Module 8 features (dashboards, predictions, reports, distribution).

### Scope

**Target**: Database Schema (3 models → 15+ models)

### Detailed Deliverables

#### 8.1 Dashboard Models

**File**: `packages/database/prisma/schema.prisma`

**Models to Add**:

```prisma
// Dashboard Configuration
model Dashboard {
  id          String   @id @default(uuid())
  userId      String   // Owner
  name        String
  description String?
  layout      Json     // Grid layout configuration (x, y, w, h for each widget)
  isDefault   Boolean  @default(false)
  isPublic    Boolean  @default(false)
  role        String?  // If role-based default dashboard
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user    User     @relation("UserDashboards", fields: [userId], references: [id])
  widgets Widget[]

  @@index([userId])
  @@map("dashboards")
}

// Widget Instance
model Widget {
  id           String   @id @default(uuid())
  dashboardId  String
  widgetType   String   // 'KPI_CARD', 'LINE_CHART', 'BAR_CHART', 'TABLE', etc.
  title        String
  config       Json     // Widget-specific configuration (data source, filters, etc.)
  position     Json     // Grid position { x, y, w, h }
  refreshRate  Int      @default(60) // Seconds
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  dashboard Dashboard @relation(fields: [dashboardId], references: [id], onDelete: Cascade)

  @@index([dashboardId])
  @@map("widgets")
}

// Threshold Alerts
model ThresholdAlert {
  id          String    @id @default(uuid())
  widgetId    String?   // Optional: Alert for specific widget
  userId      String    // Who to notify
  metricName  String    // e.g., 'revenue', 'unsignedNotes', 'kvr'
  operator    String    // '>', '<', '>=', '<=', '==', '!='
  threshold   Decimal   @db.Decimal(10, 2)
  isActive    Boolean   @default(true)
  lastTriggered DateTime?
  createdAt   DateTime  @default(now())

  user User @relation("UserAlerts", fields: [userId], references: [id])

  @@index([userId])
  @@map("threshold_alerts")
}
```

#### 8.2 Prediction Models

```prisma
// ML Model Definitions
model PredictionModel {
  id             String   @id @default(uuid())
  modelType      String   // 'NO_SHOW', 'DROPOUT', 'REVENUE_FORECAST', 'DEMAND_FORECAST'
  modelVersion   String   // e.g., 'v1.0.0'
  algorithm      String   // 'LOGISTIC_REGRESSION', 'ARIMA', 'RANDOM_FOREST', etc.
  features       Json     // Feature list used in model
  hyperparameters Json    // Model hyperparameters
  performanceMetrics Json // Accuracy, precision, recall, F1, etc.
  trainedAt      DateTime
  isActive       Boolean  @default(false) // Only one active model per type
  createdAt      DateTime @default(now())

  trainingJobs TrainingJob[]
  predictions  Prediction[]

  @@unique([modelType, modelVersion])
  @@map("prediction_models")
}

// Model Training Jobs
model TrainingJob {
  id              String   @id @default(uuid())
  modelId         String
  datasetSize     Int      // Number of records used for training
  trainTestSplit  Decimal  @db.Decimal(3, 2) // e.g., 0.80 for 80/20 split
  validationScore Decimal  @db.Decimal(5, 4) // e.g., 0.9523
  startedAt       DateTime
  completedAt     DateTime?
  status          String   // 'RUNNING', 'COMPLETED', 'FAILED'
  errorMessage    String?

  model PredictionModel @relation(fields: [modelId], references: [id])

  @@index([modelId])
  @@map("training_jobs")
}

// Prediction History
model Prediction {
  id            String   @id @default(uuid())
  modelId       String
  entityType    String   // 'APPOINTMENT', 'CLIENT', etc.
  entityId      String   // appointmentId or clientId
  predictionType String  // 'NO_SHOW_RISK', 'DROPOUT_RISK', etc.
  probability   Decimal  @db.Decimal(5, 4) // 0.0000 to 1.0000
  riskLevel     String   // 'LOW', 'MEDIUM', 'HIGH'
  features      Json     // Feature values used for this prediction
  predictedAt   DateTime @default(now())

  model PredictionModel @relation(fields: [modelId], references: [id])

  @@index([entityType, entityId])
  @@index([modelId])
  @@map("predictions")
}
```

#### 8.3 Custom Report Models

```prisma
// Report Definitions
model ReportDefinition {
  id          String   @id @default(uuid())
  userId      String   // Creator
  name        String
  description String?
  category    String   // 'FINANCIAL', 'CLINICAL', 'OPERATIONAL', 'COMPLIANCE'
  isPublic    Boolean  @default(false)
  isTemplate  Boolean  @default(false)
  queryConfig Json     // Complete query configuration (data sources, fields, filters, aggregations)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user     User            @relation("UserReports", fields: [userId], references: [id])
  versions ReportVersion[]
  schedules ReportSchedule[]

  @@index([userId])
  @@index([category])
  @@map("report_definitions")
}

// Report Versioning
model ReportVersion {
  id          String   @id @default(uuid())
  reportId    String
  versionNumber Int    // 1, 2, 3, ...
  queryConfig Json     // Query configuration for this version
  changedBy   String   // User who made the change
  changeNote  String?  // Description of changes
  createdAt   DateTime @default(now())

  report    ReportDefinition @relation(fields: [reportId], references: [id], onDelete: Cascade)
  changedByUser User         @relation("ReportVersions", fields: [changedBy], references: [id])

  @@unique([reportId, versionNumber])
  @@index([reportId])
  @@map("report_versions")
}
```

#### 8.4 Distribution Models

```prisma
// Report Schedules
model ReportSchedule {
  id          String    @id @default(uuid())
  reportId    String    // Custom report or standard report ID
  reportType  String    // 'CUSTOM' or 'STANDARD'
  userId      String    // Who created the schedule
  frequency   String    // 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'CUSTOM'
  cronExpression String? // For custom frequency
  timezone    String    @default("America/New_York")
  format      String    // 'PDF', 'EXCEL', 'CSV'
  recipients  Json      // Array of email addresses
  distributionCondition Json? // Conditional distribution rules
  lastRunDate DateTime?
  nextRunDate DateTime
  status      String    @default("ACTIVE") // 'ACTIVE', 'PAUSED', 'COMPLETED'
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  report ReportDefinition? @relation(fields: [reportId], references: [id], onDelete: Cascade)
  user   User             @relation("UserSchedules", fields: [userId], references: [id])
  logs   DeliveryLog[]

  @@index([userId])
  @@index([reportId])
  @@index([nextRunDate])
  @@map("report_schedules")
}

// Subscriptions
model Subscription {
  id          String   @id @default(uuid())
  reportId    String
  reportType  String   // 'CUSTOM' or 'STANDARD'
  userId      String   // Subscriber
  frequency   String   // 'DAILY', 'WEEKLY', 'MONTHLY'
  format      String   // 'PDF', 'EXCEL', 'CSV'
  deliveryMethod String // 'EMAIL', 'PORTAL', 'BOTH'
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation("UserSubscriptions", fields: [userId], references: [id])

  @@index([userId])
  @@index([reportId])
  @@map("subscriptions")
}

// Delivery Logs
model DeliveryLog {
  id          String   @id @default(uuid())
  scheduleId  String
  reportId    String
  recipients  Json     // Array of email addresses
  format      String   // 'PDF', 'EXCEL', 'CSV'
  status      String   // 'PENDING', 'SENT', 'FAILED'
  attemptCount Int     @default(1)
  sentAt      DateTime?
  errorMessage String?
  metadata    Json?    // Email details, file size, etc.
  createdAt   DateTime @default(now())

  schedule ReportSchedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade)

  @@index([scheduleId])
  @@index([status])
  @@map("delivery_logs")
}

// Distribution Lists
model DistributionList {
  id          String   @id @default(uuid())
  name        String
  description String?
  emails      Json     // Array of email addresses
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  creator User @relation("CreatedDistributionLists", fields: [createdBy], references: [id])

  @@index([createdBy])
  @@map("distribution_lists")
}
```

#### 8.5 User Relations Update

**Update User model to add relations**:

```prisma
model User {
  // ... existing fields ...

  // New relations for Module 8
  dashboards            Dashboard[]         @relation("UserDashboards")
  alerts                ThresholdAlert[]    @relation("UserAlerts")
  reportDefinitions     ReportDefinition[]  @relation("UserReports")
  reportVersions        ReportVersion[]     @relation("ReportVersions")
  schedules             ReportSchedule[]    @relation("UserSchedules")
  subscriptions         Subscription[]      @relation("UserSubscriptions")
  distributionLists     DistributionList[]  @relation("CreatedDistributionLists")
}
```

#### 8.6 Migration Strategy

**Steps**:

1. **Create migration file**:
   ```bash
   cd packages/database
   npx prisma migrate dev --name add_module_8_models
   ```

2. **Review generated SQL**

3. **Apply migration**:
   ```bash
   npx prisma migrate deploy
   ```

4. **Generate Prisma client**:
   ```bash
   npx prisma generate
   ```

### Dependencies

- **None** (must complete first to unblock other agents)

### Priority

**HIGHEST PRIORITY** - Must complete in Phase 1 (Day 1-2) before other agents can proceed.

### Test Strategy

See [Test Prompt #8](#test-prompt-8-database-schema) in Section 11.

---

## Integration & Testing Strategy

### Phase 1: Database Schema (Days 1-2)

**Agent 8** completes database schema implementation.

**Deliverables**:
- ✅ 12+ new Prisma models
- ✅ Migration applied to database
- ✅ Prisma client regenerated

**Testing**: Schema validation, migration rollback test

---

### Phase 2: Parallel Development (Days 3-10)

All 8 agents work in parallel on their deliverables.

**Daily Stand-up**:
- Each agent reports progress
- Identify blockers
- Coordinate integrations

**Integration Points**:
- **Agent 1 + Agent 2**: Dashboard uses chart components
- **Agent 5 + Agent 6**: Distribution uses export services
- **Agent 4 uses Agent 8 models**: Report builder uses ReportDefinition

---

### Phase 3: Integration Testing (Days 11-12)

**Integration Tests**:
1. Dashboard displays charts from Agent 2
2. Custom reports export via Agent 5
3. Scheduled reports distribute via Agent 6
4. Predictive models display on dashboards
5. Report library accessible from all UIs

**E2E Testing**:
- User creates custom report → schedules it → receives email with PDF
- User builds dashboard → adds widgets → configures alerts
- User views predictive analytics → sees recommendations

**Bug Fixes**: Address any integration issues

---

## Comprehensive Test Prompts for Cursor

### Test Prompt #1: Dashboard Framework

```markdown
# Test Prompt: Dashboard Framework

## Objective
Verify that the customizable dashboard system works correctly with drag-and-drop widgets, real-time updates, and role-based configurations.

## Prerequisites
- Backend server running (localhost:3001)
- Frontend server running (localhost:5176)
- Logged in as admin user: admin@mentalspace.com / Admin123!

## Test Cases

### TC1.1: Create New Dashboard
**Steps**:
1. Navigate to http://localhost:5176/dashboards
2. Click "+ New Dashboard" button
3. Enter dashboard name: "Executive Dashboard"
4. Enter description: "High-level KPIs for executives"
5. Click "Create"

**Expected Results**:
- ✅ POST /api/v1/dashboards returns 201
- ✅ Dashboard appears in dashboard list
- ✅ Empty dashboard grid displayed
- ✅ Widget library panel visible on left

**Pass/Fail**: ______

---

### TC1.2: Add Widget to Dashboard
**Steps**:
1. From widget library, drag "Revenue Today" KPI widget
2. Drop onto dashboard grid
3. Verify widget displays current revenue

**Expected Results**:
- ✅ Widget appears on grid
- ✅ Widget displays data (e.g., "$5,234.00")
- ✅ Widget has resize handles
- ✅ POST /api/v1/dashboards/:id/widgets returns 201

**Pass/Fail**: ______

---

### TC1.3: Resize and Reposition Widget
**Steps**:
1. Click and drag resize handle on widget
2. Resize widget to 2x2 grid units
3. Drag widget to different position
4. Click "Save Layout"

**Expected Results**:
- ✅ Widget resizes smoothly
- ✅ Widget moves to new position
- ✅ PUT /api/v1/dashboards/:id returns 200
- ✅ Layout persists after refresh

**Pass/Fail**: ______

---

### TC1.4: Add Multiple Widgets
**Steps**:
1. Add "KVR" widget
2. Add "Unsigned Notes" widget
3. Add "Revenue Trend" chart widget
4. Add "Recent Appointments" table widget
5. Arrange widgets in grid
6. Save dashboard

**Expected Results**:
- ✅ All 5 widgets display correctly
- ✅ Each widget shows live data
- ✅ Widgets do not overlap
- ✅ Save successful

**Pass/Fail**: ______

---

### TC1.5: Widget Auto-Refresh
**Steps**:
1. Note current value of "Revenue Today" widget
2. In separate tab, create new charge entry (mark as paid)
3. Wait for widget refresh interval (default: 60s)
4. Verify widget updates without page refresh

**Expected Results**:
- ✅ Widget displays "Last updated: X seconds ago"
- ✅ Widget value updates automatically
- ✅ No page reload required
- ✅ WebSocket connection active (check console)

**Pass/Fail**: ______

---

### TC1.6: Configure Threshold Alert
**Steps**:
1. Click gear icon on "Unsigned Notes" widget
2. Click "Configure Alert"
3. Set threshold: > 10 unsigned notes
4. Enable alert
5. Save

**Expected Results**:
- ✅ Alert configuration saved
- ✅ If unsigned notes > 10, alert indicator shows
- ✅ POST /api/v1/threshold-alerts returns 201

**Pass/Fail**: ______

---

### TC1.7: Dashboard Templates
**Steps**:
1. Navigate to Dashboards page
2. Click "Create from Template"
3. Select "Executive Dashboard" template
4. Click "Create"

**Expected Results**:
- ✅ Dashboard created with pre-configured widgets
- ✅ All widgets display data
- ✅ Template widgets: Revenue, KVR, Active Clients, Revenue Trend, Clinician Productivity

**Pass/Fail**: ______

---

### TC1.8: Full-Screen Presentation Mode
**Steps**:
1. Open dashboard
2. Click "Full Screen" button (top-right)
3. Verify full-screen mode
4. Press ESC to exit

**Expected Results**:
- ✅ Dashboard enters full-screen mode
- ✅ All widgets visible
- ✅ No navigation bars
- ✅ ESC exits full-screen

**Pass/Fail**: ______

---

### TC1.9: Delete Dashboard
**Steps**:
1. Go to Dashboards list
2. Click "Delete" on a dashboard
3. Confirm deletion

**Expected Results**:
- ✅ Confirmation modal appears
- ✅ DELETE /api/v1/dashboards/:id returns 200
- ✅ Dashboard removed from list
- ✅ Associated widgets deleted

**Pass/Fail**: ______

---

## Summary
- **Total Test Cases**: 9
- **Passed**: ______
- **Failed**: ______
- **Pass Rate**: ______%

## Issues Found
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

## Notes
_______________________________________________
_______________________________________________
```

---

### Test Prompt #2: Data Visualization

```markdown
# Test Prompt: Data Visualization

## Objective
Verify that interactive charts, graphs, and heat maps display correctly with drill-down capabilities.

## Prerequisites
- Backend server running
- Frontend server running
- Logged in as admin user

## Test Cases

### TC2.1: Revenue Trend Line Chart
**Steps**:
1. Navigate to http://localhost:5176/reports
2. Click "Revenue by Clinician" report
3. Click "View Chart" tab (instead of Table tab)
4. Select chart type: "Line Chart"

**Expected Results**:
- ✅ Line chart displays revenue trend over time
- ✅ X-axis: Dates
- ✅ Y-axis: Revenue ($)
- ✅ Tooltips show on hover
- ✅ Legend displays clinician names
- ✅ Chart animates on load

**Pass/Fail**: ______

---

### TC2.2: KVR Analysis Bar Chart
**Steps**:
1. Open "KVR Analysis" report
2. View as bar chart
3. Hover over bars

**Expected Results**:
- ✅ Bar chart displays KVR by clinician
- ✅ Bars sorted by KVR (descending)
- ✅ Tooltip shows: Clinician name, KVR %, scheduled, kept, cancelled, no-show
- ✅ Color coding: Green (>90%), Yellow (70-90%), Red (<70%)

**Pass/Fail**: ______

---

### TC2.3: Revenue by Payer Pie Chart
**Steps**:
1. Open "Revenue by Payer" report
2. View as pie chart
3. Click on a pie slice

**Expected Results**:
- ✅ Pie chart displays revenue distribution by payer
- ✅ Each slice labeled with payer name and percentage
- ✅ Click drills down to payer detail view
- ✅ Legend shows all payers

**Pass/Fail**: ______

---

### TC2.4: Demographics Donut Chart
**Steps**:
1. Open "Client Demographics" report
2. View "Age Distribution" as donut chart

**Expected Results**:
- ✅ Donut chart displays age groups
- ✅ Center displays total client count
- ✅ Each segment shows age group and count

**Pass/Fail**: ______

---

### TC2.5: Scheduling Utilization Heat Map
**Steps**:
1. Navigate to Reports → Operational
2. Open "Scheduling Utilization" report
3. View as heat map

**Expected Results**:
- ✅ Heat map displays: Hour of day (Y-axis) × Day of week (X-axis)
- ✅ Color intensity: Green (high utilization) → Red (low utilization)
- ✅ Tooltip shows exact utilization percentage
- ✅ Click cell drills down to appointment list

**Pass/Fail**: ______

---

### TC2.6: Export Chart as Image
**Steps**:
1. Open any chart
2. Click "Export" button
3. Select "PNG Image"

**Expected Results**:
- ✅ PNG file downloaded
- ✅ Chart rendered correctly in image
- ✅ File name: report-name-YYYY-MM-DD.png

**Pass/Fail**: ______

---

### TC2.7: Interactive Legend Toggle
**Steps**:
1. Open revenue trend chart with multiple clinicians
2. Click on a clinician name in legend

**Expected Results**:
- ✅ Clicking legend item toggles visibility of that series
- ✅ Chart re-scales Y-axis when series hidden
- ✅ Clicking again shows series

**Pass/Fail**: ______

---

### TC2.8: Chart Responsiveness
**Steps**:
1. Open any chart
2. Resize browser window to mobile width (375px)
3. Verify chart adjusts

**Expected Results**:
- ✅ Chart resizes to fit smaller screen
- ✅ Labels remain readable
- ✅ Tooltips still functional on mobile

**Pass/Fail**: ______

---

### TC2.9: Multiple Chart Types for Same Data
**Steps**:
1. Open "Revenue by Clinician" report
2. Toggle between: Line Chart, Bar Chart, Table

**Expected Results**:
- ✅ All chart types display same data
- ✅ Switching is instant (no reload)
- ✅ Chart preference persists

**Pass/Fail**: ______

---

## Summary
- **Total Test Cases**: 9
- **Passed**: ______
- **Failed**: ______
- **Pass Rate**: ______%
```

---

### Test Prompt #3: Predictive Analytics

```markdown
# Test Prompt: Predictive Analytics

## Objective
Verify that ML models generate predictions for no-show risk, dropout, revenue forecasting, and demand forecasting.

## Prerequisites
- Backend server running
- ML models trained (run: `npm run train-models`)
- Sufficient historical data (12 months of appointments, charges)

## Test Cases

### TC3.1: No-Show Risk Prediction
**Steps**:
1. Navigate to http://localhost:5176/appointments
2. View upcoming appointments list
3. Verify risk indicators displayed

**Expected Results**:
- ✅ Each appointment shows risk indicator (Low/Medium/High)
- ✅ Icon color: Green (low), Yellow (medium), Red (high)
- ✅ Tooltip shows: "No-show risk: 35% (Medium)"
- ✅ Recommended actions displayed

**Pass/Fail**: ______

---

### TC3.2: View No-Show Prediction Details
**Steps**:
1. Click on a "High Risk" appointment
2. View prediction details panel

**Expected Results**:
- ✅ Panel shows:
  - No-show probability: 0.72 (72%)
  - Risk level: HIGH
  - Contributing factors:
    - Client historical no-show rate: 45%
    - Last appointment: 90 days ago
    - Time of day: 8:00 AM (high risk)
  - Recommended actions:
    - Call client 24 hours before
    - Send SMS reminder
- ✅ GET /api/v1/predictions/noshow/:appointmentId returns prediction

**Pass/Fail**: ______

---

### TC3.3: Dropout Risk on Client Profile
**Steps**:
1. Navigate to Clients list
2. Open a client profile
3. View "Dropout Risk" section

**Expected Results**:
- ✅ Dropout risk indicator displayed
- ✅ Probabilities shown:
  - 30-day risk: 15%
  - 60-day risk: 28%
  - 90-day risk: 42%
- ✅ Risk level: MEDIUM
- ✅ Recommended interventions:
  - Schedule check-in call
  - Adjust treatment plan frequency
- ✅ GET /api/v1/predictions/dropout/:clientId returns prediction

**Pass/Fail**: ______

---

### TC3.4: Revenue Forecasting
**Steps**:
1. Navigate to http://localhost:5176/predictions/revenue
2. View revenue forecast for next 30 days

**Expected Results**:
- ✅ Line chart displays:
  - Predicted revenue (solid line)
  - Confidence interval (shaded area)
- ✅ Table shows daily forecast:
  - Date, Predicted Revenue, Lower Bound, Upper Bound
- ✅ Total predicted revenue for 30 days displayed
- ✅ Trend indicator: "Increasing" / "Decreasing" / "Stable"
- ✅ GET /api/v1/predictions/revenue?period=30d returns forecast

**Pass/Fail**: ______

---

### TC3.5: Demand Forecasting
**Steps**:
1. Navigate to Predictions → Demand Forecast
2. View appointment demand for next 30 days

**Expected Results**:
- ✅ Heat map shows predicted appointment volume:
  - X-axis: Dates
  - Y-axis: Hour of day
  - Color: Demand intensity
- ✅ Table shows daily summary:
  - Date, Predicted Appointments, Capacity, Utilization %
- ✅ Staffing recommendations displayed:
  - "Add 1 clinician on 2025-11-15 (95% utilization predicted)"
- ✅ GET /api/v1/predictions/demand?period=30d returns forecast

**Pass/Fail**: ______

---

### TC3.6: Model Performance Metrics
**Steps**:
1. Navigate to Admin → Predictive Models
2. View model performance dashboard

**Expected Results**:
- ✅ All 4 models listed:
  - No-Show Predictor
  - Dropout Predictor
  - Revenue Forecaster
  - Demand Forecaster
- ✅ For each model, display:
  - Version (e.g., v1.0.0)
  - Algorithm (e.g., Logistic Regression)
  - Accuracy / R² score
  - Last trained date
  - Status: Active / Inactive
- ✅ GET /api/v1/predictions/models returns model list

**Pass/Fail**: ______

---

### TC3.7: Model Retraining
**Steps**:
1. In Admin → Predictive Models
2. Click "Retrain" on No-Show Predictor
3. Monitor training progress

**Expected Results**:
- ✅ Training job started
- ✅ Progress indicator displayed
- ✅ Status changes: RUNNING → COMPLETED
- ✅ New model version created (e.g., v1.0.1)
- ✅ Performance metrics updated
- ✅ Old model archived

**Pass/Fail**: ______

---

### TC3.8: Prediction History
**Steps**:
1. Open client profile
2. View "Prediction History" tab

**Expected Results**:
- ✅ Table shows all past predictions for this client:
  - Date, Prediction Type (Dropout/No-Show), Probability, Actual Outcome
- ✅ Accuracy metric displayed: "Our predictions were 87% accurate for this client"

**Pass/Fail**: ______

---

### TC3.9: AI Insights on Dashboard
**Steps**:
1. Navigate to main Dashboard
2. View "AI Insights" widget

**Expected Results**:
- ✅ Widget displays top 3 insights:
  - "15 appointments at high risk of no-show this week"
  - "3 clients at high risk of dropout (>70%)"
  - "Revenue predicted to increase 12% next month"
- ✅ Click insight drills down to detail view

**Pass/Fail**: ______

---

## Summary
- **Total Test Cases**: 9
- **Passed**: ______
- **Failed**: ______
- **Pass Rate**: ______%
```

---

### Test Prompt #4: Custom Report Builder

```markdown
# Test Prompt: Custom Report Builder

## Objective
Verify that users can create, save, and execute custom reports using the drag-and-drop report builder.

## Prerequisites
- Backend server running
- Frontend server running
- Logged in as admin user

## Test Cases

### TC4.1: Open Report Builder
**Steps**:
1. Navigate to http://localhost:5176/reports/builder
2. Verify report builder UI loads

**Expected Results**:
- ✅ Step 1: Data Sources panel visible
- ✅ Available tables listed: Clients, Appointments, Charges, Claims, etc.
- ✅ "Next" button visible

**Pass/Fail**: ______

---

### TC4.2: Select Data Sources
**Steps**:
1. Select "Appointments" table
2. Select "Clients" table (for join)
3. Click "Next"

**Expected Results**:
- ✅ Both tables selected (checkmarks shown)
- ✅ Join detected automatically: Appointments.clientId → Clients.id
- ✅ Step 2: Fields panel displayed

**Pass/Fail**: ______

---

### TC4.3: Add Fields to Report
**Steps**:
1. From "Clients" section, drag "First Name" field to report canvas
2. Drag "Last Name" field
3. From "Appointments" section, drag "Appointment Date"
4. Drag "Status"
5. Click "Next"

**Expected Results**:
- ✅ All 4 fields appear in report canvas
- ✅ Fields can be reordered (drag up/down)
- ✅ Fields can be removed (X button)
- ✅ Step 3: Filters panel displayed

**Pass/Fail**: ______

---

### TC4.4: Add Filters
**Steps**:
1. Click "+ Add Filter"
2. Select field: "Appointments.Status"
3. Select operator: "IN"
4. Select values: "COMPLETED", "NO_SHOW"
5. Click "+ Add Filter" again
6. Select field: "Appointments.AppointmentDate"
7. Select operator: "BETWEEN"
8. Enter dates: 2025-01-01 to 2025-01-31
9. Click "Next"

**Expected Results**:
- ✅ Both filters added
- ✅ Filter summary displayed: "Status IN (COMPLETED, NO_SHOW) AND AppointmentDate BETWEEN 2025-01-01 AND 2025-01-31"
- ✅ Step 4: Aggregations panel displayed

**Pass/Fail**: ______

---

### TC4.5: Add Aggregation
**Steps**:
1. Enable "Group By": Select "Client.Id"
2. Click "+ Add Aggregation"
3. Select field: "Appointments.Id"
4. Select function: "COUNT"
5. Enter alias: "Total Appointments"
6. Click "Next"

**Expected Results**:
- ✅ Aggregation added
- ✅ Preview shows: Client Name, Total Appointments
- ✅ Step 5: Sorting panel displayed

**Pass/Fail**: ______

---

### TC4.6: Add Sorting
**Steps**:
1. Add sort: "Total Appointments" DESC
2. Click "Next"

**Expected Results**:
- ✅ Sort order applied
- ✅ Step 6: Preview panel displayed
- ✅ Live preview shows top 10 rows

**Pass/Fail**: ______

---

### TC4.7: Save Custom Report
**Steps**:
1. Click "Save Report"
2. Enter name: "Client Appointment Summary (Jan 2025)"
3. Enter description: "Shows appointment counts by client for January"
4. Select category: "Operational"
5. Click "Save"

**Expected Results**:
- ✅ POST /api/v1/custom-reports returns 201
- ✅ Success message displayed
- ✅ Report appears in Reports list under "Custom Reports"

**Pass/Fail**: ______

---

### TC4.8: Execute Custom Report
**Steps**:
1. Go to Reports page
2. Find saved report in "Custom Reports" section
3. Click "View Report"

**Expected Results**:
- ✅ POST /api/v1/custom-reports/:id/execute returns 200
- ✅ Report displays correctly with:
  - Client names
  - Total appointment counts
  - Sorted by count (descending)
- ✅ Filters applied (only Jan 2025 data)

**Pass/Fail**: ______

---

### TC4.9: Edit Custom Report
**Steps**:
1. Open saved custom report
2. Click "Edit" button
3. Modify: Add field "Clinician Name"
4. Save changes

**Expected Results**:
- ✅ Report builder reopens with existing configuration
- ✅ New field added successfully
- ✅ PUT /api/v1/custom-reports/:id returns 200
- ✅ New version created (version 2)

**Pass/Fail**: ______

---

### TC4.10: Use Report Template
**Steps**:
1. Open Report Builder
2. Click "Load Template"
3. Select "Revenue by Service Type" template
4. Verify template loads

**Expected Results**:
- ✅ Template configuration loaded:
  - Data sources: Charges, CPTCodes
  - Fields: CPT Code, Description, Total Revenue
  - Aggregations: SUM(ChargeAmount)
  - Grouping: CPT Code
- ✅ Can modify template
- ✅ Can save as new report

**Pass/Fail**: ______

---

### TC4.11: Share Custom Report
**Steps**:
1. Open saved custom report
2. Click "Share" button
3. Select users: supervisor@mentalspace.com
4. Set permission: "Read Only"
5. Click "Share"

**Expected Results**:
- ✅ POST /api/v1/custom-reports/:id/share returns 200
- ✅ Report visible to shared user
- ✅ Shared user cannot edit (read-only)

**Pass/Fail**: ______

---

### TC4.12: Delete Custom Report
**Steps**:
1. Go to Reports page
2. Find custom report
3. Click "Delete"
4. Confirm deletion

**Expected Results**:
- ✅ Confirmation modal appears
- ✅ DELETE /api/v1/custom-reports/:id returns 200
- ✅ Report removed from list

**Pass/Fail**: ______

---

## Summary
- **Total Test Cases**: 12
- **Passed**: ______
- **Failed**: ______
- **Pass Rate**: ______%
```

---

### Test Prompt #5: Export & Integration

```markdown
# Test Prompt: Export & Integration

## Objective
Verify that reports can be exported to PDF, Excel, CSV and that Power BI/Tableau integrations work.

## Prerequisites
- Backend server running
- Frontend server running
- Test reports available

## Test Cases

### TC5.1: Export Report to PDF
**Steps**:
1. Navigate to Reports page
2. Open "Revenue by Clinician" report
3. Click "Export" button
4. Select "PDF"
5. Wait for generation

**Expected Results**:
- ✅ POST /api/v1/reports/revenue-by-clinician/export/pdf returns 200
- ✅ PDF file downloaded
- ✅ Filename: revenue-by-clinician-2025-11-10.pdf
- ✅ PDF contains:
  - Company logo
  - Report title
  - Date range
  - Table with data
  - Page numbers
  - Formatted correctly

**Pass/Fail**: ______

---

### TC5.2: Export Chart to PDF
**Steps**:
1. Open report with chart visualization
2. Export to PDF

**Expected Results**:
- ✅ PDF includes chart image
- ✅ Chart rendered correctly (not pixelated)
- ✅ Chart colors preserved

**Pass/Fail**: ______

---

### TC5.3: Export Report to Excel
**Steps**:
1. Open "KVR Analysis" report
2. Export to Excel

**Expected Results**:
- ✅ POST /api/v1/reports/kvr-analysis/export/excel returns 200
- ✅ Excel file downloaded (.xlsx)
- ✅ Filename: kvr-analysis-2025-11-10.xlsx
- ✅ Excel contains:
  - Sheet name: "KVR Analysis"
  - Headers in bold with background color
  - Data rows
  - Column auto-sizing
  - Number formatting (percentages for KVR)

**Pass/Fail**: ______

---

### TC5.4: Multi-Sheet Excel Export
**Steps**:
1. Open dashboard with multiple widgets
2. Export entire dashboard to Excel

**Expected Results**:
- ✅ Excel workbook with multiple sheets:
  - Sheet 1: Revenue Summary
  - Sheet 2: KVR Analysis
  - Sheet 3: Unsigned Notes
- ✅ Each sheet formatted correctly

**Pass/Fail**: ______

---

### TC5.5: Export Report to CSV
**Steps**:
1. Open any tabular report
2. Export to CSV

**Expected Results**:
- ✅ POST /api/v1/reports/:id/export/csv returns 200
- ✅ CSV file downloaded
- ✅ CSV contains:
  - Header row
  - Data rows
  - Proper escaping (commas, quotes)
  - UTF-8 encoding with BOM (opens correctly in Excel)

**Pass/Fail**: ______

---

### TC5.6: Bulk Export
**Steps**:
1. Go to Reports page
2. Select 3 reports (checkboxes)
3. Click "Export Selected"
4. Choose format: "PDF"
5. Click "Export"

**Expected Results**:
- ✅ POST /api/v1/reports/bulk-export returns 200
- ✅ ZIP file downloaded containing 3 PDFs
- ✅ Filename: reports-2025-11-10.zip
- ✅ All PDFs formatted correctly

**Pass/Fail**: ______

---

### TC5.7: Power BI Integration - OData Endpoint
**Steps**:
1. Open browser to: http://localhost:3001/api/v1/odata/reports/revenue-by-clinician?$format=json
2. Verify OData JSON response

**Expected Results**:
- ✅ GET /api/v1/odata/reports/revenue-by-clinician returns 200
- ✅ Response in OData JSON format:
  ```json
  {
    "@odata.context": "...",
    "value": [
      { "clinicianName": "Dr. Smith", "totalRevenue": 45000, ... }
    ]
  }
  ```
- ✅ Valid OData metadata

**Pass/Fail**: ______

---

### TC5.8: Power BI Connection (Manual Test)
**Steps**:
1. Open Power BI Desktop
2. Get Data → Web
3. Enter URL: http://localhost:3001/api/v1/odata/reports/revenue-by-clinician
4. Enter API token in Authorization header
5. Load data

**Expected Results**:
- ✅ Power BI loads data successfully
- ✅ All columns visible
- ✅ Data types correct (numbers, dates)
- ✅ Can create visualizations in Power BI

**Pass/Fail**: ______ (Manual test - requires Power BI Desktop)

---

### TC5.9: Tableau Web Data Connector (Manual Test)
**Steps**:
1. Open Tableau Desktop
2. Connect to Web Data Connector
3. Enter URL: http://localhost:5176/tableau-wdc.html
4. Click "Get Data"

**Expected Results**:
- ✅ Tableau WDC loads
- ✅ Schema defined correctly
- ✅ Data fetched from MentalSpace API
- ✅ Can create visualizations in Tableau

**Pass/Fail**: ______ (Manual test - requires Tableau)

---

### TC5.10: Export History
**Steps**:
1. After exporting several reports
2. Navigate to Reports → Export History

**Expected Results**:
- ✅ Table displays recent exports:
  - Report name
  - Format (PDF/Excel/CSV)
  - Date exported
  - File size
  - Download link
- ✅ Can re-download past exports
- ✅ Can delete old exports

**Pass/Fail**: ______

---

## Summary
- **Total Test Cases**: 10 (8 automated + 2 manual)
- **Passed**: ______
- **Failed**: ______
- **Pass Rate**: ______%
```

---

### Test Prompt #6: Automated Distribution

```markdown
# Test Prompt: Automated Distribution

## Objective
Verify that automated report scheduling, email distribution, and subscriptions work correctly.

## Prerequisites
- Backend server running
- SMTP configured (check .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
- Test email account accessible

## Test Cases

### TC6.1: Schedule Daily Report
**Steps**:
1. Navigate to Reports page
2. Open "Unsigned Notes" report
3. Click "Schedule" button
4. Configure:
   - Frequency: Daily
   - Time: 08:00 AM
   - Timezone: America/New_York
   - Format: PDF
   - Recipients: test@example.com
5. Click "Create Schedule"

**Expected Results**:
- ✅ POST /api/v1/report-schedules returns 201
- ✅ Schedule appears in "Scheduled Reports" list
- ✅ Next run date calculated: Tomorrow at 08:00 AM ET

**Pass/Fail**: ______

---

### TC6.2: Manual Test Execution
**Steps**:
1. In scheduled report, click "Run Now" button
2. Wait for execution
3. Check email inbox

**Expected Results**:
- ✅ POST /api/v1/report-schedules/:id/execute returns 200
- ✅ Email received at test@example.com
- ✅ Email contains:
  - Subject: "MentalSpace Report: Unsigned Notes"
  - Body: HTML with report summary
  - Attachment: unsigned-notes-2025-11-10.pdf
  - PDF opens correctly

**Pass/Fail**: ______

---

### TC6.3: Weekly Report Schedule
**Steps**:
1. Schedule report
2. Configure:
   - Frequency: Weekly
   - Day of week: Monday
   - Time: 09:00 AM
   - Recipients: supervisor@mentalspace.com

**Expected Results**:
- ✅ Schedule created
- ✅ Next run date: Next Monday at 09:00 AM
- ✅ Cron expression generated correctly

**Pass/Fail**: ______

---

### TC6.4: Monthly Report with Custom Day
**Steps**:
1. Schedule report
2. Configure:
   - Frequency: Monthly
   - Day of month: 1st
   - Time: 00:00 (midnight)

**Expected Results**:
- ✅ Schedule created
- ✅ Next run date: First day of next month at midnight

**Pass/Fail**: ______

---

### TC6.5: Conditional Distribution (Threshold)
**Steps**:
1. Schedule "Unsigned Notes" report
2. Enable conditional distribution
3. Set condition: "Only send if Unsigned Notes Count > 10"
4. Run now

**Expected Results**:
- ✅ If unsigned notes count > 10: Email sent
- ✅ If unsigned notes count ≤ 10: Email NOT sent, log shows "Condition not met"
- ✅ DeliveryLog records condition evaluation

**Pass/Fail**: ______

---

### TC6.6: Distribution List
**Steps**:
1. Navigate to Admin → Distribution Lists
2. Click "+ Create List"
3. Enter name: "Management Team"
4. Add emails:
   - admin@mentalspace.com
   - supervisor@mentalspace.com
   - billing@mentalspace.com
5. Save
6. Schedule report to "Management Team" list

**Expected Results**:
- ✅ POST /api/v1/distribution-lists returns 201
- ✅ List appears in dropdown when scheduling reports
- ✅ Email sent to all 3 recipients

**Pass/Fail**: ______

---

### TC6.7: Subscribe to Report
**Steps**:
1. Open "Revenue by Clinician" report
2. Click "Subscribe" button
3. Configure:
   - Frequency: Weekly
   - Day: Friday
   - Format: Excel
   - Delivery: Email
4. Click "Subscribe"

**Expected Results**:
- ✅ POST /api/v1/subscriptions returns 201
- ✅ Subscription confirmation shown
- ✅ Subscription appears in "My Subscriptions" page

**Pass/Fail**: ______

---

### TC6.8: Pause Subscription
**Steps**:
1. Go to My Subscriptions
2. Find active subscription
3. Click "Pause" toggle

**Expected Results**:
- ✅ PUT /api/v1/subscriptions/:id returns 200
- ✅ Status changes to "Paused"
- ✅ No emails sent while paused
- ✅ Can resume later

**Pass/Fail**: ______

---

### TC6.9: Unsubscribe
**Steps**:
1. Click "Unsubscribe" link in email
2. Verify unsubscribe page
3. Confirm unsubscribe

**Expected Results**:
- ✅ Unsubscribe page loads
- ✅ DELETE /api/v1/subscriptions/:id returns 200
- ✅ Subscription removed
- ✅ No more emails sent

**Pass/Fail**: ______

---

### TC6.10: Delivery Retry on Failure
**Steps**:
1. Configure SMTP with invalid credentials (to simulate failure)
2. Run scheduled report
3. Verify retry logic

**Expected Results**:
- ✅ First attempt fails, status: FAILED
- ✅ Retry #1 after 5 minutes
- ✅ Retry #2 after 10 minutes (exponential backoff)
- ✅ Retry #3 after 20 minutes
- ✅ After 3 failures, admin notified
- ✅ DeliveryLog shows all attempts

**Pass/Fail**: ______

---

### TC6.11: Delivery Audit Trail
**Steps**:
1. Go to Admin → Delivery Logs
2. View delivery history

**Expected Results**:
- ✅ Table shows:
  - Report name
  - Recipients
  - Format
  - Status (SENT/FAILED)
  - Sent at timestamp
  - Error message (if failed)
- ✅ Can filter by status
- ✅ Can filter by date range

**Pass/Fail**: ______

---

### TC6.12: Email Template Customization
**Steps**:
1. Open email sent by scheduled report
2. Verify branding

**Expected Results**:
- ✅ Email contains company logo
- ✅ Professional HTML formatting
- ✅ Personalized greeting: "Hello [User Name]"
- ✅ Report summary in body
- ✅ Unsubscribe link at bottom

**Pass/Fail**: ______

---

## Summary
- **Total Test Cases**: 12
- **Passed**: ______
- **Failed**: ______
- **Pass Rate**: ______%
```

---

### Test Prompt #7: Report Library Expansion

```markdown
# Test Prompt: Report Library Expansion

## Objective
Verify that 50+ reports are implemented and accessible across financial, clinical, operational, and compliance categories.

## Prerequisites
- Backend server running
- Frontend server running
- Database populated with test data

## Test Cases

### TC7.1: AR Aging Report (CRITICAL)
**Steps**:
1. Navigate to Reports → Financial
2. Click "AR Aging Report"
3. View report

**Expected Results**:
- ✅ GET /api/v1/reports/ar-aging returns 200
- ✅ Report displays AR grouped by aging buckets:
  - 0-30 days: $X
  - 31-60 days: $Y
  - 61-90 days: $Z
  - 90+ days: $W
- ✅ Total AR balance shown
- ✅ Average days outstanding calculated
- ✅ Can drill down by payer

**Pass/Fail**: ______

---

### TC7.2: Claim Denial Analysis
**Steps**:
1. Open "Claim Denial Analysis" report

**Expected Results**:
- ✅ GET /api/v1/reports/claim-denial-analysis returns 200
- ✅ Report shows:
  - Denial rate by payer
  - Top 10 denial reasons
  - Financial impact ($)
  - Trend chart (denial rate over time)

**Pass/Fail**: ______

---

### TC7.3: Service Line Profitability
**Steps**:
1. Open "Service Line Profitability" report

**Expected Results**:
- ✅ Report shows revenue by service type:
  - Individual Therapy: Revenue, Cost, Profit, Margin %
  - Group Therapy: ...
  - Testing: ...
- ✅ Profit margin calculated correctly
- ✅ Sorted by profit margin (descending)

**Pass/Fail**: ______

---

### TC7.4: Treatment Outcome Trends
**Steps**:
1. Navigate to Reports → Clinical
2. Open "Treatment Outcome Trends"

**Expected Results**:
- ✅ GET /api/v1/reports/treatment-outcome-trends returns 200
- ✅ Report shows:
  - Assessment score changes over time (line chart)
  - Improvement rate by diagnosis
  - Treatment effectiveness by modality

**Pass/Fail**: ______

---

### TC7.5: Diagnosis Distribution
**Steps**:
1. Open "Diagnosis Distribution" report

**Expected Results**:
- ✅ Bar chart shows client count by primary diagnosis
- ✅ Comorbidity analysis (top 5 comorbidity pairs)
- ✅ Diagnosis trend over last 12 months

**Pass/Fail**: ______

---

### TC7.6: Care Gap Identification
**Steps**:
1. Open "Care Gap Identification" report

**Expected Results**:
- ✅ Report lists:
  - Clients overdue for assessments (>90 days)
  - Clients without treatment plans
  - Clients with missed follow-ups
- ✅ Each section shows client name, last action date, days overdue
- ✅ Can click to client profile

**Pass/Fail**: ______

---

### TC7.7: Scheduling Utilization Heat Map
**Steps**:
1. Navigate to Reports → Operational
2. Open "Scheduling Utilization Heat Map"

**Expected Results**:
- ✅ GET /api/v1/reports/scheduling-utilization returns 200
- ✅ Heat map displays:
  - X-axis: Hour of day (8 AM - 6 PM)
  - Y-axis: Day of week (Mon - Fri)
  - Color: Utilization % (0-100%)
- ✅ Tooltip shows exact utilization %
- ✅ Peak hours highlighted

**Pass/Fail**: ______

---

### TC7.8: No-Show Pattern Analysis
**Steps**:
1. Open "No-Show Pattern Analysis" report

**Expected Results**:
- ✅ Report shows:
  - No-show rate by day of week (bar chart)
  - No-show rate by time of day
  - No-show rate by client demographics
  - Financial impact calculation

**Pass/Fail**: ______

---

### TC7.9: Wait Time Analytics
**Steps**:
1. Open "Wait Time Analytics" report

**Expected Results**:
- ✅ Report shows:
  - Average wait time: Referral → Intake
  - Average wait time: Intake → First Session
  - Wait time by appointment type
  - Trend over last 6 months

**Pass/Fail**: ______

---

### TC7.10: Client Retention Rate
**Steps**:
1. Open "Retention Rate Tracking" report

**Expected Results**:
- ✅ Line chart shows retention rate by month
- ✅ Dropout rate analysis by treatment modality
- ✅ Cohort analysis (retention by intake month)

**Pass/Fail**: ______

---

### TC7.11: Referral Source Analytics
**Steps**:
1. Open "Referral Source Analytics" report

**Expected Results**:
- ✅ Bar chart shows referrals by source
- ✅ Conversion rate by source
- ✅ Revenue by referral source
- ✅ ROI on marketing channels

**Pass/Fail**: ______

---

### TC7.12: Audit Trail Report
**Steps**:
1. Navigate to Reports → Compliance
2. Open "Audit Trail Report"
3. Filter: Date range = Last 7 days

**Expected Results**:
- ✅ GET /api/v1/reports/audit-trail returns 200
- ✅ Report shows:
  - User, Action, Resource, Timestamp, IP Address
  - Filter by user, action type, resource type
- ✅ Sensitive actions highlighted (data access, deletions)

**Pass/Fail**: ______

---

### TC7.13: Compliance Scorecard
**Steps**:
1. Open "Compliance Scorecard" report

**Expected Results**:
- ✅ Overall compliance score displayed (0-100%)
- ✅ Breakdown by category:
  - Clinical Compliance: 95%
  - Billing Compliance: 88%
  - Privacy Compliance: 100%
- ✅ Trend over last 6 months
- ✅ Action items listed (areas needing improvement)

**Pass/Fail**: ______

---

### TC7.14: Staff Performance Dashboard
**Steps**:
1. Open "Staff Performance Dashboard" report

**Expected Results**:
- ✅ KPI cards for each staff member:
  - Sessions completed
  - KVR
  - Documentation timeliness
  - Client satisfaction
- ✅ Comparison across staff
- ✅ Highlights top performers

**Pass/Fail**: ______

---

### TC7.15: Report Categories Organized
**Steps**:
1. Go to Reports page
2. Verify categories

**Expected Results**:
- ✅ Reports organized into categories:
  - **Financial** (15+ reports)
  - **Clinical** (10+ reports)
  - **Operational** (10+ reports)
  - **Compliance** (5+ reports)
  - **Demographics** (5+ reports)
  - **Custom Reports** (user-created)
- ✅ Each category expandable/collapsible
- ✅ Search bar filters reports

**Pass/Fail**: ______

---

### TC7.16: All 50+ Reports Accessible
**Steps**:
1. Count total reports in system
2. Verify all are accessible

**Expected Results**:
- ✅ Total reports: ≥50
- ✅ All reports clickable
- ✅ No broken links
- ✅ All reports return data (no 500 errors)

**Pass/Fail**: ______

---

## Summary
- **Total Test Cases**: 16 (sample of 50+ reports)
- **Passed**: ______
- **Failed**: ______
- **Pass Rate**: ______%

## Full Report Inventory Checklist

**Financial Reports (15)**:
- [ ] AR Aging Report ⚠️ CRITICAL
- [ ] Claim Denial Analysis
- [ ] Service Line Profitability
- [ ] Payer Performance Scorecard
- [ ] Revenue Variance Report
- [ ] Cash Flow Forecast
- [ ] Write-Off Analysis
- [ ] Fee Schedule Compliance
- [ ] Revenue Cycle Metrics
- [ ] Financial Summary Dashboard
- [ ] Bad Debt Analysis
- [ ] Contractual Adjustments
- [ ] Revenue by Location
- [ ] Revenue by Diagnosis
- [ ] Financial Benchmarking

**Clinical Reports (10)**:
- [ ] Treatment Outcome Trends
- [ ] Diagnosis Distribution
- [ ] Treatment Modality Effectiveness
- [ ] Care Gap Identification
- [ ] Clinical Quality Metrics
- [ ] Population Health Risk Stratification
- [ ] Provider Performance Comparison
- [ ] Client Progress Tracking
- [ ] Assessment Score Trends
- [ ] Supervision Hours Report

**Operational Reports (10)**:
- [ ] Scheduling Utilization Heat Map
- [ ] No-Show Pattern Analysis
- [ ] Wait Time Analytics
- [ ] Workflow Efficiency Metrics
- [ ] Resource Utilization Tracking
- [ ] Client Flow Analysis
- [ ] Retention Rate Tracking
- [ ] Referral Source Analytics
- [ ] Capacity Planning Report
- [ ] Bottleneck Identification

**Compliance Reports (5)**:
- [ ] Audit Trail Report
- [ ] Incident Reporting
- [ ] Grant Reporting Templates
- [ ] Accreditation Reports
- [ ] Compliance Scorecard

**Demographics & Other (10)**:
- [ ] Client Demographics Deep Dive
- [ ] Payer Mix Analysis
- [ ] Marketing Campaign ROI
- [ ] Client Satisfaction Analysis
- [ ] Market Share Analysis
- [ ] Staff Performance Dashboard
- [ ] Telehealth Utilization Report
- [ ] Crisis Intervention Report
- [ ] Medication Management Tracking
- [ ] Group Therapy Attendance

**Total**: 50 Reports
```

---

### Test Prompt #8: Database Schema

```markdown
# Test Prompt: Database Schema

## Objective
Verify that all 12+ database models are correctly implemented, migrated, and functional.

## Prerequisites
- Database server running (PostgreSQL)
- Prisma CLI installed

## Test Cases

### TC8.1: Verify Schema File
**Steps**:
1. Open `packages/database/prisma/schema.prisma`
2. Search for new models

**Expected Results**:
- ✅ Dashboard model exists (lines TBD)
- ✅ Widget model exists
- ✅ ThresholdAlert model exists
- ✅ PredictionModel model exists
- ✅ TrainingJob model exists
- ✅ Prediction model exists
- ✅ ReportDefinition model exists
- ✅ ReportVersion model exists
- ✅ ReportSchedule model exists
- ✅ Subscription model exists
- ✅ DeliveryLog model exists
- ✅ DistributionList model exists
- ✅ All models have proper relations
- ✅ All models have indexes on foreign keys

**Pass/Fail**: ______

---

### TC8.2: Generate Migration
**Steps**:
1. Run: `cd packages/database`
2. Run: `npx prisma migrate dev --name add_module_8_models --create-only`
3. Review generated SQL in `prisma/migrations/`

**Expected Results**:
- ✅ Migration file created
- ✅ SQL contains CREATE TABLE statements for all 12 models
- ✅ Foreign key constraints defined
- ✅ Indexes created
- ✅ No syntax errors in SQL

**Pass/Fail**: ______

---

### TC8.3: Apply Migration
**Steps**:
1. Run: `npx prisma migrate deploy`
2. Verify no errors

**Expected Results**:
- ✅ Migration applied successfully
- ✅ All tables created in database
- ✅ No migration errors

**Pass/Fail**: ______

---

### TC8.4: Generate Prisma Client
**Steps**:
1. Run: `npx prisma generate`

**Expected Results**:
- ✅ Prisma client regenerated
- ✅ TypeScript types generated for all new models
- ✅ No errors

**Pass/Fail**: ______

---

### TC8.5: Verify Tables in Database
**Steps**:
1. Connect to PostgreSQL:
   ```bash
   psql -U postgres -d mentalspace_db
   ```
2. List tables:
   ```sql
   \dt
   ```
3. Verify new tables exist

**Expected Results**:
- ✅ dashboards table exists
- ✅ widgets table exists
- ✅ threshold_alerts table exists
- ✅ prediction_models table exists
- ✅ training_jobs table exists
- ✅ predictions table exists
- ✅ report_definitions table exists
- ✅ report_versions table exists
- ✅ report_schedules table exists
- ✅ subscriptions table exists
- ✅ delivery_logs table exists
- ✅ distribution_lists table exists

**Pass/Fail**: ______

---

### TC8.6: Test Dashboard Model CRUD
**Steps**:
1. Create test script: `test-dashboard-model.ts`
   ```typescript
   import { PrismaClient } from '@prisma/client';
   const prisma = new PrismaClient();

   async function test() {
     // Create
     const dashboard = await prisma.dashboard.create({
       data: {
         userId: 'test-user-id',
         name: 'Test Dashboard',
         layout: { grid: [] }
       }
     });
     console.log('Created:', dashboard);

     // Read
     const found = await prisma.dashboard.findUnique({
       where: { id: dashboard.id }
     });
     console.log('Found:', found);

     // Update
     const updated = await prisma.dashboard.update({
       where: { id: dashboard.id },
       data: { name: 'Updated Dashboard' }
     });
     console.log('Updated:', updated);

     // Delete
     await prisma.dashboard.delete({
       where: { id: dashboard.id }
     });
     console.log('Deleted');
   }

   test();
   ```
2. Run: `npx ts-node test-dashboard-model.ts`

**Expected Results**:
- ✅ Create succeeds
- ✅ Read succeeds
- ✅ Update succeeds
- ✅ Delete succeeds
- ✅ No errors

**Pass/Fail**: ______

---

### TC8.7: Test Widget Model with Relations
**Steps**:
1. Create dashboard with widgets:
   ```typescript
   const dashboard = await prisma.dashboard.create({
     data: {
       userId: 'test-user-id',
       name: 'Dashboard with Widgets',
       layout: {},
       widgets: {
         create: [
           {
             widgetType: 'KPI_CARD',
             title: 'Revenue Today',
             config: { metric: 'revenue' },
             position: { x: 0, y: 0, w: 2, h: 1 }
           },
           {
             widgetType: 'LINE_CHART',
             title: 'Revenue Trend',
             config: { metric: 'revenue', period: '30d' },
             position: { x: 2, y: 0, w: 4, h: 2 }
           }
         ]
       }
     },
     include: { widgets: true }
   });
   console.log('Dashboard with widgets:', dashboard);
   ```

**Expected Results**:
- ✅ Dashboard created
- ✅ 2 widgets created
- ✅ Relation between dashboard and widgets works
- ✅ Include returns widgets

**Pass/Fail**: ______

---

### TC8.8: Test Cascade Delete
**Steps**:
1. Delete dashboard created in TC8.7
2. Verify widgets also deleted

**Expected Results**:
- ✅ Dashboard deleted
- ✅ Associated widgets automatically deleted (CASCADE)
- ✅ No orphaned widgets

**Pass/Fail**: ______

---

### TC8.9: Test Prediction Model
**Steps**:
1. Create prediction model:
   ```typescript
   const model = await prisma.predictionModel.create({
     data: {
       modelType: 'NO_SHOW',
       modelVersion: 'v1.0.0',
       algorithm: 'LOGISTIC_REGRESSION',
       features: ['historicalNoShowRate', 'daysSinceLastAppt'],
       hyperparameters: { C: 1.0, penalty: 'l2' },
       performanceMetrics: { accuracy: 0.87, precision: 0.85, recall: 0.82 },
       trainedAt: new Date(),
       isActive: true
     }
   });
   ```

**Expected Results**:
- ✅ Model created
- ✅ JSON fields (features, hyperparameters, performanceMetrics) stored correctly
- ✅ Decimal fields work

**Pass/Fail**: ______

---

### TC8.10: Test Report Schedule Cron
**Steps**:
1. Create report schedule:
   ```typescript
   const schedule = await prisma.reportSchedule.create({
     data: {
       reportId: 'test-report-id',
       reportType: 'STANDARD',
       userId: 'test-user-id',
       frequency: 'DAILY',
       cronExpression: '0 8 * * *', // 8 AM daily
       timezone: 'America/New_York',
       format: 'PDF',
       recipients: ['test@example.com'],
       nextRunDate: new Date('2025-11-11T08:00:00-05:00'),
       status: 'ACTIVE'
     }
   });
   ```

**Expected Results**:
- ✅ Schedule created
- ✅ JSON array (recipients) stored correctly
- ✅ DateTime with timezone works

**Pass/Fail**: ______

---

### TC8.11: Test Unique Constraints
**Steps**:
1. Try creating duplicate prediction model (same modelType + modelVersion)

**Expected Results**:
- ✅ Error thrown: Unique constraint violation
- ✅ Error message: "Unique constraint failed on the fields: (`modelType`,`modelVersion`)"

**Pass/Fail**: ______

---

### TC8.12: Test Indexes Performance
**Steps**:
1. Insert 10,000 test prediction records
2. Query by entityId:
   ```typescript
   const start = Date.now();
   const predictions = await prisma.prediction.findMany({
     where: { entityType: 'APPOINTMENT', entityId: 'test-appt-id' }
   });
   const duration = Date.now() - start;
   console.log('Query duration:', duration, 'ms');
   ```

**Expected Results**:
- ✅ Query completes in <100ms (index used)
- ✅ EXPLAIN ANALYZE shows index scan (not sequential scan)

**Pass/Fail**: ______

---

### TC8.13: Rollback Test
**Steps**:
1. Create backup of database
2. Run: `npx prisma migrate rollback`
3. Verify tables removed
4. Reapply migration

**Expected Results**:
- ✅ Rollback removes all new tables
- ✅ Reapply recreates tables
- ✅ Data integrity maintained

**Pass/Fail**: ______

---

## Summary
- **Total Test Cases**: 13
- **Passed**: ______
- **Failed**: ______
- **Pass Rate**: ______%

## Database Model Checklist

**Dashboard System (3 models)**:
- [ ] Dashboard
- [ ] Widget
- [ ] ThresholdAlert

**Predictive Analytics (3 models)**:
- [ ] PredictionModel
- [ ] TrainingJob
- [ ] Prediction

**Custom Reports (2 models)**:
- [ ] ReportDefinition
- [ ] ReportVersion

**Distribution (4 models)**:
- [ ] ReportSchedule
- [ ] Subscription
- [ ] DeliveryLog
- [ ] DistributionList

**Total**: 12 Models ✅
```

---

## Conclusion

This comprehensive plan provides:

1. **8 Specialized Agents** with clear, non-overlapping missions
2. **85+ Deliverables** across all Module 8 features
3. **50+ New Reports** expanding the report library
4. **12+ Database Models** supporting all functionality
5. **8 Comprehensive Test Prompts** for Cursor to verify each agent's work

**Execution Timeline**:
- **Phase 1** (Days 1-2): Agent 8 completes database schema
- **Phase 2** (Days 3-10): All 8 agents work in parallel
- **Phase 3** (Days 11-12): Integration testing and bug fixes

**Success Metrics**:
- Module 8 completion: 30% → 100%
- All critical gaps closed
- 50+ reports available
- Dashboard framework fully functional
- Predictive analytics operational
- Automated distribution working
- Export functionality complete

**Ready for Cursor Testing**: Each test prompt is self-contained with clear pass/fail criteria and detailed expected results.
