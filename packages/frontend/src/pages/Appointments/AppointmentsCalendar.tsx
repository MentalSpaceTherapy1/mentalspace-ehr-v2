import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { useNavigate } from 'react-router-dom';

interface Appointment {
  id: string;
  clientId: string;
  clinicianId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  appointmentType: string;
  serviceLocation: string;
  status: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
  };
  clinician: {
    id: string;
    firstName: string;
    lastName: string;
    title: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: '#3B82F6', // blue
  CONFIRMED: '#10B981', // green
  CHECKED_IN: '#F59E0B', // amber
  IN_SESSION: '#8B5CF6', // purple
  COMPLETED: '#6B7280', // gray
  NO_SHOW: '#EF4444', // red
  CANCELLED: '#DC2626', // dark red
  RESCHEDULED: '#EC4899', // pink
};

export default function AppointmentsCalendar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const calendarRef = useRef<FullCalendar>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    clinicianId: '',
    status: '',
    appointmentType: '',
  });
  const [viewType, setViewType] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek'>('timeGridWeek');

  // Fetch appointments
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', filters],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filters.clinicianId) params.append('clinicianId', filters.clinicianId);
      if (filters.status) params.append('status', filters.status);
      if (filters.appointmentType) params.append('appointmentType', filters.appointmentType);

      const response = await axios.get(`/appointments?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
  });

  // Fetch clinicians for filter
  const { data: clinicians } = useQuery({
    queryKey: ['clinicians'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get('/users?role=CLINICIAN', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
  });

  // Transform appointments to calendar events
  const events = appointments?.map((apt: Appointment) => ({
    id: apt.id,
    title: `${apt.client.firstName} ${apt.client.lastName} - ${apt.appointmentType}`,
    start: `${apt.appointmentDate.split('T')[0]}T${apt.startTime}`,
    end: `${apt.appointmentDate.split('T')[0]}T${apt.endTime}`,
    backgroundColor: STATUS_COLORS[apt.status] || '#6B7280',
    borderColor: STATUS_COLORS[apt.status] || '#6B7280',
    extendedProps: {
      ...apt,
    },
  })) || [];

  // Handle event click
  const handleEventClick = (clickInfo: any) => {
    const appointment = clickInfo.event.extendedProps as Appointment;
    setSelectedAppointment(appointment);
    setIsDetailModalOpen(true);
  };

  // Handle date click (create new appointment)
  const handleDateClick = (dateClickInfo: any) => {
    navigate(`/appointments/new?date=${dateClickInfo.dateStr}`);
  };

  // Mutation for updating appointment status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const token = localStorage.getItem('token');
      await axios.put(`/appointments/${id}`, { status }, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setIsDetailModalOpen(false);
    },
  });

  // Quick action handlers
  const handleCheckIn = () => {
    if (selectedAppointment) {
      const now = new Date();
      const checkedInTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      axios.post(`/appointments/${selectedAppointment.id}/check-in`, {
        checkedInTime,
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        setIsDetailModalOpen(false);
      });
    }
  };

  const handleCheckOut = () => {
    if (selectedAppointment) {
      const now = new Date();
      const checkedOutTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      axios.post(`/appointments/${selectedAppointment.id}/check-out`, {
        checkedOutTime,
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        setIsDetailModalOpen(false);
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                Appointments Calendar
              </h1>
              <p className="text-gray-600">Manage and schedule client appointments</p>
            </div>
            <button
              onClick={() => navigate('/appointments/new')}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
            >
              + New Appointment
            </button>
          </div>

          {/* Schedule Management Navigation */}
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => navigate('/appointments')}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold"
              >
                📅 Calendar
              </button>
              <button
                onClick={() => navigate('/appointments/waitlist')}
                className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold"
              >
                ⏳ Waitlist
              </button>
              <button
                onClick={() => navigate('/appointments/schedules')}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold"
              >
                🗓️ Clinician Schedules
              </button>
              <button
                onClick={() => navigate('/appointments/time-off')}
                className="px-6 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold"
              >
                🌴 Time Off
              </button>
              <button
                onClick={() => navigate('/settings/reminders')}
                className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold"
              >
                🔔 Reminders
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* View Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">View</label>
                <select
                  value={viewType}
                  onChange={(e) => {
                    setViewType(e.target.value as any);
                    calendarRef.current?.getApi().changeView(e.target.value);
                  }}
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="timeGridWeek">Week View</option>
                  <option value="timeGridDay">Day View</option>
                  <option value="dayGridMonth">Month View</option>
                  <option value="listWeek">List View</option>
                </select>
              </div>

              {/* Clinician Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Clinician</label>
                <select
                  value={filters.clinicianId}
                  onChange={(e) => setFilters({ ...filters, clinicianId: e.target.value })}
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">All Clinicians</option>
                  {clinicians?.map((clinician: any) => (
                    <option key={clinician.id} value={clinician.id}>
                      {clinician.firstName} {clinician.lastName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">All Statuses</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="CHECKED_IN">Checked In</option>
                  <option value="IN_SESSION">In Session</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="NO_SHOW">No Show</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Appointment Type</label>
                <select
                  value={filters.appointmentType}
                  onChange={(e) => setFilters({ ...filters, appointmentType: e.target.value })}
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">All Types</option>
                  <option value="Initial Consultation">Initial Consultation</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Therapy Session">Therapy Session</option>
                  <option value="Medication Management">Medication Management</option>
                  <option value="Crisis Intervention">Crisis Intervention</option>
                </select>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
            <div className="flex flex-wrap gap-4 justify-center">
              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                <div key={status} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: color }}></div>
                  <span className="text-sm text-gray-700">{status.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView={viewType}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
              }}
              events={events}
              eventClick={handleEventClick}
              dateClick={handleDateClick}
              editable={true}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              weekends={true}
              height="auto"
              slotMinTime="07:00:00"
              slotMaxTime="20:00:00"
              allDaySlot={false}
              nowIndicator={true}
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                meridiem: true,
              }}
            />
          )}
        </div>

        {/* Appointment Detail Modal */}
        {isDetailModalOpen && selectedAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Appointment Details
                  </h2>
                  <button
                    onClick={() => setIsDetailModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Status Badge */}
                <div className="mb-6">
                  <span
                    className="inline-block px-4 py-2 rounded-full text-white font-semibold"
                    style={{ backgroundColor: STATUS_COLORS[selectedAppointment.status] }}
                  >
                    {selectedAppointment.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Client</label>
                    <p className="text-lg">{selectedAppointment.client.firstName} {selectedAppointment.client.lastName}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Clinician</label>
                    <p className="text-lg">{selectedAppointment.clinician.title} {selectedAppointment.clinician.firstName} {selectedAppointment.clinician.lastName}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                      <p>{new Date(selectedAppointment.appointmentDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Time</label>
                      <p>{selectedAppointment.startTime} - {selectedAppointment.endTime}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
                      <p>{selectedAppointment.appointmentType}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Duration</label>
                      <p>{selectedAppointment.duration} minutes</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Location</label>
                    <p>{selectedAppointment.serviceLocation}</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-3">
                  {selectedAppointment.status === 'SCHEDULED' || selectedAppointment.status === 'CONFIRMED' ? (
                    <button
                      onClick={handleCheckIn}
                      className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold"
                    >
                      Check In
                    </button>
                  ) : null}

                  {selectedAppointment.status === 'CHECKED_IN' || selectedAppointment.status === 'IN_SESSION' ? (
                    <button
                      onClick={handleCheckOut}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold"
                    >
                      Check Out
                    </button>
                  ) : null}

                  {selectedAppointment.serviceLocation === 'Telehealth' &&
                   (selectedAppointment.status === 'SCHEDULED' ||
                    selectedAppointment.status === 'CONFIRMED' ||
                    selectedAppointment.status === 'CHECKED_IN' ||
                    selectedAppointment.status === 'IN_SESSION') ? (
                    <button
                      onClick={() => {
                        const userRole = 'clinician'; // TODO: Determine from user context
                        navigate(`/telehealth/session/${selectedAppointment.id}?role=${userRole}`);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-colors font-semibold flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                      </svg>
                      Join Telehealth Session
                    </button>
                  ) : null}

                  <button
                    onClick={() => navigate(`/appointments/${selectedAppointment.id}/edit`)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-semibold"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => navigate(`/appointments/${selectedAppointment.id}/reschedule`)}
                    className="px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors font-semibold"
                  >
                    Reschedule
                  </button>

                  <button
                    onClick={() => navigate(`/clients/${selectedAppointment.clientId}/notes/new`)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-semibold"
                  >
                    Create Note
                  </button>

                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to cancel this appointment?')) {
                        navigate(`/appointments/${selectedAppointment.id}/cancel`);
                      }
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
