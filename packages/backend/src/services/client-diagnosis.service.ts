/**
 * Client Diagnosis Service
 *
 * Module 2: Client Management - Diagnosis Management
 * Handles CRUD operations for client diagnoses with automatic PRIMARY demotion logic
 * and ICD-10 code search functionality
 */

import prisma from './database';
import { BadRequestError, NotFoundError } from '../utils/errors';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CreateClientDiagnosisDto {
  clientId: string;
  diagnosisType: 'PRIMARY' | 'SECONDARY' | 'RULE_OUT' | 'HISTORICAL' | 'PROVISIONAL';
  icd10Code?: string;
  dsm5Code?: string;
  diagnosisName: string;
  diagnosisCategory?: string;
  severitySpecifier?: 'MILD' | 'MODERATE' | 'SEVERE' | 'EXTREME';
  courseSpecifier?: string;
  onsetDate?: Date;
  supportingEvidence?: string;
  differentialConsiderations?: string;
  diagnosedById: string;
}

export interface UpdateClientDiagnosisDto {
  diagnosisType?: 'PRIMARY' | 'SECONDARY' | 'RULE_OUT' | 'HISTORICAL' | 'PROVISIONAL';
  icd10Code?: string;
  dsm5Code?: string;
  diagnosisName?: string;
  diagnosisCategory?: string;
  severitySpecifier?: 'MILD' | 'MODERATE' | 'SEVERE' | 'EXTREME';
  courseSpecifier?: string;
  onsetDate?: Date;
  remissionDate?: Date;
  status?: 'ACTIVE' | 'RESOLVED' | 'RULE_OUT_REJECTED';
  dateResolved?: Date;
  resolutionNotes?: string;
  supportingEvidence?: string;
  differentialConsiderations?: string;
  lastReviewedById?: string;
  lastReviewedDate?: Date;
}

export interface ICD10SearchResult {
  code: string;
  description: string;
  category: string;
}

// ============================================================================
// ICD-10 MOCK DATA (for development)
// ============================================================================

