/**
 * SeverityDropdown.tsx
 * Reusable dropdown for all 39 symptom severity fields
 * PRD Section 6.2 - Must use EXACT options: N/A, Mild, Moderate, Severe
 */

import React from 'react';

export type SeverityLevel = 'NA' | 'MILD' | 'MODERATE' | 'SEVERE';

// Dropdown options - MUST match exactly per PRD:
const SEVERITY_OPTIONS: { value: SeverityLevel; label: string }[] = [
  { value: 'NA', label: 'N/A' },
  { value: 'MILD', label: 'Mild' },
  { value: 'MODERATE', label: 'Moderate' },
  { value: 'SEVERE', label: 'Severe' },
];

interface SeverityDropdownProps {
  fieldName: string;
  label: string;
  value: SeverityLevel;
  onChange: (field: string, value: SeverityLevel) => void;
  aiGenerated?: boolean;
  aiConfidence?: number;
  disabled?: boolean;
}

export default function SeverityDropdown({
  fieldName,
  label,
  value,
  onChange,
  aiGenerated,
  aiConfidence,
  disabled,
}: SeverityDropdownProps) {
  const getValueColor = (val: SeverityLevel) => {
    switch (val) {
      case 'NA': return 'bg-gray-50 border-gray-300';
      case 'MILD': return 'bg-yellow-50 border-yellow-400';
      case 'MODERATE': return 'bg-orange-50 border-orange-400';
      case 'SEVERE': return 'bg-red-50 border-red-400';
      default: return 'bg-gray-50 border-gray-300';
    }
  };

  return (
    <div className="flex flex-col">
      <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
        {label}
        {aiGenerated && (
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700"
            title={aiConfidence ? `AI Confidence: ${Math.round(aiConfidence * 100)}%` : 'AI Generated'}
          >
            AI
          </span>
        )}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(fieldName, e.target.value as SeverityLevel)}
        disabled={disabled}
        className={`w-full px-3 py-2 border-2 rounded-lg text-sm font-medium transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${getValueColor(value)} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {SEVERITY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
