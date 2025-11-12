import React, { useState } from 'react';
import { WidgetType, WidgetDefinition } from '../../types/dashboard.types';

interface WidgetLibraryProps {
  onAddWidget: (widgetType: WidgetType) => void;
}

// Complete widget library with 35+ widget types
export const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  // KPI Cards
  {
    type: 'REVENUE_TODAY',
    name: 'Revenue Today',
    description: 'Total revenue for today',
    category: 'KPI',
    icon: '💰',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: {},
    configurable: true,
  },
  {
    type: 'KVR',
    name: 'Key Verification Rate',
    description: 'Percentage of signed notes',
    category: 'KPI',
    icon: '✅',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: { period: 30 },
    configurable: true,
  },
  {
    type: 'UNSIGNED_NOTES',
    name: 'Unsigned Notes',
    description: 'Count of unsigned clinical notes',
    category: 'KPI',
    icon: '📝',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: {},
    configurable: true,
  },
  {
    type: 'ACTIVE_CLIENTS',
    name: 'Active Clients',
    description: 'Number of active clients',
    category: 'KPI',
    icon: '👥',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: { period: 90 },
    configurable: true,
  },
  {
    type: 'NO_SHOW_RATE',
    name: 'No-Show Rate',
    description: 'Percentage of no-show appointments',
    category: 'KPI',
    icon: '⚠️',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: { period: 30 },
    configurable: true,
  },
  {
    type: 'AVG_SESSION_DURATION',
    name: 'Avg Session Duration',
    description: 'Average session length in minutes',
    category: 'KPI',
    icon: '⏱️',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: { period: 30 },
    configurable: true,
  },
  {
    type: 'WAITLIST_SUMMARY',
    name: 'Waitlist Summary',
    description: 'Current waitlist count',
    category: 'KPI',
    icon: '📋',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: {},
    configurable: true,
  },
  {
    type: 'MONTHLY_REVENUE',
    name: 'Monthly Revenue',
    description: 'Total revenue for current month',
    category: 'KPI',
    icon: '💵',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: {},
    configurable: false,
  },
  {
    type: 'WEEKLY_APPOINTMENTS',
    name: 'Weekly Appointments',
    description: 'Total appointments this week',
    category: 'KPI',
    icon: '📅',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: {},
    configurable: false,
  },
  {
    type: 'CLIENT_SATISFACTION',
    name: 'Client Satisfaction',
    description: 'Average satisfaction score',
    category: 'KPI',
    icon: '⭐',
    defaultSize: { x: 0, y: 0, w: 3, h: 2 },
    defaultConfig: {},
    configurable: false,
  },

  // Charts
  {
    type: 'REVENUE_TREND',
    name: 'Revenue Trend',
    description: 'Revenue over time line chart',
    category: 'Chart',
    icon: '📈',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: { period: 30, chartType: 'line' },
    configurable: true,
  },
  {
    type: 'APPOINTMENTS_BY_STATUS',
    name: 'Appointments by Status',
    description: 'Pie chart of appointment statuses',
    category: 'Chart',
    icon: '🥧',
    defaultSize: { x: 0, y: 0, w: 4, h: 4 },
    defaultConfig: { period: 30 },
    configurable: true,
  },
  {
    type: 'CLINICIAN_PRODUCTIVITY',
    name: 'Clinician Productivity',
    description: 'Bar chart of clinician metrics',
    category: 'Chart',
    icon: '📊',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: { period: 30 },
    configurable: true,
  },
  {
    type: 'APPOINTMENT_TYPES_BREAKDOWN',
    name: 'Appointment Types',
    description: 'Breakdown by appointment type',
    category: 'Chart',
    icon: '📉',
    defaultSize: { x: 0, y: 0, w: 4, h: 4 },
    defaultConfig: { period: 30 },
    configurable: true,
  },
  {
    type: 'CLIENT_DEMOGRAPHICS',
    name: 'Client Demographics',
    description: 'Age and gender distribution',
    category: 'Chart',
    icon: '👨‍👩‍👧‍👦',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: {},
    configurable: false,
  },
  {
    type: 'REVENUE_BY_SERVICE',
    name: 'Revenue by Service',
    description: 'Revenue breakdown by service type',
    category: 'Chart',
    icon: '💹',
    defaultSize: { x: 0, y: 0, w: 4, h: 4 },
    defaultConfig: { period: 30 },
    configurable: true,
  },
  {
    type: 'CANCELLATION_TREND',
    name: 'Cancellation Trend',
    description: 'Cancellation rate over time',
    category: 'Chart',
    icon: '📉',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: { period: 90 },
    configurable: true,
  },
  {
    type: 'UTILIZATION_TREND',
    name: 'Utilization Trend',
    description: 'Capacity utilization over time',
    category: 'Chart',
    icon: '📊',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: { period: 30 },
    configurable: true,
  },

  // Tables
  {
    type: 'RECENT_APPOINTMENTS',
    name: 'Recent Appointments',
    description: 'List of recent appointments',
    category: 'Table',
    icon: '📋',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: { limit: 10 },
    configurable: true,
  },
  {
    type: 'UNSIGNED_NOTES_LIST',
    name: 'Unsigned Notes List',
    description: 'List of unsigned clinical notes',
    category: 'Table',
    icon: '📄',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: { limit: 10 },
    configurable: true,
  },
  {
    type: 'UPCOMING_APPOINTMENTS',
    name: 'Upcoming Appointments',
    description: 'List of upcoming appointments',
    category: 'Table',
    icon: '🗓️',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: { limit: 10 },
    configurable: true,
  },
  {
    type: 'OVERDUE_TASKS',
    name: 'Overdue Tasks',
    description: 'List of overdue tasks',
    category: 'Table',
    icon: '⏰',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: { limit: 10 },
    configurable: true,
  },
  {
    type: 'HIGH_RISK_CLIENTS',
    name: 'High Risk Clients',
    description: 'Clients requiring attention',
    category: 'Table',
    icon: '🚨',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: { limit: 10 },
    configurable: true,
  },
  {
    type: 'BILLING_PENDING',
    name: 'Billing Pending',
    description: 'Appointments pending billing',
    category: 'Table',
    icon: '💳',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: { limit: 10 },
    configurable: true,
  },

  // Alerts
  {
    type: 'COMPLIANCE_ALERTS',
    name: 'Compliance Alerts',
    description: 'Compliance and regulatory alerts',
    category: 'Alert',
    icon: '🔔',
    defaultSize: { x: 0, y: 0, w: 4, h: 3 },
    defaultConfig: {},
    configurable: false,
  },
  {
    type: 'THRESHOLD_ALERTS',
    name: 'Threshold Alerts',
    description: 'Custom threshold alerts',
    category: 'Alert',
    icon: '⚡',
    defaultSize: { x: 0, y: 0, w: 4, h: 3 },
    defaultConfig: {},
    configurable: false,
  },
  {
    type: 'SYSTEM_ALERTS',
    name: 'System Alerts',
    description: 'System notifications and alerts',
    category: 'Alert',
    icon: '🔕',
    defaultSize: { x: 0, y: 0, w: 4, h: 3 },
    defaultConfig: {},
    configurable: false,
  },

  // Gauges
  {
    type: 'CAPACITY_UTILIZATION',
    name: 'Capacity Utilization',
    description: 'Current capacity utilization gauge',
    category: 'Gauge',
    icon: '⚡',
    defaultSize: { x: 0, y: 0, w: 3, h: 3 },
    defaultConfig: { period: 7 },
    configurable: true,
  },
  {
    type: 'REVENUE_VS_TARGET',
    name: 'Revenue vs Target',
    description: 'Revenue achievement gauge',
    category: 'Gauge',
    icon: '🎯',
    defaultSize: { x: 0, y: 0, w: 3, h: 3 },
    defaultConfig: { period: 30, target: 100000 },
    configurable: true,
  },
  {
    type: 'DOCUMENTATION_COMPLETION',
    name: 'Documentation Completion',
    description: 'Documentation completion rate',
    category: 'Gauge',
    icon: '📝',
    defaultSize: { x: 0, y: 0, w: 3, h: 3 },
    defaultConfig: {},
    configurable: false,
  },
  {
    type: 'CLIENT_RETENTION',
    name: 'Client Retention',
    description: 'Client retention rate',
    category: 'Gauge',
    icon: '🔄',
    defaultSize: { x: 0, y: 0, w: 3, h: 3 },
    defaultConfig: {},
    configurable: false,
  },

  // Other
  {
    type: 'CALENDAR_OVERVIEW',
    name: 'Calendar Overview',
    description: 'Mini calendar with appointments',
    category: 'Other',
    icon: '📆',
    defaultSize: { x: 0, y: 0, w: 4, h: 4 },
    defaultConfig: {},
    configurable: false,
  },
  {
    type: 'TASK_LIST',
    name: 'Task List',
    description: 'Personal task list',
    category: 'Other',
    icon: '✓',
    defaultSize: { x: 0, y: 0, w: 4, h: 4 },
    defaultConfig: {},
    configurable: false,
  },
  {
    type: 'QUICK_STATS',
    name: 'Quick Stats',
    description: 'Quick statistics overview',
    category: 'Other',
    icon: '📌',
    defaultSize: { x: 0, y: 0, w: 6, h: 2 },
    defaultConfig: {},
    configurable: false,
  },
  {
    type: 'HEAT_MAP',
    name: 'Heat Map',
    description: 'Activity heat map',
    category: 'Other',
    icon: '🔥',
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    defaultConfig: {},
    configurable: false,
  },
];

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'KPI':
      return 'from-cyan-500 to-blue-600';
    case 'Chart':
      return 'from-purple-500 to-indigo-600';
    case 'Table':
      return 'from-green-500 to-emerald-600';
    case 'Alert':
      return 'from-red-500 to-rose-600';
    case 'Gauge':
      return 'from-amber-500 to-orange-600';
    case 'Other':
      return 'from-teal-500 to-cyan-600';
    default:
      return 'from-gray-500 to-slate-600';
  }
};

