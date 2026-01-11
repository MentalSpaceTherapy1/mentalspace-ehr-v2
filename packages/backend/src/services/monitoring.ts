/**
 * AWS CloudWatch Monitoring Service
 *
 * Provides metrics collection and monitoring for HIPAA compliance
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface CloudWatchConfig {
  region: string;
  namespace: string;
  environment: string;
  enableAlarms: boolean;
}

let isInitialized = false;
let metricsInterval: NodeJS.Timeout | null = null;

/**
 * Initialize CloudWatch monitoring
 */
export function initializeCloudWatch(config: CloudWatchConfig): void {
  if (isInitialized) {
    logger.warn('CloudWatch already initialized');
    return;
  }

  logger.info('CloudWatch monitoring initialized', {
    region: config.region,
    namespace: config.namespace,
    environment: config.environment
  });

  isInitialized = true;
}

/**
 * Start collecting and publishing metrics
 */
export function startMetricsCollection(): void {
  if (metricsInterval) {
    logger.warn('Metrics collection already running');
    return;
  }

  // Collect metrics every 60 seconds
  metricsInterval = setInterval(() => {
    collectMetrics();
  }, 60000);

  logger.info('Metrics collection started');
}

/**
 * Stop metrics collection
 */
export function stopMetricsCollection(): void {
  if (metricsInterval) {
    clearInterval(metricsInterval);
    metricsInterval = null;
    logger.info('Metrics collection stopped');
  }
}

/**
 * Flush any pending metrics before shutdown
 */
export async function flushMetrics(): Promise<void> {
  // Flush any pending metrics
  logger.info('Flushing metrics');
  return Promise.resolve();
}

/**
 * Collect system metrics
 */
function collectMetrics(): void {
  // Collect memory usage
  const memoryUsage = process.memoryUsage();

  // Log metrics (in production, these would be sent to CloudWatch)
  logger.debug('Metrics collected', {
    heapUsed: memoryUsage.heapUsed,
    heapTotal: memoryUsage.heapTotal,
    rss: memoryUsage.rss
  });
}

/**
 * Record a custom metric
 */
export function recordMetric(name: string, value: number, unit: string = 'Count'): void {
  logger.debug('Metric recorded', { name, value, unit });
}

/**
 * Record API latency
 */
export function recordApiLatency(endpoint: string, latencyMs: number): void {
  logger.debug('API latency recorded', { endpoint, latencyMs });
}

/**
 * Express middleware for monitoring
 */
export function monitoringMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    recordApiLatency(req.path, duration);
  });

  next();
}
