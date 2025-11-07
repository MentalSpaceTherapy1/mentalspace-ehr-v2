import { PrismaClient, OutcomeMeasureType, OutcomeSeverity } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Outcome Measure Service
 * Handles PHQ-9, GAD-7, and PCL-5 outcome measure administration and scoring
 *
 * Phase 2.3: Outcome Measures Integration
 */

// =============================================================================
// QUESTIONNAIRE DEFINITIONS
// =============================================================================

interface Question {
  id: string;
  text: string;
  options?: { value: number; label: string }[];
}

interface QuestionnaireDefinition {
  type: OutcomeMeasureType;
  name: string;
  description: string;
  questions: Question[];
  scoringInfo: {
    minScore: number;
    maxScore: number;
    severityRanges: { min: number; max: number; severity: OutcomeSeverity; label: string }[];
  };
}

// PHQ-9: Patient Health Questionnaire-9 (Depression Screening)
const PHQ9_DEFINITION: QuestionnaireDefinition = {
  type: 'PHQ9',
  name: 'PHQ-9',
  description: 'Patient Health Questionnaire-9 for Depression Screening',
  questions: [
    { id: 'q1', text: 'Little interest or pleasure in doing things' },
    { id: 'q2', text: 'Feeling down, depressed, or hopeless' },
    { id: 'q3', text: 'Trouble falling or staying asleep, or sleeping too much' },
    { id: 'q4', text: 'Feeling tired or having little energy' },
    { id: 'q5', text: 'Poor appetite or overeating' },
    { id: 'q6', text: 'Feeling bad about yourself - or that you are a failure or have let yourself or your family down' },
    { id: 'q7', text: 'Trouble concentrating on things, such as reading the newspaper or watching television' },
    { id: 'q8', text: 'Moving or speaking so slowly that other people could have noticed. Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual' },
    { id: 'q9', text: 'Thoughts that you would be better off dead, or of hurting yourself in some way' },
  ],
  scoringInfo: {
    minScore: 0,
    maxScore: 27,
    severityRanges: [
      { min: 0, max: 4, severity: 'MINIMAL', label: 'Minimal depression' },
      { min: 5, max: 9, severity: 'MILD', label: 'Mild depression' },
      { min: 10, max: 14, severity: 'MODERATE', label: 'Moderate depression' },
      { min: 15, max: 19, severity: 'MODERATELY_SEVERE', label: 'Moderately severe depression' },
      { min: 20, max: 27, severity: 'SEVERE', label: 'Severe depression' },
    ],
  },
};

// GAD-7: Generalized Anxiety Disorder-7 (Anxiety Screening)
const GAD7_DEFINITION: QuestionnaireDefinition = {
  type: 'GAD7',
  name: 'GAD-7',
  description: 'Generalized Anxiety Disorder-7 for Anxiety Screening',
  questions: [
    { id: 'q1', text: 'Feeling nervous, anxious, or on edge' },
    { id: 'q2', text: 'Not being able to stop or control worrying' },
    { id: 'q3', text: 'Worrying too much about different things' },
    { id: 'q4', text: 'Trouble relaxing' },
    { id: 'q5', text: 'Being so restless that it is hard to sit still' },
    { id: 'q6', text: 'Becoming easily annoyed or irritable' },
    { id: 'q7', text: 'Feeling afraid, as if something awful might happen' },
  ],
  scoringInfo: {
    minScore: 0,
    maxScore: 21,
    severityRanges: [
      { min: 0, max: 4, severity: 'MINIMAL', label: 'Minimal anxiety' },
      { min: 5, max: 9, severity: 'MILD', label: 'Mild anxiety' },
      { min: 10, max: 14, severity: 'MODERATE', label: 'Moderate anxiety' },
      { min: 15, max: 21, severity: 'SEVERE', label: 'Severe anxiety' },
    ],
  },
};

