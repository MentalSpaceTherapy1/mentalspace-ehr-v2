/**
 * GenerateWithLisaButton.tsx
 * PRD Section 6.2 - Prominent button to trigger AI form completion
 *
 * Button states (per PRD):
 * - Default: 'Generate with Lisa' with sparkle icon
 * - Loading: 'Lisa is analyzing...' with spinner
 * - Success: Brief 'Generated!' then return to default
 * - Error: 'Generation failed' with retry option
 */

import React, { useState, useEffect } from 'react';

interface GenerateWithLisaButtonProps {
  priorAuthId: string;
  onGenerationComplete: (data: any) => void;
  onError: (error: Error) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

type ButtonState = 'default' | 'loading' | 'success' | 'error';

export default function GenerateWithLisaButton({
  priorAuthId,
  onGenerationComplete,
  onError,
  isLoading = false,
  disabled = false,
}: GenerateWithLisaButtonProps) {
  const [buttonState, setButtonState] = useState<ButtonState>('default');

  // Reset to default after success
  useEffect(() => {
    if (buttonState === 'success') {
      const timer = setTimeout(() => setButtonState('default'), 2000);
      return () => clearTimeout(timer);
    }
  }, [buttonState]);

  // Sync with external loading state
  useEffect(() => {
    if (isLoading) {
      setButtonState('loading');
    } else if (buttonState === 'loading') {
      setButtonState('success');
    }
  }, [isLoading]);

  const handleClick = () => {
    if (buttonState === 'loading' || disabled) return;
    setButtonState('loading');
    // Parent component handles the actual API call
  };

  const getButtonContent = () => {
    switch (buttonState) {
      case 'loading':
        return (
          <>
            <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Lisa is analyzing patient chart...</span>
          </>
        );
      case 'success':
        return (
          <>
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Generated!</span>
          </>
        );
      case 'error':
        return (
          <>
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Generation failed - Click to retry</span>
          </>
        );
      default:
        return (
          <>
            {/* Sparkle icon */}
            <svg className="h-6 w-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L9.19 8.62L2 9.24L7.45 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.62L12 2Z" />
            </svg>
            <span className="font-bold">Generate with Lisa</span>
            <span className="ml-2 text-sm opacity-80">(Auto-fill from patient chart)</span>
          </>
        );
    }
  };

  const getButtonStyle = () => {
    const baseStyle = 'w-full px-6 py-4 rounded-xl shadow-lg font-semibold flex items-center justify-center transition-all duration-200';

    if (disabled) {
      return `${baseStyle} bg-gray-400 text-gray-200 cursor-not-allowed`;
    }

    switch (buttonState) {
      case 'loading':
        return `${baseStyle} bg-gradient-to-r from-purple-500 to-indigo-500 text-white cursor-wait`;
      case 'success':
        return `${baseStyle} bg-gradient-to-r from-green-500 to-emerald-500 text-white`;
      case 'error':
        return `${baseStyle} bg-gradient-to-r from-red-500 to-rose-500 text-white hover:from-red-600 hover:to-rose-600 cursor-pointer`;
      default:
        return `${baseStyle} bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 hover:shadow-xl transform hover:scale-[1.02] cursor-pointer`;
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
      <button
        onClick={handleClick}
        disabled={disabled || buttonState === 'loading'}
        className={getButtonStyle()}
      >
        {getButtonContent()}
      </button>
      <p className="text-center text-sm text-purple-700 mt-2">
        Lisa will analyze progress notes, assessments, outcome measures, and treatment plans to auto-fill the questionnaire
      </p>
    </div>
  );
}
