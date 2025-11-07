import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { format, addDays } from 'date-fns';

interface Clinician {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
}

interface Appointment {
  id: string;
  clientName: string;
  clientId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: string;
  appointmentType: string;
  serviceLocation: string;
  room: string | null;
  colorCode: string;
  confirmedAt: string | null;
  noShowRiskLevel: string | null;
}

interface ProviderSchedule {
  providerId: string;
  provider: {
    id: string;
    firstName: string;
    lastName: string;
    title: string;
  } | null;
  appointments: Appointment[];
  totalAppointments: number;
  confirmedCount: number;
  pendingCount: number;
}

interface ComparisonData {
  summary: {
    totalProviders: number;
    totalAppointments: number;
    dateRange: {
      start: string;
      end: string;
    };
    viewType: string;
  };
  providerSchedules: ProviderSchedule[];
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-500',
  CONFIRMED: 'bg-green-500',
  CHECKED_IN: 'bg-amber-500',
  IN_SESSION: 'bg-purple-500',
  COMPLETED: 'bg-gray-500',
  NO_SHOW: 'bg-red-500',
  CANCELLED: 'bg-red-600',
  RESCHEDULED: 'bg-pink-500',
};

const RISK_BADGE_COLORS: Record<string, string> = {
  LOW: 'bg-green-500',
  MEDIUM: 'bg-amber-500',
  HIGH: 'bg-red-500',
};

