import { useState, useCallback } from 'react';
import api from '../lib/api';

/**
 * Custom hook for AI integration
 * Handles all AI API calls and state management
 */

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

export function useAI(options: UseAIOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<Record<string, any> | null>(null);
  const [confidence, setConfidence] = useState<number | undefined>();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

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
        });

        const result: AIGenerationResult = response.data;

        setGeneratedContent(result.generatedContent);
        setConfidence(result.confidence);
        setSuggestions(result.suggestions || []);
        setWarnings(result.warnings || []);

        return result;
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || 'Failed to generate note with AI';
        setError(errorMessage);
        console.error('AI generation error:', err);
        throw new Error(errorMessage);
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
  }, []);

  return {
    // State
    isGenerating,
    generatedContent,
    confidence,
    suggestions,
    warnings,
    error,

    // Actions
    generateNote,
    getFieldSuggestion,
    getTreatmentRecommendations,
    getDiagnosisAssistance,
    getBillingAnalysis,
    suggestCPTCode,
    clearAIState,
  };
}

export default useAI;
