import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import {
  FormSection,
  TextField,
  TextAreaField,
  SelectField,
  CheckboxField,
  FormActions,
} from '../../../components/ClinicalNotes/SharedFormComponents';

const CANCELLED_BY_OPTIONS = [
  { value: 'Client', label: 'Client' },
  { value: 'Therapist', label: 'Therapist' },
  { value: 'Other', label: 'Other' },
];

const NOTIFICATION_METHOD_OPTIONS = [
  { value: 'Phone', label: 'Phone' },
  { value: 'Email', label: 'Email' },
  { value: 'Text', label: 'Text' },
  { value: 'In-person', label: 'In-person' },
  { value: 'Other', label: 'Other' },
];

export default function CancellationNoteForm() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [cancellationDate, setCancellationDate] = useState('');
  const [cancellationTime, setCancellationTime] = useState('');

  const [cancelledBy, setCancelledBy] = useState('');
  const [reason, setReason] = useState('');
  const [notificationMethod, setNotificationMethod] = useState('');

  const [rescheduled, setRescheduled] = useState(false);
  const [newAppointmentDate, setNewAppointmentDate] = useState('');
  const [newAppointmentTime, setNewAppointmentTime] = useState('');

  const [notes, setNotes] = useState('');
  const [billable, setBillable] = useState(false);


  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/clinical-notes', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-notes', clientId] });
      navigate(`/clients/${clientId}/notes`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cancellationDateTime = new Date(`${cancellationDate}T${cancellationTime}`);
    const newDateTime = rescheduled && newAppointmentDate && newAppointmentTime
      ? new Date(`${newAppointmentDate}T${newAppointmentTime}`)
      : null;

    const data = {
      clientId,
      noteType: 'Cancellation Note',
      appointmentId: 'temp-appointment-id',
      sessionDate: cancellationDateTime.toISOString(),
      subjective: `Appointment cancelled by: ${cancelledBy}\nNotification method: ${notificationMethod}\n\nReason: ${reason}`,
      objective: rescheduled
        ? `Rescheduled to: ${newDateTime?.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}`
        : 'Not rescheduled',
      assessment: `Cancellation documented`,
      plan: notes || 'Follow up as scheduled',
      cancelledBy,
      reason,
      notificationMethod,
      rescheduled,
      newAppointmentDate: newDateTime?.toISOString() || null,
      billable,
      dueDate: cancellationDateTime.toISOString(),
    };

    saveMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/clients/${clientId}/notes`)}
            className="flex items-center text-purple-600 hover:text-purple-800 mb-4 font-semibold transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Clinical Notes
          </button>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Cancellation Note
          </h1>
          <p className="text-gray-600 mt-2">Document appointment cancellation</p>
        </div>

        {/* Error Display */}
        {saveMutation.isError && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 p-4 rounded-lg shadow-sm">
            <p className="text-sm text-red-700">
              {(saveMutation.error as any)?.response?.data?.message || 'Failed to save cancellation note'}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cancellation Information */}
          <FormSection title="Cancellation Details" number={1}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TextField
                  label="Date of Cancellation"
                  type="date"
                  value={cancellationDate}
                  onChange={setCancellationDate}
                  required
                />
                <TextField
                  label="Time of Cancellation"
                  type="time"
                  value={cancellationTime}
                  onChange={setCancellationTime}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SelectField
                  label="Who Cancelled"
                  value={cancelledBy}
                  onChange={setCancelledBy}
                  options={CANCELLED_BY_OPTIONS}
                  required
                />
                <SelectField
                  label="How Notified"
                  value={notificationMethod}
                  onChange={setNotificationMethod}
                  options={NOTIFICATION_METHOD_OPTIONS}
                  required
                />
              </div>

              <TextAreaField
                label="Reason for Cancellation"
                value={reason}
                onChange={setReason}
                required
                rows={3}
                placeholder="Brief explanation of why the appointment was cancelled..."
              />
            </div>
          </FormSection>

          {/* Rescheduling Information */}
          <FormSection title="Rescheduling" number={2}>
            <div className="space-y-6">
              <CheckboxField
                label="Appointment Rescheduled"
                checked={rescheduled}
                onChange={setRescheduled}
              />

              {rescheduled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <TextField
                    label="New Appointment Date"
                    type="date"
                    value={newAppointmentDate}
                    onChange={setNewAppointmentDate}
                    required={rescheduled}
                  />
                  <TextField
                    label="New Appointment Time"
                    type="time"
                    value={newAppointmentTime}
                    onChange={setNewAppointmentTime}
                    required={rescheduled}
                  />
                </div>
              )}
            </div>
          </FormSection>

          {/* Additional Notes */}
          <FormSection title="Additional Information" number={3}>
            <div className="space-y-6">
              <TextAreaField
                label="Brief Notes"
                value={notes}
                onChange={setNotes}
                rows={4}
                placeholder="Any additional notes or context about the cancellation..."
              />

              <CheckboxField
                label="Billable (cancellation fee)"
                checked={billable}
                onChange={setBillable}
              />
            </div>
          </FormSection>

          {/* Form Actions */}
          <FormActions
            onCancel={() => navigate(`/clients/${clientId}/notes`)}
            onSubmit={handleSubmit}
            submitLabel="Create Cancellation Note"
            isSubmitting={saveMutation.isPending}
          />
        </form>
      </div>
    </div>
  );
}