const MOCK_ICD10_CODES: ICD10SearchResult[] = [
  // Mood Disorders
  { code: 'F32.9', description: 'Major depressive disorder, single episode, unspecified', category: 'Mood Disorders' },
  { code: 'F32.0', description: 'Major depressive disorder, single episode, mild', category: 'Mood Disorders' },
  { code: 'F32.1', description: 'Major depressive disorder, single episode, moderate', category: 'Mood Disorders' },
  { code: 'F32.2', description: 'Major depressive disorder, single episode, severe without psychotic features', category: 'Mood Disorders' },
  { code: 'F32.3', description: 'Major depressive disorder, single episode, severe with psychotic features', category: 'Mood Disorders' },
  { code: 'F33.0', description: 'Major depressive disorder, recurrent, mild', category: 'Mood Disorders' },
  { code: 'F33.1', description: 'Major depressive disorder, recurrent, moderate', category: 'Mood Disorders' },
  { code: 'F33.2', description: 'Major depressive disorder, recurrent severe without psychotic features', category: 'Mood Disorders' },
  { code: 'F33.3', description: 'Major depressive disorder, recurrent, severe with psychotic features', category: 'Mood Disorders' },
  { code: 'F33.41', description: 'Major depressive disorder, recurrent, in partial remission', category: 'Mood Disorders' },
  { code: 'F33.42', description: 'Major depressive disorder, recurrent, in full remission', category: 'Mood Disorders' },
  { code: 'F34.1', description: 'Persistent depressive disorder (dysthymia)', category: 'Mood Disorders' },
  { code: 'F31.9', description: 'Bipolar disorder, unspecified', category: 'Mood Disorders' },
  { code: 'F31.10', description: 'Bipolar disorder, current episode manic without psychotic features, unspecified', category: 'Mood Disorders' },
  { code: 'F31.30', description: 'Bipolar disorder, current episode depressed, mild or moderate severity, unspecified', category: 'Mood Disorders' },

  // Anxiety Disorders
  { code: 'F41.1', description: 'Generalized anxiety disorder', category: 'Anxiety Disorders' },
  { code: 'F41.0', description: 'Panic disorder without agoraphobia', category: 'Anxiety Disorders' },
  { code: 'F40.00', description: 'Agoraphobia, unspecified', category: 'Anxiety Disorders' },
  { code: 'F40.10', description: 'Social anxiety disorder (social phobia), unspecified', category: 'Anxiety Disorders' },
  { code: 'F40.218', description: 'Other animal type phobia', category: 'Anxiety Disorders' },
  { code: 'F40.228', description: 'Other natural environment type phobia', category: 'Anxiety Disorders' },
  { code: 'F40.248', description: 'Other situational type phobia', category: 'Anxiety Disorders' },
  { code: 'F41.8', description: 'Other specified anxiety disorders', category: 'Anxiety Disorders' },
  { code: 'F41.9', description: 'Anxiety disorder, unspecified', category: 'Anxiety Disorders' },

  // Trauma and Stressor-Related Disorders
  { code: 'F43.10', description: 'Post-traumatic stress disorder, unspecified', category: 'Trauma and Stressor-Related Disorders' },
  { code: 'F43.11', description: 'Post-traumatic stress disorder, acute', category: 'Trauma and Stressor-Related Disorders' },
  { code: 'F43.12', description: 'Post-traumatic stress disorder, chronic', category: 'Trauma and Stressor-Related Disorders' },
  { code: 'F43.0', description: 'Acute stress reaction', category: 'Trauma and Stressor-Related Disorders' },
  { code: 'F43.21', description: 'Adjustment disorder with depressed mood', category: 'Trauma and Stressor-Related Disorders' },
  { code: 'F43.22', description: 'Adjustment disorder with anxiety', category: 'Trauma and Stressor-Related Disorders' },
  { code: 'F43.23', description: 'Adjustment disorder with mixed anxiety and depressed mood', category: 'Trauma and Stressor-Related Disorders' },
  { code: 'F43.24', description: 'Adjustment disorder with disturbance of conduct', category: 'Trauma and Stressor-Related Disorders' },
  { code: 'F43.25', description: 'Adjustment disorder with mixed disturbance of emotions and conduct', category: 'Trauma and Stressor-Related Disorders' },

  // OCD and Related Disorders
  { code: 'F42.2', description: 'Obsessive-compulsive disorder', category: 'OCD and Related Disorders' },
  { code: 'F42.3', description: 'Hoarding disorder', category: 'OCD and Related Disorders' },
  { code: 'F42.4', description: 'Excoriation (skin-picking) disorder', category: 'OCD and Related Disorders' },
  { code: 'F63.3', description: 'Trichotillomania (hair-pulling disorder)', category: 'OCD and Related Disorders' },

  // Eating Disorders
  { code: 'F50.00', description: 'Anorexia nervosa, unspecified', category: 'Eating Disorders' },
  { code: 'F50.01', description: 'Anorexia nervosa, restricting type', category: 'Eating Disorders' },
  { code: 'F50.02', description: 'Anorexia nervosa, binge eating/purging type', category: 'Eating Disorders' },
  { code: 'F50.2', description: 'Bulimia nervosa', category: 'Eating Disorders' },
  { code: 'F50.81', description: 'Binge-eating disorder', category: 'Eating Disorders' },
  { code: 'F50.82', description: 'Avoidant/restrictive food intake disorder', category: 'Eating Disorders' },

  // Substance Use Disorders
  { code: 'F10.10', description: 'Alcohol use disorder, mild', category: 'Substance Use Disorders' },
  { code: 'F10.20', description: 'Alcohol use disorder, moderate or severe', category: 'Substance Use Disorders' },
  { code: 'F11.10', description: 'Opioid use disorder, mild', category: 'Substance Use Disorders' },
  { code: 'F11.20', description: 'Opioid use disorder, moderate or severe', category: 'Substance Use Disorders' },
  { code: 'F12.10', description: 'Cannabis use disorder, mild', category: 'Substance Use Disorders' },
  { code: 'F12.20', description: 'Cannabis use disorder, moderate or severe', category: 'Substance Use Disorders' },
  { code: 'F14.10', description: 'Cocaine use disorder, mild', category: 'Substance Use Disorders' },
  { code: 'F14.20', description: 'Cocaine use disorder, moderate or severe', category: 'Substance Use Disorders' },

  // Personality Disorders
  { code: 'F60.3', description: 'Borderline personality disorder', category: 'Personality Disorders' },
  { code: 'F60.0', description: 'Paranoid personality disorder', category: 'Personality Disorders' },
  { code: 'F60.1', description: 'Schizoid personality disorder', category: 'Personality Disorders' },
  { code: 'F60.2', description: 'Antisocial personality disorder', category: 'Personality Disorders' },
  { code: 'F60.4', description: 'Histrionic personality disorder', category: 'Personality Disorders' },
  { code: 'F60.5', description: 'Obsessive-compulsive personality disorder', category: 'Personality Disorders' },
  { code: 'F60.6', description: 'Avoidant personality disorder', category: 'Personality Disorders' },
  { code: 'F60.7', description: 'Dependent personality disorder', category: 'Personality Disorders' },

  // ADHD and Neurodevelopmental Disorders
  { code: 'F90.0', description: 'Attention-deficit/hyperactivity disorder, predominantly inattentive type', category: 'Neurodevelopmental Disorders' },
  { code: 'F90.1', description: 'Attention-deficit/hyperactivity disorder, predominantly hyperactive type', category: 'Neurodevelopmental Disorders' },
  { code: 'F90.2', description: 'Attention-deficit/hyperactivity disorder, combined type', category: 'Neurodevelopmental Disorders' },
  { code: 'F90.9', description: 'Attention-deficit/hyperactivity disorder, unspecified type', category: 'Neurodevelopmental Disorders' },
  { code: 'F84.0', description: 'Autism spectrum disorder', category: 'Neurodevelopmental Disorders' },
];

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Add a new diagnosis for a client
 * Automatically demotes existing PRIMARY diagnosis to SECONDARY if a new PRIMARY is added
 */
