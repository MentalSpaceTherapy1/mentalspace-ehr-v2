import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

interface Props {
  startDate: string;
  endDate: string;
}

export default function CancellationPatternsReport({ startDate, endDate }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', 'cancellation', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });
      const response = await api.get(`/analytics/cancellation-patterns?${params.toString()}`);
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-600 mb-4"></div>
        <p className="text-lg font-semibold text-gray-700">Loading cancellation analysis...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4">
        <div className="flex items-center">
          <span className="text-2xl mr-3">❌</span>
          <p className="text-red-800 font-semibold">Failed to load cancellation analysis</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <span className="mr-2">🔄</span> Cancellation Pattern Analysis
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-xl border-2 border-orange-200">
          <p className="text-sm font-semibold text-gray-600 mb-1">Total Cancellations</p>
          <p className="text-4xl font-bold text-orange-700">{data.summary.totalCancellations}</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-pink-50 p-6 rounded-xl border-2 border-red-200">
          <p className="text-sm font-semibold text-gray-600 mb-1">Total Appointments</p>
          <p className="text-4xl font-bold text-red-700">{data.summary.totalAppointments}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl border-2 border-purple-200">
          <p className="text-sm font-semibold text-gray-600 mb-1">Cancellation Rate</p>
          <p className="text-4xl font-bold text-purple-700">{data.summary.cancellationRate}%</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-200">
          <p className="text-sm font-semibold text-gray-600 mb-1">Date Range</p>
          <p className="text-sm font-bold text-green-700 mt-2">
            {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* By Reason */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-xl border-2 border-orange-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">📝</span> By Cancellation Reason
          </h3>
          <div className="space-y-3">
            {data.byReason.map((reason: any, index: number) => (
              <div key={index} className="bg-white p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-800">{reason.reason || 'Not Specified'}</p>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-700">{reason.percentage}%</p>
                    <p className="text-xs text-gray-600">{reason.count} cancellations</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(reason.percentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {data.byReason.length === 0 && (
              <p className="text-center text-gray-500 py-4">No cancellation reason data available</p>
            )}
          </div>
        </div>

        {/* By Provider */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl border-2 border-purple-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">👨‍⚕️</span> By Provider
          </h3>
          <div className="space-y-3">
            {data.byProvider.map((provider: any) => (
              <div key={provider.providerId} className="bg-white p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-800">{provider.providerName}</p>
                    <p className="text-sm text-gray-600">{provider.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-700">{provider.cancellationRate}%</p>
                    <p className="text-xs text-gray-600">
                      {provider.cancellations} of {provider.total}
                    </p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(provider.cancellationRate, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {data.byProvider.length === 0 && (
              <p className="text-center text-gray-500 py-4">No provider data available</p>
            )}
          </div>
        </div>
      </div>

      {/* By Timing */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border-2 border-blue-200">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">⏱️</span> Cancellation Timing Analysis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {data.byTiming.map((timing: any, index: number) => (
            <div key={index} className="bg-white p-4 rounded-lg">
              <div className="text-center mb-3">
                <p className="text-sm font-semibold text-gray-600 mb-1">{timing.timeframe}</p>
                <p className="text-3xl font-bold text-blue-700">{timing.percentage}%</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-800">{timing.count}</p>
                <p className="text-xs text-gray-600">cancellations</p>
              </div>
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(timing.percentage, 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
          {data.byTiming.length === 0 && (
            <div className="col-span-5">
              <p className="text-center text-gray-500 py-4">No timing data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
