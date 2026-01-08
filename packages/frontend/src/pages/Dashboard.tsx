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

  // Get user roles (handle both single role and array of roles)
  const userRoles = profile?.roles || (profile?.role ? [profile.role] : []);
  const hasRole = (role: string) => userRoles.includes(role);
  const isSuperAdmin = hasRole('SUPER_ADMIN');
  const isAdmin = hasRole('ADMINISTRATOR') || isSuperAdmin; // SUPER_ADMIN has all admin privileges
  const isSupervisor = hasRole('SUPERVISOR');
  const isClinician = hasRole('CLINICIAN');
  const isBilling = hasRole('BILLING_STAFF');
  const isFrontDesk = hasRole('FRONT_DESK');

  // Fetch users statistics (for admin/supervisor roles)
  const { data: usersStats, isLoading: usersLoading } = useQuery({
    queryKey: ['users-stats'],
    queryFn: async () => {
      const response = await api.get('/users');
      const users = response.data.data;

      // Calculate statistics
      const total = users.length;
      const active = users.filter((u: any) => u.isActive).length;
      const getRoleCount = (role: string) =>
        users.filter((u: any) => u.roles?.includes(role) || u.role === role).length;

      const byRole = {
        ADMINISTRATOR: getRoleCount('ADMINISTRATOR'),
        SUPERVISOR: getRoleCount('SUPERVISOR'),
        CLINICIAN: getRoleCount('CLINICIAN'),
        BILLING_STAFF: getRoleCount('BILLING_STAFF'),
        FRONT_DESK: getRoleCount('FRONT_DESK'),
        ASSOCIATE: getRoleCount('ASSOCIATE'),
      };

      return { total, active, inactive: total - active, byRole };
    },
    enabled: isAdmin || isSupervisor, // Only fetch for admins and supervisors
  });

  // Fetch client statistics (for clinicians/supervisors/admins)
  const { data: clientStats, isLoading: clientsLoading } = useQuery({
    queryKey: ['client-stats'],
    queryFn: async () => {
      const response = await api.get('/clients');
      const clients = response.data.data;

      // Calculate statistics based on ClientStatus enum
      const total = clients.length;
      const active = clients.filter((c: any) => c.status === 'ACTIVE').length;
      const inactive = clients.filter((c: any) => c.status === 'INACTIVE').length;
      const discharged = clients.filter((c: any) => c.status === 'DISCHARGED').length;

      return { total, active, inactive, discharged };
    },
    enabled: isAdmin || isSupervisor || isClinician, // Only fetch for relevant roles
  });

  const isLoading = profileLoading ||
    ((isAdmin || isSupervisor) && usersLoading) ||
    ((isAdmin || isSupervisor || isClinician) && clientsLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-600 mx-auto shadow-lg"></div>
          <p className="mt-6 text-lg font-semibold text-gray-700">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  // Format roles for display
  const roleLabels: { [key: string]: string } = {
    SUPER_ADMIN: 'Super Administrator',
    ADMINISTRATOR: 'Administrator',
    SUPERVISOR: 'Supervisor',
    CLINICIAN: 'Clinician',
    BILLING_STAFF: 'Billing Staff',
    FRONT_DESK: 'Front Desk',
    ASSOCIATE: 'Associate',
  };

  const displayRoles = userRoles.map((r: string) => roleLabels[r] || r).join(' • ');

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-green-50 p-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-cyan-500 to-green-500 rounded-2xl shadow-2xl p-8 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center">
              <span className="mr-3">👋</span> Welcome back, {profile?.firstName}!
            </h1>
            <p className="text-cyan-100 text-lg">
              {userRoles.length > 1 ? 'Your roles: ' : 'You\'re logged in as '}
              <span className="font-semibold">{displayRoles}</span>
            </p>
            <p className="text-cyan-200 text-sm mt-1">
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

      {/* ADMIN/SUPERVISOR SECTION - User Management */}
      {(isAdmin || isSupervisor) && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <span className="mr-2">👥</span> User Management
            </h2>
            <button
              onClick={() => navigate('/users')}
              className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full hover:bg-purple-200 transition-colors cursor-pointer"
            >
              {isAdmin ? 'Admin View' : 'Supervisor View'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Total Users Card */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-cyan-500 hover:shadow-2xl transition-all duration-200 transform hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-600 mb-1">Total Users</p>
                  <p className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                    {usersStats?.total || 0}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 h-16 w-16 rounded-xl flex items-center justify-center shadow-lg">
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
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-4 rounded-xl border-2 border-cyan-200">
                <div className="text-3xl mb-2 text-center">🔵</div>
                <p className="text-xs font-semibold text-gray-600 text-center mb-1">Clinicians</p>
                <p className="text-2xl font-bold text-cyan-600 text-center">{usersStats?.byRole.CLINICIAN || 0}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-200">
                <div className="text-3xl mb-2 text-center">🟢</div>
                <p className="text-xs font-semibold text-gray-600 text-center mb-1">Billing Staff</p>
                <p className="text-2xl font-bold text-green-600 text-center">{usersStats?.byRole.BILLING_STAFF || 0}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border-2 border-amber-200">
                <div className="text-3xl mb-2 text-center">🟡</div>
                <p className="text-xs font-semibold text-gray-600 text-center mb-1">Front Desk</p>
                <p className="text-2xl font-bold text-amber-600 text-center">{usersStats?.byRole.FRONT_DESK || 0}</p>
              </div>
              <div className="bg-gradient-to-br from-sky-50 to-cyan-50 p-4 rounded-xl border-2 border-sky-200">
                <div className="text-3xl mb-2 text-center">🟦</div>
                <p className="text-xs font-semibold text-gray-600 text-center mb-1">Associates</p>
                <p className="text-2xl font-bold text-sky-600 text-center">{usersStats?.byRole.ASSOCIATE || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CLINICIAN/SUPERVISOR/ADMIN SECTION - Client Overview */}
      {(isAdmin || isSupervisor || isClinician) && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <span className="mr-2">📈</span> Client Overview
            </h2>
            <button
              onClick={() => navigate('/clients')}
              className="px-3 py-1 bg-cyan-100 text-cyan-700 text-xs font-semibold rounded-full hover:bg-cyan-200 transition-colors cursor-pointer"
            >
              Clinician View
            </button>
          </div>

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
      )}

      {/* Quick Actions - Role-based */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">⚡</span> Quick Actions
        </h2>
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Admin actions */}
            {isAdmin && (
              <>
                <button
                  onClick={() => navigate('/users/new')}
                  className="p-6 bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
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
              </>
            )}

            {/* Clinician/Supervisor/Admin actions */}
            {(isAdmin || isSupervisor || isClinician) && (
              <button
                onClick={() => navigate('/clients')}
                className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
              >
                <div className="text-4xl mb-3">🧑‍⚕️</div>
                <p className="font-bold text-sm">Client Management</p>
              </button>
            )}

            {/* All roles can access appointments */}
            <button
              onClick={() => navigate('/appointments')}
              className="p-6 bg-gradient-to-br from-cyan-500 to-green-600 text-white rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
            >
              <div className="text-4xl mb-3">📅</div>
              <p className="font-bold text-sm">Appointments</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
