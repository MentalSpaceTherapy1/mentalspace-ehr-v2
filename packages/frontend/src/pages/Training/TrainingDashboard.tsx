import React, { useState } from 'react';
import {
  BookOpen,
  GraduationCap,
  Award,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Filter,
  Trophy,
} from 'lucide-react';
import { useTrainingStats, useUpcomingTrainings, useEnrollments } from '../../hooks/useTraining';

export default function TrainingDashboard() {
  const [filter, setFilter] = useState<'all' | 'required' | 'optional'>('all');
  const { data: stats, isLoading: statsLoading } = useTrainingStats();
  const { data: upcomingTrainings } = useUpcomingTrainings();
  const { data: enrollments } = useEnrollments();

  // Calculate progress for required trainings
  const requiredProgress = stats?.requiredPending
    ? ((stats.completed / (stats.completed + stats.requiredPending)) * 100).toFixed(0)
    : 100;

  // Filter enrollments based on selected filter
  const filteredEnrollments = enrollments?.filter((enrollment: any) => {
    if (filter === 'all') return true;
    if (filter === 'required') return enrollment.course?.required;
    return !enrollment.course?.required;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 flex items-center">
          <span className="text-6xl mr-4">🎓</span>
          Training & Development
        </h1>
        <p className="text-gray-600 text-lg">
          Build your skills, earn CEU credits, and stay compliant with required trainings
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Courses */}
        <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-indigo-200 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-5xl">📚</span>
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-bold text-gray-600 uppercase mb-1">Total Courses</h3>
            <p className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {statsLoading ? '...' : stats?.totalCourses || 0}
            </p>
            <p className="text-xs text-gray-500 mt-2">Available to you</p>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-amber-200 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-5xl">⏳</span>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <Clock className="w-7 h-7 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-bold text-gray-600 uppercase mb-1">In Progress</h3>
            <p className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              {statsLoading ? '...' : stats?.inProgress || 0}
            </p>
            <p className="text-xs text-gray-500 mt-2">Currently learning</p>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-green-200 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-5xl">✅</span>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-bold text-gray-600 uppercase mb-1">Completed</h3>
            <p className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              {statsLoading ? '...' : stats?.completed || 0}
            </p>
            <p className="text-xs text-gray-500 mt-2">Certificates earned</p>
          </div>
        </div>

        {/* CEU Credits */}
        <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-purple-200 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-5xl">🏆</span>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <Award className="w-7 h-7 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-bold text-gray-600 uppercase mb-1">CEU Credits</h3>
            <p className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {statsLoading ? '...' : stats?.ceuCreditsEarned || 0}
            </p>
            <p className="text-xs text-gray-500 mt-2">Earned this year</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Required Trainings Progress */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-xl border-2 border-indigo-100 p-8 mb-8">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6 flex items-center">
              <span className="text-3xl mr-3">🎯</span>
              Required Training Progress
            </h2>

            {/* Progress Ring */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-48 h-48">
                <svg className="transform -rotate-90 w-48 h-48">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="#e0e7ff"
                    strokeWidth="16"
                    fill="none"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="url(#gradient)"
                    strokeWidth="16"
                    fill="none"
                    strokeDasharray={`${(Number(requiredProgress) / 100) * 553} 553`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="50%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {requiredProgress}%
                  </span>
                  <span className="text-sm text-gray-600">Complete</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-semibold text-gray-700">Completed</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{stats?.completed || 0}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-semibold text-gray-700">Pending</span>
                </div>
                <p className="text-2xl font-bold text-amber-600">{stats?.requiredPending || 0}</p>
              </div>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-purple-100 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center">
                <span className="text-3xl mr-3">📋</span>
                My Enrollments
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                    filter === 'all'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('required')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                    filter === 'required'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Required
                </button>
                <button
                  onClick={() => setFilter('optional')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                    filter === 'optional'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Optional
                </button>
              </div>
            </div>

            {/* Enrollments List */}
            <div className="space-y-3">
              {filteredEnrollments && filteredEnrollments.length > 0 ? (
                filteredEnrollments.slice(0, 5).map((enrollment: any) => (
                  <div
                    key={enrollment.id}
                    className="bg-gradient-to-r from-gray-50 to-purple-50 rounded-xl p-4 border border-purple-200 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-gray-900">{enrollment.courseName || 'Course'}</h3>
                      {enrollment.course?.required && (
                        <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                          REQUIRED
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${enrollment.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-purple-600">
                        {enrollment.progress}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>
                        {enrollment.status === 'COMPLETED' ? '✅ Completed' : '⏳ In Progress'}
                      </span>
                      {enrollment.lastAccessedAt && (
                        <span>
                          Last accessed: {new Date(enrollment.lastAccessedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No enrollments found</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Trainings Timeline */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-xl border-2 border-pink-100 p-8">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-6 flex items-center">
              <span className="text-3xl mr-3">📅</span>
              Upcoming Deadlines
            </h2>

            <div className="space-y-4">
              {upcomingTrainings && upcomingTrainings.length > 0 ? (
                upcomingTrainings.slice(0, 6).map((training: any, index: number) => (
                  <div key={training.id} className="relative pl-8">
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-2 w-4 h-4 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full border-2 border-white shadow-lg"></div>
                    {/* Timeline line */}
                    {index < upcomingTrainings.length - 1 && (
                      <div className="absolute left-2 top-6 w-0.5 h-full bg-gradient-to-b from-pink-300 to-purple-300"></div>
                    )}
                    <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg p-3 border border-pink-200">
                      <h4 className="font-bold text-gray-900 text-sm mb-1">
                        {training.courseName || 'Training'}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Calendar className="w-3 h-3" />
                        <span>Due: {new Date(training.dueDate).toLocaleDateString()}</span>
                      </div>
                      {training.daysUntilDue <= 7 && (
                        <div className="mt-2 px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded inline-block">
                          ⚠ Due soon!
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm">No upcoming deadlines</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