const getCategoryEmoji = (category: string) => {
  switch (category) {
    case 'KPI':
      return '📊';
    case 'Chart':
      return '📈';
    case 'Table':
      return '📋';
    case 'Alert':
      return '🔔';
    case 'Gauge':
      return '⚡';
    case 'Other':
      return '🔧';
    default:
      return '📦';
  }
};

const WidgetLibrary: React.FC<WidgetLibraryProps> = ({ onAddWidget }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'KPI', 'Chart', 'Table', 'Alert', 'Gauge', 'Other'];

  const filteredWidgets = WIDGET_DEFINITIONS.filter((widget) => {
    const matchesSearch =
      widget.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      widget.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || widget.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 rounded-2xl shadow-xl p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl p-6 mb-6 shadow-lg">
        <div className="flex items-center space-x-3 mb-2">
          <span className="text-4xl">🧩</span>
          <h2 className="text-3xl font-bold text-white">Widget Library</h2>
        </div>
        <p className="text-cyan-100 text-sm">
          Browse and add powerful widgets to customize your dashboard
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
          <span className="mr-2">🔍</span> Search Widgets
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="Search by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-5 py-3 pl-12 border-2 border-cyan-200 rounded-xl focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all duration-200 font-medium text-gray-800 placeholder-gray-400 shadow-md"
          />
          <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-cyan-500 text-xl">
            🔍
          </span>
        </div>
      </div>

      {/* Category Filters */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
          <span className="mr-2">🏷️</span> Filter by Category
        </label>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`
                px-5 py-2 rounded-xl font-bold text-sm transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg
                ${
                  selectedCategory === category
                    ? `bg-gradient-to-r ${category === 'All' ? 'from-cyan-600 to-blue-600' : getCategoryColor(category)} text-white`
                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-cyan-400'
                }
              `}
            >
              <span className="mr-1">{category === 'All' ? '📦' : getCategoryEmoji(category)}</span>
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Widget Grid */}
      {filteredWidgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWidgets.map((widget) => (
            <div
              key={widget.type}
              className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 overflow-hidden border-2 border-gray-100 hover:border-cyan-300"
            >
              {/* Widget Header */}
              <div className={`bg-gradient-to-r ${getCategoryColor(widget.category)} p-4`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 bg-white bg-opacity-30 rounded-lg flex items-center justify-center backdrop-blur-sm">
                      <span className="text-2xl">{widget.icon}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white leading-tight">
                        {widget.name}
                      </h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-white bg-opacity-30 text-white mt-1">
                        {getCategoryEmoji(widget.category)} {widget.category}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Widget Body */}
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {widget.description}
                </p>

                {/* Widget Info */}
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <span className="flex items-center">
                    <span className="mr-1">📐</span>
                    Size: {widget.defaultSize.w}x{widget.defaultSize.h}
                  </span>
                  {widget.configurable && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 font-bold">
                      <span className="mr-1">⚙️</span> Configurable
                    </span>
                  )}
                </div>

                {/* Add Button */}
                <button
                  onClick={() => onAddWidget(widget.type)}
                  className={`
                    w-full px-4 py-2.5 bg-gradient-to-r ${getCategoryColor(widget.category)}
                    text-white rounded-lg font-bold shadow-md hover:shadow-xl
                    transform hover:scale-105 transition-all duration-200
                    flex items-center justify-center space-x-2
                  `}
                >
                  <span className="text-lg">➕</span>
                  <span>Add to Dashboard</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <div className="text-8xl mb-4">🔍</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">No Widgets Found</h3>
          <p className="text-gray-600 mb-6">
            Try adjusting your search or filter to find the perfect widget
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('All');
            }}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
          >
            <span className="mr-2">🔄</span>
            Reset Filters
          </button>
        </div>
      )}

      {/* Widget Count Summary */}
      {filteredWidgets.length > 0 && (
        <div className="mt-6 bg-white rounded-xl p-4 shadow-md border-2 border-cyan-100">
          <p className="text-sm font-semibold text-gray-700 text-center">
            <span className="text-cyan-600 font-bold">{filteredWidgets.length}</span> widget
            {filteredWidgets.length !== 1 ? 's' : ''} available
            {selectedCategory !== 'All' && (
              <span className="text-gray-500">
                {' '}
                in <span className="text-cyan-600">{selectedCategory}</span> category
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default WidgetLibrary;
