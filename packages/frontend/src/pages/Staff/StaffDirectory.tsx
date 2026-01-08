import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  Plus,
  Building2,
  Briefcase,
  Mail,
  Phone,
  MoreVertical,
  UserCircle,
} from 'lucide-react';
import { useStaff, Staff } from '../../hooks/useStaff';

// Custom hook for debounced value
function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

const StaffDirectory: React.FC = () => {
  const navigate = useNavigate();
  const { staff, loading, error, fetchStaff } = useStaff();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search term to avoid excessive API calls
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  useEffect(() => {
    fetchStaff({
      search: debouncedSearchTerm,
      department: departmentFilter,
      role: roleFilter,
      status: statusFilter,
    });
  }, [debouncedSearchTerm, departmentFilter, roleFilter, statusFilter]);

  const departments = Array.from(new Set(staff.map((s) => s.department))).filter(Boolean);
  const roles = Array.from(new Set(staff.map((s) => s.jobTitle))).filter(Boolean);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'ON_LEAVE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'TERMINATED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'PENDING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEmploymentTypeColor = (type: string) => {
    switch (type) {
      case 'FULL_TIME':
        return 'bg-purple-100 text-purple-800';
      case 'PART_TIME':
        return 'bg-indigo-100 text-indigo-800';
      case 'CONTRACT':
        return 'bg-orange-100 text-orange-800';
      case 'INTERN':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatEmploymentType = (type: string | null | undefined) => {
    if (!type) return 'N/A';
    return type.replace('_', ' ');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              Staff Directory
            </h1>
            <p className="text-gray-600 mt-2 ml-1">
              Manage and view all staff members
            </p>
          </div>
          <button
            onClick={() => navigate('/staff/new')}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium"
          >
            <Plus className="w-5 h-5" />
            Add New Staff
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search staff by name, email, or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                showFilters
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
              }`}
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Roles</option>
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_LEAVE">On Leave</option>
                  <option value="TERMINATED">Terminated</option>
                  <option value="PENDING">Pending</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Staff</p>
              <p className="text-3xl font-bold mt-1">{staff.length}</p>
            </div>
            <Users className="w-12 h-12 text-blue-200 opacity-80" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Active</p>
              <p className="text-3xl font-bold mt-1">
                {staff.filter((s) => s.employmentStatus === 'ACTIVE').length}
              </p>
            </div>
            <Users className="w-12 h-12 text-green-200 opacity-80" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium">On Leave</p>
              <p className="text-3xl font-bold mt-1">
                {staff.filter((s) => s.employmentStatus === 'ON_LEAVE').length}
              </p>
            </div>
            <Users className="w-12 h-12 text-yellow-200 opacity-80" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Departments</p>
              <p className="text-3xl font-bold mt-1">{departments.length}</p>
            </div>
            <Building2 className="w-12 h-12 text-purple-200 opacity-80" />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Staff Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {staff.map((member) => (
            <div
              key={member.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/staff/${member.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/staff/${member.id}`);
                }
              }}
              aria-label={`View ${member.firstName} ${member.lastName}'s profile`}
              className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 overflow-hidden group hover:scale-105 transform focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {/* Card Header with Gradient */}
              <div className="h-24 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 relative">
                <div className="absolute inset-0 bg-black opacity-10 group-hover:opacity-0 transition-opacity"></div>
              </div>

              {/* Photo */}
              <div className="flex justify-center -mt-12 mb-4">
                {member.photoUrl ? (
                  <img
                    src={member.photoUrl}
                    alt={`${member.firstName} ${member.lastName}`}
                    className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    <UserCircle className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Card Content */}
              <div className="px-6 pb-6">
                <h3 className="text-xl font-bold text-gray-900 text-center mb-1">
                  {member.firstName} {member.lastName}
                </h3>
                <p className="text-gray-600 text-center text-sm mb-4">{member.jobTitle}</p>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 justify-center mb-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      member.employmentStatus
                    )}`}
                  >
                    {member.employmentStatus.replace('_', ' ')}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getEmploymentTypeColor(
                      member.employmentType
                    )}`}
                  >
                    {formatEmploymentType(member.employmentType)}
                  </span>
                </div>

                {/* Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    <span className="truncate">{member.department}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4 text-green-500" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4 text-purple-500" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                </div>

                {/* Manager Info */}
                {member.manager && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Reports to:</p>
                    <p className="text-sm font-medium text-gray-700">
                      {member.manager.firstName} {member.manager.lastName}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && staff.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
            <Users className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No staff members found</h3>
          <p className="text-gray-600 mb-6">Get started by adding your first staff member</p>
          <button
            onClick={() => navigate('/staff/new')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium"
          >
            <Plus className="w-5 h-5" />
            Add New Staff
          </button>
        </div>
      )}
    </div>
  );
};

export default StaffDirectory;
