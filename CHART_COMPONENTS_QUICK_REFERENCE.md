# Chart Components Quick Reference Guide

## Import Statement
```typescript
import {
  LineChart, BarChart, PieChart, DonutChart, AreaChart,
  HeatMap, Gauge, SparkLine, ComboChart, RadarChart,
  TreeMap, SankeyDiagram, GeographicMap, ScatterPlot, StackedBarChart
} from './components/charts';
```

---

## 1. LineChart - Trend Analysis
**Best For**: Time series, revenue trends, performance over time

```typescript
<LineChart
  data={[
    { date: '2024-01', revenue: 50000, sessions: 120 },
    { date: '2024-02', revenue: 55000, sessions: 130 },
  ]}
  xKey="date"
  yKeys={[
    { key: 'revenue', name: 'Revenue', color: '#6366f1' },
    { key: 'sessions', name: 'Sessions', color: '#10b981' }
  ]}
  title="Monthly Trends"
  height={400}
  showGrid={true}
  showLegend={true}
  formatXAxis={(date) => new Date(date).toLocaleDateString()}
  formatYAxis={(value) => `$${value.toLocaleString()}`}
  formatTooltip={(value) => `$${value.toLocaleString()}`}
  onPointClick={(data) => console.log(data)}
  animate={true}
/>
```

---

## 2. BarChart - Comparisons
**Best For**: Comparing values across categories, rankings

```typescript
<BarChart
  data={[
    { clinician: 'Dr. Smith', revenue: 75000 },
    { clinician: 'Dr. Jones', revenue: 68000 },
  ]}
  xKey="clinician"
  yKeys={[{ key: 'revenue', name: 'Revenue', color: '#6366f1' }]}
  title="Revenue by Clinician"
  horizontal={false}
  colorByValue={true}
  onBarClick={(data) => console.log(data)}
/>
```

---

## 3. StackedBarChart - Multi-Series
**Best For**: Appointment status, breakdown by category

```typescript
<StackedBarChart
  data={[
    { clinician: 'Dr. Smith', kept: 100, cancelled: 10, noShow: 5 },
  ]}
  xKey="clinician"
  yKeys={[
    { key: 'kept', name: 'Kept', color: '#10b981' },
    { key: 'cancelled', name: 'Cancelled', color: '#f59e0b' },
    { key: 'noShow', name: 'No-Show', color: '#ef4444' }
  ]}
  title="KVR Breakdown"
/>
```

---

## 4. PieChart - Distribution
**Best For**: Percentage breakdown, market share

```typescript
<PieChart
  data={[
    { payer: 'Blue Cross', revenue: 120000 },
    { payer: 'Aetna', revenue: 95000 },
  ]}
  nameKey="payer"
  valueKey="revenue"
  title="Revenue by Payer"
  showPercentage={true}
  onSliceClick={(data) => console.log(data)}
/>
```

---

## 5. DonutChart - Enhanced Distribution
**Best For**: Same as PieChart, with center label

```typescript
<DonutChart
  data={payerData}
  nameKey="payer"
  valueKey="revenue"
  title="Payer Mix"
  centerLabel="Total"
  centerValue="$215,000"
/>
```

---

## 6. AreaChart - Volume Trends
**Best For**: Capacity tracking, cumulative metrics

```typescript
<AreaChart
  data={sessionData}
  xKey="date"
  yKeys={[{ key: 'sessions', name: 'Sessions', color: '#3b82f6' }]}
  title="Daily Sessions"
  stacked={false}
/>
```

---

## 7. HeatMap - Utilization Matrix
**Best For**: Hour × day utilization, performance matrix

```typescript
<HeatMap
  data={[
    { hour: '9am', clinician: 'Dr. Smith', sessions: 3 },
    { hour: '10am', clinician: 'Dr. Smith', sessions: 4 },
  ]}
  xKey="hour"
  yKey="clinician"
  valueKey="sessions"
  title="Scheduling Utilization"
  showValues={true}
  formatValue={(v) => v.toString()}
/>
```

---

## 8. Gauge - KPI Display
**Best For**: Capacity, performance indicators

```typescript
<Gauge
  value={75}
  min={0}
  max={100}
  title="Capacity Utilization"
  label="Percentage"
  thresholds={[
    { value: 0, color: '#ef4444', label: 'Low' },
    { value: 40, color: '#f59e0b', label: 'Medium' },
    { value: 70, color: '#10b981', label: 'High' }
  ]}
  formatValue={(v) => `${v}%`}
/>
```

---

## 9. SparkLine - Inline Trends
**Best For**: Dashboard stats, compact trends

```typescript
<SparkLine
  data={[
    { value: 100 },
    { value: 120 },
    { value: 115 },
  ]}
  dataKey="value"
  color="#6366f1"
  height={40}
  width={100}
  showDots={false}
/>
```

---

## 10. ComboChart - Mixed Types
**Best For**: Multi-metric analysis with different scales

