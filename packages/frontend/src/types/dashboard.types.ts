export interface Dashboard {
  id: string;
  userId: string;
  name: string;
  description?: string;
  layout: Record<string, any>;
  isDefault: boolean;
  isPublic: boolean;
  role?: string;
  createdAt: string;
  updatedAt: string;
  widgets: Widget[];
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface Widget {
  id: string;
  dashboardId: string;
  widgetType: WidgetType;
  title: string;
  config: Record<string, any>;
  position: GridPosition;
  refreshRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface GridPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type WidgetType =
  // KPI Cards
  | 'REVENUE_TODAY'
  | 'KVR'
  | 'UNSIGNED_NOTES'
  | 'ACTIVE_CLIENTS'
  | 'NO_SHOW_RATE'
  | 'AVG_SESSION_DURATION'
  | 'WAITLIST_SUMMARY'
  | 'MONTHLY_REVENUE'
  | 'WEEKLY_APPOINTMENTS'
  | 'CLIENT_SATISFACTION'
  // Charts
  | 'REVENUE_TREND'
  | 'APPOINTMENTS_BY_STATUS'
  | 'CLINICIAN_PRODUCTIVITY'
  | 'APPOINTMENT_TYPES_BREAKDOWN'
  | 'CLIENT_DEMOGRAPHICS'
  | 'REVENUE_BY_SERVICE'
  | 'CANCELLATION_TREND'
  | 'UTILIZATION_TREND'
  // Tables
  | 'RECENT_APPOINTMENTS'
  | 'UNSIGNED_NOTES_LIST'
  | 'UPCOMING_APPOINTMENTS'
  | 'OVERDUE_TASKS'
  | 'HIGH_RISK_CLIENTS'
  | 'BILLING_PENDING'
  // Alerts
  | 'COMPLIANCE_ALERTS'
  | 'THRESHOLD_ALERTS'
  | 'SYSTEM_ALERTS'
  // Gauges
  | 'CAPACITY_UTILIZATION'
  | 'REVENUE_VS_TARGET'
  | 'DOCUMENTATION_COMPLETION'
  | 'CLIENT_RETENTION'
  // Other
  | 'CALENDAR_OVERVIEW'
  | 'TASK_LIST'
  | 'QUICK_STATS'
  | 'HEAT_MAP';

export interface WidgetData {
  widgetId: string;
  widgetType: WidgetType;
  title: string;
  data: any;
  error?: string;
}

export interface DashboardData {
  dashboardId: string;
  dashboardName: string;
  widgets: WidgetData[];
  lastUpdated: string;
}

export interface WidgetConfig {
  clinicianId?: string;
  period?: number;
  limit?: number;
  status?: string;
  overdue?: boolean;
  target?: number;
  appointmentType?: string;
  chartType?: 'line' | 'bar' | 'pie' | 'area';
  color?: string;
}

export interface WidgetDefinition {
  type: WidgetType;
  name: string;
  description: string;
  category: 'KPI' | 'Chart' | 'Table' | 'Alert' | 'Gauge' | 'Other';
  icon: string;
  defaultSize: GridPosition;
  defaultConfig: WidgetConfig;
  configurable: boolean;
}
