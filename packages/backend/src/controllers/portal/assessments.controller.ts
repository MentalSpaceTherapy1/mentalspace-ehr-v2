import { Response } from 'express';

import logger from '../../utils/logger';
import prisma from '../../services/database';
import { PortalRequest } from '../../types/express.d';
import { sendSuccess, sendBadRequest, sendUnauthorized, sendNotFound, sendServerError } from '../../utils/apiResponse';

/**
 * Get pending assessments for client
 * GET /api/v1/portal/assessments/pending
 */
export const getPendingAssessments = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    const assessments = await prisma.assessmentAssignment.findMany({
      where: {
        clientId,
        status: {
          in: ['PENDING', 'IN_PROGRESS'],
        },
      },
      orderBy: [
        { dueDate: 'asc' },
        { assignedAt: 'desc' },
      ],
    });

    logger.info(`Retrieved ${assessments.length} pending assessments for client ${clientId}`);

    return sendSuccess(res, assessments);
  } catch (error) {
    logger.error('Error fetching pending assessments:', error);
    return sendServerError(res, 'Failed to fetch pending assessments');
  }
};

/**
 * Get completed assessments for client
 * GET /api/v1/portal/assessments/completed
 */
export const getCompletedAssessments = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    const assessments = await prisma.assessmentAssignment.findMany({
      where: {
        clientId,
        status: 'COMPLETED',
      },
      orderBy: { completedAt: 'desc' },
    });

    logger.info(`Retrieved ${assessments.length} completed assessments for client ${clientId}`);

    return sendSuccess(res, assessments);
  } catch (error) {
    logger.error('Error fetching completed assessments:', error);
    return sendServerError(res, 'Failed to fetch completed assessments');
  }
};

/**
 * Get assessment details for taking
 * GET /api/v1/portal/assessments/:assessmentId
 */
export const getAssessmentDetails = async (req: PortalRequest, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    const assessment = await prisma.assessmentAssignment.findFirst({
      where: {
        id: assessmentId,
        clientId,
      },
    });

    if (!assessment) {
      return sendNotFound(res, 'Assessment');
    }

    // Get assessment questions based on type
    const questions = getAssessmentQuestions(assessment.assessmentType);

    logger.info(`Client ${clientId} accessed assessment ${assessmentId}`);

    return sendSuccess(res, { assessment, questions });
  } catch (error) {
    logger.error('Error fetching assessment details:', error);
    return sendServerError(res, 'Failed to fetch assessment details');
  }
};

/**
 * Start an assessment (mark as IN_PROGRESS)
 * POST /api/v1/portal/assessments/:assessmentId/start
 */
export const startAssessment = async (req: PortalRequest, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    const assessment = await prisma.assessmentAssignment.findFirst({
      where: {
        id: assessmentId,
        clientId,
        status: 'PENDING',
      },
    });

    if (!assessment) {
      return sendNotFound(res, 'Assessment');
    }

    const updated = await prisma.assessmentAssignment.update({
      where: { id: assessmentId },
      data: { status: 'IN_PROGRESS' },
    });

    logger.info(`Client ${clientId} started assessment ${assessmentId}`);

    return sendSuccess(res, updated, 'Assessment started');
  } catch (error) {
    logger.error('Error starting assessment:', error);
    return sendServerError(res, 'Failed to start assessment');
  }
};

/**
 * Submit completed assessment
 * POST /api/v1/portal/assessments/:assessmentId/submit
 */
export const submitAssessment = async (req: PortalRequest, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const { responses } = req.body;
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    const assessment = await prisma.assessmentAssignment.findFirst({
      where: {
        id: assessmentId,
        clientId,
      },
    });

    if (!assessment) {
      return sendNotFound(res, 'Assessment');
    }

    if (assessment.status === 'COMPLETED') {
      return sendBadRequest(res, 'Assessment already completed');
    }

    // Calculate score based on assessment type
    const { score, interpretation } = calculateAssessmentScore(
      assessment.assessmentType,
      responses
    );

    // Update assessment with results
    const updated = await prisma.assessmentAssignment.update({
      where: { id: assessmentId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        score,
        interpretation,
        responses,
      },
    });

    logger.info(`Client ${clientId} submitted assessment ${assessmentId} with score ${score}`);

    return sendSuccess(res, updated, 'Assessment submitted successfully');
  } catch (error) {
    logger.error('Error submitting assessment:', error);
    return sendServerError(res, 'Failed to submit assessment');
  }
};

