import prisma from './database';
import logger from '../utils/logger';
import { NoteReminderConfigType } from '@prisma/client';

/**
 * Reminder Configuration Service
 * Module 4 Phase 2.5: Email Reminder System
 *
 * Manages reminder configuration for clinical notes:
 * - Practice-wide defaults
 * - User-specific overrides
 * - Note-type specific settings
 */

export interface CreateReminderConfigParams {
  configurationType: NoteReminderConfigType;
  userId?: string;
  noteType?: string;
  enabled?: boolean;
  reminderIntervals?: number[];
  sendOverdueReminders?: boolean;
  overdueReminderFrequency?: number;
  maxOverdueReminders?: number;
  enableSundayWarnings?: boolean;
  sundayWarningTime?: string;
  enableDailyDigest?: boolean;
  digestTime?: string;
  digestDays?: string[];
  enableEscalation?: boolean;
  escalationAfterHours?: number;
  escalateTo?: string[];
  escalationMessage?: string;
}

export interface UpdateReminderConfigParams extends Partial<CreateReminderConfigParams> {
  id: string;
}

/**
 * Get effective reminder configuration for a user
 * Hierarchy: USER > NOTE_TYPE > PRACTICE
 */
export async function getEffectiveConfig(userId: string, noteType?: string) {
  try {
    // Try to get user-specific config
    const userConfig = await prisma.clinicalNoteReminderConfig.findFirst({
      where: {
        configurationType: 'USER',
        userId,
      },
    });

    if (userConfig && userConfig.enabled) {
      logger.info('Using user-specific reminder config', { userId });
      return userConfig;
    }

    // Try to get note-type specific config
    if (noteType) {
      const noteTypeConfig = await prisma.clinicalNoteReminderConfig.findFirst({
        where: {
          configurationType: 'NOTE_TYPE',
          noteType,
        },
      });

      if (noteTypeConfig && noteTypeConfig.enabled) {
        logger.info('Using note-type reminder config', { noteType });
        return noteTypeConfig;
      }
    }

    // Fall back to practice-wide config
    const practiceConfig = await prisma.clinicalNoteReminderConfig.findFirst({
      where: {
        configurationType: 'PRACTICE',
      },
    });

    if (practiceConfig) {
      logger.info('Using practice-wide reminder config');
      return practiceConfig;
    }

    // Return default configuration if none exists
    logger.warn('No reminder configuration found, using defaults');
    return null;
  } catch (error: unknown) {
    logger.error('Failed to get effective reminder config', {
      error: error.message,
      userId,
      noteType,
    });
    throw error;
  }
}

/**
 * Create a reminder configuration
 */
export async function createReminderConfig(params: CreateReminderConfigParams) {
  try {
    // Validate configuration type rules
    if (params.configurationType === 'PRACTICE' && (params.userId || params.noteType)) {
      throw new Error('PRACTICE config cannot have userId or noteType');
    }
    if (params.configurationType === 'USER' && !params.userId) {
      throw new Error('USER config requires userId');
    }
    if (params.configurationType === 'NOTE_TYPE' && !params.noteType) {
      throw new Error('NOTE_TYPE config requires noteType');
    }

    // Check for existing configuration
    const existing = await prisma.clinicalNoteReminderConfig.findFirst({
      where: {
        configurationType: params.configurationType,
        userId: params.userId || null,
        noteType: params.noteType || null,
      },
    });

    if (existing) {
      throw new Error('Configuration already exists for this type/user/noteType combination');
    }

    const config = await prisma.clinicalNoteReminderConfig.create({
      data: {
        configurationType: params.configurationType,
        userId: params.userId || null,
        noteType: params.noteType || null,
        enabled: params.enabled !== undefined ? params.enabled : true,
        reminderIntervals: params.reminderIntervals || [72, 48, 24],
        sendOverdueReminders: params.sendOverdueReminders !== undefined ? params.sendOverdueReminders : true,
        overdueReminderFrequency: params.overdueReminderFrequency || 24,
        maxOverdueReminders: params.maxOverdueReminders || 3,
        enableSundayWarnings: params.enableSundayWarnings !== undefined ? params.enableSundayWarnings : true,
        sundayWarningTime: params.sundayWarningTime || '17:00',
        enableDailyDigest: params.enableDailyDigest || false,
        digestTime: params.digestTime || '09:00',
        digestDays: params.digestDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        enableEscalation: params.enableEscalation !== undefined ? params.enableEscalation : true,
        escalationAfterHours: params.escalationAfterHours || 48,
        escalateTo: params.escalateTo || [],
        escalationMessage: params.escalationMessage || null,
      },
    });

    logger.info('Reminder configuration created', {
      configId: config.id,
      type: config.configurationType,
      userId: config.userId,
      noteType: config.noteType,
    });

    return config;
  } catch (error: unknown) {
    logger.error('Failed to create reminder configuration', {
      error: error.message,
      params,
    });
    throw error;
  }
}

