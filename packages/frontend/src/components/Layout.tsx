import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [clientsMenuOpen, setClientsMenuOpen] = useState(false);
  const [appointmentsMenuOpen, setAppointmentsMenuOpen] = useState(false);
  const [notesMenuOpen, setNotesMenuOpen] = useState(false);
  const [billingMenuOpen, setBillingMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [progressMenuOpen, setProgressMenuOpen] = useState(false);
  const [guardianMenuOpen, setGuardianMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [clinicianMenuOpen, setClinicianMenuOpen] = useState(false);
  const [reportsMenuOpen, setReportsMenuOpen] = useState(false);
  const [analyticsMenuOpen, setAnalyticsMenuOpen] = useState(false);
  const [credentialingMenuOpen, setCredentialingMenuOpen] = useState(false);
  const [trainingMenuOpen, setTrainingMenuOpen] = useState(false);
  const [complianceMenuOpen, setComplianceMenuOpen] = useState(false);
  const [hrMenuOpen, setHrMenuOpen] = useState(false);
  const [staffMenuOpen, setStaffMenuOpen] = useState(false);
  const [communicationMenuOpen, setCommunicationMenuOpen] = useState(false);
  const [vendorMenuOpen, setVendorMenuOpen] = useState(false);
  const [module9ReportsMenuOpen, setModule9ReportsMenuOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleMenuItemClick = (item: any) => {
    if (item.hasSubmenu) {
      if (item.path === '/clients') {
        setClientsMenuOpen(!clientsMenuOpen);
      } else if (item.path === '/appointments') {
        setAppointmentsMenuOpen(!appointmentsMenuOpen);
      } else if (item.path === '/notes') {
        setNotesMenuOpen(!notesMenuOpen);
      } else if (item.path === '/billing') {
        setBillingMenuOpen(!billingMenuOpen);
      } else if (item.path === '/settings') {
        setSettingsMenuOpen(!settingsMenuOpen);
      } else if (item.path === '/progress') {
        setProgressMenuOpen(!progressMenuOpen);
      } else if (item.path === '/guardian') {
        setGuardianMenuOpen(!guardianMenuOpen);
      } else if (item.path === '/admin-menu') {
        setAdminMenuOpen(!adminMenuOpen);
      } else if (item.path === '/clinician-menu') {
        setClinicianMenuOpen(!clinicianMenuOpen);
      } else if (item.path === '/reports') {
        setReportsMenuOpen(!reportsMenuOpen);
      } else if (item.path === '/analytics') {
        setAnalyticsMenuOpen(!analyticsMenuOpen);
      } else if (item.path === '/credentialing') {
        setCredentialingMenuOpen(!credentialingMenuOpen);
      } else if (item.path === '/training') {
        setTrainingMenuOpen(!trainingMenuOpen);
      } else if (item.path === '/compliance') {
        setComplianceMenuOpen(!complianceMenuOpen);
      } else if (item.path === '/hr') {
        setHrMenuOpen(!hrMenuOpen);
      } else if (item.path === '/staff') {
        setStaffMenuOpen(!staffMenuOpen);
      } else if (item.path === '/communication') {
        setCommunicationMenuOpen(!communicationMenuOpen);
      } else if (item.path === '/vendor') {
        setVendorMenuOpen(!vendorMenuOpen);
      } else if (item.path === '/module9/reports') {
        setModule9ReportsMenuOpen(!module9ReportsMenuOpen);
      }
    } else {
      navigate(item.path);
    }
  };

  const getProductivityPath = () => {
    if (user.role === 'ADMINISTRATOR' || user.role === 'SUPER_ADMIN') {
      return '/productivity/administrator';
    } else if (user.role === 'SUPERVISOR') {
      return '/productivity/supervisor';
    } else {
      return '/productivity/clinician';
    }
  };

  const navItems = [
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
    { path: getProductivityPath(), icon: '📊', label: 'Productivity', color: 'from-violet-500 to-fuchsia-500' },
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

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    // For productivity paths, check if current path starts with /productivity
    if (path.startsWith('/productivity')) {
      return location.pathname.startsWith('/productivity');
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full w-64 bg-white shadow-2xl border-r border-gray-200 flex flex-col">
          {/* Logo Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-center">
              <img
                src="/logo.png"
                alt="MentalSpace Therapy"
                className="h-16 w-auto object-contain"
                onError={(e) => {
                  // Fallback if logo image is not found
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = `
                    <div class="flex items-center space-x-3">
                      <div class="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                        <span class="text-white font-bold text-xl">M</span>
                      </div>
                      <div>
                        <h1 class="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                          MentalSpace
                        </h1>
                        <p class="text-xs text-gray-500 font-semibold">THERAPY</p>
                      </div>
                    </div>
                  `;
                }}
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {navItems.map((item: any) => (
              <div key={item.path}>
                <button
                  onClick={() => handleMenuItemClick(item)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
                    isActive(item.path)
                      ? `bg-gradient-to-r ${item.color} text-white shadow-lg`
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-sm">{item.label}</span>
                  </div>
                  {item.hasSubmenu && (
                    <span className="text-sm">
                      {(item.path === '/clients' && clientsMenuOpen) ||
                       (item.path === '/appointments' && appointmentsMenuOpen) ||
                       (item.path === '/notes' && notesMenuOpen) ||
                       (item.path === '/billing' && billingMenuOpen) ||
                       (item.path === '/settings' && settingsMenuOpen) ||
                       (item.path === '/progress' && progressMenuOpen) ||
                       (item.path === '/guardian' && guardianMenuOpen) ||
                       (item.path === '/admin-menu' && adminMenuOpen) ||
                       (item.path === '/clinician-menu' && clinicianMenuOpen) ||
                       (item.path === '/reports' && reportsMenuOpen) ||
                       (item.path === '/analytics' && analyticsMenuOpen) ||
                       (item.path === '/credentialing' && credentialingMenuOpen) ||
                       (item.path === '/training' && trainingMenuOpen) ||
                       (item.path === '/compliance' && complianceMenuOpen) ||
                       (item.path === '/hr' && hrMenuOpen) ||
                       (item.path === '/staff' && staffMenuOpen) ||
                       (item.path === '/communication' && communicationMenuOpen) ||
                       (item.path === '/vendor' && vendorMenuOpen) ||
                       (item.path === '/module9/reports' && module9ReportsMenuOpen) ? '▼' : '▶'}
                    </span>
                  )}
                </button>

                {/* Submenu */}
                {item.hasSubmenu && ((item.path === '/clients' && clientsMenuOpen) ||
                                     (item.path === '/appointments' && appointmentsMenuOpen) ||
                                     (item.path === '/notes' && notesMenuOpen) ||
                                     (item.path === '/billing' && billingMenuOpen) ||
                                     (item.path === '/settings' && settingsMenuOpen) ||
                                     (item.path === '/progress' && progressMenuOpen) ||
                                     (item.path === '/guardian' && guardianMenuOpen) ||
                                     (item.path === '/admin-menu' && adminMenuOpen) ||
                                     (item.path === '/clinician-menu' && clinicianMenuOpen) ||
                                     (item.path === '/reports' && reportsMenuOpen) ||
                                     (item.path === '/analytics' && analyticsMenuOpen) ||
                                     (item.path === '/credentialing' && credentialingMenuOpen) ||
                                     (item.path === '/training' && trainingMenuOpen) ||
                                     (item.path === '/compliance' && complianceMenuOpen) ||
                                     (item.path === '/hr' && hrMenuOpen) ||
                                     (item.path === '/staff' && staffMenuOpen) ||
                                     (item.path === '/communication' && communicationMenuOpen) ||
                                     (item.path === '/vendor' && vendorMenuOpen) ||
                                     (item.path === '/module9/reports' && module9ReportsMenuOpen)) && (
                  <div className="ml-8 mt-2 space-y-1">
                    {item.submenu.map((subItem: any) => (
                      <button
                        key={subItem.path}
                        onClick={() => navigate(subItem.path)}
                        className={`w-full flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          location.pathname === subItem.path || location.pathname.startsWith(subItem.path)
                            ? (item.path === '/notes' ? 'bg-amber-100 text-amber-800' :
                               item.path === '/reports' ? 'bg-emerald-100 text-emerald-800' :
                               item.path === '/analytics' ? 'bg-purple-100 text-purple-800' :
                               'bg-teal-100 text-teal-800')
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-xs">•</span>
                        <span>{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* User Profile Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 mb-3">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">
                    {user.firstName?.charAt(0)}
                    {user.lastName?.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-gray-600 truncate">{user.role}</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/profile')}
                className="w-full px-4 py-2 mb-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-bold text-sm flex items-center justify-center"
              >
                <span className="mr-2">👤</span> My Profile
              </button>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-bold text-sm flex items-center justify-center"
              >
                <span className="mr-2">🚪</span> Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-0'
        }`}
      >
        {/* Top Header */}
        <header className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-30">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {navItems.find(item => isActive(item.path))?.label || 'Dashboard'}
                </h2>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-2 rounded-lg hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200">
                <span className="text-2xl">🔔</span>
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Search */}
              <div className="hidden md:block">
                <input
                  type="search"
                  placeholder="Search..."
                  className="px-4 py-2 border-2 border-indigo-200 rounded-lg focus:ring-4 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200"
                />
              </div>

              {/* User Avatar */}
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-all duration-200">
                <span className="text-white font-bold text-sm">
                  {user.firstName?.charAt(0)}
                  {user.lastName?.charAt(0)}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}
