/**
 * Prior Authorization AI Service (Lisa AI Integration)
 * Uses Claude to auto-fill clinical questionnaires from patient chart data
 * for Georgia Medicaid CMO Prior Authorization submissions
 */

import logger from '../../utils/logger';
import anthropicService from './anthropic.service';
import prisma from '../database';
import { updateAIMetadata } from '../priorAuthQuestionnaire.service';
import {
  SeverityLevel,
  TransportationOption,
  PAQuestionnaireFormData,
  CLINICAL_SYMPTOM_FIELDS,
  NARRATIVE_SECTIONS,
} from '@mentalspace/shared';

// ============================================================================
// TYPES
// ============================================================================

interface ClientClinicalData {
  client: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date | null;
    gender: string | null;
  };
  diagnoses: Array<{
    icdCode: string;
    diagnosisDescription: string;
    diagnosisType: string;
    diagnosisDate: Date;
    severity?: string | null;
  }>;
  insurance: {
    insuranceCompany: string;
    memberId: string;
    planName: string;
  };
  clinicalNotes: Array<{
    noteType: string;
    sessionDate: Date | null;
    subjective: string | null;
    objective: string | null;
    assessment: string | null;
    plan: string | null;
    riskLevel: string | null;
    riskAssessmentDetails: string | null;
    interventionsUsed: string[];
    progressTowardGoals: string | null;
  }>;
  treatmentPlan?: {
    presentingProblems: string[];
    goalsJson: unknown;
    interventions: string[];
  } | null;
  medications: Array<{
    medicationName: string;
    dosage: string | null;
    frequency: string | null;
    startDate: Date;
    status: string;
  }>;
  assessments: Array<{
    assessmentType: string;
    completedAt: Date | null;
    score: number | null;
    interpretation: string | null;
  }>;
}

interface AIGenerationResult {
  formData: Partial<PAQuestionnaireFormData>;
  dataSourcesSummary: Record<string, string[]>;
  confidenceScores: Record<string, number>;
}

// ============================================================================
// CLINICAL DATA GATHERING
// ============================================================================

/**
 * Gather all relevant clinical data for a prior authorization
 */
