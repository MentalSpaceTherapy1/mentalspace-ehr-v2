/**
 * Schema Check Service
 *
 * Ensures required database columns exist on application startup.
 * This prevents errors from schema mismatches between the Prisma client
 * and the actual database state.
 *
 * All operations use "IF NOT EXISTS" for safety.
 */

import prisma from './database';
import logger from '../utils/logger';

interface ColumnDefinition {
  table: string;
  column: string;
  type: string;
  default?: string;
}

/**
 * Required columns that must exist for the application to function.
 * Add new columns here when adding features that may not be deployed yet.
 */
const REQUIRED_COLUMNS: ColumnDefinition[] = [
  // AdvancedMD integration columns for insurance_information
  { table: 'insurance_information', column: 'advancedMDPayerId', type: 'TEXT' },
  { table: 'insurance_information', column: 'advancedMDPayerName', type: 'TEXT' },
  { table: 'insurance_information', column: 'lastEligibilityCheck', type: 'TIMESTAMP(3)' },

  // AdvancedMD integration columns for clients
  { table: 'clients', column: 'advancedMDPatientId', type: 'TEXT' },
  { table: 'clients', column: 'lastSyncedToAMD', type: 'TIMESTAMP(3)' },
  { table: 'clients', column: 'amdSyncStatus', type: 'TEXT' },
  { table: 'clients', column: 'amdSyncError', type: 'TEXT' },

  // AdvancedMD integration columns for charge_entries
  { table: 'charge_entries', column: 'advancedMDChargeId', type: 'TEXT' },
  { table: 'charge_entries', column: 'advancedMDVisitId', type: 'TEXT' },
  { table: 'charge_entries', column: 'syncStatus', type: 'TEXT', default: "'pending'" },
  { table: 'charge_entries', column: 'syncError', type: 'TEXT' },
  { table: 'charge_entries', column: 'lastSyncAttempt', type: 'TIMESTAMP(3)' },
];

/**
 * Check if a column exists in the database
 */
async function columnExists(table: string, column: string): Promise<boolean> {
  const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = ${table} AND column_name = ${column}
    ) as exists
  `;
  return result[0]?.exists ?? false;
}

/**
 * Add a column to a table if it doesn't exist
 */
async function ensureColumnExists(def: ColumnDefinition): Promise<boolean> {
  try {
    const exists = await columnExists(def.table, def.column);

    if (exists) {
      return false; // Column already exists
    }

    // Build the ALTER TABLE statement
    let sql = `ALTER TABLE "${def.table}" ADD COLUMN IF NOT EXISTS "${def.column}" ${def.type}`;
    if (def.default) {
      sql += ` DEFAULT ${def.default}`;
    }

    await prisma.$executeRawUnsafe(sql);
    logger.info(`Added missing column: ${def.table}.${def.column}`);
    return true;
  } catch (error) {
    logger.error(`Failed to add column ${def.table}.${def.column}`, { error });
    return false;
  }
}

/**
 * Run schema check on application startup
 * Ensures all required columns exist in the database
 */
export async function runSchemaCheck(): Promise<void> {
  logger.info('🔍 Running database schema check...');

  let added = 0;
  let failed = 0;

  for (const column of REQUIRED_COLUMNS) {
    try {
      const wasAdded = await ensureColumnExists(column);
      if (wasAdded) {
        added++;
      }
    } catch (error) {
      failed++;
      logger.error(`Schema check failed for ${column.table}.${column.column}`, { error });
    }
  }

  if (added > 0) {
    logger.info(`✅ Schema check complete: ${added} columns added`);
  } else if (failed > 0) {
    logger.warn(`⚠️ Schema check complete with ${failed} failures`);
  } else {
    logger.info('✅ Schema check complete: all columns present');
  }
}

/**
 * Verify that all required tables exist
 */
export async function verifyRequiredTables(): Promise<{ missing: string[] }> {
  const requiredTables = [
    'clients',
    'users',
    'appointments',
    'clinical_notes',
    'insurance_information',
    'emergency_contacts',
  ];

  const missing: string[] = [];

  for (const table of requiredTables) {
    const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = ${table}
      ) as exists
    `;

    if (!result[0]?.exists) {
      missing.push(table);
    }
  }

  return { missing };
}
