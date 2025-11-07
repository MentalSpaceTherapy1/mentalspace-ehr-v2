import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

interface Props {
  startDate: string;
  endDate: string;
}

export default function NoShowRatesReport({ startDate, endDate }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', 'no-show', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });
      const response = await api.get(`/analytics/no-show-rates?${params.toString()}`);
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mb-4"></div>
        <p className="text-lg font-semibold text-gray-700">Loading no-show analysis...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4">
        <div className="flex items-center">
          <span className="text-2xl mr-3">❌</span>
          <p className="text-red-800 font-semibold">Failed to load no-show analysis</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <span className="mr-2">❌</span> No-Show Rate Analysis
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-red-50 to-pink-50 p-6 rounded-xl border-2 border-red-200">
          <p className="text-sm font-semibold text-gray-600 mb-1">Total No-Shows</p>
          <p className="text-4xl font-bold text-red-700">{data.summary.totalNoShows}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-xl border-2 border-orange-200">
          <p className="text-sm font-semibold text-gray-600 mb-1">Total Appointments</p>
          <p className="text-4xl font-bold text-orange-700">{data.summary.totalAppointments}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl border-2 border-purple-200">
          <p className="text-sm font-semibold text-gray-600 mb-1">Overall No-Show Rate</p>
          <p className="text-4xl font-bold text-purple-700">{data.summary.overallNoShowRate}%</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-200">
          <p className="text-sm font-semibold text-gray-600 mb-1">Date Range</p>
          <p className="text-sm font-bold text-green-700 mt-2">
            {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Provider */}
        <div className="bg-gradient-to-br from-red-50 to-orange-50 p-6 rounded-xl border-2 border-red-200">
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
                    <p className="text-2xl font-bold text-red-700">{provider.noShowRate}%</p>
                    <p className="text-xs text-gray-600">
                      {provider.noShows} of {provider.total}
                    </p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(provider.noShowRate, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {data.byProvider.length === 0 && (
              <p className="text-center text-gray-500 py-4">No provider data available</p>
            )}
          </div>
        </div>

        {/* By Appointment Type */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl border-2 border-purple-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">📋</span> By Appointment Type
          </h3>
          <div className="space-y-3">
            {data.byAppointmentType.map((type: any, index: number) => (
              <div key={index} className="bg-white p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-800">{type.type}</p>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-700">{type.noShowRate}%</p>
                    <p className="text-xs text-gray-600">
                      {type.noShows} of {type.total}
                    </p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(type.noShowRate, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {data.byAppointmentType.length === 0 && (
              <p className="text-center text-gray-500 py-4">No appointment type data available</p>
            )}
          </div>
        </div>

        {/* By Day of Week */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border-2 border-blue-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">📅</span> By Day of Week
          </h3>
          <div className="space-y-3">
            {data.byDayOfWeek.map((day: any) => (
              <div key={day.dayOfWeek} className="bg-white p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-800">{day.dayOfWeek}</p>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-700">{day.noShowRate}%</p>
                    <p className="text-xs text-gray-600">
                      {day.noShows} of {day.total}
                    </p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(day.noShowRate, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {data.byDayOfWeek.length === 0 && (
              <p className="text-center text-gray-500 py-4">No day of week data available</p>
            )}
          </div>
        </div>

        {/* By Time of Day */}
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-6 rounded-xl border-2 border-amber-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">🕐</span> By Time of Day
          </h3>
          <div className="space-y-3">
            {data.byTimeOfDay.map((time: any) => (
              <div key={time.timeOfDay} className="bg-white p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-800">{time.timeOfDay}</p>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-amber-700">{time.noShowRate}%</p>
                    <p className="text-xs text-gray-600">
                      {time.noShows} of {time.total}
                    </p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(time.noShowRate, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {data.byTimeOfDay.length === 0 && (
              <p className="text-center text-gray-500 py-4">No time of day data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
