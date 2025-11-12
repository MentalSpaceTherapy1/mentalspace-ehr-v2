import { useState, useEffect } from 'react';
import {
  ShieldCheckIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import api from '../../lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  mfaEnabled: boolean;
  mfaMethod: string | null;
  mfaEnabledAt: Date | null;
  backupCodesCount: number;
}

type FilterType = 'all' | 'enabled' | 'disabled';
type MethodFilter = 'all' | 'TOTP' | 'SMS' | 'BOTH';

export default function MFAManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetReason, setResetReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, filter, methodFilter, searchQuery]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/mfa/admin/users');
      setUsers(response.data.data.users);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Filter by MFA status
    if (filter === 'enabled') {
      filtered = filtered.filter(u => u.mfaEnabled);
    } else if (filter === 'disabled') {
      filtered = filtered.filter(u => !u.mfaEnabled);
    }

    // Filter by method
    if (methodFilter !== 'all') {
      filtered = filtered.filter(u => u.mfaMethod === methodFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u =>
        u.email.toLowerCase().includes(query) ||
        u.firstName.toLowerCase().includes(query) ||
        u.lastName.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  };

  const handleResetMFA = async () => {
    if (!resetUserId || !resetReason) {
      setError('Please provide a reason for resetting MFA');
      return;
    }

    try {
      await api.post('/mfa/admin/reset', {
        targetUserId: resetUserId,
        reason: resetReason
      });
      setSuccess('MFA has been reset for the user');
      setResetUserId(null);
      setResetReason('');
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset MFA');
    }
  };

  const stats = {
    total: users.length,
    enabled: users.filter(u => u.mfaEnabled).length,
    disabled: users.filter(u => !u.mfaEnabled).length,
    totp: users.filter(u => u.mfaMethod === 'TOTP').length,
    sms: users.filter(u => u.mfaMethod === 'SMS').length,
    both: users.filter(u => u.mfaMethod === 'BOTH').length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading MFA management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheckIcon className="h-10 w-10 text-indigo-600" />
          <h1 className="text-4xl font-bold text-gray-900">MFA Management</h1>
        </div>
        <p className="text-gray-600 text-lg">
          Manage multi-factor authentication for all users
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-xl flex items-start">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto text-green-500 hover:text-green-700">
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-start">
          <ExclamationTriangleIcon className="h-6 w-6 mr-3 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
            ×
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-600">Total Users</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-green-50 rounded-xl shadow p-6 border-2 border-green-200">
          <p className="text-sm text-green-700">MFA Enabled</p>
          <p className="text-3xl font-bold text-green-900">{stats.enabled}</p>
          <p className="text-xs text-green-600 mt-1">
            {Math.round((stats.enabled / stats.total) * 100)}%
          </p>
        </div>
        <div className="bg-red-50 rounded-xl shadow p-6 border-2 border-red-200">
          <p className="text-sm text-red-700">MFA Disabled</p>
          <p className="text-3xl font-bold text-red-900">{stats.disabled}</p>
          <p className="text-xs text-red-600 mt-1">
            {Math.round((stats.disabled / stats.total) * 100)}%
          </p>
        </div>
        <div className="bg-blue-50 rounded-xl shadow p-6 border-2 border-blue-200">
          <p className="text-sm text-blue-700">TOTP</p>
          <p className="text-3xl font-bold text-blue-900">{stats.totp}</p>
        </div>
        <div className="bg-purple-50 rounded-xl shadow p-6 border-2 border-purple-200">
          <p className="text-sm text-purple-700">SMS</p>
          <p className="text-3xl font-bold text-purple-900">{stats.sms}</p>
        </div>
        <div className="bg-indigo-50 rounded-xl shadow p-6 border-2 border-indigo-200">
          <p className="text-sm text-indigo-700">Both</p>
          <p className="text-3xl font-bold text-indigo-900">{stats.both}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FunnelIcon className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name or email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">MFA Status</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Users</option>
              <option value="enabled">MFA Enabled</option>
              <option value="disabled">MFA Disabled</option>
            </select>
          </div>

          {/* Method Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Method</label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as MethodFilter)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Methods</option>
              <option value="TOTP">TOTP Only</option>
              <option value="SMS">SMS Only</option>
              <option value="BOTH">Both Methods</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                MFA Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Method
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Backup Codes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Enabled At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.mfaEnabled ? (
                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Enabled
                    </span>
                  ) : (
                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Disabled
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.mfaMethod || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.backupCodesCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.mfaEnabledAt
                    ? new Date(user.mfaEnabledAt).toLocaleDateString()
                    : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {user.mfaEnabled && (
                    <button
                      onClick={() => setResetUserId(user.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Reset MFA
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No users found matching your filters</p>
          </div>
        )}
      </div>

      {/* Reset MFA Modal */}
      {resetUserId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Reset MFA</h3>
            <p className="text-gray-600 mb-6">
              This will disable MFA for the user. They will need to set it up again.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for reset <span className="text-red-500">*</span>
              </label>
              <textarea
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                placeholder="Enter reason for audit trail..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setResetUserId(null);
                  setResetReason('');
                }}
                className="flex-1 py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleResetMFA}
                disabled={!resetReason}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Reset MFA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
