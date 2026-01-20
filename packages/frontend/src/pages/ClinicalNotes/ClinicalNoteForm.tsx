import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import ICD10Autocomplete from '../../components/ClinicalNotes/ICD10Autocomplete';
import CPTCodeAutocomplete from '../../components/ClinicalNotes/CPTCodeAutocomplete';
import OutcomeMeasuresSection from '../../components/ClinicalNotes/OutcomeMeasuresSection';

interface Appointment {
  id: string;
  appointmentDate: string;
  appointmentType: string;
  status: string;
}

const NOTE_TYPES = [
  'Intake Assessment',
  'Progress Note',
  'Treatment Plan',
  'Cancellation Note',
  'Consultation Note',
  'Contact Note',
  'Termination Note',
  'Miscellaneous Note',
];

const RISK_LEVELS = ['None', 'Low', 'Moderate', 'High', 'Imminent'];

const BILLING_CODES = [
  { code: '90791', description: 'Psychiatric Diagnostic Evaluation' },
  { code: '90832', description: 'Psychotherapy, 30 minutes' },
  { code: '90834', description: 'Psychotherapy, 45 minutes' },
  { code: '90837', description: 'Psychotherapy, 60 minutes' },
  { code: '90846', description: 'Family Psychotherapy (without patient)' },
  { code: '90847', description: 'Family Psychotherapy (with patient)' },
  { code: '90853', description: 'Group Psychotherapy' },
  { code: '99354', description: 'Prolonged Service, Office (additional 30 min)' },
];

