/**
 * ClinicalGridSection.tsx
 * PRD Section 2.2 - Clinical Information Grid
 *
 * Grid Layout (PRD Specification):
 * ┌─────────────────────────┬─────────────────────────┐
 * │    Anxiety Disorders    │         Mania           │
 * ├─────────────────────────┼─────────────────────────┤
 * │      Depression         │    Substance Abuse      │
 * ├─────────────────────────┼─────────────────────────┤
 * │  Psychotic Disorders    │  Personality Disorder   │
 * └─────────────────────────┴─────────────────────────┘
 *
 * IMPORTANT: All symptom labels MUST be VERBATIM from the PRD
 */

import React from 'react';
import SeverityDropdown, { SeverityLevel } from './SeverityDropdown';

interface ClinicalGridSectionProps {
  formData: Record<string, any>;
  onChange: (field: string, value: SeverityLevel | string) => void;
  aiConfidenceScores?: Record<string, number>;
  disabled?: boolean;
}

// PRD Section 2.2 - Category 1: Anxiety Disorders (VERBATIM labels)
const ANXIETY_FIELDS = [
  { key: 'anxiety_obsessions_compulsions', label: 'Obsessions/Compulsions' },
  { key: 'anxiety_generalized', label: 'Generalized Anxiety' },
  { key: 'anxiety_panic_attacks', label: 'Panic Attacks' },
  { key: 'anxiety_phobias', label: 'Phobias' },
  { key: 'anxiety_somatic_complaints', label: 'Somatic Complaints' },
  { key: 'anxiety_ptsd_symptoms', label: 'PTSD Symptoms' },
];

// PRD Section 2.2 - Category 2: Mania (VERBATIM labels)
const MANIA_FIELDS = [
  { key: 'mania_insomnia', label: 'Insomnia' },
  { key: 'mania_grandiosity', label: 'Grandiosity' },
  { key: 'mania_pressured_speech', label: 'Pressured Speech' },
  { key: 'mania_racing_thoughts', label: 'Racing Thoughts / Flight of Ideas' },
  { key: 'mania_poor_judgement', label: 'Poor Judgement / Impulsiveness' },
];

// PRD Section 2.2 - Category 3: Psychotic Disorders (VERBATIM labels)
const PSYCHOTIC_FIELDS = [
  { key: 'psychotic_delusions_paranoia', label: 'Delusions / Paranoia' },
  { key: 'psychotic_selfcare_issues', label: 'Self-care Issues' },
  { key: 'psychotic_hallucinations', label: 'Hallucinations' },
  { key: 'psychotic_disorganized_thought', label: 'Disorganized Thought Process' },
  { key: 'psychotic_loose_associations', label: 'Loose Associations' },
];

// PRD Section 2.2 - Category 4: Depression (VERBATIM labels)
const DEPRESSION_FIELDS = [
  { key: 'depression_impaired_concentration', label: 'Impaired Concentration' },
  { key: 'depression_impaired_memory', label: 'Impaired Memory' },
  { key: 'depression_psychomotor_retardation', label: 'Psychomotor Retardation' },
  { key: 'depression_sexual_issues', label: 'Sexual Issues' },
  { key: 'depression_appetite_disturbance', label: 'Appetite Disturbance' },
  { key: 'depression_irritability', label: 'Irritability' },
  { key: 'depression_agitation', label: 'Agitation' },
  { key: 'depression_sleep_disturbance', label: 'Sleep Disturbance' },
  { key: 'depression_hopelessness', label: 'Hopelessness / Helplessness' },
];

// PRD Section 2.2 - Category 5: Substance Abuse (VERBATIM labels)
const SUBSTANCE_FIELDS = [
  { key: 'substance_loss_of_control', label: 'Loss of Control of Dosage' },
  { key: 'substance_amnesic_episodes', label: 'Amnesic Episodes' },
  { key: 'substance_legal_problems', label: 'Legal Problems' },
  { key: 'substance_alcohol_abuse', label: 'Alcohol Abuse' },
  { key: 'substance_opiate_abuse', label: 'Opiate Abuse' },
  { key: 'substance_prescription_abuse', label: 'Prescription Medication Abuse' },
  { key: 'substance_polysubstance_abuse', label: 'Polysubstance Abuse' },
];

