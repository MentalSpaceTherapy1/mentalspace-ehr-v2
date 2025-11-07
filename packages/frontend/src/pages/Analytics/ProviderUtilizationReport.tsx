import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

interface Props {
  startDate: string;
  endDate: string;
}

export default function ProviderUtilizationReport({ startDate, endDate }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', 'utilization', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });
      const response = await api.get(`/analytics/provider-utilization?${params.toString()}`);
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mb-4"></div>
        <p className="text-lg font-semibold text-gray-700">Loading provider utilization data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4">
        <div className="flex items-center">
          <span className="text-2xl mr-3">❌</span>
          <p className="text-red-800 font-semibold">Failed to load provider utilization data</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <span className="mr-2">📊</span> Provider Utilization Analysis
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl border-2 border-purple-200">
          <p className="text-sm font-semibold text-gray-600 mb-1">Total Providers</p>
          <p className="text-4xl font-bold text-purple-700">{data.summary.totalProviders}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border-2 border-blue-200">
          <p className="text-sm font-semibold text-gray-600 mb-1">Average Utilization</p>
          <p className="text-4xl font-bold text-blue-700">{data.summary.averageUtilization}%</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-200">
          <p className="text-sm font-semibold text-gray-600 mb-1">Date Range</p>
          <p className="text-sm font-bold text-green-700 mt-2">
            {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Provider Details */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Provider Breakdown</h3>
        {data.providers.map((provider: any) => (
          <div
            key={provider.providerId}
            className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-xl border-2 border-purple-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-lg font-bold text-gray-800">{provider.providerName}</h4>
                <p className="text-sm text-gray-600">{provider.title}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-purple-700">{provider.utilizationRate}%</p>
                <p className="text-sm text-gray-600">Utilization</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Utilization Rate</span>
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
                <p className="text-xs text-gray-600 mb-1">Total Appointments</p>
                <p className="text-2xl font-bold text-gray-800">{provider.totalAppointments}</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Completed</p>
                <p className="text-2xl font-bold text-green-700">
                  {provider.completedAppointments}
                  <span className="text-sm ml-1">({provider.completionRate}%)</span>
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Cancelled</p>
                <p className="text-2xl font-bold text-orange-700">
                  {provider.cancelledAppointments}
                  <span className="text-sm ml-1">({provider.cancellationRate}%)</span>
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">No-Show</p>
                <p className="text-2xl font-bold text-red-700">
                  {provider.noShowAppointments}
                  <span className="text-sm ml-1">({provider.noShowRate}%)</span>
                </p>
              </div>
            </div>

            {/* Time Statistics */}
            <div className="mt-4 pt-4 border-t-2 border-purple-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Scheduled Hours</p>
                  <p className="text-xl font-bold text-gray-800">
                    {Math.round(provider.totalScheduledMinutes / 60)} hrs
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Billable Hours</p>
                  <p className="text-xl font-bold text-green-700">
                    {Math.round(provider.totalBillableMinutes / 60)} hrs
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {data.providers.length === 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-xl p-8 text-center">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">No Data Available</h3>
            <p className="text-gray-600">No provider utilization data found for the selected date range</p>
          </div>
        )}
      </div>
    </div>
  );
}
