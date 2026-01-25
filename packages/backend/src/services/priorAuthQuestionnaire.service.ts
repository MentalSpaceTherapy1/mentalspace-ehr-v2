/**
 * Prior Authorization Questionnaire Service
 * Handles CRUD operations for clinical questionnaires attached to prior authorizations
 */

import prisma from './database';
import logger from '../utils/logger';
import { BadRequestError, NotFoundError } from '../utils/errors';
import {
  SeverityLevel,
  TransportationOption,
  PAQuestionnaireFormData,
  DEFAULT_QUESTIONNAIRE_VALUES,
} from '@mentalspace/shared';

// ============================================================================
// TYPES
// ============================================================================

interface CreateQuestionnaireInput {
  priorAuthorizationId: string;
  formData: Partial<PAQuestionnaireFormData>;
  userId: string;
}

interface UpdateQuestionnaireInput {
  formData: Partial<PAQuestionnaireFormData>;
  userId: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build header fields from client and PA data
 */
async function buildHeaderFields(priorAuthId: string) {
  const pa = await prisma.priorAuthorization.findUnique({
    where: { id: priorAuthId },
    include: {
      client: {
        include: {
          diagnoses: {
            where: { status: 'Active' },
            orderBy: { diagnosisType: 'asc' }, // Primary comes first alphabetically
          },
        },
      },
      insurance: true,
    },
  });

  if (!pa) {
    throw new NotFoundError('Prior Authorization not found');
  }

  const client = pa.client;
  const clientName = `${client.firstName} ${client.lastName}`;
  const clientDOB = client.dateOfBirth;

  // Build diagnosis display string
  const diagnosisDisplay = client.diagnoses
    .map((d: { diagnosisDescription: string; icdCode: string; diagnosisDate: Date | null }) =>
      `${d.diagnosisDescription} ${d.icdCode} ${d.diagnosisDate ? new Date(d.diagnosisDate).toLocaleDateString() : ''}`)
    .join('\n');

  // Build insurance display string
  const insuranceDisplay = `${pa.insurance.insuranceCompany} - ${pa.insurance.memberId}`;

  return {
    clientName,
    clientDOB,
    diagnosisDisplay,
    insuranceDisplay,
  };
}

/**
 * Convert form data to database fields
 */
function formDataToDbFields(formData: Partial<PAQuestionnaireFormData>) {
  const dbFields: Record<string, unknown> = {};

  // Map severity fields (enum values)
  const severityFields = [
    'anxiety_obsessions_compulsions', 'anxiety_generalized', 'anxiety_panic_attacks',
    'anxiety_phobias', 'anxiety_somatic_complaints', 'anxiety_ptsd_symptoms',
    'mania_insomnia', 'mania_grandiosity', 'mania_pressured_speech',
    'mania_racing_thoughts', 'mania_poor_judgement',
    'psychotic_delusions_paranoia', 'psychotic_selfcare_issues', 'psychotic_hallucinations',
    'psychotic_disorganized_thought', 'psychotic_loose_associations',
    'depression_impaired_concentration', 'depression_impaired_memory',
    'depression_psychomotor_retardation', 'depression_sexual_issues',
    'depression_appetite_disturbance', 'depression_irritability', 'depression_agitation',
    'depression_sleep_disturbance', 'depression_hopelessness',
    'substance_loss_of_control', 'substance_amnesic_episodes', 'substance_legal_problems',
    'substance_alcohol_abuse', 'substance_opiate_abuse', 'substance_prescription_abuse',
    'substance_polysubstance_abuse',
    'personality_oddness', 'personality_oppositional', 'personality_disregard_law',
    'personality_self_injuries', 'personality_entitlement', 'personality_passive_aggressive',
    'personality_dependency',
  ];

  for (const field of severityFields) {
    if (formData[field as keyof PAQuestionnaireFormData] !== undefined) {
      dbFields[field] = formData[field as keyof PAQuestionnaireFormData];
    }
  }

  // Map text fields
  const textFields = [
    'substance_other_drugs', 'personality_enduring_traits',
    'narrative_risk_of_harm', 'narrative_functional_status', 'narrative_comorbidities',
    'narrative_environmental_stressors', 'narrative_natural_support',
    'narrative_treatment_response', 'narrative_level_of_care', 'transportation_notes',
    'narrative_history', 'narrative_presenting_problems', 'narrative_other_clinical_info',
    'narrative_current_medications',
  ];

  for (const field of textFields) {
    if (formData[field as keyof PAQuestionnaireFormData] !== undefined) {
      dbFields[field] = formData[field as keyof PAQuestionnaireFormData];
    }
  }

  // Map transportation enum
  if (formData.transportation_available !== undefined) {
    dbFields.transportation_available = formData.transportation_available;
  }

  return dbFields;
}

/**
 * Convert database record to form data
 */
function dbToFormData(dbRecord: Record<string, unknown>): PAQuestionnaireFormData {
  return {
    // Header fields
    clientName: dbRecord.clientName as string,
    clientDOB: dbRecord.clientDOB ? new Date(dbRecord.clientDOB as Date).toISOString() : '',
    diagnosisDisplay: dbRecord.diagnosisDisplay as string,
    insuranceDisplay: dbRecord.insuranceDisplay as string,

    // Anxiety
    anxiety_obsessions_compulsions: dbRecord.anxiety_obsessions_compulsions as SeverityLevel,
    anxiety_generalized: dbRecord.anxiety_generalized as SeverityLevel,
    anxiety_panic_attacks: dbRecord.anxiety_panic_attacks as SeverityLevel,
    anxiety_phobias: dbRecord.anxiety_phobias as SeverityLevel,
    anxiety_somatic_complaints: dbRecord.anxiety_somatic_complaints as SeverityLevel,
    anxiety_ptsd_symptoms: dbRecord.anxiety_ptsd_symptoms as SeverityLevel,

    // Mania
    mania_insomnia: dbRecord.mania_insomnia as SeverityLevel,
    mania_grandiosity: dbRecord.mania_grandiosity as SeverityLevel,
    mania_pressured_speech: dbRecord.mania_pressured_speech as SeverityLevel,
    mania_racing_thoughts: dbRecord.mania_racing_thoughts as SeverityLevel,
    mania_poor_judgement: dbRecord.mania_poor_judgement as SeverityLevel,

    // Psychotic
    psychotic_delusions_paranoia: dbRecord.psychotic_delusions_paranoia as SeverityLevel,
    psychotic_selfcare_issues: dbRecord.psychotic_selfcare_issues as SeverityLevel,
    psychotic_hallucinations: dbRecord.psychotic_hallucinations as SeverityLevel,
    psychotic_disorganized_thought: dbRecord.psychotic_disorganized_thought as SeverityLevel,
    psychotic_loose_associations: dbRecord.psychotic_loose_associations as SeverityLevel,

    // Depression
    depression_impaired_concentration: dbRecord.depression_impaired_concentration as SeverityLevel,
    depression_impaired_memory: dbRecord.depression_impaired_memory as SeverityLevel,
    depression_psychomotor_retardation: dbRecord.depression_psychomotor_retardation as SeverityLevel,
    depression_sexual_issues: dbRecord.depression_sexual_issues as SeverityLevel,
    depression_appetite_disturbance: dbRecord.depression_appetite_disturbance as SeverityLevel,
    depression_irritability: dbRecord.depression_irritability as SeverityLevel,
    depression_agitation: dbRecord.depression_agitation as SeverityLevel,
    depression_sleep_disturbance: dbRecord.depression_sleep_disturbance as SeverityLevel,
    depression_hopelessness: dbRecord.depression_hopelessness as SeverityLevel,

    // Substance
    substance_loss_of_control: dbRecord.substance_loss_of_control as SeverityLevel,
    substance_amnesic_episodes: dbRecord.substance_amnesic_episodes as SeverityLevel,
    substance_legal_problems: dbRecord.substance_legal_problems as SeverityLevel,
    substance_alcohol_abuse: dbRecord.substance_alcohol_abuse as SeverityLevel,
    substance_opiate_abuse: dbRecord.substance_opiate_abuse as SeverityLevel,
    substance_prescription_abuse: dbRecord.substance_prescription_abuse as SeverityLevel,
    substance_polysubstance_abuse: dbRecord.substance_polysubstance_abuse as SeverityLevel,
    substance_other_drugs: dbRecord.substance_other_drugs as string | undefined,

    // Personality
    personality_oddness: dbRecord.personality_oddness as SeverityLevel,
    personality_oppositional: dbRecord.personality_oppositional as SeverityLevel,
    personality_disregard_law: dbRecord.personality_disregard_law as SeverityLevel,
    personality_self_injuries: dbRecord.personality_self_injuries as SeverityLevel,
    personality_entitlement: dbRecord.personality_entitlement as SeverityLevel,
    personality_passive_aggressive: dbRecord.personality_passive_aggressive as SeverityLevel,
    personality_dependency: dbRecord.personality_dependency as SeverityLevel,
    personality_enduring_traits: dbRecord.personality_enduring_traits as string | undefined,

    // Narratives
    narrative_risk_of_harm: dbRecord.narrative_risk_of_harm as string,
    narrative_functional_status: dbRecord.narrative_functional_status as string,
    narrative_comorbidities: dbRecord.narrative_comorbidities as string,
    narrative_environmental_stressors: dbRecord.narrative_environmental_stressors as string,
    narrative_natural_support: dbRecord.narrative_natural_support as string,
    narrative_treatment_response: dbRecord.narrative_treatment_response as string,
    narrative_level_of_care: dbRecord.narrative_level_of_care as string,
    transportation_available: dbRecord.transportation_available as TransportationOption,
    transportation_notes: dbRecord.transportation_notes as string | undefined,
    narrative_history: dbRecord.narrative_history as string,
    narrative_presenting_problems: dbRecord.narrative_presenting_problems as string,
    narrative_other_clinical_info: dbRecord.narrative_other_clinical_info as string | undefined,
    narrative_current_medications: dbRecord.narrative_current_medications as string,
  };
}

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Get questionnaire for a prior authorization
 */
export async function getQuestionnaire(priorAuthorizationId: string) {
  const questionnaire = await prisma.priorAuthorizationQuestionnaire.findUnique({
    where: { priorAuthorizationId },
    include: {
      creator: {
        select: { id: true, firstName: true, lastName: true },
      },
      modifier: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  if (!questionnaire) {
    return null;
  }

  return {
    id: questionnaire.id,
    priorAuthorizationId: questionnaire.priorAuthorizationId,
    formData: dbToFormData(questionnaire as unknown as Record<string, unknown>),
    aiGeneratedAt: questionnaire.aiGeneratedAt?.toISOString(),
    aiGeneratedBy: questionnaire.aiGeneratedBy,
    aiDataSourcesSummary: questionnaire.aiDataSourcesSummary as Record<string, string[]> | null,
    aiConfidenceScores: questionnaire.aiConfidenceScores as Record<string, number> | null,
    createdAt: questionnaire.createdAt.toISOString(),
    updatedAt: questionnaire.updatedAt.toISOString(),
    createdBy: questionnaire.createdBy,
    lastModifiedBy: questionnaire.lastModifiedBy,
    creator: questionnaire.creator,
    modifier: questionnaire.modifier,
  };
}

/**
 * Create or update questionnaire for a prior authorization
 */
export async function saveQuestionnaire(input: CreateQuestionnaireInput | UpdateQuestionnaireInput & { priorAuthorizationId?: string }) {
  const priorAuthId = (input as CreateQuestionnaireInput).priorAuthorizationId;

  if (!priorAuthId) {
    throw new BadRequestError('Prior Authorization ID is required');
  }

  // Check if PA exists
  const pa = await prisma.priorAuthorization.findUnique({
    where: { id: priorAuthId },
  });

  if (!pa) {
    throw new NotFoundError('Prior Authorization not found');
  }

  // Get header fields
  const headerFields = await buildHeaderFields(priorAuthId);

  // Check if questionnaire exists
  const existing = await prisma.priorAuthorizationQuestionnaire.findUnique({
    where: { priorAuthorizationId: priorAuthId },
  });

  const dbFields = formDataToDbFields(input.formData);

  if (existing) {
    // Update existing
    const updated = await prisma.priorAuthorizationQuestionnaire.update({
      where: { priorAuthorizationId: priorAuthId },
      data: {
        ...dbFields,
        lastModifiedBy: input.userId,
      },
    });

    logger.info('Questionnaire updated', { questionnaireId: updated.id, priorAuthId });
    return getQuestionnaire(priorAuthId);
  } else {
    // Create new with defaults merged
    const mergedData = {
      ...DEFAULT_QUESTIONNAIRE_VALUES,
      ...dbFields,
    };

    const created = await prisma.priorAuthorizationQuestionnaire.create({
      data: {
        priorAuthorizationId: priorAuthId,
        clientName: headerFields.clientName,
        clientDOB: headerFields.clientDOB,
        diagnosisDisplay: headerFields.diagnosisDisplay,
        insuranceDisplay: headerFields.insuranceDisplay,
        ...mergedData,
        // Required narrative fields - empty string if not provided
        narrative_risk_of_harm: (mergedData.narrative_risk_of_harm as string) || '',
        narrative_functional_status: (mergedData.narrative_functional_status as string) || '',
        narrative_comorbidities: (mergedData.narrative_comorbidities as string) || '',
        narrative_environmental_stressors: (mergedData.narrative_environmental_stressors as string) || '',
        narrative_natural_support: (mergedData.narrative_natural_support as string) || '',
        narrative_treatment_response: (mergedData.narrative_treatment_response as string) || '',
        narrative_level_of_care: (mergedData.narrative_level_of_care as string) || '',
        narrative_history: (mergedData.narrative_history as string) || '',
        narrative_presenting_problems: (mergedData.narrative_presenting_problems as string) || '',
        narrative_current_medications: (mergedData.narrative_current_medications as string) || '',
        createdBy: input.userId,
        lastModifiedBy: input.userId,
      },
    });

    logger.info('Questionnaire created', { questionnaireId: created.id, priorAuthId });
    return getQuestionnaire(priorAuthId);
  }
}

/**
 * Update AI generation metadata on questionnaire
 */
export async function updateAIMetadata(
  priorAuthorizationId: string,
  userId: string,
  dataSourcesSummary: Record<string, string[]>,
  confidenceScores: Record<string, number>
) {
  await prisma.priorAuthorizationQuestionnaire.update({
    where: { priorAuthorizationId },
    data: {
      aiGeneratedAt: new Date(),
      aiGeneratedBy: userId,
      aiDataSourcesSummary: dataSourcesSummary,
      aiConfidenceScores: confidenceScores,
      lastModifiedBy: userId,
    },
  });

  logger.info('AI metadata updated', { priorAuthorizationId, userId });
}

/**
 * Get questionnaire for copying (reauthorization)
 */
export async function getQuestionnaireForCopy(priorAuthorizationId: string) {
  const questionnaire = await getQuestionnaire(priorAuthorizationId);

  if (!questionnaire) {
    return null;
  }

  // Remove metadata fields for copy
  const { id, createdAt, updatedAt, createdBy, lastModifiedBy, aiGeneratedAt, aiGeneratedBy, ...copyData } = questionnaire;

  return copyData;
}

/**
 * Copy questionnaire from previous PA to new PA (for reauthorization)
 */
export async function copyQuestionnaireForReauth(
  sourcePriorAuthId: string,
  targetPriorAuthId: string,
  userId: string
) {
  const sourceData = await getQuestionnaireForCopy(sourcePriorAuthId);

  if (!sourceData) {
    logger.warn('No questionnaire found to copy', { sourcePriorAuthId });
    return null;
  }

  // Create new questionnaire with copied data
  return saveQuestionnaire({
    priorAuthorizationId: targetPriorAuthId,
    formData: sourceData.formData,
    userId,
  });
}

/**
 * Delete questionnaire (for draft PA deletion)
 */
export async function deleteQuestionnaire(priorAuthorizationId: string) {
  const existing = await prisma.priorAuthorizationQuestionnaire.findUnique({
    where: { priorAuthorizationId },
  });

  if (!existing) {
    return false;
  }

  await prisma.priorAuthorizationQuestionnaire.delete({
    where: { priorAuthorizationId },
  });

  logger.info('Questionnaire deleted', { priorAuthorizationId });
  return true;
}

// Export service object
export const priorAuthQuestionnaireService = {
  getQuestionnaire,
  saveQuestionnaire,
  updateAIMetadata,
  getQuestionnaireForCopy,
  copyQuestionnaireForReauth,
  deleteQuestionnaire,
};

export default priorAuthQuestionnaireService;
