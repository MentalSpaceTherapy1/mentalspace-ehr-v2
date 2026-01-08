/**
 * Navigation Configuration
 * Optimized menu structure - January 2026
 *
 * Changes from original:
 * - Phase 1: Removed duplicates (Reports Dashboard from Module 9, Client Progress from Clinician Tools, etc.)
 * - Phase 2: Relocated items to appropriate modules (Time-Off to HR, Provider Availability to Appointments, etc.)
 * - Phase 3: Consolidated modules (Reports & Analytics, Staff & HR, Compliance & Training, Portals)
 * - Phase 4: Simplified remaining modules (Admin Tools, Clinician Tools, Settings with Integrations)
 *
 * Result: Reduced from ~27 top-level items to ~17, with clearer organization
 */

export interface NavItem {
  path: string;
  icon: string;
  label: string;
  color: string;
  hasSubmenu?: boolean;
  submenu?: { path: string; label: string }[];
}

export interface MenuState {
  [key: string]: boolean;
}

/**
 * Get the productivity dashboard path based on user role
 */
export const getProductivityPath = (role?: string): string => {
  if (role === 'ADMINISTRATOR' || role === 'SUPER_ADMIN') {
    return '/productivity/administrator';
  } else if (role === 'SUPERVISOR') {
    return '/productivity/supervisor';
  }
  return '/productivity/clinician';
};

/**
 * Main navigation items configuration
 * Optimized structure with consolidated modules
 */
