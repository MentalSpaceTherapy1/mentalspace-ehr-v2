import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  TrendingUp,
  UserPlus,
  Target,
  Award,
} from 'lucide-react';
import { useOnboarding, OnboardingProcess, OnboardingStats } from '../../hooks/useOnboarding';

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

const OnboardingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { onboardings, loading, error, fetchOnboardings } = useOnboarding();
  const [stats, setStats] = useState<OnboardingStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [mentorFilter, setMentorFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search term to avoid excessive API calls
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  // Extract unique mentors from onboarding data for filter dropdown
  const mentors = useMemo(() => {
    const mentorMap = new Map<string, { id: string; firstName: string; lastName: string }>();
    onboardings.forEach((onboarding) => {
      if (onboarding.mentor && onboarding.mentor.id) {
        mentorMap.set(onboarding.mentor.id, {
          id: onboarding.mentor.id,
          firstName: onboarding.mentor.firstName || '',
          lastName: onboarding.mentor.lastName || '',
        });
      }
    });
    return Array.from(mentorMap.values()).sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
    );
  }, [onboardings]);

  useEffect(() => {
    fetchOnboardings({
      status: statusFilter,
      mentorId: mentorFilter,
      search: debouncedSearchTerm,
    });
  }, [statusFilter, mentorFilter, debouncedSearchTerm]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DELAYED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'NOT_STARTED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-blue-500';
    if (percentage >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getMilestoneIcon = (type: string) => {
    switch (type) {
      case 'DAY_1':
        return '🎯';
      case 'WEEK_1':
        return '📅';
      case 'DAY_30':
        return '🌟';
      case 'DAY_60':
        return '🚀';
      case 'DAY_90':
        return '🏆';
      default:
        return '📍';
    }
  };

  const getDaysInOnboarding = (startDate: string) => {
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
                <UserPlus className="w-8 h-8 text-white" />
              </div>
              Onboarding Dashboard
            </h1>
            <p className="text-gray-600 mt-2 ml-1">Track and manage employee onboarding progress</p>
          </div>
          <button
            onClick={() => navigate('/onboarding/new')}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium"
          >
            <Plus className="w-5 h-5" />
            New Onboarding
          </button>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by employee name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                showFilters
                  ? 'bg-green-100 text-green-700 border-2 border-green-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
              }`}
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All Statuses</option>
                  <option value="NOT_STARTED">Not Started</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="DELAYED">Delayed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mentor</label>
                <select
                  value={mentorFilter}
                  onChange={(e) => setMentorFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All Mentors</option>
                  {mentors.map((mentor) => (
                    <option key={mentor.id} value={mentor.id}>
                      {mentor.firstName} {mentor.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Active Onboardings</p>
              <p className="text-3xl font-bold mt-1">
                {onboardings.filter((o) => o.status === 'IN_PROGRESS').length}
              </p>
            </div>
            <Clock className="w-12 h-12 text-blue-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Completed</p>
              <p className="text-3xl font-bold mt-1">
                {onboardings.filter((o) => o.status === 'COMPLETED').length}
              </p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Delayed</p>
              <p className="text-3xl font-bold mt-1">
                {onboardings.filter((o) => o.status === 'DELAYED').length}
              </p>
            </div>
            <AlertCircle className="w-12 h-12 text-red-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Avg. Completion</p>
              <p className="text-3xl font-bold mt-1">
                {onboardings.length > 0
                  ? Math.round(
                      onboardings.reduce((sum, o) => sum + o.completionPercentage, 0) /
                        onboardings.length
                    )
                  : 0}
                %
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-purple-200 opacity-80" />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Onboarding List */}
      {!loading && !error && (
        <div className="space-y-4">
          {onboardings.map((onboarding) => (
            <div
              key={onboarding.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/onboarding/${onboarding.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/onboarding/${onboarding.id}`);
                }
              }}
              aria-label={`View onboarding details for ${onboarding.staff?.firstName} ${onboarding.staff?.lastName} - ${onboarding.completionPercentage}% complete`}
              className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left: Employee Info */}
                <div className="flex items-start gap-4 lg:w-1/3">
                  {onboarding.staff?.photoUrl ? (
                    <img
                      src={onboarding.staff.photoUrl}
                      alt={`${onboarding.staff.firstName} ${onboarding.staff.lastName}`}
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                      <Users className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                      {onboarding.staff?.firstName} {onboarding.staff?.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">{onboarding.staff?.jobTitle}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {onboarding.staff?.department}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        Day {getDaysInOnboarding(onboarding.startDate)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Middle: Progress */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Progress</span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        onboarding.status
                      )}`}
                    >
                      {onboarding.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden mb-4">
                    <div
                      className={`absolute inset-y-0 left-0 ${getProgressColor(
                        onboarding.completionPercentage
                      )} transition-all duration-500 rounded-full`}
                      style={{ width: `${onboarding.completionPercentage}%` }}
                    >
                      <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-900">
                        {onboarding.completionPercentage}%
                      </span>
                    </div>
                  </div>

                  {/* Milestone Indicators */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">Milestones:</span>
                    <div className="flex gap-1">
                      {onboarding.milestones?.slice(0, 5).map((milestone, index) => (
                        <div
                          key={index}
                          className={`text-xl ${
                            milestone.status === 'COMPLETED'
                              ? 'opacity-100'
                              : milestone.status === 'MISSED'
                              ? 'opacity-50 grayscale'
                              : 'opacity-40'
                          }`}
                          title={milestone.milestoneName}
                        >
                          {getMilestoneIcon(milestone.milestoneType)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Mentor & Stats */}
                <div className="lg:w-1/4">
                  {onboarding.mentor && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2">Mentor:</p>
                      <div className="flex items-center gap-2">
                        {onboarding.mentor.photoUrl ? (
                          <img
                            src={onboarding.mentor.photoUrl}
                            alt={`${onboarding.mentor.firstName} ${onboarding.mentor.lastName}`}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <Users className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-700">
                          {onboarding.mentor.firstName} {onboarding.mentor.lastName}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Tasks:</span>
                      <span className="font-medium text-gray-900">
                        {onboarding.checklists?.filter((c) => c.isCompleted).length || 0} /{' '}
                        {onboarding.checklists?.length || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Due:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(onboarding.expectedCompletionDate).toLocaleDateString()}
                      </span>
                    </div>
                    {onboarding.status === 'DELAYED' && (
                      <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                        <AlertCircle className="w-3 h-3" />
                        <span>Overdue items</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && onboardings.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
            <UserPlus className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No onboarding processes</h3>
          <p className="text-gray-600 mb-6">Start onboarding new employees</p>
          <button
            onClick={() => navigate('/onboarding/new')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium"
          >
            <Plus className="w-5 h-5" />
            New Onboarding
          </button>
        </div>
      )}
    </div>
  );
};

export default OnboardingDashboard;
