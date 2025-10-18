import React, { useState } from 'react';
import {
  DocumentTextIcon,
  ClockIcon,
  LockClosedIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline';

interface ClinicalDocTabProps {
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

export default function ClinicalDocTab({ settings, onSave }: ClinicalDocTabProps) {
  const [formData, setFormData] = useState({
    defaultNoteDueDays: settings?.defaultNoteDueDays || 3,
    requireCosignForAssociates: settings?.requireCosignForAssociates ?? true,
    enableAutoLockout: settings?.enableAutoLockout ?? true,
    lockoutDay: settings?.lockoutDay || 'Sunday',
    lockoutTime: settings?.lockoutTime || '23:59',
    enableNoteReminders: settings?.enableNoteReminders ?? true,
    noteReminderSchedule: settings?.noteReminderSchedule || [2, 1, 0],
    allowLateNoteCompletion: settings?.allowLateNoteCompletion ?? false,
    requireSignatureForCompletion: settings?.requireSignatureForCompletion ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl">
            <DocumentTextIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Clinical Documentation Settings</h2>
            <p className="text-gray-600 mt-1">
              Configure note completion deadlines, co-signing requirements, and compliance automation
            </p>
          </div>
        </div>
      </div>

      {/* Note Due Date Settings */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <ClockIcon className="h-6 w-6 text-indigo-600" />
          <h3 className="text-xl font-bold text-gray-900">Note Completion Deadlines</h3>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Note Due Days: <span className="text-indigo-600 font-bold">{formData.defaultNoteDueDays} days</span>
          </label>
          <input
            type="range"
            min="1"
            max="14"
            value={formData.defaultNoteDueDays}
            onChange={(e) =>
              setFormData({ ...formData, defaultNoteDueDays: parseInt(e.target.value) })
            }
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>1 day</span>
            <span>7 days</span>
            <span>14 days</span>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Clinical notes must be completed within this many days after the session date
          </p>
        </div>

        <Toggle
          label="Require Signature for Completion"
          description="Notes must be digitally signed before marking as complete"
          checked={formData.requireSignatureForCompletion}
          onChange={(checked) =>
            setFormData({ ...formData, requireSignatureForCompletion: checked })
          }
        />

        <Toggle
          label="Allow Late Note Completion"
          description="Permit completion of notes after the due date has passed"
          checked={formData.allowLateNoteCompletion}
          onChange={(checked) =>
            setFormData({ ...formData, allowLateNoteCompletion: checked })
          }
        />
      </div>

      {/* Co-Signing Requirements */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <DocumentTextIcon className="h-6 w-6 text-indigo-600" />
          <h3 className="text-xl font-bold text-gray-900">Co-Signing Requirements</h3>
        </div>

        <Toggle
          label="Require Co-Sign for Associates"
          description="Clinical notes from associates/supervisees must be co-signed by their supervisor"
          checked={formData.requireCosignForAssociates}
          onChange={(checked) =>
            setFormData({ ...formData, requireCosignForAssociates: checked })
          }
        />

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Associates are users with the role "ASSOCIATE" or those marked
            as "Under Supervision" in their profile.
          </p>
        </div>
      </div>

      {/* Sunday Lockout Configuration */}
      <div className="bg-white border-2 border-red-200 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <LockClosedIcon className="h-6 w-6 text-red-600" />
          <h3 className="text-xl font-bold text-gray-900">Automatic Note Lockout</h3>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-800">
            <strong>Compliance Feature:</strong> Automatically locks unsigned clinical notes that
            exceed the due date. This ensures timely documentation and compliance with Georgia
            mental health practice requirements.
          </p>
        </div>

        <Toggle
          label="Enable Automatic Lockout"
          description="Automatically lock unsigned notes past their due date on a scheduled day/time"
          checked={formData.enableAutoLockout}
          onChange={(checked) => setFormData({ ...formData, enableAutoLockout: checked })}
        />

        {formData.enableAutoLockout && (
          <div className="space-y-4 pl-4 border-l-4 border-red-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lockout Day
                </label>
                <select
                  value={formData.lockoutDay}
                  onChange={(e) => setFormData({ ...formData, lockoutDay: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  {daysOfWeek.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500">Day of the week to run lockout</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lockout Time
                </label>
                <input
                  type="time"
                  value={formData.lockoutTime}
                  onChange={(e) => setFormData({ ...formData, lockoutTime: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                <p className="mt-2 text-xs text-gray-500">Time to run lockout (24-hour format)</p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Current Schedule:</strong> Notes will be automatically locked every{' '}
                <strong>{formData.lockoutDay}</strong> at{' '}
                <strong>{formData.lockoutTime}</strong> if they are unsigned and past their due
                date.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Note Reminders */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <BellAlertIcon className="h-6 w-6 text-indigo-600" />
          <h3 className="text-xl font-bold text-gray-900">Note Reminders</h3>
        </div>

        <Toggle
          label="Enable Note Reminders"
          description="Send email reminders to clinicians about pending clinical notes"
          checked={formData.enableNoteReminders}
          onChange={(checked) => setFormData({ ...formData, enableNoteReminders: checked })}
        />

        {formData.enableNoteReminders && (
          <div className="pl-4 border-l-4 border-indigo-300">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Reminder Schedule (Days Before Due Date)
              </label>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.noteReminderSchedule.includes(2)}
                    onChange={(e) => {
                      const schedule = e.target.checked
                        ? [...formData.noteReminderSchedule, 2].sort((a, b) => b - a)
                        : formData.noteReminderSchedule.filter((d: number) => d !== 2);
                      setFormData({ ...formData, noteReminderSchedule: schedule });
                    }}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="ml-3 text-sm text-gray-700">2 days before due date</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.noteReminderSchedule.includes(1)}
                    onChange={(e) => {
                      const schedule = e.target.checked
                        ? [...formData.noteReminderSchedule, 1].sort((a, b) => b - a)
                        : formData.noteReminderSchedule.filter((d: number) => d !== 1);
                      setFormData({ ...formData, noteReminderSchedule: schedule });
                    }}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="ml-3 text-sm text-gray-700">1 day before due date</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.noteReminderSchedule.includes(0)}
                    onChange={(e) => {
                      const schedule = e.target.checked
                        ? [...formData.noteReminderSchedule, 0].sort((a, b) => b - a)
                        : formData.noteReminderSchedule.filter((d: number) => d !== 0);
                      setFormData({ ...formData, noteReminderSchedule: schedule });
                    }}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="ml-3 text-sm text-gray-700">On due date</span>
                </label>
              </div>

              <p className="mt-3 text-sm text-gray-600">
                Selected reminders:{' '}
                <strong>
                  {formData.noteReminderSchedule.length > 0
                    ? formData.noteReminderSchedule
                        .sort((a: number, b: number) => b - a)
                        .map((d: number) => (d === 0 ? 'Due date' : `${d} day${d > 1 ? 's' : ''} before`))
                        .join(', ')
                    : 'None'}
                </strong>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-6 border-t-2 border-gray-200">
        <button
          type="submit"
          className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <DocumentTextIcon className="h-5 w-5" />
          Save Clinical Documentation Settings
        </button>
      </div>
    </form>
  );
}
