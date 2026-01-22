import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Calendar, ArrowLeft, CheckCircle, Search, Filter } from 'lucide-react';
import api from '../../lib/api';

// Import all form components
import IntakeAssessmentForm from './Forms/IntakeAssessmentForm';
import ProgressNoteForm from './Forms/ProgressNoteForm';
import TreatmentPlanForm from './Forms/TreatmentPlanForm';
import CancellationNoteForm from './Forms/CancellationNoteForm';
import ConsultationNoteForm from './Forms/ConsultationNoteForm';
import ContactNoteForm from './Forms/ContactNoteForm';
import TerminationNoteForm from './Forms/TerminationNoteForm';
import MiscellaneousNoteForm from './Forms/MiscellaneousNoteForm';
import GroupTherapyNoteForm from './Forms/GroupTherapyNoteForm';

// Import appointment quick create modal
import AppointmentQuickCreate from '../../components/ClinicalNotes/AppointmentQuickCreate';

// Note types that require appointments
// Required: Intake Assessment, Progress Note, Consultation Note, Group Therapy Note
// NOT Required: Treatment Plan, Cancellation Note, Contact Note, Termination Note, Miscellaneous Note
const APPOINTMENT_REQUIRED_NOTE_TYPES = [
  'intake-assessment',
  'progress-note',
  'consultation-note',
  'group-therapy',
];

const NOTE_TYPES = [
  {
    type: 'intake-assessment',
    displayName: 'Intake Assessment',
    description: 'Comprehensive initial evaluation with full assessment',
    icon: '📋',
    color: 'from-purple-500 to-purple-600',
    borderColor: 'border-purple-300',
  },
  {
    type: 'progress-note',
    displayName: 'Progress Note',
    description: 'Session-by-session documentation of treatment progress',
    icon: '📝',
    color: 'from-blue-500 to-blue-600',
    borderColor: 'border-blue-300',
  },
  {
    type: 'treatment-plan',
    displayName: 'Treatment Plan',
    description: 'Formal treatment planning with goals and objectives',
    icon: '🎯',
    color: 'from-green-500 to-green-600',
    borderColor: 'border-green-300',
  },
  {
    type: 'cancellation-note',
    displayName: 'Cancellation Note',
    description: 'Document session cancellations and rescheduling',
    icon: '❌',
    color: 'from-yellow-500 to-orange-500',
    borderColor: 'border-yellow-300',
  },
  {
    type: 'consultation-note',
    displayName: 'Consultation Note',
    description: 'Document consultations with other providers',
    icon: '👥',
    color: 'from-indigo-500 to-indigo-600',
    borderColor: 'border-indigo-300',
  },
  {
    type: 'contact-note',
    displayName: 'Contact Note',
    description: 'Brief documentation of client contacts',
    icon: '📞',
    color: 'from-pink-500 to-pink-600',
    borderColor: 'border-pink-300',
  },
  {
    type: 'termination-note',
    displayName: 'Termination Note',
    description: 'Discharge documentation and aftercare planning',
    icon: '🏁',
    color: 'from-red-500 to-red-600',
    borderColor: 'border-red-300',
  },
  {
    type: 'miscellaneous-note',
    displayName: 'Miscellaneous Note',
    description: 'General documentation and administrative notes',
    icon: '📄',
    color: 'from-gray-500 to-gray-600',
    borderColor: 'border-gray-300',
  },
  {
    type: 'group-therapy',
    displayName: 'Group Therapy Note',
    description: 'Document group therapy sessions with attendance tracking',
    icon: '👥',
    color: 'from-teal-500 to-cyan-600',
    borderColor: 'border-teal-300',
  },
];

interface Appointment {
  id: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  appointmentType: string;
  status: string;
  serviceLocation: string;
  isGroupAppointment?: boolean;
}

