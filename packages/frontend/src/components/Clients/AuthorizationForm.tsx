/**
 * AuthorizationForm.tsx
 *
 * PRD-compliant Prior Authorization Clinical Questionnaire Form
 *
 * Structure per PRD:
 * - Section 2.1: Header Fields (auto-populated from client record)
 * - Section 2.2: Clinical Information Grid (39 severity dropdowns in 2x3 layout)
 * - Section 2.3: Narrative Sections (12 narrative text areas)
 * - Generate with Lisa AI integration
 */

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import PAFormHeader from '../../pages/PriorAuthorization/PriorAuthorizationForm/PAFormHeader';
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

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  diagnoses?: Array<{
    code: string;
    description: string;
    dateOfDiagnosis?: string;
  }>;
}

interface Insurance {
  id: string;
  insuranceCompany: string;
  memberId?: string;
  rank: string;
}

interface AuthorizationFormProps {
  clientId: string;
  authorization?: PriorAuthorization | null;
  onClose: () => void;
}

// Default clinical questionnaire data per PRD
const DEFAULT_QUESTIONNAIRE_DATA: Record<string, any> = {
  // Anxiety Disorders (6 fields) - PRD Section 2.2
  anxiety_obsessions_compulsions: 'NA',
  anxiety_generalized: 'NA',
  anxiety_panic_attacks: 'NA',
  anxiety_phobias: 'NA',
  anxiety_somatic_complaints: 'NA',
  anxiety_ptsd_symptoms: 'NA',

  // Mania (5 fields) - PRD Section 2.2
  mania_insomnia: 'NA',
  mania_grandiosity: 'NA',
  mania_pressured_speech: 'NA',
  mania_racing_thoughts: 'NA',
  mania_poor_judgement: 'NA',

  // Psychotic Disorders (5 fields) - PRD Section 2.2
  psychotic_delusions_paranoia: 'NA',
  psychotic_selfcare_issues: 'NA',
  psychotic_hallucinations: 'NA',
  psychotic_disorganized_thought: 'NA',
  psychotic_loose_associations: 'NA',

  // Depression (9 fields) - PRD Section 2.2
  depression_impaired_concentration: 'NA',
  depression_impaired_memory: 'NA',
  depression_psychomotor_retardation: 'NA',
  depression_sexual_issues: 'NA',
  depression_appetite_disturbance: 'NA',
  depression_irritability: 'NA',
  depression_agitation: 'NA',
  depression_sleep_disturbance: 'NA',
  depression_hopelessness: 'NA',

  // Substance Abuse (7 dropdowns + 1 text) - PRD Section 2.2
  substance_loss_of_control: 'NA',
  substance_amnesic_episodes: 'NA',
  substance_legal_problems: 'NA',
  substance_alcohol_abuse: 'NA',
  substance_opiate_abuse: 'NA',
  substance_prescription_abuse: 'NA',
  substance_polysubstance_abuse: 'NA',
  substance_other_drugs: '',

  // Personality Disorder (7 dropdowns + 1 text) - PRD Section 2.2
  personality_oddness: 'NA',
  personality_oppositional: 'NA',
  personality_disregard_law: 'NA',
  personality_self_injuries: 'NA',
  personality_entitlement: 'NA',
  personality_passive_aggressive: 'NA',
  personality_dependency: 'NA',
  personality_enduring_traits: '',

  // Narrative Sections (12 fields) - PRD Section 2.3
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
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<'clinical' | 'narratives'>('clinical');
  const [isGenerating, setIsGenerating] = useState(false);

  // Clinical questionnaire data
  const [questionnaireData, setQuestionnaireData] = useState<Record<string, any>>(DEFAULT_QUESTIONNAIRE_DATA);

  // Fetch client data for header fields (PRD 2.1)
  const { data: client } = useQuery<Client>({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const response = await api.get(`/clients/${clientId}`);
      return response.data.data || response.data;
    },
  });

  // Fetch client's insurance for header fields (PRD 2.1)
  const { data: insuranceList } = useQuery<Insurance[]>({
    queryKey: ['insurance', clientId],
    queryFn: async () => {
      const response = await api.get(`/insurance/client/${clientId}`);
      return response.data.data || [];
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

  // Load existing questionnaire data
  useEffect(() => {
    if (existingQuestionnaire) {
      const loadedData = existingQuestionnaire.formData || existingQuestionnaire;
      setQuestionnaireData({ ...DEFAULT_QUESTIONNAIRE_DATA, ...loadedData });
    }
  }, [existingQuestionnaire]);

  // Generate with Lisa mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      let paId = authorization?.id;

      // If no PA exists yet, create one first
      if (!paId) {
        const primaryInsurance = insuranceList?.find(i => i.rank === 'PRIMARY') || insuranceList?.[0];
        const primaryDiagnosis = client?.diagnoses?.[0];

        if (!primaryInsurance?.id) {
          throw new Error('Client must have insurance on file before generating with Lisa');
        }

        if (!user?.id) {
          throw new Error('You must be logged in to generate with Lisa');
        }

        const paData = {
          clientId,
          insuranceId: primaryInsurance.id,
          authorizationNumber: `PA-${Date.now()}`,
          authorizationType: 'OUTPATIENT_THERAPY',
          sessionsAuthorized: 12,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          cptCodes: ['90837'],
          diagnosisCodes: primaryDiagnosis ? [primaryDiagnosis.code] : [],
          requestingProviderId: user.id,
        };

        const createResponse = await api.post('/prior-authorizations', paData);
        paId = createResponse.data.data?.id || createResponse.data.id;
      }

      const response = await api.post(`/prior-authorizations/${paId}/generate-with-lisa`, {
        regenerateFields: ['all'],
        preserveUserEdits: false,
      });
      return response.data;
    },
    onSuccess: (data) => {
      const generatedData = data.data?.questionnaire?.formData || data.questionnaire?.formData || data.data || data;
      if (generatedData) {
        setQuestionnaireData({ ...DEFAULT_QUESTIONNAIRE_DATA, ...generatedData });
      }
      setIsGenerating(false);
      // Refresh the prior authorizations list in case we created a new PA
      queryClient.invalidateQueries({ queryKey: ['prior-authorizations', clientId] });
    },
    onError: (error) => {
      console.error('Lisa generation failed:', error);
      setIsGenerating(false);
    },
  });

  const handleTriggerGenerate = () => {
    setIsGenerating(true);
    generateMutation.mutate();
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      let paId = authorization?.id;

      // If no existing PA, create one first
      if (!paId) {
        const primaryInsurance = insuranceList?.find(i => i.rank === 'PRIMARY') || insuranceList?.[0];
        const primaryDiagnosis = client?.diagnoses?.[0];

        if (!primaryInsurance?.id) {
          throw new Error('Client must have insurance on file');
        }

        if (!user?.id) {
          throw new Error('You must be logged in');
        }

        const paData = {
          clientId,
          insuranceId: primaryInsurance.id,
          authorizationNumber: `PA-${Date.now()}`,
          authorizationType: 'OUTPATIENT_THERAPY',
          sessionsAuthorized: 12,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
          cptCodes: ['90837'],
          diagnosisCodes: primaryDiagnosis ? [primaryDiagnosis.code] : [],
          requestingProviderId: user.id,
        };

        const response = await api.post('/prior-authorizations', paData);
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

  const handleQuestionnaireChange = (field: string, value: SeverityLevel | TransportationOption | string) => {
    setQuestionnaireData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateWithLisa = (generatedData: Record<string, any>) => {
    setQuestionnaireData({ ...DEFAULT_QUESTIONNAIRE_DATA, ...generatedData });
  };

  // Build header display values from client data (PRD 2.1)
  const clientName = client
    ? `${client.firstName}${client.middleName ? ` ${client.middleName}` : ''} ${client.lastName}`
    : '';

  const clientDOB = client?.dateOfBirth || '';

  const primaryInsurance = insuranceList?.find(i => i.rank === 'PRIMARY') || insuranceList?.[0];
  const insuranceDisplay = primaryInsurance
    ? `${primaryInsurance.insuranceCompany}${primaryInsurance.memberId ? ` - ${primaryInsurance.memberId}` : ''}`
    : 'No insurance on file';

  const diagnosisDisplay = client?.diagnoses?.length
    ? client.diagnoses.map(d => `${d.code}: ${d.description}`).join('; ')
    : 'No diagnosis on file';

  return (
    <div className="bg-white rounded-2xl shadow-xl border-l-4 border-l-indigo-500 max-h-[90vh] overflow-hidden flex flex-col">
      {/* PRD Section 2.1 - Header Fields (auto-populated) */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-start mb-4">
          <div></div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold p-2 hover:bg-gray-100 rounded-full"
          >
            ×
          </button>
        </div>
        <PAFormHeader
          clientName={clientName}
          clientDOB={clientDOB}
          diagnosisDisplay={diagnosisDisplay}
          insuranceDisplay={insuranceDisplay}
          aiGeneratedAt={existingQuestionnaire?.aiGeneratedAt}
          aiConfidence={existingQuestionnaire?.aiConfidenceScores?.overall}
        />
      </div>

      {/* Section Navigation - Clinical Grid vs Narratives */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          type="button"
          onClick={() => setActiveSection('clinical')}
          className={`flex-1 px-6 py-4 font-semibold text-sm transition-colors ${
            activeSection === 'clinical'
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
          }`}
        >
          Clinical Information Grid
          <span className="ml-2 text-xs text-gray-500">(39 symptoms)</span>
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
          Narrative Sections
          <span className="ml-2 text-xs text-gray-500">(12 sections)</span>
        </button>
      </div>

      {/* Generate with Lisa Button */}
      <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
        <GenerateWithLisaButton
          priorAuthId={authorization?.id || 'new'}
          onGenerate={handleTriggerGenerate}
          onGenerationComplete={handleGenerateWithLisa}
          onError={(error) => console.error('Lisa generation failed:', error)}
          isLoading={isGenerating || generateMutation.isPending}
          disabled={saveMutation.isPending}
        />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit}>
          {/* PRD Section 2.2 - Clinical Information Grid (39 severity dropdowns) */}
          {activeSection === 'clinical' && (
            <div className="space-y-6">
              <ClinicalGridSection
                formData={questionnaireData}
                onChange={handleQuestionnaireChange}
                disabled={saveMutation.isPending || isGenerating}
              />

              {/* Navigation */}
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setActiveSection('narratives')}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  Next: Narrative Sections →
                </button>
              </div>
            </div>
          )}

          {/* PRD Section 2.3 - Narrative Sections (12 fields) */}
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
                  ← Back to Clinical Grid
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
                    disabled={saveMutation.isPending}
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
                        {authorization ? 'Update Questionnaire' : 'Submit Questionnaire'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Error Messages */}
      {saveMutation.isError && (
        <div className="p-4 bg-red-50 border-t border-red-200 text-red-800 text-sm">
          Failed to save questionnaire. Please try again.
        </div>
      )}
    </div>
  );
}
