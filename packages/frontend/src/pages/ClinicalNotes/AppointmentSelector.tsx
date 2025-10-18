import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';

interface Appointment {
  id: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  appointmentType: string;
  status: string;
  serviceLocation: string;
}

export default function AppointmentSelector() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, [clientId]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/appointments/client/${clientId}`);

      // Filter to only valid statuses for note creation
      const validAppointments = response.data.data.filter((apt: Appointment) =>
        ['SCHEDULED', 'CONFIRMED', 'IN_SESSION', 'COMPLETED', 'CHECKED_IN'].includes(apt.status)
      );

      // Sort by date descending (most recent first)
      validAppointments.sort((a: Appointment, b: Appointment) =>
        new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()
      );

      setAppointments(validAppointments);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAppointment = (appointmentId: string) => {
    // Navigate to note type selector with appointment ID
    navigate(`/clients/${clientId}/notes/new?appointmentId=${appointmentId}`);
  };

  const handleCreateWithoutAppointment = () => {
    // For note types that don't require appointments (like Miscellaneous)
    navigate(`/clients/${clientId}/notes/new`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      SCHEDULED: 'bg-blue-100 text-blue-800 border-blue-300',
      CONFIRMED: 'bg-green-100 text-green-800 border-green-300',
      IN_SESSION: 'bg-purple-100 text-purple-800 border-purple-300',
      COMPLETED: 'bg-gray-100 text-gray-800 border-gray-300',
      CHECKED_IN: 'bg-indigo-100 text-indigo-800 border-indigo-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/clients/${clientId}`)}
            className="flex items-center text-purple-600 hover:text-purple-800 mb-4 font-semibold transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Client
          </button>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Select Appointment
          </h1>
          <p className="text-gray-600">Choose the appointment for this clinical note</p>
        </div>

        {/* Business Rule Info Box */}
        <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-blue-800 mb-1">Business Rule #1: Appointment Requirement</h3>
              <p className="text-sm text-blue-700">
                Most note types (Intake, Progress, SOAP, Cancellation, Consultation, Contact) require an appointment.
                Select the appointment below to continue creating your note.
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            <p className="mt-4 text-gray-600">Loading appointments...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-lg mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* No Appointments */}
        {!loading && appointments.length === 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-semibold text-yellow-800 mb-1">No Valid Appointments Found</h3>
                <p className="text-sm text-yellow-700 mb-3">
                  This client doesn't have any appointments in a valid status (Scheduled, Confirmed, In Session, Completed, or Checked In).
                </p>
                <p className="text-sm text-yellow-700">
                  Please create an appointment first, or select "Create Note Without Appointment" for note types that don't require one.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Appointments List */}
        {!loading && appointments.length > 0 && (
          <div className="space-y-4 mb-6">
            {appointments.map((appointment) => (
              <button
                key={appointment.id}
                onClick={() => handleSelectAppointment(appointment.id)}
                className="w-full bg-white rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-200 p-6 text-left border-2 border-purple-200 hover:border-purple-400"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-full p-3 text-white text-2xl">
                      📅
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{formatDate(appointment.appointmentDate)}</h3>
                      <p className="text-sm text-gray-600">{appointment.startTime} - {appointment.endTime}</p>
                    </div>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-xs font-bold border-2 ${getStatusColor(appointment.status)}`}>
                    {appointment.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 font-semibold">Type:</span>
                    <p className="text-gray-800">{appointment.appointmentType}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-semibold">Location:</span>
                    <p className="text-gray-800">{appointment.serviceLocation}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Create Without Appointment Option */}
        <button
          onClick={handleCreateWithoutAppointment}
          className="w-full bg-gray-100 hover:bg-gray-200 rounded-xl shadow-md p-6 text-left border-2 border-gray-300 hover:border-gray-400 transition-all duration-200"
        >
          <div className="flex items-center space-x-3">
            <div className="bg-gray-400 rounded-full p-3 text-white text-2xl">
              📄
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Create Note Without Appointment</h3>
              <p className="text-sm text-gray-600">
                For note types that don't require an appointment (e.g., Miscellaneous Notes)
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