export async function addDiagnosis(data: CreateClientDiagnosisDto) {
  // Verify client exists
  const client = await prisma.client.findUnique({
    where: { id: data.clientId },
    select: { id: true, firstName: true, lastName: true }
  });

  if (!client) {
    throw new NotFoundError('Client not found');
  }

  // Verify diagnosing user exists
  const diagnosingUser = await prisma.user.findUnique({
    where: { id: data.diagnosedById },
    select: { id: true }
  });

  if (!diagnosingUser) {
    throw new NotFoundError('Diagnosing provider not found');
  }

  // If adding a PRIMARY diagnosis, demote existing PRIMARY to SECONDARY
  if (data.diagnosisType === 'PRIMARY') {
    await prisma.clientDiagnosis.updateMany({
      where: {
        clientId: data.clientId,
        diagnosisType: 'PRIMARY',
        status: 'ACTIVE'
      },
      data: {
        diagnosisType: 'SECONDARY'
      }
    });
  }

  // Create the new diagnosis
  const diagnosis = await prisma.clientDiagnosis.create({
    data: {
      clientId: data.clientId,
      diagnosisType: data.diagnosisType,
      icd10Code: data.icd10Code,
      dsm5Code: data.dsm5Code,
      diagnosisName: data.diagnosisName,
      diagnosisCategory: data.diagnosisCategory,
      severitySpecifier: data.severitySpecifier,
      courseSpecifier: data.courseSpecifier,
      onsetDate: data.onsetDate,
      supportingEvidence: data.supportingEvidence,
      differentialConsiderations: data.differentialConsiderations,
      diagnosedById: data.diagnosedById,
      status: 'ACTIVE'
    },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          medicalRecordNumber: true
        }
      },
      diagnosedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true
        }
      }
    }
  });

  return diagnosis;
}

/**
 * Get all diagnoses for a specific client
 */
export async function getClientDiagnoses(
  clientId: string,
  options?: {
    activeOnly?: boolean;
    diagnosisType?: string;
  }
) {
  const where: Prisma.ClientDiagnosisWhereInput = { clientId };

  if (options?.activeOnly) {
    where.status = 'ACTIVE';
  }

  if (options?.diagnosisType) {
    where.diagnosisType = options.diagnosisType;
  }

  const diagnoses = await prisma.clientDiagnosis.findMany({
    where,
    include: {
      diagnosedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true
        }
      },
      lastReviewedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true
        }
      }
    },
    orderBy: [
      { diagnosisType: 'asc' }, // PRIMARY first, then SECONDARY, etc.
      { dateDiagnosed: 'desc' }
    ]
  });

  return diagnoses;
}

/**
 * Get a single diagnosis by ID
 */
export async function getDiagnosisById(diagnosisId: string) {
  const diagnosis = await prisma.clientDiagnosis.findUnique({
    where: { id: diagnosisId },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          medicalRecordNumber: true,
          dateOfBirth: true
        }
      },
      diagnosedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true
        }
      },
      lastReviewedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true
        }
      }
    }
  });

  if (!diagnosis) {
    throw new NotFoundError('Diagnosis not found');
  }

  return diagnosis;
}

/**
 * Update diagnosis status (e.g., mark as RESOLVED)
 */
