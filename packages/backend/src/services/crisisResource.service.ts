/**
 * Crisis Resource Service
 * Module 6 - Telehealth Phase 2: Emergency System Enhancements
 *
 * Service for managing crisis resources (hotlines, text lines, etc.)
 * displayed during emergency situations in telehealth sessions.
 */

import prisma from './database';
import logger from '../utils/logger';

export interface CrisisResourceFilter {
  category?: string;
  state?: string;
  city?: string;
  geographicScope?: string;
  includeNational?: boolean;
  includeState?: boolean;
  includeLocal?: boolean;
}

export interface CreateCrisisResourceData {
  name: string;
  phone: string;
  alternatePhone?: string;
  textNumber?: string;
  website?: string;
  description: string;
  category: string;
  availability: string;
  serviceType: string;
  geographicScope: string;
  stateSpecific?: string;
  citySpecific?: string;
  language: string[];
  displayOrder?: number;
  createdBy?: string;
}

export interface UpdateCrisisResourceData {
  name?: string;
  phone?: string;
  alternatePhone?: string;
  textNumber?: string;
  website?: string;
  description?: string;
  category?: string;
  availability?: string;
  serviceType?: string;
  geographicScope?: string;
  stateSpecific?: string;
  citySpecific?: string;
  language?: string[];
  isActive?: boolean;
  displayOrder?: number;
  lastModifiedBy?: string;
}

/**
 * Get crisis resources with optional filtering
 * Returns resources ordered by relevance (local > state > national)
 */
