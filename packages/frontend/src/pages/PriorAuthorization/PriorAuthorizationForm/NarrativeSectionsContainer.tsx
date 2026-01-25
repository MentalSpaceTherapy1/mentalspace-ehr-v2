/**
 * NarrativeSectionsContainer.tsx
 * PRD Section 2.3 - All 12 Narrative Sections
 *
 * IMPORTANT: The section labels shown must appear EXACTLY as written in the PRD
 */

import React from 'react';

export type TransportationOption = 'YES' | 'NO' | 'OTHER';

interface NarrativeSectionsContainerProps {
  formData: Record<string, any>;
  onChange: (field: string, value: string | TransportationOption) => void;
  aiConfidenceScores?: Record<string, number>;
  disabled?: boolean;
}

// PRD Section 2.3 - Narrative Sections (VERBATIM labels and prompts)
const NARRATIVE_SECTIONS = [
  {
    key: 'narrative_risk_of_harm',
    label: 'Risk of Harm',
    prompt: 'Current/Hx of SI and HI that cause concern for safety, welfare, and wellness of the member.',
    required: true,
    minChars: 500,
  },
  {
    key: 'narrative_functional_status',
    label: 'Functional Status',
    prompt: 'Ability to meet basic needs, fulfill usual role, and maintain health and wellness.',
    required: true,
    minChars: 500,
  },
  {
    key: 'narrative_comorbidities',
    label: 'Co-morbidities',
    prompt: 'Symptoms and Tx for medical/SUD diagnosis in addition to primary Hx.',
    required: true,
    minChars: 0, // Can be N/A
  },
  {
    key: 'narrative_environmental_stressors',
    label: 'Environmental Stressors',
    prompt: "Stress in the environment such as home, school, and work that interfere with the member's wellbeing.",
    required: true,
    minChars: 200,
  },
  {
    key: 'narrative_natural_support',
    label: 'Natural Support in the Environment',
    prompt: 'Personal associations and relationships in the community that enhance the quality and security of the member.',
    required: true,
    minChars: 200,
  },
  {
    key: 'narrative_treatment_response',
    label: 'Response to Current Treatment and Definition of Discharge Goals',
    prompt: "Document client's progress toward treatment goals and criteria for successful discharge.",
    required: true,
    minChars: 500,
  },
  {
    key: 'narrative_level_of_care',
    label: 'Level of Care',
    prompt: "Acceptance and Engagement - document client's engagement in therapeutic process.",
    required: true,
    minChars: 100,
  },
  {
    key: 'narrative_history',
    label: 'History',
    prompt: 'History of outpatient and inpatient mental health treatment.',
    required: true,
    minChars: 300,
  },
  {
    key: 'narrative_presenting_problems',
    label: 'Presenting Problems',
    prompt: "Current issues bringing client to treatment, including client's own words when appropriate.",
    required: true,
    minChars: 500,
  },
  {
    key: 'narrative_other_clinical_info',
    label: 'Other Clinical Information',
    prompt: 'Any additional clinical information relevant to the authorization request.',
    required: false,
    minChars: 0,
  },
  {
    key: 'narrative_current_medications',
    label: 'Current Medications',
    prompt: 'List all current psychiatric and relevant medical medications.',
    required: true,
    minChars: 0, // Can state 'No known medications'
  },
];

interface NarrativeSectionProps {
  fieldKey: string;
  label: string;
  prompt: string;
  required: boolean;
  minChars: number;
  value: string;
  onChange: (field: string, value: string) => void;
  aiGenerated?: boolean;
  aiConfidence?: number;
  disabled?: boolean;
}

function NarrativeSection({
  fieldKey,
  label,
  prompt,
  required,
  minChars,
  value,
  onChange,
  aiGenerated,
  aiConfidence,
  disabled,
}: NarrativeSectionProps) {
  const charCount = value?.length || 0;
  const isShort = minChars > 0 && charCount < minChars;

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            {label}
            {required && <span className="text-red-500">*</span>}
            {aiGenerated && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700"
                title={aiConfidence ? `AI Confidence: ${Math.round(aiConfidence * 100)}%` : 'AI Generated'}
              >
                AI Generated
              </span>
            )}
          </h3>
          {minChars > 0 && (
            <span className={`text-xs ${isShort ? 'text-amber-600' : 'text-gray-500'}`}>
              {charCount} / {minChars} min characters
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-1">{prompt}</p>
      </div>
      <div className="p-4">
        <textarea
          value={value || ''}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          disabled={disabled}
          rows={5}
          className={`w-full px-4 py-3 border-2 rounded-lg text-sm resize-y focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
            isShort ? 'border-amber-300 bg-amber-50' : 'border-gray-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}
          placeholder={`Enter ${label.toLowerCase()}...`}
        />
      </div>
    </div>
  );
}

export default function NarrativeSectionsContainer({
  formData,
  onChange,
  aiConfidenceScores,
  disabled,
}: NarrativeSectionsContainerProps) {
  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <h2 className="text-xl font-bold text-indigo-900 mb-2">Narrative Sections</h2>
        <p className="text-sm text-indigo-700">
          Provide detailed clinical narratives for each section. Fields marked with <span className="text-red-500">*</span> are required.
        </p>
      </div>

      {/* Transportation Section - PRD Narrative Section 8 */}
      <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="font-bold text-gray-800">
            Transportation Available <span className="text-red-500">*</span>
          </h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transportation Available
              </label>
              <select
                value={formData.transportation_available || 'YES'}
                onChange={(e) => onChange('transportation_available', e.target.value as TransportationOption)}
                disabled={disabled}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="YES">Yes</option>
                <option value="NO">No</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            {formData.transportation_available === 'OTHER' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transportation Notes
                </label>
                <input
                  type="text"
                  value={formData.transportation_notes || ''}
                  onChange={(e) => onChange('transportation_notes', e.target.value)}
                  disabled={disabled}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Specify transportation details..."
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* All 12 Narrative Sections */}
      {NARRATIVE_SECTIONS.map((section) => (
        <NarrativeSection
          key={section.key}
          fieldKey={section.key}
          label={section.label}
          prompt={section.prompt}
          required={section.required}
          minChars={section.minChars}
          value={formData[section.key] || ''}
          onChange={onChange}
          aiGenerated={!!aiConfidenceScores?.[section.key]}
          aiConfidence={aiConfidenceScores?.[section.key]}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
