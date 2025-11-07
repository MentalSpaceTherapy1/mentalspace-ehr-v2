import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  const isEdit = !!noteId;


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
