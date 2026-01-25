/**
 * PAQuestionnaireForm.tsx (Modal Wrapper)
 *
 * This component wraps the PRD-compliant PriorAuthorizationForm in a modal dialog
 * for use from the AuthorizationCard component.
 *
 * The actual form implementation is in pages/PriorAuthorization/PriorAuthorizationForm
 */

import React from 'react';
import PriorAuthorizationForm from '../../pages/PriorAuthorization/PriorAuthorizationForm';

interface PAQuestionnaireFormProps {
  priorAuthorizationId: string;
  onClose: () => void;
}

export default function PAQuestionnaireForm({ priorAuthorizationId, onClose }: PAQuestionnaireFormProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl shadow-2xl w-full max-w-6xl my-8">
        {/* Modal Header with Close Button */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm rounded-t-2xl border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            Prior Authorization Clinical Questionnaire
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Close"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6">
          <PriorAuthorizationForm
            priorAuthorizationId={priorAuthorizationId}
            onClose={onClose}
            onSaveSuccess={() => {
              // Form saved successfully - could show toast
            }}
          />
        </div>
      </div>
    </div>
  );
}
