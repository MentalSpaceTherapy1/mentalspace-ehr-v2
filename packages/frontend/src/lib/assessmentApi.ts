import api from './api';

/**
 * Assessment API Service
 * EHR-side APIs for clinicians to manage client assessments
 */

export type AssessmentType = 'PHQ9' | 'GAD7' | 'PCL5' | 'BAI' | 'BDI' | 'PSS' | 'AUDIT' | 'DAST' | 'Custom';
export type AssessmentStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface AssessmentAssignment {
  id: string;
  clientId: string;
  assessmentType: AssessmentType;
  assessmentName: string;
  description?: string;
  assignedBy: string;
  assignedAt: string;
  dueDate?: string;
  completedAt?: string;
  status: AssessmentStatus;
  score?: number;
  interpretation?: string;
  responses?: any;
  instructions?: string;
}

export interface AssignAssessmentRequest {
  assessmentType: AssessmentType;
  assessmentName: string;
  description?: string;
  dueDate?: string;
  instructions?: string;
}

export interface AssessmentHistoryItem {
  id: string;
  assessmentName: string;
  assessmentType: AssessmentType;
  assignedAt: string;
  completedAt?: string;
  score?: number;
  interpretation?: string;
}

/**
 * Assessment type definitions with details
 */
export const ASSESSMENT_TYPES = {
  PHQ9: {
    name: 'PHQ-9 (Depression)',
    fullName: 'Patient Health Questionnaire-9',
    description: 'Assesses depression severity',
    questions: 9,
    scoringRange: '0-27',
    purpose: 'Screen for depression and monitor treatment progress',
  },
  GAD7: {
    name: 'GAD-7 (Anxiety)',
    fullName: 'Generalized Anxiety Disorder-7',
    description: 'Assesses anxiety severity',
    questions: 7,
    scoringRange: '0-21',
    purpose: 'Screen for generalized anxiety disorder',
  },
  PCL5: {
    name: 'PCL-5 (PTSD)',
    fullName: 'PTSD Checklist for DSM-5',
    description: 'Assesses PTSD symptoms',
    questions: 20,
    scoringRange: '0-80',
    purpose: 'Screen for and monitor PTSD symptoms',
  },
  BAI: {
    name: 'BAI (Beck Anxiety)',
    fullName: 'Beck Anxiety Inventory',
    description: 'Measures anxiety symptom severity',
    questions: 21,
    scoringRange: '0-63',
    purpose: 'Measure severity of anxiety symptoms',
  },
  BDI: {
    name: 'BDI-II (Beck Depression)',
    fullName: 'Beck Depression Inventory-II',
    description: 'Measures depression severity',
    questions: 21,
    scoringRange: '0-63',
    purpose: 'Assess depression severity and track changes',
  },
  PSS: {
    name: 'PSS (Perceived Stress)',
    fullName: 'Perceived Stress Scale',
    description: 'Measures perceived stress',
    questions: 10,
    scoringRange: '0-40',
    purpose: 'Measure perception of stress',
  },
  AUDIT: {
    name: 'AUDIT (Alcohol Use)',
    fullName: 'Alcohol Use Disorders Identification Test',
    description: 'Screens for alcohol use disorders',
    questions: 10,
    scoringRange: '0-40',
    purpose: 'Identify hazardous and harmful alcohol consumption',
  },
  DAST: {
    name: 'DAST-10 (Drug Abuse)',
    fullName: 'Drug Abuse Screening Test',
    description: 'Screens for drug use disorders',
    questions: 10,
    scoringRange: '0-10',
    purpose: 'Screen for drug abuse and dependence',
  },
} as const;

/**
 * Get all assessments for a specific client
 */
export const getClientAssessments = async (
  clientId: string,
  status?: AssessmentStatus
): Promise<AssessmentAssignment[]> => {
  const params = status ? { status } : {};
  const response = await api.get(`/api/v1/clients/${clientId}/assessments`, { params });
  return response.data.data;
};

/**
 * Assign an assessment to a client
 */
export const assignAssessmentToClient = async (
  clientId: string,
  data: AssignAssessmentRequest
): Promise<AssessmentAssignment> => {
  const response = await api.post(`/api/v1/clients/${clientId}/assessments/assign`, data);
  return response.data.data;
};

