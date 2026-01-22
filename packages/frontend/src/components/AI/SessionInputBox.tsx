import React, { useState, useCallback } from 'react';
import { Loader2, Sparkles, FileText, AlertTriangle, RefreshCw, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface SessionInputBoxProps {
  onGenerate: (sessionNotes: string) => Promise<void>;
  isGenerating: boolean;
  noteType: string;
  initialTranscript?: string;
  transcriptLoading?: boolean;
}

// Error types for better messaging
type AIErrorType = 'network' | 'timeout' | 'rate_limit' | 'server_error' | 'invalid_response' | 'unknown';

interface AIErrorState {
  type: AIErrorType;
  message: string;
  retryable: boolean;
}

const getErrorDetails = (error: any): AIErrorState => {
  // Network errors
  if (!navigator.onLine || error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
    return {
      type: 'network',
      message: 'No internet connection. Please check your network and try again.',
      retryable: true,
    };
  }

  // Timeout errors
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return {
      type: 'timeout',
      message: 'The AI is taking longer than expected. This may be due to high demand. Please try again.',
      retryable: true,
    };
  }

  // Rate limit errors (429)
  if (error.response?.status === 429) {
    const retryAfter = error.response?.headers?.['retry-after'];
    const waitTime = retryAfter ? `Please wait ${retryAfter} seconds before trying again.` : 'Please wait a moment before trying again.';
    return {
      type: 'rate_limit',
      message: `AI service is rate limited. ${waitTime}`,
      retryable: true,
    };
  }

  // Server errors (5xx)
  if (error.response?.status >= 500) {
    return {
      type: 'server_error',
      message: 'The AI service is temporarily unavailable. Please try again in a few moments.',
      retryable: true,
    };
  }

  // Invalid response from AI
  if (error.response?.status === 400 || error.response?.data?.error?.includes('invalid')) {
    return {
      type: 'invalid_response',
      message: 'The AI could not process your input. Try providing more detailed session notes.',
      retryable: true,
    };
  }

  // Unknown errors
  return {
    type: 'unknown',
    message: error.response?.data?.error || error.message || 'An unexpected error occurred. Please try again.',
    retryable: true,
  };
};

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

