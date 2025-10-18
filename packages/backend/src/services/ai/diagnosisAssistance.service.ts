import anthropicService from './anthropic.service';

/**
 * AI Diagnosis Assistance Service
 * Provides diagnostic support including DSM-5 criteria mapping,
 * differential diagnosis generation, and diagnostic clarification
 */

export interface DiagnosisAssistanceInput {
  symptoms?: string[];
  clientReports?: string;
  clinicalObservations?: string;
  duration?: string;
  functionalImpairment?: string;
  previousDiagnoses?: string[];
  age?: number;
  relevantHistory?: string;
}

export interface DSM5CriteriaMapping {
  diagnosis: string;
  icdCode: string;
  criteriaMet: {
    criteriaLabel: string;
    isMet: boolean;
    supportingEvidence?: string;
  }[];
  totalCriteriaMet: number;
  totalCriteriaRequired: number;
  diagnosisProbability: 'High' | 'Moderate' | 'Low';
  additionalQuestionsNeeded: string[];
}

export interface DifferentialDiagnosis {
  diagnosis: string;
  icdCode: string;
  probabilityScore: number; // 0-100
  supportingEvidence: string[];
  refutingEvidence: string[];
  clarifyingQuestions: string[];
  recommendedAssessments?: string[];
}

export interface DiagnosisAssistanceResult {
  dsm5Mappings: DSM5CriteriaMapping[];
  differentialDiagnoses: DifferentialDiagnosis[];
  severity?: 'Mild' | 'Moderate' | 'Severe';
  specifiers?: string[];
  comorbidityWarnings: string[];
  ruleOuts: string[];
  confidence: number;
  warnings: string[];
}

class DiagnosisAssistanceService {
  /**
   * Generate comprehensive diagnosis assistance
   */
  async analyzeDiagnostic(input: DiagnosisAssistanceInput): Promise<DiagnosisAssistanceResult> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(input);

