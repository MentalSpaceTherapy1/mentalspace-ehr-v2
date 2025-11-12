import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  Close,
  Settings,
  Refresh,
  TrendingUp,
  TrendingDown,
  Remove as TrendingFlat,
  AttachMoney,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { WidgetData, Widget } from '../../types/dashboard.types';

interface WidgetRendererProps {
  widget: Widget;
  data?: WidgetData;
  loading?: boolean;
  onRemove: (widgetId: string) => void;
  onRefresh: (widgetId: string) => void;
  onConfigure?: (widgetId: string) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const WidgetRenderer: React.FC<WidgetRendererProps> = ({
  widget,
  data,
  loading,
  onRemove,
  onRefresh,
  onConfigure,
}) => {
  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress />
        </Box>
      );
    }

    if (!data) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Typography color="text.secondary">No data available</Typography>
        </Box>
      );
    }

    if (data.error) {
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          {data.error}
        </Alert>
      );
    }

    // Route to appropriate renderer based on widget type
    const category = getWidgetCategory(widget.widgetType);

    switch (category) {
      case 'KPI':
        return renderKPICard(data);
      case 'Chart':
        return renderChart(data, widget.widgetType);
      case 'Table':
        return renderTable(data);
      case 'Alert':
        return renderAlerts(data);
      case 'Gauge':
        return renderGauge(data);
      default:
        return renderOther(data, widget.widgetType);
    }
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'background.default',
        }}
      >
        <Typography variant="subtitle1" fontWeight="medium">
          {widget.title}
        </Typography>
        <Box>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={() => onRefresh(widget.id)}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
          {onConfigure && (
            <Tooltip title="Configure">
              <IconButton size="small" onClick={() => onConfigure(widget.id)}>
                <Settings fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Remove">
            <IconButton size="small" onClick={() => onRemove(widget.id)}>
              <Close fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <CardContent sx={{ flexGrow: 1, overflow: 'auto' }}>{renderContent()}</CardContent>
    </Card>
  );
};

// Helper function to get category from widget type
const getWidgetCategory = (type: string): string => {
  // Check for Chart types first (before KPI) to correctly handle REVENUE_TREND
  if (type.includes('TREND') || type.includes('BREAKDOWN') || type.includes('PRODUCTIVITY') ||
      type.includes('DEMOGRAPHICS') || type.includes('BY_STATUS') || type.includes('BY_SERVICE')) {
    return 'Chart';
  }
  if (type.includes('REVENUE') || type.includes('KVR') || type.includes('NOTES') ||
      type.includes('CLIENTS') || type.includes('RATE') || type.includes('DURATION') ||
      type.includes('WAITLIST') || type.includes('MONTHLY') || type.includes('WEEKLY') ||
      type.includes('SATISFACTION')) {
    return 'KPI';
  }
  if (type.includes('LIST') || type.includes('RECENT') || type.includes('UPCOMING') ||
      type.includes('OVERDUE') || type.includes('PENDING') || type.includes('HIGH_RISK')) {
    return 'Table';
  }
  if (type.includes('ALERTS')) {
    return 'Alert';
  }
  if (type.includes('UTILIZATION') || type.includes('VS_TARGET') || type.includes('COMPLETION') ||
      type.includes('RETENTION')) {
    return 'Gauge';
  }
  return 'Other';
};