const SessionInputBox: React.FC<SessionInputBoxProps> = ({
  onGenerate,
  isGenerating,
  noteType,
  initialTranscript,
  transcriptLoading,
}) => {
  const [sessionNotes, setSessionNotes] = useState(initialTranscript || '');
  const [isExpanded, setIsExpanded] = useState(true);
  const [errorState, setErrorState] = useState<AIErrorState | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Update sessionNotes when initialTranscript is loaded
  React.useEffect(() => {
    if (initialTranscript && !sessionNotes) {
      setSessionNotes(initialTranscript);
    }
  }, [initialTranscript]);

  const handleGenerate = useCallback(async (isRetry = false) => {
    if (!sessionNotes.trim()) {
      toast.error('Please enter session notes or transcription before generating.');
      return;
    }

    // Clear error state when starting a new generation
    setErrorState(null);

    try {
      await onGenerate(sessionNotes);
      // Reset retry count on success
      setRetryCount(0);
    } catch (error: any) {
      const errorDetails = getErrorDetails(error);
      setErrorState(errorDetails);

      // Only increment retry count if this was a retry attempt
      if (isRetry) {
        setRetryCount(prev => prev + 1);
      }

      console.error('AI generation failed:', errorDetails.type, error);
    }
  }, [sessionNotes, onGenerate]);

  const handleRetry = useCallback(async () => {
    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      toast.error('Maximum retry attempts reached. Please try again later or continue manually.');
      return;
    }

    setIsRetrying(true);

    // Apply delay based on retry count
    const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
    await new Promise(resolve => setTimeout(resolve, delay));

    setIsRetrying(false);
    await handleGenerate(true);
  }, [retryCount, handleGenerate]);

  const handleDismissError = useCallback(() => {
    setErrorState(null);
  }, []);

  const handleContinueManually = useCallback(() => {
    setErrorState(null);
    setIsExpanded(false);
    toast.success('Continuing manually. You can fill in the form fields below.');
  }, []);

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow-sm border border-purple-200 mb-6">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <div className="bg-purple-600 text-white p-2 rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              AI-Powered Clinical Note Generation
            </h3>
            <p className="text-sm text-gray-600">
              Enter session notes or paste transcription to auto-generate {noteType}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="text-gray-500 hover:text-gray-700"
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Instructions */}
          <div className="bg-white rounded-lg p-3 border border-purple-100">
            <div className="flex items-start space-x-2">
              <FileText className="w-5 h-5 text-purple-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900 mb-1">How it works:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Type or paste your session notes, observations, or audio/video transcription</li>
                  <li>• Click "Generate Note with AI" to auto-populate all form fields</li>
                  <li>• Review the generated content and accept, edit, or reject</li>
                  <li>• AI will fill in text fields, select dropdowns, check boxes, and recommend diagnoses</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Transcript Loading Indicator */}
          {transcriptLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center space-x-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <div>
                <p className="text-sm font-medium text-blue-800">Loading session transcript...</p>
                <p className="text-xs text-blue-600">Fetching transcription from your telehealth session</p>
              </div>
            </div>
          )}

          {/* Transcript Loaded Indicator */}
          {initialTranscript && !transcriptLoading && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
              <FileText className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">Session transcript loaded</p>
                <p className="text-xs text-green-600">Transcript from your telehealth session has been pre-filled below</p>
              </div>
            </div>
          )}

          {/* Text Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Notes / Transcription
            </label>
            <textarea
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="Enter your session notes, observations, or paste a transcription from your audio/video session here...

Example:
Client presented with increased anxiety this week. Reports difficulty sleeping, racing thoughts, and avoidance of social situations. Session focused on cognitive restructuring techniques and identifying triggers. Client engaged well and completed homework from last session. Discussed medication compliance - client reports taking Lexapro 10mg daily as prescribed..."
              className="w-full min-h-[200px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y"
              disabled={isGenerating}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">
                {sessionNotes.length} characters
              </p>
              {sessionNotes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSessionNotes('')}
                  className="text-xs text-gray-500 hover:text-gray-700"
                  disabled={isGenerating}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Error Display */}
          {errorState && (
            <div className={`rounded-lg p-4 border-2 ${
              errorState.type === 'network' || errorState.type === 'timeout'
                ? 'bg-yellow-50 border-yellow-300'
                : errorState.type === 'rate_limit'
                ? 'bg-orange-50 border-orange-300'
                : 'bg-red-50 border-red-300'
            }`}>
              <div className="flex items-start space-x-3">
                <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  errorState.type === 'network' || errorState.type === 'timeout'
                    ? 'text-yellow-600'
                    : errorState.type === 'rate_limit'
                    ? 'text-orange-600'
                    : 'text-red-600'
                }`} />
                <div className="flex-1">
                  <h4 className={`text-sm font-semibold mb-1 ${
                    errorState.type === 'network' || errorState.type === 'timeout'
                      ? 'text-yellow-800'
                      : errorState.type === 'rate_limit'
                      ? 'text-orange-800'
                      : 'text-red-800'
                  }`}>
                    AI Generation Failed
                  </h4>
                  <p className={`text-sm mb-3 ${
                    errorState.type === 'network' || errorState.type === 'timeout'
                      ? 'text-yellow-700'
                      : errorState.type === 'rate_limit'
                      ? 'text-orange-700'
                      : 'text-red-700'
                  }`}>
                    {errorState.message}
                  </p>
                  <div className="flex items-center space-x-3">
                    {errorState.retryable && retryCount < MAX_RETRY_ATTEMPTS && (
                      <button
                        type="button"
                        onClick={handleRetry}
                        disabled={isRetrying || isGenerating}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                          isRetrying || isGenerating
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-purple-600 text-white hover:bg-purple-700'
                        }`}
                      >
                        {isRetrying ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Retrying...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            <span>Retry ({MAX_RETRY_ATTEMPTS - retryCount} left)</span>
                          </>
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleContinueManually}
                      className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      <span>Continue Manually</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDismissError}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      aria-label="Dismiss error"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {retryCount > 0 && retryCount < MAX_RETRY_ATTEMPTS && (
                    <p className="text-xs text-gray-500 mt-2">
                      Retry attempt {retryCount} of {MAX_RETRY_ATTEMPTS}. Each retry waits a bit longer.
                    </p>
                  )}
                  {retryCount >= MAX_RETRY_ATTEMPTS && (
                    <p className="text-xs text-red-600 mt-2 font-medium">
                      Maximum retries reached. Please continue manually or try again later.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <button
            type="button"
            onClick={() => handleGenerate(false)}
            disabled={isGenerating || isRetrying || !sessionNotes.trim()}
            className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${
              isGenerating || isRetrying || !sessionNotes.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {isGenerating || isRetrying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{isRetrying ? 'Retrying...' : 'Generating Clinical Note...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Generate Note with AI</span>
              </>
            )}
          </button>

          {/* Fallback hint when error state is not shown */}
          {!errorState && !isGenerating && (
            <p className="text-xs text-gray-500 text-center mt-2">
              AI generation is optional. You can always fill in the form manually.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SessionInputBox;
