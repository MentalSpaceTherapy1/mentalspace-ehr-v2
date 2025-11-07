import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { format, addDays } from 'date-fns';

interface Appointment {
  id: string;
  clientName: string;
  clientId: string;
  clinicianName: string;
  clinicianId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: string;
  appointmentType: string;
  serviceLocation: string;
  colorCode: string;
  confirmedAt: string | null;
}

interface RoomSchedule {
  room: string;
  appointments: Appointment[];
  totalAppointments: number;
  occupancyRate: number;
}

interface RoomViewData {
  summary: {
    totalRooms: number;
    totalAppointments: number;
    dateRange: {
      start: string;
      end: string;
    };
    viewType: string;
    averageOccupancy: number;
  };
  roomSchedules: RoomSchedule[];
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

export default function RoomView() {
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

  // Fetch room view data
  const {
    data: roomViewData,
    isLoading,
    error,
  } = useQuery<RoomViewData>({
    queryKey: ['room-view', startDate, endDate, viewType],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        viewType,
      });

      const response = await api.get(`/appointments/room-view?${params.toString()}`);
      return response.data.data;
    },
  });

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

  // Generate time slots (8 AM to 8 PM in 30-minute intervals)
  const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    for (let hour = 8; hour <= 20; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 20) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
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

  const getOccupancyColor = (rate: number): string => {
    if (rate >= 80) return 'bg-red-500';
    if (rate >= 60) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const getOccupancyTextColor = (rate: number): string => {
    if (rate >= 80) return 'text-red-700';
    if (rate >= 60) return 'text-amber-700';
    return 'text-green-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent flex items-center">
              <span className="mr-3">🚪</span> Room View - Resource Scheduling
            </h1>
            <p className="text-gray-600 text-lg mt-2">
              Monitor room utilization and optimize space allocation across your facility
            </p>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          {/* View Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              👁️ View Type
            </label>
            <select
              value={viewType}
              onChange={(e) => setViewType(e.target.value as 'day' | 'week')}
              className="w-full px-4 py-2 bg-gradient-to-r from-green-50 to-teal-50 border-2 border-green-200 rounded-xl focus:ring-4 focus:ring-green-300 focus:border-green-400 transition-all font-semibold"
            >
              <option value="day">📅 Day View</option>
              <option value="week">📆 Week View</option>
            </select>
          </div>

          {/* Date Navigation */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📆 Date Range
            </label>
            <div className="flex gap-2 items-center">
              <button
                onClick={handlePreviousPeriod}
                className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-bold transition-all"
              >
                ◀
              </button>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 px-3 py-2 border-2 border-green-200 rounded-lg focus:ring-4 focus:ring-green-300 focus:border-green-400 transition-all"
              />
              <button
                onClick={handleNextPeriod}
                className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-bold transition-all"
              >
                ▶
              </button>
              <button
                onClick={handleToday}
                className="px-3 py-2 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold text-sm"
              >
                Today
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      {roomViewData && (
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">📊</span> Summary Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-200">
              <p className="text-sm font-semibold text-gray-600 mb-1">Total Rooms</p>
              <p className="text-3xl font-bold text-green-700">{roomViewData.summary.totalRooms}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border-2 border-blue-200">
              <p className="text-sm font-semibold text-gray-600 mb-1">Total Appointments</p>
              <p className="text-3xl font-bold text-blue-700">{roomViewData.summary.totalAppointments}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border-2 border-purple-200">
              <p className="text-sm font-semibold text-gray-600 mb-1">Average Room Occupancy</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getOccupancyColor(
                      roomViewData.summary.averageOccupancy
                    )}`}
                    style={{ width: `${roomViewData.summary.averageOccupancy}%` }}
                  ></div>
                </div>
                <p className={`text-2xl font-bold ${getOccupancyTextColor(roomViewData.summary.averageOccupancy)}`}>
                  {roomViewData.summary.averageOccupancy}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-2xl shadow-xl p-12 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mb-4"></div>
          <p className="text-lg font-semibold text-gray-700">Loading room schedules...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4 mb-6 shadow-lg">
          <div className="flex items-center">
            <span className="text-2xl mr-3">❌</span>
            <p className="text-red-800 font-semibold">
              Failed to load room view: {(error as Error).message}
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && roomViewData && roomViewData.roomSchedules.length === 0 && (
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <div className="text-7xl mb-4">🚪</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">No Room Assignments Found</h3>
          <p className="text-gray-600 text-lg">
            No appointments with room assignments exist for the selected date range.
          </p>
        </div>
      )}

      {/* Room View Grid */}
      {!isLoading && roomViewData && roomViewData.roomSchedules.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-auto">
            <div style={{ minWidth: '800px' }}>
              {/* Header Row */}
              <div
                className="grid border-b-2 border-gray-300 bg-gradient-to-r from-green-100 to-teal-100"
                style={{
                  gridTemplateColumns: `120px repeat(${roomViewData.roomSchedules.length}, 1fr)`,
                }}
              >
                <div className="p-4 font-bold border-r-2 border-gray-300 flex items-center justify-center">
                  🕐 Time
                </div>
                {roomViewData.roomSchedules.map((schedule) => (
                  <div
                    key={schedule.room}
                    className="p-4 border-r-2 border-gray-300 text-center"
                  >
                    <p className="text-lg font-bold text-gray-800 flex items-center justify-center">
                      <span className="mr-2">🚪</span>
                      {schedule.room}
                    </p>
                    <div className="mt-2 flex flex-col gap-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold border border-blue-300">
                        {schedule.totalAppointments} appts
                      </span>
                      <div className="flex items-center gap-1">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${getOccupancyColor(
                              schedule.occupancyRate
                            )}`}
                            style={{ width: `${schedule.occupancyRate}%` }}
                          ></div>
                        </div>
                        <span className={`text-xs font-bold ${getOccupancyTextColor(schedule.occupancyRate)}`}>
                          {schedule.occupancyRate}%
                        </span>
                      </div>
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
                      gridTemplateColumns: `120px repeat(${roomViewData.roomSchedules.length}, 1fr)`,
                      minHeight: '60px',
                    }}
                  >
                    {/* Time Label */}
                    <div className="p-2 border-r-2 border-b border-gray-200 flex items-center justify-center font-semibold text-gray-700">
                      {slot}
                    </div>

                    {/* Room Columns */}
                    {roomViewData.roomSchedules.map((schedule) => {
                      const appointment = getAppointmentForSlot(schedule.appointments, slot);
                      const shouldRender = appointment && !renderedAppointments.has(appointment.id);

                      if (shouldRender && appointment) {
                        renderedAppointments.add(appointment.id);
                      }

                      return (
                        <div
                          key={schedule.room}
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
                              <p className="truncate">Client: {appointment.clientName}</p>
                              <p className="text-[10px] truncate">Provider: {appointment.clinicianName}</p>
                              <p className="text-[10px] truncate">{appointment.appointmentType}</p>
                              <div className="mt-1">
                                <span className="px-2 py-0.5 bg-white bg-opacity-30 rounded-full text-[9px] font-semibold">
                                  {appointment.status}
                                </span>
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
