import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

// Types matching the shared package
type SeverityLevel = 'NA' | 'MILD' | 'MODERATE' | 'SEVERE';
type TransportationOption = 'YES' | 'NO' | 'OTHER';

interface PAQuestionnaireFormData {
  // Header fields (read-only)
  clientName?: string;
  clientDOB?: string;
  diagnosisDisplay?: string;
  insuranceDisplay?: string;

  // Anxiety symptoms
  anxiety_obsessions_compulsions: SeverityLevel;
  anxiety_generalized: SeverityLevel;
  anxiety_panic_attacks: SeverityLevel;
  anxiety_phobias: SeverityLevel;
  anxiety_somatic_complaints: SeverityLevel;
  anxiety_ptsd_symptoms: SeverityLevel;

  // Mania symptoms
  mania_insomnia: SeverityLevel;
  mania_grandiosity: SeverityLevel;
  mania_pressured_speech: SeverityLevel;
  mania_racing_thoughts: SeverityLevel;
  mania_poor_judgement: SeverityLevel;

  // Psychotic symptoms
  psychotic_delusions_paranoia: SeverityLevel;
  psychotic_selfcare_issues: SeverityLevel;
  psychotic_hallucinations: SeverityLevel;
  psychotic_disorganized_thought: SeverityLevel;
  psychotic_loose_associations: SeverityLevel;

  // Depression symptoms
  depression_impaired_concentration: SeverityLevel;
  depression_impaired_memory: SeverityLevel;
  depression_psychomotor_retardation: SeverityLevel;
  depression_sexual_issues: SeverityLevel;
  depression_appetite_disturbance: SeverityLevel;
  depression_irritability: SeverityLevel;
  depression_agitation: SeverityLevel;
  depression_sleep_disturbance: SeverityLevel;
  depression_hopelessness: SeverityLevel;

  // Substance use
  substance_loss_of_control: SeverityLevel;
  substance_amnesic_episodes: SeverityLevel;
  substance_legal_problems: SeverityLevel;
  substance_alcohol_abuse: SeverityLevel;
  substance_opiate_abuse: SeverityLevel;
  substance_prescription_abuse: SeverityLevel;
  substance_polysubstance_abuse: SeverityLevel;
  substance_other_drugs?: string;

  // Personality
  personality_oddness: SeverityLevel;
  personality_oppositional: SeverityLevel;
  personality_disregard_law: SeverityLevel;
  personality_self_injuries: SeverityLevel;
  personality_entitlement: SeverityLevel;
  personality_passive_aggressive: SeverityLevel;
  personality_dependency: SeverityLevel;
  personality_enduring_traits?: string;

  // Narratives
  narrative_risk_of_harm: string;
  narrative_functional_status: string;
  narrative_comorbidities: string;
  narrative_environmental_stressors: string;
  narrative_natural_support: string;
  narrative_treatment_response: string;
  narrative_level_of_care: string;
  narrative_history: string;
  narrative_presenting_problems: string;
  narrative_other_clinical_info?: string;
  narrative_current_medications: string;

  // Transportation
  transportation_available: TransportationOption;
  transportation_notes?: string;
}

