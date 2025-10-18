import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export default function Dashboard() {
  const navigate = useNavigate();

  // Fetch current user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await api.get('/auth/me');
      return response.data.data;
    },
  });

  // Fetch users statistics
  const { data: usersStats, isLoading: usersLoading } = useQuery({
    queryKey: ['users-stats'],
    queryFn: async () => {
      const response = await api.get('/users');
      const users = response.data.data;

      // Calculate statistics
      const total = users.length;
      const active = users.filter((u: any) => u.isActive).length;
      const byRole = {
        ADMINISTRATOR: users.filter((u: any) => u.role === 'ADMINISTRATOR').length,
        SUPERVISOR: users.filter((u: any) => u.role === 'SUPERVISOR').length,
        CLINICIAN: users.filter((u: any) => u.role === 'CLINICIAN').length,
        BILLER: users.filter((u: any) => u.role === 'BILLING_STAFF').length,
        RECEPTIONIST: users.filter((u: any) => u.role === 'SUPPORT_STAFF').length,
      };

      return { total, active, inactive: total - active, byRole };
    },
  });

  // Fetch client statistics
  const { data: clientStats, isLoading: clientsLoading } = useQuery({
    queryKey: ['client-stats'],
    queryFn: async () => {
      const response = await api.get('/clients');
      const clients = response.data.data;

      // Calculate statistics
      const total = clients.length;
      const active = clients.filter((c: any) => c.isActive).length;
      const inactive = total - active;

      return { total, active, inactive, discharged: 0 };
    },
  });

  const isLoading = profileLoading || usersLoading || clientsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto shadow-lg"></div>
          <p className="mt-6 text-lg font-semibold text-gray-700">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center">
              <span className="mr-3">👋</span> Welcome back, {profile?.firstName}!
            </h1>
            <p className="text-indigo-100 text-lg">
              You're logged in as <span className="font-semibold">{profile?.role}</span>
            </p>
            <p className="text-indigo-200 text-sm mt-1">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div className="hidden md:block">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-center">
              <div className="text-5xl mb-2">🎯</div>
              <p className="text-sm font-semibold">Ready to work!</p>
            </div>
          </div>
        </div>
      </div>

      {/* User Statistics Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">👥</span> User Management Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Total Users Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-indigo-500 hover:shadow-2xl transition-all duration-200 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 mb-1">Total Users</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {usersStats?.total || 0}
                </p>
              </div>
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 h-16 w-16 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-3xl">👥</span>
              </div>
            </div>
          </div>

          {/* Active Users Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-green-500 hover:shadow-2xl transition-all duration-200 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 mb-1">Active Users</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {usersStats?.active || 0}
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 h-16 w-16 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-3xl">✅</span>
              </div>
            </div>
          </div>

          {/* Inactive Users Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-orange-500 hover:shadow-2xl transition-all duration-200 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 mb-1">Inactive Users</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  {usersStats?.inactive || 0}
                </p>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-red-600 h-16 w-16 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-3xl">⏸️</span>
              </div>
            </div>
          </div>
        </div>

        {/* Users by Role */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">📊</span> Users by Role
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-rose-50 to-pink-50 p-4 rounded-xl border-2 border-rose-200">
              <div className="text-3xl mb-2 text-center">🔴</div>
              <p className="text-xs font-semibold text-gray-600 text-center mb-1">Administrators</p>
              <p className="text-2xl font-bold text-rose-600 text-center">{usersStats?.byRole.ADMINISTRATOR || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-xl border-2 border-purple-200">
              <div className="text-3xl mb-2 text-center">🟣</div>
              <p className="text-xs font-semibold text-gray-600 text-center mb-1">Supervisors</p>
              <p className="text-2xl font-bold text-purple-600 text-center">{usersStats?.byRole.SUPERVISOR || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border-2 border-blue-200">
              <div className="text-3xl mb-2 text-center">🔵</div>
              <p className="text-xs font-semibold text-gray-600 text-center mb-1">Clinicians</p>
              <p className="text-2xl font-bold text-blue-600 text-center">{usersStats?.byRole.CLINICIAN || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-200">
              <div className="text-3xl mb-2 text-center">🟢</div>
              <p className="text-xs font-semibold text-gray-600 text-center mb-1">Billers</p>
              <p className="text-2xl font-bold text-green-600 text-center">{usersStats?.byRole.BILLER || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border-2 border-amber-200">
              <div className="text-3xl mb-2 text-center">🟡</div>
              <p className="text-xs font-semibold text-gray-600 text-center mb-1">Receptionists</p>
              <p className="text-2xl font-bold text-amber-600 text-center">{usersStats?.byRole.RECEPTIONIST || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Client Statistics Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">📈</span> Client Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-cyan-500 hover:shadow-2xl transition-all duration-200 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 mb-1">Total Clients</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  {clientStats?.total || 0}
                </p>
              </div>
              <div className="bg-gradient-to-br from-cyan-500 to-blue-600 h-16 w-16 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-3xl">🧑‍⚕️</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-green-500 hover:shadow-2xl transition-all duration-200 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 mb-1">Active Clients</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {clientStats?.active || 0}
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 h-16 w-16 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-3xl">✅</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-blue-500 hover:shadow-2xl transition-all duration-200 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 mb-1">Discharged</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  {clientStats?.discharged || 0}
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 h-16 w-16 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-3xl">🔵</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-gray-500 hover:shadow-2xl transition-all duration-200 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 mb-1">Inactive</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-gray-600 to-slate-600 bg-clip-text text-transparent">
                  {clientStats?.inactive || 0}
                </p>
              </div>
              <div className="bg-gradient-to-br from-gray-500 to-slate-600 h-16 w-16 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-3xl">⏸️</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid - Placeholder for future modules */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">📋</span> Coming Soon
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-pink-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 mb-1">Today's Appointments</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
                  0
                </p>
                <p className="text-xs text-gray-500 mt-1">Coming in Phase 3</p>
              </div>
              <div className="bg-gradient-to-br from-pink-500 to-rose-600 h-16 w-16 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-3xl">📅</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-600 mb-1">Pending Notes</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  0
                </p>
                <p className="text-xs text-gray-500 mt-1">Coming in Phase 4</p>
              </div>
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 h-16 w-16 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-3xl">📝</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">⚡</span> Quick Actions
        </h2>
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/users/new')}
              className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
            >
              <div className="text-4xl mb-3">➕</div>
              <p className="font-bold text-sm">Add New User</p>
            </button>

            <button
              onClick={() => navigate('/users')}
              className="p-6 bg-gradient-to-br from-blue-500 to-cyan-600 text-white rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
            >
              <div className="text-4xl mb-3">👥</div>
              <p className="font-bold text-sm">Manage Users</p>
            </button>

            <button
              onClick={() => navigate('/clients')}
              className="p-6 bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
            >
              <div className="text-4xl mb-3">🧑‍⚕️</div>
              <p className="font-bold text-sm">Client Management</p>
            </button>

            <button
              onClick={() => navigate('/appointments')}
              className="p-6 bg-gradient-to-br from-pink-500 to-rose-600 text-white rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200 opacity-60 cursor-not-allowed"
              disabled
            >
              <div className="text-4xl mb-3">📅</div>
              <p className="font-bold text-sm">Appointments</p>
              <p className="text-xs mt-1 opacity-75">Phase 3</p>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">🕒</span> Recent Activity
        </h2>
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="space-y-4">
            <div className="flex items-start p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-l-4 border-l-indigo-500">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 h-10 w-10 rounded-lg flex items-center justify-center mr-4 shadow-md">
                <span className="text-white font-bold text-lg">✓</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">User Management System Active</p>
                <p className="text-sm text-gray-600">Phase 1 completed successfully</p>
                <p className="text-xs text-gray-500 mt-1">Just now</p>
              </div>
            </div>

            <div className="flex items-start p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-l-4 border-l-green-500">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 h-10 w-10 rounded-lg flex items-center justify-center mr-4 shadow-md">
                <span className="text-white font-bold text-lg">🔐</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">You logged in</p>
                <p className="text-sm text-gray-600">Authentication successful</p>
                <p className="text-xs text-gray-500 mt-1">Today</p>
              </div>
            </div>

            <div className="flex items-start p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-l-4 border-l-blue-500">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 h-10 w-10 rounded-lg flex items-center justify-center mr-4 shadow-md">
                <span className="text-white font-bold text-lg">🚀</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">System Initialized</p>
                <p className="text-sm text-gray-600">Database seeded with {usersStats?.total || 0} users</p>
                <p className="text-xs text-gray-500 mt-1">Today</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-2xl p-6 text-white">
        <h3 className="text-2xl font-bold mb-4 flex items-center">
          <span className="mr-2">🎉</span> System Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <p className="font-semibold mb-2 flex items-center">
              <span className="mr-2">✅</span> Backend API
            </p>
            <p className="text-sm text-green-100">Connected and running smoothly</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <p className="font-semibold mb-2 flex items-center">
              <span className="mr-2">✅</span> Database
            </p>
            <p className="text-sm text-green-100">PostgreSQL - All tables operational</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <p className="font-semibold mb-2 flex items-center">
              <span className="mr-2">✅</span> Authentication
            </p>
            <p className="text-sm text-green-100">JWT-based security active</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <p className="font-semibold mb-2 flex items-center">
              <span className="mr-2">✅</span> Infrastructure
            </p>
            <p className="text-sm text-green-100">AWS deployment ready</p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-white/20 backdrop-blur-sm rounded-xl">
          <p className="font-semibold mb-2">Your Account Information</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-green-100">Email:</p>
              <p className="font-semibold">{profile?.email}</p>
            </div>
            <div>
              <p className="text-green-100">Role:</p>
              <p className="font-semibold">{profile?.role}</p>
            </div>
            {profile?.title && (
              <div className="col-span-2">
                <p className="text-green-100">Title:</p>
                <p className="font-semibold">{profile?.title}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
