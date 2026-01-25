/**
 * PAFormHeader.tsx
 * PRD Section 2.1 - Header Fields
 *
 * Header fields appear at the top of the PA form and are auto-populated from client records
 */

import React from 'react';

interface PAFormHeaderProps {
  clientName: string;
  clientDOB: string;
  diagnosisDisplay: string;
  insuranceDisplay: string;
  aiGeneratedAt?: string;
  aiConfidence?: number;
}

export default function PAFormHeader({
  clientName,
  clientDOB,
  diagnosisDisplay,
  insuranceDisplay,
  aiGeneratedAt,
  aiConfidence,
}: PAFormHeaderProps) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Prior Authorization Questionnaire</h1>
          <p className="text-indigo-200 text-sm mt-1">
            Georgia Medicaid CMO Clinical Documentation
          </p>
        </div>
        {aiGeneratedAt && (
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
            <p className="text-sm font-medium">
              AI Generated: {formatDate(aiGeneratedAt)}
              {aiConfidence && (
                <span className="ml-2 text-indigo-200">
                  ({Math.round(aiConfidence * 100)}% confidence)
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* PRD Section 2.1 - Header Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Client Name - PRD: "Client Name" */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
          <label className="block text-xs font-medium text-indigo-200 mb-1">
            Client Name
          </label>
          <p className="font-semibold text-white">{clientName || 'N/A'}</p>
        </div>

        {/* DOB - PRD: "DOB" with format M/D/YYYY */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
          <label className="block text-xs font-medium text-indigo-200 mb-1">
            DOB
          </label>
          <p className="font-semibold text-white">{formatDate(clientDOB)}</p>
        </div>

        {/* Insurance Provider - PRD: "Insurance Provider" with Payer name + member ID */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
          <label className="block text-xs font-medium text-indigo-200 mb-1">
            Insurance Provider
          </label>
          <p className="font-semibold text-white text-sm">{insuranceDisplay || 'N/A'}</p>
        </div>

        {/* Diagnosis - PRD: "Diagnosis" with ICD-10 code + description + date */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
          <label className="block text-xs font-medium text-indigo-200 mb-1">
            Diagnosis
          </label>
          <p className="font-semibold text-white text-sm leading-tight">
            {diagnosisDisplay || 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
}
