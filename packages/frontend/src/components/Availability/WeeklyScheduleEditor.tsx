import React, { useState, useEffect } from 'react';

interface AvailabilitySlot {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  officeLocationId?: string;
  isTelehealthAvailable: boolean;
  maxAppointments?: number;
  isActive: boolean;
}

interface WeeklyScheduleEditorProps {
  providerId: string;
  schedule: AvailabilitySlot[];
  onSave: (schedule: AvailabilitySlot[]) => Promise<void>;
  loading?: boolean;
}

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export default function WeeklyScheduleEditor({
  providerId,
  schedule,
  onSave,
  loading = false,
}: WeeklyScheduleEditorProps) {
  const [localSchedule, setLocalSchedule] = useState<AvailabilitySlot[]>(schedule);
  const [error, setError] = useState<string | null>(null);

  // Sync local schedule when prop changes
  useEffect(() => {
    setLocalSchedule(schedule);
  }, [schedule]);

  const handleAddSlot = (dayOfWeek: number) => {
    const newSlot: AvailabilitySlot = {
      dayOfWeek,
      startTime: '09:00',
      endTime: '17:00',
      isTelehealthAvailable: false,
      isActive: true,
    };
    setLocalSchedule([...localSchedule, newSlot]);
  };

  const handleRemoveSlot = (index: number) => {
    setLocalSchedule(localSchedule.filter((_, i) => i !== index));
  };

  const handleSlotChange = (
    index: number,
    field: keyof AvailabilitySlot,
    value: any
  ) => {
    const updated = [...localSchedule];
    updated[index] = { ...updated[index], [field]: value };
    setLocalSchedule(updated);
  };

  const validateSchedule = (): boolean => {
    setError(null);

    for (const slot of localSchedule) {
      // Validate time format
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(slot.startTime) || !timeRegex.test(slot.endTime)) {
        setError('Invalid time format. Please use HH:mm format (e.g., 09:00)');
        return false;
      }

      // Validate end time is after start time
      const [startHour, startMin] = slot.startTime.split(':').map(Number);
      const [endHour, endMin] = slot.endTime.split(':').map(Number);
      if (endHour * 60 + endMin <= startHour * 60 + startMin) {
        setError('End time must be after start time');
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateSchedule()) {
      return;
    }

    try {
      await onSave(localSchedule);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to save schedule');
    }
  };

  const getSlotsForDay = (dayOfWeek: number) => {
    return localSchedule
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => slot.dayOfWeek === dayOfWeek);
  };

  const getDayColor = (dayOfWeek: number) => {
    const colors = [
      'from-red-500 to-rose-500',
      'from-cyan-500 to-blue-500',
      'from-green-500 to-emerald-500',
      'from-purple-500 to-indigo-500',
      'from-amber-500 to-orange-500',
      'from-pink-500 to-rose-500',
      'from-blue-500 to-cyan-500',
    ];
    return colors[dayOfWeek];
  };

  return (
    <div>
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
        {DAYS_OF_WEEK.map((day, dayOfWeek) => (
          <div
            key={dayOfWeek}
            className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-l-cyan-500"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold bg-gradient-to-r ${getDayColor(dayOfWeek)} bg-clip-text text-transparent`}>
                {day}
              </h3>
              <button
                onClick={() => handleAddSlot(dayOfWeek)}
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold text-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="mr-2">➕</span> Add Time Slot
              </button>
            </div>

            {getSlotsForDay(dayOfWeek).length === 0 ? (
              <p className="text-gray-500 text-sm">No availability set for this day</p>
            ) : (
              <div className="space-y-3">
                {getSlotsForDay(dayOfWeek).map(({ slot, index }) => (
                  <div
                    key={index}
                    className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border-2 border-blue-200 flex items-center gap-3 flex-wrap"
                  >
                    <div className="flex-1 min-w-[120px]">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => handleSlotChange(index, 'startTime', e.target.value)}
                        disabled={loading}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    <span className="text-gray-500 font-bold self-end pb-2">to</span>

                    <div className="flex-1 min-w-[120px]">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => handleSlotChange(index, 'endTime', e.target.value)}
                        disabled={loading}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Max Appointments
                      </label>
                      <input
                        type="number"
                        value={slot.maxAppointments || ''}
                        onChange={(e) =>
                          handleSlotChange(
                            index,
                            'maxAppointments',
                            e.target.value ? parseInt(e.target.value) : undefined
                          )
                        }
                        disabled={loading}
                        placeholder="Unlimited"
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="flex items-center space-x-3 self-end pb-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={slot.isTelehealthAvailable}
                          onChange={(e) =>
                            handleSlotChange(index, 'isTelehealthAvailable', e.target.checked)
                          }
                          disabled={loading}
                          className="w-5 h-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className="text-sm font-semibold text-gray-700">Telehealth</span>
                      </label>

                      <button
                        onClick={() => handleRemoveSlot(index)}
                        disabled={loading}
                        className="px-3 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Remove"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-end space-x-3">
        <button
          onClick={() => setLocalSchedule(schedule)}
          disabled={loading}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Save Schedule'}
        </button>
      </div>
    </div>
  );
}
