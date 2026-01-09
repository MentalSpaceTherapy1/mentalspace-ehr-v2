import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../../../lib/api';
import {
  FormSection,
  TextField,
  TextAreaField,
  CheckboxField,
  FormActions,
} from '../../../components/ClinicalNotes/SharedFormComponents';
import CPTCodeAutocomplete from '../../../components/ClinicalNotes/CPTCodeAutocomplete';
import AppointmentPicker from '../../../components/ClinicalNotes/AppointmentPicker';
import ScheduleHeader from '../../../components/ClinicalNotes/ScheduleHeader';
import CreateAppointmentModal from '../../../components/ClinicalNotes/CreateAppointmentModal';
import SessionInputBox from '../../../components/AI/SessionInputBox';
import ReviewModal from '../../../components/AI/ReviewModal';
import { useNoteValidation } from '../../../hooks/useNoteValidation';
import ValidationSummary from '../../../components/ClinicalNotes/ValidationSummary';
import useSessionSafeSave, { SessionExpiredAlert, RecoveredDraftAlert } from '../../../hooks/useSessionSafeSave';
import { useNoteSignature } from '../../../hooks/useNoteSignature';
import { SignatureModal } from '../../../components/ClinicalNotes/SignatureModal';

export default function ConsultationNoteForm() {
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

  const [sessionDate, setSessionDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Consultation Details
  const [consultedPerson, setConsultedPerson] = useState('');
  const [organization, setOrganization] = useState('');
  const [reasonForConsultation, setReasonForConsultation] = useState('');
  const [informationShared, setInformationShared] = useState('');
  const [recommendationsReceived, setRecommendationsReceived] = useState('');
  const [followUpActions, setFollowUpActions] = useState('');

  // Billing
  const [cptCode, setCptCode] = useState('');
  const [billingCode, setBillingCode] = useState('');
  const [billable, setBillable] = useState(true);

  const [nextSessionDate, setNextSessionDate] = useState('');

  // AI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState<Record<string, any> | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [aiConfidence, setAiConfidence] = useState<number>(0);

  // Session-safe saving (handles session timeout with local storage backup)
  const {
    sessionError,
    clearSessionError,
    backupToLocalStorage,
    clearBackup,
    handleSaveError,
    hasRecoveredDraft,
    applyRecoveredDraft,
    discardRecoveredDraft,
  } = useSessionSafeSave({
    noteType: 'ConsultationNote',
    clientId: clientId || '',
    noteId,
  });

  // Sign and Submit hook
  const {
    isSignatureModalOpen,
    isSaving: isSignSaving,
    isSigning,
    isSignAndSubmitting,
    initiateSignAndSubmit,
    signatureModalProps,
  } = useNoteSignature({
    noteType: 'Consultation Note',
    clientId: clientId || undefined,
    onSignSuccess: (noteId) => {
      clearBackup();
      queryClient.invalidateQueries({ queryKey: ['clinical-notes', clientId] });
      queryClient.invalidateQueries({ queryKey: ['my-notes'] });
      navigate(`/clients/${clientId}/notes`);
    },
  });

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

  // Auto-set due date to 7 days from session date
  useEffect(() => {
    if (sessionDate && !dueDate) {
      const date = new Date(sessionDate);
      date.setDate(date.getDate() + 7);
      setDueDate(date.toISOString().split('T')[0]);
    }
  }, [sessionDate]);

  // Populate form fields from existingNoteData when in edit mode
  useEffect(() => {
    if (existingNoteData && isEditMode) {
      // Set appointment ID from existing note
      if (existingNoteData.appointmentId) {
        setSelectedAppointmentId(existingNoteData.appointmentId);
      }

      // Session details
      if (existingNoteData.sessionDate) {
        const date = new Date(existingNoteData.sessionDate);
        setSessionDate(date.toISOString().split('T')[0]);
      }
      if (existingNoteData.dueDate) {
        const date = new Date(existingNoteData.dueDate);
        setDueDate(date.toISOString().split('T')[0]);
      }
      if (existingNoteData.nextSessionDate) {
        const date = new Date(existingNoteData.nextSessionDate);
        setNextSessionDate(date.toISOString().split('T')[0]);
      }

      // Consultation details
      if (existingNoteData.consultedPerson) setConsultedPerson(existingNoteData.consultedPerson);
      if (existingNoteData.organization) setOrganization(existingNoteData.organization);
      if (existingNoteData.reasonForConsultation) setReasonForConsultation(existingNoteData.reasonForConsultation);
      if (existingNoteData.informationShared) setInformationShared(existingNoteData.informationShared);
      if (existingNoteData.recommendationsReceived) setRecommendationsReceived(existingNoteData.recommendationsReceived);
      if (existingNoteData.followUpActions) setFollowUpActions(existingNoteData.followUpActions);

      // Billing
      if (existingNoteData.cptCode) setCptCode(existingNoteData.cptCode);
      if (existingNoteData.billingCode) setBillingCode(existingNoteData.billingCode);
      if (existingNoteData.billable !== undefined) setBillable(existingNoteData.billable);
    }
  }, [existingNoteData, isEditMode]);

  
  // Fetch eligible appointments
  const { data: eligibleAppointmentsData } = useQuery({
    queryKey: ['eligible-appointments', clientId, 'Consultation Note'],
    queryFn: async () => {
      const response = await api.get(
        `/clinical-notes/client/${clientId}/eligible-appointments/Consultation%20Note`
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

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      // Backup to localStorage before API call
      backupToLocalStorage(data);
      if (isEditMode) {
        return api.put(`/clinical-notes/${noteId}`, data);
      }
      return api.post('/clinical-notes', data);
    },
    onSuccess: () => {
      // Clear backup after successful save
      clearBackup();
      queryClient.invalidateQueries({ queryKey: ['clinical-notes', clientId] });
      queryClient.invalidateQueries({ queryKey: ['my-notes'] });
      navigate(`/clients/${clientId}/notes`);
    },
    onError: (error: any, variables: any) => {
      handleSaveError(error, variables);
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: async (data: any) => {
      // Backup to localStorage before API call
      backupToLocalStorage(data);
      if (isEditMode) {
        return api.put(`/clinical-notes/${noteId}`, data);
      }
      return api.post('/clinical-notes', data);
    },
    onSuccess: () => {
      // Clear backup after successful save
      clearBackup();
      queryClient.invalidateQueries({ queryKey: ['clinical-notes', clientId] });
      queryClient.invalidateQueries({ queryKey: ['my-notes'] });
      navigate(`/clients/${clientId}/notes`);
    },
    onError: (error: any, variables: any) => {
      handleSaveError(error, variables);
    },
  });

  // Handle recovering draft data
  const handleRecoverDraft = () => {
    const recovered = applyRecoveredDraft();
    if (recovered) {
      if (recovered.sessionDate) setSessionDate(recovered.sessionDate);
      if (recovered.consultedPerson) setConsultedPerson(recovered.consultedPerson);
      if (recovered.organization) setOrganization(recovered.organization);
      if (recovered.reasonForConsultation) setReasonForConsultation(recovered.reasonForConsultation);
      if (recovered.informationShared) setInformationShared(recovered.informationShared);
      if (recovered.recommendationsReceived) setRecommendationsReceived(recovered.recommendationsReceived);
      if (recovered.followUpActions) setFollowUpActions(recovered.followUpActions);
      if (recovered.cptCode) setCptCode(recovered.cptCode);
      if (recovered.billable !== undefined) setBillable(recovered.billable);
      if (recovered.appointmentId) setSelectedAppointmentId(recovered.appointmentId);
    }
  };

  // AI Handler Functions
  const handleGenerateFromTranscription = async (sessionNotes: string) => {
    setIsGenerating(true);
    try {
      const response = await api.post('/ai/generate-note', {
        noteType: 'Consultation Note',
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
    if (data.sessionDate) setSessionDate(data.sessionDate);
    if (data.consultedPerson) setConsultedPerson(data.consultedPerson);
    if (data.consultedRole) {
      // Handle consulted role if needed
    }
    if (data.organization) setOrganization(data.organization);
    if (data.consultationMethod) {
      // Handle consultation method if needed
    }
    if (data.reasonForConsultation) setReasonForConsultation(data.reasonForConsultation);
    if (data.consentObtained !== undefined) {
      // Handle consent obtained if needed
    }
    if (data.informationShared) setInformationShared(data.informationShared);
    if (data.informationReceived) {
      // Handle information received if needed
    }
    if (data.recommendationsReceived) setRecommendationsReceived(data.recommendationsReceived);
    if (data.followUpActions) setFollowUpActions(data.followUpActions);
    if (data.impactOnTreatment) {
      // Handle impact on treatment if needed
    }
    if (data.billable !== undefined) setBillable(data.billable);
    if (data.duration) {
      // Handle duration if needed
    }

    setShowReviewModal(false);
    setGeneratedData(null);
  };

  const handleSaveDraft = (e: React.FormEvent) => {
    

    const data = {
      clientId,
      noteType: 'Consultation Note',
      appointmentId: appointmentId,
      sessionDate: sessionDate ? new Date(sessionDate).toISOString() : undefined,
      subjective: `Consultation with: ${consultedPerson}\nOrganization: ${organization}\n\nReason: ${reasonForConsultation}`,
      objective: `Information Shared: ${informationShared}`,
      assessment: `Recommendations Received: ${recommendationsReceived}`,
      plan: `Follow-up Actions: ${followUpActions}`,
      consultedPerson,
      organization,
      reasonForConsultation,
      informationShared,
      recommendationsReceived,
      followUpActions,
      cptCode,
      billingCode,
      billable,
      nextSessionDate: nextSessionDate ? new Date(nextSessionDate).toISOString() : undefined,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      status: 'DRAFT',
    };

    saveDraftMutation.mutate(data);
  };

  const handleSubmit = (e: React.FormEvent) => {
    

    const data = {
      clientId,
      noteType: 'Consultation Note',
      appointmentId: appointmentId,
      sessionDate: new Date(sessionDate).toISOString(),
      subjective: `Consultation with: ${consultedPerson}\nOrganization: ${organization}\n\nReason: ${reasonForConsultation}`,
      objective: `Information Shared: ${informationShared}`,
      assessment: `Recommendations Received: ${recommendationsReceived}`,
      plan: `Follow-up Actions: ${followUpActions}`,
      consultedPerson,
      organization,
      reasonForConsultation,
      informationShared,
      recommendationsReceived,
      followUpActions,
      cptCode,
      billingCode,
      billable,
      nextSessionDate: nextSessionDate ? new Date(nextSessionDate).toISOString() : undefined,
      dueDate: new Date(dueDate).toISOString(),
    };

    saveMutation.mutate(data);
  };

  // Sign and Submit handler - saves note then opens signature modal
  const handleSignAndSubmit = () => {
    const data = {
      clientId,
      noteType: 'Consultation Note',
      appointmentId: appointmentId,
      sessionDate: new Date(sessionDate).toISOString(),
      subjective: `Consultation with: ${consultedPerson}\nOrganization: ${organization}\n\nReason: ${reasonForConsultation}`,
      objective: `Information Shared: ${informationShared}`,
      assessment: `Recommendations Received: ${recommendationsReceived}`,
      plan: `Follow-up Actions: ${followUpActions}`,
      consultedPerson,
      organization,
      reasonForConsultation,
      informationShared,
      recommendationsReceived,
      followUpActions,
      cptCode,
      billingCode,
      billable,
      nextSessionDate: nextSessionDate ? new Date(nextSessionDate).toISOString() : undefined,
      dueDate: new Date(dueDate).toISOString(),
    };

    // Initiate sign and submit - will save as DRAFT first, then open signature modal
    initiateSignAndSubmit(data, isEditMode ? noteId : undefined);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-8">
      <div className="max-w-5xl mx-auto">
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
            Consultation Note
          </h1>
          <p className="text-gray-600 mt-2">Document consultation with other providers</p>
        </div>

        {/* Session Expired Alert */}
        {sessionError && (
          <SessionExpiredAlert message={sessionError} onDismiss={clearSessionError} />
        )}

        {/* Recovered Draft Alert */}
        {hasRecoveredDraft && (
          <RecoveredDraftAlert
            onRecover={handleRecoverDraft}
            onDiscard={discardRecoveredDraft}
          />
        )}

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
                {(saveMutation.error as any)?.response?.data?.message || 'Failed to save consultation note'}
              </p>
            </div>
          </div>
        )}

        
        {/* Appointment Selection */}
        {showAppointmentPicker && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <AppointmentPicker
              clientId={clientId!}
              noteType="Consultation Note"
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
            noteType="Consultation Note"
            defaultConfig={eligibleAppointmentsData.defaultConfig}
            onAppointmentCreated={handleAppointmentCreated}
          />
        )}

        {/* Form - only shown after appointment is selected */}
        {!showAppointmentPicker && selectedAppointmentId && (
          <form onSubmit={() => handleSubmit({} as any)} className="space-y-6">
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
            noteType="Consultation Note"
          />

          {/* Consultation Details */}
          <FormSection title="Consultation Details" number={1}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TextField
                  label="Person Consulted (Name/Title)"
                  value={consultedPerson}
                  onChange={setConsultedPerson}
                  required
                  placeholder="e.g., Dr. Jane Smith, MD"
                />
                <TextField
                  label="Organization/Affiliation"
                  value={organization}
                  onChange={setOrganization}
                  placeholder="e.g., ABC Mental Health Center"
                />
              </div>

              <TextAreaField
                label="Reason for Consultation"
                value={reasonForConsultation}
                onChange={setReasonForConsultation}
                required
                rows={4}
                placeholder="Purpose of consultation, specific questions or concerns addressed..."
              />

              <TextAreaField
                label="Information Shared"
                value={informationShared}
                onChange={setInformationShared}
                required
                rows={4}
                placeholder="Summary of client information shared during consultation (ensure HIPAA compliance)..."
              />

              <TextAreaField
                label="Recommendations Received"
                value={recommendationsReceived}
                onChange={setRecommendationsReceived}
                required
                rows={4}
                placeholder="Advice, recommendations, or guidance provided by the consulted professional..."
              />

              <TextAreaField
                label="Follow-up Actions"
                value={followUpActions}
                onChange={setFollowUpActions}
                rows={3}
                placeholder="Next steps, referrals to be made, additional consultations needed..."
              />
            </div>
          </FormSection>

          {/* Billing */}
          <FormSection title="Billing Information" number={2}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    CPT Code
                  </label>
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
            onSubmit={() => handleSubmit({} as any)}
            submitLabel={isEditMode ? "Update Consultation Note" : "Create Consultation Note"}
            isSubmitting={saveMutation.isPending}
            onSaveDraft={() => handleSaveDraft({} as any)}
            isSavingDraft={saveDraftMutation.isPending}
            onSignAndSubmit={handleSignAndSubmit}
            isSigningAndSubmitting={isSignAndSubmitting}
            canSign={true}
            signAndSubmitLabel="Sign & Submit"
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
            noteType="Consultation Note"
            warnings={aiWarnings}
            confidence={aiConfidence}
          />
        )}

        {/* Signature Modal for Sign & Submit */}
        <SignatureModal {...signatureModalProps} />
      </div>
    </div>
  );
}
