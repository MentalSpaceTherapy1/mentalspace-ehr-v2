import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notesMenuOpen, setNotesMenuOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getProductivityPath = () => {
    if (user.role === 'ADMINISTRATOR' || user.role === 'ADMIN') {
      return '/productivity/administrator';
    } else if (user.role === 'SUPERVISOR') {
      return '/productivity/supervisor';
    } else {
      return '/productivity/clinician';
    }
  };

  const navItems = [
    { path: '/dashboard', icon: '🏠', label: 'Dashboard', color: 'from-blue-500 to-cyan-500' },
    { path: '/clients', icon: '🧑‍⚕️', label: 'Clients', color: 'from-purple-500 to-pink-500' },
    { path: '/appointments', icon: '📅', label: 'Appointments', color: 'from-green-500 to-emerald-500' },
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
    { path: '/billing', icon: '💰', label: 'Billing', color: 'from-teal-500 to-cyan-500' },
    { path: '/reports', icon: '📈', label: 'Reports', color: 'from-sky-500 to-blue-600' },
    { path: '/telehealth/session/demo', icon: '📹', label: 'Telehealth', color: 'from-blue-600 to-indigo-600' },
    { path: '/portal/dashboard', icon: '🌐', label: 'Client Portal', color: 'from-emerald-500 to-teal-500' },
    { path: '/supervision', icon: '👨‍🏫', label: 'Supervision', color: 'from-rose-500 to-red-500' },
    { path: getProductivityPath(), icon: '📊', label: 'Productivity', color: 'from-violet-500 to-fuchsia-500' },
    { path: '/users', icon: '👥', label: 'Users', color: 'from-indigo-500 to-purple-500' },
    { path: '/settings', icon: '⚙️', label: 'Settings', color: 'from-gray-500 to-slate-600' },
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
                  onClick={() => {
                    if (item.hasSubmenu) {
                      setNotesMenuOpen(!notesMenuOpen);
                    } else {
                      navigate(item.path);
                    }
                  }}
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
                    <span className="text-sm">{notesMenuOpen ? '▼' : '▶'}</span>
                  )}
                </button>

                {/* Submenu */}
                {item.hasSubmenu && notesMenuOpen && (
                  <div className="ml-8 mt-2 space-y-1">
                    {item.submenu.map((subItem: any) => (
                      <button
                        key={subItem.path}
                        onClick={() => navigate(subItem.path)}
                        className={`w-full flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          location.pathname === subItem.path
                            ? 'bg-amber-100 text-amber-800'
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
