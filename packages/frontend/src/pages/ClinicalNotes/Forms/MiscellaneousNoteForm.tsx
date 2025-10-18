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

const PURPOSE_CATEGORY_OPTIONS = [
  { value: 'Administrative', label: 'Administrative' },
  { value: 'Coordination of care', label: 'Coordination of care' },
  { value: 'Documentation review', label: 'Documentation review' },
  { value: 'Clinical observation', label: 'Clinical observation' },
  { value: 'Collateral contact', label: 'Collateral contact' },
  { value: 'Other', label: 'Other' },
];

export default function MiscellaneousNoteForm() {
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

  const [noteDate, setNoteDate] = useState('');

  // Note Details
  const [subject, setSubject] = useState('');
  const [purposeCategory, setPurposeCategory] = useState('');
  const [content, setContent] = useState('');
  const [relatedToTreatment, setRelatedToTreatment] = useState(true);

  // Billing
  const [billable, setBillable] = useState(false);
  const [cptCode, setCptCode] = useState('');
  const [billingCode, setBillingCode] = useState('');

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

  // Fetch eligible appointments
  const { data: eligibleAppointmentsData } = useQuery({
    queryKey: ['eligible-appointments', clientId, 'Miscellaneous Note'],
    queryFn: async () => {
      const response = await api.get(
        `/clinical-notes/client/${clientId}/eligible-appointments/Miscellaneous%20Note`
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
        noteType: 'Miscellaneous Note',
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
    if (data.noteDate) setNoteDate(data.noteDate);
    if (data.subject) setSubject(data.subject);
    if (data.purposeCategory) setPurposeCategory(data.purposeCategory);
    if (data.content) setContent(data.content);
    if (data.relatedToTreatment !== undefined) setRelatedToTreatment(data.relatedToTreatment);
    if (data.actionRequired !== undefined) {
      // Handle action required if needed
    }
    if (data.actionDescription) {
      // Handle action description if needed
    }
    if (data.billable !== undefined) setBillable(data.billable);

    setShowReviewModal(false);
    setGeneratedData(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      clientId,
      noteType: 'Miscellaneous Note',
      appointmentId: appointmentId,
      sessionDate: new Date(noteDate).toISOString(),
      subjective: `Subject: ${subject}\nCategory: ${purposeCategory}`,
      objective: content,
      assessment: `Miscellaneous note - ${relatedToTreatment ? 'Related to treatment' : 'Administrative'}`,
      plan: 'Continue as planned',
      subject,
      purposeCategory,
      content,
      relatedToTreatment,
      cptCode: billable ? cptCode : '',
      billingCode: billable ? billingCode : '',
      billable,
      dueDate: new Date(noteDate).toISOString(),
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
            Miscellaneous Note
          </h1>
          <p className="text-gray-600 mt-2">Flexible documentation for various purposes</p>
        </div>

        {/* Error Display */}
        {saveMutation.isError && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 p-4 rounded-lg shadow-sm">
            <p className="text-sm text-red-700">
              {(saveMutation.error as any)?.response?.data?.message || 'Failed to save miscellaneous note'}
            </p>
          </div>
        )}

        
        {/* Appointment Selection */}
        {showAppointmentPicker && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <AppointmentPicker
              clientId={clientId!}
              noteType="Miscellaneous Note"
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
            noteType="Miscellaneous Note"
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
                sessionType={appointmentData.appointmentType}
                clientName={clientData ? `${clientData.firstName} ${clientData.lastName}` : ''}
                clientDOB={clientData?.dateOfBirth}
                editable={false}
              />
            )}

            <SessionInputBox
            onGenerate={handleGenerateFromTranscription}
            isGenerating={isGenerating}
            noteType="Miscellaneous Note"
          />

          {/* Note Information */}
          <FormSection title="Note Information" number={1}>
            <div className="space-y-6">
              <TextField
                label="Note Date"
                type="date"
                value={noteDate}
                onChange={setNoteDate}
                required
              />

              <TextField
                label="Subject/Title"
                value={subject}
                onChange={setSubject}
                required
                placeholder="Brief title describing the purpose of this note..."
              />

              <SelectField
                label="Purpose/Category"
                value={purposeCategory}
                onChange={setPurposeCategory}
                options={PURPOSE_CATEGORY_OPTIONS}
                required
              />
            </div>
          </FormSection>

          {/* Note Content */}
          <FormSection title="Note Content" number={2}>
            <div className="space-y-6">
              <TextAreaField
                label="Content/Notes"
                value={content}
                onChange={setContent}
                required
                rows={10}
                placeholder="Detailed notes, observations, or documentation. Be thorough and specific..."
              />

              <CheckboxField
                label="Related to Treatment"
                checked={relatedToTreatment}
                onChange={setRelatedToTreatment}
              />
            </div>
          </FormSection>

          {/* Billing */}
          <FormSection title="Billing Information" number={3}>
            <div className="space-y-6">
              <CheckboxField
                label="Billable Service"
                checked={billable}
                onChange={setBillable}
              />

              {billable && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      CPT Code <span className="text-red-500">*</span>
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
              )}
            </div>
          </FormSection>

          {/* Form Actions */}
          <FormActions
            onCancel={() => navigate(`/clients/${clientId}/notes`)}
            onSubmit={handleSubmit}
            submitLabel="Create Miscellaneous Note"
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
            noteType="Miscellaneous Note"
            warnings={aiWarnings}
            confidence={aiConfidence}
          />
        )}
      </div>
    </div>
  );
}
