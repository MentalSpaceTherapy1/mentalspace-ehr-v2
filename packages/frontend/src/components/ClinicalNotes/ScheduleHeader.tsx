import { useState } from 'react';
import { Calendar, Clock, MapPin, Users, Edit2, User, Cake, FileText } from 'lucide-react';

interface ScheduleHeaderProps {
  appointmentDate: Date | string;
  startTime: string;
  endTime: string;
  duration: number;
  serviceCode?: string;
  location?: string;
  participants?: string;
  clientName?: string;
  clientDOB?: Date | string;
  sessionType?: string;
  diagnoses?: string[]; // For Progress Note and Treatment Plan
  onEdit?: () => void;
  editable?: boolean;
}

export default function ScheduleHeader({
  appointmentDate,
  startTime,
  endTime,
  duration,
  serviceCode,
  location,
  participants,
  clientName,
  clientDOB,
  sessionType,
  diagnoses,
  onEdit,
  editable = false,
}: ScheduleHeaderProps) {
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDOB = (value: Date | string) => {
    // Treat DOB as date-only to avoid timezone shifting
    const iso = typeof value === 'string' ? value : value.toISOString();
    const [year, month, day] = iso.split('T')[0].split('-');
    return `${month}/${day}/${year}`;
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-6 mb-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-4">
            <div className="bg-purple-600 rounded-full p-2">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Session Information</h3>
          </div>

          {/* Patient Information - First Row */}
          {(clientName || clientDOB) && (
            <div className="mb-4 pb-4 border-b border-purple-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {clientName && (
                  <div className="flex items-center space-x-2 text-gray-700">
                    <User className="h-4 w-4 text-purple-600" />
                    <span className="font-semibold">Patient:</span>
                    <span className="font-medium">{clientName}</span>
                  </div>
                )}
                {clientDOB && (
                  <div className="flex items-center space-x-2 text-gray-700">
                    <Cake className="h-4 w-4 text-purple-600" />
                    <span className="font-semibold">DOB:</span>
                    <span>{formatDOB(clientDOB)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date & Time */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-gray-700">
                <Calendar className="h-4 w-4 text-purple-600" />
                <span className="font-semibold">Date:</span>
                <span>{formatDate(appointmentDate)}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-700">
                <Clock className="h-4 w-4 text-purple-600" />
                <span className="font-semibold">Time:</span>
                <span>
                  {formatTime(startTime)} - {formatTime(endTime)}
                </span>
                <span className="text-sm text-gray-500">({duration} min)</span>
              </div>
              {sessionType && (
                <div className="flex items-center space-x-2 text-gray-700">
                  <FileText className="h-4 w-4 text-purple-600" />
                  <span className="font-semibold">Type:</span>
                  <span>{sessionType}</span>
                </div>
              )}
            </div>

            {/* Service & Location */}
            <div className="space-y-2">
              {serviceCode && (
                <div className="flex items-center space-x-2 text-gray-700">
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {serviceCode}
                  </div>
                  <span className="text-sm text-gray-600">CPT Code</span>
                </div>
              )}
              {location && (
                <div className="flex items-center space-x-2 text-gray-700">
                  <MapPin className="h-4 w-4 text-purple-600" />
                  <span className="font-semibold">Location:</span>
                  <span className="text-sm">{location}</span>
                </div>
              )}
              {participants && (
                <div className="flex items-center space-x-2 text-gray-700">
                  <Users className="h-4 w-4 text-purple-600" />
                  <span className="font-semibold">Participants:</span>
                  <span className="text-sm">{participants}</span>
                </div>
              )}
            </div>
          </div>

          {/* Diagnoses Section (for Progress Note and Treatment Plan) */}
          {diagnoses && diagnoses.length > 0 && (
            <div className="mt-4 pt-4 border-t border-purple-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Active Diagnoses (from Intake Assessment):
              </h4>
              <div className="flex flex-wrap gap-2">
                {diagnoses.map((code, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Edit Button */}
        {editable && onEdit && (
          <button
            onClick={onEdit}
            className="ml-4 flex items-center space-x-2 px-4 py-2 bg-white border-2 border-purple-600 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors font-medium text-sm"
          >
            <Edit2 className="h-4 w-4" />
            <span>Edit</span>
          </button>
        )}
      </div>

      {/* Warning if post-creation edit */}
      {editable && (
        <div className="mt-4 pt-4 border-t border-purple-200">
          <p className="text-xs text-gray-600 italic">
            Note: Changes to appointment details will be logged in the audit trail
          </p>
        </div>
      )}
    </div>
  );
}