interface QuestionnaireResponse {
  id: string;
  priorAuthorizationId: string;
  formData: PAQuestionnaireFormData;
  aiGeneratedAt?: string;
  aiGeneratedBy?: string;
  aiDataSourcesSummary?: Record<string, string[]>;
  aiConfidenceScores?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

interface PAQuestionnaireFormProps {
  priorAuthorizationId: string;
  onClose: () => void;
}

// Symptom categories for the form
const SYMPTOM_CATEGORIES = [
  {
    name: 'Anxiety',
    color: 'from-amber-500 to-orange-500',
    bgColor: 'from-amber-50 to-orange-50',
    fields: [
      { key: 'anxiety_obsessions_compulsions', label: 'Obsessions / Compulsions' },
      { key: 'anxiety_generalized', label: 'Generalized Anxiety' },
      { key: 'anxiety_panic_attacks', label: 'Panic Attacks' },
      { key: 'anxiety_phobias', label: 'Phobias' },
      { key: 'anxiety_somatic_complaints', label: 'Somatic Complaints' },
      { key: 'anxiety_ptsd_symptoms', label: 'PTSD Symptoms' },
    ],
  },
  {
    name: 'Mania',
    color: 'from-purple-500 to-pink-500',
    bgColor: 'from-purple-50 to-pink-50',
    fields: [
      { key: 'mania_insomnia', label: 'Insomnia' },
      { key: 'mania_grandiosity', label: 'Grandiosity' },
      { key: 'mania_pressured_speech', label: 'Pressured Speech' },
      { key: 'mania_racing_thoughts', label: 'Racing Thoughts' },
      { key: 'mania_poor_judgement', label: 'Poor Judgement' },
    ],
  },
  {
    name: 'Psychotic',
    color: 'from-red-500 to-rose-500',
    bgColor: 'from-red-50 to-rose-50',
    fields: [
      { key: 'psychotic_delusions_paranoia', label: 'Delusions / Paranoia' },
      { key: 'psychotic_selfcare_issues', label: 'Self-Care Issues' },
      { key: 'psychotic_hallucinations', label: 'Hallucinations' },
      { key: 'psychotic_disorganized_thought', label: 'Disorganized Thought' },
      { key: 'psychotic_loose_associations', label: 'Loose Associations' },
    ],
  },
  {
    name: 'Depression',
    color: 'from-blue-500 to-indigo-500',
    bgColor: 'from-blue-50 to-indigo-50',
    fields: [
      { key: 'depression_impaired_concentration', label: 'Impaired Concentration' },
      { key: 'depression_impaired_memory', label: 'Impaired Memory' },
      { key: 'depression_psychomotor_retardation', label: 'Psychomotor Retardation' },
      { key: 'depression_sexual_issues', label: 'Sexual Issues' },
      { key: 'depression_appetite_disturbance', label: 'Appetite Disturbance' },
      { key: 'depression_irritability', label: 'Irritability' },
      { key: 'depression_agitation', label: 'Agitation' },
      { key: 'depression_sleep_disturbance', label: 'Sleep Disturbance' },
      { key: 'depression_hopelessness', label: 'Hopelessness' },
    ],
  },
  {
    name: 'Substance Use',
    color: 'from-green-500 to-emerald-500',
    bgColor: 'from-green-50 to-emerald-50',
    fields: [
      { key: 'substance_loss_of_control', label: 'Loss of Control' },
      { key: 'substance_amnesic_episodes', label: 'Amnesic Episodes' },
      { key: 'substance_legal_problems', label: 'Legal Problems' },
      { key: 'substance_alcohol_abuse', label: 'Alcohol Abuse' },
      { key: 'substance_opiate_abuse', label: 'Opiate Abuse' },
      { key: 'substance_prescription_abuse', label: 'Prescription Abuse' },
      { key: 'substance_polysubstance_abuse', label: 'Polysubstance Abuse' },
    ],
    textField: { key: 'substance_other_drugs', label: 'Other Drugs (specify)' },
  },
  {
    name: 'Personality',
    color: 'from-cyan-500 to-teal-500',
    bgColor: 'from-cyan-50 to-teal-50',
    fields: [
      { key: 'personality_oddness', label: 'Oddness' },
      { key: 'personality_oppositional', label: 'Oppositional Behavior' },
      { key: 'personality_disregard_law', label: 'Disregard for Law' },
      { key: 'personality_self_injuries', label: 'Self-Injuries' },
      { key: 'personality_entitlement', label: 'Entitlement' },
      { key: 'personality_passive_aggressive', label: 'Passive-Aggressive' },
      { key: 'personality_dependency', label: 'Dependency' },
    ],
    textField: { key: 'personality_enduring_traits', label: 'Enduring Personality Traits' },
  },
];

const NARRATIVE_SECTIONS = [
  { key: 'narrative_history', label: 'Psychiatric History', prompt: 'Document relevant psychiatric history, previous diagnoses, hospitalizations, and treatment history.' },
  { key: 'narrative_presenting_problems', label: 'Presenting Problems', prompt: 'Describe current chief complaints, symptoms, and reasons for treatment.' },
  { key: 'narrative_risk_of_harm', label: 'Risk of Harm', prompt: 'Document any suicidal ideation, homicidal ideation, self-harm history, or safety concerns.' },
  { key: 'narrative_functional_status', label: 'Functional Status', prompt: 'Describe ability to perform ADLs, work/school functioning, and relationship functioning.' },
  { key: 'narrative_comorbidities', label: 'Medical Comorbidities', prompt: 'List physical health conditions that may affect or be affected by mental health treatment.' },
  { key: 'narrative_environmental_stressors', label: 'Environmental Stressors', prompt: 'Document social determinants, housing, financial, legal, or relationship stressors.' },
  { key: 'narrative_natural_support', label: 'Natural Support Systems', prompt: 'Describe family support, friends, community resources, and other support systems.' },
  { key: 'narrative_treatment_response', label: 'Treatment Response', prompt: 'How has the client responded to current and past treatments? What has worked or not worked?' },
  { key: 'narrative_level_of_care', label: 'Level of Care Justification', prompt: 'Justify why the requested level of care is medically necessary.' },
  { key: 'narrative_current_medications', label: 'Current Medications', prompt: 'List all current psychiatric medications with doses and frequencies.' },
  { key: 'narrative_other_clinical_info', label: 'Other Clinical Information', prompt: 'Any additional clinically relevant information not covered above.' },
];

const DEFAULT_FORM_DATA: PAQuestionnaireFormData = {
  anxiety_obsessions_compulsions: 'NA',
  anxiety_generalized: 'NA',
  anxiety_panic_attacks: 'NA',
  anxiety_phobias: 'NA',
  anxiety_somatic_complaints: 'NA',
  anxiety_ptsd_symptoms: 'NA',
  mania_insomnia: 'NA',
  mania_grandiosity: 'NA',
  mania_pressured_speech: 'NA',
  mania_racing_thoughts: 'NA',
  mania_poor_judgement: 'NA',
  psychotic_delusions_paranoia: 'NA',
  psychotic_selfcare_issues: 'NA',
  psychotic_hallucinations: 'NA',
  psychotic_disorganized_thought: 'NA',
  psychotic_loose_associations: 'NA',
  depression_impaired_concentration: 'NA',
  depression_impaired_memory: 'NA',
  depression_psychomotor_retardation: 'NA',
  depression_sexual_issues: 'NA',
  depression_appetite_disturbance: 'NA',
  depression_irritability: 'NA',
  depression_agitation: 'NA',
  depression_sleep_disturbance: 'NA',
  depression_hopelessness: 'NA',
  substance_loss_of_control: 'NA',
  substance_amnesic_episodes: 'NA',
  substance_legal_problems: 'NA',
  substance_alcohol_abuse: 'NA',
  substance_opiate_abuse: 'NA',
  substance_prescription_abuse: 'NA',
  substance_polysubstance_abuse: 'NA',
  personality_oddness: 'NA',
  personality_oppositional: 'NA',
  personality_disregard_law: 'NA',
  personality_self_injuries: 'NA',
  personality_entitlement: 'NA',
  personality_passive_aggressive: 'NA',
  personality_dependency: 'NA',
  narrative_risk_of_harm: '',
  narrative_functional_status: '',
  narrative_comorbidities: '',
  narrative_environmental_stressors: '',
  narrative_natural_support: '',
  narrative_treatment_response: '',
  narrative_level_of_care: '',
  narrative_history: '',
  narrative_presenting_problems: '',
  narrative_current_medications: '',
  transportation_available: 'YES',
};

// Severity dropdown component
function SeveritySelect({
  value,
  onChange,
  disabled,
}: {
  value: SeverityLevel;
  onChange: (value: SeverityLevel) => void;
  disabled?: boolean;
}) {
  const options: { value: SeverityLevel; label: string; color: string }[] = [
    { value: 'NA', label: 'N/A', color: 'bg-gray-100 text-gray-600' },
    { value: 'MILD', label: 'Mild', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'MODERATE', label: 'Moderate', color: 'bg-orange-100 text-orange-700' },
    { value: 'SEVERE', label: 'Severe', color: 'bg-red-100 text-red-700' },
  ];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SeverityLevel)}
      disabled={disabled}
      className={`w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 font-semibold ${
        options.find((o) => o.value === value)?.color || ''
      }`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export default function PAQuestionnaireForm({ priorAuthorizationId, onClose }: PAQuestionnaireFormProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<PAQuestionnaireFormData>(DEFAULT_FORM_DATA);
  const [activeTab, setActiveTab] = useState<'symptoms' | 'narratives'>('symptoms');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Anxiety');
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch existing questionnaire
  const { data: questionnaire, isLoading } = useQuery<QuestionnaireResponse>({
    queryKey: ['pa-questionnaire', priorAuthorizationId],
    queryFn: async () => {
      const response = await api.get(`/prior-authorizations/${priorAuthorizationId}/questionnaire`);
      return response.data.data;
    },
    retry: false,
  });

  // Update form when questionnaire loads
  useEffect(() => {
    if (questionnaire?.formData) {
      setFormData({ ...DEFAULT_FORM_DATA, ...questionnaire.formData });
    }
  }, [questionnaire]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: PAQuestionnaireFormData) => {
      const response = await api.post(`/prior-authorizations/${priorAuthorizationId}/questionnaire`, {
        formData: data,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pa-questionnaire', priorAuthorizationId] });
    },
  });

  // Generate with Lisa mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      const response = await api.post(`/prior-authorizations/${priorAuthorizationId}/generate-with-lisa`);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.data?.questionnaire?.formData) {
        setFormData({ ...DEFAULT_FORM_DATA, ...data.data.questionnaire.formData });
      }
      queryClient.invalidateQueries({ queryKey: ['pa-questionnaire', priorAuthorizationId] });
      setIsGenerating(false);
    },
    onError: () => {
      setIsGenerating(false);
    },
  });

  const updateField = (key: string, value: string | SeverityLevel | TransportationOption) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleGenerateWithLisa = () => {
    generateMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-700 font-semibold">Loading Questionnaire...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Prior Authorization Questionnaire</h2>
              <p className="text-indigo-100 mt-1">Georgia Medicaid CMO Clinical Documentation</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Header Info */}
          {formData.clientName && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-indigo-200">Client</p>
                <p className="font-semibold">{formData.clientName}</p>
              </div>
              <div>
                <p className="text-indigo-200">DOB</p>
                <p className="font-semibold">{formData.clientDOB ? new Date(formData.clientDOB).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-indigo-200">Insurance</p>
                <p className="font-semibold">{formData.insuranceDisplay || 'N/A'}</p>
              </div>
              <div>
                <p className="text-indigo-200">Diagnoses</p>
                <p className="font-semibold text-xs">{formData.diagnosisDisplay || 'N/A'}</p>
              </div>
            </div>
          )}

          {/* AI Generation Status */}
          {questionnaire?.aiGeneratedAt && (
            <div className="mt-4 p-3 bg-white/20 rounded-xl">
              <p className="text-sm">
                <span className="font-semibold">AI Generated:</span>{' '}
                {new Date(questionnaire.aiGeneratedAt).toLocaleString()}
                {questionnaire.aiConfidenceScores?.overall && (
                  <span className="ml-2">
                    (Confidence: {Math.round(questionnaire.aiConfidenceScores.overall * 100)}%)
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Generate with Lisa Button */}
        <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-indigo-200">
          <button
            onClick={handleGenerateWithLisa}
            disabled={isGenerating || generateMutation.isPending}
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 font-bold flex items-center justify-center gap-3 disabled:opacity-50 disabled:transform-none"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Lisa is analyzing patient chart...</span>
              </>
            ) : (
              <>
                <span className="text-2xl">AI</span>
                <span>Generate with Lisa</span>
                <span className="text-sm opacity-80">(Auto-fill from patient chart)</span>
              </>
            )}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('symptoms')}
            className={`flex-1 px-6 py-3 font-semibold transition-colors ${
              activeTab === 'symptoms'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            Clinical Symptoms Grid
          </button>
          <button
            onClick={() => setActiveTab('narratives')}
            className={`flex-1 px-6 py-3 font-semibold transition-colors ${
              activeTab === 'narratives'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            Narrative Sections
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'symptoms' && (
            <div className="space-y-4">
              {SYMPTOM_CATEGORIES.map((category) => (
                <div
                  key={category.name}
                  className={`rounded-xl border-2 border-gray-200 overflow-hidden`}
                >
                  {/* Category Header */}
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === category.name ? null : category.name)}
                    className={`w-full p-4 bg-gradient-to-r ${category.color} text-white font-bold flex items-center justify-between`}
                  >
                    <span>{category.name}</span>
                    <span className="text-xl">{expandedCategory === category.name ? '−' : '+'}</span>
                  </button>

                  {/* Category Content */}
                  {expandedCategory === category.name && (
                    <div className={`p-4 bg-gradient-to-br ${category.bgColor}`}>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {category.fields.map((field) => (
                          <div key={field.key} className="bg-white rounded-lg p-3 shadow-sm">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              {field.label}
                            </label>
                            <SeveritySelect
                              value={formData[field.key as keyof PAQuestionnaireFormData] as SeverityLevel || 'NA'}
                              onChange={(value) => updateField(field.key, value)}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Text field for category if exists */}
                      {category.textField && (
                        <div className="mt-4 bg-white rounded-lg p-3 shadow-sm">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {category.textField.label}
                          </label>
                          <input
                            type="text"
                            value={formData[category.textField.key as keyof PAQuestionnaireFormData] as string || ''}
                            onChange={(e) => updateField(category.textField!.key, e.target.value)}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                            placeholder={`Enter ${category.textField.label.toLowerCase()}...`}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Transportation */}
              <div className="rounded-xl border-2 border-gray-200 p-4 bg-gray-50">
                <h3 className="font-bold text-gray-800 mb-4">Transportation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Transportation Available
                    </label>
                    <select
                      value={formData.transportation_available}
                      onChange={(e) => updateField('transportation_available', e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500"
                    >
                      <option value="YES">Yes</option>
                      <option value="NO">No</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Transportation Notes
                    </label>
                    <input
                      type="text"
                      value={formData.transportation_notes || ''}
                      onChange={(e) => updateField('transportation_notes', e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500"
                      placeholder="Enter transportation notes..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'narratives' && (
            <div className="space-y-6">
              {NARRATIVE_SECTIONS.map((section) => (
                <div key={section.key} className="bg-white rounded-xl border-2 border-gray-200 p-4 shadow-sm">
                  <label className="block text-lg font-bold text-gray-800 mb-1">
                    {section.label}
                  </label>
                  <p className="text-sm text-gray-500 mb-3">{section.prompt}</p>
                  <textarea
                    value={formData[section.key as keyof PAQuestionnaireFormData] as string || ''}
                    onChange={(e) => updateField(section.key, e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 resize-y"
                    placeholder={`Enter ${section.label.toLowerCase()}...`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-3 text-gray-700 hover:text-gray-900 font-semibold"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            <a
              href={`${import.meta.env.VITE_API_URL || ''}/api/v1/prior-authorizations/${priorAuthorizationId}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-bold flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF
            </a>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-bold disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Questionnaire'}
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {saveMutation.isSuccess && (
          <div className="absolute bottom-20 left-4 right-4 bg-green-100 text-green-800 p-4 rounded-xl border border-green-300">
            Questionnaire saved successfully!
          </div>
        )}
        {saveMutation.isError && (
          <div className="absolute bottom-20 left-4 right-4 bg-red-100 text-red-800 p-4 rounded-xl border border-red-300">
            Failed to save questionnaire. Please try again.
          </div>
        )}
        {generateMutation.isError && (
          <div className="absolute bottom-20 left-4 right-4 bg-red-100 text-red-800 p-4 rounded-xl border border-red-300">
            Failed to generate questionnaire with Lisa. Please try again or fill manually.
          </div>
        )}
      </div>
    </div>
  );
}