/**
 * Update a reminder configuration
 */
export async function updateReminderConfig(params: UpdateReminderConfigParams) {
  try {
    const { id, ...updateData } = params;

    // Remove undefined values
    const cleanData: any = {};
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] !== undefined) {
        cleanData[key] = updateData[key as keyof typeof updateData];
      }
    });

    const config = await prisma.clinicalNoteReminderConfig.update({
      where: { id },
      data: cleanData,
    });

    logger.info('Reminder configuration updated', {
      configId: config.id,
      updatedFields: Object.keys(cleanData),
    });

    return config;
  } catch (error: unknown) {
    logger.error('Failed to update reminder configuration', {
      error: error.message,
      configId: params.id,
    });
    throw error;
  }
}

/**
 * Delete a reminder configuration
 */
export async function deleteReminderConfig(id: string) {
  try {
    await prisma.clinicalNoteReminderConfig.delete({
      where: { id },
    });

    logger.info('Reminder configuration deleted', { configId: id });
    return true;
  } catch (error: unknown) {
    logger.error('Failed to delete reminder configuration', {
      error: error.message,
      configId: id,
    });
    throw error;
  }
}

/**
 * Get all reminder configurations
 */
export async function getAllConfigs() {
  try {
    const configs = await prisma.clinicalNoteReminderConfig.findMany({
      orderBy: [
        { configurationType: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return configs;
  } catch (error: unknown) {
    logger.error('Failed to get all reminder configurations', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get practice-wide configuration
 */
export async function getPracticeConfig() {
  try {
    return await prisma.clinicalNoteReminderConfig.findFirst({
      where: {
        configurationType: 'PRACTICE',
      },
    });
  } catch (error: unknown) {
    logger.error('Failed to get practice reminder configuration', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get user-specific configuration
 */
export async function getUserConfig(userId: string) {
  try {
    return await prisma.clinicalNoteReminderConfig.findFirst({
      where: {
        configurationType: 'USER',
        userId,
      },
    });
  } catch (error: unknown) {
    logger.error('Failed to get user reminder configuration', {
      error: error.message,
      userId,
    });
    throw error;
  }
}

/**
 * Get note-type specific configuration
 */
export async function getNoteTypeConfig(noteType: string) {
  try {
    return await prisma.clinicalNoteReminderConfig.findFirst({
      where: {
        configurationType: 'NOTE_TYPE',
        noteType,
      },
    });
  } catch (error: unknown) {
    logger.error('Failed to get note-type reminder configuration', {
      error: error.message,
      noteType,
    });
    throw error;
  }
}

/**
 * Initialize default practice configuration if none exists
 */
export async function initializeDefaultConfig() {
  try {
    const existing = await getPracticeConfig();

    if (!existing) {
      logger.info('No practice config found, creating default');

      return await createReminderConfig({
        configurationType: 'PRACTICE',
        enabled: true,
        reminderIntervals: [72, 48, 24],
        sendOverdueReminders: true,
        overdueReminderFrequency: 24,
        maxOverdueReminders: 3,
        enableSundayWarnings: true,
        sundayWarningTime: '17:00',
        enableDailyDigest: false,
        digestTime: '09:00',
        digestDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        enableEscalation: true,
        escalationAfterHours: 48,
        escalateTo: [],
      });
    }

    return existing;
  } catch (error: unknown) {
    logger.error('Failed to initialize default config', {
      error: error.message,
    });
    throw error;
  }
}
