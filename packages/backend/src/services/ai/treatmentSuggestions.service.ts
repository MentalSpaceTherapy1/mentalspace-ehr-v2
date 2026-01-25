import logger, { logControllerError } from '../../utils/logger';
import anthropicService from './anthropic.service';
import prisma from '../database';

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
   * Generate a comprehensive treatment plan from client's latest clinical notes
   * Uses the last 6 notes and diagnosis to create evidence-based treatment recommendations
   */
  async generateTreatmentPlanFromNotes(clientId: string): Promise<{
    treatmentPlan: TreatmentSuggestionsResult;
    sourceData: {
      notesAnalyzed: number;
      diagnoses: string[];
      presentingProblems: string[];
      treatmentProgress: string;
    };
  }> {
    try {
      // Fetch client information including diagnoses
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          diagnoses: {
            select: {
              id: true,
              code: true,
              description: true,
              isPrimary: true,
              status: true,
            },
            where: {
              status: 'ACTIVE',
            },
            orderBy: {
              isPrimary: 'desc',
            },
          },
        },
      });

      if (!client) {
        throw new Error(`Client not found: ${clientId}`);
      }

      // Fetch the latest 6 clinical notes for this client
      const notes = await prisma.clinicalNote.findMany({
        where: {
          clientId,
          status: { in: ['SIGNED', 'COSIGNED', 'COMPLETED'] },
          noteType: { in: ['Progress Note', 'Intake Assessment', 'Treatment Plan', 'Assessment'] },
        },
        orderBy: {
          serviceDate: 'desc',
        },
        take: 6,
        select: {
          id: true,
          noteType: true,
          serviceDate: true,
          content: true,
          status: true,
        },
      });

      if (notes.length === 0) {
        throw new Error('No clinical notes found for treatment plan generation');
      }

      // Extract presenting problems and progress from notes
      const presentingProblems: Set<string> = new Set();
      const progressIndicators: string[] = [];

      for (const note of notes) {
        const content = note.content as Record<string, unknown> | null;
        if (content) {
          // Extract presenting problems from various note fields
          if (content.presentingProblem) {
            presentingProblems.add(String(content.presentingProblem));
          }
          if (content.chiefComplaint) {
            presentingProblems.add(String(content.chiefComplaint));
          }
          if (Array.isArray(content.presentingProblems)) {
            content.presentingProblems.forEach((p: unknown) => presentingProblems.add(String(p)));
          }

          // Extract progress indicators
          if (content.progress) {
            progressIndicators.push(`${note.noteType} (${note.serviceDate.toISOString().split('T')[0]}): ${content.progress}`);
          }
          if (content.sessionSummary) {
            progressIndicators.push(`Session summary: ${String(content.sessionSummary).slice(0, 200)}...`);
          }
          if (content.clinicalFormulation) {
            progressIndicators.push(`Clinical formulation: ${String(content.clinicalFormulation).slice(0, 200)}...`);
          }
        }
      }

      // Prepare diagnoses array
      const diagnoses = client.diagnoses.map(d => `${d.code} - ${d.description}${d.isPrimary ? ' (Primary)' : ''}`);

      // Calculate client age
      const age = client.dateOfBirth
        ? Math.floor((Date.now() - new Date(client.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : undefined;

      // Build comprehensive prompt for AI
      const systemPrompt = this.buildTreatmentPlanSystemPrompt();
      const userPrompt = this.buildTreatmentPlanFromNotesPrompt({
        diagnoses,
        presentingProblems: Array.from(presentingProblems),
        progressIndicators,
        clientAge: age,
        notesCount: notes.length,
        notesSummary: notes.map(n => ({
          type: n.noteType,
          date: n.serviceDate.toISOString().split('T')[0],
          content: n.content,
        })),
      });

      const response = await anthropicService.generateCompletion(systemPrompt, userPrompt, {
        maxTokens: 4000,
        temperature: 0.6,
      });

      const treatmentPlan = this.parseResponse(response);

      return {
        treatmentPlan,
        sourceData: {
          notesAnalyzed: notes.length,
          diagnoses,
          presentingProblems: Array.from(presentingProblems),
          treatmentProgress: progressIndicators.length > 0 ? progressIndicators.join('\n') : 'No progress notes available',
        },
      };
    } catch (error) {
      logger.error('Treatment plan generation from notes error:', {
        clientId,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Build system prompt specifically for treatment plan generation from notes
   */
  private buildTreatmentPlanSystemPrompt(): string {
    return `You are an expert clinical psychologist creating a comprehensive treatment plan based on a client's clinical history.

You are reviewing clinical notes to create an evidence-based treatment plan that:
1. Addresses all identified diagnoses with appropriate interventions
2. Builds on documented progress and therapeutic gains
3. Targets remaining presenting problems with specific, measurable goals
4. Recommends evidence-based treatment modalities appropriate for the diagnoses
5. Considers client's treatment history and response to interventions

Your treatment plan should follow the Georgia Board requirements:
- Include specific, measurable, attainable, relevant, and time-bound (SMART) goals
- Address each diagnosis with appropriate treatment modality
- Include specific interventions and techniques
- Specify expected outcomes and timeline
- Be reviewable within 90 days

IMPORTANT:
- Base recommendations on the clinical evidence from the notes
- Consider what has worked and what hasn't based on progress notes
- Provide rationale for each recommendation tied to the clinical data
- Include cultural considerations if relevant information is present
- Note any contraindications based on client history`;
  }

  /**
   * Build user prompt for treatment plan generation from notes
   */
  private buildTreatmentPlanFromNotesPrompt(data: {
    diagnoses: string[];
    presentingProblems: string[];
    progressIndicators: string[];
    clientAge?: number;
    notesCount: number;
    notesSummary: Array<{ type: string; date: string; content: unknown }>;
  }): string {
    let prompt = `Generate a comprehensive treatment plan based on the following clinical history:\n\n`;

    prompt += `DIAGNOSES:\n${data.diagnoses.join('\n')}\n\n`;

    if (data.presentingProblems.length > 0) {
      prompt += `PRESENTING PROBLEMS:\n${data.presentingProblems.join('\n')}\n\n`;
    }

    if (data.clientAge) {
      prompt += `CLIENT AGE: ${data.clientAge}\n\n`;
    }

    prompt += `CLINICAL NOTES REVIEWED: ${data.notesCount} notes\n\n`;

    if (data.progressIndicators.length > 0) {
      prompt += `TREATMENT PROGRESS:\n${data.progressIndicators.join('\n')}\n\n`;
    }

    // Include summarized note content
    prompt += `RECENT CLINICAL DOCUMENTATION:\n`;
    for (const note of data.notesSummary) {
      const content = note.content as Record<string, unknown> | null;
      if (content) {
        const summary = this.summarizeNoteContent(content);
        prompt += `\n${note.type} (${note.date}):\n${summary}\n`;
      }
    }

    prompt += `\nBased on this clinical history, provide a comprehensive treatment plan in JSON format:
{
  "recommendations": [
    {
      "modality": "Treatment modality name (e.g., CBT, DBT, EMDR)",
      "evidenceLevel": "Strongly Recommended|Recommended|Suggested|Experimental",
      "rationale": "Why this is recommended based on the clinical data",
      "specificTechniques": ["Technique 1", "Technique 2"],
      "expectedOutcomes": "What outcomes to expect and timeline",
      "contraindications": ["If any based on client history"]
    }
  ],
  "interventions": [
    {
      "intervention": "Specific intervention name",
      "category": "CBT|DBT|ACT|IPT|EMDR|etc",
      "description": "What the intervention involves",
      "implementation": "How to implement in sessions",
      "expectedBenefit": "Expected therapeutic benefit"
    }
  ],
  "goalSuggestions": [
    {
      "goalText": "SMART goal statement",
      "rationale": "Why this goal based on presenting problems",
      "measurableObjectives": ["Specific objective 1", "Specific objective 2"],
      "targetTimeframe": "e.g., 12 weeks, 90 days",
      "progressIndicators": ["How to measure progress"]
    }
  ],
  "culturalConsiderations": ["Cultural factors to consider in treatment"],
  "confidence": 0.85
}

Ensure:
- At least 2-3 treatment modality recommendations
- At least 3-5 specific interventions
- At least 3-5 SMART goals addressing the presenting problems
- Goals should be achievable within 90 days for review compliance`;

    return prompt;
  }

  /**
   * Summarize note content for AI prompt
   */
  private summarizeNoteContent(content: Record<string, unknown>): string {
    const relevantFields = [
      'chiefComplaint',
      'presentingProblem',
      'mentalStatusExam',
      'sessionSummary',
      'progress',
      'interventionsUsed',
      'clientResponse',
      'clinicalFormulation',
      'riskAssessment',
      'treatmentGoals',
    ];

    const summary: string[] = [];
    for (const field of relevantFields) {
      if (content[field]) {
        const value = content[field];
        const text = typeof value === 'string' ? value : JSON.stringify(value);
        summary.push(`- ${field}: ${text.slice(0, 300)}${text.length > 300 ? '...' : ''}`);
      }
    }

    return summary.length > 0 ? summary.join('\n') : 'No detailed content available';
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
