import { useState } from 'react';
import { Sparkles, X, ChevronDown, ChevronUp, AlertCircle, CheckCircle, Loader } from 'lucide-react';

/**
 * AI Assistant Sidebar Component
 * Displays AI-generated suggestions, warnings, and actions
 * Used across all clinical note forms
 */

export interface AISuggestion {
  id: string;
  type: 'suggestion' | 'warning' | 'info';
  title: string;
  content: string;
  confidence?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface AIAssistantProps {
  isVisible: boolean;
  onClose: () => void;
  isGenerating?: boolean;
  generatedContent?: Record<string, any>;
  suggestions?: string[];
  warnings?: string[];
  confidence?: number;
  onAcceptContent?: (content: Record<string, any>) => void;
  onGenerateNote?: () => void;
  noteType: string;
}

export default function AIAssistant({
  isVisible,
  onClose,
  isGenerating = false,
  generatedContent,
  suggestions = [],
  warnings = [],
  confidence,
  onAcceptContent,
  onGenerateNote,
  noteType,
}: AIAssistantProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showContentPreview, setShowContentPreview] = useState(false);

  if (!isVisible) return null;

  const getConfidenceColor = (score: number) => {
    if (score >= 0.85) return 'text-green-600';
    if (score >= 0.7) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.85) return 'High Confidence';
    if (score >= 0.7) return 'Medium Confidence';
    return 'Low Confidence - Review Carefully';
  };

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl border-l-4 border-purple-500 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-6 h-6" />
          <div>
            <h2 className="text-lg font-bold">Lisa</h2>
            <p className="text-xs opacity-90">{noteType}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Generate Note Button */}
        {onGenerateNote && !generatedContent && (
          <button
            onClick={onGenerateNote}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isGenerating ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Generating Note...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Generate Note with AI</span>
              </>
            )}
          </button>
        )}

        {/* Loading State */}
        {isGenerating && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-center space-x-3 mb-3">
              <Loader className="w-5 h-5 text-blue-600 animate-spin" />
              <p className="text-sm font-semibold text-blue-900">AI is analyzing...</p>
            </div>
            <p className="text-xs text-blue-700">
              Generating professional clinical documentation based on your session data.
              This typically takes 2-4 seconds.
            </p>
          </div>
        )}

        {/* Generated Content Preview */}
        {generatedContent && (
          <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-300 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="font-bold text-green-900">AI Generated Content</h3>
              </div>
              <button
                onClick={() => setShowContentPreview(!showContentPreview)}
                className="text-green-700 hover:text-green-900"
              >
                {showContentPreview ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Confidence Score */}
            {confidence !== undefined && (
              <div className="mb-3 pb-3 border-b border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">AI Confidence:</span>
                  <span className={`text-sm font-bold ${getConfidenceColor(confidence)}`}>
                    {(confidence * 100).toFixed(0)}% - {getConfidenceLabel(confidence)}
                  </span>
                </div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      confidence >= 0.85
                        ? 'bg-green-500'
                        : confidence >= 0.7
                        ? 'bg-yellow-500'
                        : 'bg-orange-500'
                    }`}
                    style={{ width: `${confidence * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Content Preview */}
            {showContentPreview && (
              <div className="bg-white rounded-lg p-3 mb-3 max-h-64 overflow-y-auto text-sm">
                <pre className="whitespace-pre-wrap text-xs text-gray-700 font-mono">
                  {JSON.stringify(generatedContent, null, 2)}
                </pre>
              </div>
            )}

            {/* Accept Button */}
            {onAcceptContent && (
              <button
                onClick={() => onAcceptContent(generatedContent)}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Accept AI Content
              </button>
            )}

            <p className="text-xs text-green-700 mt-2 text-center">
              Review and edit before saving. AI is assistive, not autonomous.
            </p>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-orange-900 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span>Warnings ({warnings.length})</span>
            </h3>
            {warnings.map((warning, index) => (
              <div
                key={index}
                className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded-r-lg"
              >
                <p className="text-sm text-orange-900">{warning}</p>
              </div>
            ))}
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-blue-900 flex items-center space-x-2">
              <Sparkles className="w-4 h-4" />
              <span>Suggestions ({suggestions.length})</span>
            </h3>
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg"
              >
                <p className="text-sm text-blue-900">{suggestion}</p>
              </div>
            ))}
          </div>
        )}

        {/* Help Text */}
        {!isGenerating && !generatedContent && suggestions.length === 0 && warnings.length === 0 && (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
            <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="font-bold text-gray-700 mb-2">Lisa is Ready</h3>
            <p className="text-sm text-gray-600">
              Click "Generate Note with AI" to automatically create professional clinical
              documentation based on your session data.
            </p>
            <div className="mt-4 text-xs text-gray-500 space-y-1">
              <p>✓ Auto-populates all sections</p>
              <p>✓ Uses clinical language</p>
              <p>✓ Ensures medical necessity</p>
              <p>✓ You review and approve</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t border-gray-200 p-3">
        <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
          <Sparkles className="w-3 h-3" />
          <span>Powered by Claude 3.5 Sonnet</span>
        </div>
        <p className="text-xs text-gray-400 text-center mt-1">
          AI assists, you approve. Always review before saving.
        </p>
      </div>
    </div>
  );
}