export default function SmartNoteCreator() {
  const { clientId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // State management
  const [step, setStep] = useState<'note-type' | 'appointment' | 'form'>('note-type');
  const [selectedNoteType, setSelectedNoteType] = useState<string>('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [showQuickCreateModal, setShowQuickCreateModal] = useState(false);

  // Search/filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Check if note type and appointment were provided in URL
  useEffect(() => {
    const noteTypeParam = searchParams.get('noteType');
    const appointmentIdParam = searchParams.get('appointmentId');
    const allowDraftParam = searchParams.get('allowDraft');

    // If appointment is provided, preselect it and check if it's a group appointment
    if (appointmentIdParam) {
      setSelectedAppointmentId(appointmentIdParam);

      // Fetch appointment details to check if it's a group appointment
      api.get(`/appointments/${appointmentIdParam}`)
        .then((response) => {
          const appointment = response.data.data;

          // Auto-detect group appointments and suggest Group Therapy Note
          if (appointment.isGroupAppointment && !noteTypeParam) {
            setSelectedNoteType('group-therapy');
            setStep('form');
          }
        })
        .catch((err) => {
          console.error('Failed to fetch appointment details:', err);
        });
    }

    if (noteTypeParam) {
      setSelectedNoteType(noteTypeParam);

      if (appointmentIdParam) {
        setStep('form');
      } else if (APPOINTMENT_REQUIRED_NOTE_TYPES.includes(noteTypeParam) && allowDraftParam !== 'true') {
        // Only require appointment if not in draft mode
        setStep('appointment');
        fetchAppointments();
      } else {
        setStep('form');
      }
    }
  }, [searchParams]);

  const fetchAppointments = async () => {
    try {
      setLoadingAppointments(true);
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
      setFilteredAppointments(validAppointments); // Initialize filtered list
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoadingAppointments(false);
    }
  };

  // Filter appointments based on search query and filters
  useEffect(() => {
    let filtered = [...appointments];

    // Apply search query
    if (searchQuery) {
      filtered = filtered.filter((apt) => {
        const searchLower = searchQuery.toLowerCase();
        const dateStr = new Date(apt.appointmentDate).toLocaleDateString().toLowerCase();
        const typeStr = apt.appointmentType.toLowerCase();
        const locationStr = apt.serviceLocation.toLowerCase();

        return (
          dateStr.includes(searchLower) ||
          typeStr.includes(searchLower) ||
          locationStr.includes(searchLower) ||
          apt.startTime.includes(searchQuery) ||
          apt.endTime.includes(searchQuery)
        );
      });
    }

    // Apply location filter
    if (filterLocation !== 'ALL') {
      filtered = filtered.filter((apt) => apt.serviceLocation === filterLocation);
    }

    // Apply type filter
    if (filterType !== 'ALL') {
      filtered = filtered.filter((apt) => apt.appointmentType === filterType);
    }

    setFilteredAppointments(filtered);
  }, [searchQuery, filterLocation, filterType, appointments]);

  const handleSelectNoteType = (noteType: string) => {
    setSelectedNoteType(noteType);

    // If appointment is already preselected (from URL), skip to form
    if (selectedAppointmentId) {
      setStep('form');
    }
    // Check if this note type requires an appointment
    else if (APPOINTMENT_REQUIRED_NOTE_TYPES.includes(noteType)) {
      setStep('appointment');
      fetchAppointments();
    } else {
      setStep('form');
    }
  };

  const handleSelectAppointment = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);

    // Check if this is a group appointment and auto-suggest Group Therapy Note
    const appointment = appointments.find(apt => apt.id === appointmentId);
    if (appointment?.isGroupAppointment && !selectedNoteType) {
      setSelectedNoteType('group-therapy');
    }

    setStep('form');
  };

  const handleQuickCreateSuccess = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setShowQuickCreateModal(false);
    // Refresh appointments list
    fetchAppointments();
    // Move to form
    setStep('form');
  };

  const handleBack = () => {
    if (step === 'form') {
      if (APPOINTMENT_REQUIRED_NOTE_TYPES.includes(selectedNoteType)) {
        setStep('appointment');
      } else {
        setStep('note-type');
        setSelectedNoteType('');
      }
    } else if (step === 'appointment') {
      setStep('note-type');
      setSelectedNoteType('');
    }
  };

  // Timezone-safe date formatting - parses ISO string directly to avoid timezone shifts
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not specified';
    const datePart = dateString.split('T')[0];
    if (!datePart) return 'Not specified';
    const [year, month, day] = datePart.split('-');
    if (!year || !month || !day) return 'Not specified';
    // Create date using local timezone to get correct weekday
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${weekdayNames[date.getDay()]}, ${monthNames[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
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

  // Render the appropriate form component
  const renderForm = () => {
    const formKey = `${selectedNoteType}-${selectedAppointmentId || 'new'}`;

    switch (selectedNoteType) {
      case 'intake-assessment':
        return <IntakeAssessmentForm key={formKey} />;
      case 'progress-note':
        return <ProgressNoteForm key={formKey} />;
      case 'treatment-plan':
        return <TreatmentPlanForm key={formKey} />;
      case 'cancellation-note':
        return <CancellationNoteForm key={formKey} />;
      case 'consultation-note':
        return <ConsultationNoteForm key={formKey} />;
      case 'contact-note':
        return <ContactNoteForm key={formKey} />;
      case 'termination-note':
        return <TerminationNoteForm key={formKey} />;
      case 'miscellaneous-note':
        return <MiscellaneousNoteForm key={formKey} />;
      case 'group-therapy':
        return <GroupTherapyNoteForm key={formKey} />;
      default:
        return null;
    }
  };

  // If we're at the form step, just render the form
  if (step === 'form') {
    return renderForm();
  }

  // Otherwise render the wizard UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Progress */}
        <div className="mb-8">
          <button
            onClick={() => step === 'note-type' ? navigate(`/clients/${clientId}`) : handleBack()}
            className="flex items-center text-purple-600 hover:text-purple-800 mb-4 font-semibold transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {step === 'note-type' ? 'Back to Client' : 'Back'}
          </button>

          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Create Clinical Note
          </h1>

          {/* Progress Steps */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                step === 'note-type' ? 'bg-purple-600 text-white' : 'bg-green-500 text-white'
              }`}>
                {step === 'note-type' ? '1' : <CheckCircle className="w-5 h-5" />}
              </div>
              <span className="ml-2 font-semibold text-gray-700">Note Type</span>
            </div>

            {APPOINTMENT_REQUIRED_NOTE_TYPES.includes(selectedNoteType) && (
              <>
                <div className="h-1 w-12 bg-gray-300"></div>
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    step === 'appointment' ? 'bg-purple-600 text-white' :
                    (step as string) === 'form' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {(step as string) === 'form' ? <CheckCircle className="w-5 h-5" /> : '2'}
                  </div>
                  <span className="ml-2 font-semibold text-gray-700">Appointment</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Step 1: Note Type Selection */}
        {step === 'note-type' && (
          <>
            <p className="text-gray-600 mb-6">Choose the type of clinical note you want to create</p>

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
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{noteType.displayName}</h3>
                  <p className="text-sm text-gray-600">{noteType.description}</p>
                </button>
              ))}
            </div>

            <div className="mt-8 bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <span className="font-semibold">Note:</span> Most note types require an appointment. You'll be asked to select one in the next step.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Step 2: Appointment Selection */}
        {step === 'appointment' && (
          <>
            <p className="text-gray-600 mb-6">Select the appointment for this clinical note</p>

            {loadingAppointments ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                <p className="mt-4 text-gray-600">Loading appointments...</p>
              </div>
            ) : appointments.length === 0 ? (
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
                      This client doesn't have any appointments in a valid status.
                    </p>
                    <button
                      onClick={() => {
                        if (clientId) {
                          setShowQuickCreateModal(true);
                        } else {
                          navigate('/appointments/new');
                        }
                      }}
                      className="mt-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      Create New Appointment
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Search and Filter Controls */}
                <div className="mb-6 space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search by date, time, type, or location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {/* Filters */}
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 text-gray-700">
                      <Filter className="w-4 h-4" />
                      <span className="font-semibold text-sm">Filters:</span>
                    </div>

                    <select
                      value={filterLocation}
                      onChange={(e) => setFilterLocation(e.target.value)}
                      className="px-4 py-2 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    >
                      <option value="ALL">All Locations</option>
                      <option value="IN_OFFICE">In Office</option>
                      <option value="TELEHEALTH">Telehealth</option>
                      <option value="HOME_VISIT">Home Visit</option>
                    </select>

                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="px-4 py-2 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    >
                      <option value="ALL">All Types</option>
                      <option value="THERAPY">Therapy</option>
                      <option value="INTAKE">Intake</option>
                      <option value="CONSULTATION">Consultation</option>
                      <option value="FOLLOW_UP">Follow-up</option>
                      <option value="GROUP_THERAPY">Group Therapy</option>
                      <option value="FAMILY_THERAPY">Family Therapy</option>
                    </select>

                    {(searchQuery || filterLocation !== 'ALL' || filterType !== 'ALL') && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setFilterLocation('ALL');
                          setFilterType('ALL');
                        }}
                        className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>

                  {/* Results Count */}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>
                      Showing {filteredAppointments.length} of {appointments.length} appointments
                    </span>
                    {filteredAppointments.length === 0 && appointments.length > 0 && (
                      <span className="text-orange-600 font-medium">
                        No appointments match your filters
                      </span>
                    )}
                  </div>
                </div>

                {/* Appointments List */}
                <div className="space-y-4">
                  {filteredAppointments.map((appointment) => (
                  <button
                    key={appointment.id}
                    onClick={() => handleSelectAppointment(appointment.id)}
                    className="w-full bg-white rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-200 p-6 text-left border-2 border-purple-200 hover:border-purple-400"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`bg-gradient-to-r ${appointment.isGroupAppointment ? 'from-teal-500 to-cyan-600' : 'from-purple-500 to-blue-500'} rounded-full p-3 text-white text-2xl`}>
                          {appointment.isGroupAppointment ? '👥' : '📅'}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-bold text-gray-800">{formatDate(appointment.appointmentDate)}</h3>
                            {appointment.isGroupAppointment && (
                              <span className="px-2 py-1 bg-teal-100 text-teal-800 text-xs font-bold rounded-full border border-teal-300">
                                GROUP
                              </span>
                            )}
                          </div>
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
                    {appointment.isGroupAppointment && (
                      <div className="mt-3 pt-3 border-t border-teal-200">
                        <p className="text-sm text-teal-700 font-medium">
                          💡 Group Therapy Note will be suggested for this appointment
                        </p>
                      </div>
                    )}
                  </button>
                ))}

                  {/* Continue without Appointment (Save as Draft) Button */}
                  {APPOINTMENT_REQUIRED_NOTE_TYPES.includes(selectedNoteType) && (
                    <div className="mt-6 pt-6 border-t-2 border-gray-300">
                      <button
                        onClick={() => {
                          // Navigate to form with allowDraft parameter to skip appointment requirement
                          const noteTypeMap: Record<string, string> = {
                            'intake-assessment': 'intake-assessment',
                            'progress-note': 'progress-note',
                            'cancellation-note': 'cancellation-note',
                            'consultation-note': 'consultation-note',
                            'contact-note': 'contact-note',
                            'group-therapy': 'group-therapy',
                          };
                          const routePath = noteTypeMap[selectedNoteType];
                          if (routePath && clientId) {
                            navigate(`/clients/${clientId}/notes/new/${routePath}?allowDraft=true`);
                          } else {
                            // Fallback: set state and go to form
                            setSelectedAppointmentId('');
                            setStep('form');
                          }
                        }}
                        className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center space-x-3"
                      >
                        <span className="text-2xl">📝</span>
                        <div className="text-left">
                          <div className="text-lg font-bold">Continue without Appointment (Save as Draft)</div>
                          <div className="text-sm opacity-90">Create a draft note without selecting an appointment</div>
                        </div>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      if (clientId) {
                        setShowQuickCreateModal(true);
                      } else {
                        navigate('/appointments/new');
                      }
                    }}
                    className="w-full bg-gradient-to-r from-purple-100 to-blue-100 hover:from-purple-200 hover:to-blue-200 rounded-xl shadow-md p-6 text-left border-2 border-purple-300 hover:border-purple-400 transition-all duration-200 transform hover:scale-[1.01] mt-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-full p-3 text-white text-2xl">
                          ➕
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-800">Create New Appointment</h3>
                          <p className="text-sm text-gray-600">
                            {clientId ? 'Quick inline appointment creation' : 'Navigate to appointments page'}
                          </p>
                        </div>
                      </div>
                      <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* Quick Create Modal */}
        {showQuickCreateModal && clientId && (
          <AppointmentQuickCreate
            clientId={clientId}
            onSuccess={handleQuickCreateSuccess}
            onCancel={() => setShowQuickCreateModal(false)}
          />
        )}
      </div>
    </div>
  );
}
