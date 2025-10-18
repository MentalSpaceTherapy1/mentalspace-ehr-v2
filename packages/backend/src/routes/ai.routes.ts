import { Router, Request, Response } from 'express';
import clinicalNoteGenerationService from '../services/ai/clinicalNoteGeneration.service';
import treatmentSuggestionsService from '../services/ai/treatmentSuggestions.service';
import diagnosisAssistanceService from '../services/ai/diagnosisAssistance.service';
import billingIntelligenceService from '../services/ai/billingIntelligence.service';
import anthropicService from '../services/ai/anthropic.service';

const router = Router();

/**
 * AI SERVICE ROUTES
 * All AI-powered features for clinical documentation, treatment planning,
 * diagnosis support, and billing optimization
 */

// ============================================================================
// CLINICAL NOTE GENERATION
// ============================================================================

/**
 * POST /api/ai/generate-note
 * Generate clinical note content based on session data
 */
router.post('/generate-note', async (req: Request, res: Response) => {
  try {
    const {  noteType, sessionData, clientInfo, formData, transcript } = req.body;

    if (!noteType) {
      return res.status(400).json({ error: 'Note type is required' });
    }

    const result = await clinicalNoteGenerationService.generateNote({
      noteType,
      sessionData,
      clientInfo,
      formData,
      transcript,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Generate note error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate note' });
  }
});

/**
 * POST /api/ai/suggest-field
 * Get AI suggestion for a specific form field
 */
router.post('/suggest-field', async (req: Request, res: Response) => {
  try {
    const { noteType, fieldName, partialContent, context } = req.body;

    if (!noteType || !fieldName) {
      return res.status(400).json({ error: 'Note type and field name are required' });
    }

    const suggestion = await clinicalNoteGenerationService.generateFieldSuggestion(
      noteType,
      fieldName,
      partialContent || '',
      context || {}
    );

    res.json({ suggestion });
  } catch (error: any) {
    console.error('Field suggestion error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate field suggestion' });
  }
});

// ============================================================================
// TREATMENT SUGGESTIONS
// ============================================================================

/**
 * POST /api/ai/treatment-recommendations
 * Generate evidence-based treatment recommendations
 */
router.post('/treatment-recommendations', async (req: Request, res: Response) => {
  try {
    const input = req.body;

    const result = await treatmentSuggestionsService.generateTreatmentRecommendations(input);

    res.json(result);
  } catch (error: any) {
    console.error('Treatment recommendations error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate treatment recommendations' });
  }
});

/**
 * POST /api/ai/suggest-interventions
 * Suggest specific interventions for a session
 */
router.post('/suggest-interventions', async (req: Request, res: Response) => {
  try {
    const { diagnoses, presentingIssue, sessionGoal } = req.body;

    if (!diagnoses || !presentingIssue) {
      return res.status(400).json({ error: 'Diagnoses and presenting issue are required' });
    }

    const interventions = await treatmentSuggestionsService.suggestSessionInterventions(
      diagnoses,
      presentingIssue,
      sessionGoal
    );

    res.json({ interventions });
  } catch (error: any) {
    console.error('Intervention suggestions error:', error);
    res.status(500).json({ error: error.message || 'Failed to suggest interventions' });
  }
});

/**
 * POST /api/ai/generate-goals
 * Generate SMART treatment goals
 */
router.post('/generate-goals', async (req: Request, res: Response) => {
  try {
    const { presentingProblems, diagnoses, clientStrengths } = req.body;

    if (!presentingProblems || !diagnoses) {
      return res.status(400).json({ error: 'Presenting problems and diagnoses are required' });
    }

    const goals = await treatmentSuggestionsService.generateTreatmentGoals(
      presentingProblems,
      diagnoses,
      clientStrengths
    );

    res.json({ goals });
  } catch (error: any) {
    console.error('Goal generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate goals' });
  }
});

/**
 * POST /api/ai/suggest-homework
 * Suggest homework assignments for client
 */
router.post('/suggest-homework', async (req: Request, res: Response) => {
  try {
    const { sessionContent, treatmentGoals, previousHomework } = req.body;

    if (!sessionContent || !treatmentGoals) {
      return res.status(400).json({ error: 'Session content and treatment goals are required' });
    }

    const assignments = await treatmentSuggestionsService.suggestHomework(
      sessionContent,
      treatmentGoals,
      previousHomework
    );

    res.json({ assignments });
  } catch (error: any) {
    console.error('Homework suggestion error:', error);
    res.status(500).json({ error: error.message || 'Failed to suggest homework' });
  }
});

// ============================================================================
// DIAGNOSIS ASSISTANCE
// ============================================================================

/**
 * POST /api/ai/analyze-diagnosis
 * Comprehensive diagnostic analysis with DSM-5 mapping
 */
router.post('/analyze-diagnosis', async (req: Request, res: Response) => {
  try {
    const input = req.body;

    const result = await diagnosisAssistanceService.analyzeDiagnostic(input);

    res.json(result);
  } catch (error: any) {
    console.error('Diagnosis analysis error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze diagnosis' });
  }
});

/**
 * POST /api/ai/map-dsm5-criteria
 * Map symptoms to DSM-5 criteria for specific diagnosis
 */
