import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface TimeOffRequestDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  providerId: string;
  requestedBy: string;
}

interface AffectedAppointment {
  appointment: any;
  client: any;
}

export default function TimeOffRequestDialog({
  open,
  onClose,
  onSuccess,
  providerId,
  requestedBy,
}: TimeOffRequestDialogProps) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [reason, setReason] = useState<string>('VACATION');
  const [notes, setNotes] = useState('');
  const [coverageProviderId, setCoverageProviderId] = useState('');
  const [autoReschedule, setAutoReschedule] = useState(false);
  const [affectedAppointments, setAffectedAppointments] = useState<AffectedAppointment[]>([]);
  const [suggestedProviders, setSuggestedProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingImpact, setCheckingImpact] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (startDate && endDate && startDate <= endDate) {
      checkImpact();
    }
  }, [startDate, endDate]);

  const checkImpact = async () => {
    if (!startDate || !endDate) return;

    try {
      setCheckingImpact(true);
      setError(null);

      const response = await axios.get(
        `${API_URL}/time-off/affected-appointments`,
        {
          params: {
            providerId,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.data.success) {
        setAffectedAppointments(response.data.data || []);

        // Get suggested providers from first appointment
        if (response.data.data.length > 0 && response.data.data[0].suggestedCoverageProviders) {
          setSuggestedProviders(response.data.data[0].suggestedCoverageProviders);
        }
      }
    } catch (err: any) {
      console.error('Error checking impact:', err);
    } finally {
      setCheckingImpact(false);
    }
  };

  const handleSubmit = async () => {
    if (!startDate || !endDate) {
      setError('Please select start and end dates');
      return;
    }

    if (startDate > endDate) {
      setError('End date must be after start date');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(
        `${API_URL}/time-off`,
        {
          providerId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          reason,
          notes,
          requestedBy,
          coverageProviderId: coverageProviderId || undefined,
          autoReschedule,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.data.success) {
        onSuccess();
        handleClose();
      }
    } catch (err: any) {
      console.error('Error creating time-off request:', err);
      setError(err.response?.data?.message || 'Failed to create time-off request');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStartDate(null);
    setEndDate(null);
    setReason('VACATION');
    setNotes('');
    setCoverageProviderId('');
    setAutoReschedule(false);
    setAffectedAppointments([]);
    setSuggestedProviders([]);
    setError(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-t-2xl">
          <h2 className="text-2xl font-bold">Request Time Off</h2>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-xl p-4 shadow-lg flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-2xl mr-3">❌</span>
                <p className="text-red-800 font-semibold">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
                <span className="text-xl">✖</span>
              </button>
            </div>
          )}

          <div className="space-y-4">
            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={startDate ? startDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-300 focus:border-blue-400 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  value={endDate ? endDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
                  min={startDate ? startDate.toISOString().split('T')[0] : undefined}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-300 focus:border-blue-400 transition-all"
                  required
                />
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Reason *</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-300 focus:border-blue-400 transition-all"
                required
              >
                <option value="VACATION">Vacation</option>
                <option value="SICK">Sick Leave</option>
                <option value="CONFERENCE">Conference</option>
                <option value="PERSONAL">Personal</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional details about your time-off request..."
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-300 focus:border-blue-400 transition-all"
                rows={3}
              />
            </div>

            {/* Checking Impact */}
            {checkingImpact && (
              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-xl p-4 flex items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                <p className="text-blue-800 font-semibold">Checking for affected appointments...</p>
              </div>
            )}

            {/* Affected Appointments */}
            {affectedAppointments.length > 0 && (
              <div className="space-y-4">
                <div className="bg-amber-50 border-l-4 border-amber-500 rounded-xl p-4 shadow-lg">
                  <p className="text-amber-900 font-bold mb-3 flex items-center">
                    <span className="mr-2">⚠️</span>
                    {affectedAppointments.length} appointment(s) will be affected
                  </p>
                  <div className="space-y-2">
                    {affectedAppointments.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-lg border-2 border-amber-200">
                        <p className="text-sm text-gray-800">
                          <span className="font-bold">
                            {new Date(item.appointment.appointmentDate).toLocaleDateString()}
                          </span>{' '}
                          at {item.appointment.startTime} - {item.client.firstName}{' '}
                          {item.client.lastName}
                        </p>
                      </div>
                    ))}
                    {affectedAppointments.length > 3 && (
                      <p className="text-sm text-amber-700 font-semibold">
                        ... and {affectedAppointments.length - 3} more
                      </p>
                    )}
                  </div>
                </div>

                {/* Coverage Provider */}
                {suggestedProviders.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Coverage Provider (Optional)
                    </label>
                    <select
                      value={coverageProviderId}
                      onChange={(e) => setCoverageProviderId(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-300 focus:border-blue-400 transition-all"
                    >
                      <option value="">None</option>
                      {suggestedProviders.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.firstName} {provider.lastName}
                          {provider.matchScore > 0 && ` (${provider.matchScore} matching specialties)`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Auto Reschedule */}
                {coverageProviderId && (
                  <label className="flex items-center space-x-3 cursor-pointer bg-green-50 p-4 rounded-xl border-2 border-green-200">
                    <input
                      type="checkbox"
                      checked={autoReschedule}
                      onChange={(e) => setAutoReschedule(e.target.checked)}
                      className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm font-semibold text-gray-700">
                      Automatically reschedule appointments to coverage provider
                    </span>
                  </label>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-2xl flex items-center justify-end space-x-3 border-t-2 border-gray-200">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !startDate || !endDate}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
}