// PCL-5: PTSD Checklist for DSM-5
const PCL5_DEFINITION: QuestionnaireDefinition = {
  type: 'PCL5',
  name: 'PCL-5',
  description: 'PTSD Checklist for DSM-5',
  questions: [
    { id: 'q1', text: 'Repeated, disturbing, and unwanted memories of the stressful experience?' },
    { id: 'q2', text: 'Repeated, disturbing dreams of the stressful experience?' },
    { id: 'q3', text: 'Suddenly feeling or acting as if the stressful experience were actually happening again (as if you were actually back there reliving it)?' },
    { id: 'q4', text: 'Feeling very upset when something reminded you of the stressful experience?' },
    { id: 'q5', text: 'Having strong physical reactions when something reminded you of the stressful experience (for example, heart pounding, trouble breathing, sweating)?' },
    { id: 'q6', text: 'Avoiding memories, thoughts, or feelings related to the stressful experience?' },
    { id: 'q7', text: 'Avoiding external reminders of the stressful experience (for example, people, places, conversations, activities, objects, or situations)?' },
    { id: 'q8', text: 'Trouble remembering important parts of the stressful experience?' },
    { id: 'q9', text: 'Having strong negative beliefs about yourself, other people, or the world (for example, having thoughts such as: I am bad, there is something seriously wrong with me, no one can be trusted, the world is completely dangerous)?' },
    { id: 'q10', text: 'Blaming yourself or someone else for the stressful experience or what happened after it?' },
    { id: 'q11', text: 'Having strong negative feelings such as fear, horror, anger, guilt, or shame?' },
    { id: 'q12', text: 'Loss of interest in activities that you used to enjoy?' },
    { id: 'q13', text: 'Feeling distant or cut off from other people?' },
    { id: 'q14', text: 'Trouble experiencing positive feelings (for example, being unable to feel happiness or have loving feelings for people close to you)?' },
    { id: 'q15', text: 'Irritable behavior, angry outbursts, or acting aggressively?' },
    { id: 'q16', text: 'Taking too many risks or doing things that could cause you harm?' },
    { id: 'q17', text: 'Being "superalert" or watchful or on guard?' },
    { id: 'q18', text: 'Feeling jumpy or easily startled?' },
    { id: 'q19', text: 'Having difficulty concentrating?' },
    { id: 'q20', text: 'Trouble falling or staying asleep?' },
  ],
  scoringInfo: {
    minScore: 0,
    maxScore: 80,
    severityRanges: [
      { min: 0, max: 30, severity: 'MINIMAL', label: 'Minimal PTSD symptoms' },
      { min: 31, max: 40, severity: 'MILD', label: 'Mild PTSD symptoms' },
      { min: 41, max: 50, severity: 'MODERATE', label: 'Moderate PTSD symptoms' },
      { min: 51, max: 80, severity: 'SEVERE', label: 'Severe PTSD symptoms' },
    ],
  },
};

const QUESTIONNAIRE_DEFINITIONS = {
  PHQ9: PHQ9_DEFINITION,
  GAD7: GAD7_DEFINITION,
  PCL5: PCL5_DEFINITION,
};

// =============================================================================
// SCORING LOGIC
// =============================================================================

/**
 * Calculate total score from responses
 * PHQ-9 and GAD-7: Each question scored 0-3 (Not at all, Several days, More than half the days, Nearly every day)
 * PCL-5: Each question scored 0-4 (Not at all, A little bit, Moderately, Quite a bit, Extremely)
 */
function calculateScore(responses: Record<string, number>, measureType: OutcomeMeasureType): number {
  const values = Object.values(responses);
  return values.reduce((sum, value) => sum + value, 0);
}

/**
 * Determine severity level based on total score
 */
function determineSeverity(
  score: number,
  measureType: OutcomeMeasureType
): { severity: OutcomeSeverity; label: string } {
  const definition = QUESTIONNAIRE_DEFINITIONS[measureType];
  const range = definition.scoringInfo.severityRanges.find(
    (r) => score >= r.min && score <= r.max
  );

  if (!range) {
    throw new Error(`Invalid score ${score} for ${measureType}`);
  }

  return { severity: range.severity, label: range.label };
}

// =============================================================================
// SERVICE METHODS
// =============================================================================

