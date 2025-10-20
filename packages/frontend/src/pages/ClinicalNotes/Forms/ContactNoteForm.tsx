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
import CPTCodeAutocomplete from '../../../components/ClinicalNotes/CPTCodeAutocomplete';
import AppointmentPicker from '../../../components/ClinicalNotes/AppointmentPicker';
import ScheduleHeader from '../../../components/ClinicalNotes/ScheduleHeader';
import CreateAppointmentModal from '../../../components/ClinicalNotes/CreateAppointmentModal';
import SessionInputBox from '../../../components/AI/SessionInputBox';
import ReviewModal from '../../../components/AI/ReviewModal';

const CONTACT_TYPE_OPTIONS = [
  { value: 'Phone', label: 'Phone' },
  { value: 'Email', label: 'Email' },
  { value: 'Text', label: 'Text' },
  { value: 'Video', label: 'Video' },
  { value: 'Other', label: 'Other' },
];

export default function ContactNoteForm() {
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

  const [contactDate, setContactDate] = useState('');
  const [contactTime, setContactTime] = useState('');

  // Contact Details
  const [contactType, setContactType] = useState('');
  const [duration, setDuration] = useState('');
  const [purpose, setPurpose] = useState('');
  const [summary, setSummary] = useState('');
  const [followUpNeeded, setFollowUpNeeded] = useState(false);

  // Billing
  const [cptCode, setCptCode] = useState('');
  const [billingCode, setBillingCode] = useState('');
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
    queryKey: ['eligible-appointments', clientId, 'Contact Note'],
    queryFn: async () => {
      const response = await api.get(
        `/clinical-notes/client/${clientId}/eligible-appointments/Contact%20Note`
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
          setAppointmentData(response.data.data);
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

      // Contact date and time
      if (existingNoteData.sessionDate) {
        const date = new Date(existingNoteData.sessionDate);
        setContactDate(date.toISOString().split('T')[0]);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        setContactTime(`${hours}:${minutes}`);
      }

      // Contact details
      if (existingNoteData.contactType) setContactType(existingNoteData.contactType);
      if (existingNoteData.duration) setDuration(existingNoteData.duration);
      if (existingNoteData.purpose) setPurpose(existingNoteData.purpose);
      if (existingNoteData.summary) setSummary(existingNoteData.summary);
      if (existingNoteData.followUpNeeded !== undefined) setFollowUpNeeded(existingNoteData.followUpNeeded);

      // Billing
      if (existingNoteData.cptCode) setCptCode(existingNoteData.cptCode);
      if (existingNoteData.billingCode) setBillingCode(existingNoteData.billingCode);
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
      navigate(`/clients/${clientId}/notes`);
    },
  });

  // AI Handler Functions
  const handleGenerateFromTranscription = async (sessionNotes: string) => {
    setIsGenerating(true);
    try {
      const response = await api.post('/ai/generate-note', {
        noteType: 'Contact Note',
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
    if (data.contactDate) setContactDate(data.contactDate);
    if (data.contactTime) setContactTime(data.contactTime);
    if (data.contactType) setContactType(data.contactType);
    if (data.initiatedBy) {
      // Handle initiated by if needed
    }
    if (data.duration) setDuration(String(data.duration));
    if (data.purpose) setPurpose(data.purpose);
    if (data.summary) setSummary(data.summary);
    if (data.clientStatus) {
      // Handle client status if needed
    }
    if (data.riskAssessment) {
      // Handle risk assessment if needed
    }
    if (data.actionTaken) {
      // Handle action taken if needed
    }
    if (data.followUpNeeded !== undefined) setFollowUpNeeded(data.followUpNeeded);
    if (data.followUpPlan) {
      // Handle follow up plan if needed
    }
    if (data.billable !== undefined) setBillable(data.billable);

    setShowReviewModal(false);
    setGeneratedData(null);
  };

  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault();

    const contactDateTime = contactDate && contactTime
      ? new Date(`${contactDate}T${contactTime}`)
      : null;

    const data = {
      clientId,
      noteType: 'Contact Note',
      appointmentId: appointmentId,
      sessionDate: contactDateTime ? contactDateTime.toISOString() : undefined,
      subjective: `Type: ${contactType}\nDuration: ${duration}\n\nPurpose: ${purpose}`,
      objective: summary,
      assessment: followUpNeeded ? 'Follow-up needed' : 'No follow-up needed',
      plan: followUpNeeded ? 'Schedule follow-up contact or session' : 'Continue as planned',
      contactType,
      duration,
      purpose,
      summary,
      followUpNeeded,
      cptCode,
      billingCode,
      billable,
      dueDate: contactDateTime ? contactDateTime.toISOString() : undefined,
      status: 'DRAFT',
    };

    saveDraftMutation.mutate(data);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const contactDateTime = new Date(`${contactDate}T${contactTime}`);

    const data = {
      clientId,
      noteType: 'Contact Note',
      appointmentId: appointmentId,
      sessionDate: contactDateTime.toISOString(),
      subjective: `Type: ${contactType}\nDuration: ${duration}\n\nPurpose: ${purpose}`,
      objective: summary,
      assessment: followUpNeeded ? 'Follow-up needed' : 'No follow-up needed',
      plan: followUpNeeded ? 'Schedule follow-up contact or session' : 'Continue as planned',
      contactType,
      duration,
      purpose,
      summary,
      followUpNeeded,
      cptCode,
      billingCode,
      billable,
      dueDate: contactDateTime.toISOString(),
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
            Contact Note
          </h1>
          <p className="text-gray-600 mt-2">Document brief client contact</p>
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
                {(saveMutation.error as any)?.response?.data?.message || 'Failed to save contact note'}
              </p>
            </div>
          </div>
        )}

        
        {/* Appointment Selection */}
        {showAppointmentPicker && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <AppointmentPicker
              clientId={clientId!}
              noteType="Contact Note"
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
            noteType="Contact Note"
            defaultConfig={eligibleAppointmentsData.defaultConfig}
            onAppointmentCreated={handleAppointmentCreated}
          />
        )}

        {/* Form - only shown after appointment is selected */}
        {!showAppointmentPicker && selectedAppointmentId && (
          <form onSubmit={() => handleSubmit({} as React.FormEvent)} className="space-y-6">
          {/* AI-Powered Note Generation */}
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

            <SessionInputBox
            onGenerate={handleGenerateFromTranscription}
            isGenerating={isGenerating}
            noteType="Contact Note"
          />

          {/* Contact Details */}
          <FormSection title="Contact Details" number={1}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TextField
                  label="Contact Date"
                  type="date"
                  value={contactDate}
                  onChange={setContactDate}
                  required
                />
                <TextField
                  label="Contact Time"
                  type="time"
                  value={contactTime}
                  onChange={setContactTime}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SelectField
                  label="Type of Contact"
                  value={contactType}
                  onChange={setContactType}
                  options={CONTACT_TYPE_OPTIONS}
                  required
                />
                <TextField
                  label="Duration"
                  value={duration}
                  onChange={setDuration}
                  required
                  placeholder="e.g., 10 minutes, 15 minutes"
                />
              </div>
            </div>
          </FormSection>

          {/* Additional Notes */}
          <FormSection title="Additional Notes" number={2}>
            <div className="space-y-6">
              <TextAreaField
                label="Purpose of Contact"
                value={purpose}
                onChange={setPurpose}
                required
                rows={3}
                placeholder="Reason for the contact (e.g., check-in, crisis support, medication question, scheduling)..."
              />

              <TextAreaField
                label="Summary of Contact"
                value={summary}
                onChange={setSummary}
                required
                rows={5}
                placeholder="Brief summary of what was discussed, any concerns raised, and outcomes..."
              />

              <CheckboxField
                label="Follow-up Needed"
                checked={followUpNeeded}
                onChange={setFollowUpNeeded}
              />
            </div>
          </FormSection>

          {/* Billing */}
          <FormSection title="Billing Information" number={3}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    CPT Code
                  </label>
                  <p className="text-xs text-gray-600 mb-2">
                    Brief contacts often use 99xxx codes
                  </p>
                  <CPTCodeAutocomplete value={cptCode} onChange={setCptCode} />
                </div>

                <TextField
                  label="Billing Code"
                  value={billingCode}
                  onChange={setBillingCode}
                  placeholder="Internal billing code"
                />
              </div>

              <CheckboxField
                label="Billable Service"
                checked={billable}
                onChange={setBillable}
              />
            </div>
          </FormSection>

          {/* Form Actions */}
          <FormActions
            onCancel={() => navigate(`/clients/${clientId}/notes`)}
            onSubmit={() => handleSubmit({} as React.FormEvent)}
            submitLabel={isEditMode ? "Update Contact Note" : "Create Contact Note"}
            isSubmitting={saveMutation.isPending}
            onSaveDraft={() => handleSaveDraft({} as React.FormEvent)}
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
            noteType="Contact Note"
            warnings={aiWarnings}
            confidence={aiConfidence}
          />
        )}
      </div>
    </div>
  );
}
