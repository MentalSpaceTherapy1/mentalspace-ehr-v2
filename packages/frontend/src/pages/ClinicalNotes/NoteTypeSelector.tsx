import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Calendar, AlertCircle, X } from 'lucide-react';

// Note types that require appointments (Business Rule #1)
const APPOINTMENT_REQUIRED_NOTE_TYPES = [
  'Intake Assessment',
  'Progress Note',
  'Cancellation Note',
  'Consultation Note',
  'Contact Note',
];

const NOTE_TYPES = [
  {
    type: 'Intake Assessment',
    description: 'Comprehensive initial evaluation with full assessment',
    icon: '📋',
    color: 'from-purple-500 to-purple-600',
    borderColor: 'border-purple-300',
  },
  {
    type: 'Progress Note',
    description: 'Session-by-session documentation of treatment progress',
    icon: '📝',
    color: 'from-blue-500 to-blue-600',
    borderColor: 'border-blue-300',
  },
  {
    type: 'Treatment Plan',
    description: 'Formal treatment planning with goals and objectives',
    icon: '🎯',
    color: 'from-green-500 to-green-600',
    borderColor: 'border-green-300',
  },
  {
    type: 'Cancellation Note',
    description: 'Document session cancellations and rescheduling',
    icon: '❌',
    color: 'from-yellow-500 to-orange-500',
    borderColor: 'border-yellow-300',
  },
  {
    type: 'Consultation Note',
    description: 'Document consultations with other providers',
    icon: '👥',
    color: 'from-indigo-500 to-indigo-600',
    borderColor: 'border-indigo-300',
  },
  {
    type: 'Contact Note',
    description: 'Brief documentation of client contacts',
    icon: '📞',
    color: 'from-pink-500 to-pink-600',
    borderColor: 'border-pink-300',
  },
  {
    type: 'Termination Note',
    description: 'Discharge documentation and aftercare planning',
    icon: '🏁',
    color: 'from-red-500 to-red-600',
    borderColor: 'border-red-300',
  },
  {
    type: 'Miscellaneous Note',
    description: 'General documentation and administrative notes',
    icon: '📄',
    color: 'from-gray-500 to-gray-600',
    borderColor: 'border-gray-300',
  },
];

export default function NoteTypeSelector() {
  const { clientId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

  const appointmentId = searchParams.get('appointmentId');

  const handleSelectNoteType = (noteType: string) => {
    // Check if this note type requires an appointment
    const requiresAppointment = APPOINTMENT_REQUIRED_NOTE_TYPES.includes(noteType);

    if (requiresAppointment && !appointmentId) {
      setShowAppointmentModal(true);
      return;
    }

    const urlSafeType = noteType.toLowerCase().replace(/\s+/g, '-');
    const url = appointmentId
      ? `/clients/${clientId}/notes/new/${urlSafeType}?appointmentId=${appointmentId}`
      : `/clients/${clientId}/notes/new/${urlSafeType}`;
    navigate(url);
  };

  const handleGoToAppointmentSelector = () => {
    setShowAppointmentModal(false);
    navigate(`/clients/${clientId}/notes/select-appointment`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto">
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
            Select Note Type
          </h1>
          <p className="text-gray-600">Choose the type of clinical note you want to create</p>
        </div>

        {/* Note Type Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {NOTE_TYPES.map((noteType) => (
            <button
              key={noteType.type}
              onClick={() => handleSelectNoteType(noteType.type)}
              className={`bg-white rounded-2xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200 p-6 text-left border-2 ${noteType.borderColor} hover:border-opacity-100 border-opacity-50`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`text-5xl bg-gradient-to-r ${noteType.color} rounded-2xl p-3 shadow-md`}>
                  {noteType.icon}
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{noteType.type}</h3>
              <p className="text-sm text-gray-600">{noteType.description}</p>
            </button>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-8 space-y-4">
          {appointmentId && (
            <div className="bg-green-50 border-l-4 border-green-400 p-6 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">
                    <span className="font-semibold">Appointment Selected!</span> You can now create any note type for this appointment.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!appointmentId && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <span className="font-semibold">No Appointment Selected:</span> Most note types require an appointment.
                    Only Miscellaneous and Treatment Plan notes can be created without one.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <span className="font-semibold">Business Rules:</span> Progress Notes require a completed Intake Assessment.
                  Note types marked with 📅 require an appointment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Appointment Requirement Modal */}
      {showAppointmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white relative">
              <button
                onClick={() => setShowAppointmentModal(false)}
                className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="bg-white bg-opacity-20 rounded-full p-3">
                  <Calendar className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Appointment Required</h3>
                  <p className="text-purple-100 text-sm mt-1">Please select an appointment to continue</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="flex items-start space-x-3 mb-6">
                <div className="flex-shrink-0 mt-1">
                  <AlertCircle className="h-5 w-5 text-blue-500" />
                </div>
                <div className="text-gray-700">
                  <p className="font-medium mb-2">This note type requires an appointment.</p>
                  <p className="text-sm text-gray-600">
                    Most clinical notes (Intake Assessment, Progress Note, Cancellation, Consultation, and Contact notes)
                    must be linked to a scheduled appointment for proper documentation and billing.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col space-y-3">
                <button
                  onClick={handleGoToAppointmentSelector}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                >
                  <Calendar className="h-5 w-5" />
                  <span>Select Appointment</span>
                </button>
                <button
                  onClick={() => setShowAppointmentModal(false)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
