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
import ICD10Autocomplete from '../../../components/ClinicalNotes/ICD10Autocomplete';
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

const TERMINATION_REASON_OPTIONS = [
  { value: 'Treatment completed', label: 'Treatment completed' },
  { value: 'Client request', label: 'Client request' },
  { value: 'Mutual agreement', label: 'Mutual agreement' },
  { value: 'No-show', label: 'No-show' },
  { value: 'Moved away', label: 'Moved away' },
  { value: 'Financial reasons', label: 'Financial reasons' },
  { value: 'Referral to another provider', label: 'Referral to another provider' },
  { value: 'Other', label: 'Other' },
];

export default function TerminationNoteForm() {
  const { clientId, noteId } = useParams();
  const isEditMode = !!noteId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Get appointmentId from URL query parameters
  const [searchParams] = useSearchParams();
  const appointmentIdFromURL = searchParams.get('appointmentId') || '';

  // Appointment selection state
  // Termination Note does NOT require an appointment - users can optionally select one
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>(appointmentIdFromURL);
  const [appointmentData, setAppointmentData] = useState<any>(null);
  const [showAppointmentPicker, setShowAppointmentPicker] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const appointmentId = selectedAppointmentId;

  const [terminationDate, setTerminationDate] = useState('');

  // Termination Details
  const [terminationReason, setTerminationReason] = useState('');
  const [progressAchieved, setProgressAchieved] = useState('');
  const [finalDiagnosis, setFinalDiagnosis] = useState<string[]>([]);
  const [currentStatus, setCurrentStatus] = useState('');
  const [aftercareRecommendations, setAftercareRecommendations] = useState('');
  const [referralsMade, setReferralsMade] = useState('');
  const [emergencyPlan, setEmergencyPlan] = useState('');

  // Billing
  const [cptCode, setCptCode] = useState('');
  const [billingCode, setBillingCode] = useState('');
  const [billable, setBillable] = useState(true);

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
    noteType: 'TerminationNote',
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
    noteType: 'Termination Note',
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

  // Fetch eligible appointments
  const { data: eligibleAppointmentsData } = useQuery({
    queryKey: ['eligible-appointments', clientId, 'Termination Note'],
    queryFn: async () => {
      const response = await api.get(
        `/clinical-notes/client/${clientId}/eligible-appointments/Termination%20Note`
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
          // Auto-populate CPT code from appointment if available
          if (apt.cptCode && !cptCode) {
            setCptCode(apt.cptCode);
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

      // Termination date
      if (existingNoteData.sessionDate) {
        const date = new Date(existingNoteData.sessionDate);
        setTerminationDate(date.toISOString().split('T')[0]);
      }

      // Termination details
      if (existingNoteData.terminationReason) setTerminationReason(existingNoteData.terminationReason);
      if (existingNoteData.progressAchieved) setProgressAchieved(existingNoteData.progressAchieved);
      if (existingNoteData.currentStatus) setCurrentStatus(existingNoteData.currentStatus);

      // Parse aftercare details from plan field
      if (existingNoteData.plan) {
        const plan = existingNoteData.plan;

        const aftercareMatch = plan.match(/Aftercare Recommendations:\s*(.+?)(?:\n\nReferrals Made:|$)/s);
        if (aftercareMatch) setAftercareRecommendations(aftercareMatch[1].trim());

        const referralsMatch = plan.match(/Referrals Made:\s*(.+?)(?:\n\nEmergency Plan:|$)/s);
        if (referralsMatch) setReferralsMade(referralsMatch[1].trim());

        const emergencyPlanMatch = plan.match(/Emergency Plan:\s*(.+?)$/s);
        if (emergencyPlanMatch) setEmergencyPlan(emergencyPlanMatch[1].trim());
      }

      // Final diagnosis
      if (existingNoteData.finalDiagnosis && Array.isArray(existingNoteData.finalDiagnosis)) {
        setFinalDiagnosis(existingNoteData.finalDiagnosis);
      } else if (existingNoteData.diagnosisCodes && Array.isArray(existingNoteData.diagnosisCodes)) {
        setFinalDiagnosis(existingNoteData.diagnosisCodes);
      }

      // Billing
      if (existingNoteData.cptCode) setCptCode(existingNoteData.cptCode);
      if (existingNoteData.billingCode) setBillingCode(existingNoteData.billingCode);
      if (existingNoteData.billable !== undefined) setBillable(existingNoteData.billable);
    }
  }, [existingNoteData, isEditMode]);

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
      if (recovered.terminationDate) setTerminationDate(recovered.terminationDate);
      if (recovered.terminationReason) setTerminationReason(recovered.terminationReason);
      if (recovered.progressAchieved) setProgressAchieved(recovered.progressAchieved);
      if (recovered.finalDiagnosis) setFinalDiagnosis(recovered.finalDiagnosis);
      if (recovered.currentStatus) setCurrentStatus(recovered.currentStatus);
      if (recovered.aftercareRecommendations) setAftercareRecommendations(recovered.aftercareRecommendations);
      if (recovered.referralsMade) setReferralsMade(recovered.referralsMade);
      if (recovered.emergencyPlan) setEmergencyPlan(recovered.emergencyPlan);
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
        noteType: 'Termination Note',
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
    if (data.terminationDate) setTerminationDate(data.terminationDate);
    if (data.terminationReason) setTerminationReason(data.terminationReason);
    if (data.treatmentStartDate) {
      // Handle treatment start date if needed
    }
    if (data.totalSessions) {
      // Handle total sessions if needed
    }
    if (data.treatmentSummary) {
      // Handle treatment summary if needed
    }
    if (data.progressAchieved) setProgressAchieved(data.progressAchieved);
    if (data.goalsStatus) {
      // Handle goals status if needed
    }
    if (data.currentFunctioning) setCurrentStatus(data.currentFunctioning);
    if (data.finalDiagnosis) {
      if (Array.isArray(data.finalDiagnosis)) {
        setFinalDiagnosis(data.finalDiagnosis);
      } else {
        setFinalDiagnosis([data.finalDiagnosis]);
      }
    }
    if (data.currentStatus) setCurrentStatus(data.currentStatus);
    if (data.aftercareRecommendations) setAftercareRecommendations(data.aftercareRecommendations);
    if (data.referralsMade) setReferralsMade(data.referralsMade);
    if (data.crisisResources) {
      // Handle crisis resources if needed
    }
    if (data.emergencyPlan) setEmergencyPlan(data.emergencyPlan);
    if (data.clientReadiness) {
      // Handle client readiness if needed
    }
    if (data.prognosis) {
      // Handle prognosis if needed
    }

    setShowReviewModal(false);
    setGeneratedData(null);
  };

  const handleSaveDraft = (e: React.FormEvent) => {
    

    const data = {
      clientId,
      noteType: 'Termination Note',
      appointmentId: appointmentId,
      sessionDate: terminationDate ? new Date(terminationDate).toISOString() : undefined,
      subjective: `Termination Reason: ${terminationReason}\n\nProgress Achieved:\n${progressAchieved}`,
      objective: `Current Status and Functioning:\n${currentStatus}`,
      assessment: `Final diagnosis codes: ${finalDiagnosis.join(', ')}`,
      plan: `Aftercare Recommendations:\n${aftercareRecommendations}\n\nReferrals Made:\n${referralsMade}\n\nEmergency Plan:\n${emergencyPlan}`,
      terminationReason,
      progressAchieved,
      finalDiagnosis,
      currentStatus,
      aftercareRecommendations,
      referralsMade,
      emergencyPlan,
      diagnosisCodes: finalDiagnosis,
      cptCode,
      billingCode,
      billable,
      dueDate: terminationDate ? new Date(terminationDate).toISOString() : undefined,
      status: 'DRAFT',
    };

    saveDraftMutation.mutate(data);
  };

  const handleSubmit = (e: React.FormEvent) => {
    

    const data = {
      clientId,
      noteType: 'Termination Note',
      appointmentId: appointmentId,
      sessionDate: new Date(terminationDate).toISOString(),
      subjective: `Termination Reason: ${terminationReason}\n\nProgress Achieved:\n${progressAchieved}`,
      objective: `Current Status and Functioning:\n${currentStatus}`,
      assessment: `Final diagnosis codes: ${finalDiagnosis.join(', ')}`,
      plan: `Aftercare Recommendations:\n${aftercareRecommendations}\n\nReferrals Made:\n${referralsMade}\n\nEmergency Plan:\n${emergencyPlan}`,
      terminationReason,
      progressAchieved,
      finalDiagnosis,
      currentStatus,
      aftercareRecommendations,
      referralsMade,
      emergencyPlan,
      diagnosisCodes: finalDiagnosis,
      cptCode,
      billingCode,
      billable,
      dueDate: new Date(terminationDate).toISOString(),
    };

    saveMutation.mutate(data);
  };

  // Sign and Submit handler - saves note then opens signature modal
  const handleSignAndSubmit = () => {
    const data = {
      clientId,
      noteType: 'Termination Note',
      appointmentId: appointmentId,
      sessionDate: new Date(terminationDate).toISOString(),
      subjective: `Termination Reason: ${terminationReason}\n\nProgress Achieved:\n${progressAchieved}`,
      objective: `Current Status and Functioning:\n${currentStatus}`,
      assessment: `Final diagnosis codes: ${finalDiagnosis.join(', ')}`,
      plan: `Aftercare Recommendations:\n${aftercareRecommendations}\n\nReferrals Made:\n${referralsMade}\n\nEmergency Plan:\n${emergencyPlan}`,
      terminationReason,
      progressAchieved,
      finalDiagnosis,
      currentStatus,
      aftercareRecommendations,
      referralsMade,
      emergencyPlan,
      diagnosisCodes: finalDiagnosis,
      cptCode,
      billingCode,
      billable,
      dueDate: new Date(terminationDate).toISOString(),
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
            Termination Note
          </h1>
          <p className="text-gray-600 mt-2">Document client discharge from services</p>
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
                {(saveMutation.error as any)?.response?.data?.message || 'Failed to save termination note'}
              </p>
            </div>
          </div>
        )}

        
        {/* Appointment Selection */}
        {showAppointmentPicker && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <AppointmentPicker
              clientId={clientId!}
              noteType="Termination Note"
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
            noteType="Termination Note"
            defaultConfig={eligibleAppointmentsData.defaultConfig}
            onAppointmentCreated={handleAppointmentCreated}
          />
        )}

        {/* Form - shown when appointment picker is hidden (appointment is optional for Termination Notes) */}
        {!showAppointmentPicker && (
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
            noteType="Termination Note"
          />

          {/* Termination Information */}
          <FormSection title="Termination Information" number={1}>
            <div className="space-y-6">
              <TextField
                label="Termination Date"
                type="date"
                value={terminationDate}
                onChange={setTerminationDate}
                required
              />

              <SelectField
                label="Reason for Termination"
                value={terminationReason}
                onChange={setTerminationReason}
                options={TERMINATION_REASON_OPTIONS}
                required
              />
            </div>
          </FormSection>

          {/* Treatment Outcome */}
          <FormSection title="Treatment Outcome" number={2}>
            <div className="space-y-6">
              <TextAreaField
                label="Progress Achieved"
                value={progressAchieved}
                onChange={setProgressAchieved}
                required
                rows={5}
                placeholder="Summary of progress made during treatment, goals achieved, improvements in functioning..."
              />

              <TextAreaField
                label="Current Status/Functioning"
                value={currentStatus}
                onChange={setCurrentStatus}
                required
                rows={4}
                placeholder="Client's current mental health status, level of functioning, symptom severity at discharge..."
              />
            </div>
          </FormSection>

          {/* Final Diagnosis */}
          <FormSection title="Final Diagnosis" number={2}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Final Diagnosis Codes (ICD-10) <span className="text-red-500">*</span>
              </label>
              <p className="text-sm text-gray-600 mb-2">
                Final diagnostic impressions at time of discharge
              </p>
              <ICD10Autocomplete
                selectedCodes={finalDiagnosis}
                onCodesChange={setFinalDiagnosis}
              />
            </div>
          </FormSection>

          {/* Aftercare Planning */}
          <FormSection title="Aftercare Planning" number={3}>
            <div className="space-y-6">
              <TextAreaField
                label="Aftercare Recommendations"
                value={aftercareRecommendations}
                onChange={setAftercareRecommendations}
                required
                rows={5}
                placeholder="Recommendations for continued care, self-help strategies, support groups, maintenance plans..."
              />

              <TextAreaField
                label="Referrals Made"
                value={referralsMade}
                onChange={setReferralsMade}
                rows={3}
                placeholder="Any referrals to other providers, services, or resources (include names and contact information)..."
              />

              <TextAreaField
                label="Emergency Plan (if applicable)"
                value={emergencyPlan}
                onChange={setEmergencyPlan}
                rows={4}
                placeholder="Crisis resources, emergency contacts, warning signs to monitor, when to seek help..."
              />
            </div>
          </FormSection>

          {/* Billing */}
          <FormSection title="Billing Information" number={4}>
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
            submitLabel={isEditMode ? "Update Termination Note" : "Create Termination Note"}
            isSubmitting={saveMutation.isPending}
            onSaveDraft={() => handleSaveDraft({} as any)}
            isSavingDraft={saveDraftMutation.isPending}
            onSignAndSubmit={handleSignAndSubmit}
            isSigningAndSubmitting={isSignAndSubmitting}
            canSign={finalDiagnosis.length > 0}
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
            noteType="Termination Note"
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