/**
 * Get assessment results
 * GET /api/v1/portal/assessments/:assessmentId/results
 */
export const getAssessmentResults = async (req: PortalRequest, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    const assessment = await prisma.assessmentAssignment.findFirst({
      where: {
        id: assessmentId,
        clientId,
        status: 'COMPLETED',
      },
    });

    if (!assessment) {
      return sendNotFound(res, 'Assessment results');
    }

    logger.info(`Client ${clientId} viewed results for assessment ${assessmentId}`);

    return sendSuccess(res, assessment);
  } catch (error) {
    logger.error('Error fetching assessment results:', error);
    return sendServerError(res, 'Failed to fetch assessment results');
  }
};

/**
 * Get assessment history/trends
 * GET /api/v1/portal/assessments/history
 */
export const getAssessmentHistory = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const { assessmentType } = req.query;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    const where: any = {
      clientId,
      status: 'COMPLETED',
    };

    if (assessmentType) {
      where.assessmentType = assessmentType;
    }

    const history = await prisma.assessmentAssignment.findMany({
      where,
      orderBy: { completedAt: 'desc' },
      select: {
        id: true,
        assessmentName: true,
        assessmentType: true,
        completedAt: true,
        score: true,
        interpretation: true,
      },
    });

    logger.info(`Retrieved assessment history for client ${clientId}`);

    return sendSuccess(res, history);
  } catch (error) {
    logger.error('Error fetching assessment history:', error);
    return sendServerError(res, 'Failed to fetch assessment history');
  }
};

// ============ Helper Functions ============

/**
 * Get assessment questions based on type
 */
