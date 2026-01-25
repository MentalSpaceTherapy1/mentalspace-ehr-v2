/**
 * AuthorizationForm.tsx
 *
 * Complete Prior Authorization form combining:
 * - Basic PA fields (insurance, auth number, dates, CPT codes, etc.)
 * - PRD-compliant Clinical Questionnaire (39 severity fields + 12 narrative sections)
 * - Generate with Lisa AI integration
 */

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import ICD10Autocomplete from '../ClinicalNotes/ICD10Autocomplete';
import ClinicalGridSection from '../../pages/PriorAuthorization/PriorAuthorizationForm/ClinicalGridSection';
import NarrativeSectionsContainer, { TransportationOption } from '../../pages/PriorAuthorization/PriorAuthorizationForm/NarrativeSectionsContainer';
import GenerateWithLisaButton from '../../pages/PriorAuthorization/PriorAuthorizationForm/GenerateWithLisaButton';
import { SeverityLevel } from '../../pages/PriorAuthorization/PriorAuthorizationForm/SeverityDropdown';

interface PriorAuthorization {
  id: string;
  clientId: string;
  insuranceId: string;
  insurance: {
    id: string;
    insuranceCompany: string;
    rank: string;
  };
  authorizationNumber: string;
  authorizationType: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED' | 'EXHAUSTED';
  sessionsAuthorized: number;
  sessionsUsed: number;
  sessionsRemaining: number;
  startDate: string;
  endDate: string;
  cptCodes: string[];
  diagnosisCodes: string[];
  clinicalJustification?: string;
  requestingProviderId: string;
  requestingProvider?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  lastUsedDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface Insurance {
  id: string;
  insuranceCompany: string;
  rank: string;
}

interface Provider {
  id: string;
  firstName: string;
  lastName: string;
  title?: string;
}

interface AuthorizationFormProps {
  clientId: string;
  authorization?: PriorAuthorization | null;
  onClose: () => void;
}

// Common CPT codes for mental health
const COMMON_CPT_CODES = [
  { code: '90791', description: 'Psychiatric diagnostic evaluation' },
  { code: '90792', description: 'Psychiatric diagnostic evaluation with medical services' },
  { code: '90832', description: 'Psychotherapy, 30 minutes' },
  { code: '90834', description: 'Psychotherapy, 45 minutes' },
  { code: '90837', description: 'Psychotherapy, 60 minutes' },
  { code: '90846', description: 'Family psychotherapy without patient' },
  { code: '90847', description: 'Family psychotherapy with patient' },
  { code: '90853', description: 'Group psychotherapy' },
];

// Default clinical questionnaire data
const DEFAULT_QUESTIONNAIRE_DATA: Record<string, any> = {
  // Anxiety Disorders (6 fields)
  anxiety_obsessions_compulsions: 'NA',
  anxiety_generalized: 'NA',
  anxiety_panic_attacks: 'NA',
  anxiety_phobias: 'NA',
  anxiety_somatic_complaints: 'NA',
  anxiety_ptsd_symptoms: 'NA',

  // Mania (5 fields)
  mania_insomnia: 'NA',
  mania_grandiosity: 'NA',
  mania_pressured_speech: 'NA',
  mania_racing_thoughts: 'NA',
  mania_poor_judgement: 'NA',

  // Psychotic Disorders (5 fields)
  psychotic_delusions_paranoia: 'NA',
  psychotic_selfcare_issues: 'NA',
  psychotic_hallucinations: 'NA',
  psychotic_disorganized_thought: 'NA',
  psychotic_loose_associations: 'NA',

  // Depression (9 fields)
  depression_impaired_concentration: 'NA',
  depression_impaired_memory: 'NA',
  depression_psychomotor_retardation: 'NA',
  depression_sexual_issues: 'NA',
  depression_appetite_disturbance: 'NA',
  depression_irritability: 'NA',
  depression_agitation: 'NA',
  depression_sleep_disturbance: 'NA',
  depression_hopelessness: 'NA',

  // Substance Abuse (7 dropdowns + 1 text)
  substance_loss_of_control: 'NA',
  substance_amnesic_episodes: 'NA',
  substance_legal_problems: 'NA',
  substance_alcohol_abuse: 'NA',
  substance_opiate_abuse: 'NA',
  substance_prescription_abuse: 'NA',
  substance_polysubstance_abuse: 'NA',
  substance_other_drugs: '',

  // Personality Disorder (7 dropdowns + 1 text)
  personality_oddness: 'NA',
  personality_oppositional: 'NA',
  personality_disregard_law: 'NA',
  personality_self_injuries: 'NA',
  personality_entitlement: 'NA',
  personality_passive_aggressive: 'NA',
  personality_dependency: 'NA',
  personality_enduring_traits: '',

  // Narrative Sections (12 fields)
  narrative_risk_of_harm: '',
  narrative_functional_status: '',
  narrative_comorbidities: '',
  narrative_environmental_stressors: '',
  narrative_natural_support: '',
  narrative_treatment_response: '',
  narrative_level_of_care: '',
  transportation_available: 'YES',
  transportation_notes: '',
  narrative_history: '',
  narrative_presenting_problems: '',
  narrative_other_clinical_info: '',
  narrative_current_medications: '',
};

export default function AuthorizationForm({ clientId, authorization, onClose }: AuthorizationFormProps) {
  const queryClient = useQueryClient();
  const [cptSearchTerm, setCptSearchTerm] = useState('');
  const [showCptDropdown, setShowCptDropdown] = useState(false);
  const [activeSection, setActiveSection] = useState<'basic' | 'clinical' | 'narratives'>('basic');
  const [isGenerating, setIsGenerating] = useState(false);

  // Basic PA form data
  const [formData, setFormData] = useState<{
    insuranceId: string;
    authorizationNumber: string;
    authorizationType: string;
    status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED' | 'EXHAUSTED';
    sessionsAuthorized: string;
    startDate: string;
    endDate: string;
    cptCodes: string[];
    diagnosisCodes: string[];
    clinicalJustification: string;
    requestingProviderId: string;
  }>({
    insuranceId: '',
    authorizationNumber: '',
    authorizationType: 'OUTPATIENT_MENTAL_HEALTH',
    status: 'PENDING',
    sessionsAuthorized: '',
    startDate: '',
    endDate: '',
    cptCodes: [],
    diagnosisCodes: [],
    clinicalJustification: '',
    requestingProviderId: '',
  });

  // Clinical questionnaire data
  const [questionnaireData, setQuestionnaireData] = useState<Record<string, any>>(DEFAULT_QUESTIONNAIRE_DATA);

  // Fetch client's insurance
  const { data: insuranceList } = useQuery<Insurance[]>({
    queryKey: ['insurance', clientId],
    queryFn: async () => {
      const response = await api.get(`/insurance/client/${clientId}`);
      return response.data.data;
    },
  });

  // Fetch providers
  const { data: providers } = useQuery<Provider[]>({
    queryKey: ['providers'],
    queryFn: async () => {
      const response = await api.get('/users?role=PSYCHIATRIST,PSYCHOLOGIST,THERAPIST,SOCIAL_WORKER');
      return response.data.data;
    },
  });

  // Fetch existing questionnaire if editing
  const { data: existingQuestionnaire } = useQuery({
    queryKey: ['pa-questionnaire', authorization?.id],
    queryFn: async () => {
      if (!authorization?.id) return null;
      try {
        const response = await api.get(`/prior-authorizations/${authorization.id}/questionnaire`);
        return response.data.data || response.data;
      } catch {
        return null;
      }
    },
    enabled: !!authorization?.id,
  });

  // Initialize form with authorization data
  useEffect(() => {
    if (authorization) {
      setFormData({
        insuranceId: authorization.insuranceId,
        authorizationNumber: authorization.authorizationNumber,
        authorizationType: authorization.authorizationType,
        status: authorization.status,
        sessionsAuthorized: authorization.sessionsAuthorized.toString(),
        startDate: new Date(authorization.startDate).toISOString().split('T')[0],
        endDate: new Date(authorization.endDate).toISOString().split('T')[0],
        cptCodes: authorization.cptCodes,
        diagnosisCodes: authorization.diagnosisCodes,
        clinicalJustification: authorization.clinicalJustification || '',
        requestingProviderId: authorization.requestingProviderId,
      });
    }
  }, [authorization]);

  // Load existing questionnaire data
  useEffect(() => {
    if (existingQuestionnaire) {
      const loadedData = existingQuestionnaire.formData || existingQuestionnaire;
      setQuestionnaireData({ ...DEFAULT_QUESTIONNAIRE_DATA, ...loadedData });
    }
  }, [existingQuestionnaire]);

  // Save mutation - creates/updates PA and questionnaire together
  const saveMutation = useMutation({
    mutationFn: async () => {
      const submitData = {
        ...formData,
        clientId,
        sessionsAuthorized: parseInt(formData.sessionsAuthorized),
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
      };

      let paId = authorization?.id;

      // Create or update PA
      if (authorization) {
        await api.put(`/prior-authorizations/${authorization.id}`, submitData);
      } else {
        const response = await api.post('/prior-authorizations', submitData);
        paId = response.data.data?.id || response.data.id;
      }

      // Save questionnaire data
      if (paId) {
        await api.post(`/prior-authorizations/${paId}/questionnaire`, {
          formData: questionnaireData,
        });
      }

      return { paId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prior-authorizations', clientId] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleQuestionnaireChange = (field: string, value: SeverityLevel | TransportationOption | string) => {
    setQuestionnaireData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddCptCode = (code: string) => {
    if (!formData.cptCodes.includes(code)) {
      setFormData(prev => ({ ...prev, cptCodes: [...prev.cptCodes, code] }));
    }
    setCptSearchTerm('');
    setShowCptDropdown(false);
  };

  const handleRemoveCptCode = (code: string) => {
    setFormData(prev => ({ ...prev, cptCodes: prev.cptCodes.filter(c => c !== code) }));
  };

  const handleGenerateWithLisa = (generatedData: Record<string, any>) => {
    setQuestionnaireData({ ...DEFAULT_QUESTIONNAIRE_DATA, ...generatedData });
  };

  const filteredCptCodes = COMMON_CPT_CODES.filter(
    item =>
      item.code.toLowerCase().includes(cptSearchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(cptSearchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl shadow-xl border-l-4 border-l-indigo-500 max-h-[90vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            {authorization ? 'Edit Prior Authorization' : 'New Prior Authorization'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Complete the clinical questionnaire for insurance authorization
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-2xl font-bold p-2 hover:bg-gray-100 rounded-full"
        >
          ×
        </button>
      </div>

      {/* Section Navigation */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          type="button"
          onClick={() => setActiveSection('basic')}
          className={`flex-1 px-6 py-4 font-semibold text-sm transition-colors ${
            activeSection === 'basic'
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
          }`}
        >
          1. Authorization Details
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('clinical')}
          className={`flex-1 px-6 py-4 font-semibold text-sm transition-colors ${
            activeSection === 'clinical'
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
          }`}
        >
          2. Clinical Grid (39 symptoms)
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('narratives')}
          className={`flex-1 px-6 py-4 font-semibold text-sm transition-colors ${
            activeSection === 'narratives'
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
          }`}
        >
          3. Narrative Sections (12)
        </button>
      </div>

      {/* Generate with Lisa Button */}
      {(activeSection === 'clinical' || activeSection === 'narratives') && (
        <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
          <GenerateWithLisaButton
            priorAuthId={authorization?.id || 'new'}
            onGenerationComplete={handleGenerateWithLisa}
            onError={(error) => console.error('Lisa generation failed:', error)}
            isLoading={isGenerating}
            disabled={saveMutation.isPending}
          />
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit}>
          {/* Section 1: Basic Authorization Details */}
          {activeSection === 'basic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Insurance */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Insurance <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="insuranceId"
                    value={formData.insuranceId}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200"
                  >
                    <option value="">Select Insurance</option>
                    {insuranceList?.map((insurance) => (
                      <option key={insurance.id} value={insurance.id}>
                        {insurance.insuranceCompany} ({insurance.rank})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Authorization Number */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Authorization Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="authorizationNumber"
                    value={formData.authorizationNumber}
                    onChange={handleChange}
                    required
                    placeholder="e.g., AUTH-2024-12345"
                    className="w-full px-3 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200"
                  />
                </div>

                {/* Authorization Type */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Authorization Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="authorizationType"
                    value={formData.authorizationType}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200"
                  >
                    <option value="OUTPATIENT_MENTAL_HEALTH">Outpatient Mental Health</option>
                    <option value="INTENSIVE_OUTPATIENT">Intensive Outpatient Program (IOP)</option>
                    <option value="PARTIAL_HOSPITALIZATION">Partial Hospitalization Program (PHP)</option>
                    <option value="PSYCHOLOGICAL_TESTING">Psychological Testing</option>
                    <option value="FAMILY_THERAPY">Family Therapy</option>
                    <option value="GROUP_THERAPY">Group Therapy</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="DENIED">Denied</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="EXHAUSTED">Exhausted</option>
                  </select>
                </div>

                {/* Sessions Authorized */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Sessions Authorized <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="sessionsAuthorized"
                    value={formData.sessionsAuthorized}
                    onChange={handleChange}
                    required
                    min="1"
                    placeholder="e.g., 20"
                    className="w-full px-3 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200"
                  />
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200"
                  />
                </div>

                {/* Requesting Provider */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Requesting Provider <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="requestingProviderId"
                    value={formData.requestingProviderId}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-200"
                  >
                    <option value="">Select Provider</option>
                    {providers?.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.firstName} {provider.lastName} {provider.title ? `- ${provider.title}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* CPT Codes */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  CPT Codes <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={cptSearchTerm}
                    onChange={(e) => setCptSearchTerm(e.target.value)}
                    onFocus={() => setShowCptDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCptDropdown(false), 200)}
                    placeholder="Search CPT codes (e.g., 90834)"
                    className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />

                  {showCptDropdown && filteredCptCodes.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-white border-2 border-purple-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                      {filteredCptCodes.map((item) => (
                        <button
                          key={item.code}
                          type="button"
                          onMouseDown={() => handleAddCptCode(item.code)}
                          disabled={formData.cptCodes.includes(item.code)}
                          className={`w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                            formData.cptCodes.includes(item.code) ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''
                          }`}
                        >
                          <div className="font-semibold text-purple-700">{item.code}</div>
                          <div className="text-sm text-gray-600 mt-1">{item.description}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {formData.cptCodes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.cptCodes.map((code) => (
                      <div
                        key={code}
                        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-100 to-purple-100 border-2 border-blue-300 rounded-lg group"
                      >
                        <span className="font-semibold text-gray-800">{code}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCptCode(code)}
                          className="text-red-500 hover:text-red-700 font-bold text-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Diagnosis Codes */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Diagnosis Codes <span className="text-red-500">*</span>
                </label>
                <ICD10Autocomplete
                  selectedCodes={formData.diagnosisCodes}
                  onCodesChange={(codes) => setFormData(prev => ({ ...prev, diagnosisCodes: codes }))}
                />
              </div>

              {/* Navigation */}
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setActiveSection('clinical')}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  Next: Clinical Grid →
                </button>
              </div>
            </div>
          )}

          {/* Section 2: Clinical Grid (39 severity dropdowns) */}
          {activeSection === 'clinical' && (
            <div className="space-y-6">
              <ClinicalGridSection
                formData={questionnaireData}
                onChange={handleQuestionnaireChange}
                disabled={saveMutation.isPending || isGenerating}
              />

              {/* Navigation */}
              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setActiveSection('basic')}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-all duration-200"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('narratives')}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  Next: Narratives →
                </button>
              </div>
            </div>
          )}

          {/* Section 3: Narrative Sections (12 fields) */}
          {activeSection === 'narratives' && (
            <div className="space-y-6">
              <NarrativeSectionsContainer
                formData={questionnaireData}
                onChange={handleQuestionnaireChange}
                disabled={saveMutation.isPending || isGenerating}
              />

              {/* Navigation & Submit */}
              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setActiveSection('clinical')}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-all duration-200"
                >
                  ← Back
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveMutation.isPending || formData.cptCodes.length === 0 || formData.diagnosisCodes.length === 0}
                    className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {saveMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {authorization ? 'Update Authorization' : 'Submit Authorization'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Error/Success Messages */}
      {saveMutation.isError && (
        <div className="p-4 bg-red-50 border-t border-red-200 text-red-800 text-sm">
          Failed to save authorization. Please try again.
        </div>
      )}
    </div>
  );
}
