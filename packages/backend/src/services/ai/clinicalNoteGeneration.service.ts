import logger, { logControllerError } from '../../utils/logger';
import anthropicService from './anthropic.service';
import { getFieldMapping } from './fieldMappings.service';

/**
 * AI Clinical Note Generation Service
 * Generates professional clinical notes for ALL note types in the system
 */

export interface NoteGenerationInput {
  noteType: string;
  sessionData?: SessionData;
  clientInfo?: ClientInfo;
  formData?: Record<string, any>;
  transcript?: string;
}

export interface SessionData {
  sessionDate?: string;
  sessionDuration?: string;
  sessionType?: string;
  location?: string;
}

export interface ClientInfo {
  firstName: string;
  lastName: string;
  age?: number;
  diagnoses?: string[];
  presentingProblems?: string[];
}

export interface NoteGenerationResult {
  generatedContent: Record<string, any>;
  confidence: number;
  suggestions: string[];
  warnings: string[];
}

class ClinicalNoteGenerationService {
  /**
   * Generate clinical note content based on note type and input data
   */
  async generateNote(input: NoteGenerationInput): Promise<NoteGenerationResult> {
    const systemPrompt = this.buildSystemPrompt(input.noteType);
    const userPrompt = this.buildUserPrompt(input);

    try {
      const response = await anthropicService.generateCompletion(
        systemPrompt,
        userPrompt,
        {
          maxTokens: 4096,
          temperature: 0.7,
        }
      );

      // Parse AI response
      const parsed = this.parseAIResponse(response, input.noteType);

      return {
        generatedContent: parsed.content,
        confidence: parsed.confidence,
        suggestions: parsed.suggestions,
        warnings: parsed.warnings,
      };
    } catch (error: any) {
      logger.error('Note Generation Error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
      throw new Error(`Failed to generate clinical note: ${error.message}`);
    }
  }

  /**
   * Build system prompt based on note type
   */
  private buildSystemPrompt(noteType: string): string {
    const basePrompt = `You are an expert clinical psychologist and mental health documentation specialist. You help therapists create high-quality, professional clinical notes that meet regulatory and billing requirements while maintaining clinical excellence.

You have deep knowledge of:
- DSM-5 diagnostic criteria
- Evidence-based treatment modalities (CBT, DBT, ACT, EMDR, etc.)
- Mental status examination components
- Risk assessment protocols
- Treatment planning best practices
- Medical necessity documentation
- HIPAA-compliant documentation standards

Your role is to assist in generating clinical note content based on session information, always maintaining professional standards and clinical accuracy.

IMPORTANT GUIDELINES:
- Always write in past tense and third person
- Use professional, clinical language
- Be specific and concrete, avoid vague statements
- Include observable behaviors and specific examples
- Document medical necessity clearly
- Maintain HIPAA compliance
- Flag any safety concerns
- Provide confidence scores for your suggestions
- Note any missing critical information`;

    // Add note-type specific instructions
    const noteTypeInstructions = this.getNoteTypeInstructions(noteType);

    return `${basePrompt}\n\n${noteTypeInstructions}`;
  }

  /**
   * Get specific instructions for each note type
   */
  private getNoteTypeInstructions(noteType: string): string {
    const instructions: Record<string, string> = {
      'Progress Note': `
PROGRESS NOTE SPECIFIC INSTRUCTIONS:
You are generating a Progress Note for an ongoing therapy session.

REQUIRED SECTIONS:
1. SUBJECTIVE: Client's reported symptoms, concerns, mood, experiences since last session
2. OBJECTIVE: Observable behaviors, mental status exam findings, appearance, affect, thought process
3. ASSESSMENT: Clinical impressions, symptom severity, progress evaluation, treatment response
4. PLAN: Interventions used this session, homework assigned, next session plans, frequency

STRUCTURE TO FOLLOW:
- Session Information (date, duration, type, location)
- Current Symptoms (with severity ratings)
- Progress Toward Goals (track each treatment plan goal)
- Brief Mental Status (appearance, mood, affect, thought process)
- Risk Assessment (suicidal/homicidal ideation, risk level)
- Interventions Used (CBT, DBT, psychoeducation, etc.)
- Client Response (engagement, response to interventions, homework compliance)
- SOAP Notes (Subjective, Objective, Assessment, Plan)

CRITICAL ELEMENTS:
- Always assess and document risk (suicidal/homicidal ideation)
- Track progress on specific treatment goals
- Document medical necessity (why this session was needed)
- Note client's engagement and response to treatment
- Record homework compliance and new assignments
- Ensure CPT code support (document duration and interventions)
`,

      'Intake Assessment': `
INTAKE ASSESSMENT SPECIFIC INSTRUCTIONS:
You are generating a comprehensive Intake Assessment for a new client's first session.

CRITICAL: YOU MUST POPULATE ALL SECTIONS BELOW. DO NOT LEAVE ANY SECTION EMPTY.

REQUIRED SECTIONS (ALL MUST BE COMPLETED):

1. CHIEF COMPLAINT & PRESENTING PROBLEMS
   - Chief complaint in client's exact words
   - Detailed description of presenting problem (onset, duration, frequency, severity, triggers)
   - List all current symptoms

2. CLINICAL HISTORY (CRITICAL - MUST BE COMPLETED FOR ALL):
   - Psychiatric History: Previous diagnoses, treatments, hospitalizations, medications tried. If none: "No prior psychiatric treatment"
   - Medical History: Medical conditions, surgeries, chronic illnesses. If none: "No significant medical history"
   - Current Medications: All meds with dosages. If none: "No current medications"
   - Family History: Mental illness, substance abuse, medical conditions in family. If unknown: "Family history unknown"
   - Social History: Education, employment, relationships, living situation, support system - ALWAYS provide detailed information
   - Substance Use: Alcohol, tobacco, drugs - type, amount, frequency. If none: "Denies substance use"

3. MENTAL STATUS EXAMINATION
   - Complete all MSE components: appearance, behavior, speech, mood, affect, thought process, thought content, perception, cognition, insight, judgment

4. RISK ASSESSMENT
   - Suicidal ideation (active/passive/none)
   - Homicidal ideation
   - Self-harm history
   - Overall risk level with rationale

5. CLINICAL ASSESSMENT (NOT DIAGNOSIS CODES)
   - This is your clinical impressions and analysis
   - Describe the clinical picture, symptom patterns, functional impairment
   - Discuss medical necessity for treatment
   - DO NOT PUT ICD-10 CODES HERE

6. DIAGNOSIS (SEPARATE SECTION FOR ICD-10 CODES)
   - Provisional diagnoses WITH ICD-10 codes (e.g., "F32.1 Major Depressive Disorder, Single Episode, Moderate")
   - Differential diagnoses to rule out
   - Format: CODE followed by full diagnosis name

7. TREATMENT RECOMMENDATIONS
   - Specific therapy recommendations (CBT, DBT, etc.)
   - Frequency of sessions
   - Medications to consider
   - Referrals needed (psychiatry, medical, testing)

8. PROGNOSIS
   - Expected treatment outcome
   - Positive and negative prognostic factors
   - Estimated treatment duration

CRITICAL REQUIREMENTS:
- Generate content for EVERY field listed above
- If information is not in the transcript, make clinically reasonable inferences OR note it as unknown/denied
- NEVER leave Clinical History fields empty - they are REQUIRED
- Keep Clinical Assessment and Diagnosis separate
- Include ICD-10 codes with all diagnoses
- Be specific and thorough
`,

      'Treatment Plan': `
TREATMENT PLAN SPECIFIC INSTRUCTIONS:
You are generating a formal Treatment Plan with measurable goals and evidence-based interventions.

REQUIRED SECTIONS:
1. Presenting Problems (prioritized list)
2. Diagnoses (with ICD-10 codes)
3. Treatment Goals (SMART format)
4. Objectives (specific, measurable steps toward goals)
5. Interventions (evidence-based techniques and modalities)
6. Frequency and Duration of Treatment
7. Discharge Criteria
8. Client Strengths and Resources

GOAL FORMATTING (SMART):
- Specific: Clearly defined, not vague
- Measurable: Include quantifiable metrics
- Achievable: Realistic given client's circumstances
- Relevant: Directly addresses presenting problems
- Time-bound: Include target timeframe

EXAMPLE GOOD GOAL:
"Client will reduce panic attack frequency from 5 per week to 1 or fewer per week within 12 weeks, as measured by daily anxiety log."

INTERVENTIONS:
- Must be evidence-based for the diagnosis
- Specify exact techniques (e.g., "Cognitive Restructuring for catastrophic thinking" not just "CBT")
- Include frequency (e.g., "Weekly 50-minute sessions")
`,

      'Cancellation Note': `
CANCELLATION NOTE SPECIFIC INSTRUCTIONS:
You are documenting a session cancellation with appropriate detail.

REQUIRED ELEMENTS:
1. Scheduled appointment details (date, time)
2. Cancellation details (when cancelled, how notified)
3. Reason for cancellation
4. Notice period (late cancel vs advance notice)
5. Cancellation policy applied
6. Rescheduling information
7. Client's current status (brief check-in if contact made)
8. Risk considerations (if cancellation raises concerns)

IMPORTANT NOTES:
- Document exact time of cancellation notification
- Note if cancellation fee applies
- Document if unable to reach client
- Flag if pattern of cancellations is emerging
- Brief risk assessment if appropriate
- Document rescheduled appointment details
`,

      'Consultation Note': `
CONSULTATION NOTE SPECIFIC INSTRUCTIONS:
You are documenting a consultation with another provider or collateral contact.

REQUIRED ELEMENTS:
1. Consultation details (date, time, format, participants)
2. Purpose of consultation
3. Information shared (with consent documentation)
4. Information received
5. Clinical impressions from consultant
6. Recommendations received
7. Action items and follow-up
8. Impact on treatment plan

COLLABORATION TYPES:
- Psychiatrist coordination (medication management)
- PCP consultation (medical concerns)
- School/work consultation (functional impairment)
- Family therapy coordination
- Case manager collaboration
- Specialist referral follow-up
`,

      'Contact Note': `
CONTACT NOTE SPECIFIC INSTRUCTIONS:
You are documenting a brief client contact outside of regular therapy sessions.

REQUIRED ELEMENTS:
1. Contact details (date, time, duration, method)
2. Reason for contact (who initiated, purpose)
3. Content discussed
4. Client's presentation/status
5. Brief risk assessment if indicated
6. Actions taken
7. Follow-up needed
8. Billing considerations (billable vs non-billable)

CONTACT TYPES:
- Phone check-in
- Crisis call
- Brief portal message response
- Coordination with family
- Administrative contact
- Medication check
- Appointment scheduling discussion
`,

      'Termination Note': `
TERMINATION NOTE SPECIFIC INSTRUCTIONS:
You are documenting the discharge of a client from treatment.

REQUIRED ELEMENTS:
1. Reason for termination
2. Treatment summary (length of treatment, sessions completed)
3. Progress toward goals (achievement summary)
4. Client's current functioning
5. Final diagnostic assessment
6. Discharge recommendations
7. Referrals provided (if applicable)
8. Crisis resources provided
9. Follow-up care plan
10. Client readiness for discharge

TERMINATION TYPES:
- Successful completion (goals met)
- Client-initiated termination
- Mutual decision
- Relocation/transfer of care
- Administrative discharge (non-compliance)
- Inappropriate for services

CRITICAL ELEMENTS:
- Document progress made during treatment
- Provide aftercare recommendations
- Ensure client has crisis resources
- Document referrals if ongoing care needed
- Address relapse prevention
`,

      'Miscellaneous Note': `
MISCELLANEOUS NOTE SPECIFIC INSTRUCTIONS:
You are documenting general clinical or administrative information that doesn't fit other note types.

COMMON USES:
- Administrative communications
- Treatment coordination updates
- Clinical observations outside session
- Documentation of collateral contacts
- System/process notes
- Clinical supervision summaries

REQUIRED ELEMENTS:
1. Date and time of event/observation
2. Purpose of documentation
3. Relevant details
4. Clinical significance (if applicable)
5. Action items or follow-up
`,
    };

    return instructions[noteType] || instructions['Miscellaneous Note'];
  }

  /**
   * Build user prompt with all available session data
   */
  private buildUserPrompt(input: NoteGenerationInput): string {
    let prompt = `Please generate a professional clinical ${input.noteType} based on the following information:\n\n`;

    // Add client information
    if (input.clientInfo) {
      prompt += `CLIENT INFORMATION:\n`;
      prompt += `Name: ${input.clientInfo.firstName} ${input.clientInfo.lastName}\n`;
      if (input.clientInfo.age) prompt += `Age: ${input.clientInfo.age}\n`;
      if (input.clientInfo.diagnoses?.length) {
        prompt += `Current Diagnoses: ${input.clientInfo.diagnoses.join(', ')}\n`;
      }
      if (input.clientInfo.presentingProblems?.length) {
        prompt += `Presenting Problems: ${input.clientInfo.presentingProblems.join(', ')}\n`;
      }
      prompt += '\n';
    }

    // Add session data
    if (input.sessionData) {
      prompt += `SESSION INFORMATION:\n`;
      if (input.sessionData.sessionDate) prompt += `Date: ${input.sessionData.sessionDate}\n`;
      if (input.sessionData.sessionDuration) prompt += `Duration: ${input.sessionData.sessionDuration}\n`;
      if (input.sessionData.sessionType) prompt += `Type: ${input.sessionData.sessionType}\n`;
      if (input.sessionData.location) prompt += `Location: ${input.sessionData.location}\n`;
      prompt += '\n';
    }

    // Add transcript if available (real-time transcription)
    if (input.transcript) {
      prompt += `SESSION TRANSCRIPT:\n${input.transcript}\n\n`;
    }

    // Add form data (partially filled form fields)
    if (input.formData && Object.keys(input.formData).length > 0) {
      prompt += `CLINICIAN'S NOTES AND OBSERVATIONS:\n`;
      for (const [key, value] of Object.entries(input.formData)) {
        if (value) {
          prompt += `${key}: ${JSON.stringify(value)}\n`;
        }
      }
      prompt += '\n';
    }

    // Add field schema for this note type
    const fieldMapping = getFieldMapping(input.noteType);
    if (fieldMapping) {
      prompt += `FORM FIELDS TO POPULATE:\nThe ${input.noteType} form has the following fields. You must populate ALL relevant fields based on the information provided.\n\n`;

      for (const [fieldName, fieldInfo] of Object.entries(fieldMapping)) {
        prompt += `- ${fieldName} (${fieldInfo.type}): ${fieldInfo.description}\n`;
        if (fieldInfo.options && fieldInfo.options.length > 0) {
          prompt += `  Valid options: ${fieldInfo.options.join(', ')}\n`;
        }
      }
      prompt += '\n';
    }

    prompt += `TASK:\nGenerate the ${input.noteType} content in a structured format. Return your response as a JSON object with the following structure:

{
  "content": {
    "fieldName1": "value for text/textarea fields",
    "fieldName2": ["option1", "option2"],  // For multiselect fields
    "fieldName3": "Selected Option",  // For select/radio fields (must match valid options exactly)
    "fieldName4": true,  // For checkbox fields
    "fieldName5": 45  // For number fields
  },
  "confidence": 0.85,  // Your confidence in this documentation (0-1)
  "suggestions": [
    "Suggestion 1 for improving documentation",
    "Suggestion 2 for additional information to gather"
  ],
  "warnings": [
    "Warning 1 about missing critical information",
    "Warning 2 about safety concerns"
  ]
}

CRITICAL REQUIREMENTS:
- Populate ALL relevant fields from the form schema above
- For select/multiselect/radio fields, ONLY use values from the provided options list
- Use exact option text (case-sensitive matching)
- For checkbox fields, use true/false boolean values
- For date fields, use YYYY-MM-DD format
- Use professional clinical language throughout
- Be specific with observable details, not vague generalizations
- Always document risk assessment (suicidal/homicidal ideation)
- Flag any safety concerns in warnings array
- Note missing critical information in warnings array
- Provide actionable suggestions for improving the note
- If information is not provided for a field, either infer it reasonably from context or set it to null`;

    return prompt;
  }

  /**
   * Parse AI response into structured format
   */
  private parseAIResponse(response: string, noteType: string): {
    content: Record<string, any>;
    confidence: number;
    suggestions: string[];
    warnings: string[];
  } {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        content: parsed.content || {},
        confidence: parsed.confidence || 0.7,
        suggestions: parsed.suggestions || [],
        warnings: parsed.warnings || [],
      };
    } catch (error) {
      logger.error('Failed to parse AI response:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
      // Fallback: return response as plain text in content
      return {
        content: { rawResponse: response },
        confidence: 0.5,
        suggestions: ['AI response could not be properly parsed. Please review and edit.'],
        warnings: ['Response parsing failed. Manual review required.'],
      };
    }
  }

  /**
   * Generate field-specific suggestions for form fields
   * This provides real-time AI assistance as therapists type
   */
  async generateFieldSuggestion(
    noteType: string,
    fieldName: string,
    partialContent: string,
    context: Record<string, any>
  ): Promise<string> {
    const systemPrompt = `You are a clinical documentation assistant. Provide brief, specific suggestions to help complete the "${fieldName}" field in a ${noteType}.

Keep suggestions:
- Brief (1-3 sentences)
- Clinically appropriate
- Based on the context provided
- Professional and specific`;

    const userPrompt = `Field: ${fieldName}
Current content: "${partialContent}"
Context: ${JSON.stringify(context)}

Provide a brief suggestion to complete or improve this field.`;

    try {
      const suggestion = await anthropicService.generateCompletion(
        systemPrompt,
        userPrompt,
        { maxTokens: 200, temperature: 0.7 }
      );

      return suggestion.trim();
    } catch (error) {
      logger.error('Field suggestion error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
      return '';
    }
  }
}

export const clinicalNoteGenerationService = new ClinicalNoteGenerationService();
export default clinicalNoteGenerationService;
