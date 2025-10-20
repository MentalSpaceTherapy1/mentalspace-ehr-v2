import logger, { logControllerError } from '../../utils/logger';
import anthropicService from './anthropic.service';

/**
 * AI Billing Intelligence Service
 * Provides CPT code suggestions, medical necessity validation,
 * and billing optimization recommendations
 */

export interface BillingAnalysisInput {
  sessionDuration?: number; // in minutes
  sessionType?: string; // Individual, Family, Group, etc.
  interventions?: string[];
  noteContent?: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
  diagnoses?: string[];
  clientAge?: number;
  settingType?: string; // Office, Telehealth, etc.
}

export interface CPTCodeSuggestion {
  code: string;
  description: string;
  confidence: 'High' | 'Medium' | 'Low';
  rationale: string;
  durationRequirement?: string;
  documentationRequirements: string[];
  reimbursementNotes?: string;
}

export interface MedicalNecessityValidation {
  isAdequate: boolean;
  score: number; // 0-100
  strengthAreas: string[];
  weaknessAreas: string[];
  missingElements: string[];
  improvementSuggestions: string[];
}

export interface BillingIntelligenceResult {
  recommendedCPTCode: CPTCodeSuggestion;
  alternativeCPTCodes: CPTCodeSuggestion[];
  medicalNecessityValidation: MedicalNecessityValidation;
  modifiers?: string[];
  billingWarnings: string[];
  optimizationTips: string[];
  confidence: number;
}

class BillingIntelligenceService {
  /**
   * Analyze session and suggest optimal CPT code
   */
  async analyzeBilling(input: BillingAnalysisInput): Promise<BillingIntelligenceResult> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(input);

    try {
      const response = await anthropicService.generateCompletion(
        systemPrompt,
        userPrompt,
        {
          maxTokens: 2500,
          temperature: 0.5, // Lower temperature for more consistent billing analysis
        }
      );

      return this.parseResponse(response);
    } catch (error: any) {
      logger.error('Billing Intelligence Error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
      throw new Error(`Failed to analyze billing: ${error.message}`);
    }
  }

  /**
   * Suggest CPT code based on session characteristics
   */
  async suggestCPTCode(
    duration: number,
    sessionType: string,
    hasEvaluation?: boolean
  ): Promise<CPTCodeSuggestion> {
    const systemPrompt = `You are a mental health billing expert providing CPT code recommendations.

Consider:
- Session duration requirements for each code
- Service type (therapy vs evaluation)
- Setting (office vs telehealth)
- Add-on codes when applicable`;

    const userPrompt = `Session Details:
Duration: ${duration} minutes
Type: ${sessionType}
${hasEvaluation ? 'Includes evaluation component: Yes' : ''}

Suggest the most appropriate CPT code. Return as JSON:
{
  "code": "90XXX",
  "description": "Description",
  "confidence": "High/Medium/Low",
  "rationale": "Why this code",
  "durationRequirement": "Time requirement",
  "documentationRequirements": ["Requirement 1", "Requirement 2"]
}`;

    try {
      const response = await anthropicService.generateCompletion(systemPrompt, userPrompt, {
        maxTokens: 500,
      });

      const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || '{}');
      return parsed;
    } catch (error) {
      logger.error('CPT code suggestion error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
      throw error;
    }
  }

  /**
   * Validate medical necessity documentation
   */
  async validateMedicalNecessity(
    noteContent: string,
    diagnoses: string[]
  ): Promise<MedicalNecessityValidation> {
    const systemPrompt = `You are a medical necessity reviewer for mental health services.

Medical necessity requires documentation of:
1. Clear diagnosis justifying treatment
2. Specific symptoms requiring intervention
3. Functional impairment
4. Clinical rationale for treatment
5. Treatment plan aligned with diagnosis
6. Progress or need for continued treatment
7. Intensity/frequency justified by acuity

Evaluate the note against these criteria.`;

    const userPrompt = `Diagnoses: ${diagnoses.join(', ')}

Note Content:
${noteContent}

Evaluate medical necessity. Return as JSON:
{
  "isAdequate": true/false,
  "score": 85,
  "strengthAreas": ["Strength 1", "Strength 2"],
  "weaknessAreas": ["Weakness 1"],
  "missingElements": ["Missing element 1"],
  "improvementSuggestions": ["Suggestion 1", "Suggestion 2"]
}`;

    try {
      const response = await anthropicService.generateCompletion(systemPrompt, userPrompt, {
        maxTokens: 1000,
      });

      const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || '{}');
      return parsed;
    } catch (error) {
      logger.error('Medical necessity validation error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
      return {
        isAdequate: false,
        score: 0,
        strengthAreas: [],
        weaknessAreas: [],
        missingElements: [],
        improvementSuggestions: ['Unable to validate medical necessity - please review manually'],
      };
    }
  }

  /**
   * Detect potential billing errors
   */
  async detectBillingErrors(
    cptCode: string,
    sessionDuration: number,
    diagnoses: string[],
    noteContent: string
  ): Promise<string[]> {
    const systemPrompt = `You are a billing compliance expert detecting potential claim errors.

Common errors to check:
- CPT code doesn't match documented duration
- Diagnosis doesn't support service billed
- Missing required documentation
- Modifier missing when required
- Upcoding or undercoding
- Add-on code used incorrectly`;

    const userPrompt = `Billed Code: ${cptCode}
Duration: ${sessionDuration} minutes
Diagnoses: ${diagnoses.join(', ')}

Note Content:
${noteContent.substring(0, 500)}...

Identify potential billing errors or warnings. Return as JSON:
{
  "errors": ["Error 1", "Error 2"]
}`;

    try {
      const response = await anthropicService.generateCompletion(systemPrompt, userPrompt, {
        maxTokens: 600,
      });

      const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || '{}');
      return parsed.errors || [];
    } catch (error) {
      logger.error('Billing error detection failed:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
      return [];
    }
  }

