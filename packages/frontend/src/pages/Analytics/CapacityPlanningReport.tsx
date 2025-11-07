import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

interface Props {
  startDate: string;
  endDate: string;
}

export default function CapacityPlanningReport({ startDate, endDate }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', 'capacity', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });
      const response = await api.get(`/analytics/capacity-planning?${params.toString()}`);
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
        <p className="text-lg font-semibold text-gray-700">Loading capacity analysis...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4">
        <div className="flex items-center">
          <span className="text-2xl mr-3">❌</span>
          <p className="text-red-800 font-semibold">Failed to load capacity analysis</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const getCapacityColor = (status: string): string => {
    switch (status) {
      case 'High':
        return 'text-red-700';
      case 'Medium':
        return 'text-yellow-700';
      case 'Low':
        return 'text-green-700';
      default:
        return 'text-gray-700';
    }
  };

  const getCapacityBgColor = (status: string): string => {
    switch (status) {
      case 'High':
        return 'from-red-50 to-pink-50 border-red-200';
      case 'Medium':
        return 'from-yellow-50 to-amber-50 border-yellow-200';
      case 'Low':
        return 'from-green-50 to-emerald-50 border-green-200';
      default:
        return 'from-gray-50 to-slate-50 border-gray-200';
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <span className="mr-2">📈</span> Capacity Planning & Projections
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border-2 border-blue-200">
          <p className="text-sm font-semibold text-gray-600 mb-1">Total Capacity (hrs)</p>
          <p className="text-4xl font-bold text-blue-700">{Math.round(data.summary.totalCapacityHours)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl border-2 border-purple-200">
          <p className="text-sm font-semibold text-gray-600 mb-1">Used Hours</p>
          <p className="text-4xl font-bold text-purple-700">{Math.round(data.summary.totalUsedHours)}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-200">
          <p className="text-sm font-semibold text-gray-600 mb-1">Available Hours</p>
          <p className="text-4xl font-bold text-green-700">{Math.round(data.summary.totalAvailableHours)}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-6 rounded-xl border-2 border-amber-200">
          <p className="text-sm font-semibold text-gray-600 mb-1">Overall Utilization</p>
          <p className="text-4xl font-bold text-amber-700">{data.summary.overallUtilization}%</p>
        </div>
      </div>

      {/* Overall Utilization Bar */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200 mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold text-gray-800">Overall Practice Capacity</h3>
          <span className={`text-2xl font-bold ${getCapacityColor(data.summary.capacityStatus)}`}>
            {data.summary.capacityStatus} Utilization
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              data.summary.overallUtilization >= 80
                ? 'bg-red-500'
                : data.summary.overallUtilization >= 60
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(data.summary.overallUtilization, 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-sm text-gray-600 mt-2">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Provider Capacity Details */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Provider Capacity Breakdown</h3>
        {data.providers.map((provider: any) => (
          <div
            key={provider.providerId}
            className={`bg-gradient-to-r p-6 rounded-xl border-2 ${getCapacityBgColor(provider.capacityStatus)}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-lg font-bold text-gray-800">{provider.providerName}</h4>
                <p className="text-sm text-gray-600">{provider.title}</p>
              </div>
              <div className="text-right">
                <p className={`text-3xl font-bold ${getCapacityColor(provider.capacityStatus)}`}>
                  {provider.utilizationRate}%
                </p>
                <p className={`text-sm font-semibold ${getCapacityColor(provider.capacityStatus)}`}>
                  {provider.capacityStatus} Utilization
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Capacity Utilization</span>
                <span>{provider.utilizationRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    provider.utilizationRate >= 80
                      ? 'bg-red-500'
                      : provider.utilizationRate >= 60
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(provider.utilizationRate, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Total Capacity</p>
                <p className="text-2xl font-bold text-gray-800">{Math.round(provider.totalCapacityHours)} hrs</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Used Hours</p>
                <p className="text-2xl font-bold text-purple-700">{Math.round(provider.usedHours)} hrs</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Available Hours</p>
                <p className="text-2xl font-bold text-green-700">{Math.round(provider.availableHours)} hrs</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Working Days</p>
                <p className="text-2xl font-bold text-blue-700">{provider.workingDays}</p>
              </div>
            </div>

            {/* Capacity Insights */}
            <div className="mt-4 pt-4 border-t-2 border-gray-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Capacity Recommendation</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {provider.capacityStatus === 'High' &&
                      'Provider is at high capacity. Consider redistribution or additional staff.'}
                    {provider.capacityStatus === 'Medium' &&
                      'Provider utilization is optimal. Monitor for changes.'}
                    {provider.capacityStatus === 'Low' &&
                      'Provider has significant availability. Can take on more clients.'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">Status</p>
                  <p className={`text-lg font-bold ${getCapacityColor(provider.capacityStatus)}`}>
                    {provider.capacityStatus === 'High' && '⚠️'}
                    {provider.capacityStatus === 'Medium' && '✓'}
                    {provider.capacityStatus === 'Low' && '📈'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {data.providers.length === 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-xl p-8 text-center">
            <div className="text-5xl mb-4">📈</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">No Data Available</h3>
            <p className="text-gray-600">No capacity data found for the selected date range</p>
          </div>
        )}
      </div>
    </div>
  );
}
