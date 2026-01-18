import { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Users, Save } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

interface CreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  noteType: string;
  defaultConfig: {
    appointmentType: string;
    serviceCode: string;
    duration: number;
  };
  onAppointmentCreated: (appointmentId: string) => void;
}

export default function CreateAppointmentModal({
  isOpen,
  onClose,
  clientId,
  noteType,
  defaultConfig,
  onAppointmentCreated,
}: CreateAppointmentModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get today's date and current time in correct formats
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`; // HH:mm
  };

  // Form state
  const [appointmentDate, setAppointmentDate] = useState(getTodayDate());
  const [startTime, setStartTime] = useState(getCurrentTime());
  const [endTime, setEndTime] = useState('');
  const [duration, setDuration] = useState(defaultConfig.duration);
  const [appointmentType, setAppointmentType] = useState(defaultConfig.appointmentType);
  const [serviceCode, setServiceCode] = useState(defaultConfig.serviceCode);
  const [location, setLocation] = useState('Office');
  const [participants, setParticipants] = useState('Client Only');

  // Auto-calculate end time when start time or duration changes
  useEffect(() => {
    if (startTime && duration) {
      const [hours, minutes] = startTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + duration;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      setEndTime(`${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`);
    }
  }, [startTime, duration]);

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/appointments', data);
    },
    onSuccess: (response) => {
      const appointmentId = response.data.data.id;
      toast.success('Appointment created successfully');
      queryClient.invalidateQueries({ queryKey: ['appointments', clientId] });
      onAppointmentCreated(appointmentId);
      onClose();
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create appointment';
      toast.error(errorMessage);
      console.error('Create appointment error:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!appointmentDate || !startTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!user?.id) {
      toast.error('Unable to determine current clinician. Please refresh and try again.');
      return;
    }

    const appointmentData = {
      clientId,
      clinicianId: user.id,
      appointmentDate: new Date(appointmentDate).toISOString(),
      startTime,
      endTime,
      duration,
      appointmentType,
      cptCode: serviceCode, // Map frontend serviceCode to backend cptCode
      serviceLocation: location, // Map frontend location to backend serviceLocation
      appointmentNotes: participants, // Store participants info in notes
      status: 'Scheduled',
    };

    createAppointmentMutation.mutate(appointmentData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 flex items-center justify-between rounded-t-lg">
          <div>
            <h2 className="text-2xl font-bold">Create Appointment</h2>
            <p className="text-purple-100 text-sm mt-1">for {noteType}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Date & Time Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <span>Date & Time</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Appointment Date *
                </label>
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  min={getTodayDate()}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Format: YYYY-MM-DD (e.g., 2025-11-20)</p>
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time *
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  step="900"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Format: HH:MM (24-hour, e.g., 14:30)</p>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                  <option value={120}>120 minutes</option>
                </select>
              </div>

              {/* End Time (Auto-calculated) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time (auto)
                </label>
                <input
                  type="time"
                  value={endTime}
                  readOnly
                  className="w-full px-4 py-2 border-2 border-gray-200 bg-gray-50 rounded-lg text-gray-600"
                />
              </div>
            </div>
          </div>

          {/* Appointment Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Appointment Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Appointment Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Appointment Type
                </label>
                <select
                  value={appointmentType}
                  onChange={(e) => setAppointmentType(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="Intake">Intake</option>
                  <option value="Individual Therapy">Individual Therapy</option>
                  <option value="Family Therapy">Family Therapy</option>
                  <option value="Couples Therapy">Couples Therapy</option>
                  <option value="Group Therapy">Group Therapy</option>
                  <option value="Treatment Planning">Treatment Planning</option>
                  <option value="Consultation">Consultation</option>
                  <option value="Phone Contact">Phone Contact</option>
                  <option value="Administrative">Administrative</option>
                </select>
              </div>

              {/* Service Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Code (CPT)
                </label>
                <input
                  type="text"
                  value={serviceCode}
                  onChange={(e) => setServiceCode(e.target.value)}
                  placeholder="e.g., 90791, 90834"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Location
                </label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="Office">Office</option>
                  <option value="HIPAA-Compliant Telehealth">HIPAA-Compliant Telehealth</option>
                  <option value="Client Home">Client Home</option>
                  <option value="School">School</option>
                  <option value="Community">Community</option>
                </select>
              </div>

              {/* Participants */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users className="h-4 w-4 inline mr-1" />
                  Participants
                </label>
                <select
                  value={participants}
                  onChange={(e) => setParticipants(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="Client Only">Client Only</option>
                  <option value="Client + Family">Client + Family</option>
                  <option value="Couple">Couple</option>
                  <option value="Group">Group</option>
                  <option value="Collateral">Collateral Contact</option>
                </select>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> After creating this appointment, the {noteType} form will open
              automatically with the session information pre-filled.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createAppointmentMutation.isPending}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
            >
              {createAppointmentMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Create & Continue to Note</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
