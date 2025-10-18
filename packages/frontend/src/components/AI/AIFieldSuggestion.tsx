import { useState } from 'react';
import { Sparkles, Check, X, Loader } from 'lucide-react';

/**
 * AI Field Suggestion Component
 * Shows real-time AI suggestions for individual form fields
 */

interface AIFieldSuggestionProps {
  suggestion: string;
  isLoading?: boolean;
  onAccept: (suggestion: string) => void;
  onDismiss: () => void;
}

export default function AIFieldSuggestion({
  suggestion,
  isLoading = false,
  onAccept,
  onDismiss,
}: AIFieldSuggestionProps) {
  if (isLoading) {
    return (
      <div className="mt-2 bg-blue-50 border-2 border-blue-200 rounded-lg p-3 flex items-center space-x-2">
        <Loader className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
        <span className="text-sm text-blue-700">AI is thinking...</span>
      </div>
    );
  }

  if (!suggestion) return null;

  return (
    <div className="mt-2 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg p-3">
      <div className="flex items-start space-x-2">
        <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-purple-900 mb-1">AI Suggestion:</p>
          <p className="text-sm text-gray-700">{suggestion}</p>
        </div>
      </div>
      <div className="flex items-center justify-end space-x-2 mt-3">
        <button
          onClick={onDismiss}
          className="px-3 py-1 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors flex items-center space-x-1"
        >
          <X className="w-3 h-3" />
          <span>Dismiss</span>
        </button>
        <button
          onClick={() => onAccept(suggestion)}
          className="px-3 py-1 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded transition-colors flex items-center space-x-1"
        >
          <Check className="w-3 h-3" />
          <span>Accept</span>
        </button>
      </div>
    </div>
  );
}