export async function getCrisisResources(filter?: CrisisResourceFilter) {
  try {
    const where: any = {
      isActive: true,
    };

    // Build where clause for filtering
    if (filter?.category) {
      where.category = filter.category;
    }

    // Geographic filtering logic
    const orConditions: any[] = [];

    // Always include national resources
    if (filter?.includeNational !== false) {
      orConditions.push({
        geographicScope: 'NATIONAL',
      });
    }

    // Include state-specific resources if state provided
    if (filter?.state && filter?.includeState !== false) {
      orConditions.push({
        geographicScope: 'STATE',
        stateSpecific: filter.state,
      });
    }

    // Include local resources if city provided
    if (filter?.city && filter?.includeLocal !== false) {
      orConditions.push({
        geographicScope: 'LOCAL',
        citySpecific: filter.city,
      });
    }

    // If we have geographic conditions, add them
    if (orConditions.length > 0) {
      where.OR = orConditions;
    }

    // Query resources
    const resources = await prisma.crisisResource.findMany({
      where,
      orderBy: [
        // Local first, then state, then national
        { geographicScope: 'desc' },
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    logger.info('Retrieved crisis resources', {
      filter,
      count: resources.length,
    });

    return resources;
  } catch (error: any) {
    logger.error('Failed to get crisis resources', {
      error: error.message,
      filter,
    });
    throw error;
  }
}

/**
 * Get crisis resources for a specific emergency type
 * Returns most relevant resources for the emergency category
 */
export async function getCrisisResourcesForEmergency(
  emergencyType: string,
  state?: string,
  city?: string
) {
  try {
    // Map emergency types to resource categories
    const categoryMap: Record<string, string[]> = {
      SUICIDAL: ['SUICIDE', 'MENTAL_HEALTH'],
      SELF_HARM: ['SUICIDE', 'MENTAL_HEALTH'],
      VIOLENCE_RISK: ['DOMESTIC_VIOLENCE', 'MENTAL_HEALTH'],
      MEDICAL: ['MENTAL_HEALTH'],
      OTHER: ['MENTAL_HEALTH'],
    };

    const categories = categoryMap[emergencyType] || ['MENTAL_HEALTH'];

    // Get resources for all relevant categories
    const resources = await prisma.crisisResource.findMany({
      where: {
        isActive: true,
        category: {
          in: categories,
        },
        OR: [
          { geographicScope: 'NATIONAL' },
          {
            geographicScope: 'STATE',
            stateSpecific: state || undefined,
          },
          {
            geographicScope: 'LOCAL',
            citySpecific: city || undefined,
          },
        ],
      },
      orderBy: [
        // Prioritize by relevance: local > state > national
        { geographicScope: 'desc' },
        { displayOrder: 'asc' },
      ],
    });

    logger.info('Retrieved crisis resources for emergency', {
      emergencyType,
      state,
      city,
      count: resources.length,
    });

    return resources;
  } catch (error: any) {
    logger.error('Failed to get crisis resources for emergency', {
      error: error.message,
      emergencyType,
    });
    throw error;
  }
}

/**
 * Get a single crisis resource by ID
 */
export async function getCrisisResourceById(id: string) {
  try {
    const resource = await prisma.crisisResource.findUnique({
      where: { id },
    });

    if (!resource) {
      throw new Error('Crisis resource not found');
    }

    return resource;
  } catch (error: any) {
    logger.error('Failed to get crisis resource', {
      error: error.message,
      id,
    });
    throw error;
  }
}

/**
 * Create a new crisis resource
 */
export async function createCrisisResource(data: CreateCrisisResourceData) {
  try {
    const resource = await prisma.crisisResource.create({
      data: {
        ...data,
        displayOrder: data.displayOrder || 0,
      },
    });

    logger.info('Created crisis resource', {
      id: resource.id,
      name: resource.name,
      category: resource.category,
      createdBy: data.createdBy,
    });

    return resource;
  } catch (error: any) {
    logger.error('Failed to create crisis resource', {
      error: error.message,
      name: data.name,
    });
    throw error;
  }
}

/**
 * Update an existing crisis resource
 */
export async function updateCrisisResource(
  id: string,
  data: UpdateCrisisResourceData
) {
  try {
    const resource = await prisma.crisisResource.update({
      where: { id },
      data,
    });

    logger.info('Updated crisis resource', {
      id: resource.id,
      name: resource.name,
      lastModifiedBy: data.lastModifiedBy,
    });

    return resource;
  } catch (error: any) {
    logger.error('Failed to update crisis resource', {
      error: error.message,
      id,
    });
    throw error;
  }
}

/**
 * Delete (deactivate) a crisis resource
 */
export async function deleteCrisisResource(id: string, userId: string) {
  try {
    const resource = await prisma.crisisResource.update({
      where: { id },
      data: {
        isActive: false,
        lastModifiedBy: userId,
      },
    });

    logger.info('Deleted (deactivated) crisis resource', {
      id: resource.id,
      name: resource.name,
      deletedBy: userId,
    });

    return resource;
  } catch (error: any) {
    logger.error('Failed to delete crisis resource', {
      error: error.message,
      id,
    });
    throw error;
  }
}

/**
 * Reorder crisis resources
 */
export async function reorderCrisisResources(
  updates: Array<{ id: string; displayOrder: number }>,
  userId: string
) {
  try {
    // Update all resources in a transaction
    const results = await prisma.$transaction(
      updates.map((update) =>
        prisma.crisisResource.update({
          where: { id: update.id },
          data: {
            displayOrder: update.displayOrder,
            lastModifiedBy: userId,
          },
        })
      )
    );

    logger.info('Reordered crisis resources', {
      count: updates.length,
      userId,
    });

    return results;
  } catch (error: any) {
    logger.error('Failed to reorder crisis resources', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get all unique categories
 */
export async function getCrisisResourceCategories() {
  try {
    const resources = await prisma.crisisResource.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });

    return resources.map((r) => r.category);
  } catch (error: any) {
    logger.error('Failed to get crisis resource categories', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Search crisis resources by name or description
 */
export async function searchCrisisResources(searchTerm: string) {
  try {
    const resources = await prisma.crisisResource.findMany({
      where: {
        isActive: true,
        OR: [
          {
            name: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        ],
      },
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    logger.info('Searched crisis resources', {
      searchTerm,
      count: resources.length,
    });

    return resources;
  } catch (error: any) {
    logger.error('Failed to search crisis resources', {
      error: error.message,
      searchTerm,
    });
    throw error;
  }
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phone: string): boolean {
  // Basic validation for US phone numbers
  // Accepts: 988, 1-800-273-8255, (800) 273-8255, etc.
  const cleanPhone = phone.replace(/\D/g, '');

  // Allow short codes (3-6 digits) or full numbers (10-11 digits)
  if (cleanPhone.length >= 3 && cleanPhone.length <= 6) {
    return true; // Short code (like 988, 741741)
  }

  if (cleanPhone.length === 10 || cleanPhone.length === 11) {
    return true; // Full phone number
  }

  return false;
}
