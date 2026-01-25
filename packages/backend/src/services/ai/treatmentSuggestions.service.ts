import logger, { logControllerError } from '../../utils/logger';
import anthropicService from './anthropic.service';

/**
 * AI Treatment Suggestions Service
 * Provides evidence-based treatment recommendations, intervention suggestions,
 * and treatment planning assistance
 */

export interface TreatmentSuggestionInput {
  diagnoses?: string[];
  presentingProblems?: string[];
  clientAge?: number;
  clientCharacteristics?: {
    culturalBackground?: string;
    preferences?: string[];
    previousTreatments?: string[];
    currentSymptoms?: Record<string, string>;
  };
  sessionHistory?: {
    totalSessions?: number;
    progressNotes?: string[];
  };
}

export interface TreatmentRecommendation {
  modality: string;
  evidenceLevel: 'Strongly Recommended' | 'Recommended' | 'Suggested' | 'Experimental';
  rationale: string;
  specificTechniques: string[];
  expectedOutcomes?: string;
  contraindications?: string[];
}

export interface InterventionSuggestion {
  intervention: string;
  category: string; // CBT, DBT, ACT, EMDR, etc.
  description: string;
  implementation: string;
  expectedBenefit: string;
}

export interface GoalSuggestion {
  goalText: string;
  rationale: string;
  measurableObjectives: string[];
  targetTimeframe: string;
  progressIndicators: string[];
}

export interface TreatmentSuggestionsResult {
  recommendations: TreatmentRecommendation[];
  interventions: InterventionSuggestion[];
  goalSuggestions: GoalSuggestion[];
  culturalConsiderations: string[];
  confidence: number;
}

class TreatmentSuggestionsService {
  /**
   * Generate comprehensive treatment recommendations
   */
  async generateTreatmentRecommendations(
    input: TreatmentSuggestionInput
  ): Promise<TreatmentSuggestionsResult> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(input);

    try {
      const response = await anthropicService.generateCompletion(
        systemPrompt,
        userPrompt,
        {
          maxTokens: 3000,
          temperature: 0.7,
        }
      );

      return this.parseResponse(response);
    } catch (error: unknown) {
      logger.error('Treatment Suggestions Error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
      throw new Error(`Failed to generate treatment suggestions: ${error.message}`);
    }
  }

  /**
   * Generate specific intervention suggestions for a session
   */
  async suggestSessionInterventions(
    diagnoses: string[],
    presentingIssue: string,
    sessionGoal?: string
  ): Promise<InterventionSuggestion[]> {
    const systemPrompt = `You are an expert therapist providing specific intervention suggestions for a therapy session.

Provide evidence-based interventions that:
- Match the client's diagnoses and presenting issues
- Are practical and implementable in a 50-minute session
- Include clear implementation guidance
- Specify expected therapeutic benefit`;

    const userPrompt = `Client Information:
Diagnoses: ${diagnoses.join(', ')}
Presenting Issue: ${presentingIssue}
${sessionGoal ? `Session Goal: ${sessionGoal}` : ''}

Provide 3-5 specific interventions that would be appropriate for this session. Return as JSON:
{
  "interventions": [
    {
      "intervention": "Intervention name",
      "category": "CBT/DBT/ACT/etc",
      "description": "What the intervention is",
      "implementation": "Step-by-step how to implement",
      "expectedBenefit": "What this should accomplish"
    }
  ]
}`;

    try {
      const response = await anthropicService.generateCompletion(systemPrompt, userPrompt, {
        maxTokens: 2000,
      });

      const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || '{}');
      return parsed.interventions || [];
    } catch (error) {
      logger.error('Intervention suggestion error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
      return [];
    }
  }

  /**
   * Generate SMART treatment goals
   */
  async generateTreatmentGoals(
    presentingProblems: string[],
    diagnoses: string[],
    clientStrengths?: string[]
  ): Promise<GoalSuggestion[]> {
    const systemPrompt = `You are an expert treatment planner. Generate SMART treatment goals that are:
- Specific: Clearly defined
- Measurable: Include quantifiable metrics
- Achievable: Realistic given typical client progress
- Relevant: Directly address presenting problems
- Time-bound: Include realistic timeframes

Consider client strengths and resources when formulating goals.`;

    const userPrompt = `Generate treatment plan goals:

Presenting Problems: ${presentingProblems.join(', ')}
Diagnoses: ${diagnoses.join(', ')}
${clientStrengths ? `Client Strengths: ${clientStrengths.join(', ')}` : ''}

Return 3-5 goals in JSON format:
{
  "goals": [
    {
      "goalText": "Full SMART goal statement",
      "rationale": "Why this goal is important",
      "measurableObjectives": ["Objective 1", "Objective 2"],
      "targetTimeframe": "e.g., 12 weeks",
      "progressIndicators": ["How to measure progress"]
    }
  ]
}`;

    try {
      const response = await anthropicService.generateCompletion(systemPrompt, userPrompt, {
        maxTokens: 2000,
      });

      const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || '{}');
      return parsed.goals || [];
    } catch (error) {
      logger.error('Goal generation error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
      return [];
    }
  }

