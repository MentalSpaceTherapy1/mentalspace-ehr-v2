import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface WaitlistEntry {
  id: string;
  clientId: string;
  requestedClinicianId: string;
  alternateClinicianIds: string[];
  requestedAppointmentType: string;
  preferredDays: string[];
  preferredTimes: string;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  addedDate: string;
  notified: boolean;
  status: string;
  notes?: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    primaryPhone: string;
  };
}

interface AvailableSlot {
  clinicianId: string;
  clinicianName: string;
  date: string;
  startTime: string;
  endTime: string;
  appointmentType: string;
}

export default function Waitlist() {
  const navigate = useNavigate();
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSlotsModal, setShowSlotsModal] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('Active');
  const [filterPriority, setFilterPriority] = useState<string>('');

  const queryClient = useQueryClient();

  // Fetch waitlist entries
  const { data: waitlistData, isLoading } = useQuery({
    queryKey: ['waitlist', filterStatus, filterPriority],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterPriority) params.append('priority', filterPriority);

      const response = await axios.get(`/waitlist?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
  });

  // Fetch clients for dropdown
  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get('/clients', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
  });

  // Fetch clinicians for dropdown
  const { data: clinicians } = useQuery({
    queryKey: ['clinicians'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get('/users?role=CLINICIAN', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
  });

  // Find available slots mutation
  const findSlotsMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `/waitlist/${entryId}/available-slots?daysAhead=14`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      setAvailableSlots(data);
      setShowSlotsModal(true);
    },
    onError: () => {
      toast.error('Failed to find available slots');
    },
  });

  // Book appointment mutation
  const bookMutation = useMutation({
    mutationFn: async ({ entryId, slot }: { entryId: string; slot: AvailableSlot }) => {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/waitlist/${entryId}/book`,
        {
          clinicianId: slot.clinicianId,
          appointmentDate: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          duration: 60,
          serviceLocation: 'Office',
          serviceCodeId: 'placeholder-uuid', // TODO: Select from service codes
          timezone: 'America/New_York',
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success('Appointment booked successfully!');
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      setShowSlotsModal(false);
      setSelectedEntry(null);
    },
    onError: () => {
      toast.error('Failed to book appointment');
    },
  });

  // Update priority mutation
  const updatePriorityMutation = useMutation({
    mutationFn: async ({ entryId, priority }: { entryId: string; priority: string }) => {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `/waitlist/${entryId}/priority`,
        { priority },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success('Priority updated');
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
    },
    onError: () => {
      toast.error('Failed to update priority');
    },
  });

  // Remove from waitlist mutation
  const removeMutation = useMutation({
    mutationFn: async ({ entryId, reason }: { entryId: string; reason: string }) => {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`/waitlist/${entryId}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { reason },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Removed from waitlist');
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
    },
    onError: () => {
      toast.error('Failed to remove from waitlist');
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Normal':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Low':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Waitlist Management</h1>
        <p className="text-gray-600">Manage clients waiting for appointments</p>
      </div>

      {/* Schedule Management Navigation */}
      <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => navigate('/appointments')}
            className="px-6 py-2 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold border-2 border-purple-200"
          >
            📅 Calendar
          </button>
          <button
            onClick={() => navigate('/appointments/waitlist')}
            className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold"
          >
            ⏳ Waitlist
          </button>
          <button
            onClick={() => navigate('/appointments/schedules')}
            className="px-6 py-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold border-2 border-green-200"
          >
            🗓️ Clinician Schedules
          </button>
          <button
            onClick={() => navigate('/appointments/time-off')}
            className="px-6 py-2 bg-gradient-to-r from-rose-100 to-pink-100 text-rose-700 rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold border-2 border-rose-200"
          >
            🌴 Time Off
          </button>
          <button
            onClick={() => navigate('/settings/reminders')}
            className="px-6 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold border-2 border-indigo-200"
          >
            🔔 Reminders
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-purple-100 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="Active">Active</option>
              <option value="Offered">Offered</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Removed">Removed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-4 py-2 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Normal">Normal</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg"
            >
              + Add to Waitlist
            </button>
          </div>
        </div>
      </div>

      {/* Waitlist Table */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-purple-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading waitlist...</div>
        ) : waitlistData?.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No entries in waitlist</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-50 to-blue-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Appointment Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Preferred Days
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Added Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {waitlistData?.map((entry: WaitlistEntry) => (
                  <tr key={entry.id} className="hover:bg-purple-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {entry.client.firstName} {entry.client.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{entry.client.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${getPriorityColor(
                          entry.priority
                        )}`}
                      >
                        {entry.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.requestedAppointmentType}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {entry.preferredDays.join(', ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(entry.addedDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedEntry(entry);
                            findSlotsMutation.mutate(entry.id);
                          }}
                          className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs font-semibold"
                        >
                          Find Slots
                        </button>
                        <select
                          value={entry.priority}
                          onChange={(e) =>
                            updatePriorityMutation.mutate({
                              entryId: entry.id,
                              priority: e.target.value,
                            })
                          }
                          className="px-2 py-1 border border-gray-300 rounded text-xs"
                        >
                          <option value="Low">Low</option>
                          <option value="Normal">Normal</option>
                          <option value="High">High</option>
                          <option value="Urgent">Urgent</option>
                        </select>
                        <button
                          onClick={() => {
                            const reason = prompt('Reason for removal:');
                            if (reason) {
                              removeMutation.mutate({ entryId: entry.id, reason });
                            }
                          }}
                          className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Available Slots Modal */}
      {showSlotsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Available Slots</h2>
              <p className="text-gray-600 mt-1">
                {selectedEntry?.client.firstName} {selectedEntry?.client.lastName}
              </p>
            </div>

            <div className="p-6">
              {availableSlots.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No available slots found</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableSlots.map((slot, index) => (
                    <div
                      key={index}
                      className="border-2 border-purple-200 rounded-lg p-4 hover:border-purple-400 transition-colors"
                    >
                      <div className="font-semibold text-gray-900 mb-2">
                        {slot.clinicianName}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>
                          {new Date(slot.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div>
                          {slot.startTime} - {slot.endTime}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          selectedEntry &&
                          bookMutation.mutate({ entryId: selectedEntry.id, slot })
                        }
                        className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                      >
                        Book Slot
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setShowSlotsModal(false);
                  setSelectedEntry(null);
                  setAvailableSlots([]);
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