/**
 * Remove an assessment assignment
 */
export const removeAssessmentAssignment = async (
  clientId: string,
  assessmentId: string
): Promise<void> => {
  await api.delete(`/api/v1/clients/${clientId}/assessments/${assessmentId}`);
};

/**
 * Send a reminder for a pending assessment
 */
export const sendAssessmentReminder = async (
  clientId: string,
  assessmentId: string
): Promise<void> => {
  await api.post(`/api/v1/clients/${clientId}/assessments/${assessmentId}/remind`);
};

/**
 * View assessment results
 */
export const viewAssessmentResults = async (
  clientId: string,
  assessmentId: string
): Promise<AssessmentAssignment> => {
  const response = await api.get(`/api/v1/clients/${clientId}/assessments/${assessmentId}/results`);
  return response.data.data;
};

/**
 * Get assessment history for a client
 */
export const getAssessmentHistory = async (
  clientId: string,
  assessmentType?: AssessmentType
): Promise<AssessmentHistoryItem[]> => {
  const params = assessmentType ? { assessmentType } : {};
  const response = await api.get(`/api/v1/clients/${clientId}/assessments/history`, { params });
  return response.data.data;
};

/**
 * Export assessment results as PDF
 */
export const exportAssessmentPDF = async (
  clientId: string,
  assessmentId: string
): Promise<Blob> => {
  const response = await api.get(
    `/api/v1/clients/${clientId}/assessments/${assessmentId}/export`,
    {
      responseType: 'blob',
    }
  );
  return response.data;
};

/**
 * Helper function to get assessment info by type
 */
export const getAssessmentInfo = (type: AssessmentType) => {
  return ASSESSMENT_TYPES[type] || null;
};

/**
 * Helper function to interpret assessment scores
 */
export const interpretScore = (type: AssessmentType, score: number): string => {
  switch (type) {
    case 'PHQ9':
      if (score <= 4) return 'Minimal depression';
      if (score <= 9) return 'Mild depression';
      if (score <= 14) return 'Moderate depression';
      if (score <= 19) return 'Moderately severe depression';
      return 'Severe depression';

    case 'GAD7':
      if (score <= 4) return 'Minimal anxiety';
      if (score <= 9) return 'Mild anxiety';
      if (score <= 14) return 'Moderate anxiety';
      return 'Severe anxiety';

    case 'PCL5':
      if (score < 33) return 'Below PTSD threshold';
      return 'Probable PTSD';

    case 'BAI':
      if (score <= 7) return 'Minimal anxiety';
      if (score <= 15) return 'Mild anxiety';
      if (score <= 25) return 'Moderate anxiety';
      return 'Severe anxiety';

    case 'BDI':
      if (score <= 13) return 'Minimal depression';
      if (score <= 19) return 'Mild depression';
      if (score <= 28) return 'Moderate depression';
      return 'Severe depression';

    case 'PSS':
      if (score <= 13) return 'Low stress';
      if (score <= 26) return 'Moderate stress';
      return 'High stress';

    case 'AUDIT':
      if (score <= 7) return 'Low risk';
      if (score <= 15) return 'Hazardous drinking';
      if (score <= 19) return 'Harmful drinking';
      return 'Possible dependence';

    case 'DAST':
      if (score === 0) return 'No problems reported';
      if (score <= 2) return 'Low level';
      if (score <= 5) return 'Moderate level';
      if (score <= 8) return 'Substantial level';
      return 'Severe level';

    default:
      return 'N/A';
  }
};

/**
 * Get severity color class for assessment score
 */
export const getSeverityColor = (type: AssessmentType, score: number): string => {
  const interpretation = interpretScore(type, score);

  if (interpretation.includes('Minimal') || interpretation.includes('Low') || interpretation.includes('No problems')) {
    return 'text-green-600';
  }
  if (interpretation.includes('Mild') || interpretation.includes('Moderate') || interpretation.includes('Below')) {
    return 'text-yellow-600';
  }
  if (interpretation.includes('Moderately severe') || interpretation.includes('Substantial') || interpretation.includes('Hazardous')) {
    return 'text-orange-600';
  }
  return 'text-red-600';
};