export const outcomeMeasureService = {
  /**
   * Get questionnaire definition
   */
  getQuestionnaireDefinition(measureType: OutcomeMeasureType): QuestionnaireDefinition {
    const definition = QUESTIONNAIRE_DEFINITIONS[measureType];
    if (!definition) {
      throw new Error(`Unknown outcome measure type: ${measureType}`);
    }
    return definition;
  },

  /**
   * Administer an outcome measure
   */
  async administerOutcomeMeasure(data: {
    clientId: string;
    measureType: OutcomeMeasureType;
    responses: Record<string, number>;
    administeredById: string;
    clinicalNoteId?: string;
    appointmentId?: string;
    clinicalNotes?: string;
    completionTime?: number;
  }) {
    // Validate responses
    const definition = QUESTIONNAIRE_DEFINITIONS[data.measureType];
    const expectedQuestions = definition.questions.length;
    const providedQuestions = Object.keys(data.responses).length;

    if (providedQuestions !== expectedQuestions) {
      throw new Error(
        `Invalid responses: expected ${expectedQuestions} questions, got ${providedQuestions}`
      );
    }

    // Calculate score and severity
    const totalScore = calculateScore(data.responses, data.measureType);
    const { severity, label: severityLabel } = determineSeverity(totalScore, data.measureType);

    // Create outcome measure record
    const outcomeMeasure = await prisma.outcomeMeasure.create({
      data: {
        clientId: data.clientId,
        measureType: data.measureType,
        administeredById: data.administeredById,
        responses: data.responses,
        totalScore,
        severity,
        severityLabel,
        clinicalNoteId: data.clinicalNoteId,
        appointmentId: data.appointmentId,
        clinicalNotes: data.clinicalNotes,
        completionTime: data.completionTime,
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            medicalRecordNumber: true,
          },
        },
        administeredBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
        clinicalNote: {
          select: {
            id: true,
            noteType: true,
            sessionDate: true,
          },
        },
        appointment: {
          select: {
            id: true,
            appointmentDate: true,
            appointmentType: true,
          },
        },
      },
    });

    return outcomeMeasure;
  },

  /**
   * Get outcome measures for a client
   */
  async getClientOutcomeMeasures(
    clientId: string,
    filters?: {
      measureType?: OutcomeMeasureType;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ) {
    const where: any = { clientId };

    if (filters?.measureType) {
      where.measureType = filters.measureType;
    }

    if (filters?.startDate || filters?.endDate) {
      where.administeredDate = {};
      if (filters.startDate) {
        where.administeredDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.administeredDate.lte = filters.endDate;
      }
    }

    const outcomeMeasures = await prisma.outcomeMeasure.findMany({
      where,
      take: filters?.limit || 50,
      orderBy: { administeredDate: 'desc' },
      include: {
        administeredBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
        clinicalNote: {
          select: {
            id: true,
            noteType: true,
            sessionDate: true,
          },
        },
        appointment: {
          select: {
            id: true,
            appointmentDate: true,
            appointmentType: true,
          },
        },
      },
    });

    return outcomeMeasures;
  },

  /**
   * Get outcome measure by ID
   */
  async getOutcomeMeasureById(id: string) {
    const outcomeMeasure = await prisma.outcomeMeasure.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            medicalRecordNumber: true,
          },
        },
        administeredBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
          },
        },
        clinicalNote: {
          select: {
            id: true,
            noteType: true,
            sessionDate: true,
          },
        },
        appointment: {
          select: {
            id: true,
            appointmentDate: true,
            appointmentType: true,
          },
        },
      },
    });

    if (!outcomeMeasure) {
      throw new Error(`Outcome measure not found: ${id}`);
    }

    return outcomeMeasure;
  },

  /**
   * Get progress data for graphing
   * Returns time-series data for a specific outcome measure type
   */
  async getProgressData(
    clientId: string,
    measureType: OutcomeMeasureType,
    startDate?: Date,
    endDate?: Date
  ) {
    const where: any = {
      clientId,
      measureType,
    };

    if (startDate || endDate) {
      where.administeredDate = {};
      if (startDate) {
        where.administeredDate.gte = startDate;
      }
      if (endDate) {
        where.administeredDate.lte = endDate;
      }
    }

    const measures = await prisma.outcomeMeasure.findMany({
      where,
      orderBy: { administeredDate: 'asc' },
      select: {
        id: true,
        administeredDate: true,
        totalScore: true,
        severity: true,
        severityLabel: true,
      },
    });

    return {
      measureType,
      dataPoints: measures.map((m) => ({
        id: m.id,
        date: m.administeredDate,
        score: m.totalScore,
        severity: m.severity,
        severityLabel: m.severityLabel,
      })),
    };
  },

  /**
   * Get statistics for a client's outcome measures
   */
  async getClientStatistics(clientId: string) {
    const measures = await prisma.outcomeMeasure.findMany({
      where: { clientId },
      select: {
        measureType: true,
        totalScore: true,
        administeredDate: true,
      },
    });

    const statsByType: Record<string, any> = {};

    for (const measureType of ['PHQ9', 'GAD7', 'PCL5'] as OutcomeMeasureType[]) {
      const typeMeasures = measures.filter((m) => m.measureType === measureType);

      if (typeMeasures.length > 0) {
        const scores = typeMeasures.map((m) => m.totalScore);
        const latestMeasure = typeMeasures[typeMeasures.length - 1];
        const firstMeasure = typeMeasures[0];

        statsByType[measureType] = {
          totalAdministered: typeMeasures.length,
          latestScore: latestMeasure.totalScore,
          latestDate: latestMeasure.administeredDate,
          firstScore: firstMeasure.totalScore,
          firstDate: firstMeasure.administeredDate,
          averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
          minScore: Math.min(...scores),
          maxScore: Math.max(...scores),
          trend: latestMeasure.totalScore - firstMeasure.totalScore, // Negative = improvement
        };
      }
    }

    return {
      clientId,
      statistics: statsByType,
    };
  },

  /**
   * Update outcome measure clinical notes
   */
  async updateClinicalNotes(id: string, clinicalNotes: string) {
    const updated = await prisma.outcomeMeasure.update({
      where: { id },
      data: { clinicalNotes },
    });

    return updated;
  },

  /**
   * Link outcome measure to clinical note
   */
  async linkToClinicalNote(id: string, clinicalNoteId: string) {
    const updated = await prisma.outcomeMeasure.update({
      where: { id },
      data: { clinicalNoteId },
    });

    return updated;
  },

  /**
   * Delete outcome measure
   */
  async deleteOutcomeMeasure(id: string) {
    await prisma.outcomeMeasure.delete({
      where: { id },
    });

    return { success: true };
  },
};
