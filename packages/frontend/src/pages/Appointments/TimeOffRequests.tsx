import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';

interface ScheduleException {
  id: string;
  clinicianId: string;
  exceptionType: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  reason: string;
  notes?: string;
  status: 'Requested' | 'Approved' | 'Denied';
  approvedBy?: string;
  approvalDate?: string;
  denialReason?: string;
  createdAt: string;
}

export default function TimeOffRequests() {
  const queryClient = useQueryClient();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedClinicianId, setSelectedClinicianId] = useState<string>('');

  const [formData, setFormData] = useState({
    clinicianId: '',
    exceptionType: 'Time Off',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    allDay: true,
    reason: '',
    notes: '',
  });

  // Fetch clinicians
  const { data: clinicians } = useQuery({
    queryKey: ['clinicians'],
    queryFn: async () => {
      const response = await api.get('/users?role=CLINICIAN');
      return response.data.data;
    },
  });

  // Fetch exceptions
  const { data: exceptions, isLoading } = useQuery({
    queryKey: ['scheduleExceptions', selectedClinicianId],
    enabled: !!selectedClinicianId,
    queryFn: async () => {
      const response = await api.get(`/clinician-schedules/${selectedClinicianId}/exceptions`);
      return response.data.data;
    },
  });

  // Create exception mutation
  const createExceptionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/clinician-schedules/exceptions', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Time off request submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['scheduleExceptions'] });
      setShowRequestModal(false);
      resetForm();
    },
    onError: () => {
      toast.error('Failed to submit time off request');
    },
  });

  // Approve exception mutation
  const approveExceptionMutation = useMutation({
    mutationFn: async (exceptionId: string) => {
      const response = await api.post(`/clinician-schedules/exceptions/${exceptionId}/approve`, {});
      return response.data;
    },
    onSuccess: () => {
      toast.success('Time off request approved');
      queryClient.invalidateQueries({ queryKey: ['scheduleExceptions'] });
    },
    onError: () => {
      toast.error('Failed to approve request');
    },
  });

  // Deny exception mutation
  const denyExceptionMutation = useMutation({
    mutationFn: async ({ exceptionId, denialReason }: { exceptionId: string; denialReason: string }) => {
      const response = await api.post(`/clinician-schedules/exceptions/${exceptionId}/deny`, { denialReason });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Time off request denied');
      queryClient.invalidateQueries({ queryKey: ['scheduleExceptions'] });
    },
    onError: () => {
      toast.error('Failed to deny request');
    },
  });

  // Delete exception mutation
  const deleteExceptionMutation = useMutation({
    mutationFn: async (exceptionId: string) => {
      const response = await api.delete(`/clinician-schedules/exceptions/${exceptionId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Time off request deleted');
      queryClient.invalidateQueries({ queryKey: ['scheduleExceptions'] });
    },
    onError: () => {
      toast.error('Failed to delete request');
    },
  });

  const handleSubmitRequest = () => {
    if (!formData.clinicianId || !formData.startDate || !formData.endDate || !formData.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    createExceptionMutation.mutate({
      ...formData,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString(),
    });
  };

  const resetForm = () => {
    setFormData({
      clinicianId: '',
      exceptionType: 'Time Off',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      allDay: true,
      reason: '',
      notes: '',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Denied':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Requested':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Time Off & Schedule Exceptions</h1>
        <p className="text-gray-600">Manage time off requests and schedule exceptions</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-purple-100 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Clinician <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedClinicianId}
              onChange={(e) => setSelectedClinicianId(e.target.value)}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">-- Select Clinician --</option>
              {clinicians?.map((clinician: any) => (
                <option key={clinician.id} value={clinician.id}>
                  {clinician.title} {clinician.firstName} {clinician.lastName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setShowRequestModal(true)}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg"
            >
              + New Time Off Request
            </button>
          </div>
        </div>
      </div>

      {/* Exceptions List */}
      {selectedClinicianId && (
        <div className="bg-white rounded-xl shadow-sm border-2 border-purple-100 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading requests...</div>
          ) : exceptions?.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No time off requests</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-purple-50 to-blue-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Date Range
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Reason
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
                  {exceptions?.map((exception: ScheduleException) => (
                    <tr key={exception.id} className="hover:bg-purple-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {exception.exceptionType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(exception.startDate).toLocaleDateString()} -{' '}
                        {new Date(exception.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {exception.allDay ? 'All Day' : `${exception.startTime} - ${exception.endTime}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs truncate" title={exception.reason}>
                          {exception.reason}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${getStatusColor(
                            exception.status
                          )}`}
                        >
                          {exception.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          {exception.status === 'Requested' && (
                            <>
                              <button
                                onClick={() => approveExceptionMutation.mutate(exception.id)}
                                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-semibold"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt('Reason for denial:');
                                  if (reason) {
                                    denyExceptionMutation.mutate({
                                      exceptionId: exception.id,
                                      denialReason: reason,
                                    });
                                  }
                                }}
                                className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-semibold"
                              >
                                Deny
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              if (confirm('Delete this time off request?')) {
                                deleteExceptionMutation.mutate(exception.id);
                              }
                            }}
                            className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs font-semibold"
                          >
                            Delete
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
      )}

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">New Time Off Request</h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Clinician <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.clinicianId}
                  onChange={(e) => setFormData({ ...formData, clinicianId: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Select Clinician --</option>
                  {clinicians?.map((clinician: any) => (
                    <option key={clinician.id} value={clinician.id}>
                      {clinician.title} {clinician.firstName} {clinician.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Exception Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.exceptionType}
                  onChange={(e) => setFormData({ ...formData, exceptionType: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Time Off">Time Off</option>
                  <option value="Holiday">Holiday</option>
                  <option value="Conference">Conference</option>
                  <option value="Training">Training</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Personal">Personal</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.allDay}
                    onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
                    className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-semibold text-gray-700">All Day</span>
                </label>
              </div>

              {!formData.allDay && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Brief reason for time off"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Additional notes or details"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  resetForm();
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRequest}
                disabled={createExceptionMutation.isPending}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50"
              >
                {createExceptionMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
