import { useState, useEffect } from 'react';
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
import ICD10Autocomplete from '../../../components/ClinicalNotes/ICD10Autocomplete';
import CPTCodeAutocomplete from '../../../components/ClinicalNotes/CPTCodeAutocomplete';

interface TreatmentGoal {
  goal: string;
  targetDate: string;
  objectives: string[];
  progress: string;
}

export default function TreatmentPlanForm() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [sessionDate, setSessionDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Goals and Objectives
  const [goals, setGoals] = useState<TreatmentGoal[]>([
    { goal: '', targetDate: '', objectives: [''], progress: 'Not Started' },
  ]);

  // Treatment Plan Details - with structured dropdowns
  const [treatmentModality, setTreatmentModality] = useState<string[]>([]);
  const [sessionDuration, setSessionDuration] = useState('');
  const [frequency, setFrequency] = useState('');
  const [treatmentSetting, setTreatmentSetting] = useState('');
  const [dischargeCriteria, setDischargeCriteria] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');

  // Diagnosis & Billing
  const [diagnosisCodes, setDiagnosisCodes] = useState<string[]>([]);
  const [cptCode, setCptCode] = useState('');
  const [billingCode, setBillingCode] = useState('');
  const [billable, setBillable] = useState(true);

  const [nextSessionDate, setNextSessionDate] = useState('');


  // Auto-set due date to 7 days from session date
  useEffect(() => {
    if (sessionDate && !dueDate) {
      const date = new Date(sessionDate);
      date.setDate(date.getDate() + 7);
      setDueDate(date.toISOString().split('T')[0]);
    }
  }, [sessionDate]);

  const addGoal = () => {
    if (goals.length < 5) {
      setGoals([...goals, { goal: '', targetDate: '', objectives: [''], progress: 'Not Started' }]);
    }
  };

  const removeGoal = (index: number) => {
    if (goals.length > 1) {
      setGoals(goals.filter((_, i) => i !== index));
    }
  };

  const updateGoal = (index: number, field: keyof TreatmentGoal, value: any) => {
    const newGoals = [...goals];
    newGoals[index][field] = value;
    setGoals(newGoals);
  };

  const addObjective = (goalIndex: number) => {
    const newGoals = [...goals];
    newGoals[goalIndex].objectives.push('');
    setGoals(newGoals);
  };

  const removeObjective = (goalIndex: number, objectiveIndex: number) => {
    const newGoals = [...goals];
    if (newGoals[goalIndex].objectives.length > 1) {
      newGoals[goalIndex].objectives = newGoals[goalIndex].objectives.filter((_, i) => i !== objectiveIndex);
      setGoals(newGoals);
    }
  };

  const updateObjective = (goalIndex: number, objectiveIndex: number, value: string) => {
    const newGoals = [...goals];
    newGoals[goalIndex].objectives[objectiveIndex] = value;
    setGoals(newGoals);
  };

  const toggleModality = (modality: string) => {
    if (treatmentModality.includes(modality)) {
      setTreatmentModality(treatmentModality.filter(m => m !== modality));
    } else {
      setTreatmentModality([...treatmentModality, modality]);
    }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const goalsText = goals
      .filter(g => g.goal.trim())
      .map((g, i) => {
        const objectivesText = g.objectives.filter(o => o.trim()).map((o, idx) => `  Objective ${idx + 1}: ${o}`).join('\n');
        return `Goal ${i + 1}: ${g.goal}\nProgress: ${g.progress}\nTarget Date: ${g.targetDate || 'Not specified'}\nObjectives:\n${objectivesText}`;
      })
      .join('\n\n');

    const modalityText = treatmentModality.length > 0 ? treatmentModality.join(', ') : 'Not specified';

    const data = {
      clientId,
      noteType: 'Treatment Plan',
      appointmentId: 'temp-appointment-id',
      sessionDate: new Date(sessionDate).toISOString(),
      subjective: goalsText,
      objective: `Treatment Modalities: ${modalityText}\nSession Duration: ${sessionDuration}\nFrequency: ${frequency}\nTreatment Setting: ${treatmentSetting}\nEstimated Duration: ${estimatedDuration}`,
      assessment: `Formal Treatment Plan established with ${goals.filter(g => g.goal.trim()).length} goals`,
      plan: `Discharge Criteria: ${dischargeCriteria}`,
      interventions: modalityText,
      frequency,
      dischargeCriteria,
      diagnosisCodes,
      cptCode,
      billingCode,
      billable,
      nextSessionDate: nextSessionDate ? new Date(nextSessionDate).toISOString() : null,
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
            Treatment Plan
          </h1>
          <p className="text-gray-600 mt-2">Formal treatment planning and goal setting</p>
        </div>

        {/* Error Display */}
        {saveMutation.isError && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 p-4 rounded-lg shadow-sm">
            <p className="text-sm text-red-700">
              {(saveMutation.error as any)?.response?.data?.message || 'Failed to save treatment plan'}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <FormSection title="Session Information" number={1}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <TextField
                label="Session Date"
                type="date"
                value={sessionDate}
                onChange={setSessionDate}
                required
              />
              <TextField
                label="Due Date (7-day rule)"
                type="date"
                value={dueDate}
                onChange={setDueDate}
                required
              />
              <TextField
                label="Next Session Date"
                type="date"
                value={nextSessionDate}
                onChange={setNextSessionDate}
              />
            </div>
          </FormSection>

          {/* Goals and Objectives */}
          <FormSection title="Treatment Goals and Objectives" number={2}>
            <div className="space-y-6">
              {goals.map((goal, goalIndex) => (
                <div key={goalIndex} className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Goal {goalIndex + 1}</h3>
                    {goals.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeGoal(goalIndex)}
                        className="text-red-600 hover:text-red-800 font-semibold transition-colors"
                      >
                        Remove Goal
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Goal Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={goal.goal}
                        onChange={(e) => updateGoal(goalIndex, 'goal', e.target.value)}
                        required
                        rows={3}
                        placeholder="Measurable, specific treatment goal (e.g., 'Client will reduce anxiety symptoms by 50% as measured by GAD-7 scores')..."
                        className="w-full px-4 py-3 bg-white border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <TextField
                        label="Target Date"
                        type="date"
                        value={goal.targetDate}
                        onChange={(value) => updateGoal(goalIndex, 'targetDate', value)}
                      />
                      <SelectField
                        label="Current Progress"
                        value={goal.progress}
                        onChange={(value) => updateGoal(goalIndex, 'progress', value)}
                        options={[
                          { value: 'Not Started', label: 'Not Started' },
                          { value: 'Minimal Progress', label: 'Minimal Progress' },
                          { value: 'Some Progress', label: 'Some Progress' },
                          { value: 'Moderate Progress', label: 'Moderate Progress' },
                          { value: 'Significant Progress', label: 'Significant Progress' },
                          { value: 'Goal Achieved', label: 'Goal Achieved' },
                        ]}
                      />
                    </div>

                    {/* Objectives for this goal */}
                    <div className="mt-4 p-4 bg-white rounded-lg border-2 border-purple-100">
                      <h4 className="text-md font-semibold text-gray-700 mb-3">Measurable Objectives</h4>
                      {goal.objectives.map((objective, objIndex) => (
                        <div key={objIndex} className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={objective}
                            onChange={(e) => updateObjective(goalIndex, objIndex, e.target.value)}
                            placeholder={`Objective ${objIndex + 1} (specific, measurable step toward goal)...`}
                            className="flex-1 px-3 py-2 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          {goal.objectives.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeObjective(goalIndex, objIndex)}
                              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addObjective(goalIndex)}
                        className="mt-2 text-sm text-purple-600 hover:text-purple-800 font-semibold"
                      >
                        + Add Objective
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {goals.length < 5 && (
                <button
                  type="button"
                  onClick={addGoal}
                  className="w-full py-3 border-2 border-dashed border-purple-300 text-purple-600 rounded-xl hover:bg-purple-50 transition-colors font-semibold"
                >
                  + Add Another Goal (up to 5)
                </button>
              )}
            </div>
          </FormSection>

          {/* Treatment Details */}
          <FormSection title="Treatment Details" number={3}>
            <div className="space-y-6">
              {/* Treatment Modalities */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Treatment Modalities/Interventions <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-gray-600 mb-3">Select all therapeutic approaches that will be used</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    'Cognitive Behavioral Therapy (CBT)',
                    'Dialectical Behavior Therapy (DBT)',
                    'Acceptance and Commitment Therapy (ACT)',
                    'EMDR',
                    'Psychodynamic Therapy',
                    'Solution-Focused Brief Therapy',
                    'Motivational Interviewing',
                    'Mindfulness-Based Therapy',
                    'Trauma-Focused CBT',
                    'Interpersonal Therapy (IPT)',
                    'Family Systems Therapy',
                    'Narrative Therapy',
                    'Exposure Therapy',
                    'Play Therapy',
                    'Art Therapy',
                    'Group Therapy',
                    'Psychoeducation',
                    'Supportive Counseling',
                  ].map((modality) => (
                    <CheckboxField
                      key={modality}
                      label={modality}
                      checked={treatmentModality.includes(modality)}
                      onChange={() => toggleModality(modality)}
                    />
                  ))}
                </div>
              </div>

              {/* Session Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SelectField
                  label="Session Duration"
                  value={sessionDuration}
                  onChange={setSessionDuration}
                  required
                  options={[
                    { value: '30 minutes', label: '30 minutes' },
                    { value: '45 minutes', label: '45 minutes' },
                    { value: '50 minutes', label: '50 minutes' },
                    { value: '60 minutes', label: '60 minutes (1 hour)' },
                    { value: '75 minutes', label: '75 minutes' },
                    { value: '90 minutes', label: '90 minutes (1.5 hours)' },
                    { value: '120 minutes', label: '120 minutes (2 hours)' },
                  ]}
                />

                <SelectField
                  label="Frequency of Services"
                  value={frequency}
                  onChange={setFrequency}
                  required
                  options={[
                    { value: 'Once per week', label: 'Once per week' },
                    { value: 'Twice per week', label: 'Twice per week' },
                    { value: 'Three times per week', label: 'Three times per week' },
                    { value: 'Every other week (bi-weekly)', label: 'Every other week (bi-weekly)' },
                    { value: 'Once per month', label: 'Once per month' },
                    { value: 'As needed', label: 'As needed' },
                  ]}
                />

                <SelectField
                  label="Treatment Setting"
                  value={treatmentSetting}
                  onChange={setTreatmentSetting}
                  required
                  options={[
                    { value: 'Office', label: 'Office' },
                    { value: 'Telehealth', label: 'Telehealth' },
                    { value: 'Home', label: 'Home' },
                    { value: 'School', label: 'School' },
                    { value: 'Hospital', label: 'Hospital' },
                    { value: 'Hybrid (Office + Telehealth)', label: 'Hybrid (Office + Telehealth)' },
                  ]}
                />
              </div>

              <SelectField
                label="Estimated Duration of Treatment"
                value={estimatedDuration}
                onChange={setEstimatedDuration}
                required
                options={[
                  { value: '6-8 weeks (Short-term)', label: '6-8 weeks (Short-term)' },
                  { value: '3 months', label: '3 months' },
                  { value: '6 months', label: '6 months' },
                  { value: '9 months', label: '9 months' },
                  { value: '12 months (1 year)', label: '12 months (1 year)' },
                  { value: '18 months', label: '18 months' },
                  { value: '2 years or more (Long-term)', label: '2 years or more (Long-term)' },
                  { value: 'Ongoing/Indefinite', label: 'Ongoing/Indefinite' },
                ]}
              />

              <TextAreaField
                label="Discharge Criteria"
                value={dischargeCriteria}
                onChange={setDischargeCriteria}
                required
                rows={4}
                placeholder="Specific, measurable criteria that indicate when treatment goals have been met and client is ready for discharge (e.g., 'Client reports anxiety levels below 10 on GAD-7 for 3 consecutive sessions', 'Client demonstrates consistent use of coping skills independently')..."
              />
            </div>
          </FormSection>

          {/* Diagnosis & Billing */}
          <FormSection title="Diagnosis & Billing" number={4}>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Diagnosis Codes (ICD-10) <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-gray-600 mb-2">
                  Update or confirm diagnosis codes for this treatment plan
                </p>
                <ICD10Autocomplete
                  selectedCodes={diagnosisCodes}
                  onCodesChange={setDiagnosisCodes}
                />
              </div>

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
            submitLabel="Create Treatment Plan"
            isSubmitting={saveMutation.isPending}
          />
        </form>
      </div>
    </div>
  );
}
