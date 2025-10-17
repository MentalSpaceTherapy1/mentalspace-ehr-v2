import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface ReminderSettings {
  id?: string;
  clinicianId: string;
  enabled: boolean;
  emailRemindersEnabled: boolean;
  emailReminderTimings: number[];
  emailTemplate?: string;
  smsRemindersEnabled: boolean;
  smsReminderTimings: number[];
  smsTemplate?: string;
  requireConfirmation: boolean;
  includeRescheduleLink: boolean;
  includeCancelLink: boolean;
  includeTelehealthLink: boolean;
}

export default function ReminderSettings() {
  const queryClient = useQueryClient();
  const [selectedClinicianId, setSelectedClinicianId] = useState<string>('');

  const [settings, setSettings] = useState<ReminderSettings>({
    clinicianId: '',
    enabled: true,
    emailRemindersEnabled: true,
    emailReminderTimings: [24, 2],
    emailTemplate: '',
    smsRemindersEnabled: false,
    smsReminderTimings: [24, 2],
    smsTemplate: '',
    requireConfirmation: false,
    includeRescheduleLink: true,
    includeCancelLink: true,
    includeTelehealthLink: true,
  });

  // Fetch clinicians
  const { data: clinicians } = useQuery({
    queryKey: ['clinicians'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/v1/users?role=CLINICIAN', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
  });

  // Fetch reminder settings
  const { data: currentSettings, isLoading } = useQuery({
    queryKey: ['reminderSettings', selectedClinicianId],
    enabled: !!selectedClinicianId,
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `/api/v1/reminders/settings/${selectedClinicianId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data.data;
    },
  });

  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
    }
  }, [currentSettings]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: ReminderSettings) => {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/v1/reminders/settings', data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Reminder settings saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['reminderSettings'] });
    },
    onError: () => {
      toast.error('Failed to save reminder settings');
    },
  });

  const handleSave = () => {
    if (!selectedClinicianId) {
      toast.error('Please select a clinician');
      return;
    }

    saveSettingsMutation.mutate({
      ...settings,
      clinicianId: selectedClinicianId,
    });
  };

  const addTiming = (type: 'email' | 'sms') => {
    const timing = prompt('Enter hours before appointment (e.g., 24, 2, 0.5):');
    if (timing) {
      const hours = parseFloat(timing);
      if (!isNaN(hours) && hours > 0) {
        if (type === 'email') {
          setSettings((prev) => ({
            ...prev,
            emailReminderTimings: [...prev.emailReminderTimings, hours].sort((a, b) => b - a),
          }));
        } else {
          setSettings((prev) => ({
            ...prev,
            smsReminderTimings: [...prev.smsReminderTimings, hours].sort((a, b) => b - a),
          }));
        }
      } else {
        toast.error('Please enter a valid positive number');
      }
    }
  };

  const removeTiming = (type: 'email' | 'sms', index: number) => {
    if (type === 'email') {
      setSettings((prev) => ({
        ...prev,
        emailReminderTimings: prev.emailReminderTimings.filter((_, i) => i !== index),
      }));
    } else {
      setSettings((prev) => ({
        ...prev,
        smsReminderTimings: prev.smsReminderTimings.filter((_, i) => i !== index),
      }));
    }
  };

  const formatTiming = (hours: number) => {
    if (hours >= 24) {
      const days = hours / 24;
      return `${days} day${days > 1 ? 's' : ''} before`;
    } else if (hours >= 1) {
      return `${hours} hour${hours > 1 ? 's' : ''} before`;
    } else {
      const minutes = hours * 60;
      return `${minutes} minute${minutes > 1 ? 's' : ''} before`;
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reminder Settings</h1>
        <p className="text-gray-600">Configure appointment reminder preferences</p>
      </div>

      {/* Clinician Selection */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-purple-100 p-6 mb-6">
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

      {selectedClinicianId && (
        <>
          {/* Global Settings */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-purple-100 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Global Settings</h2>
            <div className="space-y-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-semibold text-gray-700">
                  Enable Appointment Reminders
                </span>
              </label>
            </div>
          </div>

          {/* Email Reminders */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-purple-100 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Email Reminders</h2>

            <div className="space-y-4 mb-6">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.emailRemindersEnabled}
                  onChange={(e) =>
                    setSettings({ ...settings, emailRemindersEnabled: e.target.checked })
                  }
                  className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-semibold text-gray-700">Enable Email Reminders</span>
              </label>
            </div>

            {settings.emailRemindersEnabled && (
              <>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">Reminder Timings</label>
                    <button
                      onClick={() => addTiming('email')}
                      className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      + Add Timing
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {settings.emailReminderTimings.map((hours, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-2 bg-purple-100 text-purple-800 px-3 py-1 rounded-full"
                      >
                        <span className="text-sm font-semibold">{formatTiming(hours)}</span>
                        <button
                          onClick={() => removeTiming('email', index)}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Template (Optional)
                  </label>
                  <textarea
                    value={settings.emailTemplate || ''}
                    onChange={(e) => setSettings({ ...settings, emailTemplate: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Leave blank for default template. Use HTML for formatting."
                  />
                </div>
              </>
            )}
          </div>

          {/* SMS Reminders */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-purple-100 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">SMS Reminders</h2>

            <div className="space-y-4 mb-6">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.smsRemindersEnabled}
                  onChange={(e) =>
                    setSettings({ ...settings, smsRemindersEnabled: e.target.checked })
                  }
                  className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-semibold text-gray-700">Enable SMS Reminders</span>
              </label>
            </div>

            {settings.smsRemindersEnabled && (
              <>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">Reminder Timings</label>
                    <button
                      onClick={() => addTiming('sms')}
                      className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      + Add Timing
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {settings.smsReminderTimings.map((hours, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-2 bg-purple-100 text-purple-800 px-3 py-1 rounded-full"
                      >
                        <span className="text-sm font-semibold">{formatTiming(hours)}</span>
                        <button
                          onClick={() => removeTiming('sms', index)}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    SMS Template (Optional)
                  </label>
                  <textarea
                    value={settings.smsTemplate || ''}
                    onChange={(e) => setSettings({ ...settings, smsTemplate: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Leave blank for default template. Keep it short (160 chars)."
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.requireConfirmation}
                      onChange={(e) =>
                        setSettings({ ...settings, requireConfirmation: e.target.checked })
                      }
                      className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm font-semibold text-gray-700">
                      Require Confirmation (Reply C to confirm)
                    </span>
                  </label>
                </div>
              </>
            )}
          </div>

          {/* Additional Options */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-purple-100 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Additional Options</h2>
            <div className="space-y-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.includeRescheduleLink}
                  onChange={(e) =>
                    setSettings({ ...settings, includeRescheduleLink: e.target.checked })
                  }
                  className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-semibold text-gray-700">
                  Include Reschedule Link
                </span>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.includeCancelLink}
                  onChange={(e) =>
                    setSettings({ ...settings, includeCancelLink: e.target.checked })
                  }
                  className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-semibold text-gray-700">Include Cancel Link</span>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.includeTelehealthLink}
                  onChange={(e) =>
                    setSettings({ ...settings, includeTelehealthLink: e.target.checked })
                  }
                  className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-semibold text-gray-700">
                  Include Telehealth Join Link
                </span>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saveSettingsMutation.isPending}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg disabled:opacity-50"
            >
              {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
