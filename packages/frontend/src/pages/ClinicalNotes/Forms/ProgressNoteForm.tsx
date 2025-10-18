import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import CPTCodeAutocomplete from '../../../components/ClinicalNotes/CPTCodeAutocomplete';

// Constants
const SESSION_TYPES = ['Individual', 'Couples', 'Family', 'Group'];
const LOCATIONS = ['Office', 'Telehealth', 'Home', 'School', 'Other'];
const SEVERITIES = ['None', 'Mild', 'Moderate', 'Severe'];
const PROGRESS_LEVELS = ['No Progress', 'Minimal Progress', 'Moderate Progress', 'Significant Progress', 'Goal Achieved'];
const APPEARANCES = ['Well-groomed', 'Disheveled', 'Appropriate'];
const AFFECTS = ['Appropriate', 'Flat', 'Restricted', 'Labile'];
const THOUGHT_PROCESSES = ['Logical', 'Tangential', 'Disorganized'];
const RISK_LEVELS = ['None', 'Low', 'Moderate', 'High'];
const ENGAGEMENT_LEVELS = ['Highly engaged', 'Moderately engaged', 'Minimally engaged', 'Resistant'];
const RESPONSE_LEVELS = ['Very responsive', 'Moderately responsive', 'Minimal response', 'No response'];
const HOMEWORK_COMPLIANCE = ['Completed', 'Partially completed', 'Not completed', 'N/A'];

const SYMPTOMS = [
  'Depression',
  'Anxiety',
  'Irritability',
  'Sleep problems',
  'Appetite changes',
  'Suicidal ideation',
  'Homicidal ideation',
  'Substance use',
  'Panic',
  'Obsessions/compulsions',
  'Trauma symptoms',
];

const INTERVENTIONS = [
  'CBT techniques',
  'DBT skills',
  'Psychoeducation',
  'Supportive therapy',
  'Mindfulness',
  'Relaxation training',
  'Problem-solving',
  'Exposure therapy',
  'Behavioral activation',
];

interface SymptomState {
  [key: string]: string;
}

interface GoalProgress {
  goalDescription: string;
  progressLevel: string;
  notes: string;
}

interface InterventionState {
  [key: string]: boolean;
}

