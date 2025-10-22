import { Calendar, Clock, MapPin, Video, Building2 } from 'lucide-react';

interface AppointmentBadgeProps {
  appointment: {
    id: string;
    appointmentDate: string | Date;
    startTime: string;
    endTime: string;
    appointmentType: string;
    serviceLocation: string;
    duration?: number;
  };
  showDetails?: boolean;
  className?: string;
}

export default function AppointmentBadge({
  appointment,
  showDetails = true,
  className = '',
}: AppointmentBadgeProps) {
  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getLocationIcon = () => {
    switch (appointment.serviceLocation) {
      case 'TELEHEALTH':
        return <Video className="w-4 h-4" />;
      case 'IN_OFFICE':
        return <Building2 className="w-4 h-4" />;
      case 'HOME_VISIT':
        return <MapPin className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  const getLocationColor = () => {
    switch (appointment.serviceLocation) {
      case 'TELEHEALTH':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'IN_OFFICE':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'HOME_VISIT':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTypeColor = () => {
    switch (appointment.appointmentType) {
      case 'THERAPY':
        return 'bg-purple-100 text-purple-800';
      case 'INTAKE':
        return 'bg-blue-100 text-blue-800';
      case 'CONSULTATION':
        return 'bg-indigo-100 text-indigo-800';
      case 'FOLLOW_UP':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!showDetails) {
    // Compact version - just a badge
    return (
      <div className={`inline-flex items-center space-x-2 ${className}`}>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
          <Calendar className="w-3 h-3 mr-1" />
          {formatDate(appointment.appointmentDate)}
        </span>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
          <Clock className="w-3 h-3 mr-1" />
          {formatTime(appointment.startTime)}
        </span>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getLocationColor()}`}>
          {getLocationIcon()}
          <span className="ml-1">{appointment.serviceLocation.replace(/_/g, ' ')}</span>
        </span>
      </div>
    );
  }

  // Full version - detailed card
  return (
    <div className={`bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="bg-purple-600 rounded-full p-2">
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <h4 className="text-sm font-bold text-gray-800">Appointment Details</h4>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getTypeColor()}`}>
          {appointment.appointmentType}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="flex items-center space-x-2 text-gray-700">
          <Calendar className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <div>
            <span className="font-semibold">Date:</span>
            <span className="ml-1">{formatDate(appointment.appointmentDate)}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-gray-700">
          <Clock className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <div>
            <span className="font-semibold">Time:</span>
            <span className="ml-1">
              {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
            </span>
            {appointment.duration && (
              <span className="ml-1 text-xs text-gray-500">({appointment.duration} min)</span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 text-gray-700">
          {getLocationIcon()}
          <div>
            <span className="font-semibold">Location:</span>
            <span className="ml-1">{appointment.serviceLocation.replace(/_/g, ' ')}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-gray-700">
          <div className="w-4 h-4 flex items-center justify-center text-purple-600 font-bold">
            ID
          </div>
          <div>
            <span className="font-semibold">Appt ID:</span>
            <span className="ml-1 text-xs font-mono">{appointment.id.substring(0, 8)}...</span>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-purple-200">
        <p className="text-xs text-gray-600 italic">
          ✓ This note is linked to the appointment above
        </p>
      </div>
    </div>
  );
}
