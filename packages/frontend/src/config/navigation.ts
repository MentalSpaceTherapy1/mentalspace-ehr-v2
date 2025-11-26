/**
 * Navigation Configuration
 * Extracted from Layout.tsx for better maintainability
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
 */
export const getNavItems = (userRole?: string): NavItem[] => [
  { path: '/dashboard', icon: '🏠', label: 'Dashboard', color: 'from-blue-500 to-cyan-500' },
  {
    path: '/clients',
    icon: '🧑‍⚕️',
    label: 'Clients',
    color: 'from-purple-500 to-pink-500',
    hasSubmenu: true,
    submenu: [
      { path: '/clients', label: 'Client List' },
      { path: '/clients/duplicates', label: 'Duplicate Detection' },
    ]
  },
  {
    path: '/appointments',
    icon: '📅',
    label: 'Appointments',
    color: 'from-green-500 to-emerald-500',
    hasSubmenu: true,
    submenu: [
      { path: '/appointments', label: 'Calendar' },
      { path: '/appointments/ai-assistant', label: '✨ AI Scheduling Assistant' },
      { path: '/appointments/provider-comparison', label: 'Provider Comparison' },
      { path: '/appointments/schedules', label: 'Clinician Schedules' },
      { path: '/appointments/waitlist', label: 'Waitlist' },
      { path: '/appointments/time-off', label: 'Time-Off Requests' },
    ]
  },
  { path: '/groups', icon: '👥', label: 'Group Sessions', color: 'from-cyan-500 to-blue-500' },
  {
    path: '/notes',
    icon: '📝',
    label: 'Clinical Notes',
    color: 'from-amber-500 to-orange-500',
    hasSubmenu: true,
    submenu: [
      { path: '/notes', label: 'Compliance Dashboard' },
      { path: '/notes/my-notes', label: 'My Notes' },
    ]
  },
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
  {
    path: '/reports',
    icon: '📈',
    label: 'Reports',
    color: 'from-emerald-500 to-teal-600',
    hasSubmenu: true,
    submenu: [
      { path: '/reports', label: 'Reports Dashboard' },
      { path: '/reports/custom', label: 'Custom Reports' },
      { path: '/reports/subscriptions', label: 'Report Subscriptions' },
    ]
  },
  {
    path: '/analytics',
    icon: '📊',
    label: 'Analytics & AI',
    color: 'from-indigo-500 to-purple-600',
    hasSubmenu: true,
    submenu: [
      { path: '/dashboards', label: 'Custom Dashboards' },
      { path: '/predictions', label: 'AI Predictions' },
    ]
  },
  {
    path: '/progress',
    icon: '📈',
    label: 'Progress Tracking',
    color: 'from-green-500 to-teal-600',
    hasSubmenu: true,
    submenu: [
      { path: '/client/symptoms', label: 'Symptom Diary' },
      { path: '/client/sleep', label: 'Sleep Diary' },
      { path: '/client/exercise', label: 'Exercise Log' },
    ]
  },
  {
    path: '/guardian',
    icon: '👨‍👩‍👧',
    label: 'Guardian Portal',
    color: 'from-blue-500 to-indigo-600',
    hasSubmenu: true,
    submenu: [
      { path: '/guardian/portal', label: 'My Dependents' },
      { path: '/guardian/request-access', label: 'Request Access' },
    ]
  },
  {
    path: '/admin-menu',
    icon: '⚙️',
    label: 'Admin Tools',
    color: 'from-purple-600 to-pink-600',
    hasSubmenu: true,
    submenu: [
      { path: '/admin/session-ratings', label: 'Session Ratings' },
      { path: '/admin/crisis-detections', label: 'Crisis Detections' },
      { path: '/admin/guardian-verification', label: 'Guardian Verification' },
      { path: '/admin/scheduling-rules', label: 'Scheduling Rules' },
      { path: '/admin/waitlist-management', label: 'Waitlist Management' },
      { path: '/admin/advancedmd-sync', label: '🔄 AdvancedMD Sync' },
      { path: '/admin/advancedmd-settings', label: '⚙️ AdvancedMD Settings' },
    ]
  },
  {
    path: '/clinician-menu',
    icon: '👨‍⚕️',
    label: 'Clinician Tools',
    color: 'from-teal-500 to-cyan-600',
    hasSubmenu: true,
    submenu: [
      { path: '/clinician/client-progress', label: 'Client Progress' },
      { path: '/clinician/my-waitlist', label: 'My Waitlist' },
    ]
  },
  { path: '/telehealth/session/demo', icon: '📹', label: 'Telehealth', color: 'from-blue-600 to-indigo-600' },
  { path: '/portal/dashboard', icon: '🌐', label: 'Client Portal', color: 'from-emerald-500 to-teal-500' },
  { path: '/portal/schedule', icon: '📅', label: 'Self-Schedule', color: 'from-violet-500 to-purple-600' },
  { path: '/supervision', icon: '👨‍🏫', label: 'Supervision', color: 'from-rose-500 to-red-500' },
  { path: getProductivityPath(userRole), icon: '📊', label: 'Productivity', color: 'from-violet-500 to-fuchsia-500' },
  { path: '/users', icon: '👥', label: 'Users', color: 'from-indigo-500 to-purple-500' },
  {
    path: '/settings',
    icon: '⚙️',
    label: 'Settings',
    color: 'from-gray-500 to-slate-600',
    hasSubmenu: true,
    submenu: [
      { path: '/settings', label: 'Practice Settings' },
      { path: '/settings/availability', label: 'Provider Availability' },
      { path: '/settings/appointment-types', label: 'Appointment Types' },
      { path: '/settings/reminders', label: 'Reminder Settings' },
    ]
  },
  {
    path: '/credentialing',
    icon: '🎓',
    label: 'Credentialing',
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
    ]
  },
  {
    path: '/training',
    icon: '📚',
    label: 'Training',
    color: 'from-purple-600 to-pink-600',
    hasSubmenu: true,
    submenu: [
      { path: '/training', label: 'Dashboard' },
      { path: '/training/catalog', label: 'Course Catalog' },
      { path: '/training/enrollments', label: 'Enrollments' },
      { path: '/training/progress', label: 'Progress Tracking' },
      { path: '/training/ceu', label: 'CEU Tracker' },
      { path: '/training/compliance', label: 'Compliance Monitor' },
      { path: '/training/calendar', label: 'Training Calendar' },
    ]
  },
  {
    path: '/compliance',
    icon: '✅',
    label: 'Compliance',
    color: 'from-green-600 to-emerald-600',
    hasSubmenu: true,
    submenu: [
      { path: '/compliance', label: 'Dashboard' },
      { path: '/compliance/policies', label: 'Policy Library' },
      { path: '/compliance/incidents', label: 'Incident Reports' },
      { path: '/compliance/trends', label: 'Incident Trends' },
    ]
  },
  {
    path: '/hr',
    icon: '👔',
    label: 'HR Functions',
    color: 'from-orange-600 to-red-600',
    hasSubmenu: true,
    submenu: [
      { path: '/hr/performance', label: 'Performance Reviews' },
      { path: '/hr/timeclock', label: 'Time Clock' },
      { path: '/hr/attendance', label: 'Attendance Calendar' },
      { path: '/hr/attendance/report', label: 'Attendance Reports' },
      { path: '/hr/pto/request', label: 'PTO Requests' },
      { path: '/hr/pto/calendar', label: 'PTO Calendar' },
      { path: '/hr/pto/approval', label: 'PTO Approvals' },
    ]
  },
  {
    path: '/staff',
    icon: '👨‍💼',
    label: 'Staff Management',
    color: 'from-cyan-600 to-blue-600',
    hasSubmenu: true,
    submenu: [
      { path: '/staff', label: 'Staff Directory' },
      { path: '/staff/org-chart', label: 'Org Chart' },
      { path: '/onboarding', label: 'Onboarding Dashboard' },
    ]
  },
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
  {
    path: '/vendor',
    icon: '🏢',
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
  {
    path: '/module9/reports',
    icon: '📑',
    label: 'Module 9 Reports',
    color: 'from-pink-600 to-rose-600',
    hasSubmenu: true,
    submenu: [
      { path: '/module9/reports', label: 'Reports Dashboard' },
      { path: '/module9/reports/builder', label: 'Report Builder' },
      { path: '/module9/dashboards', label: 'Dashboard Widgets' },
      { path: '/module9/analytics', label: 'Analytics Charts' },
      { path: '/module9/audit-log', label: 'Audit Log Viewer' },
    ]
  },
];

/**
 * Menu keys that have submenus
 */
export const MENU_KEYS = [
  '/clients',
  '/appointments',
  '/notes',
  '/billing',
  '/settings',
  '/progress',
  '/guardian',
  '/admin-menu',
  '/clinician-menu',
  '/reports',
  '/analytics',
  '/credentialing',
  '/training',
  '/compliance',
  '/hr',
  '/staff',
  '/communication',
  '/vendor',
  '/module9/reports',
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