router.post('/map-dsm5-criteria', async (req: Request, res: Response) => {
  try {
    const { suspectedDiagnosis, symptoms, clinicalInfo } = req.body;

    if (!suspectedDiagnosis || !symptoms) {
      return res.status(400).json({ error: 'Suspected diagnosis and symptoms are required' });
    }

    const mapping = await diagnosisAssistanceService.mapToDSM5Criteria(
      suspectedDiagnosis,
      symptoms,
      clinicalInfo || ''
    );

    res.json(mapping);
  } catch (error: any) {
    console.error('DSM-5 mapping error:', error);
    res.status(500).json({ error: error.message || 'Failed to map DSM-5 criteria' });
  }
});

/**
 * POST /api/ai/differential-diagnosis
 * Generate differential diagnosis list
 */
router.post('/differential-diagnosis', async (req: Request, res: Response) => {
  try {
    const { symptoms, presentation } = req.body;

    if (!symptoms || !presentation) {
      return res.status(400).json({ error: 'Symptoms and presentation are required' });
    }

    const differentials = await diagnosisAssistanceService.generateDifferentialDiagnosis(
      symptoms,
      presentation
    );

    res.json({ differentials });
  } catch (error: any) {
    console.error('Differential diagnosis error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate differential diagnosis' });
  }
});

/**
 * POST /api/ai/clarifying-questions
 * Suggest questions to clarify diagnosis
 */
router.post('/clarifying-questions', async (req: Request, res: Response) => {
  try {
    const { currentInfo, diagnosticUncertainty } = req.body;

    if (!currentInfo || !diagnosticUncertainty) {
      return res.status(400).json({ error: 'Current info and diagnostic uncertainty are required' });
    }

    const questions = await diagnosisAssistanceService.suggestClarifyingQuestions(
      currentInfo,
      diagnosticUncertainty
    );

    res.json({ questions });
  } catch (error: any) {
    console.error('Clarifying questions error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate clarifying questions' });
  }
});

/**
 * POST /api/ai/recommend-icd10
 * Recommend specific ICD-10 code
 */
router.post('/recommend-icd10', async (req: Request, res: Response) => {
  try {
    const { diagnosisDescription, severity, specifiers } = req.body;

    if (!diagnosisDescription) {
      return res.status(400).json({ error: 'Diagnosis description is required' });
    }

    const codeRecommendation = await diagnosisAssistanceService.recommendICD10Code(
      diagnosisDescription,
      severity,
      specifiers
    );

    res.json(codeRecommendation);
  } catch (error: any) {
    console.error('ICD-10 recommendation error:', error);
    res.status(500).json({ error: error.message || 'Failed to recommend ICD-10 code' });
  }
});

// ============================================================================
// BILLING INTELLIGENCE
// ============================================================================

/**
 * POST /api/ai/analyze-billing
 * Comprehensive billing analysis and optimization
 */
router.post('/analyze-billing', async (req: Request, res: Response) => {
  try {
    const input = req.body;

    const result = await billingIntelligenceService.analyzeBilling(input);

    res.json(result);
  } catch (error: any) {
    console.error('Billing analysis error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze billing' });
  }
});

/**
 * POST /api/ai/suggest-cpt-code
 * Suggest appropriate CPT code
 */
router.post('/suggest-cpt-code', async (req: Request, res: Response) => {
  try {
    const { duration, sessionType, hasEvaluation } = req.body;

    if (!duration || !sessionType) {
      return res.status(400).json({ error: 'Duration and session type are required' });
    }

    const cptSuggestion = await billingIntelligenceService.suggestCPTCode(
      duration,
      sessionType,
      hasEvaluation
    );

    res.json(cptSuggestion);
  } catch (error: any) {
    console.error('CPT code suggestion error:', error);
    res.status(500).json({ error: error.message || 'Failed to suggest CPT code' });
  }
});

/**
 * POST /api/ai/validate-medical-necessity
 * Validate medical necessity documentation
 */
router.post('/validate-medical-necessity', async (req: Request, res: Response) => {
  try {
    const { noteContent, diagnoses } = req.body;

    if (!noteContent || !diagnoses) {
      return res.status(400).json({ error: 'Note content and diagnoses are required' });
    }

    const validation = await billingIntelligenceService.validateMedicalNecessity(
      noteContent,
      diagnoses
    );

    res.json(validation);
  } catch (error: any) {
    console.error('Medical necessity validation error:', error);
    res.status(500).json({ error: error.message || 'Failed to validate medical necessity' });
  }
});

/**
 * POST /api/ai/detect-billing-errors
 * Detect potential billing errors
 */
router.post('/detect-billing-errors', async (req: Request, res: Response) => {
  try {
    const { cptCode, sessionDuration, diagnoses, noteContent } = req.body;

    if (!cptCode || !sessionDuration || !diagnoses || !noteContent) {
      return res.status(400).json({ error: 'All billing parameters are required' });
    }

    const errors = await billingIntelligenceService.detectBillingErrors(
      cptCode,
      sessionDuration,
      diagnoses,
      noteContent
    );

    res.json({ errors });
  } catch (error: any) {
    console.error('Billing error detection failed:', error);
    res.status(500).json({ error: error.message || 'Failed to detect billing errors' });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /api/ai/health
 * Check AI service health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const isHealthy = await anthropicService.healthCheck();

    res.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      service: 'Anthropic Claude AI',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'Anthropic Claude AI',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