export default function ClinicalNoteForm() {
  const { clientId, noteId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const isEdit = !!noteId;

  // Get sessionId from URL query params (for transcript integration)
  const sessionId = searchParams.get('sessionId');
  const [showTranscript, setShowTranscript] = useState(false);

  // Form state
  const [noteType, setNoteType] = useState('Progress Note');
  const [appointmentId, setAppointmentId] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [suicidalIdeation, setSuicidalIdeation] = useState(false);
  const [homicidalIdeation, setHomicidalIdeation] = useState(false);
  const [selfHarm, setSelfHarm] = useState(false);
  const [riskLevel, setRiskLevel] = useState('None');
  const [riskAssessmentNotes, setRiskAssessmentNotes] = useState('');
  const [interventions, setInterventions] = useState('');
  const [diagnosisCodes, setDiagnosisCodes] = useState<string[]>([]);
  const [cptCode, setCptCode] = useState('');
  const [billingCode, setBillingCode] = useState('');
  const [billable, setBillable] = useState(true);
  const [nextSessionDate, setNextSessionDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Fetch appointments for client
  const { data: appointmentsData } = useQuery({
    queryKey: ['appointments', clientId],
    queryFn: async () => {
      // For now, return empty array - will be implemented in Appointments module
      return { data: { appointments: [] } };
    },
    enabled: !!clientId,
  });

  // Fetch existing note if editing
  const { data: noteData } = useQuery({
    queryKey: ['clinical-note', noteId],
    queryFn: async () => {
      const response = await api.get(`/clinical-notes/${noteId}`);
      return response.data.data;
    },
    enabled: isEdit,
  });

  // Fetch client diagnosis
  const { data: diagnosisData } = useQuery({
    queryKey: ['client-diagnosis', clientId],
    queryFn: async () => {
      const response = await api.get(`/clinical-notes/client/${clientId}/diagnosis`);
      return response.data.data;
    },
    enabled: !!clientId,
  });

  // Fetch session transcript if sessionId is provided
  const { data: transcriptData, isLoading: transcriptLoading } = useQuery({
    queryKey: ['session-transcript', sessionId],
    queryFn: async () => {
      const response = await api.get(`/telehealth/sessions/${sessionId}/transcription/formatted`);
      return response.data.data;
    },
    enabled: !!sessionId,
  });

  // Populate form if editing
  useEffect(() => {
    if (noteData) {
      setNoteType(noteData.noteType);
      setAppointmentId(noteData.appointmentId);
      setSessionDate(noteData.sessionDate?.split('T')[0] || '');
      setSubjective(noteData.subjective || '');
      setObjective(noteData.objective || '');
      setAssessment(noteData.assessment || '');
      setPlan(noteData.plan || '');
      setSuicidalIdeation(noteData.suicidalIdeation || false);
      setHomicidalIdeation(noteData.homicidalIdeation || false);
      setSelfHarm(noteData.selfHarm || false);
      setRiskLevel(noteData.riskLevel || 'None');
      setRiskAssessmentNotes(noteData.riskAssessmentNotes || '');
      setInterventions(noteData.interventions || '');
      setDiagnosisCodes(noteData.diagnosisCodes || []);
      setCptCode(noteData.cptCode || '');
      setBillingCode(noteData.billingCode || '');
      setBillable(noteData.billable ?? true);
      setNextSessionDate(noteData.nextSessionDate?.split('T')[0] || '');
      setDueDate(noteData.dueDate?.split('T')[0] || '');
    }
  }, [noteData]);

  // Auto-populate diagnosis codes from client
  useEffect(() => {
    if (diagnosisData?.diagnosisCodes && diagnosisCodes.length === 0) {
      setDiagnosisCodes(diagnosisData.diagnosisCodes);
    }
  }, [diagnosisData]);

  // Auto-set due date to 7 days from session date
  useEffect(() => {
    if (sessionDate && !dueDate) {
      const date = new Date(sessionDate);
      date.setDate(date.getDate() + 7);
      setDueDate(date.toISOString().split('T')[0]);
    }
  }, [sessionDate]);

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEdit) {
        return api.patch(`/clinical-notes/${noteId}`, data);
      } else {
        return api.post('/clinical-notes', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-notes', clientId] });
      queryClient.invalidateQueries({ queryKey: ['my-notes'] });
      navigate(`/clients/${clientId}/notes`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      clientId,
      noteType,
      appointmentId: appointmentId || 'temp-appointment-id', // Temporary for now
      sessionDate: new Date(sessionDate).toISOString(),
      subjective,
      objective,
      assessment,
      plan,
      suicidalIdeation,
      homicidalIdeation,
      selfHarm,
      riskLevel,
      riskAssessmentNotes,
      interventions,
      diagnosisCodes,
      cptCode,
      billingCode,
      billable,
      nextSessionDate: nextSessionDate ? new Date(nextSessionDate).toISOString() : null,
      dueDate: new Date(dueDate).toISOString(),
    };

    saveMutation.mutate(data);
  };

  const canEditDiagnosis = noteType === 'Intake Assessment' || noteType === 'Treatment Plan';

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
            {isEdit ? 'Edit Clinical Note' : 'New Clinical Note'}
          </h1>
          <p className="text-gray-600 mt-2">Complete all required fields for clinical documentation</p>
        </div>

        {/* Session Transcript Panel */}
        {sessionId && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl shadow-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTranscript(!showTranscript)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <h3 className="text-lg font-bold text-blue-800">Session Transcript Available</h3>
                  <p className="text-sm text-blue-600">Click to {showTranscript ? 'hide' : 'view'} the transcript from the video session</p>
                </div>
              </div>
              <svg
                className={`w-5 h-5 text-blue-600 transform transition-transform ${showTranscript ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showTranscript && (
              <div className="px-6 pb-6 border-t border-blue-200">
                {transcriptLoading ? (
                  <div className="py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-blue-600">Loading transcript...</p>
                  </div>
                ) : transcriptData?.transcript ? (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-800">Transcript Content</h4>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(transcriptData.transcript);
                            alert('Transcript copied to clipboard!');
                          }}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          Copy All
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            // Pre-fill the subjective field with transcript
                            setSubjective(prev => prev ? `${prev}\n\n--- Transcript ---\n${transcriptData.transcript}` : transcriptData.transcript);
                          }}
                          className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Add to Subjective
                        </button>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4 max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">{transcriptData.transcript}</pre>
                    </div>
                    <p className="mt-3 text-sm text-gray-500 italic">
                      Tip: Use the transcript as reference while writing your SOAP notes. You can copy specific sections or add the full transcript to the Subjective field.
                    </p>
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>No transcript available for this session.</p>
                    <p className="text-sm mt-1">The session may not have had transcription enabled.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Workflow Alerts */}
        {saveMutation.isError && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <svg className="h-6 w-6 text-red-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">
                  {(saveMutation.error as any)?.response?.data?.message || 'Failed to save clinical note'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mr-3">1</span>
              Basic Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Note Type *
                </label>
                <select
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                >
                  {NOTE_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Session Date *
                </label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  required
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Due Date (7-day rule) *
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Next Session Date
                </label>
                <input
                  type="date"
                  value={nextSessionDate}
                  onChange={(e) => setNextSessionDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          {/* SOAP Notes */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mr-3">2</span>
              SOAP Documentation
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Subjective *
                </label>
                <textarea
                  value={subjective}
                  onChange={(e) => setSubjective(e.target.value)}
                  required
                  rows={4}
                  placeholder="Client's reported symptoms, concerns, and experiences..."
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Objective *
                </label>
                <textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  required
                  rows={4}
                  placeholder="Observable behaviors, appearance, and clinical observations..."
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Assessment *
                </label>
                <textarea
                  value={assessment}
                  onChange={(e) => setAssessment(e.target.value)}
                  required
                  rows={4}
                  placeholder="Clinical analysis, diagnostic impressions, and progress evaluation..."
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Plan *
                </label>
                <textarea
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  required
                  rows={4}
                  placeholder="Treatment plan, interventions, and next steps..."
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mr-3">3</span>
              Risk Assessment
            </h2>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center p-4 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl cursor-pointer hover:border-red-400 transition-all">
                  <input
                    type="checkbox"
                    checked={suicidalIdeation}
                    onChange={(e) => setSuicidalIdeation(e.target.checked)}
                    className="w-5 h-5 text-red-600 rounded focus:ring-2 focus:ring-red-500"
                  />
                  <span className="ml-3 font-semibold text-gray-700">Suicidal Ideation</span>
                </label>

                <label className="flex items-center p-4 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl cursor-pointer hover:border-orange-400 transition-all">
                  <input
                    type="checkbox"
                    checked={homicidalIdeation}
                    onChange={(e) => setHomicidalIdeation(e.target.checked)}
                    className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="ml-3 font-semibold text-gray-700">Homicidal Ideation</span>
                </label>

                <label className="flex items-center p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl cursor-pointer hover:border-yellow-400 transition-all">
                  <input
                    type="checkbox"
                    checked={selfHarm}
                    onChange={(e) => setSelfHarm(e.target.checked)}
                    className="w-5 h-5 text-yellow-600 rounded focus:ring-2 focus:ring-yellow-500"
                  />
                  <span className="ml-3 font-semibold text-gray-700">Self-Harm</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Risk Level *
                </label>
                <select
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                >
                  {RISK_LEVELS.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Risk Assessment Notes
                </label>
                <textarea
                  value={riskAssessmentNotes}
                  onChange={(e) => setRiskAssessmentNotes(e.target.value)}
                  rows={3}
                  placeholder="Detailed risk assessment and safety planning..."
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Interventions
                </label>
                <textarea
                  value={interventions}
                  onChange={(e) => setInterventions(e.target.value)}
                  rows={3}
                  placeholder="Interventions provided or safety measures taken..."
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Outcome Measures */}
          {clientId && (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mr-3">4</span>
                Outcome Measures
              </h2>
              <OutcomeMeasuresSection
                clientId={clientId}
                clinicalNoteId={noteId}
                sessionDate={sessionDate}
              />
            </div>
          )}

          {/* Diagnosis & Billing */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mr-3">5</span>
              Diagnosis & Billing
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Diagnosis Codes (ICD-10) {canEditDiagnosis ? '*' : '(Read-only)'}
                </label>
                <ICD10Autocomplete
                  selectedCodes={diagnosisCodes}
                  onCodesChange={setDiagnosisCodes}
                  disabled={!canEditDiagnosis}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    CPT Code
                  </label>
                  <CPTCodeAutocomplete
                    value={cptCode}
                    onChange={setCptCode}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Billing Code
                  </label>
                  <input
                    type="text"
                    value={billingCode}
                    onChange={(e) => setBillingCode(e.target.value)}
                    placeholder="Internal billing code"
                    className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center p-4 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl cursor-pointer hover:border-green-400 transition-all">
                  <input
                    type="checkbox"
                    checked={billable}
                    onChange={(e) => setBillable(e.target.checked)}
                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                  />
                  <span className="ml-3 font-semibold text-gray-700">Billable Service</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate(`/clients/${clientId}/notes`)}
              className="px-8 py-4 bg-gray-200 text-gray-700 rounded-xl shadow-lg hover:shadow-xl hover:bg-gray-300 transform hover:scale-105 transition-all duration-200 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveMutation.isPending ? 'Saving...' : isEdit ? 'Update Note' : 'Create Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
