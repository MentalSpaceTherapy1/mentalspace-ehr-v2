/**
 * Custom Reports Service
 * Phase 3.2: Moved database operations from controller to service
 */

import prisma from './database';
import { Prisma } from '@mentalspace/database';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateReportInput {
  userId: string;
  name: string;
  description?: string;
  category?: string;
  queryConfig: Prisma.InputJsonValue;
  isPublic?: boolean;
  isTemplate?: boolean;
}

export interface UpdateReportInput {
  name?: string;
  description?: string;
  category?: string;
  queryConfig?: Prisma.InputJsonValue;
  isPublic?: boolean;
}

export interface ListReportsFilter {
  userId: string;
  category?: string;
  isTemplate?: boolean;
  includePublic?: boolean;
}

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
};

const changedByUserSelect = {
  firstName: true,
  lastName: true,
  email: true,
};

// ============================================================================
// SERVICE METHODS
// ============================================================================

/**
 * Create a new report definition
 */
export async function createReportDefinition(data: CreateReportInput) {
  return prisma.reportDefinition.create({
    data: {
      userId: data.userId,
      name: data.name,
      description: data.description,
      category: data.category || 'CUSTOM',
      queryConfig: data.queryConfig,
      isPublic: data.isPublic || false,
      isTemplate: data.isTemplate || false,
    },
  });
}

/**
 * Create initial report version
 */
export async function createReportVersion(
  reportId: string,
  versionNumber: number,
  queryConfig: Prisma.InputJsonValue,
  changedBy: string,
  changeNote: string
) {
  return prisma.reportVersion.create({
    data: {
      reportId,
      versionNumber,
      queryConfig,
      changedBy,
      changeNote,
    },
  });
}

/**
 * Get reports list with filters
 */
export async function getReportsList(filters: ListReportsFilter) {
  const where: Prisma.ReportDefinitionWhereInput = {
    OR: [
      { userId: filters.userId },
      ...(filters.includePublic ? [{ isPublic: true }] : []),
    ],
  };

  if (filters.category) {
    where.category = filters.category;
  }

  if (filters.isTemplate !== undefined) {
    where.isTemplate = filters.isTemplate;
  }

  return prisma.reportDefinition.findMany({
    where,
    include: {
      user: {
        select: userSelect,
      },
      versions: {
        take: 1,
        orderBy: { versionNumber: 'desc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

/**
 * Find report by ID with user access check
 */
export async function findReportByIdWithAccess(id: string, userId: string) {
  return prisma.reportDefinition.findFirst({
    where: {
      id,
      OR: [{ userId }, { isPublic: true }],
    },
    include: {
      user: {
        select: userSelect,
      },
      versions: {
        orderBy: { versionNumber: 'desc' },
        include: {
          changedByUser: {
            select: changedByUserSelect,
          },
        },
      },
    },
  });
}

/**
 * Find report by ID owned by user (no public access)
 */
export async function findReportByIdAndOwner(id: string, userId: string) {
  return prisma.reportDefinition.findFirst({
    where: { id, userId },
  });
}

/**
 * Find report by ID with access (basic, no includes)
 */
export async function findReportByIdWithAccessBasic(id: string, userId: string) {
  return prisma.reportDefinition.findFirst({
    where: {
      id,
      OR: [{ userId }, { isPublic: true }],
    },
  });
}

/**
 * Update report definition
 */
export async function updateReportDefinition(id: string, data: UpdateReportInput) {
  return prisma.reportDefinition.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      category: data.category,
      queryConfig: data.queryConfig,
      isPublic: data.isPublic,
    },
  });
}

/**
 * Get latest version number for a report
 */
export async function getLatestVersionNumber(reportId: string): Promise<number> {
  const latestVersion = await prisma.reportVersion.findFirst({
    where: { reportId },
    orderBy: { versionNumber: 'desc' },
  });
  return latestVersion?.versionNumber || 0;
}

/**
 * Delete report definition (cascade deletes versions)
 */
export async function deleteReportDefinition(id: string) {
  return prisma.reportDefinition.delete({
    where: { id },
  });
}

/**
 * Update report sharing status
 */
export async function updateReportSharing(id: string, isPublic: boolean) {
  return prisma.reportDefinition.update({
    where: { id },
    data: { isPublic },
  });
}

/**
 * Get report versions with changed by user
 */
export async function getReportVersions(reportId: string) {
  return prisma.reportVersion.findMany({
    where: { reportId },
    include: {
      changedByUser: {
        select: changedByUserSelect,
      },
    },
    orderBy: { versionNumber: 'desc' },
  });
}

/**
 * Find version by ID and report ID
 */
export async function findVersionByIdAndReport(versionId: string, reportId: string) {
  return prisma.reportVersion.findFirst({
    where: { id: versionId, reportId },
  });
}

/**
 * Update report query config (for rollback)
 */
export async function updateReportQueryConfig(id: string, queryConfig: Prisma.InputJsonValue) {
  return prisma.reportDefinition.update({
    where: { id },
    data: { queryConfig },
  });
}