// PRD Section 2.2 - Category 6: Personality Disorder (VERBATIM labels)
const PERSONALITY_FIELDS = [
  { key: 'personality_oddness', label: 'Oddness / Eccentricities' },
  { key: 'personality_oppositional', label: 'Oppositional' },
  { key: 'personality_disregard_law', label: 'Disregard for Law' },
  { key: 'personality_self_injuries', label: 'Recurring Self Injuries' },
  { key: 'personality_entitlement', label: 'Sense of Entitlement' },
  { key: 'personality_passive_aggressive', label: 'Passive Aggressive' },
  { key: 'personality_dependency', label: 'Dependency' },
];

interface CategoryCardProps {
  title: string;
  color: string;
  bgColor: string;
  fields: { key: string; label: string }[];
  formData: Record<string, any>;
  onChange: (field: string, value: SeverityLevel | string) => void;
  aiConfidenceScores?: Record<string, number>;
  disabled?: boolean;
  textField?: { key: string; label: string };
}

function CategoryCard({
  title,
  color,
  bgColor,
  fields,
  formData,
  onChange,
  aiConfidenceScores,
  disabled,
  textField,
}: CategoryCardProps) {
  return (
    <div className={`rounded-xl border-2 ${color} overflow-hidden`}>
      <div className={`px-4 py-3 ${bgColor} border-b ${color}`}>
        <h3 className="font-bold text-gray-800">{title}</h3>
      </div>
      <div className="p-4 bg-white space-y-3">
        {fields.map((field) => (
          <SeverityDropdown
            key={field.key}
            fieldName={field.key}
            label={field.label}
            value={(formData[field.key] as SeverityLevel) || 'NA'}
            onChange={onChange}
            aiGenerated={!!aiConfidenceScores?.[field.key]}
            aiConfidence={aiConfidenceScores?.[field.key]}
            disabled={disabled}
          />
        ))}
        {textField && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {textField.label}
            </label>
            <input
              type="text"
              value={formData[textField.key] || ''}
              onChange={(e) => onChange(textField.key, e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder={`Specify ${textField.label.toLowerCase()}...`}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClinicalGridSection({
  formData,
  onChange,
  aiConfidenceScores,
  disabled,
}: ClinicalGridSectionProps) {
  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <h2 className="text-xl font-bold text-indigo-900 mb-2">Clinical Information</h2>
        <p className="text-sm text-indigo-700">
          Rate each symptom using: <strong>N/A</strong> (not present), <strong>Mild</strong>, <strong>Moderate</strong>, or <strong>Severe</strong>
        </p>
      </div>

      {/* PRD Grid Layout: 2 columns x 3 rows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Row 1: Anxiety Disorders | Mania */}
        <CategoryCard
          title="Anxiety Disorders"
          color="border-amber-300"
          bgColor="bg-amber-50"
          fields={ANXIETY_FIELDS}
          formData={formData}
          onChange={onChange}
          aiConfidenceScores={aiConfidenceScores}
          disabled={disabled}
        />
        <CategoryCard
          title="Mania"
          color="border-purple-300"
          bgColor="bg-purple-50"
          fields={MANIA_FIELDS}
          formData={formData}
          onChange={onChange}
          aiConfidenceScores={aiConfidenceScores}
          disabled={disabled}
        />

        {/* Row 2: Depression | Substance Abuse */}
        <CategoryCard
          title="Depression"
          color="border-blue-300"
          bgColor="bg-blue-50"
          fields={DEPRESSION_FIELDS}
          formData={formData}
          onChange={onChange}
          aiConfidenceScores={aiConfidenceScores}
          disabled={disabled}
        />
        <CategoryCard
          title="Substance Abuse"
          color="border-green-300"
          bgColor="bg-green-50"
          fields={SUBSTANCE_FIELDS}
          formData={formData}
          onChange={onChange}
          aiConfidenceScores={aiConfidenceScores}
          disabled={disabled}
          textField={{ key: 'substance_other_drugs', label: 'Other Drugs' }}
        />

        {/* Row 3: Psychotic Disorders | Personality Disorder */}
        <CategoryCard
          title="Psychotic Disorders"
          color="border-red-300"
          bgColor="bg-red-50"
          fields={PSYCHOTIC_FIELDS}
          formData={formData}
          onChange={onChange}
          aiConfidenceScores={aiConfidenceScores}
          disabled={disabled}
        />
        <CategoryCard
          title="Personality Disorder"
          color="border-teal-300"
          bgColor="bg-teal-50"
          fields={PERSONALITY_FIELDS}
          formData={formData}
          onChange={onChange}
          aiConfidenceScores={aiConfidenceScores}
          disabled={disabled}
          textField={{ key: 'personality_enduring_traits', label: 'Enduring Traits of' }}
        />
      </div>
    </div>
  );
}