export async function updateDiagnosisStatus(
  diagnosisId: string,
  status: 'ACTIVE' | 'RESOLVED' | 'RULE_OUT_REJECTED',
  options?: {
    dateResolved?: Date;
    resolutionNotes?: string;
    lastReviewedById?: string;
  }
) {
  const diagnosis = await getDiagnosisById(diagnosisId);

  const updateData: Prisma.ClientDiagnosisUpdateInput = {
    status,
    lastReviewedDate: new Date()
  };

  if (options?.dateResolved) {
    updateData.dateResolved = options.dateResolved;
  }

  if (options?.resolutionNotes) {
    updateData.resolutionNotes = options.resolutionNotes;
  }

  if (options?.lastReviewedById) {
    updateData.lastReviewedById = options.lastReviewedById;
  }

  const updated = await prisma.clientDiagnosis.update({
    where: { id: diagnosisId },
    data: updateData,
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          medicalRecordNumber: true
        }
      },
      diagnosedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true
        }
      },
      lastReviewedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true
        }
      }
    }
  });

  return updated;
}

/**
 * Update a diagnosis
 */
export async function updateDiagnosis(
  diagnosisId: string,
  data: UpdateClientDiagnosisDto
) {
  const existingDiagnosis = await getDiagnosisById(diagnosisId);

  // If changing to PRIMARY, demote other PRIMARY diagnoses
  if (data.diagnosisType === 'PRIMARY' && existingDiagnosis.diagnosisType !== 'PRIMARY') {
    await prisma.clientDiagnosis.updateMany({
      where: {
        clientId: existingDiagnosis.clientId,
        diagnosisType: 'PRIMARY',
        status: 'ACTIVE',
        id: { not: diagnosisId }
      },
      data: {
        diagnosisType: 'SECONDARY'
      }
    });
  }

  const updated = await prisma.clientDiagnosis.update({
    where: { id: diagnosisId },
    data: {
      ...data,
      lastReviewedDate: new Date()
    },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          medicalRecordNumber: true
        }
      },
      diagnosedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true
        }
      },
      lastReviewedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true
        }
      }
    }
  });

  return updated;
}

/**
 * Delete a diagnosis (soft delete by setting status to RULE_OUT_REJECTED)
 */
export async function deleteDiagnosis(diagnosisId: string, deletedById: string) {
  return updateDiagnosisStatus(
    diagnosisId,
    'RULE_OUT_REJECTED',
    {
      dateResolved: new Date(),
      lastReviewedById: deletedById
    }
  );
}

/**
 * Search ICD-10 codes by query string
 * Returns mock data for now - can be replaced with actual ICD-10 API later
 */
export async function searchICD10Codes(query: string): Promise<ICD10SearchResult[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const searchTerm = query.toLowerCase().trim();

  // Search in code or description
  const results = MOCK_ICD10_CODES.filter(item =>
    item.code.toLowerCase().includes(searchTerm) ||
    item.description.toLowerCase().includes(searchTerm) ||
    item.category.toLowerCase().includes(searchTerm)
  );

  // Limit to top 20 results
  return results.slice(0, 20);
}

/**
 * Get diagnosis statistics for a client
 */
export async function getClientDiagnosisStats(clientId: string) {
  const [total, active, resolved, ruleOutRejected] = await Promise.all([
    prisma.clientDiagnosis.count({ where: { clientId } }),
    prisma.clientDiagnosis.count({ where: { clientId, status: 'ACTIVE' } }),
    prisma.clientDiagnosis.count({ where: { clientId, status: 'RESOLVED' } }),
    prisma.clientDiagnosis.count({ where: { clientId, status: 'RULE_OUT_REJECTED' } })
  ]);

  // Count by type (active only)
  const byType = await prisma.clientDiagnosis.groupBy({
    by: ['diagnosisType'],
    where: { clientId, status: 'ACTIVE' },
    _count: true
  });

  // Count by category (active only)
  const byCategory = await prisma.clientDiagnosis.groupBy({
    by: ['diagnosisCategory'],
    where: {
      clientId,
      status: 'ACTIVE',
      diagnosisCategory: { not: null }
    },
    _count: true
  });

  return {
    total,
    active,
    resolved,
    ruleOutRejected,
    byType: byType.reduce((acc, item) => {
      acc[item.diagnosisType] = item._count;
      return acc;
    }, {} as Record<string, number>),
    byCategory: byCategory.reduce((acc, item) => {
      if (item.diagnosisCategory) {
        acc[item.diagnosisCategory] = item._count;
      }
      return acc;
    }, {} as Record<string, number>)
  };
}

// Export all functions
export const ClientDiagnosisService = {
  addDiagnosis,
  getClientDiagnoses,
  getDiagnosisById,
  updateDiagnosisStatus,
  updateDiagnosis,
  deleteDiagnosis,
  searchICD10Codes,
  getClientDiagnosisStats
};
