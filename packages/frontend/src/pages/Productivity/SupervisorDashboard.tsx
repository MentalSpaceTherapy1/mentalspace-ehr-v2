import React, { useState } from 'react';
import { useSupervisorDashboard } from '../../hooks/productivity/useProductivityMetrics';
import MetricCard from '../../components/Productivity/MetricCard';
import { Users, TrendingUp, TrendingDown, AlertCircle, Award, Target, MessageCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function SupervisorDashboard() {
  // Use auth hook for user data - no localStorage dependency
  const { user } = useAuth();
  const userId = user?.id || '';
  const { data: dashboardData, isLoading, error } = useSupervisorDashboard(userId);
  const [selectedClinician, setSelectedClinician] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg">Loading team dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-900 mb-2 text-center">Error Loading Dashboard</h2>
          <p className="text-red-700 text-center">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  const teamMetrics = dashboardData?.teamMetrics || {};
  const clinicianPerformance = dashboardData?.clinicianPerformance || [];
  const coachingOpportunities = dashboardData?.coachingOpportunities || [];

  // Calculate team averages
  const teamKVR = teamMetrics.KVR?.value || 0;
  const teamNoShowRate = teamMetrics.NO_SHOW_RATE?.value || 0;
  const teamDocumentationRate = teamMetrics.DOCUMENTATION_COMPLETION_RATE?.value || 0;
  const teamUtilization = teamMetrics.UTILIZATION_RATE?.value || 0;

  const getKVRStatus = (kvr: number): 'success' | 'warning' | 'danger' => {
    if (kvr >= 85) return 'success';
    if (kvr >= 70) return 'warning';
    return 'danger';
  };

  const getPerformanceIndicator = (value: number, benchmark: number, inverted = false) => {
    const isGood = inverted ? value <= benchmark : value >= benchmark;
    return isGood ? (
      <div className="flex items-center text-green-600">
        <TrendingUp className="w-4 h-4 mr-1" />
        <span className="text-sm font-semibold">On Target</span>
      </div>
    ) : (
      <div className="flex items-center text-red-600">
        <TrendingDown className="w-4 h-4 mr-1" />
        <span className="text-sm font-semibold">Needs Attention</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Team Performance Dashboard</h1>
        <p className="text-gray-600 text-lg">Monitor and support your clinical team</p>
        <div className="mt-2 flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span className="text-sm text-gray-700 font-medium">
              {clinicianPerformance.length} Clinicians
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5 text-orange-600" />
            <span className="text-sm text-gray-700 font-medium">
              {coachingOpportunities.length} Coaching Opportunities
            </span>
          </div>
        </div>
      </div>

      {/* Team Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Team KVR"
          value={`${teamKVR.toFixed(1)}%`}
          subtitle="Average across all clinicians"
          benchmark={85}
          status={getKVRStatus(teamKVR)}
          trend={teamMetrics.KVR?.trend}
        />

        <MetricCard
          title="Team No-Show Rate"
          value={`${teamNoShowRate.toFixed(1)}%`}
          subtitle="Lower is better"
          benchmark={5}
          status={teamNoShowRate <= 5 ? 'success' : teamNoShowRate <= 10 ? 'warning' : 'danger'}
          inverted
        />

        <MetricCard
          title="Documentation Rate"
          value={`${teamDocumentationRate.toFixed(1)}%`}
          subtitle="Notes signed within 7 days"
          benchmark={95}
          status={teamDocumentationRate >= 95 ? 'success' : teamDocumentationRate >= 85 ? 'warning' : 'danger'}
        />

        <MetricCard
          title="Utilization Rate"
          value={`${teamUtilization.toFixed(1)}%`}
          subtitle="Scheduled vs available hours"
          benchmark={80}
          status={teamUtilization >= 80 ? 'success' : teamUtilization >= 65 ? 'warning' : 'danger'}
        />
      </div>

      {/* Clinician Performance Table */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Users className="w-7 h-7 mr-3 text-indigo-600" />
            Individual Performance
          </h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Sort by:</span>
            <select className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-semibold">
              <option>KVR (Highest)</option>
              <option>KVR (Lowest)</option>
              <option>No-Show Rate</option>
              <option>Name</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Clinician</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">KVR</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">No-Show Rate</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Documentation</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Utilization</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Status</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clinicianPerformance.map((clinician: any, index: number) => {
                const kvr = clinician.metrics.KVR?.value || 0;
                const noShowRate = clinician.metrics.NO_SHOW_RATE?.value || 0;
                const docRate = clinician.metrics.DOCUMENTATION_COMPLETION_RATE?.value || 0;
                const utilization = clinician.metrics.UTILIZATION_RATE?.value || 0;

                const kvrStatus = getKVRStatus(kvr);
                const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';

                return (
                  <tr
                    key={clinician.userId}
                    className={`${rowBg} hover:bg-indigo-50 transition-colors border-b border-gray-200`}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-indigo-700 font-bold text-sm">
                            {clinician.firstName?.[0]}{clinician.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {clinician.firstName} {clinician.lastName}
                          </p>
                          <p className="text-xs text-gray-600">{clinician.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                          kvrStatus === 'success'
                            ? 'bg-green-100 text-green-700'
                            : kvrStatus === 'warning'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {kvr.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-gray-900 font-semibold">{noShowRate.toFixed(1)}%</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-gray-900 font-semibold">{docRate.toFixed(1)}%</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-gray-900 font-semibold">{utilization.toFixed(1)}%</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {getPerformanceIndicator(kvr, 85)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => setSelectedClinician(clinician.userId)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Coaching Opportunities */}
      {coachingOpportunities.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-orange-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Target className="w-7 h-7 mr-3 text-orange-600" />
              Coaching Opportunities
            </h2>
            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">
              {coachingOpportunities.length} opportunities
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coachingOpportunities.map((opportunity: any) => (
              <div
                key={opportunity.id}
                className={`rounded-xl border-2 p-4 ${
                  opportunity.priority === 'HIGH'
                    ? 'bg-red-50 border-red-200'
                    : opportunity.priority === 'MEDIUM'
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-blue-50 border-blue-200'
                } hover:shadow-md transition-all`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {opportunity.clinicianName}
                    </h4>
                    <p className="text-sm text-gray-700 font-semibold">{opportunity.area}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-bold ${
                      opportunity.priority === 'HIGH'
                        ? 'bg-red-200 text-red-800'
                        : opportunity.priority === 'MEDIUM'
                        ? 'bg-orange-200 text-orange-800'
                        : 'bg-blue-200 text-blue-800'
                    }`}
                  >
                    {opportunity.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{opportunity.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Suggested: {new Date(opportunity.createdAt).toLocaleDateString()}
                  </span>
                  <button className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">
                    Schedule Coaching
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Performers */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-green-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Award className="w-7 h-7 mr-3 text-green-600" />
            Top Performers This Week
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {clinicianPerformance
            .filter((c: any) => (c.metrics.KVR?.value || 0) >= 85)
            .slice(0, 3)
            .map((clinician: any, index: number) => {
              const kvr = clinician.metrics.KVR?.value || 0;
              const medals = ['>G', '>H', '>I'];

              return (
                <div
                  key={clinician.userId}
                  className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center hover:shadow-md transition-all"
                >
                  <div className="text-4xl mb-2">{medals[index] || 'P'}</div>
                  <h4 className="font-bold text-gray-900 text-lg mb-1">
                    {clinician.firstName} {clinician.lastName}
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">{clinician.role}</p>
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-2xl font-bold text-green-700">{kvr.toFixed(1)}%</span>
                    <span className="text-sm text-gray-600">KVR</span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
