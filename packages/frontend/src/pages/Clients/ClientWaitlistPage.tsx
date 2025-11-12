import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface WaitlistEntry {
  id: string;
  clinicianId: string | null;
  appointmentType: string;
  preferredDays: string[];
  preferredTimes: string[];
  priority: number;
  status: 'ACTIVE' | 'MATCHED' | 'CANCELLED' | 'EXPIRED';
  joinedAt: string;
  notificationsSent: number;
  lastNotifiedAt: string | null;
  notes: string | null;
  expiresAt: string | null;
  clinician: {
    firstName: string;
    lastName: string;
  } | null;
}

const DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const TIMES_OF_DAY = ['MORNING', 'AFTERNOON', 'EVENING'];
const APPOINTMENT_TYPES = [
  'INITIAL_CONSULTATION',
  'FOLLOW_UP',
  'THERAPY_SESSION',
  'PSYCHIATRIC_EVALUATION',
  'MEDICATION_MANAGEMENT',
];

export default function ClientWaitlistPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Form state
  const [selectedClinician, setSelectedClinician] = useState<string>('');
  const [appointmentType, setAppointmentType] = useState<string>('THERAPY_SESSION');
  const [preferredDays, setPreferredDays] = useState<string[]>([]);
  const [preferredTimes, setPreferredTimes] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');

  // Get current user (client)
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const response = await api.get('/auth/me');
      return response.data.user;
    },
  });

  // Fetch client's waitlist entries
  const { data: waitlistEntries, isLoading } = useQuery<WaitlistEntry[]>({
    queryKey: ['clientWaitlist', currentUser?.clientId],
    queryFn: async () => {
      if (!currentUser?.clientId) return [];
      const response = await api.get(`/waitlist?clientId=${currentUser.clientId}`);
      return response.data.data;
    },
    enabled: !!currentUser?.clientId,
  });

  // Fetch available clinicians
  const { data: clinicians } = useQuery({
    queryKey: ['clinicians'],
    queryFn: async () => {
      const response = await api.get('/users?role=CLINICIAN');
      return response.data.data;
    },
  });

  // Join waitlist mutation
  const joinWaitlistMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.clientId) {
        throw new Error('Client ID not found');
      }

      const payload = {
        clientId: currentUser.clientId,
        clinicianId: selectedClinician || null,
        appointmentType,
        preferredDays,
        preferredTimes,
        priority: 0,
        notes,
      };

      const response = await api.post('/waitlist', payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Successfully joined the waitlist!');
      queryClient.invalidateQueries({ queryKey: ['clientWaitlist'] });
      setShowJoinModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to join waitlist');
    },
  });

  // Cancel waitlist entry mutation
  const cancelMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const response = await api.delete(`/waitlist/${entryId}`, {
        data: { reason: 'Cancelled by client' },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Removed from waitlist');
      queryClient.invalidateQueries({ queryKey: ['clientWaitlist'] });
    },
    onError: () => {
      toast.error('Failed to remove from waitlist');
    },
  });

  const resetForm = () => {
    setSelectedClinician('');
    setAppointmentType('THERAPY_SESSION');
    setPreferredDays([]);
    setPreferredTimes([]);
    setNotes('');
  };

  const handleDayToggle = (day: string) => {
    if (preferredDays.includes(day)) {
      setPreferredDays(preferredDays.filter((d) => d !== day));
    } else {
      setPreferredDays([...preferredDays, day]);
    }
  };

  const handleTimeToggle = (time: string) => {
    if (preferredTimes.includes(time)) {
      setPreferredTimes(preferredTimes.filter((t) => t !== time));
    } else {
      setPreferredTimes([...preferredTimes, time]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (preferredDays.length === 0) {
      toast.error('Please select at least one preferred day');
      return;
    }

    if (preferredTimes.length === 0) {
      toast.error('Please select at least one preferred time');
      return;
    }

    joinWaitlistMutation.mutate();
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'MATCHED':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'EXPIRED':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const calculatePosition = (entry: WaitlistEntry) => {
    if (!waitlistEntries) return 0;
    const activeEntries = waitlistEntries.filter((e) => e.status === 'ACTIVE');
    return activeEntries.findIndex((e) => e.id === entry.id) + 1;
  };

  const formatDaysWaiting = (joinedAt: string) => {
    const days = Math.floor(
      (Date.now() - new Date(joinedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Waitlist</h1>
        <p className="text-gray-600">
          Join our waitlist to be notified when appointment slots become available
        </p>
      </div>

      {/* Active Waitlist Entries */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-purple-100 p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Your Waitlist Entries</h2>
          <button
            onClick={() => setShowJoinModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg"
          >
            + Join Waitlist
          </button>
        </div>

        {isLoading ? (
          <p className="text-center text-gray-500 py-8">Loading...</p>
        ) : !waitlistEntries || waitlistEntries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              You're not currently on any waitlist
            </p>
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              Join Waitlist Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {waitlistEntries.map((entry) => (
              <div
                key={entry.id}
                className="border-2 border-purple-200 rounded-lg p-6 hover:border-purple-400 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {entry.clinician
                        ? `${entry.clinician.firstName} ${entry.clinician.lastName}`
                        : 'Any Available Clinician'}
                    </h3>
                    <p className="text-sm text-gray-600">{entry.appointmentType}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${getStatusBadgeColor(
                      entry.status
                    )}`}
                  >
                    {entry.status}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  {entry.status === 'ACTIVE' && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">
                        Queue Position
                      </span>
                      <span className="text-lg font-bold text-blue-600">
                        #{calculatePosition(entry)}
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Preferred Days:
                    </span>
                    <p className="text-sm text-gray-600 mt-1">
                      {entry.preferredDays.join(', ')}
                    </p>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Preferred Times:
                    </span>
                    <p className="text-sm text-gray-600 mt-1">
                      {entry.preferredTimes.join(', ')}
                    </p>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Joined:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(entry.joinedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Days Waiting:</span>
                    <span className="font-medium text-gray-900">
                      {formatDaysWaiting(entry.joinedAt)} days
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Notifications:</span>
                    <span className="font-medium text-gray-900">
                      {entry.notificationsSent}
                    </span>
                  </div>

                  {entry.notes && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Notes:</span>
                      <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
                    </div>
                  )}
                </div>

                {entry.status === 'ACTIVE' && (
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          'Are you sure you want to leave the waitlist?'
                        )
                      ) {
                        cancelMutation.mutate(entry.id);
                      }
                    }}
                    className="w-full px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Leave Waitlist
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Join Waitlist Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Join Waitlist</h2>
              <p className="text-gray-600 mt-1">
                We'll notify you when a matching appointment becomes available
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Clinician Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Preferred Clinician (Optional)
                </label>
                <select
                  value={selectedClinician}
                  onChange={(e) => setSelectedClinician(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Any Available Clinician</option>
                  {clinicians?.map((clinician: any) => (
                    <option key={clinician.id} value={clinician.id}>
                      {clinician.firstName} {clinician.lastName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Appointment Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Appointment Type *
                </label>
                <select
                  value={appointmentType}
                  onChange={(e) => setAppointmentType(e.target.value)}
                  required
                  className="w-full px-4 py-2 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {APPOINTMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preferred Days */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Preferred Days * (Select at least one)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDayToggle(day)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        preferredDays.includes(day)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {day.charAt(0) + day.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferred Times */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Preferred Times * (Select at least one)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TIMES_OF_DAY.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => handleTimeToggle(time)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        preferredTimes.includes(time)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {time.charAt(0) + time.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Any specific requirements or preferences..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joinWaitlistMutation.isPending}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50"
                >
                  {joinWaitlistMutation.isPending ? 'Joining...' : 'Join Waitlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
