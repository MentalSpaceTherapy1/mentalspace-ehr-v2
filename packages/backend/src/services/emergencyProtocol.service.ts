/**
 * Emergency Protocol Service
 * Module 6 - Telehealth Phase 2: Emergency System Enhancements
 *
 * Service for managing standardized emergency response protocols
 */

import prisma from './database';
import logger from '../utils/logger';

// EmergencyProtocol model workaround - model may not exist in schema yet
// TODO: Add EmergencyProtocol model to Prisma schema
const emergencyProtocolModel = prisma as any;

export interface CreateEmergencyProtocolData {
  name: string;
  description: string;
  triggerConditions: string[];
  steps: any; // JSON array of protocol steps
  requiredActions: any; // JSON array of required actions
  documentationReqs: any; // JSON object with documentation requirements
  notificationRules: any; // JSON object with notification rules
  displayOrder?: number;
  createdBy?: string;
}

export interface UpdateEmergencyProtocolData {
  name?: string;
  description?: string;
  triggerConditions?: string[];
  steps?: any;
  requiredActions?: any;
  documentationReqs?: any;
  notificationRules?: any;
  isActive?: boolean;
  displayOrder?: number;
  lastModifiedBy?: string;
}

/**
 * Get all active emergency protocols
 */
export async function getEmergencyProtocols(includeInactive: boolean = false) {
  try {
    const where: any = {};

    if (!includeInactive) {
      where.isActive = true;
    }

    const protocols = await emergencyProtocolModel.emergencyProtocol.findMany({
      where,
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    logger.info('Retrieved emergency protocols', {
      count: protocols.length,
      includeInactive,
    });

    return protocols;
  } catch (error: any) {
    logger.error('Failed to get emergency protocols', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get emergency protocol by trigger type
 * Returns the most relevant protocol for a given emergency situation
 */
export async function getProtocolForEmergencyType(emergencyType: string) {
  try {
    // Map emergency types to trigger conditions
    const triggerMap: Record<string, string[]> = {
      SUICIDAL: [
        'suicidal_ideation_with_plan',
        'suicidal_ideation_with_intent',
        'immediate_suicide_risk',
      ],
      SELF_HARM: [
        'active_self_harm',
        'visible_injury',
        'cutting_behavior',
        'burning_behavior',
      ],
      VIOLENCE_RISK: [
        'homicidal_ideation',
        'threat_to_specific_person',
        'violence_risk',
        'tarasoff_duty',
      ],
      MEDICAL: [
        'medical_emergency',
        'heart_attack_symptoms',
        'stroke_symptoms',
        'seizure',
        'overdose',
      ],
    };

    const triggers = triggerMap[emergencyType] || [];

    // Find protocol that matches any of the triggers
    const protocol = await emergencyProtocolModel.emergencyProtocol.findFirst({
      where: {
        isActive: true,
        triggerConditions: {
          hasSome: triggers,
        },
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });

    if (!protocol) {
      logger.warn('No protocol found for emergency type', {
        emergencyType,
        triggers,
      });
      return null;
    }

    logger.info('Retrieved protocol for emergency type', {
      emergencyType,
      protocolId: protocol.id,
      protocolName: protocol.name,
    });

    return protocol;
  } catch (error: any) {
    logger.error('Failed to get protocol for emergency type', {
      error: error.message,
      emergencyType,
    });
    throw error;
  }
}

/**
 * Get a single emergency protocol by ID
 */
export async function getEmergencyProtocolById(id: string) {
  try {
    const protocol = await emergencyProtocolModel.emergencyProtocol.findUnique({
      where: { id },
    });

    if (!protocol) {
      throw new Error('Emergency protocol not found');
    }

    return protocol;
  } catch (error: any) {
    logger.error('Failed to get emergency protocol', {
      error: error.message,
      id,
    });
    throw error;
  }
}

/**
 * Create a new emergency protocol
 */
export async function createEmergencyProtocol(data: CreateEmergencyProtocolData) {
  try {
    const protocol = await emergencyProtocolModel.emergencyProtocol.create({
      data: {
        ...data,
        displayOrder: data.displayOrder || 0,
      },
    });

    logger.info('Created emergency protocol', {
      id: protocol.id,
      name: protocol.name,
      createdBy: data.createdBy,
    });

    return protocol;
  } catch (error: any) {
    logger.error('Failed to create emergency protocol', {
      error: error.message,
      name: data.name,
    });
    throw error;
  }
}

/**
 * Update an existing emergency protocol
 */
export async function updateEmergencyProtocol(
  id: string,
  data: UpdateEmergencyProtocolData
) {
  try {
    const protocol = await emergencyProtocolModel.emergencyProtocol.update({
      where: { id },
      data,
    });

    logger.info('Updated emergency protocol', {
      id: protocol.id,
      name: protocol.name,
      lastModifiedBy: data.lastModifiedBy,
    });

    return protocol;
  } catch (error: any) {
    logger.error('Failed to update emergency protocol', {
      error: error.message,
      id,
    });
    throw error;
  }
}

/**
 * Delete (deactivate) an emergency protocol
 */
export async function deleteEmergencyProtocol(id: string, userId: string) {
  try {
    const protocol = await emergencyProtocolModel.emergencyProtocol.update({
      where: { id },
      data: {
        isActive: false,
        lastModifiedBy: userId,
      },
    });

    logger.info('Deleted (deactivated) emergency protocol', {
      id: protocol.id,
      name: protocol.name,
      deletedBy: userId,
    });

    return protocol;
  } catch (error: any) {
    logger.error('Failed to delete emergency protocol', {
      error: error.message,
      id,
    });
    throw error;
  }
}

/**
 * Reorder emergency protocols
 */
export async function reorderEmergencyProtocols(
  updates: Array<{ id: string; displayOrder: number }>,
  userId: string
) {
  try {
    // Update all protocols in a transaction
    const results = await prisma.$transaction(
      updates.map((update) =>
        emergencyProtocolModel.emergencyProtocol.update({
          where: { id: update.id },
          data: {
            displayOrder: update.displayOrder,
            lastModifiedBy: userId,
          },
        })
      )
    );

    logger.info('Reordered emergency protocols', {
      count: updates.length,
      userId,
    });

    return results;
  } catch (error: any) {
    logger.error('Failed to reorder emergency protocols', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Search emergency protocols
 */
export async function searchEmergencyProtocols(searchTerm: string) {
  try {
    const protocols = await emergencyProtocolModel.emergencyProtocol.findMany({
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

    logger.info('Searched emergency protocols', {
      searchTerm,
      count: protocols.length,
    });

    return protocols;
  } catch (error: any) {
    logger.error('Failed to search emergency protocols', {
      error: error.message,
      searchTerm,
    });
    throw error;
  }
}

/**
 * Validate protocol structure
 */
export function validateProtocolStructure(protocol: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate steps
  if (!Array.isArray(protocol.steps)) {
    errors.push('Steps must be an array');
  } else {
    protocol.steps.forEach((step: any, index: number) => {
      if (!step.stepNumber) {
        errors.push(`Step ${index + 1} missing stepNumber`);
      }
      if (!step.title) {
        errors.push(`Step ${index + 1} missing title`);
      }
      if (!step.description) {
        errors.push(`Step ${index + 1} missing description`);
      }
      if (!Array.isArray(step.actions)) {
        errors.push(`Step ${index + 1} actions must be an array`);
      }
    });
  }

  // Validate required actions
  if (!Array.isArray(protocol.requiredActions)) {
    errors.push('Required actions must be an array');
  } else {
    protocol.requiredActions.forEach((action: any, index: number) => {
      if (!action.id) {
        errors.push(`Required action ${index + 1} missing id`);
      }
      if (!action.item) {
        errors.push(`Required action ${index + 1} missing item description`);
      }
    });
  }

  // Validate documentation requirements
  if (typeof protocol.documentationReqs !== 'object') {
    errors.push('Documentation requirements must be an object');
  } else {
    if (!Array.isArray(protocol.documentationReqs.requiredFields)) {
      errors.push('Documentation requirements must include requiredFields array');
    }
  }

  // Validate notification rules
  if (typeof protocol.notificationRules !== 'object') {
    errors.push('Notification rules must be an object');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
