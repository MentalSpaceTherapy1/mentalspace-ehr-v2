import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Calendar, Clock, MapPin, Users, CheckCircle } from 'lucide-react';

interface EligibleAppointment {
  id: string;
  appointmentDate: Date;
  startTime: string;
  endTime: string;
  duration: number;
  serviceCode: string;
  location: string;
  status: string;
  appointmentType: string;
  hasNote: boolean;
}

interface AppointmentPickerProps {
  clientId: string;
  noteType: string;
  onSelect: (appointmentId: string) => void;
  onCreateNew: () => void;
}

export default function AppointmentPicker({
  clientId,
  noteType,
  onSelect,
  onCreateNew,
}: AppointmentPickerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Fetch eligible appointments
  const { data, isLoading, error } = useQuery({
    queryKey: ['eligible-appointments', clientId, noteType],
    queryFn: async () => {
      const response = await api.get(
        `/clinical-notes/client/${clientId}/eligible-appointments/${encodeURIComponent(noteType)}`
      );
      return response.data.data;
    },
  });

  const appointments: EligibleAppointment[] = data?.appointments || [];
  const hasEligible = appointments.length > 0;

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleSelect = (appointmentId: string) => {
    setSelectedId(appointmentId);
    onSelect(appointmentId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        <p className="font-semibold">Error loading appointments</p>
        <p className="text-sm mt-1">Please try again or contact support.</p>
      </div>
    );
  }

  if (!hasEligible) {
    return (
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-8 text-center">
        <Calendar className="mx-auto h-16 w-16 text-blue-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Eligible Appointments
        </h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          There are no current or past appointments for this client that match{' '}
          <span className="font-semibold">{noteType}</span> and do not already have a note.
        </p>
        <button
          onClick={onCreateNew}
          className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-colors inline-flex items-center space-x-2"
        >
          <Calendar className="h-5 w-5" />
          <span>Create Appointment for {noteType}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Select an Appointment
        </h3>
        <button
          onClick={onCreateNew}
          className="text-purple-600 hover:text-purple-700 font-medium text-sm inline-flex items-center space-x-1"
        >
          <Calendar className="h-4 w-4" />
          <span>Create New Appointment</span>
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {appointments.map((apt) => (
          <button
            key={apt.id}
            onClick={() => handleSelect(apt.id)}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
              selectedId === apt.id
                ? 'border-purple-600 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300 bg-white'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Date & Time */}
                <div className="flex items-center space-x-3 mb-2">
                  <div className="flex items-center space-x-2 text-gray-900 font-semibold">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(apt.appointmentDate)}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-700">
                    <Clock className="h-4 w-4" />
                    <span>
                      {formatTime(apt.startTime)} - {formatTime(apt.endTime)}
                    </span>
                  </div>
                </div>

                {/* Service Code & Type */}
                <div className="flex items-center space-x-4 mb-2">
                  {apt.serviceCode && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {apt.serviceCode}
                    </span>
                  )}
                  {apt.appointmentType && (
                    <span className="text-sm text-gray-600">{apt.appointmentType}</span>
                  )}
                  <span
                    className={`text-xs font-medium ${
                      apt.status === 'Completed' ? 'text-green-600' : 'text-orange-600'
                    }`}
                  >
                    {apt.status}
                  </span>
                </div>

                {/* Location */}
                {apt.location && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{apt.location}</span>
                  </div>
                )}
              </div>

              {/* Selection Indicator */}
              {selectedId === apt.id && (
                <CheckCircle className="h-6 w-6 text-purple-600 flex-shrink-0" />
              )}
            </div>

            {/* Note Status */}
            {apt.hasNote && (
              <div className="mt-2 text-xs text-orange-600 font-medium">
                ⚠ Note already exists for this appointment
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t">
        <p className="text-sm text-gray-500 text-center">
          Showing {appointments.length} eligible appointment{appointments.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