```typescript
<ComboChart
  data={data}
  xKey="date"
  series={[
    { key: 'revenue', name: 'Revenue', color: '#6366f1', type: 'bar', yAxisId: 'left' },
    { key: 'sessions', name: 'Sessions', color: '#10b981', type: 'line', yAxisId: 'right' }
  ]}
  formatYAxisLeft={(v) => `$${v}`}
  formatYAxisRight={(v) => v.toString()}
/>
```

---

## 11. RadarChart - Multi-Dimensional
**Best For**: Performance across multiple metrics

```typescript
<RadarChart
  data={[
    { metric: 'Quality', score: 85 },
    { metric: 'Speed', score: 90 },
  ]}
  angleKey="metric"
  dataKeys={[{ key: 'score', name: 'Score', color: '#6366f1' }]}
/>
```

---

## 12. TreeMap - Hierarchical
**Best For**: Budget allocation, resource distribution

```typescript
<TreeMap
  data={[
    { service: 'Therapy', revenue: 150000 },
    { service: 'Assessment', revenue: 80000 },
  ]}
  nameKey="service"
  valueKey="revenue"
  title="Revenue by Service"
/>
```

---

## 13. SankeyDiagram - Flow Visualization
**Best For**: Client journey, process flows

```typescript
<SankeyDiagram
  nodes={[
    { id: 'referral', name: 'Referral' },
    { id: 'intake', name: 'Intake' },
  ]}
  links={[
    { source: 'referral', target: 'intake', value: 50 },
  ]}
  title="Client Journey"
/>
```

---

## 14. ScatterPlot - Correlation
**Best For**: Relationship analysis, outlier detection

```typescript
<ScatterPlot
  data={[
    { sessions: 10, revenue: 5000 },
    { sessions: 15, revenue: 7500 },
  ]}
  xKey="sessions"
  yKey="revenue"
  title="Sessions vs Revenue"
/>
```

---

## 15. GeographicMap - Location Data
**Best For**: Regional analysis, location trends

```typescript
<GeographicMap
  data={[
    { name: 'Atlanta', lat: 33.749, lng: -84.388, value: 120 },
  ]}
  title="Client Distribution"
  centerLat={33.749}
  centerLng={-84.388}
/>
```

---

## Common Props (All Charts)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | string | - | Chart title |
| `height` | number | 400 | Chart height in pixels |
| `showLegend` | boolean | true | Display legend |
| `animate` | boolean | true | Enable animations |
| `formatTooltip` | function | - | Format tooltip values |

---

## Export Utilities

```typescript
import {
  exportChartAsImage,
  exportChartDataAsCSV,
  copyChartToClipboard,
  printChart
} from './utils/chartExport';

// Export as PNG
await exportChartAsImage(chartRef.current, 'my-chart', 'png');

// Export as SVG
await exportChartAsImage(chartRef.current, 'my-chart', 'svg');

// Export data as CSV
exportChartDataAsCSV(data, columns, 'data');

// Copy to clipboard
await copyChartToClipboard(chartRef.current);

// Print
printChart(chartRef.current);
```

---

## Color Palette

```typescript
const CHART_COLORS = {
  primary: '#6366f1',   // Indigo
  secondary: '#8b5cf6', // Purple
  accent: '#ec4899',    // Pink
  warning: '#f59e0b',   // Orange
  success: '#10b981',   // Green
  info: '#3b82f6',      // Blue
  danger: '#ef4444',    // Red
  cyan: '#06b6d4',
  lime: '#84cc16',
  orange: '#f97316'
};
```

---

## Responsive Breakpoints

```typescript
// Mobile
@media (max-width: 768px) {
  height: 300px
}

// Tablet
@media (min-width: 769px) and (max-width: 1024px) {
  height: 350px
}

// Desktop
@media (min-width: 1025px) {
  height: 400px
}
```

---

## Tips & Best Practices

1. **Data Format**: Ensure data matches xKey/yKeys structure
2. **Performance**: Limit data points to < 1000 for smooth rendering
3. **Colors**: Use color-blind friendly palettes (avoid red/green only)
4. **Tooltips**: Always provide formatTooltip for currency/percentages
5. **Accessibility**: Include title and ARIA labels
6. **Mobile**: Test on small screens, use responsive heights
7. **Export**: Attach ref to chart container for export functionality

---

## Troubleshooting

**Chart not rendering?**
- Check data structure matches props
- Verify xKey/yKeys exist in data objects
- Ensure data array is not empty

**Poor performance?**
- Reduce data points (paginate or aggregate)
- Disable animations (`animate={false}`)
- Use memoization for data transformations

**Export failing?**
- Verify ref is attached to DOM element
- Check browser supports Canvas API
- Ensure chart is fully rendered before export

---

## Support

For questions or issues, refer to:
- Recharts Docs: https://recharts.org/
- Implementation Guide: MODULE_8_DATA_VISUALIZATION_IMPLEMENTATION.md
