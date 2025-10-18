import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface AppointmentType {
  value: string;
  label: string;
  duration: number;
}

interface Schedule {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface BookedSlot {
  appointmentDate: string;
  startTime: string;
  endTime: string;
}

interface RequestedAppointment {
  id: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  appointmentType: string;
  status: string;
  clinician: {
    firstName: string;
    lastName: string;
  };
}

export default function PortalAppointmentRequest() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [selectedType, setSelectedType] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requestedAppointments, setRequestedAppointments] = useState<RequestedAppointment[]>([]);
  const [showRequestedList, setShowRequestedList] = useState(false);

  useEffect(() => {
    fetchAppointmentTypes();
    fetchRequestedAppointments();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDate]);

  const fetchAppointmentTypes = async () => {
    try {
      const token = localStorage.getItem('portalToken');
      const response = await axios.get('/portal/appointments/types', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setAppointmentTypes(response.data.data);
        if (response.data.data.length > 0) {
          setSelectedType(response.data.data[0].value);
        }
      }
    } catch (error: any) {
      console.error('Error fetching appointment types:', error);
    }
  };

  const fetchRequestedAppointments = async () => {
    try {
      const token = localStorage.getItem('portalToken');
      const response = await axios.get('/portal/appointments/requested', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setRequestedAppointments(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching requested appointments:', error);
    }
  };

  const fetchAvailableSlots = async () => {
    if (!selectedDate) return;

    try {
      const token = localStorage.getItem('portalToken');
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

      const response = await axios.get('/portal/appointments/availability', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const { availableSlots: backendSlots } = response.data.data;
        // Extract just the startTime from backend slots for this date
        const dateStr = selectedDate.toISOString().split('T')[0];
        const slots = backendSlots
          .filter((slot: any) => slot.date === dateStr)
          .map((slot: any) => slot.startTime);
        setAvailableSlots(slots);
      }
    } catch (error: any) {
      console.error('Error fetching availability:', error);
      setAvailableSlots([]);
    }
  };

  const generateAvailableSlots = (
    schedules: Schedule[],
    bookedSlots: BookedSlot[],
    date: Date
  ): string[] => {
    const slots: string[] = [];
    const dateStr = date.toISOString().split('T')[0];

    // Find schedule for selected date
    const daySchedule = schedules.find((s) => s.date.startsWith(dateStr));

    if (!daySchedule) {
      return slots;
    }

    // Generate 30-minute slots between start and end time
    const [startHour, startMin] = daySchedule.startTime.split(':').map(Number);
    const [endHour, endMin] = daySchedule.endTime.split(':').map(Number);

    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    while (currentMinutes < endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const mins = currentMinutes % 60;
      const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

      // Check if slot is booked
      const isBooked = bookedSlots.some(
        (slot) =>
          slot.appointmentDate.startsWith(dateStr) && slot.startTime === timeStr
      );

      if (!isBooked) {
        slots.push(timeStr);
      }

      currentMinutes += 30; // 30-minute intervals
    }

    return slots;
  };

  const handleRequestAppointment = async () => {
    if (!selectedDate || !selectedTime || !selectedType) {
      toast.error('Please select a date, time, and appointment type');
      return;
    }

    try {
      setIsLoading(true);
      const token = localStorage.getItem('portalToken');

      const selectedTypeObj = appointmentTypes.find((t) => t.value === selectedType);
      const duration = selectedTypeObj?.duration || 60;

      const response = await axios.post(
        '/portal/appointments/request',
        {
          appointmentDate: selectedDate.toISOString().split('T')[0],
          startTime: selectedTime,
          duration,
          appointmentType: selectedType,
          appointmentNotes: notes,
          preferredModality: 'TELEHEALTH',
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        toast.success('Appointment request submitted! Your therapist will review it soon.');
        setSelectedDate(null);
        setSelectedTime('');
        setNotes('');
        fetchRequestedAppointments();
      }
    } catch (error: any) {
      if (error.response?.status === 409) {
        toast.error('This time slot is no longer available. Please select another time.');
        fetchAvailableSlots();
      } else {
        toast.error(error.response?.data?.message || 'Failed to request appointment');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRequest = async (appointmentId: string) => {
    try {
      const token = localStorage.getItem('portalToken');
      const response = await axios.delete(
        `/portal/appointments/request/${appointmentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        toast.success('Appointment request cancelled');
        fetchRequestedAppointments();
        fetchAvailableSlots();
      }
    } catch (error: any) {
      toast.error('Failed to cancel appointment request');
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty slots for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isPast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  };

  const days = getDaysInMonth(currentMonth);
  const monthYear = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Request Appointment</h1>
        <p className="text-gray-600">Select a date and time to schedule with your therapist</p>
      </div>

      {/* Pending Requests Banner */}
      {requestedAppointments.length > 0 && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium text-blue-900">
                  You have {requestedAppointments.length} pending appointment request{requestedAppointments.length > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-blue-700">Your therapist will review and confirm soon</p>
              </div>
            </div>
            <button
              onClick={() => setShowRequestedList(!showRequestedList)}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
            >
              {showRequestedList ? 'Hide' : 'View'}
            </button>
          </div>
        </div>
      )}

      {/* Pending Requests List */}
      {showRequestedList && requestedAppointments.length > 0 && (
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Requests</h3>
          <div className="space-y-3">
            {requestedAppointments.map((apt) => (
              <div key={apt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">
                    {new Date(apt.appointmentDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                    {' at '}
                    {formatTime(apt.startTime)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {apt.appointmentType.replace(/_/g, ' ')} with {apt.clinician.firstName} {apt.clinician.lastName}
                  </p>
                </div>
                <button
                  onClick={() => handleCancelRequest(apt.id)}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  Cancel Request
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">{monthYear}</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
            {days.map((day, index) => (
              <button
                key={index}
                onClick={() => day && !isPast(day) && setSelectedDate(day)}
                disabled={!day || (day && isPast(day))}
                className={`
                  aspect-square p-2 rounded-lg text-sm font-medium transition-colors
                  ${!day ? 'invisible' : ''}
                  ${day && isPast(day) ? 'text-gray-300 cursor-not-allowed' : ''}
                  ${day && isToday(day) ? 'bg-blue-100 text-blue-600' : ''}
                  ${selectedDate && day && selectedDate.getDate() === day.getDate() && selectedDate.getMonth() === day.getMonth()
                    ? 'bg-indigo-600 text-white'
                    : day && !isPast(day) && !isToday(day)
                    ? 'hover:bg-gray-100 text-gray-700'
                    : ''
                  }
                `}
              >
                {day?.getDate()}
              </button>
            ))}
          </div>
        </div>

        {/* Appointment Details */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Details</h3>

          {selectedDate ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-2">Selected Date</p>
                <p className="font-medium text-gray-900">{formatDate(selectedDate)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Appointment Type
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {appointmentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} ({type.duration} min)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Times
                </label>
                {availableSlots.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {availableSlots.map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`
                          px-3 py-2 text-sm font-medium rounded-lg transition-colors
                          ${selectedTime === time
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }
                        `}
                      >
                        {formatTime(time)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg text-center">
                    No available slots for this date
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Anything you'd like your therapist to know..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleRequestAppointment}
                disabled={!selectedTime || isLoading}
                className="w-full px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Submitting...' : 'Request Appointment'}
              </button>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500">Select a date to see available times</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