// KPI Card Renderer
const renderKPICard = (data: WidgetData) => {
  const { value, label, format, trend, severity, urgent } = data.data;

  const formatValue = (val: any, fmt?: string) => {
    if (fmt === 'currency') {
      return `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (fmt === 'percentage') {
      return `${val}%`;
    }
    if (fmt === 'minutes') {
      return `${val} min`;
    }
    return val;
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp color="success" />;
    if (trend === 'down') return <TrendingDown color="error" />;
    return <TrendingFlat color="disabled" />;
  };

  const getSeverityColor = () => {
    if (severity === 'high') return 'error.main';
    if (severity === 'medium') return 'warning.main';
    if (severity === 'low') return 'success.main';
    return 'text.primary';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Typography variant="h3" fontWeight="bold" sx={{ color: getSeverityColor() }}>
        {formatValue(value, format)}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {label}
      </Typography>
      {trend && (
        <Box sx={{ mt: 1 }}>
          {getTrendIcon()}
        </Box>
      )}
      {urgent !== undefined && urgent > 0 && (
        <Chip
          label={`${urgent} Urgent`}
          color="error"
          size="small"
          icon={<Warning />}
          sx={{ mt: 2 }}
        />
      )}
    </Box>
  );
};

// Chart Renderer
const renderChart = (data: WidgetData, widgetType: string) => {
  const { data: chartData, chartType } = data.data;

  if (!chartData || chartData.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography color="text.secondary">No chart data available</Typography>
      </Box>
    );
  }

  if (chartType === 'pie' || widgetType.includes('BY_STATUS') || widgetType.includes('BREAKDOWN')) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="status"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label
          >
            {chartData.map((_: any, index: number) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <RechartsTooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'bar' || widgetType.includes('PRODUCTIVITY')) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="clinician" angle={-45} textAnchor="end" height={80} />
          <YAxis />
          <RechartsTooltip />
          <Legend />
          <Bar dataKey="appointments" fill={COLORS[0]} name="Appointments" />
          <Bar dataKey="revenue" fill={COLORS[1]} name="Revenue" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Default: Line chart
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <RechartsTooltip />
        <Legend />
        <Line type="monotone" dataKey="revenue" stroke={COLORS[0]} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
};

// Table Renderer
const renderTable = (data: WidgetData) => {
  const { data: tableData } = data.data;

  if (!tableData || tableData.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography color="text.secondary">No items to display</Typography>
      </Box>
    );
  }

  const columns = Object.keys(tableData[0]);

  return (
    <TableContainer component={Paper} sx={{ maxHeight: '100%' }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell key={col}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {col.charAt(0).toUpperCase() + col.slice(1).replace(/([A-Z])/g, ' $1')}
                </Typography>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {tableData.map((row: any, index: number) => (
            <TableRow key={index} hover>
              {columns.map((col) => (
                <TableCell key={col}>
                  {col === 'status' ? (
                    <Chip label={row[col]} size="small" />
                  ) : col.includes('Date') || col.includes('date') ? (
                    new Date(row[col]).toLocaleDateString()
                  ) : (
                    row[col]
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// Alerts Renderer
const renderAlerts = (data: WidgetData) => {
  const { data: alerts, totalAlerts } = data.data;

  if (!alerts || alerts.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
        <Typography variant="h6" color="success.main">
          All Clear!
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No alerts at this time
        </Typography>
      </Box>
    );
  }

  const getSeverityIcon = (severity: string) => {
    if (severity === 'high') return <ErrorIcon color="error" />;
    if (severity === 'medium') return <Warning color="warning" />;
    return <Warning color="info" />;
  };

  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="subtitle2" gutterBottom>
        {totalAlerts} Alert{totalAlerts !== 1 ? 's' : ''}
      </Typography>
      {alerts.map((alert: any, index: number) => (
        <Alert
          key={index}
          severity={alert.severity as any}
          icon={getSeverityIcon(alert.severity)}
          sx={{ mb: 1 }}
        >
          <Typography variant="body2" fontWeight="medium">
            {alert.message}
          </Typography>
          {alert.count && (
            <Typography variant="caption" color="text.secondary">
              Count: {alert.count}
            </Typography>
          )}
        </Alert>
      ))}
    </Box>
  );
};

// Gauge Renderer
const renderGauge = (data: WidgetData) => {
  const { value, label, format, gauge } = data.data;

  const percentage = parseFloat(value);
  const getColor = () => {
    if (gauge?.target) {
      if (percentage >= gauge.target) return 'success.main';
      if (percentage >= gauge.target * 0.8) return 'warning.main';
      return 'error.main';
    }
    if (percentage >= 80) return 'success.main';
    if (percentage >= 60) return 'warning.main';
    return 'error.main';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
        <CircularProgress
          variant="determinate"
          value={Math.min(percentage, 100)}
          size={120}
          thickness={4}
          sx={{ color: getColor() }}
        />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="h4" component="div" fontWeight="bold">
            {value}%
          </Typography>
        </Box>
      </Box>
      <Typography variant="body1" color="text.secondary">
        {label}
      </Typography>
      {gauge?.actual !== undefined && gauge?.targetValue !== undefined && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            ${gauge.actual.toLocaleString()} / ${gauge.targetValue.toLocaleString()}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

// Other widgets renderer
const renderOther = (data: WidgetData, widgetType: string) => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <Typography color="text.secondary">
        Widget type "{widgetType}" renderer coming soon
      </Typography>
    </Box>
  );
};

export default WidgetRenderer;