    try {
      const response = await anthropicService.generateCompletion(
        systemPrompt,
        userPrompt,
        {
          maxTokens: 4096,
          temperature: 0.6, // Lower temperature for more consistent diagnostic output
        }
      );

      return this.parseResponse(response);
    } catch (error: any) {
      console.error('Diagnosis Assistance Error:', error);
      throw new Error(`Failed to generate diagnosis assistance: ${error.message}`);
    }
  }

  /**
   * Map symptoms to DSM-5 criteria for a specific diagnosis
   */
  async mapToDSM5Criteria(
    suspectedDiagnosis: string,
    symptoms: string[],
    clinicalInfo: string
  ): Promise<DSM5CriteriaMapping> {
    const systemPrompt = `You are a diagnostic expert mapping reported symptoms to DSM-5 diagnostic criteria.

For the specified diagnosis, identify:
- Which criteria are met based on the information provided
- Which criteria are not met or unclear
- What additional information is needed
- Overall likelihood of diagnosis

Be conservative and evidence-based. Only mark criteria as "met" if clear evidence is provided.`;

    const userPrompt = `Diagnosis to Evaluate: ${suspectedDiagnosis}

Reported Symptoms: ${symptoms.join(', ')}

Clinical Information: ${clinicalInfo}

Map these symptoms to DSM-5 criteria for ${suspectedDiagnosis}. Return as JSON:
{
  "diagnosis": "${suspectedDiagnosis}",
  "icdCode": "ICD-10 code",
  "criteriaMet": [
    {
      "criteriaLabel": "Criterion A/B/C/etc",
      "isMet": true/false,
      "supportingEvidence": "Evidence from provided information"
    }
  ],
  "totalCriteriaMet": number,
  "totalCriteriaRequired": number,
  "diagnosisProbability": "High/Moderate/Low",
  "additionalQuestionsNeeded": ["Question 1", "Question 2"]
}`;

    try {
      const response = await anthropicService.generateCompletion(systemPrompt, userPrompt, {
        maxTokens: 2000,
      });

      const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || '{}');
      return parsed;
    } catch (error) {
      console.error('DSM-5 mapping error:', error);
      throw error;
    }
  }

  /**
   * Generate differential diagnosis list
   */
  async generateDifferentialDiagnosis(
    symptoms: string[],
    presentation: string
  ): Promise<DifferentialDiagnosis[]> {
    const systemPrompt = `You are a diagnostic expert generating a differential diagnosis.

Consider:
- All diagnoses that could explain the presentation
- Base rates (common diagnoses more likely than rare ones)
- Supporting and refuting evidence for each
- What questions would clarify the diagnosis
- Recommended assessments

Rank diagnoses by probability.`;

    const userPrompt = `Symptoms: ${symptoms.join(', ')}

Presentation: ${presentation}

Generate differential diagnosis (top 5 most likely). Return as JSON:
{
  "differentials": [
    {
      "diagnosis": "Diagnosis name",
      "icdCode": "ICD-10",
      "probabilityScore": 85,
      "supportingEvidence": ["Evidence 1", "Evidence 2"],
      "refutingEvidence": ["Evidence 1"],
      "clarifyingQuestions": ["Question 1"],
      "recommendedAssessments": ["PHQ-9", "GAD-7"]
    }
  ]
}`;

    try {
      const response = await anthropicService.generateCompletion(systemPrompt, userPrompt, {
        maxTokens: 3000,
      });

      const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || '{}');
      return parsed.differentials || [];
    } catch (error) {
      console.error('Differential diagnosis error:', error);
      return [];
    }
  }

  /**
   * Suggest diagnostic clarifying questions
   */
  async suggestClarifyingQuestions(
    currentInfo: string,
    diagnosticUncertainty: string
  ): Promise<string[]> {
    const systemPrompt = `You are a diagnostic interviewer suggesting questions to clarify diagnosis.

Questions should:
- Directly address diagnostic uncertainty
- Follow DSM-5 criteria
- Be specific and answerable
- Help differentiate between similar diagnoses`;

    const userPrompt = `Current Information: ${currentInfo}

Diagnostic Uncertainty: ${diagnosticUncertainty}

Suggest 5-7 specific questions to ask the client. Return as JSON:
{
  "questions": ["Question 1", "Question 2"]
}`;

    try {
      const response = await anthropicService.generateCompletion(systemPrompt, userPrompt, {
        maxTokens: 800,
      });

      const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || '{}');
      return parsed.questions || [];
    } catch (error) {
      console.error('Clarifying questions error:', error);
      return [];
    }
  }

  /**
   * Recommend ICD-10 code based on diagnosis description
   */
  async recommendICD10Code(
    diagnosisDescription: string,
    severity?: string,
    specifiers?: string[]
  ): Promise<{ code: string; description: string; notes?: string }> {
    const systemPrompt = `You are an expert in ICD-10 coding for mental health diagnoses.

Provide the most specific and appropriate ICD-10 code including:
- Correct code for the diagnosis
- Severity specifiers when applicable
- Episode specifiers when applicable
- Laterality or other specifiers as needed`;

    const userPrompt = `Diagnosis: ${diagnosisDescription}
${severity ? `Severity: ${severity}` : ''}
${specifiers?.length ? `Specifiers: ${specifiers.join(', ')}` : ''}

Provide the most specific ICD-10 code. Return as JSON:
{
  "code": "F00.00",
  "description": "Full diagnosis with specifiers",
  "notes": "Coding rationale or alternatives"
}`;

    try {
      const response = await anthropicService.generateCompletion(systemPrompt, userPrompt, {
        maxTokens: 300,
      });

      const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || '{}');
      return parsed;
    } catch (error) {
      console.error('ICD-10 code error:', error);
      return { code: '', description: '' };
    }
  }

  /**
   * Build system prompt
   */
  private buildSystemPrompt(): string {
    return `You are an expert clinical psychologist and diagnostician with deep knowledge of the DSM-5 and ICD-10 diagnostic systems.

Your expertise includes:
- Complete DSM-5 diagnostic criteria for all mental health disorders
- Differential diagnosis methodology
- Diagnostic decision trees
- Comorbidity patterns
- Age-specific diagnostic considerations
- Cultural factors in diagnosis
- Medical rule-outs for psychiatric symptoms
- Assessment tool recommendations

CRITICAL GUIDELINES:
- Always maintain that clinical judgment is primary; AI is assistive only
- Be conservative in diagnostic suggestions - flag uncertainty
- Consider base rates (common diagnoses are more likely)
- Always provide differential diagnosis, not just single diagnosis
- Flag when medical evaluation is needed
- Consider developmental and cultural factors
- Note comorbidity risks
- Recommend appropriate assessment tools
- Provide specific ICD-10 codes with specifiers

NEVER:
- Make definitive diagnoses (only suggest possibilities)
- Ignore safety concerns
- Overlook medical causes of psychiatric symptoms
- Assume diagnosis without adequate information`;
  }

  /**
   * Build user prompt
   */
  private buildUserPrompt(input: DiagnosisAssistanceInput): string {
    let prompt = `Provide diagnostic assistance based on the following clinical information:\n\n`;

    if (input.symptoms?.length) {
      prompt += `SYMPTOMS:\n${input.symptoms.join('\n')}\n\n`;
    }

    if (input.clientReports) {
      prompt += `CLIENT REPORTS:\n${input.clientReports}\n\n`;
    }

    if (input.clinicalObservations) {
      prompt += `CLINICAL OBSERVATIONS:\n${input.clinicalObservations}\n\n`;
    }

    if (input.duration) {
      prompt += `DURATION: ${input.duration}\n\n`;
    }

    if (input.functionalImpairment) {
      prompt += `FUNCTIONAL IMPAIRMENT:\n${input.functionalImpairment}\n\n`;
    }

    if (input.previousDiagnoses?.length) {
      prompt += `PREVIOUS DIAGNOSES:\n${input.previousDiagnoses.join('\n')}\n\n`;
    }

    if (input.age) {
      prompt += `CLIENT AGE: ${input.age}\n\n`;
    }

    if (input.relevantHistory) {
      prompt += `RELEVANT HISTORY:\n${input.relevantHistory}\n\n`;
    }

    prompt += `Provide comprehensive diagnostic assistance in JSON format:
{
  "dsm5Mappings": [
    {
      "diagnosis": "Diagnosis name",
      "icdCode": "ICD-10 code",
      "criteriaMet": [
        {
          "criteriaLabel": "Criterion label",
          "isMet": true/false,
          "supportingEvidence": "Evidence"
        }
      ],
      "totalCriteriaMet": number,
      "totalCriteriaRequired": number,
      "diagnosisProbability": "High/Moderate/Low",
      "additionalQuestionsNeeded": ["Question 1"]
    }
  ],
  "differentialDiagnoses": [
    {
      "diagnosis": "Diagnosis",
      "icdCode": "Code",
      "probabilityScore": 85,
      "supportingEvidence": ["Evidence 1"],
      "refutingEvidence": ["Evidence 1"],
      "clarifyingQuestions": ["Question 1"],
      "recommendedAssessments": ["PHQ-9"]
    }
  ],
  "severity": "Mild/Moderate/Severe",
  "specifiers": ["Specifier 1"],
  "comorbidityWarnings": ["Warning 1"],
  "ruleOuts": ["Rule out 1"],
  "confidence": 0.75,
  "warnings": ["Warning 1"]
}`;

    return prompt;
  }

  /**
   * Parse AI response
   */
  private parseResponse(response: string): DiagnosisAssistanceResult {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        dsm5Mappings: parsed.dsm5Mappings || [],
        differentialDiagnoses: parsed.differentialDiagnoses || [],
        severity: parsed.severity,
        specifiers: parsed.specifiers || [],
        comorbidityWarnings: parsed.comorbidityWarnings || [],
        ruleOuts: parsed.ruleOuts || [],
        confidence: parsed.confidence || 0.7,
        warnings: parsed.warnings || [],
      };
    } catch (error) {
      console.error('Failed to parse diagnosis assistance:', error);
      return {
        dsm5Mappings: [],
        differentialDiagnoses: [],
        comorbidityWarnings: [],
        ruleOuts: [],
        confidence: 0,
        warnings: ['Failed to parse AI response'],
      };
    }
  }
}

export const diagnosisAssistanceService = new DiagnosisAssistanceService();
export default diagnosisAssistanceService;
