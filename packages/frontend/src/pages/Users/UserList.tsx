import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { UserRole } from '@mentalspace/shared';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  title?: string;
  roles: UserRole[]; // Multiple roles support
  isActive: boolean;
  npiNumber?: string;
  licenseNumber?: string;
  licenseState?: string;
  phoneNumber?: string;
  lastLoginDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function UserList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);


  const { data, isLoading, error } = useQuery({
    queryKey: ['users', search, roleFilter, statusFilter, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter !== 'all') {
        params.append('isActive', statusFilter === 'active' ? 'true' : 'false');
      }

      const response = await api.get(`/users?${params}`);

      return response.data;
    },
  });

  const users: User[] = data?.data || [];
  const pagination: Pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 };

  const roleStyles = {
    SUPER_ADMIN: {
      badge: 'bg-gradient-to-r from-yellow-500 to-red-500 text-white shadow-lg shadow-yellow-200',
      avatar: 'bg-gradient-to-br from-yellow-400 to-red-600',
      label: 'Super Admin',
    },
    ADMINISTRATOR: {
      badge: 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-200',
      avatar: 'bg-gradient-to-br from-rose-400 to-pink-600',
      label: 'Administrator',
    },
    SUPERVISOR: {
      badge: 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-200',
      avatar: 'bg-gradient-to-br from-purple-400 to-indigo-600',
      label: 'Supervisor',
    },
    CLINICIAN: {
      badge: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-200',
      avatar: 'bg-gradient-to-br from-blue-400 to-cyan-600',
      label: 'Clinician',
    },
    BILLING_STAFF: {
      badge: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-200',
      avatar: 'bg-gradient-to-br from-green-400 to-emerald-600',
      label: 'Billing Staff',
    },
    FRONT_DESK: {
      badge: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-200',
      avatar: 'bg-gradient-to-br from-amber-400 to-orange-600',
      label: 'Front Desk',
    },
    ASSOCIATE: {
      badge: 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-200',
      avatar: 'bg-gradient-to-br from-sky-400 to-cyan-600',
      label: 'Associate',
    },
  } as Record<string, { badge: string; avatar: string; label: string }>;

  const getRoleBadgeColor = (role: UserRole) =>
    roleStyles[role]?.badge ?? 'bg-gradient-to-r from-gray-500 to-slate-500 text-white shadow-lg shadow-gray-200';

  const getAvatarColor = (role: UserRole) =>
    roleStyles[role]?.avatar ?? 'bg-gradient-to-br from-gray-400 to-slate-600';

  const getRoleLabel = (role: UserRole) => roleStyles[role]?.label ?? 'Unknown';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-4"></div>
          <div className="text-xl font-semibold text-gray-700">Loading users...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-red-50 to-pink-50">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <div className="text-xl font-bold text-gray-800 mb-2">Error Loading Users</div>
          <div className="text-gray-600">Please try again or contact support.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              User Management
            </h1>
            <p className="text-gray-600 text-lg">Manage system users and their permissions</p>
          </div>
          <button
            onClick={() => navigate('/users/new')}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 shadow-lg shadow-indigo-200 transform hover:scale-105 transition-all duration-200 font-semibold flex items-center space-x-2"
          >
            <span className="text-xl">+</span>
            <span>Add New User</span>
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        {/* Filters Section */}
        <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-semibold text-gray-700 mb-2">
                🔍 Search
              </label>
              <input
                id="search"
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200 bg-white"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-semibold text-gray-700 mb-2">
                👤 Role
              </label>
              <select
                id="role"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value as UserRole | '');
                  setPage(1);
                }}
                className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200 bg-white"
              >
                <option value="">All Roles</option>
                <option value="ADMINISTRATOR">Administrator</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="CLINICIAN">Clinician</option>
                <option value="BILLING_STAFF">Billing Staff</option>
                <option value="FRONT_DESK">Front Desk</option>
                <option value="ASSOCIATE">Associate</option>
              </select>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-semibold text-gray-700 mb-2">
                ⚡ Status
              </label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200 bg-white"
              >
                <option value="all">All Users</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="text-gray-400 text-6xl mb-4">👥</div>
                    <div className="text-xl font-semibold text-gray-700 mb-2">No users found</div>
                    <div className="text-gray-500">Try adjusting your filters or create a new user</div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-12 w-12 ${getAvatarColor(user.roles[0])} rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-all duration-200`}>
                          <span className="text-white font-bold text-base">
                            {user.firstName.charAt(0)}
                            {user.lastName.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          {user.title && (
                            <div className="text-sm text-indigo-600 font-medium">{user.title}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.email}</div>
                      {user.phoneNumber && (
                        <div className="text-sm text-gray-500">{user.phoneNumber}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <span key={role} className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-lg ${getRoleBadgeColor(role)}`}>
                            {getRoleLabel(role)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.isActive ? (
                        <span className="px-3 py-1.5 inline-flex items-center text-xs leading-5 font-bold rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-200">
                          <span className="mr-1">●</span> Active
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 inline-flex items-center text-xs leading-5 font-bold rounded-lg bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-200">
                          <span className="mr-1">○</span> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                      {user.lastLoginDate
                        ? new Date(user.lastLoginDate).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => navigate(`/users/${user.id}`)}
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold"
                      >
                        👁️ View
                      </button>
                      <button
                        onClick={() => navigate(`/users/${user.id}/edit`)}
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold"
                      >
                        ✏️ Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-700">
              Showing <span className="text-indigo-600">{(page - 1) * limit + 1}</span> to{' '}
              <span className="text-indigo-600">{Math.min(page * limit, pagination.total)}</span> of{' '}
              <span className="text-indigo-600">{pagination.total}</span> users
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border-2 border-indigo-300 rounded-lg text-sm font-bold text-indigo-600 bg-white hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all duration-200"
              >
                ← Previous
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  return p === 1 || p === pagination.totalPages || (p >= page - 2 && p <= page + 2);
                })
                .map((p, i, arr) => {
                  if (i > 0 && p - arr[i - 1] > 1) {
                    return [
                      <span key={`ellipsis-${p}`} className="px-3 py-2 text-gray-500 font-bold">
                        ...
                      </span>,
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`px-4 py-2 border-2 rounded-lg text-sm font-bold shadow-sm hover:shadow-md transition-all duration-200 ${
                          page === p
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-lg shadow-indigo-200'
                            : 'border-indigo-300 text-indigo-600 bg-white hover:bg-indigo-50'
                        }`}
                      >
                        {p}
                      </button>,
                    ];
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-4 py-2 border-2 rounded-lg text-sm font-bold shadow-sm hover:shadow-md transition-all duration-200 ${
                        page === p
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-lg shadow-indigo-200'
                          : 'border-indigo-300 text-indigo-600 bg-white hover:bg-indigo-50'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-4 py-2 border-2 border-indigo-300 rounded-lg text-sm font-bold text-indigo-600 bg-white hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all duration-200"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
