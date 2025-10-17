import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import TimePicker from '../../components/TimePicker';

interface DaySchedule {
  isAvailable: boolean;
  startTime: string;
  endTime: string;
  breakStartTime?: string;
  breakEndTime?: string;
}

interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface ScheduleData {
  clinicianId: string;
  weeklyScheduleJson: WeeklySchedule;
  acceptNewClients: boolean;
  maxAppointmentsPerDay?: number;
  maxAppointmentsPerWeek?: number;
  bufferTimeBetweenAppointments?: number;
  availableLocations: string[];
  effectiveStartDate: string;
  effectiveEndDate?: string;
}

export default function ClinicianSchedule() {
  const queryClient = useQueryClient();
  const [selectedClinicianId, setSelectedClinicianId] = useState<string>('');

  const defaultDaySchedule: DaySchedule = {
    isAvailable: false,
    startTime: '09:00',
    endTime: '17:00',
    breakStartTime: '12:00',
    breakEndTime: '13:00',
  };

  const [scheduleData, setScheduleData] = useState<ScheduleData>({
    clinicianId: '',
    weeklyScheduleJson: {
      monday: { ...defaultDaySchedule, isAvailable: true },
      tuesday: { ...defaultDaySchedule, isAvailable: true },
      wednesday: { ...defaultDaySchedule, isAvailable: true },
      thursday: { ...defaultDaySchedule, isAvailable: true },
      friday: { ...defaultDaySchedule, isAvailable: true },
      saturday: defaultDaySchedule,
      sunday: defaultDaySchedule,
    },
    acceptNewClients: true,
    maxAppointmentsPerDay: undefined,
    maxAppointmentsPerWeek: undefined,
    bufferTimeBetweenAppointments: 0,
    availableLocations: ['Office', 'Telehealth'],
    effectiveStartDate: new Date().toISOString(),
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

  // Fetch schedule for selected clinician
  const { data: currentSchedule, isLoading } = useQuery({
    queryKey: ['clinicianSchedule', selectedClinicianId],
    enabled: !!selectedClinicianId,
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/v1/clinician-schedules/${selectedClinicianId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
    onSuccess: (data) => {
      if (data) {
        setScheduleData({
          clinicianId: data.clinicianId,
          weeklyScheduleJson: data.weeklyScheduleJson,
          acceptNewClients: data.acceptNewClients,
          maxAppointmentsPerDay: data.maxAppointmentsPerDay,
          maxAppointmentsPerWeek: data.maxAppointmentsPerWeek,
          bufferTimeBetweenAppointments: data.bufferTimeBetweenAppointments,
          availableLocations: data.availableLocations,
          effectiveStartDate: data.effectiveStartDate,
          effectiveEndDate: data.effectiveEndDate,
        });
      }
    },
  });

  // Save schedule mutation
  const saveScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleData) => {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/v1/clinician-schedules', data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Schedule saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['clinicianSchedule'] });
    },
    onError: () => {
      toast.error('Failed to save schedule');
    },
  });

  const handleSaveSchedule = () => {
    if (!selectedClinicianId) {
      toast.error('Please select a clinician');
      return;
    }

    saveScheduleMutation.mutate({
      ...scheduleData,
      clinicianId: selectedClinicianId,
    });
  };

  const updateDaySchedule = (day: keyof WeeklySchedule, field: keyof DaySchedule, value: any) => {
    setScheduleData((prev) => ({
      ...prev,
      weeklyScheduleJson: {
        ...prev.weeklyScheduleJson,
        [day]: {
          ...prev.weeklyScheduleJson[day],
          [field]: value,
        },
      },
    }));
  };

  const copyToAllDays = (sourceDay: keyof WeeklySchedule) => {
    const sourceDaySchedule = scheduleData.weeklyScheduleJson[sourceDay];
    const updatedSchedule: WeeklySchedule = {} as WeeklySchedule;

    Object.keys(scheduleData.weeklyScheduleJson).forEach((day) => {
      updatedSchedule[day as keyof WeeklySchedule] = { ...sourceDaySchedule };
    });

    setScheduleData((prev) => ({
      ...prev,
      weeklyScheduleJson: updatedSchedule,
    }));

    toast.success(`Copied ${sourceDay} schedule to all days`);
  };

  const days: (keyof WeeklySchedule)[] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Clinician Schedule Management</h1>
        <p className="text-gray-600">Configure weekly schedules and availability</p>
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
          {/* General Settings */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-purple-100 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">General Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={scheduleData.acceptNewClients}
                    onChange={(e) =>
                      setScheduleData((prev) => ({
                        ...prev,
                        acceptNewClients: e.target.checked,
                      }))
                    }
                    className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-semibold text-gray-700">Accept New Clients</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Max Appointments Per Day
                </label>
                <input
                  type="number"
                  value={scheduleData.maxAppointmentsPerDay || ''}
                  onChange={(e) =>
                    setScheduleData((prev) => ({
                      ...prev,
                      maxAppointmentsPerDay: e.target.value ? parseInt(e.target.value) : undefined,
                    }))
                  }
                  className="w-full px-4 py-2 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="No limit"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Max Appointments Per Week
                </label>
                <input
                  type="number"
                  value={scheduleData.maxAppointmentsPerWeek || ''}
                  onChange={(e) =>
                    setScheduleData((prev) => ({
                      ...prev,
                      maxAppointmentsPerWeek: e.target.value ? parseInt(e.target.value) : undefined,
                    }))
                  }
                  className="w-full px-4 py-2 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="No limit"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Buffer Time Between Appointments (minutes)
                </label>
                <input
                  type="number"
                  value={scheduleData.bufferTimeBetweenAppointments || 0}
                  onChange={(e) =>
                    setScheduleData((prev) => ({
                      ...prev,
                      bufferTimeBetweenAppointments: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-4 py-2 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Weekly Schedule */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-purple-100 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Weekly Schedule</h2>

            <div className="space-y-4">
              {days.map((day) => {
                const daySchedule = scheduleData.weeklyScheduleJson[day];
                return (
                  <div key={day} className="border-2 border-purple-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <input
                          type="checkbox"
                          checked={daySchedule.isAvailable}
                          onChange={(e) => updateDaySchedule(day, 'isAvailable', e.target.checked)}
                          className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <span className="text-lg font-semibold text-gray-900 capitalize">
                          {day}
                        </span>
                      </div>
                      <button
                        onClick={() => copyToAllDays(day)}
                        className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                      >
                        Copy to All Days
                      </button>
                    </div>

                    {daySchedule.isAvailable && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <TimePicker
                          label="Start Time"
                          value={daySchedule.startTime}
                          onChange={(time) => updateDaySchedule(day, 'startTime', time)}
                        />
                        <TimePicker
                          label="End Time"
                          value={daySchedule.endTime}
                          onChange={(time) => updateDaySchedule(day, 'endTime', time)}
                        />
                        <TimePicker
                          label="Break Start (Optional)"
                          value={daySchedule.breakStartTime || ''}
                          onChange={(time) => updateDaySchedule(day, 'breakStartTime', time)}
                        />
                        <TimePicker
                          label="Break End (Optional)"
                          value={daySchedule.breakEndTime || ''}
                          onChange={(time) => updateDaySchedule(day, 'breakEndTime', time)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveSchedule}
              disabled={saveScheduleMutation.isPending}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg disabled:opacity-50"
            >
              {saveScheduleMutation.isPending ? 'Saving...' : 'Save Schedule'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