function getAssessmentQuestions(assessmentType: string) {
  const questions: Record<string, any> = {
    PHQ9: [
      { id: 1, text: 'Little interest or pleasure in doing things', options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'] },
      { id: 2, text: 'Feeling down, depressed, or hopeless', options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'] },
      { id: 3, text: 'Trouble falling or staying asleep, or sleeping too much', options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'] },
      { id: 4, text: 'Feeling tired or having little energy', options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'] },
      { id: 5, text: 'Poor appetite or overeating', options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'] },
      { id: 6, text: 'Feeling bad about yourself or that you are a failure', options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'] },
      { id: 7, text: 'Trouble concentrating on things', options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'] },
      { id: 8, text: 'Moving or speaking slowly or being fidgety', options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'] },
      { id: 9, text: 'Thoughts of being better off dead or self-harm', options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'] },
    ],
    GAD7: [
      { id: 1, text: 'Feeling nervous, anxious, or on edge', options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'] },
      { id: 2, text: 'Not being able to stop or control worrying', options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'] },
      { id: 3, text: 'Worrying too much about different things', options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'] },
      { id: 4, text: 'Trouble relaxing', options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'] },
      { id: 5, text: 'Being so restless that it is hard to sit still', options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'] },
      { id: 6, text: 'Becoming easily annoyed or irritable', options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'] },
      { id: 7, text: 'Feeling afraid, as if something awful might happen', options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'] },
    ],
    PCL5: [
      { id: 1, text: 'Repeated, disturbing, and unwanted memories of the stressful experience?', options: ['Not at all', 'A little bit', 'Moderately', 'Quite a bit', 'Extremely'] },
      { id: 2, text: 'Repeated, disturbing dreams of the stressful experience?', options: ['Not at all', 'A little bit', 'Moderately', 'Quite a bit', 'Extremely'] },
      { id: 3, text: 'Suddenly feeling or acting as if the stressful experience were actually happening again (as if you were actually back there reliving it)?', options: ['Not at all', 'A little bit', 'Moderately', 'Quite a bit', 'Extremely'] },
      { id: 4, text: 'Feeling very upset when something reminded you of the stressful experience?', options: ['Not at all', 'A little bit', 'Moderately', 'Quite a bit', 'Extremely'] },
      { id: 5, text: 'Having strong physical reactions when something reminded you of the stressful experience (for example, heart pounding, trouble breathing, sweating)?', options: ['Not at all', 'A little bit', 'Moderately', 'Quite a bit', 'Extremely'] },
      { id: 6, text: 'Avoiding memories, thoughts, or feelings related to the stressful experience?', options: ['Not at all', 'A little bit', 'Moderately', 'Quite a bit', 'Extremely'] },
      { id: 7, text: 'Avoiding external reminders of the stressful experience (for example, people, places, conversations, activities, objects, or situations)?', options: ['Not at all', 'A little bit', 'Moderately', 'Quite a bit', 'Extremely'] },
      { id: 8, text: 'Trouble remembering important parts of the stressful experience?', options: ['Not at all', 'A little bit', 'Moderately', 'Quite a bit', 'Extremely'] },
      { id: 9, text: 'Having strong negative beliefs about yourself, other people, or the world (for example, having thoughts such as: I am bad, there is something seriously wrong with me, no one can be trusted, the world is completely dangerous)?', options: ['Not at all', 'A little bit', 'Moderately', 'Quite a bit', 'Extremely'] },
      { id: 10, text: 'Blaming yourself or someone else for the stressful experience or what happened after it?', options: ['Not at all', 'A little bit', 'Moderately', 'Quite a bit', 'Extremely'] },
      { id: 11, text: 'Having strong negative feelings such as fear, horror, anger, guilt, or shame?', options: ['Not at all', 'A little bit', 'Moderately', 'Quite a bit', 'Extremely'] },
      { id: 12, text: 'Loss of interest in activities that you used to enjoy?', options: ['Not at all', 'A little bit', 'Moderately', 'Quite a bit', 'Extremely'] },
      { id: 13, text: 'Feeling distant or cut off from other people?', options: ['Not at all', 'A little bit', 'Moderately', 'Quite a bit', 'Extremely'] },
      { id: 14, text: 'Trouble experiencing positive feelings (for example, being unable to feel happiness or have loving feelings for people close to you)?', options: ['Not at all', 'A little bit', 'Moderately', 'Quite a bit', 'Extremely'] },
      { id: 15, text: 'Irritable behavior, angry outbursts, or acting aggressively?', options: ['Not at all', 'A little bit', 'Moderately', 'Quite a bit', 'Extremely'] },
      { id: 16, text: 'Taking too many risks or doing things that could cause you harm?', options: ['Not at all', 'A little bit', 'Moderately', 'Quite a bit', 'Extremely'] },
      { id: 17, text: 'Being "superalert" or watchful or on guard?', options: ['Not at all', 'A little bit', 'Moderately', 'Quite a bit', 'Extremely'] },
      { id: 18, text: 'Feeling jumpy or easily startled?', options: ['Not at all', 'A little bit', 'Moderately', 'Quite a bit', 'Extremely'] },
      { id: 19, text: 'Having difficulty concentrating?', options: ['Not at all', 'A little bit', 'Moderately', 'Quite a bit', 'Extremely'] },
      { id: 20, text: 'Trouble falling or staying asleep?', options: ['Not at all', 'A little bit', 'Moderately', 'Quite a bit', 'Extremely'] },
    ],
    PSS: [
      { id: 1, text: 'In the last month, how often have you been upset because of something that happened unexpectedly?', options: ['Never', 'Almost never', 'Sometimes', 'Fairly often', 'Very often'] },
      { id: 2, text: 'In the last month, how often have you felt that you were unable to control the important things in your life?', options: ['Never', 'Almost never', 'Sometimes', 'Fairly often', 'Very often'] },
      { id: 3, text: 'In the last month, how often have you felt nervous and stressed?', options: ['Never', 'Almost never', 'Sometimes', 'Fairly often', 'Very often'] },
      { id: 4, text: 'In the last month, how often have you felt confident about your ability to handle your personal problems?', options: ['Never', 'Almost never', 'Sometimes', 'Fairly often', 'Very often'] },
      { id: 5, text: 'In the last month, how often have you felt that things were going your way?', options: ['Never', 'Almost never', 'Sometimes', 'Fairly often', 'Very often'] },
      { id: 6, text: 'In the last month, how often have you found that you could not cope with all the things that you had to do?', options: ['Never', 'Almost never', 'Sometimes', 'Fairly often', 'Very often'] },
      { id: 7, text: 'In the last month, how often have you been able to control irritations in your life?', options: ['Never', 'Almost never', 'Sometimes', 'Fairly often', 'Very often'] },
      { id: 8, text: 'In the last month, how often have you felt that you were on top of things?', options: ['Never', 'Almost never', 'Sometimes', 'Fairly often', 'Very often'] },
      { id: 9, text: 'In the last month, how often have you been angered because of things that happened that were outside of your control?', options: ['Never', 'Almost never', 'Sometimes', 'Fairly often', 'Very often'] },
      { id: 10, text: 'In the last month, how often have you felt difficulties were piling up so high that you could not overcome them?', options: ['Never', 'Almost never', 'Sometimes', 'Fairly often', 'Very often'] },
    ],
    AUDIT: [
      { id: 1, text: 'How often do you have a drink containing alcohol?', options: ['Never', 'Monthly or less', '2-4 times a month', '2-3 times a week', '4 or more times a week'] },
      { id: 2, text: 'How many standard drinks containing alcohol do you have on a typical day when drinking?', options: ['1 or 2', '3 or 4', '5 or 6', '7 to 9', '10 or more'] },
      { id: 3, text: 'How often do you have six or more drinks on one occasion?', options: ['Never', 'Less than monthly', 'Monthly', 'Weekly', 'Daily or almost daily'] },
      { id: 4, text: 'During the past year, how often have you found that you were not able to stop drinking once you had started?', options: ['Never', 'Less than monthly', 'Monthly', 'Weekly', 'Daily or almost daily'] },
      { id: 5, text: 'During the past year, how often have you failed to do what was normally expected of you because of drinking?', options: ['Never', 'Less than monthly', 'Monthly', 'Weekly', 'Daily or almost daily'] },
      { id: 6, text: 'During the past year, how often have you needed a drink in the morning to get yourself going after a heavy drinking session?', options: ['Never', 'Less than monthly', 'Monthly', 'Weekly', 'Daily or almost daily'] },
      { id: 7, text: 'During the past year, how often have you had a feeling of guilt or remorse after drinking?', options: ['Never', 'Less than monthly', 'Monthly', 'Weekly', 'Daily or almost daily'] },
      { id: 8, text: 'During the past year, how often have you been unable to remember what happened the night before because of your drinking?', options: ['Never', 'Less than monthly', 'Monthly', 'Weekly', 'Daily or almost daily'] },
      { id: 9, text: 'Have you or someone else been injured because of your drinking?', options: ['No', '', 'Yes, but not in the past year', '', 'Yes, during the past year'] },
      { id: 10, text: 'Has a relative, friend, doctor, or other health care worker been concerned about your drinking or suggested you cut down?', options: ['No', '', 'Yes, but not in the past year', '', 'Yes, during the past year'] },
    ],
    DAST10: [
      { id: 1, text: 'Have you used drugs other than those required for medical reasons?', options: ['No', 'Yes'] },
      { id: 2, text: 'Do you abuse more than one drug at a time?', options: ['No', 'Yes'] },
      { id: 3, text: 'Are you always able to stop using drugs when you want to?', options: ['No', 'Yes'] },
      { id: 4, text: 'Have you had "blackouts" or "flashbacks" as a result of drug use?', options: ['No', 'Yes'] },
      { id: 5, text: 'Do you ever feel bad or guilty about your drug use?', options: ['No', 'Yes'] },
      { id: 6, text: 'Does your spouse (or parents) ever complain about your involvement with drugs?', options: ['No', 'Yes'] },
      { id: 7, text: 'Have you neglected your family because of your use of drugs?', options: ['No', 'Yes'] },
      { id: 8, text: 'Have you engaged in illegal activities in order to obtain drugs?', options: ['No', 'Yes'] },
      { id: 9, text: 'Have you ever experienced withdrawal symptoms (felt sick) when you stopped taking drugs?', options: ['No', 'Yes'] },
      { id: 10, text: 'Have you had medical problems as a result of your drug use (e.g., memory loss, hepatitis, convulsions, bleeding, etc.)?', options: ['No', 'Yes'] },
    ],
  };

  return questions[assessmentType] || [];
}

/**
 * Calculate assessment score and interpretation
 */
function calculateAssessmentScore(assessmentType: string, responses: any) {
  // Sum up all response values
  let score = 0;
  const values = Object.values(responses) as number[];

  if (assessmentType === 'PSS') {
    // PSS has reverse-scored items (4, 5, 7, 8)
    // Reverse scoring: 0=4, 1=3, 2=2, 3=1, 4=0
    Object.keys(responses).forEach((key) => {
      const questionId = parseInt(key);
      const value = responses[key] as number;

      if ([4, 5, 7, 8].includes(questionId)) {
        // Reverse score these items
        score += 4 - value;
      } else {
        score += value;
      }
    });
  } else if (assessmentType === 'DAST10') {
    // DAST-10: No=0, Yes=1, except question 3 which is reverse scored
    Object.keys(responses).forEach((key) => {
      const questionId = parseInt(key);
      const value = responses[key] as number;

      if (questionId === 3) {
        // Reverse scored: No=1, Yes=0
        score += value === 0 ? 1 : 0;
      } else {
        score += value;
      }
    });
  } else {
    // Standard scoring: sum all values
    values.forEach((value) => {
      score += value;
    });
  }

  let interpretation = '';

  // Interpretation based on assessment type
  switch (assessmentType) {
    case 'PHQ9':
      if (score <= 4) {
        interpretation = 'Minimal depression';
      } else if (score <= 9) {
        interpretation = 'Mild depression';
      } else if (score <= 14) {
        interpretation = 'Moderate depression';
      } else if (score <= 19) {
        interpretation = 'Moderately severe depression';
      } else {
        interpretation = 'Severe depression';
      }
      break;

    case 'GAD7':
      if (score <= 4) {
        interpretation = 'Minimal anxiety';
      } else if (score <= 9) {
        interpretation = 'Mild anxiety';
      } else if (score <= 14) {
        interpretation = 'Moderate anxiety';
      } else {
        interpretation = 'Severe anxiety';
      }
      break;

    case 'PCL5':
      // PCL-5: 0-80 scale
      if (score < 31) {
        interpretation = 'PTSD unlikely';
      } else if (score <= 32) {
        interpretation = 'PTSD possible - clinical interview recommended';
      } else {
        interpretation = 'PTSD probable - clinical assessment recommended';
      }
      break;

    case 'PSS':
      // Perceived Stress Scale: 0-40 scale
      if (score <= 13) {
        interpretation = 'Low stress';
      } else if (score <= 26) {
        interpretation = 'Moderate stress';
      } else {
        interpretation = 'High perceived stress';
      }
      break;

    case 'AUDIT':
      // Alcohol Use Disorders Identification Test: 0-40 scale
      if (score <= 7) {
        interpretation = 'Low risk';
      } else if (score <= 15) {
        interpretation = 'Hazardous or harmful alcohol use';
      } else if (score <= 19) {
        interpretation = 'Harmful alcohol use - brief counseling recommended';
      } else {
        interpretation = 'Possible alcohol dependence - further diagnostic evaluation recommended';
      }
      break;

    case 'DAST10':
      // Drug Abuse Screening Test: 0-10 scale
      if (score === 0) {
        interpretation = 'No problems reported';
      } else if (score <= 2) {
        interpretation = 'Low level - monitor, reassess at later date';
      } else if (score <= 5) {
        interpretation = 'Moderate level - further investigation recommended';
      } else if (score <= 8) {
        interpretation = 'Substantial level - intensive assessment recommended';
      } else {
        interpretation = 'Severe level - intensive assessment highly recommended';
      }
      break;

    default:
      interpretation = `Score: ${score}`;
  }

  return { score, interpretation };
}
