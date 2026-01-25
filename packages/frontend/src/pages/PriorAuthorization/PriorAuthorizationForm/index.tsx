/**
 * PriorAuthorizationForm/index.tsx
 * PRD Section 6.1 - Form container
 *
 * Main form component that orchestrates all sub-components
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import PAFormHeader from './PAFormHeader';
import ClinicalGridSection from './ClinicalGridSection';
import NarrativeSectionsContainer, { TransportationOption } from './NarrativeSectionsContainer';
import GenerateWithLisaButton from './GenerateWithLisaButton';
import { SeverityLevel } from './SeverityDropdown';

// Default form data with all fields initialized
const DEFAULT_FORM_DATA: Record<string, any> = {
  // Header fields
  clientName: '',
  clientDOB: '',
  diagnosisDisplay: '',
  insuranceDisplay: '',

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

interface PriorAuthorizationFormProps {
  priorAuthorizationId: string;
  onClose?: () => void;
  onSaveSuccess?: () => void;
}

export default function PriorAuthorizationForm({
  priorAuthorizationId,
  onClose,
  onSaveSuccess,
}: PriorAuthorizationFormProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, any>>(DEFAULT_FORM_DATA);
  const [activeTab, setActiveTab] = useState<'clinical' | 'narratives'>('clinical');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch existing questionnaire
  const { data: questionnaire, isLoading: isLoadingQuestionnaire } = useQuery({
    queryKey: ['pa-questionnaire', priorAuthorizationId],
    queryFn: async () => {
      try {
        const response = await api.get(`/prior-authorizations/${priorAuthorizationId}/questionnaire`);
        return response.data.data || response.data;
      } catch (error: any) {
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
  });

  // Update form when questionnaire loads
  useEffect(() => {
    if (questionnaire) {
      const loadedData = questionnaire.formData || questionnaire;
      setFormData({ ...DEFAULT_FORM_DATA, ...loadedData });
    }
  }, [questionnaire]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const response = await api.post(`/prior-authorizations/${priorAuthorizationId}/questionnaire`, {
        formData: data,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pa-questionnaire', priorAuthorizationId] });
      setHasUnsavedChanges(false);
      onSaveSuccess?.();
    },
  });

  // Generate with Lisa mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/prior-authorizations/${priorAuthorizationId}/generate-with-lisa`, {
        regenerateFields: ['all'],
        preserveUserEdits: false,
      });
      return response.data;
    },
    onSuccess: (data) => {
      const generatedData = data.data?.questionnaire?.formData || data.questionnaire?.formData || data.data || data;
      if (generatedData) {
        setFormData({ ...DEFAULT_FORM_DATA, ...generatedData });
        setHasUnsavedChanges(true);
      }
      queryClient.invalidateQueries({ queryKey: ['pa-questionnaire', priorAuthorizationId] });
    },
  });

  const handleFieldChange = (field: string, value: SeverityLevel | TransportationOption | string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleGenerateWithLisa = () => {
    generateMutation.mutate();
  };

  if (isLoadingQuestionnaire) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-700 font-medium">Loading Questionnaire...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PAFormHeader
        clientName={formData.clientName}
        clientDOB={formData.clientDOB}
        diagnosisDisplay={formData.diagnosisDisplay}
        insuranceDisplay={formData.insuranceDisplay}
        aiGeneratedAt={questionnaire?.aiGeneratedAt}
        aiConfidence={questionnaire?.aiConfidenceScores?.overall}
      />

      {/* Generate with Lisa Button */}
      <GenerateWithLisaButton
        priorAuthId={priorAuthorizationId}
        onGenerationComplete={(data) => {
          setFormData({ ...DEFAULT_FORM_DATA, ...data });
          setHasUnsavedChanges(true);
        }}
        onError={(error) => console.error('Lisa generation failed:', error)}
        isLoading={generateMutation.isPending}
        disabled={saveMutation.isPending}
      />

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('clinical')}
            className={`flex-1 px-6 py-4 font-semibold text-center transition-colors ${
              activeTab === 'clinical'
                ? 'text-indigo-600 bg-indigo-50 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            Clinical Information Grid
            <span className="ml-2 text-xs text-gray-500">(39 symptoms)</span>
          </button>
          <button
            onClick={() => setActiveTab('narratives')}
            className={`flex-1 px-6 py-4 font-semibold text-center transition-colors ${
              activeTab === 'narratives'
                ? 'text-indigo-600 bg-indigo-50 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            Narrative Sections
            <span className="ml-2 text-xs text-gray-500">(12 sections)</span>
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'clinical' && (
            <ClinicalGridSection
              formData={formData}
              onChange={handleFieldChange}
              aiConfidenceScores={questionnaire?.aiConfidenceScores}
              disabled={saveMutation.isPending || generateMutation.isPending}
            />
          )}

          {activeTab === 'narratives' && (
            <NarrativeSectionsContainer
              formData={formData}
              onChange={handleFieldChange}
              aiConfidenceScores={questionnaire?.aiConfidenceScores}
              disabled={saveMutation.isPending || generateMutation.isPending}
            />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
              >
                Cancel
              </button>
            )}
            {hasUnsavedChanges && (
              <span className="text-amber-600 text-sm font-medium">
                * Unsaved changes
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Download PDF */}
            <a
              href={`${import.meta.env.VITE_API_URL || ''}/api/v1/prior-authorizations/${priorAuthorizationId}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF
            </a>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending || generateMutation.isPending}
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saveMutation.isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Questionnaire
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {saveMutation.isSuccess && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
            Questionnaire saved successfully!
          </div>
        )}
        {saveMutation.isError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            Failed to save questionnaire. Please try again.
          </div>
        )}
        {generateMutation.isError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            Failed to generate with Lisa. Please try again or fill manually.
          </div>
        )}
      </div>
    </div>
  );
}
