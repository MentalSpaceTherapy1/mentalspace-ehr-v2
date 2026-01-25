/**
 * Transaction Utilities
 *
 * Provides a standardized wrapper for Prisma transactions with:
 * - Configurable timeout and isolation level
 * - Consistent error handling
 * - Audit logging integration
 * - Retry support for transient failures
 *
 * Usage:
 * ```typescript
 * import { withTransaction } from '../utils/transaction';
 *
 * const result = await withTransaction(async (tx) => {
 *   const client = await tx.client.create({ data: clientData });
 *   await tx.insuranceInformation.create({ data: { clientId: client.id, ...insuranceData } });
 *   return client;
 * });
 * ```
 */

import prisma from '../services/database';
import { Prisma } from '@mentalspace/database';
import logger from './logger';

/**
 * Transaction client type - use this in function signatures that accept a transaction
 */
export type TransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Options for transaction execution
 */
export interface TransactionOptions {
  /** Maximum time to wait for the transaction to complete (default: 10000ms) */
  timeout?: number;

  /** Transaction isolation level (default: ReadCommitted) */
  isolationLevel?: Prisma.TransactionIsolationLevel;

  /** Maximum number of retry attempts for transient failures (default: 0) */
  maxRetries?: number;

  /** Base delay between retries in milliseconds (default: 100ms, doubles each retry) */
  retryDelayMs?: number;

  /** Optional label for logging purposes */
  label?: string;
}

/**
 * Errors that are considered transient and can be retried
 */
const TRANSIENT_ERROR_CODES = [
  'P2034', // Transaction conflict (concurrent update)
  'P2028', // Transaction API error
];

/**
 * Check if an error is transient and should be retried
 */
function isTransientError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return TRANSIENT_ERROR_CODES.includes(error.code);
  }
  return false;
}

/**
 * Wait for a specified number of milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function within a database transaction with configurable options
 *
 * @param fn - The function to execute within the transaction
 * @param options - Transaction configuration options
 * @returns The result of the function
 * @throws Re-throws any errors from the function after logging
 *
 * @example
 * // Basic usage
 * const client = await withTransaction(async (tx) => {
 *   return tx.client.create({ data: clientData });
 * });
 *
 * @example
 * // With options
 * const result = await withTransaction(
 *   async (tx) => {
 *     const appointment = await tx.appointment.create({ data });
 *     await tx.reminder.createMany({ data: reminders });
 *     return appointment;
 *   },
 *   {
 *     timeout: 30000,
 *     isolationLevel: 'Serializable',
 *     label: 'CreateAppointmentWithReminders',
 *   }
 * );
 *
 * @example
 * // With retry for transient failures
 * const result = await withTransaction(
 *   async (tx) => {
 *     return tx.billing.update({ where: { id }, data });
 *   },
 *   { maxRetries: 3, label: 'UpdateBilling' }
 * );
 */
export async function withTransaction<T>(
  fn: (tx: TransactionClient) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const {
    timeout = 10000,
    isolationLevel = 'ReadCommitted',
    maxRetries = 0,
    retryDelayMs = 100,
    label = 'Transaction',
  } = options;

  let lastError: unknown;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const startTime = Date.now();

      const result = await prisma.$transaction(fn, {
        timeout,
        isolationLevel,
      });

      const duration = Date.now() - startTime;

      // Log slow transactions (> 1 second)
      if (duration > 1000) {
        logger.warn(`Slow transaction detected`, {
          label,
          duration,
          attempt: attempt + 1,
        });
      }

      return result;
    } catch (error) {
      lastError = error;
      attempt++;

      // Check if we should retry
      if (attempt <= maxRetries && isTransientError(error)) {
        const delayMs = retryDelayMs * Math.pow(2, attempt - 1); // Exponential backoff

        logger.warn(`Transaction failed with transient error, retrying`, {
          label,
          attempt,
          maxRetries,
          delayMs,
          errorCode:
            error instanceof Prisma.PrismaClientKnownRequestError
              ? error.code
              : 'unknown',
        });

        await delay(delayMs);
        continue;
      }

      // Log the error
      logger.error(`Transaction failed`, {
        label,
        attempt,
        error: error instanceof Error ? error.message : String(error),
        errorCode:
          error instanceof Prisma.PrismaClientKnownRequestError
            ? error.code
            : undefined,
      });

      throw error;
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Execute multiple independent transactions in parallel
 * Each transaction is independent - if one fails, others can still succeed
 *
 * @param transactions - Array of transaction functions
 * @param options - Transaction configuration options (applied to all)
 * @returns Array of results (PromiseSettledResult format)
 *
 * @example
 * const results = await withParallelTransactions([
 *   (tx) => tx.client.update({ where: { id: '1' }, data: { ... } }),
 *   (tx) => tx.client.update({ where: { id: '2' }, data: { ... } }),
 * ]);
 */
export async function withParallelTransactions<T>(
  transactions: Array<(tx: TransactionClient) => Promise<T>>,
  options: TransactionOptions = {}
): Promise<PromiseSettledResult<T>[]> {
  return Promise.allSettled(
    transactions.map((fn) => withTransaction(fn, options))
  );
}

/**
 * Type guard to check if a PromiseSettledResult was fulfilled
 */
export function isFulfilled<T>(
  result: PromiseSettledResult<T>
): result is PromiseFulfilledResult<T> {
  return result.status === 'fulfilled';
}

/**
 * Type guard to check if a PromiseSettledResult was rejected
 */
export function isRejected<T>(
  result: PromiseSettledResult<T>
): result is PromiseRejectedResult {
  return result.status === 'rejected';
}

export default {
  withTransaction,
  withParallelTransactions,
  isFulfilled,
  isRejected,
};
