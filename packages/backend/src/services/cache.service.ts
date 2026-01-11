import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import logger from '../utils/logger';

/**
 * Cache Service - DynamoDB-based caching layer
 *
 * Uses DynamoDB for caching expensive operations like reports and analytics.
 * Provides automatic TTL-based expiration.
 */

const CACHE_TABLE = process.env.DYNAMODB_TABLE_CACHE || 'mentalspace-cache-dev';

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

interface CacheItem {
  cacheKey: string;
  data: unknown;
  createdAt: number;
  expiresAt: number;
  category?: string;
}

/**
 * Get an item from cache
 * @param key Cache key
 * @returns Cached data or null if not found/expired
 */
export async function get<T>(key: string): Promise<T | null> {
  try {
    const command = new GetCommand({
      TableName: CACHE_TABLE,
      Key: { cacheKey: key },
    });

    const response = await docClient.send(command);
    const item = response.Item as CacheItem | undefined;

    if (!item) {
      return null;
    }

    // Check if expired
    const now = Math.floor(Date.now() / 1000);
    if (item.expiresAt < now) {
      // Item expired, delete it and return null
      await del(key);
      return null;
    }

    return item.data as T;
  } catch (error) {
    logger.error('Cache get error:', {
      key,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Set an item in cache
 * @param key Cache key
 * @param data Data to cache
 * @param ttlSeconds Time-to-live in seconds (default: 300 = 5 minutes)
 * @param category Optional category for batch invalidation
 */
export async function set(
  key: string,
  data: unknown,
  ttlSeconds: number = 300,
  category?: string
): Promise<boolean> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const item: CacheItem = {
      cacheKey: key,
      data,
      createdAt: now,
      expiresAt: now + ttlSeconds,
      category,
    };

    const command = new PutCommand({
      TableName: CACHE_TABLE,
      Item: item,
    });

    await docClient.send(command);
    return true;
  } catch (error) {
    logger.error('Cache set error:', {
      key,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Delete an item from cache
 * @param key Cache key
 */
export async function del(key: string): Promise<boolean> {
  try {
    const command = new DeleteCommand({
      TableName: CACHE_TABLE,
      Key: { cacheKey: key },
    });

    await docClient.send(command);
    return true;
  } catch (error) {
    logger.error('Cache delete error:', {
      key,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Invalidate all cache entries for a category
 * @param category Category to invalidate
 */
export async function invalidateCategory(category: string): Promise<number> {
  try {
    // Query by category using GSI (requires GSI on category field)
    const command = new QueryCommand({
      TableName: CACHE_TABLE,
      IndexName: 'category-index',
      KeyConditionExpression: 'category = :category',
      ExpressionAttributeValues: {
        ':category': category,
      },
    });

    const response = await docClient.send(command);
    const items = response.Items || [];

    // Delete all items in category
    let deletedCount = 0;
    for (const item of items) {
      const deleted = await del(item.cacheKey);
      if (deleted) deletedCount++;
    }

    logger.info(`Invalidated ${deletedCount} cache entries for category: ${category}`);
    return deletedCount;
  } catch (error) {
    // GSI might not exist, log and continue
    logger.warn('Cache category invalidation error (GSI may not exist):', {
      category,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return 0;
  }
}

/**
 * Generate a cache key from function name and parameters
 * @param prefix Function/report name prefix
 * @param params Parameters to include in key
 */
export function generateKey(prefix: string, params: Record<string, unknown>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}:${JSON.stringify(params[key])}`)
    .join('|');
  return `${prefix}::${sortedParams}`;
}

/**
 * Cache decorator for async functions with automatic TTL
 * @param ttlSeconds Cache TTL in seconds
 * @param category Optional category for batch invalidation
 */
export function cached<T extends (...args: unknown[]) => Promise<unknown>>(
  ttlSeconds: number = 300,
  category?: string
) {
  return function (
    _target: object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value!;

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      const cacheKey = generateKey(propertyKey, { args });

      // Try to get from cache
      const cachedResult = await get(cacheKey);
      if (cachedResult !== null) {
        logger.debug(`Cache hit for: ${propertyKey}`);
        return cachedResult;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Store in cache
      await set(cacheKey, result, ttlSeconds, category);
      logger.debug(`Cache miss, stored: ${propertyKey}`);

      return result;
    } as T;

    return descriptor;
  };
}

// Cache TTL constants (in seconds)
export const CacheTTL = {
  SHORT: 60,          // 1 minute
  MEDIUM: 300,        // 5 minutes
  LONG: 900,          // 15 minutes
  HOUR: 3600,         // 1 hour
  DAY: 86400,         // 24 hours
};

// Cache categories for batch invalidation
export const CacheCategory = {
  REPORTS: 'reports',
  ANALYTICS: 'analytics',
  REVENUE: 'revenue',
  APPOINTMENTS: 'appointments',
  CLIENTS: 'clients',
  BILLING: 'billing',
};

export default {
  get,
  set,
  del,
  invalidateCategory,
  generateKey,
  CacheTTL,
  CacheCategory,
};
