import React, { useState } from 'react';
import {
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  QueueListIcon,
} from '@heroicons/react/24/outline';

interface SchedulingTabProps {
  settings: any;
  onSave: (updates: any) => void;
}

const Toggle: React.FC<{
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-100">
    <div className="flex-1">
      <p className="font-bold text-gray-800">{label}</p>
      {description && <p className="text-sm text-gray-600">{description}</p>}
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-purple-600"></div>
    </label>
  </div>
);

export default function SchedulingTab({ settings, onSave }: SchedulingTabProps) {
  const [formData, setFormData] = useState({
    defaultAppointmentDuration: settings?.defaultAppointmentDuration || 50,
    enableOnlineBooking: settings?.enableOnlineBooking ?? false,
    enableWaitlist: settings?.enableWaitlist ?? true,
    enableRecurringAppointments: settings?.enableRecurringAppointments ?? true,
    cancellationNoticePeriod: settings?.cancellationNoticePeriod || 24,
    enableCancellationFees: settings?.enableCancellationFees ?? false,
    cancellationFeeAmount: settings?.cancellationFeeAmount || '',
    noShowFeeAmount: settings?.noShowFeeAmount || '',
    bufferBetweenAppointments: settings?.bufferBetweenAppointments || 10,
    maxAdvanceBookingDays: settings?.maxAdvanceBookingDays || 90,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const durationOptions = [15, 30, 45, 50, 60, 75, 90, 120];

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl">
            <CalendarIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Scheduling Settings</h2>
            <p className="text-gray-600 mt-1">
              Configure appointment durations, booking policies, and scheduling rules
            </p>
          </div>
        </div>
      </div>

      {/* Appointment Duration Settings */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <ClockIcon className="h-6 w-6 text-green-600" />
          <h3 className="text-xl font-bold text-gray-900">Appointment Duration</h3>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Appointment Duration
          </label>
          <select
            value={formData.defaultAppointmentDuration}
            onChange={(e) =>
              setFormData({ ...formData, defaultAppointmentDuration: parseInt(e.target.value) })
            }
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            {durationOptions.map((duration) => (
              <option key={duration} value={duration}>
                {duration} minutes
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm text-gray-600">
            Standard duration for new appointments (can be customized per appointment)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Buffer Between Appointments: <span className="text-green-600 font-bold">{formData.bufferBetweenAppointments} minutes</span>
          </label>
          <input
            type="range"
            min="0"
            max="60"
            step="5"
            value={formData.bufferBetweenAppointments}
            onChange={(e) =>
              setFormData({ ...formData, bufferBetweenAppointments: parseInt(e.target.value) })
            }
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>No buffer</span>
            <span>30 min</span>
            <span>60 min</span>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Time gap between consecutive appointments for documentation and breaks
          </p>
        </div>
      </div>

      {/* Booking Features */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <CalendarIcon className="h-6 w-6 text-green-600" />
          <h3 className="text-xl font-bold text-gray-900">Booking Features</h3>
        </div>

        <Toggle
          label="Enable Online Booking"
          description="Allow clients to book appointments through the client portal"
          checked={formData.enableOnlineBooking}
          onChange={(checked) => setFormData({ ...formData, enableOnlineBooking: checked })}
        />

        <Toggle
          label="Enable Waitlist"
          description="Maintain a waitlist for clients waiting for appointment openings"
          checked={formData.enableWaitlist}
          onChange={(checked) => setFormData({ ...formData, enableWaitlist: checked })}
        />

        <Toggle
          label="Enable Recurring Appointments"
          description="Allow scheduling of recurring appointments (weekly, bi-weekly, monthly)"
          checked={formData.enableRecurringAppointments}
          onChange={(checked) =>
            setFormData({ ...formData, enableRecurringAppointments: checked })
          }
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maximum Advance Booking
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              max="365"
              value={formData.maxAdvanceBookingDays}
              onChange={(e) =>
                setFormData({ ...formData, maxAdvanceBookingDays: parseInt(e.target.value) })
              }
              className="w-32 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <span className="text-gray-700">days in advance</span>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            How far in advance clients can book appointments
          </p>
        </div>
      </div>

      {/* Cancellation Policies */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <QueueListIcon className="h-6 w-6 text-orange-600" />
          <h3 className="text-xl font-bold text-gray-900">Cancellation Policies</h3>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cancellation Notice Period
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              max="168"
              value={formData.cancellationNoticePeriod}
              onChange={(e) =>
                setFormData({ ...formData, cancellationNoticePeriod: parseInt(e.target.value) })
              }
              className="w-32 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            <span className="text-gray-700">hours before appointment</span>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Minimum notice required for cancellations without penalty
          </p>
        </div>

        <Toggle
          label="Enable Cancellation Fees"
          description="Charge fees for late cancellations and no-shows"
          checked={formData.enableCancellationFees}
          onChange={(checked) => setFormData({ ...formData, enableCancellationFees: checked })}
        />

        {formData.enableCancellationFees && (
          <div className="space-y-4 pl-4 border-l-4 border-orange-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Late Cancellation Fee
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cancellationFeeAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, cancellationFeeAmount: e.target.value })
                    }
                    className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="0.00"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Fee for cancellations within the notice period
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  No-Show Fee
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.noShowFeeAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, noShowFeeAmount: e.target.value })
                    }
                    className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="0.00"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Fee for missed appointments without notice
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Cancellation and no-show fees will be automatically created
                as charge entries in the billing module when applicable.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-6 border-t-2 border-gray-200">
        <button
          type="submit"
          className="px-8 py-4 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <CalendarIcon className="h-5 w-5" />
          Save Scheduling Settings
        </button>
      </div>
    </form>
  );
}
