import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

interface Appointment {
  id: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  appointmentType: string;
  status: string;
  serviceLocation: string;
  provider?: {
    firstName: string;
    lastName: string;
    title: string;
  };
}

interface AppointmentsTabProps {
  clientId: string;
}

export default function AppointmentsTab({ clientId }: AppointmentsTabProps) {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  useEffect(() => {
    fetchAppointments();
  }, [clientId]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/appointments/client/${clientId}`);

      // Sort by date descending (most recent first)
      const sorted = response.data.data.sort((a: Appointment, b: Appointment) => {
        const dateA = new Date(`${a.appointmentDate} ${a.startTime}`).getTime();
        const dateB = new Date(`${b.appointmentDate} ${b.startTime}`).getTime();
        return dateB - dateA;
      });

      setAppointments(sorted);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'CHECKED_IN':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'IN_SESSION':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'COMPLETED':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'NO_SHOW':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'RESCHEDULED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const filterAppointments = () => {
    const now = new Date();

    if (filter === 'upcoming') {
      return appointments.filter(apt => {
        const aptDate = new Date(`${apt.appointmentDate} ${apt.startTime}`);
        return aptDate >= now && !['CANCELLED', 'NO_SHOW', 'COMPLETED'].includes(apt.status);
      });
    }

    if (filter === 'past') {
      return appointments.filter(apt => {
        const aptDate = new Date(`${apt.appointmentDate} ${apt.startTime}`);
        return aptDate < now || ['COMPLETED', 'NO_SHOW'].includes(apt.status);
      });
    }

    return appointments;
  };

  const handleCreateNote = (appointmentId: string) => {
    navigate(`/clients/${clientId}/notes/create?appointmentId=${appointmentId}`);
  };

  const filteredAppointments = filterAppointments();

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div>
          <p className="ml-4 text-gray-600">Loading appointments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <span className="mr-2">📅</span> Appointments
          </h2>
          <button
            onClick={() => navigate(`/appointments/new?clientId=${clientId}`)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold"
          >
            + New Appointment
          </button>
        </div>

        {/* Filter Buttons */}
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
              filter === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({appointments.length})
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
              filter === 'upcoming'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
              filter === 'past'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Past
          </button>
        </div>
      </div>

      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center text-gray-500">
            <p className="text-lg">No {filter !== 'all' ? filter : ''} appointments found</p>
            <button
              onClick={() => navigate(`/appointments/new?clientId=${clientId}`)}
              className="mt-4 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold"
            >
              Schedule First Appointment
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appointment) => (
            <div
              key={appointment.id}
              className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow duration-200 border-l-4 border-l-indigo-500"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="text-xl font-bold text-gray-800">
                      {new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(appointment.status)}`}>
                      {appointment.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-3 rounded-lg">
                      <p className="text-xs font-bold text-gray-600 mb-1">Time</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {appointment.startTime} - {appointment.endTime}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-3 rounded-lg">
                      <p className="text-xs font-bold text-gray-600 mb-1">Type</p>
                      <p className="text-sm font-semibold text-gray-900">{appointment.appointmentType}</p>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-3 rounded-lg">
                      <p className="text-xs font-bold text-gray-600 mb-1">Location</p>
                      <p className="text-sm font-semibold text-gray-900">{appointment.serviceLocation}</p>
                    </div>
                    {appointment.provider && (
                      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-3 rounded-lg">
                        <p className="text-xs font-bold text-gray-600 mb-1">Provider</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {appointment.provider.firstName} {appointment.provider.lastName}, {appointment.provider.title}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="ml-4 flex flex-col space-y-2">
                  {['SCHEDULED', 'CONFIRMED', 'IN_SESSION', 'COMPLETED', 'CHECKED_IN'].includes(appointment.status) && (
                    <button
                      onClick={() => handleCreateNote(appointment.id)}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold text-sm whitespace-nowrap"
                    >
                      📝 Create Note
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/appointments/${appointment.id}`)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 font-semibold text-sm"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