async function gatherClinicalData(priorAuthorizationId: string): Promise<ClientClinicalData> {
  // Get the prior authorization with client info
  const pa = await prisma.priorAuthorization.findUnique({
    where: { id: priorAuthorizationId },
    include: {
      client: {
        include: {
          diagnoses: {
            where: { status: 'Active' },
            orderBy: { diagnosisType: 'asc' },
          },
        },
      },
      insurance: true,
    },
  });

  if (!pa) {
    throw new Error('Prior Authorization not found');
  }

  const clientId = pa.clientId;

  // Fetch clinical notes (last 10 notes) - use NoteStatus enum values
  const clinicalNotes = await prisma.clinicalNote.findMany({
    where: {
      clientId,
      status: { in: ['SIGNED', 'COSIGNED'] },
    },
    orderBy: { sessionDate: 'desc' },
    take: 10,
    select: {
      noteType: true,
      sessionDate: true,
      subjective: true,
      objective: true,
      assessment: true,
      plan: true,
      riskLevel: true,
      riskAssessmentDetails: true,
      interventionsUsed: true,
      progressTowardGoals: true,
    },
  });

  // Fetch active treatment plan
  const treatmentPlan = await prisma.treatmentPlan.findFirst({
    where: {
      clientId,
      status: { in: ['Active', 'ACTIVE'] },
    },
    select: {
      presentingProblems: true,
      goalsJson: true,
      interventions: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Fetch medications
  const medications = await prisma.medication.findMany({
    where: {
      clientId,
      status: { in: ['ACTIVE', 'Active'] },
    },
    orderBy: { startDate: 'desc' },
    select: {
      medicationName: true,
      dosage: true,
      frequency: true,
      startDate: true,
      status: true,
    },
  });

  // Fetch recent assessment assignments
  const assessments = await prisma.assessmentAssignment.findMany({
    where: {
      clientId,
      status: 'COMPLETED',
    },
    orderBy: { completedAt: 'desc' },
    take: 5,
    select: {
      assessmentType: true,
      completedAt: true,
      score: true,
      interpretation: true,
    },
  });

  return {
    client: {
      id: pa.client.id,
      firstName: pa.client.firstName,
      lastName: pa.client.lastName,
      dateOfBirth: pa.client.dateOfBirth,
      gender: pa.client.gender,
    },
    diagnoses: pa.client.diagnoses.map((d) => ({
      icdCode: d.icdCode,
      diagnosisDescription: d.diagnosisDescription,
      diagnosisType: d.diagnosisType,
      diagnosisDate: d.diagnosisDate,
      severity: d.severity,
    })),
    insurance: {
      insuranceCompany: pa.insurance.insuranceCompany,
      memberId: pa.insurance.memberId,
      planName: pa.insurance.planName,
    },
    clinicalNotes: clinicalNotes.map((n) => ({
      noteType: n.noteType,
      sessionDate: n.sessionDate,
      subjective: n.subjective,
      objective: n.objective,
      assessment: n.assessment,
      plan: n.plan,
      riskLevel: n.riskLevel,
      riskAssessmentDetails: n.riskAssessmentDetails,
      interventionsUsed: n.interventionsUsed,
      progressTowardGoals: n.progressTowardGoals,
    })),
    treatmentPlan: treatmentPlan
      ? {
          presentingProblems: treatmentPlan.presentingProblems,
          goalsJson: treatmentPlan.goalsJson,
          interventions: treatmentPlan.interventions,
        }
      : null,
    medications: medications.map((m) => ({
      medicationName: m.medicationName,
      dosage: m.dosage,
      frequency: m.frequency,
      startDate: m.startDate,
      status: m.status,
    })),
    assessments: assessments.map((a) => ({
      assessmentType: a.assessmentType,
      completedAt: a.completedAt,
      score: a.score,
      interpretation: a.interpretation,
    })),
  };
}

// ============================================================================
// AI PROMPT BUILDING
// ============================================================================

/**
 * Build system prompt for Lisa AI
 */
function buildSystemPrompt(): string {
  return `You are Lisa, an AI clinical documentation assistant for a mental health EHR system.
Your task is to complete a Prior Authorization clinical questionnaire for Georgia Medicaid CMO submissions (CareSource, Amerigroup, Peach State).

You will analyze clinical documentation and extract relevant information to fill out the questionnaire accurately.

IMPORTANT GUIDELINES:
1. Base ALL responses on documented clinical evidence from the patient's chart
2. Use severity levels appropriately:
   - NA: No evidence of this symptom in documentation
   - MILD: Occasional symptoms, minimal functional impairment
   - MODERATE: Frequent symptoms, noticeable functional impairment
   - SEVERE: Persistent symptoms, significant functional impairment
3. For narrative sections, provide clinical justification citing specific evidence
4. Never fabricate or exaggerate clinical information
5. If information is not clearly documented, use NA or leave narrative sections brief
6. Focus on current clinical presentation, not historical symptoms

CLINICAL CATEGORIES TO ASSESS:
- Anxiety symptoms: obsessions/compulsions, generalized anxiety, panic, phobias, somatic complaints, PTSD
- Mania symptoms: insomnia, grandiosity, pressured speech, racing thoughts, poor judgement
- Psychotic symptoms: delusions/paranoia, self-care issues, hallucinations, disorganized thought, loose associations
- Depression symptoms: concentration, memory, psychomotor retardation, sexual issues, appetite, irritability, agitation, sleep, hopelessness
- Substance use: loss of control, amnesic episodes, legal problems, alcohol/opiate/prescription/polysubstance abuse
- Personality traits: oddness, oppositional behavior, disregard for law, self-injuries, entitlement, passive-aggressive, dependency

NARRATIVE SECTIONS:
1. Risk of Harm - Document any SI/HI, self-harm history, safety concerns
2. Functional Status - Document ADLs, work/school, relationships, self-care abilities
3. Medical Comorbidities - Physical health conditions affecting treatment
4. Environmental Stressors - Social determinants, housing, financial, relationship issues
5. Natural Support Systems - Family, friends, community resources
6. Treatment Response - How patient has responded to current/past treatments
7. Level of Care Justification - Why current/requested level of care is appropriate
8. History - Relevant psychiatric and treatment history
9. Presenting Problems - Current chief complaints and symptoms
10. Current Medications - All psychiatric medications with doses
11. Transportation - Document transportation access
12. Other Clinical Info - Any additional relevant clinical information

Return your response as valid JSON matching the expected format.`;
}

/**
 * Build user prompt with clinical data
 */
function buildUserPrompt(clinicalData: ClientClinicalData): string {
  let prompt = `Please analyze the following clinical documentation and complete the Prior Authorization questionnaire.\n\n`;

  // Patient demographics
  prompt += `PATIENT INFORMATION:\n`;
  prompt += `Name: ${clinicalData.client.firstName} ${clinicalData.client.lastName}\n`;
  if (clinicalData.client.dateOfBirth) {
    const age = Math.floor(
      (Date.now() - new Date(clinicalData.client.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
    prompt += `Age: ${age}\n`;
  }
  if (clinicalData.client.gender) {
    prompt += `Gender: ${clinicalData.client.gender}\n`;
  }
  prompt += '\n';

  // Insurance
  prompt += `INSURANCE:\n`;
  prompt += `Payer: ${clinicalData.insurance.insuranceCompany}\n`;
  prompt += `Member ID: ${clinicalData.insurance.memberId}\n`;
  prompt += `Plan: ${clinicalData.insurance.planName}\n\n`;

  // Diagnoses
  prompt += `DIAGNOSES:\n`;
  if (clinicalData.diagnoses.length > 0) {
    for (const dx of clinicalData.diagnoses) {
      prompt += `- ${dx.icdCode}: ${dx.diagnosisDescription} (${dx.diagnosisType})`;
      if (dx.severity) prompt += ` - Severity: ${dx.severity}`;
      prompt += '\n';
    }
  } else {
    prompt += `No active diagnoses documented.\n`;
  }
  prompt += '\n';

  // Medications
  prompt += `CURRENT MEDICATIONS:\n`;
  if (clinicalData.medications.length > 0) {
    for (const med of clinicalData.medications) {
      prompt += `- ${med.medicationName}`;
      if (med.dosage) prompt += ` ${med.dosage}`;
      if (med.frequency) prompt += ` ${med.frequency}`;
      prompt += '\n';
    }
  } else {
    prompt += `No current medications documented.\n`;
  }
  prompt += '\n';

  // Treatment Plan
  if (clinicalData.treatmentPlan) {
    prompt += `TREATMENT PLAN:\n`;
    if (clinicalData.treatmentPlan.presentingProblems.length > 0) {
      prompt += `Presenting Problems: ${clinicalData.treatmentPlan.presentingProblems.join(', ')}\n`;
    }
    if (clinicalData.treatmentPlan.goalsJson) {
      const goals = clinicalData.treatmentPlan.goalsJson as Array<{ description?: string; status?: string }>;
      if (Array.isArray(goals) && goals.length > 0) {
        prompt += `Goals:\n`;
        for (const goal of goals) {
          prompt += `- ${goal.description || 'No description'} (Status: ${goal.status || 'Unknown'})\n`;
        }
      }
    }
    if (clinicalData.treatmentPlan.interventions.length > 0) {
      prompt += `Interventions: ${clinicalData.treatmentPlan.interventions.join(', ')}\n`;
    }
    prompt += '\n';
  }

  // Assessments
  if (clinicalData.assessments.length > 0) {
    prompt += `RECENT ASSESSMENTS:\n`;
    for (const assessment of clinicalData.assessments) {
      const dateStr = assessment.completedAt ? assessment.completedAt.toLocaleDateString() : 'Unknown date';
      prompt += `- ${assessment.assessmentType} (${dateStr})`;
      if (assessment.score !== null) {
        prompt += ` - Score: ${assessment.score}`;
      }
      if (assessment.interpretation) {
        prompt += ` - ${assessment.interpretation}`;
      }
      prompt += '\n';
    }
    prompt += '\n';
  }

  // Clinical Notes
  prompt += `CLINICAL NOTES (Most Recent):\n`;
  if (clinicalData.clinicalNotes.length > 0) {
    for (const note of clinicalData.clinicalNotes.slice(0, 5)) {
      const dateStr = note.sessionDate ? note.sessionDate.toLocaleDateString() : 'Unknown date';
      prompt += `\n--- ${note.noteType} (${dateStr}) ---\n`;

      // SOAP content
      if (note.subjective) {
        prompt += `Subjective: ${note.subjective.slice(0, 500)}\n`;
      }
      if (note.objective) {
        prompt += `Objective: ${note.objective.slice(0, 500)}\n`;
      }
      if (note.assessment) {
        prompt += `Assessment: ${note.assessment.slice(0, 500)}\n`;
      }
      if (note.plan) {
        prompt += `Plan: ${note.plan.slice(0, 500)}\n`;
      }

      // Risk assessment
      if (note.riskLevel) {
        prompt += `Risk Level: ${note.riskLevel}\n`;
      }
      if (note.riskAssessmentDetails) {
        prompt += `Risk Assessment: ${note.riskAssessmentDetails.slice(0, 300)}\n`;
      }

      // Treatment info
      if (note.interventionsUsed && note.interventionsUsed.length > 0) {
        prompt += `Interventions: ${note.interventionsUsed.join(', ')}\n`;
      }
      if (note.progressTowardGoals) {
        prompt += `Progress: ${note.progressTowardGoals.slice(0, 300)}\n`;
      }
    }
  } else {
    prompt += `No clinical notes available.\n`;
  }
  prompt += '\n';

  // Expected response format
  prompt += `\nBased on this clinical documentation, complete the PA questionnaire. Return JSON in this format:
{
  "severityRatings": {
    "anxiety_obsessions_compulsions": "NA|MILD|MODERATE|SEVERE",
    "anxiety_generalized": "NA|MILD|MODERATE|SEVERE",
    "anxiety_panic_attacks": "NA|MILD|MODERATE|SEVERE",
    "anxiety_phobias": "NA|MILD|MODERATE|SEVERE",
    "anxiety_somatic_complaints": "NA|MILD|MODERATE|SEVERE",
    "anxiety_ptsd_symptoms": "NA|MILD|MODERATE|SEVERE",
    "mania_insomnia": "NA|MILD|MODERATE|SEVERE",
    "mania_grandiosity": "NA|MILD|MODERATE|SEVERE",
    "mania_pressured_speech": "NA|MILD|MODERATE|SEVERE",
    "mania_racing_thoughts": "NA|MILD|MODERATE|SEVERE",
    "mania_poor_judgement": "NA|MILD|MODERATE|SEVERE",
    "psychotic_delusions_paranoia": "NA|MILD|MODERATE|SEVERE",
    "psychotic_selfcare_issues": "NA|MILD|MODERATE|SEVERE",
    "psychotic_hallucinations": "NA|MILD|MODERATE|SEVERE",
    "psychotic_disorganized_thought": "NA|MILD|MODERATE|SEVERE",
    "psychotic_loose_associations": "NA|MILD|MODERATE|SEVERE",
    "depression_impaired_concentration": "NA|MILD|MODERATE|SEVERE",
    "depression_impaired_memory": "NA|MILD|MODERATE|SEVERE",
    "depression_psychomotor_retardation": "NA|MILD|MODERATE|SEVERE",
    "depression_sexual_issues": "NA|MILD|MODERATE|SEVERE",
    "depression_appetite_disturbance": "NA|MILD|MODERATE|SEVERE",
    "depression_irritability": "NA|MILD|MODERATE|SEVERE",
    "depression_agitation": "NA|MILD|MODERATE|SEVERE",
    "depression_sleep_disturbance": "NA|MILD|MODERATE|SEVERE",
    "depression_hopelessness": "NA|MILD|MODERATE|SEVERE",
    "substance_loss_of_control": "NA|MILD|MODERATE|SEVERE",
    "substance_amnesic_episodes": "NA|MILD|MODERATE|SEVERE",
    "substance_legal_problems": "NA|MILD|MODERATE|SEVERE",
    "substance_alcohol_abuse": "NA|MILD|MODERATE|SEVERE",
    "substance_opiate_abuse": "NA|MILD|MODERATE|SEVERE",
    "substance_prescription_abuse": "NA|MILD|MODERATE|SEVERE",
    "substance_polysubstance_abuse": "NA|MILD|MODERATE|SEVERE",
    "personality_oddness": "NA|MILD|MODERATE|SEVERE",
    "personality_oppositional": "NA|MILD|MODERATE|SEVERE",
    "personality_disregard_law": "NA|MILD|MODERATE|SEVERE",
    "personality_self_injuries": "NA|MILD|MODERATE|SEVERE",
    "personality_entitlement": "NA|MILD|MODERATE|SEVERE",
    "personality_passive_aggressive": "NA|MILD|MODERATE|SEVERE",
    "personality_dependency": "NA|MILD|MODERATE|SEVERE"
  },
  "textFields": {
    "substance_other_drugs": "Other drugs if applicable",
    "personality_enduring_traits": "Enduring personality traits if applicable"
  },
  "narratives": {
    "narrative_risk_of_harm": "Clinical narrative about risk assessment...",
    "narrative_functional_status": "Clinical narrative about functional status...",
    "narrative_comorbidities": "Medical comorbidities affecting treatment...",
    "narrative_environmental_stressors": "Environmental stressors...",
    "narrative_natural_support": "Natural support systems...",
    "narrative_treatment_response": "Response to treatment...",
    "narrative_level_of_care": "Level of care justification...",
    "narrative_history": "Psychiatric history...",
    "narrative_presenting_problems": "Current presenting problems...",
    "narrative_current_medications": "Current medications with doses...",
    "narrative_other_clinical_info": "Other relevant clinical info..."
  },
  "transportation": {
    "available": "YES|NO|OTHER",
    "notes": "Transportation notes if applicable"
  },
  "confidenceScores": {
    "severityRatings": 0.85,
    "narratives": 0.80,
    "overall": 0.82
  },
  "dataSources": {
    "clinicalNotes": ["Note types used"],
    "assessments": ["Assessment types used"],
    "diagnoses": ["Diagnosis codes used"],
    "medications": ["Medications referenced"]
  }
}

IMPORTANT:
- Use only documented clinical evidence
- For symptoms not documented, use "NA"
- Provide specific clinical justification in narratives
- Be concise but thorough in narrative sections`;

  return prompt;
}

// ============================================================================
// AI RESPONSE PARSING
// ============================================================================

/**
 * Parse AI response into form data
 */
function parseAIResponse(response: string): AIGenerationResult {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Build form data from parsed response
    const formData: Partial<PAQuestionnaireFormData> = {};

    // Map severity ratings
    if (parsed.severityRatings) {
      for (const [key, value] of Object.entries(parsed.severityRatings)) {
        if (value && ['NA', 'MILD', 'MODERATE', 'SEVERE'].includes(String(value).toUpperCase())) {
          (formData as Record<string, unknown>)[key] = String(value).toUpperCase() as SeverityLevel;
        }
      }
    }

    // Map text fields
    if (parsed.textFields) {
      if (parsed.textFields.substance_other_drugs) {
        formData.substance_other_drugs = parsed.textFields.substance_other_drugs;
      }
      if (parsed.textFields.personality_enduring_traits) {
        formData.personality_enduring_traits = parsed.textFields.personality_enduring_traits;
      }
    }

    // Map narratives
    if (parsed.narratives) {
      for (const [key, value] of Object.entries(parsed.narratives)) {
        if (value && typeof value === 'string') {
          (formData as Record<string, unknown>)[key] = value;
        }
      }
    }

    // Map transportation
    if (parsed.transportation) {
      if (parsed.transportation.available) {
        const transportValue = String(parsed.transportation.available).toUpperCase();
        if (['YES', 'NO', 'OTHER'].includes(transportValue)) {
          formData.transportation_available = transportValue as TransportationOption;
        }
      }
      if (parsed.transportation.notes) {
        formData.transportation_notes = parsed.transportation.notes;
      }
    }

    // Extract data sources summary
    const dataSourcesSummary: Record<string, string[]> = parsed.dataSources || {
      clinicalNotes: [],
      assessments: [],
      diagnoses: [],
      medications: [],
    };

    // Extract confidence scores
    const confidenceScores: Record<string, number> = parsed.confidenceScores || {
      severityRatings: 0.7,
      narratives: 0.7,
      overall: 0.7,
    };

    return {
      formData,
      dataSourcesSummary,
      confidenceScores,
    };
  } catch (error) {
    logger.error('Failed to parse AI response for PA questionnaire', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error('Failed to parse AI-generated questionnaire data');
  }
}

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Generate questionnaire content using Lisa AI
 */
export async function generateQuestionnaireWithAI(
  priorAuthorizationId: string,
  userId: string
): Promise<AIGenerationResult> {
  logger.info('Starting Lisa AI questionnaire generation', { priorAuthorizationId, userId });

  // Gather clinical data
  const clinicalData = await gatherClinicalData(priorAuthorizationId);

  // Build prompts
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(clinicalData);

  // Call AI service
  const response = await anthropicService.generateCompletion(systemPrompt, userPrompt, {
    maxTokens: 4000,
    temperature: 0.3, // Lower temperature for more consistent clinical output
  });

  // Parse response
  const result = parseAIResponse(response);

  logger.info('Lisa AI questionnaire generation completed', {
    priorAuthorizationId,
    userId,
    confidenceScore: result.confidenceScores.overall,
    fieldsGenerated: Object.keys(result.formData).length,
  });

  return result;
}

/**
 * Generate and save questionnaire with AI
 */
export async function generateAndSaveQuestionnaire(
  priorAuthorizationId: string,
  userId: string
): Promise<{
  formData: Partial<PAQuestionnaireFormData>;
  dataSourcesSummary: Record<string, string[]>;
  confidenceScores: Record<string, number>;
}> {
  // Generate with AI
  const result = await generateQuestionnaireWithAI(priorAuthorizationId, userId);

  // Update AI metadata on questionnaire
  await updateAIMetadata(priorAuthorizationId, userId, result.dataSourcesSummary, result.confidenceScores);

  return result;
}

// Export service
export const priorAuthAIService = {
  generateQuestionnaireWithAI,
  generateAndSaveQuestionnaire,
};

export default priorAuthAIService;
