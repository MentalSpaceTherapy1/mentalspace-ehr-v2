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
  const { clientId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Get appointmentId from URL query parameters
  const [searchParams] = useSearchParams();
  const appointmentIdFromURL = searchParams.get('appointmentId') || '';

  // Appointment selection state
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>(appointmentIdFromURL);
  const [appointmentData, setAppointmentData] = useState<any>(null);
  const [showAppointmentPicker, setShowAppointmentPicker] = useState(!appointmentIdFromURL);
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
      alert('Failed to generate note. Please try again.');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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

        {/* Error Display */}
        {saveMutation.isError && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 p-4 rounded-lg shadow-sm">
            <p className="text-sm text-red-700">
              {(saveMutation.error as any)?.response?.data?.message || 'Failed to save termination note'}
            </p>
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

        {/* Form - only shown after appointment is selected */}
        {!showAppointmentPicker && selectedAppointmentId && (
          <form onSubmit={handleSubmit} className="space-y-6">
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
                participants={appointmentData.participants}
                editable={false}
              />
            )}

            <SessionInputBox
            onGenerate={handleGenerateFromTranscription}
            isGenerating={isGenerating}
            noteType="Termination Note"
          />

          {/* Basic Information */}
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
          <FormSection title="Final Diagnosis" number={3}>
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
          <FormSection title="Aftercare Planning" number={4}>
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
          <FormSection title="Billing Information" number={5}>
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
            onSubmit={handleSubmit}
            submitLabel="Create Termination Note"
            isSubmitting={saveMutation.isPending}
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
      </div>
    </div>
  );
}
