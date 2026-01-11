import { useState, useCallback } from 'react';
import api from '../lib/api';

/**
 * Custom hook for AI integration
 * Handles all AI API calls and state management
 */

// AI request timeout in milliseconds (60 seconds)
const AI_REQUEST_TIMEOUT = 60000;

export interface UseAIOptions {
  noteType: string;
  clientInfo?: {
    firstName: string;
    lastName: string;
    age?: number;
    diagnoses?: string[];
    presentingProblems?: string[];
  };
  sessionData?: {
    sessionDate?: string;
    sessionDuration?: string;
    sessionType?: string;
    location?: string;
  };
}

export interface AIGenerationResult {
  generatedContent: Record<string, any>;
  confidence: number;
  suggestions: string[];
  warnings: string[];
}

export type AIErrorType = 'network' | 'timeout' | 'rate_limit' | 'server_error' | 'invalid_response' | 'unknown';

export interface AIError {
  type: AIErrorType;
  message: string;
  retryable: boolean;
  originalError?: any;
}

/**
 * Categorize errors for better user feedback
 */
const categorizeError = (err: any): AIError => {
  // Network errors
  if (!navigator.onLine || err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
    return {
      type: 'network',
      message: 'No internet connection. Please check your network and try again.',
      retryable: true,
      originalError: err,
    };
  }

  // Timeout errors
  if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
    return {
      type: 'timeout',
      message: 'The AI is taking longer than expected. This may be due to high demand.',
      retryable: true,
      originalError: err,
    };
  }

  // Rate limit errors (429)
  if (err.response?.status === 429) {
    return {
      type: 'rate_limit',
      message: 'AI service is rate limited. Please wait a moment before trying again.',
      retryable: true,
      originalError: err,
    };
  }

  // Server errors (5xx)
  if (err.response?.status >= 500) {
    return {
      type: 'server_error',
      message: 'The AI service is temporarily unavailable. Please try again in a few moments.',
      retryable: true,
      originalError: err,
    };
  }

  // Bad request / Invalid input
  if (err.response?.status === 400) {
    return {
      type: 'invalid_response',
      message: err.response?.data?.error || 'The AI could not process your input. Try providing more detailed notes.',
      retryable: true,
      originalError: err,
    };
  }

  // Generic/unknown errors
  return {
    type: 'unknown',
    message: err.response?.data?.error || err.message || 'An unexpected error occurred.',
    retryable: true,
    originalError: err,
  };
};

export function useAI(options: UseAIOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<Record<string, any> | null>(null);
  const [confidence, setConfidence] = useState<number | undefined>();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<AIError | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  /**
   * Generate complete clinical note
   */
  const generateNote = useCallback(
    async (formData?: Record<string, any>, transcript?: string) => {
      setIsGenerating(true);
      setError(null);

      try {
        const response = await api.post('/ai/generate-note', {
          noteType: options.noteType,
          clientInfo: options.clientInfo,
          sessionData: options.sessionData,
          formData,
          transcript,
        }, {
          timeout: AI_REQUEST_TIMEOUT,
        });

        // Validate response structure
        if (!response.data?.generatedContent) {
          throw new Error('Invalid response from AI service');
        }

        const result: AIGenerationResult = response.data;

        setGeneratedContent(result.generatedContent);
        setConfidence(result.confidence);
        setSuggestions(result.suggestions || []);
        setWarnings(result.warnings || []);
        setRetryCount(0); // Reset retry count on success

        return result;
      } catch (err: any) {
        const categorizedError = categorizeError(err);
        setError(categorizedError);
        console.error('AI generation error:', categorizedError.type, err);
        throw categorizedError;
      } finally {
        setIsGenerating(false);
      }
    },
    [options]
  );

  /**
   * Get AI suggestion for a specific field
   */
  const getFieldSuggestion = useCallback(
    async (
      fieldName: string,
      partialContent: string,
      context: Record<string, any>
    ): Promise<string> => {
      try {
        const response = await api.post('/ai/suggest-field', {
          noteType: options.noteType,
          fieldName,
          partialContent,
          context,
        });

        return response.data.suggestion || '';
      } catch (err: any) {
        console.error('Field suggestion error:', err);
        return '';
      }
    },
    [options.noteType]
  );

  /**
   * Get treatment recommendations
   */
  const getTreatmentRecommendations = useCallback(
    async (input: {
      diagnoses?: string[];
      presentingProblems?: string[];
      clientAge?: number;
      clientCharacteristics?: Record<string, any>;
    }) => {
      try {
        const response = await api.post('/ai/treatment-recommendations', input);
        return response.data;
      } catch (err: any) {
        console.error('Treatment recommendations error:', err);
        throw err;
      }
    },
    []
  );

  /**
   * Get diagnosis assistance
   */
  const getDiagnosisAssistance = useCallback(
    async (input: {
      symptoms?: string[];
      clientReports?: string;
      clinicalObservations?: string;
      duration?: string;
      functionalImpairment?: string;
    }) => {
      try {
        const response = await api.post('/ai/analyze-diagnosis', input);
        return response.data;
      } catch (err: any) {
        console.error('Diagnosis assistance error:', err);
        throw err;
      }
    },
    []
  );

  /**
   * Get billing analysis
   */
  const getBillingAnalysis = useCallback(
    async (input: {
      sessionDuration?: number;
      sessionType?: string;
      interventions?: string[];
      noteContent?: Record<string, any>;
      diagnoses?: string[];
    }) => {
      try {
        const response = await api.post('/ai/analyze-billing', input);
        return response.data;
      } catch (err: any) {
        console.error('Billing analysis error:', err);
        throw err;
      }
    },
    []
  );

  /**
   * Suggest CPT code
   */
  const suggestCPTCode = useCallback(
    async (duration: number, sessionType: string, hasEvaluation?: boolean) => {
      try {
        const response = await api.post('/ai/suggest-cpt-code', {
          duration,
          sessionType,
          hasEvaluation,
        });
        return response.data;
      } catch (err: any) {
        console.error('CPT code suggestion error:', err);
        throw err;
      }
    },
    []
  );

  /**
   * Clear AI state
   */
  const clearAIState = useCallback(() => {
    setGeneratedContent(null);
    setConfidence(undefined);
    setSuggestions([]);
    setWarnings([]);
    setError(null);
    setRetryCount(0);
  }, []);

  /**
   * Reset error state only
   */
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Increment retry count (for tracking retry attempts)
   */
  const incrementRetryCount = useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  return {
    // State
    isGenerating,
    generatedContent,
    confidence,
    suggestions,
    warnings,
    error,
    retryCount,

    // Actions
    generateNote,
    getFieldSuggestion,
    getTreatmentRecommendations,
    getDiagnosisAssistance,
    getBillingAnalysis,
    suggestCPTCode,
    clearAIState,
    resetError,
    incrementRetryCount,
  };
}

export default useAI;
