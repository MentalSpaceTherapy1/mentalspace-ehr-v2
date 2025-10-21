import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../../../lib/api';
import {
  FormSection,
  TextField,
  TextAreaField,
  SelectField,
  CheckboxField,
  FormActions,
} from '../../../components/ClinicalNotes/SharedFormComponents';
import SessionInputBox from '../../../components/AI/SessionInputBox';
import ReviewModal from '../../../components/AI/ReviewModal';
import AppointmentPicker from '../../../components/ClinicalNotes/AppointmentPicker';
import ScheduleHeader from '../../../components/ClinicalNotes/ScheduleHeader';
import CreateAppointmentModal from '../../../components/ClinicalNotes/CreateAppointmentModal';

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
  const { clientId, noteId } = useParams();
  const isEditMode = !!noteId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Get appointmentId from URL query parameters
  const [searchParams] = useSearchParams();
  const appointmentIdFromURL = searchParams.get('appointmentId') || '';

  // Appointment selection state
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>(appointmentIdFromURL);
  const [appointmentData, setAppointmentData] = useState<any>(null);
  const [showAppointmentPicker, setShowAppointmentPicker] = useState(!appointmentIdFromURL && !isEditMode);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const appointmentId = selectedAppointmentId;

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

  // AI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState<Record<string, any> | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [aiConfidence, setAiConfidence] = useState<number>(0);

  // Fetch client data
  const { data: clientData } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const response = await api.get(`/clients/${clientId}`);
      return response.data.data;
    },
    enabled: !!clientId,
  });

  // Fetch existing note data if in edit mode
  const { data: existingNoteData, isLoading: isLoadingNote } = useQuery({
    queryKey: ['clinical-note', noteId],
    queryFn: async () => {
      const response = await api.get(`/clinical-notes/${noteId}`);
      return response.data.data;
    },
    enabled: isEditMode && !!noteId,
  });

  // Fetch eligible appointments
  const { data: eligibleAppointmentsData } = useQuery({
    queryKey: ['eligible-appointments', clientId, 'Cancellation Note'],
    queryFn: async () => {
      const response = await api.get(
        `/clinical-notes/client/${clientId}/eligible-appointments/Cancellation%20Note`
      );
      return response.data.data;
    },
    enabled: !!clientId,
  });

  // Fetch appointment data
  useEffect(() => {
    const fetchAppointmentData = async () => {
      if (selectedAppointmentId && !appointmentData) {
        try {
          const response = await api.get(`/appointments/${selectedAppointmentId}`);
          const apt = response.data.data;
          setAppointmentData(apt);

          if (apt.appointmentDate) {
            const date = new Date(apt.appointmentDate);
            setCancellationDate(date.toISOString().split('T')[0]);
          }
        } catch (error) {
          console.error('Error fetching appointment data:', error);
        }
      }
    };
    fetchAppointmentData();
  }, [selectedAppointmentId, appointmentData]);

  const handleAppointmentSelect = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setShowAppointmentPicker(false);
  };

  const handleAppointmentCreated = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setShowCreateModal(false);
    setShowAppointmentPicker(false);
  };

  // Populate form fields from existingNoteData when in edit mode
  useEffect(() => {
    if (existingNoteData && isEditMode) {
      // Set appointment ID from existing note
      if (existingNoteData.appointmentId) {
        setSelectedAppointmentId(existingNoteData.appointmentId);
      }

      // Cancellation date and time
      if (existingNoteData.sessionDate) {
        const date = new Date(existingNoteData.sessionDate);
        setCancellationDate(date.toISOString().split('T')[0]);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        setCancellationTime(`${hours}:${minutes}`);
      }

      // Cancellation details
      if (existingNoteData.cancelledBy) setCancelledBy(existingNoteData.cancelledBy);
      if (existingNoteData.notificationMethod) setNotificationMethod(existingNoteData.notificationMethod);
      if (existingNoteData.reason) setReason(existingNoteData.reason);

      // Rescheduling
      if (existingNoteData.rescheduled !== undefined) setRescheduled(existingNoteData.rescheduled);
      if (existingNoteData.newAppointmentDate) {
        const newDate = new Date(existingNoteData.newAppointmentDate);
        setNewAppointmentDate(newDate.toISOString().split('T')[0]);
        const hours = newDate.getHours().toString().padStart(2, '0');
        const minutes = newDate.getMinutes().toString().padStart(2, '0');
        setNewAppointmentTime(`${hours}:${minutes}`);
      }

      // Parse notes from plan field
      if (existingNoteData.plan) {
        setNotes(existingNoteData.plan);
      }

      // Billing
      if (existingNoteData.billable !== undefined) setBillable(existingNoteData.billable);
    }
  }, [existingNoteData, isEditMode]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEditMode) {
        return api.put(`/clinical-notes/${noteId}`, data);
      }
      return api.post('/clinical-notes', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-notes', clientId] });
      queryClient.invalidateQueries({ queryKey: ['my-notes'] });
      navigate(`/clients/${clientId}/notes`);
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEditMode) {
        return api.put(`/clinical-notes/${noteId}`, data);
      }
      return api.post('/clinical-notes', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-notes', clientId] });
      queryClient.invalidateQueries({ queryKey: ['my-notes'] });
      navigate(`/clients/${clientId}/notes`);
    },
  });

  // AI Handler Functions
  const handleGenerateFromTranscription = async (sessionNotes: string) => {
    setIsGenerating(true);
    try {
      const response = await api.post('/ai/generate-note', {
        noteType: 'Cancellation Note',
        transcript: sessionNotes,
        clientInfo: {
          firstName: 'Client',
          lastName: '',
          age: undefined,
          diagnoses: [],
          presentingProblems: [],
        },
      });

      setGeneratedData(response.data.generatedContent);
      setAiWarnings(response.data.warnings || []);
      setAiConfidence(response.data.confidence || 0);
      setShowReviewModal(true);
    } catch (error) {
      console.error('AI generation error:', error);
      setAiWarnings(['Failed to generate note. Please try again.']);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptGenerated = (data: Record<string, any>) => {
    // Map all fields from generated data to form state
    if (data.cancellationDate) setCancellationDate(data.cancellationDate);
    if (data.cancellationTime) setCancellationTime(data.cancellationTime);
    if (data.cancelledBy) setCancelledBy(data.cancelledBy);
    if (data.notificationDate) {
      // Handle notification date if needed
    }
    if (data.notificationTime) {
      // Handle notification time if needed
    }
    if (data.reason) setReason(data.reason);
    if (data.notificationMethod) setNotificationMethod(data.notificationMethod);
    if (data.noticeGiven) {
      // Handle notice given if needed
    }
    if (data.rescheduled !== undefined) setRescheduled(data.rescheduled);
    if (data.newAppointmentDate) setNewAppointmentDate(data.newAppointmentDate);
    if (data.newAppointmentTime) setNewAppointmentTime(data.newAppointmentTime);
    if (data.notes) setNotes(data.notes);
    if (data.billable !== undefined) setBillable(data.billable);
    if (data.feeCharged !== undefined) {
      // Handle fee charged if needed
    }
    if (data.feeAmount) {
      // Handle fee amount if needed
    }

    setShowReviewModal(false);
    setGeneratedData(null);
  };

  const handleSaveDraft = (e: React.FormEvent) => {
    

    const cancellationDateTime = cancellationDate && cancellationTime
      ? new Date(`${cancellationDate}T${cancellationTime}`)
      : null;
    const newDateTime = rescheduled && newAppointmentDate && newAppointmentTime
      ? new Date(`${newAppointmentDate}T${newAppointmentTime}`)
      : null;

    const data = {
      clientId,
      noteType: 'Cancellation Note',
      appointmentId: appointmentId,
      sessionDate: cancellationDateTime ? cancellationDateTime.toISOString() : undefined,
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
      newAppointmentDate: newDateTime?.toISOString() || '',
      billable,
      dueDate: cancellationDateTime ? cancellationDateTime.toISOString() : undefined,
      status: 'DRAFT',
    };

    saveDraftMutation.mutate(data);
  };

  const handleSubmit = (e: React.FormEvent) => {
    

    const cancellationDateTime = new Date(`${cancellationDate}T${cancellationTime}`);
    const newDateTime = rescheduled && newAppointmentDate && newAppointmentTime
      ? new Date(`${newAppointmentDate}T${newAppointmentTime}`)
      : null;

    const data = {
      clientId,
      noteType: 'Cancellation Note',
      appointmentId: appointmentId,
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
      newAppointmentDate: newDateTime?.toISOString() || '',
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

        {/* Client ID Validation */}
        {!clientId && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-semibold text-red-700">Error: No client ID found.</p>
            </div>
          </div>
        )}

        {/* AI Warnings */}
        {aiWarnings.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-sm">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                {aiWarnings.map((warning, index) => (
                  <p key={index} className="text-sm text-yellow-700">{warning}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Save Mutation Error */}
        {saveMutation.isError && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-semibold text-red-700">
                {(saveMutation.error as any)?.response?.data?.message || 'Failed to save cancellation note'}
              </p>
            </div>
          </div>
        )}

        {/* Appointment Selection */}
        {showAppointmentPicker && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <AppointmentPicker
              clientId={clientId!}
              noteType="Cancellation Note"
              onSelect={handleAppointmentSelect}
              onCreateNew={() => {
                setShowAppointmentPicker(false);
                setShowCreateModal(true);
              }}
            />
          </div>
        )}

        {/* Create Appointment Modal */}
        {showCreateModal && eligibleAppointmentsData && (
          <CreateAppointmentModal
            isOpen={showCreateModal}
            onClose={() => {
              setShowCreateModal(false);
              setShowAppointmentPicker(true);
            }}
            clientId={clientId!}
            noteType="Cancellation Note"
            defaultConfig={eligibleAppointmentsData.defaultConfig}
            onAppointmentCreated={handleAppointmentCreated}
          />
        )}

        {/* Form - only shown after appointment is selected */}
        {!showAppointmentPicker && selectedAppointmentId && (
          <form onSubmit={() => handleSubmit({} as any)} className="space-y-6">
            {/* Schedule Header */}
            {appointmentData && (
              <ScheduleHeader
                appointmentDate={appointmentData.appointmentDate}
                startTime={appointmentData.startTime}
                endTime={appointmentData.endTime}
                duration={appointmentData.duration || 45}
                serviceCode={appointmentData.serviceCode}
                location={appointmentData.location}
                sessionType={appointmentData.appointmentType}
                clientName={clientData ? `${clientData.firstName} ${clientData.lastName}` : ''}
                clientDOB={clientData?.dateOfBirth}
                editable={false}
              />
            )}

            {/* AI-Powered Note Generation */}
            <SessionInputBox
              onGenerate={handleGenerateFromTranscription}
              isGenerating={isGenerating}
              noteType="Cancellation Note"
            />

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
              onSubmit={() => handleSubmit({} as any)}
              submitLabel={isEditMode ? "Update Cancellation Note" : "Create Cancellation Note"}
              isSubmitting={saveMutation.isPending}
              onSaveDraft={() => handleSaveDraft({} as any)}
              isSavingDraft={saveDraftMutation.isPending}
            />
          </form>
        )}

        {/* Review Generated Content Modal */}
        {generatedData && (
          <ReviewModal
            isOpen={showReviewModal}
            onClose={() => setShowReviewModal(false)}
            generatedData={generatedData}
            onAccept={handleAcceptGenerated}
            onReject={() => {
              setShowReviewModal(false);
              setGeneratedData(null);
            }}
            noteType="Cancellation Note"
            warnings={aiWarnings}
            confidence={aiConfidence}
          />
        )}
      </div>
    </div>
  );
}