export const getNavItems = (userRole?: string): NavItem[] => [
  // Core Dashboard
  { path: '/dashboard', icon: '📊', label: 'Dashboard', color: 'from-blue-500 to-cyan-500' },

  // Client Management
  {
    path: '/clients',
    icon: '👥',
    label: 'Clients',
    color: 'from-purple-500 to-pink-500',
    hasSubmenu: true,
    submenu: [
      { path: '/clients', label: 'Client List' },
      { path: '/clients/duplicates', label: 'Duplicate Detection' },
    ]
  },

  // Scheduling - Consolidated with Provider Availability and Appointment Types
  {
    path: '/appointments',
    icon: '📅',
    label: 'Appointments',
    color: 'from-green-500 to-emerald-500',
    hasSubmenu: true,
    submenu: [
      { path: '/appointments', label: 'Calendar' },
      { path: '/appointments/ai-assistant', label: '✨ AI Scheduling Assistant' },
      { path: '/settings/availability', label: 'Provider Availability' },
      { path: '/settings/appointment-types', label: 'Appointment Types' },
      { path: '/admin/waitlist-management', label: 'Waitlist Management' },
    ]
  },

  // Group Therapy Sessions
  { path: '/groups', icon: '👥', label: 'Group Sessions', color: 'from-cyan-500 to-blue-500' },

  // Clinical Documentation - Now includes Crisis Detections
  {
    path: '/notes',
    icon: '📝',
    label: 'Clinical Notes',
    color: 'from-amber-500 to-orange-500',
    hasSubmenu: true,
    submenu: [
      { path: '/notes', label: 'Compliance Dashboard' },
      { path: '/notes/my-notes', label: 'My Notes' },
      { path: '/clinical-notes/new', label: 'Create New Note' },
      { path: '/admin/crisis-detections', label: 'Crisis Detections' },
    ]
  },

  // Financial - Unchanged
  {
    path: '/billing',
    icon: '💰',
    label: 'Billing',
    color: 'from-teal-500 to-cyan-500',
    hasSubmenu: true,
    submenu: [
      { path: '/billing', label: 'Billing Dashboard' },
      { path: '/billing/payer-dashboard', label: 'Payer Dashboard' },
      { path: '/billing/payers', label: 'Payer Management' },
      { path: '/billing/holds', label: 'Billing Holds' },
      { path: '/billing/readiness', label: 'Readiness Checker' },
      { path: '/billing/charges', label: 'Charges' },
      { path: '/billing/payments', label: 'Payments' },
    ]
  },

  // CONSOLIDATED: Reports + Analytics & AI + Module 9 Reports
  {
    path: '/reports',
    icon: '📈',
    label: 'Reports & Analytics',
    color: 'from-emerald-500 to-teal-600',
    hasSubmenu: true,
    submenu: [
      { path: '/reports', label: 'Reports Dashboard' },
      { path: '/reports/custom', label: 'Custom Reports' },
      { path: '/reports/subscriptions', label: 'Report Subscriptions' },
      { path: '/dashboards', label: 'Custom Dashboards' },
      { path: '/predictions', label: 'AI Predictions' },
      { path: '/appointments/provider-comparison', label: 'Provider Comparison' },
      { path: '/admin/session-ratings', label: 'Session Ratings' },
      { path: '/module9/reports/builder', label: 'Report Builder' },
      { path: '/module9/dashboards', label: 'Dashboard Widgets' },
      { path: '/module9/analytics', label: 'Analytics Charts' },
    ]
  },

  // Progress Tracking - Simplified (removed duplicate from Clinician Tools)
  {
    path: '/progress-tracking',
    icon: '📊',
    label: 'Progress Tracking',
    color: 'from-green-500 to-teal-600',
    hasSubmenu: true,
    submenu: [
      { path: '/progress-tracking', label: 'Progress Dashboard' },
      { path: '/clinician/client-progress', label: 'Client Progress' },
    ]
  },

  // CONSOLIDATED: Users + Staff Management + HR Functions
  {
    path: '/staff',
    icon: '👔',
    label: 'Staff & HR',
    color: 'from-orange-600 to-red-600',
    hasSubmenu: true,
    submenu: [
      { path: '/staff', label: 'Staff Directory' },
      { path: '/staff/org-chart', label: 'Org Chart' },
      { path: '/onboarding', label: 'Onboarding Dashboard' },
      { path: '/hr/performance', label: 'Performance Reviews' },
      { path: '/hr/timeclock', label: 'Time Clock' },
      { path: '/hr/attendance', label: 'Attendance Calendar' },
      { path: '/hr/attendance/report', label: 'Attendance Reports' },
      { path: '/hr/pto/request', label: 'PTO Requests' },
      { path: '/hr/pto/calendar', label: 'PTO Calendar' },
      { path: '/hr/pto/approval', label: 'PTO Approvals' },
      { path: '/appointments/schedules', label: 'Clinician Schedules' },
      { path: '/users', label: 'User Management' },
    ]
  },

  // CONSOLIDATED: Credentialing + Training + Compliance
  {
    path: '/compliance-training',
    icon: '🎓',
    label: 'Compliance & Training',
    color: 'from-blue-600 to-indigo-600',
    hasSubmenu: true,
    submenu: [
      { path: '/credentialing', label: 'Dashboard' },
      { path: '/credentialing/list', label: 'Credential List' },
      { path: '/credentialing/verification', label: 'Verification' },
      { path: '/credentialing/alerts', label: 'Expiration Alerts' },
      { path: '/credentialing/compliance', label: 'Compliance Report' },
      { path: '/credentialing/screening', label: 'Background Screening' },
      { path: '/credentialing/documents', label: 'Document Upload' },
      { path: '/training/catalog', label: 'Course Catalog' },
      { path: '/training/ceu', label: 'CEU Tracker' },
      { path: '/training/calendar', label: 'Training Calendar' },
      { path: '/compliance/policies', label: 'Policy Library' },
      { path: '/compliance/incidents', label: 'Incident Reports' },
      { path: '/compliance/trends', label: 'Incident Trends' },
    ]
  },

  // CONSOLIDATED: Guardian Portal + Client Portal
  {
    path: '/portals',
    icon: '🌐',
    label: 'Portals',
    color: 'from-emerald-500 to-teal-500',
    hasSubmenu: true,
    submenu: [
      { path: '/client-portal', label: 'Client Portal' },
      { path: '/guardian-portal', label: 'Guardian Dashboard' },
      { path: '/guardian/portal', label: 'My Dependents' },
      { path: '/guardian/request-access', label: 'Request Access' },
      { path: '/admin/guardian-verification', label: 'Guardian Verification' },
    ]
  },

  // SIMPLIFIED: Admin Tools - Essential admin functions
  {
    path: '/admin',
    icon: '🔧',
    label: 'Admin Tools',
    color: 'from-purple-600 to-pink-600',
    hasSubmenu: true,
    submenu: [
      { path: '/admin', label: 'Admin Dashboard' },
      { path: '/module9/audit-log', label: 'Audit Log Viewer' },
    ]
  },

  // SIMPLIFIED: Clinician Tools - Only essential clinician functions
  {
    path: '/clinician',
    icon: '🩺',
    label: 'Clinician Tools',
    color: 'from-teal-500 to-cyan-600',
    hasSubmenu: true,
    submenu: [
      { path: '/clinician', label: 'Clinician Dashboard' },
    ]
  },

  // Telehealth - Standalone
  { path: '/telehealth', icon: '📹', label: 'Telehealth', color: 'from-blue-600 to-indigo-600' },

  // Self-Schedule - Standalone
  { path: '/self-schedule', icon: '🗓️', label: 'Self-Schedule', color: 'from-violet-500 to-purple-600' },

  // Supervision - Standalone
  { path: '/supervision', icon: '👨‍🏫', label: 'Supervision', color: 'from-rose-500 to-red-500' },

  // Productivity - Role-based dashboard
  { path: getProductivityPath(userRole), icon: '📊', label: 'Productivity', color: 'from-violet-500 to-fuchsia-500' },

  // Communication - Unchanged
  {
    path: '/communication',
    icon: '💬',
    label: 'Communication',
    color: 'from-teal-600 to-cyan-600',
    hasSubmenu: true,
    submenu: [
      { path: '/messages', label: 'Messaging Hub' },
      { path: '/channels', label: 'Channels' },
      { path: '/documents', label: 'Document Library' },
    ]
  },

  // Vendors & Finance - Unchanged
  {
    path: '/vendor',
    icon: '💵',
    label: 'Vendors & Finance',
    color: 'from-yellow-600 to-orange-600',
    hasSubmenu: true,
    submenu: [
      { path: '/vendors', label: 'Vendor Management' },
      { path: '/finance/budget', label: 'Budget Dashboard' },
      { path: '/finance/expenses', label: 'Expense Management' },
      { path: '/finance/purchase-orders', label: 'Purchase Orders' },
    ]
  },

  // UPDATED: Settings - Now includes Scheduling Rules and Integrations
  {
    path: '/settings',
    icon: '⚙️',
    label: 'Settings',
    color: 'from-gray-500 to-slate-600',
    hasSubmenu: true,
    submenu: [
      { path: '/settings', label: 'Practice Settings' },
      { path: '/settings/reminders', label: 'Reminder Settings' },
      { path: '/admin/scheduling-rules', label: 'Scheduling Rules' },
      { path: '/admin/advancedmd-sync', label: '🔄 AdvancedMD Sync' },
      { path: '/admin/advancedmd-settings', label: '⚙️ AdvancedMD Settings' },
    ]
  },
];

/**
 * Menu keys that have submenus
 * Updated to match new consolidated structure
 */
export const MENU_KEYS = [
  '/clients',
  '/appointments',
  '/notes',
  '/billing',
  '/reports',
  '/progress-tracking',
  '/staff',
  '/compliance-training',
  '/portals',
  '/admin',
  '/clinician',
  '/communication',
  '/vendor',
  '/settings',
] as const;

export type MenuKey = typeof MENU_KEYS[number];

/**
 * Initial menu state - all menus closed
 */
export const getInitialMenuState = (): Record<MenuKey, boolean> => {
  const state: Record<string, boolean> = {};
  MENU_KEYS.forEach(key => {
    state[key] = false;
  });
  return state as Record<MenuKey, boolean>;
};