export default function ProviderComparisonView() {
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [viewType, setViewType] = useState<'day' | 'week'>('day');
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(addDays(new Date(), 1), 'yyyy-MM-dd'));

  // Update end date when view type or start date changes
  useEffect(() => {
    const start = new Date(startDate);
    if (viewType === 'day') {
      setEndDate(format(addDays(start, 1), 'yyyy-MM-dd'));
    } else {
      setEndDate(format(addDays(start, 7), 'yyyy-MM-dd'));
    }
  }, [viewType, startDate]);

  // Fetch all clinicians for selection
  const { data: clinicians, isLoading: loadingClinicians } = useQuery<Clinician[]>({
    queryKey: ['clinicians'],
    queryFn: async () => {
      const response = await api.get('/users?role=CLINICIAN');
      return response.data.data;
    },
  });

  // Fetch provider comparison data
  const {
    data: comparisonData,
    isLoading: loadingComparison,
    error: comparisonError,
  } = useQuery<ComparisonData>({
    queryKey: ['provider-comparison', selectedProviders, startDate, endDate, viewType],
    queryFn: async () => {
      if (selectedProviders.length === 0) {
        return null;
      }

      const params = new URLSearchParams({
        providerIds: selectedProviders.join(','),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        viewType,
      });

      const response = await api.get(`/appointments/provider-comparison?${params.toString()}`);
      return response.data.data;
    },
    enabled: selectedProviders.length > 0,
  });

  const handleAddAllProviders = () => {
    if (clinicians) {
      setSelectedProviders(clinicians.map((c) => c.id));
    }
  };

  const handleClearProviders = () => {
    setSelectedProviders([]);
  };

  const handlePreviousPeriod = () => {
    const start = new Date(startDate);
    const daysToSubtract = viewType === 'day' ? 1 : 7;
    setStartDate(format(addDays(start, -daysToSubtract), 'yyyy-MM-dd'));
  };

  const handleNextPeriod = () => {
    const start = new Date(startDate);
    const daysToAdd = viewType === 'day' ? 1 : 7;
    setStartDate(format(addDays(start, daysToAdd), 'yyyy-MM-dd'));
  };

  const handleToday = () => {
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
  };

  // Generate time slots (24 hours in 30-minute intervals)
  const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    for (let hour = 0; hour <= 23; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Helper function to check if appointment overlaps with time slot
  const getAppointmentForSlot = (appointments: Appointment[], slotTime: string): Appointment | null => {
    const [slotHour, slotMinute] = slotTime.split(':').map(Number);
    const slotMinutes = slotHour * 60 + slotMinute;

    for (const apt of appointments) {
      const [startHour, startMinute] = apt.startTime.split(':').map(Number);
      const [endHour, endMinute] = apt.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      if (slotMinutes >= startMinutes && slotMinutes < endMinutes) {
        return apt;
      }
    }

    return null;
  };

  // Calculate how many slots an appointment spans
  const getAppointmentSpan = (appointment: Appointment): number => {
    return Math.ceil(appointment.duration / 30);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center">
              <span className="mr-3">📊</span> Provider Comparison View
            </h1>
            <p className="text-gray-600 text-lg mt-2">
              Compare provider schedules side-by-side to optimize resource allocation and identify scheduling patterns
            </p>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Provider Selection */}
          <div className="md:col-span-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📋 Select Providers to Compare
            </label>
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-4 max-h-[180px] overflow-y-auto">
              {loadingClinicians ? (
                <p className="text-gray-500">Loading clinicians...</p>
              ) : (
                <div className="space-y-2">
                  {clinicians?.map((clinician) => (
                    <label
                      key={clinician.id}
                      className="flex items-center p-2 hover:bg-white/50 rounded-lg cursor-pointer transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={selectedProviders.includes(clinician.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProviders([...selectedProviders, clinician.id]);
                          } else {
                            setSelectedProviders(selectedProviders.filter((id) => id !== clinician.id));
                          }
                        }}
                        className="w-4 h-4 text-purple-600 border-purple-300 rounded focus:ring-purple-500 focus:ring-2"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700">
                        {clinician.firstName} {clinician.lastName} - {clinician.title}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Check providers to compare their schedules</p>
          </div>

          {/* Quick Actions */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Quick Actions</label>
            <div className="flex gap-2">
              <button
                onClick={handleAddAllProviders}
                disabled={loadingClinicians}
                className="flex-1 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ➕ All
              </button>
              <button
                onClick={handleClearProviders}
                disabled={selectedProviders.length === 0}
                className="flex-1 px-3 py-2 bg-gradient-to-r from-gray-500 to-slate-600 text-white rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🗑️ Clear
              </button>
            </div>
          </div>

          {/* View Type */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              👁️ View Type
            </label>
            <select
              value={viewType}
              onChange={(e) => setViewType(e.target.value as 'day' | 'week')}
              className="w-full px-4 py-2 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-400 transition-all font-semibold"
            >
              <option value="day">📅 Day View</option>
              <option value="week">📆 Week View</option>
            </select>
          </div>

          {/* Date Navigation */}
          <div className="md:col-span-3">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📆 Date Range
            </label>
            <div className="flex gap-2 items-center">
              <button
                onClick={handlePreviousPeriod}
                className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-bold transition-all"
              >
                ◀
              </button>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 px-3 py-2 border-2 border-purple-200 rounded-lg focus:ring-4 focus:ring-purple-300 focus:border-purple-400 transition-all"
              />
              <button
                onClick={handleNextPeriod}
                className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-bold transition-all"
              >
                ▶
              </button>
              <button
                onClick={handleToday}
                className="px-3 py-2 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold text-sm"
              >
                Today
              </button>
            </div>
          </div>
        </div>

        {/* Selected Providers Display */}
        {selectedProviders.length > 0 && (
          <div className="mt-4 pt-4 border-t-2 border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-2">Selected Providers ({selectedProviders.length}):</p>
            <div className="flex flex-wrap gap-2">
              {selectedProviders.map((id) => {
                const clinician = clinicians?.find((c) => c.id === id);
                return (
                  <span
                    key={id}
                    className="px-3 py-1 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 rounded-full border-2 border-purple-300 font-semibold text-sm flex items-center"
                  >
                    👤 {clinician ? `${clinician.firstName} ${clinician.lastName}` : id}
                    <button
                      onClick={() => setSelectedProviders(selectedProviders.filter((p) => p !== id))}
                      className="ml-2 text-purple-600 hover:text-purple-800 font-bold"
                    >
                      ✖
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Summary Statistics */}
      {comparisonData && (
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">📈</span> Summary Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-4 rounded-xl border-2 border-purple-200">
              <p className="text-sm font-semibold text-gray-600 mb-1">Total Providers</p>
              <p className="text-3xl font-bold text-purple-700">{comparisonData.summary.totalProviders}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border-2 border-blue-200">
              <p className="text-sm font-semibold text-gray-600 mb-1">Total Appointments</p>
              <p className="text-3xl font-bold text-blue-700">{comparisonData.summary.totalAppointments}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-200">
              <p className="text-sm font-semibold text-gray-600 mb-1">Confirmed</p>
              <p className="text-3xl font-bold text-green-700">
                {comparisonData.providerSchedules.reduce((sum, p) => sum + p.confirmedCount, 0)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border-2 border-amber-200">
              <p className="text-sm font-semibold text-gray-600 mb-1">Pending</p>
              <p className="text-3xl font-bold text-amber-700">
                {comparisonData.providerSchedules.reduce((sum, p) => sum + p.pendingCount, 0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loadingComparison && (
        <div className="bg-white rounded-2xl shadow-xl p-12 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mb-4"></div>
          <p className="text-lg font-semibold text-gray-700">Loading provider schedules...</p>
        </div>
      )}

      {/* Error State */}
      {comparisonError && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4 mb-6 shadow-lg">
          <div className="flex items-center">
            <span className="text-2xl mr-3">❌</span>
            <p className="text-red-800 font-semibold">
              Failed to load provider comparison: {(comparisonError as Error).message}
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loadingComparison && selectedProviders.length === 0 && (
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <div className="text-7xl mb-4">📊</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Select Providers to Compare</h3>
          <p className="text-gray-600 text-lg mb-4">
            Choose 2 or more providers from the dropdown above to view their schedules side-by-side.
          </p>
          <button
            onClick={handleAddAllProviders}
            disabled={loadingClinicians}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ➕ Select All Providers
          </button>
        </div>
      )}

      {/* Comparison Grid */}
      {!loadingComparison && comparisonData && comparisonData.providerSchedules.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-auto">
            <div style={{ minWidth: '800px' }}>
              {/* Header Row */}
              <div
                className="grid border-b-2 border-gray-300 bg-gradient-to-r from-purple-100 to-blue-100"
                style={{
                  gridTemplateColumns: `120px repeat(${comparisonData.providerSchedules.length}, 1fr)`,
                }}
              >
                <div className="p-4 font-bold border-r-2 border-gray-300 flex items-center justify-center">
                  🕐 Time
                </div>
                {comparisonData.providerSchedules.map((schedule) => (
                  <div
                    key={schedule.providerId}
                    className="p-4 border-r-2 border-gray-300 text-center"
                  >
                    <p className="text-lg font-bold text-gray-800">
                      {schedule.provider?.firstName} {schedule.provider?.lastName}
                    </p>
                    <p className="text-sm text-gray-600">{schedule.provider?.title}</p>
                    <div className="mt-2 flex gap-2 justify-center flex-wrap">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold border border-blue-300">
                        {schedule.totalAppointments} appts
                      </span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold border border-green-300">
                        {schedule.confirmedCount} confirmed
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Time Slot Rows */}
              {timeSlots.map((slot, index) => {
                const renderedAppointments = new Set<string>();

                return (
                  <div
                    key={slot}
                    className={`grid ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    style={{
                      gridTemplateColumns: `120px repeat(${comparisonData.providerSchedules.length}, 1fr)`,
                      minHeight: '60px',
                    }}
                  >
                    {/* Time Label */}
                    <div className="p-2 border-r-2 border-b border-gray-200 flex items-center justify-center font-semibold text-gray-700">
                      {slot}
                    </div>

                    {/* Provider Columns */}
                    {comparisonData.providerSchedules.map((schedule) => {
                      const appointment = getAppointmentForSlot(schedule.appointments, slot);
                      const shouldRender = appointment && !renderedAppointments.has(appointment.id);

                      if (shouldRender && appointment) {
                        renderedAppointments.add(appointment.id);
                      }

                      return (
                        <div
                          key={schedule.providerId}
                          className="p-1 border-r-2 border-b border-gray-200 relative"
                        >
                          {shouldRender && appointment && (
                            <div
                              className={`p-2 rounded-lg shadow-lg text-white text-xs cursor-pointer hover:opacity-90 transition-all ${
                                STATUS_COLORS[appointment.status] || 'bg-gray-500'
                              }`}
                              style={{
                                height: `${getAppointmentSpan(appointment) * 60 - 4}px`,
                              }}
                            >
                              <p className="font-bold">
                                {appointment.startTime} - {appointment.endTime}
                              </p>
                              <p className="truncate">{appointment.clientName}</p>
                              <p className="text-[10px] truncate">{appointment.appointmentType}</p>
                              {appointment.room && (
                                <p className="text-[10px]">Room: {appointment.room}</p>
                              )}
                              <div className="mt-1 flex gap-1 flex-wrap">
                                <span className="px-2 py-0.5 bg-white bg-opacity-30 rounded-full text-[9px] font-semibold">
                                  {appointment.status}
                                </span>
                                {appointment.noShowRiskLevel && appointment.noShowRiskLevel !== 'LOW' && (
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[9px] font-semibold text-white ${
                                      RISK_BADGE_COLORS[appointment.noShowRiskLevel]
                                    }`}
                                  >
                                    Risk: {appointment.noShowRiskLevel}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
