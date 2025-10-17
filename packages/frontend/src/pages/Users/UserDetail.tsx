import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { UserRole } from '@mentalspace/shared';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  title?: string;
  role: UserRole;
  isActive: boolean;
  npiNumber?: string;
  licenseNumber?: string;
  licenseState?: string;
  phoneNumber?: string;
  lastLoginDate?: string;
  createdAt: string;
  updatedAt: string;
}

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = localStorage.getItem('token');

  const { data, isLoading, error } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const response = await axios.get(`/api/v1/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      await axios.delete(`/api/v1/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async () => {
      await axios.post(`/api/v1/users/${id}/activate`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const user: User | undefined = data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-4"></div>
          <div className="text-xl font-semibold text-gray-700">Loading user...</div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-red-50 to-pink-50">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <div className="text-xl font-bold text-gray-800 mb-2">Error Loading User</div>
          <div className="text-gray-600">Please try again or contact support.</div>
        </div>
      </div>
    );
  }

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'ADMINISTRATOR':
        return 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-200';
      case 'SUPERVISOR':
        return 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-200';
      case 'CLINICIAN':
        return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-200';
      case 'BILLER':
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-200';
      case 'RECEPTIONIST':
        return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-200';
      default:
        return 'bg-gradient-to-r from-gray-500 to-slate-500 text-white shadow-lg shadow-gray-200';
    }
  };

  const getAvatarColor = (role: UserRole) => {
    switch (role) {
      case 'ADMINISTRATOR':
        return 'bg-gradient-to-br from-rose-400 to-pink-600';
      case 'SUPERVISOR':
        return 'bg-gradient-to-br from-purple-400 to-indigo-600';
      case 'CLINICIAN':
        return 'bg-gradient-to-br from-blue-400 to-cyan-600';
      case 'BILLER':
        return 'bg-gradient-to-br from-green-400 to-emerald-600';
      case 'RECEPTIONIST':
        return 'bg-gradient-to-br from-amber-400 to-orange-600';
      default:
        return 'bg-gradient-to-br from-gray-400 to-slate-600';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    return role.charAt(0) + role.slice(1).toLowerCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="mb-8">
        <button
          onClick={() => navigate('/users')}
          className="inline-flex items-center px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 border-2 border-indigo-200 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold mb-4"
        >
          <span className="mr-2">←</span> Back to Users
        </button>

        {/* User Header Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center space-x-6">
              <div className={`${getAvatarColor(user.role)} h-24 w-24 rounded-full flex items-center justify-center shadow-2xl`}>
                <span className="text-white font-bold text-3xl">
                  {user.firstName.charAt(0)}
                  {user.lastName.charAt(0)}
                </span>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  {user.firstName} {user.lastName}
                </h1>
                {user.title && (
                  <p className="text-xl text-indigo-600 font-semibold mb-2">{user.title}</p>
                )}
                <div className="flex items-center space-x-3">
                  <span className={`px-4 py-2 inline-flex text-sm leading-5 font-bold rounded-lg ${getRoleBadgeColor(user.role)}`}>
                    {getRoleLabel(user.role)}
                  </span>
                  {user.isActive ? (
                    <span className="px-4 py-2 inline-flex items-center text-sm leading-5 font-bold rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-200">
                      <span className="mr-2">●</span> Active
                    </span>
                  ) : (
                    <span className="px-4 py-2 inline-flex items-center text-sm leading-5 font-bold rounded-lg bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-200">
                      <span className="mr-2">○</span> Inactive
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate(`/users/${id}/edit`)}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-200 transform hover:scale-105 transition-all duration-200 font-bold flex items-center justify-center"
              >
                <span className="mr-2">✏️</span> Edit User
              </button>
              {user.isActive ? (
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to deactivate this user?')) {
                      deactivateMutation.mutate();
                    }
                  }}
                  disabled={deactivateMutation.isPending}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 shadow-lg shadow-red-200 transform hover:scale-105 transition-all duration-200 font-bold disabled:opacity-50 flex items-center justify-center"
                >
                  <span className="mr-2">🚫</span> Deactivate
                </button>
              ) : (
                <button
                  onClick={() => activateMutation.mutate()}
                  disabled={activateMutation.isPending}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-200 transform hover:scale-105 transition-all duration-200 font-bold disabled:opacity-50 flex items-center justify-center"
                >
                  <span className="mr-2">✅</span> Activate
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 border-l-4 border-l-indigo-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="mr-2">📧</span> Contact Information
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl">
                <dt className="text-sm font-bold text-gray-600 mb-1">Email Address</dt>
                <dd className="text-base font-semibold text-gray-900">{user.email}</dd>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl">
                <dt className="text-sm font-bold text-gray-600 mb-1">Phone Number</dt>
                <dd className="text-base font-semibold text-gray-900">{user.phoneNumber || '—'}</dd>
              </div>
            </dl>
          </div>

          {/* Personal Information */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 border-l-4 border-l-purple-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="mr-2">👤</span> Personal Information
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl">
                <dt className="text-sm font-bold text-gray-600 mb-1">First Name</dt>
                <dd className="text-base font-semibold text-gray-900">{user.firstName}</dd>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl">
                <dt className="text-sm font-bold text-gray-600 mb-1">Last Name</dt>
                <dd className="text-base font-semibold text-gray-900">{user.lastName}</dd>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl sm:col-span-2">
                <dt className="text-sm font-bold text-gray-600 mb-1">Title / Credentials</dt>
                <dd className="text-base font-semibold text-gray-900">{user.title || '—'}</dd>
              </div>
            </dl>
          </div>

          {/* Professional Information */}
          {(user.npiNumber || user.licenseNumber) && (
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 border-l-4 border-l-cyan-500">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="mr-2">🏥</span> Professional Information
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-4 rounded-xl">
                  <dt className="text-sm font-bold text-gray-600 mb-1">NPI Number</dt>
                  <dd className="text-base font-semibold text-gray-900">{user.npiNumber || '—'}</dd>
                </div>
                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-4 rounded-xl">
                  <dt className="text-sm font-bold text-gray-600 mb-1">License Number</dt>
                  <dd className="text-base font-semibold text-gray-900">{user.licenseNumber || '—'}</dd>
                </div>
                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-4 rounded-xl">
                  <dt className="text-sm font-bold text-gray-600 mb-1">License State</dt>
                  <dd className="text-base font-semibold text-gray-900">{user.licenseState || '—'}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Activity Information */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 border-l-4 border-l-green-500">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">📊</span> Activity
            </h2>
            <dl className="space-y-4">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl">
                <dt className="text-sm font-bold text-gray-600 mb-1">Last Login</dt>
                <dd className="text-sm font-semibold text-gray-900">
                  {user.lastLoginDate
                    ? new Date(user.lastLoginDate).toLocaleString()
                    : 'Never'}
                </dd>
              </div>
            </dl>
          </div>

          {/* System Information */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 border-l-4 border-l-amber-500">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">⚙️</span> System Info
            </h2>
            <dl className="space-y-4">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl">
                <dt className="text-sm font-bold text-gray-600 mb-1">User ID</dt>
                <dd className="text-xs font-mono text-gray-900 break-all">{user.id}</dd>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl">
                <dt className="text-sm font-bold text-gray-600 mb-1">Created</dt>
                <dd className="text-sm font-semibold text-gray-900">
                  {new Date(user.createdAt).toLocaleString()}
                </dd>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl">
                <dt className="text-sm font-bold text-gray-600 mb-1">Last Updated</dt>
                <dd className="text-sm font-semibold text-gray-900">
                  {new Date(user.updatedAt).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 border-l-4 border-l-rose-500">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">⚡</span> Quick Actions
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => navigate(`/users/${id}/edit`)}
                className="w-full px-4 py-3 text-left text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center"
              >
                <span className="mr-2">✏️</span> Edit Profile
              </button>
              <button
                onClick={() => {
                  alert('Password reset functionality coming soon');
                }}
                className="w-full px-4 py-3 text-left text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center"
              >
                <span className="mr-2">🔑</span> Reset Password
              </button>
              <button
                onClick={() => {
                  alert('Activity log functionality coming soon');
                }}
                className="w-full px-4 py-3 text-left text-sm font-bold text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center"
              >
                <span className="mr-2">📝</span> View Activity Log
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
