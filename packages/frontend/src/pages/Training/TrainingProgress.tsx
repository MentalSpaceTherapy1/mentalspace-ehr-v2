import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Play,
  Download,
  Clock,
  CheckCircle2,
  Award,
  TrendingUp,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { useEnrollments, useDownloadCertificate } from '../../hooks/useTraining';

export default function TrainingProgress() {
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed'>('all');
  const { data: enrollments, isLoading } = useEnrollments();
  const downloadCertificateMutation = useDownloadCertificate();

  const filteredEnrollments = enrollments?.filter((enrollment: any) => {
    if (filter === 'all') return true;
    if (filter === 'in_progress') return enrollment.status === 'IN_PROGRESS' || enrollment.status === 'ENROLLED';
    return enrollment.status === 'COMPLETED';
  });

  const handleDownloadCertificate = async (enrollmentId: string) => {
    try {
      await downloadCertificateMutation.mutateAsync(enrollmentId);
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast.error('Failed to download certificate');
    }
  };

  // Calculate summary stats
  const totalEnrollments = enrollments?.length || 0;
  const completedCount = enrollments?.filter((e: any) => e.status === 'COMPLETED').length || 0;
  const inProgressCount = enrollments?.filter((e: any) => e.status === 'IN_PROGRESS' || e.status === 'ENROLLED').length || 0;
  const avgProgress = enrollments?.length > 0
    ? enrollments.reduce((sum: number, e: any) => sum + e.progress, 0) / enrollments.length
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent mb-2 flex items-center">
          <span className="text-6xl mr-4">📊</span>
          My Training Progress
        </h1>
        <p className="text-gray-600 text-lg">
          Track your learning journey and view certificates
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-xl border-2 border-violet-200 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-100 to-purple-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-4xl">📚</span>
              <BarChart3 className="w-8 h-8 text-violet-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-600 uppercase mb-1">Total Enrolled</h3>
            <p className="text-3xl font-bold text-violet-600">{totalEnrollments}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-4xl">⏳</span>
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-600 uppercase mb-1">In Progress</h3>
            <p className="text-3xl font-bold text-amber-600">{inProgressCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border-2 border-green-200 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-4xl">✅</span>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-600 uppercase mb-1">Completed</h3>
            <p className="text-3xl font-bold text-green-600">{completedCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border-2 border-purple-200 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-4xl">📈</span>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-600 uppercase mb-1">Avg Progress</h3>
            <p className="text-3xl font-bold text-purple-600">{avgProgress.toFixed(0)}%</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-violet-100 p-6 mb-8">
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold text-gray-700">Filter:</span>
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 ${
              filter === 'all'
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Courses
          </button>
          <button
            onClick={() => setFilter('in_progress')}
            className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 ${
              filter === 'in_progress'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 ${
              filter === 'completed'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Progress List */}
      {isLoading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
          <p className="mt-4 text-gray-600">Loading your progress...</p>
        </div>
      ) : filteredEnrollments && filteredEnrollments.length > 0 ? (
        <div className="space-y-4">
          {filteredEnrollments.map((enrollment: any) => (
            <div
              key={enrollment.id}
              className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-violet-100 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-gray-900">
                      {enrollment.courseName || 'Course'}
                    </h3>
                    {enrollment.status === 'COMPLETED' ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-bold rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Completed
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-bold rounded-full flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        In Progress
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-600">Progress</span>
                      <span className="text-sm font-bold text-violet-600">
                        {enrollment.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-violet-600 to-purple-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${enrollment.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    {enrollment.lastAccessedAt && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Last accessed: {new Date(enrollment.lastAccessedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {enrollment.score !== null && enrollment.score !== undefined && (
                      <div className="flex items-center gap-1">
                        <Award className="w-4 h-4" />
                        <span>Score: {enrollment.score}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 ml-4">
                  {enrollment.status === 'COMPLETED' ? (
                    <button
                      onClick={() => handleDownloadCertificate(enrollment.id)}
                      disabled={downloadCertificateMutation.isPending}
                      className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-5 h-5" />
                      Certificate
                    </button>
                  ) : (
                    <button className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-bold">
                      <Play className="w-5 h-5" />
                      Resume
                    </button>
                  )}
                </div>
              </div>

              {/* Completed Info */}
              {enrollment.status === 'COMPLETED' && enrollment.completedAt && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-gray-700">
                        Completed on {new Date(enrollment.completedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {enrollment.score && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Final Score:</span>
                        <span className="text-2xl font-bold text-green-600">
                          {enrollment.score}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl shadow-xl border-2 border-violet-100">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">No courses found</h3>
          <p className="text-gray-600">
            {filter === 'all'
              ? "You haven't enrolled in any courses yet"
              : `No ${filter.replace('_', ' ')} courses`}
          </p>
        </div>
      )}
    </div>
  );
}