  /**
   * Build system prompt
   */
  private buildSystemPrompt(): string {
    return `You are an expert mental health billing specialist with deep knowledge of:
- CPT codes for psychotherapy and psychiatric services
- Medical necessity requirements for mental health
- Documentation requirements for billing compliance
- Common claim denial reasons
- Billing optimization strategies
- Insurance reimbursement patterns
- Modifier usage
- Time-based vs service-based billing

CPT CODE REFERENCE (Common Therapy Codes):
- 90791: Psychiatric diagnostic evaluation (no medical services)
- 90792: Psychiatric diagnostic evaluation with medical services
- 90832: Psychotherapy 30 minutes (16-37 minutes)
- 90834: Psychotherapy 45 minutes (38-52 minutes)
- 90837: Psychotherapy 60 minutes (53+ minutes)
- 90846: Family psychotherapy without patient
- 90847: Family psychotherapy with patient
- 90853: Group psychotherapy
- 99354: Prolonged service (add-on for 90837)

GUIDELINES:
- Match CPT code to documented duration
- Ensure diagnosis supports service billed
- Verify medical necessity is documented
- Check for required modifiers
- Suggest optimization opportunities
- Flag potential denial risks
- Never suggest upcoding
- Ensure ethical billing practices`;
  }

  /**
   * Build user prompt
   */
  private buildUserPrompt(input: BillingAnalysisInput): string {
    let prompt = `Analyze the following session for billing optimization:\n\n`;

    if (input.sessionDuration) {
      prompt += `SESSION DURATION: ${input.sessionDuration} minutes\n`;
    }

    if (input.sessionType) {
      prompt += `SESSION TYPE: ${input.sessionType}\n`;
    }

    if (input.settingType) {
      prompt += `SETTING: ${input.settingType}\n`;
    }

    if (input.interventions?.length) {
      prompt += `INTERVENTIONS USED: ${input.interventions.join(', ')}\n`;
    }

    if (input.diagnoses?.length) {
      prompt += `DIAGNOSES: ${input.diagnoses.join(', ')}\n`;
    }

    if (input.clientAge) {
      prompt += `CLIENT AGE: ${input.clientAge}\n`;
    }

    if (input.noteContent) {
      prompt += `\nNOTE CONTENT:\n`;
      if (input.noteContent.subjective) prompt += `Subjective: ${input.noteContent.subjective}\n`;
      if (input.noteContent.objective) prompt += `Objective: ${input.noteContent.objective}\n`;
      if (input.noteContent.assessment) prompt += `Assessment: ${input.noteContent.assessment}\n`;
      if (input.noteContent.plan) prompt += `Plan: ${input.noteContent.plan}\n`;
    }

    prompt += `\nProvide comprehensive billing analysis in JSON format:
{
  "recommendedCPTCode": {
    "code": "90XXX",
    "description": "Description",
    "confidence": "High/Medium/Low",
    "rationale": "Why recommended",
    "durationRequirement": "Time requirement",
    "documentationRequirements": ["Requirement 1", "Requirement 2"],
    "reimbursementNotes": "Insurance notes"
  },
  "alternativeCPTCodes": [
    {
      "code": "90XXX",
      "description": "Description",
      "confidence": "Medium",
      "rationale": "When to use"
    }
  ],
  "medicalNecessityValidation": {
    "isAdequate": true,
    "score": 85,
    "strengthAreas": ["Strong documentation of symptoms"],
    "weaknessAreas": ["Missing functional impairment"],
    "missingElements": ["Element 1"],
    "improvementSuggestions": ["Suggestion 1"]
  },
  "modifiers": ["GT", "95"],
  "billingWarnings": ["Warning 1", "Warning 2"],
  "optimizationTips": ["Tip 1", "Tip 2"],
  "confidence": 0.9
}`;

    return prompt;
  }

  /**
   * Parse AI response
   */
  private parseResponse(response: string): BillingIntelligenceResult {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        recommendedCPTCode: parsed.recommendedCPTCode || {
          code: '',
          description: '',
          confidence: 'Low',
          rationale: 'Unable to determine',
          documentationRequirements: [],
        },
        alternativeCPTCodes: parsed.alternativeCPTCodes || [],
        medicalNecessityValidation: parsed.medicalNecessityValidation || {
          isAdequate: false,
          score: 0,
          strengthAreas: [],
          weaknessAreas: [],
          missingElements: [],
          improvementSuggestions: [],
        },
        modifiers: parsed.modifiers || [],
        billingWarnings: parsed.billingWarnings || [],
        optimizationTips: parsed.optimizationTips || [],
        confidence: parsed.confidence || 0.5,
      };
    } catch (error) {
      logger.error('Failed to parse billing intelligence:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
      throw error;
    }
  }
}

export const billingIntelligenceService = new BillingIntelligenceService();
export default billingIntelligenceService;