  /**
   * Suggest homework assignments
   */
  async suggestHomework(
    sessionContent: string,
    treatmentGoals: string[],
    previousHomework?: { assigned: string; completed: boolean }
  ): Promise<string[]> {
    const systemPrompt = `You are a therapist suggesting between-session homework assignments.

Homework should:
- Directly relate to session content
- Support treatment goals
- Be specific and actionable
- Be achievable within one week
- Build on previous assignments if applicable`;

    const userPrompt = `Session Summary: ${sessionContent}

Treatment Goals: ${treatmentGoals.join('; ')}

${previousHomework ? `Previous Homework: ${previousHomework.assigned} (Completed: ${previousHomework.completed})` : ''}

Suggest 2-3 specific homework assignments. Return as JSON:
{
  "assignments": ["Assignment 1", "Assignment 2", "Assignment 3"]
}`;

    try {
      const response = await anthropicService.generateCompletion(systemPrompt, userPrompt, {
        maxTokens: 500,
      });

      const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || '{}');
      return parsed.assignments || [];
    } catch (error) {
      logger.error('Homework suggestion error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
      return [];
    }
  }

  /**
   * Build system prompt for treatment recommendations
   */
  private buildSystemPrompt(): string {
    return `You are an expert clinical psychologist with deep knowledge of evidence-based treatments for mental health conditions.

Your expertise includes:
- Current research on treatment efficacy for mental health disorders
- Evidence-based treatment modalities (CBT, DBT, ACT, EMDR, IPT, etc.)
- Treatment selection based on client characteristics
- Cultural considerations in treatment
- Contraindications and risk factors
- Treatment outcome prediction

You provide recommendations based on:
- APA Clinical Practice Guidelines
- Current research literature
- Evidence levels (RCTs, meta-analyses, systematic reviews)
- Client-specific factors (age, culture, preferences, comorbidities)

IMPORTANT:
- Always prioritize evidence-based treatments
- Consider cultural and individual factors
- Note contraindications when applicable
- Provide clear rationale for recommendations
- Suggest realistic treatment timeframes
- Include specific techniques, not just modality names`;
  }

  /**
   * Build user prompt with client information
   */
  private buildUserPrompt(input: TreatmentSuggestionInput): string {
    let prompt = `Please provide evidence-based treatment recommendations for the following client:\n\n`;

    if (input.diagnoses?.length) {
      prompt += `DIAGNOSES:\n${input.diagnoses.join('\n')}\n\n`;
    }

    if (input.presentingProblems?.length) {
      prompt += `PRESENTING PROBLEMS:\n${input.presentingProblems.join('\n')}\n\n`;
    }

    if (input.clientAge) {
      prompt += `CLIENT AGE: ${input.clientAge}\n\n`;
    }

    if (input.clientCharacteristics) {
      prompt += `CLIENT CHARACTERISTICS:\n`;
      const chars = input.clientCharacteristics;
      if (chars.culturalBackground) prompt += `Cultural Background: ${chars.culturalBackground}\n`;
      if (chars.preferences?.length) prompt += `Preferences: ${chars.preferences.join(', ')}\n`;
      if (chars.previousTreatments?.length) prompt += `Previous Treatments: ${chars.previousTreatments.join(', ')}\n`;
      if (chars.currentSymptoms) prompt += `Current Symptoms: ${JSON.stringify(chars.currentSymptoms)}\n`;
      prompt += '\n';
    }

    if (input.sessionHistory) {
      prompt += `TREATMENT HISTORY:\n`;
      if (input.sessionHistory.totalSessions) prompt += `Total Sessions: ${input.sessionHistory.totalSessions}\n`;
      prompt += '\n';
    }

    prompt += `Provide comprehensive treatment recommendations in JSON format:
{
  "recommendations": [
    {
      "modality": "Treatment modality name",
      "evidenceLevel": "Strongly Recommended|Recommended|Suggested|Experimental",
      "rationale": "Why this is recommended for this client",
      "specificTechniques": ["Technique 1", "Technique 2"],
      "expectedOutcomes": "What outcomes to expect",
      "contraindications": ["If any"]
    }
  ],
  "interventions": [
    {
      "intervention": "Specific intervention",
      "category": "CBT|DBT|ACT|etc",
      "description": "What it is",
      "implementation": "How to do it",
      "expectedBenefit": "What it accomplishes"
    }
  ],
  "goalSuggestions": [
    {
      "goalText": "SMART goal statement",
      "rationale": "Why this goal",
      "measurableObjectives": ["Objective 1", "Objective 2"],
      "targetTimeframe": "Timeframe",
      "progressIndicators": ["How to measure"]
    }
  ],
  "culturalConsiderations": ["Cultural factor 1", "Cultural factor 2"],
  "confidence": 0.85
}`;

    return prompt;
  }

  /**
   * Parse AI response
   */
  private parseResponse(response: string): TreatmentSuggestionsResult {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        recommendations: parsed.recommendations || [],
        interventions: parsed.interventions || [],
        goalSuggestions: parsed.goalSuggestions || [],
        culturalConsiderations: parsed.culturalConsiderations || [],
        confidence: parsed.confidence || 0.7,
      };
    } catch (error) {
      logger.error('Failed to parse treatment suggestions:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
      return {
        recommendations: [],
        interventions: [],
        goalSuggestions: [],
        culturalConsiderations: [],
        confidence: 0,
      };
    }
  }
}

export const treatmentSuggestionsService = new TreatmentSuggestionsService();
export default treatmentSuggestionsService;
