import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import WeeklyScheduleEditor from '../../components/Availability/WeeklyScheduleEditor';
import api from '../../lib/api';

interface AvailabilitySlot {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  officeLocationId?: string;
  isTelehealthAvailable: boolean;
  maxAppointments?: number;
  isActive: boolean;
  providerId?: string;
}

export default function ProviderAvailability() {
  // Fetch current user profile
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await api.get('/auth/me');
      return response.data.data;
    },
  });

  const [schedule, setSchedule] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'overview'>('editor');

  useEffect(() => {
    loadSchedule();
  }, [user?.id]);

  const loadSchedule = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await api.get(
        `/provider-availability/provider/${user.id}/schedule`
      );

      if (response.data.success) {
        setSchedule(response.data.data || []);
      }
    } catch (err: any) {
      console.error('Error loading schedule:', err);
      setError(err.response?.data?.message || 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchedule = async (updatedSchedule: AvailabilitySlot[]) => {
    if (!user?.id) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Get existing schedule IDs
      const existingIds = schedule.map((s) => s.id).filter(Boolean);
      const updatedIds = updatedSchedule.map((s) => s.id).filter(Boolean);

      // Delete removed slots
      const idsToDelete = existingIds.filter((id) => !updatedIds.includes(id));
      for (const id of idsToDelete) {
        await api.delete(
          `/provider-availability/${id}`
        );
      }

      // Create or update slots
      for (const slot of updatedSchedule) {
        if (slot.id) {
          // Update existing slot
          await api.put(
            `/provider-availability/${slot.id}`,
            {
              dayOfWeek: slot.dayOfWeek,
              startTime: slot.startTime,
              endTime: slot.endTime,
              officeLocationId: slot.officeLocationId,
              isTelehealthAvailable: slot.isTelehealthAvailable,
              maxAppointments: slot.maxAppointments,
              isActive: slot.isActive,
            }
          );
        } else {
          // Create new slot
          await api.post(
            `/provider-availability`,
            {
              providerId: user.id,
              dayOfWeek: slot.dayOfWeek,
              startTime: slot.startTime,
              endTime: slot.endTime,
              officeLocationId: slot.officeLocationId,
              isTelehealthAvailable: slot.isTelehealthAvailable,
              maxAppointments: slot.maxAppointments,
            }
          );
        }
      }

      setSuccess('Schedule saved successfully!');
      await loadSchedule(); // Reload to get updated data with IDs
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving schedule:', err);
      setError(err.response?.data?.message || 'Failed to save schedule');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (loading || userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto shadow-lg"></div>
          <p className="mt-6 text-lg font-semibold text-gray-700">Loading Availability...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center mb-2">
          <span className="mr-3">📅</span> Provider Availability
        </h1>
        <p className="text-gray-600 text-lg">
          Set your weekly schedule to manage when you're available for appointments
        </p>
      </div>

      {/* Alerts */}
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

      {success && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-500 rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-3">✅</span>
            <p className="text-green-800 font-semibold">{success}</p>
          </div>
          <button onClick={() => setSuccess(null)} className="text-green-600 hover:text-green-800">
            <span className="text-xl">✖</span>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-xl mb-6">
        <div className="border-b-2 border-gray-200 px-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-6 py-4 font-semibold transition-all duration-200 border-b-4 ${
                activeTab === 'editor'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📝 Weekly Schedule
            </button>
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-4 font-semibold transition-all duration-200 border-b-4 ${
                activeTab === 'overview'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📊 Schedule Overview
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'editor' && (
            <WeeklyScheduleEditor
              providerId={user?.id || ''}
              schedule={schedule}
              onSave={handleSaveSchedule}
              loading={saving}
            />
          )}

          {activeTab === 'overview' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="mr-2">📋</span> Current Schedule Summary
              </h2>

              {schedule.length === 0 ? (
                <div className="bg-blue-50 border-l-4 border-blue-500 rounded-xl p-6 shadow-lg">
                  <div className="flex items-center">
                    <span className="text-3xl mr-4">ℹ️</span>
                    <div>
                      <p className="text-blue-800 font-semibold mb-1">
                        No availability schedule set
                      </p>
                      <p className="text-blue-700 text-sm">
                        Use the Weekly Schedule tab to add your availability
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                    const daySlots = schedule.filter((s) => s.dayOfWeek === day);

                    if (daySlots.length === 0) return null;

                    return (
                      <div
                        key={day}
                        className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-purple-500"
                      >
                        <h3 className="text-lg font-bold text-gray-800 mb-3">
                          {dayNames[day]}
                        </h3>
                        <div className="space-y-2">
                          {daySlots.map((slot, idx) => (
                            <div
                              key={idx}
                              className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-lg border-2 border-purple-200"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-purple-900 font-bold">
                                    {slot.startTime} - {slot.endTime}
                                  </p>
                                  {slot.maxAppointments && (
                                    <p className="text-sm text-purple-700 mt-1">
                                      Max: {slot.maxAppointments} appointments
                                    </p>
                                  )}
                                </div>
                                {slot.isTelehealthAvailable && (
                                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold border-2 border-green-200">
                                    📹 Telehealth Available
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