export default function ProgressNoteForm() {
  const { clientId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const appointmentId = searchParams.get('appointmentId');

  // Session Information
  const [sessionDate, setSessionDate] = useState('');
  const [sessionDuration, setSessionDuration] = useState('');
  const [sessionType, setSessionType] = useState('');
  const [location, setLocation] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Current Symptoms
  const [symptoms, setSymptoms] = useState<SymptomState>({});

  // Progress Toward Goals
  const [goals, setGoals] = useState<GoalProgress[]>([
    { goalDescription: '', progressLevel: '', notes: '' },
  ]);

  // Brief Mental Status
  const [appearance, setAppearance] = useState('');
  const [mood, setMood] = useState('');
  const [affect, setAffect] = useState('');
  const [thoughtProcess, setThoughtProcess] = useState('');
  const [suicidalIdeation, setSuicidalIdeation] = useState(false);
  const [homicidalIdeation, setHomicidalIdeation] = useState(false);
  const [riskLevel, setRiskLevel] = useState('None');

  // Interventions Used
  const [interventionsUsed, setInterventionsUsed] = useState<InterventionState>({});
  const [otherIntervention, setOtherIntervention] = useState('');

  // Client Response
  const [engagementLevel, setEngagementLevel] = useState('');
  const [responseToInterventions, setResponseToInterventions] = useState('');
  const [homeworkCompliance, setHomeworkCompliance] = useState('');
  const [clientResponseNotes, setClientResponseNotes] = useState('');

  // SOAP Notes
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');

  // Safety & Risk
  const [safetyPlanReviewed, setSafetyPlanReviewed] = useState(false);
  const [safetyPlanUpdated, setSafetyPlanUpdated] = useState(false);

  // Billing
  const [cptCode, setCptCode] = useState('');
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState('');
  const [billable, setBillable] = useState(true);


  // Auto-set due date to 7 days from session date
  useEffect(() => {
    if (sessionDate && !dueDate) {
      const date = new Date(sessionDate);
      date.setDate(date.getDate() + 7);
      setDueDate(date.toISOString().split('T')[0]);
    }
  }, [sessionDate, dueDate]);

  // Auto-populate SOAP notes from form data
  useEffect(() => {
    // Auto-populate Subjective from symptoms
    const symptomsList = Object.entries(symptoms)
      .filter(([_, severity]) => severity && severity !== 'None')
      .map(([symptom, severity]) => `${symptom}: ${severity}`)
      .join(', ');

    if (symptomsList && !subjective) {
      setSubjective(`Client reports: ${symptomsList}`);
    }
  }, [symptoms]);

  useEffect(() => {
    // Auto-populate Objective from MSE
    if ((appearance || mood || affect || thoughtProcess) && !objective) {
      const mseItems = [];
      if (appearance) mseItems.push(`Appearance: ${appearance}`);
      if (mood) mseItems.push(`Mood: ${mood}`);
      if (affect) mseItems.push(`Affect: ${affect}`);
      if (thoughtProcess) mseItems.push(`Thought Process: ${thoughtProcess}`);
      setObjective(mseItems.join('. ') + '.');
    }
  }, [appearance, mood, affect, thoughtProcess]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/clinical-notes', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-notes', clientId] });
      navigate(`/clients/${clientId}/notes`);
    },
  });

  // Helper functions
  const handleSymptomChange = (symptom: string, severity: string) => {
    setSymptoms(prev => ({ ...prev, [symptom]: severity }));
  };

  const handleInterventionChange = (intervention: string, checked: boolean) => {
    setInterventionsUsed(prev => ({ ...prev, [intervention]: checked }));
  };

  const addGoal = () => {
    if (goals.length < 5) {
      setGoals([...goals, { goalDescription: '', progressLevel: '', notes: '' }]);
    }
  };

  const removeGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const updateGoal = (index: number, field: keyof GoalProgress, value: string) => {
    const updatedGoals = [...goals];
    updatedGoals[index] = { ...updatedGoals[index], [field]: value };
    setGoals(updatedGoals);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedInterventions = Object.entries(interventionsUsed)
      .filter(([_, checked]) => checked)
      .map(([intervention]) => intervention);

    if (otherIntervention) {
      selectedInterventions.push(`Other: ${otherIntervention}`);
    }

    const data = {
      clientId,
      noteType: 'Progress Note',
      appointmentId,
      sessionDate: new Date(sessionDate).toISOString(),
      sessionDuration,
      sessionType,
      location,
      symptoms,
      goals,
      appearance,
      mood,
      affect,
      thoughtProcess,
      suicidalIdeation,
      homicidalIdeation,
      riskLevel,
      interventionsUsed: selectedInterventions,
      engagementLevel,
      responseToInterventions,
      homeworkCompliance,
      clientResponseNotes,
      subjective,
      objective,
      assessment,
      plan,
      safetyPlanReviewed: riskLevel === 'Moderate' || riskLevel === 'High' ? safetyPlanReviewed : undefined,
      safetyPlanUpdated: riskLevel === 'Moderate' || riskLevel === 'High' ? safetyPlanUpdated : undefined,
      cptCode,
      sessionDurationMinutes: sessionDurationMinutes ? parseInt(sessionDurationMinutes) : undefined,
      billable,
      dueDate: new Date(dueDate).toISOString(),
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
            Progress Note
          </h1>
          <p className="text-gray-600 mt-2">Session progress and treatment updates</p>
        </div>

        {/* Error Display */}
        {saveMutation.isError && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 p-4 rounded-lg shadow-sm">
            <p className="text-sm text-red-700">
              {(saveMutation.error as any)?.response?.data?.message || 'Failed to save progress note'}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Session Information */}
          <FormSection title="Session Information" number={1}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TextField
                label="Session Date"
                type="date"
                value={sessionDate}
                onChange={setSessionDate}
                required
              />
              <TextField
                label="Session Duration"
                value={sessionDuration}
                onChange={setSessionDuration}
                placeholder="e.g., 45 minutes, 1 hour"
              />
              <SelectField
                label="Session Type"
                value={sessionType}
                onChange={setSessionType}
                options={SESSION_TYPES.map(type => ({ value: type, label: type }))}
                required
              />
              <SelectField
                label="Location"
                value={location}
                onChange={setLocation}
                options={LOCATIONS.map(loc => ({ value: loc, label: loc }))}
                required
              />
            </div>
          </FormSection>

          {/* Current Symptoms */}
          <FormSection title="Current Symptoms" number={2}>
            <p className="text-sm text-gray-600 mb-4">Rate the severity of each symptom present in this session</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SYMPTOMS.map(symptom => (
                <div key={symptom} className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{symptom}</label>
                  <select
                    value={symptoms[symptom] || ''}
                    onChange={(e) => handleSymptomChange(symptom, e.target.value)}
                    className="w-full px-3 py-2 bg-white border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select severity</option>
                    {SEVERITIES.map(severity => (
                      <option key={severity} value={severity}>{severity}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </FormSection>

          {/* Progress Toward Goals */}
          <FormSection title="Progress Toward Goals" number={3}>
            <div className="space-y-6">
              {goals.map((goal, index) => (
                <div key={index} className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Goal {index + 1}</h3>
                    {goals.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeGoal(index)}
                        className="text-red-500 hover:text-red-700 font-bold"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Goal Description</label>
                      <input
                        type="text"
                        value={goal.goalDescription}
                        onChange={(e) => updateGoal(index, 'goalDescription', e.target.value)}
                        placeholder="Enter treatment goal or auto-populate from treatment plan"
                        className="w-full px-4 py-3 bg-white border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Progress Level</label>
                      <select
                        value={goal.progressLevel}
                        onChange={(e) => updateGoal(index, 'progressLevel', e.target.value)}
                        className="w-full px-4 py-3 bg-white border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      >
                        <option value="">Select progress level</option>
                        {PROGRESS_LEVELS.map(level => (
                          <option key={level} value={level}>{level}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Notes on Progress</label>
                      <textarea
                        value={goal.notes}
                        onChange={(e) => updateGoal(index, 'notes', e.target.value)}
                        rows={3}
                        placeholder="Specific observations about progress on this goal..."
                        className="w-full px-4 py-3 bg-white border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {goals.length < 5 && (
                <button
                  type="button"
                  onClick={addGoal}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-100 to-blue-100 border-2 border-purple-300 rounded-xl text-purple-700 font-semibold hover:from-purple-200 hover:to-blue-200 transition-all"
                >
                  + Add Another Goal (up to 5)
                </button>
              )}
            </div>
          </FormSection>

          {/* Brief Mental Status */}
          <FormSection title="Brief Mental Status" number={4}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SelectField
                label="Appearance"
                value={appearance}
                onChange={setAppearance}
                options={APPEARANCES.map(app => ({ value: app, label: app }))}
              />
              <TextField
                label="Mood (client stated)"
                value={mood}
                onChange={setMood}
                placeholder="e.g., 'happy', 'sad', 'anxious'"
              />
              <SelectField
                label="Affect"
                value={affect}
                onChange={setAffect}
                options={AFFECTS.map(aff => ({ value: aff, label: aff }))}
              />
              <SelectField
                label="Thought Process"
                value={thoughtProcess}
                onChange={setThoughtProcess}
                options={THOUGHT_PROCESSES.map(tp => ({ value: tp, label: tp }))}
              />
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Risk Assessment</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <CheckboxField
                  label="Suicidal Ideation"
                  checked={suicidalIdeation}
                  onChange={setSuicidalIdeation}
                />
                <CheckboxField
                  label="Homicidal Ideation"
                  checked={homicidalIdeation}
                  onChange={setHomicidalIdeation}
                />
                <SelectField
                  label="Risk Level"
                  value={riskLevel}
                  onChange={setRiskLevel}
                  options={RISK_LEVELS.map(level => ({ value: level, label: level }))}
                  required
                />
              </div>
            </div>
          </FormSection>

          {/* Interventions Used */}
          <FormSection title="Interventions Used" number={5}>
            <p className="text-sm text-gray-600 mb-4">Select all interventions used in this session</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {INTERVENTIONS.map(intervention => (
                <CheckboxField
                  key={intervention}
                  label={intervention}
                  checked={interventionsUsed[intervention] || false}
                  onChange={(checked) => handleInterventionChange(intervention, checked)}
                />
              ))}
            </div>
            <TextField
              label="Other Intervention (specify)"
              value={otherIntervention}
              onChange={setOtherIntervention}
              placeholder="Describe any other interventions used..."
            />
          </FormSection>

          {/* Client Response */}
          <FormSection title="Client Response" number={6}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <SelectField
                label="Engagement Level"
                value={engagementLevel}
                onChange={setEngagementLevel}
                options={ENGAGEMENT_LEVELS.map(level => ({ value: level, label: level }))}
                required
              />
              <SelectField
                label="Response to Interventions"
                value={responseToInterventions}
                onChange={setResponseToInterventions}
                options={RESPONSE_LEVELS.map(level => ({ value: level, label: level }))}
                required
              />
              <SelectField
                label="Homework Compliance"
                value={homeworkCompliance}
                onChange={setHomeworkCompliance}
                options={HOMEWORK_COMPLIANCE.map(level => ({ value: level, label: level }))}
              />
            </div>
            <TextAreaField
              label="Client Response Notes"
              value={clientResponseNotes}
              onChange={setClientResponseNotes}
              rows={4}
              placeholder="Additional notes about client's response, insights gained, or other observations..."
            />
          </FormSection>

          {/* SOAP Notes */}
          <FormSection title="SOAP Notes" number={7}>
            <div className="space-y-6">
              <TextAreaField
                label="Subjective"
                value={subjective}
                onChange={setSubjective}
                required
                rows={4}
                placeholder="Client's reported symptoms, concerns, and subjective experience (auto-populated from symptoms)"
              />
              <TextAreaField
                label="Objective"
                value={objective}
                onChange={setObjective}
                required
                rows={4}
                placeholder="Observable behaviors, mental status observations (auto-populated from MSE)"
              />
              <TextAreaField
                label="Assessment"
                value={assessment}
                onChange={setAssessment}
                required
                rows={4}
                placeholder="Clinical impressions, progress evaluation, symptom severity, response to treatment..."
              />
              <TextAreaField
                label="Plan"
                value={plan}
                onChange={setPlan}
                required
                rows={4}
                placeholder="Treatment interventions for this session, homework assigned, follow-up plans..."
              />
            </div>
          </FormSection>

          {/* Safety & Risk */}
          <FormSection title="Safety & Risk" number={8}>
            <div className="space-y-6">
              <SelectField
                label="Risk Level"
                value={riskLevel}
                onChange={setRiskLevel}
                options={RISK_LEVELS.map(level => ({ value: level, label: level }))}
                required
              />
              {(riskLevel === 'Moderate' || riskLevel === 'High') && (
                <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl">
                  <p className="text-sm font-semibold text-gray-700 mb-4">Safety Plan Management</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CheckboxField
                      label="Safety Plan Reviewed"
                      checked={safetyPlanReviewed}
                      onChange={setSafetyPlanReviewed}
                    />
                    <CheckboxField
                      label="Safety Plan Updated"
                      checked={safetyPlanUpdated}
                      onChange={setSafetyPlanUpdated}
                    />
                  </div>
                </div>
              )}
            </div>
          </FormSection>

          {/* Billing */}
          <FormSection title="Billing Information" number={9}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    CPT Code <span className="text-red-500">*</span>
                  </label>
                  <CPTCodeAutocomplete value={cptCode} onChange={setCptCode} />
                </div>
                <TextField
                  label="Session Duration (minutes)"
                  value={sessionDurationMinutes}
                  onChange={setSessionDurationMinutes}
                  placeholder="e.g., 30, 45, 60"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TextField
                  label="Due Date (7-day rule)"
                  type="date"
                  value={dueDate}
                  onChange={setDueDate}
                  required
                />
                <div className="flex items-center">
                  <CheckboxField
                    label="Billable Service"
                    checked={billable}
                    onChange={setBillable}
                  />
                </div>
              </div>
            </div>
          </FormSection>

          {/* Form Actions */}
          <FormActions
            onCancel={() => navigate(`/clients/${clientId}/notes`)}
            onSubmit={handleSubmit}
            submitLabel="Create Progress Note"
            isSubmitting={saveMutation.isPending}
          />
        </form>
      </div>
    </div>
  );
}
